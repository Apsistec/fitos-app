import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@20.3.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
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

    const { trainerId, name, description, amountCents, currency, interval } = await req.json();

    // Verify the authenticated user matches the trainerId
    if (user.id !== trainerId) {
      throw new Error('Unauthorized: trainer mismatch');
    }

    // Get trainer's Stripe account
    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id, business_name')
      .eq('id', trainerId)
      .single();

    if (!trainerProfile?.stripe_account_id) {
      throw new Error('Please connect your Stripe account first');
    }

    // Get trainer's profile for product name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', trainerId)
      .single();

    // Create or get product
    const productName = trainerProfile.business_name || profile?.full_name || 'Training';

    // Search for existing product
    const products = await stripe.products.list({
      limit: 1,
      active: true,
    });

    let productId: string;
    const existingProduct = products.data.find(
      p => p.metadata?.fitos_trainer_id === trainerId
    );

    if (existingProduct) {
      productId = existingProduct.id;
    } else {
      // Create new product
      const product = await stripe.products.create({
        name: `${productName} - Coaching`,
        description: description || `Personal training with ${productName}`,
        metadata: {
          fitos_trainer_id: trainerId,
        },
      });
      productId = product.id;
    }

    // Map interval to Stripe format
    const stripeInterval = interval === 'week' ? 'week' : interval === 'year' ? 'year' : 'month';

    // Create price
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amountCents,
      currency: currency || 'usd',
      recurring: {
        interval: stripeInterval,
      },
      nickname: name,
      metadata: {
        fitos_trainer_id: trainerId,
        fitos_tier_name: name,
      },
    });

    return new Response(JSON.stringify({ priceId: price.id, productId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-create-price:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
