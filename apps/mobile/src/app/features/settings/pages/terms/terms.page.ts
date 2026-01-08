import { Component } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonLabel,
} from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonSegment,
    IonSegmentButton,
    IonLabel,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Legal</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-segment [(ngModel)]="selectedSegment">
          <ion-segment-button value="terms">
            <ion-label>Terms of Service</ion-label>
          </ion-segment-button>
          <ion-segment-button value="privacy">
            <ion-label>Privacy Policy</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="legal-container">
        @if (selectedSegment === 'terms') {
          <div class="legal-content">
            <h1>Terms of Service</h1>
            <p class="last-updated">Last Updated: January 6, 2026</p>

            <section>
              <h2>1. Acceptance of Terms</h2>
              <p>
                By accessing or using FitOS, you agree to be bound by these Terms of Service and all
                applicable laws and regulations. If you do not agree with any of these terms, you are
                prohibited from using this service.
              </p>
            </section>

            <section>
              <h2>2. Description of Service</h2>
              <p>
                FitOS provides a platform connecting fitness trainers with their clients, offering
                features including:
              </p>
              <ul>
                <li>Workout programming and tracking</li>
                <li>Nutrition logging and monitoring</li>
                <li>Wearable device integration</li>
                <li>In-app messaging between trainers and clients</li>
                <li>Payment processing for training services</li>
              </ul>
            </section>

            <section>
              <h2>3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and
                for all activities that occur under your account. You agree to:
              </p>
              <ul>
                <li>Provide accurate and complete registration information</li>
                <li>Maintain and promptly update your account information</li>
                <li>Not share your password or account access with others</li>
                <li>Immediately notify us of any unauthorized use of your account</li>
              </ul>
            </section>

            <section>
              <h2>4. Acceptable Use</h2>
              <p>You agree not to:</p>
              <ul>
                <li>Use the service for any unlawful purpose</li>
                <li>Harass, abuse, or harm another person</li>
                <li>Impersonate any person or entity</li>
                <li>Upload viruses or malicious code</li>
                <li>Attempt to gain unauthorized access to any portion of the service</li>
                <li>Interfere with or disrupt the service or servers</li>
              </ul>
            </section>

            <section>
              <h2>5. Trainer-Client Relationships</h2>
              <p>
                FitOS facilitates connections between trainers and clients but is not responsible for
                the quality of training services provided. Trainers and clients are independent parties,
                and FitOS is not a party to their training agreements.
              </p>
            </section>

            <section>
              <h2>6. Payment Terms</h2>
              <p>
                Payments for training services are processed through Stripe. By using payment features:
              </p>
              <ul>
                <li>You authorize us to charge the payment method provided</li>
                <li>You agree to Stripe's terms of service</li>
                <li>Trainers set their own pricing and payment terms</li>
                <li>Refunds are subject to the individual trainer's policies</li>
              </ul>
            </section>

            <section>
              <h2>7. Health and Safety Disclaimer</h2>
              <p>
                <strong>Important:</strong> FitOS is a fitness tracking tool, not a medical device or
                service. Always:
              </p>
              <ul>
                <li>Consult with a physician before starting any exercise program</li>
                <li>Stop exercising if you experience pain, dizziness, or discomfort</li>
                <li>Seek immediate medical attention for any health emergency</li>
                <li>Not rely on the app for medical diagnosis or treatment</li>
              </ul>
            </section>

            <section>
              <h2>8. Intellectual Property</h2>
              <p>
                The service and its original content, features, and functionality are owned by FitOS and
                protected by international copyright, trademark, and other intellectual property laws.
              </p>
            </section>

            <section>
              <h2>9. Termination</h2>
              <p>
                We may terminate or suspend your account immediately, without prior notice, for any
                violation of these Terms. Upon termination, your right to use the service will
                immediately cease.
              </p>
            </section>

            <section>
              <h2>10. Limitation of Liability</h2>
              <p>
                FitOS shall not be liable for any indirect, incidental, special, consequential, or
                punitive damages resulting from your use of or inability to use the service.
              </p>
            </section>

            <section>
              <h2>11. Changes to Terms</h2>
              <p>
                We reserve the right to modify these terms at any time. We will notify users of any
                material changes via email or through the app. Continued use after changes constitutes
                acceptance of the modified terms.
              </p>
            </section>

            <section>
              <h2>12. Contact Us</h2>
              <p>
                If you have questions about these Terms, please contact us at:
                <br><br>
                Email: legal@fitos.app
                <br>
                Address: [Your Company Address]
              </p>
            </section>
          </div>
        }

        @if (selectedSegment === 'privacy') {
          <div class="legal-content">
            <h1>Privacy Policy</h1>
            <p class="last-updated">Last Updated: January 6, 2026</p>

            <section>
              <h2>1. Information We Collect</h2>
              <h3>Personal Information</h3>
              <ul>
                <li>Name, email address, and password</li>
                <li>Profile information (photo, bio, preferences)</li>
                <li>Payment information (processed by Stripe)</li>
              </ul>

              <h3>Fitness Data</h3>
              <ul>
                <li>Workout logs (exercises, sets, reps, weight)</li>
                <li>Nutrition logs (meals, macros, calories)</li>
                <li>Body measurements and progress photos</li>
                <li>Wearable device data (heart rate, sleep, steps)</li>
              </ul>

              <h3>Usage Information</h3>
              <ul>
                <li>App usage patterns and features accessed</li>
                <li>Device information and operating system</li>
                <li>IP address and general location</li>
              </ul>
            </section>

            <section>
              <h2>2. How We Use Your Information</h2>
              <p>We use collected information to:</p>
              <ul>
                <li>Provide and improve our services</li>
                <li>Facilitate trainer-client communication</li>
                <li>Process payments securely</li>
                <li>Send important notifications and updates</li>
                <li>Analyze usage patterns to improve the app</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2>3. Data Sharing</h2>
              <p>We share your information only with:</p>
              <ul>
                <li><strong>Your Trainer:</strong> If you're a client, your workout and nutrition data is
                shared with your assigned trainer</li>
                <li><strong>Service Providers:</strong> Stripe (payments), Supabase (database), Terra
                (wearables)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect rights and
                safety</li>
              </ul>
              <p><strong>We never sell your personal data to third parties.</strong></p>
            </section>

            <section>
              <h2>4. Data Security</h2>
              <p>We implement industry-standard security measures:</p>
              <ul>
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encrypted data storage</li>
                <li>Regular security audits</li>
                <li>Access controls and authentication</li>
                <li>Secure payment processing via Stripe</li>
              </ul>
            </section>

            <section>
              <h2>5. Your Rights</h2>
              <p>You have the right to:</p>
              <ul>
                <li><strong>Access:</strong> Request a copy of your data</li>
                <li><strong>Correction:</strong> Update inaccurate information</li>
                <li><strong>Deletion:</strong> Request account and data deletion</li>
                <li><strong>Portability:</strong> Export your data in a standard format</li>
                <li><strong>Opt-Out:</strong> Disable notifications and data collection</li>
              </ul>
            </section>

            <section>
              <h2>6. Data Retention</h2>
              <p>
                We retain your data as long as your account is active. After account deletion, we may
                retain certain information for:
              </p>
              <ul>
                <li>Legal compliance (payment records for 7 years)</li>
                <li>Dispute resolution</li>
                <li>Fraud prevention</li>
              </ul>
            </section>

            <section>
              <h2>7. Children's Privacy</h2>
              <p>
                FitOS is not intended for users under 13 years of age. We do not knowingly collect
                personal information from children under 13. If you believe we have collected such
                information, please contact us immediately.
              </p>
            </section>

            <section>
              <h2>8. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own.
                We ensure appropriate safeguards are in place for international transfers.
              </p>
            </section>

            <section>
              <h2>9. Cookies and Tracking</h2>
              <p>
                We use essential cookies for authentication and session management. We do not use
                third-party advertising cookies or tracking pixels.
              </p>
            </section>

            <section>
              <h2>10. Changes to Privacy Policy</h2>
              <p>
                We may update this policy periodically. Material changes will be communicated via email
                or in-app notification. Your continued use after changes indicates acceptance.
              </p>
            </section>

            <section>
              <h2>11. Contact Us</h2>
              <p>
                For privacy-related questions or to exercise your rights:
                <br><br>
                Email: privacy@fitos.app
                <br>
                Data Protection Officer: dpo@fitos.app
              </p>
            </section>

            <section>
              <h2>12. Compliance</h2>
              <p>
                This policy complies with:
              </p>
              <ul>
                <li>GDPR (General Data Protection Regulation - EU)</li>
                <li>CCPA (California Consumer Privacy Act - USA)</li>
                <li>HIPAA (where applicable for health data)</li>
              </ul>
            </section>
          </div>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    .legal-container {
      max-width: 768px;
      margin: 0 auto;
    }

    .legal-content {
      padding: 24px 16px;

      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        margin: 0 0 8px 0;
        color: var(--ion-color-dark);
      }

      .last-updated {
        color: var(--fitos-text-tertiary);
        font-size: 0.875rem;
        margin: 0 0 32px 0;
      }

      section {
        margin-bottom: 32px;

        &:last-child {
          margin-bottom: 0;
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: var(--ion-color-dark);
        }

        h3 {
          font-size: 1rem;
          font-weight: 600;
          margin: 16px 0 8px 0;
          color: var(--ion-color-dark);
        }

        p {
          line-height: 1.7;
          margin: 0 0 12px 0;
          color: var(--fitos-text-primary);
          font-size: 1rem;

          strong {
            color: var(--ion-color-dark);
            font-weight: 600;
          }
        }

        ul {
          margin: 0 0 12px 0;
          padding-left: 24px;

          li {
            margin-bottom: 8px;
            line-height: 1.6;
            color: var(--fitos-text-primary);
            font-size: 1rem;

            strong {
              color: var(--ion-color-dark);
              font-weight: 600;
            }

            &:last-child {
              margin-bottom: 0;
            }
          }
        }
      }
    }
  `],
})
export class TermsPage {
  selectedSegment = 'terms';
}
