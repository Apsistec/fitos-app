/**
 * charge-cancellation-fee Edge Function
 * Sprint 57.2 — Phase 5B: Cancellation Fee Enforcement
 *
 * Charges a late-cancel or no-show fee to the client's card on file.
 * If the charge fails (declined, no card), creates a ledger debit entry
 * so the debt is tracked without being lost.
 *
 * Flow:
 *   1. Load appointment → resolve cancellation policy → calculate fee amount
 *   2. If fee_amount = 0 → no charge needed, handle session forfeit only
 *   3. If forfeit_session: decrement client_services.sessions_remaining
 *   4. If fee_amount > 0 and client has stripe_payment_method_id:
 *      a. Create Stripe PaymentIntent (off-session, confirm immediately)
 *      b. On success: log sale_transaction record, return success
 *      c. On failure: insert client_ledger debit entry, return partial_success
 *   5. If no payment method: insert ledger debit, return partial_success
 *
 * Request body: { appointment_id: string, fee_type: 'late_cancel' | 'no_show' }
 * Response: { success, charged, fee_amount, ledger_entry?, stripe_payment_intent_id? }
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  appointment_id: string;
  fee_type: 'late_cancel' | 'no_show';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } }
  );

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
    apiVersion: '2024-06-20',
  });

  try {
    const body: RequestBody = await req.json();
    const { appointment_id, fee_type } = body;

    if (!appointment_id || !fee_type) {
      return errorResponse('appointment_id and fee_type are required', 400);
    }

    // ── Step 1: Load appointment + policy + client billing info ─────────────
    const { data: appt, error: apptError } = await supabase
      .from('appointments')
      .select(`
        id,
        trainer_id,
        client_id,
        service_type_id,
        client_service_id,
        start_at,
        service_type:service_types (
          name,
          base_price,
          num_sessions_deducted,
          cancel_window_minutes
        ),
        client:profiles!appointments_client_id_fkey (
          full_name,
          stripe_customer_id,
          stripe_payment_method_id
        )
      `)
      .eq('id', appointment_id)
      .single();

    if (apptError || !appt) {
      return errorResponse(`Appointment not found: ${apptError?.message}`, 404);
    }

    // ── Step 2: Resolve cancellation policy ──────────────────────────────────
    // Look for service-type-specific policy first, then global
    const { data: policies } = await supabase
      .from('cancellation_policies')
      .select('*')
      .eq('trainer_id', appt.trainer_id)
      .or(`service_type_id.eq.${appt.service_type_id},service_type_id.is.null`);

    const specificPolicy = (policies ?? []).find(
      (p: any) => p.service_type_id === appt.service_type_id
    );
    const globalPolicy = (policies ?? []).find((p: any) => !p.service_type_id);
    const policy = specificPolicy ?? globalPolicy;

    const feeAmount = policy
      ? fee_type === 'no_show'
        ? Number(policy.no_show_fee_amount)
        : Number(policy.late_cancel_fee_amount)
      : 0;

    const forfeitSession = policy?.forfeit_session ?? true;

    // ── Step 3: Session forfeiture ───────────────────────────────────────────
    if (forfeitSession && appt.client_service_id) {
      const sessionsDeducted = (appt.service_type as any)?.num_sessions_deducted ?? 1;
      const { error: deductError } = await supabase.rpc('decrement_sessions_remaining', {
        p_client_service_id: appt.client_service_id,
        p_sessions: sessionsDeducted,
      });
      if (deductError) {
        console.error('[charge-fee] Session deduction failed:', deductError.message);
        // Non-fatal — continue with fee charge
      }
    }

    // ── Step 4: Fee charge ───────────────────────────────────────────────────
    if (feeAmount <= 0) {
      return successResponse({
        success: true,
        charged: false,
        fee_amount: 0,
        message: 'No fee configured for this policy',
      });
    }

    const clientProfile = appt.client as any;
    const stripeCustomerId = clientProfile?.stripe_customer_id;
    const paymentMethodId = clientProfile?.stripe_payment_method_id;

    if (!stripeCustomerId || !paymentMethodId) {
      // No card on file — record as ledger debit (debt)
      const ledgerEntry = await createLedgerDebit(supabase, appt, feeAmount, fee_type);
      return successResponse({
        success: true,
        charged: false,
        fee_amount: feeAmount,
        ledger_entry: ledgerEntry,
        message: 'No payment method on file — recorded as ledger debit',
      });
    }

    // Attempt Stripe charge (off-session)
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(feeAmount * 100), // Stripe uses cents
        currency: 'usd',
        customer: stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: true,
        description: `${fee_type === 'no_show' ? 'No-show' : 'Late cancellation'} fee — ${(appt.service_type as any)?.name ?? 'Session'}`,
        metadata: {
          appointment_id,
          fee_type,
          trainer_id: appt.trainer_id,
          client_id: appt.client_id,
        },
      });

      // ── Step 5a: Charge succeeded — log sale transaction ─────────────────
      const { error: txError } = await supabase
        .from('sale_transactions')
        .insert({
          trainer_id:             appt.trainer_id,
          client_id:              appt.client_id,
          appointment_id,
          stripe_payment_intent_id: paymentIntent.id,
          amount:                 feeAmount,
          currency:               'usd',
          status:                 'completed',
          description:            `${fee_type} fee`,
        })
        .select()
        .single();

      if (txError) {
        console.error('[charge-fee] sale_transaction insert failed:', txError.message);
      }

      return successResponse({
        success: true,
        charged: true,
        fee_amount: feeAmount,
        stripe_payment_intent_id: paymentIntent.id,
      });

    } catch (stripeErr: unknown) {
      // ── Step 5b: Charge failed — record as ledger debit ──────────────────
      const msg = stripeErr instanceof Error ? stripeErr.message : String(stripeErr);
      console.error('[charge-fee] Stripe charge failed:', msg);

      const ledgerEntry = await createLedgerDebit(
        supabase, appt, feeAmount, fee_type,
        undefined, // no payment intent
      );

      return successResponse({
        success: true,
        charged: false,
        fee_amount: feeAmount,
        ledger_entry: ledgerEntry,
        message: `Card declined — recorded as ledger debit. Stripe error: ${msg}`,
      });
    }

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[charge-fee] Fatal error:', msg);
    return errorResponse(msg, 500);
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createLedgerDebit(
  supabase: ReturnType<typeof createClient>,
  appt: any,
  amount: number,
  feeType: 'late_cancel' | 'no_show',
  stripePaymentIntentId?: string,
): Promise<any> {
  const reason = feeType === 'no_show' ? 'no_show_fee' : 'late_cancel_fee';
  const { data } = await supabase
    .from('client_ledger')
    .insert({
      client_id:               appt.client_id,
      trainer_id:              appt.trainer_id,
      entry_type:              'debit',
      amount,
      reason,
      appointment_id:          appt.id,
      stripe_payment_intent_id: stripePaymentIntentId ?? null,
    })
    .select()
    .single();
  return data;
}

function successResponse(body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
