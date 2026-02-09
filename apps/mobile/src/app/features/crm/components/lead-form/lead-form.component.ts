import { Component, inject, signal, output, input, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline, closeOutline } from 'ionicons/icons';
import { LeadService, CreateLeadInput, LeadSource } from '../../../../core/services/lead.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { ModalController } from '@ionic/angular/standalone';

/**
 * LeadFormComponent - Capture new leads
 *
 * Features:
 * - Full lead capture form
 * - Source tracking
 * - Expected value estimation
 * - Form validation
 * - Can be embedded on websites
 */
@Component({
  selector: 'app-lead-form',
  standalone: true,
  imports: [
    FormsModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="lead-form">
      <ion-card-header>
        <ion-card-title>{{ title() }}</ion-card-title>
        @if (subtitle()) {
          <ion-text color="medium">
            <p class="subtitle">{{ subtitle() }}</p>
          </ion-text>
        }
      </ion-card-header>

      <ion-card-content>
        <form #leadFormRef="ngForm">
          <!-- First Name -->
          <ion-item lines="none" class="form-item">
            <ion-label position="stacked">First Name *</ion-label>
            <ion-input
              [(ngModel)]="formData.first_name"
              name="first_name"
              type="text"
              placeholder="Enter first name"
              required
            ></ion-input>
          </ion-item>

          <!-- Last Name -->
          <ion-item lines="none" class="form-item">
            <ion-label position="stacked">Last Name</ion-label>
            <ion-input
              [(ngModel)]="formData.last_name"
              name="last_name"
              type="text"
              placeholder="Enter last name"
            ></ion-input>
          </ion-item>

          <!-- Email -->
          <ion-item lines="none" class="form-item">
            <ion-label position="stacked">Email *</ion-label>
            <ion-input
              [(ngModel)]="formData.email"
              name="email"
              type="email"
              placeholder="email@example.com"
              required
            ></ion-input>
          </ion-item>

          <!-- Phone -->
          <ion-item lines="none" class="form-item">
            <ion-label position="stacked">Phone</ion-label>
            <ion-input
              [(ngModel)]="formData.phone"
              name="phone"
              type="tel"
              placeholder="(555) 123-4567"
            ></ion-input>
          </ion-item>

          @if (showSource()) {
            <!-- Source -->
            <ion-item lines="none" class="form-item">
              <ion-label position="stacked">How did you hear about us? *</ion-label>
              <ion-select
                [(ngModel)]="formData.source"
                name="source"
                placeholder="Select source"
                interface="action-sheet"
              >
                <ion-select-option value="website">Website</ion-select-option>
                <ion-select-option value="referral">Referral</ion-select-option>
                <ion-select-option value="social">Social Media</ion-select-option>
                <ion-select-option value="ad">Advertisement</ion-select-option>
                <ion-select-option value="other">Other</ion-select-option>
              </ion-select>
            </ion-item>

            <!-- Source Detail (conditional) -->
            @if (formData.source === 'referral' || formData.source === 'other') {
              <ion-item lines="none" class="form-item">
                <ion-label position="stacked">
                  {{ formData.source === 'referral' ? 'Who referred you?' : 'Please specify' }}
                </ion-label>
                <ion-input
                  [(ngModel)]="formData.source_details"
                  name="source_details"
                  type="text"
                  [placeholder]="formData.source === 'referral' ? 'Referrer name' : 'Details'"
                ></ion-input>
              </ion-item>
            }
          }

          @if (showNotes()) {
            <!-- Notes -->
            <ion-item lines="none" class="form-item">
              <ion-label position="stacked">
                {{ notesLabel() || 'Tell us about your fitness goals' }}
              </ion-label>
              <ion-textarea
                [(ngModel)]="formData.notes"
                name="notes"
                rows="4"
                placeholder="Share your goals, experience level, any injuries, etc."
                [autoGrow]="true"
              ></ion-textarea>
            </ion-item>
          }

          <!-- Validation Error -->
          @if (validationError()) {
            <div class="validation-error">
              <ion-text color="danger">
                <p>{{ validationError() }}</p>
              </ion-text>
            </div>
          }

          <!-- Actions -->
          <div class="action-buttons">
            <ion-button
              expand="block"
              (click)="submitForm()"
              [disabled]="submitting()"
            >
              <ion-icon slot="start" name="save-outline"></ion-icon>
              {{ submitting() ? 'Submitting...' : submitButtonText() }}
            </ion-button>

            @if (showCancel()) {
              <ion-button
                expand="block"
                fill="outline"
                (click)="cancel()"
                [disabled]="submitting()"
              >
                <ion-icon slot="start" name="close-outline"></ion-icon>
                Cancel
              </ion-button>
            }
          </div>
        </form>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .lead-form {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin: 0;
    }

    .subtitle {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .form-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
      margin-bottom: 16px;
    }

    ion-label[position="stacked"] {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-input,
    ion-textarea,
    ion-select {
      --background: var(--fitos-bg-tertiary, #262626);
      --padding-start: 12px;
      --padding-end: 12px;
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
    }

    ion-textarea {
      --padding-top: 12px;
      --padding-bottom: 12px;
    }

    .validation-error {
      margin: 16px 0;
      padding: 12px;
      background: rgba(239, 68, 68, 0.1);
      border-radius: 8px;
      border-left: 3px solid #EF4444;

      p {
        margin: 0;
        font-size: 13px;
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 24px;

      ion-button {
        margin: 0;
        --border-radius: 8px;
        height: 48px;
        font-weight: 700;
      }

      ion-button:first-child {
        --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
      }
    }
  `],
})
export class LeadFormComponent {
  private leadService = inject(LeadService);
  private haptic = inject(HapticService);
  private modalCtrl = inject(ModalController);

  // Inputs - Configuration
  title = input<string>('New Lead');
  subtitle = input<string>('');
  showSource = input<boolean>(true);
  showNotes = input<boolean>(true);
  showExpectedValue = input<boolean>(false);
  showCancel = input<boolean>(true);
  notesLabel = input<string>('');
  submitButtonText = input<string>('Add Lead');
  defaultSource = input<LeadSource | undefined>(undefined);

  // Outputs
  leadCreated = output<void>();
  cancelled = output<void>();

  // Form state - using plain object for ngModel compatibility
  formData: Partial<CreateLeadInput> = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    source: this.defaultSource() || 'website',
    source_details: '',
    notes: '',
  };

  submitting = signal(false);
  validationError = signal<string | null>(null);

  constructor() {
    addIcons({ saveOutline, closeOutline });
  }

  validateForm(): boolean {
    this.validationError.set(null);

    const data = this.formData;

    // Required: first_name
    if (!data.first_name || data.first_name.trim().length === 0) {
      this.validationError.set('First name is required');
      return false;
    }

    // Required: email
    if (!data.email || data.email.trim().length === 0) {
      this.validationError.set('Email is required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      this.validationError.set('Please enter a valid email address');
      return false;
    }

    // Required: source (if shown)
    if (this.showSource() && !data.source) {
      this.validationError.set('Please select how you heard about us');
      return false;
    }

    return true;
  }

  async submitForm(): Promise<void> {
    if (!this.validateForm()) {
      await this.haptic.warning();
      return;
    }

    this.submitting.set(true);

    try {
      const data = this.formData;

      const input: CreateLeadInput = {
        first_name: (data.first_name as string).trim(),
        last_name: data.last_name?.trim() || '',
        email: (data.email as string).trim(),
        phone: data.phone?.trim(),
        source: data.source as LeadSource,
        source_details: data.source_details?.trim(),
        notes: data.notes?.trim(),
      };

      const lead = await this.leadService.createLead(input);

      if (lead) {
        await this.haptic.success();
        this.resetForm();
        this.leadCreated.emit();

        // Dismiss modal if in modal context
        await this.modalCtrl.dismiss(null, 'leadCreated');
      } else {
        await this.haptic.error();
        this.validationError.set('Failed to create lead. Please try again.');
      }
    } catch (err) {
      console.error('Error submitting lead form:', err);
      await this.haptic.error();
      this.validationError.set('An error occurred. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.haptic.light();
    this.resetForm();
    this.cancelled.emit();

    // Dismiss modal if in modal context
    await this.modalCtrl.dismiss(null, 'cancelled');
  }

  private resetForm(): void {
    this.formData = {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      source: this.defaultSource() || 'website',
      source_details: '',
      notes: '',
    };
    this.validationError.set(null);
  }
}
