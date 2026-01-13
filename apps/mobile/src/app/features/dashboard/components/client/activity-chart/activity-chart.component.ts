import { Component, Input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface ActivityData {
  date: string;
  workouts: number;
  nutrition: number;
}

@Component({
  selector: 'app-activity-chart',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Weekly Activity</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <div class="chart-container">
          @for (day of activityData(); track day.date) {
            <div class="day-bar">
              <div class="bars">
                <div
                  class="bar workout-bar"
                  [style.height.%]="(day.workouts / maxValue()) * 100">
                </div>
                <div
                  class="bar nutrition-bar"
                  [style.height.%]="(day.nutrition / maxValue()) * 100">
                </div>
              </div>
              <div class="day-label">{{ getDayLabel(day.date) }}</div>
            </div>
          }
        </div>
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot workout"></span>
            <span class="legend-label">Workouts</span>
          </div>
          <div class="legend-item">
            <span class="legend-dot nutrition"></span>
            <span class="legend-label">Nutrition</span>
          </div>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .chart-container {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 200px;
      padding: 16px 0;
      margin-bottom: 16px;
    }

    .day-bar {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .bars {
      display: flex;
      gap: 4px;
      align-items: flex-end;
      height: 160px;
      width: 100%;
      justify-content: center;
    }

    .bar {
      width: 12px;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.3s ease;
    }

    .workout-bar {
      background: var(--fitos-accent-primary, #10B981);
    }

    .nutrition-bar {
      background: var(--ion-color-primary, #3880ff);
    }

    .day-label {
      font-size: 12px;
      color: var(--ion-color-medium);
      text-transform: uppercase;
    }

    .legend {
      display: flex;
      gap: 16px;
      justify-content: center;
      margin-top: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .legend-dot.workout {
      background: var(--fitos-accent-primary, #10B981);
    }

    .legend-dot.nutrition {
      background: var(--ion-color-primary, #3880ff);
    }

    .legend-label {
      font-size: 12px;
      color: var(--ion-color-medium);
    }
  `]
})
export class ActivityChartComponent implements OnInit {
  @Input() userId?: string;

  activityData = signal<ActivityData[]>([]);
  maxValue = signal(10);

  ngOnInit() {
    this.loadActivityData();
  }

  private loadActivityData() {
    // Generate last 7 days of mock data
    const data: ActivityData[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      data.push({
        date: date.toISOString(),
        workouts: Math.floor(Math.random() * 3),
        nutrition: Math.floor(Math.random() * 5)
      });
    }

    this.activityData.set(data);

    // Calculate max value for scaling
    const max = Math.max(
      ...data.map(d => Math.max(d.workouts, d.nutrition)),
      5 // Minimum scale
    );
    this.maxValue.set(max);
  }

  getDayLabel(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  }
}
