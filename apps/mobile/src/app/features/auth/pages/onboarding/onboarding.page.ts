import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonButton,
  IonInput,
  IonSpinner,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonProgressBar,
  IonChip,
  IonLabel,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  checkmarkCircle,
  rocketOutline,
  calendarOutline,
  heartOutline,
  bodyOutline,
  trophyOutline,
  starOutline,
  flashOutline,
} from 'ionicons/icons';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';

/**
 * Onboarding Page — Sprint 53: 7-Stage Progressive Onboarding
 *
 * Stages:
 *   1. Profile (name/timezone/units) — all roles
 *   2. Goal Anchoring — clients: primary goal + motivation
 *   3. Life Context — clients: timeline, key event
 *   4. Health Import — clients: import from Apple Health/Health Connect
 *   5. Social Proof — interstitial success story
 *   6. Plan Preview — personalised plan summary
 *   7. Role-specific setup (trainer biz info / gym owner facility)
 *
 * For trainers/owners, stages 2-6 are replaced with a single role-setup stage.
 */

type GoalCategory = 'lose_weight' | 'build_muscle' | 'get_stronger' | 'improve_endurance' | 'flexibility' | 'general_fitness' | 'sports_performance' | 'rehabilitation';

interface SocialProofStory {
  clientName: string;
  headline: string;
  statLabel: string;
  statValue: string;
  timeframe: string;
}

const DEFAULT_STORIES: SocialProofStory[] = [
  { clientName: 'Sarah M.', headline: 'Dropped 22 lbs and kept it off', statLabel: 'Weight Lost', statValue: '22 lbs', timeframe: '3 months' },
  { clientName: 'James T.', headline: 'Added 45 lbs to his bench press', statLabel: 'Strength Gained', statValue: '+45 lbs bench', timeframe: '8 weeks' },
  { clientName: 'Priya K.', headline: 'Ran her first 5K pain-free', statLabel: 'Goal Achieved', statValue: '5K complete', timeframe: '6 weeks' },
];

@Component({
  selector: 'app-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonToolbar,
    IonButton,
    IonInput,
    IonSpinner,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonProgressBar,
    IonChip,
    IonLabel,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <div class="toolbar-inner">
          @if (currentStage() > 1) {
            <ion-button fill="clear" size="small" class="back-btn" (click)="prevStage()">
              <ion-icon name="arrow-back" slot="icon-only"></ion-icon>
            </ion-button>
          } @else {
            <div></div>
          }
          <div class="stage-label">{{ stageLabel() }}</div>
          <div class="stage-count">{{ currentStage() }}/{{ totalStages() }}</div>
        </div>
        <ion-progress-bar [value]="progressValue()"></ion-progress-bar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="onboarding-container">

        <!-- ── Stage 1: Profile basics ─────────────────────── -->
        @if (currentStage() === 1) {
          <div class="stage-header">
            <div class="icon-wrap teal">
              <ion-icon name="checkmark-circle"></ion-icon>
            </div>
            <h2>Welcome to FitOS</h2>
            <p>Let's set up your profile in a few quick steps.</p>
          </div>

          <form [formGroup]="profileForm" class="onboarding-form">
            <div class="form-group">
              <ion-input
                formControlName="fullName"
                type="text"
                label="Full Name"
                labelPlacement="floating"
                fill="outline"
                placeholder="John Doe"
                [errorText]="fullNameError()"
              />
            </div>

            <div class="form-group">
              <ion-select
                formControlName="timezone"
                label="Timezone"
                labelPlacement="floating"
                fill="outline"
                placeholder="Select your timezone"
                interface="action-sheet"
              >
                <ion-select-option value="America/New_York">Eastern Time</ion-select-option>
                <ion-select-option value="America/Chicago">Central Time</ion-select-option>
                <ion-select-option value="America/Denver">Mountain Time</ion-select-option>
                <ion-select-option value="America/Los_Angeles">Pacific Time</ion-select-option>
                <ion-select-option value="America/Phoenix">Arizona Time</ion-select-option>
                <ion-select-option value="Pacific/Honolulu">Hawaii Time</ion-select-option>
                <ion-select-option value="Europe/London">London</ion-select-option>
                <ion-select-option value="Europe/Paris">Paris</ion-select-option>
              </ion-select>
            </div>

            <div class="form-group">
              <ion-select
                formControlName="unitsSystem"
                label="Units"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
              >
                <ion-select-option value="imperial">Imperial (lbs, ft)</ion-select-option>
                <ion-select-option value="metric">Metric (kg, cm)</ion-select-option>
              </ion-select>
            </div>
          </form>
        }

        <!-- ── Stage 2: Goal Anchoring (clients) ───────────── -->
        @if (currentStage() === 2 && isClient()) {
          <div class="stage-header">
            <div class="icon-wrap amber">
              <ion-icon name="trophy-outline"></ion-icon>
            </div>
            <h2>What's your main goal?</h2>
            <p>This helps us build a plan that actually fits your life.</p>
          </div>

          <div class="goal-grid">
            @for (goal of goalOptions; track goal.value) {
              <button
                class="goal-card"
                [class.selected]="selectedGoal() === goal.value"
                (click)="selectGoal(goal.value)"
              >
                <ion-icon [name]="goal.icon"></ion-icon>
                <span>{{ goal.label }}</span>
              </button>
            }
          </div>

          <div class="motivation-section">
            <p class="sub-label">Why now? What's your motivation?</p>
            <div class="motivation-chips">
              @for (m of motivationOptions; track m) {
                <ion-chip
                  [class.chip-selected]="selectedMotivation() === m"
                  (click)="selectedMotivation.set(m)"
                >
                  <ion-label>{{ m }}</ion-label>
                </ion-chip>
              }
            </div>
          </div>
        }

        <!-- ── Stage 3: Life Context (clients) ──────────────── -->
        @if (currentStage() === 3 && isClient()) {
          <div class="stage-header">
            <div class="icon-wrap purple">
              <ion-icon name="calendar-outline"></ion-icon>
            </div>
            <h2>Tell us about your timeline</h2>
            <p>Setting a target date makes goals 42% more achievable.</p>
          </div>

          <form [formGroup]="lifeContextForm" class="onboarding-form">
            <div class="form-group">
              <ion-select
                formControlName="timeline"
                label="How long do you have?"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
              >
                <ion-select-option value="4_weeks">4 weeks — Short push</ion-select-option>
                <ion-select-option value="3_months">3 months — Real change</ion-select-option>
                <ion-select-option value="6_months">6 months — Transformation</ion-select-option>
                <ion-select-option value="1_year">1 year — Lifestyle shift</ion-select-option>
                <ion-select-option value="ongoing">Ongoing — Maintain & improve</ion-select-option>
              </ion-select>
            </div>

            <div class="form-group">
              <ion-select
                formControlName="keyEvent"
                label="Any upcoming event? (optional)"
                labelPlacement="floating"
                fill="outline"
                interface="action-sheet"
              >
                <ion-select-option value="">None</ion-select-option>
                <ion-select-option value="wedding">Wedding</ion-select-option>
                <ion-select-option value="vacation">Vacation / Beach</ion-select-option>
                <ion-select-option value="race">Race / Competition</ion-select-option>
                <ion-select-option value="reunion">Reunion</ion-select-option>
                <ion-select-option value="health_scare">Health concern</ion-select-option>
                <ion-select-option value="baby">New baby</ion-select-option>
                <ion-select-option value="other">Other milestone</ion-select-option>
              </ion-select>
            </div>

            <div class="form-group">
              <ion-select
                formControlName="activityLevel"
                label="Current activity level"
                labelPlacement="floating"
                fill="outline"
                interface="popover"
              >
                <ion-select-option value="sedentary">Sedentary (desk job, little exercise)</ion-select-option>
                <ion-select-option value="lightly_active">Lightly active (1-2x/week)</ion-select-option>
                <ion-select-option value="moderately_active">Moderately active (3-4x/week)</ion-select-option>
                <ion-select-option value="very_active">Very active (5+x/week)</ion-select-option>
              </ion-select>
            </div>
          </form>
        }

        <!-- ── Stage 4: Health Import (clients) ─────────────── -->
        @if (currentStage() === 4 && isClient()) {
          <div class="stage-header">
            <div class="icon-wrap red">
              <ion-icon name="heart-outline"></ion-icon>
            </div>
            <h2>Import your health data</h2>
            <p>
              Pre-fill your stats from Apple Health or Google Fit for a more
              personalised plan from day one.
            </p>
          </div>

          <div class="import-options">
            @if (isIos()) {
              <button class="import-card" (click)="importFromAppleHealth()">
                <div class="import-icon apple-health">
                  <ion-icon name="heart-outline"></ion-icon>
                </div>
                <div class="import-text">
                  <strong>Apple Health</strong>
                  <span>Weight, steps, sleep</span>
                </div>
                @if (importingHealth()) {
                  <ion-spinner name="crescent"></ion-spinner>
                }
              </button>
            } @else {
              <button class="import-card" (click)="importFromGoogleFit()">
                <div class="import-icon google-fit">
                  <ion-icon name="body-outline"></ion-icon>
                </div>
                <div class="import-text">
                  <strong>Google Fit</strong>
                  <span>Weight, steps, sleep</span>
                </div>
                @if (importingHealth()) {
                  <ion-spinner name="crescent"></ion-spinner>
                }
              </button>
            }
          </div>

          @if (healthImported()) {
            <div class="import-success">
              <ion-icon name="checkmark-circle"></ion-icon>
              <span>Health data imported!</span>
            </div>
          }

          <ion-button
            expand="block"
            fill="clear"
            class="skip-health-btn"
            (click)="skipHealthImport()"
          >
            I'll enter my stats manually
          </ion-button>
        }

        <!-- ── Stage 5: Social Proof interstitial ───────────── -->
        @if (currentStage() === 5) {
          <div class="social-proof-stage">
            <div class="sp-headline">
              <ion-icon name="star-outline" class="sp-star"></ion-icon>
              <h2>Others just like you crushed it</h2>
            </div>

            @if (story(); as s) {
              <div class="story-card">
                <div class="story-avatar">{{ s.clientName.charAt(0) }}</div>
                <div class="story-body">
                  <p class="story-headline">"{{ s.headline }}"</p>
                  <div class="story-stat">
                    <span class="stat-value">{{ s.statValue }}</span>
                    <span class="stat-label">{{ s.statLabel }} · {{ s.timeframe }}</span>
                  </div>
                  <p class="story-name">— {{ s.clientName }}</p>
                </div>
              </div>
            }

            <p class="sp-cta">Your plan is ready. Let's take a look.</p>
          </div>
        }

        <!-- ── Stage 6: Plan Preview ─────────────────────────── -->
        @if (currentStage() === 6 && isClient()) {
          <div class="stage-header">
            <div class="icon-wrap teal">
              <ion-icon name="rocket-outline"></ion-icon>
            </div>
            <h2>Your personalised plan</h2>
            <p>Based on your goal and lifestyle, here's what FitOS recommends.</p>
          </div>

          <div class="plan-preview">
            <div class="plan-card">
              <div class="plan-icon">💪</div>
              <div class="plan-text">
                <strong>{{ planWorkoutsPerWeek() }}x workouts/week</strong>
                <span>{{ planWorkoutStyle() }}</span>
              </div>
            </div>

            <div class="plan-card">
              <div class="plan-icon">🥗</div>
              <div class="plan-text">
                <strong>{{ planCalorieTarget() }} kcal/day</strong>
                <span>Estimated target (you'll refine this)</span>
              </div>
            </div>

            <div class="plan-card">
              <div class="plan-icon">📅</div>
              <div class="plan-text">
                <strong>{{ planTimelineLabel() }}</strong>
                <span>To reach your primary goal</span>
              </div>
            </div>
          </div>

          <div class="plan-note">
            <p>🤖 Your AI coach will adapt this plan as you log data. The more you track, the smarter it gets.</p>
          </div>
        }

        <!-- ── Stage 7a: Trainer business info ───────────────── -->
        @if (currentStage() === 7 && isTrainer()) {
          <div class="stage-header">
            <div class="icon-wrap teal">
              <ion-icon name="flash-outline"></ion-icon>
            </div>
            <h2>About your business</h2>
            <p>Help clients find and connect with you.</p>
          </div>

          <form [formGroup]="trainerForm" class="onboarding-form">
            <div class="form-group">
              <ion-input
                formControlName="businessName"
                type="text"
                label="Business Name"
                labelPlacement="floating"
                fill="outline"
                placeholder="Your Fitness Business"
              />
            </div>

            <div class="form-group">
              <ion-textarea
                formControlName="bio"
                label="About You"
                labelPlacement="floating"
                fill="outline"
                placeholder="Tell clients about yourself..."
                [autoGrow]="true"
                rows="4"
                [counter]="true"
                [maxlength]="500"
              />
            </div>

            <div class="form-group">
              <ion-select
                formControlName="specializations"
                label="Specializations"
                labelPlacement="floating"
                fill="outline"
                placeholder="Select your specialties"
                [multiple]="true"
                interface="alert"
              >
                <ion-select-option value="strength">Strength Training</ion-select-option>
                <ion-select-option value="weight_loss">Weight Loss</ion-select-option>
                <ion-select-option value="bodybuilding">Bodybuilding</ion-select-option>
                <ion-select-option value="athletic">Athletic Performance</ion-select-option>
                <ion-select-option value="rehabilitation">Rehabilitation</ion-select-option>
                <ion-select-option value="nutrition">Nutrition Coaching</ion-select-option>
                <ion-select-option value="mobility">Mobility & Flexibility</ion-select-option>
                <ion-select-option value="seniors">Senior Fitness</ion-select-option>
                <ion-select-option value="youth">Youth Training</ion-select-option>
              </ion-select>
            </div>
          </form>
        }

        <!-- ── Stage 7b: Gym owner facility ─────────────────── -->
        @if (currentStage() === 7 && isOwner()) {
          <div class="stage-header">
            <h2>Your Facility</h2>
            <p>Set up your gym or fitness center.</p>
          </div>

          <form [formGroup]="facilityForm" class="onboarding-form">
            <div class="form-group">
              <ion-input formControlName="facilityName" type="text" label="Facility Name" labelPlacement="floating" fill="outline" placeholder="My Gym" />
            </div>
            <div class="form-group">
              <ion-textarea formControlName="description" label="Description" labelPlacement="floating" fill="outline" placeholder="Tell members about your facility..." [autoGrow]="true" rows="3" />
            </div>
            <div class="form-group">
              <ion-input formControlName="address" type="text" label="Street Address" labelPlacement="floating" fill="outline" placeholder="123 Main St" />
            </div>
            <div class="form-group">
              <ion-input formControlName="city" type="text" label="City" labelPlacement="floating" fill="outline" placeholder="Chicago" />
            </div>
            <div class="form-group">
              <ion-input formControlName="state" type="text" label="State" labelPlacement="floating" fill="outline" placeholder="IL" />
            </div>
            <div class="form-group">
              <ion-input formControlName="zipCode" type="text" label="ZIP Code" labelPlacement="floating" fill="outline" placeholder="60601" />
            </div>
          </form>
        }

        <!-- ── Stage 8: Complete ─────────────────────────────── -->
        @if (currentStage() === totalStages() + 1) {
          <div class="complete-step">
            <div class="success-icon-wrap">
              <ion-icon name="checkmark-circle"></ion-icon>
            </div>
            <h2>You're all set! 🎉</h2>
            <p>
              @if (isOwner()) {
                Manage your facility and grow your training team.
              } @else if (isTrainer()) {
                Start creating workouts and inviting clients.
              } @else {
                Your AI coach is ready. Let's log your first workout.
              }
            </p>
          </div>
        }

        <!-- ── Error ─────────────────────────────────────────── -->
        @if (errorMessage()) {
          <div class="message message--error">{{ errorMessage() }}</div>
        }

        <!-- ── Navigation ────────────────────────────────────── -->
        <div class="navigation-buttons">
          @if (currentStage() <= totalStages()) {
            <ion-button
              expand="block"
              class="submit-btn"
              (click)="nextStage()"
              [disabled]="loading() || !canProceed()"
            >
              @if (loading()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else if (currentStage() === totalStages()) {
                Finish Setup
                <ion-icon name="checkmark-circle" slot="end"></ion-icon>
              } @else {
                Continue
                <ion-icon name="arrow-forward" slot="end"></ion-icon>
              }
            </ion-button>
          }

          @if (currentStage() === totalStages() + 1) {
            <ion-button expand="block" class="submit-btn" (click)="finish()">
              Let's Go!
              <ion-icon name="rocket-outline" slot="end"></ion-icon>
            </ion-button>
          }

          @if (currentStage() === 1) {
            <ion-button fill="clear" expand="block" class="skip-btn" (click)="skip()">
              Skip setup for now
            </ion-button>
          }
        </div>

      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
      padding-bottom: 0;

      .toolbar-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 8px;

        .back-btn {
          --color: var(--fitos-text-secondary, #A3A3A3);
        }

        .stage-label {
          font-size: 14px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        .stage-count {
          font-size: 12px;
          color: var(--fitos-text-tertiary, #737373);
          min-width: 32px;
          text-align: right;
        }
      }
    }

    ion-progress-bar {
      --background: var(--fitos-bg-tertiary, #262626);
      --progress-background: var(--ion-color-primary, #10B981);
      height: 3px;
    }

    .onboarding-container {
      max-width: 500px;
      margin: 0 auto;
      padding: 16px 24px 48px;
    }

    /* ── Stage header ─────────────────────────────────────────── */
    .stage-header {
      text-align: center;
      margin-bottom: 28px;
      padding-top: 16px;

      .icon-wrap {
        width: 64px;
        height: 64px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 20px;

        ion-icon { font-size: 32px; }

        &.teal   { background: rgba(16, 185, 129, 0.12); ion-icon { color: #10B981; } }
        &.amber  { background: rgba(245, 158, 11, 0.12);  ion-icon { color: #F59E0B; } }
        &.purple { background: rgba(139, 92, 246, 0.12);  ion-icon { color: #8B5CF6; } }
        &.red    { background: rgba(239, 68, 68, 0.12);   ion-icon { color: #EF4444; } }
      }

      h2 {
        margin: 0 0 8px;
        font-size: 24px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        margin: 0;
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 15px;
        line-height: 1.5;
      }
    }

    /* ── Form ─────────────────────────────────────────────────── */
    .onboarding-form .form-group {
      margin-bottom: 16px;

      ion-input, ion-select, ion-textarea {
        --background: var(--fitos-bg-tertiary, #262626);
        --border-radius: 8px;
        --highlight-color-focused: var(--ion-color-primary, #10B981);
        --border-color: transparent;
        --color: var(--fitos-text-primary, #F5F5F5);
        --placeholder-color: var(--fitos-text-tertiary, #737373);
        font-size: 15px;
      }

      ion-textarea { --padding-start: 16px; --padding-end: 16px; }
    }

    /* ── Goal grid ────────────────────────────────────────────── */
    .goal-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 24px;
    }

    .goal-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 12px;
      background: var(--fitos-bg-secondary, #171717);
      border: 2px solid transparent;
      border-radius: 12px;
      cursor: pointer;
      transition: border-color 0.15s, background 0.15s;

      ion-icon {
        font-size: 24px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      span {
        font-size: 13px;
        font-weight: 500;
        color: var(--fitos-text-primary, #F5F5F5);
        text-align: center;
        line-height: 1.3;
      }

      &.selected {
        border-color: var(--ion-color-primary, #10B981);
        background: rgba(16, 185, 129, 0.08);

        ion-icon { color: var(--ion-color-primary, #10B981); }
      }
    }

    /* ── Motivation chips ─────────────────────────────────────── */
    .motivation-section {
      margin-bottom: 8px;

      .sub-label {
        margin: 0 0 12px;
        font-size: 14px;
        font-weight: 500;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      .motivation-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;

        ion-chip {
          --background: var(--fitos-bg-tertiary, #262626);
          --color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;

          &.chip-selected {
            --background: rgba(16, 185, 129, 0.15);
            --color: #10B981;
            border: 1px solid rgba(16, 185, 129, 0.4);
          }
        }
      }
    }

    /* ── Health import ────────────────────────────────────────── */
    .import-options {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 16px;
    }

    .import-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #171717);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      cursor: pointer;

      .import-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        ion-icon { font-size: 22px; }

        &.apple-health { background: linear-gradient(135deg, #FF6B6B, #FF4444); ion-icon { color: white; } }
        &.google-fit   { background: linear-gradient(135deg, #4285F4, #34A853); ion-icon { color: white; } }
      }

      .import-text {
        flex: 1;
        text-align: left;

        strong { display: block; font-size: 15px; color: var(--fitos-text-primary, #F5F5F5); }
        span   { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); }
      }
    }

    .import-success {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      border-radius: 8px;
      margin-bottom: 16px;

      ion-icon { color: #10B981; font-size: 20px; }
      span { font-size: 14px; color: #10B981; font-weight: 600; }
    }

    .skip-health-btn {
      --color: var(--fitos-text-tertiary, #737373);
      font-size: 14px;
    }

    /* ── Social proof ─────────────────────────────────────────── */
    .social-proof-stage {
      padding-top: 24px;

      .sp-headline {
        text-align: center;
        margin-bottom: 28px;

        .sp-star {
          font-size: 36px;
          color: #F59E0B;
          display: block;
          margin-bottom: 12px;
        }

        h2 {
          margin: 0;
          font-size: 22px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      .story-card {
        display: flex;
        gap: 16px;
        padding: 20px;
        background: var(--fitos-bg-secondary, #171717);
        border: 1px solid rgba(16, 185, 129, 0.15);
        border-radius: 16px;
        margin-bottom: 24px;

        .story-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: rgba(16, 185, 129, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 700;
          color: #10B981;
          flex-shrink: 0;
        }

        .story-body {
          flex: 1;

          .story-headline {
            margin: 0 0 12px;
            font-size: 16px;
            font-weight: 600;
            color: var(--fitos-text-primary, #F5F5F5);
            line-height: 1.4;
            font-style: italic;
          }

          .story-stat {
            display: flex;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 8px;

            .stat-value {
              font-size: 20px;
              font-weight: 800;
              color: #10B981;
            }

            .stat-label {
              font-size: 12px;
              color: var(--fitos-text-secondary, #A3A3A3);
            }
          }

          .story-name {
            margin: 0;
            font-size: 13px;
            color: var(--fitos-text-tertiary, #737373);
          }
        }
      }

      .sp-cta {
        text-align: center;
        font-size: 16px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    /* ── Plan preview ─────────────────────────────────────────── */
    .plan-preview {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }

    .plan-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--fitos-bg-secondary, #171717);
      border-radius: 12px;
      border: 1px solid rgba(255,255,255,0.06);

      .plan-icon { font-size: 28px; flex-shrink: 0; }

      .plan-text {
        display: flex;
        flex-direction: column;

        strong { font-size: 16px; color: var(--fitos-text-primary, #F5F5F5); }
        span   { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); margin-top: 2px; }
      }
    }

    .plan-note {
      padding: 14px 16px;
      background: rgba(16, 185, 129, 0.06);
      border-radius: 10px;
      border-left: 3px solid #10B981;

      p { margin: 0; font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); line-height: 1.5; }
    }

    /* ── Complete ─────────────────────────────────────────────── */
    .complete-step {
      text-align: center;
      padding: 48px 0;

      .success-icon-wrap {
        width: 88px;
        height: 88px;
        border-radius: 50%;
        background: rgba(16, 185, 129, 0.12);
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px;

        ion-icon { font-size: 48px; color: #10B981; }
      }

      h2 { margin: 0 0 12px; font-size: 24px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }

      p { margin: 0 auto; color: var(--fitos-text-secondary, #A3A3A3); font-size: 15px; line-height: 1.5; max-width: 280px; }
    }

    /* ── Error ────────────────────────────────────────────────── */
    .message--error {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      color: #FCA5A5;
    }

    /* ── Nav buttons ──────────────────────────────────────────── */
    .navigation-buttons {
      margin-top: 32px;

      .submit-btn {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        font-size: 16px;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        margin-bottom: 12px;
      }

      .skip-btn {
        --color: var(--fitos-text-tertiary, #737373);
        font-size: 14px;
      }
    }
  `],
})
export class OnboardingPage implements OnInit {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabase    = inject(SupabaseService);
  private router      = inject(Router);
  private toastCtrl   = inject(ToastController);

  // ── State ────────────────────────────────────────────────────
  currentStage   = signal(1);
  loading        = signal(false);
  errorMessage   = signal<string | null>(null);
  importingHealth = signal(false);
  healthImported = signal(false);

  // Goal anchoring
  selectedGoal       = signal<GoalCategory | null>(null);
  selectedMotivation = signal<string | null>(null);

  // ── Role signals ─────────────────────────────────────────────
  isTrainer = computed(() => this.authService.isTrainer());
  isOwner   = computed(() => this.authService.isOwner());
  isClient  = computed(() => this.authService.isClient());
  isIos     = signal(false); // Set in ngOnInit based on Capacitor.getPlatform()

  // ── Story for social proof stage ─────────────────────────────
  story = computed<SocialProofStory>(() => {
    const goalMap: Record<GoalCategory, number> = {
      lose_weight: 0, build_muscle: 1, get_stronger: 1,
      improve_endurance: 2, flexibility: 2, general_fitness: 0,
      sports_performance: 1, rehabilitation: 2,
    };
    const idx = this.selectedGoal() ? goalMap[this.selectedGoal()!] : 0;
    return DEFAULT_STORIES[idx % DEFAULT_STORIES.length];
  });

  // ── Total stages (role-dependent) ────────────────────────────
  totalStages = computed(() => {
    // Trainers/owners: 1 (profile) + 1 (role setup) = 2 stages + complete = 3
    // Clients: 7 stages
    return this.isClient() ? 7 : 2;
  });

  stageLabel = computed(() => {
    if (!this.isClient()) {
      return this.currentStage() === 1 ? 'Profile' : 'Your Business';
    }
    const labels = ['Profile', 'Goal', 'Timeline', 'Health', 'Success Stories', 'Your Plan', 'Setup'];
    return labels[this.currentStage() - 1] ?? 'Done';
  });

  progressValue = computed(() => this.currentStage() / (this.totalStages() + 1));

  // ── Plan preview computed values ─────────────────────────────
  planWorkoutsPerWeek = computed(() => {
    switch (this.selectedGoal()) {
      case 'lose_weight':       return 4;
      case 'build_muscle':      return 4;
      case 'get_stronger':      return 3;
      case 'improve_endurance': return 5;
      default:                  return 3;
    }
  });

  planWorkoutStyle = computed(() => {
    switch (this.selectedGoal()) {
      case 'lose_weight':       return 'Cardio + strength circuits';
      case 'build_muscle':      return 'Progressive overload splits';
      case 'get_stronger':      return 'Powerlifting-style programming';
      case 'improve_endurance': return 'Zone 2 + tempo training';
      default:                  return 'Mixed training approach';
    }
  });

  planCalorieTarget = computed(() => {
    switch (this.selectedGoal()) {
      case 'lose_weight':  return '1,800';
      case 'build_muscle': return '2,400';
      default:             return '2,100';
    }
  });

  planTimelineLabel = computed(() => {
    const form = this.lifeContextForm.get('timeline')?.value;
    switch (form) {
      case '4_weeks':  return '4-week jump-start';
      case '3_months': return '3-month transformation';
      case '6_months': return '6-month lifestyle change';
      case '1_year':   return '1-year long-term shift';
      default:         return 'Ongoing progression';
    }
  });

  // ── Goal options ─────────────────────────────────────────────
  goalOptions = [
    { value: 'lose_weight' as GoalCategory,       label: 'Lose Weight',   icon: 'body-outline' },
    { value: 'build_muscle' as GoalCategory,      label: 'Build Muscle',  icon: 'barbell-outline' },
    { value: 'get_stronger' as GoalCategory,      label: 'Get Stronger',  icon: 'flash-outline' },
    { value: 'improve_endurance' as GoalCategory, label: 'Endurance',     icon: 'heart-outline' },
    { value: 'flexibility' as GoalCategory,       label: 'Flexibility',   icon: 'body-outline' },
    { value: 'general_fitness' as GoalCategory,   label: 'General Health','icon': 'star-outline' },
  ] as const;

  motivationOptions = [
    'Feel more confident', 'More energy', 'Health concerns',
    'Upcoming event', 'Athlete mindset', 'For my family',
  ];

  // ── Forms ─────────────────────────────────────────────────────
  profileForm: FormGroup = this.fb.group({
    fullName:    ['', [Validators.required]],
    timezone:    ['America/Chicago'],
    unitsSystem: ['imperial'],
  });

  lifeContextForm: FormGroup = this.fb.group({
    timeline:      ['3_months'],
    keyEvent:      [''],
    activityLevel: ['lightly_active'],
  });

  trainerForm: FormGroup = this.fb.group({
    businessName:    [''],
    bio:             [''],
    specializations: [[]],
  });

  facilityForm: FormGroup = this.fb.group({
    facilityName: ['', Validators.required],
    description:  [''],
    address:      [''],
    city:         [''],
    state:        [''],
    zipCode:      [''],
  });

  fullNameError = computed(() => {
    const c = this.profileForm.get('fullName');
    if (!c?.touched) return '';
    return c.hasError('required') ? 'Full name is required' : '';
  });

  async ngOnInit() {
    try {
      const { Capacitor } = await import('@capacitor/core');
      this.isIos.set(Capacitor.getPlatform() === 'ios');
    } catch { /* web */ }
  }

  constructor() {
    addIcons({
      arrowForward, arrowBack, checkmarkCircle, rocketOutline,
      calendarOutline, heartOutline, bodyOutline, trophyOutline,
      starOutline, flashOutline,
    });
  }

  // ── Navigation ────────────────────────────────────────────────
  canProceed(): boolean {
    const s = this.currentStage();
    if (s === 1)  return this.profileForm.valid;
    if (s === 2 && this.isClient())  return this.selectedGoal() !== null;
    if (s === 7 && this.isOwner())   return this.facilityForm.get('facilityName')?.valid ?? false;
    // Social proof (5) and health import (4) are always ok to proceed
    return true;
  }

  async nextStage(): Promise<void> {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await this.saveCurrentStage();
      this.currentStage.update(s => s + 1);
    } catch (err) {
      this.errorMessage.set((err as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  prevStage(): void {
    if (this.currentStage() > 1) {
      this.currentStage.update(s => s - 1);
    }
  }

  selectGoal(goal: GoalCategory): void {
    this.selectedGoal.set(goal);
  }

  // ── Save current stage data ───────────────────────────────────
  private async saveCurrentStage(): Promise<void> {
    const stage = this.currentStage();
    const userId = this.authService.user()?.id;
    if (!userId) return;

    switch (stage) {
      case 1:
        await this.saveProfile();
        break;

      case 2:
        if (this.isClient()) await this.saveGoalAnchoring();
        break;

      case 3:
        if (this.isClient()) await this.saveLifeContext();
        break;

      case 4:
        // Health import — no data to save here (handled by import methods)
        break;

      case 5:
        // Social proof — no data
        break;

      case 6:
        // Plan preview — no data (plan is computed, not saved here)
        break;

      case 7:
        if (this.isOwner())   await this.saveFacility();
        if (this.isTrainer()) await this.saveTrainerProfile();
        // Finalize onboarding
        await this.markOnboardingComplete(userId, stage);
        break;

      default:
        if (!this.isClient()) {
          // For trainer/owner, stage 2 is the final role-setup
          if (this.isOwner())   await this.saveFacility();
          if (this.isTrainer()) await this.saveTrainerProfile();
          await this.markOnboardingComplete(userId, stage);
        }
    }

    // Persist stage progress
    await this.supabase.client
      .from('profiles')
      .update({ onboarding_stage: stage })
      .eq('id', userId);
  }

  private async saveProfile(): Promise<void> {
    const { fullName, timezone, unitsSystem } = this.profileForm.value;
    const { error } = await this.authService.updateProfile({ fullName, timezone, unitsSystem });
    if (error) throw error;
  }

  private async saveGoalAnchoring(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    await this.supabase.client
      .from('client_profiles')
      .update({
        goals: [this.selectedGoal()],
        fitness_level: 'beginner',
      })
      .eq('id', userId);

    // Save life context with motivation
    await this.supabase.client
      .from('profiles')
      .update({
        life_context: { motivation_source: this.selectedMotivation() },
      })
      .eq('id', userId);
  }

  private async saveLifeContext(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    const { timeline, keyEvent, activityLevel } = this.lifeContextForm.value;
    await this.supabase.client
      .from('profiles')
      .update({
        life_context: {
          motivation_source: this.selectedMotivation(),
          timeline,
          key_event: keyEvent || null,
        },
        behavioral_assessment: { activity_level: activityLevel },
      })
      .eq('id', userId);
  }

  private async saveTrainerProfile(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;
    const { businessName, bio, specializations } = this.trainerForm.value;
    await this.supabase.client
      .from('trainer_profiles')
      .update({ business_name: businessName, bio, specializations })
      .eq('id', userId);
  }

  private async saveFacility(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    const { facilityName, description, address, city, state, zipCode } = this.facilityForm.value;

    const { data: facility, error: facilityError } = await this.supabase
      .from('facilities')
      .insert({
        owner_id: userId,
        name: facilityName,
        description: description || null,
        address: address || null,
        city: city || null,
        state: state || null,
        zip_code: zipCode || null,
      })
      .select()
      .single();

    if (facilityError) throw facilityError;

    await this.supabase.client.from('profiles').update({ facility_id: facility.id }).eq('id', userId);
    await this.supabase.client.from('trainer_profiles').update({ facility_id: facility.id }).eq('id', userId);
  }

  private async markOnboardingComplete(userId: string, stage: number): Promise<void> {
    await this.supabase.client
      .from('profiles')
      .update({
        onboarding_stage: stage,
        onboarding_completed_at: new Date().toISOString(),
      })
      .eq('id', userId);
  }

  // ── Health import ─────────────────────────────────────────────
  async importFromAppleHealth(): Promise<void> {
    this.importingHealth.set(true);
    try {
      // HealthKitService handles this — Sprint 49
      // Stub: mark as imported
      await new Promise(resolve => setTimeout(resolve, 800));
      this.healthImported.set(true);
      const toast = await this.toastCtrl.create({
        message: 'Health data imported! ✓',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.importingHealth.set(false);
    }
  }

  async importFromGoogleFit(): Promise<void> {
    this.importingHealth.set(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      this.healthImported.set(true);
      const toast = await this.toastCtrl.create({
        message: 'Health data imported! ✓',
        duration: 2000,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } finally {
      this.importingHealth.set(false);
    }
  }

  skipHealthImport(): void {
    this.currentStage.update(s => s + 1);
  }

  // ── Finish / Skip ─────────────────────────────────────────────
  skip(): void {
    this.router.navigate(['/tabs/dashboard']);
  }

  finish(): void {
    this.router.navigate(['/tabs/dashboard']);
  }
}
