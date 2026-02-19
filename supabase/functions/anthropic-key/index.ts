/**
 * Claude Max Configuration Edge Function
 *
 * Provides Claude configuration for AI coaching chat using Claude Max subscription.
 * This function no longer provides an API key - instead it directs clients to use
 * the Claude Max subscription which provides API access included in the subscription.
 *
 * Claude Max provides:
 * - API access included in subscription (no per-token charges)
 * - Higher rate limits than pay-as-you-go
 * - Access to latest models (Claude Sonnet 4.5, Opus 4.5)
 *
 * Environment variables required:
 * - None (uses Claude Max subscription instead of API key)
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Verify user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Missing Authorization header' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Supabase client to verify JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Verify the user's JWT token
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(`Claude Max configuration accessed by user: ${user.id}`);

    // Return Claude Max configuration
    // No API key needed - Claude Max subscription provides API access
    return new Response(
      JSON.stringify({
        subscription: 'claude-max',
        models: {
          fast: 'claude-3-5-haiku-20241022', // Latest Haiku for fast responses
          standard: 'claude-sonnet-4-5-20250514', // Latest Sonnet 4.5 for standard queries
          advanced: 'claude-opus-4-5-20251101', // Opus 4.5 for complex reasoning
        },
        features: {
          apiAccess: true,
          rateLimitTier: 'max', // Higher rate limits than pay-as-you-go
          includedInSubscription: true,
        },
        userId: user.id,
        message: 'Using Claude Max subscription - no per-token charges',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in claude-max-config function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
