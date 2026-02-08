import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { AuthService } from '../services/auth.service';
import type { UserRole } from '@fitos/shared';

/**
 * Role guard factory - protects routes based on user role
 * Shows a toast when access is denied and redirects to the appropriate dashboard
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
    const toastController = inject(ToastController);

    // Wait for auth to initialize
    await authService.waitForInitialization();

    const state = authService.state();
    const userRole = state.profile?.role;

    if (!userRole) {
      // No role - redirect to login
      return router.createUrlTree(['/auth/login']);
    }

    if (allowedRoles.includes(userRole)) {
      return true;
    }

    // Wrong role - show notification and redirect
    const roleLabels: Record<string, string> = {
      'client': 'clients',
      'trainer': 'trainers',
      'gym_owner': 'gym owners',
    };
    const allowedLabel = allowedRoles.map(r => roleLabels[r] || r).join(' or ');

    const toast = await toastController.create({
      message: `This feature is only available for ${allowedLabel}.`,
      duration: 3000,
      position: 'bottom',
      color: 'warning',
      icon: 'lock-closed-outline',
    });
    await toast.present();

    return router.createUrlTree(['/tabs/dashboard']);
  };
}

// Convenience guards for specific roles
export const trainerGuard = roleGuard('trainer');
export const clientGuard = roleGuard('client');
export const ownerGuard = roleGuard('gym_owner');
export const trainerOrOwnerGuard = roleGuard('trainer', 'gym_owner');
