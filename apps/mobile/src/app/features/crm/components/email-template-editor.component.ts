import { Component, OnInit, ChangeDetectionStrategy, inject, signal, input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonChip,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonIcon,
  IonSpinner,
  IonSegment,
  IonSegmentButton,
  ModalController,
  ToastController,
} from '@ionic/angular/standalone';
import { Capacitor } from '@capacitor/core';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  saveOutline,
  eyeOutline,
  codeOutline,
  addCircleOutline,
} from 'ionicons/icons';

import { EmailTemplateService, TemplateVariable } from '../../../core/services/email-template.service';
import type { EmailTemplate } from '@fitos/shared';
import { AuthService } from '../../../core/services/auth.service';
import { HapticService } from '../../../core/services/haptic.service';

/**
 * EmailTemplateEditorComponent - Create/Edit email templates with variable substitution
 *
 * Features:
 * - Rich text editor for email body
 * - Variable picker with insertion
 * - Live preview with sample data
 * - Subject line editor
 * - Category selection
 * - Validation for required fields
 *
 * Usage:
 * ```typescript
 * const modal = await modalCtrl.create({
 *   component: EmailTemplateEditorComponent,
 *   componentProps: { templateId: 'uuid' } // Optional for edit mode
 * });
 * ```
 */
@Component({
  selector: 'app-email-template-editor',
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
    IonChip,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonSpinner,
    IonSegment,
    IonSegmentButton,
    FormsModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Edit Template' : 'New Template' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button
            [strong]="true"
            (click)="save()"
            [disabled]="saving() || !templateForm.valid"
          >
            @if (saving()) {
              <ion-spinner name="crescent" />
            } @else {
              <ion-icon slot="icon-only" name="save-outline"></ion-icon>
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- Edit/Preview Tabs -->
      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange()">
          <ion-segment-button value="edit">
            <ion-icon name="code-outline"></ion-icon>
            <ion-label>Edit</ion-label>
          </ion-segment-button>
          <ion-segment-button value="preview">
            <ion-icon name="eye-outline"></ion-icon>
            <ion-label>Preview</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading template...</p>
        </div>
      } @else {
        <!-- Edit Tab -->
        @if (activeTab() === 'edit') {
          <form [formGroup]="templateForm">
            <!-- Template Name -->
            <div class="section-header">
              <h2>Template Details</h2>
            </div>

            <ion-list [inset]="true">
              <ion-item>
                <ion-label position="stacked">Template Name *</ion-label>
                <ion-input
                  formControlName="name"
                  type="text"
                  placeholder="e.g., Welcome Email"
                  [clearInput]="true"
                />
                @if (templateForm.get('name')?.invalid && templateForm.get('name')?.touched) {
                  <div class="error-text">Template name is required</div>
                }
              </ion-item>

              <ion-item>
                <ion-label position="stacked">Category</ion-label>
                <ion-select
                  formControlName="category"
                  placeholder="Select category"
                  interface="action-sheet"
                >
                  <ion-select-option value="welcome">Welcome</ion-select-option>
                  <ion-select-option value="follow-up">Follow-up</ion-select-option>
                  <ion-select-option value="consultation">Consultation</ion-select-option>
                  <ion-select-option value="onboarding">Onboarding</ion-select-option>
                  <ion-select-option value="check-in">Check-in</ion-select-option>
                  <ion-select-option value="promotion">Promotion</ion-select-option>
                  <ion-select-option value="other">Other</ion-select-option>
                </ion-select>
              </ion-item>
            </ion-list>

            <!-- Subject Line -->
            <div class="section-header">
              <h2>Subject Line</h2>
            </div>

            <ion-list [inset]="true">
              <ion-item>
                <ion-label position="stacked">Subject *</ion-label>
                <ion-input
                  formControlName="subject"
                  type="text"
                  [placeholder]="'e.g., Welcome to {trainer_business_name}!'"
                  [clearInput]="true"
                />
                @if (templateForm.get('subject')?.invalid && templateForm.get('subject')?.touched) {
                  <div class="error-text">Subject is required</div>
                }
              </ion-item>
            </ion-list>

            <!-- Variable Picker -->
            <div class="section-header">
              <h2>Available Variables</h2>
              <p class="section-description">Click to insert into subject or body</p>
            </div>

            <div class="variable-chips">
              @for (variable of availableVariables; track variable.name) {
                <ion-chip
                  (click)="insertVariable(variable.name)"
                  color="primary"
                  class="variable-chip"
                >
                  <ion-icon name="add-circle-outline"></ion-icon>
                  <ion-label>{{ '{' + variable.name + '}' }}</ion-label>
                </ion-chip>
              }
            </div>

            <!-- Email Body -->
            <div class="section-header">
              <h2>Email Body</h2>
              <p class="section-description">Use variables like {{ '{' }}first_name{{ '}' }} for personalization</p>
            </div>

            <ion-list [inset]="true">
              <ion-item>
                <ion-textarea
                  #bodyTextarea
                  formControlName="body"
                  rows="12"
                  [placeholder]="'Hi {first_name},\n\nWelcome to {trainer_business_name}! I\\'m excited to help you reach your fitness goals.\n\nBest,\n{trainer_name}'"
                />
                @if (templateForm.get('body')?.invalid && templateForm.get('body')?.touched) {
                  <div class="error-text">Email body is required</div>
                }
              </ion-item>
            </ion-list>

            <!-- Detected Variables -->
            @if (detectedVariables().length > 0) {
              <div class="section-header">
                <h2>Variables Used</h2>
              </div>

              <div class="detected-variables">
                @for (variable of detectedVariables(); track variable) {
                  <ion-chip color="success" size="small">
                    {{ '{' + variable + '}' }}
                  </ion-chip>
                }
              </div>
            }
          </form>
        }

        <!-- Preview Tab -->
        @if (activeTab() === 'preview') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>Email Preview</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="email-preview">
                <!-- Subject -->
                <div class="preview-section">
                  <div class="preview-label">Subject:</div>
                  <div class="preview-value">{{ previewSubject() }}</div>
                </div>

                <!-- Body -->
                <div class="preview-section">
                  <div class="preview-label">Body:</div>
                  <div class="preview-body">{{ previewBody() }}</div>
                </div>
              </div>

              <!-- Preview Data Info -->
              <div class="preview-info">
                <ion-icon name="information-circle-outline"></ion-icon>
                <p>Preview uses sample data. Actual emails will use real lead information.</p>
              </div>
            </ion-card-content>
          </ion-card>

          <!-- Sample Data Display -->
          <ion-card>
            <ion-card-header>
              <ion-card-title>Sample Data Used</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list>
                @for (variable of availableVariables; track variable.name) {
                  <ion-item lines="none">
                    <ion-label>
                      <strong>{{ '{' + variable.name + '}' }}</strong>
                      <p>{{ variable.example }}</p>
                    </ion-label>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [`
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 200px;
      gap: var(--fitos-space-4);

      p {
        color: var(--fitos-text-secondary);
        font-size: var(--fitos-font-size-sm);
      }
    }

    .section-header {
      margin-top: var(--fitos-space-6);
      margin-bottom: var(--fitos-space-3);
      padding: 0 var(--fitos-space-4);

      h2 {
        font-size: var(--fitos-font-size-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
        margin: 0 0 var(--fitos-space-1) 0;
      }

      &:first-child {
        margin-top: 0;
      }
    }

    .section-description {
      font-size: var(--fitos-font-size-sm);
      color: var(--fitos-text-secondary);
      margin: 0;
    }

    .error-text {
      font-size: var(--fitos-font-size-xs);
      color: var(--ion-color-danger);
      margin-top: var(--fitos-space-1);
      padding: 0 var(--fitos-space-4);
    }

    .variable-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-4);
    }

    .variable-chip {
      cursor: pointer;
      transition: transform var(--fitos-duration-fast) var(--fitos-ease-default);

      &:hover {
        transform: translateY(-2px);
      }

      &:active {
        transform: scale(0.95);
      }
    }

    .detected-variables {
      display: flex;
      flex-wrap: wrap;
      gap: var(--fitos-space-2);
      padding: var(--fitos-space-4);
    }

    .email-preview {
      background: var(--fitos-bg-secondary);
      border-radius: var(--fitos-radius-md);
      padding: var(--fitos-space-4);
    }

    .preview-section {
      margin-bottom: var(--fitos-space-4);

      &:last-child {
        margin-bottom: 0;
      }
    }

    .preview-label {
      font-size: var(--fitos-font-size-sm);
      font-weight: 600;
      color: var(--fitos-text-secondary);
      margin-bottom: var(--fitos-space-2);
    }

    .preview-value {
      font-size: var(--fitos-font-size-base);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .preview-body {
      font-size: var(--fitos-font-size-base);
      color: var(--fitos-text-primary);
      line-height: 1.6;
      white-space: pre-wrap;
    }

    .preview-info {
      display: flex;
      align-items: flex-start;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-4);
      padding: var(--fitos-space-3);
      background: var(--ion-color-primary-tint);
      border-radius: var(--fitos-radius-sm);

      ion-icon {
        flex-shrink: 0;
        font-size: 20px;
        color: var(--ion-color-primary);
      }

      p {
        margin: 0;
        font-size: var(--fitos-font-size-sm);
        color: var(--fitos-text-secondary);
      }
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --padding-start: var(--fitos-space-4);
      --padding-end: var(--fitos-space-4);
      --inner-padding-end: 0;
    }

    ion-label[position="stacked"] {
      font-size: var(--fitos-font-size-sm);
      font-weight: 500;
      color: var(--fitos-text-secondary);
      margin-bottom: var(--fitos-space-2);
    }

    ion-input,
    ion-textarea,
    ion-select {
      --padding-start: 0;
      font-size: var(--fitos-font-size-base);
    }

    ion-textarea {
      margin-top: var(--fitos-space-2);
      font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
    }

    ion-segment {
      ion-icon {
        margin-bottom: var(--fitos-space-1);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .variable-chip {
        transition: none;
      }

      .variable-chip:hover {
        transform: none;
      }
    }
  `],
})
export class EmailTemplateEditorComponent implements OnInit {
  templateId = input<string | undefined>();

  private fb = inject(FormBuilder);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private emailTemplateService = inject(EmailTemplateService);
  private auth = inject(AuthService);
  private haptic = inject(HapticService);

  loading = signal(false);
  saving = signal(false);
  isEditMode = signal(false);
  activeTab = signal<'edit' | 'preview'>('edit');

  templateForm!: FormGroup;
  bodyTextarea: any; // Reference to textarea for cursor position

  // Available variables from service
  availableVariables: TemplateVariable[] = this.emailTemplateService.availableVariables;

  // Sample data for preview
  private sampleData: Record<string, string> = {
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@example.com',
    phone: '(555) 123-4567',
    trainer_name: 'Sarah Johnson',
    trainer_email: 'sarah@fitos.com',
    trainer_business_name: 'FitLife Training',
    consultation_date: 'January 20, 2026',
  };

  // Computed: Extract variables from current form values
  detectedVariables = computed(() => {
    const subject = this.templateForm?.get('subject')?.value || '';
    const body = this.templateForm?.get('body')?.value || '';
    const combined = subject + ' ' + body;
    return this.emailTemplateService.extractVariables(combined);
  });

  // Computed: Preview with sample data
  previewSubject = computed(() => {
    const subject = this.templateForm?.get('subject')?.value || '';
    return this.renderWithSampleData(subject);
  });

  previewBody = computed(() => {
    const body = this.templateForm?.get('body')?.value || '';
    return this.renderWithSampleData(body);
  });

  constructor() {
    addIcons({
      closeOutline,
      saveOutline,
      eyeOutline,
      codeOutline,
      addCircleOutline,
    });
  }

  async ngOnInit() {
    this.initForm();

    const id = this.templateId();
    if (id) {
      this.isEditMode.set(true);
      await this.loadTemplate(id);
    }
  }

  private initForm() {
    this.templateForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      category: [''],
      subject: ['', [Validators.required, Validators.minLength(3)]],
      body: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  private async loadTemplate(templateId: string) {
    this.loading.set(true);

    try {
      // Fetch template directly from database since service doesn't have getTemplate()
      const { data: template, error } = await this.emailTemplateService['supabase'].client
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      if (template) {
        this.patchForm(template);
      }
    } catch (error) {
      console.error('Error loading template:', error);
      await this.showToast('Failed to load template', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  private patchForm(template: EmailTemplate) {
    this.templateForm.patchValue({
      name: template.name,
      category: template.category || '',
      subject: template.subject,
      body: template.body,
    });
  }

  /**
   * Insert variable at cursor position or end of body
   */
  async insertVariable(variableName: string) {
    await this.haptic.light();

    const variableText = `{${variableName}}`;
    const bodyControl = this.templateForm.get('body');

    if (!bodyControl) return;

    const currentValue = bodyControl.value || '';

    // For now, append to end. In production, you'd track cursor position
    // and insert at cursor using textarea element reference
    const newValue = currentValue + variableText;

    bodyControl.setValue(newValue);
    bodyControl.markAsTouched();

    await this.showToast(`Inserted ${variableText}`, 'success');
  }

  /**
   * Render text with sample data
   */
  private renderWithSampleData(text: string): string {
    let result = text;

    Object.entries(this.sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });

    return result;
  }

  /**
   * Tab change handler
   */
  async onTabChange() {
    await this.haptic.light();
  }

  /**
   * Save template
   */
  async save() {
    if (!this.templateForm.valid) {
      Object.keys(this.templateForm.controls).forEach((key) => {
        this.templateForm.get(key)?.markAsTouched();
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
      const formValue = this.templateForm.value;
      const trainerId = this.auth.user()?.id;

      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      if (this.isEditMode()) {
        // Update existing template
        const success = await this.emailTemplateService.updateTemplate(
          this.templateId()!,
          {
            name: formValue.name,
            category: formValue.category || null,
            subject: formValue.subject,
            body: formValue.body,
          }
        );

        if (success) {
          await this.showToast('Template updated successfully', 'success');
          await this.modalCtrl.dismiss({ updated: true });
        } else {
          throw new Error('Update failed');
        }
      } else {
        // Create new template
        const template = await this.emailTemplateService.createTemplate(trainerId, {
          name: formValue.name,
          category: formValue.category || undefined,
          subject: formValue.subject,
          body: formValue.body,
        });

        if (template) {
          await this.showToast('Template created successfully', 'success');
          await this.modalCtrl.dismiss({ created: true, template });
        } else {
          throw new Error('Create failed');
        }
      }
    } catch (error) {
      console.error('Error saving template:', error);
      const message = error instanceof Error ? error.message : 'Failed to save template';
      await this.showToast(message, 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  async dismiss() {
    await this.modalCtrl.dismiss();
  }

  private async showToast(message: string, color: 'success' | 'warning' | 'danger') {
    const toast = await this.toastCtrl.create({
      message,
      duration: 3000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
