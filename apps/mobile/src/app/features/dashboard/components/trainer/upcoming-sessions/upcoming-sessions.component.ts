import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { AssignmentService } from '../../../../../core/services/assignment.service';

interface UpcomingSession {
  id: string;
  client_id: string;
  client_name: string;
  avatar_url: string | null;
  workout_name: string;
  scheduled_date: string;
  scheduled_time: string | null;
  is_overdue: boolean;
}

@Component({
  selector: 'app-upcoming-sessions',
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Upcoming Sessions</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="dots"></ion-spinner>
          </div>
        } @else if (sessions().length === 0) {
          <div class="empty-state">
            <ion-icon name="calendar-outline" size="large"></ion-icon>
            <p>No upcoming sessions scheduled</p>
          </div>
        } @else {
          <div class="session-list">
            @for (session of sessions(); track session.id) {
              <div class="session-item" [class.overdue]="session.is_overdue" (click)="viewSession(session)">
                <ion-avatar>
                  @if (session.avatar_url) {
                    <img [src]="session.avatar_url" [alt]="session.client_name">
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(session.client_name) }}
                    </div>
                  }
                </ion-avatar>

                <div class="session-info">
                  <div class="session-client">{{ session.client_name }}</div>
                  <div class="session-workout">{{ session.workout_name }}</div>
                  <div class="session-time">
                    <ion-icon name="time-outline"></ion-icon>
                    {{ formatSessionTime(session) }}
                    @if (session.is_overdue) {
                      <ion-badge color="danger" mode="ios">Overdue</ion-badge>
                    }
                  </div>
                </div>

                <ion-icon name="chevron-forward-outline"></ion-icon>
              </div>
            }
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .loading-state {
      display: flex;
      justify-content: center;
      padding: 32px 0;
    }

    .empty-state {
      text-align: center;
      padding: 32px 16px;

      ion-icon {
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .session-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .session-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;

      &.overdue {
        background: rgba(var(--ion-color-danger-rgb), 0.1);
      }

      &:active {
        background: var(--ion-color-light-shade);
      }
    }

    ion-avatar {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    .avatar-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--fitos-accent-primary, #10B981);
      color: white;
      font-weight: 600;
      font-size: 18px;
    }

    .session-info {
      flex: 1;
      min-width: 0;
    }

    .session-client {
      font-weight: 600;
      margin-bottom: 2px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-workout {
      font-size: 13px;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .session-time {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--ion-color-medium);

      ion-icon {
        font-size: 14px;
      }

      ion-badge {
        margin-left: 4px;
        font-size: 10px;
      }
    }
  `]
})
export class UpcomingSessionsComponent implements OnInit {
  sessions = signal<UpcomingSession[]>([]);
  loading = signal(true);

  constructor(
    private assignmentService: AssignmentService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadUpcomingSessions();
  }

  private async loadUpcomingSessions() {
    try {
      const sessions = await this.assignmentService.getUpcomingSchedule(7);
      this.sessions.set(sessions);
    } catch (error) {
      console.error('Error loading upcoming sessions:', error);
    } finally {
      this.loading.set(false);
    }
  }

  viewSession(session: UpcomingSession) {
    this.router.navigate(['/clients', session.client_id]);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  formatSessionTime(session: UpcomingSession): string {
    const date = new Date(session.scheduled_date);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let dateStr = '';
    if (diffDays === 0) dateStr = 'Today';
    else if (diffDays === 1) dateStr = 'Tomorrow';
    else if (diffDays < 7) dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
    else dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (session.scheduled_time) {
      dateStr += ` at ${session.scheduled_time}`;
    }

    return dateStr;
  }
}
