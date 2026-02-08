import { enableProdMode, ErrorHandler, Injectable } from '@angular/core';
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
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { analyticsInterceptor } from './app/core/interceptors/analytics.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

/**
 * Idle preloading strategy — waits for the browser to be idle before preloading routes.
 * This avoids competing with the initial render and improves TTI/TBT scores.
 * Falls back to a 2-second delay if requestIdleCallback is not available.
 */
@Injectable({ providedIn: 'root' })
class IdlePreloadStrategy implements PreloadingStrategy {
  preload(route: Route, load: () => Observable<any>): Observable<any> {
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
 * Global error handler - captures unhandled errors for monitoring
 * In production, these would be sent to an error tracking service (Sentry, etc.)
 */
@Injectable()
class GlobalErrorHandler implements ErrorHandler {
  handleError(error: any): void {
    // Log to console in all environments
    console.error('[FitOS Error]', error);

    // In production, send to error tracking
    if (environment.production) {
      // Future: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(error.originalError || error);
      try {
        const errorInfo = {
          message: error.message || 'Unknown error',
          stack: error.stack?.substring(0, 500),
          timestamp: new Date().toISOString(),
          url: window.location.href,
        };
        // Store locally for later sync
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
});
