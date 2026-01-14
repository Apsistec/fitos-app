import {
  Component,
  OnInit,
  Input,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonNote,
  IonBadge,
  IonIcon,
  IonButton,
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  warningOutline,
  personOutline,
  chevronForwardOutline,
} from 'ionicons/icons';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { RecoveryService } from '../../../../core/services/recovery.service';

interface ClientRecoveryAlert {
  client_id: string;
  client_name: string;
  overall_score: number;
  category: string;
  score_date: string;
  user_acknowledged: boolean;
}

/**
 * RecoveryAlertsComponent - Trainer view of under-recovered clients
 *
 * Features:
 * - List clients with low recovery scores
 * - Show critical/under-recovered status
 * - Quick navigation to client detail
 * - Alert badge count
 *
 * Sprint 23: Wearable Recovery Integration
 */
@Component({
  selector: 'app-recovery-alerts',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonIcon,
    IonButton,
    IonSpinner,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card class="recovery-alerts-card">
      <ion-card-header>
        <div class="card-header">
          <ion-card-title>
            <ion-icon name="warning-outline" />
            Recovery Alerts
          </ion-card-title>
          @if (alertCount() > 0) {
            <ion-badge color="danger">
              {{ alertCount() }}
            </ion-badge>
          }
        </div>
      </ion-card-header>

      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="crescent" />
            <p>Loading alerts...</p>
          </div>
        } @else if (alerts().length === 0) {
          <div class="empty-state">
            <ion-icon name="warning-outline" />
            <p>No recovery alerts</p>
            <ion-note>
              All clients have adequate recovery today.
            </ion-note>
          </div>
        } @else {
          <ion-list>
            @for (alert of alerts(); track alert.client_id) {
              <ion-item button (click)="openClientDetail(alert.client_id)" [detail]="true">
                <div class="alert-item">
                  <div class="alert-header">
                    <div class="client-info">
                      <ion-icon name="person-outline" />
                      <span class="client-name">{{ alert.client_name }}</span>
                    </div>
                    <ion-badge [color]="getCategoryColor(alert.category)">
                      {{ getCategoryLabel(alert.category) }}
                    </ion-badge>
                  </div>

                  <div class="alert-details">
                    <span class="score-value">
                      Recovery: {{ alert.overall_score }}/100
                    </span>
                    @if (!alert.user_acknowledged) {
                      <ion-note class="unacknowledged">
                        Not acknowledged
                      </ion-note>
                    }
                  </div>
                </div>
              </ion-item>
            }
          </ion-list>

          @if (hasMore()) {
            <ion-button
              fill="clear"
              expand="block"
              size="small"
              (click)="loadMore()"
            >
              View All Alerts
            </ion-button>
          }
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [
    `
      .recovery-alerts-card {
        margin: var(--fitos-space-4);
      }

      .card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--fitos-space-2);

        ion-card-title {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);
          font-size: var(--fitos-font-size-lg);
          font-weight: 600;

          ion-icon {
            font-size: 20px;
            color: var(--ion-color-warning);
          }
        }

        ion-badge {
          font-size: var(--fitos-font-size-xs);
          padding: 4px 10px;
        }
      }

      .loading-state,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: var(--fitos-space-6) var(--fitos-space-4);
        text-align: center;

        ion-icon {
          font-size: 48px;
          color: var(--fitos-text-tertiary);
          margin-bottom: var(--fitos-space-2);
        }

        ion-spinner {
          margin-bottom: var(--fitos-space-2);
        }

        p {
          font-size: var(--fitos-font-size-base);
          color: var(--fitos-text-secondary);
          margin: 0 0 var(--fitos-space-1) 0;
        }

        ion-note {
          font-size: var(--fitos-font-size-sm);
        }
      }

      .alert-item {
        width: 100%;
        padding: var(--fitos-space-2) 0;

        .alert-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--fitos-space-2);
          margin-bottom: var(--fitos-space-1);

          .client-info {
            display: flex;
            align-items: center;
            gap: var(--fitos-space-1);

            ion-icon {
              font-size: 18px;
              color: var(--fitos-text-tertiary);
            }

            .client-name {
              font-size: var(--fitos-font-size-base);
              font-weight: 600;
              color: var(--fitos-text-primary);
            }
          }

          ion-badge {
            font-size: var(--fitos-font-size-xs);
            text-transform: uppercase;
          }
        }

        .alert-details {
          display: flex;
          align-items: center;
          gap: var(--fitos-space-2);

          .score-value {
            font-size: var(--fitos-font-size-sm);
            color: var(--fitos-text-secondary);
          }

          .unacknowledged {
            font-size: var(--fitos-font-size-xs);
            color: var(--ion-color-danger);
            font-weight: 600;
          }
        }
      }

      ion-item {
        --padding-start: 0;
        --inner-padding-end: 0;
      }
    `,
  ],
})
export class RecoveryAlertsComponent implements OnInit {
  @Input({ required: true }) trainerId!: string;
  @Input() limit: number = 5;

  private supabase = inject(SupabaseService);
  private recoveryService = inject(RecoveryService);
  private router = inject(Router);

  // State
  alerts = signal<ClientRecoveryAlert[]>([]);
  loading = signal(true);
  hasMore = signal(false);
  alertCount = signal(0);

  constructor() {
    addIcons({
      warningOutline,
      personOutline,
      chevronForwardOutline,
    });
  }

  ngOnInit(): void {
    this.loadAlerts();
  }

  async loadAlerts(): Promise<void> {
    this.loading.set(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      // Get trainer's clients with today's recovery scores
      const { data, error } = await this.supabase.client
        .from('recovery_scores')
        .select(`
          id,
          user_id,
          overall_score,
          category,
          score_date,
          user_acknowledged,
          profiles:user_id (
            id,
            full_name
          )
        `)
        .eq('score_date', today)
        .in('category', ['under_recovered', 'critical'])
        .order('overall_score', { ascending: true });

      if (error) throw error;

      // Filter to only trainer's clients
      const { data: clientData, error: clientError } = await this.supabase.client
        .from('client_trainers')
        .select('client_id')
        .eq('trainer_id', this.trainerId)
        .eq('status', 'active');

      if (clientError) throw clientError;

      const clientIds = new Set(clientData.map((c: any) => c.client_id));

      // Map and filter
      const mappedAlerts = (data || [])
        .filter((score: any) => clientIds.has(score.user_id))
        .map((score: any) => ({
          client_id: score.user_id,
          client_name: score.profiles?.full_name || 'Unknown',
          overall_score: score.overall_score,
          category: score.category,
          score_date: score.score_date,
          user_acknowledged: score.user_acknowledged,
        }));

      // Count all alerts
      this.alertCount.set(mappedAlerts.length);

      // Apply limit
      if (mappedAlerts.length > this.limit) {
        this.alerts.set(mappedAlerts.slice(0, this.limit));
        this.hasMore.set(true);
      } else {
        this.alerts.set(mappedAlerts);
        this.hasMore.set(false);
      }
    } catch (err) {
      console.error('Error loading recovery alerts:', err);
    } finally {
      this.loading.set(false);
    }
  }

  openClientDetail(clientId: string): void {
    this.router.navigate(['/tabs/clients', clientId]);
  }

  loadMore(): void {
    // Load all alerts or navigate to full view
    this.limit = 999;
    this.loadAlerts();
  }

  getCategoryColor(category: string): string {
    switch (category) {
      case 'critical':
        return 'danger';
      case 'under_recovered':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getCategoryLabel(category: string): string {
    switch (category) {
      case 'critical':
        return 'Critical';
      case 'under_recovered':
        return 'Under-Recovered';
      default:
        return category;
    }
  }
}
