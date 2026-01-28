import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * No-auth guard - prevents authenticated users from accessing auth pages
 *
 * Redirects authenticated users to their appropriate dashboard.
 */
export const noAuthGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  await authService.waitForInitialization();

  const state = authService.state();

  if (!state.user) {
    // Not authenticated - allow access to auth pages
    return true;
  }

  // Authenticated - redirect to dashboard
  return router.createUrlTree(['/tabs/dashboard']);
};
