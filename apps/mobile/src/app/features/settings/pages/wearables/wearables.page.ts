import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
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
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { ViewWillEnter } from '@ionic/angular';
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
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { TerraService, TERRA_PROVIDERS, TerraProvider } from '../../../../core/services/terra.service';
import { HealthSyncService } from '../../../../core/services/health-sync.service';
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
export class WearablesPage implements OnInit, ViewWillEnter {
  private terraService = inject(TerraService);
  private healthSyncService = inject(HealthSyncService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  connections = this.terraService.connections;
  isLoading = this.terraService.isLoading;
  availableProviders = signal<TerraProvider[]>([]);

  // Direct health sync state (Sprint 49)
  directSyncAuthorized = this.healthSyncService.isAuthorized;
  isSyncing = this.healthSyncService.isSyncing;
  lastDirectSync = this.healthSyncService.lastSyncAt;
  isNativePlatform = signal(Capacitor.isNativePlatform());

  /** Returns 'Apple Health' on iOS, 'Health Connect' on Android */
  platformHealthLabel = computed(() =>
    Capacitor.getPlatform() === 'ios' ? 'Apple Health' : 'Health Connect'
  );

  /** Returns the Ionicons name for the platform health icon */
  platformHealthIcon = computed(() =>
    Capacitor.getPlatform() === 'ios' ? 'heart' : 'fitness'
  );

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
    await this.healthSyncService.initialize();
  }

  /**
   * Check for callback query params each time the view becomes active.
   * After Terra OAuth completes on web, the user is redirected back here
   * with ?connected=PROVIDER or ?wearable_error=true.
   */
  async ionViewWillEnter() {
    const params = this.route.snapshot.queryParams;

    if (params['connected']) {
      const providerInfo = this.terraService.getProviderInfo(params['connected']);
      const providerName = providerInfo?.name || params['connected'];

      const toast = await this.toastController.create({
        message: `${providerName} connected successfully!`,
        duration: 3000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();

      // Refresh connections to show the newly connected device
      await this.loadConnections();

      // Clear the query params so the toast doesn't re-appear on navigation
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    } else if (params['wearable_error']) {
      const toast = await this.toastController.create({
        message: 'Wearable connection failed. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();

      // Clear the query params
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    } else {
      // Normal page entry — refresh connections in case something changed
      await this.loadConnections();
    }
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

  async handleRefresh(event: RefresherCustomEvent) {
    await this.loadConnections();
    event.target.complete();
  }

  async connectDevice(provider: TerraProvider) {
    try {
      const authUrl = await this.terraService.connectDevice(provider.id);

      if (Capacitor.isNativePlatform()) {
        // Native: open in-app browser
        await Browser.open({
          url: authUrl,
          presentationStyle: 'popover',
        });

        const toast = await this.toastController.create({
          message: `Opening ${provider.name} authentication...`,
          duration: 2000,
          position: 'bottom',
          color: 'primary',
        });
        await toast.present();

        // Reload connections after a delay (user might have completed auth)
        setTimeout(() => this.loadConnections(), 5000);
      } else {
        // Web/PWA: redirect in same tab so the callback comes back here
        window.location.href = authUrl;
      }
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

  // ─── Direct Health Sync (Sprint 49) ─────────────────────────

  async connectDirectHealth() {
    try {
      const authorized = await this.healthSyncService.requestAuthorization();
      const label = this.platformHealthLabel();
      const toast = await this.toastController.create({
        message: authorized
          ? `${label} connected! Syncing your health data...`
          : `Could not connect to ${label}. Please try again.`,
        duration: 3000,
        position: 'bottom',
        color: authorized ? 'success' : 'warning',
      });
      await toast.present();
    } catch (error) {
      console.error('Error connecting direct health:', error);
      const toast = await this.toastController.create({
        message: 'Connection failed. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }

  async syncDirectHealth() {
    try {
      const result = await this.healthSyncService.syncAll();
      const toast = await this.toastController.create({
        message: result.success
          ? `Synced ${result.recordsSynced} day${result.recordsSynced !== 1 ? 's' : ''} of health data`
          : `Sync incomplete: ${result.errorMessage ?? 'Unknown error'}`,
        duration: 2500,
        position: 'bottom',
        color: result.success ? 'success' : 'warning',
      });
      await toast.present();
    } catch (error) {
      console.error('Error syncing direct health:', error);
    }
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
