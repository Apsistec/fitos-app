import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@20.3.0';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2026-01-28.clover',
  httpClient: Stripe.createFetchHttpClient(),
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GetPaymentsRequest {
  limit?: number;
  starting_after?: string; // For pagination
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(jwt);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { limit = 20, starting_after }: GetPaymentsRequest = await req.json();

    // Get user's profile to determine role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      throw new Error('Profile not found');
    }

    let payments: any[] = [];
    let hasMore = false;

    if (profile.role === 'trainer' || profile.role === 'gym_owner') {
      // Trainer view: Get their Stripe Connect account charges
      const { data: trainerProfile } = await supabase
        .from('trainer_profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .single();

      if (!trainerProfile?.stripe_account_id) {
        throw new Error('No Stripe account connected');
      }

      // Get charges (payouts) for this Connect account
      const charges = await stripe.charges.list(
        {
          limit,
          starting_after,
        },
        {
          stripeAccount: trainerProfile.stripe_account_id,
        }
      );

      payments = charges.data.map((charge) => ({
        id: charge.id,
        amount: charge.amount / 100, // Convert cents to dollars
        currency: charge.currency,
        status: charge.status,
        description: charge.description || 'Subscription payment',
        created: charge.created,
        customer: charge.customer,
        receipt_url: charge.receipt_url,
      }));

      hasMore = charges.has_more;
    } else {
      // Client view: Get their payment history via invoices
      const { data: clientProfile } = await supabase
        .from('client_profiles')
        .select('stripe_customer_id')
        .eq('id', user.id)
        .single();

      if (!clientProfile?.stripe_customer_id) {
        throw new Error('No payment history found');
      }

      // Get invoices for this customer
      const invoices = await stripe.invoices.list({
        customer: clientProfile.stripe_customer_id,
        limit,
        starting_after,
      });

      payments = invoices.data.map((invoice) => ({
        id: invoice.id,
        amount: invoice.amount_paid / 100,
        currency: invoice.currency,
        status: invoice.status,
        description: invoice.description || 'Subscription',
        created: invoice.created,
        invoice_pdf: invoice.invoice_pdf,
        hosted_invoice_url: invoice.hosted_invoice_url,
        period_start: invoice.period_start,
        period_end: invoice.period_end,
      }));

      hasMore = invoices.has_more;
    }

    return new Response(
      JSON.stringify({
        payments,
        has_more: hasMore,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Get payments error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
