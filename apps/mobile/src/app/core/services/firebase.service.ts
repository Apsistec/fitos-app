import { Injectable, PLATFORM_ID, inject, isDevMode } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';

// Firebase modular imports (tree-shakeable)
import { FirebaseApp, initializeApp } from 'firebase/app';
import {
  Analytics,
  getAnalytics,
  logEvent,
  setUserId,
  setUserProperties,
  isSupported as isAnalyticsSupported,
} from 'firebase/analytics';
import {
  FirebasePerformance,
  getPerformance,
  trace as createTrace,
} from 'firebase/performance';

/**
 * FirebaseService - Firebase Analytics (GA4) & Performance Monitoring
 *
 * Wraps the modular Firebase JS SDK for:
 * - GA4 event tracking (page views, custom events, errors)
 * - Performance monitoring (automatic HTTP traces, custom traces)
 * - User identification for analytics segmentation
 *
 * SSR-safe: All Firebase initialization is guarded by isPlatformBrowser().
 * Ad-blocker safe: isAnalyticsSupported() check prevents runtime errors.
 * All public methods are no-ops when analytics/performance is unavailable.
 *
 * Usage:
 * ```typescript
 * firebaseService.trackEvent('workout_completed', { duration: 45 });
 * firebaseService.trackScreenView('/dashboard');
 * const trace = firebaseService.startTrace('nutrition_entry');
 * // ... do work ...
 * trace.stop();
 * ```
 */
@Injectable({ providedIn: 'root' })
export class FirebaseService {
  private app: FirebaseApp | null = null;
  private analytics: Analytics | null = null;
  private performance: FirebasePerformance | null = null;
  private initialized = false;
  private platformId = inject(PLATFORM_ID);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializeFirebase();
    }
  }

  /**
   * Initialize Firebase app and performance monitoring.
   * Only runs in browser context (not SSR/prerender).
   *
   * Analytics is NOT initialized here — it requires explicit user consent
   * via enableAnalytics(). All tracking methods are no-ops until consent
   * is verified and enableAnalytics() is called.
   */
  private async initializeFirebase(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Firebase app from environment config
      this.app = initializeApp(environment.firebase);

      // Performance Monitoring (automatic HTTP traces + custom traces)
      // Performance monitoring is functional/technical, not marketing — no consent needed
      this.performance = getPerformance(this.app);
      if (isDevMode()) console.log('[FirebaseService] Performance monitoring initialized');

      this.initialized = true;
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] Initialization failed:', e);
    }
  }

  /**
   * Enable analytics after user has granted analytics_tracking consent.
   * Called by auth/consent flow after verifying user_data_consents.analytics_tracking = true.
   *
   * All tracking methods remain no-ops until this is called.
   */
  async enableAnalytics(): Promise<void> {
    if (this.analytics) return; // Already enabled
    if (!this.app) return; // Firebase not initialized

    try {
      const analyticsSupported = await isAnalyticsSupported();
      if (analyticsSupported) {
        this.analytics = getAnalytics(this.app);
        if (isDevMode()) console.log('[FirebaseService] Analytics enabled (consent granted)');
      } else {
        if (isDevMode()) console.warn('[FirebaseService] Analytics not supported in this environment');
      }
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] enableAnalytics failed:', e);
    }
  }

  /**
   * Disable analytics when user revokes consent or logs out.
   * Nulls out the analytics reference so all tracking methods become no-ops.
   */
  disableAnalytics(): void {
    this.analytics = null;
    if (isDevMode()) console.log('[FirebaseService] Analytics disabled');
  }

  // ─── Analytics Methods ────────────────────────────────────────────

  /**
   * Track a custom event in GA4.
   *
   * @example
   * firebaseService.trackEvent('workout_completed', { duration: 45, exercises: 8 });
   * firebaseService.trackEvent('nutrition_logged', { method: 'photo' });
   */
  trackEvent(eventName: string, params?: Record<string, unknown>): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, eventName, params);
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackEvent failed:', e);
    }
  }

  /**
   * Track screen/page view navigation.
   * Called automatically from AppComponent's router subscription.
   *
   * @param screenName - The URL or route path
   * @param screenClass - Optional component class name
   */
  trackScreenView(screenName: string, screenClass?: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'screen_view', {
        firebase_screen: screenName,
        firebase_screen_class: screenClass || screenName,
      });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackScreenView failed:', e);
    }
  }

  /**
   * Track HTTP API performance metrics.
   * Called from the analytics interceptor on every HTTP response.
   */
  trackApiPerformance(
    url: string,
    method: string,
    durationMs: number,
    statusCode: number,
  ): void {
    if (!this.analytics) return;
    try {
      // Strip query params, hash, and user-specific path segments for cleaner grouping
      // Prevents user IDs / UUIDs from leaking into GA4 analytics
      const cleanUrl = this.sanitizeApiUrl(url);

      logEvent(this.analytics, 'api_request', {
        api_url: cleanUrl,
        api_method: method,
        api_duration_ms: Math.round(durationMs),
        api_status: statusCode,
        api_success: statusCode >= 200 && statusCode < 400,
      });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackApiPerformance failed:', e);
    }
  }

  /**
   * Track an application error/exception.
   * This is the standard Firebase web approach for error tracking
   * (Crashlytics does not have a web SDK).
   *
   * @param description - Error message or description
   * @param fatal - Whether this was a fatal/unrecoverable error
   */
  trackError(description: string, fatal = false): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'app_exception', {
        description: description.substring(0, 500), // GA4 max param length
        fatal,
      });
    } catch {
      // Silently fail - error logging should never throw
    }
  }

  /**
   * Identify the current user for analytics segmentation.
   * Call after successful authentication.
   */
  identifyUser(userId: string): void {
    if (!this.analytics) return;
    try {
      setUserId(this.analytics, userId);
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] identifyUser failed:', e);
    }
  }

  /**
   * Set user properties for analytics segmentation.
   *
   * @example
   * firebaseService.setUserProps({ role: 'trainer', plan: 'pro' });
   */
  setUserProps(props: Record<string, string>): void {
    if (!this.analytics) return;
    try {
      setUserProperties(this.analytics, props);
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] setUserProps failed:', e);
    }
  }

  // ─── FCM Push Notification Registration ───────────────────────────

  /**
   * Register the device FCM token with the backend.
   * Sprint 52: Called by NotificationService after push permission is granted.
   *
   * Delegates to @capacitor/push-notifications for actual FCM token retrieval —
   * this method provides the analytics tracking hook and token-received event.
   *
   * @param token - The FCM registration token from PushNotifications plugin
   */
  trackFcmRegistration(token: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'fcm_token_registered', {
        token_length: token.length, // avoid logging the actual token
      });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackFcmRegistration failed:', e);
    }
  }

  /**
   * Track when a push notification is received in the foreground.
   * Sprint 52: Called by NotificationService push listeners.
   */
  trackNotificationReceived(type: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'notification_received', { notification_type: type });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackNotificationReceived failed:', e);
    }
  }

  /**
   * Track when a push notification is opened (tapped).
   * Sprint 52: Called by NotificationService on action performed.
   */
  trackNotificationOpened(type: string, actionTaken?: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'notification_opened', {
        notification_type: type,
        action_taken: actionTaken ?? 'tap',
      });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackNotificationOpened failed:', e);
    }
  }

  /**
   * Track geofence arrival at a gym.
   * Sprint 52: Called by GeofenceService on entry events.
   */
  trackGeofenceEntry(gymName: string): void {
    if (!this.analytics) return;
    try {
      logEvent(this.analytics, 'geofence_entry', { gym_name: gymName });
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] trackGeofenceEntry failed:', e);
    }
  }

  // ─── Performance Monitoring Methods ───────────────────────────────

  /**
   * Start a custom performance trace for measuring user flow durations.
   * Returns an object with a `stop()` method to end the trace.
   *
   * @example
   * const trace = firebaseService.startTrace('workout_session');
   * // ... workout in progress ...
   * trace.stop(); // Records duration to Firebase Performance
   */
  startTrace(traceName: string): { stop: () => void } {
    if (!this.performance) {
      return { stop: () => { /* no-op when performance monitoring is unavailable */ } };
    }

    try {
      const t = createTrace(this.performance, traceName);
      t.start();
      return {
        stop: () => {
          try {
            t.stop();
          } catch (e) {
            if (isDevMode()) console.warn('[FirebaseService] trace.stop failed:', e);
          }
        },
      };
    } catch (e) {
      if (isDevMode()) console.warn('[FirebaseService] startTrace failed:', e);
      return { stop: () => { /* no-op on trace start failure */ } };
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────

  /**
   * Sanitize API URLs for analytics logging.
   * Strips query params, hash fragments, and replaces user-specific path segments
   * (UUIDs, numeric IDs) with placeholders to prevent identity leakage into GA4.
   *
   * Example: /api/users/abc123-def456/health-data → /api/users/{id}/health-data
   */
  private sanitizeApiUrl(url: string): string {
    // Strip query params and hash
    let clean = url.split('?')[0].split('#')[0];

    // Replace UUIDs (8-4-4-4-12 hex pattern)
    clean = clean.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      '{id}',
    );

    // Replace standalone numeric IDs in path segments (e.g., /users/12345/)
    clean = clean.replace(/\/\d+(?=\/|$)/g, '/{id}');

    return clean;
  }
}
