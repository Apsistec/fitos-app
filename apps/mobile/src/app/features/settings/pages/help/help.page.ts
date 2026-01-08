import { Component, inject } from '@angular/core';
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
  IonAccordionGroup,
  IonAccordion,
  IonNote,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  chatbubbleEllipsesOutline,
  mailOutline,
  bookOutline,
  videocamOutline,
  helpCircleOutline,
  chevronForward,
} from 'ionicons/icons';

@Component({
  selector: 'app-help',
  standalone: true,
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
    IonAccordionGroup,
    IonAccordion,
    IonNote,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Help & Support</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="help-container">
        <!-- Contact Support -->
        <ion-list>
          <div class="section-header">
            <h2>Contact Support</h2>
          </div>

          <ion-item button (click)="openChat()">
            <ion-icon name="chatbubble-ellipses-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h3>Live Chat</h3>
              <p>Chat with our support team</p>
            </ion-label>
            <ion-note slot="end">9 AM - 6 PM EST</ion-note>
          </ion-item>

          <ion-item button (click)="sendEmail()">
            <ion-icon name="mail-outline" slot="start" color="primary"></ion-icon>
            <ion-label>
              <h3>Email Support</h3>
              <p>support@fitos.app</p>
            </ion-label>
          </ion-item>
        </ion-list>

        <!-- Resources -->
        <ion-list>
          <div class="section-header">
            <h2>Resources</h2>
          </div>

          <ion-item button (click)="openGuide()">
            <ion-icon name="book-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>User Guide</h3>
              <p>Learn how to use FitOS</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end"></ion-icon>
          </ion-item>

          <ion-item button (click)="openVideos()">
            <ion-icon name="videocam-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Video Tutorials</h3>
              <p>Watch step-by-step guides</p>
            </ion-label>
            <ion-icon name="chevron-forward" slot="end"></ion-icon>
          </ion-item>
        </ion-list>

        <!-- FAQ -->
        <div class="faq-section">
          <div class="section-header">
            <h2>Frequently Asked Questions</h2>
          </div>

          <ion-accordion-group>
            <!-- Getting Started -->
            <ion-accordion value="getting-started">
              <ion-item slot="header">
                <ion-label>
                  <h3>How do I get started with FitOS?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  After creating your account:
                </p>
                <ol>
                  <li>Complete your profile with basic information</li>
                  <li>Connect with your trainer using an invitation code</li>
                  <li>Review and complete your first workout assigned by your trainer</li>
                  <li>Track your nutrition and sync wearable devices (optional)</li>
                </ol>
              </div>
            </ion-accordion>

            <!-- Workout Tracking -->
            <ion-accordion value="workout-tracking">
              <ion-item slot="header">
                <ion-label>
                  <h3>How do I log my workouts?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  To log a workout:
                </p>
                <ol>
                  <li>Go to the Workouts tab</li>
                  <li>Tap on a scheduled workout or "Start Workout"</li>
                  <li>Follow the exercises and log sets, reps, and weight</li>
                  <li>Use the built-in rest timer between sets</li>
                  <li>Rate your workout and add notes when finished</li>
                </ol>
              </div>
            </ion-accordion>

            <!-- Nutrition -->
            <ion-accordion value="nutrition">
              <ion-item slot="header">
                <ion-label>
                  <h3>How does nutrition tracking work?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  FitOS makes nutrition tracking simple:
                </p>
                <ul>
                  <li>Search for foods from our comprehensive database</li>
                  <li>Scan barcodes for quick logging</li>
                  <li>Create custom meals and recipes</li>
                  <li>View daily macros and calorie totals</li>
                  <li>Share nutrition data with your trainer</li>
                </ul>
              </div>
            </ion-accordion>

            <!-- Wearables -->
            <ion-accordion value="wearables">
              <ion-item slot="header">
                <ion-label>
                  <h3>Which wearable devices are supported?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  FitOS integrates with major wearable devices via Terra API:
                </p>
                <ul>
                  <li>Apple Watch</li>
                  <li>Fitbit</li>
                  <li>Garmin</li>
                  <li>Oura Ring</li>
                  <li>WHOOP</li>
                  <li>Google Fit</li>
                </ul>
                <p>
                  Connect your device in Settings → Wearable Devices.
                </p>
              </div>
            </ion-accordion>

            <!-- Trainer Communication -->
            <ion-accordion value="trainer-communication">
              <ion-item slot="header">
                <ion-label>
                  <h3>How do I communicate with my trainer?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  Stay in touch with your trainer through:
                </p>
                <ul>
                  <li>In-app messaging (Messages tab)</li>
                  <li>Workout notes and feedback</li>
                  <li>Progress photos and measurements</li>
                  <li>Automatic activity sharing</li>
                </ul>
              </div>
            </ion-accordion>

            <!-- Subscription -->
            <ion-accordion value="subscription">
              <ion-item slot="header">
                <ion-label>
                  <h3>How does billing work?</h3>
                </ion-label>
              </ion-item>
              <div class="accordion-content" slot="content">
                <p>
                  Your trainer sets their own pricing. Payments are:
                </p>
                <ul>
                  <li>Processed securely through Stripe</li>
                  <li>Billed monthly or per training package</li>
                  <li>Managed in Settings → My Subscription</li>
                  <li>Cancelable at any time</li>
                </ul>
              </div>
            </ion-accordion>
          </ion-accordion-group>
        </div>

        <!-- App Info -->
        <div class="app-info">
          <ion-note>
            <p><strong>App Version:</strong> 0.1.0</p>
            <p><strong>Platform:</strong> Ionic + Angular</p>
            <p><strong>Last Updated:</strong> January 2026</p>
          </ion-note>
        </div>

        <!-- Emergency Contact -->
        <div class="emergency-note">
          <ion-note color="danger">
            <strong>Important:</strong> This app is for fitness tracking only. In case of medical
            emergency, call 911 or your local emergency number.
          </ion-note>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .help-container {
      max-width: 768px;
      margin: 0 auto;
      padding-bottom: 24px;
    }

    .section-header {
      padding: 24px 16px 12px;

      h2 {
        margin: 0;
        font-size: 1.125rem;
        font-weight: 600;
        color: var(--ion-color-dark);
      }
    }

    ion-list {
      margin-bottom: 24px;
    }

    .faq-section {
      margin-bottom: 24px;

      ion-accordion-group {
        ion-accordion {
          ion-item {
            --padding-start: 16px;
            --padding-end: 16px;

            h3 {
              font-weight: 500;
              font-size: 0.9375rem;
            }
          }

          .accordion-content {
            padding: 16px;
            background: var(--ion-color-light);

            p {
              margin: 0 0 12px 0;
              line-height: 1.6;
              color: var(--ion-color-dark);
            }

            ol, ul {
              margin: 0;
              padding-left: 24px;

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
        }
      }
    }

    .app-info {
      padding: 16px;
      margin: 0 16px 16px;
      background: var(--ion-color-light);
      border-radius: 8px;

      ion-note {
        p {
          margin: 4px 0;
          line-height: 1.5;

          strong {
            color: var(--ion-color-dark);
          }
        }
      }
    }

    .emergency-note {
      padding: 16px;
      margin: 0 16px;
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
  `],
})
export class HelpPage {
  private toastController = inject(ToastController);

  constructor() {
    addIcons({
      chatbubbleEllipsesOutline,
      mailOutline,
      bookOutline,
      videocamOutline,
      helpCircleOutline,
      chevronForward,
    });
  }

  async openChat() {
    const toast = await this.toastController.create({
      message: 'Live chat coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async sendEmail() {
    window.location.href = 'mailto:support@fitos.app?subject=FitOS Support Request';
  }

  async openGuide() {
    const toast = await this.toastController.create({
      message: 'User guide coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }

  async openVideos() {
    const toast = await this.toastController.create({
      message: 'Video tutorials coming soon',
      duration: 2000,
      position: 'bottom',
    });
    await toast.present();
  }
}
