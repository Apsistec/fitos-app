import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardContent,
  IonSkeletonText,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  peopleOutline,
  flashOutline,
  flameOutline,
  trophyOutline,
  barChartOutline,
  checkmarkCircleOutline,
  heartOutline,
  barbellOutline,
} from 'ionicons/icons';

addIcons({
  'people-outline': peopleOutline,
  'flash-outline': flashOutline,
  'flame-outline': flameOutline,
  'trophy-outline': trophyOutline,
  'bar-chart-outline': barChartOutline,
  'checkmark-circle-outline': checkmarkCircleOutline,
  'heart-outline': heartOutline,
  'barbell-outline': barbellOutline,
});

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardContent,
    IonSkeletonText,
    IonIcon,
    IonText,
  ],
  templateUrl: './stat-card.component.html',
  styleUrls: ['./stat-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StatCardComponent {
  value = input.required<number | string>();
  label = input.required<string>();
  icon = input<string>('bar-chart-outline');
  color = input<string>('primary');
  loading = input<boolean>(false);
  suffix = input<string>('');
}
