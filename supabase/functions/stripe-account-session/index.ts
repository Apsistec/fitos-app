import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@20.3.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2026-01-28.clover',
});

/**
 * Create Stripe Account Session for Embedded Connect Components
 * Required for displaying Stripe's embedded UI components
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
      .select('stripe_account_id')
      .eq('user_id', user.id)
      .eq('stripe_account_id', accountId)
      .single();

    if (accountError || !accountData) {
      throw new Error('Stripe account not found or unauthorized');
    }

    // Create account session for embedded components
    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        // Enable all embedded components
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
        balances: { enabled: true },
        documents: { enabled: true },
        notification_banner: { enabled: true },
        payment_details: { enabled: true },
        payments: { enabled: true },
        payouts: { enabled: true },
        payouts_list: { enabled: true },
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: accountSession.client_secret,
        expiresAt: new Date(accountSession.expires_at * 1000).toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error creating account session:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
