import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  IonSpinner,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
  IonBadge,
  InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  calendarCheckOutline,
  barbellOutline,
  scaleOutline,
  starOutline,
  trophyOutline,
  ribbonOutline,
} from 'ionicons/icons';
import {
  ProgressTimelineService,
  TimelineEvent,
  TimelineEventType,
} from '../../../../core/services/progress-timeline.service';

const EVENT_META: Record<
  TimelineEventType,
  { icon: string; color: string; label: string }
> = {
  appointment_completed: { icon: 'calendar-check-outline', color: '#10B981', label: 'Session' },
  workout_logged:        { icon: 'barbell-outline',         color: '#3B82F6', label: 'Workout' },
  measurement_taken:    { icon: 'scale-outline',           color: '#8B5CF6', label: 'Check-in' },
  pr_set:               { icon: 'trophy-outline',          color: '#F59E0B', label: 'Personal Record' },
  milestone_achieved:   { icon: 'ribbon-outline',          color: '#EC4899', label: 'Milestone' },
};

@Component({
  selector: 'app-progress-timeline',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonNote,
    IonSpinner,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSkeletonText,
    IonBadge,
  ],
  template: `
    <!-- Skeletons on first load -->
    @if (timeline.isLoading() && timeline.events().length === 0) {
      <div class="skeleton-list">
        @for (i of [1,2,3,4,5]; track i) {
          <div class="skeleton-row">
            <div class="skeleton-dot"></div>
            <div class="skeleton-text">
              <ion-skeleton-text animated style="width:55%;height:13px;border-radius:6px;margin-bottom:6px"></ion-skeleton-text>
              <ion-skeleton-text animated style="width:35%;height:11px;border-radius:6px"></ion-skeleton-text>
            </div>
          </div>
        }
      </div>
    }

    @if (!timeline.isLoading() && timeline.events().length === 0) {
      <div class="empty-state">
        <ion-icon name="barbell-outline"></ion-icon>
        <p>No activity recorded yet.</p>
      </div>
    }

    <ion-list lines="none" class="timeline-list">
      @for (event of timeline.events(); track event.id) {
        <!-- Week sticky header -->
        @if (event.weekLabel) {
          <div class="week-header">{{ event.weekLabel }}</div>
        }

        <ion-item class="timeline-item" [class.pr-item]="event.isPR">
          <!-- Left timeline line + dot -->
          <div class="timeline-track" slot="start">
            <div class="track-dot" [style.background]="eventMeta(event.type).color">
              <ion-icon [name]="eventMeta(event.type).icon" [style.color]="event.isPR ? '#1A1A1A' : '#fff'"></ion-icon>
            </div>
            <div class="track-line"></div>
          </div>

          <ion-label>
            <div class="event-row">
              <div class="event-info">
                <h3 class="event-title" [class.pr-title]="event.isPR">{{ event.title }}</h3>
                @if (event.subtitle) {
                  <p class="event-subtitle">{{ event.subtitle }}</p>
                }
              </div>
              @if (event.isPR) {
                <ion-badge class="pr-badge">PR</ion-badge>
              }
            </div>
            <ion-note class="event-date">{{ event.occurred_at | date:'EEE, MMM d · h:mm a' }}</ion-note>
          </ion-label>
        </ion-item>
      }
    </ion-list>

    <ion-infinite-scroll (ionInfinite)="onLoadMore($event)" [disabled]="!timeline.hasMore()">
      <ion-infinite-scroll-content loadingText="Loading more…"></ion-infinite-scroll-content>
    </ion-infinite-scroll>
  `,
  styles: [`
    :host { display: block; }

    .skeleton-list { padding: 0 16px; }
    .skeleton-row {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 20px;
    }
    .skeleton-dot {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(255,255,255,0.08);
      flex-shrink: 0;
      margin-top: 2px;
    }
    .skeleton-text { flex: 1; }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 48px 16px;
      gap: 12px;
      ion-icon { font-size: 48px; color: rgba(255,255,255,0.15); }
      p { margin: 0; font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); }
    }

    .week-header {
      font-size: 11px;
      font-weight: 700;
      color: var(--fitos-text-tertiary, #6B6B6B);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 16px 16px 6px;
      position: sticky;
      top: 0;
      background: var(--fitos-bg-primary, #0D0D0D);
      z-index: 10;
    }

    .timeline-list {
      --ion-item-background: transparent;
      padding: 0;
      background: transparent;
    }

    .timeline-item {
      --padding-start: 16px;
      --inner-padding-end: 16px;
      --min-height: 56px;
      align-items: flex-start;
      --background: transparent;

      &.pr-item {
        --background: rgba(245, 158, 11, 0.04);
      }
    }

    .timeline-track {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-right: 14px;
      padding-top: 6px;
      flex-shrink: 0;
    }
    .track-dot {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      ion-icon { font-size: 16px; }
    }
    .track-line {
      width: 2px;
      flex: 1;
      min-height: 20px;
      background: rgba(255,255,255,0.07);
      margin-top: 4px;
    }

    .event-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .event-info { flex: 1; }
    .event-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      &.pr-title { color: #F59E0B; }
    }
    .event-subtitle {
      margin: 2px 0 0;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }
    .event-date {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin-top: 2px;
    }

    .pr-badge {
      --background: rgba(245, 158, 11, 0.2);
      --color: #F59E0B;
      font-size: 10px;
      font-weight: 800;
      border-radius: 4px;
      padding: 2px 6px;
    }
  `],
})
export class ProgressTimelineComponent implements OnInit, OnChanges {
  @Input({ required: true }) clientId!: string;

  timeline = inject(ProgressTimelineService);

  constructor() {
    addIcons({
      calendarCheckOutline,
      barbellOutline,
      scaleOutline,
      starOutline,
      trophyOutline,
      ribbonOutline,
    });
  }

  ngOnInit(): void {
    if (this.clientId) this.timeline.load(this.clientId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && !changes['clientId'].firstChange) {
      this.timeline.load(this.clientId);
    }
  }

  eventMeta(type: TimelineEventType) {
    return EVENT_META[type] ?? EVENT_META['workout_logged'];
  }

  async onLoadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.timeline.loadMore();
    event.target.complete();
  }
}
