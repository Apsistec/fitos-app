import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import {
  GamificationService,
  LeaderboardType,
  LeaderboardScope,
  LeaderboardEntry,
} from '../../../../core/services/gamification.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { FormsModule } from '@angular/forms';

/**
 * LeaderboardPage
 *
 * Activity-based leaderboards with privacy-first opt-in.
 *
 * Features:
 * - Multiple leaderboard types (steps, workouts, streak, improvement)
 * - Scope filtering (global, facility, trainer)
 * - Privacy controls (opt-in, anonymize)
 * - My rank display
 * - Compare to self mode
 *
 * NEVER includes:
 * - Weight or body composition
 * - Calorie deficits
 * - Photos/appearance
 * - Body measurements
 *
 * Sprint 26: Advanced Gamification
 */
@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule,],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Leaderboards</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="openSettings()">
            <ion-icon slot="icon-only" name="settings-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Type Selector -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedType" (ionChange)="onTypeChange()">
          <ion-segment-button value="weekly_steps">
            <ion-label>Steps</ion-label>
          </ion-segment-button>
          <ion-segment-button value="weekly_workouts">
            <ion-label>Workouts</ion-label>
          </ion-segment-button>
          <ion-segment-button value="consistency_streak">
            <ion-label>Streak</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>

      <!-- Scope Selector -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedScope" (ionChange)="onScopeChange()">
          <ion-segment-button value="global">
            <ion-label>Global</ion-label>
          </ion-segment-button>
          @if (userFacilityId()) {
            <ion-segment-button value="facility">
              <ion-label>My Gym</ion-label>
            </ion-segment-button>
          }
          @if (userTrainerId()) {
            <ion-segment-button value="trainer_clients">
              <ion-label>My Group</ion-label>
            </ion-segment-button>
          }
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (!hasOptedIn()) {
        <!-- Opt-in Banner -->
        <div class="opt-in-banner">
          <div class="banner-content">
            <ion-icon name="lock-closed-outline" class="banner-icon"></ion-icon>
            <div class="banner-text">
              <h3>Join the Leaderboards</h3>
              <p>Opt-in to compete with others on activity-based challenges. Your privacy is protected.</p>
            </div>
          </div>
          <ion-button expand="block" (click)="optIn()">
            Enable Leaderboards
          </ion-button>
          <ion-button fill="clear" expand="block" (click)="learnMore()">
            Learn About Privacy
          </ion-button>
        </div>
      } @else {
        @if (loading()) {
          <!-- Loading State -->
          <div class="loading-container">
            <ion-spinner></ion-spinner>
            <p>Loading leaderboard...</p>
          </div>
        } @else if (error()) {
          <!-- Error State -->
          <div class="error-container">
            <ion-icon name="alert-circle-outline"></ion-icon>
            <p>{{ error() }}</p>
            <ion-button (click)="loadLeaderboard()">Retry</ion-button>
          </div>
        } @else {
          <!-- My Rank Card -->
          @if (myRank()) {
            <ion-card class="my-rank-card">
              <ion-card-content>
                <div class="rank-header">
                  <div class="rank-badge">
                    <span class="rank-number">#{{ myRank()!.rank }}</span>
                    <span class="rank-label">Your Rank</span>
                  </div>
                  <div class="rank-stats">
                    <div class="stat">
                      <span class="stat-value">{{ formatMetricValue(myRank()!.metric_value) }}</span>
                      <span class="stat-label">{{ getMetricLabel() }}</span>
                    </div>
                    <div class="stat">
                      <span class="stat-value">{{ myRank()!.percentile?.toFixed(0) }}%</span>
                      <span class="stat-label">Percentile</span>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Leaderboard List -->
          <ion-list class="leaderboard-list">
            @for (entry of entries(); track entry.id) {
              <ion-item
                [class.current-user]="entry.is_current_user"
                [class.top-three]="entry.rank! <= 3"
              >
                <div slot="start" class="rank-indicator">
                  @if (entry.rank! <= 3) {
                    <ion-icon
                      [name]="getRankIcon(entry.rank!)"
                      [color]="getRankColor(entry.rank!)"
                    ></ion-icon>
                  } @else {
                    <span class="rank-text">{{ entry.rank }}</span>
                  }
                </div>

                <ion-label>
                  <h2>{{ getUserDisplayName(entry) }}</h2>
                  <p>{{ formatMetricValue(entry.metric_value) }} {{ getMetricLabel() }}</p>
                </ion-label>

                @if (entry.is_current_user) {
                  <ion-badge slot="end" color="primary">You</ion-badge>
                }
              </ion-item>
            } @empty {
              <div class="empty-state">
                <ion-icon name="people-outline"></ion-icon>
                <p>No entries yet</p>
                <p class="empty-subtitle">Be the first to join!</p>
              </div>
            }
          </ion-list>

          <!-- Compare to Self Toggle -->
          <div class="compare-toggle">
            <ion-item lines="none">
              <ion-label>
                <h3>Compare to Self Only</h3>
                <p>Hide others and focus on your own progress</p>
              </ion-label>
              <ion-toggle [(ngModel)]="compareToSelf"></ion-toggle>
            </ion-item>
          </div>
        }
      }
    </ion-content>
  `,
  styles: [
    `
      :host {
        ion-content {
          --background: var(--fitos-bg-primary, #0D0D0D);
        }
      }

      ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      .opt-in-banner {
        margin: 24px 16px;
        padding: 24px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        text-align: center;

        .banner-content {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin-bottom: 24px;
          text-align: left;

          .banner-icon {
            font-size: 48px;
            color: var(--fitos-text-tertiary, #737373);
            flex-shrink: 0;
          }

          .banner-text {
            flex: 1;

            h3 {
              margin: 0 0 8px;
              font-size: 20px;
              font-weight: 600;
              color: var(--fitos-text-primary, #F5F5F5);
            }

            p {
              margin: 0;
              font-size: 14px;
              color: var(--fitos-text-secondary, #A3A3A3);
              line-height: 1.5;
            }
          }
        }

        ion-button {
          margin-top: 8px;
        }
      }

      .loading-container,
      .error-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 16px;
        }

        ion-spinner {
          margin-bottom: 16px;
        }

        p {
          margin: 0 0 24px;
          color: var(--fitos-text-secondary, #A3A3A3);
        }
      }

      .my-rank-card {
        margin: 16px;
        --background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary));
        background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-secondary));
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
        color: white;

        .rank-header {
          display: flex;
          justify-content: space-between;
          align-items: center;

          .rank-badge {
            display: flex;
            flex-direction: column;
            align-items: center;

            .rank-number {
              font-size: 48px;
              font-weight: 700;
              font-family: 'Space Mono', monospace;
              line-height: 1;
            }

            .rank-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              opacity: 0.9;
            }
          }

          .rank-stats {
            display: flex;
            gap: 24px;

            .stat {
              display: flex;
              flex-direction: column;
              align-items: flex-end;

              .stat-value {
                font-size: 24px;
                font-weight: 700;
                font-family: 'Space Mono', monospace;
                line-height: 1;
              }

              .stat-label {
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                opacity: 0.9;
                margin-top: 4px;
              }
            }
          }
        }
      }

      .leaderboard-list {
        padding: 0;

        ion-item {
          --padding-start: 16px;
          --padding-end: 16px;
          --min-height: 72px;

          &.current-user {
            --background: rgba(var(--ion-color-primary-rgb), 0.15);
            font-weight: 600;
          }

          &.top-three {
            --background: var(--fitos-bg-secondary, #1A1A1A);
          }

          .rank-indicator {
            width: 48px;
            display: flex;
            align-items: center;
            justify-content: center;

            ion-icon {
              font-size: 32px;
            }

            .rank-text {
              font-size: 20px;
              font-weight: 600;
              font-family: 'Space Mono', monospace;
              color: var(--fitos-text-secondary, #A3A3A3);
            }
          }

          ion-label {
            h2 {
              font-size: 16px;
              font-weight: 600;
              color: var(--fitos-text-primary, #F5F5F5);
              margin-bottom: 4px;
            }

            p {
              font-size: 14px;
              color: var(--fitos-text-secondary, #A3A3A3);
            }
          }
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 64px 24px;
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 16px;
        }

        p {
          margin: 8px 0 0;
          font-size: 16px;
          color: var(--fitos-text-secondary, #A3A3A3);

          &.empty-subtitle {
            font-size: 14px;
            color: var(--fitos-text-tertiary, #737373);
          }
        }
      }

      .compare-toggle {
        margin: 24px 16px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;

        ion-item {
          --background: transparent;

          ion-label {
            h3 {
              font-size: 16px;
              font-weight: 600;
              color: var(--fitos-text-primary, #F5F5F5);
              margin-bottom: 4px;
            }

            p {
              font-size: 13px;
              color: var(--fitos-text-secondary, #A3A3A3);
            }
          }
        }
      }
    `,
  ],
})
export class LeaderboardPage implements OnInit {
  private gamificationService = inject(GamificationService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);

  // State
  selectedType = signal<LeaderboardType>('weekly_steps');
  selectedScope = signal<LeaderboardScope>('global');
  compareToSelf = signal(false);
  entries = signal<LeaderboardEntry[]>([]);
  myRank = signal<LeaderboardEntry | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);

  // User info
  userFacilityId = signal<string | null>(null);
  userTrainerId = signal<string | null>(null);

  // Computed
  hasOptedIn = computed(() => this.gamificationService.hasOptedIn());

  async ngOnInit() {
    const user = this.authService.user();
    if (!user) return;

    // Load preferences
    await this.gamificationService.getPreferences(user.id);

    // Set user context
    const profile = this.authService.profile();
    if (profile) {
      this.userFacilityId.set(profile.gym_owner_id || null);
      // Get trainer if client
      if (profile.role === 'client') {
        const { data } = await this.supabase.client
          .from('client_trainers')
          .select('trainer_id')
          .eq('client_id', user.id)
          .eq('status', 'active')
          .single();
        this.userTrainerId.set(data?.trainer_id || null);
      }
    }

    // Load leaderboard if opted in
    if (this.hasOptedIn()) {
      await this.loadLeaderboard();
    }
  }

  /**
   * Load leaderboard data
   */
  async loadLeaderboard(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    const user = this.authService.user();
    if (!user) return;

    try {
      const scopeId = this.getScopeId();
      const entries = await this.gamificationService.getLeaderboard(
        this.selectedType(),
        this.selectedScope(),
        scopeId,
        50
      );

      if (this.compareToSelf()) {
        // Show only current user
        const myEntry = entries.find((e) => e.user_id === user.id);
        this.entries.set(myEntry ? [myEntry] : []);
      } else {
        this.entries.set(entries);
      }

      // Get my rank
      const myRankEntry = await this.gamificationService.getMyRank(
        user.id,
        this.selectedType(),
        this.selectedScope(),
        scopeId
      );
      this.myRank.set(myRankEntry);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load leaderboard';
      this.error.set(errorMessage);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Handle type change
   */
  async onTypeChange(): Promise<void> {
    await this.loadLeaderboard();
  }

  /**
   * Handle scope change
   */
  async onScopeChange(): Promise<void> {
    await this.loadLeaderboard();
  }

  /**
   * Get scope ID based on selected scope
   */
  private getScopeId(): string | undefined {
    if (this.selectedScope() === 'facility') {
      return this.userFacilityId() || undefined;
    } else if (this.selectedScope() === 'trainer_clients') {
      return this.userTrainerId() || undefined;
    }
    return undefined;
  }

  /**
   * Opt in to leaderboards
   */
  async optIn(): Promise<void> {
    const user = this.authService.user();
    if (!user) return;

    const success = await this.gamificationService.updatePreferences(user.id, {
      leaderboard_opt_in: true,
      show_in_global_leaderboards: true,
    });

    if (success) {
      await this.loadLeaderboard();
    }
  }

  /**
   * Open settings modal
   */
  async openSettings(): Promise<void> {
    // TODO: Implement settings modal
    console.log('Open settings modal');
  }

  /**
   * Learn more about privacy
   */
  async learnMore(): Promise<void> {
    // TODO: Implement learn more modal
    console.log('Learn more about privacy');
  }

  /**
   * Get rank icon for top 3
   */
  getRankIcon(rank: number): string {
    switch (rank) {
      case 1:
        return 'trophy';
      case 2:
        return 'medal-outline';
      case 3:
        return 'ribbon-outline';
      default:
        return '';
    }
  }

  /**
   * Get rank color for top 3
   */
  getRankColor(rank: number): string {
    switch (rank) {
      case 1:
        return 'warning'; // Gold
      case 2:
        return 'medium'; // Silver
      case 3:
        return 'tertiary'; // Bronze
      default:
        return 'medium';
    }
  }

  /**
   * Get user display name (respects anonymize preference)
   */
  getUserDisplayName(entry: LeaderboardEntry): string {
    // TODO: Check if user has anonymize preference
    return entry.user_name || 'User';
  }

  /**
   * Format metric value
   */
  formatMetricValue(value: number): string {
    if (this.selectedType().includes('steps')) {
      return value.toLocaleString();
    }
    return value.toString();
  }

  /**
   * Get metric label
   */
  getMetricLabel(): string {
    return this.gamificationService.getMetricLabel(this.selectedType());
  }
}
