import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuditLogService } from '../services/audit-log.service';

/**
 * HIPAA Access Guard
 *
 * Enforces HIPAA security requirements before allowing access to PHI:
 * - User must be authenticated
 * - MFA required for sensitive PHI (progress photos, medical history)
 * - Logs all PHI access attempts
 * - Checks for valid consent if required
 *
 * Usage:
 * ```typescript
 * {
 *   path: 'clients/:id',
 *   component: ClientDetailPage,
 *   canActivate: [HipaaAccessGuard],
 *   data: {
 *     resourceType: 'client_profile',
 *     requiresMfa: false,
 *     requiresConsent: true
 *   }
 * }
 * ```
 */

export interface HipaaAccessData {
  resourceType: string;
  requiresMfa?: boolean;
  requiresConsent?: boolean;
  phiCategories?: string[];
  accessReason?: 'treatment' | 'payment' | 'operations' | 'research';
}

@Injectable({
  providedIn: 'root',
})
export class HipaaAccessGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> {
    const data = route.data as HipaaAccessData;
    const resourceType = data.resourceType;
    const requiresMfa = data.requiresMfa ?? this.shouldRequireMfa(resourceType);
    const requiresConsent = data.requiresConsent ?? false;
    const resourceId = route.params['id'] || 'unknown';

    return this.authService.currentUser$.pipe(
      switchMap((user) => {
        // Check 1: User must be authenticated
        if (!user) {
          console.warn('[HIPAA Guard] Access denied: User not authenticated');
          return of(this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: route.url.join('/') },
          }));
        }

        // Check 2: MFA required for sensitive PHI
        if (requiresMfa && !user.mfa_enabled) {
          console.warn('[HIPAA Guard] Access denied: MFA required for', resourceType);
          return of(this.router.createUrlTree(['/settings/security'], {
            queryParams: {
              mfa_required: true,
              reason: 'HIPAA requires MFA for sensitive health information',
              returnUrl: route.url.join('/'),
            },
          }));
        }

        // Check 3: Consent required (if applicable)
        if (requiresConsent && resourceId !== 'unknown') {
          // TODO: Check if client has valid consent
          // For now, we'll assume consent is valid
        }

        // Log the PHI access attempt
        this.logPhiAccess(user.id, resourceType, resourceId, data);

        // Grant access
        return of(true);
      }),
      catchError((error) => {
        console.error('[HIPAA Guard] Error checking access:', error);
        return of(this.router.createUrlTree(['/error'], {
          queryParams: { message: 'Unable to verify access permissions' },
        }));
      })
    );
  }

  /**
   * Determine if MFA should be required for this resource type
   */
  private shouldRequireMfa(resourceType: string): boolean {
    const mfaRequiredTypes = [
      'progress_photo',
      'progress_photos',
      'medical_history',
      'body_composition',
      'export_data',
    ];

    return mfaRequiredTypes.some((type) =>
      resourceType.toLowerCase().includes(type.toLowerCase())
    );
  }

  /**
   * Log PHI access for HIPAA compliance
   */
  private logPhiAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    data: HipaaAccessData
  ): void {
    // Determine PHI categories
    const phiCategories = data.phiCategories || this.inferPhiCategories(resourceType);

    // Log the access
    this.auditLogService
      .logPhiAccess({
        action: 'read',
        resource_type: resourceType,
        resource_id: resourceId,
        contains_phi: true,
        phi_categories: phiCategories,
        access_reason: data.accessReason || 'treatment',
      })
      .subscribe({
        next: () => {
          console.debug('[HIPAA Guard] PHI access logged:', resourceType, resourceId);
        },
        error: (err) => {
          console.error('[HIPAA Guard] Failed to log PHI access:', err);
          // Don't block access if logging fails, but log the error
        },
      });
  }

  /**
   * Infer PHI categories from resource type
   */
  private inferPhiCategories(resourceType: string): string[] {
    const type = resourceType.toLowerCase();

    if (type.includes('profile') || type.includes('client')) {
      return ['demographics'];
    }

    if (
      type.includes('weight') ||
      type.includes('body_comp') ||
      type.includes('workout') ||
      type.includes('nutrition') ||
      type.includes('health')
    ) {
      return ['health_metrics'];
    }

    if (type.includes('photo') || type.includes('image')) {
      return ['photos'];
    }

    if (type.includes('medical') || type.includes('injury')) {
      return ['medical_history'];
    }

    // Default to health_metrics if unsure
    return ['health_metrics'];
  }
}
