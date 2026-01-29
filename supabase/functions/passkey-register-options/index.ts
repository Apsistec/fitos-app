// Passkey registration options - JWT verification disabled at gateway level (config.toml)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { generateRegistrationOptions } from 'https://esm.sh/@simplewebauthn/server@13.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const RP_NAME = 'FitOS';
// For local development, use 'localhost'. For production, use the actual domain.
const RP_ID = Deno.env.get('PASSKEY_RP_ID') || 'localhost';

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

    const token = authHeader.replace('Bearer ', '');
    console.log('[passkey-register-options] Token received, length:', token.length);

    // Create Supabase client and verify token using getUser()
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    console.log('[passkey-register-options] SUPABASE_URL:', supabaseUrl);
    console.log('[passkey-register-options] SUPABASE_ANON_KEY present:', !!supabaseAnonKey);
    console.log('[passkey-register-options] SUPABASE_SERVICE_ROLE_KEY present:', !!supabaseServiceKey);

    // Use anon key client to verify the user's token
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userError } = await authClient.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('[passkey-register-options] Auth error:', userError?.message);
      throw new Error('Unauthorized');
    }

    const user = userData.user;
    console.log('[passkey-register-options] User authenticated:', user.id);

    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

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
    // For local development, use http://localhost:4200. For production, use the actual origin.
    const expectedOrigin = Deno.env.get('PASSKEY_ORIGIN') || 'http://localhost:4200';
    const { error: challengeError } = await supabase
      .from('passkey_challenges')
      .insert({
        user_id: user.id,
        challenge: options.challenge,
        type: 'registration',
        options: {
          webAuthnUserId,
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
    console.error('Error generating registration options:', error);
    const isAuthError = error.message === 'Unauthorized' || error.message?.includes('JWT');
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
        code: isAuthError ? 401 : 400,
      }),
      {
        status: isAuthError ? 401 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
