import {  Component, OnInit, inject, signal , ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonReorder,
  IonReorderGroup,
  IonChip,
  IonText,
  IonTextarea,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  copyOutline,
  eyeOutline,
  codeOutline,
  reorderThreeOutline,
  settingsOutline,
} from 'ionicons/icons';
import { HapticService } from '../../../../core/services/haptic.service';
import { EmbedCodeComponent } from '../../components/embed-code/embed-code.component';

export type CustomFieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'number';

export interface CustomField {
  id: string;
  label: string;
  type: CustomFieldType;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
  order: number;
}

export interface LeadFormConfig {
  id?: string;
  name: string;
  title: string;
  subtitle?: string;
  showSource: boolean;
  showNotes: boolean;
  showExpectedValue: boolean;
  customFields: CustomField[];
  redirectUrl?: string;
  thankYouMessage?: string;
}

/**
 * FormBuilderPage - Build custom lead capture forms
 *
 * Features:
 * - Drag-and-drop field ordering
 * - Custom field types
 * - Form preview
 * - Embed code generation
 * - Form configuration
 */
@Component({
  selector: 'app-form-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonReorder,
    IonReorderGroup,
    IonChip,
    IonText,
    IonTextarea,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/crm"></ion-back-button>
        </ion-buttons>
        <ion-title>Lead Form Builder</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="previewForm()" aria-label="Preview form">
            <ion-icon slot="icon-only" name="eye-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="generateEmbedCode()" aria-label="Generate embed code">
            <ion-icon slot="icon-only" name="code-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="form-builder-container">
        <!-- Form Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Form Settings</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item lines="none">
              <ion-label position="stacked">Form Name (internal)</ion-label>
              <ion-input
                [(ngModel)]="formConfig.name"
                placeholder="Website Contact Form"
              ></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Form Title</ion-label>
              <ion-input
                [(ngModel)]="formConfig.title"
                placeholder="Get Started Today"
              ></ion-input>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Subtitle (optional)</ion-label>
              <ion-input
                [(ngModel)]="formConfig.subtitle"
                placeholder="Tell us about your fitness goals"
              ></ion-input>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Standard Fields -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>Standard Fields</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item>
              <ion-label>Show "How did you hear about us?"</ion-label>
              <ion-toggle
                [(ngModel)]="formConfig.showSource"
                slot="end"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>Show notes/goals field</ion-label>
              <ion-toggle
                [(ngModel)]="formConfig.showNotes"
                slot="end"
              ></ion-toggle>
            </ion-item>

            <ion-item>
              <ion-label>Show budget range</ion-label>
              <ion-toggle
                [(ngModel)]="formConfig.showExpectedValue"
                slot="end"
              ></ion-toggle>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Custom Fields -->
        <ion-card>
          <ion-card-header>
            <div class="card-header-with-action">
              <ion-card-title>Custom Fields</ion-card-title>
              <ion-button size="small" (click)="addCustomField()">
                <ion-icon slot="start" name="add-outline"></ion-icon>
                Add Field
              </ion-button>
            </div>
          </ion-card-header>
          <ion-card-content>
            @if (formConfig.customFields.length === 0) {
              <div class="empty-state">
                <ion-text color="medium">
                  <p>No custom fields yet. Click "Add Field" to create one.</p>
                </ion-text>
              </div>
            } @else {
              <ion-reorder-group (ionItemReorder)="handleReorder($event)" [disabled]="false">
                @for (field of formConfig.customFields; track field.id) {
                  <ion-item>
                    <ion-icon name="reorder-three-outline" slot="start"></ion-icon>
                    <ion-label>
                      <h3>{{ field.label }}</h3>
                      <p>
                        <ion-chip size="small">{{ field.type }}</ion-chip>
                        @if (field.required) {
                          <ion-chip size="small" color="danger">Required</ion-chip>
                        }
                      </p>
                    </ion-label>
                    <ion-button
                      fill="clear"
                      size="small"
                      (click)="editField(field)"
                      slot="end"
                    >
                      <ion-icon name="settings-outline"></ion-icon>
                    </ion-button>
                    <ion-button
                      fill="clear"
                      size="small"
                      color="danger"
                      (click)="deleteField(field.id)"
                      slot="end"
                    >
                      <ion-icon name="trash-outline"></ion-icon>
                    </ion-button>
                    <ion-reorder slot="end"></ion-reorder>
                  </ion-item>
                }
              </ion-reorder-group>
            }
          </ion-card-content>
        </ion-card>

        <!-- Post-Submit Settings -->
        <ion-card>
          <ion-card-header>
            <ion-card-title>After Submission</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-item lines="none">
              <ion-label position="stacked">Thank You Message</ion-label>
              <ion-textarea
                [(ngModel)]="formConfig.thankYouMessage"
                rows="3"
                placeholder="Thanks! We'll be in touch soon."
              ></ion-textarea>
            </ion-item>

            <ion-item lines="none">
              <ion-label position="stacked">Redirect URL (optional)</ion-label>
              <ion-input
                [(ngModel)]="formConfig.redirectUrl"
                type="url"
                placeholder="https://yoursite.com/thank-you"
              ></ion-input>
            </ion-item>
          </ion-card-content>
        </ion-card>

        <!-- Actions -->
        <div class="action-buttons">
          <ion-button expand="block" (click)="saveForm()">
            Save Form
          </ion-button>
          <ion-button expand="block" fill="outline" (click)="previewForm()">
            <ion-icon slot="start" name="eye-outline"></ion-icon>
            Preview
          </ion-button>
          <ion-button expand="block" fill="outline" (click)="generateEmbedCode()">
            <ion-icon slot="start" name="code-outline"></ion-icon>
            Get Embed Code
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-header ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-header ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    .form-builder-container {
      padding: 16px;
      padding-bottom: 48px;
    }

    ion-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 12px;
      box-shadow: none;
      margin-bottom: 16px;
    }

    ion-card-header ion-card-title {
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: 12px;
    }

    ion-list {
      background: transparent;
    }

    ion-label[position="stacked"] {
      margin-bottom: 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;

      ion-button {
        --border-radius: 8px;
        font-weight: 700;
      }
    }

    .empty-state {
      padding: 24px;
      text-align: center;

      p {
        margin: 0;
        font-size: 14px;
        color: var(--fitos-text-tertiary, #737373);
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-top: 16px;

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
export class FormBuilderPage implements OnInit {
  private router = inject(Router);
  private modalCtrl = inject(ModalController);
  private haptic = inject(HapticService);

  formConfig = signal<LeadFormConfig>({
    name: 'Website Contact Form',
    title: 'Get Started Today',
    subtitle: 'Tell us about your fitness goals',
    showSource: true,
    showNotes: true,
    showExpectedValue: false,
    customFields: [],
  });

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      copyOutline,
      eyeOutline,
      codeOutline,
      reorderThreeOutline,
      settingsOutline,
    });
  }

  ngOnInit(): void {
    // TODO: Load existing form config if editing
  }

  addCustomField(): void {
    this.haptic.light();

    const newField: CustomField = {
      id: `field_${Date.now()}`,
      label: 'New Field',
      type: 'text',
      required: false,
      order: this.formConfig().customFields.length,
    };

    this.formConfig.update(config => ({
      ...config,
      customFields: [...config.customFields, newField],
    }));
  }

  editField(field: CustomField): void {
    this.haptic.light();
    // TODO: Open field editor modal
    console.log('Edit field:', field);
  }

  deleteField(fieldId: string): void {
    this.haptic.warning();

    this.formConfig.update(config => ({
      ...config,
      customFields: config.customFields.filter(f => f.id !== fieldId),
    }));
  }

  handleReorder(event: any): void {
    this.haptic.light();

    const itemMove = this.formConfig().customFields.splice(event.detail.from, 1)[0];
    this.formConfig().customFields.splice(event.detail.to, 0, itemMove);

    // Update order values
    this.formConfig().customFields.forEach((field, index) => {
      field.order = index;
    });

    event.detail.complete();
  }

  async previewForm(): Promise<void> {
    this.haptic.light();
    // TODO: Open preview modal with LeadFormComponent
    console.log('Preview form:', this.formConfig());
  }

  async generateEmbedCode(): Promise<void> {
    this.haptic.light();

    // Generate a form ID (in production, this would come from saving the form)
    const formId = this.formConfig().id || `form_${Date.now()}`;

    const modal = await this.modalCtrl.create({
      component: EmbedCodeComponent,
      componentProps: {
        formId,
        formName: this.formConfig().name,
      },
    });

    await modal.present();
  }

  async saveForm(): Promise<void> {
    this.haptic.success();
    // TODO: Save form config to database
    console.log('Saving form:', this.formConfig());

    // Navigate back
    this.router.navigate(['/crm']);
  }
}
