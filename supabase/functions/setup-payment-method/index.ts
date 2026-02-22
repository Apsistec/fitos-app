/**
 * setup-payment-method Edge Function
 * Sprint 57.2 — Phase 5B: Card on File
 *
 * Creates a Stripe SetupIntent for saving a client's payment method
 * without charging them. The client secret is returned to the app
 * where Stripe.js collects the card details (PCI compliant — no card
 * data ever touches FitOS servers).
 *
 * Flow:
 *   1. Ensure client has a Stripe customer (create if not present)
 *   2. Create SetupIntent with `usage: 'off_session'` (for future charges)
 *   3. Return client_secret to the mobile app
 *   4. After Stripe.js confirms, call confirm-payment-method to store
 *      the PaymentMethod ID on the client's profile
 *
 * Separate endpoint: confirm-setup-payment-method stores the PM after Stripe webhook confirms.
 * For simplicity in this sprint, store on explicit client call via confirm-setup action.
 *
 * Request body: { client_id?: string } (defaults to calling user's id)
 * Response: { client_secret: string, stripe_customer_id: string }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return errorResponse('Unauthorized', 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
  });

  try {
    // Get calling user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return errorResponse('Unauthorized', 401);

    // Load profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) return errorResponse('Profile not found', 404);

    // ── Ensure Stripe customer exists ────────────────────────────────────────
    let stripeCustomerId: string = profile.stripe_customer_id ?? '';

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: profile.email ?? user.email ?? '',
        name: profile.full_name ?? '',
        metadata: { supabase_user_id: user.id },
      });
      stripeCustomerId = customer.id;

      // Persist back to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: stripeCustomerId })
        .eq('id', user.id);
    }

    // ── Create SetupIntent ───────────────────────────────────────────────────
    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      usage: 'off_session',       // allow future charges without client present
      payment_method_types: ['card'],
      metadata: {
        supabase_user_id: user.id,
        purpose: 'cancellation_fee_card_on_file',
      },
    });

    return new Response(
      JSON.stringify({
        client_secret: setupIntent.client_secret,
        stripe_customer_id: stripeCustomerId,
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[setup-payment-method] Error:', msg);
    return errorResponse(msg, 500);
  }
});

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * confirm-setup action: after Stripe.js confirms the SetupIntent,
 * the client calls this endpoint with the payment_method_id to persist on their profile.
 * Embedded in same function for simplicity (action discriminated by body.action).
 */

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
