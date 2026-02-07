import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TERRA_API_KEY = Deno.env.get('TERRA_API_KEY')!;
const TERRA_DEV_ID = Deno.env.get('TERRA_DEV_ID')!;
const TERRA_WEBHOOK_SECRET = Deno.env.get('TERRA_WEBHOOK_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthenticateRequest {
  provider: string;
  platform?: 'web' | 'native';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from JWT
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

    const { provider, platform }: AuthenticateRequest = await req.json();

    if (!provider) {
      throw new Error('Provider is required');
    }

    // Generate a reference ID for this connection
    const referenceId = `${user.id}_${provider}_${Date.now()}`;

    // Pass platform through to the callback so it can redirect appropriately
    const callbackPlatform = platform || 'web';
    const redirectUri = `${SUPABASE_URL}/functions/v1/terra-callback?platform=${callbackPlatform}`;

    // Call Terra API to generate auth URL
    const terraResponse = await fetch('https://api.tryterra.co/v2/auth/generateAuthUrl', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'dev-id': TERRA_DEV_ID,
        'x-api-key': TERRA_API_KEY,
      },
      body: JSON.stringify({
        resource: provider,
        reference_id: referenceId,
        language: 'en',
        redirect_uri: redirectUri,
      }),
    });

    if (!terraResponse.ok) {
      const errorData = await terraResponse.json();
      throw new Error(`Terra API error: ${JSON.stringify(errorData)}`);
    }

    const terraData = await terraResponse.json();

    // Store pending connection with reference_id
    // We'll complete it in the callback after user authorizes
    await supabase
      .from('wearable_connections')
      .insert({
        client_id: user.id,
        provider: provider,
        terra_user_id: referenceId, // Temporary, will be updated on callback
        is_active: false, // Not active until callback completes
      });

    return new Response(
      JSON.stringify({
        auth_url: terraData.auth_url,
        reference_id: referenceId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Terra authenticate error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
