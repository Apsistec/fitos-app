import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { peopleOutline, trendingUpOutline, cashOutline, barbellOutline } from 'ionicons/icons';

export interface FacilityStats {
  totalClients: number;
  totalTrainers: number;
  monthlyRevenue: number;
  activeWorkouts: number;
  clientRetention: number; // percentage
  revenueGrowth: number; // percentage change
}

@Component({
  selector: 'app-owner-facility-stats',
  templateUrl: './owner-facility-stats.component.html',
  styleUrls: ['./owner-facility-stats.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
  ],
})
export class OwnerFacilityStatsComponent {
  @Input() stats: FacilityStats = {
    totalClients: 0,
    totalTrainers: 0,
    monthlyRevenue: 0,
    activeWorkouts: 0,
    clientRetention: 0,
    revenueGrowth: 0,
  };

  constructor() {
    addIcons({
      peopleOutline,
      trendingUpOutline,
      cashOutline,
      barbellOutline,
    });
  }
}
