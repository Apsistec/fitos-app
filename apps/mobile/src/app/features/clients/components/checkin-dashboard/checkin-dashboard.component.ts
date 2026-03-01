import {
  Component,
  OnInit,
  Input,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonBadge,
  IonSkeletonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  happyOutline,
  addOutline,
  sendOutline,
  chevronForwardOutline,
  alertCircleOutline,
} from 'ionicons/icons';
import {
  CheckinService,
  CheckinTemplate,
  CheckinResponse,
  WeeklySummaryRow,
} from '../../../../core/services/checkin.service';

// ─── Mood helpers ──────────────────────────────────────────────────────────────
const MOOD_COLOR: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#22C55E',
  5: '#10B981',
};

const MOOD_EMOJI: Record<number, string> = {
  1: '😩', 2: '😕', 3: '😐', 4: '🙂', 5: '🤩',
};

function moodColor(mood: number | null): string {
  if (!mood) return 'rgba(255,255,255,0.1)';
  return MOOD_COLOR[Math.round(mood)] ?? '#A3A3A3';
}

function moodEmoji(mood: number | null): string {
  if (!mood) return '–';
  return MOOD_EMOJI[Math.round(mood)] ?? '–';
}

@Component({
  selector: 'app-checkin-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    DecimalPipe,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonIcon,
    IonBadge,
    IonSkeletonText,
  ],
  template: `
    <!-- ── Section header ──────────────────────────────────────────────────── -->
    <div class="cd-section-header">
      <div class="cd-title">
        <ion-icon name="happy-outline"></ion-icon>
        Check-Ins
      </div>
      <ion-button fill="clear" size="small" (click)="openBuilder()">
        <ion-icon name="add-outline" slot="icon-only"></ion-icon>
      </ion-button>
    </div>

    <!-- ── Loading skeleton ────────────────────────────────────────────────── -->
    @if (isLoading()) {
      <div class="cd-skeleton">
        @for (_ of [1,2,3]; track $_) {
          <ion-skeleton-text animated class="skel-bar"></ion-skeleton-text>
        }
      </div>
    }

    <!-- ── Mood sparkline ──────────────────────────────────────────────────── -->
    @if (!isLoading() && weeklySummary().length > 0) {
      <div class="sparkline-card">
        <div class="sparkline-meta">
          <span class="sparkline-label">Last 8 weeks mood</span>
          <span class="sparkline-avg" [style.color]="avgMoodColor()">
            {{ moodEmojiFor(avgMood()) }} {{ avgMood() | number:'1.1-1' }}
          </span>
        </div>
        <div class="sparkline-bars">
          @for (row of weeklySummary(); track row.week_start) {
            <div class="bar-col" [title]="row.week_start | date:'MMM d'">
              <div
                class="bar"
                [style.height]="barHeight(row.overall_mood) + '%'"
                [style.background]="moodColorFor(row.overall_mood)"
              ></div>
              <div class="bar-mood">{{ moodEmojiFor(row.overall_mood) }}</div>
            </div>
          }
        </div>
        <div class="response-rate">
          Response rate: <strong>{{ responseRate() | number:'1.0-0' }}%</strong>
          @if (responseRate() < 50) {
            <ion-badge color="warning" class="rate-badge">Low</ion-badge>
          }
        </div>
      </div>
    }

    <!-- ── Templates list ─────────────────────────────────────────────────── -->
    @if (!isLoading() && templates().length > 0) {
      <div class="cd-subsection">Templates</div>
      <ion-list class="templates-list">
        @for (t of templates(); track t.id) {
          <ion-item button detail (click)="openBuilder(t.id)">
            <ion-label>
              <h3>{{ t.name }}</h3>
              <p>{{ t.questions.length }} question{{ t.questions.length === 1 ? '' : 's' }}
                @if (t.send_day_of_week !== null) {
                  · {{ dayLabel(t.send_day_of_week) }}s at {{ t.send_time }}
                } @else {
                  · Manual send
                }
              </p>
            </ion-label>
            @if (!t.is_active) {
              <ion-badge color="medium" slot="end">Inactive</ion-badge>
            } @else {
              <ion-badge color="success" slot="end">Active</ion-badge>
            }
          </ion-item>
        }
      </ion-list>

      <!-- ── Ad-hoc send ──────────────────────────────────────────────────── -->
      @if (pendingTemplateId()) {
        <ion-button
          expand="block"
          fill="outline"
          class="send-btn"
          (click)="sendNow()"
          [disabled]="isSending()"
        >
          <ion-icon name="send-outline" slot="start"></ion-icon>
          Send check-in now
        </ion-button>
      }
    }

    <!-- ── Recent responses ────────────────────────────────────────────────── -->
    @if (!isLoading() && recentResponses().length > 0) {
      <div class="cd-subsection">Recent Responses</div>
      <ion-list class="responses-list">
        @for (r of recentResponses(); track r.id) {
          <ion-item>
            <div class="response-row">
              <div
                class="mood-bubble"
                [style.background]="moodColorFor(r.overall_mood)"
              >
                {{ moodEmojiFor(r.overall_mood) }}
              </div>
              <div class="response-meta">
                <div class="response-date">
                  {{ r.responded_at ? (r.responded_at | date:'MMM d, h:mm a') : 'No response' }}
                </div>
                @if (r.responses.length > 0 && r.responses[0]) {
                  <div class="response-preview">
                    "{{ firstTextAnswer(r) }}"
                  </div>
                }
              </div>
              @if (!r.responded_at) {
                <ion-icon name="alert-circle-outline" color="warning" class="pending-icon"></ion-icon>
              }
            </div>
          </ion-item>
        }
      </ion-list>
    }

    <!-- ── Empty state ───────────────────────────────────────────────────────── -->
    @if (!isLoading() && templates().length === 0) {
      <div class="cd-empty">
        <ion-icon name="happy-outline"></ion-icon>
        <p>No check-in templates yet.</p>
        <ion-button size="small" (click)="openBuilder()">Create first check-in</ion-button>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ── Header ─────────────────────── */
    .cd-section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 4px 4px 8px;
    }
    .cd-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--fitos-text-primary, #F5F5F5);
      ion-icon { color: var(--fitos-accent-primary, #10B981); font-size: 16px; }
    }

    /* ── Skeleton ───────────────────── */
    .cd-skeleton { display: flex; flex-direction: column; gap: 8px; }
    .skel-bar { height: 48px; border-radius: 10px; }

    /* ── Sparkline ───────────────────── */
    .sparkline-card {
      background: rgba(255,255,255,0.04);
      border-radius: 14px;
      padding: 14px;
      margin-bottom: 12px;
    }
    .sparkline-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    .sparkline-label { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }
    .sparkline-avg { font-size: 15px; font-weight: 800; }

    .sparkline-bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: 60px;
    }
    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      height: 100%;
    }
    .bar {
      width: 100%;
      border-radius: 4px 4px 0 0;
      min-height: 4px;
      transition: height 0.3s ease;
    }
    .bar-mood { font-size: 14px; }

    .response-rate {
      margin-top: 10px;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      display: flex;
      align-items: center;
      gap: 6px;
      strong { color: var(--fitos-text-primary, #F5F5F5); }
    }
    .rate-badge { font-size: 10px; }

    /* ── Subsection ──────────────────── */
    .cd-subsection {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      padding: 12px 2px 6px;
    }

    /* ── Lists ───────────────────────── */
    .templates-list, .responses-list {
      background: transparent;
      margin: 0 0 8px;
      border-radius: 12px;
      overflow: hidden;
    }
    ion-item { --background: rgba(255,255,255,0.04); --border-color: rgba(255,255,255,0.06); }
    ion-label h3 { font-size: 14px; font-weight: 700; }
    ion-label p  { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }

    /* ── Send btn ────────────────────── */
    .send-btn { --border-radius: 12px; margin-bottom: 12px; }

    /* ── Response row ────────────────── */
    .response-row {
      display: flex;
      align-items: center;
      gap: 12px;
      width: 100%;
      padding: 4px 0;
    }
    .mood-bubble {
      width: 36px; height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }
    .response-meta { flex: 1; min-width: 0; }
    .response-date { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }
    .response-preview {
      font-size: 13px;
      color: var(--fitos-text-primary, #F5F5F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .pending-icon { font-size: 18px; flex-shrink: 0; }

    /* ── Empty state ─────────────────── */
    .cd-empty {
      text-align: center;
      padding: 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      ion-icon { font-size: 32px; color: var(--fitos-text-tertiary, #6B6B6B); }
      p { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); margin: 0; }
    }
  `],
})
export class CheckinDashboardComponent implements OnInit {
  @Input({ required: true }) clientId!: string;

  private router         = inject(Router);
  checkinService         = inject(CheckinService);

  isLoading        = signal(true);
  isSending        = signal(false);
  templates        = signal<CheckinTemplate[]>([]);
  recentResponses  = signal<CheckinResponse[]>([]);
  weeklySummary    = signal<WeeklySummaryRow[]>([]);
  pendingTemplateId = signal<string | null>(null);

  avgMood = computed(() => {
    const rows = this.weeklySummary().filter((r) => r.overall_mood !== null);
    if (rows.length === 0) return null;
    return rows.reduce((s, r) => s + (r.overall_mood ?? 0), 0) / rows.length;
  });

  avgMoodColor = computed(() => moodColor(this.avgMood()));

  responseRate = computed(() => {
    const rows = this.weeklySummary();
    const sent = rows.reduce((s, r) => s + r.sent_count, 0);
    const responded = rows.reduce((s, r) => s + r.response_count, 0);
    return sent > 0 ? (responded / sent) * 100 : 0;
  });

  private readonly DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  constructor() {
    addIcons({ happyOutline, addOutline, sendOutline, chevronForwardOutline, alertCircleOutline });
  }

  async ngOnInit(): Promise<void> {
    await this.checkinService.getMyTemplates();
    this.templates.set(this.checkinService.templates());

    const [responses, summary] = await Promise.all([
      this.checkinService.getClientResponses(this.clientId),
      this.checkinService.getClientWeeklySummary(this.clientId),
    ]);

    this.recentResponses.set(responses.slice(0, 5));
    this.weeklySummary.set(summary);

    // Default: first active template for ad-hoc send
    const firstActive = this.templates().find((t) => t.is_active);
    this.pendingTemplateId.set(firstActive?.id ?? null);

    this.isLoading.set(false);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  moodColorFor(mood: number | null): string { return moodColor(mood); }
  moodEmojiFor(mood: number | null): string { return moodEmoji(mood); }
  dayLabel(day: number): string { return this.DAYS[day] ?? ''; }

  barHeight(mood: number | null): number {
    if (!mood) return 10;
    return (mood / 5) * 100;
  }

  firstTextAnswer(r: CheckinResponse): string {
    const textAnswer = r.responses.find(
      (a) => typeof a.value === 'string' && (a.value as string).trim().length > 0
    );
    if (!textAnswer) return '';
    const text = String(textAnswer.value);
    return text.length > 60 ? text.slice(0, 60) + '…' : text;
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  openBuilder(templateId?: string): void {
    if (templateId) {
      this.router.navigate(['/tabs/clients/checkin-builder', templateId]);
    } else {
      this.router.navigate(['/tabs/clients/checkin-builder']);
    }
  }

  async sendNow(): Promise<void> {
    const templateId = this.pendingTemplateId();
    if (!templateId || this.isSending()) return;

    this.isSending.set(true);
    await this.checkinService.sendCheckinNow(templateId, this.clientId);
    this.isSending.set(false);
  }
}
