import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Onboarding guard - ensures user has completed onboarding
 *
 * Redirects to onboarding if profile is incomplete.
 * Currently checks if fullName is set.
 */
export const onboardingCompleteGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  await authService.waitForInitialization();

  const state = authService.state();
  const profile = state.profile;

  if (!profile) {
    // No profile - redirect to login
    return router.createUrlTree(['/auth/login']);
  }

  // Check if onboarding is complete (fullName is required)
  if (profile.fullName) {
    return true;
  }

  // Onboarding incomplete
  return router.createUrlTree(['/onboarding']);
};
