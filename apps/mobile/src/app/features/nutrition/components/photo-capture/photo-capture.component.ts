import { Component, inject, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonActionSheet,
  IonCard,
  IonCardContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { cameraOutline, imagesOutline, closeOutline } from 'ionicons/icons';
import { CameraSource, Photo } from '@capacitor/camera';
import { PhotoNutritionService, IdentifiedFood } from '@app/core/services/photo-nutrition.service';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

@Component({
  selector: 'app-photo-capture',
  standalone: true,
  imports: [
    CommonModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonActionSheet,
    IonCard,
    IonCardContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="photo-capture">
      <!-- Camera Preview or Placeholder -->
      @if (capturedPhoto()) {
        <div class="photo-preview">
          <img [src]="getPhotoUrl()" alt="Captured food" />
          <button class="remove-photo" (click)="removePhoto()">
            <ion-icon name="close-outline"></ion-icon>
          </button>
        </div>
      } @else {
        <div class="camera-placeholder">
          <ion-icon name="camera-outline"></ion-icon>
          <p>Take a photo of your meal</p>
        </div>
      }

      <!-- Action Buttons -->
      <div class="action-buttons">
        @if (!capturedPhoto()) {
          <!-- Camera/Gallery Source Selector -->
          <ion-button
            expand="block"
            size="large"
            (click)="showSourceActionSheet()"
            [disabled]="photoService.isProcessing()"
          >
            <ion-icon slot="start" name="camera-outline"></ion-icon>
            Add Photo
          </ion-button>
        } @else if (!photoService.isProcessing()) {
          <!-- Analyze Button -->
          <ion-button
            expand="block"
            size="large"
            color="success"
            (click)="analyzePhoto()"
          >
            <ion-icon slot="start" name="camera-outline"></ion-icon>
            Analyze Food
          </ion-button>
        } @else {
          <!-- Processing State -->
          <div class="processing-state">
            <ion-spinner name="crescent"></ion-spinner>
            <span>Identifying foods...</span>
          </div>
        }
      </div>

      <!-- Error Message -->
      @if (photoService.error()) {
        <ion-card class="error-card">
          <ion-card-content>
            <p class="error-text">{{ photoService.error() }}</p>
            <ion-button
              size="small"
              fill="outline"
              (click)="photoService.clearError()"
            >
              Dismiss
            </ion-button>
          </ion-card-content>
        </ion-card>
      }

      <!-- Action Sheet for Source Selection -->
      <ion-action-sheet
        [isOpen]="showActionSheet()"
        header="Choose Photo Source"
        [buttons]="actionSheetButtons"
        (didDismiss)="showActionSheet.set(false)"
      ></ion-action-sheet>
    </div>
  `,
  styles: [`
    .photo-capture {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px;
    }

    .camera-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      border: 2px dashed rgba(255, 255, 255, 0.06);

      ion-icon {
        font-size: 80px;
        color: var(--fitos-text-tertiary, #737373);
        margin-bottom: 16px;
      }

      p {
        margin: 0;
        font-size: 16px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .photo-preview {
      position: relative;
      border-radius: 12px;
      overflow: hidden;

      img {
        width: 100%;
        height: auto;
        display: block;
      }

      .remove-photo {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(10px);
        border: none;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 150ms ease;

        ion-icon {
          font-size: 24px;
          color: white;
        }

        &:hover {
          background: rgba(0, 0, 0, 0.8);
          transform: scale(1.1);
        }

        &:active {
          transform: scale(0.95);
        }
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;

      ion-button {
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }

    .processing-state {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;

      ion-spinner {
        --color: var(--ion-color-primary, #10B981);
      }

      span {
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
      }
    }

    .error-card {
      --background: rgba(239, 68, 68, 0.1);
      border: 1px solid #EF4444;
      border-radius: 12px;
      margin: 0;

      .error-text {
        margin: 0 0 12px;
        color: #FCA5A5;
        font-size: 13px;
      }
    }
  `],
})
export class PhotoCaptureComponent {
  photoService = inject(PhotoNutritionService);

  // State
  capturedPhoto = signal<Photo | null>(null);
  showActionSheet = signal(false);

  // Output events
  foodsIdentified = output<IdentifiedFood[]>();

  // Action sheet buttons
  actionSheetButtons = [
    {
      text: 'Take Photo',
      icon: 'camera-outline',
      handler: () => this.captureFromCamera(),
    },
    {
      text: 'Choose from Gallery',
      icon: 'images-outline',
      handler: () => this.captureFromGallery(),
    },
    {
      text: 'Cancel',
      role: 'cancel',
    },
  ];

  constructor() {
    addIcons({ cameraOutline, imagesOutline, closeOutline });
  }

  /**
   * Show source selection action sheet
   */
  async showSourceActionSheet(): Promise<void> {
    // Check permissions first
    const hasPermission = await this.photoService.checkPermissions();
    if (!hasPermission) {
      const granted = await this.photoService.requestPermissions();
      if (!granted) {
        return;
      }
    }

    this.showActionSheet.set(true);
  }

  /**
   * Capture photo from camera
   */
  async captureFromCamera(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      const photo = await this.photoService.capturePhoto(CameraSource.Camera);
      this.capturedPhoto.set(photo);
    } catch (err) {
      console.error('Error capturing photo from camera:', err);
    }
  }

  /**
   * Capture photo from gallery
   */
  async captureFromGallery(): Promise<void> {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
      const photo = await this.photoService.capturePhoto(CameraSource.Photos);
      this.capturedPhoto.set(photo);
    } catch (err) {
      console.error('Error capturing photo from gallery:', err);
    }
  }

  /**
   * Remove captured photo
   */
  async removePhoto(): Promise<void> {
    await Haptics.impact({ style: ImpactStyle.Light });
    this.capturedPhoto.set(null);
    this.photoService.clearError();
  }

  /**
   * Analyze captured photo
   */
  async analyzePhoto(): Promise<void> {
    const photo = this.capturedPhoto();
    if (!photo) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
      const foods = await this.photoService.recognizeFoods(photo);

      if (foods.length > 0) {
        await Haptics.notification({ type: NotificationType.Success });
        this.foodsIdentified.emit(foods);
      } else {
        await Haptics.notification({ type: NotificationType.Warning });
      }
    } catch (err) {
      await Haptics.notification({ type: NotificationType.Error });
      console.error('Error analyzing photo:', err);
    }
  }

  /**
   * Get photo URL for display
   */
  getPhotoUrl(): string {
    const photo = this.capturedPhoto();
    if (!photo || !photo.base64String) return '';
    return `data:image/${photo.format};base64,${photo.base64String}`;
  }
}
