import { Component, OnInit, ChangeDetectionStrategy, inject, signal, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';

import { LeadService } from '../../../core/services/lead.service';
import { AuthService } from '../../../core/services/auth.service';
import { CreateLeadInput, UpdateLeadInput, LeadWithExtras } from '@fitos/shared';

@Component({
  selector: 'app-add-lead-modal',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ isEditMode() ? 'Edit Lead' : 'New Lead' }}</ion-title>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">Cancel</ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button
            [strong]="true"
            (click)="save()"
            [disabled]="saving() || !leadForm.valid"
          >
            @if (saving()) {
              <ion-spinner name="crescent" />
            } @else {
              {{ isEditMode() ? 'Update' : 'Create' }}
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading lead...</p>
        </div>
      } @else {
        <form [formGroup]="leadForm">
          <!-- Basic Information -->
          <div class="section-header">
            <h2>Basic Information</h2>
          </div>

          <ion-list [inset]="true">
            <ion-item>
              <ion-label position="stacked">First Name *</ion-label>
              <ion-input
                formControlName="first_name"
                type="text"
                placeholder="John"
                [clearInput]="true"
              />
              @if (leadForm.get('first_name')?.invalid && leadForm.get('first_name')?.touched) {
                <div class="error-text">First name is required (min 2 characters)</div>
              }
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Last Name *</ion-label>
              <ion-input
                formControlName="last_name"
                type="text"
                placeholder="Smith"
                [clearInput]="true"
              />
              @if (leadForm.get('last_name')?.invalid && leadForm.get('last_name')?.touched) {
                <div class="error-text">Last name is required (min 2 characters)</div>
              }
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Email *</ion-label>
              <ion-input
                formControlName="email"
                type="email"
                placeholder="john.smith@example.com"
                [clearInput]="true"
              />
              @if (leadForm.get('email')?.invalid && leadForm.get('email')?.touched) {
                <div class="error-text">Valid email is required</div>
              }
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Phone</ion-label>
              <ion-input
                formControlName="phone"
                type="tel"
                placeholder="+1 (555) 123-4567"
                [clearInput]="true"
              />
            </ion-item>
          </ion-list>

          <!-- Source Tracking -->
          <div class="section-header">
            <h2>How did they find you?</h2>
          </div>

          <ion-list [inset]="true">
            <ion-item>
              <ion-label position="stacked">Source</ion-label>
              <ion-select
                formControlName="source"
                placeholder="Select source"
                interface="action-sheet"
              >
                <ion-select-option value="referral">Referral</ion-select-option>
                <ion-select-option value="social">Social Media</ion-select-option>
                <ion-select-option value="website">Website</ion-select-option>
                <ion-select-option value="gym">Gym/Studio</ion-select-option>
                <ion-select-option value="event">Event/Workshop</ion-select-option>
                <ion-select-option value="advertising">Advertising</ion-select-option>
                <ion-select-option value="other">Other</ion-select-option>
              </ion-select>
            </ion-item>

            <ion-item>
              <ion-label position="stacked">Source Details</ion-label>
              <ion-input
                formControlName="source_details"
                type="text"
                placeholder="e.g., Instagram ad, referred by John Doe"
                [clearInput]="true"
              />
            </ion-item>
          </ion-list>

          <!-- Contact Preferences -->
          <div class="section-header">
            <h2>Contact Preferences</h2>
          </div>

          <ion-list [inset]="true">
            <ion-item>
              <ion-label position="stacked">Preferred Contact Method</ion-label>
              <ion-select
                formControlName="preferred_contact_method"
                interface="action-sheet"
              >
                <ion-select-option value="email">Email</ion-select-option>
                <ion-select-option value="phone">Phone Call</ion-select-option>
                <ion-select-option value="text">Text Message</ion-select-option>
              </ion-select>
            </ion-item>
          </ion-list>

          <!-- Tags -->
          <div class="section-header">
            <h2>Tags</h2>
            <p class="section-description">Separate multiple tags with commas</p>
          </div>

          <ion-list [inset]="true">
            <ion-item>
              <ion-label position="stacked">Tags</ion-label>
              <ion-input
                formControlName="tags_input"
                type="text"
                placeholder="e.g., high-priority, weight-loss, local"
                [clearInput]="true"
              />
            </ion-item>
          </ion-list>

          <!-- Notes -->
          <div class="section-header">
            <h2>Notes</h2>
          </div>

          <ion-list [inset]="true">
            <ion-item>
              <ion-label position="stacked">Initial Notes</ion-label>
              <ion-textarea
                formControlName="notes"
                rows="4"
                placeholder="Add any relevant information about this lead..."
              />
            </ion-item>
          </ion-list>
        </form>
      }
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
      --color: var(--fitos-text-primary, #F5F5F5);
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      gap: 16px;

      p {
        color: var(--fitos-text-secondary, #A3A3A3);
        font-size: 13px;
      }
    }

    .section-header {
      margin-top: 24px;
      margin-bottom: 12px;
      padding: 0 16px;

      h2 {
        font-size: 14px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
        margin: 0 0 4px 0;
      }

      &:first-child {
        margin-top: 0;
      }
    }

    .section-description {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin: 0;
    }

    .error-text {
      font-size: 11px;
      color: #EF4444;
      margin-top: 4px;
      padding: 0 16px;
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: transparent;
      --padding-start: 16px;
      --padding-end: 16px;
      --inner-padding-end: 0;
    }

    ion-label[position="stacked"] {
      font-size: 13px;
      font-weight: 500;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 8px;
    }

    ion-input,
    ion-textarea,
    ion-select {
      --padding-start: 0;
      font-size: 14px;
    }

    ion-textarea {
      margin-top: 8px;
    }

    ion-button[slot="end"] {
      font-weight: 600;
    }

    ion-spinner {
      width: 20px;
      height: 20px;
    }
  `],
})
export class AddLeadModalComponent implements OnInit {
  leadId = input<string | undefined>();

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private leadService = inject(LeadService);
  private auth = inject(AuthService);

  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);

  leadForm!: FormGroup;

  async ngOnInit() {
    this.initForm();

    const id = this.leadId();
    if (id) {
      this.isEditMode.set(true);
      await this.loadLead(id);
    }
  }

  private initForm() {
    this.leadForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: [''],
      source: [''],
      source_details: [''],
      preferred_contact_method: ['email'],
      tags_input: [''],
      notes: [''],
    });
  }

  private async loadLead(leadId: string) {
    this.loading.set(true);

    try {
      const lead = await this.leadService.getLead(leadId);
      if (lead) {
        this.patchForm(lead);
      }
    } catch (error) {
      console.error('Error loading lead:', error);
      await this.showToast('Failed to load lead', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  private patchForm(lead: LeadWithExtras) {
    const tagsString = lead.tags?.join(', ') || '';

    this.leadForm.patchValue({
      first_name: lead.first_name,
      last_name: lead.last_name,
      email: lead.email,
      phone: lead.phone || '',
      source: lead.source || '',
      source_details: lead.source_details || '',
      preferred_contact_method: lead.preferred_contact_method || 'email',
      tags_input: tagsString,
      notes: lead.notes || '',
    });
  }

  async save() {
    if (!this.leadForm.valid) {
      // Mark all fields as touched to show validation errors
      Object.keys(this.leadForm.controls).forEach((key) => {
        this.leadForm.get(key)?.markAsTouched();
      });
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.saving.set(true);

    // Haptic feedback
    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      await Haptics.impact({ style: ImpactStyle.Medium });
    }

    try {
      const formValue = this.leadForm.value;

      // Parse tags from comma-separated string
      const tags = formValue.tags_input
        ? formValue.tags_input.split(',').map((t: string) => t.trim()).filter(Boolean)
        : [];

      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      const currentLeadId = this.leadId();
      if (this.isEditMode() && currentLeadId) {
        // Update existing lead
        const updates: UpdateLeadInput = {
          first_name: formValue.first_name,
          last_name: formValue.last_name,
          email: formValue.email,
          phone: formValue.phone || null,
          source: formValue.source || null,
          source_details: formValue.source_details || null,
          preferred_contact_method: formValue.preferred_contact_method,
          tags,
          notes: formValue.notes || null,
        };

        const success = await this.leadService.updateLead(currentLeadId, updates);

        if (success) {
          await this.showToast('Lead updated successfully', 'success');
          await this.modalCtrl.dismiss({ updated: true });
        } else {
          throw new Error('Update failed');
        }
      } else {
        // Create new lead
        const input: CreateLeadInput = {
          first_name: formValue.first_name,
          last_name: formValue.last_name,
          email: formValue.email,
          phone: formValue.phone || undefined,
          source: formValue.source || undefined,
          source_details: formValue.source_details || undefined,
          preferred_contact_method: formValue.preferred_contact_method,
          tags,
          notes: formValue.notes || undefined,
        };

        const lead = await this.leadService.createLead(trainerId, input);

        if (lead) {
          await this.showToast('Lead created successfully', 'success');
          await this.modalCtrl.dismiss({ created: true, lead });
        } else {
          throw new Error('Create failed');
        }
      }
    } catch (error) {
      console.error('Error saving lead:', error);
      const message =
        error instanceof Error ? error.message : 'Failed to save lead';
      await this.showToast(message, 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  async dismiss() {
    await this.modalCtrl.dismiss();
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
