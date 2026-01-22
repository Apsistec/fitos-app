import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { OutcomePricingService, ClientGoal, GoalStatus } from '../../services/outcome-pricing.service';

/**
 * My Goals Page
 *
 * Displays all outcome goals for the current client.
 * Shows progress, milestones, and next verification dates.
 */
@Component({
  selector: 'fit-my-goals',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>My Goals</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()">
            <ion-icon name="refresh-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Segment Filter -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedStatus" (ionChange)="onStatusChange()">
          <ion-segment-button value="active">
            <ion-label>Active ({{ activeGoals().length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="achieved">
            <ion-label>Achieved ({{ achievedGoals().length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Empty State -->
      @if (filteredGoals().length === 0 && !isLoading()) {
        <div class="empty-state">
          <ion-icon name="trophy-outline" class="empty-icon"></ion-icon>
          <h2>No Goals Yet</h2>
          <p>Your trainer will set up outcome-based goals for you to track your progress.</p>
        </div>
      }

      <!-- Goals List -->
      @if (filteredGoals().length > 0) {
        <div class="goals-grid">
          @for (goal of filteredGoals(); track goal.id) {
            <ion-card (click)="viewGoal(goal)" button>
              <ion-card-header>
                <div class="card-header-content">
                  <ion-card-subtitle>{{ formatGoalType(goal.goal_type) }}</ion-card-subtitle>
                  <ion-chip [color]="getStatusColor(goal.status)" size="small">
                    <ion-label>{{ goal.status }}</ion-label>
                  </ion-chip>
                </div>
              </ion-card-header>

              <ion-card-content>
                <!-- Progress -->
                <div class="progress-section">
                  <div class="progress-values">
                    <div class="value-item">
                      <span class="label">Start</span>
                      <span class="value">{{ goal.start_value }} {{ goal.unit }}</span>
                    </div>
                    <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
                    <div class="value-item current">
                      <span class="label">Current</span>
                      <span class="value">{{ goal.current_value || goal.start_value }} {{ goal.unit }}</span>
                    </div>
                    <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
                    <div class="value-item">
                      <span class="label">Target</span>
                      <span class="value">{{ goal.target_value }} {{ goal.unit }}</span>
                    </div>
                  </div>

                  <!-- Progress Bar -->
                  <div class="progress-bar-container">
                    <div class="progress-bar">
                      <div
                        class="progress-fill"
                        [style.width.%]="calculateProgress(goal)"
                        [class.achieved]="goal.status === 'achieved'"
                      ></div>
                    </div>
                    <span class="progress-percent">{{ calculateProgress(goal).toFixed(0) }}%</span>
                  </div>

                  <!-- Milestones -->
                  <div class="milestones">
                    @for (milestone of [25, 50, 75, 100]; track milestone) {
                      <div
                        class="milestone"
                        [class.achieved]="calculateProgress(goal) >= milestone"
                      >
                        <ion-icon
                          [name]="calculateProgress(goal) >= milestone ? 'checkmark-circle' : 'ellipse-outline'"
                        ></ion-icon>
                        <span>{{ milestone }}%</span>
                      </div>
                    }
                  </div>
                </div>

                <!-- Target Date -->
                <div class="meta-info">
                  <ion-chip color="medium" size="small">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <ion-label>Target: {{ formatDate(goal.target_date) }}</ion-label>
                  </ion-chip>
                  @if (goal.last_verified_at) {
                    <ion-chip color="medium" size="small">
                      <ion-icon name="checkmark-done-outline"></ion-icon>
                      <ion-label>Last verified {{ formatRelativeDate(goal.last_verified_at) }}</ion-label>
                    </ion-chip>
                  }
                </div>

                @if (goal.notes) {
                  <p class="notes">{{ goal.notes }}</p>
                }
              </ion-card-content>
            </ion-card>
          }
        </div>
      }

      <!-- Loading State -->
      @if (isLoading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading your goals...</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      text-align: center;
      min-height: 400px;
    }

    .empty-icon {
      font-size: 96px;
      color: var(--ion-color-medium);
      margin-bottom: 24px;
    }

    .empty-state h2 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      max-width: 300px;
    }

    .goals-grid {
      padding: 16px;
      display: grid;
      gap: 16px;
    }

    ion-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s;
    }

    ion-card:hover {
      transform: translateY(-2px);
    }

    .card-header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .progress-section {
      margin-bottom: 16px;
    }

    .progress-values {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }

    .value-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }

    .value-item .label {
      font-size: 11px;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value-item .value {
      font-size: 16px;
      font-weight: 600;
    }

    .value-item.current .value {
      color: var(--fitos-accent-primary, #10B981);
      font-size: 18px;
    }

    .arrow-icon {
      color: var(--ion-color-medium);
      font-size: 16px;
    }

    .progress-bar-container {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }

    .progress-bar {
      flex: 1;
      height: 8px;
      background: var(--ion-color-step-100);
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: var(--fitos-accent-primary, #10B981);
      transition: width 0.3s ease;
    }

    .progress-fill.achieved {
      background: var(--ion-color-success);
    }

    .progress-percent {
      font-size: 14px;
      font-weight: 600;
      min-width: 40px;
      text-align: right;
    }

    .milestones {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .milestone {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      opacity: 0.5;
    }

    .milestone.achieved {
      opacity: 1;
    }

    .milestone ion-icon {
      font-size: 24px;
      color: var(--ion-color-medium);
    }

    .milestone.achieved ion-icon {
      color: var(--fitos-accent-primary, #10B981);
    }

    .milestone span {
      font-size: 11px;
      color: var(--ion-color-medium);
    }

    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 12px;
    }

    .notes {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--ion-border-color);
      color: var(--ion-color-medium);
      font-size: 14px;
      line-height: 1.5;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 48px 24px;
      min-height: 400px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }
  `]
})
export class MyGoalsPage implements OnInit {
  private readonly outcomePricingService = inject(OutcomePricingService);
  private readonly router = inject(Router);

  goals = signal<ClientGoal[]>([]);
  selectedStatus: 'active' | 'achieved' | 'all' = 'active';
  isLoading = signal(false);

  activeGoals = computed(() =>
    this.goals().filter(g => g.status === 'active')
  );

  achievedGoals = computed(() =>
    this.goals().filter(g => g.status === 'achieved')
  );

  filteredGoals = computed(() => {
    if (this.selectedStatus === 'active') {
      return this.activeGoals();
    } else if (this.selectedStatus === 'achieved') {
      return this.achievedGoals();
    }
    return this.goals();
  });

  ngOnInit() {
    this.loadGoals();
  }

  loadGoals() {
    this.isLoading.set(true);

    this.outcomePricingService.listGoals().subscribe({
      next: (goals) => {
        this.goals.set(goals);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load goals:', err);
        this.isLoading.set(false);
      }
    });
  }

  refresh() {
    this.loadGoals();
  }

  onStatusChange() {
    // Filter is handled by computed signal
  }

  viewGoal(goal: ClientGoal) {
    this.router.navigate(['/outcome-pricing/goals', goal.id]);
  }

  calculateProgress(goal: ClientGoal): number {
    return this.outcomePricingService.calculateProgressPercent(goal);
  }

  formatGoalType(type: string): string {
    const labels: Record<string, string> = {
      weight_loss: 'Weight Loss',
      strength_gain: 'Strength Gain',
      body_comp: 'Body Composition',
      consistency: 'Consistency',
      custom: 'Custom Goal'
    };
    return labels[type] || type;
  }

  getStatusColor(status: GoalStatus): string {
    const colors: Record<GoalStatus, string> = {
      active: 'primary',
      achieved: 'success',
      abandoned: 'warning',
      expired: 'danger'
    };
    return colors[status] || 'medium';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatRelativeDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  }
}
