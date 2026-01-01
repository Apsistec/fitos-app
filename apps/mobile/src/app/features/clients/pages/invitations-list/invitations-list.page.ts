import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonFab,
  IonFabButton,
  ActionSheetController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  copyOutline,
  shareOutline,
  refreshOutline,
  trashOutline,
  timeOutline,
  checkmarkCircle,
  closeCircle,
} from 'ionicons/icons';
import { InvitationService, Invitation } from '../../../../core/services/invitation.service';
import { AuthService } from '../../../../core/services/auth.service';

addIcons({
  addOutline,
  copyOutline,
  shareOutline,
  refreshOutline,
  trashOutline,
  timeOutline,
  checkmarkCircle,
  closeCircle,
});

@Component({
  selector: 'app-invitations-list',
  standalone: true,
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonFab,
    IonFabButton,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/clients"></ion-back-button>
        </ion-buttons>
        <ion-title>Client Invitations</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (invitationService.loading()) {
        <div class="loading-container">
          <ion-spinner></ion-spinner>
          <p>Loading invitations...</p>
        </div>
      } @else if (invitationService.error()) {
        <div class="error-container">
          <p class="error-message">{{ invitationService.error() }}</p>
          <ion-button (click)="loadInvitations()">Retry</ion-button>
        </div>
      } @else {
        <div class="invitations-container">
          @if (invitationService.invitations().length === 0) {
            <div class="empty-state">
              <p>No invitations yet</p>
              <p class="empty-subtitle">Invite clients to start training together</p>
              <ion-button (click)="inviteClient()">Send Invitation</ion-button>
            </div>
          } @else {
            <!-- Pending Invitations -->
            @if (invitationService.pendingInvitations().length > 0) {
              <div class="section">
                <h2 class="section-title">Pending ({{ invitationService.pendingInvitations().length }})</h2>
                @for (invitation of invitationService.pendingInvitations(); track invitation.id) {
                  <ion-card button (click)="onInvitationClick(invitation)">
                    <ion-card-header>
                      <div class="card-header">
                        <div class="header-content">
                          <ion-card-title>{{ invitation.email }}</ion-card-title>
                          <ion-badge
                            [color]="getStatusColor(invitation)"
                            class="status-badge"
                          >
                            @if (invitationService.isExpired(invitation)) {
                              <ion-icon name="time-outline"></ion-icon>
                              Expired
                            } @else {
                              <ion-icon name="time-outline"></ion-icon>
                              Pending
                            }
                          </ion-badge>
                        </div>
                      </div>
                    </ion-card-header>

                    <ion-card-content>
                      <div class="invitation-details">
                        <div class="detail-row">
                          <span class="detail-label">Code:</span>
                          <span class="detail-value code">{{ invitation.invite_code }}</span>
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Sent:</span>
                          <span class="detail-value">{{ formatDate(invitation.created_at) }}</span>
                        </div>
                        <div class="detail-row">
                          <span class="detail-label">Expires:</span>
                          <span class="detail-value" [class.expired]="invitationService.isExpired(invitation)">
                            {{ formatExpiryDate(invitation.expires_at) }}
                          </span>
                        </div>
                      </div>
                    </ion-card-content>
                  </ion-card>
                }
              </div>
            }

            <!-- Other Invitations (Accepted, Expired, Cancelled) -->
            @if (getOtherInvitations().length > 0) {
              <div class="section">
                <h2 class="section-title">History ({{ getOtherInvitations().length }})</h2>
                @for (invitation of getOtherInvitations(); track invitation.id) {
                  <ion-card>
                    <ion-card-header>
                      <div class="card-header">
                        <div class="header-content">
                          <ion-card-title>{{ invitation.email }}</ion-card-title>
                          <ion-badge [color]="getStatusColor(invitation)">
                            @if (invitation.status === 'accepted') {
                              <ion-icon name="checkmark-circle"></ion-icon>
                              Accepted
                            } @else if (invitation.status === 'expired') {
                              <ion-icon name="time-outline"></ion-icon>
                              Expired
                            } @else {
                              <ion-icon name="close-circle"></ion-icon>
                              Cancelled
                            }
                          </ion-badge>
                        </div>
                      </div>
                    </ion-card-header>

                    <ion-card-content>
                      <div class="invitation-details">
                        <div class="detail-row">
                          <span class="detail-label">Sent:</span>
                          <span class="detail-value">{{ formatDate(invitation.created_at) }}</span>
                        </div>
                        @if (invitation.accepted_at) {
                          <div class="detail-row">
                            <span class="detail-label">Accepted:</span>
                            <span class="detail-value">{{ formatDate(invitation.accepted_at) }}</span>
                          </div>
                        }
                      </div>
                    </ion-card-content>
                  </ion-card>
                }
              </div>
            }
          }
        </div>
      }

      <!-- Add Invitation FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="inviteClient()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
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
      color: var(--ion-color-medium);
    }

    .error-message {
      color: var(--ion-color-danger);
      margin-bottom: 16px;
    }

    .empty-state p {
      color: var(--ion-color-medium);
      margin-bottom: 8px;
      font-size: 1.1rem;
    }

    .empty-subtitle {
      font-size: 0.9rem !important;
      margin-bottom: 16px !important;
    }

    .invitations-container {
      padding: 16px;
    }

    .section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 0 0 12px 4px;
      color: var(--ion-color-dark);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .header-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    ion-card-title {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      flex-shrink: 0;
    }

    .status-badge ion-icon {
      font-size: 14px;
    }

    .invitation-details {
      margin-top: 8px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .detail-row:last-child {
      margin-bottom: 0;
    }

    .detail-label {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .detail-value {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ion-color-dark);
    }

    .detail-value.code {
      font-family: 'Courier New', monospace;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .detail-value.expired {
      color: var(--ion-color-danger);
    }

    ion-card {
      margin: 0 0 12px 0;
    }

    ion-fab-button {
      --background: var(--ion-color-primary);
    }
  `]
})
export class InvitationsListPage implements OnInit {
  invitationService = inject(InvitationService);
  private router = inject(Router);
  private actionSheetCtrl = inject(ActionSheetController);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  ngOnInit() {
    this.loadInvitations();
  }

  async loadInvitations() {
    await this.invitationService.loadInvitations();
  }

  async handleRefresh(event: any) {
    await this.loadInvitations();
    event.target.complete();
  }

  inviteClient() {
    this.router.navigate(['/tabs/clients/invite']);
  }

  getOtherInvitations(): Invitation[] {
    return this.invitationService.invitations().filter(i => i.status !== 'pending');
  }

  async onInvitationClick(invitation: Invitation) {
    const isExpired = this.invitationService.isExpired(invitation);

    const actionSheet = await this.actionSheetCtrl.create({
      header: invitation.email,
      buttons: [
        {
          text: 'Copy Link',
          icon: 'copy-outline',
          handler: () => {
            this.copyLink(invitation);
          }
        },
        {
          text: 'Share Link',
          icon: 'share-outline',
          handler: () => {
            this.shareLink(invitation);
          }
        },
        ...(isExpired ? [{
          text: 'Resend Invitation',
          icon: 'refresh-outline',
          handler: () => {
            this.resendInvitation(invitation);
          }
        }] : []),
        {
          text: 'Cancel Invitation',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.cancelInvitation(invitation);
          }
        },
        {
          text: 'Close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  async copyLink(invitation: Invitation) {
    const success = await this.invitationService.copyInviteLink(invitation.invite_code);

    const toast = await this.toastCtrl.create({
      message: success ? 'Link copied to clipboard!' : 'Failed to copy link',
      duration: 2000,
      position: 'bottom',
      color: success ? 'success' : 'danger',
    });
    await toast.present();
  }

  async shareLink(invitation: Invitation) {
    const trainerName = this.auth.user()?.user_metadata?.['full_name'] || 'Your trainer';
    const success = await this.invitationService.shareInviteLink(
      invitation.invite_code,
      trainerName
    );

    if (!success) {
      const toast = await this.toastCtrl.create({
        message: 'Failed to share link',
        duration: 2000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();
    }
  }

  async resendInvitation(invitation: Invitation) {
    const newInvitation = await this.invitationService.resendInvitation(invitation.id);

    const toast = await this.toastCtrl.create({
      message: newInvitation
        ? 'Invitation resent successfully!'
        : 'Failed to resend invitation',
      duration: 2000,
      position: 'bottom',
      color: newInvitation ? 'success' : 'danger',
    });
    await toast.present();
  }

  async cancelInvitation(invitation: Invitation) {
    const success = await this.invitationService.cancelInvitation(invitation.id);

    const toast = await this.toastCtrl.create({
      message: success
        ? 'Invitation cancelled'
        : 'Failed to cancel invitation',
      duration: 2000,
      position: 'bottom',
      color: success ? 'success' : 'danger',
    });
    await toast.present();
  }

  getStatusColor(invitation: Invitation): string {
    if (invitation.status === 'accepted') return 'success';
    if (invitation.status === 'expired' || this.invitationService.isExpired(invitation)) return 'warning';
    if (invitation.status === 'cancelled') return 'medium';
    return 'primary';
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatExpiryDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();

    if (date < now) {
      return 'Expired';
    }

    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays > 1) {
      return `${diffDays} days`;
    } else if (diffDays === 1) {
      return '1 day';
    } else {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return diffHours > 0 ? `${diffHours} hours` : 'Soon';
    }
  }
}
