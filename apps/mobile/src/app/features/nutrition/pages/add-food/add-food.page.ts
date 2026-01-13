import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonSearchbar,
  IonList,
  IonNote,
  IonSpinner,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  nutritionOutline,
  flameOutline,
  barcodeOutline,
  micOutline,
  cameraOutline,
} from 'ionicons/icons';
import { FoodService, Food } from '../../../../core/services/food.service';
import { VoiceNutritionComponent } from '../../components/voice-nutrition/voice-nutrition.component';
import { FoodConfirmationComponent } from '../../../../shared/components/food-confirmation/food-confirmation.component';
import { ParsedFood } from '../../../../core/services/nutrition-parser.service';
import { PhotoNutritionService } from '../../../../core/services/photo-nutrition.service';
import { HapticService } from '../../../../core/services/haptic.service';

addIcons({
  searchOutline,
  nutritionOutline,
  flameOutline,
  barcodeOutline,
  micOutline,
  cameraOutline,
});

@Component({
  selector: 'app-add-food',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonSearchbar,
    IonList,
    IonNote,
    IonSpinner,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    VoiceNutritionComponent,
    FoodConfirmationComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/nutrition"></ion-back-button>
        </ion-buttons>
        <ion-title>Add Food</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Input Method Tabs -->
      <div class="tabs-container">
        <ion-segment [(ngModel)]="inputMethod" (ionChange)="onInputMethodChange()">
          <ion-segment-button value="search">
            <ion-icon name="search-outline"></ion-icon>
            <ion-label>Search</ion-label>
          </ion-segment-button>
          <ion-segment-button value="voice">
            <ion-icon name="mic-outline"></ion-icon>
            <ion-label>Voice</ion-label>
          </ion-segment-button>
          <ion-segment-button value="photo">
            <ion-icon name="camera-outline"></ion-icon>
            <ion-label>Photo</ion-label>
          </ion-segment-button>
        </ion-segment>
      </div>

      <!-- Food Confirmation (shown when foods are parsed) -->
      @if (parsedFoods().length > 0) {
        <app-food-confirmation
          [foods]="parsedFoods()"
          (confirm)="confirmFoods($event)"
          (cancel)="cancelConfirmation()"
        />
      } @else {
        <!-- Search Tab -->
        @if (inputMethod === 'search') {
          <div class="search-container">
            <ion-searchbar
              [(ngModel)]="searchQuery"
              (ionInput)="onSearchInput($event)"
              (ionClear)="onSearchClear()"
              placeholder="Search for foods..."
              [debounce]="300"
              showClearButton="focus"
            >
              <ion-icon slot="start" name="search-outline"></ion-icon>
            </ion-searchbar>
          </div>
        }

        <!-- Voice Tab -->
        @if (inputMethod === 'voice') {
          <div class="voice-container">
            <app-voice-nutrition
              (foodsConfirmed)="handleVoiceParsedFoods($event)"
            />
          </div>
        }

        <!-- Photo Tab -->
        @if (inputMethod === 'photo') {
          <div class="photo-container">
            <div class="photo-capture">
              <ion-button
                expand="block"
                size="large"
                (click)="capturePhoto()"
                [disabled]="photoNutrition.isProcessing()"
              >
                @if (photoNutrition.isProcessing()) {
                  <ion-spinner slot="start"></ion-spinner>
                  Processing...
                } @else {
                  <ion-icon slot="start" name="camera-outline"></ion-icon>
                  Take Photo
                }
              </ion-button>

              @if (photoNutrition.error()) {
                <div class="error-message">
                  {{ photoNutrition.error() }}
                </div>
              }

              <div class="photo-info">
                <p>Take a photo of your food to automatically identify and log it</p>
                <ul>
                  <li>Works best with single items or plated meals</li>
                  <li>Ensure good lighting</li>
                  <li>You can edit all values before logging</li>
                </ul>
              </div>
            </div>
          </div>
        }
      }

      @if (foodService.loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Searching foods...</p>
        </div>
      } @else if (foodService.error()) {
        <div class="error-container">
          <p class="error-message">{{ foodService.error() }}</p>
          <ion-button (click)="retrySearch()">Retry</ion-button>
        </div>
      } @else {
        <div class="results-container">
          @if (searchQuery && foodService.searchResults().length === 0) {
            <div class="empty-state">
              <ion-icon name="search-outline" class="empty-icon"></ion-icon>
              <p>No foods found for "{{ searchQuery }}"</p>
              <p class="empty-subtitle">Try a different search term</p>
            </div>
          } @else if (!searchQuery) {
            <div class="empty-state">
              <ion-icon name="nutrition-outline" class="empty-icon"></ion-icon>
              <p>Search for foods to add to your log</p>
              <p class="empty-subtitle">Start typing to search the USDA food database</p>
            </div>
          } @else {
            <ion-list lines="none">
              @for (food of foodService.searchResults(); track food.id) {
                <ion-card button (click)="selectFood(food)">
                  <ion-card-header>
                    <div class="food-header">
                      <div class="food-info">
                        <ion-card-title>{{ food.name }}</ion-card-title>
                        @if (food.brand) {
                          <ion-note>{{ food.brand }}</ion-note>
                        }
                      </div>
                      <ion-badge color="primary">
                        <ion-icon name="flame-outline"></ion-icon>
                        {{ food.calories }}
                      </ion-badge>
                    </div>
                  </ion-card-header>

                  <ion-card-content>
                    @if (food.servingSize && food.servingSizeUnit) {
                      <div class="serving-info">
                        <ion-note>Per {{ food.servingSize }}{{ food.servingSizeUnit }}</ion-note>
                      </div>
                    }

                    <div class="macros-grid">
                      <div class="macro-item">
                        <div class="macro-label">Protein</div>
                        <div class="macro-value">{{ food.protein }}g</div>
                      </div>
                      <div class="macro-item">
                        <div class="macro-label">Carbs</div>
                        <div class="macro-value">{{ food.carbs }}g</div>
                      </div>
                      <div class="macro-item">
                        <div class="macro-label">Fat</div>
                        <div class="macro-value">{{ food.fat }}g</div>
                      </div>
                    </div>
                  </ion-card-content>
                </ion-card>
              }
            </ion-list>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .tabs-container {
      padding: 12px 16px;
      background: var(--ion-background-color);
      border-bottom: 1px solid var(--fitos-border-subtle);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    ion-segment {
      --background: var(--fitos-bg-secondary);
    }

    ion-segment-button {
      --indicator-color: var(--fitos-accent-primary);
      --color: var(--fitos-text-secondary);
      --color-checked: var(--fitos-accent-primary);
      min-height: 48px;
    }

    ion-segment-button ion-icon {
      font-size: 20px;
      margin-bottom: 4px;
    }

    ion-segment-button ion-label {
      font-size: 12px;
      margin-top: 4px;
    }

    .search-container {
      padding: 12px 16px 0 16px;
      background: var(--ion-background-color);
    }

    .voice-container,
    .photo-container {
      padding: var(--fitos-space-6);
      max-width: 600px;
      margin: 0 auto;
    }

    .photo-capture {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-4);
      align-items: center;
    }

    .photo-capture ion-button {
      width: 100%;
      max-width: 300px;
      height: 56px;
      font-size: var(--fitos-text-lg);
    }

    .error-message {
      color: var(--fitos-status-error);
      text-align: center;
      padding: var(--fitos-space-3);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);
    }

    .photo-info {
      text-align: center;
      color: var(--fitos-text-secondary);
      max-width: 400px;
    }

    .photo-info p {
      margin: 0 0 var(--fitos-space-4) 0;
      font-size: var(--fitos-text-base);
    }

    .photo-info ul {
      text-align: left;
      margin: 0;
      padding-left: var(--fitos-space-6);
    }

    .photo-info li {
      margin: var(--fitos-space-2) 0;
      font-size: var(--fitos-text-sm);
    }

    .loading-container,
    .error-container,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--ion-color-medium);
    }

    .error-message {
      color: var(--ion-color-danger);
      margin-bottom: 16px;
    }

    .empty-state {
      gap: 12px;
    }

    .empty-icon {
      font-size: 80px;
      color: var(--ion-color-medium);
      opacity: 0.5;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      margin: 0;
      font-size: 1.1rem;
    }

    .empty-subtitle {
      font-size: 0.9rem !important;
    }

    .results-container {
      padding: 16px;
    }

    ion-list {
      padding: 0;
      margin: 0;
    }

    ion-card {
      margin: 0 0 12px 0;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .food-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }

    .food-info {
      flex: 1;
      min-width: 0;
    }

    ion-card-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .food-info ion-note {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    ion-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      flex-shrink: 0;
    }

    ion-badge ion-icon {
      font-size: 14px;
    }

    .serving-info {
      margin-bottom: 12px;
    }

    .serving-info ion-note {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .macro-item {
      text-align: center;
    }

    .macro-label {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .macro-value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ion-color-dark);
    }
  `]
})
export class AddFoodPage implements OnInit {
  foodService = inject(FoodService);
  photoNutrition = inject(PhotoNutritionService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private haptic = inject(HapticService);

  // Input method
  inputMethod: 'search' | 'voice' | 'photo' = 'search';

  // Search
  searchQuery = '';

  // Parsed foods from voice or photo
  parsedFoods = signal<ParsedFood[]>([]);

  ngOnInit() {
    addIcons({
      searchOutline,
      nutritionOutline,
      flameOutline,
      barcodeOutline,
      micOutline,
      cameraOutline,
    });
  }

  onInputMethodChange() {
    this.haptic.light();
    // Clear any existing state when switching tabs
    if (this.inputMethod !== 'search') {
      this.searchQuery = '';
      this.foodService.searchResults.set([]);
    }
  }

  async onSearchInput(event: any) {
    const query = event.target.value;
    if (query && query.trim().length >= 2) {
      await this.foodService.searchFoods(query.trim());
    }
  }

  onSearchClear() {
    this.searchQuery = '';
    this.foodService.searchResults.set([]);
  }

  async retrySearch() {
    if (this.searchQuery) {
      await this.foodService.searchFoods(this.searchQuery);
    }
  }

  async selectFood(food: Food) {
    // TODO: Open food detail modal with serving size selector
    // For now, just navigate back with the selected food
    console.log('Selected food:', food);

    // In the next epic (6.2 Nutrition Logging), we'll:
    // 1. Open a modal to select serving size and meal type
    // 2. Log the food entry
    // 3. Navigate back to nutrition log

    // Placeholder: Navigate back
    this.router.navigate(['/tabs/nutrition']);
  }

  /**
   * Handle foods parsed from voice input
   */
  handleVoiceParsedFoods(foods: ParsedFood[]): void {
    this.haptic.success();
    this.parsedFoods.set(foods);
  }

  /**
   * Capture photo for food recognition
   */
  async capturePhoto(): Promise<void> {
    try {
      this.haptic.light();
      const photo = await this.photoNutrition.capturePhoto();
      const foods = await this.photoNutrition.recognizeFoods(photo);

      if (foods.length > 0) {
        this.haptic.success();
        this.parsedFoods.set(foods);
      } else {
        this.haptic.warning();
        // Stay on photo tab, user can try again
      }
    } catch (err) {
      this.haptic.error();
      console.error('Photo capture failed:', err);
    }
  }

  /**
   * Confirm and log the parsed foods
   */
  async confirmFoods(foods: ParsedFood[]): Promise<void> {
    this.haptic.success();

    // TODO: Log foods to nutrition diary
    console.log('Logging foods:', foods);

    // For now, just navigate back
    this.router.navigate(['/tabs/nutrition']);
  }

  /**
   * Cancel food confirmation
   */
  cancelConfirmation(): void {
    this.haptic.light();
    this.parsedFoods.set([]);
  }
}
