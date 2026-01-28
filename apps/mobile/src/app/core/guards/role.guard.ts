import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import type { UserRole } from '@fitos/shared';

/**
 * Role guard factory - protects routes based on user role
 *
 * Usage: canActivate: [roleGuard('trainer')]
 *
 * @param allowedRoles - Role(s) allowed to access the route
 * @returns Guard function
 */
export function roleGuard(...allowedRoles: UserRole[]): CanActivateFn {
  return async (): Promise<boolean | UrlTree> => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Wait for auth to initialize
    await authService.waitForInitialization();

    const state = authService.state();
    const userRole = state.profile?.role;

    if (!userRole) {
      // No role - redirect to dashboard
      return router.createUrlTree(['/tabs/dashboard']);
    }

    if (allowedRoles.includes(userRole)) {
      return true;
    }

    // Wrong role - redirect to appropriate dashboard
    return router.createUrlTree(['/tabs/dashboard']);
  };
}

// Convenience guards for specific roles
export const trainerGuard = roleGuard('trainer');
export const clientGuard = roleGuard('client');
export const ownerGuard = roleGuard('gym_owner');
export const trainerOrOwnerGuard = roleGuard('trainer', 'gym_owner');
