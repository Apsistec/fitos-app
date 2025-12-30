import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const state = authService.state();

  if (!state.initialized) {
    // Auth not yet initialized - allow navigation
    return true;
  }

  if (!state.user) {
    // Not authenticated - allow access to auth pages
    return true;
  }

  // Already authenticated - redirect to dashboard
  router.navigate(['/tabs/dashboard']);
  return false;
};
