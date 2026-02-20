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
  AlertController,
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
import { NutritionService } from '../../../../core/services/nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';
import { VoiceNutritionComponent } from '../../components/voice-nutrition/voice-nutrition.component';
import { FoodConfirmationComponent } from '../../../../shared/components/food-confirmation/food-confirmation.component';
import { ParsedFood } from '../../../../core/services/nutrition-parser.service';
import { PhotoNutritionService } from '../../../../core/services/photo-nutrition.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { ToastController } from '@ionic/angular/standalone';

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
    <ion-header class="ion-no-border">
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
          <ion-segment-button value="barcode">
            <ion-icon name="barcode-outline"></ion-icon>
            <ion-label>Scan</ion-label>
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

        <!-- Barcode Scan Tab -->
        @if (inputMethod === 'barcode') {
          <div class="barcode-container">
            <div class="barcode-capture">
              <div class="barcode-icon-ring">
                <ion-icon name="barcode-outline" class="barcode-hero-icon"></ion-icon>
              </div>
              <p class="barcode-desc">Scan a food product barcode to instantly log nutrition info</p>
              <ion-button
                expand="block"
                size="large"
                (click)="openBarcodeScanner()"
                class="barcode-open-btn"
              >
                <ion-icon slot="start" name="barcode-outline"></ion-icon>
                Open Barcode Scanner
              </ion-button>
            </div>
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
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .tabs-container {
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      position: sticky;
      top: 0;
      z-index: 10;
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary, #262626);
    }

    ion-segment-button {
      --indicator-color: var(--ion-color-primary, #10B981);
      --color: var(--fitos-text-secondary, #A3A3A3);
      --color-checked: var(--ion-color-primary, #10B981);
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
    }

    .voice-container,
    .photo-container,
    .barcode-container {
      padding: 32px;
      max-width: 600px;
      margin: 0 auto;
    }

    .barcode-capture {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
    }

    .barcode-icon-ring {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .barcode-hero-icon {
      font-size: 40px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .barcode-desc {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      margin: 0;
      line-height: 1.5;
    }

    .barcode-open-btn {
      width: 100%;
      max-width: 300px;
      height: 56px;
      font-size: 16px;
      --border-radius: 8px;
      font-weight: 700;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .photo-capture {
      display: flex;
      flex-direction: column;
      gap: 16px;
      align-items: center;
    }

    .photo-capture ion-button {
      width: 100%;
      max-width: 300px;
      height: 56px;
      font-size: 16px;
      --border-radius: 8px;
      font-weight: 700;
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    .error-message {
      color: #FCA5A5;
      text-align: center;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      font-size: 14px;
    }

    .photo-info {
      text-align: center;
      color: var(--fitos-text-secondary, #A3A3A3);
      max-width: 400px;
    }

    .photo-info p {
      margin: 0 0 16px 0;
      font-size: 14px;
    }

    .photo-info ul {
      text-align: left;
      margin: 0;
      padding-left: 24px;
    }

    .photo-info li {
      margin: 8px 0;
      font-size: 13px;
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
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    .empty-state {
      gap: 12px;
    }

    .empty-icon {
      font-size: 48px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .empty-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
      font-size: 14px;
    }

    .empty-subtitle {
      font-size: 13px !important;
    }

    .results-container {
      padding: 16px;
    }

    ion-list {
      padding: 0;
      margin: 0;
      background: transparent;
    }

    ion-card {
      margin: 0 0 12px 0;
      cursor: pointer;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      transition: transform 150ms ease, box-shadow 150ms ease;
    }

    ion-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 0 24px rgba(16, 185, 129, 0.08);
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
      font-size: 14px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0 0 4px 0;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    .food-info ion-note {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    ion-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      flex-shrink: 0;
      font-family: 'Space Mono', monospace;
    }

    ion-badge ion-icon {
      font-size: 14px;
    }

    .serving-info {
      margin-bottom: 12px;
    }

    .serving-info ion-note {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
    }

    .macros-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }

    .macro-item {
      text-align: center;
      padding: 8px;
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 8px;
    }

    .macro-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
      font-weight: 500;
    }

    .macro-value {
      font-size: 14px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }
  `]
})
export class AddFoodPage implements OnInit {
  foodService = inject(FoodService);
  photoNutrition = inject(PhotoNutritionService);
  private nutritionService = inject(NutritionService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private haptic = inject(HapticService);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  // Input method
  inputMethod: 'search' | 'barcode' | 'voice' | 'photo' = 'search';

  // Search
  searchQuery = '';

  // Parsed foods from voice or photo
  parsedFoods = signal<ParsedFood[]>([]);

  // Loading state for food logging
  isLogging = signal(false);

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

  openBarcodeScanner(): void {
    this.haptic.light();
    this.router.navigate(['/tabs/nutrition/scan']);
  }

  async onSearchInput(event: Event) {
    const query = (event.target as HTMLInputElement).value;
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
    const userId = this.authService.user()?.id;
    if (!userId) {
      await this.showToast('Please log in to add foods', 'warning');
      return;
    }

    // Present serving size selector
    const servingAlert = await this.alertCtrl.create({
      header: food.name,
      subHeader: food.brand
        ? `${food.brand} • ${food.calories} cal per serving`
        : `${food.calories} cal per serving`,
      inputs: [
        {
          name: 'servings',
          type: 'number',
          placeholder: 'Number of servings',
          value: 1,
          min: 0.25,
          max: 20,
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Log Food',
          handler: async (data) => {
            const servings = parseFloat(data.servings) || 1;
            await this.logFoodEntry(food, servings);
          },
        },
      ],
    });

    await servingAlert.present();
  }

  /**
   * Log a food entry from USDA search to the nutrition diary
   */
  private async logFoodEntry(food: Food, servings: number): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) return;

    this.isLogging.set(true);
    this.haptic.light();

    try {
      const today = new Date().toISOString().split('T')[0];
      const log = await this.nutritionService.loadNutritionLog(userId, today);

      if (!log) {
        throw new Error('Failed to load nutrition log');
      }

      const entry = await this.nutritionService.addEntry(log.log.id, {
        food_id: food.id,
        custom_name: food.name,
        servings,
        calories: Math.round(food.calories * servings),
        protein_g: Math.round(food.protein * servings * 10) / 10,
        carbs_g: Math.round(food.carbs * servings * 10) / 10,
        fat_g: Math.round(food.fat * servings * 10) / 10,
        meal_type: this.inferMealType(),
      });

      if (entry) {
        await this.haptic.success();
        await this.showToast('Food logged successfully!', 'success');
        this.router.navigate(['/tabs/nutrition']);
      } else {
        throw new Error('Failed to log food');
      }
    } catch (error) {
      console.error('Error logging food:', error);
      await this.haptic.error();
      await this.showToast('Failed to log food. Please try again.', 'danger');
    } finally {
      this.isLogging.set(false);
    }
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
   * Confirm and log the parsed foods to the nutrition diary
   */
  async confirmFoods(foods: ParsedFood[]): Promise<void> {
    const userId = this.authService.user()?.id;
    if (!userId) {
      await this.showToast('Please log in to add foods', 'warning');
      return;
    }

    this.isLogging.set(true);
    this.haptic.light();

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
   * Cancel food confirmation
   */
  cancelConfirmation(): void {
    this.haptic.light();
    this.parsedFoods.set([]);
  }
}
