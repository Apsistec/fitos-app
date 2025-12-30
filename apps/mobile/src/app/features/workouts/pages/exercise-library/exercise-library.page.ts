import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonButtons,
  IonIcon,
  IonSpinner,
  IonChip,
  IonFab,
  IonFabButton
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterOutline, addOutline, closeCircle } from 'ionicons/icons';
import { ExerciseService } from '../../../../core/services/exercise.service';
import { ExerciseCardComponent } from '../../../../shared/components/exercise-card/exercise-card.component';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];

@Component({
  selector: 'app-exercise-library',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonRefresher,
    IonRefresherContent,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonButtons,
    IonIcon,
    IonSpinner,
    IonChip,
    IonFab,
    IonFabButton,
    ExerciseCardComponent
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Exercise Library</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleFilters()">
            <ion-icon slot="icon-only" name="filter-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Search Bar -->
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearchChange($event)"
          placeholder="Search exercises..."
          debounce="300"
        ></ion-searchbar>
      </ion-toolbar>

      <!-- Filters -->
      @if (showFilters()) {
        <ion-toolbar>
          <div class="filters-wrapper">
            <ion-select
              [(ngModel)]="selectedCategory"
              (ionChange)="onFilterChange()"
              placeholder="Category"
              interface="popover"
            >
              <ion-select-option [value]="null">All Categories</ion-select-option>
              @for (category of exerciseService.categories(); track category) {
                <ion-select-option [value]="category">{{ category }}</ion-select-option>
              }
            </ion-select>

            <ion-select
              [(ngModel)]="selectedMuscleGroup"
              (ionChange)="onFilterChange()"
              placeholder="Muscle Group"
              interface="popover"
            >
              <ion-select-option [value]="null">All Muscles</ion-select-option>
              @for (muscle of exerciseService.muscleGroups(); track muscle) {
                <ion-select-option [value]="muscle">{{ muscle }}</ion-select-option>
              }
            </ion-select>

            <ion-select
              [(ngModel)]="selectedEquipment"
              (ionChange)="onFilterChange()"
              placeholder="Equipment"
              interface="popover"
            >
              <ion-select-option [value]="null">All Equipment</ion-select-option>
              @for (equipment of exerciseService.equipmentTypes(); track equipment) {
                <ion-select-option [value]="equipment">{{ equipment }}</ion-select-option>
              }
            </ion-select>

            @if (hasActiveFilters()) {
              <ion-button fill="clear" size="small" (click)="clearFilters()">
                <ion-icon slot="start" name="close-circle"></ion-icon>
                Clear
              </ion-button>
            }
          </div>
        </ion-toolbar>
      }

      <!-- Active Filters Chips -->
      @if (hasActiveFilters()) {
        <ion-toolbar>
          <div class="chips-wrapper">
            @if (selectedCategory) {
              <ion-chip (click)="clearCategory()">
                <ion-label>{{ selectedCategory }}</ion-label>
                <ion-icon name="close-circle"></ion-icon>
              </ion-chip>
            }
            @if (selectedMuscleGroup) {
              <ion-chip (click)="clearMuscleGroup()">
                <ion-label>{{ selectedMuscleGroup }}</ion-label>
                <ion-icon name="close-circle"></ion-icon>
              </ion-chip>
            }
            @if (selectedEquipment) {
              <ion-chip (click)="clearEquipment()">
                <ion-label>{{ selectedEquipment }}</ion-label>
                <ion-icon name="close-circle"></ion-icon>
              </ion-chip>
            }
          </div>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (exerciseService.loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading exercises...</p>
        </div>
      } @else if (exerciseService.error()) {
        <div class="error-container">
          <p class="error-message">{{ exerciseService.error() }}</p>
          <ion-button (click)="loadExercises()">Retry</ion-button>
        </div>
      } @else {
        <div class="exercises-container">
          @if (exerciseService.filteredExercises().length === 0) {
            <div class="empty-state">
              <p>No exercises found</p>
              @if (hasActiveFilters() || searchQuery) {
                <ion-button fill="clear" (click)="clearAll()">Clear filters</ion-button>
              }
            </div>
          } @else {
            <div class="results-count">
              <p>{{ exerciseService.filteredExercises().length }} exercises</p>
            </div>

            @for (exercise of exerciseService.filteredExercises(); track exercise.id) {
              <app-exercise-card
                [exercise]="exercise"
                [showAddButton]="selectionMode()"
                (detailClick)="onExerciseDetail($event)"
                (videoClick)="onExerciseVideo($event)"
                (addClick)="onExerciseAdd($event)"
              ></app-exercise-card>
            }
          }
        </div>
      }

      <!-- Create Custom Exercise FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createCustomExercise()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    .filters-wrapper {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .filters-wrapper ion-select {
      min-width: 140px;
    }

    .chips-wrapper {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
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

    .empty-state p {
      color: var(--ion-color-medium);
      margin-bottom: 16px;
      font-size: 1.1rem;
    }

    .exercises-container {
      padding: 16px;
    }

    .results-count {
      margin-bottom: 8px;
      padding: 0 4px;
    }

    .results-count p {
      font-size: 0.9rem;
      color: var(--ion-color-medium);
      margin: 0;
    }

    ion-fab-button {
      --background: var(--ion-color-primary);
    }
  `]
})
export class ExerciseLibraryPage implements OnInit {
  // Filter state
  searchQuery = '';
  selectedCategory: string | null = null;
  selectedMuscleGroup: string | null = null;
  selectedEquipment: string | null = null;

  // UI state
  showFilters = signal(false);
  selectionMode = signal(false); // For use in workout builder

  constructor(
    public exerciseService: ExerciseService,
    private router: Router
  ) {
    addIcons({ filterOutline, addOutline, closeCircle });
  }

  ngOnInit() {
    this.loadExercises();
  }

  async loadExercises() {
    await this.exerciseService.loadExercises();
  }

  async handleRefresh(event: any) {
    await this.loadExercises();
    event.target.complete();
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value || '';
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.exerciseService.setFilters({
      searchQuery: this.searchQuery || undefined,
      category: this.selectedCategory || undefined,
      muscleGroup: this.selectedMuscleGroup || undefined,
      equipment: this.selectedEquipment || undefined
    });
  }

  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  hasActiveFilters(): boolean {
    return !!(this.selectedCategory || this.selectedMuscleGroup || this.selectedEquipment);
  }

  clearFilters() {
    this.selectedCategory = null;
    this.selectedMuscleGroup = null;
    this.selectedEquipment = null;
    this.applyFilters();
  }

  clearCategory() {
    this.selectedCategory = null;
    this.applyFilters();
  }

  clearMuscleGroup() {
    this.selectedMuscleGroup = null;
    this.applyFilters();
  }

  clearEquipment() {
    this.selectedEquipment = null;
    this.applyFilters();
  }

  clearAll() {
    this.searchQuery = '';
    this.clearFilters();
  }

  onExerciseDetail(exercise: Exercise) {
    // TODO: Navigate to exercise detail page
    console.log('View exercise detail:', exercise.name);
  }

  onExerciseVideo(exercise: Exercise) {
    // TODO: Open video in modal or navigate to video player
    if (exercise.video_url) {
      window.open(exercise.video_url, '_blank');
    }
  }

  onExerciseAdd(exercise: Exercise) {
    // TODO: Emit event or navigate back with selected exercise
    console.log('Add exercise to workout:', exercise.name);
  }

  createCustomExercise() {
    // TODO: Navigate to create exercise page
    console.log('Create custom exercise');
  }
}
