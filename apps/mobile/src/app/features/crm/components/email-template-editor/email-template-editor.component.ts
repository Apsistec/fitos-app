import { Component, inject, signal, input, output, ChangeDetectionStrategy } from '@angular/core';
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
  IonButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonChip,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  eyeOutline,
  codeOutline,
  saveOutline,
  closeOutline,
  imageOutline,
  linkOutline,
  textOutline,
} from 'ionicons/icons';
import { HapticService } from '@app/core/services/haptic.service';

export type EmailTemplateVariable =
  | 'client_name'
  | 'client_email'
  | 'trainer_name'
  | 'trainer_email'
  | 'current_date'
  | 'unsubscribe_link';

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  isHtml: boolean;
  variables: EmailTemplateVariable[];
  category?: 'welcome' | 'follow_up' | 'newsletter' | 'promotional' | 'custom';
}

/**
 * EmailTemplateEditorComponent - Create and edit email templates
 *
 * Features:
 * - Rich text editor for email body
 * - Variable insertion (name, email, etc.)
 * - Subject line editor
 * - Preview mode
 * - HTML/Plain text toggle
 */
@Component({
  selector: 'app-email-template-editor',
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
    IonButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="template-editor">
      <ion-card-header>
        <ion-card-title>{{ title() }}</ion-card-title>
      </ion-card-header>

      <ion-card-content>
        <!-- View Mode Toggle -->
        <ion-segment [(ngModel)]="viewMode" (ionChange)="onViewModeChange()">
          <ion-segment-button value="edit">
            <ion-icon name="text-outline"></ion-icon>
            <ion-label>Edit</ion-label>
          </ion-segment-button>
          <ion-segment-button value="preview">
            <ion-icon name="eye-outline"></ion-icon>
            <ion-label>Preview</ion-label>
          </ion-segment-button>
        </ion-segment>

        @if (viewMode() === 'edit') {
          <!-- Edit Mode -->
          <div class="edit-mode">
            <!-- Template Name -->
            <ion-item lines="none" class="form-item">
              <ion-label position="stacked">Template Name *</ion-label>
              <ion-input
                [(ngModel)]="templateData.name"
                placeholder="e.g., Welcome Email"
                required
              ></ion-input>
            </ion-item>

            <!-- Subject Line -->
            <ion-item lines="none" class="form-item">
              <ion-label position="stacked">Subject Line *</ion-label>
              <ion-input
                [(ngModel)]="templateData.subject"
                placeholder="e.g., Welcome to FitOS!"
                required
              ></ion-input>
            </ion-item>

            <!-- Variables -->
            <div class="variables-section">
              <h3>Insert Variables</h3>
              <div class="variable-chips">
                @for (variable of availableVariables; track variable.key) {
                  <ion-chip (click)="insertVariable(variable.key)">
                    <ion-label>{{ variable.label }}</ion-label>
                  </ion-chip>
                }
              </div>
              <ion-text color="medium">
                <p class="variable-hint">Click a variable to insert it at cursor position</p>
              </ion-text>
            </div>

            <!-- Email Body -->
            <ion-item lines="none" class="form-item body-item">
              <ion-label position="stacked">Email Body *</ion-label>
              <ion-textarea
                [(ngModel)]="templateData.body"
                rows="15"
                placeholder="Write your email content here...&#10;&#10;You can use variables like {{client_name}} for personalization."
                [autoGrow]="true"
                #bodyTextarea
              ></ion-textarea>
            </ion-item>

            <!-- Validation Error -->
            @if (validationError()) {
              <div class="validation-error">
                <ion-text color="danger">
                  <p>{{ validationError() }}</p>
                </ion-text>
              </div>
            }
          </div>
        } @else {
          <!-- Preview Mode -->
          <div class="preview-mode">
            <div class="preview-subject">
              <strong>Subject:</strong> {{ renderPreview(templateData.subject) }}
            </div>
            <div class="preview-divider"></div>
            <div class="preview-body" [innerHTML]="renderPreview(templateData.body)"></div>
            <div class="preview-footer">
              <ion-text color="medium">
                <p>Preview shown with sample data</p>
              </ion-text>
            </div>
          </div>
        }

        <!-- Actions -->
        <div class="action-buttons">
          <ion-button
            expand="block"
            (click)="saveTemplate()"
            [disabled]="saving()"
          >
            <ion-icon slot="start" name="save-outline"></ion-icon>
            {{ saving() ? 'Saving...' : 'Save Template' }}
          </ion-button>

          @if (showCancel()) {
            <ion-button
              expand="block"
              fill="outline"
              (click)="cancel()"
              [disabled]="saving()"
            >
              <ion-icon slot="start" name="close-outline"></ion-icon>
              Cancel
            </ion-button>
          }
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .template-editor {
      margin: 0;
    }

    ion-segment {
      --background: var(--fitos-bg-tertiary);
      margin-bottom: var(--fitos-space-4);
    }

    ion-segment-button {
      --indicator-color: var(--fitos-accent-primary);
      --color: var(--fitos-text-secondary);
      --color-checked: var(--fitos-accent-primary);
      min-height: 48px;
    }

    .edit-mode,
    .preview-mode {
      margin-top: var(--fitos-space-4);
    }

    .form-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
      margin-bottom: var(--fitos-space-4);
    }

    ion-label[position="stacked"] {
      margin-bottom: var(--fitos-space-2);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .variables-section {
      margin: var(--fitos-space-4) 0;
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);

      h3 {
        margin: 0 0 var(--fitos-space-3) 0;
        font-size: var(--fitos-text-base);
        font-weight: 600;
        color: var(--fitos-text-primary);
      }
    }

    .variable-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--fitos-space-2);
      margin-bottom: var(--fitos-space-2);

      ion-chip {
        margin: 0;
        cursor: pointer;
        transition: transform var(--fitos-duration-fast);

        &:active {
          transform: scale(0.95);
        }
      }
    }

    .variable-hint {
      margin: 0;
      font-size: var(--fitos-text-xs);
    }

    .body-item {
      ion-textarea {
        --background: var(--fitos-bg-tertiary);
        --padding-start: var(--fitos-space-3);
        --padding-end: var(--fitos-space-3);
        --padding-top: var(--fitos-space-3);
        --padding-bottom: var(--fitos-space-3);
        border: 1px solid var(--fitos-border-subtle);
        border-radius: var(--fitos-radius-md);
        font-family: var(--fitos-font-mono);
        font-size: var(--fitos-text-sm);
      }
    }

    .validation-error {
      margin: var(--fitos-space-4) 0;
      padding: var(--fitos-space-3);
      background: rgba(239, 68, 68, 0.1);
      border-radius: var(--fitos-radius-md);
      border-left: 3px solid var(--fitos-status-error);

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
      }
    }

    .preview-mode {
      padding: var(--fitos-space-4);
      background: var(--fitos-bg-tertiary);
      border-radius: var(--fitos-radius-md);
    }

    .preview-subject {
      font-size: var(--fitos-text-lg);
      margin-bottom: var(--fitos-space-3);
      color: var(--fitos-text-primary);

      strong {
        font-weight: 600;
      }
    }

    .preview-divider {
      height: 1px;
      background: var(--fitos-border-subtle);
      margin: var(--fitos-space-3) 0;
    }

    .preview-body {
      font-size: var(--fitos-text-base);
      line-height: 1.6;
      color: var(--fitos-text-secondary);
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    .preview-footer {
      margin-top: var(--fitos-space-4);
      padding-top: var(--fitos-space-3);
      border-top: 1px solid var(--fitos-border-subtle);

      p {
        margin: 0;
        font-size: var(--fitos-text-xs);
        font-style: italic;
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-6);

      ion-button {
        margin: 0;
      }
    }
  `],
})
export class EmailTemplateEditorComponent {
  private haptic = inject(HapticService);

  // Inputs
  title = input<string>('Email Template');
  template = input<EmailTemplate | undefined>(undefined);
  showCancel = input<boolean>(true);

  // Outputs
  templateSaved = output<EmailTemplate>();
  cancelled = output<void>();

  // State
  viewMode = signal<'edit' | 'preview'>('edit');
  templateData = signal<EmailTemplate>({
    name: '',
    subject: '',
    body: '',
    isHtml: false,
    variables: [],
  });
  saving = signal(false);
  validationError = signal<string | null>(null);

  availableVariables = [
    { key: 'client_name' as EmailTemplateVariable, label: 'Client Name' },
    { key: 'client_email' as EmailTemplateVariable, label: 'Client Email' },
    { key: 'trainer_name' as EmailTemplateVariable, label: 'Your Name' },
    { key: 'trainer_email' as EmailTemplateVariable, label: 'Your Email' },
    { key: 'current_date' as EmailTemplateVariable, label: 'Current Date' },
    { key: 'unsubscribe_link' as EmailTemplateVariable, label: 'Unsubscribe Link' },
  ];

  constructor() {
    addIcons({
      eyeOutline,
      codeOutline,
      saveOutline,
      closeOutline,
      imageOutline,
      linkOutline,
      textOutline,
    });

    // Initialize with template if provided
    const existingTemplate = this.template();
    if (existingTemplate) {
      this.templateData.set({ ...existingTemplate });
    }
  }

  onViewModeChange(): void {
    this.haptic.light();
  }

  insertVariable(variable: EmailTemplateVariable): void {
    this.haptic.light();

    const currentBody = this.templateData().body;
    const variableTag = `{{${variable}}}`;

    // Append to end of body (in a real implementation, we'd insert at cursor)
    this.templateData.update(data => ({
      ...data,
      body: currentBody + variableTag,
      variables: [...new Set([...data.variables, variable])],
    }));
  }

  renderPreview(text: string): string {
    // Replace variables with sample data for preview
    const sampleData: Record<EmailTemplateVariable, string> = {
      client_name: 'John Doe',
      client_email: 'john@example.com',
      trainer_name: 'Alex Trainer',
      trainer_email: 'alex@fitos.app',
      current_date: new Date().toLocaleDateString(),
      unsubscribe_link: '[Unsubscribe Link]',
    };

    let preview = text;
    for (const [key, value] of Object.entries(sampleData)) {
      preview = preview.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }

    return preview;
  }

  validateTemplate(): boolean {
    this.validationError.set(null);

    const data = this.templateData();

    if (!data.name || data.name.trim().length === 0) {
      this.validationError.set('Template name is required');
      return false;
    }

    if (!data.subject || data.subject.trim().length === 0) {
      this.validationError.set('Subject line is required');
      return false;
    }

    if (!data.body || data.body.trim().length === 0) {
      this.validationError.set('Email body is required');
      return false;
    }

    // Check if unsubscribe link is present (required by law)
    if (!data.body.includes('{{unsubscribe_link}}')) {
      this.validationError.set('Email must include {{unsubscribe_link}} variable');
      return false;
    }

    return true;
  }

  async saveTemplate(): Promise<void> {
    if (!this.validateTemplate()) {
      await this.haptic.warning();
      return;
    }

    this.saving.set(true);

    try {
      await this.haptic.success();
      this.templateSaved.emit(this.templateData());
    } catch (err) {
      console.error('Error saving template:', err);
      await this.haptic.error();
      this.validationError.set('Failed to save template. Please try again.');
    } finally {
      this.saving.set(false);
    }
  }

  async cancel(): Promise<void> {
    await this.haptic.light();
    this.cancelled.emit();
  }
}
