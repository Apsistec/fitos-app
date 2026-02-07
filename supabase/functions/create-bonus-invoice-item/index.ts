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

    const { customer_id, amount_cents, description, metadata } = await req.json();

    if (!customer_id || !amount_cents || !description) {
      throw new Error('Missing required fields: customer_id, amount_cents, description');
    }

    // Verify the trainer has a connected Stripe account
    const { data: trainerProfile } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('id', user.id)
      .single();

    if (!trainerProfile?.stripe_account_id) {
      throw new Error('Trainer has not connected Stripe');
    }

    const stripeAccountId = trainerProfile.stripe_account_id;

    // Create invoice item for milestone bonus
    // This will be added to the customer's next invoice
    const invoiceItem = await stripe.invoiceItems.create(
      {
        customer: customer_id,
        amount: amount_cents,
        currency: 'usd',
        description: description,
        metadata: {
          type: 'milestone_bonus',
          ...metadata,
        },
      },
      {
        stripeAccount: stripeAccountId, // Connected account
      }
    );

    // Optionally create and finalize invoice immediately
    // For now, we'll add to next billing cycle
    // If you want to bill immediately:
    // const invoice = await stripe.invoices.create({
    //   customer: customer_id,
    //   auto_advance: true, // Auto-finalize
    // }, {
    //   stripeAccount: stripeAccountId,
    // });
    //
    // const finalizedInvoice = await stripe.invoices.finalizeInvoice(invoice.id, {
    //   stripeAccount: stripeAccountId,
    // });

    return new Response(
      JSON.stringify({
        success: true,
        invoice_item_id: invoiceItem.id,
        invoice_id: invoiceItem.invoice || null,
        amount_cents: invoiceItem.amount,
        customer_id: invoiceItem.customer,
        description: invoiceItem.description,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating bonus invoice item:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
