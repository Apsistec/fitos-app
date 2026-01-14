import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
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
    <ion-header>
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
                      <strong>Trigger:</strong> {{ formatTrigger(sequence.trigger_on) }}
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
                            <h3>{{ getTemplateName(step.email_template_id) }}</h3>
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

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        text-align: center;
        padding: var(--fitos-space-8) var(--fitos-space-4);
        min-height: 400px;

        ion-icon {
          font-size: 80px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-4);
        }

        h2 {
          font-size: var(--fitos-font-size-xl);
          font-weight: 600;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-2) 0;
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-6) 0;
          max-width: 400px;
        }
      }

      .sequences-list {
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-4);
      }

      .sequence-card {
        margin: 0;

        ion-card-header {
          padding-bottom: var(--fitos-space-3);
        }

        .card-header-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: var(--fitos-space-4);

          .sequence-info {
            flex: 1;

            ion-card-title {
              font-size: var(--fitos-font-size-lg);
              font-weight: 600;
              color: var(--fitos-text-primary);
              margin-bottom: var(--fitos-space-1);
            }

            ion-card-subtitle {
              font-size: var(--fitos-font-size-sm);
              color: var(--fitos-text-secondary);
            }
          }

          .sequence-status {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--fitos-space-1);

            .status-label {
              font-size: var(--fitos-font-size-xs);
              color: var(--fitos-text-secondary);
              white-space: nowrap;
            }
          }
        }

        ion-card-content {
          display: flex;
          flex-direction: column;
          gap: var(--fitos-space-4);
        }
      }

      .trigger-info {
        display: flex;
        flex-direction: column;
        gap: var(--fitos-space-2);
        padding: var(--fitos-space-3);
        background: var(--fitos-bg-secondary);
        border-radius: var(--fitos-border-radius);

        .info-row {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-sm);

          ion-icon {
            font-size: 18px;
            color: var(--fitos-accent-primary);
          }

          strong {
            color: var(--fitos-text-secondary);
          }

          span {
            color: var(--fitos-text-primary);
          }
        }

        .trigger-status-badge {
          display: inline-block;
          padding: var(--fitos-space-1) var(--fitos-space-2);
          background: var(--fitos-accent-primary);
          color: white;
          border-radius: 12px;
          font-size: var(--fitos-font-size-xs);
          font-weight: 500;
        }
      }

      .steps-preview {
        h4 {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-base);
          font-weight: 600;
          color: var(--fitos-text-primary);
          margin: 0 0 var(--fitos-space-2) 0;

          ion-icon {
            font-size: 18px;
            color: var(--fitos-accent-primary);
          }
        }

        .steps-list {
          background: transparent;
          margin: 0;

          ion-item {
            --padding-start: var(--fitos-space-3);
            --padding-end: var(--fitos-space-3);
            --inner-padding-end: 0;
            --min-height: 60px;

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
            }

            ion-label {
              h3 {
                font-size: var(--fitos-font-size-sm);
                font-weight: 500;
                color: var(--fitos-text-primary);
                margin-bottom: var(--fitos-space-1);
              }

              p {
                font-size: var(--fitos-font-size-xs);
                color: var(--fitos-text-secondary);
              }
            }
          }
        }
      }

      .no-steps {
        padding: var(--fitos-space-4);
        text-align: center;

        p {
          margin: 0;
          font-size: var(--fitos-font-size-sm);
        }
      }

      .enrollment-stats {
        display: flex;
        align-items: center;
        gap: var(--fitos-space-4);
        padding-top: var(--fitos-space-3);
        border-top: 1px solid var(--fitos-border-color);

        .stat {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-sm);
          color: var(--fitos-text-secondary);

          ion-icon {
            font-size: 18px;
          }

          strong {
            color: var(--fitos-text-primary);
          }

          ion-badge {
            font-size: var(--fitos-font-size-xs);
          }
        }
      }

      .sequence-actions {
        display: flex;
        gap: var(--fitos-space-2);
        padding-top: var(--fitos-space-3);
        border-top: 1px solid var(--fitos-border-color);

        ion-button {
          flex: 1;
          --padding-start: var(--fitos-space-3);
          --padding-end: var(--fitos-space-3);
        }
      }

      ion-fab {
        margin: 0 var(--fitos-space-4) var(--fitos-space-4) 0;

        ion-fab-button {
          --background: var(--fitos-accent-primary);
          --color: white;
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
    event: any
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
      event.target.checked = !event.detail.checked;
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
