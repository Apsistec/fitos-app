import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonChip,
  IonText,
  IonProgressBar,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  sparklesOutline,
  trendingUpOutline,
  trendingDownOutline,
  alertCircleOutline,
  checkmarkCircleOutline,
  fitnessOutline,
  nutritionOutline,
  bedOutline,
  flameOutline,
  refreshOutline,
  chatbubbleOutline,
} from 'ionicons/icons';
import { HapticService } from '@app/core/services/haptic.service';
import { JITAIService, JITAIContext } from '@app/core/services/jitai.service';

export type InsightCategory = 'workout' | 'nutrition' | 'recovery' | 'adherence' | 'all';
export type InsightSeverity = 'info' | 'success' | 'warning' | 'critical';

export interface Insight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  description: string;
  recommendation?: string;
  metric?: {
    label: string;
    value: number;
    unit: string;
    trend?: 'up' | 'down' | 'stable';
    target?: number;
  };
  createdAt: Date;
  actionable: boolean;
  actionLabel?: string;
  actionRoute?: string;
}

export interface ProgressMetric {
  label: string;
  current: number;
  target: number;
  unit: string;
  progress: number; // 0-1
  trend: 'up' | 'down' | 'stable';
  color: string;
}

/**
 * InsightsDashboardPage - AI-powered coaching insights
 *
 * Features:
 * - JITAI context visualization (vulnerability, receptivity, opportunity)
 * - AI-generated insights and recommendations
 * - Progress tracking across domains
 * - Trend analysis
 * - Actionable recommendations
 * - Category filtering
 */
@Component({
  selector: 'app-insights-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonChip,
    IonText,
    IonProgressBar,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/coaching"></ion-back-button>
        </ion-buttons>
        <ion-title>AI Insights</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="refresh()" aria-label="Refresh insights">
            <ion-icon slot="icon-only" name="refresh-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Category Filter -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedCategory" (ionChange)="handleCategoryChange()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="workout">
            <ion-icon name="fitness-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="nutrition">
            <ion-icon name="nutrition-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="recovery">
            <ion-icon name="bed-outline"></ion-icon>
          </ion-segment-button>
          <ion-segment-button value="adherence">
            <ion-icon name="flame-outline"></ion-icon>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="insights-container">
        <!-- JITAI Context Card -->
        @if (jitaiContext()) {
          <ion-card class="jitai-context-card">
            <ion-card-header>
              <div class="card-header-with-badge">
                <ion-card-title>AI Coach Status</ion-card-title>
                <ion-badge [color]="getContextBadgeColor()">
                  {{ getContextStatus() }}
                </ion-badge>
              </div>
            </ion-card-header>
            <ion-card-content>
              <div class="context-metrics">
                <!-- Vulnerability -->
                <div class="context-metric">
                  <div class="metric-header">
                    <span class="metric-label">Risk Level</span>
                    <span class="metric-value">{{ formatPercent(jitaiContext()!.vulnerability) }}%</span>
                  </div>
                  <ion-progress-bar
                    [value]="jitaiContext()!.vulnerability"
                    [color]="getVulnerabilityColor(jitaiContext()!.vulnerability)"
                  ></ion-progress-bar>
                  <p class="metric-hint">Likelihood of skipping workouts</p>
                </div>

                <!-- Receptivity -->
                <div class="context-metric">
                  <div class="metric-header">
                    <span class="metric-label">Receptivity</span>
                    <span class="metric-value">{{ formatPercent(jitaiContext()!.receptivity) }}%</span>
                  </div>
                  <ion-progress-bar
                    [value]="jitaiContext()!.receptivity"
                    color="success"
                  ></ion-progress-bar>
                  <p class="metric-hint">Willingness to engage with coaching</p>
                </div>

                <!-- Opportunity -->
                <div class="context-metric">
                  <div class="metric-header">
                    <span class="metric-label">Opportunity</span>
                    <span class="metric-value">{{ formatPercent(jitaiContext()!.opportunity) }}%</span>
                  </div>
                  <ion-progress-bar
                    [value]="jitaiContext()!.opportunity"
                    color="tertiary"
                  ></ion-progress-bar>
                  <p class="metric-hint">Current context allows action</p>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- Progress Overview -->
        @if (progressMetrics().length > 0) {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Progress Overview</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="progress-grid">
                @for (metric of progressMetrics(); track metric.label) {
                  <div class="progress-metric">
                    <div class="metric-header">
                      <span class="metric-label">{{ metric.label }}</span>
                      <ion-icon
                        [name]="getTrendIcon(metric.trend)"
                        [class]="'trend-' + metric.trend"
                      ></ion-icon>
                    </div>
                    <div class="metric-value-row">
                      <span class="metric-value">{{ metric.current }}</span>
                      <span class="metric-unit">{{ metric.unit }}</span>
                      <span class="metric-target">/ {{ metric.target }}</span>
                    </div>
                    <ion-progress-bar
                      [value]="metric.progress"
                      [style.--progress-background]="metric.color"
                    ></ion-progress-bar>
                  </div>
                }
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- AI Insights -->
        <div class="insights-section">
          <h2 class="section-title">
            <ion-icon name="sparkles-outline"></ion-icon>
            AI Insights & Recommendations
          </h2>

          @if (filteredInsights().length === 0) {
            <ion-card class="empty-state">
              <ion-card-content>
                <ion-icon name="checkmark-circle-outline"></ion-icon>
                <h3>All Looking Good!</h3>
                <p>No urgent insights at the moment. Keep up the great work!</p>
                <ion-button fill="outline" (click)="openAIChat()">
                  <ion-icon slot="start" name="chatbubble-outline"></ion-icon>
                  Chat with AI Coach
                </ion-button>
              </ion-card-content>
            </ion-card>
          } @else {
            @for (insight of filteredInsights(); track insight.id) {
              <ion-card [class]="'insight-card severity-' + insight.severity">
                <ion-card-content>
                  <div class="insight-header">
                    <div class="insight-title-row">
                      <ion-icon [name]="getCategoryIcon(insight.category)"></ion-icon>
                      <h3>{{ insight.title }}</h3>
                    </div>
                    <ion-badge [color]="getSeverityColor(insight.severity)">
                      {{ insight.severity }}
                    </ion-badge>
                  </div>

                  <p class="insight-description">{{ insight.description }}</p>

                  @if (insight.metric) {
                    <div class="insight-metric">
                      <div class="metric-display">
                        <span class="metric-label">{{ insight.metric.label }}:</span>
                        <span class="metric-value">
                          {{ insight.metric.value }}{{ insight.metric.unit }}
                        </span>
                        @if (insight.metric.target) {
                          <span class="metric-target">(target: {{ insight.metric.target }}{{ insight.metric.unit }})</span>
                        }
                        @if (insight.metric.trend) {
                          <ion-icon
                            [name]="getTrendIcon(insight.metric.trend)"
                            [class]="'trend-' + insight.metric.trend"
                          ></ion-icon>
                        }
                      </div>
                    </div>
                  }

                  @if (insight.recommendation) {
                    <div class="insight-recommendation">
                      <strong>Recommendation:</strong>
                      <p>{{ insight.recommendation }}</p>
                    </div>
                  }

                  @if (insight.actionable && insight.actionLabel) {
                    <ion-button
                      expand="block"
                      fill="outline"
                      (click)="handleInsightAction(insight)"
                    >
                      {{ insight.actionLabel }}
                    </ion-button>
                  }

                  <div class="insight-footer">
                    <ion-chip size="small" outline="true">
                      <ion-label>{{ getCategoryLabel(insight.category) }}</ion-label>
                    </ion-chip>
                    <span class="insight-time">{{ formatTime(insight.createdAt) }}</span>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          }
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .insights-container {
      padding: var(--fitos-space-4);
      padding-bottom: var(--fitos-space-8);
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary);
      margin: 0;
      padding: var(--fitos-space-2);

      ion-segment-button {
        --indicator-color: var(--fitos-accent-primary);
        --color: var(--fitos-text-secondary);
        --color-checked: var(--fitos-accent-primary);
        min-height: 40px;

        ion-icon {
          font-size: 20px;
        }
      }
    }

    .card-header-with-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .jitai-context-card {
      background: linear-gradient(135deg, var(--fitos-bg-secondary) 0%, var(--fitos-bg-tertiary) 100%);
      border: 1px solid var(--fitos-border-subtle);
    }

    .context-metrics {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-4);
    }

    .context-metric {
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-2);

        .metric-label {
          font-size: var(--fitos-text-sm);
          font-weight: 600;
          color: var(--fitos-text-primary);
        }

        .metric-value {
          font-size: var(--fitos-text-base);
          font-weight: 700;
          color: var(--fitos-text-primary);
        }
      }

      ion-progress-bar {
        height: 8px;
        border-radius: var(--fitos-radius-full);
        margin-bottom: var(--fitos-space-1);
      }

      .metric-hint {
        margin: 0;
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
      }
    }

    .progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--fitos-space-4);
    }

    .progress-metric {
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: var(--fitos-space-1);

        .metric-label {
          font-size: var(--fitos-text-sm);
          font-weight: 600;
          color: var(--fitos-text-secondary);
        }

        ion-icon {
          font-size: 20px;

          &.trend-up {
            color: var(--ion-color-success);
          }

          &.trend-down {
            color: var(--ion-color-danger);
          }

          &.trend-stable {
            color: var(--ion-color-medium);
          }
        }
      }

      .metric-value-row {
        display: flex;
        align-items: baseline;
        gap: var(--fitos-space-1);
        margin-bottom: var(--fitos-space-2);

        .metric-value {
          font-size: var(--fitos-text-2xl);
          font-weight: 700;
          color: var(--fitos-text-primary);
        }

        .metric-unit {
          font-size: var(--fitos-text-sm);
          color: var(--fitos-text-secondary);
        }

        .metric-target {
          font-size: var(--fitos-text-sm);
          color: var(--fitos-text-tertiary);
        }
      }

      ion-progress-bar {
        height: 6px;
        border-radius: var(--fitos-radius-full);
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: var(--fitos-space-2);
      margin: var(--fitos-space-6) 0 var(--fitos-space-4) 0;
      font-size: var(--fitos-text-lg);
      font-weight: 700;
      color: var(--fitos-text-primary);

      ion-icon {
        font-size: 24px;
        color: var(--fitos-accent-primary);
      }
    }

    .empty-state {
      ion-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: var(--fitos-space-8) var(--fitos-space-4);
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--ion-color-success);
          margin-bottom: var(--fitos-space-4);
        }

        h3 {
          margin: 0 0 var(--fitos-space-2) 0;
          font-size: var(--fitos-text-xl);
          font-weight: 600;
          color: var(--fitos-text-primary);
        }

        p {
          margin: 0 0 var(--fitos-space-6) 0;
          color: var(--fitos-text-secondary);
        }
      }
    }

    .insight-card {
      border-left: 4px solid var(--fitos-border-subtle);
      margin-bottom: var(--fitos-space-3);

      &.severity-critical {
        border-left-color: var(--ion-color-danger);
      }

      &.severity-warning {
        border-left-color: var(--ion-color-warning);
      }

      &.severity-success {
        border-left-color: var(--ion-color-success);
      }

      &.severity-info {
        border-left-color: var(--ion-color-primary);
      }
    }

    .insight-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: var(--fitos-space-3);

      .insight-title-row {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);
        flex: 1;

        ion-icon {
          font-size: 24px;
          color: var(--fitos-accent-primary);
        }

        h3 {
          margin: 0;
          font-size: var(--fitos-text-lg);
          font-weight: 600;
          color: var(--fitos-text-primary);
        }
      }

      ion-badge {
        text-transform: uppercase;
        font-size: var(--fitos-text-xs);
      }
    }

    .insight-description {
      margin: 0 0 var(--fitos-space-3) 0;
      font-size: var(--fitos-text-base);
      line-height: 1.6;
      color: var(--fitos-text-secondary);
    }

    .insight-metric {
      padding: var(--fitos-space-3);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);
      margin-bottom: var(--fitos-space-3);

      .metric-display {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-2);
        flex-wrap: wrap;

        .metric-label {
          font-size: var(--fitos-text-sm);
          font-weight: 600;
          color: var(--fitos-text-secondary);
        }

        .metric-value {
          font-size: var(--fitos-text-xl);
          font-weight: 700;
          color: var(--fitos-text-primary);
        }

        .metric-target {
          font-size: var(--fitos-text-sm);
          color: var(--fitos-text-tertiary);
        }

        ion-icon {
          font-size: 20px;

          &.trend-up {
            color: var(--ion-color-success);
          }

          &.trend-down {
            color: var(--ion-color-danger);
          }

          &.trend-stable {
            color: var(--ion-color-medium);
          }
        }
      }
    }

    .insight-recommendation {
      padding: var(--fitos-space-3);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: var(--fitos-radius-md);
      margin-bottom: var(--fitos-space-3);

      strong {
        font-size: var(--fitos-text-sm);
        font-weight: 700;
        color: var(--ion-color-primary);
        display: block;
        margin-bottom: var(--fitos-space-1);
      }

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
        line-height: 1.5;
        color: var(--fitos-text-primary);
      }
    }

    .insight-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: var(--fitos-space-3);
      padding-top: var(--fitos-space-3);
      border-top: 1px solid var(--fitos-border-subtle);

      ion-chip {
        margin: 0;
        font-size: var(--fitos-text-xs);
      }

      .insight-time {
        font-size: var(--fitos-text-xs);
        color: var(--fitos-text-tertiary);
      }
    }
  `],
})
export class InsightsDashboardPage implements OnInit {
  private router = inject(Router);
  private haptic = inject(HapticService);
  private jitaiService = inject(JITAIService);

  // State
  jitaiContext = signal<JITAIContext | null>(null);
  insights = signal<Insight[]>([]);
  filteredInsights = signal<Insight[]>([]);
  progressMetrics = signal<ProgressMetric[]>([]);
  selectedCategory = signal<InsightCategory>('all');
  loading = signal(false);

  constructor() {
    addIcons({
      sparklesOutline,
      trendingUpOutline,
      trendingDownOutline,
      alertCircleOutline,
      checkmarkCircleOutline,
      fitnessOutline,
      nutritionOutline,
      bedOutline,
      flameOutline,
      refreshOutline,
      chatbubbleOutline,
    });
  }

  ngOnInit(): void {
    this.loadData();
  }

  async loadData(): Promise<void> {
    this.loading.set(true);

    // Load JITAI context
    try {
      const context = await this.jitaiService.getContext('test-user');
      this.jitaiContext.set(context);
    } catch (err) {
      console.error('Error loading JITAI context:', err);
    }

    // Load insights (mock data for now)
    this.loadMockInsights();

    // Load progress metrics (mock data for now)
    this.loadMockProgressMetrics();

    this.loading.set(false);
  }

  loadMockInsights(): void {
    const mockInsights: Insight[] = [
      {
        id: 'insight_1',
        category: 'workout',
        severity: 'warning',
        title: 'Progressive Overload Opportunity',
        description: "You've completed 3 consecutive sessions at the same weight. Time to increase the load!",
        recommendation: 'Increase bench press weight by 5 lbs (2.5kg) next session. Focus on maintaining proper form.',
        metric: {
          label: 'Bench Press',
          value: 185,
          unit: 'lbs',
          trend: 'stable',
          target: 200,
        },
        createdAt: new Date(),
        actionable: true,
        actionLabel: 'Update Workout Plan',
        actionRoute: '/workouts/builder',
      },
      {
        id: 'insight_2',
        category: 'nutrition',
        severity: 'success',
        title: 'Protein Intake On Target',
        description: 'Great work! Your protein intake has been consistently meeting your goals this week.',
        metric: {
          label: 'Avg Daily Protein',
          value: 165,
          unit: 'g',
          trend: 'up',
          target: 160,
        },
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        actionable: false,
      },
      {
        id: 'insight_3',
        category: 'recovery',
        severity: 'critical',
        title: 'Sleep Quality Declining',
        description: 'Your average sleep duration has dropped to 5.5 hours over the past 3 nights. This may impact recovery and performance.',
        recommendation: 'Aim for 7-8 hours of sleep tonight. Consider setting a consistent bedtime and avoiding screens 1 hour before sleep.',
        metric: {
          label: '3-Day Avg Sleep',
          value: 5.5,
          unit: 'hrs',
          trend: 'down',
          target: 7.5,
        },
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        actionable: true,
        actionLabel: 'View Sleep Tips',
        actionRoute: '/coaching/chat',
      },
      {
        id: 'insight_4',
        category: 'adherence',
        severity: 'info',
        title: 'Workout Consistency Strong',
        description: "You've hit 90% of your planned workouts this month. Keep up the excellent consistency!",
        metric: {
          label: 'Monthly Adherence',
          value: 90,
          unit: '%',
          trend: 'up',
        },
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        actionable: false,
      },
    ];

    this.insights.set(mockInsights);
    this.applyFilters();
  }

  loadMockProgressMetrics(): void {
    const metrics: ProgressMetric[] = [
      {
        label: 'Workouts This Week',
        current: 4,
        target: 5,
        unit: 'sessions',
        progress: 0.8,
        trend: 'up',
        color: 'var(--ion-color-primary)',
      },
      {
        label: 'Avg Daily Protein',
        current: 165,
        target: 160,
        unit: 'g',
        progress: 1.0,
        trend: 'up',
        color: 'var(--ion-color-success)',
      },
      {
        label: 'Sleep Quality',
        current: 6.2,
        target: 7.5,
        unit: 'hrs',
        progress: 0.83,
        trend: 'down',
        color: 'var(--ion-color-warning)',
      },
      {
        label: 'Recovery Score',
        current: 75,
        target: 80,
        unit: '%',
        progress: 0.94,
        trend: 'stable',
        color: 'var(--ion-color-tertiary)',
      },
    ];

    this.progressMetrics.set(metrics);
  }

  handleCategoryChange(): void {
    this.haptic.light();
    this.applyFilters();
  }

  applyFilters(): void {
    const category = this.selectedCategory();
    if (category === 'all') {
      this.filteredInsights.set(this.insights());
    } else {
      this.filteredInsights.set(
        this.insights().filter(i => i.category === category)
      );
    }
  }

  async refresh(): Promise<void> {
    await this.haptic.light();
    await this.loadData();
  }

  async handleRefresh(event: any): Promise<void> {
    await this.loadData();
    event.target.complete();
  }

  handleInsightAction(insight: Insight): void {
    this.haptic.light();
    if (insight.actionRoute) {
      this.router.navigate([insight.actionRoute]);
    }
  }

  openAIChat(): void {
    this.haptic.light();
    this.router.navigate(['/coaching/chat']);
  }

  getContextStatus(): string {
    const context = this.jitaiContext();
    if (!context) return 'Unknown';

    if (this.jitaiService.shouldIntervene(context)) {
      return 'Active';
    } else if (context.vulnerability > 0.4) {
      return 'Monitoring';
    } else {
      return 'On Track';
    }
  }

  getContextBadgeColor(): string {
    const context = this.jitaiContext();
    if (!context) return 'medium';

    if (this.jitaiService.shouldIntervene(context)) {
      return 'warning';
    } else if (context.vulnerability > 0.4) {
      return 'primary';
    } else {
      return 'success';
    }
  }

  getVulnerabilityColor(value: number): string {
    if (value >= 0.7) return 'danger';
    if (value >= 0.5) return 'warning';
    return 'success';
  }

  getCategoryIcon(category: InsightCategory): string {
    const icons: Record<InsightCategory, string> = {
      workout: 'fitness-outline',
      nutrition: 'nutrition-outline',
      recovery: 'bed-outline',
      adherence: 'flame-outline',
      all: 'sparkles-outline',
    };
    return icons[category];
  }

  getCategoryLabel(category: InsightCategory): string {
    const labels: Record<InsightCategory, string> = {
      workout: 'Workout',
      nutrition: 'Nutrition',
      recovery: 'Recovery',
      adherence: 'Adherence',
      all: 'All',
    };
    return labels[category];
  }

  getSeverityColor(severity: InsightSeverity): string {
    const colors: Record<InsightSeverity, string> = {
      critical: 'danger',
      warning: 'warning',
      success: 'success',
      info: 'primary',
    };
    return colors[severity];
  }

  getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
    const icons = {
      up: 'trending-up-outline',
      down: 'trending-down-outline',
      stable: 'remove-outline',
    };
    return icons[trend];
  }

  formatPercent(value: number): number {
    return Math.round(value * 100);
  }

  formatTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }
}
