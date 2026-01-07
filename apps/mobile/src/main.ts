import { enableProdMode } from '@angular/core';
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

import { routes } from './app/app.routes';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';
import { authInterceptor } from './app/core/interceptors/auth.interceptor';
import { analyticsInterceptor } from './app/core/interceptors/analytics.interceptor';
import { errorInterceptor } from './app/core/interceptors/error.interceptor';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
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
    // Note: Service worker is disabled to avoid Vite module resolution issues in dev mode
    // It will be re-enabled via ng build for production deployments
  ],
});
