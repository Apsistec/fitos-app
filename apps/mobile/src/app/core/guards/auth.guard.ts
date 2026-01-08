import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take, timeout, catchError } from 'rxjs';
import { Observable, of } from 'rxjs';

/**
 * Auth guard - protects routes that require authentication
 *
 * Waits for auth to initialize before making a decision.
 * Redirects to login if not authenticated, storing returnUrl for post-login redirect.
 */
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot
): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Convert the signal state to observable and wait for initialization
  return toObservable(authService.state).pipe(
    // Wait until auth is initialized
    filter((authState) => authState.initialized),
    take(1),
    // Timeout after 5 seconds to prevent infinite waiting
    timeout(5000),
    map((authState) => {
      if (authState.user) {
        return true;
      }
      // Not authenticated - store returnUrl and redirect to login
      authService.setReturnUrl(state.url);
      return router.createUrlTree(['/auth/login']);
    }),
    catchError((error) => {
      console.error('Auth guard timeout or error:', error);
      // On timeout or error, redirect to login
      authService.setReturnUrl(state.url);
      return of(router.createUrlTree(['/auth/login']));
    })
  );
};
