import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonFab,
  IonFabButton,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSkeletonText,
  IonNote,
  AlertController,
  ToastController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  peopleOutline,
  trashOutline,
  personAddOutline,
  personRemoveOutline,
  ellipsisVerticalOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import {
  AccountabilityGroupService,
  AccountabilityGroup,
  GroupMember,
  CreateGroupDto,
} from '../../../../core/services/accountability-group.service';

// ─── Available emojis ─────────────────────────────────────────────────────────
const POD_EMOJIS = ['💪', '🔥', '🏆', '⚡', '🎯', '🌟', '🚀', '🦁', '🐺', '🏅'];

@Component({
  selector: 'app-accountability-group-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonFab,
    IonFabButton,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonSkeletonText,
    IonNote,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/clients"></ion-back-button>
        </ion-buttons>
        <ion-title>Accountability Pods</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="manager-body">

        @if (isLoading()) {
          <div class="skel-list">
            @for (_ of [1,2,3]; track $_) {
              <ion-skeleton-text animated class="skel-item"></ion-skeleton-text>
            }
          </div>
        }

        <!-- ── Group list ───────────────────────────────────────────────── -->
        @if (!isLoading() && groups().length > 0) {
          <ion-list class="groups-list">
            @for (group of groups(); track group.id) {
              <ion-item button detail (click)="openGroup(group)">
                <div class="group-emoji" slot="start">{{ group.emoji }}</div>
                <ion-label>
                  <h3>{{ group.name }}</h3>
                  <p>
                    {{ group.member_count ?? 0 }}/{{ group.max_members }} members
                    @if (group.description) { · {{ group.description }} }
                  </p>
                </ion-label>
                <ion-badge
                  [color]="group.is_active ? 'success' : 'medium'"
                  slot="end"
                >
                  {{ group.is_active ? 'Active' : 'Inactive' }}
                </ion-badge>
              </ion-item>
            }
          </ion-list>
        }

        <!-- ── Empty state ───────────────────────────────────────────────── -->
        @if (!isLoading() && groups().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">👥</div>
            <h3>No pods yet</h3>
            <p>
              Group 3–6 clients into accountability pods so they can cheer
              each other on (workout completions only — no personal data shared).
            </p>
            <ion-button (click)="createGroup()">Create first pod</ion-button>
          </div>
        }

        <!-- ── Selected group detail (members) ─────────────────────────── -->
        @if (selectedGroup()) {
          <div class="group-detail">
            <div class="detail-header">
              <span class="detail-emoji">{{ selectedGroup()!.emoji }}</span>
              <div>
                <div class="detail-name">{{ selectedGroup()!.name }}</div>
                <div class="detail-sub">
                  {{ members().length }}/{{ selectedGroup()!.max_members }} members
                </div>
              </div>
              <ion-button fill="clear" color="danger" size="small" (click)="deleteGroup(selectedGroup()!)">
                <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </div>

            <ion-list class="members-list">
              @for (m of members(); track m.id) {
                <ion-item>
                  <div class="avatar-circle" slot="start">
                    {{ initials(m.full_name) }}
                  </div>
                  <ion-label>
                    <h3>{{ m.full_name ?? 'Client' }}</h3>
                    <p>Joined {{ m.joined_at | slice:0:10 }}</p>
                  </ion-label>
                  <ion-button
                    slot="end"
                    fill="clear"
                    color="danger"
                    size="small"
                    (click)="removeMember(m)"
                  >
                    <ion-icon name="person-remove-outline" slot="icon-only"></ion-icon>
                  </ion-button>
                </ion-item>
              }

              @if (!isFull()) {
                <ion-item button detail="false" (click)="addMember()">
                  <ion-icon name="person-add-outline" slot="start" color="primary"></ion-icon>
                  <ion-label color="primary">Add member</ion-label>
                </ion-item>
              } @else {
                <ion-item lines="none" class="full-note">
                  <ion-note>Pod is full ({{ selectedGroup()!.max_members }} max)</ion-note>
                </ion-item>
              }
            </ion-list>

            <ion-button
              fill="clear"
              size="small"
              class="close-detail"
              (click)="selectedGroup.set(null)"
            >
              Close
            </ion-button>
          </div>
        }

        <div class="bottom-spacer"></div>
      </div>

      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createGroup()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .manager-body { padding: 16px; }

    .skel-list { display: flex; flex-direction: column; gap: 8px; }
    .skel-item { height: 60px; border-radius: 12px; }

    /* ── Group list ──────────── */
    .groups-list {
      background: transparent;
      border-radius: 14px;
      overflow: hidden;
      margin-bottom: 16px;
    }
    ion-item { --background: rgba(255,255,255,0.04); --border-color: rgba(255,255,255,0.06); }
    ion-label h3 { font-size: 15px; font-weight: 700; }
    ion-label p  { font-size: 12px; color: var(--fitos-text-secondary, #A3A3A3); }

    .group-emoji { font-size: 28px; margin-right: 2px; }

    /* ── Empty ───────────────── */
    .empty-state {
      text-align: center;
      padding: 48px 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-icon { font-size: 64px; }
    h3 { font-size: 22px; font-weight: 800; margin: 0; }
    .empty-state p { font-size: 14px; color: var(--fitos-text-secondary, #A3A3A3); max-width: 280px; }

    /* ── Group detail ────────── */
    .group-detail {
      background: rgba(255,255,255,0.04);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 16px;
    }
    .detail-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .detail-emoji { font-size: 36px; }
    .detail-name { font-size: 18px; font-weight: 800; }
    .detail-sub { font-size: 13px; color: var(--fitos-text-secondary, #A3A3A3); }
    .detail-header > ion-button { margin-left: auto; }

    .members-list {
      background: transparent;
      border-radius: 12px;
      overflow: hidden;
      margin: 0 -16px;
    }

    .avatar-circle {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: rgba(16,185,129,0.2);
      color: var(--fitos-accent-primary, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 800;
      margin-right: 4px;
    }

    .full-note { --background: transparent; --border-color: transparent; }
    ion-note { font-size: 12px; color: var(--fitos-text-tertiary, #6B6B6B); }

    .close-detail { margin-top: 12px; }

    .bottom-spacer { height: 80px; }
  `],
})
export class AccountabilityGroupManagerPage implements OnInit {
  private alertCtrl       = inject(AlertController);
  private toastCtrl       = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  groupService            = inject(AccountabilityGroupService);

  isLoading     = signal(true);
  groups        = this.groupService.groups;
  members       = this.groupService.members;
  selectedGroup = signal<AccountabilityGroup | null>(null);

  isFull = computed(() => {
    const g = this.selectedGroup();
    if (!g) return false;
    return this.groupService.isGroupFull(g.id);
  });

  constructor() {
    addIcons({
      addOutline,
      peopleOutline,
      trashOutline,
      personAddOutline,
      personRemoveOutline,
      ellipsisVerticalOutline,
      checkmarkCircleOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.groupService.getMyGroups();
    this.isLoading.set(false);
  }

  // ── Open group detail ─────────────────────────────────────────────────────

  async openGroup(group: AccountabilityGroup): Promise<void> {
    this.selectedGroup.set(group);
    await this.groupService.getGroupMembers(group.id);
  }

  // ── Create group ──────────────────────────────────────────────────────────

  async createGroup(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'New Accountability Pod',
      inputs: [
        { name: 'name',  type: 'text',   placeholder: 'Pod name (e.g. Morning Warriors)' },
        { name: 'emoji', type: 'text',   placeholder: 'Emoji (e.g. 💪)', value: '💪' },
        { name: 'max',   type: 'number', placeholder: 'Max members (2-10)', value: '6' },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data: { name: string; emoji: string; max: string }) => {
            if (!data.name?.trim()) return false;
            const dto: CreateGroupDto = {
              name:        data.name.trim(),
              emoji:       data.emoji?.trim() || '💪',
              max_members: Math.min(10, Math.max(2, parseInt(data.max) || 6)),
            };
            const created = await this.groupService.createGroup(dto);
            if (created) {
              await this.showToast('Pod created!', 'success');
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Add member (client search via alert prompt) ───────────────────────────

  async addMember(): Promise<void> {
    const group = this.selectedGroup();
    if (!group) return;

    const alert = await this.alertCtrl.create({
      header: 'Add Member',
      message: 'Enter the client\'s user ID to add them to this pod.',
      inputs: [{ name: 'clientId', type: 'text', placeholder: 'Client UUID' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Add',
          handler: async (data: { clientId: string }) => {
            if (!data.clientId?.trim()) return false;
            const ok = await this.groupService.addMember(group.id, data.clientId.trim());
            if (ok) {
              await this.groupService.getGroupMembers(group.id);
              await this.showToast('Member added!', 'success');
            } else {
              await this.showToast('Could not add member. Check ID or pod capacity.', 'warning');
            }
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Remove member ─────────────────────────────────────────────────────────

  async removeMember(member: GroupMember): Promise<void> {
    const group = this.selectedGroup();
    if (!group) return;

    const alert = await this.alertCtrl.create({
      header: 'Remove Member',
      message: `Remove ${member.full_name ?? 'this client'} from the pod?`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Remove',
          role: 'destructive',
          handler: async () => {
            await this.groupService.removeMember(group.id, member.client_id);
            await this.showToast('Member removed.', 'medium');
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Delete group ──────────────────────────────────────────────────────────

  async deleteGroup(group: AccountabilityGroup): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Pod',
      message: `Delete "${group.name}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const ok = await this.groupService.deleteGroup(group.id);
            if (ok) {
              this.selectedGroup.set(null);
              await this.showToast('Pod deleted.', 'medium');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  initials(name?: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({ message, color, duration: 2000, position: 'bottom' });
    await toast.present();
  }
}
