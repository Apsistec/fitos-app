import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@20.3.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

/**
 * Stripe Webhook Handler for V1 Snapshot Events
 *
 * Snapshot events contain the full object data in `event.data.object`.
 * This handles all v1 events (checkout, invoice, subscription, payout, transfer, etc.).
 *
 * V2 thin events (like v2.core.account.closed) are handled by the separate
 * `stripe-webhook-thin` endpoint which uses parseEventNotification().
 */

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;

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
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    const supabase = createSupabaseClient();

    console.log('Processing webhook event:', event.type);

    switch (event.type) {
      case 'account.updated': {
        const account = event.data.object as Stripe.Account;
        const userId = account.metadata?.fitos_user_id;

        if (userId) {
          // Update stripe_connect_accounts table with onboarding status
          const isComplete =
            account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled;

          await supabase
            .from('stripe_connect_accounts')
            .update({
              charges_enabled: account.charges_enabled,
              payouts_enabled: account.payouts_enabled,
              details_submitted: account.details_submitted,
              currently_due: account.requirements?.currently_due || [],
              eventually_due: account.requirements?.eventually_due || [],
              past_due: account.requirements?.past_due || [],
              disabled_reason: account.requirements?.disabled_reason || null,
              onboarding_completed_at: isComplete ? new Date().toISOString() : null,
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_account_id', account.id);

          // Also update trainer_profiles for backward compatibility
          await supabase
            .from('trainer_profiles')
            .update({
              stripe_onboarding_complete: isComplete,
            })
            .eq('id', userId);

          console.log(`Updated account ${account.id} for user ${userId}: complete=${isComplete}`);
        }
        break;
      }

      case 'account.application.deauthorized': {
        // Handle when a connected account disconnects (v1 event)
        const application = event.data.object as Stripe.Application;
        const accountId = event.account;

        if (accountId) {
          // Find trainer by Stripe account ID and clear it
          await supabase
            .from('trainer_profiles')
            .update({
              stripe_account_id: null,
              stripe_onboarding_complete: false,
            })
            .eq('stripe_account_id', accountId);

          console.log(`Cleared Stripe connection for account ${accountId}`);
        }
        break;
      }

      case 'v2.core.account.closed': {
        // NOTE: This v2 event is primarily handled by the stripe-webhook-thin
        // endpoint using parseEventNotification(). If it arrives here as a
        // snapshot event, we handle it as a fallback for backward compatibility.
        const accountId = event.account;

        if (accountId) {
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

          console.log(`Account closed (v2 snapshot fallback) for ${accountId}`);
        }
        break;
      }

      // Payment-related events
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('Checkout session completed:', session.id);

        if (session.mode === 'subscription' && session.subscription) {
          const clientId = session.metadata?.fitos_client_id;
          const trainerId = session.metadata?.fitos_trainer_id;
          const customerId = session.customer as string;

          if (clientId && trainerId) {
            // Get subscription details from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(
              session.subscription as string
            );

            const priceId = stripeSubscription.items.data[0]?.price.id;
            const price = stripeSubscription.items.data[0]?.price;

            // Create subscription in database
            await supabase.from('subscriptions').insert({
              client_id: clientId,
              trainer_id: trainerId,
              stripe_subscription_id: stripeSubscription.id,
              stripe_customer_id: customerId,
              stripe_price_id: priceId,
              status: stripeSubscription.status,
              amount_cents: price?.unit_amount || 0,
              currency: price?.currency || 'usd',
              interval: price?.recurring?.interval || 'month',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
            });

            // Update client's trainer assignment
            await supabase
              .from('client_profiles')
              .update({ trainer_id: trainerId })
              .eq('id', clientId);

            console.log(`Created subscription for client ${clientId} with trainer ${trainerId}`);
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice paid:', invoice.id);

        if (invoice.subscription) {
          // Update subscription status and period
          const stripeSubscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          );

          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
              current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          console.log(`Updated subscription ${invoice.subscription} to active`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('Invoice payment failed:', invoice.id);

        if (invoice.subscription) {
          // Update subscription status to past_due
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          // Stripe Smart Retries is enabled by default in Stripe Dashboard
          // It uses ML to optimize retry timing (avg +57% recovery rate)
          // We just need to log the failure and track it for analytics

          // Get subscription details for recovery tracking
          const { data: subData } = await supabase
            .from('subscriptions')
            .select('client_id, trainer_id, amount_cents')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();

          if (subData) {
            // Log failed payment for analytics
            await supabase.from('payment_failures').insert({
              subscription_id: invoice.subscription as string,
              client_id: subData.client_id,
              trainer_id: subData.trainer_id,
              invoice_id: invoice.id,
              amount_cents: subData.amount_cents,
              attempt_count: invoice.attempt_count || 1,
              failure_code: invoice.last_payment_error?.code || null,
              failure_message: invoice.last_payment_error?.message || null,
              next_payment_attempt: invoice.next_payment_attempt
                ? new Date(invoice.next_payment_attempt * 1000).toISOString()
                : null,
              smart_retry_enabled: true,
              status: 'retrying',
            });

            // Send notification to trainer (via Edge Function or email service)
            // This allows trainer to reach out proactively to client
            await supabase.functions.invoke('send-payment-failure-notification', {
              body: {
                trainerId: subData.trainer_id,
                clientId: subData.client_id,
                invoiceId: invoice.id,
                amount: subData.amount_cents / 100,
                attemptCount: invoice.attempt_count || 1,
              },
            });
          }

          console.log(`Payment failed for subscription ${invoice.subscription}, Smart Retries active`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription updated:', subscription.id);

        await supabase
          .from('subscriptions')
          .update({
            status: subscription.status,
            cancel_at_period_end: subscription.cancel_at_period_end,
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('Subscription deleted:', subscription.id);

        await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_subscription_id', subscription.id);

        break;
      }

      // Stripe Connect payout events
      case 'payout.created':
      case 'payout.updated':
      case 'payout.paid':
      case 'payout.failed':
      case 'payout.canceled': {
        const payout = event.data.object as Stripe.Payout;
        const stripeAccountId = event.account;

        if (stripeAccountId) {
          // Find the account in our database
          const { data: accountData } = await supabase
            .from('stripe_connect_accounts')
            .select('id')
            .eq('stripe_account_id', stripeAccountId)
            .single();

          if (accountData) {
            // Upsert payout record
            await supabase.from('stripe_payouts').upsert({
              account_id: accountData.id,
              stripe_payout_id: payout.id,
              amount_cents: payout.amount,
              currency: payout.currency,
              status: payout.status,
              arrival_date: payout.arrival_date
                ? new Date(payout.arrival_date * 1000).toISOString().split('T')[0]
                : null,
              failure_code: payout.failure_code || null,
              failure_message: payout.failure_message || null,
              description: payout.description || null,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'stripe_payout_id',
            });

            console.log(`Processed payout ${payout.id} for account ${stripeAccountId}: ${payout.status}`);
          }
        }
        break;
      }

      // Stripe Connect transfer events
      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer;

        // Find destination account
        const { data: destAccount } = await supabase
          .from('stripe_connect_accounts')
          .select('id')
          .eq('stripe_account_id', transfer.destination)
          .single();

        // Find source account (if available)
        let sourceAccountId = null;
        if (transfer.source_transaction) {
          const { data: sourceAccount } = await supabase
            .from('stripe_connect_accounts')
            .select('id')
            .eq('stripe_account_id', event.account || '')
            .single();
          sourceAccountId = sourceAccount?.id || null;
        }

        if (destAccount) {
          await supabase.from('stripe_transfers').insert({
            stripe_transfer_id: transfer.id,
            source_account_id: sourceAccountId,
            destination_account_id: destAccount.id,
            source_transaction_id: transfer.source_transaction,
            amount_cents: transfer.amount,
            currency: transfer.currency,
            description: transfer.description || null,
            trainer_id: transfer.metadata?.fitos_trainer_id || null,
            facility_id: transfer.metadata?.fitos_facility_id || null,
            client_id: transfer.metadata?.fitos_client_id || null,
            commission_percent: transfer.metadata?.commission_percent
              ? parseFloat(transfer.metadata.commission_percent)
              : null,
          });

          console.log(`Recorded transfer ${transfer.id} to account ${transfer.destination}`);
        }
        break;
      }

      default:
        console.log('Unhandled event type:', event.type);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
