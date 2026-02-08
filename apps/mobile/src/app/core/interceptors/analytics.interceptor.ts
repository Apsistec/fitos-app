import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { tap } from 'rxjs';
import { FirebaseService } from '../services/firebase.service';

/**
 * HTTP Analytics Interceptor
 *
 * Measures API request duration and sends performance metrics
 * to Firebase Analytics via the FirebaseService.
 *
 * Tracks: URL (cleaned), method, duration (ms), status code, success/failure.
 * Visible in Firebase Console → Analytics → Events → api_request.
 */
export const analyticsInterceptor: HttpInterceptorFn = (req, next) => {
  const firebaseService = inject(FirebaseService);
  const startTime = performance.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = performance.now() - startTime;
          firebaseService.trackApiPerformance(req.url, req.method, duration, event.status);
        }
      },
      error: (error) => {
        const duration = performance.now() - startTime;
        firebaseService.trackApiPerformance(req.url, req.method, duration, error.status || 0);
      },
    })
  );
};
