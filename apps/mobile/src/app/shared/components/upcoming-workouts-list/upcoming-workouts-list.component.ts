import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonList,
  IonItem,
  IonLabel,
  IonSkeletonText,
  IonIcon,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { calendarOutline, timeOutline } from 'ionicons/icons';
addIcons({
  'calendar-outline': calendarOutline,
  'time-outline': timeOutline,
});

interface UpcomingWorkout {
  id: string;
  name: string;
  scheduled_date: string | null;
  scheduled_time?: string | null;
}

@Component({
  selector: 'app-upcoming-workouts-list',
  standalone: true,
  imports: [
    CommonModule,
    IonList,
    IonItem,
    IonLabel,
    IonSkeletonText,
    IonIcon,
    IonNote
],
  templateUrl: './upcoming-workouts-list.component.html',
  styleUrls: ['./upcoming-workouts-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpcomingWorkoutsListComponent {
  workouts = input<UpcomingWorkout[]>();
  loading = input<boolean>(false);
  workoutClicked = output<UpcomingWorkout>();

  constructor(private router: Router) {}

  onWorkoutClick(workout: UpcomingWorkout): void {
    this.workoutClicked.emit(workout);
  }

  formatDate(dateStr: string | null): string {
    if (!dateStr) return '';

    const date = new Date(dateStr);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset hours for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const tomorrowOnly = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
      return 'Today';
    } else if (dateOnly.getTime() === tomorrowOnly.getTime()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }

  getDayOfWeek(dateStr: string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
