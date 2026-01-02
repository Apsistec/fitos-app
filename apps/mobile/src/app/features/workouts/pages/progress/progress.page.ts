import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonItem,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { WorkoutSessionService } from '@app/core/services/workout-session.service';
import { ExerciseService } from '@app/core/services/exercise.service';
import { AuthService } from '@app/core/services/auth.service';
import type { Exercise } from '@fitos/shared';

Chart.register(...registerables);

interface ChartDataPoint {
  date: string;
  value: number;
}

@Component({
  selector: 'app-progress',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonItem,
    IonRefresher,
    IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Progress</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="progress-container">
        <!-- Chart Type Selector -->
        <ion-segment [value]="chartType()" (ionChange)="onChartTypeChange($event)">
          <ion-segment-button value="strength">
            <ion-label>Strength</ion-label>
          </ion-segment-button>
          <ion-segment-button value="volume">
            <ion-label>Volume</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Exercise Selector -->
        <ion-item class="exercise-selector">
          <ion-select
            [value]="selectedExerciseId()"
            (ionChange)="onExerciseChange($event)"
            label="Exercise"
            labelPlacement="floating"
            interface="action-sheet"
            placeholder="Select an exercise"
          >
            @for (exercise of exercises(); track exercise.id) {
              <ion-select-option [value]="exercise.id">
                {{ exercise.name }}
              </ion-select-option>
            }
          </ion-select>
        </ion-item>

        <!-- Chart Card -->
        @if (loading()) {
          <ion-card>
            <ion-card-content class="loading-card">
              <ion-spinner></ion-spinner>
              <p>Loading progress data...</p>
            </ion-card-content>
          </ion-card>
        } @else if (selectedExerciseId()) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                @if (chartType() === 'strength') {
                  Max Weight Progress
                } @else {
                  Total Volume Progress
                }
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="chart-container">
                <canvas #chartCanvas></canvas>
              </div>
              @if (!chartData().length) {
                <div class="no-data">
                  <p>No data yet for this exercise.</p>
                  <p class="hint">Complete some workouts to see your progress!</p>
                </div>
              }
            </ion-card-content>
          </ion-card>
        } @else {
          <ion-card>
            <ion-card-content class="empty-state">
              <p>Select an exercise to view your progress</p>
            </ion-card-content>
          </ion-card>
        }

        <!-- Stats Summary -->
        @if (selectedExerciseId() && chartData().length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Statistics</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="stats-grid">
                <div class="stat">
                  <div class="stat-label">Current</div>
                  <div class="stat-value">{{ currentValue() }} {{ unit() }}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Best</div>
                  <div class="stat-value">{{ maxValue() }} {{ unit() }}</div>
                </div>
                <div class="stat">
                  <div class="stat-label">Improvement</div>
                  <div class="stat-value">+{{ improvementPercent() }}%</div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .progress-container {
      max-width: 800px;
      margin: 0 auto;
    }

    ion-segment {
      margin-bottom: 16px;
    }

    .exercise-selector {
      --background: transparent;
      margin-bottom: 16px;
    }

    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }

    .loading-card,
    .empty-state {
      text-align: center;
      padding: 40px 20px;

      ion-spinner {
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .no-data {
      text-align: center;
      padding: 20px;

      p {
        color: var(--ion-color-medium);
        margin: 4px 0;
      }

      .hint {
        font-size: 0.875rem;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }

    .stat {
      text-align: center;

      .stat-label {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }
    }

    @media (max-width: 576px) {
      .stats-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `],
})
export class ProgressPage implements OnInit {
  @ViewChild('chartCanvas') chartCanvas?: ElementRef<HTMLCanvasElement>;

  private sessionService = inject(WorkoutSessionService);
  private exerciseService = inject(ExerciseService);
  private authService = inject(AuthService);

  chartType = signal<'strength' | 'volume'>('strength');
  selectedExerciseId = signal<string | null>(null);
  exercises = signal<Exercise[]>([]);
  chartData = signal<ChartDataPoint[]>([]);
  loading = signal(false);

  private chart: Chart | null = null;

  ngOnInit(): void {
    this.loadExercises();
  }

  async loadExercises(): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    this.loading.set(true);
    try {
      // Get exercises that the user has logged workouts for
      const sessions = await this.sessionService.getWorkoutHistory(userId, { limit: 100 });

      // Extract unique exercise IDs from completed sessions
      const exerciseIds = new Set<string>();
      for (const session of sessions) {
        for (const exercise of session.logged_exercises || []) {
          exerciseIds.add(exercise.exercise_id);
        }
      }

      // Fetch exercise details
      if (exerciseIds.size > 0) {
        const allExercises = await this.exerciseService.getExercises();
        const filteredExercises = allExercises.filter(ex => exerciseIds.has(ex.id));
        this.exercises.set(filteredExercises);

        // Auto-select first exercise
        if (filteredExercises.length > 0 && !this.selectedExerciseId()) {
          this.selectedExerciseId.set(filteredExercises[0].id);
          await this.loadChartData();
        }
      }
    } catch (error) {
      console.error('Error loading exercises:', error);
    } finally {
      this.loading.set(false);
    }
  }

  async loadChartData(): Promise<void> {
    const userId = this.authService.user()?.id;
    const exerciseId = this.selectedExerciseId();
    if (!userId || !exerciseId) return;

    this.loading.set(true);
    try {
      const data = await this.fetchProgressData(userId, exerciseId);
      this.chartData.set(data);

      // Wait for view to update
      setTimeout(() => {
        this.renderChart();
      }, 100);
    } catch (error) {
      console.error('Error loading chart data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private async fetchProgressData(userId: string, exerciseId: string): Promise<ChartDataPoint[]> {
    const sessions = await this.sessionService.getWorkoutHistory(userId, { limit: 50 });
    const dataPoints: ChartDataPoint[] = [];

    for (const session of sessions) {
      if (session.status !== 'completed') continue;

      const loggedExercise = session.logged_exercises?.find(ex => ex.exercise_id === exerciseId);
      if (!loggedExercise) continue;

      const date = new Date(session.completed_at || session.created_at).toLocaleDateString();

      if (this.chartType() === 'strength') {
        // Max weight for the exercise in this session
        const maxWeight = Math.max(
          ...loggedExercise.logged_sets.map(set => set.weight || 0)
        );
        if (maxWeight > 0) {
          dataPoints.push({ date, value: maxWeight });
        }
      } else {
        // Total volume (sets × reps × weight)
        const totalVolume = loggedExercise.logged_sets.reduce((sum, set) => {
          return sum + ((set.reps || 0) * (set.weight || 0));
        }, 0);
        if (totalVolume > 0) {
          dataPoints.push({ date, value: totalVolume });
        }
      }
    }

    // Sort by date (oldest first)
    return dataPoints.reverse();
  }

  private renderChart(): void {
    if (!this.chartCanvas?.nativeElement || !this.chartData().length) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = this.chartData();
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(d => d.date),
        datasets: [{
          label: this.chartType() === 'strength' ? 'Max Weight (lbs)' : 'Total Volume (lbs)',
          data: data.map(d => d.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  currentValue(): number {
    const data = this.chartData();
    return data.length > 0 ? data[data.length - 1].value : 0;
  }

  maxValue(): number {
    const data = this.chartData();
    return data.length > 0 ? Math.max(...data.map(d => d.value)) : 0;
  }

  improvementPercent(): number {
    const data = this.chartData();
    if (data.length < 2) return 0;

    const first = data[0].value;
    const current = data[data.length - 1].value;

    if (first === 0) return 0;
    return Math.round(((current - first) / first) * 100);
  }

  unit(): string {
    return this.chartType() === 'strength' ? 'lbs' : 'lbs';
  }

  onChartTypeChange(event: CustomEvent): void {
    this.chartType.set(event.detail.value);
    this.loadChartData();
  }

  onExerciseChange(event: CustomEvent): void {
    this.selectedExerciseId.set(event.detail.value);
    this.loadChartData();
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadChartData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
