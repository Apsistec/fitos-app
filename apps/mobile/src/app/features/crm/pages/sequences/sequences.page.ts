import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
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
  IonCardSubtitle,
  IonCardContent,
  IonBadge,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonText,
  ModalController,
  ToastController,
  AlertController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  arrowBackOutline,
  playOutline,
  pauseOutline,
  createOutline,
  trashOutline,
  mailOutline,
  timeOutline,
  peopleOutline,
} from 'ionicons/icons';

import { EmailTemplateService } from '../../../../core/services/email-template.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HapticService } from '../../../../core/services/haptic.service';
import {
  EmailSequence,
  SequenceStep,
  EmailTemplate,
} from '@fitos/shared';

interface SequenceWithDetails extends EmailSequence {
  steps?: SequenceStep[];
  enrolledCount?: number;
  activeEnrollments?: number;
}

@Component({
  selector: 'app-sequences',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
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
    IonCardSubtitle,
    IonCardContent,
    IonBadge,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonText,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button routerLink="/tabs/crm/pipeline">
            <ion-icon slot="icon-only" name="arrow-back-outline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Email Sequences</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading sequences...</p>
        </div>
      } @else if (sequences().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <ion-icon name="mail-outline" />
          <h2>No sequences yet</h2>
          <p>Create automated email sequences to nurture your leads</p>
          <ion-button (click)="createSequence()">
            <ion-icon slot="start" name="add" />
            Create Sequence
          </ion-button>
        </div>
      } @else {
        <!-- Sequences List -->
        <div class="sequences-list">
          @for (sequence of sequences(); track sequence.id) {
            <ion-card class="sequence-card">
              <ion-card-header>
                <div class="card-header-top">
                  <div class="sequence-info">
                    <ion-card-title>{{ sequence.name }}</ion-card-title>
                    @if (sequence.description) {
                      <ion-card-subtitle>{{ sequence.description }}</ion-card-subtitle>
                    }
                  </div>
                  <div class="sequence-status">
                    <ion-toggle
                      [checked]="sequence.is_active"
                      (ionChange)="toggleSequenceStatus(sequence, $event)"
                      [disabled]="toggling()"
                    />
                    <span class="status-label">
                      {{ sequence.is_active ? 'Active' : 'Paused' }}
                    </span>
                  </div>
                </div>
              </ion-card-header>

              <ion-card-content>
                <!-- Trigger Info -->
                <div class="trigger-info">
                  <div class="info-row">
                    <ion-icon name="play-outline" />
                    <span>
                      <strong>Trigger:</strong> {{ formatTrigger(sequence.trigger_event) }}
                    </span>
                  </div>
                  @if (sequence.trigger_status) {
                    <div class="info-row">
                      <span class="trigger-status-badge">
                        When lead status = {{ sequence.trigger_status }}
                      </span>
                    </div>
                  }
                </div>

                <!-- Steps Preview -->
                @if (sequence.steps && sequence.steps.length > 0) {
                  <div class="steps-preview">
                    <h4>
                      <ion-icon name="mail-outline" />
                      {{ sequence.steps.length }} Step{{ sequence.steps.length > 1 ? 's' : '' }}
                    </h4>
                    <ion-list class="steps-list" [inset]="true">
                      @for (step of sequence.steps; track step.id; let i = $index) {
                        <ion-item lines="none">
                          <div class="step-number" slot="start">{{ i + 1 }}</div>
                          <ion-label>
                            <h3>{{ getTemplateName(step.email_template_id!) }}</h3>
                            <p>
                              @if (step.delay_days === 0 && step.delay_hours === 0) {
                                Send immediately
                              } @else {
                                Wait {{ formatDelay(step.delay_days, step.delay_hours) }}
                              }
                            </p>
                          </ion-label>
                        </ion-item>
                      }
                    </ion-list>
                  </div>
                } @else {
                  <div class="no-steps">
                    <ion-text color="medium">
                      <p>No steps configured yet</p>
                    </ion-text>
                  </div>
                }

                <!-- Enrollment Stats -->
                <div class="enrollment-stats">
                  <div class="stat">
                    <ion-icon name="people-outline" />
                    <span>
                      <strong>{{ sequence.enrolledCount || 0 }}</strong> enrolled
                    </span>
                  </div>
                  @if (sequence.activeEnrollments !== undefined && sequence.activeEnrollments > 0) {
                    <div class="stat">
                      <ion-badge color="primary">
                        {{ sequence.activeEnrollments }} active
                      </ion-badge>
                    </div>
                  }
                </div>

                <!-- Actions -->
                <div class="sequence-actions">
                  <ion-button
                    fill="outline"
                    size="small"
                    (click)="editSequence(sequence)"
                  >
                    <ion-icon slot="start" name="create-outline" />
                    Edit
                  </ion-button>
                  <ion-button
                    fill="outline"
                    size="small"
                    color="danger"
                    (click)="deleteSequence(sequence)"
                  >
                    <ion-icon slot="start" name="trash-outline" />
                    Delete
                  </ion-button>
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>
      }

      <!-- FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createSequence()">
          <ion-icon name="add" />
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      ion-header ion-toolbar {
        --background: transparent;
        --border-width: 0;
      }

      ion-header ion-title {
        font-size: 18px;
        font-weight: 700;
        letter-spacing: -0.3px;
      }

      ion-card {
        --background: var(--fitos-bg-secondary, #1A1A1A);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 12px;
        box-shadow: none;
      }

      ion-card-header ion-card-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--fitos-text-primary, #F5F5F5);
      }

      .loading-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 300px;
        gap: 16px;

        p {
          color: var(--fitos-text-secondary, #A3A3A3);
          font-size: 13px;
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: 48px 16px;
        min-height: 400px;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary, #737373);
          margin-bottom: 16px;
        }

        h2 {
          font-size: 20px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;
        }

        p {
          font-size: 14px;
          color: var(--fitos-text-secondary, #A3A3A3);
          margin: 0 0 24px 0;
          max-width: 400px;
        }

        ion-button {
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }

      .sequences-list {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .sequence-card {
        margin: 0;

        ion-card-header {
          padding-bottom: 12px;
        }

        .card-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;

          .sequence-info {
            flex: 1;

            ion-card-title {
              font-size: 16px;
              font-weight: 700;
              color: var(--fitos-text-primary, #F5F5F5);
              margin-bottom: 4px;
            }

            ion-card-subtitle {
              font-size: 13px;
              color: var(--fitos-text-secondary, #A3A3A3);
            }
          }

          .sequence-status {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;

            .status-label {
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              font-weight: 500;
              color: var(--fitos-text-secondary, #A3A3A3);
              white-space: nowrap;
            }
          }
        }

        ion-card-content {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
      }

      .trigger-info {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 12px;
        background: var(--fitos-bg-secondary, #1A1A1A);
        border-radius: 8px;

        .info-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;

          ion-icon {
            font-size: 18px;
            color: var(--ion-color-primary, #10B981);
          }

          strong {
            color: var(--fitos-text-secondary, #A3A3A3);
          }

          span {
            color: var(--fitos-text-primary, #F5F5F5);
          }
        }

        .trigger-status-badge {
          display: inline-block;
          padding: 4px 8px;
          background: var(--ion-color-primary, #10B981);
          color: white;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
      }

      .steps-preview {
        h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--fitos-text-primary, #F5F5F5);
          margin: 0 0 8px 0;

          ion-icon {
            font-size: 18px;
            color: var(--ion-color-primary, #10B981);
          }
        }

        .steps-list {
          background: transparent;
          margin: 0;

          ion-item {
            --background: transparent;
            --padding-start: 12px;
            --padding-end: 12px;
            --inner-padding-end: 0;
            --min-height: 60px;

            .step-number {
              display: flex;
              align-items: center;
              justify-content: center;
              width: 32px;
              height: 32px;
              background: var(--ion-color-primary, #10B981);
              color: white;
              border-radius: 50%;
              font-size: 13px;
              font-weight: 600;
              font-family: 'Space Mono', monospace;
            }

            ion-label {
              h3 {
                font-size: 13px;
                font-weight: 500;
                color: var(--fitos-text-primary, #F5F5F5);
                margin-bottom: 4px;
              }

              p {
                font-size: 11px;
                color: var(--fitos-text-secondary, #A3A3A3);
              }
            }
          }
        }
      }

      .no-steps {
        padding: 16px;
        text-align: center;

        p {
          margin: 0;
          font-size: 13px;
          color: var(--fitos-text-tertiary, #737373);
        }
      }

      .enrollment-stats {
        display: flex;
        align-items: center;
        gap: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);

        .stat {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);

          ion-icon {
            font-size: 18px;
          }

          strong {
            color: var(--fitos-text-primary, #F5F5F5);
            font-family: 'Space Mono', monospace;
          }

          ion-badge {
            font-size: 11px;
          }
        }
      }

      .sequence-actions {
        display: flex;
        gap: 8px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);

        ion-button {
          flex: 1;
          --padding-start: 12px;
          --padding-end: 12px;
          --border-radius: 8px;
        }
      }

      ion-fab {
        margin: 0 16px 16px 0;

        ion-fab-button {
          --background: var(--ion-color-primary, #10B981);
          --color: white;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }
    `,
  ],
})
export class SequencesPage implements OnInit {
  private emailTemplateService = inject(EmailTemplateService);
  private auth = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private haptic = inject(HapticService);

  loading = signal(false);
  toggling = signal(false);
  sequences = signal<SequenceWithDetails[]>([]);
  templates = signal<EmailTemplate[]>([]);

  constructor() {
    addIcons({
      add,
      arrowBackOutline,
      playOutline,
      pauseOutline,
      createOutline,
      trashOutline,
      mailOutline,
      timeOutline,
      peopleOutline,
    });
  }

  async ngOnInit() {
    await this.loadSequences();
    await this.loadTemplates();
  }

  async loadSequences() {
    this.loading.set(true);

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      const sequences = await this.emailTemplateService.getSequences(trainerId);

      // Load steps and enrollment counts for each sequence
      const sequencesWithDetails: SequenceWithDetails[] = await Promise.all(
        sequences.map(async (seq) => {
          const [steps, enrollmentCounts] = await Promise.all([
            this.emailTemplateService.getSequenceSteps(seq.id),
            this.emailTemplateService.getSequenceEnrollmentCounts(seq.id),
          ]);

          return {
            ...seq,
            steps,
            enrolledCount: enrollmentCounts.total,
            activeEnrollments: enrollmentCounts.active,
          };
        })
      );

      this.sequences.set(sequencesWithDetails);
    } catch (error) {
      console.error('Error loading sequences:', error);
      await this.showToast('Failed to load sequences', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async loadTemplates() {
    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) return;

      await this.emailTemplateService.getTemplates(trainerId);
      this.templates.set(this.emailTemplateService.templates());
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  }

  async toggleSequenceStatus(
    sequence: SequenceWithDetails,
    event: CustomEvent<{ checked: boolean }>
  ) {
    await this.haptic.light();
    this.toggling.set(true);

    try {
      const newStatus = event.detail.checked;

      // Update in database
      const success = await this.emailTemplateService.toggleSequence(
        sequence.id,
        newStatus
      );

      if (!success) {
        throw new Error('Failed to toggle sequence');
      }

      // Update local state
      this.sequences.update((seqs) =>
        seqs.map((s) =>
          s.id === sequence.id ? { ...s, is_active: newStatus } : s
        )
      );

      await this.showToast(
        `Sequence ${newStatus ? 'activated' : 'paused'}`,
        'success'
      );
    } catch (error) {
      console.error('Error toggling sequence:', error);
      await this.showToast('Failed to update sequence', 'danger');

      // Revert toggle on error
      (event.target as HTMLInputElement).checked = !event.detail.checked;
    } finally {
      this.toggling.set(false);
    }
  }

  formatTrigger(trigger: string): string {
    const triggers: Record<string, string> = {
      lead_created: 'When lead is created',
      status_change: 'When lead status changes',
      manual: 'Manual enrollment',
      date: 'On specific date',
    };

    return triggers[trigger] || trigger;
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

  getTemplateName(templateId: string): string {
    const template = this.templates().find((t) => t.id === templateId);
    return template?.name || 'Unknown template';
  }

  async createSequence() {
    await this.haptic.medium();

    const { SequenceBuilderComponent } = await import(
      '../../components/sequence-builder.component'
    );

    const modal = await this.modalCtrl.create({
      component: SequenceBuilderComponent,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created) {
      await this.loadSequences();
    }
  }

  async editSequence(sequence: SequenceWithDetails) {
    await this.haptic.light();

    const { SequenceBuilderComponent } = await import(
      '../../components/sequence-builder.component'
    );

    const modal = await this.modalCtrl.create({
      component: SequenceBuilderComponent,
      componentProps: {
        sequence,
        existingSteps: sequence.steps,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created) {
      await this.loadSequences();
    }
  }

  async deleteSequence(sequence: SequenceWithDetails) {
    await this.haptic.heavy();

    const alert = await this.alertCtrl.create({
      header: 'Delete Sequence',
      message: `Are you sure you want to delete "${sequence.name}"? This will stop all active enrollments.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            try {
              const success = await this.emailTemplateService.deleteSequence(
                sequence.id
              );

              if (!success) {
                throw new Error('Failed to delete sequence');
              }

              // Update local state
              this.sequences.update((seqs) =>
                seqs.filter((s) => s.id !== sequence.id)
              );

              await this.showToast('Sequence deleted', 'success');
            } catch (error) {
              console.error('Error deleting sequence:', error);
              await this.showToast('Failed to delete sequence', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
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
