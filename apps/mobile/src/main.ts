import { enableProdMode, ErrorHandler, Injectable, Injector, provideZoneChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadingStrategy,
  withComponentInputBinding,
  Route,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { Observable, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import * as Sentry from '@sentry/angular';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { analyticsInterceptor } from './app/core/interceptors/analytics.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';
import { FirebaseService } from './app/core/services/firebase.service';

// ─── Sentry Initialization ──────────────────────────────────────────────────
// Sentry is initialized AFTER Angular bootstrap completes (see .then() below).
//
// Why: Sentry's replayIntegration starts recording DOM mutations immediately
// on init. When Angular bootstraps and renders <ion-app>, the replay observer
// intercepts the DOM change and triggers Ionic's IonApp factory (inject()) in a
// context outside Angular's DI — causing NG0203. Deferring Sentry.init() to
// after bootstrap avoids this conflict entirely.
//
// All Sentry features (stack traces, breadcrumbs, release tracking, error
// grouping, session replay, and performance tracing) work normally — they just
// start capturing after the app is fully rendered.
//
// To activate: Add your DSN in environment.prod.ts from
// https://sentry.io → Settings → Projects → Client Keys (DSN)

/**
 * Idle preloading strategy — waits for the browser to be idle before preloading routes.
 * This avoids competing with the initial render and improves TTI/TBT scores.
 * Falls back to a 2-second delay if requestIdleCallback is not available.
 */
@Injectable({ providedIn: 'root' })
class IdlePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<unknown>): Observable<unknown> {
    return timer(2000).pipe(
      mergeMap(() => {
        if (typeof requestIdleCallback === 'function') {
          return new Observable(observer => {
            requestIdleCallback(() => {
              load().subscribe(observer);
            });
          });
        }
        return load();
      })
    );
  }
}

/**
 * Global error handler - captures unhandled errors and sends to:
 * 1. Sentry (stack traces, breadcrumbs, session replay)
 * 2. Firebase Analytics (app_exception events for GA4 dashboards)
 * 3. localStorage (offline fallback)
 */
@Injectable()
class GlobalErrorHandler implements ErrorHandler {
  private firebaseService: FirebaseService | null = null;

  constructor(private injector: Injector) {}

  handleError(error: unknown): void {
    // Log to console in all environments
    console.error('[FitOS Error]', error);

    // Send to Sentry (if initialized — captures full stack trace, breadcrumbs, replay)
    // Sentry.getClient() returns undefined before Sentry.init() runs (post-bootstrap)
    if (environment.sentryDsn && Sentry.getClient()) {
      const originalError = error instanceof Error ? error : (error as Record<string, unknown>)?.originalError;
      Sentry.captureException(originalError || error);
    }

    // In production, also send to Firebase Analytics + localStorage fallback
    if (environment.production) {
      // Lazy-inject FirebaseService (ErrorHandler runs before some services are ready)
      if (!this.firebaseService) {
        try {
          this.firebaseService = this.injector.get(FirebaseService);
        } catch {
          // Service may not be available during very early bootstrap
        }
      }

      const message = error instanceof Error ? error.message : String(error || 'Unknown error');

      // Send to Firebase Analytics as app_exception event
      this.firebaseService?.trackError(message, false);

      // Keep localStorage fallback for offline scenarios
      try {
        const errorInfo = {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined,
          timestamp: new Date().toISOString(),
          url: window.location.href,
        };
        const errors = JSON.parse(localStorage.getItem('fitos_errors') || '[]');
        errors.push(errorInfo);
        // Keep only last 20 errors
        localStorage.setItem('fitos_errors', JSON.stringify(errors.slice(-20)));
      } catch {
        // Silently fail - error logging should never cause errors
      }
    }
  }
}

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    // Angular 21 defaults to zoneless change detection, but Ionic 8.x requires Zone.js.
    // See: https://github.com/ionic-team/ionic-framework/issues/30804
    // See: https://github.com/ionic-team/ionic-framework/issues/30907
    provideZoneChangeDetection({ eventCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideIonicAngular({
      mode: 'ios', // Use iOS styling on all platforms for consistency
    }),
    provideAnimations(),
    provideRouter(
      routes,
      withPreloading(IdlePreloadStrategy),
      withComponentInputBinding(), // Enable route params as inputs
    ),
    provideHttpClient(
      withInterceptors([
        authInterceptor,       // Add auth token to requests
        analyticsInterceptor,  // Log API performance metrics (safe - just logging)
        errorInterceptor,      // Handle HTTP errors with user-friendly messages
      ])
    ),
    // Service worker for offline support (production only)
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.production,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).then(() => {
  console.log('[FitOS Bootstrap] Phase 4: Bootstrap SUCCEEDED');

  // Initialize Sentry AFTER Angular bootstrap completes.
  // See comment at top of file for explanation of why this must be deferred.
  if (environment.sentryDsn) {
    Sentry.init({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
      enabled: environment.production,
      // Capture 10% of transactions for performance monitoring
      tracesSampleRate: 0.1,
      // Capture 10% of sessions for replay (reduces quota usage)
      replaysSessionSampleRate: 0.1,
      // Always capture replay on error for debugging
      replaysOnErrorSampleRate: 1.0,
      integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      // Filter noisy/unhelpful errors
      ignoreErrors: [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Loading chunk',
        'ChunkLoadError',
      ],
    });
    console.log('[FitOS Bootstrap] Phase 5: Sentry initialized (post-bootstrap)');
  }
}).catch((err) => {
  console.error('[FitOS Bootstrap] Phase 4: Bootstrap FAILED', err);
});
