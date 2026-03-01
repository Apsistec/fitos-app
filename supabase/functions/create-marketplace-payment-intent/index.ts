/**
 * create-marketplace-payment-intent Edge Function — Sprint 65 (Phase 6)
 *
 * Creates a Stripe PaymentIntent for a client purchasing a digital product.
 * Uses Stripe Connect to route payment → trainer's connected account (via platform fee).
 *
 * Flow:
 *  1. Validate auth + ownership check (prevent double-purchase)
 *  2. Load product from digital_products
 *  3. Ensure Stripe Customer exists for the client
 *  4. Create PaymentIntent on trainer's connected account with application_fee_amount
 *  5. Insert pending purchase row (stripe_payment_intent_id populated)
 *  6. Return { clientSecret } — frontend confirms with Stripe.js / Capacitor Stripe
 *
 * Note: The stripe-webhook-thin function handles payment_intent.succeeded to
 * mark the purchase as complete and trigger fulfillment.
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

// Platform fee: 10% of sale price
const PLATFORM_FEE_PERCENT = 0.10;

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreatePaymentIntentBody {
  product_id: string;
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

  // ── Parse body ────────────────────────────────────────────────────────────
  let body: CreatePaymentIntentBody;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { product_id } = body;
  if (!product_id) {
    return new Response(JSON.stringify({ error: 'product_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ── Service-role client for privileged reads ──────────────────────────────
  const adminSupabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    // ── Load product ──────────────────────────────────────────────────────────
    const { data: product, error: productError } = await adminSupabase
      .from('digital_products')
      .select('id, title, price_cents, currency, is_published, trainer_id, stripe_price_id')
      .eq('id', product_id)
      .eq('is_published', true)
      .single();

    if (productError || !product) {
      return new Response(JSON.stringify({ error: 'Product not found or not published' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Free product — should not call this function, return early
    if (product.price_cents === 0) {
      return new Response(JSON.stringify({ error: 'Free products do not require payment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Duplicate purchase check ──────────────────────────────────────────────
    const { data: existing } = await adminSupabase
      .from('digital_product_purchases')
      .select('id')
      .eq('client_id', user.id)
      .eq('product_id', product_id)
      .single();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Already purchased' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── Trainer Stripe Connect account ────────────────────────────────────────
    const { data: trainerProfile } = await adminSupabase
      .from('profiles')
      .select('stripe_account_id, stripe_customer_id')
      .eq('id', product.trainer_id)
      .single();

    // ── Ensure Stripe Customer for client ─────────────────────────────────────
    const { data: clientProfile } = await adminSupabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single();

    let stripeCustomerId = clientProfile?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: clientProfile?.email ?? undefined,
        name:  clientProfile?.full_name ?? undefined,
        metadata: { fitos_user_id: user.id },
      });
      stripeCustomerId = customer.id;
      await adminSupabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // ── Create PaymentIntent ──────────────────────────────────────────────────
    const applicationFee = Math.round(product.price_cents * PLATFORM_FEE_PERCENT);

    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount:   product.price_cents,
      currency: product.currency ?? 'usd',
      customer: stripeCustomerId,
      metadata: {
        fitos_product_id: product_id,
        fitos_client_id:  user.id,
        fitos_trainer_id: product.trainer_id,
      },
      description: `FitOS: ${product.title}`,
    };

    // Route through Connect if trainer has a connected account
    if (trainerProfile?.stripe_account_id) {
      (paymentIntentParams as Record<string, unknown>)['application_fee_amount'] = applicationFee;
      (paymentIntentParams as Record<string, unknown>)['transfer_data'] = {
        destination: trainerProfile.stripe_account_id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create(paymentIntentParams);

    // ── Insert pending purchase record ────────────────────────────────────────
    await adminSupabase.from('digital_product_purchases').insert({
      client_id:               user.id,
      product_id,
      stripe_payment_intent_id: paymentIntent.id,
    });

    return new Response(
      JSON.stringify({ clientSecret: paymentIntent.client_secret }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Payment error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
