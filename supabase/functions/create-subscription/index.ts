/**
 * create-subscription Edge Function — Sprint 59 (Phase 5C)
 *
 * Enrolls a client in an autopay contract via Stripe Subscriptions.
 * Flow:
 * 1. Load pricing_option (must be type=contract with autopay_interval)
 * 2. Ensure Stripe Customer exists for client (create if missing)
 * 3. Upsert a Stripe Product + recurring Price for the pricing option
 * 4. Create Stripe Subscription (default_payment_method from client card on file)
 * 5. Insert client_services row with stripe_subscription_id
 *
 * Returns: { clientServiceId, stripeSubscriptionId, stripeCustomerId }
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

interface CreateSubscriptionBody {
  client_id:          string;
  pricing_option_id:  string;
  start_date?:        string; // ISO date, defaults to now
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const body = await req.json() as CreateSubscriptionBody;
    const { client_id, pricing_option_id } = body;

    // ── 1. Load pricing option ────────────────────────────────────────────

    const { data: opt, error: optErr } = await supabase
      .from('pricing_options')
      .select('*')
      .eq('id', pricing_option_id)
      .single();

    if (optErr || !opt) {
      return errorResponse('Pricing option not found', 404, corsHeaders);
    }

    if (opt.option_type !== 'contract') {
      return errorResponse('Pricing option must be type "contract"', 400, corsHeaders);
    }

    if (!opt.autopay_interval) {
      return errorResponse('Contract pricing option has no autopay_interval configured', 400, corsHeaders);
    }

    // ── 2. Load client profile + ensure Stripe customer ──────────────────

    const { data: clientProfile, error: clientErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, stripe_customer_id, stripe_payment_method_id')
      .eq('id', client_id)
      .single();

    if (clientErr || !clientProfile) {
      return errorResponse('Client not found', 404, corsHeaders);
    }

    if (!clientProfile.stripe_payment_method_id) {
      return errorResponse('Client has no card on file. Please add a payment method first.', 400, corsHeaders);
    }

    let stripeCustomerId: string = clientProfile.stripe_customer_id ?? '';

    if (!stripeCustomerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email:    clientProfile.email,
        name:     clientProfile.full_name ?? undefined,
        metadata: { supabase_user_id: client_id },
      });
      stripeCustomerId = customer.id;

      // Persist to profile
      await supabase
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', client_id);
    }

    // Attach payment method to customer (idempotent)
    try {
      await stripe.paymentMethods.attach(clientProfile.stripe_payment_method_id, {
        customer: stripeCustomerId,
      });
    } catch {
      // Already attached — ignore
    }

    // Set as default payment method
    await stripe.customers.update(stripeCustomerId, {
      invoice_settings: { default_payment_method: clientProfile.stripe_payment_method_id },
    });

    // ── 3. Upsert Stripe Product for this pricing option ──────────────────

    // Look up or create a product keyed to the pricing_option_id
    const productSearch = await stripe.products.search({
      query: `metadata["pricing_option_id"]:"${pricing_option_id}"`,
    });

    let stripeProductId: string;

    if (productSearch.data.length > 0) {
      stripeProductId = productSearch.data[0].id;
    } else {
      const product = await stripe.products.create({
        name:     opt.name,
        metadata: { pricing_option_id, trainer_id: opt.trainer_id },
      });
      stripeProductId = product.id;
    }

    // ── 4. Create Stripe Price for this interval ──────────────────────────

    const intervalMap: Record<string, Stripe.PriceCreateParams.Recurring.Interval> = {
      weekly:    'week',
      biweekly:  'week',   // biweekly = every 2 weeks via interval_count
      monthly:   'month',
    };

    const interval      = intervalMap[opt.autopay_interval] ?? 'month';
    const intervalCount = opt.autopay_interval === 'biweekly' ? 2 : 1;

    const price = await stripe.prices.create({
      product:     stripeProductId,
      unit_amount: Math.round(opt.price * 100),  // cents
      currency:    'usd',
      recurring:   { interval, interval_count: intervalCount },
      metadata:    { pricing_option_id },
    });

    // ── 5. Create Stripe Subscription ────────────────────────────────────

    const subscription = await stripe.subscriptions.create({
      customer:                stripeCustomerId,
      items:                   [{ price: price.id }],
      default_payment_method:  clientProfile.stripe_payment_method_id,
      payment_behavior:        'default_incomplete',
      payment_settings:        { save_default_payment_method: 'on_subscription' },
      expand:                  ['latest_invoice.payment_intent'],
      metadata: {
        pricing_option_id,
        trainer_id:  opt.trainer_id,
        client_id,
      },
    });

    // ── 6. Insert client_services row ─────────────────────────────────────

    const now = new Date();
    const sessionsPerCycle = opt.autopay_session_count ?? 0;

    const { data: clientService, error: csErr } = await supabase
      .from('client_services')
      .insert({
        client_id,
        trainer_id:              opt.trainer_id,
        pricing_option_id,
        stripe_subscription_id:  subscription.id,
        sessions_remaining:      sessionsPerCycle > 0 ? sessionsPerCycle : null,
        sessions_total:          sessionsPerCycle > 0 ? sessionsPerCycle : null,
        activated_at:            now.toISOString(),
        is_active:               true,
      })
      .select('id')
      .single();

    if (csErr || !clientService) {
      // Subscription was created — cancel it to avoid orphan charges
      await stripe.subscriptions.cancel(subscription.id);
      return errorResponse(`Failed to create client service: ${csErr?.message}`, 500, corsHeaders);
    }

    return new Response(
      JSON.stringify({
        clientServiceId:      clientService.id,
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status:  200,
      },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('create-subscription error:', message);
    return errorResponse(message, 500, corsHeaders);
  }
});

function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { headers: { ...headers, 'Content-Type': 'application/json' }, status },
  );
}
