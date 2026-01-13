import { Component, Input, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonSpinner,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  footstepsOutline,
  heartOutline,
  pulseOutline,
  bedOutline,
  timeOutline,
  alertCircleOutline,
  refreshOutline,
} from 'ionicons/icons';
import { TerraService } from '../../../core/services/terra.service';
import { Database } from '@fitos/shared';

type WearableDailyData = Database['public']['Tables']['wearable_daily_data']['Row'];

@Component({
  selector: 'app-wearable-data-card',
  templateUrl: './wearable-data-card.component.html',
  styleUrls: ['./wearable-data-card.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton,
    IonSpinner,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WearableDataCardComponent implements OnInit {
  @Input() clientId?: string; // If viewing another client's data (trainer view)

  private terraService = inject(TerraService);

  latestData = signal<WearableDailyData | null>(null);
  isLoading = signal(false);
  hasConnections = signal(false);

  constructor() {
    addIcons({
      footstepsOutline,
      heartOutline,
      pulseOutline,
      bedOutline,
      timeOutline,
      alertCircleOutline,
      refreshOutline,
    });
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);

    // Check if user has any connections
    const connections = await this.terraService.getConnections();
    this.hasConnections.set(connections.length > 0);

    if (connections.length > 0) {
      // Get latest data
      const data = await this.terraService.getLatestData(this.clientId);
      this.latestData.set(data);
    }

    this.isLoading.set(false);
  }

  async syncData() {
    try {
      await this.terraService.syncData();
      // Wait a bit for data to be processed
      setTimeout(() => this.loadData(), 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  }

  formatDuration(minutes: number | null): string {
    if (!minutes) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  }
}
