import {  Component, OnInit, inject, signal, computed , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonList,
  IonLabel,
  IonRefresher,
  IonRefresherContent,
  IonSegment,
  IonSegmentButton,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  nutritionOutline,
  trendingUpOutline,
  calendarOutline,
  trashOutline,
  chevronBackOutline,
  chevronForwardOutline,
} from 'ionicons/icons';
import { NutritionService, type NutritionSummary, type NutritionLogWithEntries } from '../../../../core/services/nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';

// Adherence-neutral colors (no red for "over target")
const NUTRITION_COLORS = {
  CALORIES: '#6366F1', // Indigo
  PROTEIN: '#22C55E', // Green
  CARBS: '#F59E0B', // Amber
  FAT: '#EC4899', // Pink
  NEUTRAL: '#6B7280', // Gray
} as const;

addIcons({
  addOutline,
  nutritionOutline,
  trendingUpOutline,
  calendarOutline,
  trashOutline,
  chevronBackOutline,
  chevronForwardOutline,
});

interface WeeklyAverage {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  daysLogged: number;
}

@Component({
  selector: 'app-nutrition-log',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    IonList,
    IonLabel,
    IonRefresher,
    IonRefresherContent,
    IonSegment,
    IonSegmentButton,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Nutrition</ion-title>
        <ion-button slot="end" fill="clear" (click)="navigateToAddFood()" aria-label="Add food">
          <ion-icon slot="icon-only" name="add-outline"></ion-icon>
        </ion-button>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange()">
          <ion-segment-button value="today">
            <ion-label>Today</ion-label>
          </ion-segment-button>
          <ion-segment-button value="weekly">
            <ion-label>Weekly</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="nutrition-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner></ion-spinner>
            <p>Loading nutrition data...</p>
          </div>
        } @else if (error()) {
          <div class="error-state">
            <p class="error-message">{{ error() }}</p>
            <ion-button (click)="loadData()">Retry</ion-button>
          </div>
        } @else {
          @if (viewMode === 'today') {
            <!-- Today's Summary -->
            <ion-card>
              <ion-card-header>
                <div class="card-header-row">
                  <ion-card-title>
                    <ion-icon name="calendar-outline"></ion-icon>
                    {{ formatDate(selectedDate()) }}
                  </ion-card-title>
                  <ion-button fill="clear" size="small" (click)="changeDate(-1)" aria-label="Previous day">
                    <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
                  </ion-button>
                  <ion-button fill="clear" size="small" (click)="changeDate(1)" [disabled]="isToday()" aria-label="Next day">
                    <ion-icon slot="icon-only" name="chevron-forward-outline"></ion-icon>
                  </ion-button>
                </div>
              </ion-card-header>
              <ion-card-content>
                @if (dailySummary()) {
                  <div class="macro-cards">
                    <!-- Calories -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Calories</span>
                        @if (dailySummary()!.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.calories }}</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('calories')">
                        {{ dailySummary()!.calories }}
                      </div>
                      @if (dailySummary()!.targets) {
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            [style.width.%]="getProgressPercent(dailySummary()!.calories, dailySummary()!.targets!.calories)"
                            [style.background-color]="getNeutralColor('calories')"
                          ></div>
                        </div>
                        <ion-note class="encouragement">
                          {{ getEncouragingMessage(dailySummary()!.calories, dailySummary()!.targets!.calories, 'calories') }}
                        </ion-note>
                      }
                    </div>

                    <!-- Protein -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Protein</span>
                        @if (dailySummary()!.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.protein }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('protein')">
                        {{ dailySummary()!.protein }}g
                      </div>
                      @if (dailySummary()!.targets) {
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            [style.width.%]="getProgressPercent(dailySummary()!.protein, dailySummary()!.targets!.protein)"
                            [style.background-color]="getNeutralColor('protein')"
                          ></div>
                        </div>
                        <ion-note class="encouragement">
                          {{ getEncouragingMessage(dailySummary()!.protein, dailySummary()!.targets!.protein, 'protein') }}
                        </ion-note>
                      }
                    </div>

                    <!-- Carbs -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Carbs</span>
                        @if (dailySummary()!.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.carbs }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('carbs')">
                        {{ dailySummary()!.carbs }}g
                      </div>
                      @if (dailySummary()!.targets) {
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            [style.width.%]="getProgressPercent(dailySummary()!.carbs, dailySummary()!.targets!.carbs)"
                            [style.background-color]="getNeutralColor('carbs')"
                          ></div>
                        </div>
                        <ion-note class="encouragement">
                          {{ getEncouragingMessage(dailySummary()!.carbs, dailySummary()!.targets!.carbs, 'carbs') }}
                        </ion-note>
                      }
                    </div>

                    <!-- Fat -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Fat</span>
                        @if (dailySummary()!.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.fat }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('fat')">
                        {{ dailySummary()!.fat }}g
                      </div>
                      @if (dailySummary()!.targets) {
                        <div class="progress-bar">
                          <div
                            class="progress-fill"
                            [style.width.%]="getProgressPercent(dailySummary()!.fat, dailySummary()!.targets!.fat)"
                            [style.background-color]="getNeutralColor('fat')"
                          ></div>
                        </div>
                        <ion-note class="encouragement">
                          {{ getEncouragingMessage(dailySummary()!.fat, dailySummary()!.targets!.fat, 'fat') }}
                        </ion-note>
                      }
                    </div>
                  </div>
                } @else {
                  <p class="no-data">No nutrition data for this day</p>
                }
              </ion-card-content>
            </ion-card>

            <!-- Food Entries -->
            @if (currentLog() && currentLog()!.entries.length > 0) {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Food Log</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-list lines="none">
                    @for (entry of currentLog()!.entries; track entry.id) {
                      <div class="food-entry" (click)="showEntryActions(entry)">
                        <div class="entry-info">
                          <div class="entry-name">
                            {{ entry.food?.name || entry.custom_name || 'Unknown Food' }}
                          </div>
                          <ion-note>
                            {{ entry.servings }} serving(s) • {{ entry.calories }} cal
                          </ion-note>
                        </div>
                        <div class="entry-macros">
                          <span class="macro-chip">P: {{ entry.protein_g }}g</span>
                          <span class="macro-chip">C: {{ entry.carbs_g }}g</span>
                          <span class="macro-chip">F: {{ entry.fat_g }}g</span>
                        </div>
                      </div>
                    }
                  </ion-list>
                </ion-card-content>
              </ion-card>
            }
          } @else {
            <!-- Weekly Average View -->
            <ion-card>
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="trending-up-outline"></ion-icon>
                  Weekly Average
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                @if (weeklyAverage()) {
                  <div class="weekly-info">
                    <ion-note>Based on {{ weeklyAverage()!.daysLogged }} days of logging this week</ion-note>
                  </div>

                  <div class="macro-cards">
                    <!-- Weekly Calories -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Avg Calories</span>
                        @if (dailySummary()?.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.calories }}</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('calories')">
                        {{ Math.round(weeklyAverage()!.calories) }}
                      </div>
                      <ion-note class="encouragement neutral">
                        Week-to-week trends matter more than daily perfection
                      </ion-note>
                    </div>

                    <!-- Weekly Protein -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Avg Protein</span>
                        @if (dailySummary()?.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.protein }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('protein')">
                        {{ Math.round(weeklyAverage()!.protein) }}g
                      </div>
                    </div>

                    <!-- Weekly Carbs -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Avg Carbs</span>
                        @if (dailySummary()?.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.carbs }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('carbs')">
                        {{ Math.round(weeklyAverage()!.carbs) }}g
                      </div>
                    </div>

                    <!-- Weekly Fat -->
                    <div class="macro-card">
                      <div class="macro-header">
                        <span class="macro-label">Avg Fat</span>
                        @if (dailySummary()?.targets) {
                          <span class="macro-target">Target: {{ dailySummary()!.targets!.fat }}g</span>
                        }
                      </div>
                      <div class="macro-value" [style.color]="getNeutralColor('fat')">
                        {{ Math.round(weeklyAverage()!.fat) }}g
                      </div>
                    </div>
                  </div>
                } @else {
                  <p class="no-data">Not enough data for weekly average</p>
                }
              </ion-card-content>
            </ion-card>

            <!-- Helpful Context -->
            <ion-card>
              <ion-card-content>
                <p class="context-message">
                  💡 Weekly averages provide a more forgiving view of your nutrition.
                  Consistency over time matters more than hitting targets every single day.
                </p>
                <ion-button
                  expand="block"
                  fill="outline"
                  size="small"
                  class="history-button"
                  (click)="navigateToHistory()"
                >
                  <ion-icon slot="start" name="trending-up-outline"></ion-icon>
                  View Full History
                </ion-button>
              </ion-card-content>
            </ion-card>
          }
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

    .nutrition-container {
      padding: 16px;
      max-width: 800px;
      margin: 0 auto;
    }

    .loading-state,
    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-state p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    .error-message {
      color: #FCA5A5;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .card-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
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
      flex: 1;
    }

    .macro-cards {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .macro-card {
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 10px;
    }

    .macro-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .macro-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .macro-target {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .macro-value {
      font-size: 28px;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 12px;
      font-family: 'Space Mono', monospace;
    }

    .progress-bar {
      height: 8px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .progress-fill {
      height: 100%;
      transition: width 0.3s ease;
      max-width: 100%;
      border-radius: 4px;
    }

    .encouragement {
      display: block;
      font-size: 12px;
      font-style: italic;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 4px;
    }

    .encouragement.neutral {
      font-style: normal;
    }

    .no-data {
      text-align: center;
      color: var(--fitos-text-secondary, #A3A3A3);
      padding: 32px 16px;
      margin: 0;
      font-size: 14px;
    }

    ion-list {
      padding: 0;
      background: transparent;
    }

    .food-entry {
      padding: 12px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      cursor: pointer;
    }

    .food-entry:last-child {
      border-bottom: none;
    }

    .entry-info {
      margin-bottom: 8px;
    }

    .entry-name {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      margin-bottom: 4px;
    }

    .entry-macros {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .macro-chip {
      font-size: 12px;
      padding: 4px 8px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 6px;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
      font-weight: 600;
    }

    .weekly-info {
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(16, 185, 129, 0.1);
      border-radius: 8px;
    }

    .weekly-info ion-note {
      color: var(--ion-color-primary, #10B981);
      font-size: 13px;
    }

    .context-message {
      margin: 0;
      line-height: 1.6;
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 13px;
    }

    .history-button {
      margin-top: 16px;
      --border-radius: 8px;
    }
  `],
})
export class NutritionLogPage implements OnInit {
  private nutritionService = inject(NutritionService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);

  // Expose Math to template
  Math = Math;

  // State
  dailySummary = signal<NutritionSummary | null>(null);
  currentLog = signal<NutritionLogWithEntries | null>(null);
  weeklyAverage = signal<WeeklyAverage | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  selectedDate = signal(new Date().toISOString().split('T')[0]);
  viewMode = 'today';

  // Computed
  isToday = computed(() => {
    return this.selectedDate() === new Date().toISOString().split('T')[0];
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    this.loading.set(true);
    this.error.set(null);

    try {
      if (this.viewMode === 'today') {
        // Load today's data
        const summary = await this.nutritionService.getDailySummary(userId, this.selectedDate());
        this.dailySummary.set(summary);

        const log = await this.nutritionService.loadNutritionLog(userId, this.selectedDate());
        this.currentLog.set(log);
      } else {
        // Load weekly average
        await this.loadWeeklyAverage(userId);
      }
    } catch (err) {
      this.error.set('Failed to load nutrition data');
      console.error('Error loading nutrition data:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async loadWeeklyAverage(userId: string) {
    // Get last 7 days
    const today = new Date();
    const promises = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      promises.push(this.nutritionService.getDailySummary(userId, dateStr));
    }

    const summaries = await Promise.all(promises);
    const validSummaries = summaries.filter((s): s is NutritionSummary => s !== null);

    if (validSummaries.length === 0) {
      this.weeklyAverage.set(null);
      return;
    }

    const totals = validSummaries.reduce(
      (acc, summary) => ({
        calories: acc.calories + summary.calories,
        protein: acc.protein + summary.protein,
        carbs: acc.carbs + summary.carbs,
        fat: acc.fat + summary.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    this.weeklyAverage.set({
      calories: totals.calories / validSummaries.length,
      protein: totals.protein / validSummaries.length,
      carbs: totals.carbs / validSummaries.length,
      fat: totals.fat / validSummaries.length,
      daysLogged: validSummaries.length,
    });

    // Also set dailySummary for targets reference
    if (validSummaries.length > 0) {
      this.dailySummary.set(validSummaries[0]);
    }
  }

  onViewModeChange() {
    this.loadData();
  }

  changeDate(days: number) {
    const currentDate = new Date(this.selectedDate());
    currentDate.setDate(currentDate.getDate() + days);
    this.selectedDate.set(currentDate.toISOString().split('T')[0]);
    this.loadData();
  }

  navigateToAddFood() {
    this.router.navigate(['/tabs/nutrition/add']);
  }

  navigateToHistory() {
    this.router.navigate(['/tabs/nutrition/history']);
  }

  getProgressPercent(current: number, target: number): number {
    if (target === 0) return 0;
    return Math.min((current / target) * 100, 100);
  }

  getNeutralColor(type: 'calories' | 'protein' | 'carbs' | 'fat'): string {
    return NUTRITION_COLORS[type.toUpperCase() as keyof typeof NUTRITION_COLORS];
  }

  getEncouragingMessage(current: number, target: number, _type: string): string {
    const percent = (current / target) * 100;

    if (percent < 50) {
      return 'Still tracking for the day';
    } else if (percent < 90) {
      return 'Making progress';
    } else if (percent >= 90 && percent <= 110) {
      return 'Right on track';
    } else {
      // NO RED MESSAGING - just neutral acknowledgment
      return 'Data logged';
    }
  }

  async showEntryActions(entry: NutritionLogWithEntries['entries'][number]) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: entry.food?.name || entry.custom_name || 'Food Entry',
      buttons: [
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.deleteEntry(entry.id);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async deleteEntry(entryId: string) {
    const success = await this.nutritionService.deleteEntry(entryId);

    if (success) {
      const toast = await this.toastCtrl.create({
        message: 'Entry deleted',
        duration: 2000,
        color: 'success',
      });
      await toast.present();

      // Reload data
      this.loadData();
    } else {
      const toast = await this.toastCtrl.create({
        message: 'Failed to delete entry',
        duration: 2000,
        color: 'danger',
      });
      await toast.present();
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  async handleRefresh(event: CustomEvent) {
    await this.loadData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
