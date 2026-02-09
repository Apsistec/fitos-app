import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSpinner,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  trendingUpOutline,
  calendarOutline,
  statsChartOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { NutritionService, NutritionSummary } from '../../../../core/services/nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';

// Adherence-neutral colors
const NUTRITION_COLORS = {
  CALORIES: '#6366F1',
  PROTEIN: '#22C55E',
  CARBS: '#F59E0B',
  FAT: '#EC4899',
} as const;

interface DayData {
  date: string;
  dayLabel: string;
  summary: NutritionSummary | null;
}

@Component({
  selector: 'app-nutrition-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSpinner,
    IonNote,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonBadge,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/nutrition"></ion-back-button>
        </ion-buttons>
        <ion-title>Nutrition History</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [value]="timeRange()" (ionChange)="onTimeRangeChange($event)">
          <ion-segment-button value="7">
            <ion-label>7 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="14">
            <ion-label>14 Days</ion-label>
          </ion-segment-button>
          <ion-segment-button value="30">
            <ion-label>30 Days</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="history-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading nutrition history...</p>
          </div>
        } @else {
          <!-- Period Averages Card -->
          <ion-card class="averages-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="stats-chart-outline"></ion-icon>
                {{ timeRange() }}-Day Averages
              </ion-card-title>
              <ion-note>Based on {{ daysWithData() }} days of logging</ion-note>
            </ion-card-header>
            <ion-card-content>
              <div class="averages-grid">
                <div class="avg-item">
                  <div class="avg-label">Calories</div>
                  <div class="avg-value" [style.color]="colors.CALORIES">
                    {{ periodAvg().calories }}
                  </div>
                  @if (targets()) {
                    <div class="avg-target">
                      of {{ targets()!.calories }}
                    </div>
                  }
                </div>
                <div class="avg-item">
                  <div class="avg-label">Protein</div>
                  <div class="avg-value" [style.color]="colors.PROTEIN">
                    {{ periodAvg().protein }}g
                  </div>
                  @if (targets()) {
                    <div class="avg-target">
                      of {{ targets()!.protein }}g
                    </div>
                  }
                </div>
                <div class="avg-item">
                  <div class="avg-label">Carbs</div>
                  <div class="avg-value" [style.color]="colors.CARBS">
                    {{ periodAvg().carbs }}g
                  </div>
                  @if (targets()) {
                    <div class="avg-target">
                      of {{ targets()!.carbs }}g
                    </div>
                  }
                </div>
                <div class="avg-item">
                  <div class="avg-label">Fat</div>
                  <div class="avg-value" [style.color]="colors.FAT">
                    {{ periodAvg().fat }}g
                  </div>
                  @if (targets()) {
                    <div class="avg-target">
                      of {{ targets()!.fat }}g
                    </div>
                  }
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Consistency Score -->
          <ion-card class="consistency-card">
            <ion-card-content>
              <div class="consistency-content">
                <div class="consistency-info">
                  <div class="consistency-label">Logging Consistency</div>
                  <div class="consistency-value">
                    {{ consistencyPercent() }}%
                  </div>
                </div>
                <div class="consistency-bar">
                  <div
                    class="consistency-fill"
                    [style.width.%]="consistencyPercent()"
                  ></div>
                </div>
                <ion-note>
                  {{ daysWithData() }} of {{ timeRange() }} days logged
                </ion-note>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Daily Breakdown (mini cards) -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="calendar-outline"></ion-icon>
                Daily Breakdown
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              @for (day of dayData(); track day.date) {
                <div class="day-row" [class.no-data]="!day.summary || day.summary.calories === 0">
                  <div class="day-label">{{ day.dayLabel }}</div>
                  @if (day.summary && day.summary.calories > 0) {
                    <div class="day-macros">
                      <span class="day-cal" [style.color]="colors.CALORIES">
                        {{ day.summary.calories }} cal
                      </span>
                      <span class="day-macro">P: {{ Math.round(day.summary.protein) }}g</span>
                      <span class="day-macro">C: {{ Math.round(day.summary.carbs) }}g</span>
                      <span class="day-macro">F: {{ Math.round(day.summary.fat) }}g</span>
                    </div>
                  } @else {
                    <ion-note class="day-empty">No data</ion-note>
                  }
                </div>
              }
            </ion-card-content>
          </ion-card>

          <!-- Encouraging message -->
          <ion-card>
            <ion-card-content>
              <p class="context-message">
                💡 Consistency matters more than perfection.
                Tracking most days gives you better insight than tracking every single day.
              </p>
            </ion-card-content>
          </ion-card>
        }
      </div>
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

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
    }

    ion-segment-button {
      --indicator-color: var(--ion-color-primary, #10B981);
      --color: var(--fitos-text-secondary, #A3A3A3);
      --color-checked: var(--ion-color-primary, #10B981);
    }

    .history-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
      padding-bottom: 32px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
    }

    .loading-state p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      margin: 0 0 16px 0;
    }

    ion-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-card-header ion-note {
      margin-top: 4px;
      font-size: 13px;
    }

    .averages-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .avg-item {
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 10px;
      text-align: center;
    }

    .avg-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 8px;
    }

    .avg-value {
      font-size: 24px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      line-height: 1;
    }

    .avg-target {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 4px;
    }

    .consistency-card {
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    .consistency-content {
      padding: 8px 0;
    }

    .consistency-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .consistency-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .consistency-value {
      font-size: 28px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
      color: var(--ion-color-primary, #10B981);
    }

    .consistency-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .consistency-fill {
      height: 100%;
      background: var(--ion-color-primary, #10B981);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .day-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }

    .day-row:last-child {
      border-bottom: none;
    }

    .day-row.no-data {
      opacity: 0.5;
    }

    .day-label {
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      min-width: 70px;
    }

    .day-macros {
      display: flex;
      gap: 8px;
      align-items: center;
      flex-wrap: wrap;
      justify-content: flex-end;
    }

    .day-cal {
      font-size: 13px;
      font-weight: 700;
      font-family: 'Space Mono', monospace;
    }

    .day-macro {
      font-size: 11px;
      padding: 2px 6px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 4px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-family: 'Space Mono', monospace;
    }

    .day-empty {
      font-size: 13px;
      font-style: italic;
    }

    .context-message {
      margin: 0;
      line-height: 1.6;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 13px;
    }
  `],
})
export class NutritionHistoryPage implements OnInit {
  private nutritionService = inject(NutritionService);
  private auth = inject(AuthService);

  Math = Math;
  colors = NUTRITION_COLORS;

  loading = signal(false);
  timeRange = signal('7');
  dayData = signal<DayData[]>([]);

  targets = computed(() => {
    const days = this.dayData();
    const withTargets = days.find(d => d.summary?.targets);
    return withTargets?.summary?.targets ?? null;
  });

  daysWithData = computed(() => {
    return this.dayData().filter(d => d.summary && d.summary.calories > 0).length;
  });

  consistencyPercent = computed(() => {
    const range = parseInt(this.timeRange(), 10);
    const logged = this.daysWithData();
    return range > 0 ? Math.round((logged / range) * 100) : 0;
  });

  periodAvg = computed(() => {
    const days = this.dayData().filter(d => d.summary && d.summary.calories > 0);
    if (days.length === 0) return { calories: 0, protein: 0, carbs: 0, fat: 0 };

    const totals = days.reduce(
      (acc, d) => ({
        calories: acc.calories + (d.summary?.calories ?? 0),
        protein: acc.protein + (d.summary?.protein ?? 0),
        carbs: acc.carbs + (d.summary?.carbs ?? 0),
        fat: acc.fat + (d.summary?.fat ?? 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    return {
      calories: Math.round(totals.calories / days.length),
      protein: Math.round(totals.protein / days.length),
      carbs: Math.round(totals.carbs / days.length),
      fat: Math.round(totals.fat / days.length),
    };
  });

  constructor() {
    addIcons({
      trendingUpOutline,
      calendarOutline,
      statsChartOutline,
      chevronBackOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit() {
    this.loadHistory();
  }

  onTimeRangeChange(event: any) {
    this.timeRange.set(event.detail.value);
    this.loadHistory();
  }

  async loadHistory() {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.loading.set(true);

    try {
      const range = parseInt(this.timeRange(), 10);
      const today = new Date();
      // Fetch daily summaries for the period in parallel
      const promises = [];
      for (let i = 0; i < range; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(
          this.nutritionService.getDailySummary(userId, dateStr).then(summary => ({
            date: dateStr,
            dayLabel: this.formatDayLabel(date),
            summary,
          }))
        );
      }

      const results = await Promise.all(promises);
      this.dayData.set(results);
    } catch (error) {
      console.error('Error loading nutrition history:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private formatDayLabel(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }
}
