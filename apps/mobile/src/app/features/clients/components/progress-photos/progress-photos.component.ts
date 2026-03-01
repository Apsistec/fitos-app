import {
  Component,
  Input,
  OnInit,
  OnChanges,
  SimpleChanges,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonSkeletonText,
  IonActionSheet,
  AlertController,
  ModalController,
  ToastController,
  InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imagesOutline,
  trashOutline,
  expandOutline,
  shuffleOutline,
  notificationsOutline,
  checkmarkOutline,
  closeOutline,
} from 'ionicons/icons';
import {
  ProgressPhotoService,
  ProgressPhoto,
} from '../../../../core/services/progress-photo.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ComparisonViewComponent } from '../comparison-view/comparison-view.component';

@Component({
  selector: 'app-progress-photos',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonButton,
    IonButtons,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonSkeletonText,
    ComparisonViewComponent,
  ],
  template: `
    <!-- ── Comparison view overlay ──────────────────────────────────────── -->
    @if (comparingPhotos() && selectedPair().length === 2) {
      <div class="comparison-overlay">
        <app-comparison-view
          [photoA]="selectedPair()[0]"
          [photoB]="selectedPair()[1]"
          (close)="exitComparisonMode()"
        />
      </div>
    }

    <!-- ── Main content ─────────────────────────────────────────────────── -->
    @if (!comparingPhotos()) {
      <!-- Trainer: request check-in banner -->
      @if (isTrainerView() && photoService.photos().length > 0) {
        <div class="action-bar">
          <button class="action-btn" (click)="requestCheckin()">
            <ion-icon name="notifications-outline"></ion-icon>
            Request Check-In
          </button>
        </div>
      }

      <!-- Comparison mode hint -->
      @if (photoService.photos().length >= 2) {
        <div class="mode-bar">
          @if (!selectingForComparison()) {
            <button class="mode-btn" (click)="enterSelectionMode()">
              <ion-icon name="shuffle-outline"></ion-icon>
              Compare Photos
            </button>
          } @else {
            <span class="selection-hint">
              Select {{ 2 - selectedPair().length }} more photo{{ 2 - selectedPair().length === 1 ? '' : 's' }}
            </span>
            <button class="mode-btn cancel-btn" (click)="exitComparisonMode()">
              <ion-icon name="close-outline"></ion-icon>
              Cancel
            </button>
          }
        </div>
      }

      <!-- Skeleton grid on first load -->
      @if (photoService.isLoading() && photoService.photos().length === 0) {
        <div class="photo-grid">
          @for (i of [1,2,3,4,5,6,7,8,9]; track i) {
            <div class="photo-cell skeleton-cell">
              <ion-skeleton-text animated></ion-skeleton-text>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!photoService.isLoading() && photoService.photos().length === 0) {
        <div class="empty-state">
          <ion-icon name="images-outline"></ion-icon>
          <p>No progress photos yet.</p>
          @if (!isTrainerView()) {
            <p class="empty-hint">Tap the camera button to take your first photo.</p>
          }
        </div>
      }

      <!-- Photo grid -->
      @if (photoService.photos().length > 0) {
        <div class="photo-grid">
          @for (photo of photoService.photos(); track photo.id) {
            <div
              class="photo-cell"
              [class.selected]="isSelected(photo)"
              [class.selection-mode]="selectingForComparison()"
              (click)="onPhotoClick(photo)"
              (contextmenu)="onPhotoLongPress(photo, $event)"
            >
              <img
                [src]="photo.thumbnail_url"
                [alt]="'Progress photo ' + (photo.taken_at | date:'MMM d')"
                class="thumb-img"
                loading="lazy"
              />

              <!-- Date overlay -->
              <div class="date-overlay">
                {{ photo.taken_at | date:'MMM d' }}
              </div>

              <!-- Pair indicator -->
              @if (photo.pair_id) {
                <div class="pair-dot"></div>
              }

              <!-- Selection overlay -->
              @if (selectingForComparison()) {
                <div class="select-overlay" [class.active]="isSelected(photo)">
                  @if (isSelected(photo)) {
                    <ion-icon name="checkmark-outline" class="check-icon"></ion-icon>
                  }
                </div>
              }
            </div>
          }
        </div>

        <ion-infinite-scroll
          (ionInfinite)="onLoadMore($event)"
          [disabled]="!photoService.hasMore()"
        >
          <ion-infinite-scroll-content loadingText="Loading more…"></ion-infinite-scroll-content>
        </ion-infinite-scroll>
      }

      <!-- FAB: client only - take a photo -->
      @if (!isTrainerView()) {
        <ion-fab vertical="bottom" horizontal="end" slot="fixed">
          <ion-fab-button
            (click)="takePhoto()"
            [disabled]="photoService.isUploading()"
          >
            @if (photoService.isUploading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="camera-outline"></ion-icon>
            }
          </ion-fab-button>
        </ion-fab>
      }

      <!-- Trainer: request check-in FAB when no photos -->
      @if (isTrainerView() && photoService.photos().length === 0) {
        <div class="empty-trainer-cta">
          <button class="request-btn" (click)="requestCheckin()">
            <ion-icon name="notifications-outline"></ion-icon>
            Request Photo Check-In
          </button>
        </div>
      }
    }
  `,
  styles: [`
    :host { display: block; position: relative; min-height: 200px; }

    /* ── Comparison overlay ───────────────────────────────────────────────── */
    .comparison-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      background: #0D0D0D;
    }

    /* ── Action / mode bars ──────────────────────────────────────────────── */
    .action-bar, .mode-bar {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 10px 16px;
      gap: 10px;
    }

    .action-btn, .mode-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 20px;
      padding: 7px 14px;
      color: var(--fitos-text-primary, #F5F5F5);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      ion-icon { font-size: 15px; }
    }

    .action-btn {
      border-color: rgba(16, 185, 129, 0.3);
      color: var(--fitos-accent-primary, #10B981);
      background: rgba(16, 185, 129, 0.08);
    }

    .cancel-btn {
      border-color: rgba(255,255,255,0.15);
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .selection-hint {
      flex: 1;
      font-size: 13px;
      font-weight: 700;
      color: var(--fitos-accent-primary, #10B981);
    }

    /* ── Photo grid ──────────────────────────────────────────────────────── */
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2px;
      padding: 0 0 80px; /* space for FAB */
    }

    .photo-cell {
      position: relative;
      aspect-ratio: 1;
      overflow: hidden;
      background: rgba(255,255,255,0.04);
      cursor: pointer;
      transition: opacity 150ms;

      &.selection-mode { opacity: 0.7; }
      &.selected { opacity: 1; }
      &:active { opacity: 0.8; }
    }

    .thumb-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .date-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 4px 6px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.85);
    }

    .pair-dot {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--fitos-accent-primary, #10B981);
      box-shadow: 0 0 4px rgba(16,185,129,0.8);
    }

    /* ── Selection overlay ───────────────────────────────────────────────── */
    .select-overlay {
      position: absolute;
      inset: 0;
      border: 3px solid transparent;
      transition: border-color 150ms, background 150ms;
      display: flex;
      align-items: center;
      justify-content: center;

      &.active {
        border-color: var(--fitos-accent-primary, #10B981);
        background: rgba(16, 185, 129, 0.15);
      }
    }

    .check-icon {
      font-size: 28px;
      color: var(--fitos-accent-primary, #10B981);
      filter: drop-shadow(0 0 6px rgba(16,185,129,0.9));
    }

    /* ── Skeletons ───────────────────────────────────────────────────────── */
    .skeleton-cell {
      ion-skeleton-text {
        width: 100%;
        height: 100%;
        margin: 0;
        border-radius: 0;
      }
    }

    /* ── Empty state ─────────────────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px 24px;
      gap: 12px;
      ion-icon { font-size: 52px; color: rgba(255,255,255,0.12); }
      p {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .empty-hint {
      font-size: 13px !important;
      font-weight: 400 !important;
      color: var(--fitos-text-tertiary, #6B6B6B) !important;
      text-align: center;
    }

    /* ── Empty trainer CTA ───────────────────────────────────────────────── */
    .empty-trainer-cta {
      display: flex;
      justify-content: center;
      padding: 20px 24px;
    }

    .request-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      border-radius: 12px;
      padding: 12px 20px;
      color: var(--fitos-accent-primary, #10B981);
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      ion-icon { font-size: 18px; }
    }

    /* ── FAB ─────────────────────────────────────────────────────────────── */
    ion-fab-button {
      --background: var(--fitos-accent-primary, #10B981);
      --color: #fff;
    }
  `],
})
export class ProgressPhotosComponent implements OnInit, OnChanges {
  @Input({ required: true }) clientId!: string;
  @Input() isTrainerView = signal(false);

  photoService = inject(ProgressPhotoService);
  private auth = inject(AuthService);
  private alertCtrl = inject(AlertController);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);

  // ── Comparison mode state ────────────────────────────────────────────────
  selectingForComparison = signal(false);
  comparingPhotos = signal(false);
  selectedPair = signal<ProgressPhoto[]>([]);

  constructor() {
    addIcons({
      cameraOutline,
      imagesOutline,
      trashOutline,
      expandOutline,
      shuffleOutline,
      notificationsOutline,
      checkmarkOutline,
      closeOutline,
    });
  }

  ngOnInit(): void {
    if (this.clientId) this.photoService.load(this.clientId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['clientId'] && !changes['clientId'].firstChange) {
      this.photoService.load(this.clientId);
    }
  }

  // ── Photo capture ────────────────────────────────────────────────────────

  async takePhoto(): Promise<void> {
    const result = await this.photoService.captureAndUpload();
    if (!result) {
      if (this.photoService.error()) {
        const toast = await this.toastCtrl.create({
          message: this.photoService.error() ?? 'Upload failed',
          duration: 2500,
          color: 'warning',
          position: 'bottom',
        });
        await toast.present();
      }
    }
  }

  // ── Photo tap / long-press ───────────────────────────────────────────────

  async onPhotoClick(photo: ProgressPhoto): Promise<void> {
    if (this.selectingForComparison()) {
      this._toggleSelection(photo);
      return;
    }
    // Show full-screen detail with delete option
    await this._showPhotoDetail(photo);
  }

  onPhotoLongPress(photo: ProgressPhoto, event: Event): void {
    event.preventDefault();
    this.enterSelectionMode();
    this._toggleSelection(photo);
  }

  private async _showPhotoDetail(photo: ProgressPhoto): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: new Date(photo.taken_at).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      message: photo.notes ?? 'No notes.',
      buttons: [
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this._confirmDelete(photo),
        },
        { text: 'Close', role: 'cancel' },
      ],
    });
    await alert.present();
  }

  private async _confirmDelete(photo: ProgressPhoto): Promise<void> {
    const confirm = await this.alertCtrl.create({
      header: 'Delete Photo?',
      message: 'This photo will be permanently deleted.',
      buttons: [
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            await this.photoService.deletePhoto(photo);
          },
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await confirm.present();
  }

  // ── Comparison mode ──────────────────────────────────────────────────────

  enterSelectionMode(): void {
    this.selectingForComparison.set(true);
    this.selectedPair.set([]);
  }

  exitComparisonMode(): void {
    this.selectingForComparison.set(false);
    this.comparingPhotos.set(false);
    this.selectedPair.set([]);
  }

  isSelected(photo: ProgressPhoto): boolean {
    return this.selectedPair().some((p) => p.id === photo.id);
  }

  private _toggleSelection(photo: ProgressPhoto): void {
    const current = this.selectedPair();
    if (this.isSelected(photo)) {
      this.selectedPair.set(current.filter((p) => p.id !== photo.id));
    } else if (current.length < 2) {
      const next = [...current, photo];
      this.selectedPair.set(next);
      if (next.length === 2) {
        // Auto-launch comparison
        this.comparingPhotos.set(true);
      }
    }
  }

  // ── Trainer actions ──────────────────────────────────────────────────────

  async requestCheckin(): Promise<void> {
    await this.photoService.requestCheckin(this.clientId, 'your client');
    const toast = await this.toastCtrl.create({
      message: 'Check-in request sent!',
      duration: 2000,
      color: 'success',
      position: 'bottom',
    });
    await toast.present();
  }

  // ── Infinite scroll ──────────────────────────────────────────────────────

  async onLoadMore(event: InfiniteScrollCustomEvent): Promise<void> {
    await this.photoService.loadMore();
    event.target.complete();
  }
}
