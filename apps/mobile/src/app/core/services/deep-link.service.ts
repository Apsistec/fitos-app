import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App, URLOpenListenerEvent } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './auth.service';

export type DeepLinkRoute =
  | { type: 'checkin'; facilityId: string }
  | { type: 'workout'; templateId: string }
  | { type: 'equipment'; equipmentId: string }
  | { type: 'water' };

/**
 * Central deep-link router for NFC tags, QR codes, and push notifications.
 * Replaces the fragmented appUrlOpen listener in auth.service.ts.
 *
 * Supported path patterns:
 *   /action/checkin/:facilityId
 *   /action/workout/:templateId
 *   /action/equipment/:equipmentId
 *   /action/water
 */
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  private router = inject(Router);
  private authService = inject(AuthService);

  readonly pendingDeepLink = signal<string | null>(null);

  /**
   * Call once from AppComponent.initializeApp().
   * Listens for deep links on native and sets up PWA URL handling.
   */
  initialize(): void {
    if (Capacitor.isNativePlatform()) {
      App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.handleUrl(event.url);
      });
    } else {
      // On PWA/web, check the current URL on load
      this.handleUrl(window.location.href);
    }
  }

  /**
   * Handle a deep-link URL string.
   * If the user is not authenticated, stores the URL and redirects to login.
   * Auth service calls `consumePendingDeepLink()` after successful sign-in.
   */
  handleUrl(url: string): void {
    const parsed = this.parse(url);
    if (!parsed) return;

    if (!this.authService.isAuthenticated()) {
      this.pendingDeepLink.set(url);
      this.router.navigate(['/auth/login']);
      return;
    }

    this.navigate(parsed);
  }

  /**
   * Called by AuthService after successful sign-in to honour a deferred link.
   */
  consumePendingDeepLink(): void {
    const url = this.pendingDeepLink();
    if (!url) return;
    this.pendingDeepLink.set(null);
    const parsed = this.parse(url);
    if (parsed) this.navigate(parsed);
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private parse(url: string): DeepLinkRoute | null {
    try {
      const { pathname } = new URL(url);
      const segments = pathname.split('/').filter(Boolean);

      // Expected shape: /action/<type>/<id>
      if (segments[0] !== 'action' || segments.length < 3) return null;

      const [, type, id] = segments;

      if (type === 'checkin' && id) {
        return { type: 'checkin', facilityId: id };
      }
      if (type === 'workout' && id) {
        return { type: 'workout', templateId: id };
      }
      if (type === 'equipment' && id) {
        return { type: 'equipment', equipmentId: id };
      }
      if (type === 'water') {
        return { type: 'water' };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Navigate directly to an app route without URL parsing.
   * Used by AppShortcutsService for home-screen quick actions.
   */
  navigateDirect(commands: string[]): void {
    this.router.navigate(commands);
  }

  private navigate(route: DeepLinkRoute): void {
    switch (route.type) {
      case 'checkin':
        this.router.navigate(['/tabs/dashboard'], {
          queryParams: { checkin: route.facilityId },
        });
        break;
      case 'workout':
        this.router.navigate(['/tabs/workouts/active', route.templateId]);
        break;
      case 'equipment':
        this.router.navigate(['/tabs/workouts'], {
          queryParams: { equipment: route.equipmentId },
        });
        break;
      case 'water':
        this.router.navigate(['/tabs/nutrition/water']);
        break;
    }
  }
}
