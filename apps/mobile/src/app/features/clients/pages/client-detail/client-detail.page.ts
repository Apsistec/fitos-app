import {  Component, OnInit, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormsModule, Validators } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonLabel,
  IonNote,
  IonBadge,
  IonIcon,
  IonSpinner,
  IonTextarea,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  ToastController,
  ActionSheetController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  calendarOutline,
  ribbonOutline,
  barbellOutline,
  heartOutline,
  alertCircleOutline,
  nutritionOutline,
  timeOutline,
  addOutline,
  createOutline,
  trashOutline,
  checkmarkCircle,
  closeCircle,
} from 'ionicons/icons';
import { ClientService, ClientWithProfile } from '../../../../core/services/client.service';
import { WorkoutSessionService } from '../../../../core/services/workout-session.service';
import { AutonomyService, AutonomyAssessment } from '../../../../core/services/autonomy.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AutonomyIndicatorComponent } from '../../components/autonomy-indicator/autonomy-indicator.component';
import { GraduationAlertComponent } from '../../components/graduation-alert/graduation-alert.component';
import { AssessmentFormComponent } from '../../components/assessment-form/assessment-form.component';

addIcons({
  personOutline,
  calendarOutline,
  ribbonOutline,
  barbellOutline,
  heartOutline,
  alertCircleOutline,
  nutritionOutline,
  timeOutline,
  addOutline,
  createOutline,
  trashOutline,
  checkmarkCircle,
  closeCircle,
});

interface TrainerNote {
  id: string;
  note: string;
  created_at: string;
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonLabel,
    IonNote,
    IonBadge,
    IonIcon,
    IonSpinner,
    IonTextarea,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
    AutonomyIndicatorComponent,
    GraduationAlertComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/clients"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ client()?.full_name || 'Client Profile' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="showActionSheet()" aria-label="Client actions">
            <ion-icon slot="icon-only" name="create-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedTab" (ionChange)="onTabChange()">
          <ion-segment-button value="overview">
            <ion-label>Overview</ion-label>
          </ion-segment-button>
          <ion-segment-button value="workouts">
            <ion-label>Workouts</ion-label>
          </ion-segment-button>
          <ion-segment-button value="notes">
            <ion-label>Notes</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading client profile...</p>
        </div>
      } @else if (error()) {
        <div class="error-container">
          <p class="error-message">{{ error() }}</p>
          <ion-button (click)="loadClientProfile()">Retry</ion-button>
        </div>
      } @else if (client()) {
        <div class="profile-container">
          <!-- Overview Tab -->
          @if (selectedTab === 'overview') {
            <!-- Autonomy & Graduation -->
            <app-graduation-alert
              [assessment]="autonomyAssessment()"
              [clientId]="clientId()"
              (graduate)="handleGraduate()"
              (viewDetails)="handleViewAutonomyDetails()"
            />

            <app-autonomy-indicator [assessment]="autonomyAssessment()" />

            <!-- Personal Info Card -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="person-outline"></ion-icon>
                  Personal Information
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <ion-label class="info-label">Email</ion-label>
                    <ion-note>{{ client()!.email }}</ion-note>
                  </div>

                  @if (client()!.date_of_birth) {
                    <div class="info-item">
                      <ion-label class="info-label">Age</ion-label>
                      <ion-note>{{ calculateAge(client()!.date_of_birth) }} years</ion-note>
                    </div>
                  }

                  @if (client()!.gender) {
                    <div class="info-item">
                      <ion-label class="info-label">Gender</ion-label>
                      <ion-note>{{ formatGender(client()!.gender) }}</ion-note>
                    </div>
                  }

                  @if (client()!.height_inches) {
                    <div class="info-item">
                      <ion-label class="info-label">Height</ion-label>
                      <ion-note>{{ formatHeight(client()!.height_inches) }}</ion-note>
                    </div>
                  }

                  @if (client()!.fitness_level) {
                    <div class="info-item">
                      <ion-label class="info-label">Fitness Level</ion-label>
                      <ion-badge [color]="getFitnessLevelColor(client()!.fitness_level)">
                        {{ formatFitnessLevel(client()!.fitness_level) }}
                      </ion-badge>
                    </div>
                  }
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Goals Card -->
            @if (client()!.goals && client()!.goals.length > 0) {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="ribbon-outline"></ion-icon>
                    Goals
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="goals-list">
                    @for (goal of client()!.goals; track $index) {
                      <div class="goal-item">
                        <ion-icon name="checkmark-circle" color="primary"></ion-icon>
                        <span>{{ goal }}</span>
                      </div>
                    }
                  </div>
                </ion-card-content>
              </ion-card>
            }

            <!-- Injuries/Limitations Card -->
            @if (client()!.injuries_notes) {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="alert-circle-outline"></ion-icon>
                    Injuries & Limitations
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <p class="injuries-notes">{{ client()!.injuries_notes }}</p>
                </ion-card-content>
              </ion-card>
            }

            <!-- Subscription Info Card -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="card-outline"></ion-icon>
                  Subscription
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-grid">
                  <div class="info-item">
                    <ion-label class="info-label">Status</ion-label>
                    <ion-badge [color]="getSubscriptionColor(client()!.subscription_status)">
                      {{ formatSubscriptionStatus(client()!.subscription_status) }}
                    </ion-badge>
                  </div>

                  @if (client()!.subscription_ends_at) {
                    <div class="info-item">
                      <ion-label class="info-label">Ends</ion-label>
                      <ion-note>{{ formatDate(client()!.subscription_ends_at) }}</ion-note>
                    </div>
                  }

                  <div class="info-item">
                    <ion-label class="info-label">Member Since</ion-label>
                    <ion-note>{{ formatDate(client()!.created_at) }}</ion-note>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Workouts Tab -->
          @if (selectedTab === 'workouts') {
            <!-- Workout Stats -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="barbell-outline"></ion-icon>
                  Workout Statistics
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="stats-grid">
                  <div class="stat-item">
                    <div class="stat-value">{{ workoutStats().total }}</div>
                    <div class="stat-label">Total Workouts</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ workoutStats().thisWeek }}</div>
                    <div class="stat-label">This Week</div>
                  </div>
                  <div class="stat-item">
                    <div class="stat-value">{{ workoutStats().thisMonth }}</div>
                    <div class="stat-label">This Month</div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>

            <!-- Recent Workouts -->
            <ion-card>
              <ion-card-header>
                <div class="card-header-row">
                  <ion-card-title>Recent Workouts</ion-card-title>
                  <ion-button fill="clear" size="small" (click)="viewAllWorkouts()">
                    View All
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                @if (loadingWorkouts()) {
                  <div class="loading-small">
                    <ion-spinner></ion-spinner>
                  </div>
                } @else if (recentWorkouts().length === 0) {
                  <p class="no-data">No workouts completed yet</p>
                } @else {
                  <ion-list lines="none">
                    @for (workout of recentWorkouts(); track workout.id) {
                      <div class="workout-item">
                        <div class="workout-info">
                          <div class="workout-name">{{ workout.template?.name || 'Workout' }}</div>
                          <ion-note>{{ formatDate(workout.completed_at) }}</ion-note>
                        </div>
                        @if (workout.rating) {
                          <ion-badge color="primary">{{ workout.rating }}/5</ion-badge>
                        }
                      </div>
                    }
                  </ion-list>
                }
              </ion-card-content>
            </ion-card>
          }

          <!-- Notes Tab -->
          @if (selectedTab === 'notes') {
            <!-- Add Note Form -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="add-outline"></ion-icon>
                  Add Note
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <form [formGroup]="noteForm" (ngSubmit)="addNote()">
                  <ion-textarea
                    formControlName="note"
                    placeholder="Add a note about this client..."
                    [autoGrow]="true"
                    rows="4"
                    fill="outline"
                    [counter]="true"
                    [maxlength]="1000"
                  ></ion-textarea>

                  <ion-button
                    expand="block"
                    type="submit"
                    [disabled]="!noteForm.valid || savingNote()"
                    class="add-note-button"
                  >
                    @if (savingNote()) {
                      <ion-spinner name="crescent"></ion-spinner>
                    } @else {
                      Add Note
                    }
                  </ion-button>
                </form>
              </ion-card-content>
            </ion-card>

            <!-- Trainer Notes List -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>Notes History</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @if (loadingNotes()) {
                  <div class="loading-small">
                    <ion-spinner></ion-spinner>
                  </div>
                } @else if (trainerNotes().length === 0) {
                  <p class="no-data">No notes yet</p>
                } @else {
                  <div class="notes-list">
                    @for (note of trainerNotes(); track note.id) {
                      <div class="note-item">
                        <div class="note-header">
                          <ion-note class="note-date">{{ formatDate(note.created_at) }}</ion-note>
                          <ion-button
                            fill="clear"
                            size="small"
                            color="danger"
                            (click)="deleteNote(note.id)"
                            aria-label="Delete note"
                          >
                            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
                          </ion-button>
                        </div>
                        <p class="note-text">{{ note.note }}</p>
                      </div>
                    }
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

    .loading-container,
    .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .error-message {
      color: var(--fitos-status-error, #EF4444);
      margin-bottom: 16px;
    }

    .profile-container {
      padding: 16px;
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0 0 16px 0;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card-title ion-icon {
      font-size: 20px;
      color: var(--ion-color-primary, #10B981);
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-label {
      font-size: 11px;
      font-weight: 500;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-item ion-note {
      font-size: 16px;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .goals-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .goal-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .goal-item ion-icon {
      flex-shrink: 0;
      font-size: 20px;
    }

    .injuries-notes {
      margin: 0;
      line-height: 1.6;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat-item {
      text-align: center;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      color: var(--ion-color-primary, #10B981);
      line-height: 1;
    }

    .stat-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .loading-small {
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .no-data {
      text-align: center;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 20px 0;
    }

    ion-list {
      padding: 0;
    }

    .workout-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    }

    .workout-item:last-child {
      border-bottom: none;
    }

    .workout-info {
      flex: 1;
    }

    .workout-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 4px;
    }

    .add-note-button {
      margin-top: 16px;
      --border-radius: 8px;
      height: 48px;
      font-weight: 700;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .notes-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .note-item {
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
    }

    .note-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .note-date {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .note-text {
      margin: 0;
      line-height: 1.6;
      color: var(--fitos-text-primary, #F5F5F5);
    }
  `]
})
export class ClientDetailPage implements OnInit {
  private clientService = inject(ClientService);
  private workoutService = inject(WorkoutSessionService);
  private autonomyService = inject(AutonomyService);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private modalCtrl = inject(ModalController);
  private fb = inject(FormBuilder);

  // State
  client = signal<ClientWithProfile | null>(null);
  clientId = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  selectedTab = 'overview';
  autonomyAssessment = signal<AutonomyAssessment | null>(null);

  // Workouts tab
  recentWorkouts = signal<Record<string, unknown>[]>([]);
  loadingWorkouts = signal(false);
  workoutStats = computed(() => {
    const workouts = this.recentWorkouts();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      total: workouts.length,
      thisWeek: workouts.filter(w => new Date(w.completed_at) >= weekAgo).length,
      thisMonth: workouts.filter(w => new Date(w.completed_at) >= monthAgo).length,
    };
  });

  // Notes tab
  trainerNotes = signal<TrainerNote[]>([]);
  loadingNotes = signal(false);
  savingNote = signal(false);
  noteForm: FormGroup;

  constructor() {
    this.noteForm = this.fb.group({
      note: ['', [Validators.required, Validators.maxLength(1000)]],
    });
  }

  ngOnInit() {
    const clientId = this.route.snapshot.paramMap.get('id');
    if (clientId) {
      this.clientId.set(clientId);
      this.loadClientProfile(clientId);
      this.loadAutonomyAssessment(clientId);
    } else {
      this.error.set('Client ID not provided');
    }
  }

  async loadClientProfile(clientId?: string) {
    const id = clientId || this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      const clientData = await this.clientService.getClient(id);
      this.client.set(clientData);

      // Load additional data based on selected tab
      this.loadTabData();
    } catch (err) {
      this.error.set('Failed to load client profile');
      console.error('Error loading client:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadTabData() {
    const clientId = this.client()?.id;
    if (!clientId) return;

    switch (this.selectedTab) {
      case 'workouts':
        await this.loadWorkouts(clientId);
        break;
      case 'notes':
        await this.loadNotes(clientId);
        break;
    }
  }

  async loadWorkouts(clientId: string) {
    this.loadingWorkouts.set(true);
    try {
      const workouts = await this.workoutService.getClientWorkoutHistory(clientId, 10, 0);
      this.recentWorkouts.set(workouts);
    } catch (err) {
      console.error('Error loading workouts:', err);
    } finally {
      this.loadingWorkouts.set(false);
    }
  }

  async loadNotes(clientId: string) {
    this.loadingNotes.set(true);
    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) return;

      const { data, error } = await this.supabase.client
        .from('trainer_notes')
        .select('id, note, created_at')
        .eq('trainer_id', trainerId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading notes:', error);
        return;
      }

      this.trainerNotes.set(data || []);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      this.loadingNotes.set(false);
    }
  }

  async addNote() {
    if (!this.noteForm.valid || !this.client()) return;

    const trainerId = this.auth.user()?.id;
    const clientId = this.client()?.id;
    if (!trainerId || !clientId) return;

    this.savingNote.set(true);
    try {
      const noteText = this.noteForm.value.note;

      const { data, error } = await this.supabase.client
        .from('trainer_notes')
        .insert({
          trainer_id: trainerId,
          client_id: clientId,
          note: noteText,
        })
        .select('id, note, created_at')
        .single();

      if (error) throw error;

      if (data) {
        this.trainerNotes.update(notes => [data, ...notes]);
      }

      this.noteForm.reset();

      const toast = await this.toastCtrl.create({
        message: 'Note added successfully',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    } catch (err) {
      console.error('Error adding note:', err);
      const toast = await this.toastCtrl.create({
        message: 'Failed to add note',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
    } finally {
      this.savingNote.set(false);
    }
  }

  async deleteNote(noteId: string) {
    try {
      const { error } = await this.supabase.client
        .from('trainer_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      this.trainerNotes.update(notes => notes.filter(n => n.id !== noteId));

      const toast = await this.toastCtrl.create({
        message: 'Note deleted',
        duration: 2000,
        color: 'success',
      });
      await toast.present();
    } catch (err) {
      console.error('Error deleting note:', err);
      const toast = await this.toastCtrl.create({
        message: 'Failed to delete note',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  onTabChange() {
    this.loadTabData();
  }

  async handleRefresh(event: CustomEvent) {
    await this.loadClientProfile();
    (event.target as HTMLIonRefresherElement).complete();
  }

  async showActionSheet() {
    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Actions',
      buttons: [
        {
          text: 'Assign Workout',
          icon: 'barbell-outline',
          handler: () => {
            this.router.navigate(['/tabs/workouts/assign'], {
              queryParams: { clientId: this.client()?.id }
            });
          }
        },
        {
          text: 'View Workout History',
          icon: 'time-outline',
          handler: () => {
            this.viewAllWorkouts();
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  viewAllWorkouts() {
    // Navigate to workout history filtered for this client
    this.router.navigate(['/tabs/workouts/history'], {
      queryParams: { clientId: this.client()?.id }
    });
  }

  // Formatting helpers
  calculateAge(dateOfBirth: string): number {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  formatHeight(inches: number): string {
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    return `${feet}'${remainingInches}"`;
  }

  formatGender(gender: string): string {
    const genderMap: Record<string, string> = {
      male: 'Male',
      female: 'Female',
      other: 'Other',
      prefer_not_to_say: 'Prefer not to say',
    };
    return genderMap[gender] || gender;
  }

  formatFitnessLevel(level: string): string {
    return level.charAt(0).toUpperCase() + level.slice(1);
  }

  getFitnessLevelColor(level: string): string {
    const colorMap: Record<string, string> = {
      beginner: 'success',
      intermediate: 'primary',
      advanced: 'secondary',
    };
    return colorMap[level] || 'medium';
  }

  formatSubscriptionStatus(status: string): string {
    const statusMap: Record<string, string> = {
      active: 'Active',
      trialing: 'Trial',
      past_due: 'Past Due',
      canceled: 'Canceled',
      unpaid: 'Unpaid',
    };
    return statusMap[status] || status;
  }

  getSubscriptionColor(status: string): string {
    const colorMap: Record<string, string> = {
      active: 'success',
      trialing: 'primary',
      past_due: 'warning',
      canceled: 'medium',
      unpaid: 'danger',
    };
    return colorMap[status] || 'medium';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  // Autonomy methods
  async loadAutonomyAssessment(clientId: string): Promise<void> {
    try {
      const assessment = await this.autonomyService.getLatestAssessment(clientId);
      this.autonomyAssessment.set(assessment);
    } catch (err) {
      console.error('Error loading autonomy assessment:', err);
      // Don't show error to user - autonomy data is optional
    }
  }

  handleGraduate(): void {
    // Navigate to graduation page
    this.router.navigate(['/tabs/clients', this.clientId(), 'graduation']);
  }

  async handleViewAutonomyDetails(): Promise<void> {
    await this.openAssessmentForm();
  }

  async openAssessmentForm(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: AssessmentFormComponent,
      componentProps: {
        clientId: this.clientId(),
      },
    });

    await modal.present();

    const { data, role } = await modal.onDidDismiss();

    if (role === 'saved' && data) {
      // Refresh autonomy assessment
      await this.loadAutonomyAssessment(this.clientId());
      await this.showToast('Assessment saved successfully!', 'success');
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
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
