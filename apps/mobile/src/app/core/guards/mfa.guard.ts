import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from '../services/auth.service';

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
    // Check MFA factors
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error('MFA Guard: Error listing factors:', error);
      // On error, allow access but log the issue
      return true;
    }

    // Check if user has any verified TOTP factor
    const verifiedTotp = data.totp.find(f => f.status === 'verified');

    if (!verifiedTotp) {
      // No MFA enrolled, redirect to setup
      console.log('MFA Guard: No verified MFA factor, redirecting to setup');
      router.navigate(['/auth/mfa-setup']);
      return false;
    }

    // Check the assurance level of the current session
    const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (aalError) {
      console.error('MFA Guard: Error getting AAL:', aalError);
      // On error, allow access
      return true;
    }

    // If current AAL is aal1 but we need aal2 (MFA verified), redirect to verify
    if (aalData.currentLevel === 'aal1' && aalData.nextLevel === 'aal2') {
      console.log('MFA Guard: Session needs MFA verification');
      router.navigate(['/auth/mfa-verify']);
      return false;
    }

    // MFA verified, allow access
    return true;
  } catch (err) {
    console.error('MFA Guard: Unexpected error:', err);
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

  try {
    const { data, error } = await supabase.auth.mfa.listFactors();

    if (error) {
      console.error('MFA Required Guard: Error:', error);
      return true;
    }

    // If no MFA factors at all, redirect to setup
    const hasAnyFactor = data.totp.length > 0;

    if (!hasAnyFactor) {
      router.navigate(['/auth/mfa-setup']);
      return false;
    }

    return true;
  } catch (err) {
    console.error('MFA Required Guard: Unexpected error:', err);
    return true;
  }
};
