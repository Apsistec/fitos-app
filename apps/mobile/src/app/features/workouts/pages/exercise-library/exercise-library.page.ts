import {  Component, OnInit, signal, computed, inject , ChangeDetectionStrategy } from '@angular/core';
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
  IonFabButton,
  IonGrid,
  IonRow,
  IonCol,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  ModalController,
  RefresherCustomEvent,
  InfiniteScrollCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { filterOutline, addOutline, closeCircle } from 'ionicons/icons';

// Register icons at file level
addIcons({ filterOutline, addOutline, closeCircle });
import { ExerciseService } from '../../../../core/services/exercise.service';
import { ExerciseCardComponent } from '../../../../shared/components/exercise-card/exercise-card.component';
import { ExerciseDetailModal } from '../../../../shared/modals/exercise-detail/exercise-detail.modal';
import { Database } from '@fitos/shared';

type Exercise = Database['public']['Tables']['exercises']['Row'];

@Component({
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-exercise-library',
  imports: [

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
    IonGrid,
    IonRow,
    IonCol,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ExerciseCardComponent
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Exercise Library</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="toggleFilters()" aria-label="Toggle filters">
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

            <ion-grid>
              <ion-row>
                @for (exercise of visibleExercises(); track exercise.id) {
                  <ion-col size="12" sizeMd="6" sizeLg="4" sizeXl="3">
                    <app-exercise-card
                      [exercise]="exercise"
                      [showAddButton]="selectionMode()"
                      (detailClick)="onExerciseDetail($event)"
                      (videoClick)="onExerciseVideo($event)"
                      (editClick)="editExercise($event)"
                      (addClick)="onExerciseAdd($event)"
                    ></app-exercise-card>
                  </ion-col>
                }
              </ion-row>
            </ion-grid>

            <!-- Infinite scroll for progressive rendering -->
            <ion-infinite-scroll
              [disabled]="visibleExercises().length >= exerciseService.filteredExercises().length"
              (ionInfinite)="loadMoreExercises($event)"
            >
              <ion-infinite-scroll-content loadingSpinner="crescent"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
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
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    ion-searchbar {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      --color: var(--fitos-text-primary, #F5F5F5);
      --placeholder-color: var(--fitos-text-tertiary, #737373);
    }

    .filters-wrapper {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .filters-wrapper ion-select {
      min-width: 140px;
      font-size: 13px;
    }

    .chips-wrapper {
      display: flex;
      gap: 8px;
      padding: 8px 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    ion-chip {
      --background: var(--fitos-bg-tertiary, #262626);
      --color: var(--fitos-text-primary, #F5F5F5);
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

    .error-message {
      color: #FCA5A5;
      margin-bottom: 16px;
      font-size: 14px;
    }

    .empty-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 16px;
      font-size: 14px;
    }

    .exercises-container {
      padding: 16px;
    }

    .results-count {
      margin-bottom: 8px;
      padding: 0 4px;
    }

    .results-count p {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      margin: 0;
    }

    ion-fab-button {
      --background: var(--ion-color-primary, #10B981);
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }
  `]
})
export class ExerciseLibraryPage implements OnInit {
  exerciseService = inject(ExerciseService);
  private router = inject(Router);
  private modalCtrl = inject(ModalController);

  // Filter state
  searchQuery = '';
  selectedCategory: string | null = null;
  selectedMuscleGroup: string | null = null;
  selectedEquipment: string | null = null;

  // UI state
  showFilters = signal(false);
  selectionMode = signal(false); // For use in workout builder

  // Progressive rendering: show 20 items initially, load more on scroll
  private readonly PAGE_SIZE = 20;
  displayCount = signal(this.PAGE_SIZE);

  visibleExercises = computed(() =>
    this.exerciseService.filteredExercises().slice(0, this.displayCount())
  );

  ngOnInit() {
    this.loadExercises();
  }

  async loadExercises() {
    this.displayCount.set(this.PAGE_SIZE);
    await this.exerciseService.loadExercises();
  }

  loadMoreExercises(event: InfiniteScrollCustomEvent): void {
    this.displayCount.update(count => count + this.PAGE_SIZE);
    setTimeout(() => event.target.complete(), 100);
  }

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadExercises();
    event.target.complete();
  }

  onSearchChange(event: CustomEvent) {
    this.searchQuery = event.detail.value || '';
    this.applyFilters();
  }

  onFilterChange() {
    this.applyFilters();
  }

  applyFilters() {
    this.displayCount.set(this.PAGE_SIZE);
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

  async onExerciseDetail(exercise: Exercise) {
    const modal = await this.modalCtrl.create({
      component: ExerciseDetailModal,
      componentProps: { exercise }
    });
    await modal.present();
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
    this.router.navigate(['/tabs/workouts/exercises/new']);
  }

  editExercise(exercise: Exercise) {
    // Only allow editing custom exercises (non-system)
    if (!exercise.is_system) {
      this.router.navigate(['/tabs/workouts/exercises', exercise.id, 'edit']);
    }
  }
}
