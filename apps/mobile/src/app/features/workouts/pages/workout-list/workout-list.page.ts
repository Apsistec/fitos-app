import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonButton,
  IonSearchbar,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonText,
  AlertController,
  ToastController,
  ActionSheetController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  ellipsisVertical,
  playOutline,
  createOutline,
  copyOutline,
  trashOutline,
  timeOutline,
  barbellOutline
} from 'ionicons/icons';
import { WorkoutService, WorkoutTemplateWithExercises } from '../../../../core/services/workout.service';
import { AuthService } from '../../../../core/services/auth.service';
import { listStagger } from '../../../../shared/animations';

// Register icons at module level
addIcons({
  addOutline,
  ellipsisVertical,
  playOutline,
  createOutline,
  copyOutline,
  trashOutline,
  timeOutline,
  barbellOutline
});

@Component({
  standalone: true,
  selector: 'app-workout-list',
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonFab,
    IonFabButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonButton,
    IonSearchbar,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonText
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  animations: [listStagger],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>My Workouts</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearchChange($event)"
          placeholder="Search workouts..."
          debounce="300"
        ></ion-searchbar>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (workoutService.loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workouts...</p>
        </div>
      } @else if (workoutService.error()) {
        <div class="error-container">
          <p class="error-message">{{ workoutService.error() }}</p>
          <ion-button (click)="loadWorkouts()">Retry</ion-button>
        </div>
      } @else {
        <div class="workouts-container">
          @if (filteredWorkouts().length === 0) {
            <div class="empty-state">
              @if (searchQuery) {
                <p>No workouts found matching "{{ searchQuery }}"</p>
                <ion-button fill="clear" (click)="clearSearch()">Clear search</ion-button>
              } @else if (workoutService.templates().length === 0) {
                <ion-icon name="barbell-outline" class="empty-icon"></ion-icon>
                <h2>No Workouts Yet</h2>
                <p>Create your first workout template to get started</p>
                <ion-button (click)="createWorkout()">
                  <ion-icon slot="start" name="add-outline"></ion-icon>
                  Create Workout
                </ion-button>
              }
            </div>
          } @else {
            <div class="results-info">
              <ion-text color="medium">
                <small>{{ filteredWorkouts().length }} workout{{ filteredWorkouts().length === 1 ? '' : 's' }}</small>
              </ion-text>
            </div>

            <div [@listAnimation]="filteredWorkouts().length">
              @for (workout of filteredWorkouts(); track workout.id) {
                <ion-card>
                <ion-card-header>
                  <div class="card-header-wrapper">
                    <div class="title-section">
                      <ion-card-title>{{ workout.name }}</ion-card-title>
                      @if (workout.description) {
                        <ion-card-subtitle>{{ workout.description }}</ion-card-subtitle>
                      }
                    </div>
                    <ion-button
                      fill="clear"
                      (click)="openActionSheet(workout)"
                      class="more-button"
                      aria-label="Workout options"
                    >
                      <ion-icon slot="icon-only" name="ellipsis-vertical"></ion-icon>
                    </ion-button>
                  </div>
                </ion-card-header>

                <ion-card-content>
                  <div class="workout-meta">
                    <div class="meta-item">
                      <ion-icon name="barbell-outline"></ion-icon>
                      <span>{{ workout.exercises.length || 0 }} exercises</span>
                    </div>
                    @if (workout.estimated_duration_minutes) {
                      <div class="meta-item">
                        <ion-icon name="time-outline"></ion-icon>
                        <span>{{ formatDuration(workout.estimated_duration_minutes) }}</span>
                      </div>
                    }
                  </div>

                  <div class="exercise-preview">
                    @if (workout.exercises && workout.exercises.length > 0) {
                      <ion-text color="medium">
                        <small>
                          @for (ex of workout.exercises.slice(0, 3); track ex.id; let last = $last) {
                            <span>Exercise {{ $index + 1 }}{{ !last ? ', ' : '' }}</span>
                          }
                          @if (workout.exercises.length > 3) {
                            <span> +{{ workout.exercises.length - 3 }} more</span>
                          }
                        </small>
                      </ion-text>
                    }
                  </div>

                  <div class="card-actions">
                    @if (isTrainer()) {
                      <ion-button fill="outline" size="small" (click)="assignWorkout(workout)">
                        <ion-icon slot="start" name="play-outline"></ion-icon>
                        Assign
                      </ion-button>
                    }
                    <ion-button fill="solid" size="small" (click)="editWorkout(workout.id)">
                      <ion-icon slot="start" name="create-outline"></ion-icon>
                      Edit
                    </ion-button>
                  </div>
                </ion-card-content>
              </ion-card>
              }
            </div>
          }
        </div>
      }

      <!-- Create Workout FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createWorkout()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    ion-searchbar {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      --color: var(--fitos-text-primary, #F5F5F5);
      --placeholder-color: var(--fitos-text-tertiary, #737373);
    }

    .workouts-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .results-info {
      padding: 0 4px 8px 4px;
      color: var(--fitos-text-tertiary, #737373);
      font-size: 13px;
    }

    .card-header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .title-section {
      flex: 1;
    }

    .more-button {
      margin: -8px -8px 0 0;
      --padding-start: 8px;
      --padding-end: 8px;
      --color: var(--fitos-text-tertiary, #737373);
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card-subtitle {
      margin-top: 4px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .workout-meta {
      display: flex;
      gap: 16px;
      margin-bottom: 12px;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .meta-item ion-icon {
      font-size: 16px;
    }

    .exercise-preview {
      margin-bottom: 12px;
      padding: 8px 0;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .card-actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .card-actions ion-button {
      flex: 1;
      margin: 0;
      --border-radius: 8px;
      font-weight: 600;
      font-size: 13px;
    }

    .loading-container,
    .error-container,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    .error-message {
      color: #FCA5A5;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .empty-state .empty-icon {
      font-size: 48px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 16px;
    }

    .empty-state h2 {
      margin: 0 0 8px 0;
      font-size: 20px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .empty-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 24px;
      font-size: 14px;
    }

    ion-fab-button {
      --background: var(--ion-color-primary, #10B981);
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    ion-card {
      margin: 12px 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }
  `]
})
export class WorkoutListPage implements OnInit {
  // Services (inject pattern)
  workoutService = inject(WorkoutService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private actionSheetController = inject(ActionSheetController);

  // State
  searchQuery = '';
  filteredWorkouts = signal<WorkoutTemplateWithExercises[]>([]);

  async ngOnInit() {
    await this.loadWorkouts();
  }

  async loadWorkouts() {
    await this.workoutService.loadTemplates();
    this.updateFilteredWorkouts();
  }

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadWorkouts();
    event.target.complete();
  }

  onSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value || '';
    this.updateFilteredWorkouts();
  }

  updateFilteredWorkouts() {
    const query = this.searchQuery.toLowerCase().trim();

    if (!query) {
      this.filteredWorkouts.set(this.workoutService.templates());
      return;
    }

    const filtered = this.workoutService.templates().filter(workout => {
      const nameMatch = workout.name.toLowerCase().includes(query);
      const descMatch = workout.description?.toLowerCase().includes(query);
      const exerciseMatch = workout.exercises?.some((ex) =>
        (ex as unknown as { exercise?: { name: string } }).exercise?.name.toLowerCase().includes(query)
      );

      return nameMatch || descMatch || exerciseMatch;
    });

    this.filteredWorkouts.set(filtered);
  }

  clearSearch() {
    this.searchQuery = '';
    this.updateFilteredWorkouts();
  }

  isTrainer(): boolean {
    return this.authService.isTrainer();
  }

  createWorkout() {
    this.router.navigate(['/tabs/workouts/builder']);
  }

  editWorkout(id: string) {
    this.router.navigate(['/tabs/workouts/builder', id]);
  }

  assignWorkout(workout: WorkoutTemplateWithExercises) {
    this.router.navigate(['/tabs/workouts/assign'], {
      queryParams: { templateId: workout.id }
    });
  }

  async openActionSheet(workout: WorkoutTemplateWithExercises) {
    const actionSheet = await this.actionSheetController.create({
      header: workout.name,
      buttons: [
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => {
            this.editWorkout(workout.id);
          }
        },
        {
          text: 'Duplicate',
          icon: 'copy-outline',
          handler: () => {
            this.duplicateWorkout(workout.id);
          }
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.confirmDelete(workout);
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

  async duplicateWorkout(id: string) {
    const result = await this.workoutService.duplicateTemplate(id);

    if (result) {
      this.showToast('Workout duplicated successfully!', 'success');
      this.updateFilteredWorkouts();
    } else {
      this.showToast('Failed to duplicate workout', 'danger');
    }
  }

  async confirmDelete(workout: WorkoutTemplateWithExercises) {
    const alert = await this.alertController.create({
      header: 'Delete Workout',
      message: `Are you sure you want to delete "${workout.name}"? This action cannot be undone.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => {
            this.deleteWorkout(workout.id);
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteWorkout(id: string) {
    const success = await this.workoutService.deleteTemplate(id);

    if (success) {
      this.showToast('Workout deleted', 'success');
      this.updateFilteredWorkouts();
    } else {
      this.showToast('Failed to delete workout', 'danger');
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

  async showToast(message: string, color = 'primary') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color
    });
    await toast.present();
  }
}
