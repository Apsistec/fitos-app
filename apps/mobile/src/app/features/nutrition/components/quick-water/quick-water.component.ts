import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonText,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { closeOutline, waterOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

const QUICK_AMOUNTS = [
  { label: '250 ml', value: 250 },
  { label: '500 ml', value: 500 },
  { label: '750 ml', value: 750 },
  { label: '1 L', value: 1000 },
];

/**
 * Quick water logging modal — launched from the home-screen shortcut,
 * the "Add Water" app quick action, or from the nutrition tab.
 *
 * One-tap flow: tap a preset → haptic + toast → auto-dismiss.
 * Custom flow: enter ml manually → tap Log.
 */
@Component({
  selector: 'app-quick-water',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Log Water</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon name="close-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Water icon + total -->
      <div class="water-header">
        <ion-icon name="water-outline" class="water-icon"></ion-icon>
        <p class="water-label">How much water did you drink?</p>
      </div>

      <!-- Quick preset buttons -->
      <div class="quick-amounts">
        @for (amount of quickAmounts; track amount.value) {
          <ion-button
            expand="block"
            [color]="isLogging() ? 'medium' : 'primary'"
            [disabled]="isLogging()"
            class="amount-btn"
            (click)="logQuick(amount.value)"
          >
            {{ amount.label }}
          </ion-button>
        }
      </div>

      <!-- Divider -->
      <div class="divider">
        <span>or enter custom amount</span>
      </div>

      <!-- Custom amount -->
      <div class="custom-row">
        <ion-item class="custom-input" lines="full">
          <ion-label position="floating">Amount (ml)</ion-label>
          <ion-input
            type="number"
            [(ngModel)]="customAmount"
            [min]="1"
            [max]="5000"
            placeholder="e.g. 350"
            inputmode="numeric"
          ></ion-input>
        </ion-item>
        <ion-button
          expand="block"
          color="primary"
          [disabled]="!customAmount || isLogging()"
          (click)="logCustom()"
          class="log-btn"
        >
          <ion-icon name="checkmark-circle-outline" slot="start"></ion-icon>
          Log
        </ion-button>
      </div>

      @if (errorMessage()) {
        <ion-text color="danger">
          <p class="error-msg">{{ errorMessage() }}</p>
        </ion-text>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: var(--fitos-bg-secondary, #1A1A1A);
    }

    ion-content {
      --background: var(--fitos-bg-primary, #0D0D0D);
    }

    .water-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 24px 0 20px;
      gap: 8px;
    }

    .water-icon {
      font-size: 56px;
      color: var(--ion-color-primary, #10B981);
      opacity: 0.85;
    }

    .water-label {
      margin: 0;
      font-size: 15px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
    }

    .quick-amounts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .amount-btn {
      --border-radius: 12px;
      height: 56px;
      font-size: 17px;
      font-weight: 600;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;

      &::before, &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: rgba(255, 255, 255, 0.08);
      }

      span {
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
        white-space: nowrap;
      }
    }

    .custom-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .custom-input {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --border-radius: 12px;
      border-radius: 12px;
    }

    .log-btn {
      --border-radius: 12px;
    }

    .error-msg {
      margin: 12px 0 0;
      font-size: 13px;
      text-align: center;
    }
  `],
})
export class QuickWaterComponent {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);
  private modalController = inject(ModalController);
  private toastController = inject(ToastController);

  readonly quickAmounts = QUICK_AMOUNTS;

  isLogging = signal(false);
  errorMessage = signal<string | null>(null);
  customAmount: number | null = null;

  constructor() {
    addIcons({ closeOutline, waterOutline, checkmarkCircleOutline });
  }

  async logQuick(ml: number): Promise<void> {
    await this.logWater(ml);
  }

  async logCustom(): Promise<void> {
    if (!this.customAmount || this.customAmount <= 0) return;
    await this.logWater(this.customAmount);
  }

  dismiss(): void {
    this.modalController.dismiss();
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async logWater(ml: number): Promise<void> {
    if (this.isLogging()) return;

    this.isLogging.set(true);
    this.errorMessage.set(null);

    try {
      const user = this.authService.user();
      if (!user) throw new Error('Not authenticated');

      const today = new Date().toISOString().split('T')[0];

      // Upsert today's water log (water_logs table, or nutrition_logs with water_ml column)
      // We store water in a dedicated water_logs table for simplicity.
      const { error } = await this.supabase.client
        .from('water_logs')
        .insert({
          user_id: user.id,
          amount_ml: ml,
          logged_at: new Date().toISOString(),
          log_date: today,
        });

      if (error) throw error;

      // Haptic success feedback
      await Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);

      const toast = await this.toastController.create({
        message: `💧 ${ml} ml logged!`,
        duration: 1800,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();

      // Auto-dismiss modal after a short delay
      setTimeout(() => this.modalController.dismiss({ logged: true, ml }), 400);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to log water';
      this.errorMessage.set(msg);
      this.isLogging.set(false);
    }
  }
}
