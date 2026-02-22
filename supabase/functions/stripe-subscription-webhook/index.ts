/**
 * stripe-subscription-webhook Edge Function — Sprint 59 (Phase 5C)
 *
 * Handles Stripe subscription lifecycle events:
 *
 * invoice.payment_succeeded
 *   → refresh sessions_remaining to autopay_session_count on client_services
 *   → create client_ledger credit entry (receipt reference)
 *
 * invoice.payment_failed
 *   → mark client_services.is_active = false (pauses session access)
 *   → create client_ledger debit entry for owed amount
 *   → notify trainer via Supabase notification
 *
 * customer.subscription.deleted
 *   → deactivate client_services
 *   → notify trainer
 *
 * Stripe webhook signature is verified via STRIPE_WEBHOOK_SECRET env var.
 * (Register this function URL in Stripe Dashboard → Webhooks)
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';

serve(async (req: Request) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  // ── Verify Stripe signature ───────────────────────────────────────────────

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook verification failed';
    console.error('Webhook signature error:', msg);
    return new Response(`Webhook Error: ${msg}`, { status: 400 });
  }

  console.log(`Processing Stripe event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {

      // ── Successful payment: refresh sessions ──────────────────────────────

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (!subscriptionId) break;

        // Load client_services row for this subscription
        const { data: cs, error: csErr } = await supabase
          .from('client_services')
          .select('id, trainer_id, client_id, pricing_option_id, pricing_option:pricing_options(autopay_session_count)')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (csErr || !cs) {
          console.error('client_services not found for subscription:', subscriptionId);
          break;
        }

        const sessionsToRefresh: number =
          (cs.pricing_option as { autopay_session_count?: number })?.autopay_session_count ?? 0;

        // Refresh sessions_remaining + ensure is_active = true (re-activate if was paused)
        await supabase
          .from('client_services')
          .update({
            sessions_remaining: sessionsToRefresh > 0 ? sessionsToRefresh : null,
            is_active:          true,
            updated_at:         new Date().toISOString(),
          })
          .eq('id', cs.id);

        // Create ledger credit entry for audit
        const invoiceAmount = (invoice.amount_paid ?? 0) / 100;
        if (invoiceAmount > 0) {
          await supabase.from('client_ledger').insert({
            client_id:               cs.client_id,
            trainer_id:              cs.trainer_id,
            entry_type:              'credit',
            amount:                  invoiceAmount,
            reason:                  'session_credit',
            stripe_payment_intent_id: typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : invoice.payment_intent?.id ?? null,
            notes: `Autopay renewal — ${sessionsToRefresh} session${sessionsToRefresh !== 1 ? 's' : ''} refreshed`,
          });
        }

        console.log(`Sessions refreshed for client_service ${cs.id}: ${sessionsToRefresh} sessions`);
        break;
      }

      // ── Failed payment: pause access + log debt ───────────────────────────

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = typeof invoice.subscription === 'string'
          ? invoice.subscription
          : invoice.subscription?.id;

        if (!subscriptionId) break;

        const { data: cs, error: csErr } = await supabase
          .from('client_services')
          .select('id, trainer_id, client_id')
          .eq('stripe_subscription_id', subscriptionId)
          .single();

        if (csErr || !cs) {
          console.error('client_services not found for subscription:', subscriptionId);
          break;
        }

        // Pause access
        await supabase
          .from('client_services')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', cs.id);

        // Log the outstanding debt
        const amountDue = (invoice.amount_due ?? 0) / 100;
        if (amountDue > 0) {
          await supabase.from('client_ledger').insert({
            client_id:  cs.client_id,
            trainer_id: cs.trainer_id,
            entry_type: 'debit',
            amount:     amountDue,
            reason:     'no_show_fee',  // closest available reason — represents owed amount
            notes:      `Autopay payment failed — $${amountDue.toFixed(2)} owed. Stripe subscription: ${subscriptionId}`,
          });
        }

        // Notify trainer (insert into notifications table if it exists)
        try {
          await supabase.from('notifications').insert({
            user_id:  cs.trainer_id,
            type:     'payment_failed',
            title:    'Autopay Payment Failed',
            body:     `A client autopay charge failed. Session access has been paused. Amount owed: $${amountDue.toFixed(2)}.`,
            metadata: { client_service_id: cs.id, subscription_id: subscriptionId },
          });
        } catch {
          // notifications table may not exist yet — non-fatal
        }

        console.log(`Autopay failed for client_service ${cs.id} — access paused`);
        break;
      }

      // ── Subscription cancelled: deactivate ────────────────────────────────

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: cs, error: csErr } = await supabase
          .from('client_services')
          .select('id, trainer_id, client_id')
          .eq('stripe_subscription_id', subscription.id)
          .single();

        if (csErr || !cs) {
          console.error('client_services not found for deleted subscription:', subscription.id);
          break;
        }

        await supabase
          .from('client_services')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', cs.id);

        // Notify trainer
        try {
          await supabase.from('notifications').insert({
            user_id:  cs.trainer_id,
            type:     'subscription_cancelled',
            title:    'Autopay Contract Cancelled',
            body:     'A client autopay contract has been cancelled. Session access has been deactivated.',
            metadata: { client_service_id: cs.id, subscription_id: subscription.id },
          });
        } catch {
          // Non-fatal
        }

        console.log(`Subscription deleted — client_service ${cs.id} deactivated`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status:  200,
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Handler error';
    console.error(`Error processing ${event.type}:`, message);
    // Return 200 to prevent Stripe from retrying (log the error instead)
    return new Response(JSON.stringify({ received: true, error: message }), {
      headers: { 'Content-Type': 'application/json' },
      status:  200,
    });
  }
});
