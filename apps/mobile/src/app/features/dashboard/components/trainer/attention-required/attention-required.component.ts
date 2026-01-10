import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ClientService } from '../../../../../core/services/client.service';

interface AttentionItem {
  id: string;
  client_id: string;
  client_name: string;
  avatar_url: string | null;
  type: 'no_activity' | 'missed_workouts' | 'nutrition_gap' | 'check_in_due';
  message: string;
  priority: 'high' | 'medium' | 'low';
  created_at: string;
}

@Component({
  selector: 'app-attention-required',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>Needs Attention</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        @if (loading()) {
          <div class="loading-state">
            <ion-spinner name="dots"></ion-spinner>
          </div>
        } @else if (items().length === 0) {
          <div class="empty-state">
            <ion-icon name="checkmark-circle-outline" size="large" color="success"></ion-icon>
            <p>All clients are on track!</p>
          </div>
        } @else {
          <div class="attention-list">
            @for (item of items(); track item.id) {
              <div class="attention-item" [class]="'priority-' + item.priority" (click)="handleItem(item)">
                <ion-avatar>
                  @if (item.avatar_url) {
                    <img [src]="item.avatar_url" [alt]="item.client_name">
                  } @else {
                    <div class="avatar-placeholder">
                      {{ getInitials(item.client_name) }}
                    </div>
                  }
                </ion-avatar>

                <div class="item-content">
                  <div class="item-header">
                    <span class="client-name">{{ item.client_name }}</span>
                    <ion-badge [color]="getPriorityColor(item.priority)" mode="ios">
                      {{ item.priority }}
                    </ion-badge>
                  </div>
                  <div class="item-message">
                    <ion-icon [name]="getTypeIcon(item.type)"></ion-icon>
                    {{ item.message }}
                  </div>
                </div>
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
        margin-bottom: 16px;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .attention-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .attention-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: var(--ion-color-light);
      border-radius: 8px;
      border-left: 3px solid transparent;
      cursor: pointer;
      transition: all 0.2s;

      &.priority-high {
        border-left-color: var(--ion-color-danger);
      }

      &.priority-medium {
        border-left-color: var(--ion-color-warning);
      }

      &.priority-low {
        border-left-color: var(--ion-color-medium);
      }

      &:active {
        background: var(--ion-color-light-shade);
      }
    }

    ion-avatar {
      width: 40px;
      height: 40px;
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
      font-size: 14px;
    }

    .item-content {
      flex: 1;
      min-width: 0;
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
      gap: 8px;
    }

    .client-name {
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    ion-badge {
      font-size: 10px;
      text-transform: uppercase;
      flex-shrink: 0;
    }

    .item-message {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: var(--ion-color-medium);

      ion-icon {
        font-size: 16px;
        flex-shrink: 0;
      }
    }
  `]
})
export class AttentionRequiredComponent implements OnInit {
  items = signal<AttentionItem[]>([]);
  loading = signal(true);

  constructor(
    private clientService: ClientService,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.loadAttentionItems();
  }

  private async loadAttentionItems() {
    try {
      const items = await this.clientService.getClientsNeedingAttention();
      this.items.set(items);
    } catch (error) {
      console.error('Error loading attention items:', error);
    } finally {
      this.loading.set(false);
    }
  }

  handleItem(item: AttentionItem) {
    // Navigate to client detail or open message
    this.router.navigate(['/clients', item.client_id]);
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      default: return 'medium';
    }
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'no_activity': return 'alert-circle-outline';
      case 'missed_workouts': return 'barbell-outline';
      case 'nutrition_gap': return 'nutrition-outline';
      case 'check_in_due': return 'chatbubble-outline';
      default: return 'information-circle-outline';
    }
  }
}
