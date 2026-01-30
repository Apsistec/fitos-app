import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { arrowBackOutline } from 'ionicons/icons';
import { PhotoCaptureComponent } from '../../components/photo-capture/photo-capture.component';
import { FoodIdentificationResultsComponent } from '../../components/food-identification-results/food-identification-results.component';
import { IdentifiedFood } from '@app/core/services/photo-nutrition.service';

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
  `],
})
export class PhotoNutritionPage {
  private router = Router;

  // State
  identifiedFoods = signal<IdentifiedFood[]>([]);

  constructor() {
    addIcons({ arrowBackOutline });
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
    // TODO: Log foods to nutrition diary via NutritionService
    console.log('Logging foods:', foods);

    // For now, navigate back to nutrition page
    // In production, this would save to the database first
    // await this.nutritionService.logFoods(foods);

    // Navigate back with success message
    // this.router.navigate(['/nutrition']);
  }

  /**
   * Retake photo and restart flow
   */
  retakePhoto(): void {
    this.identifiedFoods.set([]);
  }
}
