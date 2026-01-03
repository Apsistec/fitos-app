import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonAvatar,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { personCircleOutline, trendingUpOutline, trendingDownOutline } from 'ionicons/icons';

export interface TrainerPerformance {
  id: string;
  name: string;
  avatarUrl?: string;
  totalClients: number;
  activeClients: number;
  monthlyRevenue: number;
  clientChange: number; // percentage change
}

@Component({
  selector: 'app-owner-trainer-performance',
  templateUrl: './owner-trainer-performance.component.html',
  styleUrls: ['./owner-trainer-performance.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonAvatar,
    IonIcon,
    IonText,
  ],
})
export class OwnerTrainerPerformanceComponent {
  @Input() trainers: TrainerPerformance[] = [];

  constructor() {
    addIcons({
      personCircleOutline,
      trendingUpOutline,
      trendingDownOutline,
    });
  }
}
