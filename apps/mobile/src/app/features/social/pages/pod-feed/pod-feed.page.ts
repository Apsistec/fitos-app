import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonRefresher,
  IonRefresherContent,
  IonIcon,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barbellOutline,
  calendarOutline,
  timeOutline,
  trophyOutline,
  peopleOutline,
} from 'ionicons/icons';
import {
  AccountabilityGroupService,
  PodActivityRow,
} from '../../../../core/services/accountability-group.service';
import { AuthService } from '../../../../core/services/auth.service';

// ─── Derived group view ───────────────────────────────────────────────────────

interface PodGroup {
  group_id:   string;
  group_name: string;
  group_emoji: string;
  members:    PodActivityRow[];
  total_workouts: number;
}

function relativeTime(isoString: string | null): string {
  if (!isoString) return 'No activity yet';
  const diff = Date.now() - new Date(isoString).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1)  return 'Active recently';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7)   return `${days} days ago`;
  return 'Over a week ago';
}

@Component({
  selector: 'app-pod-feed',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonRefresher,
    IonRefresherContent,
    IonIcon,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/social/leaderboard"></ion-back-button>
        </ion-buttons>
        <ion-title>My Pods</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="feed-body">

        <!-- ── Privacy banner ───────────────────────────────────────────── -->
        <div class="privacy-banner">
          🔒 Only workout completions are shared — no weights, measurements, or nutrition.
        </div>

        @if (isLoading()) {
          <div class="skel-list">
            @for (_ of [1,2]; track $_) {
              <ion-skeleton-text animated class="skel-pod"></ion-skeleton-text>
              @for (__ of [1,2,3]; track $__) {
                <ion-skeleton-text animated class="skel-member"></ion-skeleton-text>
              }
            }
          </div>
        }

        <!-- ── Pods ─────────────────────────────────────────────────────── -->
        @if (!isLoading()) {
          @for (pod of podGroups(); track pod.group_id) {
            <div class="pod-card">
              <!-- Pod header -->
              <div class="pod-header">
                <div class="pod-emoji">{{ pod.group_emoji }}</div>
                <div class="pod-name">{{ pod.group_name }}</div>
                <div class="pod-total">
                  {{ pod.total_workouts }}
                  <span class="pod-total-label">workouts this week</span>
                </div>
              </div>

              <!-- Member rows -->
              <div class="members">
                @for (member of pod.members; track member.member_id) {
                  <div
                    class="member-row"
                    [class.is-me]="member.member_id === currentUserId()"
                  >
                    <div class="member-avatar">
                      {{ member.display_name.charAt(0).toUpperCase() }}
                    </div>

                    <div class="member-info">
                      <div class="member-name">
                        {{ member.display_name }}
                        @if (member.member_id === currentUserId()) {
                          <span class="you-tag">You</span>
                        }
                      </div>
                      <div class="member-last">{{ relativeTime(member.last_active) }}</div>
                    </div>

                    <div class="member-stats">
                      @if (member.sessions_this_week > 0) {
                        <div class="stat-chip session">
                          <ion-icon name="calendar-outline"></ion-icon>
                          {{ member.sessions_this_week }}
                        </div>
                      }
                      @if (member.workouts_this_week > 0) {
                        <div class="stat-chip workout">
                          <ion-icon name="barbell-outline"></ion-icon>
                          {{ member.workouts_this_week }}
                        </div>
                      }
                      @if (member.workouts_this_week === 0 && member.sessions_this_week === 0) {
                        <div class="stat-chip none">–</div>
                      }
                    </div>
                  </div>
                }
              </div>

              <!-- Pod leader indicator -->
              @if (podLeader(pod); as leader) {
                <div class="pod-leader">
                  🏆 <strong>{{ leader.display_name }}</strong> is leading the pod this week!
                </div>
              }
            </div>
          }

          <!-- ── Empty state ───────────────────────────────────────────── -->
          @if (podGroups().length === 0) {
            <div class="empty-state">
              <ion-icon name="people-outline"></ion-icon>
              <h3>No pods yet</h3>
              <p>Your trainer hasn't added you to an accountability pod yet. Check back later!</p>
            </div>
          }
        }

        <div class="bottom-spacer"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .feed-body { padding: 12px 16px; }

    /* ── Privacy banner ──── */
    .privacy-banner {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      background: rgba(255,255,255,0.04);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 16px;
      text-align: center;
    }

    /* ── Skeleton ────────── */
    .skel-list { display: flex; flex-direction: column; gap: 8px; }
    .skel-pod    { height: 52px; border-radius: 14px; }
    .skel-member { height: 48px; border-radius: 10px; }

    /* ── Pod card ─────────── */
    .pod-card {
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
      border: 1px solid rgba(255,255,255,0.06);
    }

    .pod-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 14px;
    }
    .pod-emoji { font-size: 28px; }
    .pod-name { flex: 1; font-size: 17px; font-weight: 800; }
    .pod-total {
      font-size: 22px;
      font-weight: 900;
      color: var(--fitos-accent-primary, #10B981);
      text-align: right;
      line-height: 1;
    }
    .pod-total-label {
      display: block;
      font-size: 10px;
      font-weight: 500;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    /* ── Members ────────── */
    .members { display: flex; flex-direction: column; gap: 6px; }

    .member-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 10px;
      background: rgba(255,255,255,0.03);
      transition: background 0.15s;

      &.is-me {
        background: rgba(16,185,129,0.08);
        border: 1px solid rgba(16,185,129,0.2);
      }
    }

    .member-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
      flex-shrink: 0;
    }

    .member-info { flex: 1; min-width: 0; }
    .member-name {
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .you-tag {
      font-size: 10px;
      font-weight: 800;
      background: rgba(16,185,129,0.2);
      color: var(--fitos-accent-primary, #10B981);
      border-radius: 4px;
      padding: 1px 5px;
    }
    .member-last { font-size: 11px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Stat chips ─────── */
    .member-stats { display: flex; gap: 6px; align-items: center; }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 800;
      ion-icon { font-size: 13px; }
    }
    .stat-chip.workout { background: rgba(16,185,129,0.15); color: var(--fitos-accent-primary, #10B981); }
    .stat-chip.session { background: rgba(59,130,246,0.15); color: #60A5FA; }
    .stat-chip.none    { background: rgba(255,255,255,0.06); color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Leader strip ─── */
    .pod-leader {
      margin-top: 12px;
      padding: 8px 12px;
      background: rgba(245,158,11,0.1);
      border-radius: 8px;
      font-size: 13px;
      color: #F59E0B;
    }

    /* ── Empty state ─────── */
    .empty-state {
      text-align: center;
      padding: 60px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      ion-icon { font-size: 56px; color: var(--fitos-text-tertiary, #6B6B6B); }
      h3 { font-size: 22px; font-weight: 800; margin: 0; }
      p  { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); max-width: 260px; margin: 0; }
    }

    .bottom-spacer { height: 32px; }
  `],
})
export class PodFeedPage implements OnInit {
  private auth         = inject(AuthService);
  groupService         = inject(AccountabilityGroupService);

  isLoading    = signal(true);
  currentUserId = computed(() => this.auth.user()?.id ?? '');

  // ── Group rows into per-pod view ─────────────────────────────────────────
  podGroups = computed((): PodGroup[] => {
    const rows = this.groupService.podActivity();
    const map  = new Map<string, PodGroup>();

    for (const row of rows) {
      if (!map.has(row.group_id)) {
        map.set(row.group_id, {
          group_id:    row.group_id,
          group_name:  row.group_name,
          group_emoji: row.group_emoji,
          members:     [],
          total_workouts: 0,
        });
      }
      const pod = map.get(row.group_id)!;
      pod.members.push(row);
      pod.total_workouts += row.workouts_this_week;
    }

    return Array.from(map.values());
  });

  constructor() {
    addIcons({ barbellOutline, calendarOutline, timeOutline, trophyOutline, peopleOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.groupService.loadPodActivity();
    this.isLoading.set(false);
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.groupService.loadPodActivity();
    (event.target as HTMLIonRefresherElement).complete();
  }

  podLeader(pod: PodGroup): PodActivityRow | null {
    if (pod.members.length === 0) return null;
    const topMember = [...pod.members].sort(
      (a, b) => b.workouts_this_week - a.workouts_this_week
    )[0];
    return topMember.workouts_this_week > 0 ? topMember : null;
  }

  relativeTime(isoString: string | null): string {
    return relativeTime(isoString);
  }
}
