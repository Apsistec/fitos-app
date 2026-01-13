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
import { HapticService } from '@app/core/services/haptic.service';
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
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/crm"></ion-back-button>
        </ion-buttons>
        <ion-title>Lead Form Builder</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="previewForm()">
            <ion-icon slot="icon-only" name="eye-outline"></ion-icon>
          </ion-button>
          <ion-button (click)="generateEmbedCode()">
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
    .form-builder-container {
      padding: var(--fitos-space-4);
      padding-bottom: var(--fitos-space-8);
    }

    ion-card {
      margin-bottom: var(--fitos-space-4);
    }

    ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      margin-bottom: var(--fitos-space-3);
    }

    ion-label[position="stacked"] {
      margin-bottom: var(--fitos-space-2);
      font-size: var(--fitos-text-sm);
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .card-header-with-action {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .empty-state {
      padding: var(--fitos-space-6);
      text-align: center;

      p {
        margin: 0;
        font-size: var(--fitos-text-sm);
      }
    }

    .action-buttons {
      display: flex;
      flex-direction: column;
      gap: var(--fitos-space-2);
      margin-top: var(--fitos-space-4);

      ion-button {
        margin: 0;
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
