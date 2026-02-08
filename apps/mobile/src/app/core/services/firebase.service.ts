import { Injectable, PLATFORM_ID, inject } from '@angular/core';
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
   * Initialize Firebase app, analytics, and performance monitoring.
   * Only runs in browser context (not SSR/prerender).
   */
  private async initializeFirebase(): Promise<void> {
    if (this.initialized) return;

    try {
      // Initialize Firebase app from environment config
      this.app = initializeApp(environment.firebase);

      // Analytics: check if supported (incognito mode, ad-blockers, etc.)
      const analyticsSupported = await isAnalyticsSupported();
      if (analyticsSupported) {
        this.analytics = getAnalytics(this.app);
        console.log('[FirebaseService] Analytics initialized');
      } else {
        console.warn('[FirebaseService] Analytics not supported in this environment');
      }

      // Performance Monitoring (automatic HTTP traces + custom traces)
      this.performance = getPerformance(this.app);
      console.log('[FirebaseService] Performance monitoring initialized');

      this.initialized = true;
    } catch (e) {
      console.warn('[FirebaseService] Initialization failed:', e);
    }
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
      console.warn('[FirebaseService] trackEvent failed:', e);
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
      console.warn('[FirebaseService] trackScreenView failed:', e);
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
      // Strip query params and hash for cleaner grouping
      const cleanUrl = url.split('?')[0].split('#')[0];

      logEvent(this.analytics, 'api_request', {
        api_url: cleanUrl,
        api_method: method,
        api_duration_ms: Math.round(durationMs),
        api_status: statusCode,
        api_success: statusCode >= 200 && statusCode < 400,
      });
    } catch (e) {
      console.warn('[FirebaseService] trackApiPerformance failed:', e);
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
      console.warn('[FirebaseService] identifyUser failed:', e);
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
      console.warn('[FirebaseService] setUserProps failed:', e);
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
            console.warn('[FirebaseService] trace.stop failed:', e);
          }
        },
      };
    } catch (e) {
      console.warn('[FirebaseService] startTrace failed:', e);
      return { stop: () => { /* no-op on trace start failure */ } };
    }
  }
}
