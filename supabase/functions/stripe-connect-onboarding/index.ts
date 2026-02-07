import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@20.3.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
});

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    // Get request body
    const { userId, businessType = 'individual', returnUrl, refreshUrl } = await req.json();

    // Verify the request is for the authenticated user
    if (userId !== user.id) {
      throw new Error('Unauthorized: user mismatch');
    }

    // Check if user already has a Stripe Connect account
    const { data: existingAccount } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, onboarding_completed_at')
      .eq('user_id', userId)
      .single();

    let accountId = existingAccount?.stripe_account_id;

    // Create a new Stripe Connect Express account if one doesn't exist
    if (!accountId) {
      // Get user profile for prefill
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      const account = await stripe.accounts.create({
        type: 'express', // Changed from 'standard' to 'express'
        country: 'US',
        email: profile?.email,
        business_type: businessType,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          mcc: '7941', // Sports clubs, fields, and promoters
          product_description: 'Personal training and fitness coaching services',
          name: profile?.full_name || undefined,
        },
        metadata: {
          fitos_user_id: userId,
        },
      });

      accountId = account.id;

      // Save the account to the new stripe_connect_accounts table
      await supabase
        .from('stripe_connect_accounts')
        .insert({
          user_id: userId,
          stripe_account_id: accountId,
          account_type: 'express',
          business_type: businessType,
          country: 'US',
          default_currency: 'usd',
        });

      // Create default settings
      const { data: accountRecord } = await supabase
        .from('stripe_connect_accounts')
        .select('id')
        .eq('stripe_account_id', accountId)
        .single();

      if (accountRecord) {
        await supabase
          .from('stripe_connect_settings')
          .insert({
            account_id: accountRecord.id,
            application_fee_percent: 10.00, // 10% platform fee
            payout_schedule: 'daily',
            payout_delay_days: 2,
          });
      }

      // Also update trainer_profiles for backward compatibility
      await supabase
        .from('trainer_profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', userId);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${returnUrl}?refresh=true`,
      return_url: returnUrl || `${Deno.env.get('APP_URL')}/settings/payments?success=true`,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({
      url: accountLink.url,
      accountId,
      expiresAt: new Date(accountLink.expires_at * 1000).toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-connect-onboarding:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
