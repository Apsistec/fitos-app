import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonCard, IonCardHeader, IonCardTitle, IonCardSubtitle, IonCardContent, IonBadge, IonButton, IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { playCircleOutline, informationCircleOutline, addCircleOutline } from 'ionicons/icons';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];

@Component({
  selector: 'app-exercise-card',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon
  ],
  template: `
    <ion-card>
      <ion-card-header>
        <div class="header-wrapper">
          <div class="title-section">
            <ion-card-title>{{ exercise.name }}</ion-card-title>
            <ion-card-subtitle>
              {{ exercise.primary_muscle_group }}
              @if (exercise.secondary_muscle_groups && exercise.secondary_muscle_groups.length > 0) {
                <span> + {{ exercise.secondary_muscle_groups.length }} more</span>
              }
            </ion-card-subtitle>
          </div>
          @if (exercise.is_custom) {
            <ion-badge color="primary">Custom</ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (exercise.description) {
          <p class="description">{{ exercise.description }}</p>
        }

        <div class="metadata">
          <div class="metadata-item">
            <span class="label">Category:</span>
            <span class="value">{{ exercise.category }}</span>
          </div>
          <div class="metadata-item">
            <span class="label">Equipment:</span>
            <span class="value">{{ exercise.equipment_required || 'None' }}</span>
          </div>
          @if (exercise.difficulty_level) {
            <div class="metadata-item">
              <span class="label">Difficulty:</span>
              <span class="value difficulty" [attr.data-level]="exercise.difficulty_level">
                {{ exercise.difficulty_level }}
              </span>
            </div>
          }
        </div>

        <div class="actions">
          @if (exercise.video_url) {
            <ion-button fill="clear" size="small" (click)="onVideoClick()">
              <ion-icon slot="start" name="play-circle-outline"></ion-icon>
              Watch Demo
            </ion-button>
          }
          <ion-button fill="clear" size="small" (click)="onDetailClick()">
            <ion-icon slot="start" name="information-circle-outline"></ion-icon>
            Details
          </ion-button>
          @if (showAddButton) {
            <ion-button fill="solid" size="small" (click)="onAddClick()">
              <ion-icon slot="start" name="add-circle-outline"></ion-icon>
              Add
            </ion-button>
          }
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    ion-card {
      margin: 12px 0;
    }

    .header-wrapper {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .title-section {
      flex: 1;
    }

    ion-card-title {
      font-size: 1.1rem;
      font-weight: 600;
    }

    ion-card-subtitle {
      margin-top: 4px;
      font-size: 0.85rem;
    }

    .description {
      margin: 0 0 12px 0;
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      line-height: 1.4;
    }

    .metadata {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 12px;
      padding: 8px 0;
      border-top: 1px solid var(--ion-color-light);
    }

    .metadata-item {
      display: flex;
      gap: 8px;
      font-size: 0.85rem;
    }

    .metadata-item .label {
      font-weight: 600;
      color: var(--ion-color-medium);
      min-width: 80px;
    }

    .metadata-item .value {
      color: var(--ion-color-dark);
      text-transform: capitalize;
    }

    .difficulty {
      font-weight: 600;
    }

    .difficulty[data-level="beginner"] {
      color: var(--ion-color-success);
    }

    .difficulty[data-level="intermediate"] {
      color: var(--ion-color-warning);
    }

    .difficulty[data-level="advanced"] {
      color: var(--ion-color-danger);
    }

    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 8px;
    }

    ion-button {
      margin: 0;
      --padding-start: 8px;
      --padding-end: 8px;
    }

    ion-icon {
      font-size: 1.2rem;
    }
  `]
})
export class ExerciseCardComponent {
  @Input({ required: true }) exercise!: Exercise;
  @Input() showAddButton = false;

  @Output() videoClick = new EventEmitter<Exercise>();
  @Output() detailClick = new EventEmitter<Exercise>();
  @Output() addClick = new EventEmitter<Exercise>();

  constructor() {
    addIcons({ playCircleOutline, informationCircleOutline, addCircleOutline });
  }

  onVideoClick(): void {
    this.videoClick.emit(this.exercise);
  }

  onDetailClick(): void {
    this.detailClick.emit(this.exercise);
  }

  onAddClick(): void {
    this.addClick.emit(this.exercise);
  }
}
