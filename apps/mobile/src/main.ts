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

// Import interceptors
import {
  authInterceptor,
  errorInterceptor,
  retryInterceptor,
  loadingInterceptor,
  analyticsInterceptor,
} from './app/core/interceptors';

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
        loadingInterceptor,    // Show/hide loading indicator
        retryInterceptor,      // Retry failed GET requests
        analyticsInterceptor,  // Log API performance metrics
        errorInterceptor,      // Handle errors last (after retries)
      ])
    ),
    // TODO: Re-enable service worker after resolving @angular/service-worker package dependencies
    // PWA configuration files are in place (manifest.webmanifest, ngsw-config.json, UpdateService)
    // provideServiceWorker('ngsw-worker.js', {
    //   enabled: !isDevMode(),
    //   registrationStrategy: 'registerWhenStable:30000'
    // }),
  ],
});
