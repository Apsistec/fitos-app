import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonDatetime,
  IonTextarea,
  IonSpinner,
  IonText,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCheckbox,
  ToastController
} from '@ionic/angular/standalone';
import { AssignmentService, WorkoutAssignment } from '../../../../core/services/assignment.service';
import { ClientService } from '../../../../core/services/client.service';
import { WorkoutService } from '../../../../core/services/workout.service';

@Component({
  selector: 'app-assign-workout',
  imports: [

    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonDatetime,
    IonTextarea,
    IonSpinner,
    IonText,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonCheckbox
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>Assign Workout</ion-title>
        <ion-buttons slot="end">
          <ion-button
            (click)="assignWorkout()"
            [disabled]="saving() || !canAssign()"
          >
            @if (saving()) {
              <ion-spinner name="circular"></ion-spinner>
            } @else {
              Assign
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading...</p>
        </div>
      } @else {
        <div class="assign-container">
          <!-- Workout Info Card -->
          @if (workout()) {
            <ion-card>
              <ion-card-header>
                <ion-card-title>{{ workout()!.name }}</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @if (workout()!.description) {
                  <p>{{ workout()!.description }}</p>
                }
                <div class="workout-meta">
                  <ion-text color="medium">
                    <small>
                      {{ workout()!.exercises?.length || 0 }} exercises
                      @if (workout()!.estimated_duration) {
                        · {{ formatDuration(workout()!.estimated_duration) }}
                      }
                    </small>
                  </ion-text>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Assignment Form -->
          <ion-list>
            <!-- Client Selection -->
            <ion-item lines="none">
              <ion-select
                [(ngModel)]="selectedClientId"
                label="Client"
                labelPlacement="floating"
                fill="outline"
                placeholder="Select a client"
                interface="action-sheet"
              >
                @for (client of clientService.activeClients(); track client.id) {
                  <ion-select-option [value]="client.id">
                    {{ client.profile.full_name }}
                  </ion-select-option>
                }
              </ion-select>
            </ion-item>

            @if (clientService.activeClients().length === 0) {
              <ion-item>
                <ion-label class="ion-text-wrap">
                  <ion-text color="warning">
                    <p>No active clients found. Invite clients to assign workouts.</p>
                  </ion-text>
                </ion-label>
              </ion-item>
            }

            <!-- Single Date vs Multiple Dates -->
            <ion-item>
              <ion-checkbox [(ngModel)]="assignMultipleDates">
                Assign to multiple dates
              </ion-checkbox>
              <ion-label class="ion-margin-start">Weekly Program</ion-label>
            </ion-item>

            <!-- Single Date Picker -->
            @if (!assignMultipleDates) {
              <ion-item lines="none">
                <ion-datetime
                  [(ngModel)]="scheduledDate"
                  presentation="date"
                  [min]="minDate"
                  [max]="maxDate"
                />
              </ion-item>
            }

            <!-- Multiple Dates Picker -->
            @if (assignMultipleDates) {
              <ion-item lines="none">
                <ion-datetime
                  [(ngModel)]="selectedDates"
                  presentation="date"
                  [multiple]="true"
                  [min]="minDate"
                  [max]="maxDate"
                />
              </ion-item>

              @if (selectedDates && selectedDates.length > 0) {
                <ion-item>
                  <ion-label class="ion-text-wrap">
                    <ion-text color="primary">
                      <small>
                        {{ selectedDates.length }} date{{ selectedDates.length === 1 ? '' : 's' }} selected
                      </small>
                    </ion-text>
                  </ion-label>
                </ion-item>
              }
            }

            <!-- Trainer Notes -->
            <ion-item lines="none">
              <ion-textarea
                [(ngModel)]="trainerNotes"
                label="Trainer Notes"
                labelPlacement="floating"
                fill="outline"
                placeholder="Add notes for your client..."
                helperText="Optional - Special instructions or focus areas"
                [autoGrow]="true"
                rows="4"
              />
            </ion-item>
          </ion-list>

          <!-- Assignment Summary -->
          @if (canAssign()) {
            <ion-card class="summary-card">
              <ion-card-header>
                <ion-card-title>Assignment Summary</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="summary-item">
                  <span class="label">Client:</span>
                  <span class="value">{{ getSelectedClientName() }}</span>
                </div>
                <div class="summary-item">
                  <span class="label">Workout:</span>
                  <span class="value">{{ workout()?.name }}</span>
                </div>
                @if (assignMultipleDates) {
                  <div class="summary-item">
                    <span class="label">Dates:</span>
                    <span class="value">{{ selectedDates.length }} workouts</span>
                  </div>
                } @else {
                  <div class="summary-item">
                    <span class="label">Date:</span>
                    <span class="value">{{ formatDate(scheduledDate) }}</span>
                  </div>
                }
              </ion-card-content>
            </ion-card>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .assign-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }

    .workout-meta {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--ion-color-light);
    }

    ion-list {
      margin: 16px 0;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }

    ion-datetime {
      margin-top: 8px;
    }

    .summary-card {
      margin-top: 24px;
      background: var(--ion-color-light);
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }

    .summary-item .label {
      font-weight: 600;
      color: var(--ion-color-medium);
    }

    .summary-item .value {
      font-weight: 500;
    }

    ion-card {
      margin: 12px 0;
    }
  `]
})
export class AssignWorkoutPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private assignmentService = inject(AssignmentService);
  clientService = inject(ClientService);
  private workoutService = inject(WorkoutService);
  private toastController = inject(ToastController);

  // Template ID from route
  templateId?: string;

  // State
  workout = signal<any>(null);
  loading = signal(false);
  saving = signal(false);

  // Form fields
  selectedClientId = '';
  scheduledDate = new Date().toISOString();
  selectedDates: string[] = [];
  assignMultipleDates = false;
  trainerNotes = '';

  // Date constraints (today to 90 days in future)
  minDate = new Date().toISOString();
  maxDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  async ngOnInit() {
    this.loading.set(true);

    // Get template ID from route
    const id = this.route.snapshot.queryParamMap.get('templateId');
    if (id) {
      this.templateId = id;
      await this.loadWorkout(id);
    }

    // Load clients
    await this.clientService.loadClients();

    this.loading.set(false);
  }

  async loadWorkout(id: string) {
    const template = await this.workoutService.loadTemplate(id);
    this.workout.set(template);
  }

  canAssign(): boolean {
    const hasClient = !!this.selectedClientId;
    const hasDate = this.assignMultipleDates
      ? this.selectedDates.length > 0
      : !!this.scheduledDate;

    return hasClient && hasDate && !!this.workout();
  }

  getSelectedClientName(): string {
    const client = this.clientService.activeClients().find(
      c => c.id === this.selectedClientId
    );

    if (!client) return '';

    return client.profile?.full_name || '';
  }

  async assignWorkout() {
    if (!this.canAssign() || !this.templateId) return;

    this.saving.set(true);

    try {
      let success = false;

      if (this.assignMultipleDates && this.selectedDates.length > 0) {
        // Assign to multiple dates
        const assignments: WorkoutAssignment[] = this.selectedDates.map(date => ({
          clientId: this.selectedClientId,
          templateId: this.templateId!,
          scheduledDate: date,
          trainerNotes: this.trainerNotes || undefined
        }));

        success = await this.assignmentService.assignMultipleWorkouts(assignments);

        if (success) {
          this.showToast(
            `Assigned ${this.selectedDates.length} workouts to ${this.getSelectedClientName()}`,
            'success'
          );
        }
      } else {
        // Assign to single date
        const assignment: WorkoutAssignment = {
          clientId: this.selectedClientId,
          templateId: this.templateId,
          scheduledDate: this.scheduledDate,
          trainerNotes: this.trainerNotes || undefined
        };

        const result = await this.assignmentService.assignWorkout(assignment);
        success = !!result;

        if (success) {
          this.showToast(
            `Assigned workout to ${this.getSelectedClientName()}`,
            'success'
          );
        }
      }

      if (success) {
        this.router.navigate(['/tabs/workouts']);
      } else {
        this.showToast('Failed to assign workout', 'danger');
      }
    } catch (error) {
      console.error('Error assigning workout:', error);
      this.showToast('An error occurred', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  formatDate(isoDate: string): string {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
