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
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      gap: 1rem;
    }

    .info-section {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--ion-color-light);
      border-radius: 8px;

      ion-icon {
        font-size: 1.5rem;
        margin-top: 0.25rem;
        flex-shrink: 0;
      }

      .info-content {
        flex: 1;

        p {
          margin: 0 0 0.5rem 0;
          font-size: 0.9rem;
        }

        ul {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;

          li {
            margin-bottom: 0.25rem;
          }
        }
      }
    }

    ion-note {
      font-size: 0.85rem;
      margin-top: 0.25rem;
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
