import { Component, signal, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline, cloudOfflineOutline } from 'ionicons/icons';
import { PhotoCaptureComponent } from '../../components/photo-capture/photo-capture.component';
import { FoodIdentificationResultsComponent } from '../../components/food-identification-results/food-identification-results.component';
import { IdentifiedFood } from '../../../../core/services/photo-nutrition.service';
import { NutritionService } from '../../../../core/services/nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { SyncService } from '../../../../core/services/sync.service';

/**
 * PhotoNutritionPage - Photo-to-nutrition AI flow
 *
 * Flow:
 * 1. Capture photo (camera or gallery)
 * 2. Analyze photo with AI
 * 3. Show identified foods with confidence
 * 4. Allow editing/adjusting portions
 * 5. Confirm and log to nutrition diary
 */
@Component({
  selector: 'app-photo-nutrition',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    PhotoCaptureComponent,
    FoodIdentificationResultsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/nutrition" icon="arrow-back-outline"></ion-back-button>
        </ion-buttons>
        <ion-title>Photo Food Logger</ion-title>
        @if (identifiedFoods().length > 0) {
          <ion-buttons slot="end">
            <ion-button (click)="retakePhoto()">
              Retake
            </ion-button>
          </ion-buttons>
        }
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="photo-nutrition-page">
        @if (!syncService.isOnline()) {
          <!-- Offline placeholder -->
          <div class="offline-placeholder">
            <div class="offline-icon-ring">
              <ion-icon name="cloud-offline-outline"></ion-icon>
            </div>
            <h2>Available When Online</h2>
            <p>Photo food logging requires an internet connection to analyze images with AI.</p>
            <p class="offline-hint">You can still log food manually from the nutrition page.</p>
          </div>
        } @else {
          <!-- Step 1: Photo Capture -->
          @if (identifiedFoods().length === 0) {
            <app-photo-capture
              (foodsIdentified)="onFoodsIdentified($event)"
            ></app-photo-capture>
          }

          <!-- Step 2: Results & Editing -->
          @if (identifiedFoods().length > 0) {
            <app-food-identification-results
              [foods]="identifiedFoods()"
              (foodsConfirmed)="onFoodsConfirmed($event)"
              (foodRemoved)="onFoodRemoved($event)"
              (foodEdited)="onFoodEdited($event)"
            ></app-food-identification-results>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .photo-nutrition-page {
      min-height: 100%;
    }

    .offline-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 24px;
      gap: 12px;
      text-align: center;
    }

    .offline-icon-ring {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(245, 158, 11, 0.1);
      border: 2px solid rgba(245, 158, 11, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .offline-icon-ring ion-icon {
      font-size: 48px;
      color: #F59E0B;
    }

    .offline-placeholder h2 {
      font-size: 20px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0;
    }

    .offline-placeholder p {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      line-height: 1.5;
      max-width: 320px;
    }

    .offline-hint {
      font-size: 13px !important;
      color: var(--fitos-text-tertiary, #737373) !important;
      margin-top: 8px !important;
    }
  `],
})
export class PhotoNutritionPage {
  private router = inject(Router);
  private nutritionService = inject(NutritionService);
  private authService = inject(AuthService);
  private haptic = inject(HapticService);
  private toastCtrl = inject(ToastController);
  syncService = inject(SyncService);

  // State
  identifiedFoods = signal<IdentifiedFood[]>([]);
  isLogging = signal(false);

  constructor() {
    addIcons({ arrowBackOutline, cloudOfflineOutline });
  }

  /**
   * Handle foods identified from photo
   */
  onFoodsIdentified(foods: IdentifiedFood[]): void {
    this.identifiedFoods.set(foods);
  }

  /**
   * Handle food removed from results
   */
  onFoodRemoved(index: number): void {
    const foods = [...this.identifiedFoods()];
    foods.splice(index, 1);
    this.identifiedFoods.set(foods);
  }

  /**
   * Handle food edited
   */
  onFoodEdited(event: { index: number; food: IdentifiedFood }): void {
    const foods = [...this.identifiedFoods()];
    foods[event.index] = event.food;
    this.identifiedFoods.set(foods);
  }

  /**
   * Handle foods confirmed and ready to log
   */
  async onFoodsConfirmed(foods: IdentifiedFood[]): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      await this.showToast('Please log in to add foods', 'warning');
      return;
    }

    this.isLogging.set(true);
    await this.haptic.light();

    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split('T')[0];

      // Load or create today's nutrition log
      const log = await this.nutritionService.loadNutritionLog(userId, today);

      if (!log) {
        throw new Error('Failed to load nutrition log');
      }

      // Log each food item
      let successCount = 0;
      for (const food of foods) {
        const entry = await this.nutritionService.addEntry(log.log.id, {
          custom_name: food.foodName,
          servings: food.servingQty,
          calories: Math.round(food.calories),
          protein_g: Math.round(food.protein * 10) / 10,
          carbs_g: Math.round(food.carbs * 10) / 10,
          fat_g: Math.round(food.fat * 10) / 10,
          meal_type: this.inferMealType(),
        });

        if (entry) {
          successCount++;
        }
      }

      if (successCount === foods.length) {
        await this.haptic.success();
        await this.showToast(
          successCount === 1
            ? 'Food logged successfully!'
            : `${successCount} foods logged successfully!`,
          'success'
        );
      } else if (successCount > 0) {
        await this.haptic.warning();
        await this.showToast(
          `${successCount} of ${foods.length} foods logged`,
          'warning'
        );
      } else {
        throw new Error('Failed to log foods');
      }

      // Navigate back to nutrition log
      this.router.navigate(['/tabs/nutrition']);
    } catch (error) {
      console.error('Error logging foods:', error);
      await this.haptic.error();
      await this.showToast('Failed to log foods. Please try again.', 'danger');
    } finally {
      this.isLogging.set(false);
    }
  }

  /**
   * Infer meal type based on current time
   */
  private inferMealType(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 15 && hour < 18) return 'snack';
    if (hour >= 18 && hour < 22) return 'dinner';
    return 'snack'; // Late night
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  /**
   * Retake photo and restart flow
   */
  retakePhoto(): void {
    this.identifiedFoods.set([]);
  }
}
