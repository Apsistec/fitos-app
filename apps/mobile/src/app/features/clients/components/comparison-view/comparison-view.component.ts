import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
  IonButton,
  IonButtons,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonIcon,
  IonContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { ProgressPhoto } from '../../../../core/services/progress-photo.service';

@Component({
  selector: 'app-comparison-view',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    IonButton,
    IonButtons,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonIcon,
    IonContent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Before & After</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="close.emit()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="comparison-container">
        <!-- Labels row -->
        <div class="label-row">
          <span class="date-label">{{ photoA.taken_at | date:'MMM d, y' }}</span>
          <span class="vs-badge">VS</span>
          <span class="date-label">{{ photoB.taken_at | date:'MMM d, y' }}</span>
        </div>

        <!-- Side-by-side images -->
        <div class="split-view">
          <div class="photo-panel left-panel">
            <img
              [src]="photoA.photo_url"
              [alt]="'Progress photo ' + (photoA.taken_at | date:'MMM d')"
              class="comparison-img"
            />
            @if (photoA.notes) {
              <div class="photo-notes">{{ photoA.notes }}</div>
            }
          </div>

          <div class="divider-line"></div>

          <div class="photo-panel right-panel">
            <img
              [src]="photoB.photo_url"
              [alt]="'Progress photo ' + (photoB.taken_at | date:'MMM d')"
              class="comparison-img"
            />
            @if (photoB.notes) {
              <div class="photo-notes">{{ photoB.notes }}</div>
            }
          </div>
        </div>

        <!-- Duration badge -->
        <div class="duration-row">
          <div class="duration-badge">
            {{ daysBetween() }} days of progress
          </div>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: #0D0D0D;
      --border-width: 0;
    }
    ion-title { font-size: 17px; font-weight: 700; }

    ion-content { --background: #0D0D0D; }

    .comparison-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: 0 0 16px;
    }

    .label-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px 8px;
    }

    .date-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }

    .vs-badge {
      font-size: 11px;
      font-weight: 800;
      color: var(--fitos-accent-primary, #10B981);
      background: rgba(16, 185, 129, 0.12);
      padding: 3px 10px;
      border-radius: 20px;
      letter-spacing: 1px;
    }

    .split-view {
      display: flex;
      flex: 1;
      position: relative;
      overflow: hidden;
      min-height: 0;
    }

    .photo-panel {
      flex: 1;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .comparison-img {
      width: 100%;
      flex: 1;
      object-fit: cover;
      object-position: top center;
    }

    .divider-line {
      width: 2px;
      background: var(--fitos-accent-primary, #10B981);
      flex-shrink: 0;
      z-index: 5;
    }

    .photo-notes {
      padding: 8px 10px;
      font-size: 11px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      background: rgba(0,0,0,0.6);
      font-style: italic;
    }

    .duration-row {
      display: flex;
      justify-content: center;
      padding: 14px 16px 0;
    }

    .duration-badge {
      font-size: 13px;
      font-weight: 700;
      color: var(--fitos-accent-primary, #10B981);
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      padding: 6px 16px;
      border-radius: 20px;
    }
  `],
})
export class ComparisonViewComponent {
  @Input({ required: true }) photoA!: ProgressPhoto;
  @Input({ required: true }) photoB!: ProgressPhoto;
  @Output() close = new EventEmitter<void>();

  constructor() {
    addIcons({ closeOutline });
  }

  daysBetween(): number {
    const a = new Date(this.photoA.taken_at).getTime();
    const b = new Date(this.photoB.taken_at).getTime();
    return Math.abs(Math.round((b - a) / (1000 * 60 * 60 * 24)));
  }
}
