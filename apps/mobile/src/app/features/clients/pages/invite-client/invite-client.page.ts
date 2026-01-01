import { Component, inject, signal, computed } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonButtons,
  IonBackButton,
  IonInput,
  IonTextarea,
  IonItem,
  IonList,
  IonSpinner,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonNote,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  linkOutline,
  copyOutline,
  shareOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { InvitationService } from '../../../../core/services/invitation.service';
import { AuthService } from '../../../../core/services/auth.service';

addIcons({ mailOutline, linkOutline, copyOutline, shareOutline, checkmarkCircle });

@Component({
  selector: 'app-invite-client',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonButtons,
    IonBackButton,
    IonInput,
    IonTextarea,
    IonItem,
    IonList,
    IonSpinner,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/clients"></ion-back-button>
        </ion-buttons>
        <ion-title>Invite Client</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="invite-container">
        @if (!invitationCreated()) {
          <!-- Invitation Form -->
          <div class="invite-header">
            <h2>Invite a new client</h2>
            <p>Send an invitation link to your client via email or shareable link</p>
          </div>

          @if (invitationService.error()) {
            <ion-note color="danger" class="error-message">
              {{ invitationService.error() }}
            </ion-note>
          }

          <form [formGroup]="inviteForm">
            <ion-list lines="none">
              <ion-item lines="none">
                <ion-input
                  formControlName="email"
                  type="email"
                  label="Client Email"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="client@example.com"
                  helperText="Enter your client's email address"
                  [errorText]="emailError()"
                >
                  <ion-icon slot="start" name="mail-outline"></ion-icon>
                </ion-input>
              </ion-item>

              <ion-item lines="none">
                <ion-textarea
                  formControlName="personalMessage"
                  label="Personal Message (Optional)"
                  labelPlacement="floating"
                  fill="outline"
                  placeholder="Hi! I'd love to work with you..."
                  helperText="Add a personal message to your invitation"
                  [autoGrow]="true"
                  rows="4"
                  [counter]="true"
                  [maxlength]="500"
                />
              </ion-item>
            </ion-list>

            <ion-button
              expand="block"
              (click)="sendInvitation()"
              [disabled]="!inviteForm.valid || invitationService.loading()"
              class="submit-button"
            >
              @if (invitationService.loading()) {
                <ion-spinner name="crescent"></ion-spinner>
              } @else {
                Send Invitation
              }
            </ion-button>
          </form>
        } @else {
          <!-- Success State -->
          <div class="success-container">
            <div class="success-icon">
              <ion-icon name="checkmark-circle" color="success"></ion-icon>
            </div>
            <h2>Invitation Sent!</h2>
            <p>Your invitation has been created. Share the link with your client.</p>

            <ion-card>
              <ion-card-header>
                <ion-card-title>Invitation Details</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="invite-details">
                  <div class="detail-row">
                    <span class="detail-label">Email:</span>
                    <span class="detail-value">{{ createdInvitation()?.email }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Code:</span>
                    <span class="detail-value code">{{ createdInvitation()?.invite_code }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="detail-label">Expires:</span>
                    <span class="detail-value">{{ formatExpiryDate(createdInvitation()?.expires_at) }}</span>
                  </div>
                </div>

                <div class="share-actions">
                  <ion-button expand="block" (click)="copyLink()">
                    <ion-icon slot="start" name="copy-outline"></ion-icon>
                    Copy Link
                  </ion-button>

                  @if (canShare()) {
                    <ion-button expand="block" fill="outline" (click)="shareLink()">
                      <ion-icon slot="start" name="share-outline"></ion-icon>
                      Share Link
                    </ion-button>
                  }
                </div>

                <div class="invite-link">
                  <p class="link-label">Invitation Link:</p>
                  <p class="link-value">{{ inviteLink() }}</p>
                </div>
              </ion-card-content>
            </ion-card>

            <ion-button expand="block" fill="clear" (click)="inviteAnother()" class="invite-another-button">
              Invite Another Client
            </ion-button>

            <ion-button expand="block" fill="outline" (click)="goToClientList()">
              View All Clients
            </ion-button>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .invite-container {
      max-width: 600px;
      margin: 0 auto;
    }

    .invite-header {
      margin-bottom: 24px;
      text-align: center;
    }

    .invite-header h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .invite-header p {
      color: var(--ion-color-medium);
      margin: 0;
    }

    .error-message {
      display: block;
      margin-bottom: 16px;
      padding: 12px;
      background: var(--ion-color-danger-tint);
      border-radius: 8px;
    }

    ion-list {
      margin-bottom: 24px;
    }

    ion-item {
      margin-bottom: 16px;
    }

    .submit-button {
      margin-top: 8px;
    }

    .success-container {
      text-align: center;
    }

    .success-icon {
      margin: 24px 0;
    }

    .success-icon ion-icon {
      font-size: 80px;
    }

    .success-container h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0 0 8px 0;
    }

    .success-container > p {
      color: var(--ion-color-medium);
      margin: 0 0 24px 0;
    }

    ion-card {
      margin: 0 0 24px 0;
      text-align: left;
    }

    .invite-details {
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .detail-label {
      font-weight: 500;
      color: var(--ion-color-medium);
    }

    .detail-value {
      font-weight: 500;
    }

    .detail-value.code {
      font-family: 'Courier New', monospace;
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--ion-color-primary);
    }

    .share-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .share-actions ion-button {
      flex: 1;
      margin: 0;
    }

    .invite-link {
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
    }

    .link-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--ion-color-medium);
      margin: 0 0 4px 0;
    }

    .link-value {
      font-size: 0.75rem;
      word-break: break-all;
      color: var(--ion-color-dark);
      margin: 0;
    }

    .invite-another-button {
      margin: 16px 0 8px 0;
    }
  `]
})
export class InviteClientPage {
  invitationService = inject(InvitationService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private auth = inject(AuthService);

  inviteForm: FormGroup;
  invitationCreated = signal(false);
  createdInvitation = signal<any>(null);

  inviteLink = computed(() => {
    const invitation = this.createdInvitation();
    if (!invitation) return '';
    return this.invitationService.getInviteLink(invitation.invite_code);
  });

  emailError = computed(() => {
    const control = this.inviteForm.get('email');
    if (!control?.touched) return '';

    if (control.hasError('required')) return 'Email is required';
    if (control.hasError('email')) return 'Please enter a valid email';

    return '';
  });

  canShare = computed(() => {
    return typeof navigator !== 'undefined' && !!navigator.share;
  });

  constructor() {
    addIcons({ mailOutline, linkOutline, copyOutline, shareOutline, checkmarkCircle });

    this.inviteForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      personalMessage: [''],
    });
  }

  async sendInvitation() {
    if (!this.inviteForm.valid) return;

    const { email, personalMessage } = this.inviteForm.value;

    const invitation = await this.invitationService.createInvitation(
      email,
      personalMessage || undefined
    );

    if (invitation) {
      this.createdInvitation.set(invitation);
      this.invitationCreated.set(true);
    }
  }

  async copyLink() {
    const invitation = this.createdInvitation();
    if (!invitation) return;

    const success = await this.invitationService.copyInviteLink(invitation.invite_code);

    const toast = await this.toastCtrl.create({
      message: success ? 'Link copied to clipboard!' : 'Failed to copy link',
      duration: 2000,
      position: 'bottom',
      color: success ? 'success' : 'danger',
    });
    await toast.present();
  }

  async shareLink() {
    const invitation = this.createdInvitation();
    if (!invitation) return;

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

  inviteAnother() {
    this.invitationCreated.set(false);
    this.createdInvitation.set(null);
    this.inviteForm.reset();
  }

  goToClientList() {
    this.router.navigate(['/tabs/clients']);
  }

  formatExpiryDate(dateString: string | undefined): string {
    if (!dateString) return '';

    const date = new Date(dateString);
    const now = new Date();
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
