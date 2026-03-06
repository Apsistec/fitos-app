import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject, timer, Observable } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { AlertController } from '@ionic/angular/standalone';

/**
 * Idle Timeout Service
 *
 * Implements HIPAA-required automatic logoff after 15 minutes of inactivity.
 *
 * HIPAA Security Rule § 164.312(a)(2)(iii) requires:
 * "Implement electronic procedures that terminate an electronic session
 * after a predetermined time of inactivity."
 *
 * Industry standard: 15 minutes of inactivity
 * Warning: 2 minutes before logout
 *
 * Usage:
 * ```typescript
 * // In app.component.ts
 * constructor(private idleTimeoutService: IdleTimeoutService) {}
 *
 * ngOnInit() {
 *   this.idleTimeoutService.start();
 * }
 *
 * ngOnDestroy() {
 *   this.idleTimeoutService.stop();
 * }
 * ```
 */

@Injectable({
  providedIn: 'root',
})
export class IdleTimeoutService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alertController = inject(AlertController);

  // HIPAA-required timeout settings
  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes warning

  private destroy$ = new Subject<void>();
  private timerReset$ = new Subject<void>(); // Cancels only timer subscriptions (not the whole service)
  private warningShown = signal(false);
  private countdownInterval: ReturnType<typeof setInterval> | null = null;

  /**
   * Start idle timeout monitoring
   */
  start(): void {
    if (isDevMode()) console.log('[IdleTimeout] Starting monitoring');

    // Listen for user activity events
    const userActivity$ = this.getUserActivityObservable();

    // Subscribe to activity and reset timer on each activity
    userActivity$
      .pipe(
        debounceTime(1000), // Debounce to avoid excessive resets
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetIdleTimer();
      });

    // Start initial timer
    this.resetIdleTimer();
  }

  /**
   * Stop idle timeout monitoring
   */
  stop(): void {
    if (isDevMode()) console.log('[IdleTimeout] Stopping monitoring');
    this.timerReset$.next();
    this.destroy$.next();
    this.destroy$.complete();
    this.destroy$ = new Subject<void>(); // Reset for potential restart
    this.timerReset$ = new Subject<void>();

    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Get observable of user activity events
   */
  private getUserActivityObservable(): Observable<Event> {
    return merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'keydown'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'touchmove'),
      fromEvent(document, 'scroll'),
      fromEvent(document, 'click')
    );
  }

  /**
   * Reset idle timer
   */
  private resetIdleTimer(): void {
    // Cancel any existing timer subscriptions (prevents timer stacking)
    this.timerReset$.next();

    // Clear existing warning
    if (this.warningShown()) {
      this.dismissWarning();
    }

    // Schedule warning — cancelled by timerReset$ OR destroy$
    timer(this.IDLE_TIMEOUT_MS - this.WARNING_BEFORE_MS)
      .pipe(takeUntil(merge(this.destroy$, this.timerReset$)))
      .subscribe(() => {
        this.showIdleWarning();
      });

    // Schedule logout — cancelled by timerReset$ OR destroy$
    timer(this.IDLE_TIMEOUT_MS)
      .pipe(takeUntil(merge(this.destroy$, this.timerReset$)))
      .subscribe(() => {
        this.handleIdleTimeout();
      });
  }

  /**
   * Show warning modal before logout
   */
  private async showIdleWarning(): Promise<void> {
    if (this.warningShown()) {
      return; // Warning already shown
    }

    this.warningShown.set(true);
    if (isDevMode()) console.warn('[IdleTimeout] Showing inactivity warning');

    const alert = await this.alertController.create({
      header: 'Session Timeout Warning',
      subHeader: 'Security Requirement',
      message: this.getWarningMessage(),
      buttons: [
        {
          text: 'Stay Logged In',
          role: 'cancel',
          handler: () => {
            if (isDevMode()) console.log('[IdleTimeout] User chose to stay logged in');
            this.resetIdleTimer();
            this.warningShown.set(false);
          },
        },
        {
          text: 'Logout Now',
          role: 'destructive',
          handler: () => {
            if (isDevMode()) console.log('[IdleTimeout] User chose to logout');
            this.handleIdleTimeout();
          },
        },
      ],
      backdropDismiss: false,
      cssClass: 'hipaa-timeout-warning',
    });

    await alert.present();

    // Start countdown
    this.startCountdown(alert);
  }

  /**
   * Get warning message with countdown
   */
  private getWarningMessage(): string {
    return `
      <p>You have been inactive for a while.</p>
      <p>For security, you will be automatically logged out in <strong id="countdown-timer">2:00</strong>.</p>
      <p>Click "Stay Logged In" to continue your session.</p>
    `;
  }

  /**
   * Start countdown timer in warning modal
   */
  private startCountdown(alert: HTMLIonAlertElement): void {
    let secondsRemaining = 120; // 2 minutes

    this.countdownInterval = setInterval(() => {
      secondsRemaining--;

      const minutes = Math.floor(secondsRemaining / 60);
      const seconds = secondsRemaining % 60;
      const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;

      // Update countdown in modal
      const timerElement = document.getElementById('countdown-timer');
      if (timerElement) {
        timerElement.textContent = timeString;
      }

      // Auto-logout when countdown reaches 0
      if (secondsRemaining <= 0) {
        clearInterval(this.countdownInterval);
        alert.dismiss();
        this.handleIdleTimeout();
      }
    }, 1000);
  }

  /**
   * Dismiss warning modal
   */
  private async dismissWarning(): Promise<void> {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    this.warningShown.set(false);

    // Dismiss any open alerts
    const alert = await this.alertController.getTop();
    if (alert) {
      await alert.dismiss();
    }
  }

  /**
   * Handle idle timeout - logout user
   */
  private handleIdleTimeout(): void {
    if (isDevMode()) console.log('[IdleTimeout] Session timeout — logging out');

    // Clear countdown
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }

    // Stop monitoring
    this.stop();

    // Logout user
    this.authService.logout().subscribe({
      next: () => {
        // Navigate to login with reason code only (no verbose messages in URL)
        this.router.navigate(['/login'], {
          queryParams: { reason: 'idle_timeout' },
        });
      },
      error: (err) => {
        if (isDevMode()) console.error('[IdleTimeout] Error during logout:', err);
        // Force navigation even if logout fails
        this.router.navigate(['/login'], {
          queryParams: { reason: 'idle_timeout' },
        });
      },
    });
  }
}
