import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

/**
 * Process Instant Payout for Trainer
 *
 * Creates an instant payout from the trainer's Stripe Connect account.
 * Instant payouts incur a 1% fee (minimum $0.50) and arrive within 30 minutes.
 * Standard payouts are free and arrive in 2 business days.
 *
 * Sprint 28: Stripe Connect Marketplace
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient(authHeader);

    // Get Stripe account ID from request
    const { accountId } = await req.json();

    // Verify the account belongs to the authenticated user
    const { data: accountData, error: accountError } = await supabase
      .from('stripe_connect_accounts')
      .select('stripe_account_id, charges_enabled, payouts_enabled')
      .eq('user_id', user.id)
      .eq('stripe_account_id', accountId)
      .single();

    if (accountError || !accountData) {
      throw new Error('Stripe account not found or unauthorized');
    }

    // Verify account is fully onboarded
    if (!accountData.charges_enabled || !accountData.payouts_enabled) {
      throw new Error('Account onboarding not complete. Please complete setup first.');
    }

    // Get current balance
    const balance = await stripe.balance.retrieve({
      stripeAccount: accountId,
    });

    // Check if there are available funds
    const availableAmount = balance.available[0]?.amount || 0;
    if (availableAmount <= 0) {
      throw new Error('No available balance to payout');
    }

    // Instant payouts require a debit card on file
    // First, check if the account has instant payout capability
    const account = await stripe.accounts.retrieve(accountId);
    const hasInstantPayouts = account.capabilities?.instant_payouts === 'active';

    if (!hasInstantPayouts) {
      throw new Error(
        'Instant payouts not available. Please add a debit card in your payment settings or use standard payouts.'
      );
    }

    // Create instant payout
    // Note: Stripe automatically deducts the 1% fee (minimum $0.50)
    const payout = await stripe.payouts.create(
      {
        amount: availableAmount,
        currency: 'usd',
        method: 'instant',
        statement_descriptor: 'FitOS Instant Payout',
      },
      {
        stripeAccount: accountId,
      }
    );

    // Record payout in database
    await supabase.from('stripe_payouts').insert({
      stripe_account_id: accountId,
      payout_id: payout.id,
      amount_cents: payout.amount,
      currency: payout.currency,
      status: payout.status,
      arrival_date: payout.arrival_date ? new Date(payout.arrival_date * 1000).toISOString() : null,
      method: 'instant',
      destination: payout.destination,
      created_at: new Date(payout.created * 1000).toISOString(),
    });

    return new Response(
      JSON.stringify({
        success: true,
        payout: {
          id: payout.id,
          amount: payout.amount,
          status: payout.status,
          arrivalDate: payout.arrival_date,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing instant payout:', error);

    // Return user-friendly error messages
    let errorMessage = (error as Error).message;

    // Handle specific Stripe errors
    if (error instanceof Stripe.errors.StripeError) {
      switch (error.code) {
        case 'balance_insufficient':
          errorMessage = 'Insufficient balance for instant payout';
          break;
        case 'instant_payouts_unsupported':
          errorMessage = 'Instant payouts not supported. Please add a debit card in payment settings.';
          break;
        case 'payout_reconciliation_not_ready':
          errorMessage = 'Balance not yet available for payout. Please try again later.';
          break;
        default:
          errorMessage = error.message;
      }
    }

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
