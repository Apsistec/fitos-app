import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  AlertController,
  ToastController,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  watch,
  fitness,
  heart,
  ellipse,
  pulse,
  checkmarkCircle,
  closeCircle,
  refreshOutline,
  addCircleOutline,
  trashOutline,
} from 'ionicons/icons';
import { TerraService, TERRA_PROVIDERS, TerraProvider } from '../../../../core/services/terra.service';
import { Browser } from '@capacitor/browser';
import { Database } from '@fitos/shared';

type WearableConnection = Database['public']['Tables']['wearable_connections']['Row'];

@Component({
  selector: 'app-wearables',
  templateUrl: './wearables.page.html',
  styleUrls: ['./wearables.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonText,
  ],
})
export class WearablesPage implements OnInit {
  private terraService = inject(TerraService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  connections = this.terraService.connections;
  isLoading = this.terraService.isLoading;
  availableProviders = signal<TerraProvider[]>([]);

  constructor() {
    addIcons({
      watch,
      fitness,
      heart,
      ellipse,
      pulse,
      checkmarkCircle,
      closeCircle,
      refreshOutline,
      addCircleOutline,
      trashOutline,
    });
  }

  async ngOnInit() {
    await this.loadConnections();
  }

  async loadConnections() {
    await this.terraService.getConnections();
    this.updateAvailableProviders();
  }

  updateAvailableProviders() {
    const connectedProviders = this.connections().map(c => c.provider);
    this.availableProviders.set(
      TERRA_PROVIDERS.filter(p => !connectedProviders.includes(p.id))
    );
  }

  async handleRefresh(event: any) {
    await this.loadConnections();
    event.target.complete();
  }

  async connectDevice(provider: TerraProvider) {
    try {
      const authUrl = await this.terraService.connectDevice(provider.id);

      // Open the auth URL in the system browser
      await Browser.open({
        url: authUrl,
        presentationStyle: 'popover',
      });

      // Show a toast informing the user
      const toast = await this.toastController.create({
        message: `Opening ${provider.name} authentication...`,
        duration: 2000,
        position: 'bottom',
        color: 'primary',
      });
      await toast.present();

      // Reload connections after a delay (user might have completed auth)
      setTimeout(() => this.loadConnections(), 5000);
    } catch (error) {
      console.error('Error connecting device:', error);
      const toast = await this.toastController.create({
        message: 'Failed to connect device. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }

  async disconnectDevice(connection: WearableConnection) {
    const provider = this.terraService.getProviderInfo(connection.provider);
    const alert = await this.alertController.create({
      header: 'Disconnect Device',
      message: `Are you sure you want to disconnect your ${provider?.name || connection.provider}? Your historical data will be preserved.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: async () => {
            try {
              await this.terraService.disconnectDevice(connection.id);

              const toast = await this.toastController.create({
                message: `${provider?.name || connection.provider} disconnected successfully`,
                duration: 2000,
                position: 'bottom',
                color: 'success',
              });
              await toast.present();

              await this.loadConnections();
            } catch (error) {
              console.error('Error disconnecting device:', error);
              const toast = await this.toastController.create({
                message: 'Failed to disconnect device. Please try again.',
                duration: 3000,
                position: 'bottom',
                color: 'danger',
              });
              await toast.present();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async syncData() {
    try {
      await this.terraService.syncData();

      const toast = await this.toastController.create({
        message: 'Syncing your wearable data...',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();

      // Reload connections to show updated last_sync_at
      setTimeout(() => this.loadConnections(), 3000);
    } catch (error) {
      console.error('Error syncing data:', error);
      const toast = await this.toastController.create({
        message: 'Failed to sync data. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }

  getProviderInfo(providerId: string): TerraProvider | undefined {
    return this.terraService.getProviderInfo(providerId);
  }

  formatLastSync(date: string | null): string {
    if (!date) return 'Never';

    const lastSync = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - lastSync.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays}d ago`;
  }
}
