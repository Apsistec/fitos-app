import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonCheckbox,
  IonInput,
  IonLabel,
  IonItem,
  IonProgressBar,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  checkmarkCircleOutline,
  documentTextOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface UnsignedWaiver {
  id: string;
  title: string;
  body_html: string;
  signature_type: 'checkbox' | 'digital';
  version: number;
}

// ─── Component ─────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-waiver-sign',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonCheckbox,
    IonInput,
    IonLabel,
    IonItem,
    IonProgressBar,
    IonNote,
    IonSpinner,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Action Required</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <!-- ── Loading ────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="loading-state">
          <ion-spinner></ion-spinner>
          <p>Loading required waivers…</p>
        </div>
      }

      <!-- ── All done ───────────────────────────────────────────── -->
      @else if (allSigned()) {
        <div class="done-state">
          <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
          <h2>All waivers signed!</h2>
          <p>Redirecting to your dashboard…</p>
        </div>
      }

      <!-- ── Active waiver ──────────────────────────────────────── -->
      @else if (currentWaiver()) {

        <!-- Progress indicator (only when >1 waivers) -->
        @if (waivers().length > 1) {
          <div class="progress-row">
            <ion-progress-bar [value]="progressValue()"></ion-progress-bar>
            <p class="progress-label">
              Waiver {{ currentIndex() + 1 }} of {{ waivers().length }}
            </p>
          </div>
        }

        <!-- Required notice banner -->
        <div class="required-notice">
          <ion-icon name="shield-checkmark-outline"></ion-icon>
          <p>
            Your trainer requires you to review and sign this agreement
            before accessing training features.
          </p>
        </div>

        <!-- Waiver document -->
        <div class="waiver-card">
          <h2 class="waiver-title">{{ currentWaiver()!.title }}</h2>
          <div class="waiver-body" [innerHTML]="currentWaiverHtml()"></div>
        </div>

        <!-- Signature section -->
        <div class="signature-section">

          @if (currentWaiver()!.signature_type === 'checkbox') {
            <!-- Checkbox: "I agree" -->
            <ion-item lines="none" class="agree-item">
              <ion-checkbox
                slot="start"
                [ngModel]="hasAgreed()"
                (ionChange)="onCheckboxChange($event)"
              ></ion-checkbox>
              <ion-label class="ion-text-wrap">
                I have read, understand, and voluntarily agree to the
                terms of this waiver.
              </ion-label>
            </ion-item>
          } @else {
            <!-- Digital: typed name -->
            <div class="digital-sig-area">
              <ion-note class="sig-instruction">
                Type your full legal name below to sign digitally.
              </ion-note>
              <ion-item>
                <ion-label position="stacked">Full Legal Name</ion-label>
                <ion-input
                  [ngModel]="typedName()"
                  (ionInput)="onNameInput($event)"
                  placeholder="e.g. Jane Smith"
                  autocomplete="name"
                  inputmode="text"
                  clearInput
                ></ion-input>
              </ion-item>
            </div>
          }

          <div class="sign-action">
            <ion-button
              expand="block"
              (click)="signCurrentWaiver()"
              [disabled]="!canSign() || signing()"
            >
              @if (signing()) {
                <ion-spinner name="crescent" slot="start"></ion-spinner>
              }
              {{ isLastWaiver() ? 'Sign & Go to Dashboard' : 'Sign & Continue' }}
            </ion-button>
          </div>

          <p class="legal-footer">
            By signing, you confirm that you are the account holder and have
            read and understood this document. This constitutes a legally
            binding electronic signature.
          </p>

        </div>
      }

    </ion-content>
  `,
  styles: [`
    :host {
      ion-header ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }
      ion-content {
        --background: var(--fitos-bg-primary, #0D0D0D);
      }
    }

    /* ── Loading ────────────────────────────────────────── */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60%;
      gap: 16px;
      padding: 24px;
      text-align: center;

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    /* ── Done state ─────────────────────────────────────── */
    .done-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60%;
      gap: 16px;
      padding: 24px;
      text-align: center;

      ion-icon {
        font-size: 72px;
      }

      h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    /* ── Progress bar ───────────────────────────────────── */
    .progress-row {
      padding: 16px 16px 0;

      ion-progress-bar {
        --buffer-background: rgba(255,255,255,0.08);
        --progress-background: var(--fitos-accent-primary, #10B981);
        border-radius: 4px;
        height: 4px;
      }

      .progress-label {
        margin: 6px 0 0;
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
        text-align: right;
      }
    }

    /* ── Required notice ────────────────────────────────── */
    .required-notice {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 16px;
      padding: 14px;
      background: rgba(16, 185, 129, 0.08);
      border: 1px solid rgba(16, 185, 129, 0.22);
      border-radius: 12px;

      ion-icon {
        font-size: 20px;
        color: var(--fitos-accent-primary, #10B981);
        flex-shrink: 0;
        margin-top: 1px;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.5;
      }
    }

    /* ── Waiver document card ───────────────────────────── */
    .waiver-card {
      margin: 0 16px 16px;
      padding: 20px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 14px;
      max-height: 48vh;
      overflow-y: auto;

      .waiver-title {
        margin: 0 0 16px;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .waiver-body {
        font-size: 13px;
        line-height: 1.7;
        color: var(--fitos-text-secondary, #A3A3A3);

        h2, h3 {
          color: var(--fitos-text-primary, #F5F5F5);
          font-size: 15px;
          margin: 16px 0 8px;

          &:first-child {
            margin-top: 0;
          }
        }

        p {
          margin: 0 0 12px;

          &:last-child {
            margin-bottom: 0;
          }
        }

        strong {
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }
    }

    /* ── Signature section ──────────────────────────────── */
    .signature-section {
      padding: 0 16px 40px;

      .agree-item {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        --border-radius: 12px;
        --padding-start: 16px;
        --inner-padding-end: 16px;
        margin-bottom: 16px;
        border-radius: 12px;

        ion-label {
          font-size: 14px;
          color: var(--fitos-text-primary, #F5F5F5);
          line-height: 1.5;
        }
      }

      .digital-sig-area {
        margin-bottom: 16px;

        .sig-instruction {
          display: block;
          font-size: 13px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 8px;
        }

        ion-item {
          --background: var(--fitos-bg-secondary, #1A1A1A);
          --border-radius: 12px;
          border-radius: 12px;
        }
      }

      .sign-action {
        margin-top: 8px;
      }

      .legal-footer {
        margin: 12px 0 0;
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
        line-height: 1.5;
        text-align: center;
      }
    }
  `],
})
export class WaiverSignPage implements OnInit {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private sanitizer = inject(DomSanitizer);

  // ── State signals ───────────────────────────────────────────────────────────
  loading = signal(true);
  signing = signal(false);
  waivers = signal<UnsignedWaiver[]>([]);
  currentIndex = signal(0);

  // Form state (reset between waivers)
  hasAgreed = signal(false);
  typedName = signal('');

  // ── Computed ────────────────────────────────────────────────────────────────
  currentWaiver = computed(() => this.waivers()[this.currentIndex()] ?? null);

  /** True after all waivers have been signed (waivers array becomes empty or exhausted). */
  allSigned = computed(() => !this.loading() && this.waivers().length === 0);

  /** 0–1 fraction for the progress bar. */
  progressValue = computed(() =>
    this.waivers().length > 0 ? this.currentIndex() / this.waivers().length : 0
  );

  /** True when the client is signing the last remaining waiver. */
  isLastWaiver = computed(() => this.currentIndex() === this.waivers().length - 1);

  /** Whether the current waiver can be submitted. */
  canSign = computed(() => {
    const waiver = this.currentWaiver();
    if (!waiver) return false;
    if (waiver.signature_type === 'checkbox') return this.hasAgreed();
    return this.typedName().trim().length >= 2;
  });

  /** Sanitized HTML for the current waiver body. */
  currentWaiverHtml = computed((): SafeHtml => {
    const html = this.currentWaiver()?.body_html ?? '';
    // Content originates from the gym owner's own editor (trusted source).
    return this.sanitizer.bypassSecurityTrustHtml(html);
  });

  async ngOnInit(): Promise<void> {
    await this.loadUnsignedWaivers();
  }

  // ── Data loading ─────────────────────────────────────────────────────────────

  private async loadUnsignedWaivers(): Promise<void> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) {
        this.router.navigate(['/auth/login']);
        return;
      }

      const { data, error } = await this.supabase.client.rpc(
        'get_unsigned_waivers',
        { p_client_id: userId }
      );

      if (error) throw error;

      const unsigned: UnsignedWaiver[] = (data ?? []).map((row: any) => ({
        id:             row.id,
        title:          row.title,
        body_html:      row.body_html,
        signature_type: row.signature_type as 'checkbox' | 'digital',
        version:        row.version,
      }));

      this.waivers.set(unsigned);

      // Nothing to sign — navigate directly to dashboard
      if (unsigned.length === 0) {
        this.router.navigate(['/tabs/dashboard']);
      }
    } catch (err) {
      console.error('[WaiverSignPage] loadUnsignedWaivers error:', err);
      // On error, navigate to dashboard rather than leaving client stuck here
      this.router.navigate(['/tabs/dashboard']);
    } finally {
      this.loading.set(false);
    }
  }

  // ── Form event handlers ───────────────────────────────────────────────────────

  onCheckboxChange(event: Event): void {
    const checked = (event as CustomEvent).detail.checked as boolean;
    this.hasAgreed.set(checked);
  }

  onNameInput(event: Event): void {
    const value = ((event as CustomEvent).detail.value ?? '') as string;
    this.typedName.set(value);
  }

  // ── Signing ───────────────────────────────────────────────────────────────────

  async signCurrentWaiver(): Promise<void> {
    const waiver = this.currentWaiver();
    if (!waiver || !this.canSign()) return;

    this.signing.set(true);
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('No authenticated user');

      const signatureData =
        waiver.signature_type === 'digital' ? this.typedName().trim() : null;

      const { error } = await this.supabase.client
        .from('waiver_signatures')
        .insert({
          waiver_id:      waiver.id,
          signer_id:      userId,
          waiver_version: waiver.version,
          signature_data: signatureData,
          user_agent:     navigator.userAgent,
          device_type:    this.detectDeviceType(),
          app_version:    '1.0.0',
        });

      if (error) throw error;

      // ── Advance ──────────────────────────────────────────────────────────────
      const nextIndex = this.currentIndex() + 1;

      if (nextIndex < this.waivers().length) {
        // More waivers to sign — advance counter and reset form
        this.currentIndex.set(nextIndex);
        this.resetForm();
      } else {
        // All waivers signed — show done state then navigate
        this.waivers.set([]); // triggers allSigned() computed
        setTimeout(() => this.router.navigate(['/tabs/dashboard']), 1500);
      }
    } catch (err) {
      console.error('[WaiverSignPage] signCurrentWaiver error:', err);
      // Keep the form visible so the client can retry
    } finally {
      this.signing.set(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────────

  private resetForm(): void {
    this.hasAgreed.set(false);
    this.typedName.set('');
  }

  /** Best-effort device type detection from User-Agent. */
  private detectDeviceType(): 'ios' | 'android' | 'web' {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) return 'ios';
    if (/android/.test(ua)) return 'android';
    return 'web';
  }

  constructor() {
    addIcons({
      shieldCheckmarkOutline,
      checkmarkCircleOutline,
      documentTextOutline,
    });
  }
}
