import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastCtrl = inject(ToastController);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An error occurred';

      switch (error.status) {
        case 401:
          message = 'Please log in again';
          router.navigate(['/auth/login']);
          break;
        case 403:
          message = 'You do not have permission to perform this action';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        default:
          if (error.error?.message) {
            message = error.error.message;
          }
      }

      // Show toast notification
      toastCtrl.create({
        message,
        duration: 3000,
        color: 'danger',
        position: 'top'
      }).then(toast => toast.present());

      return throwError(() => error);
    })
  );
};
