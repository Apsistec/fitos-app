import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@13.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

const RP_NAME = 'FitOS';
const RP_ID = Deno.env.get('PASSKEY_RP_ID') || 'fitos-mobile.web.app';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Get the authenticated user
    const user = await getUserFromAuth(authHeader);
    const supabase = createSupabaseClient();

    // Get user's existing passkeys to exclude them
    const { data: existingPasskeys, error: passkeysError } = await supabase
      .from('passkeys')
      .select('id, transports')
      .eq('user_id', user.id);

    if (passkeysError) {
      throw passkeysError;
    }

    // Get user profile for display name
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    // Generate a unique WebAuthn user ID (not the same as auth user ID)
    const webAuthnUserId = crypto.randomUUID();

    // Generate registration options
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userName: profile.email || user.email || 'user',
      userDisplayName: profile.full_name || user.email || 'FitOS User',
      userID: new TextEncoder().encode(webAuthnUserId),
      attestationType: 'none',
      excludeCredentials: (existingPasskeys || []).map((pk) => ({
        id: pk.id,
        transports: pk.transports || [],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform', // Prefer built-in authenticators (Face ID, Touch ID, Windows Hello)
      },
    });

    // Store challenge temporarily for verification
    const { error: challengeError } = await supabase
      .from('passkey_challenges')
      .insert({
        user_id: user.id,
        challenge: options.challenge,
        type: 'registration',
        options: {
          webAuthnUserId,
          rpId: RP_ID,
          expectedOrigin: Deno.env.get('PASSKEY_ORIGIN') || 'https://fitos-mobile.web.app',
        },
      });

    if (challengeError) {
      throw challengeError;
    }

    return new Response(JSON.stringify(options), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating registration options:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
