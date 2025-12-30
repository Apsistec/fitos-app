import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { Observable } from 'rxjs';

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
    map((authState) => {
      if (authState.user) {
        return true;
      }
      // Not authenticated - redirect to login with returnUrl
      return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
    })
  );
};
