import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonIcon,
  IonContent,
  IonBadge,
  IonChip,
  IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  playCircleOutline,
  barbellOutline,
  bodyOutline,
  hardwareChipOutline
} from 'ionicons/icons';
import { Database } from '@fitos/shared';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type Exercise = Database['public']['Tables']['exercises']['Row'];

addIcons({
  closeOutline,
  playCircleOutline,
  barbellOutline,
  bodyOutline,
  hardwareChipOutline
});

@Component({
  selector: 'app-exercise-detail-modal',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonContent,
    IonBadge,
    IonChip,
    IonLabel
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ exercise().name }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <!-- Custom Badge -->
      @if (!exercise().is_system) {
        <div class="badge-section">
          <ion-badge color="primary">Custom Exercise</ion-badge>
        </div>
      }

      <!-- Video Section -->
      @if (exercise().video_url && getEmbedUrl(exercise().video_url!)) {
        <div class="video-section">
          <div class="video-wrapper">
            <iframe
              [src]="getEmbedUrl(exercise().video_url!)"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen
            ></iframe>
          </div>
        </div>
      } @else if (exercise().video_url) {
        <div class="video-section">
          <ion-button expand="block" [href]="exercise().video_url!" target="_blank">
            <ion-icon slot="start" name="play-circle-outline"></ion-icon>
            Watch Video Demo
          </ion-button>
        </div>
      }

      <!-- Description -->
      @if (exercise().description) {
        <div class="section">
          <h2>Description</h2>
          <p class="description">{{ exercise().description }}</p>
        </div>
      }

      <!-- Primary Muscle Group -->
      <div class="section">
        <h2>
          <ion-icon name="body-outline"></ion-icon>
          Primary Muscle
        </h2>
        <ion-chip color="primary">
          <ion-label>{{ formatMuscleGroup(exercise().primary_muscle) }}</ion-label>
        </ion-chip>
      </div>

      <!-- Secondary Muscles -->
      @if (exercise().secondary_muscles && exercise().secondary_muscles!.length > 0) {
        <div class="section">
          <h2>Secondary Muscles</h2>
          <div class="chips-grid">
            @for (muscle of exercise().secondary_muscles; track muscle) {
              <ion-chip>
                <ion-label>{{ formatMuscleGroup(muscle) }}</ion-label>
              </ion-chip>
            }
          </div>
        </div>
      }

      <!-- Equipment -->
      @if (exercise().equipment && exercise().equipment!.length > 0) {
        <div class="section">
          <h2>
            <ion-icon name="barbell-outline"></ion-icon>
            Equipment Needed
          </h2>
          <div class="chips-grid">
            @for (item of exercise().equipment; track item) {
              <ion-chip color="tertiary">
                <ion-label>{{ formatEquipment(item) }}</ion-label>
              </ion-chip>
            }
          </div>
        </div>
      }

      <!-- Category -->
      <div class="section">
        <h2>Category</h2>
        <ion-badge [color]="getCategoryColor(exercise().category)">
          {{ formatCategory(exercise().category) }}
        </ion-badge>
      </div>

      <!-- Instructions (if available) -->
      @if (exercise().instructions) {
        <div class="section">
          <h2>Instructions</h2>
          <ol class="instructions-list">
            @for (instruction of parseInstructions(exercise().instructions!); track $index) {
              <li>{{ instruction }}</li>
            }
          </ol>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .badge-section {
      margin-bottom: 1rem;
    }

    .video-section {
      margin-bottom: 1.5rem;
    }

    .video-wrapper {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
      border-radius: 8px;
    }

    .video-wrapper iframe {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 8px;
    }

    .section {
      margin-bottom: 1.5rem;
    }

    .section h2 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--ion-color-dark);
    }

    .section h2 ion-icon {
      font-size: 1.2rem;
    }

    .description {
      color: var(--ion-color-medium);
      line-height: 1.6;
      margin: 0;
    }

    .chips-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .instructions-list,
    .tips-list {
      padding-left: 1.5rem;
      margin: 0;
    }

    .instructions-list li,
    .tips-list li {
      margin-bottom: 0.5rem;
      color: var(--ion-color-medium);
      line-height: 1.6;
    }
  `]
})
export class ExerciseDetailModal {
  exercise = input.required<Exercise>();
  private modalCtrl = inject(ModalController);
  private sanitizer = inject(DomSanitizer);

  dismiss() {
    this.modalCtrl.dismiss();
  }

  formatMuscleGroup(muscle: string): string {
    return muscle
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatEquipment(equipment: string): string {
    return equipment
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'strength':
        return 'primary';
      case 'cardio':
        return 'danger';
      case 'flexibility':
        return 'success';
      case 'balance':
        return 'warning';
      case 'plyometric':
        return 'tertiary';
      default:
        return 'medium';
    }
  }

  getEmbedUrl(url: string): SafeResourceUrl | null {
    // Convert YouTube URLs to embed URLs
    const youtubeRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/;
    const match = url.match(youtubeRegex);

    if (match && match[1]) {
      const embedUrl = `https://www.youtube.com/embed/${match[1]}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(embedUrl);
    }

    // For other video platforms, return null (will show link button instead)
    return null;
  }

  parseInstructions(instructions: string): string[] {
    // Split by newline or numbered list
    return instructions
      .split(/\n|(?=\d+\.)/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .map(s => s.replace(/^\d+\.\s*/, '')); // Remove numbering
  }
}
