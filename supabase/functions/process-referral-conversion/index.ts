/**
 * Sprint 69 — process-referral-conversion Edge Function
 *
 * Called when a new client signs up via a referral link.
 * Can be invoked:
 *   1. From the landing page after successful registration
 *   2. From a database webhook after trainer_clients INSERT
 *
 * Flow:
 *   1. Validate the referral code exists and is unused for this new_client_id
 *   2. Increment `referral_codes.conversions`
 *   3. Insert `referral_conversions` row
 *   4. Check if the referring client has met the reward threshold
 *   5. If yes: issue reward (session credit / send notification) + mark reward_issued
 *   6. Notify the referring client via push notification
 *
 * Request body:
 *   { code: string; new_client_id: string; trainer_id: string }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

interface ConversionRequest {
  code:          string;
  new_client_id: string;
  trainer_id:    string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: ConversionRequest;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { code, new_client_id, trainer_id } = body;
  if (!code || !new_client_id || !trainer_id) {
    return new Response(JSON.stringify({ error: 'Missing required fields: code, new_client_id, trainer_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── 1. Fetch the referral code ───────────────────────────────────────
    const { data: referralCode, error: codeErr } = await supabase
      .from('referral_codes')
      .select('id, client_id, trainer_id, conversions, rewards_earned')
      .eq('code', code)
      .eq('trainer_id', trainer_id)
      .maybeSingle();

    if (codeErr) throw codeErr;
    if (!referralCode) {
      return new Response(JSON.stringify({ error: 'Referral code not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Prevent referring yourself
    if (referralCode.client_id === new_client_id) {
      return new Response(JSON.stringify({ error: 'Cannot use your own referral code' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // ── 2. Insert conversion (idempotent — UNIQUE constraint) ───────────
    const { error: convErr } = await supabase
      .from('referral_conversions')
      .insert({
        referral_code_id: referralCode.id,
        new_client_id,
      });

    if (convErr) {
      // Unique violation = already tracked
      if (convErr.code === '23505') {
        return new Response(JSON.stringify({ ok: true, message: 'Already tracked' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      throw convErr;
    }

    // ── 3. Increment conversion count ────────────────────────────────────
    const newConversions = referralCode.conversions + 1;
    await supabase
      .from('referral_codes')
      .update({ conversions: newConversions })
      .eq('id', referralCode.id);

    // ── 4. Check reward eligibility ──────────────────────────────────────
    const { data: program } = await supabase
      .from('referral_programs')
      .select('reward_type, reward_value, conversions_required, is_active')
      .eq('trainer_id', trainer_id)
      .eq('is_active', true)
      .maybeSingle();

    let rewardIssued = false;
    let rewardMessage = '';

    if (program) {
      const totalRewardsEarned = referralCode.rewards_earned;
      const conversionsForNextReward = (totalRewardsEarned + 1) * program.conversions_required;

      if (newConversions >= conversionsForNextReward) {
        // ── 5. Issue reward ───────────────────────────────────────────────
        rewardIssued = true;

        // Credit a session pack if reward_type = session_credit
        if (program.reward_type === 'session_credit') {
          // Insert session credit into session_packs or a credits table
          // (FitOS uses session_packs from Sprint 58 — trainer auto-creates a free pack for the client)
          await supabase.from('notifications').insert({
            user_id: referralCode.client_id,
            title:   '🎁 Reward Unlocked!',
            body:    `You earned ${program.reward_value} free session${program.reward_value !== 1 ? 's' : ''} for your successful referral!`,
            type:    'referral_reward',
            metadata: {
              reward_type:  program.reward_type,
              reward_value: program.reward_value,
              trainer_id,
            },
          });

          // Notify trainer to issue the credit manually (or integrate with session packs auto-credit)
          await supabase.from('notifications').insert({
            user_id: trainer_id,
            title:   '🎯 Referral reward to issue',
            body:    `A client earned ${program.reward_value} free session${program.reward_value !== 1 ? 's' : ''} from your referral program. Issue their credit in their client profile.`,
            type:    'referral_reward_trainer',
            metadata: {
              referring_client_id: referralCode.client_id,
              reward_type:         program.reward_type,
              reward_value:        program.reward_value,
            },
          });
        } else {
          // discount_pct / discount_flat — notify client + trainer
          const discountText = program.reward_type === 'discount_pct'
            ? `${program.reward_value}% off your next session`
            : `$${program.reward_value.toFixed(2)} off your next session`;

          await supabase.from('notifications').insert({
            user_id: referralCode.client_id,
            title:   '🎁 Discount Earned!',
            body:    `You earned ${discountText} for your referral! Your trainer will apply this to your next invoice.`,
            type:    'referral_reward',
            metadata: {
              reward_type:  program.reward_type,
              reward_value: program.reward_value,
              trainer_id,
            },
          });
        }

        // Increment rewards_earned counter
        await supabase
          .from('referral_codes')
          .update({ rewards_earned: totalRewardsEarned + 1 })
          .eq('id', referralCode.id);

        // Mark conversion as reward_issued
        await supabase
          .from('referral_conversions')
          .update({ reward_issued: true, reward_issued_at: new Date().toISOString() })
          .eq('referral_code_id', referralCode.id)
          .eq('new_client_id', new_client_id);

        rewardMessage = `Reward issued: ${program.reward_type} x${program.reward_value}`;
      }
    }

    // ── 6. Notify referring client of the conversion ─────────────────────
    if (!rewardIssued) {
      // Just a "you got a new referral" notification (no reward yet)
      await supabase.from('notifications').insert({
        user_id: referralCode.client_id,
        title:   '🎉 Your referral signed up!',
        body:    'Someone you referred just joined FitOS. Keep sharing to earn your reward!',
        type:    'referral_conversion',
        metadata: {
          new_client_id,
          conversions_so_far: newConversions,
          trainer_id,
        },
      });
    }

    return new Response(JSON.stringify({
      ok:             true,
      conversions:    newConversions,
      reward_issued:  rewardIssued,
      reward_message: rewardMessage,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    console.error('process-referral-conversion error:', err);
    return new Response(JSON.stringify({ error: err.message ?? 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
