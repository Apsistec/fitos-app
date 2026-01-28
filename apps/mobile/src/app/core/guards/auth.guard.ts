import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Auth guard - protects routes that require authentication
 *
 * Waits for auth to initialize before making a decision.
 * Redirects to login if not authenticated, storing returnUrl for post-login redirect.
 */
export const authGuard: CanActivateFn = async (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  console.log('Auth guard: starting, initialized:', authService.state().initialized);

  // Wait for auth to initialize (has built-in 10 second timeout)
  await authService.waitForInitialization();

  const authState = authService.state();
  console.log('Auth guard: checking authentication, user:', !!authState.user);

  if (authState.user) {
    return true;
  }

  // Not authenticated - store returnUrl and redirect to login
  authService.setReturnUrl(state.url);
  return router.createUrlTree(['/auth/login']);
};
