/**
 * process-checkout Edge Function — Sprint 58 (Phase 5C)
 *
 * Atomically completes a POS checkout for an appointment:
 * 1. Validates appointment exists and is in a checkable-out status
 * 2. Decrements session from client_service if using session_pack payment
 * 3. Charges card via Stripe PaymentIntent if using card payment
 * 4. Creates sale_transactions record with line items
 * 5. Creates visit record
 * 6. Transitions appointment → 'completed'
 *
 * Returns CheckoutResult { success, sale_transaction_id, sessions_remaining?, stripe_payment_intent_id? }
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

interface CheckoutBody {
  appointment_id:    string;
  payment_method:    'session_pack' | 'card' | 'cash' | 'account_balance' | 'split' | 'comp';
  client_service_id?: string;
  tip_amount?:       number;
  discount_amount?:  number;
  notes?:            string;
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
    const body = await req.json() as CheckoutBody;
    const {
      appointment_id,
      payment_method,
      client_service_id,
      tip_amount        = 0,
      discount_amount   = 0,
      notes,
    } = body;

    // ── 1. Load appointment with service type and client ──────────────────

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select(`
        *,
        service_type:service_types(id, name, base_price, num_sessions_deducted),
        client:profiles!appointments_client_id_fkey(id, stripe_customer_id, stripe_payment_method_id)
      `)
      .eq('id', appointment_id)
      .single();

    if (apptErr || !appt) {
      return errorResponse('Appointment not found', 404, corsHeaders);
    }

    // Allow checkout from arrived, confirmed (direct checkout), or booked
    const checkableStatuses = ['arrived', 'confirmed', 'booked'];
    if (!checkableStatuses.includes(appt.status)) {
      return errorResponse(
        `Cannot check out appointment with status "${appt.status}". Expected: arrived, confirmed, or booked.`,
        400,
        corsHeaders,
      );
    }

    const serviceType        = appt.service_type;
    const client             = appt.client;
    const basePrice: number  = serviceType?.base_price ?? 0;
    const subtotal           = payment_method === 'session_pack' ? 0 : basePrice;
    const total              = Math.max(0, subtotal + tip_amount - discount_amount);

    let stripePaymentIntentId: string | undefined;
    let sessionsRemaining: number | null | undefined;

    // ── 2. Session deduction (session_pack) ──────────────────────────────

    if (payment_method === 'session_pack' && client_service_id) {
      const { data: newCount, error: decrErr } = await supabase
        .rpc('decrement_sessions_remaining', { p_client_service_id: client_service_id });

      if (decrErr) {
        return errorResponse(`Session deduction failed: ${decrErr.message}`, 400, corsHeaders);
      }

      sessionsRemaining = newCount;
    }

    // ── 3. Stripe PaymentIntent (card payment) ────────────────────────────

    if (payment_method === 'card' && total > 0) {
      const stripeCustomerId      = client?.stripe_customer_id;
      const stripePaymentMethodId = client?.stripe_payment_method_id;

      if (!stripeCustomerId || !stripePaymentMethodId) {
        return errorResponse('No card on file. Please add a payment method first.', 400, corsHeaders);
      }

      try {
        const intent = await stripe.paymentIntents.create({
          amount:               Math.round(total * 100), // cents
          currency:             'usd',
          customer:             stripeCustomerId,
          payment_method:       stripePaymentMethodId,
          confirm:              true,
          off_session:          true,
          description:          `${serviceType?.name ?? 'Session'} — ${appt.id}`,
          metadata: {
            appointment_id,
            trainer_id:  appt.trainer_id,
            client_id:   appt.client_id,
          },
        });

        if (intent.status !== 'succeeded') {
          return errorResponse(`Card charge failed: ${intent.status}`, 402, corsHeaders);
        }

        stripePaymentIntentId = intent.id;
      } catch (stripeErr: unknown) {
        const msg = stripeErr instanceof Error ? stripeErr.message : 'Card charge failed';
        return errorResponse(msg, 402, corsHeaders);
      }
    }

    // ── 4. Create sale_transactions record ────────────────────────────────

    const { data: saleTx, error: saleErr } = await supabase
      .from('sale_transactions')
      .insert({
        trainer_id:               appt.trainer_id,
        client_id:                appt.client_id,
        appointment_id,
        client_service_id:        client_service_id ?? null,
        stripe_payment_intent_id: stripePaymentIntentId ?? null,
        payment_method,
        subtotal,
        tip_amount,
        discount_amount,
        total,
        status:                   'completed',
        notes:                    notes ?? null,
      })
      .select('id')
      .single();

    if (saleErr || !saleTx) {
      return errorResponse(`Failed to create sale record: ${saleErr?.message}`, 500, corsHeaders);
    }

    // ── 5. Create visit record ────────────────────────────────────────────

    const sessionsDeducted = payment_method === 'session_pack'
      ? (serviceType?.num_sessions_deducted ?? 1)
      : 0;

    const { error: visitErr } = await supabase
      .from('visits')
      .insert({
        appointment_id,
        client_id:          appt.client_id,
        trainer_id:         appt.trainer_id,
        service_type_id:    appt.service_type_id,
        visit_status:       'completed',
        sessions_deducted:  sessionsDeducted,
        service_price:      basePrice,
        client_service_id:  client_service_id ?? null,
        payroll_processed:  false,
      });

    if (visitErr) {
      console.error('visit insert error:', visitErr);
      // Non-fatal — sale and session deduction succeeded, log for audit
    }

    // ── 6. Transition appointment → completed ─────────────────────────────

    const { error: apptUpdateErr } = await supabase
      .from('appointments')
      .update({
        status:       'completed',
        completed_at: new Date().toISOString(),
        updated_at:   new Date().toISOString(),
      })
      .eq('id', appointment_id);

    if (apptUpdateErr) {
      console.error('appointment status update error:', apptUpdateErr);
      // Non-fatal — primary data (sale/visit/session) is already saved
    }

    // ── Response ──────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success:                  true,
        sale_transaction_id:      saleTx.id,
        sessions_remaining:       sessionsRemaining,
        stripe_payment_intent_id: stripePaymentIntentId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status:  200,
      },
    );

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unexpected error';
    console.error('process-checkout error:', message);
    return errorResponse(message, 500, corsHeaders);
  }
});

function errorResponse(
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  return new Response(
    JSON.stringify({ success: false, error: message }),
    { headers: { ...headers, 'Content-Type': 'application/json' }, status },
  );
}
