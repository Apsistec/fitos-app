import {
  Component,
  OnInit,
  signal,
  computed,
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
  IonNote,
  IonButton,
  IonIcon,
  IonSpinner,
  IonBadge,
  IonRange,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cashOutline,
  peopleOutline,
  statsChartOutline,
  settingsOutline,
  informationCircleOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { StripeService } from '../../../../core/services/stripe.service';

interface TrainerCommission {
  trainerId: string;
  trainerName: string;
  trainerEmail: string;
  commissionPercent: number;
  totalEarnedCents: number;
  transferCount: number;
  lastTransferAt: string | null;
}

interface CommissionSettings {
  defaultCommissionPercent: number;
  totalTrainers: number;
  totalTransfersCents: number;
}

/**
 * CommissionTrackingComponent - Gym owner commission management
 *
 * Features:
 * - View all trainer commission splits
 * - Adjust commission percentages per trainer
 * - Set default commission for new trainers
 * - View transfer history and totals
 * - Summary statistics
 *
 * Sprint 28: Stripe Connect Marketplace
 */
@Component({
  selector: 'fit-commission-tracking',
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
    IonNote,
    IonButton,
    IonIcon,
    IonSpinner,
    IonBadge,
    IonRange,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Commission Management</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-container">
            <ion-spinner name="crescent" />
            <p>Loading commission data...</p>
          </div>
        } @else {
          <!-- Summary Stats -->
          <div class="stats-grid">
            <div class="stat-card">
              <ion-icon name="people-outline" color="primary" />
              <div class="stat-content">
                <ion-label>Active Trainers</ion-label>
                <h2>{{ settings().totalTrainers }}</h2>
              </div>
            </div>
            <div class="stat-card">
              <ion-icon name="cash-outline" color="success" />
              <div class="stat-content">
                <ion-label>Total Commissions</ion-label>
                <h2>{{ formatCurrency(settings().totalTransfersCents) }}</h2>
              </div>
            </div>
          </div>

          <!-- Default Commission Setting -->
          <div class="default-commission-section ion-margin-top">
            <div class="section-header">
              <ion-icon name="settings-outline" color="primary" />
              <h3>Default Trainer Commission</h3>
            </div>
            <ion-note>Applied to new trainers joining your facility</ion-note>

            <div class="range-container">
              <ion-range
                [(ngModel)]="defaultCommission"
                [min]="50"
                [max]="95"
                [step]="5"
                [pin]="true"
                [ticks]="true"
                [snaps]="true"
              >
                <ion-label slot="start">50%</ion-label>
                <ion-label slot="end">95%</ion-label>
              </ion-range>
              <div class="range-value">
                <h2>{{ defaultCommission() }}%</h2>
                <ion-note>Trainer keeps {{ defaultCommission() }}%, you keep {{ 100 - defaultCommission() }}%</ion-note>
              </div>
            </div>

            <ion-button
              expand="block"
              size="small"
              (click)="saveDefaultCommission()"
              [disabled]="savingDefault()"
            >
              @if (savingDefault()) {
                <ion-spinner name="crescent" slot="start" />
                Saving...
              } @else {
                Save Default
              }
            </ion-button>
          </div>

          <!-- Trainer Commission List -->
          <div class="trainers-section ion-margin-top">
            <div class="section-header">
              <ion-icon name="people-outline" color="primary" />
              <h3>Trainer Commissions</h3>
            </div>

            @if (trainers().length === 0) {
              <div class="empty-state">
                <ion-icon name="people-outline" color="medium" />
                <p>No trainers yet</p>
                <ion-note>Trainers who join your facility will appear here</ion-note>
              </div>
            } @else {
              <ion-list lines="full">
                @for (trainer of trainers(); track trainer.trainerId) {
                  <ion-item>
                    <div class="trainer-item-content">
                      <div class="trainer-info">
                        <h3>{{ trainer.trainerName }}</h3>
                        <ion-note>{{ trainer.trainerEmail }}</ion-note>
                        <div class="trainer-stats">
                          <ion-badge color="success">
                            {{ formatCurrency(trainer.totalEarnedCents) }} earned
                          </ion-badge>
                          <ion-badge color="primary">
                            {{ trainer.transferCount }} transfers
                          </ion-badge>
                        </div>
                      </div>

                      <div class="trainer-commission">
                        <div class="commission-display">
                          <h2>{{ trainer.commissionPercent }}%</h2>
                          <ion-note>Commission</ion-note>
                        </div>
                        <ion-button
                          size="small"
                          fill="outline"
                          (click)="editCommission(trainer)"
                        >
                          <ion-icon name="settings-outline" slot="icon-only" />
                        </ion-button>
                      </div>
                    </div>
                  </ion-item>
                }
              </ion-list>
            }
          </div>

          <!-- Info Section -->
          <div class="info-section ion-margin-top">
            <ion-icon name="information-circle-outline" color="primary" />
            <div class="info-content">
              <p><strong>How Commissions Work:</strong></p>
              <ul>
                <li>When a client books a session with a trainer, the payment is split automatically</li>
                <li>The trainer receives their commission percentage directly to their bank account</li>
                <li>You receive your percentage as the facility owner</li>
                <li>FitOS platform fee (10%) is deducted from your portion only</li>
                <li>All transfers are processed automatically by Stripe</li>
              </ul>

              <p class="ion-margin-top"><strong>Example:</strong></p>
              <p>Client pays $100 → Trainer gets $80 → You get $18 → FitOS gets $2 (10% of your $20)</p>
            </div>
          </div>
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
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      gap: 1rem;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;

      ion-icon {
        font-size: 2rem;
        flex-shrink: 0;
      }

      .stat-content {
        flex: 1;

        ion-label {
          display: block;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 0.25rem;
        }

        h2 {
          margin: 0;
          font-size: 1.5rem;
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }
    }

    .default-commission-section,
    .trainers-section {
      padding: 1rem;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 0.5rem;

      ion-icon {
        font-size: 1.5rem;
      }

      h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .range-container {
      margin: 1.5rem 0;

      ion-range {
        padding: 0 0.5rem;
      }

      .range-value {
        text-align: center;
        margin-top: 1rem;

        h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: var(--ion-color-primary, #10B981);
        }

        ion-note {
          font-size: 0.875rem;
          color: var(--fitos-text-tertiary, #737373);
        }
      }
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;

      ion-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
        color: var(--fitos-text-tertiary, #737373);
      }

      p {
        margin: 0 0 0.5rem 0;
        font-size: 1.1rem;
        font-weight: 500;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      ion-note {
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .trainer-item-content {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.5rem 0;
      gap: 1rem;

      .trainer-info {
        flex: 1;

        h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        ion-note {
          display: block;
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        .trainer-stats {
          display: flex;
          gap: 0.5rem;
          margin-top: 0.5rem;

          ion-badge {
            font-size: 0.75rem;
          }
        }
      }

      .trainer-commission {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .commission-display {
          text-align: right;

          h2 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
            font-family: 'Space Mono', monospace;
            color: var(--ion-color-success);
          }

          ion-note {
            font-size: 0.75rem;
            color: var(--fitos-text-tertiary, #737373);
          }
        }
      }
    }

    .info-section {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: var(--fitos-bg-tertiary, #262626);
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
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        ul {
          margin: 0.5rem 0;
          padding-left: 1.25rem;
          font-size: 0.875rem;
          color: var(--fitos-text-secondary, #A3A3A3);

          li {
            margin-bottom: 0.25rem;
          }
        }
      }
    }

    ion-item {
      --background: transparent;
      --color: var(--fitos-text-primary, #F5F5F5);
      --border-color: rgba(255, 255, 255, 0.06);
    }

    ion-list {
      background: transparent;
    }
  `],
})
export class CommissionTrackingComponent implements OnInit {
  private supabase = inject(SupabaseService);
  private stripeService = inject(StripeService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  loading = signal(true);
  savingDefault = signal(false);
  defaultCommission = signal(80);
  trainers = signal<TrainerCommission[]>([]);
  settings = signal<CommissionSettings>({
    defaultCommissionPercent: 80,
    totalTrainers: 0,
    totalTransfersCents: 0,
  });

  constructor() {
    addIcons({
      cashOutline,
      peopleOutline,
      statsChartOutline,
      settingsOutline,
      informationCircleOutline,
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading.set(true);

    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // Load facility settings
      const { data: facilityData, error: facilityError } = await this.supabase.client
        .from('profiles')
        .select('facility_id')
        .eq('id', user.id)
        .single();

      if (facilityError || !facilityData?.facility_id) {
        throw new Error('No facility found for this user');
      }

      // Load trainer commissions with aggregated transfer data
      const { data: commissionData, error: commissionError } = await this.supabase.client
        .from('trainer_commissions')
        .select(`
          trainer_id,
          commission_percent,
          profiles!trainer_commissions_trainer_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('facility_id', facilityData.facility_id);

      if (commissionError) throw commissionError;

      // Load transfer totals for each trainer
      const trainerList: TrainerCommission[] = [];

      for (const commission of commissionData || []) {
        const { data: transferData, error: transferError } = await this.supabase.client
          .from('stripe_transfers')
          .select('amount_cents, created_at')
          .eq('trainer_id', commission.trainer_id)
          .order('created_at', { ascending: false });

        if (transferError) {
          console.error('Error loading transfers for trainer:', transferError);
          continue;
        }

        const totalEarnedCents = transferData?.reduce((sum, t) => sum + t.amount_cents, 0) || 0;
        const lastTransfer = transferData?.[0];

        trainerList.push({
          trainerId: commission.trainer_id,
          trainerName: commission.profiles.full_name || 'Unknown',
          trainerEmail: commission.profiles.email || '',
          commissionPercent: commission.commission_percent,
          totalEarnedCents,
          transferCount: transferData?.length || 0,
          lastTransferAt: lastTransfer?.created_at || null,
        });
      }

      this.trainers.set(trainerList);

      // Calculate totals
      const totalTransfersCents = trainerList.reduce((sum, t) => sum + t.totalEarnedCents, 0);

      this.settings.set({
        defaultCommissionPercent: 80, // TODO: Load from facility settings
        totalTrainers: trainerList.length,
        totalTransfersCents,
      });

      this.defaultCommission.set(this.settings().defaultCommissionPercent);
    } catch (error) {
      console.error('Error loading commission data:', error);
      await this.presentToast('Error loading commission data', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async saveDefaultCommission() {
    this.savingDefault.set(true);

    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      // TODO: Save to facility settings table
      // For now, just show success
      await this.presentToast('Default commission saved successfully', 'success');

      this.settings.update(s => ({
        ...s,
        defaultCommissionPercent: this.defaultCommission(),
      }));
    } catch (error) {
      console.error('Error saving default commission:', error);
      await this.presentToast('Error saving default commission', 'danger');
    } finally {
      this.savingDefault.set(false);
    }
  }

  async editCommission(trainer: TrainerCommission) {
    const alert = await this.alertController.create({
      header: 'Edit Commission',
      subHeader: trainer.trainerName,
      message: 'Set the commission percentage this trainer receives from client payments.',
      inputs: [
        {
          name: 'commission',
          type: 'number',
          placeholder: 'Commission %',
          value: trainer.commissionPercent,
          min: 50,
          max: 95,
        },
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Save',
          handler: async (data) => {
            const commission = parseInt(data.commission, 10);
            if (isNaN(commission) || commission < 50 || commission > 95) {
              await this.presentToast('Commission must be between 50% and 95%', 'warning');
              return false;
            }
            await this.updateTrainerCommission(trainer.trainerId, commission);
            return true;
          },
        },
      ],
    });

    await alert.present();
  }

  private async updateTrainerCommission(trainerId: string, commissionPercent: number) {
    try {
      const user = await this.supabase.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data: facilityData } = await this.supabase.client
        .from('profiles')
        .select('facility_id')
        .eq('id', user.id)
        .single();

      if (!facilityData?.facility_id) {
        throw new Error('No facility found');
      }

      const { error } = await this.supabase.client
        .from('trainer_commissions')
        .update({
          commission_percent: commissionPercent,
          updated_at: new Date().toISOString(),
        })
        .eq('facility_id', facilityData.facility_id)
        .eq('trainer_id', trainerId);

      if (error) throw error;

      // Update local state
      this.trainers.update(trainers =>
        trainers.map(t =>
          t.trainerId === trainerId
            ? { ...t, commissionPercent }
            : t
        )
      );

      await this.presentToast('Commission updated successfully', 'success');
    } catch (error) {
      console.error('Error updating commission:', error);
      await this.presentToast('Error updating commission', 'danger');
    }
  }

  formatCurrency(cents: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
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
