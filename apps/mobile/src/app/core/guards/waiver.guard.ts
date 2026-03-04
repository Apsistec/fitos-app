import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SupabaseService } from '../services/supabase.service';

/**
 * Waiver guard — ensures clients have signed all required waivers.
 *
 * Only enforces the signing requirement for the 'client' role.
 * Trainers, gym owners, and admin assistants pass through unconditionally.
 *
 * Calls the `is_waiver_signed(p_client_id)` SECURITY DEFINER RPC which returns:
 *   true  — all required waivers are signed (allow navigation)
 *   false — at least one required waiver is unsigned (redirect to /sign-waivers)
 *
 * Fails open on DB errors to avoid locking legitimate clients out.
 */
export const waiverGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const authService = inject(AuthService);
  const supabase = inject(SupabaseService);
  const router = inject(Router);

  // Wait for auth to fully initialize
  await authService.waitForInitialization();

  const state = authService.state();
  const role = state.profile?.role;

  // Only enforce for clients — all other roles pass through
  if (role !== 'client') return true;

  const userId = state.user?.id;
  if (!userId) return router.createUrlTree(['/auth/login']);

  try {
    const { data, error } = await supabase.client.rpc('is_waiver_signed', {
      p_client_id: userId,
    });

    if (error) {
      // Fail open: DB errors should not lock clients out (log for monitoring)
      console.warn('[waiverGuard] RPC error — allowing access:', error.message);
      return true;
    }

    // data is boolean: true = all signed, false = missing at least one
    if (data === true) return true;

    return router.createUrlTree(['/sign-waivers']);
  } catch (err) {
    console.warn('[waiverGuard] Unexpected error — allowing access:', err);
    return true; // Fail open
  }
};
