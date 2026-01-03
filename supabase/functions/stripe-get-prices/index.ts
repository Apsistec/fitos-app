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

    const { trainerId } = await req.json();

    // If no trainerId provided, use authenticated user (trainer viewing own prices)
    const targetTrainerId = trainerId || user.id;

    // Get trainer's Stripe account
    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('id', targetTrainerId)
      .single();

    if (!trainerProfile?.stripe_account_id) {
      // Return empty prices if trainer hasn't connected Stripe
      return new Response(JSON.stringify({ prices: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Find products for this trainer
    const products = await stripe.products.list({
      active: true,
      limit: 100,
    });

    const trainerProducts = products.data.filter(
      p => p.metadata?.fitos_trainer_id === targetTrainerId
    );

    if (trainerProducts.length === 0) {
      return new Response(JSON.stringify({ prices: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Get prices for all trainer products
    const allPrices: any[] = [];

    for (const product of trainerProducts) {
      const prices = await stripe.prices.list({
        product: product.id,
        active: true,
        limit: 100,
      });

      for (const price of prices.data) {
        allPrices.push({
          id: price.id,
          name: price.nickname || product.name,
          description: product.description,
          amountCents: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval || 'month',
          stripePriceId: price.id,
          isActive: price.active,
        });
      }
    }

    return new Response(JSON.stringify({ prices: allPrices }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-get-prices:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
