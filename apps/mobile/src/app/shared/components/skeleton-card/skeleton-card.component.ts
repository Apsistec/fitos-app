import { Component, input } from '@angular/core';
import { IonCard, IonCardHeader, IonCardContent, IonSkeletonText } from '@ionic/angular/standalone';

@Component({
  selector: 'app-skeleton-card',
  standalone: true,
  imports: [IonCard, IonCardHeader, IonCardContent, IonSkeletonText],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-skeleton-text [animated]="true" style="width: 60%; height: 24px;"></ion-skeleton-text>
        @if (showSubtitle()) {
          <ion-skeleton-text [animated]="true" style="width: 40%; height: 16px; margin-top: 8px;"></ion-skeleton-text>
        }
      </ion-card-header>
      @if (showContent()) {
        <ion-card-content>
          <ion-skeleton-text [animated]="true" style="width: 100%; height: 14px;"></ion-skeleton-text>
          <ion-skeleton-text [animated]="true" style="width: 85%; height: 14px; margin-top: 8px;"></ion-skeleton-text>
          @if (showActions()) {
            <div style="display: flex; gap: 8px; margin-top: 16px;">
              <ion-skeleton-text [animated]="true" style="width: 80px; height: 32px; border-radius: 16px;"></ion-skeleton-text>
              <ion-skeleton-text [animated]="true" style="width: 60px; height: 32px; border-radius: 16px;"></ion-skeleton-text>
            </div>
          }
        </ion-card-content>
      }
    </ion-card>
  `,
  styles: [`
    ion-card {
      margin: 12px 0;
    }
  `]
})
export class SkeletonCardComponent {
  showSubtitle = input(true);
  showContent = input(true);
  showActions = input(false);
}
