import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { Observable } from 'rxjs';

/**
 * Onboarding guard - ensures user has completed onboarding
 *
 * Redirects to onboarding if profile is incomplete.
 * Currently checks if fullName is set.
 */
export const onboardingCompleteGuard: CanActivateFn = (): Observable<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.state).pipe(
    filter((state) => state.initialized),
    take(1),
    map((state) => {
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
    })
  );
};
