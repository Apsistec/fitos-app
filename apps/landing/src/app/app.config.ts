import { ApplicationConfig, provideZoneChangeDetection, PLATFORM_ID, APP_INITIALIZER } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';

import { routes } from './app.routes';
import { environment } from '../environments/environment';

/**
 * Initialize Sentry error tracking (browser-only).
 * Must not run on the server side (SSR) — Sentry browser SDK requires DOM APIs.
 */
function initializeSentry(platformId: object) {
  return () => {
    if (!isPlatformBrowser(platformId) || !environment.sentryDsn) return;

    Sentry.init({
      dsn: environment.sentryDsn,
      environment: environment.production ? 'production' : 'development',
      enabled: environment.production,
      sendDefaultPii: true,
      tracesSampleRate: 0.1,
      integrations: [
        Sentry.browserTracingIntegration(),
      ],
    });
  };
}

/**
 * Initialize Firebase Analytics & Performance Monitoring (browser-only).
 * Uses dynamic imports so Firebase is never bundled into the SSR server build.
 * Gracefully handles environments where analytics is unsupported (incognito, ad-blockers).
 */
function initializeFirebase(platformId: object) {
  return () => {
    if (!isPlatformBrowser(platformId)) return;

    // Dynamic imports ensure Firebase is tree-shaken from server bundle
    import('firebase/app').then(({ initializeApp }) => {
      const app = initializeApp(environment.firebase);

      // Analytics (GA4)
      import('firebase/analytics').then(({ getAnalytics, isSupported }) => {
        isSupported().then((supported) => {
          if (supported) {
            getAnalytics(app);
            console.log('[Landing] Firebase Analytics initialized');
          }
        });
      });

      // Performance Monitoring (automatic HTTP traces + Web Vitals)
      import('firebase/performance').then(({ getPerformance }) => {
        getPerformance(app);
        console.log('[Landing] Firebase Performance initialized');
      });
    }).catch((e) => {
      console.warn('[Landing] Firebase initialization failed:', e);
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      }),
    ),
    provideClientHydration(withEventReplay()),
    // Sentry error tracking (SSR-safe via platform check)
    {
      provide: APP_INITIALIZER,
      useFactory: initializeSentry,
      deps: [PLATFORM_ID],
      multi: true,
    },
    // Firebase Analytics & Performance (SSR-safe via platform check)
    {
      provide: APP_INITIALIZER,
      useFactory: initializeFirebase,
      deps: [PLATFORM_ID],
      multi: true,
    },
  ]
};
