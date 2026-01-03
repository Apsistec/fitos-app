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

    const { clientId, trainerId, priceId, successUrl, cancelUrl } = await req.json();

    // Verify the authenticated user matches the clientId
    if (user.id !== clientId) {
      throw new Error('Unauthorized: client mismatch');
    }

    // Get or create Stripe customer
    const { data: clientProfile } = await supabase
      .from('client_profiles')
      .select('stripe_customer_id')
      .eq('id', clientId)
      .single();

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', clientId)
      .single();

    let customerId = clientProfile?.stripe_customer_id;

    if (!customerId) {
      // Create new Stripe customer
      const customer = await stripe.customers.create({
        email: profile?.email,
        name: profile?.full_name || undefined,
        metadata: {
          fitos_user_id: clientId,
        },
      });
      customerId = customer.id;

      // Save customer ID
      await supabase
        .from('client_profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', clientId);
    }

    // Get trainer's Stripe account
    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('id', trainerId)
      .single();

    if (!trainerProfile?.stripe_account_id) {
      throw new Error('Trainer has not connected Stripe');
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        application_fee_percent: 10, // FitOS takes 10%
        transfer_data: {
          destination: trainerProfile.stripe_account_id,
        },
        metadata: {
          fitos_client_id: clientId,
          fitos_trainer_id: trainerId,
        },
      },
      metadata: {
        fitos_client_id: clientId,
        fitos_trainer_id: trainerId,
      },
    });

    return new Response(JSON.stringify({ url: session.url, sessionId: session.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-create-checkout:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
