import {
  Component,
  OnInit,
  Input,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  videocamOutline,
  chevronForwardOutline,
  timeOutline,
} from 'ionicons/icons';

import {
  VideoFeedbackService,
  VideoSubmission,
} from '../../../../core/services/video-feedback.service';

/**
 * PendingVideosComponent - Shows pending video submissions for a trainer
 *
 * Displays:
 * - List of pending form check videos
 * - Exercise name and submission date
 * - Client notes preview
 * - Quick access to review each video
 *
 * Sprint 22: Video Feedback System
 */
@Component({
  selector: 'app-pending-videos',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <div class="card-header">
          <ion-card-title>
            <ion-icon name="videocam-outline" />
            Form Check Videos
          </ion-card-title>
          @if (pendingCount() > 0) {
            <ion-badge color="warning">
              {{ pendingCount() }} pending
            </ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading videos...</p>
          </div>
        } @else if (videos().length === 0) {
          <div class="empty-state">
            <ion-icon name="videocam-outline" />
            <p>No video submissions yet</p>
          </div>
        } @else {
          <ion-list>
            @for (video of videos(); track video.id) {
              <ion-item
                button
                (click)="openVideoReview(video.id)"
                [detail]="true"
              >
                <div class="video-item">
                  <div class="video-header">
                    <strong>{{ video.exercise_name || 'General Form Check' }}</strong>
                    <ion-badge [color]="getStatusColor(video.status)">
                      {{ video.status }}
                    </ion-badge>
                  </div>

                  <div class="video-meta">
                    <ion-icon name="time-outline" />
                    <span>{{ formatDate(video.submitted_at) }}</span>
                  </div>

                  @if (video.client_notes) {
                    <p class="video-notes">
                      {{ truncateText(video.client_notes, 80) }}
                    </p>
                  }
                </div>
              </ion-item>
            }
          </ion-list>

          @if (hasMore()) {
            <ion-button
              fill="clear"
              expand="block"
              size="small"
              (click)="loadMore()"
            >
              View All Videos
            </ion-button>
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      ion-card {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;

        ion-card-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);

          ion-icon {
            font-size: 20px;
            color: var(--ion-color-primary, #10B981);
          }
        }

        ion-badge {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          padding: 4px 10px;
        }
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 24px 16px;
        text-align: center;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 8px;
        }

        ion-spinner {
          margin-bottom: 8px;
        }

        p {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
        }
      }

      .video-item {
        width: 100%;
        padding: 8px 0;

        .video-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 4px;

          strong {
            font-size: 14px;
            color: var(--fitos-text-primary, #F5F5F5);
          }

          ion-badge {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            font-weight: 500;
          }
        }

        .video-meta {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-bottom: 8px;
          font-size: 13px;
          color: var(--fitos-text-tertiary, #737373);

          ion-icon {
            font-size: 14px;
          }
        }

        .video-notes {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0;
          line-height: 1.4;
          font-style: italic;
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
        --background: transparent;
      }

      ion-list {
        background: transparent;
      }
    `,
  ],
})
export class PendingVideosComponent implements OnInit {
  @Input({ required: true }) trainerId!: string;
  @Input() clientId?: string; // Optional: filter by specific client
  @Input() limit = 5; // Show first 5 by default

  private videoFeedbackService = inject(VideoFeedbackService);
  private router = inject(Router);

  // State
  videos = signal<VideoSubmission[]>([]);
  loading = signal(true);
  hasMore = signal(false);

  pendingCount = signal(0);

  constructor() {
    addIcons({
      videocamOutline,
      chevronForwardOutline,
      timeOutline,
    });
  }

  ngOnInit(): void {
    this.loadVideos();
  }

  async loadVideos(): Promise<void> {
    this.loading.set(true);

    try {
      let allVideos = await this.videoFeedbackService.getTrainerSubmissions(
        this.trainerId
      );

      // Filter by client if specified
      if (this.clientId) {
        allVideos = allVideos.filter((v) => v.client_id === this.clientId);
      }

      // Sort: pending first, then by date
      allVideos.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime();
      });

      // Count pending
      const pendingCount = allVideos.filter((v) => v.status === 'pending').length;
      this.pendingCount.set(pendingCount);

      // Apply limit
      if (allVideos.length > this.limit) {
        this.videos.set(allVideos.slice(0, this.limit));
        this.hasMore.set(true);
      } else {
        this.videos.set(allVideos);
        this.hasMore.set(false);
      }
    } catch (err) {
      console.error('Error loading videos:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openVideoReview(videoId: string): void {
    this.router.navigate(['/tabs/clients/video-review', videoId]);
  }

  loadMore(): void {
    // Navigate to full videos list or increase limit
    // For now, just show all
    this.limit = 999;
    this.loadVideos();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'reviewed':
        return 'success';
      case 'archived':
        return 'medium';
      default:
        return 'medium';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  }

  truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }
}
