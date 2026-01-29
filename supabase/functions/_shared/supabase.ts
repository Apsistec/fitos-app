import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as jose from 'https://deno.land/x/jose@v5.2.0/index.ts';

export const createSupabaseClient = (authHeader?: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      headers: authHeader ? { Authorization: authHeader } : {},
    },
  });
};

// Verify JWT using jose library against Supabase's JWKS endpoint
// This works with both legacy HS256 and new ES256 asymmetric keys
export const getUserFromAuth = async (authHeader: string) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

  console.log('[getUserFromAuth] Starting auth verification');
  console.log('[getUserFromAuth] Supabase URL:', supabaseUrl);

  // Extract the JWT token from the header
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    console.error('[getUserFromAuth] No token found in auth header');
    throw new Error('No token in auth header');
  }

  // Log first/last chars of token for debugging (don't log full token)
  console.log('[getUserFromAuth] Token received (first 20 chars):', token.substring(0, 20));

  try {
    // Create a remote JWK set from Supabase's JWKS endpoint
    const jwksUrl = `${supabaseUrl}/auth/v1/.well-known/jwks.json`;
    console.log('[getUserFromAuth] JWKS URL:', jwksUrl);

    const JWKS = jose.createRemoteJWKSet(new URL(jwksUrl));

    // Verify the JWT against the JWKS
    const expectedIssuer = `${supabaseUrl}/auth/v1`;
    console.log('[getUserFromAuth] Expected issuer:', expectedIssuer);

    const { payload } = await jose.jwtVerify(token, JWKS, {
      issuer: expectedIssuer,
      audience: 'authenticated',
    });

    console.log('[getUserFromAuth] JWKS verification successful, user:', payload.sub);

    // Return user object from JWT claims
    return {
      id: payload.sub as string,
      email: payload.email as string,
      role: payload.role as string,
      aud: payload.aud as string,
      user_metadata: (payload as any).user_metadata || {},
      app_metadata: (payload as any).app_metadata || {},
    };
  } catch (e) {
    console.error('[getUserFromAuth] JWKS verification failed:', e);

    // If JWKS verification fails, fall back to getUser() for legacy symmetric keys
    console.log('[getUserFromAuth] Attempting fallback with getUser()');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    if (!supabaseAnonKey) {
      console.error('[getUserFromAuth] SUPABASE_ANON_KEY not set!');
      throw new Error('Server configuration error: missing anon key');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData?.user) {
      console.error('[getUserFromAuth] Fallback getUser() also failed:', userError?.message);
      throw new Error(`Auth failed: JWKS error: ${e}, getUser error: ${userError?.message || 'Invalid token'}`);
    }

    console.log('[getUserFromAuth] Fallback getUser() successful, user:', userData.user.id);
    return userData.user;
  }
};
