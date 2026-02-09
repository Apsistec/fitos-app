import {
  Component,
  OnInit,
  Input,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonTextarea,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonProgressBar,
  IonSpinner,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  cloudUploadOutline,
  videocamOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';

import { VideoFeedbackService } from '../../../../core/services/video-feedback.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * VideoUploadComponent - Client video submission modal
 *
 * Allows clients to:
 * - Record or select video from gallery
 * - Select exercise being performed
 * - Add notes about what they want feedback on
 * - Upload video to trainer for review
 *
 * Uses Capacitor Camera API for native video recording/selection
 */
@Component({
  selector: 'app-video-upload',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonTextarea,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonProgressBar,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Submit Form Check Video</ion-title>
        <ion-button slot="end" fill="clear" (click)="close()">
          <ion-icon slot="icon-only" name="close-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="upload-container">
        @if (uploadStep() === 'select') {
          <!-- Step 1: Video Selection -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="videocam-outline" />
                Choose Video
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="help-text">
                Record or select a video showing your exercise form. Your trainer will provide feedback.
              </p>

              <div class="video-actions">
                <ion-button expand="block" (click)="recordVideo()">
                  <ion-icon slot="start" name="videocam-outline" />
                  Record Video
                </ion-button>
                <ion-button expand="block" fill="outline" (click)="selectVideo()">
                  <ion-icon slot="start" name="cloud-upload-outline" />
                  Choose from Gallery
                </ion-button>
              </div>

              @if (selectedVideo()) {
                <div class="video-preview">
                  <video
                    #videoPreview
                    [src]="videoPreviewUrl()"
                    controls
                    playsinline
                  ></video>
                  <div class="video-info">
                    <p><strong>File:</strong> {{ selectedVideo()?.name }}</p>
                    <p><strong>Size:</strong> {{ formatFileSize(selectedVideo()?.size || 0) }}</p>
                  </div>
                  <ion-button fill="clear" size="small" (click)="clearVideo()">
                    Change Video
                  </ion-button>
                </div>
              }
            </ion-card-content>
          </ion-card>

          @if (selectedVideo()) {
            <ion-button expand="block" size="large" (click)="nextStep()">
              Continue
              <ion-icon slot="end" name="arrow-forward-outline" />
            </ion-button>
          }
        } @else if (uploadStep() === 'details') {
          <!-- Step 2: Exercise Details -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Exercise Details</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-item>
                <ion-label position="stacked">Exercise (Optional)</ion-label>
                <ion-select
                  [(ngModel)]="exerciseId"
                  placeholder="Select exercise"
                  interface="action-sheet"
                >
                  @for (exercise of exercises; track exercise.id) {
                    <ion-select-option [value]="exercise.id">
                      {{ exercise.name }}
                    </ion-select-option>
                  }
                </ion-select>
              </ion-item>

              <ion-item>
                <ion-label position="stacked">
                  What do you want feedback on?
                </ion-label>
                <ion-textarea
                  [(ngModel)]="clientNotes"
                  placeholder="e.g., 'Is my bar path straight?' or 'Check my squat depth'"
                  rows="4"
                  [counter]="true"
                  maxlength="500"
                />
              </ion-item>
            </ion-card-content>
          </ion-card>

          <div class="actions">
            <ion-button fill="outline" (click)="previousStep()">
              <ion-icon slot="start" name="arrow-back-outline" />
              Back
            </ion-button>
            <ion-button expand="block" (click)="nextStep()">
              Continue
              <ion-icon slot="end" name="arrow-forward-outline" />
            </ion-button>
          </div>
        } @else if (uploadStep() === 'confirm') {
          <!-- Step 3: Confirm & Upload -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Review & Submit</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="review-item">
                <strong>Video:</strong>
                <p>{{ selectedVideo()?.name }}</p>
              </div>

              @if (exerciseName()) {
                <div class="review-item">
                  <strong>Exercise:</strong>
                  <p>{{ exerciseName() }}</p>
                </div>
              }

              @if (clientNotes) {
                <div class="review-item">
                  <strong>Your Notes:</strong>
                  <p>{{ clientNotes }}</p>
                </div>
              }

              <p class="help-text">
                Your trainer will review this video and provide feedback with annotations and comments.
              </p>
            </ion-card-content>
          </ion-card>

          @if (uploading()) {
            <div class="upload-progress">
              <ion-spinner name="crescent" />
              <p>Uploading video...</p>
              <ion-progress-bar [value]="uploadProgress() / 100" />
              <p class="progress-text">{{ uploadProgress() }}%</p>
            </div>
          } @else {
            <div class="actions">
              <ion-button fill="outline" (click)="previousStep()">
                <ion-icon slot="start" name="arrow-back-outline" />
                Back
              </ion-button>
              <ion-button expand="block" (click)="submitVideo()">
                <ion-icon slot="start" name="cloud-upload-outline" />
                Submit for Review
              </ion-button>
            </div>
          }
        } @else if (uploadStep() === 'success') {
          <!-- Step 4: Success -->
          <div class="success-state">
            <ion-icon name="checkmark-circle-outline" color="success" />
            <h2>Video Submitted!</h2>
            <p>Your trainer will review your form and provide feedback soon.</p>

            <ion-button expand="block" (click)="close()">
              Done
            </ion-button>
            <ion-button fill="outline" expand="block" (click)="resetAndSubmitAnother()">
              Submit Another Video
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      ion-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      .upload-container {
        padding: 16px;
        max-width: 600px;
        margin: 0 auto;
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

        ion-icon {
          font-size: 20px;
          color: var(--ion-color-primary, #10B981);
        }
      }

      .help-text {
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0 0 12px 0;
        line-height: 1.5;
      }

      .video-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
        margin-bottom: 16px;

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
        }

        ion-button:first-child {
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }

      .video-preview {
        margin-top: 16px;
        padding: 12px;
        background: var(--fitos-bg-tertiary, #262626);
        border-radius: 12px;

        video {
          width: 100%;
          max-height: 300px;
          border-radius: 8px;
          margin-bottom: 8px;
        }

        .video-info {
          margin: 8px 0;

          p {
            font-size: 13px;
            color: var(--fitos-text-secondary, #A3A3A3);
            margin: 4px 0;
          }
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
        --background: transparent;
        margin-bottom: 12px;
      }

      .review-item {
        margin-bottom: 12px;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);

        &:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }

        strong {
          display: block;
          font-size: 11px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 600;
        }

        p {
          font-size: 14px;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0;
        }
      }

      .upload-progress {
        text-align: center;
        padding: 32px 16px;

        ion-spinner {
          margin-bottom: 12px;
        }

        p {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 8px 0;
        }

        .progress-text {
          font-size: 18px;
          font-weight: 700;
          color: var(--ion-color-primary, #10B981);
          font-family: 'Space Mono', monospace;
        }

        ion-progress-bar {
          height: 12px;
          border-radius: 6px;
          margin: 12px 0;
        }
      }

      .success-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 48px 16px;

        ion-icon {
          font-size: 120px;
          margin-bottom: 16px;
        }

        h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;
        }

        p {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 32px 0;
          max-width: 400px;
        }

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          margin-bottom: 8px;

          &:first-child {
            --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
          }

          &:last-child {
            margin-bottom: 0;
          }
        }
      }

      .actions {
        display: flex;
        gap: 8px;
        margin-top: 16px;

        ion-button {
          flex: 1;
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
        }

        ion-button[fill="outline"] {
          max-width: 120px;
        }
      }
    `,
  ],
})
export class VideoUploadComponent implements OnInit {
  @Input() trainerId = '';
  @Input() exercises: { id: string; name: string }[] = []; // Exercise list passed in

  private videoFeedbackService = inject(VideoFeedbackService);
  private authService = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // State
  uploadStep = signal<'select' | 'details' | 'confirm' | 'success'>('select');
  selectedVideo = signal<File | null>(null);
  videoPreviewUrl = signal<string>('');
  exerciseId = '';
  exerciseName = signal<string>('');
  clientNotes = '';
  uploading = signal(false);
  uploadProgress = signal(0);
  exercises = signal<{ id: string; name: string }[]>([]);

  constructor() {
    addIcons({
      closeOutline,
      cloudUploadOutline,
      videocamOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    // Exercises will be passed via Input
  }

  async recordVideo(): Promise<void> {
    try {
      const _video = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        quality: 90,
        // Note: Capacitor Camera doesn't directly support video recording
        // In production, you'd use a different plugin like @capacitor-community/media
        // or native video capture
      });

      // For now, this is a placeholder
      await this.showToast(
        'Video recording requires native plugin integration',
        'warning'
      );
    } catch (err) {
      console.error('Error recording video:', err);
    }
  }

  async selectVideo(): Promise<void> {
    try {
      // Create file input programmatically
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/mp4,video/quicktime,video/x-msvideo';
      input.onchange = (event: Event) => {
        const file = (event.target as HTMLInputElement)?.files?.[0];
        if (file) {
          // Validate file size (max 100MB)
          if (file.size > 100 * 1024 * 1024) {
            this.showToast('Video must be under 100MB', 'danger');
            return;
          }

          this.selectedVideo.set(file);
          this.videoPreviewUrl.set(URL.createObjectURL(file));
        }
      };
      input.click();
    } catch (err) {
      console.error('Error selecting video:', err);
      await this.showToast('Failed to select video', 'danger');
    }
  }

  clearVideo(): void {
    if (this.videoPreviewUrl()) {
      URL.revokeObjectURL(this.videoPreviewUrl());
    }
    this.selectedVideo.set(null);
    this.videoPreviewUrl.set('');
  }

  nextStep(): void {
    const current = this.uploadStep();
    if (current === 'select') {
      this.uploadStep.set('details');
    } else if (current === 'details') {
      // Set exercise name if selected
      if (this.exerciseId) {
        const exercise = this.exercises().find((e) => e.id === this.exerciseId);
        this.exerciseName.set(exercise?.name || '');
      }
      this.uploadStep.set('confirm');
    }
  }

  previousStep(): void {
    const current = this.uploadStep();
    if (current === 'details') {
      this.uploadStep.set('select');
    } else if (current === 'confirm') {
      this.uploadStep.set('details');
    }
  }

  async submitVideo(): Promise<void> {
    const video = this.selectedVideo();
    if (!video) {
      await this.showToast('No video selected', 'danger');
      return;
    }

    this.uploading.set(true);
    this.uploadProgress.set(0);

    try {
      const clientId = this.authService.user()?.id;
      if (!clientId) {
        throw new Error('Not authenticated');
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        const current = this.uploadProgress();
        if (current < 90) {
          this.uploadProgress.set(current + 10);
        }
      }, 300);

      // Upload video file
      const storagePath = await this.videoFeedbackService.uploadVideo(
        video,
        clientId,
        this.exerciseId || undefined
      );

      clearInterval(progressInterval);
      this.uploadProgress.set(100);

      if (!storagePath) {
        throw new Error('Failed to upload video');
      }

      // Create video submission record
      const submission = await this.videoFeedbackService.createSubmission({
        client_id: clientId,
        trainer_id: this.trainerId,
        exercise_id: this.exerciseId || undefined,
        exercise_name: this.exerciseName() || undefined,
        storage_path: storagePath,
        file_size_bytes: video.size,
        client_notes: this.clientNotes || undefined,
      });

      if (!submission) {
        throw new Error('Failed to create submission');
      }

      this.uploadStep.set('success');
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit video';
      await this.showToast(errorMessage, 'danger');
      console.error('Error submitting video:', err);
    } finally {
      this.uploading.set(false);
    }
  }

  resetAndSubmitAnother(): void {
    this.clearVideo();
    this.exerciseId = '';
    this.exerciseName.set('');
    this.clientNotes = '';
    this.uploadStep.set('select');
    this.uploadProgress.set(0);
  }

  close(): void {
    this.clearVideo();
    this.modalCtrl.dismiss();
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
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
