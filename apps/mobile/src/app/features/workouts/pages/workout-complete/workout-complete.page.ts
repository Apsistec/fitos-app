import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircleOutline,
  trophyOutline,
  timeOutline,
  barbellOutline,
  flameOutline,
  shareOutline,
  homeOutline,
  ribbonOutline,
  arrowUpOutline,
} from 'ionicons/icons';
import { WorkoutSessionService } from '../../../../core/services/workout-session.service';
import { CelebrationService } from '../../../../core/services/celebration.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';

interface WorkoutSummary {
  name: string;
  duration: number;
  totalSets: number;
  totalReps: number;
  totalVolume: number;
  exerciseCount: number;
  rating?: number;
  notes?: string;
}

interface PersonalRecord {
  exerciseName: string;
  previousBest: number;
  newRecord: number;
  improvement: number;
  unit: string;
}

interface WorkoutSet {
  workout_exercise_id: string;
  reps_completed?: number | null;
  weight_used?: number | null;
}

@Component({
  selector: 'app-workout-complete',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonBadge,
    IonList,
    IonItem,
    IonLabel
],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Workout Complete!</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading workout summary...</p>
        </div>
      } @else {
        <div class="complete-container">
          <!-- Success Animation -->
          <div class="success-header">
            <div class="success-icon-container">
              <ion-icon name="checkmark-circle-outline" class="success-icon"></ion-icon>
            </div>
            <h1>Great Work!</h1>
            <p>You crushed your workout</p>
          </div>

          <!-- Workout Summary Card -->
          <ion-card class="summary-card">
            <ion-card-header>
              <ion-card-title>{{ summary().name || 'Workout' }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="stats-grid">
                <div class="stat">
                  <ion-icon name="time-outline"></ion-icon>
                  <div class="stat-value">{{ formatDuration(summary().duration) }}</div>
                  <div class="stat-label">Duration</div>
                </div>
                <div class="stat">
                  <ion-icon name="barbell-outline"></ion-icon>
                  <div class="stat-value">{{ summary().totalSets }}</div>
                  <div class="stat-label">Total Sets</div>
                </div>
                <div class="stat">
                  <ion-icon name="flame-outline"></ion-icon>
                  <div class="stat-value">{{ formatVolume(summary().totalVolume) }}</div>
                  <div class="stat-label">Volume</div>
                </div>
              </div>

              <div class="detail-row">
                <span class="detail-label">Exercises Completed</span>
                <span class="detail-value">{{ summary().exerciseCount }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Total Reps</span>
                <span class="detail-value">{{ summary().totalReps }}</span>
              </div>
              @if (summary().rating) {
                <div class="detail-row">
                  <span class="detail-label">Your Rating</span>
                  <span class="detail-value">{{ summary().rating }}/10</span>
                </div>
              }
            </ion-card-content>
          </ion-card>

          <!-- Personal Records -->
          @if (personalRecords().length > 0) {
            <ion-card class="pr-card">
              <ion-card-header>
                <div class="pr-header">
                  <ion-icon name="trophy-outline" class="pr-icon"></ion-icon>
                  <ion-card-title>Personal Records!</ion-card-title>
                </div>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  @for (pr of personalRecords(); track pr.exerciseName) {
                    <ion-item class="pr-item">
                      <ion-icon name="ribbon-outline" slot="start" class="ribbon-icon"></ion-icon>
                      <ion-label>
                        <h3>{{ pr.exerciseName }}</h3>
                        <p>
                          {{ pr.previousBest }} {{ pr.unit }} → {{ pr.newRecord }} {{ pr.unit }}
                        </p>
                      </ion-label>
                      <ion-badge slot="end" color="success">
                        <ion-icon name="arrow-up-outline"></ion-icon>
                        +{{ pr.improvement }}%
                      </ion-badge>
                    </ion-item>
                  }
                </ion-list>
              </ion-card-content>
            </ion-card>
          }

          <!-- Points Earned -->
          @if (pointsEarned() > 0) {
            <ion-card class="points-card">
              <ion-card-content>
                <div class="points-content">
                  <ion-icon name="flame-outline" class="points-icon"></ion-icon>
                  <div class="points-text">
                    <span class="points-value">+{{ pointsEarned() }}</span>
                    <span class="points-label">points earned</span>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Action Buttons -->
          <div class="action-buttons">
            <ion-button
              expand="block"
              fill="outline"
              (click)="shareWorkout()"
              aria-label="Share workout"
            >
              <ion-icon slot="start" name="share-outline"></ion-icon>
              Share Workout
            </ion-button>

            <ion-button
              expand="block"
              (click)="goToDashboard()"
              class="primary-button"
              aria-label="Return to dashboard"
            >
              <ion-icon slot="start" name="home-outline"></ion-icon>
              Back to Dashboard
            </ion-button>
          </div>
        </div>
      }
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

    .complete-container {
      max-width: 600px;
      margin: 0 auto;
      padding-bottom: 32px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;

      p {
        margin-top: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .success-header {
      text-align: center;
      padding: 32px 16px;
    }

    .success-icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
      margin-bottom: 16px;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
      }
      50% {
        transform: scale(1.05);
        box-shadow: 0 0 0 20px rgba(16, 185, 129, 0);
      }
    }

    .success-icon {
      font-size: 56px;
      color: var(--ion-color-primary, #10B981);
    }

    .success-header h1 {
      margin: 0 0 8px 0;
      font-size: 28px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .success-header p {
      margin: 0;
      font-size: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      margin: 0 0 16px 0;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .summary-card .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      padding: 16px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 16px;
    }

    .stat {
      text-align: center;

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary, #10B981);
        margin-bottom: 8px;
      }

      .stat-value {
        font-size: 24px;
        font-weight: 700;
        font-family: 'Space Mono', monospace;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .stat-label {
        font-size: 12px;
        color: var(--fitos-text-secondary, #A3A3A3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-top: 4px;
      }
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;

      .detail-label {
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }

      .detail-value {
        font-size: 14px;
        font-weight: 600;
        font-family: 'Space Mono', monospace;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .pr-card {
      border: 1px solid rgba(255, 215, 0, 0.3);
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.05), transparent);
    }

    .pr-header {
      display: flex;
      align-items: center;
      gap: 8px;

      .pr-icon {
        font-size: 24px;
        color: #FFD700;
      }
    }

    .pr-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;

      .ribbon-icon {
        color: #FFD700;
        font-size: 20px;
      }

      h3 {
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
        margin: 0 0 4px 0;
      }

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 13px;
        margin: 0;
      }

      ion-badge {
        font-weight: 600;
        padding: 6px 10px;

        ion-icon {
          font-size: 12px;
          margin-right: 2px;
        }
      }
    }

    .points-card {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
      border: 1px solid rgba(16, 185, 129, 0.3);
    }

    .points-content {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 8px;

      .points-icon {
        font-size: 32px;
        color: var(--ion-color-primary, #10B981);
      }

      .points-text {
        display: flex;
        flex-direction: column;
      }

      .points-value {
        font-size: 28px;
        font-weight: 700;
        font-family: 'Space Mono', monospace;
        color: var(--ion-color-primary, #10B981);
      }

      .points-label {
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    }

    .action-buttons {
      margin-top: 24px;
      display: flex;
      flex-direction: column;
      gap: 12px;

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 600;
      }

      .primary-button {
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `]
})
export class WorkoutCompletePage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private sessionService = inject(WorkoutSessionService);
  private celebration = inject(CelebrationService);
  private haptic = inject(HapticService);
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  loading = signal(true);
  summary = signal<WorkoutSummary>({
    name: '',
    duration: 0,
    totalSets: 0,
    totalReps: 0,
    totalVolume: 0,
    exerciseCount: 0,
  });
  personalRecords = signal<PersonalRecord[]>([]);
  pointsEarned = signal(0);

  constructor() {
    addIcons({
      checkmarkCircleOutline,
      trophyOutline,
      timeOutline,
      barbellOutline,
      flameOutline,
      shareOutline,
      homeOutline,
      ribbonOutline,
      arrowUpOutline,
    });
  }

  async ngOnInit() {
    const workoutId = this.route.snapshot.paramMap.get('id');

    // Trigger celebration immediately
    await this.celebration.workoutComplete();

    if (workoutId) {
      await this.loadWorkoutSummary(workoutId);
    } else {
      // Use mock data if no ID provided
      this.loadMockSummary();
    }
  }

  async loadWorkoutSummary(workoutId: string) {
    this.loading.set(true);

    try {
      const detail = await this.sessionService.getWorkoutDetail(workoutId);

      if (detail) {
        const { workout, sets } = detail;

        // Calculate summary
        const duration = workout.started_at && workout.completed_at
          ? Math.floor((new Date(workout.completed_at).getTime() - new Date(workout.started_at).getTime()) / 1000)
          : 0;

        const totalReps = sets.reduce((sum, set) => sum + (set.reps_completed || 0), 0);
        const totalVolume = sets.reduce((sum, set) => {
          const reps = set.reps_completed || 0;
          const weight = set.weight_used || 0;
          return sum + (reps * weight);
        }, 0);

        // Get unique exercises
        const exerciseIds = new Set(sets.map(s => s.workout_exercise_id));

        this.summary.set({
          name: workout.template?.name || 'Workout',
          duration,
          totalSets: sets.length,
          totalReps,
          totalVolume,
          exerciseCount: exerciseIds.size,
          rating: workout.rating || undefined,
          notes: workout.notes || undefined,
        });

        // Check for personal records against historical data
        await this.checkPersonalRecords(sets, workoutId);

        // Award points
        await this.awardPoints();
      }
    } catch (error) {
      console.error('Error loading workout summary:', error);
      this.loadMockSummary();
    } finally {
      this.loading.set(false);
    }
  }

  private loadMockSummary() {
    this.summary.set({
      name: 'Upper Body Push',
      duration: 2847, // ~47 minutes
      totalSets: 16,
      totalReps: 128,
      totalVolume: 12450,
      exerciseCount: 4,
      rating: 8,
    });

    // Mock personal records
    this.personalRecords.set([
      {
        exerciseName: 'Bench Press',
        previousBest: 185,
        newRecord: 195,
        improvement: 5,
        unit: 'lbs',
      },
    ]);

    this.pointsEarned.set(150);
    this.loading.set(false);
  }

  private async checkPersonalRecords(sets: WorkoutSet[], workoutId: string): Promise<void> {
    const prs: PersonalRecord[] = [];
    const userId = this.auth.user()?.id;
    if (!userId) return;

    // Group current sets by workout_exercise_id
    const exerciseSets = new Map<string, WorkoutSet[]>();
    for (const set of sets) {
      const existing = exerciseSets.get(set.workout_exercise_id) || [];
      existing.push(set);
      exerciseSets.set(set.workout_exercise_id, existing);
    }

    // Get workout_exercises for this workout to find exercise_ids and names
    const { data: workoutExercises } = await this.supabase.client
      .from('workout_exercises')
      .select('id, exercise_id, exercise:exercises(name)')
      .eq('workout_id', workoutId);

    if (!workoutExercises) return;

    // Build map: workout_exercise_id -> { exercise_id, name }
    const exerciseMap = new Map<string, { exerciseId: string; name: string }>();
    for (const we of workoutExercises) {
      const name = (we.exercise as unknown as { name: string } | null)?.name || 'Unknown Exercise';
      exerciseMap.set(we.id, { exerciseId: we.exercise_id, name });
    }

    // Collect unique exercise IDs for batch historical lookup
    const exerciseIds = new Set<string>();
    const currentMaxWeights = new Map<string, { maxWeight: number; name: string }>();

    for (const [workoutExerciseId, setsArr] of exerciseSets) {
      const exerciseInfo = exerciseMap.get(workoutExerciseId);
      if (!exerciseInfo) continue;

      const maxWeight = Math.max(...setsArr.map(s => s.weight_used || 0));
      if (maxWeight <= 0) continue;

      exerciseIds.add(exerciseInfo.exerciseId);
      const existing = currentMaxWeights.get(exerciseInfo.exerciseId);
      if (!existing || maxWeight > existing.maxWeight) {
        currentMaxWeights.set(exerciseInfo.exerciseId, { maxWeight, name: exerciseInfo.name });
      }
    }

    if (exerciseIds.size === 0) return;

    // Get all historical workout_exercise IDs for these exercises (excluding current workout)
    const { data: historicalWEs } = await this.supabase.client
      .from('workout_exercises')
      .select('id, exercise_id')
      .in('exercise_id', Array.from(exerciseIds))
      .neq('workout_id', workoutId);

    if (historicalWEs && historicalWEs.length > 0) {
      const historicalWEIds = historicalWEs.map(we => we.id);

      // Get max weight per exercise from historical sets
      const { data: historicalSets } = await this.supabase.client
        .from('workout_sets')
        .select('weight_used, workout_exercise_id')
        .in('workout_exercise_id', historicalWEIds)
        .not('weight_used', 'is', null)
        .order('weight_used', { ascending: false });

      // Build historical max per exercise_id
      const historicalMaxMap = new Map<string, number>();
      if (historicalSets) {
        for (const set of historicalSets) {
          const we = historicalWEs.find(w => w.id === set.workout_exercise_id);
          if (!we) continue;
          const current = historicalMaxMap.get(we.exercise_id) ?? 0;
          if ((set.weight_used ?? 0) > current) {
            historicalMaxMap.set(we.exercise_id, set.weight_used ?? 0);
          }
        }
      }

      // Compare current max vs historical max
      for (const [exerciseId, { maxWeight, name }] of currentMaxWeights) {
        const previousBest = historicalMaxMap.get(exerciseId) ?? 0;
        if (maxWeight > previousBest && previousBest > 0) {
          const improvement = Math.round(((maxWeight - previousBest) / previousBest) * 100);
          prs.push({
            exerciseName: name,
            previousBest,
            newRecord: maxWeight,
            improvement,
            unit: 'lbs',
          });
        }
      }
    }

    if (prs.length > 0) {
      this.personalRecords.set(prs);
      await this.celebration.personalRecord();
    }
  }

  private async awardPoints(): Promise<void> {
    const summary = this.summary();

    // Base points for completing a workout
    let points = 100;

    // Bonus for longer workouts
    if (summary.duration > 1800) points += 25; // 30+ minutes
    if (summary.duration > 3600) points += 25; // 60+ minutes

    // Bonus for volume
    if (summary.totalVolume > 10000) points += 25;
    if (summary.totalVolume > 20000) points += 25;

    // Bonus for PRs
    points += this.personalRecords().length * 50;

    this.pointsEarned.set(points);

    // Note: Points are tracked for display purposes
    // A future awardPoints() method in GamificationService could persist these
    console.log(`Workout completed! Points earned: ${points}`);
  }

  formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatVolume(volume: number): string {
    if (volume >= 1000) {
      return `${(volume / 1000).toFixed(1)}k`;
    }
    return volume.toString();
  }

  async shareWorkout() {
    await this.haptic.light();

    const summary = this.summary();
    const shareText = `Just completed my ${summary.name} workout! 💪\n\n` +
      `⏱ ${this.formatDuration(summary.duration)}\n` +
      `🏋️ ${summary.totalSets} sets, ${summary.totalReps} reps\n` +
      `📊 ${this.formatVolume(summary.totalVolume)} lbs total volume\n\n` +
      `#FitOS #Workout #FitnessJourney`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Workout Complete!',
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
        console.log('Share cancelled or failed');
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        // Would show toast here
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }

  async goToDashboard() {
    await this.haptic.light();
    this.router.navigate(['/tabs/dashboard']);
  }
}
