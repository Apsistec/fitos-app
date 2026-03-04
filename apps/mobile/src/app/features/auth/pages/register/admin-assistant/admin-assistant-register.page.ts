/**
 * AdminAssistantRegisterPage — Sprint 62 (EP-01 US-004)
 *
 * Handles the Owner-initiated invitation flow for Admin Assistants.
 *
 * Flow:
 *   1. Owner sends invitation → admin_invitations record + email with token
 *   2. AA clicks link: /auth/register/admin-assistant?token=<hex>
 *   3. This page validates the token (must be pending + not expired)
 *   4. AA sets password and optionally full_name
 *   5. Supabase Auth creates account; Edge Function creates profiles row
 *      with role='admin_assistant' + admin_assistants row with owner's permissions
 *   6. Redirect to admin-assistant onboarding
 *
 * IMPORTANT: /auth/register?role=admin_assistant is blocked by the noAuthGuard.
 * The only valid path is via token. If no token is present, the page redirects to login.
 */

import {
  Component,
  OnInit,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonSpinner,
  IonInput,
  IonItem,
  IonNote,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  eyeOutline,
  eyeOffOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import { SupabaseService } from '../../../../../core/services/supabase.service';
import { RbacService } from '../../../../../core/services/rbac.service';
import type { AdminInvitation } from '@fitos/shared';

addIcons({ shieldCheckmarkOutline, eyeOutline, eyeOffOutline, checkmarkCircleOutline, alertCircleOutline });

type PageState = 'loading' | 'invalid' | 'form' | 'success';

@Component({
  selector: 'app-admin-assistant-register',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonInput,
    IonItem,
    IonNote,
  ],
  template: `
    <ion-content class="aa-register-content">
      <div class="register-container">

        <!-- Logo / header -->
        <div class="brand-header">
          <div class="brand-logo">F</div>
          <div class="brand-name">FitOS</div>
        </div>

        <!-- Loading state -->
        @if (pageState() === 'loading') {
          <div class="state-card">
            <ion-spinner name="crescent" class="loading-spinner"></ion-spinner>
            <p>Verifying your invitation...</p>
          </div>
        }

        <!-- Invalid token state -->
        @if (pageState() === 'invalid') {
          <div class="state-card error-card">
            <ion-icon name="alert-circle-outline" class="state-icon error"></ion-icon>
            <h2>Invalid Invitation</h2>
            <p>{{ invalidReason() }}</p>
            <ion-note>
              Ask your gym owner to send a new invitation link.
            </ion-note>
            <ion-button fill="outline" routerLink="/auth/login" class="mt-16">
              Go to Login
            </ion-button>
          </div>
        }

        <!-- Registration form -->
        @if (pageState() === 'form') {
          <div class="form-card">
            <div class="form-header">
              <ion-icon name="shield-checkmark-outline" class="form-header-icon"></ion-icon>
              <h1>Set Up Your Account</h1>
              <p>
                You've been invited to join as an Admin Assistant.
                Create a password to get started.
              </p>
            </div>

            <div class="invite-info-row">
              <span class="invite-label">Invited by:</span>
              <span class="invite-value">{{ invitation()?.owner_id ? ownerName() : 'Your gym owner' }}</span>
            </div>

            <div class="invite-info-row">
              <span class="invite-label">Your email:</span>
              <span class="invite-value">{{ invitation()?.email }}</span>
            </div>

            <div class="form-fields">
              <!-- Full name (optional) -->
              <div class="field-group">
                <label class="field-label">Your name</label>
                <input
                  class="field-input"
                  type="text"
                  placeholder="Full name"
                  [(ngModel)]="fullName"
                  autocomplete="name"
                />
              </div>

              <!-- Password -->
              <div class="field-group">
                <label class="field-label">Password</label>
                <div class="password-wrapper">
                  <input
                    class="field-input"
                    [type]="showPassword() ? 'text' : 'password'"
                    placeholder="Min. 8 characters"
                    [(ngModel)]="password"
                    autocomplete="new-password"
                  />
                  <button class="password-toggle" (click)="togglePassword()">
                    <ion-icon [name]="showPassword() ? 'eye-off-outline' : 'eye-outline'"></ion-icon>
                  </button>
                </div>
                @if (password && password.length < 8) {
                  <ion-note color="warning">Password must be at least 8 characters</ion-note>
                }
              </div>

              <!-- Confirm password -->
              <div class="field-group">
                <label class="field-label">Confirm password</label>
                <div class="password-wrapper">
                  <input
                    class="field-input"
                    [type]="showPassword() ? 'text' : 'password'"
                    placeholder="Repeat password"
                    [(ngModel)]="confirmPassword"
                    autocomplete="new-password"
                  />
                </div>
                @if (confirmPassword && confirmPassword !== password) {
                  <ion-note color="warning">Passwords do not match</ion-note>
                }
              </div>

              @if (formError()) {
                <div class="form-error">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  {{ formError() }}
                </div>
              }

              <ion-button
                expand="block"
                (click)="submitRegistration()"
                [disabled]="!isFormValid() || isSubmitting()"
                class="submit-btn"
              >
                @if (isSubmitting()) {
                  <ion-spinner name="crescent" slot="start"></ion-spinner>
                  Creating Account...
                } @else {
                  Create Account
                }
              </ion-button>

              <p class="legal-note">
                By creating an account, you agree to FitOS's
                <a href="/auth/terms" target="_blank">Terms of Service</a> and
                <a href="/auth/privacy" target="_blank">Privacy Policy</a>.
              </p>
            </div>
          </div>
        }

        <!-- Success state -->
        @if (pageState() === 'success') {
          <div class="state-card success-card">
            <ion-icon name="checkmark-circle-outline" class="state-icon success"></ion-icon>
            <h2>You're All Set!</h2>
            <p>Your admin assistant account has been created. Redirecting you now...</p>
            <ion-spinner name="dots" class="loading-spinner"></ion-spinner>
          </div>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .aa-register-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    .register-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .brand-header {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 32px;
    }
    .brand-logo {
      width: 36px; height: 36px; border-radius: 10px;
      background: var(--ion-color-primary, #10B981);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; font-weight: 900; color: #000;
    }
    .brand-name {
      font-size: 22px; font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    /* Cards */
    .state-card, .form-card {
      width: 100%; max-width: 400px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px; padding: 28px;
    }

    .state-card {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; gap: 12px;
    }
    .state-card h2 { margin: 0; font-size: 20px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }
    .state-card p { margin: 0; font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
    .state-card ion-note { font-size: 12px; }

    .state-icon { font-size: 52px; }
    .state-icon.success { color: var(--ion-color-primary, #10B981); }
    .state-icon.error { color: #F87171; }

    .loading-spinner { margin: 8px auto; }

    /* Form card */
    .form-header { text-align: center; margin-bottom: 20px; }
    .form-header-icon {
      font-size: 44px; color: var(--ion-color-primary, #10B981);
      display: block; margin: 0 auto 12px;
    }
    .form-header h1 { margin: 0 0 8px; font-size: 22px; font-weight: 800; color: var(--fitos-text-primary, #F5F5F5); }
    .form-header p { margin: 0; font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); line-height: 1.5; }

    .invite-info-row {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 12px;
      background: rgba(16,185,129,0.08); border-radius: 8px;
      margin-bottom: 8px; font-size: 13px;
    }
    .invite-label { color: var(--fitos-text-tertiary, #737373); }
    .invite-value { color: var(--fitos-text-primary, #F5F5F5); font-weight: 600; }

    .form-fields { margin-top: 20px; display: flex; flex-direction: column; gap: 14px; }

    .field-group { display: flex; flex-direction: column; gap: 6px; }
    .field-label { font-size: 12px; font-weight: 600; color: var(--fitos-text-secondary, #A3A3A3); }

    .field-input {
      width: 100%; padding: 12px 14px;
      background: var(--fitos-bg-tertiary, #262626);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 10px; color: var(--fitos-text-primary, #F5F5F5);
      font-size: 15px; outline: none; box-sizing: border-box;
    }
    .field-input:focus { border-color: var(--ion-color-primary, #10B981); }

    .password-wrapper { position: relative; }
    .password-wrapper .field-input { padding-right: 48px; }
    .password-toggle {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; cursor: pointer;
      color: var(--fitos-text-tertiary, #737373); font-size: 20px; padding: 0;
    }

    .form-error {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 8px;
      background: rgba(248,113,113,0.1);
      color: #F87171; font-size: 13px;
    }
    .form-error ion-icon { font-size: 18px; flex-shrink: 0; }

    .submit-btn { --border-radius: 12px; margin-top: 4px; height: 50px; font-size: 16px; font-weight: 700; }

    .legal-note { font-size: 11px; color: var(--fitos-text-tertiary, #737373); text-align: center; margin: 4px 0 0; }
    .legal-note a { color: var(--ion-color-primary, #10B981); }

    .mt-16 { margin-top: 16px; }

    .error-card { border-color: rgba(248,113,113,0.2); }
    .success-card { border-color: rgba(16,185,129,0.2); }
  `],
})
export class AdminAssistantRegisterPage implements OnInit {
  private supabase  = inject(SupabaseService);
  private rbac      = inject(RbacService);
  private router    = inject(Router);
  private route     = inject(ActivatedRoute);
  private toastCtrl = inject(ToastController);

  pageState     = signal<PageState>('loading');
  invitation    = signal<AdminInvitation | null>(null);
  invalidReason = signal('');
  ownerName     = signal('');
  formError     = signal<string | null>(null);
  isSubmitting  = signal(false);
  showPassword  = signal(false);

  fullName       = '';
  password       = '';
  confirmPassword = '';

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.invalidReason.set('No invitation token was found in the URL.');
      this.pageState.set('invalid');
      return;
    }

    await this.validateToken(token);
  }

  private async validateToken(token: string): Promise<void> {
    const inv = await this.rbac.getInvitationByToken(token);

    if (!inv) {
      this.invalidReason.set('This invitation link is invalid or has already been used.');
      this.pageState.set('invalid');
      return;
    }

    if (inv.status !== 'pending') {
      const reasons: Record<string, string> = {
        accepted:  'This invitation has already been accepted.',
        expired:   'This invitation has expired.',
        cancelled: 'This invitation was cancelled by the gym owner.',
      };
      this.invalidReason.set(reasons[inv.status] ?? 'This invitation is no longer valid.');
      this.pageState.set('invalid');
      return;
    }

    if (new Date(inv.expires_at) < new Date()) {
      this.invalidReason.set('This invitation has expired. Ask your gym owner to resend it.');
      this.pageState.set('invalid');
      return;
    }

    // Fetch owner's name for display
    const { data: ownerProfile } = await this.supabase.client
      .from('profiles')
      .select('full_name')
      .eq('id', inv.owner_id)
      .single();

    this.ownerName.set(ownerProfile?.full_name ?? 'Your gym owner');
    this.invitation.set(inv);
    this.pageState.set('form');
  }

  // ── Form ─────────────────────────────────────────────────────────────────

  isFormValid(): boolean {
    return (
      this.password.length >= 8 &&
      this.password === this.confirmPassword
    );
  }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  async submitRegistration(): Promise<void> {
    if (!this.isFormValid() || this.isSubmitting()) return;

    const inv = this.invitation();
    if (!inv) return;

    this.isSubmitting.set(true);
    this.formError.set(null);

    try {
      // 1. Create Supabase Auth user
      const { data: authData, error: signUpError } = await this.supabase.client.auth.signUp({
        email:    inv.email,
        password: this.password,
        options: {
          data: {
            full_name:      this.fullName || inv.email.split('@')[0],
            role:           'admin_assistant',
            invite_token:   inv.invite_token,
            owner_id:       inv.owner_id,
            facility_id:    inv.facility_id ?? null,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!authData.user) {
        throw new Error('Account creation failed. Please try again.');
      }

      // 2. Call Edge Function to complete profile + admin_assistants row + mark invite accepted
      const { error: fnError } = await this.supabase.client.functions.invoke(
        'complete-admin-assistant-registration',
        {
          body: {
            user_id:      authData.user.id,
            invite_token: inv.invite_token,
            full_name:    this.fullName || inv.email.split('@')[0],
          },
        }
      );

      if (fnError) {
        console.warn('[AA Register] complete-admin-assistant-registration error:', fnError);
        // Non-fatal: profile trigger may have handled it
      }

      this.pageState.set('success');

      // Redirect to onboarding after brief delay
      setTimeout(() => {
        this.router.navigate(['/auth/onboarding'], {
          queryParams: { role: 'admin_assistant' },
          replaceUrl: true,
        });
      }, 2000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      this.formError.set(msg);
      console.error('[AA Register] submitRegistration:', err);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
