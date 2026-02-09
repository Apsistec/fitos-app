import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  signal,
  inject,
  ViewChild,
  ElementRef,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonTextarea,
  IonItem,
  IonList,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonSpinner,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  playOutline,
  pauseOutline,
  arrowForwardOutline,
  ellipseOutline,
  removeOutline,
  textOutline,
  chatbubbleOutline,
  trashOutline,
  addOutline,
  saveOutline,
} from 'ionicons/icons';

import {
  VideoFeedbackService,
  VideoAnnotation,
  DrawingData,
  CorrectionType,
} from '../../../../core/services/video-feedback.service';


/**
 * VideoAnnotatorComponent - Interactive video annotation tool for trainers
 *
 * Features:
 * - Video playback controls
 * - Canvas drawing overlay (arrows, circles, lines, text)
 * - Timeline with annotation markers
 * - Comment system at specific timestamps
 * - Correction templates (common form issues)
 * - Save/delete annotations
 *
 * Sprint 22: Video Feedback System
 */
@Component({
  selector: 'app-video-annotator',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonCard,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonTextarea,
    IonItem,
    IonList,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonSpinner
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="annotator-container">
      <!-- Video Player with Canvas Overlay -->
      <ion-card class="video-card">
        <ion-card-content>
          <div class="video-wrapper" #videoWrapper>
            <video
              #videoPlayer
              [src]="videoUrl"
              (timeupdate)="onTimeUpdate()"
              (loadedmetadata)="onVideoLoaded()"
              playsinline
            ></video>
            <canvas
              #drawingCanvas
              class="drawing-canvas"
              (mousedown)="onCanvasMouseDown($event)"
              (mousemove)="onCanvasMouseMove($event)"
              (mouseup)="onCanvasMouseUp()"
              (touchstart)="onCanvasTouchStart($event)"
              (touchmove)="onCanvasTouchMove($event)"
              (touchend)="onCanvasTouchEnd()"
            ></canvas>
          </div>

          <!-- Video Controls -->
          <div class="video-controls">
            <ion-button fill="clear" (click)="togglePlayPause()">
              <ion-icon
                slot="icon-only"
                [name]="isPlaying() ? 'pause-outline' : 'play-outline'"
              />
            </ion-button>

            <div class="timeline" (click)="onTimelineClick($event)" #timeline>
              <div
                class="progress"
                [style.width.%]="(currentTime() / duration()) * 100"
              ></div>
              @for (marker of annotationMarkers(); track marker.id) {
                <div
                  class="marker"
                  [style.left.%]="(marker.timestamp / duration()) * 100"
                  [title]="'Annotation at ' + formatTime(marker.timestamp)"
                ></div>
              }
            </div>

            <div class="time-display">
              {{ formatTime(currentTime()) }} / {{ formatTime(duration()) }}
            </div>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Drawing Tools -->
      <ion-card class="tools-card">
        <ion-card-content>
          <h3>Annotation Tools</h3>

          <ion-segment [(ngModel)]="selectedTool" (ionChange)="onToolChange()">
            <ion-segment-button value="arrow">
              <ion-icon name="arrow-forward-outline" />
              <ion-label>Arrow</ion-label>
            </ion-segment-button>
            <ion-segment-button value="circle">
              <ion-icon name="ellipse-outline" />
              <ion-label>Circle</ion-label>
            </ion-segment-button>
            <ion-segment-button value="line">
              <ion-icon name="remove-outline" />
              <ion-label>Line</ion-label>
            </ion-segment-button>
            <ion-segment-button value="text">
              <ion-icon name="text-outline" />
              <ion-label>Text</ion-label>
            </ion-segment-button>
          </ion-segment>

          @if (drawingEnabled()) {
            <p class="help-text">
              {{ getToolHelp() }}
            </p>
          }

          <div class="tool-actions">
            <ion-button
              fill="outline"
              size="small"
              (click)="clearCurrentDrawing()"
              [disabled]="!currentDrawing()"
            >
              Clear Drawing
            </ion-button>
            <ion-button
              size="small"
              (click)="saveDrawing()"
              [disabled]="!currentDrawing()"
            >
              <ion-icon slot="start" name="save-outline" />
              Save Annotation
            </ion-button>
          </div>
        </ion-card-content>
      </ion-card>

      <!-- Comment Section -->
      <ion-card class="comment-card">
        <ion-card-content>
          <h3>Add Comment</h3>

          <ion-item>
            <ion-label position="stacked">Correction Type</ion-label>
            <ion-select
              [(ngModel)]="selectedCorrectionType"
              placeholder="Select correction type"
              interface="action-sheet"
            >
              <ion-select-option value="knee_valgus">Knee Valgus</ion-select-option>
              <ion-select-option value="hip_hinge">Hip Hinge</ion-select-option>
              <ion-select-option value="bar_path">Bar Path</ion-select-option>
              <ion-select-option value="depth">Depth</ion-select-option>
              <ion-select-option value="tempo">Tempo</ion-select-option>
              <ion-select-option value="foot_position">Foot Position</ion-select-option>
              <ion-select-option value="grip_width">Grip Width</ion-select-option>
              <ion-select-option value="elbow_flare">Elbow Flare</ion-select-option>
              <ion-select-option value="lower_back_arch">Lower Back Arch</ion-select-option>
              <ion-select-option value="head_position">Head Position</ion-select-option>
              <ion-select-option value="breathing">Breathing</ion-select-option>
              <ion-select-option value="bracing">Bracing</ion-select-option>
              <ion-select-option value="other">Other</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Comment</ion-label>
            <ion-textarea
              [(ngModel)]="commentText"
              placeholder="Add your feedback here..."
              rows="4"
              [counter]="true"
              maxlength="1000"
            />
          </ion-item>

          <ion-button
            expand="block"
            (click)="saveComment()"
            [disabled]="!commentText || savingComment()"
          >
            @if (savingComment()) {
              <ion-spinner name="crescent" slot="start" />
            } @else {
              <ion-icon slot="start" name="add-outline" />
            }
            Add Comment at {{ formatTime(currentTime()) }}
          </ion-button>
        </ion-card-content>
      </ion-card>

      <!-- Annotations List -->
      <ion-card class="annotations-card">
        <ion-card-content>
          <div class="card-header">
            <h3>Annotations ({{ annotations().length }})</h3>
            @if (loadingAnnotations()) {
              <ion-spinner name="crescent" />
            }
          </div>

          @if (annotations().length === 0) {
            <p class="empty-state">
              No annotations yet. Add drawings or comments using the tools above.
            </p>
          } @else {
            <ion-list>
              @for (annotation of annotations(); track annotation.id) {
                <ion-item>
                  <div class="annotation-item">
                    <div class="annotation-header">
                      <div class="annotation-time">
                        <ion-badge color="primary">
                          {{ formatTime(annotation.timestamp_seconds) }}
                        </ion-badge>
                        @if (annotation.correction_type) {
                          <ion-badge color="warning">
                            {{ formatCorrectionType(annotation.correction_type) }}
                          </ion-badge>
                        }
                      </div>
                      <ion-button
                        fill="clear"
                        size="small"
                        color="danger"
                        (click)="deleteAnnotation(annotation.id)"
                      >
                        <ion-icon slot="icon-only" name="trash-outline" />
                      </ion-button>
                    </div>

                    <div class="annotation-content">
                      @if (annotation.annotation_type === 'drawing') {
                        <p class="annotation-type">
                          Drawing: {{ annotation.drawing_data?.type || 'Unknown' }}
                        </p>
                      }
                      @if (annotation.text_comment) {
                        <p class="comment-text">{{ annotation.text_comment }}</p>
                      }
                    </div>

                    <ion-button
                      fill="clear"
                      size="small"
                      (click)="jumpToTimestamp(annotation.timestamp_seconds)"
                    >
                      Jump to this point
                    </ion-button>
                  </div>
                </ion-item>
              }
            </ion-list>
          }
        </ion-card-content>
      </ion-card>
    </div>
  `,
  styles: [
    `
      .annotator-container {
        padding: 16px;
        max-width: 900px;
        margin: 0 auto;
      }

      ion-card {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      .video-card {
        margin-bottom: 16px;

        .video-wrapper {
          position: relative;
          width: 100%;
          background: #000;
          border-radius: 8px;
          overflow: hidden;

          video {
            width: 100%;
            display: block;
          }

          .drawing-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: auto;
            cursor: crosshair;
          }
        }

        .video-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;

          .timeline {
            flex: 1;
            height: 8px;
            background: var(--fitos-bg-tertiary, #262626);
            border-radius: 4px;
            position: relative;
            cursor: pointer;

            .progress {
              height: 100%;
              background: var(--ion-color-primary, #10B981);
              border-radius: 4px;
              transition: width 150ms ease;
            }

            .marker {
              position: absolute;
              top: 50%;
              transform: translate(-50%, -50%);
              width: 12px;
              height: 12px;
              background: #F59E0B;
              border-radius: 50%;
              border: 2px solid var(--fitos-bg-primary, #0D0D0D);
              pointer-events: none;
            }
          }

          .time-display {
            font-size: 13px;
            font-family: 'Space Mono', monospace;
            color: var(--fitos-text-secondary, #A3A3A3);
            white-space: nowrap;
          }
        }
      }

      .tools-card,
      .comment-card,
      .annotations-card {
        margin-bottom: 16px;

        h3 {
          font-size: 16px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 12px 0;
        }

        .help-text {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 8px 0;
          font-style: italic;
        }

        .tool-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;

          ion-button {
            --border-radius: 8px;
            font-weight: 700;
          }
        }
      }

      .comment-card {
        ion-button[expand="block"] {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .empty-state {
        text-align: center;
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 13px;
        padding: 24px 16px;
      }

      .annotation-item {
        width: 100%;
        padding: 8px 0;

        .annotation-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;

          .annotation-time {
            display: flex;
            align-items: center;
            gap: 8px;

            ion-badge {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 500;
            }
          }
        }

        .annotation-content {
          margin-bottom: 8px;

          .annotation-type {
            font-size: 13px;
            color: var(--fitos-text-tertiary, #737373);
            margin: 0 0 4px 0;
            text-transform: capitalize;
          }

          .comment-text {
            font-size: 14px;
            color: var(--fitos-text-secondary, #A3A3A3);
            margin: 0;
            line-height: 1.5;
          }
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
        --background: transparent;
        margin-bottom: 12px;
      }

      ion-list {
        background: transparent;
      }
    `,
  ],
})
export class VideoAnnotatorComponent implements OnInit, OnDestroy {
  @Input({ required: true }) videoUrl!: string;
  @Input({ required: true }) videoId!: string;
  @Input({ required: true }) trainerId!: string;

  @ViewChild('videoPlayer', { static: false }) videoPlayerRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('drawingCanvas', { static: false }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('videoWrapper', { static: false }) wrapperRef!: ElementRef<HTMLDivElement>;
  @ViewChild('timeline', { static: false }) timelineRef!: ElementRef<HTMLDivElement>;

  private videoFeedbackService = inject(VideoFeedbackService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  // Video state
  isPlaying = signal(false);
  currentTime = signal(0);
  duration = signal(0);

  // Drawing state
  selectedTool = 'arrow';
  drawingEnabled = signal(true);
  currentDrawing = signal<DrawingData | null>(null);
  isDrawing = false;
  drawingStartPoint: { x: number; y: number } | null = null;

  // Annotations
  annotations = signal<VideoAnnotation[]>([]);
  annotationMarkers = signal<{ id: string; timestamp: number }[]>([]);
  loadingAnnotations = signal(false);

  // Comments
  commentText = '';
  selectedCorrectionType: CorrectionType | '' = '';
  savingComment = signal(false);

  // Canvas context
  private ctx: CanvasRenderingContext2D | null = null;

  constructor() {
    addIcons({
      playOutline,
      pauseOutline,
      arrowForwardOutline,
      ellipseOutline,
      removeOutline,
      textOutline,
      chatbubbleOutline,
      trashOutline,
      addOutline,
      saveOutline,
    });
  }

  ngOnInit(): void {
    this.loadAnnotations();
  }

  ngOnDestroy(): void {
    // Clean up
    if (this.videoPlayerRef?.nativeElement) {
      this.videoPlayerRef.nativeElement.pause();
    }
  }

  onVideoLoaded(): void {
    const video = this.videoPlayerRef.nativeElement;
    this.duration.set(video.duration);

    // Set up canvas
    if (this.canvasRef && this.wrapperRef) {
      const canvas = this.canvasRef.nativeElement;
      const wrapper = this.wrapperRef.nativeElement;
      canvas.width = wrapper.clientWidth;
      canvas.height = wrapper.clientHeight;
      this.ctx = canvas.getContext('2d');
    }
  }

  onTimeUpdate(): void {
    const video = this.videoPlayerRef.nativeElement;
    this.currentTime.set(video.currentTime);
  }

  togglePlayPause(): void {
    const video = this.videoPlayerRef.nativeElement;
    if (video.paused) {
      video.play();
      this.isPlaying.set(true);
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
  }

  onTimelineClick(event: MouseEvent): void {
    if (!this.timelineRef) return;

    const timeline = this.timelineRef.nativeElement;
    const rect = timeline.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * this.duration();

    const video = this.videoPlayerRef.nativeElement;
    video.currentTime = newTime;
  }

  jumpToTimestamp(timestamp: number): void {
    const video = this.videoPlayerRef.nativeElement;
    video.currentTime = timestamp;
    video.pause();
    this.isPlaying.set(false);
  }

  // Drawing methods
  onToolChange(): void {
    this.clearCurrentDrawing();
  }

  onCanvasMouseDown(event: MouseEvent): void {
    if (!this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.startDrawing(x, y);
  }

  onCanvasMouseMove(event: MouseEvent): void {
    if (!this.isDrawing || !this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    this.updateDrawing(x, y);
  }

  onCanvasMouseUp(): void {
    this.endDrawing();
  }

  onCanvasTouchStart(event: TouchEvent): void {
    event.preventDefault();
    if (!this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.startDrawing(x, y);
  }

  onCanvasTouchMove(event: TouchEvent): void {
    event.preventDefault();
    if (!this.isDrawing || !this.ctx || !this.canvasRef) return;

    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.updateDrawing(x, y);
  }

  onCanvasTouchEnd(): void {
    this.endDrawing();
  }

  private startDrawing(x: number, y: number): void {
    this.isDrawing = true;
    this.drawingStartPoint = { x, y };
  }

  private updateDrawing(x: number, y: number): void {
    if (!this.ctx || !this.drawingStartPoint) return;

    // Clear canvas
    this.clearCanvas();

    // Draw current shape
    this.ctx.strokeStyle = '#10B981';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    const start = this.drawingStartPoint;

    switch (this.selectedTool) {
      case 'arrow':
        this.drawArrow(start.x, start.y, x, y);
        break;
      case 'circle':
        this.drawCircle(start.x, start.y, x, y);
        break;
      case 'line':
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(x, y);
        this.ctx.stroke();
        break;
    }
  }

  private endDrawing(): void {
    if (!this.isDrawing || !this.drawingStartPoint) return;

    this.isDrawing = false;

    // Create drawing data
    const _canvas = this.canvasRef.nativeElement;
    const currentX = this.drawingStartPoint.x;
    const currentY = this.drawingStartPoint.y;

    const drawingData: DrawingData = {
      type: this.selectedTool as 'arrow' | 'circle' | 'line',
      points: [currentX, currentY],
      color: '#10B981',
      thickness: 3,
    };

    this.currentDrawing.set(drawingData);
    this.drawingStartPoint = null;
  }

  private drawArrow(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.ctx) return;

    // Draw line
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();

    // Draw arrowhead
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 15;
    const arrowAngle = Math.PI / 6;

    this.ctx.beginPath();
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowLength * Math.cos(angle - arrowAngle),
      y2 - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(x2, y2);
    this.ctx.lineTo(
      x2 - arrowLength * Math.cos(angle + arrowAngle),
      y2 - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }

  private drawCircle(x1: number, y1: number, x2: number, y2: number): void {
    if (!this.ctx) return;

    const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    this.ctx.arc(x1, y1, radius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  private clearCanvas(): void {
    if (!this.ctx || !this.canvasRef) return;
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  clearCurrentDrawing(): void {
    this.currentDrawing.set(null);
    this.clearCanvas();
  }

  async saveDrawing(): Promise<void> {
    const drawing = this.currentDrawing();
    if (!drawing) return;

    try {
      const annotation = await this.videoFeedbackService.createAnnotation(this.trainerId, {
        video_id: this.videoId,
        timestamp_seconds: this.currentTime(),
        annotation_type: 'drawing',
        drawing_data: drawing,
      });

      if (annotation) {
        await this.showToast('Drawing annotation saved', 'success');
        this.clearCurrentDrawing();
        await this.loadAnnotations();
      } else {
        throw new Error('Failed to save annotation');
      }
    } catch (err) {
      await this.showToast('Failed to save drawing', 'danger');
      console.error('Error saving drawing:', err);
    }
  }

  async saveComment(): Promise<void> {
    if (!this.commentText.trim()) return;

    this.savingComment.set(true);

    try {
      const annotation = await this.videoFeedbackService.createAnnotation(this.trainerId, {
        video_id: this.videoId,
        timestamp_seconds: this.currentTime(),
        annotation_type: this.selectedCorrectionType ? 'correction' : 'comment',
        text_comment: this.commentText.trim(),
        correction_type: this.selectedCorrectionType || undefined,
      });

      if (annotation) {
        await this.showToast('Comment saved', 'success');
        this.commentText = '';
        this.selectedCorrectionType = '';
        await this.loadAnnotations();
      } else {
        throw new Error('Failed to save comment');
      }
    } catch (err) {
      await this.showToast('Failed to save comment', 'danger');
      console.error('Error saving comment:', err);
    } finally {
      this.savingComment.set(false);
    }
  }

  async loadAnnotations(): Promise<void> {
    this.loadingAnnotations.set(true);

    try {
      const annotations = await this.videoFeedbackService.getVideoAnnotations(this.videoId);
      this.annotations.set(annotations);

      // Create markers for timeline
      const markers = annotations.map((a) => ({
        id: a.id,
        timestamp: a.timestamp_seconds,
      }));
      this.annotationMarkers.set(markers);
    } catch (err) {
      console.error('Error loading annotations:', err);
    } finally {
      this.loadingAnnotations.set(false);
    }
  }

  async deleteAnnotation(annotationId: string): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Annotation',
      message: 'Are you sure you want to delete this annotation?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const success = await this.videoFeedbackService.deleteAnnotation(annotationId);

            if (success) {
              await this.showToast('Annotation deleted', 'success');
              await this.loadAnnotations();
            } else {
              await this.showToast('Failed to delete annotation', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getToolHelp(): string {
    switch (this.selectedTool) {
      case 'arrow':
        return 'Click and drag to draw an arrow pointing to the issue';
      case 'circle':
        return 'Click and drag to draw a circle around the area';
      case 'line':
        return 'Click and drag to draw a line';
      case 'text':
        return 'Click to add text annotation';
      default:
        return '';
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatCorrectionType(type: string): string {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
