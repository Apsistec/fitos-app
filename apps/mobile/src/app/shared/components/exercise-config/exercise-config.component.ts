import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonIcon,
  IonText,
  IonBadge
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { trashOutline, reorderThree } from 'ionicons/icons';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];

export interface ExerciseConfig {
  id?: string; // temporary ID for tracking in UI
  exerciseId: string;
  exercise?: Exercise; // Populated when loaded
  order: number;
  sets: number;
  reps: string;
  restSeconds: number;
  notes?: string;
  rpe?: number;
  tempo?: string;
}

@Component({
  selector: 'app-exercise-config',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonButton,
    IonIcon,
    IonText,
    IonBadge
  ],
  template: `
    <ion-card>
      <ion-card-header>
        <div class="header-wrapper">
          <div class="drag-handle">
            <ion-icon name="reorder-three"></ion-icon>
          </div>
          <div class="title-section">
            <ion-card-title>
              {{ config.exercise?.name || 'Exercise' }}
            </ion-card-title>
            @if (config.exercise?.primary_muscle) {
              <ion-badge color="primary" class="muscle-badge">
                {{ config.exercise.primary_muscle }}
              </ion-badge>
            }
          </div>
          <ion-button fill="clear" color="danger" (click)="onRemove()">
            <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
          </ion-button>
        </div>
      </ion-card-header>

      <ion-card-content>
        <div class="config-grid">
          <!-- Sets -->
          <ion-item>
            <ion-label position="stacked">Sets</ion-label>
            <ion-input
              type="number"
              [(ngModel)]="config.sets"
              (ngModelChange)="onConfigChange()"
              min="1"
              max="20"
              placeholder="3"
            ></ion-input>
          </ion-item>

          <!-- Reps -->
          <ion-item>
            <ion-label position="stacked">Reps</ion-label>
            <ion-input
              type="text"
              [(ngModel)]="config.reps"
              (ngModelChange)="onConfigChange()"
              placeholder="8-12"
            ></ion-input>
            <ion-text slot="helper" color="medium">
              <small>e.g., "10", "8-12", "AMRAP"</small>
            </ion-text>
          </ion-item>

          <!-- Rest -->
          <ion-item>
            <ion-label position="stacked">Rest (seconds)</ion-label>
            <ion-input
              type="number"
              [(ngModel)]="config.restSeconds"
              (ngModelChange)="onConfigChange()"
              min="0"
              max="600"
              placeholder="90"
            ></ion-input>
          </ion-item>

          <!-- RPE (optional) -->
          <ion-item>
            <ion-label position="stacked">RPE (optional)</ion-label>
            <ion-input
              type="number"
              [(ngModel)]="config.rpe"
              (ngModelChange)="onConfigChange()"
              min="1"
              max="10"
              placeholder="7"
            ></ion-input>
            <ion-text slot="helper" color="medium">
              <small>Rate of Perceived Exertion (1-10)</small>
            </ion-text>
          </ion-item>
        </div>

        <!-- Notes -->
        <ion-item>
          <ion-label position="stacked">Notes (optional)</ion-label>
          <ion-input
            type="text"
            [(ngModel)]="config.notes"
            (ngModelChange)="onConfigChange()"
            placeholder="e.g., 'Pause at bottom'"
          ></ion-input>
        </ion-item>

        <!-- Tempo (optional) -->
        <ion-item>
          <ion-label position="stacked">Tempo (optional)</ion-label>
          <ion-input
            type="text"
            [(ngModel)]="config.tempo"
            (ngModelChange)="onConfigChange()"
            placeholder="3-0-1-0"
          ></ion-input>
          <ion-text slot="helper" color="medium">
            <small>Eccentric-Pause-Concentric-Pause (e.g., 3-0-1-0)</small>
          </ion-text>
        </ion-item>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .header-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .drag-handle {
      cursor: grab;
      padding: 4px;
      color: var(--ion-color-medium);
      font-size: 1.5rem;
      display: flex;
      align-items: center;
    }

    .drag-handle:active {
      cursor: grabbing;
    }

    .title-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    ion-card-title {
      font-size: 1rem;
      font-weight: 600;
    }

    .muscle-badge {
      font-size: 0.7rem;
      text-transform: capitalize;
      align-self: flex-start;
    }

    .config-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 12px;
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
    }

    ion-input {
      --padding-start: 8px;
      --padding-end: 8px;
    }

    ion-card {
      margin: 12px 0;
    }

    ion-button {
      margin: 0;
    }
  `]
})
export class ExerciseConfigComponent implements OnInit {
  @Input({ required: true }) config!: ExerciseConfig;
  @Output() configChange = new EventEmitter<ExerciseConfig>();
  @Output() remove = new EventEmitter<void>();

  constructor() {
    addIcons({ trashOutline, reorderThree });
  }

  ngOnInit() {
    // Set defaults if not provided
    if (!this.config.sets) this.config.sets = 3;
    if (!this.config.reps) this.config.reps = '10';
    if (!this.config.restSeconds) this.config.restSeconds = 90;
  }

  onConfigChange() {
    this.configChange.emit(this.config);
  }

  onRemove() {
    this.remove.emit();
  }
}
