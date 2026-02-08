import { enableProdMode, ErrorHandler, Injectable } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import {
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
  PreloadAllModules,
  withComponentInputBinding,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { analyticsInterceptor } from './app/core/interceptors/analytics.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

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
      withPreloading(PreloadAllModules),
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
