import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@20.3.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

/**
 * Stripe Webhook Handler for V2 Thin Events
 *
 * Thin events (v2) contain only event metadata and a `related_object` reference
 * instead of the full object snapshot. To get the resource data, we call
 * `fetchRelatedObject()` or use the Stripe API directly.
 *
 * This endpoint handles v2 events such as:
 * - v2.core.account.closed (connected account closed/deauthorized)
 *
 * V1 snapshot events (checkout.session.completed, invoice.paid, etc.)
 * are handled by the separate `stripe-webhook` endpoint.
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
});

const thinWebhookSecret = Deno.env.get('STRIPE_THIN_WEBHOOK_SECRET')!;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const body = await req.text();

    // Parse the thin event notification using the v2-specific method
    // parseEventNotification() verifies the signature and returns
    // a typed EventNotification with relatedObject and helper methods
    const eventNotification = stripe.parseEventNotification(
      body,
      signature,
      thinWebhookSecret
    );

    const supabase = createSupabaseClient();

    console.log('Processing thin event:', eventNotification.type);
    console.log('Related object:', JSON.stringify(eventNotification.relatedObject));

    switch (eventNotification.type) {
      case 'v2.core.account.closed': {
        // The related_object contains the account ID
        const accountId = eventNotification.relatedObject?.id;

        if (accountId) {
          // Optionally fetch the full account object for additional details
          // Note: A closed account may return limited data
          let accountDetails: Stripe.Account | null = null;
          try {
            accountDetails = await stripe.accounts.retrieve(accountId);
          } catch (retrieveErr) {
            // Account may already be fully deleted, that's OK
            console.log(`Could not retrieve account ${accountId} (may be fully closed):`, retrieveErr);
          }

          // Clear Stripe connection for the trainer
          await supabase
            .from('trainer_profiles')
            .update({
              stripe_account_id: null,
              stripe_onboarding_complete: false,
            })
            .eq('stripe_account_id', accountId);

          // Mark the connect account as inactive
          await supabase
            .from('stripe_connect_accounts')
            .update({
              charges_enabled: false,
              payouts_enabled: false,
              disabled_reason: 'account_closed',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', accountId);

          console.log(`Account closed (v2 thin) for ${accountId}`);
        } else {
          console.warn('v2.core.account.closed event received but no related_object ID found');
        }
        break;
      }

      default:
        console.log('Unhandled thin event type:', eventNotification.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Thin webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
