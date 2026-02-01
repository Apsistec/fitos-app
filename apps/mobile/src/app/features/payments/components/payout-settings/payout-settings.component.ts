import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonNote,
  IonSpinner,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline, informationCircleOutline } from 'ionicons/icons';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { StripeService } from '../../../../core/services/stripe.service';

interface PayoutSettings {
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  delayDays: number;
  statementDescriptor?: string;
}

/**
 * PayoutSettingsComponent - Configure payout preferences
 *
 * Features:
 * - Payout schedule (daily, weekly, monthly, manual)
 * - Payout delay days
 * - Statement descriptor customization
 *
 * Sprint 28: Stripe Connect Marketplace
 */
@Component({
  selector: 'fit-payout-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonNote,
    IonSpinner,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Payout Settings</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent" />
            <p>Loading settings...</p>
          </div>
        } @else {
          <ion-list lines="full">
            <ion-item>
              <ion-label position="stacked">
                Payout Schedule
                <ion-note>How often you receive payouts</ion-note>
              </ion-label>
              <ion-select
                [(ngModel)]="settings().schedule"
                interface="popover"
                placeholder="Select schedule"
              >
                <ion-select-option value="daily">Daily</ion-select-option>
                <ion-select-option value="weekly">Weekly</ion-select-option>
                <ion-select-option value="monthly">Monthly</ion-select-option>
                <ion-select-option value="manual">Manual</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">
                Payout Delay
                <ion-note>Days to wait before funds are paid out</ion-note>
              </ion-label>
              <ion-select
                [(ngModel)]="settings().delayDays"
                interface="popover"
                placeholder="Select delay"
              >
                <ion-select-option [value]="0">Instant (0 days)</ion-select-option>
                <ion-select-option [value]="2">2 days (Standard)</ion-select-option>
                <ion-select-option [value]="7">7 days</ion-select-option>
                <ion-select-option [value]="14">14 days</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">
                Statement Descriptor (Optional)
                <ion-note>How your business appears on bank statements</ion-note>
              </ion-label>
              <ion-input
                [(ngModel)]="settings().statementDescriptor"
                placeholder="MY GYM"
                maxlength="22"
              />
            </ion-item>
          </ion-list>

          <div class="info-section ion-margin-top">
            <ion-icon name="information-circle-outline" color="primary" />
            <div class="info-content">
              <p><strong>Payout Schedule:</strong></p>
              <ul>
                <li><strong>Daily:</strong> Receive payouts every business day</li>
                <li><strong>Weekly:</strong> Receive payouts once per week</li>
                <li><strong>Monthly:</strong> Receive payouts once per month</li>
                <li><strong>Manual:</strong> Request payouts when you choose</li>
              </ul>

              <p class="ion-margin-top"><strong>Payout Delay:</strong></p>
              <p>Standard delay is 2 days. Instant payouts (0 days) may incur additional fees.</p>

              <p class="ion-margin-top"><strong>Note:</strong> Changes may take 1-2 business days to take effect.</p>
            </div>
          </div>

          <ion-button
            expand="block"
            (click)="saveSettings()"
            [disabled]="saving()"
            class="ion-margin-top"
          >
            @if (saving()) {
              <ion-spinner name="crescent" slot="start" />
              Saving...
            } @else {
              <ion-icon name="save-outline" slot="start" />
              Save Settings
            }
          </ion-button>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-list {
      --background: transparent;
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      gap: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .info-section {
      display: flex;
      gap: 16px;
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;

      ion-icon {
        font-size: 24px;
        margin-top: 4px;
        flex-shrink: 0;
      }

      .info-content {
        flex: 1;

        p {
          margin: 0 0 8px 0;
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);

          strong {
            color: var(--fitos-text-primary, #F5F5F5);
          }
        }

        ul {
          margin: 8px 0;
          padding-left: 20px;
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);

          li {
            margin-bottom: 4px;

            strong {
              color: var(--fitos-text-primary, #F5F5F5);
            }
          }
        }
      }
    }

    ion-button[expand="block"] {
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    ion-note {
      font-size: 13px;
      margin-top: 4px;
      color: var(--fitos-text-tertiary, #737373);
    }
  `],
})
export class PayoutSettingsComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private stripeService = inject(StripeService);
  private toastController = inject(ToastController);

  // State
  loading = signal(true);
  saving = signal(false);
  settings = signal<PayoutSettings>({
    schedule: 'daily',
    delayDays: 2,
    statementDescriptor: '',
  });

  constructor() {
    addIcons({
      saveOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.loading.set(true);

    try {
      const status = this.stripeService.connectStatus();
      if (!status?.accountId) {
        throw new Error('No Stripe account found');
      }

      const { data, error } = await this.supabase.client
        .from('stripe_connect_settings')
        .select('*')
        .eq('account_id', status.accountId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        this.settings.set({
          schedule: data.payout_schedule,
          delayDays: data.payout_delay_days,
          statementDescriptor: data.statement_descriptor || '',
        });
      }
    } catch (err) {
      console.error('Error loading payout settings:', err);
      await this.presentToast('Error loading settings', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async saveSettings() {
    this.saving.set(true);

    try {
      const status = this.stripeService.connectStatus();
      if (!status?.accountId) {
        throw new Error('No Stripe account found');
      }

      const { error } = await this.supabase.client
        .from('stripe_connect_settings')
        .update({
          payout_schedule: this.settings().schedule,
          payout_delay_days: this.settings().delayDays,
          statement_descriptor: this.settings().statementDescriptor || null,
          updated_at: new Date().toISOString(),
        })
        .eq('account_id', status.accountId);

      if (error) throw error;

      await this.presentToast('Settings saved successfully', 'success');
    } catch (err) {
      console.error('Error saving payout settings:', err);
      await this.presentToast('Error saving settings', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  private async presentToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
