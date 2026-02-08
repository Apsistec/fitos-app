import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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
import { HapticService } from '../../../../core/services/haptic.service';
import { AuthService } from '../../../../core/services/auth.service';
import { JITAIService, JITAIContext } from '../../../../core/services/jitai.service';

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
    FormsModule,
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
    IonProgressBar,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
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
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .insights-container {
      padding: 16px;
      padding-bottom: 48px;
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
      margin: 0;
      padding: 8px;

      ion-segment-button {
        --indicator-color: var(--ion-color-primary, #10B981);
        --color: var(--fitos-text-secondary, #A3A3A3);
        --color-checked: var(--ion-color-primary, #10B981);
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

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
    }

    ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .jitai-context-card {
      background: linear-gradient(135deg, var(--fitos-bg-secondary, #1A1A1A) 0%, var(--fitos-bg-tertiary, #262626) 100%);
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .context-metrics {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .context-metric {
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;

        .metric-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        .metric-value {
          font-size: 14px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      ion-progress-bar {
        height: 8px;
        border-radius: 9999px;
        margin-bottom: 4px;
      }

      .metric-hint {
        margin: 0;
        font-size: 12px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
    }

    .progress-metric {
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;

        .metric-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fitos-text-secondary, #A3A3A3);
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
        gap: 4px;
        margin-bottom: 8px;

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        .metric-unit {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        .metric-target {
          font-size: 13px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      ion-progress-bar {
        height: 6px;
        border-radius: 9999px;
      }
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 24px 0 16px 0;
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary, #10B981);
      }
    }

    .empty-state {
      ion-card-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 48px 16px;
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--ion-color-success);
          margin-bottom: 16px;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 20px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        p {
          margin: 0 0 24px 0;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }
    }

    .insight-card {
      border-left: 4px solid rgba(255, 255, 255, 0.06);
      margin-bottom: 12px;

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
      margin-bottom: 12px;

      .insight-title-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;

        ion-icon {
          font-size: 24px;
          color: var(--ion-color-primary, #10B981);
        }

        h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
        }
      }

      ion-badge {
        text-transform: uppercase;
        font-size: 11px;
        letter-spacing: 0.5px;
      }
    }

    .insight-description {
      margin: 0 0 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .insight-metric {
      padding: 12px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
      margin-bottom: 12px;

      .metric-display {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;

        .metric-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--fitos-text-secondary, #A3A3A3);
        }

        .metric-value {
          font-size: 20px;
          font-weight: 700;
          font-family: 'Space Mono', monospace;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        .metric-target {
          font-size: 13px;
          color: var(--fitos-text-tertiary, #737373);
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
      padding: 12px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 8px;
      margin-bottom: 12px;

      strong {
        font-size: 13px;
        font-weight: 700;
        color: var(--ion-color-primary, #10B981);
        display: block;
        margin-bottom: 4px;
      }

      p {
        margin: 0;
        font-size: 13px;
        line-height: 1.5;
        color: var(--fitos-text-primary, #F5F5F5);
      }
    }

    .insight-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);

      ion-chip {
        margin: 0;
        font-size: 11px;
      }

      .insight-time {
        font-size: 11px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }
  `],
})
export class InsightsDashboardPage implements OnInit {
  private router = inject(Router);
  private haptic = inject(HapticService);
  private auth = inject(AuthService);
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
      const userId = this.auth.user()?.id;
      if (userId) {
        const context = await this.jitaiService.getContext(userId);
        this.jitaiContext.set(context);
      }
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
