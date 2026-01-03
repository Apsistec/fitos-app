import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
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
          // Update trainer profile with onboarding status
          const isComplete =
            account.details_submitted &&
            account.charges_enabled &&
            account.payouts_enabled;

          await supabase
            .from('trainer_profiles')
            .update({
              stripe_onboarding_complete: isComplete,
            })
            .eq('id', userId);

          console.log(`Updated trainer ${userId} Stripe status: complete=${isComplete}`);
        }
        break;
      }

      case 'account.application.deauthorized': {
        // Handle when a connected account disconnects
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
          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('stripe_subscription_id', invoice.subscription);

          console.log(`Updated subscription ${invoice.subscription} to past_due`);
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
