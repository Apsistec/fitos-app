import {
  Component,
  inject,
  signal,
  output,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonInput,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * OtpLoginComponent
 * Sprint 53: Email OTP sign-in (6-digit code, no redirect).
 *
 * Usage:
 *   <app-otp-login (success)="onOtpSuccess()" (error)="onOtpError($event)"></app-otp-login>
 */
@Component({
  selector: 'app-otp-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, IonInput, IonButton, IonSpinner],
  template: `
    @if (!codeSent()) {
      <!-- ── Step 1: Enter email ───────────────────────────── -->
      <div class="otp-step">
        <p class="otp-hint">We'll send a 6-digit code to your email — no password needed.</p>

        <ion-input
          type="email"
          label="Email Address"
          labelPlacement="floating"
          fill="outline"
          placeholder="you@example.com"
          autocomplete="email"
          [(ngModel)]="email"
          class="otp-input"
        />

        @if (errorMsg()) {
          <div class="otp-error">{{ errorMsg() }}</div>
        }

        <ion-button
          expand="block"
          class="otp-btn"
          [disabled]="!email() || sending()"
          (click)="sendCode()"
        >
          @if (sending()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            Send Code
          }
        </ion-button>
      </div>
    } @else {
      <!-- ── Step 2: Enter code ─────────────────────────────── -->
      <div class="otp-step">
        <p class="otp-hint">
          Enter the 6-digit code sent to <strong>{{ email() }}</strong>
        </p>

        <ion-input
          type="text"
          inputmode="numeric"
          label="6-Digit Code"
          labelPlacement="floating"
          fill="outline"
          placeholder="123456"
          [maxlength]="6"
          autocomplete="one-time-code"
          [(ngModel)]="code"
          class="otp-input otp-code-input"
        />

        @if (errorMsg()) {
          <div class="otp-error">{{ errorMsg() }}</div>
        }

        <ion-button
          expand="block"
          class="otp-btn"
          [disabled]="code().length !== 6 || verifying()"
          (click)="verifyCode()"
        >
          @if (verifying()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            Verify Code
          }
        </ion-button>

        <ion-button
          expand="block"
          fill="clear"
          class="otp-resend-btn"
          [disabled]="resendCooldown() > 0 || sending()"
          (click)="resend()"
        >
          @if (resendCooldown() > 0) {
            Resend in {{ resendCooldown() }}s
          } @else if (sending()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            Resend Code
          }
        </ion-button>
      </div>
    }
  `,
  styles: [`
    .otp-step {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .otp-hint {
      margin: 0;
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      line-height: 1.5;
      text-align: center;

      strong {
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .otp-input {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 8px;
      --highlight-color-focused: var(--ion-color-primary, #10B981);
      --border-color: transparent;
      font-size: 16px;
    }

    .otp-code-input {
      font-size: 24px;
      font-weight: 700;
      letter-spacing: 8px;
      text-align: center;
    }

    .otp-error {
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      font-size: 13px;
      color: #FCA5A5;
    }

    .otp-btn {
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      font-size: 16px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .otp-resend-btn {
      --color: var(--fitos-text-tertiary, #737373);
      font-size: 14px;
    }
  `],
})
export class OtpLoginComponent {
  private authService = inject(AuthService);

  // Output events
  success = output<void>();
  authError = output<string>();

  // State
  email   = signal('');
  code    = signal('');
  codeSent      = signal(false);
  sending       = signal(false);
  verifying     = signal(false);
  errorMsg      = signal<string | null>(null);
  resendCooldown = signal(0);

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  async sendCode(): Promise<void> {
    const email = this.email().trim();
    if (!email) return;

    this.sending.set(true);
    this.errorMsg.set(null);

    const { error } = await this.authService.signInWithOtp(email);

    this.sending.set(false);

    if (error) {
      this.errorMsg.set(error.message);
    } else {
      this.codeSent.set(true);
      this.startResendCooldown(60);
    }
  }

  async verifyCode(): Promise<void> {
    const email = this.email().trim();
    const token = this.code().trim();
    if (!email || token.length !== 6) return;

    this.verifying.set(true);
    this.errorMsg.set(null);

    const { error } = await this.authService.verifyOtp(email, token);

    this.verifying.set(false);

    if (error) {
      this.errorMsg.set(error.message.includes('invalid') || error.message.includes('expired')
        ? 'Invalid or expired code. Please try again.'
        : error.message
      );
    } else {
      this.success.emit();
    }
  }

  async resend(): Promise<void> {
    if (this.resendCooldown() > 0) return;
    this.code.set('');
    await this.sendCode();
  }

  private startResendCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);
    this.cooldownTimer = setInterval(() => {
      const remaining = this.resendCooldown() - 1;
      this.resendCooldown.set(remaining);
      if (remaining <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = null;
      }
    }, 1000);
  }
}
