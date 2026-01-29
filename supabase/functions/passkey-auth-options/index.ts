import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateAuthenticationOptions } from 'https://esm.sh/@simplewebauthn/server@13.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

// For local development, use 'localhost'. For production, use the actual domain.
const RP_ID = Deno.env.get('PASSKEY_RP_ID') || 'localhost';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    // Get request body (email is optional for discoverable credentials)
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    let allowCredentials: Array<{ id: string; transports: string[] }> = [];
    let userId: string | null = null;

    // If email provided, get user's specific passkeys
    if (email) {
      // Get user by email
      const { data: userData, error: userError } = await supabase.auth.admin.getUserByEmail(email);

      if (userError || !userData.user) {
        // Don't reveal if user exists - return generic options for discoverable credentials
        console.log('User not found, using discoverable credentials');
      } else {
        userId = userData.user.id;

        // Get user's passkeys
        const { data: passkeys, error: passkeysError } = await supabase
          .from('passkeys')
          .select('id, transports')
          .eq('user_id', userId);

        if (!passkeysError && passkeys && passkeys.length > 0) {
          allowCredentials = passkeys.map((pk) => ({
            id: pk.id,
            transports: pk.transports || [],
          }));
        }
      }
    }

    // Generate authentication options
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
      userVerification: 'preferred',
    });

    // Store challenge temporarily for verification
    // For local development, use http://localhost:4200. For production, use the actual origin.
    const expectedOrigin = Deno.env.get('PASSKEY_ORIGIN') || 'http://localhost:4200';
    const { error: challengeError } = await supabase
      .from('passkey_challenges')
      .insert({
        user_id: userId, // Can be null for discoverable credentials
        challenge: options.challenge,
        type: 'authentication',
        options: {
          rpId: RP_ID,
          expectedOrigin,
        },
      });

    if (challengeError) {
      throw challengeError;
    }

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating authentication options:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
