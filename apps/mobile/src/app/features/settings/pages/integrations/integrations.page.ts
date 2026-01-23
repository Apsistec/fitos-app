import {
  Component,
  OnInit,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonBadge,
  IonButton,
  IonNote,
  IonSpinner,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  extensionPuzzleOutline,
  restaurantOutline,
  calendarOutline,
  watchOutline,
  chatbubblesOutline,
  cardOutline,
  analyticsOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
  timeOutline,
  closeCircleOutline,
  refreshOutline,
  settingsOutline,
} from 'ionicons/icons';

import {
  IntegrationService,
  Integration,
  UserIntegration,
  IntegrationCategory,
} from '../../../../core/services/integration.service';
import { AuthService } from '../../../../core/services/auth.service';

/**
 * IntegrationsPage - Integration marketplace
 *
 * Features:
 * - Browse available integrations by category
 * - Connect/disconnect integrations
 * - View connection status
 * - Manage sync settings
 * - View sync history
 *
 * Sprint 24: Integration Marketplace
 */
@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonBadge,
    IonButton,
    IonNote,
    IonSpinner,
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings" />
        </ion-buttons>
        <ion-title>Integrations</ion-title>
      </ion-toolbar>

      <!-- Category Filter -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedCategory" (ionChange)="onCategoryChange()">
          <ion-segment-button value="all">
            <ion-label>All</ion-label>
          </ion-segment-button>
          <ion-segment-button value="nutrition">
            <ion-icon name="restaurant-outline" />
          </ion-segment-button>
          <ion-segment-button value="calendar">
            <ion-icon name="calendar-outline" />
          </ion-segment-button>
          <ion-segment-button value="wearable">
            <ion-icon name="watch-outline" />
          </ion-segment-button>
          <ion-segment-button value="communication">
            <ion-icon name="chatbubbles-outline" />
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="integrations-container">
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading integrations...</p>
          </div>
        } @else {
          <!-- Connected Integrations Summary -->
          @if (service.userIntegrations().length > 0) {
            <ion-card class="summary-card">
              <ion-card-header>
                <ion-card-title>Your Integrations</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="summary-stats">
                  <div class="stat">
                    <ion-icon name="checkmark-circle-outline" color="success" />
                    <div class="stat-content">
                      <span class="stat-value">{{ service.activeIntegrations().length }}</span>
                      <span class="stat-label">Active</span>
                    </div>
                  </div>
                  <div class="stat">
                    <ion-icon name="alert-circle-outline" color="danger" />
                    <div class="stat-content">
                      <span class="stat-value">{{ service.errorIntegrations().length }}</span>
                      <span class="stat-label">Errors</span>
                    </div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

          <!-- Integration List -->
          @for (integration of filteredIntegrations(); track integration.id) {
            <ion-card class="integration-card">
              <ion-card-header>
                <div class="integration-header">
                  <div class="integration-info">
                    @if (integration.icon_url) {
                      <img [src]="integration.icon_url" [alt]="integration.name" class="integration-icon" />
                    } @else {
                      <div class="integration-icon-placeholder">
                        <ion-icon [name]="service.getCategoryIcon(integration.category)" />
                      </div>
                    }
                    <div class="integration-text">
                      <ion-card-title>{{ integration.name }}</ion-card-title>
                      <ion-badge [color]="getCategoryColor(integration.category)">
                        {{ formatCategory(integration.category) }}
                      </ion-badge>
                    </div>
                  </div>
                  @if (getUserIntegration(integration.id)) {
                    <ion-badge [color]="service.getStatusColor(getUserIntegration(integration.id)!.status)">
                      {{ formatStatus(getUserIntegration(integration.id)!.status) }}
                    </ion-badge>
                  }
                </div>
              </ion-card-header>

              <ion-card-content>
                <p class="integration-description">{{ integration.description }}</p>

                @if (getUserIntegration(integration.id)) {
                  <!-- Connected State -->
                  <div class="connected-info">
                    @if (getUserIntegration(integration.id)!.status === 'active') {
                      <div class="sync-info">
                        <ion-icon name="refresh-outline" />
                        <span>
                          Syncs {{ getUserIntegration(integration.id)!.sync_frequency }}
                          @if (getUserIntegration(integration.id)!.last_sync_at) {
                            · Last: {{ formatDate(getUserIntegration(integration.id)!.last_sync_at!) }}
                          }
                        </span>
                      </div>
                    } @else if (getUserIntegration(integration.id)!.status === 'error') {
                      <div class="error-info">
                        <ion-icon name="alert-circle-outline" color="danger" />
                        <span>{{ getUserIntegration(integration.id)!.last_error || 'Connection error' }}</span>
                      </div>
                    }

                    <div class="integration-actions">
                      @if (getUserIntegration(integration.id)!.status === 'active') {
                        <ion-button fill="outline" size="small" (click)="manageIntegration(integration)">
                          <ion-icon slot="start" name="settings-outline" />
                          Manage
                        </ion-button>
                      }
                      <ion-button
                        fill="clear"
                        size="small"
                        color="danger"
                        (click)="disconnectIntegration(integration)"
                      >
                        <ion-icon slot="start" name="close-circle-outline" />
                        Disconnect
                      </ion-button>
                    </div>
                  </div>
                } @else {
                  <!-- Not Connected State -->
                  <div class="integration-actions">
                    <ion-button expand="block" (click)="connectIntegration(integration)">
                      <ion-icon slot="start" name="extension-puzzle-outline" />
                      Connect
                    </ion-button>
                  </div>
                }

                @if (integration.setup_instructions) {
                  <ion-note class="setup-note">
                    {{ integration.setup_instructions }}
                  </ion-note>
                }
              </ion-card-content>
            </ion-card>
          } @empty {
            <div class="empty-state">
              <ion-icon name="extension-puzzle-outline" />
              <p>No integrations available in this category</p>
            </div>
          }
        }
      </div>
    </ion-content>
  `,
  styles: [
    `
      .integrations-container {
        padding: var(--fitos-space-4);
        max-width: 800px;
        margin: 0 auto;
      }

      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        text-align: center;

        ion-spinner {
          margin-bottom: var(--fitos-space-2);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0;
        }
      }

      .summary-card {
        margin-bottom: var(--fitos-space-4);

        .summary-stats {
          display: flex;
          gap: var(--fitos-space-4);

          .stat {
            flex: 1;
            display: flex;
            align-items: center;
            gap: var(--fitos-space-2);
            padding: var(--fitos-space-3);
            background: var(--fitos-bg-secondary);
            border-radius: var(--fitos-border-radius);

            ion-icon {
              font-size: 32px;
            }

            .stat-content {
              display: flex;
              flex-direction: column;

              .stat-value {
                font-size: var(--fitos-font-size-2xl);
                font-weight: 700;
                color: var(--fitos-text-primary);
                line-height: 1;
              }

              .stat-label {
                font-size: var(--fitos-font-size-sm);
                color: var(--fitos-text-tertiary);
                margin-top: 4px;
              }
            }
          }
        }
      }

      .integration-card {
        margin-bottom: var(--fitos-space-4);

        .integration-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--fitos-space-2);
          margin-bottom: var(--fitos-space-2);

          .integration-info {
            display: flex;
            align-items: center;
            gap: var(--fitos-space-3);
            flex: 1;

            .integration-icon,
            .integration-icon-placeholder {
              width: 48px;
              height: 48px;
              border-radius: 12px;
              flex-shrink: 0;
            }

            .integration-icon {
              object-fit: contain;
            }

            .integration-icon-placeholder {
              display: flex;
              align-items: center;
              justify-content: center;
              background: var(--fitos-bg-secondary);

              ion-icon {
                font-size: 24px;
                color: var(--fitos-text-secondary);
              }
            }

            .integration-text {
              flex: 1;
              display: flex;
              flex-direction: column;
              gap: var(--fitos-space-1);

              ion-card-title {
                font-size: var(--fitos-font-size-lg);
                font-weight: 600;
                margin: 0;
              }

              ion-badge {
                font-size: var(--fitos-font-size-xs);
                padding: 4px 8px;
                align-self: flex-start;
              }
            }
          }
        }

        .integration-description {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          line-height: 1.5;
          margin: 0 0 var(--fitos-space-3) 0;
        }

        .connected-info {
          margin-top: var(--fitos-space-3);

          .sync-info,
          .error-info {
            display: flex;
            align-items: center;
            gap: var(--fitos-space-1);
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-secondary);
            margin-bottom: var(--fitos-space-2);

            ion-icon {
              font-size: 16px;
            }
          }

          .error-info {
            color: var(--ion-color-danger);
          }
        }

        .integration-actions {
          display: flex;
          gap: var(--fitos-space-2);
          margin-top: var(--fitos-space-3);
        }

        .setup-note {
          display: block;
          font-size: var(--fitos-font-size-xs);
          line-height: 1.4;
          margin-top: var(--fitos-space-2);
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 300px;
        text-align: center;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-2);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0;
        }
      }

      ion-toolbar ion-segment {
        --background: transparent;

        ion-segment-button {
          min-width: auto;

          ion-icon {
            font-size: 20px;
          }
        }
      }
    `,
  ],
})
export class IntegrationsPage implements OnInit {
  service = inject(IntegrationService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  // State
  selectedCategory = signal<IntegrationCategory | 'all'>('all');
  loading = signal(false);
  filteredIntegrations = signal<Integration[]>([]);

  constructor() {
    addIcons({
      extensionPuzzleOutline,
      restaurantOutline,
      calendarOutline,
      watchOutline,
      chatbubblesOutline,
      cardOutline,
      analyticsOutline,
      checkmarkCircleOutline,
      alertCircleOutline,
      timeOutline,
      closeCircleOutline,
      refreshOutline,
      settingsOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadIntegrations();
  }

  async loadIntegrations(): Promise<void> {
    this.loading.set(true);

    try {
      const user = this.authService.user();
      if (!user) return;

      // Load available and user integrations in parallel
      await Promise.all([
        this.service.getAvailableIntegrations(),
        this.service.getUserIntegrations(user.id),
      ]);

      this.filterIntegrations();
    } catch (err) {
      console.error('Error loading integrations:', err);
    } finally {
      this.loading.set(false);
    }
  }

  onCategoryChange(): void {
    this.filterIntegrations();
  }

  filterIntegrations(): void {
    const category = this.selectedCategory();
    const all = this.service.availableIntegrations();

    if (category === 'all') {
      this.filteredIntegrations.set(all);
    } else {
      this.filteredIntegrations.set(all.filter((i) => i.category === category));
    }
  }

  getUserIntegration(integrationId: string): UserIntegration | null {
    return this.service.userIntegrations().find((ui) => ui.integration_id === integrationId) || null;
  }

  async connectIntegration(integration: Integration): Promise<void> {
    const user = this.authService.user();
    if (!user) return;

    const alert = await this.alertCtrl.create({
      header: `Connect ${integration.name}`,
      message: integration.setup_instructions || `Connect your ${integration.name} account to sync data automatically.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Connect',
          handler: async () => {
            const result = await this.service.connectIntegration(user.id, {
              integration_id: integration.id,
            });

            if (result) {
              await this.showToast(`${integration.name} connected successfully`, 'success');

              // In production, this would redirect to OAuth flow
              // For now, just update status to active
              await this.service.updateIntegrationTokens(result.id, 'dummy_token');
            } else {
              await this.showToast(`Failed to connect ${integration.name}`, 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async disconnectIntegration(integration: Integration): Promise<void> {
    const userIntegration = this.getUserIntegration(integration.id);
    if (!userIntegration) return;

    const alert = await this.alertCtrl.create({
      header: `Disconnect ${integration.name}?`,
      message: 'Your sync history will be preserved, but automatic syncing will stop.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Disconnect',
          role: 'destructive',
          handler: async () => {
            const success = await this.service.disconnectIntegration(userIntegration.id);

            if (success) {
              await this.showToast(`${integration.name} disconnected`, 'success');
            } else {
              await this.showToast(`Failed to disconnect ${integration.name}`, 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  manageIntegration(integration: Integration): void {
    // Navigate to integration detail/settings page
    // For now, just show an alert
    this.alertCtrl.create({
      header: `Manage ${integration.name}`,
      message: 'Sync settings and history coming soon!',
      buttons: ['OK'],
    }).then(alert => alert.present());
  }

  getCategoryColor(category: IntegrationCategory): string {
    switch (category) {
      case 'nutrition':
        return 'success';
      case 'calendar':
        return 'primary';
      case 'wearable':
        return 'secondary';
      case 'communication':
        return 'tertiary';
      case 'payment':
        return 'warning';
      case 'analytics':
        return 'danger';
      default:
        return 'medium';
    }
  }

  formatCategory(category: string): string {
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  formatStatus(status: string): string {
    return status.replace('_', ' ').toUpperCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  }

  private async showToast(message: string, color: 'success' | 'danger'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
