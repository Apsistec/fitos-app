import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import type { WorkoutWithExercises } from '../../../../core/services/workout.service';

@Component({
  selector: 'app-client-today-workout-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    @if (workout(); as workout) {
      <ion-card class="workout-card hero-card">
        <ion-card-header>
          <div class="header-content">
            <div>
              <ion-card-subtitle>Today's Workout</ion-card-subtitle>
              <ion-card-title>{{ workout.name }}</ion-card-title>
            </div>
            <ion-badge color="primary">
              {{ workout.estimated_duration_minutes }} min
            </ion-badge>
          </div>
        </ion-card-header>

        <ion-card-content>
          @if (workout.description) {
            <p class="description">{{ workout.description }}</p>
          }

          <div class="exercise-count">
            <ion-icon name="barbell-outline"></ion-icon>
            <span>{{ workout.exercises.length || 0 }} exercises</span>
          </div>

          <ion-button
            expand="block"
            [routerLink]="['/tabs/workouts/active', workout.id]"
            class="start-button"
          >
            <ion-icon slot="start" name="play"></ion-icon>
            Start Workout
          </ion-button>
        </ion-card-content>
      </ion-card>
    } @else {
      <ion-card class="empty-card">
        <ion-card-content class="empty-content">
          <ion-icon name="calendar-outline" class="empty-icon"></ion-icon>
          <h3>No Workout Today</h3>
          <p>Enjoy your rest day or check your schedule for upcoming workouts.</p>
          <ion-button fill="outline" routerLink="/tabs/workouts">
            View Schedule
          </ion-button>
        </ion-card-content>
      </ion-card>
    }
  `,
  styles: [`
    .workout-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
      border-radius: 12px;
    }

    .hero-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(16, 185, 129, 0.25);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.08);

      ion-card-title {
        color: var(--fitos-text-primary, #F5F5F5);
        font-size: 20px;
        font-weight: 700;
      }

      ion-card-subtitle {
        color: var(--ion-color-primary, #10B981);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 600;
        font-size: 11px;
      }
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;

      ion-badge {
        --background: rgba(16, 185, 129, 0.15);
        --color: var(--ion-color-primary, #10B981);
        border-radius: 8px;
        font-size: 12px;
        font-weight: 600;
        padding: 4px 10px;
      }
    }

    .description {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 12px;
      font-size: 14px;
      line-height: 1.5;
    }

    .exercise-count {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 12px;
      font-size: 14px;

      ion-icon {
        font-size: 18px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .start-button {
      margin-top: 12px;
      --border-radius: 8px;
      height: 44px;
      font-weight: 700;
      font-size: 15px;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .empty-card {
      margin: 0;
      max-width: 800px;
      width: 100%;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
    }

    .empty-content {
      text-align: center;
      padding: 32px 16px;

      .empty-icon {
        font-size: 48px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        margin-bottom: 20px;
        font-size: 14px;
        line-height: 1.5;
      }

      ion-button {
        --border-radius: 8px;
        --border-color: rgba(255, 255, 255, 0.1);
        font-weight: 600;
      }
    }
  `],
})
export class ClientTodayWorkoutCardComponent {
  workout = input<WorkoutWithExercises | null>();
}
