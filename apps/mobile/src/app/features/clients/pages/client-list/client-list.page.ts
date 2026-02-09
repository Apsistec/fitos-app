import {  Component, OnInit, signal, computed, inject , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonRefresher,
  IonRefresherContent,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonButton,
  IonButtons,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  ActionSheetController,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { addOutline, filterOutline, chatboxOutline, eyeOutline, personRemoveOutline, mailOutline } from 'ionicons/icons';
import { ClientService, ClientWithProfile } from '../../../../core/services/client.service';
import { ClientCardComponent } from '../../../../shared/components/client-card/client-card.component';
import { listStagger } from '../../../../shared/animations';

addIcons({ addOutline, filterOutline, chatboxOutline, eyeOutline, personRemoveOutline, mailOutline });

type SubscriptionFilter = 'all' | 'active' | 'trialing' | 'past_due' | 'canceled';

@Component({
  selector: 'app-client-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSearchbar,
    IonRefresher,
    IonRefresherContent,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSpinner,
    IonButton,
    IonButtons,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    ClientCardComponent
  ],
  animations: [listStagger],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>My Clients</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="viewInvitations()" aria-label="View invitations">
            <ion-icon slot="icon-only" name="mail-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="toggleFilters()" aria-label="Toggle filters">
            <ion-icon slot="icon-only" name="filter-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Search Bar -->
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearchChange($event)"
          placeholder="Search clients..."
          debounce="300"
        ></ion-searchbar>
      </ion-toolbar>

      <!-- Filter Segment -->
      @if (showFilters()) {
        <ion-toolbar>
          <ion-segment [(ngModel)]="filterStatus" (ionChange)="onFilterChange()">
            <ion-segment-button value="all">
              <ion-label>All</ion-label>
            </ion-segment-button>
            <ion-segment-button value="active">
              <ion-label>Active</ion-label>
            </ion-segment-button>
            <ion-segment-button value="trialing">
              <ion-label>Trial</ion-label>
            </ion-segment-button>
            <ion-segment-button value="past_due">
              <ion-label>Past Due</ion-label>
            </ion-segment-button>
            <ion-segment-button value="canceled">
              <ion-label>Inactive</ion-label>
            </ion-segment-button>
          </ion-segment>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (clientService.loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading clients...</p>
        </div>
      } @else if (clientService.error()) {
        <div class="error-container">
          <p class="error-message">{{ clientService.error() }}</p>
          <ion-button (click)="loadClients()">Retry</ion-button>
        </div>
      } @else {
        <div class="clients-container">
          @if (filteredClients().length === 0) {
            <div class="empty-state">
              @if (hasFilters()) {
                <p>No clients match your search or filters</p>
                <ion-button fill="clear" (click)="clearFilters()">Clear filters</ion-button>
              } @else {
                <p>You don't have any clients yet</p>
                <p class="empty-subtitle">Add your first client to get started</p>
                <ion-button (click)="addClient()">Add Client</ion-button>
              }
            </div>
          } @else {
            <div class="results-header">
              <p class="results-count">{{ filteredClients().length }} client{{ filteredClients().length !== 1 ? 's' : '' }}</p>
            </div>

            <div class="clients-grid" [@listAnimation]="visibleClients().length">
              @for (client of visibleClients(); track client.id) {
                <app-client-card
                  [client]="client"
                  (cardClick)="onClientClick($event)"
                  (messageClick)="onMessageClick($event)"
                  (menuClick)="onMenuClick($event)"
                ></app-client-card>
              }
            </div>

            <!-- Infinite scroll for large client lists -->
            <ion-infinite-scroll
              [disabled]="visibleClients().length >= filteredClients().length"
              (ionInfinite)="loadMoreClients($event)"
            >
              <ion-infinite-scroll-content loadingSpinner="crescent"></ion-infinite-scroll-content>
            </ion-infinite-scroll>
          }
        </div>
      }

      <!-- Add Client FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="addClient()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    /* FitOS Header */
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .loading-container,
    .error-container,
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 60vh;
      text-align: center;
      padding: 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .error-message {
      color: var(--fitos-status-error, #EF4444);
      margin-bottom: 16px;
    }

    .empty-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 8px;
      font-size: 16px;
    }

    .empty-subtitle {
      font-size: 14px !important;
      margin-bottom: 16px !important;
    }

    .clients-container {
      padding: 16px;
    }

    .results-header {
      margin-bottom: 8px;
      padding: 0 4px;
    }

    .results-count {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 500;
    }

    .clients-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    ion-fab-button {
      --background: var(--ion-color-primary, #10B981);
      --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
    }

    ion-segment {
      padding: 8px 16px;
    }

    ion-segment-button {
      --indicator-height: 3px;
      font-size: 14px;
      min-width: 70px;
    }
  `]
})
export class ClientListPage implements OnInit {
  clientService = inject(ClientService);
  private router = inject(Router);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);

  // Filter state
  searchQuery = '';
  filterStatus: SubscriptionFilter = 'all';
  showFilters = signal(false);

  // Progressive rendering: show 20 items initially, load more on scroll
  private readonly PAGE_SIZE = 20;
  displayCount = signal(20);

  // Computed filtered clients
  filteredClients = computed(() => {
    let clients = this.clientService.clients();

    // Apply search filter
    if (this.searchQuery.trim()) {
      const searchLower = this.searchQuery.toLowerCase();
      clients = clients.filter(client => {
        const fullName = (client.profile?.full_name || '').toLowerCase();
        const email = client.profile?.email?.toLowerCase() || '';
        return fullName.includes(searchLower) || email.includes(searchLower);
      });
    }

    // Apply subscription status filter
    if (this.filterStatus !== 'all') {
      clients = clients.filter(client => client.subscription_status === this.filterStatus);
    }

    return clients;
  });

  visibleClients = computed(() =>
    this.filteredClients().slice(0, this.displayCount())
  );

  ngOnInit() {
    this.loadClients();
  }

  async loadClients() {
    await this.clientService.loadClients();
  }

  async handleRefresh(event: any) {
    await this.loadClients();
    event.target.complete();
  }

  onSearchChange(event: any) {
    this.searchQuery = event.target.value || '';
    this.displayCount.set(this.PAGE_SIZE);
  }

  loadMoreClients(event: any): void {
    this.displayCount.update(count => count + this.PAGE_SIZE);
    setTimeout(() => event.target.complete(), 100);
  }

  onFilterChange() {
    // Filter is already reactive via computed signal
  }

  toggleFilters() {
    this.showFilters.update(v => !v);
  }

  hasFilters(): boolean {
    return !!(this.searchQuery.trim() || this.filterStatus !== 'all');
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterStatus = 'all';
  }

  onClientClick(client: ClientWithProfile) {
    // Navigate to client detail page
    this.router.navigate(['/tabs/clients', client.id]);
  }

  async onMessageClick(client: ClientWithProfile) {
    // TODO: Implement messaging
    const toast = await this.toastCtrl.create({
      message: `Messaging ${client.profile?.full_name || 'client'} coming soon...`,
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  async onMenuClick({ event: _event, client }: { event: Event; client: ClientWithProfile }) {
    const actionSheet = await this.actionSheetCtrl.create({
      header: client.profile?.full_name || 'Client',
      buttons: [
        {
          text: 'View Profile',
          icon: 'eye-outline',
          handler: () => {
            this.onClientClick(client);
          }
        },
        {
          text: 'Send Message',
          icon: 'chatbox-outline',
          handler: () => {
            this.onMessageClick(client);
          }
        },
        {
          text: 'Remove Client',
          icon: 'person-remove-outline',
          role: 'destructive',
          handler: () => {
            this.confirmRemoveClient(client);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async confirmRemoveClient(_client: ClientWithProfile) {
    // TODO: Implement client removal
    const toast = await this.toastCtrl.create({
      message: 'Client removal coming soon...',
      duration: 2000,
      position: 'bottom'
    });
    await toast.present();
  }

  addClient() {
    this.router.navigate(['/tabs/clients/invite']);
  }

  viewInvitations() {
    this.router.navigate(['/tabs/clients/invitations']);
  }
}
