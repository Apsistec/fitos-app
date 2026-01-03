import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-11-20.acacia',
});

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

    // Get request body
    const { userId, returnUrl, refreshUrl } = await req.json();

    // Verify the request is for the authenticated user
    if (userId !== user.id) {
      throw new Error('Unauthorized: user mismatch');
    }

    // Check if trainer already has a Stripe account
    const { data: trainerProfile, error: profileError } = await supabase
      .from('trainer_profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    if (profileError) {
      throw new Error('Trainer profile not found');
    }

    let accountId = trainerProfile?.stripe_account_id;

    // Create a new Stripe Connect account if one doesn't exist
    if (!accountId) {
      // Get user email from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .single();

      const account = await stripe.accounts.create({
        type: 'standard',
        email: profile?.email,
        metadata: {
          fitos_user_id: userId,
        },
        business_profile: {
          name: profile?.full_name || undefined,
        },
      });

      accountId = account.id;

      // Save the account ID to the database
      await supabase
        .from('trainer_profiles')
        .update({ stripe_account_id: accountId })
        .eq('id', userId);
    }

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl || `${returnUrl}?stripe_refresh=true`,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return new Response(JSON.stringify({ url: accountLink.url, accountId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in stripe-connect-onboarding:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
