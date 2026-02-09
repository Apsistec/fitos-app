import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';
import { PasskeyService } from '../services/passkey.service';

/**
 * Guard that checks if user has MFA enrolled and verified.
 * - If no MFA factors enrolled → redirect to /auth/mfa-setup
 * - If MFA enrolled but not verified in current session → redirect to /auth/mfa-verify
 * - If MFA verified → allow access
 */
export const mfaGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  await authService.waitForInitialization();

  // Check if user is authenticated
  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  try {
    console.log('[MFA Guard] Checking MFA factors...');

    // Check MFA factors
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      // Log detailed error for debugging
      console.error('[MFA Guard] Error listing factors:', {
        message: error.message,
        name: error.name,
        status: (error as unknown as Record<string, unknown>).status,
        code: (error as unknown as Record<string, unknown>).code,
        fullError: JSON.stringify(error, null, 2),
      });

      const errorMsg = (error.message || '').toLowerCase();
      if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx')) {
        console.warn('[MFA Guard] Edge function error - MFA API may be misconfigured. Allowing access.');
      }

      // On error, allow access but log the issue
      return true;
    }

    console.log('[MFA Guard] MFA factors:', {
      totpCount: data.totp?.length || 0,
      phoneCount: data.phone?.length || 0,
    });

    // Check if user has any verified TOTP factor
    const verifiedTotp = data.totp?.find(f => f.status === 'verified');

    if (!verifiedTotp) {
      // No MFA enrolled, redirect to setup
      console.log('[MFA Guard] No verified MFA factor, redirecting to setup');
      router.navigate(['/auth/mfa-setup']);
      return false;
    }

    // Check the assurance level of the current session
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      console.error('[MFA Guard] Error getting AAL:', {
        message: aalError.message,
        name: aalError.name,
        fullError: JSON.stringify(aalError, null, 2),
      });
      // On error, allow access
      return true;
    }

    console.log('[MFA Guard] AAL levels:', {
      current: aalData.currentLevel,
      next: aalData.nextLevel,
    });

    // If current AAL is aal1 but we need aal2 (MFA verified), redirect to verify
    if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
      console.log('[MFA Guard] Session needs MFA verification');
      router.navigate(['/auth/mfa-verify']);
      return false;
    }

    // MFA verified, allow access
    return true;
  } catch (err: unknown) {
    const errObj = err instanceof Error ? err : null;
    console.error('[MFA Guard] Unexpected error:', {
      message: errObj?.message,
      name: errObj?.name,
      stack: errObj?.stack,
    });
    // On unexpected error, allow access to prevent lockout
    return true;
  }
};

/**
 * Guard that checks if MFA is required but not yet set up.
 * Use this to redirect users to MFA setup after their first login.
 * Currently MFA is optional - this guard can be used when MFA becomes mandatory.
 */
export const mfaRequiredGuard: CanActivateFn = async () => {
  const supabase = inject(SupabaseService);
  const authService = inject(AuthService);
  const router = inject(Router);

  await authService.waitForInitialization();

  if (!authService.isAuthenticated()) {
    router.navigate(['/auth/login']);
    return false;
  }

  // If user explicitly skipped MFA setup, allow access
  // Check both the signal and sessionStorage directly for reliability
  const mfaSkippedFromSignal = authService.mfaSkipped();
  const mfaSkippedFromStorage = typeof sessionStorage !== 'undefined' && sessionStorage.getItem('fitos_mfa_skipped') === 'true';

  console.log('[MFA Required Guard] Skip check:', { fromSignal: mfaSkippedFromSignal, fromStorage: mfaSkippedFromStorage });

  if (mfaSkippedFromSignal || mfaSkippedFromStorage) {
    console.log('[MFA Required Guard] MFA was skipped for this session, allowing access');
    return true;
  }

  try {
    console.log('[MFA Required Guard] Checking MFA factors...');
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      // Log detailed error for debugging
      console.error('[MFA Required Guard] Error listing factors:', {
        message: error.message,
        name: error.name,
        status: (error as unknown as Record<string, unknown>).status,
        code: (error as unknown as Record<string, unknown>).code,
        fullError: JSON.stringify(error, null, 2),
      });

      const errorMsg = (error.message || '').toLowerCase();

      // If it's an edge function error, MFA API might not be properly configured
      // Allow access but log for debugging
      if (errorMsg.includes('edge function') || errorMsg.includes('non-2xx')) {
        console.warn('[MFA Required Guard] Edge function error - MFA API may be misconfigured. Allowing access.');
      } else if (errorMsg.includes('mfa') && errorMsg.includes('not enabled')) {
        console.warn('[MFA Required Guard] MFA not enabled in Supabase. Allowing access.');
      }

      // On any error, allow access to prevent lockout
      return true;
    }

    const hasTotp = (data.totp?.length || 0) > 0;

    console.log('[MFA Required Guard] MFA factors found:', {
      totpCount: data.totp?.length || 0,
      phoneCount: data.phone?.length || 0,
    });

    // If TOTP is set up, allow access immediately
    if (hasTotp) {
      return true;
    }

    // No TOTP - check for passkeys and linked identities as alternative MFA methods
    const passkeyService = inject(PasskeyService);
    await passkeyService.loadPasskeys();
    const hasPasskeys = passkeyService.hasPasskeys();

    // Check for linked OAuth identities (e.g., Google) beyond the primary email identity
    const { identities } = await authService.getLinkedIdentities();
    const hasLinkedOAuth = identities.some(
      (i) => i.provider !== 'email' && i.provider !== 'phone'
    );

    console.log('[MFA Required Guard] Alternative MFA check:', {
      hasPasskeys,
      hasLinkedOAuth,
      identityProviders: identities.map((i) => i.provider),
    });

    const hasAnyFactor = hasTotp || hasPasskeys || hasLinkedOAuth;

    if (!hasAnyFactor) {
      console.log('[MFA Required Guard] No MFA factors, redirecting to setup');
      router.navigate(['/auth/mfa-setup']);
      return false;
    }

    return true;
  } catch (err: unknown) {
    const errObj = err instanceof Error ? err : null;
    console.error('[MFA Required Guard] Unexpected error:', {
      message: errObj?.message,
      name: errObj?.name,
      stack: errObj?.stack,
    });

    // On any error, allow access to prevent user lockout
    return true;
  }
};
