import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyAuthenticationResponse } from 'https://esm.sh/@simplewebauthn/server@13.0.0';
import { SignJWT } from 'https://esm.sh/jose@5.2.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient } from '../_shared/supabase.ts';

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseClient();

    // Get request body
    const body = await req.json();
    const { response } = body;

    if (!response) {
      throw new Error('Missing authentication response');
    }

    // Find the passkey by credential ID
    const { data: passkey, error: passkeyError } = await supabase
      .from('passkeys')
      .select('*, profiles!inner(email, full_name, role)')
      .eq('id', response.id)
      .single();

    if (passkeyError || !passkey) {
      throw new Error('Passkey not found');
    }

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('type', 'authentication')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeData) {
      throw new Error('No pending authentication challenge found');
    }

    // Check if challenge is expired
    if (new Date(challengeData.expires_at) < new Date()) {
      throw new Error('Authentication challenge expired');
    }

    const { rpId, expectedOrigin } = challengeData.options;

    // Convert public_key from Postgres bytea to Uint8Array
    let publicKeyBytes: Uint8Array;
    if (passkey.public_key instanceof Uint8Array) {
      publicKeyBytes = passkey.public_key;
    } else if (typeof passkey.public_key === 'string') {
      // Handle hex-encoded bytea
      const hex = passkey.public_key.replace(/^\\x/, '');
      publicKeyBytes = new Uint8Array(hex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));
    } else {
      throw new Error('Invalid public key format');
    }

    // Verify the authentication response
    const verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin,
      expectedRPID: rpId,
      credential: {
        id: passkey.id,
        publicKey: publicKeyBytes,
        counter: passkey.counter,
        transports: passkey.transports || [],
      },
    });

    if (!verification.verified) {
      throw new Error('Authentication verification failed');
    }

    const { authenticationInfo } = verification;

    // Update the counter
    const { error: updateError } = await supabase
      .from('passkeys')
      .update({
        counter: authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', passkey.id);

    if (updateError) {
      console.error('Error updating counter:', updateError);
    }

    // Clean up the used challenge
    await supabase
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeData.id);

    // Generate a custom JWT for Supabase authentication
    const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT secret not configured');
    }

    const secretKey = new TextEncoder().encode(jwtSecret);

    // Create access token (short-lived)
    const accessToken = await new SignJWT({
      sub: passkey.user_id,
      email: passkey.profiles.email,
      role: 'authenticated',
      user_role: passkey.profiles.role,
      aud: 'authenticated',
      // MFA verified since passkey is a strong factor
      aal: 'aal2',
      amr: [{ method: 'webauthn', timestamp: Math.floor(Date.now() / 1000) }],
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .setIssuer(Deno.env.get('SUPABASE_URL')! + '/auth/v1')
      .sign(secretKey);

    // Create refresh token (longer-lived)
    const refreshToken = await new SignJWT({
      sub: passkey.user_id,
      session_id: crypto.randomUUID(),
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setIssuer(Deno.env.get('SUPABASE_URL')! + '/auth/v1')
      .sign(secretKey);

    return new Response(
      JSON.stringify({
        verified: true,
        session: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: passkey.user_id,
            email: passkey.profiles.email,
            user_metadata: {
              full_name: passkey.profiles.full_name,
              role: passkey.profiles.role,
            },
          },
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error verifying authentication:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
