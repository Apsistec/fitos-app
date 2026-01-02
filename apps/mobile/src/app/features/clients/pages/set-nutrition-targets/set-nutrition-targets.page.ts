import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonInput,
  IonItem,
  IonList,
  IonSpinner,
  IonNote,
  IonTextarea,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonText,
} from '@ionic/angular/standalone';
import { NutritionService } from '@app/core/services/nutrition.service';
import { ClientService } from '@app/core/services/client.service';
import type { Tables } from '@fitos/shared';
import { NUTRITION_COLORS } from '@fitos/shared';

@Component({
  selector: 'app-set-nutrition-targets',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonInput,
    IonItem,
    IonList,
    IonSpinner,
    IonNote,
    IonTextarea,
    IonBackButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonText,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="'/tabs/clients/' + clientId()"></ion-back-button>
        </ion-buttons>
        <ion-title>Set Nutrition Targets</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="targets-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading client information...</p>
          </div>
        } @else {
          <!-- Client Info Header -->
          @if (clientProfile()) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ clientProfile()?.full_name }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <p>Setting nutrition targets for this client</p>
              </ion-card-content>
            </ion-card>
          }

          <!-- Current Targets (if any) -->
          @if (currentTargets()) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>Current Targets</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="current-targets">
                  <div class="target-item">
                    <span class="label">Calories:</span>
                    <span class="value">{{ currentTargets()?.calories_target }} cal</span>
                  </div>
                  <div class="target-item">
                    <span class="label">Protein:</span>
                    <span class="value">{{ currentTargets()?.protein_target_g }}g</span>
                  </div>
                  <div class="target-item">
                    <span class="label">Carbs:</span>
                    <span class="value">{{ currentTargets()?.carbs_target_g }}g</span>
                  </div>
                  <div class="target-item">
                    <span class="label">Fat:</span>
                    <span class="value">{{ currentTargets()?.fat_target_g }}g</span>
                  </div>
                  <div class="target-item">
                    <span class="label">Effective From:</span>
                    <span class="value">{{ formatDate(currentTargets()?.effective_from) }}</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Error Message -->
          @if (errorMessage()) {
            <ion-note color="danger" class="error-message">
              {{ errorMessage() }}
            </ion-note>
          }

          <!-- Success Message -->
          @if (successMessage()) {
            <ion-note color="success" class="success-message">
              {{ successMessage() }}
            </ion-note>
          }

          <!-- Targets Form -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>New Targets</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <form [formGroup]="targetsForm" (ngSubmit)="onSubmit()">
                <ion-list lines="none">
                  <ion-item lines="none">
                    <ion-input
                      formControlName="calories"
                      type="number"
                      label="Daily Calories"
                      labelPlacement="floating"
                      fill="outline"
                      placeholder="2000"
                      helperText="Target daily calorie intake"
                      [errorText]="caloriesError()"
                    />
                  </ion-item>

                  <ion-item lines="none">
                    <ion-input
                      formControlName="protein"
                      type="number"
                      label="Protein (g)"
                      labelPlacement="floating"
                      fill="outline"
                      placeholder="150"
                      helperText="Target daily protein in grams"
                      [errorText]="proteinError()"
                    />
                  </ion-item>

                  <ion-item lines="none">
                    <ion-input
                      formControlName="carbs"
                      type="number"
                      label="Carbs (g)"
                      labelPlacement="floating"
                      fill="outline"
                      placeholder="200"
                      helperText="Target daily carbohydrates in grams"
                      [errorText]="carbsError()"
                    />
                  </ion-item>

                  <ion-item lines="none">
                    <ion-input
                      formControlName="fat"
                      type="number"
                      label="Fat (g)"
                      labelPlacement="floating"
                      fill="outline"
                      placeholder="60"
                      helperText="Target daily fat in grams"
                      [errorText]="fatError()"
                    />
                  </ion-item>

                  <ion-item lines="none">
                    <ion-input
                      formControlName="effectiveFrom"
                      type="date"
                      label="Effective From"
                      labelPlacement="floating"
                      fill="outline"
                      helperText="When these targets should start"
                      [errorText]="effectiveFromError()"
                    />
                  </ion-item>

                  <ion-item lines="none">
                    <ion-textarea
                      formControlName="notes"
                      label="Notes (Optional)"
                      labelPlacement="floating"
                      fill="outline"
                      placeholder="Any special instructions or context..."
                      helperText="Private notes about these targets"
                      [autoGrow]="true"
                      rows="3"
                      [counter]="true"
                      [maxlength]="500"
                    />
                  </ion-item>
                </ion-list>

                <!-- Macro Summary -->
                <div class="macro-summary">
                  <h4>Macro Breakdown</h4>
                  <div class="macro-bars">
                    <div class="macro-bar">
                      <span class="macro-label">Protein ({{ proteinPercent() }}%)</span>
                      <div class="bar-container">
                        <div class="bar protein" [style.width.%]="proteinPercent()"></div>
                      </div>
                      <span class="macro-cals">{{ proteinCals() }} cal</span>
                    </div>
                    <div class="macro-bar">
                      <span class="macro-label">Carbs ({{ carbsPercent() }}%)</span>
                      <div class="bar-container">
                        <div class="bar carbs" [style.width.%]="carbsPercent()"></div>
                      </div>
                      <span class="macro-cals">{{ carbsCals() }} cal</span>
                    </div>
                    <div class="macro-bar">
                      <span class="macro-label">Fat ({{ fatPercent() }}%)</span>
                      <div class="bar-container">
                        <div class="bar fat" [style.width.%]="fatPercent()"></div>
                      </div>
                      <span class="macro-cals">{{ fatCals() }} cal</span>
                    </div>
                  </div>
                  @if (totalMacroCals() !== targetCals()) {
                    <ion-note color="warning" class="macro-warning">
                      ⚠️ Macro calories ({{ totalMacroCals() }}) don't match target ({{ targetCals() }})
                    </ion-note>
                  }
                </div>

                <ion-button
                  expand="block"
                  type="submit"
                  [disabled]="targetsForm.invalid || submitting()"
                >
                  @if (submitting()) {
                    <ion-spinner name="crescent"></ion-spinner>
                  } @else {
                    Save Targets
                  }
                </ion-button>
              </form>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .targets-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-state {
      text-align: center;
      padding: 48px 20px;

      ion-spinner {
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
      }
    }

    .current-targets {
      display: flex;
      flex-direction: column;
      gap: 12px;

      .target-item {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .label {
          color: var(--ion-color-medium);
          font-size: 0.875rem;
        }

        .value {
          font-weight: 600;
          font-size: 1rem;
        }
      }
    }

    .error-message,
    .success-message {
      display: block;
      padding: 12px;
      margin-bottom: 16px;
      border-radius: 8px;
    }

    .error-message {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .success-message {
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    ion-list {
      background: transparent;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 16px;
      }
    }

    .macro-summary {
      margin: 24px 0;
      padding: 16px;
      background: var(--ion-color-light);
      border-radius: 8px;

      h4 {
        margin: 0 0 16px;
        font-size: 1rem;
        font-weight: 600;
      }

      .macro-bars {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .macro-bar {
        .macro-label {
          display: block;
          font-size: 0.875rem;
          margin-bottom: 4px;
          font-weight: 500;
        }

        .bar-container {
          height: 24px;
          background: white;
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 4px;

          .bar {
            height: 100%;
            transition: width 0.3s ease;

            &.protein {
              background: #22C55E; /* Neutral green from NUTRITION_COLORS */
            }

            &.carbs {
              background: #F59E0B; /* Neutral amber from NUTRITION_COLORS */
            }

            &.fat {
              background: #EC4899; /* Neutral pink from NUTRITION_COLORS */
            }
          }
        }

        .macro-cals {
          font-size: 0.75rem;
          color: var(--ion-color-medium);
        }
      }

      .macro-warning {
        display: block;
        margin-top: 12px;
        padding: 8px;
        background: rgba(var(--ion-color-warning-rgb), 0.1);
        border-radius: 4px;
      }
    }
  `],
})
export class SetNutritionTargetsPage implements OnInit {
  private fb = inject(FormBuilder);
  private nutritionService = inject(NutritionService);
  private clientService = inject(ClientService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  clientId = signal<string>('');
  clientProfile = signal<Tables<'profiles'> | null>(null);
  currentTargets = signal<Tables<'nutrition_targets'> | null>(null);
  loading = signal(false);
  submitting = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  targetsForm: FormGroup = this.fb.group({
    calories: [2000, [Validators.required, Validators.min(1000), Validators.max(10000)]],
    protein: [150, [Validators.required, Validators.min(10), Validators.max(1000)]],
    carbs: [200, [Validators.required, Validators.min(10), Validators.max(2000)]],
    fat: [60, [Validators.required, Validators.min(10), Validators.max(500)]],
    effectiveFrom: [new Date().toISOString().split('T')[0], [Validators.required]],
    notes: [''],
  });

  // Computed error messages
  caloriesError = computed(() => {
    const control = this.targetsForm.get('calories');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Calories are required';
    if (control.hasError('min')) return 'Minimum 1000 calories';
    if (control.hasError('max')) return 'Maximum 10,000 calories';
    return '';
  });

  proteinError = computed(() => {
    const control = this.targetsForm.get('protein');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Protein is required';
    if (control.hasError('min')) return 'Minimum 10g';
    if (control.hasError('max')) return 'Maximum 1000g';
    return '';
  });

  carbsError = computed(() => {
    const control = this.targetsForm.get('carbs');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Carbs are required';
    if (control.hasError('min')) return 'Minimum 10g';
    if (control.hasError('max')) return 'Maximum 2000g';
    return '';
  });

  fatError = computed(() => {
    const control = this.targetsForm.get('fat');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Fat is required';
    if (control.hasError('min')) return 'Minimum 10g';
    if (control.hasError('max')) return 'Maximum 500g';
    return '';
  });

  effectiveFromError = computed(() => {
    const control = this.targetsForm.get('effectiveFrom');
    if (!control?.touched) return '';
    if (control.hasError('required')) return 'Effective date is required';
    return '';
  });

  // Macro calculations
  targetCals = computed(() => this.targetsForm.get('calories')?.value || 0);
  proteinCals = computed(() => (this.targetsForm.get('protein')?.value || 0) * 4);
  carbsCals = computed(() => (this.targetsForm.get('carbs')?.value || 0) * 4);
  fatCals = computed(() => (this.targetsForm.get('fat')?.value || 0) * 9);
  totalMacroCals = computed(() => this.proteinCals() + this.carbsCals() + this.fatCals());

  proteinPercent = computed(() => {
    const total = this.targetCals();
    return total > 0 ? Math.round((this.proteinCals() / total) * 100) : 0;
  });

  carbsPercent = computed(() => {
    const total = this.targetCals();
    return total > 0 ? Math.round((this.carbsCals() / total) * 100) : 0;
  });

  fatPercent = computed(() => {
    const total = this.targetCals();
    return total > 0 ? Math.round((this.fatCals() / total) * 100) : 0;
  });

  ngOnInit(): void {
    // Get client ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.clientId.set(id);
      this.loadClientData();
    }
  }

  async loadClientData(): Promise<void> {
    this.loading.set(true);
    try {
      // Load client profile
      const clients = await this.clientService.getClients();
      const client = clients.find(c => c.id === this.clientId());
      if (client) {
        this.clientProfile.set(client);
      }

      // Load current targets
      const targets = await this.nutritionService.getActiveTargets(this.clientId());
      if (targets) {
        this.currentTargets.set(targets);
      }
    } catch (error) {
      console.error('Error loading client data:', error);
      this.errorMessage.set('Failed to load client information');
    } finally {
      this.loading.set(false);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.targetsForm.invalid) return;

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const formValue = this.targetsForm.value;

      const result = await this.nutritionService.setTargets(this.clientId(), {
        calories_target: formValue.calories,
        protein_target_g: formValue.protein,
        carbs_target_g: formValue.carbs,
        fat_target_g: formValue.fat,
        effective_from: formValue.effectiveFrom,
        notes: formValue.notes || null,
      });

      if (result) {
        this.successMessage.set('Nutrition targets saved successfully!');
        this.currentTargets.set(result);

        // Navigate back after a short delay
        setTimeout(() => {
          this.router.navigate(['/tabs/clients', this.clientId()]);
        }, 2000);
      } else {
        throw new Error('Failed to save targets');
      }
    } catch (error) {
      console.error('Error saving targets:', error);
      this.errorMessage.set(error instanceof Error ? error.message : 'Failed to save targets');
    } finally {
      this.submitting.set(false);
    }
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }
}
