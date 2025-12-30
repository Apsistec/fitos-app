import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { Observable } from 'rxjs';

/**
 * No-auth guard - prevents authenticated users from accessing auth pages
 *
 * Redirects authenticated users to their appropriate dashboard.
 */
export const noAuthGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.state).pipe(
    filter((state) => state.initialized),
    take(1),
    map((state) => {
      if (!state.user) {
        // Not authenticated - allow access to auth pages
        return true;
      }

      // Authenticated - redirect to dashboard
      return router.createUrlTree(['/tabs/dashboard']);
    })
  );
};
