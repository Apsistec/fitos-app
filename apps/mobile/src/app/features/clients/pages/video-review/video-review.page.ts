import {
  Component,
  OnInit,
  signal,
  inject,
  computed,
  effect,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  checkmarkOutline,
  archiveOutline,
  personOutline,
  timeOutline,
  chatbubbleOutline,
} from 'ionicons/icons';

import { VideoFeedbackService, VideoSubmission } from '../../../../core/services/video-feedback.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VideoAnnotatorComponent } from '../../components/video-annotator/video-annotator.component';

/**
 * VideoReviewPage - Trainer video annotation interface
 *
 * Features:
 * - Video playback with controls
 * - Timeline with annotation markers
 * - Drawing overlay (arrows, circles, text)
 * - Comment system tied to timestamps
 * - Common corrections library
 * - Mark as reviewed/archive
 *
 * Sprint 22: Video Feedback System
 */
@Component({
  selector: 'app-video-review',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner,
    VideoAnnotatorComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/clients" />
        </ion-buttons>
        <ion-title>Form Check Review</ion-title>
        <ion-buttons slot="end">
          @if (submission() && submission()!.status !== 'archived') {
            <ion-button (click)="archiveVideo()">
              <ion-icon slot="icon-only" name="archive-outline" />
            </ion-button>
          }
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (loading()) {
        <div class="loading-state">
          <ion-spinner name="crescent" />
          <p>Loading video...</p>
        </div>
      } @else if (error()) {
        <div class="error-state">
          <p class="error-message">{{ error() }}</p>
          <ion-button fill="outline" (click)="loadVideo()">
            Retry
          </ion-button>
        </div>
      } @else if (submission()) {
        <!-- Video Details Card -->
        <ion-card class="details-card">
          <ion-card-header>
            <div class="card-header">
              <ion-card-title>
                {{ submission()!.exercise_name || 'General Form Check' }}
              </ion-card-title>
              <ion-badge [color]="getStatusColor(submission()!.status)">
                {{ submission()!.status }}
              </ion-badge>
            </div>
          </ion-card-header>
          <ion-card-content>
            <div class="meta-info">
              <div class="meta-item">
                <ion-icon name="person-outline" />
                <span>Client ID: {{ submission()!.client_id.substring(0, 8) }}</span>
              </div>
              <div class="meta-item">
                <ion-icon name="time-outline" />
                <span>{{ formatDate(submission()!.submitted_at) }}</span>
              </div>
              @if (submission()!.client_notes) {
                <div class="meta-item client-notes">
                  <ion-icon name="chatbubble-outline" />
                  <div>
                    <strong>Client Notes:</strong>
                    <p>{{ submission()!.client_notes }}</p>
                  </div>
                </div>
              }
            </div>
          </ion-card-content>
        </ion-card>

        <!-- Video Annotator Component -->
        @if (videoUrl()) {
          <app-video-annotator
            [videoUrl]="videoUrl()!"
            [videoId]="videoId()"
            [trainerId]="trainerId()!"
          />
        } @else {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading video URL...</p>
          </div>
        }

        <!-- Action Buttons -->
        <div class="action-buttons">
          @if (submission()!.status === 'pending') {
            <ion-button
              expand="block"
              size="large"
              (click)="markAsReviewed()"
              [disabled]="markingReviewed()"
            >
              @if (markingReviewed()) {
                <ion-spinner name="crescent" slot="start" />
              } @else {
                <ion-icon slot="start" name="checkmark-outline" />
              }
              Mark as Reviewed
            </ion-button>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [
    `
      .loading-state,
      .error-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        padding: var(--fitos-space-6);
        text-align: center;

        ion-spinner {
          margin-bottom: var(--fitos-space-3);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-4) 0;
        }
      }

      .error-message {
        color: var(--ion-color-danger);
      }

      .details-card {
        margin: var(--fitos-space-4);

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--fitos-space-2);

          ion-card-title {
            flex: 1;
            font-size: var(--fitos-font-size-lg);
            font-weight: 600;
          }

          ion-badge {
            text-transform: uppercase;
            font-size: var(--fitos-font-size-xs);
            padding: 4px 12px;
          }
        }

        .meta-info {
          display: flex;
          flex-direction: column;
          gap: var(--fitos-space-2);

          .meta-item {
            display: flex;
            align-items: flex-start;
            gap: var(--fitos-space-2);
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-secondary);

            ion-icon {
              font-size: 18px;
              margin-top: 2px;
              color: var(--fitos-text-tertiary);
            }

            &.client-notes {
              flex-direction: column;
              align-items: stretch;
              padding: var(--fitos-space-3);
              background: var(--fitos-bg-secondary);
              border-radius: var(--fitos-border-radius);
              margin-top: var(--fitos-space-2);

              div {
                width: 100%;
              }

              strong {
                display: block;
                color: var(--fitos-text-primary);
                margin-bottom: var(--fitos-space-1);
              }

              p {
                color: var(--fitos-text-secondary);
                margin: 0;
                line-height: 1.5;
              }
            }
          }
        }
      }

      .action-buttons {
        padding: var(--fitos-space-4);
        padding-bottom: calc(var(--fitos-space-4) + env(safe-area-inset-bottom));

        ion-button {
          margin-bottom: var(--fitos-space-2);

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    `,
  ],
})
export class VideoReviewPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private videoFeedbackService = inject(VideoFeedbackService);
  private authService = inject(AuthService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  // State
  videoId = signal<string>('');
  trainerId = signal<string | null>(null);
  submission = signal<VideoSubmission | null>(null);
  videoUrl = signal<string | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  markingReviewed = signal(false);

  constructor() {
    addIcons({
      arrowBackOutline,
      checkmarkOutline,
      archiveOutline,
      personOutline,
      timeOutline,
      chatbubbleOutline,
    });

    // Load video URL when submission changes
    effect(async () => {
      const sub = this.submission();
      if (sub) {
        const url = await this.videoFeedbackService.getVideoUrl(sub.storage_path);
        this.videoUrl.set(url);
      }
    });
  }

  ngOnInit(): void {
    // Get video ID from route
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('No video ID provided');
      this.loading.set(false);
      return;
    }

    this.videoId.set(id);

    // Get trainer ID
    const user = this.authService.user();
    if (!user || user.role !== 'trainer') {
      this.error.set('Only trainers can review videos');
      this.loading.set(false);
      return;
    }

    this.trainerId.set(user.id);

    // Load video submission
    this.loadVideo();
  }

  async loadVideo(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const submission = await this.videoFeedbackService.getSubmission(this.videoId());

      if (!submission) {
        throw new Error('Video submission not found');
      }

      // Verify trainer has access
      if (submission.trainer_id !== this.trainerId()) {
        throw new Error('You do not have access to this video');
      }

      this.submission.set(submission);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
      this.error.set(errorMessage);
      console.error('Error loading video:', err);
    } finally {
      this.loading.set(false);
    }
  }

  async markAsReviewed(): Promise<void> {
    if (!this.submission()) return;

    this.markingReviewed.set(true);

    try {
      const success = await this.videoFeedbackService.updateSubmissionStatus(
        this.videoId(),
        'reviewed'
      );

      if (success) {
        await this.showToast('Video marked as reviewed', 'success');

        // Update local state
        const current = this.submission();
        if (current) {
          this.submission.set({
            ...current,
            status: 'reviewed',
            reviewed_at: new Date().toISOString(),
          });
        }

        // Navigate back after short delay
        setTimeout(() => {
          this.router.navigate(['/clients']);
        }, 1000);
      } else {
        throw new Error('Failed to update status');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark as reviewed';
      await this.showToast(errorMessage, 'danger');
      console.error('Error marking as reviewed:', err);
    } finally {
      this.markingReviewed.set(false);
    }
  }

  async archiveVideo(): Promise<void> {
    if (!this.submission()) return;

    const alert = await this.alertCtrl.create({
      header: 'Archive Video',
      message: 'Are you sure you want to archive this video? It will be hidden from your pending list.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Archive',
          role: 'destructive',
          handler: async () => {
            const success = await this.videoFeedbackService.updateSubmissionStatus(
              this.videoId(),
              'archived'
            );

            if (success) {
              await this.showToast('Video archived', 'success');

              // Update local state
              const current = this.submission();
              if (current) {
                this.submission.set({
                  ...current,
                  status: 'archived',
                });
              }

              // Navigate back
              this.router.navigate(['/clients']);
            } else {
              await this.showToast('Failed to archive video', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
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
        year: 'numeric',
      });
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'danger'
  ): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
