import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonBadge,
  IonProgressBar,
  IonItem,
  IonLabel,
  IonRadioGroup,
  IonRadio,
  IonSpinner,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  rocketOutline,
  sparklesOutline,
  trophyOutline,
  checkmarkCircleOutline,
  calendarOutline,
  cashOutline,
  closeOutline,
  arrowBackOutline,
} from 'ionicons/icons';

import { AutonomyService } from '../../../../core/services/autonomy.service';
import {
  AutonomyAssessment,
  GraduationType,
  CheckInFrequency,
  CreateGraduationInput,
} from '../../../../core/services/autonomy.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

interface JourneyStats {
  daysAsMember: number;
  totalWorkouts: number;
  totalNutritionLogs: number;
  weightChange?: number;
  consistencyRate: number;
  milestones: string[];
}

/**
 * GraduationPage - Client graduation ceremony and setup
 *
 * Celebrates client achievement and configures maintenance mode:
 * - Before/after stats showcase
 * - Achievement highlights
 * - Graduation type selection (full, maintenance, check-in only)
 * - Check-in frequency setup
 * - Pricing tier adjustment
 * - Celebration animation
 */
@Component({
  selector: 'app-graduation',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonBadge,
    IonProgressBar,
    IonItem,
    IonLabel,
    IonRadioGroup,
    IonRadio,
    IonSpinner
],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-button slot="start" fill="clear" (click)="goBack()">
          <ion-icon slot="icon-only" name="arrow-back-outline" />
        </ion-button>
        <ion-title>Client Graduation</ion-title>
        <ion-button
          slot="end"
          fill="clear"
          (click)="close()"
          aria-label="Close"
        >
          <ion-icon slot="icon-only" name="close-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="graduation-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading client data...</p>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <ion-icon name="alert-circle-outline" />
            <h3>Error Loading Data</h3>
            <p>{{ error() }}</p>
            <ion-button (click)="loadData()">Retry</ion-button>
          </div>
        } @else {
          @if (step() === 'celebration') {
            <!-- Step 1: Celebration -->
            <div class="celebration-section">
              <div class="confetti-container">
                <ion-icon name="rocket-outline" class="celebration-icon" />
              </div>

              <h1 class="celebration-title">🎉 Amazing Achievement!</h1>
              <p class="celebration-subtitle">
                {{ clientName() }} is ready to graduate to independent training
              </p>

              <!-- Autonomy Score -->
              <ion-card class="score-card">
                <ion-card-content>
                  <div class="score-display">
                    <div class="score-number">
                      {{ assessment()?.overall_score || 0 }}
                    </div>
                    <div class="score-label">
                      <ion-badge color="success">
                        {{ assessment()?.readiness_level!.toUpperCase() }}
                      </ion-badge>
                      <p>Independence Score</p>
                    </div>
                  </div>
                  <ion-progress-bar
                    [value]="(assessment()?.overall_score || 0) / 100"
                    color="success"
                  />
                </ion-card-content>
              </ion-card>

              <!-- Journey Stats -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="trophy-outline" />
                    Journey Highlights
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="stats-grid">
                    <div class="stat-item">
                      <div class="stat-value">{{ journeyStats().daysAsMember }}</div>
                      <div class="stat-label">Days Training</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ journeyStats().totalWorkouts }}</div>
                      <div class="stat-label">Workouts Completed</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ journeyStats().totalNutritionLogs }}</div>
                      <div class="stat-label">Nutrition Logs</div>
                    </div>
                    <div class="stat-item">
                      <div class="stat-value">{{ journeyStats().consistencyRate }}%</div>
                      <div class="stat-label">Consistency</div>
                    </div>
                  </div>

                  @if (journeyStats().weightChange !== undefined) {
                    <div class="weight-change">
                      <ion-icon name="trending-down-outline" />
                      <span>{{ journeyStats().weightChange }} lbs lost</span>
                    </div>
                  }
                </ion-card-content>
              </ion-card>

              <!-- Achievements -->
              @if (journeyStats().milestones.length > 0) {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>
                      <ion-icon name="sparkles-outline" />
                      Key Achievements
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <div class="achievements-list">
                      @for (achievement of journeyStats().milestones; track achievement) {
                        <div class="achievement-item">
                          <ion-icon name="checkmark-circle-outline" color="success" />
                          <span>{{ achievement }}</span>
                        </div>
                      }
                    </div>
                  </ion-card-content>
                </ion-card>
              }

              <ion-button expand="block" size="large" (click)="nextStep()">
                Continue to Setup
                <ion-icon slot="end" name="arrow-forward-outline" />
              </ion-button>
            </div>
          } @else if (step() === 'setup') {
            <!-- Step 2: Graduation Setup -->
            <div class="setup-section">
              <h2>Graduation Setup</h2>
              <p class="section-description">
                Configure how you'll continue supporting {{ clientName() }} in
                maintenance mode.
              </p>

              <!-- Graduation Type -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Graduation Type</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-radio-group [(ngModel)]="graduationType">
                    <ion-item>
                      <ion-radio value="full" slot="start" />
                      <ion-label>
                        <h3>Full Graduation</h3>
                        <p>Client is fully independent, no regular check-ins</p>
                      </ion-label>
                    </ion-item>
                    <ion-item>
                      <ion-radio value="maintenance" slot="start" />
                      <ion-label>
                        <h3>Maintenance Mode</h3>
                        <p>Reduced pricing, periodic check-ins for support</p>
                      </ion-label>
                    </ion-item>
                    <ion-item>
                      <ion-radio value="check_in_only" slot="start" />
                      <ion-label>
                        <h3>Check-In Only</h3>
                        <p>Regular check-ins, minimal direct coaching</p>
                      </ion-label>
                    </ion-item>
                  </ion-radio-group>
                </ion-card-content>
              </ion-card>

              <!-- Check-in Frequency -->
              @if (graduationType !== 'full') {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>
                      <ion-icon name="calendar-outline" />
                      Check-In Frequency
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <ion-select
                      [(ngModel)]="checkInFrequency"
                      placeholder="Select frequency"
                      interface="action-sheet"
                    >
                      <ion-select-option value="weekly">Weekly</ion-select-option>
                      <ion-select-option value="biweekly">Bi-weekly</ion-select-option>
                      <ion-select-option value="monthly">Monthly (Recommended)</ion-select-option>
                      <ion-select-option value="quarterly">Quarterly</ion-select-option>
                    </ion-select>
                  </ion-card-content>
                </ion-card>
              }

              <!-- Pricing Adjustment -->
              @if (graduationType === 'maintenance' || graduationType === 'check_in_only') {
                <ion-card>
                  <ion-card-header>
                    <ion-card-title>
                      <ion-icon name="cash-outline" />
                      Pricing Adjustment
                    </ion-card-title>
                  </ion-card-header>
                  <ion-card-content>
                    <ion-item>
                      <ion-label position="stacked">Reduce Pricing By (%)</ion-label>
                      <ion-select
                        [(ngModel)]="pricingReduction"
                        placeholder="Select reduction"
                        interface="action-sheet"
                      >
                        <ion-select-option [value]="25">25% (Recommended)</ion-select-option>
                        <ion-select-option [value]="30">30%</ion-select-option>
                        <ion-select-option [value]="40">40%</ion-select-option>
                        <ion-select-option [value]="50">50%</ion-select-option>
                        <ion-select-option [value]="0">No Reduction</ion-select-option>
                      </ion-select>
                    </ion-item>
                    @if (pricingReduction > 0) {
                      <div class="pricing-summary">
                        <p>
                          Client pricing will be reduced by
                          <strong>{{ pricingReduction }}%</strong> upon graduation.
                        </p>
                      </div>
                    }
                  </ion-card-content>
                </ion-card>
              }

              <!-- Notes -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Notes (Optional)</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-textarea
                    [(ngModel)]="notes"
                    placeholder="Add any notes about this graduation..."
                    rows="4"
                    [counter]="true"
                    maxlength="500"
                  />
                </ion-card-content>
              </ion-card>

              <!-- Actions -->
              <div class="actions">
                <ion-button fill="outline" (click)="previousStep()">
                  <ion-icon slot="start" name="arrow-back-outline" />
                  Back
                </ion-button>
                <ion-button
                  expand="block"
                  (click)="confirmGraduation()"
                  [disabled]="!isFormValid()"
                >
                  Complete Graduation
                  <ion-icon slot="end" name="checkmark-circle-outline" />
                </ion-button>
              </div>
            </div>
          } @else if (step() === 'complete') {
            <!-- Step 3: Completion -->
            <div class="complete-section">
              <div class="success-icon">
                <ion-icon name="checkmark-circle-outline" color="success" />
              </div>

              <h1>Graduation Complete!</h1>
              <p class="success-message">
                {{ clientName() }} has been successfully graduated to
                {{ graduationTypeLabel() }}.
              </p>

              @if (graduationType !== 'full') {
                <ion-card>
                  <ion-card-content>
                    <div class="next-checkin">
                      <ion-icon name="calendar-outline" />
                      <div>
                        <h4>Next Check-In</h4>
                        <p>{{ nextCheckInDate() }}</p>
                        <p class="frequency-note">
                          {{ checkInFrequencyLabel() }} schedule
                        </p>
                      </div>
                    </div>
                  </ion-card-content>
                </ion-card>
              }

              <div class="actions">
                <ion-button expand="block" (click)="viewClient()">
                  View Client Profile
                </ion-button>
                <ion-button fill="outline" expand="block" (click)="close()">
                  Return to Dashboard
                </ion-button>
              </div>
            </div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      /* FitOS Header */
      ion-header ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      ion-header ion-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      /* FitOS Card Styles */
      ion-card {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      ion-card-header ion-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .graduation-container {
        padding: 16px;
        max-width: 800px;
        margin: 0 auto;
      }

      /* Loading & Error States */
      .loading-state,
      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 48px 16px;
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 12px;
        }

        h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;
        }

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 16px 0;
        }
      }

      /* Celebration Section */
      .celebration-section {
        text-align: center;
      }

      .confetti-container {
        margin: 24px 0;
        animation: float 3s ease-in-out infinite;

        .celebration-icon {
          font-size: 120px;
          color: #10B981;
        }
      }

      @keyframes float {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-20px);
        }
      }

      .celebration-title {
        font-size: 28px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
        margin: 0 0 8px 0;
      }

      .celebration-subtitle {
        font-size: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0 0 24px 0;
      }

      /* Score Card */
      .score-card {
        margin-bottom: 16px;
      }

      .score-display {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .score-number {
        font-size: 72px;
        font-weight: 700;
        font-family: 'Space Mono', monospace;
        color: #10B981;
        line-height: 1;
      }

      .score-label {
        text-align: left;

        ion-badge {
          margin-bottom: 4px;
        }

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
        }
      }

      ion-progress-bar {
        height: 12px;
        border-radius: 6px;
      }

      /* Stats Grid */
      .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }

      .stat-item {
        text-align: center;
        padding: 12px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        font-family: 'Space Mono', monospace;
        color: var(--ion-color-primary, #10B981);
        margin-bottom: 4px;
      }

      .stat-label {
        font-size: 11px;
        color: var(--fitos-text-secondary, #A3A3A3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
      }

      .weight-change {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        background: rgba(16, 185, 129, 0.1);
        border-radius: 8px;

        ion-icon {
          font-size: 24px;
          color: #10B981;
        }

        span {
          font-size: 14px;
          font-weight: 600;
          font-family: 'Space Mono', monospace;
          color: #10B981;
        }
      }

      /* Achievements */
      .achievements-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .achievement-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);

        ion-icon {
          font-size: 20px;
          flex-shrink: 0;
        }

        span {
          font-size: 13px;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      /* Setup Section */
      .setup-section {
        h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;
        }

        .section-description {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 16px 0;
        }
      }

      ion-card-title {
        display: flex;
        align-items: center;
        gap: 8px;

        ion-icon {
          font-size: 20px;
          color: var(--ion-color-primary, #10B981);
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
      }

      .pricing-summary {
        margin-top: 12px;
        padding: 12px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.06);

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;

          strong {
            color: var(--ion-color-primary, #10B981);
          }
        }
      }

      /* Complete Section */
      .complete-section {
        text-align: center;
        padding: 24px 0;
      }

      .success-icon {
        margin-bottom: 16px;

        ion-icon {
          font-size: 120px;
        }
      }

      .complete-section h1 {
        font-size: 28px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
        margin: 0 0 8px 0;
      }

      .success-message {
        font-size: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0 0 24px 0;
      }

      .next-checkin {
        display: flex;
        gap: 12px;
        text-align: left;

        ion-icon {
          font-size: 48px;
          color: var(--ion-color-primary, #10B981);
          flex-shrink: 0;
        }

        h4 {
          font-size: 14px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 4px 0;
        }

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
        }

        .frequency-note {
          font-size: 11px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      /* Actions */
      .actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 24px;

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }

        ion-button[fill="outline"] {
          --box-shadow: none;
        }
      }
    `,
  ],
})
export class GraduationPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private autonomyService = inject(AutonomyService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // State
  loading = signal(false);
  error = signal<string | null>(null);
  step = signal<'celebration' | 'setup' | 'complete'>('celebration');
  clientId = signal<string>('');
  clientName = signal<string>('');
  assessment = signal<AutonomyAssessment | null>(null);
  journeyStats = signal<JourneyStats>({
    daysAsMember: 0,
    totalWorkouts: 0,
    totalNutritionLogs: 0,
    consistencyRate: 0,
    milestones: [],
  });

  // Form state
  graduationType: GraduationType = 'maintenance';
  checkInFrequency: CheckInFrequency = 'monthly';
  pricingReduction = 25;
  notes = '';

  // Computed
  graduationTypeLabel = computed(() => {
    switch (this.graduationType) {
      case 'full':
        return 'Full Graduation';
      case 'maintenance':
        return 'Maintenance Mode';
      case 'check_in_only':
        return 'Check-In Only';
      default:
        return '';
    }
  });

  checkInFrequencyLabel = computed(() => {
    switch (this.checkInFrequency) {
      case 'weekly':
        return 'Weekly';
      case 'biweekly':
        return 'Bi-weekly';
      case 'monthly':
        return 'Monthly';
      case 'quarterly':
        return 'Quarterly';
      default:
        return '';
    }
  });

  nextCheckInDate = computed(() => {
    const now = new Date();
    const nextDate = new Date(now);

    switch (this.checkInFrequency) {
      case 'weekly':
        nextDate.setDate(now.getDate() + 7);
        break;
      case 'biweekly':
        nextDate.setDate(now.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(now.getMonth() + 1);
        break;
      case 'quarterly':
        nextDate.setMonth(now.getMonth() + 3);
        break;
    }

    return nextDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  });

  constructor() {
    addIcons({
      rocketOutline,
      sparklesOutline,
      trophyOutline,
      checkmarkCircleOutline,
      calendarOutline,
      cashOutline,
      closeOutline,
      arrowBackOutline,
    });
  }

  ngOnInit(): void {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.clientId.set(clientId);
      this.loadData();
    } else {
      this.error.set('No client ID provided');
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load assessment
      const assessment =
        await this.autonomyService.getLatestAssessment(this.clientId());

      if (!assessment) {
        throw new Error('No autonomy assessment found for this client');
      }

      this.assessment.set(assessment);

      // Load client profile
      const { data: clientData } = await this.supabase.client
        .from('profiles')
        .select('full_name, created_at')
        .eq('id', this.clientId())
        .single();

      if (clientData) {
        this.clientName.set(clientData.full_name || 'Client');
      }

      // Calculate journey stats
      const stats = await this.calculateJourneyStats(this.clientId());
      this.journeyStats.set(stats);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load data';
      this.error.set(errorMessage);
      console.error('Error loading graduation data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  nextStep(): void {
    if (this.step() === 'celebration') {
      this.step.set('setup');
    } else if (this.step() === 'setup') {
      this.step.set('complete');
    }
  }

  previousStep(): void {
    if (this.step() === 'setup') {
      this.step.set('celebration');
    }
  }

  isFormValid(): boolean {
    if (!this.graduationType) return false;

    if (this.graduationType !== 'full' && !this.checkInFrequency) {
      return false;
    }

    return true;
  }

  async confirmGraduation(): Promise<void> {
    if (!this.isFormValid()) {
      await this.showToast('Please complete all required fields', 'warning');
      return;
    }

    this.loading.set(true);

    try {
      const trainerId = this.authService.user()?.id;
      if (!trainerId) {
        throw new Error('No trainer ID found');
      }

      // Prepare journey stats for storage
      const stats = this.journeyStats();
      const journeyStatsForDb = {
        days_trained: stats.daysAsMember,
        workouts_completed: stats.totalWorkouts,
        nutrition_logs: stats.totalNutritionLogs,
        weight_change: stats.weightChange,
        consistency_rate: stats.consistencyRate,
      };

      const graduationInput: CreateGraduationInput = {
        client_id: this.clientId(),
        graduation_type: this.graduationType,
        check_in_frequency:
          this.graduationType === 'full' ? 'none' : this.checkInFrequency,
        pricing_reduced_by:
          this.graduationType !== 'full' ? this.pricingReduction : undefined,
        journey_stats: journeyStatsForDb,
        achievements: stats.milestones,
        notes: this.notes || undefined,
      };

      const graduation = await this.autonomyService.graduateClient(
        trainerId,
        graduationInput
      );

      if (!graduation) {
        throw new Error('Failed to create graduation');
      }

      await this.showToast('Client graduated successfully!', 'success');
      this.nextStep();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to graduate client';
      await this.showToast(errorMessage, 'danger');
      console.error('Error graduating client:', err);
    } finally {
      this.loading.set(false);
    }
  }

  viewClient(): void {
    this.router.navigate(['/tabs/clients', this.clientId()]);
    this.close();
  }

  goBack(): void {
    if (this.step() === 'celebration') {
      this.close();
    } else {
      this.previousStep();
    }
  }

  close(): void {
    this.modalCtrl.dismiss();
  }

  private async calculateJourneyStats(clientId: string): Promise<JourneyStats> {
    try {
      // Get client profile for created_at
      const { data: profile } = await this.supabase.client
        .from('profiles')
        .select('created_at')
        .eq('id', clientId)
        .single();

      const createdDate = profile?.created_at ? new Date(profile.created_at) : new Date();
      const daysAsMember = Math.floor(
        (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Count completed workouts
      const { count: workoutCount } = await this.supabase.client
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed');

      // Count nutrition logs
      const { count: nutritionCount } = await this.supabase.client
        .from('nutrition_logs')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      // Get weight measurements for change calculation
      const { data: measurements } = await this.supabase.client
        .from('measurements')
        .select('value, measured_at')
        .eq('client_id', clientId)
        .eq('measurement_type', 'weight')
        .not('value', 'is', null)
        .order('measured_at', { ascending: true })
        .limit(100);

      let weightChange: number | undefined;
      if (measurements && measurements.length >= 2) {
        const firstWeight = Number(measurements[0].value);
        const lastWeight = Number(measurements[measurements.length - 1].value);
        weightChange = Math.round((lastWeight - firstWeight) * 10) / 10;
      }

      // Calculate consistency rate (workouts in last 90 days vs expected)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const { count: recentWorkouts } = await this.supabase.client
        .from('workouts')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('status', 'completed')
        .gte('completed_at', ninetyDaysAgo.toISOString());

      // Assume 3 workouts/week as target (12-13 weeks * 3 = ~39 workouts)
      const expectedWorkouts = 39;
      const consistencyRate = Math.min(
        100,
        Math.round(((recentWorkouts || 0) / expectedWorkouts) * 100)
      );

      // Get autonomy milestones
      const { data: milestonesData } = await this.supabase.client
        .from('autonomy_milestones')
        .select('title')
        .eq('client_id', clientId)
        .order('achieved_at', { ascending: false })
        .limit(5);

      const milestones = milestonesData?.map((m) => m.title) || [];

      // If no milestones, add some defaults based on data
      if (milestones.length === 0) {
        if ((workoutCount || 0) > 50) {
          milestones.push('Completed 50+ workouts');
        }
        if ((nutritionCount || 0) > 200) {
          milestones.push('Logged 200+ nutrition entries');
        }
        if (consistencyRate >= 80) {
          milestones.push('Maintained 80%+ consistency');
        }
        if (weightChange && weightChange < -10) {
          milestones.push(`Lost ${Math.abs(weightChange)} lbs`);
        }
      }

      return {
        daysAsMember,
        totalWorkouts: workoutCount || 0,
        totalNutritionLogs: nutritionCount || 0,
        weightChange,
        consistencyRate,
        milestones,
      };
    } catch (err) {
      console.error('Error calculating journey stats:', err);
      // Return defaults on error
      return {
        daysAsMember: 0,
        totalWorkouts: 0,
        totalNutritionLogs: 0,
        consistencyRate: 0,
        milestones: [],
      };
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
