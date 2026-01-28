import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { verifyRegistrationResponse } from 'https://esm.sh/@simplewebauthn/server@13.0.0';
import { corsHeaders } from '../_shared/cors.ts';
import { createSupabaseClient, getUserFromAuth } from '../_shared/supabase.ts';

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

    // Get request body
    const body = await req.json();
    const { response, name } = body; // response from authenticator, optional name for the passkey

    if (!response) {
      throw new Error('Missing registration response');
    }

    // Get the stored challenge
    const { data: challengeData, error: challengeError } = await supabase
      .from('passkey_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('type', 'registration')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (challengeError || !challengeData) {
      throw new Error('No pending registration challenge found');
    }

    // Check if challenge is expired
    if (new Date(challengeData.expires_at) < new Date()) {
      throw new Error('Registration challenge expired');
    }

    const { webAuthnUserId, rpId, expectedOrigin } = challengeData.options;

    // Verify the registration response
    const verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeData.challenge,
      expectedOrigin,
      expectedRPID: rpId,
    });

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error('Registration verification failed');
    }

    const { registrationInfo } = verification;
    const { credential, credentialDeviceType, credentialBackedUp } = registrationInfo;

    // Store the passkey in the database
    const { error: insertError } = await supabase.from('passkeys').insert({
      id: credential.id,
      user_id: user.id,
      public_key: credential.publicKey,
      webauthn_user_id: webAuthnUserId,
      counter: credential.counter,
      device_type: credentialDeviceType,
      backed_up: credentialBackedUp,
      transports: credential.transports || [],
      name: name || 'Passkey',
    });

    if (insertError) {
      throw insertError;
    }

    // Update profile to mark passkey enrollment
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ passkey_enrolled_at: new Date().toISOString() })
      .eq('id', user.id);

    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't throw, passkey is already saved
    }

    // Clean up the used challenge
    await supabase
      .from('passkey_challenges')
      .delete()
      .eq('id', challengeData.id);

    return new Response(
      JSON.stringify({
        verified: true,
        passkey: {
          id: credential.id,
          name: name || 'Passkey',
          deviceType: credentialDeviceType,
          backedUp: credentialBackedUp,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error verifying registration:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
