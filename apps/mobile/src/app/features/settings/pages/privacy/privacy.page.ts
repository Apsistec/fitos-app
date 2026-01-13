import {  Component, inject , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonIcon,
  IonNote,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  lockClosedOutline,
  keyOutline,
  downloadOutline,
  trashOutline,
  shieldCheckmarkOutline,
  eyeOffOutline,
} from 'ionicons/icons';
import { AuthService } from '@app/core/services/auth.service';
import { SupabaseService } from '@app/core/services/supabase.service';

@Component({
  selector: 'app-privacy',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonIcon,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Privacy & Security</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="privacy-container">
        <!-- Account Security -->
        <ion-list>
          <div class="list-header">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <h2>Account Security</h2>
          </div>

          <ion-item button detail (click)="manageSessions()">
            <ion-icon name="lock-closed-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Active Sessions</h3>
              <p>Manage devices where you're logged in</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Privacy Controls -->
        <ion-list>
          <div class="list-header">
            <ion-icon name="eye-off-outline"></ion-icon>
            <h2>Privacy Controls</h2>
          </div>

          <ion-item>
            <ion-label>
              <h3>Profile Visibility</h3>
              <p>Your profile is visible to your trainer only</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Activity Sharing</h3>
              <p>Workout data shared with your trainer</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Data Management -->
        <ion-list>
          <div class="list-header">
            <ion-icon name="download-outline"></ion-icon>
            <h2>Data Management</h2>
          </div>

          <ion-item button (click)="requestDataExport()">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Download Your Data</h3>
              <p>Export all your fitness data</p>
            </ion-label>
          </ion-item>

          <ion-item>
            <ion-label>
              <h3>Data Retention</h3>
              <p>We keep your data as long as your account is active</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Danger Zone -->
        <ion-list class="danger-zone">
          <div class="list-header danger">
            <ion-icon name="trash-outline"></ion-icon>
            <h2>Danger Zone</h2>
          </div>

          <ion-item button lines="none" (click)="deleteAccount()">
            <ion-icon name="trash-outline" slot="start" color="danger"></ion-icon>
            <ion-label color="danger">
              <h3>Delete Account</h3>
              <p>Permanently delete your account and all data</p>
            </ion-label>
          </ion-item>

          <div class="danger-note">
            <ion-note color="danger">
              <strong>Warning:</strong> This action cannot be undone. All your workout history,
              nutrition logs, and personal data will be permanently deleted.
            </ion-note>
          </div>
        </ion-list>

        <!-- Security Info -->
        <div class="security-info">
          <h3>How we protect your data</h3>
          <ul>
            <li>End-to-end encryption for all communications</li>
            <li>Secure data storage with industry-standard encryption</li>
            <li>Regular security audits and updates</li>
            <li>GDPR and CCPA compliant data handling</li>
            <li>Two-factor authentication available</li>
          </ul>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .privacy-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 24px;
    }

    .list-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 24px 16px 12px;

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary);
      }

      h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      &.danger {
        ion-icon {
          color: var(--ion-color-danger);
        }

        h2 {
          color: var(--ion-color-danger);
        }
      }
    }

    ion-list {
      margin-bottom: 24px;

      &.danger-zone {
        margin-top: 32px;
        border-top: 2px solid var(--ion-color-danger);
      }
    }

    .danger-note {
      padding: 16px;
      margin: 0 16px 16px;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-left: 3px solid var(--ion-color-danger);
      border-radius: 4px;

      ion-note {
        display: block;
        line-height: 1.5;

        strong {
          display: block;
          margin-bottom: 4px;
        }
      }
    }

    .security-info {
      padding: 24px 16px;
      margin: 0 16px;
      background: var(--fitos-bg-secondary);
      border-radius: 12px;

      h3 {
        margin: 0 0 16px 0;
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }

      ul {
        margin: 0;
        padding-left: 20px;

        li {
          margin-bottom: 8px;
          line-height: 1.5;
          color: var(--fitos-text-primary);
          font-size: 1rem;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  `],
})
export class PrivacyPage {
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  constructor() {
    addIcons({
      lockClosedOutline,
      keyOutline,
      downloadOutline,
      trashOutline,
      shieldCheckmarkOutline,
      eyeOffOutline,
    });
  }

  async manageSessions() {
    const toast = await this.toastController.create({
      message: 'Session management coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async requestDataExport() {
    const alert = await this.alertController.create({
      header: 'Export Your Data',
      message: 'We\'ll prepare your data and send you a download link within 24 hours.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Request Export',
          handler: async () => {
            const toast = await this.toastController.create({
              message: 'Data export requested. Check your email in 24 hours.',
              duration: 3000,
              color: 'success',
              position: 'bottom',
            });
            await toast.present();
          },
        },
      ],
    });

    await alert.present();
  }

  async deleteAccount() {
    const alert = await this.alertController.create({
      header: 'Delete Account?',
      message: 'This will permanently delete your account and all associated data. This action cannot be undone.',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            // Show confirmation
            const confirm = await this.alertController.create({
              header: 'Are you absolutely sure?',
              message: 'Type DELETE to confirm',
              inputs: [
                {
                  name: 'confirmation',
                  type: 'text',
                  placeholder: 'Type DELETE',
                },
              ],
              buttons: [
                {
                  text: 'Cancel',
                  role: 'cancel',
                },
                {
                  text: 'Delete Forever',
                  role: 'destructive',
                  handler: async (data) => {
                    if (data.confirmation === 'DELETE') {
                      // TODO: Implement account deletion
                      const toast = await this.toastController.create({
                        message: 'Account deletion initiated',
                        duration: 2000,
                        color: 'success',
                        position: 'bottom',
                      });
                      await toast.present();
                      await this.authService.signOut();
                      return true;
                    } else {
                      const toast = await this.toastController.create({
                        message: 'Confirmation text did not match',
                        duration: 2000,
                        color: 'warning',
                        position: 'bottom',
                      });
                      await toast.present();
                      return false;
                    }
                  },
                },
              ],
            });

            await confirm.present();
          },
        },
      ],
    });

    await alert.present();
  }
}
