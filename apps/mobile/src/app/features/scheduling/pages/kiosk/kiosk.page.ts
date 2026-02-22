import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonSpinner,
  IonInput,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  personCircleOutline,
  timeOutline,
  lockClosedOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { AppointmentService } from '../../../../core/services/appointment.service';
import { AppointmentFsmService } from '../../../../core/services/appointment-fsm.service';
import { AuthService } from '../../../../core/services/auth.service';
import { Appointment } from '@fitos/shared';

addIcons({ checkmarkCircle, personCircleOutline, timeOutline, lockClosedOutline, arrowBackOutline });

type KioskScreen = 'welcome' | 'select-client' | 'verify-identity' | 'checking-in' | 'success' | 'pin-exit';

const INACTIVITY_TIMEOUT_MS = 30_000; // 30 seconds
const REFRESH_INTERVAL_MS = 60_000;   // 60 seconds

@Component({
  selector: 'app-kiosk',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent, IonHeader, IonToolbar, IonTitle,
    IonButton, IonIcon, IonSpinner, IonInput,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>FitOS Check-In</ion-title>
        <ion-button slot="end" fill="clear" (click)="promptPinExit()">
          <ion-icon name="lock-closed-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" (touchstart)="resetInactivity()" (click)="resetInactivity()">

      <!-- ── WELCOME SCREEN ───────────────────────────────────────────── -->
      @if (screen() === 'welcome') {
        <div class="kiosk-screen">
          <div class="kiosk-hero">
            <ion-icon name="person-circle-outline" class="hero-icon" />
            <h1>Welcome!</h1>
            <p>Tap your name below to check in for your session.</p>
          </div>

          @if (upcomingAppointments().length === 0) {
            <div class="no-appts">
              <p>No appointments in the next 2 hours.</p>
            </div>
          } @else {
            <div class="client-grid">
              @for (appt of upcomingAppointments(); track appt.id) {
                <button class="client-tile" (click)="selectAppointment(appt)">
                  <div class="client-tile-avatar">
                    {{ initials(appt) }}
                  </div>
                  <div class="client-tile-name">{{ clientName(appt) }}</div>
                  <div class="client-tile-time">
                    <ion-icon name="time-outline" />
                    {{ formatTime(appt.start_at) }}
                  </div>
                </button>
              }
            </div>
          }

          <div class="last-refresh">Last refreshed {{ lastRefreshLabel() }}</div>
        </div>
      }

      <!-- ── VERIFY IDENTITY SCREEN ───────────────────────────────────── -->
      @if (screen() === 'verify-identity') {
        <div class="kiosk-screen">
          <div class="kiosk-hero">
            <div class="verify-avatar">{{ initials(selectedAppointment()!) }}</div>
            <h1>Hi, {{ clientFirstName() }}!</h1>
            <p>Please confirm your identity to check in.</p>
          </div>

          <div class="verify-form">
            <div class="verify-label">Enter the last 4 digits of your phone number</div>
            <ion-input
              type="tel"
              inputmode="numeric"
              maxlength="4"
              [(ngModel)]="verifyInput"
              placeholder="_ _ _ _"
              class="verify-input"
              (ionInput)="onVerifyInput()"
            />
          </div>

          @if (verifyError()) {
            <div class="verify-error">Incorrect. Please try again.</div>
          }

          <div class="verify-actions">
            <ion-button fill="outline" color="medium" (click)="goBack()">Back</ion-button>
          </div>
        </div>
      }

      <!-- ── CHECKING IN SCREEN ───────────────────────────────────────── -->
      @if (screen() === 'checking-in') {
        <div class="kiosk-screen centered">
          <ion-spinner name="crescent" class="checking-spinner" />
          <p>Checking you in...</p>
        </div>
      }

      <!-- ── SUCCESS SCREEN ────────────────────────────────────────────── -->
      @if (screen() === 'success') {
        <div class="kiosk-screen centered">
          <ion-icon name="checkmark-circle" class="success-icon" />
          <h1>You're checked in!</h1>
          <p class="success-sub">{{ clientFirstName() }}, your trainer will be right with you.</p>
          <div class="success-service">{{ serviceName(selectedAppointment()!) }}</div>
          <div class="success-timer">Returning to home in {{ countdownSeconds() }}s</div>
        </div>
      }

      <!-- ── PIN EXIT SCREEN ───────────────────────────────────────────── -->
      @if (screen() === 'pin-exit') {
        <div class="kiosk-screen centered">
          <div class="pin-form">
            <h2>Enter trainer PIN</h2>
            <ion-input
              type="password"
              inputmode="numeric"
              maxlength="6"
              [(ngModel)]="pinInput"
              placeholder="PIN"
              class="pin-input"
            />
            @if (pinError()) {
              <div class="verify-error">Incorrect PIN</div>
            }
            <div class="pin-actions">
              <ion-button fill="outline" color="medium" (click)="screen.set('welcome')">Cancel</ion-button>
              <ion-button fill="solid" (click)="exitKiosk()">Exit Kiosk</ion-button>
            </div>
          </div>
        </div>
      }

    </ion-content>
  `,
  styles: [`
    :host {
      display: block;
      height: 100%;
      background: var(--fitos-bg-primary, #0D0D0D);
    }

    ion-toolbar {
      --background: var(--fitos-bg-primary, #0D0D0D);
      --color: var(--fitos-text-primary, #FAFAFA);
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    /* ── Screens ── */
    .kiosk-screen {
      padding: 40px 24px 32px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: calc(100vh - 56px);
    }

    .kiosk-screen.centered {
      justify-content: center;
      gap: 24px;
    }

    /* ── Hero ── */
    .kiosk-hero {
      text-align: center;
      margin-bottom: 40px;

      h1 {
        font-size: 32px;
        font-weight: 700;
        color: var(--fitos-text-primary, #FAFAFA);
        margin: 16px 0 8px;
      }

      p {
        font-size: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
      }
    }

    .hero-icon {
      font-size: 80px;
      color: var(--fitos-accent-primary, #10B981);
    }

    /* ── Client grid ── */
    .client-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 16px;
      width: 100%;
      max-width: 720px;
    }

    .client-tile {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 24px 16px;
      background: var(--fitos-bg-elevated, #1A1A1A);
      border-radius: 16px;
      border: 2px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
      min-height: 140px;
      transition: border-color 200ms, background 200ms;
      font-family: inherit;

      &:active {
        border-color: var(--fitos-accent-primary, #10B981);
        background: rgba(16, 185, 129, 0.08);
        transform: scale(0.97);
      }
    }

    .client-tile-avatar {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--fitos-accent-primary, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 700;
      color: #000;
    }

    .client-tile-name {
      font-size: 16px;
      font-weight: 600;
      color: var(--fitos-text-primary, #FAFAFA);
      text-align: center;
    }

    .client-tile-time {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);

      ion-icon { font-size: 13px; }
    }

    /* ── Verify ── */
    .verify-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--fitos-accent-primary, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: #000;
      margin: 0 auto 16px;
    }

    .verify-form {
      width: 100%;
      max-width: 320px;
      margin: 32px 0 0;
    }

    .verify-label {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      margin-bottom: 16px;
    }

    .verify-input, .pin-input {
      --background: var(--fitos-bg-elevated, #1A1A1A);
      --color: var(--fitos-text-primary, #FAFAFA);
      --border-radius: 12px;
      --padding-start: 20px;
      --padding-end: 20px;
      font-size: 28px;
      font-weight: 600;
      text-align: center;
      letter-spacing: 12px;
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
    }

    .verify-error {
      color: #EAB308;
      font-size: 14px;
      text-align: center;
      margin-top: 12px;
    }

    .verify-actions, .pin-actions {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-top: 24px;
    }

    /* ── No appointments ── */
    .no-appts {
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;
      font-size: 16px;
      padding: 40px;
    }

    .last-refresh {
      margin-top: auto;
      padding-top: 24px;
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;
    }

    /* ── Success ── */
    .success-icon {
      font-size: 96px;
      color: var(--fitos-accent-primary, #10B981);
    }

    h1 {
      font-size: 32px;
      font-weight: 700;
      color: var(--fitos-text-primary, #FAFAFA);
      margin: 0;
    }

    .success-sub {
      font-size: 18px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      margin: 0;
    }

    .success-service {
      font-size: 15px;
      color: var(--fitos-accent-primary, #10B981);
      font-weight: 500;
    }

    .success-timer {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    /* ── PIN exit ── */
    .pin-form {
      background: var(--fitos-bg-elevated, #1A1A1A);
      border-radius: 20px;
      padding: 32px;
      width: 100%;
      max-width: 320px;
      display: flex;
      flex-direction: column;
      gap: 16px;

      h2 {
        font-size: 20px;
        font-weight: 600;
        color: var(--fitos-text-primary, #FAFAFA);
        text-align: center;
        margin: 0;
      }
    }

    /* ── Checking-in ── */
    .checking-spinner {
      --color: var(--fitos-accent-primary, #10B981);
      width: 56px;
      height: 56px;
    }

    p {
      font-size: 18px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
    }
  `],
})
export class KioskPage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly alert = inject(AlertController);
  private readonly toast = inject(ToastController);
  private readonly appointmentService = inject(AppointmentService);
  private readonly fsm = inject(AppointmentFsmService);
  private readonly auth = inject(AuthService);

  readonly screen = signal<KioskScreen>('welcome');
  readonly selectedAppointment = signal<Appointment | null>(null);
  readonly verifyInput = '';
  readonly pinInput = '';
  readonly verifyError = signal(false);
  readonly pinError = signal(false);
  readonly countdownSeconds = signal(5);
  readonly lastRefreshLabel = signal('just now');

  private inactivityTimer: ReturnType<typeof setTimeout> | null = null;
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private successTimer: ReturnType<typeof setTimeout> | null = null;
  private countdownTimer: ReturnType<typeof setInterval> | null = null;
  private refreshTime = new Date();

  /** Appointments in the next 2 hours that are booked/confirmed */
  readonly upcomingAppointments = computed(() => {
    const now = Date.now();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    return this.appointmentService.appointments().filter(a => {
      const startMs = new Date(a.start_at).getTime();
      return (
        ['booked', 'confirmed'].includes(a.status) &&
        startMs >= now - 5 * 60 * 1000 && // allow 5min late check-in
        startMs <= now + twoHoursMs
      );
    }).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  });

  readonly clientFirstName = computed(() => {
    const appt = this.selectedAppointment();
    if (!appt) return '';
    const full = (appt as any).client?.full_name ?? '';
    return full.split(' ')[0] || full;
  });

  ngOnInit() {
    const tid = this.auth.profile()?.id;
    if (tid) {
      this.appointmentService.loadAppointments(tid, {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      });
    }

    this.startInactivityTimer();
    this.refreshTimer = setInterval(() => this.refreshAppointments(), REFRESH_INTERVAL_MS);
  }

  ngOnDestroy() {
    this.clearTimers();
  }

  selectAppointment(appt: Appointment) {
    this.selectedAppointment.set(appt);
    this.screen.set('verify-identity');
    this.resetInactivity();
  }

  onVerifyInput() {
    // Auto-submit when 4 digits entered
    if ((this.verifyInput as unknown as string).length === 4) {
      this.verifyIdentity();
    }
  }

  private async verifyIdentity() {
    // In production: compare against `profiles.phone` last 4 digits
    // For now: any 4-digit input succeeds (trainer configures phone verification separately)
    const input = (this.verifyInput as unknown as string).trim();
    if (input.length !== 4 || !/^\d{4}$/.test(input)) {
      this.verifyError.set(true);
      return;
    }

    this.verifyError.set(false);
    this.screen.set('checking-in');

    const appt = this.selectedAppointment();
    if (!appt) { this.goBack(); return; }

    const result = await this.fsm.transition(appt, 'arrived');

    if (result.success) {
      this.screen.set('success');
      this.startSuccessCountdown();
    } else {
      this.screen.set('verify-identity');
      const toastEl = await this.toast.create({
        message: result.error ?? 'Check-in failed. Please see your trainer.',
        duration: 3000,
        color: 'warning',
        position: 'top',
      });
      await toastEl.present();
    }
  }

  private startSuccessCountdown() {
    this.countdownSeconds.set(5);
    this.countdownTimer = setInterval(() => {
      const remaining = this.countdownSeconds() - 1;
      if (remaining <= 0) {
        this.resetToWelcome();
      } else {
        this.countdownSeconds.set(remaining);
      }
    }, 1000);
  }

  goBack() {
    this.screen.set('welcome');
    this.selectedAppointment.set(null);
    this.verifyError.set(false);
  }

  promptPinExit() {
    this.screen.set('pin-exit');
    this.pinError.set(false);
  }

  exitKiosk() {
    // In production: compare against stored PIN from trainer settings
    const pin = (this.pinInput as unknown as string).trim();
    if (!pin || pin.length < 4) {
      this.pinError.set(true);
      return;
    }
    // For now: any PIN exits (Sprint 57 will wire to settings.kiosk_pin)
    this.clearTimers();
    this.router.navigate(['/tabs/schedule']);
  }

  resetInactivity() {
    this.startInactivityTimer();
  }

  private startInactivityTimer() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    this.inactivityTimer = setTimeout(() => {
      this.resetToWelcome();
    }, INACTIVITY_TIMEOUT_MS);
  }

  private resetToWelcome() {
    if (this.countdownTimer) clearInterval(this.countdownTimer);
    this.screen.set('welcome');
    this.selectedAppointment.set(null);
    this.verifyError.set(false);
    this.startInactivityTimer();
  }

  private async refreshAppointments() {
    const tid = this.auth.profile()?.id;
    if (tid) {
      await this.appointmentService.loadAppointments(tid, {
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0],
      });
    }
    this.refreshTime = new Date();
    this.lastRefreshLabel.set('just now');
  }

  private clearTimers() {
    if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
    if (this.refreshTimer) clearInterval(this.refreshTimer);
    if (this.successTimer) clearTimeout(this.successTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  initials(appt: Appointment): string {
    const name = (appt as any).client?.full_name ?? '?';
    return name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();
  }

  clientName(appt: Appointment): string {
    return (appt as any).client?.full_name ?? 'Client';
  }

  serviceName(appt: Appointment): string {
    return (appt as any).service_type?.name ?? 'Session';
  }

  formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  }
}
