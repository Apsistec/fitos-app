import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    const { subscriptionId, cancelImmediately = false } = await req.json();

    if (!subscriptionId) {
      throw new Error('Subscription ID is required');
    }

    // Get subscription from database
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .single();

    if (subError || !subscription) {
      throw new Error('Subscription not found');
    }

    // Verify user has permission (must be client or trainer)
    if (subscription.client_id !== user.id && subscription.trainer_id !== user.id) {
      throw new Error('Unauthorized: not your subscription');
    }

    // Cancel in Stripe
    if (subscription.stripe_subscription_id) {
      if (cancelImmediately) {
        await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
      } else {
        // Cancel at period end (more user-friendly)
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true,
        });
      }
    }

    // Update local subscription
    if (cancelImmediately) {
      // Immediate cancellation - set status to canceled
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          status: 'canceled',
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
    } else {
      // Cancel at period end - set flag
      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (updateError) {
        console.error('Error updating subscription:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cancelAtPeriodEnd: !cancelImmediately,
        message: cancelImmediately
          ? 'Subscription canceled immediately'
          : 'Subscription will cancel at the end of the billing period',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in stripe-cancel-subscription:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
