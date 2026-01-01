import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterLink } from '@angular/router';
import type { WorkoutWithExercises } from '../../../../core/services/workout.service';

@Component({
  selector: 'app-client-today-workout-card',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterLink],
  template: `
    @if (workout(); as workout) {
      <ion-card class="workout-card">
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
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
    }

    .description {
      color: var(--ion-color-medium);
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }

    .exercise-count {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--ion-color-medium);
      margin-bottom: 1rem;

      ion-icon {
        font-size: 1.2rem;
      }
    }

    .start-button {
      margin-top: 1rem;
    }

    .empty-card {
      margin: 0;
    }

    .empty-content {
      text-align: center;
      padding: 2rem 1rem;

      .empty-icon {
        font-size: 4rem;
        color: var(--ion-color-medium);
        margin-bottom: 1rem;
      }

      h3 {
        margin: 0 0 0.5rem 0;
        color: var(--ion-color-dark);
      }

      p {
        color: var(--ion-color-medium);
        margin-bottom: 1.5rem;
      }
    }
  `],
})
export class ClientTodayWorkoutCardComponent {
  workout = input<WorkoutWithExercises | null>();
}
