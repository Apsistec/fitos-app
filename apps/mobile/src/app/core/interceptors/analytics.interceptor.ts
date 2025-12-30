import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

export const analyticsInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = performance.now();

  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = performance.now() - startTime;
          console.log(`[HTTP Analytics] ${req.method} ${req.url} - ${duration.toFixed(2)}ms - Status: ${event.status}`);

          // Future: Send to analytics service
          // analyticsService.trackApiCall({
          //   url: req.url,
          //   method: req.method,
          //   duration,
          //   status: event.status
          // });
        }
      },
      error: (error) => {
        const duration = performance.now() - startTime;
        console.error(`[HTTP Analytics] ${req.method} ${req.url} - ${duration.toFixed(2)}ms - Error: ${error.status || 'Network Error'}`);
      }
    })
  );
};
