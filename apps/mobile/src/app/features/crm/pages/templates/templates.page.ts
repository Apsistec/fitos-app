import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonButton,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonFab,
  IonFabButton,
  IonSpinner,
  IonGrid,
  IonRow,
  IonCol,
  ModalController,
  ToastController,
  ActionSheetController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  search,
  createOutline,
  trashOutline,
  copyOutline,
  mailOutline,
  arrowBackOutline,
} from 'ionicons/icons';

import { EmailTemplateService } from '../../../../core/services/email-template.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { EmailTemplate } from '@fitos/shared';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonChip,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonFab,
    IonFabButton,
    IonSpinner,
    IonGrid,
    IonRow,
    IonCol
],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button routerLink="/crm/pipeline">
            <ion-icon slot="icon-only" name="arrow-back-outline" />
          </ion-button>
        </ion-buttons>
        <ion-title>Email Templates</ion-title>
      </ion-toolbar>

      <!-- Search and Filter -->
      <ion-toolbar>
        <ion-searchbar
          [(ngModel)]="searchQuery"
          (ionInput)="onSearchChange($event)"
          placeholder="Search templates..."
          [debounce]="300"
        />
      </ion-toolbar>

      <!-- Category Filters -->
      @if (categories().length > 0) {
        <ion-toolbar>
          <div class="category-chips">
            <ion-chip
              [class.active]="selectedCategory() === null"
              (click)="filterByCategory(null)"
            >
              <ion-label>All</ion-label>
            </ion-chip>
            @for (category of categories(); track category) {
              <ion-chip
                [class.active]="selectedCategory() === category"
                (click)="filterByCategory(category)"
              >
                <ion-label>{{ formatCategory(category) }}</ion-label>
              </ion-chip>
            }
          </div>
        </ion-toolbar>
      }
    </ion-header>

    <ion-content class="ion-padding">
      @if (loading()) {
        <div class="loading-container">
          <ion-spinner name="circular" />
          <p>Loading templates...</p>
        </div>
      } @else if (filteredTemplates().length === 0) {
        <!-- Empty State -->
        <div class="empty-state">
          <ion-icon name="mail-outline" />
          @if (searchQuery() || selectedCategory()) {
            <h2>No templates found</h2>
            <p>Try adjusting your search or filters</p>
            <ion-button fill="clear" (click)="clearFilters()">
              Clear filters
            </ion-button>
          } @else {
            <h2>No email templates yet</h2>
            <p>Create your first template to streamline your outreach</p>
            <ion-button (click)="createTemplate()">
              <ion-icon slot="start" name="add" />
              Create Template
            </ion-button>
          }
        </div>
      } @else {
        <!-- Template Grid -->
        <ion-grid class="templates-grid">
          <ion-row>
            @for (template of filteredTemplates(); track template.id) {
              <ion-col size="12" sizeMd="6" sizeLg="4">
                <ion-card class="template-card" (click)="editTemplate(template)">
                  <ion-card-header>
                    <div class="card-header-top">
                      <ion-card-subtitle>
                        {{ formatCategory(template.category) }}
                      </ion-card-subtitle>
                      <ion-button
                        fill="clear"
                        size="small"
                        (click)="showTemplateActions(template, $event)"
                      >
                        <ion-icon slot="icon-only" name="ellipsis-horizontal" />
                      </ion-button>
                    </div>
                    <ion-card-title>{{ template.name }}</ion-card-title>
                  </ion-card-header>

                  <ion-card-content>
                    <div class="template-preview">
                      <div class="subject-preview">
                        <strong>Subject:</strong>
                        <span>{{ template.subject }}</span>
                      </div>
                      <div class="body-preview">
                        {{ getBodyPreview(template.body!) }}
                      </div>
                    </div>

                    <div class="template-meta">
                      @if (template.usage_count !== undefined && template.usage_count > 0) {
                        <div class="meta-item">
                          <ion-icon name="paper-plane-outline" />
                          <span>{{ template.usage_count }} sent</span>
                        </div>
                      }
                      <div class="meta-item">
                        <ion-icon name="code-outline" />
                        <span>{{ getVariableCount(template) }} variables</span>
                      </div>
                    </div>
                  </ion-card-content>
                </ion-card>
              </ion-col>
            }
          </ion-row>
        </ion-grid>
      }

      <!-- FAB -->
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="createTemplate()">
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

      .category-chips {
        display: flex;
        gap: 8px;
        padding: 8px 16px;
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;

        &::-webkit-scrollbar {
          display: none;
        }

        ion-chip {
          --background: var(--fitos-bg-secondary, #1A1A1A);
          --color: var(--fitos-text-secondary, #A3A3A3);
          cursor: pointer;
          transition: all 200ms ease;

          &.active {
            --background: var(--ion-color-primary, #10B981);
            --color: white;
            font-weight: 600;
          }

          &:hover:not(.active) {
            --background: var(--fitos-bg-tertiary, #262626);
          }
        }
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
          margin-top: 16px;
          --border-radius: 8px;
          height: 48px;
          font-weight: 700;
          --box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
        }
      }

      .templates-grid {
        padding: 0;
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

      .template-card {
        cursor: pointer;
        transition: all 200ms ease;
        height: 100%;
        display: flex;
        flex-direction: column;

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        ion-card-header {
          padding-bottom: 12px;
        }

        .card-header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;

          ion-card-subtitle {
            text-transform: uppercase;
            font-size: 11px;
            font-weight: 600;
            letter-spacing: 0.5px;
            color: var(--ion-color-primary, #10B981);
            margin: 0;
          }

          ion-button {
            --padding-start: 8px;
            --padding-end: 8px;
            margin: 0;
          }
        }

        ion-card-title {
          font-size: 16px;
          font-weight: 700;
          color: var(--fitos-text-primary, #F5F5F5);
        }

        ion-card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
      }

      .template-preview {
        margin-bottom: 16px;

        .subject-preview {
          margin-bottom: 12px;
          font-size: 13px;

          strong {
            display: block;
            color: var(--fitos-text-secondary, #A3A3A3);
            margin-bottom: 4px;
          }

          span {
            color: var(--fitos-text-primary, #F5F5F5);
            font-weight: 500;
          }
        }

        .body-preview {
          font-size: 13px;
          color: var(--fitos-text-secondary, #A3A3A3);
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      }

      .template-meta {
        display: flex;
        gap: 16px;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.06);

        .meta-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 500;
          color: var(--fitos-text-tertiary, #737373);

          ion-icon {
            font-size: 14px;
          }
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
export class TemplatesPage implements OnInit {
  private emailTemplateService = inject(EmailTemplateService);
  private auth = inject(AuthService);
  private modalCtrl = inject(ModalController);
  private toastCtrl = inject(ToastController);
  private actionSheetCtrl = inject(ActionSheetController);
  private haptic = inject(HapticService);

  loading = signal(false);
  searchQuery = signal('');
  selectedCategory = signal<string | null>(null);

  templates = this.emailTemplateService.templates;

  categories = computed(() => {
    const uniqueCategories = new Set<string>();
    this.templates().forEach((template) => {
      if (template.category) {
        uniqueCategories.add(template.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  });

  filteredTemplates = computed(() => {
    let filtered = this.templates();

    // Filter by category
    const category = this.selectedCategory();
    if (category) {
      filtered = filtered.filter((t) => t.category === category);
    }

    // Filter by search query
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.subject.toLowerCase().includes(query) ||
          t.body?.toLowerCase().includes(query) ||
          (t.category && t.category.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  constructor() {
    addIcons({
      add,
      search,
      createOutline,
      trashOutline,
      copyOutline,
      mailOutline,
      arrowBackOutline,
      'ellipsis-horizontal': 'ellipsis-horizontal',
      'paper-plane-outline': 'paper-plane-outline',
      'code-outline': 'code-outline',
    });
  }

  async ngOnInit() {
    await this.loadTemplates();
  }

  async loadTemplates() {
    this.loading.set(true);

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      await this.emailTemplateService.getTemplates(trainerId);
    } catch (error) {
      console.error('Error loading templates:', error);
      await this.showToast('Failed to load templates', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  onSearchChange(event: any) {
    this.searchQuery.set(event.target.value || '');
  }

  async filterByCategory(category: string | null) {
    await this.haptic.light();
    this.selectedCategory.set(category);
  }

  clearFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set(null);
  }

  formatCategory(category: string | null | undefined): string {
    if (!category) return 'Uncategorized';

    return category
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  getBodyPreview(body: string): string {
    // Remove variables for cleaner preview
    const cleanBody = body.replace(/\{[^}]+\}/g, '...');
    // Take first 120 characters
    return cleanBody.length > 120
      ? cleanBody.substring(0, 120) + '...'
      : cleanBody;
  }

  getVariableCount(template: EmailTemplate): number {
    const combined = template.subject + ' ' + template.body;
    const variables = this.emailTemplateService.extractVariables(combined);
    return variables.length;
  }

  async createTemplate() {
    await this.haptic.medium();

    const { EmailTemplateEditorComponent } = await import(
      '../../components/email-template-editor.component'
    );

    const modal = await this.modalCtrl.create({
      component: EmailTemplateEditorComponent,
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created || data?.updated) {
      await this.loadTemplates();
    }
  }

  async editTemplate(template: EmailTemplate) {
    await this.haptic.light();

    const { EmailTemplateEditorComponent } = await import(
      '../../components/email-template-editor.component'
    );

    const modal = await this.modalCtrl.create({
      component: EmailTemplateEditorComponent,
      componentProps: {
        templateId: template.id,
      },
    });

    await modal.present();

    const { data } = await modal.onWillDismiss();
    if (data?.created || data?.updated) {
      await this.loadTemplates();
    }
  }

  async showTemplateActions(template: EmailTemplate, event: Event) {
    event.stopPropagation();
    await this.haptic.light();

    const actionSheet = await this.actionSheetCtrl.create({
      header: template.name,
      buttons: [
        {
          text: 'Edit',
          icon: 'create-outline',
          handler: () => {
            this.editTemplate(template);
          },
        },
        {
          text: 'Duplicate',
          icon: 'copy-outline',
          handler: () => {
            this.duplicateTemplate(template);
          },
        },
        {
          text: 'Delete',
          icon: 'trash-outline',
          role: 'destructive',
          handler: () => {
            this.deleteTemplate(template);
          },
        },
        {
          text: 'Cancel',
          role: 'cancel',
        },
      ],
    });

    await actionSheet.present();
  }

  async duplicateTemplate(template: EmailTemplate) {
    await this.haptic.medium();

    try {
      const trainerId = this.auth.user()?.id;
      if (!trainerId) {
        throw new Error('User not authenticated');
      }

      const newTemplate = await this.emailTemplateService.createTemplate(
        trainerId,
        {
          name: `${template.name} (Copy)`,
          category: (template.category as any) || 'general',
          subject: template.subject,
          body: template.body || '',
        }
      );

      if (newTemplate) {
        await this.showToast('Template duplicated', 'success');
        await this.loadTemplates();
      }
    } catch (error) {
      console.error('Error duplicating template:', error);
      await this.showToast('Failed to duplicate template', 'danger');
    }
  }

  async deleteTemplate(template: EmailTemplate) {
    await this.haptic.heavy();

    try {
      const success = await this.emailTemplateService.deleteTemplate(
        template.id
      );

      if (success) {
        await this.showToast('Template deleted', 'success');
        await this.loadTemplates();
      } else {
        throw new Error('Delete failed');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      await this.showToast('Failed to delete template', 'danger');
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
