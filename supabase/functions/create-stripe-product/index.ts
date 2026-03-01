/**
 * create-stripe-product Edge Function — Sprint 65 (Phase 6)
 *
 * Called when a trainer creates or reprices a digital product.
 * Flow:
 *  1. Validate request (auth, body)
 *  2. Create/update a Stripe Product
 *  3. Create a Stripe Price (price_cents > 0) or mark as free
 *  4. Return { stripe_product_id, stripe_price_id }
 *
 * The Angular service then inserts the digital_products row with these IDs.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateStripeProductBody {
  title:              string;
  description?:       string;
  type:               string;        // ProductType
  price_cents:        number;
  currency?:          string;        // default 'usd'
  existing_product_id?: string;      // Stripe product ID if repricing
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // ── Auth ─────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Verify trainer role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, stripe_account_id')
    .eq('id', user.id)
    .single();

  if (!profile || !['trainer', 'gym_owner'].includes(profile.role)) {
    return new Response(JSON.stringify({ error: 'Trainers only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: CreateStripeProductBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const {
    title,
    description,
    type,
    price_cents,
    currency = 'usd',
    existing_product_id,
  } = body;

  if (!title || price_cents === undefined) {
    return new Response(JSON.stringify({ error: 'title and price_cents are required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // ── Create or update Stripe Product ──────────────────────────────────────
    let stripeProductId = existing_product_id ?? '';

    if (stripeProductId) {
      // Update existing product metadata
      await stripe.products.update(stripeProductId, {
        name: title,
        description: description ?? undefined,
      });
    } else {
      // Create new Stripe Product
      const stripeProduct = await stripe.products.create({
        name: title,
        description: description ?? undefined,
        metadata: {
          fitos_trainer_id: user.id,
          fitos_product_type: type,
        },
      });
      stripeProductId = stripeProduct.id;
    }

    // ── Create Stripe Price (only for paid products) ──────────────────────────
    let stripePriceId = '';

    if (price_cents > 0) {
      const price = await stripe.prices.create({
        product:       stripeProductId,
        unit_amount:   price_cents,
        currency,
        metadata: { fitos_trainer_id: user.id },
      });
      stripePriceId = price.id;
    }

    return new Response(
      JSON.stringify({ stripe_product_id: stripeProductId, stripe_price_id: stripePriceId }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
