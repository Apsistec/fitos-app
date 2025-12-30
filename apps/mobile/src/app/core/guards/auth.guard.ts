import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Wait for auth to initialize
  const state = authService.state();
  
  if (!state.initialized) {
    // Auth not yet initialized - allow navigation but auth service will redirect if needed
    return true;
  }

  if (state.user) {
    return true;
  }

  // Not authenticated - redirect to login
  router.navigate(['/auth/login']);
  return false;
};
