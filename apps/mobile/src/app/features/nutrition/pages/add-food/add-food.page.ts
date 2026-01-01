import { Component, OnInit, inject, signal } from '@angular/core';
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
  IonItem,
  IonLabel,
  IonNote,
  IonSpinner,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonIcon,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  searchOutline,
  nutritionOutline,
  flameOutline,
  barcodeOutline,
} from 'ionicons/icons';
import { FoodService, Food } from '../../../../core/services/food.service';

addIcons({
  searchOutline,
  nutritionOutline,
  flameOutline,
  barcodeOutline,
});

@Component({
  selector: 'app-add-food',
  standalone: true,
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
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonIcon,
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
      <!-- Search Bar -->
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
    .search-container {
      padding: 12px 16px 0 16px;
      background: var(--ion-background-color);
      position: sticky;
      top: 0;
      z-index: 10;
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
  private router = inject(Router);
  private modalCtrl = inject(ModalController);

  searchQuery = '';

  ngOnInit() {
    addIcons({
      searchOutline,
      nutritionOutline,
      flameOutline,
      barcodeOutline,
    });
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
}
