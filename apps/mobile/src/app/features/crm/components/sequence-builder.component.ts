import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  Input,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
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
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonBadge,
  IonReorder,
  IonReorderGroup,
  IonSpinner,
  IonText,
  ModalController,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  add,
  trashOutline,
  reorderTwoOutline,
  mailOutline,
  timeOutline,
  checkmarkCircle,
} from 'ionicons/icons';

import { EmailTemplateService } from '../../../core/services/email-template.service';
import { AuthService } from '../../../core/services/auth.service';
import { HapticService } from '../../../core/services/haptic.service';
import {
  EmailSequence,
  SequenceStep,
  EmailTemplate,
  CreateSequenceInput,
} from '@fitos/shared';

interface SequenceStepForm {
  id?: string;
  email_template_id: string;
  delay_days: number;
  delay_hours: number;
  step_order: number;
  template?: EmailTemplate;
}

@Component({
  selector: 'app-sequence-builder',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
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
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonBadge,
    IonReorder,
    IonReorderGroup,
    IonSpinner,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button (click)="cancel()">
            <ion-icon slot="icon-only" name="close" />
          </ion-button>
        </ion-buttons>
        <ion-title>{{ isEditMode ? 'Edit' : 'Create' }} Sequence</ion-title>
        <ion-buttons slot="end">
          <ion-button
            (click)="save()"
            [disabled]="!isValid() || saving()"
            color="primary"
            [strong]="true"
          >
            @if (saving()) {
              <ion-spinner name="circular" />
            } @else {
              Save
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading templates...</p>
        </div>
      } @else {
        <!-- Sequence Details -->
        <ion-card class="info-card">
          <ion-card-header>
            <ion-card-title>Sequence Details</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ion-list [inset]="true">
              <ion-item>
                <ion-input
                  label="Sequence Name"
                  labelPlacement="stacked"
                  [(ngModel)]="sequenceName"
                  placeholder="e.g., Welcome Series, Lead Nurture"
                  [counter]="true"
                  maxlength="100"
                  required
                />
              </ion-item>

              <ion-item>
                <ion-textarea
                  label="Description (Optional)"
                  labelPlacement="stacked"
                  [(ngModel)]="sequenceDescription"
                  placeholder="Describe what this sequence does..."
                  [autoGrow]="true"
                  rows="2"
                  maxlength="500"
                />
              </ion-item>

              <ion-item>
                <ion-select
                  label="Trigger"
                  labelPlacement="stacked"
                  [(ngModel)]="triggerOn"
                  placeholder="Select trigger"
                  interface="action-sheet"
                >
                  <ion-select-option value="lead_created"
                    >When lead is created</ion-select-option
                  >
                  <ion-select-option value="status_change"
                    >When lead status changes</ion-select-option
                  >
                  <ion-select-option value="manual"
                    >Manual enrollment</ion-select-option
                  >
                </ion-select>
              </ion-item>

              @if (triggerOn === 'status_change') {
                <ion-item>
                  <ion-select
                    label="When Status Becomes"
                    labelPlacement="stacked"
                    [(ngModel)]="triggerStatus"
                    placeholder="Select status"
                    interface="action-sheet"
                  >
                    <ion-select-option value="new">New</ion-select-option>
                    <ion-select-option value="contacted"
                      >Contacted</ion-select-option
                    >
                    <ion-select-option value="qualified"
                      >Qualified</ion-select-option
                    >
                    <ion-select-option value="consultation"
                      >Consultation</ion-select-option
                    >
                  </ion-select>
                </ion-item>
              }
            </ion-list>
          </ion-card-content>
        </ion-card>

        <!-- Sequence Steps -->
        <ion-card class="steps-card">
          <ion-card-header>
            <div class="steps-header">
              <ion-card-title>Email Steps</ion-card-title>
              <ion-badge color="primary">{{ steps().length }}</ion-badge>
            </div>
          </ion-card-header>

          <ion-card-content>
            @if (steps().length === 0) {
              <div class="empty-steps">
                <ion-icon name="mail-outline" />
                <p>No steps added yet</p>
                <ion-text color="medium">
                  <small>Add emails to your sequence in order</small>
                </ion-text>
              </div>
            } @else {
              <ion-reorder-group
                [disabled]="false"
                (ionItemReorder)="handleReorder($event)"
              >
                @for (step of steps(); track step.step_order; let i = $index) {
                  <ion-card class="step-card">
                    <ion-item lines="none">
                      <div class="step-number" slot="start">{{ i + 1 }}</div>

                      <ion-label>
                        <h3>
                          {{
                            getTemplateName(step.email_template_id) ||
                              'Select template'
                          }}
                        </h3>
                        <p>
                          @if (step.delay_days === 0 && step.delay_hours === 0) {
                            Send immediately
                          } @else {
                            Wait {{
                              formatDelay(step.delay_days, step.delay_hours)
                            }}
                          }
                        </p>
                      </ion-label>

                      <ion-button
                        slot="end"
                        fill="clear"
                        color="danger"
                        (click)="removeStep(i)"
                        aria-label="Remove step"
                      >
                        <ion-icon slot="icon-only" name="trash-outline" />
                      </ion-button>

                      <ion-reorder slot="end">
                        <ion-icon name="reorder-two-outline" />
                      </ion-reorder>
                    </ion-item>

                    <!-- Step Configuration -->
                    <div class="step-config">
                      <ion-item>
                        <ion-select
                          label="Email Template"
                          labelPlacement="stacked"
                          [(ngModel)]="step.email_template_id"
                          placeholder="Select template"
                          interface="action-sheet"
                        >
                          @for (
                            template of availableTemplates();
                            track template.id
                          ) {
                            <ion-select-option [value]="template.id">
                              {{ template.name }}
                            </ion-select-option>
                          }
                        </ion-select>
                      </ion-item>

                      <div class="delay-inputs">
                        <ion-item>
                          <ion-input
                            label="Wait (Days)"
                            labelPlacement="stacked"
                            type="number"
                            [(ngModel)]="step.delay_days"
                            min="0"
                            placeholder="0"
                          />
                        </ion-item>

                        <ion-item>
                          <ion-input
                            label="Wait (Hours)"
                            labelPlacement="stacked"
                            type="number"
                            [(ngModel)]="step.delay_hours"
                            min="0"
                            max="23"
                            placeholder="0"
                          />
                        </ion-item>
                      </div>
                    </div>
                  </ion-card>
                }
              </ion-reorder-group>
            }

            <ion-button
              expand="block"
              fill="outline"
              (click)="addStep()"
              class="add-step-button"
            >
              <ion-icon slot="start" name="add" />
              Add Email Step
            </ion-button>
          </ion-card-content>
        </ion-card>

        <!-- Validation Messages -->
        @if (!isValid() && sequenceName) {
          <ion-card class="validation-card" color="warning">
            <ion-card-content>
              <ion-text color="warning">
                <h3>
                  <ion-icon name="alert-circle-outline" />
                  Please fix the following:
                </h3>
                <ul>
                  @if (!sequenceName) {
                    <li>Sequence name is required</li>
                  }
                  @if (!triggerOn) {
                    <li>Trigger is required</li>
                  }
                  @if (triggerOn === 'status_change' && !triggerStatus) {
                    <li>Trigger status is required</li>
                  }
                  @if (steps().length === 0) {
                    <li>Add at least one email step</li>
                  }
                  @if (hasInvalidSteps()) {
                    <li>All steps must have a template selected</li>
                  }
                </ul>
              </ion-text>
            </ion-card-content>
          </ion-card>
        }
      }
    </ion-content>
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: var(--fitos-space-4);

        p {
          color: var(--fitos-text-secondary);
          font-size: var(--fitos-font-size-sm);
        }
      }

      .info-card,
      .steps-card {
        margin: 0 0 var(--fitos-space-4) 0;
      }

      .steps-header {
        display: flex;
        justify-content: space-between;
        align-items: center;

        ion-card-title {
          margin: 0;
        }

        ion-badge {
          font-size: var(--fitos-font-size-sm);
        }
      }

      .empty-steps {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--fitos-space-8) var(--fitos-space-4);
        min-height: 200px;

        ion-icon {
          font-size: 64px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-3);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-1) 0;
        }

        small {
          font-size: var(--fitos-font-size-sm);
        }
      }

      .step-card {
        margin: 0 0 var(--fitos-space-3) 0;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);

        ion-item {
          --padding-start: var(--fitos-space-3);
          --padding-end: var(--fitos-space-3);
        }
      }

      .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        background: var(--fitos-accent-primary);
        color: white;
        border-radius: 50%;
        font-size: var(--fitos-font-size-sm);
        font-weight: 600;
        flex-shrink: 0;
      }

      .step-config {
        padding: 0 var(--fitos-space-3) var(--fitos-space-3) var(--fitos-space-3);

        ion-item {
          --padding-start: 0;
          --padding-end: 0;
        }
      }

      .delay-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: var(--fitos-space-2);
        margin-top: var(--fitos-space-2);
      }

      .add-step-button {
        margin-top: var(--fitos-space-4);
      }

      .validation-card {
        margin-top: var(--fitos-space-4);

        h3 {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-base);
          font-weight: 600;
          margin: 0 0 var(--fitos-space-2) 0;

          ion-icon {
            font-size: 20px;
          }
        }

        ul {
          margin: 0;
          padding-left: var(--fitos-space-5);

          li {
            font-size: var(--fitos-font-size-sm);
            margin-bottom: var(--fitos-space-1);
          }
        }
      }
    `,
  ],
})
export class SequenceBuilderComponent implements OnInit {
  @Input() sequence?: EmailSequence;
  @Input() existingSteps?: SequenceStep[];

  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private emailService = inject(EmailTemplateService);
  private auth = inject(AuthService);
  private haptic = inject(HapticService);

  // State
  loading = signal(false);
  saving = signal(false);
  templates = signal<EmailTemplate[]>([]);
  steps = signal<SequenceStepForm[]>([]);

  // Form fields
  sequenceName = '';
  sequenceDescription = '';
  triggerOn: EmailSequence['trigger_on'] = 'lead_created';
  triggerStatus = '';

  // Computed
  isEditMode = computed(() => !!this.sequence);
  availableTemplates = computed(() =>
    this.templates().filter((t) => t.is_active)
  );

  isValid = computed(() => {
    if (!this.sequenceName || !this.triggerOn) return false;
    if (this.triggerOn === 'status_change' && !this.triggerStatus)
      return false;
    if (this.steps().length === 0) return false;
    if (this.hasInvalidSteps()) return false;
    return true;
  });

  constructor() {
    addIcons({
      close,
      add,
      trashOutline,
      reorderTwoOutline,
      mailOutline,
      timeOutline,
      checkmarkCircle,
    });
  }

  async ngOnInit() {
    await this.loadTemplates();
    this.initializeForm();
  }

  private async loadTemplates() {
    this.loading.set(true);

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      const templates = await this.emailService.getTemplates(trainerId);
      this.templates.set(templates);
    } catch (error) {
      console.error('Error loading templates:', error);
      await this.showToast('Failed to load templates', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  private initializeForm() {
    if (this.sequence) {
      // Edit mode
      this.sequenceName = this.sequence.name;
      this.sequenceDescription = this.sequence.description || '';
      this.triggerOn = this.sequence.trigger_on;
      this.triggerStatus = this.sequence.trigger_status || '';

      if (this.existingSteps) {
        const stepsForm: SequenceStepForm[] = this.existingSteps.map(
          (step) => ({
            id: step.id,
            email_template_id: step.email_template_id,
            delay_days: step.delay_days,
            delay_hours: step.delay_hours,
            step_order: step.step_order,
          })
        );
        this.steps.set(stepsForm);
      }
    } else {
      // Create mode - add first step
      this.addStep();
    }
  }

  addStep() {
    const currentSteps = this.steps();
    const newStep: SequenceStepForm = {
      email_template_id: '',
      delay_days: currentSteps.length === 0 ? 0 : 1, // First step sends immediately
      delay_hours: 0,
      step_order: currentSteps.length + 1,
    };
    this.steps.set([...currentSteps, newStep]);
  }

  removeStep(index: number) {
    this.haptic.light();
    const currentSteps = this.steps();
    const updatedSteps = currentSteps
      .filter((_, i) => i !== index)
      .map((step, i) => ({ ...step, step_order: i + 1 }));
    this.steps.set(updatedSteps);
  }

  handleReorder(event: any) {
    this.haptic.light();
    const currentSteps = this.steps();
    const itemToMove = currentSteps[event.detail.from];
    const updatedSteps = [...currentSteps];

    updatedSteps.splice(event.detail.from, 1);
    updatedSteps.splice(event.detail.to, 0, itemToMove);

    // Update step orders
    const reorderedSteps = updatedSteps.map((step, i) => ({
      ...step,
      step_order: i + 1,
    }));

    this.steps.set(reorderedSteps);
    event.detail.complete();
  }

  hasInvalidSteps(): boolean {
    return this.steps().some((step) => !step.email_template_id);
  }

  getTemplateName(templateId: string): string {
    const template = this.templates().find((t) => t.id === templateId);
    return template?.name || '';
  }

  formatDelay(days: number, hours: number): string {
    const parts: string[] = [];

    if (days > 0) {
      parts.push(`${days} day${days > 1 ? 's' : ''}`);
    }

    if (hours > 0) {
      parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    }

    return parts.length > 0 ? parts.join(' ') : 'immediately';
  }

  async save() {
    if (!this.isValid()) {
      await this.showToast(
        'Please fill in all required fields',
        'warning'
      );
      return;
    }

    this.saving.set(true);
    await this.haptic.medium();

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      // Create or update sequence
      const sequenceInput: CreateSequenceInput = {
        name: this.sequenceName,
        description: this.sequenceDescription || undefined,
        trigger_on: this.triggerOn,
        trigger_status:
          this.triggerOn === 'status_change'
            ? this.triggerStatus
            : undefined,
      };

      let sequenceId: string;

      if (this.isEditMode() && this.sequence) {
        // Update existing sequence
        const success = await this.emailService.updateSequence(
          this.sequence.id,
          sequenceInput
        );
        if (!success) throw new Error('Failed to update sequence');
        sequenceId = this.sequence.id;
      } else {
        // Create new sequence
        const newSequence = await this.emailService.createSequence(
          trainerId,
          sequenceInput
        );
        if (!newSequence) throw new Error('Failed to create sequence');
        sequenceId = newSequence.id;
      }

      // Add/update steps
      // TODO: Implement updateSequenceSteps method in email service
      // For now, we'll add steps individually
      for (const step of this.steps()) {
        await this.emailService.addSequenceStep(
          sequenceId,
          step.email_template_id,
          step.delay_days,
          step.delay_hours
        );
      }

      await this.showToast(
        `Sequence ${this.isEditMode() ? 'updated' : 'created'} successfully`,
        'success'
      );

      await this.modalCtrl.dismiss({ created: true });
    } catch (error) {
      console.error('Error saving sequence:', error);
      await this.showToast(
        `Failed to ${this.isEditMode() ? 'update' : 'create'} sequence`,
        'danger'
      );
    } finally {
      this.saving.set(false);
    }
  }

  async cancel() {
    await this.haptic.light();

    // Check if form has changes
    const hasChanges =
      this.sequenceName ||
      this.sequenceDescription ||
      this.steps().length > 1;

    if (hasChanges) {
      const alert = await this.alertCtrl.create({
        header: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to close?',
        buttons: [
          {
            text: 'Keep Editing',
            role: 'cancel',
          },
          {
            text: 'Discard',
            role: 'destructive',
            handler: () => {
              this.modalCtrl.dismiss();
            },
          },
        ],
      });

      await alert.present();
    } else {
      await this.modalCtrl.dismiss();
    }
  }

  private async showToast(
    message: string,
    color: 'success' | 'warning' | 'danger'
  ) {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
