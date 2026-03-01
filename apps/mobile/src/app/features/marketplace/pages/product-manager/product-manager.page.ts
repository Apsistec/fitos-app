import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonItem,
  IonList,
  IonNote,
  IonBadge,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  AlertController,
  ToastController,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  createOutline,
  trashOutline,
  eyeOutline,
  eyeOffOutline,
  barbellOutline,
  documentsOutline,
  videocamOutline,
  sparklesOutline,
  storefrontOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import {
  DigitalProductService,
  DigitalProduct,
  ProductType,
} from '../../../../core/services/digital-product.service';

const TYPE_ICON: Record<ProductType, string> = {
  pdf_program:     'documents-outline',
  video_series:    'videocam-outline',
  template_bundle: 'barbell-outline',
  custom_plan:     'sparkles-outline',
};

type TabView = 'published' | 'drafts';

@Component({
  selector: 'app-product-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonFab,
    IonFabButton,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonItem,
    IonList,
    IonNote,
    IonBadge,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>My Products</ion-title>
      </ion-toolbar>

      <ion-toolbar>
        <ion-segment [(ngModel)]="activeTab" (ionChange)="onTabChange()">
          <ion-segment-button value="published">
            <ion-label>Published ({{ publishedProducts().length }})</ion-label>
          </ion-segment-button>
          <ion-segment-button value="drafts">
            <ion-label>Drafts ({{ draftProducts().length }})</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Loading skeletons -->
      @if (productService.isLoading() && productService.myProducts().length === 0) {
        <ion-list>
          @for (i of [1,2,3]; track i) {
            <ion-item>
              <ion-skeleton-text animated style="width: 40px; height: 40px; border-radius: 8px;" slot="start"></ion-skeleton-text>
              <ion-label>
                <ion-skeleton-text animated style="width: 65%; height: 16px;"></ion-skeleton-text>
                <ion-skeleton-text animated style="width: 40%; height: 12px; margin-top: 4px;"></ion-skeleton-text>
              </ion-label>
            </ion-item>
          }
        </ion-list>
      }

      <!-- Empty state -->
      @if (!productService.isLoading() && visibleProducts().length === 0) {
        <div class="empty-state">
          <ion-icon name="storefront-outline"></ion-icon>
          @if (activeTab === 'published') {
            <h3>No published products</h3>
            <p>Publish a draft or create a new product to start selling.</p>
          } @else {
            <h3>No drafts</h3>
            <p>Tap the + button to create your first product.</p>
          }
        </div>
      }

      <!-- Product list -->
      @if (visibleProducts().length > 0) {
        <ion-list>
          @for (product of visibleProducts(); track product.id) {
            <ion-item class="product-item" (click)="editProduct(product)">
              <!-- Type icon -->
              <div class="type-icon-wrap" slot="start" [class]="'type-' + product.type">
                <ion-icon [name]="typeIcon(product.type)"></ion-icon>
              </div>

              <ion-label>
                <h3>{{ product.title }}</h3>
                <p class="sub-line">
                  {{ product.price_cents === 0 ? 'Free' : (product.price_cents / 100 | currency:'usd':'symbol':'1.0-0') }}
                  &nbsp;·&nbsp; {{ product.purchase_count }} sold
                </p>
              </ion-label>

              <!-- Status badge -->
              @if (product.is_published) {
                <ion-badge color="success" slot="end">Live</ion-badge>
              } @else {
                <ion-badge color="medium" slot="end">Draft</ion-badge>
              }

              <!-- Quick action: toggle publish -->
              <ion-icon
                slot="end"
                [name]="product.is_published ? 'eye-off-outline' : 'eye-outline'"
                class="action-icon"
                (click)="togglePublish(product, $event)"
              ></ion-icon>
            </ion-item>
          }
        </ion-list>
      }

      <!-- FAB -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button (click)="createProduct()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 20px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    ion-list { background: transparent; padding: 8px 0; }

    .product-item {
      --background: transparent;
      --border-color: rgba(255,255,255,0.06);
      cursor: pointer;
    }

    /* ── Type icon ───────────────────────────────────────────────────── */
    .type-icon-wrap {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      ion-icon { font-size: 22px; }
    }

    .type-pdf_program     { background: rgba(59,130,246,0.12);  ion-icon { color: #3B82F6; } }
    .type-video_series    { background: rgba(236,72,153,0.12);  ion-icon { color: #EC4899; } }
    .type-template_bundle { background: rgba(245,158,11,0.12);  ion-icon { color: #F59E0B; } }
    .type-custom_plan     { background: rgba(139,92,246,0.12);  ion-icon { color: #8B5CF6; } }

    ion-label h3 { font-size: 15px; font-weight: 700; color: var(--fitos-text-primary, #F5F5F5); }

    .sub-line {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #6B6B6B) !important;
      margin-top: 2px;
    }

    .action-icon {
      font-size: 20px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      padding: 8px;
      margin-left: 4px;
    }

    /* ── Empty state ─────────────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 32px;
      gap: 12px;
      text-align: center;
      ion-icon { font-size: 64px; color: rgba(255,255,255,0.08); }
      h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--fitos-text-secondary, #A3A3A3); }
      p  { margin: 0; font-size: 14px; color: var(--fitos-text-tertiary, #6B6B6B); line-height: 1.5; }
    }

    ion-fab-button {
      --background: var(--fitos-accent-primary, #10B981);
      --color: #fff;
    }
  `],
})
export class ProductManagerPage implements OnInit {
  productService = inject(DigitalProductService);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  activeTab: TabView = 'published';

  publishedProducts = computed(() =>
    this.productService.myProducts().filter((p) => p.is_published)
  );

  draftProducts = computed(() =>
    this.productService.myProducts().filter((p) => !p.is_published)
  );

  visibleProducts = computed<DigitalProduct[]>(() =>
    this.activeTab === 'published' ? this.publishedProducts() : this.draftProducts()
  );

  constructor() {
    addIcons({
      addOutline,
      createOutline,
      trashOutline,
      eyeOutline,
      eyeOffOutline,
      barbellOutline,
      documentsOutline,
      videocamOutline,
      sparklesOutline,
      storefrontOutline,
      checkmarkCircleOutline,
    });
  }

  ngOnInit(): void {
    this.productService.getMyProducts();
  }

  onTabChange(): void { /* Angular signals re-evaluate visibleProducts */ }

  typeIcon(type: ProductType): string {
    return TYPE_ICON[type] ?? 'storefront-outline';
  }

  createProduct(): void {
    this.router.navigate(['/tabs/marketplace/manage/new']);
  }

  editProduct(product: DigitalProduct): void {
    this.router.navigate(['/tabs/marketplace/manage', product.id, 'edit']);
  }

  async togglePublish(product: DigitalProduct, event: Event): Promise<void> {
    event.stopPropagation();
    const nextState = !product.is_published;

    if (nextState && product.file_urls.length === 0) {
      const toast = await this.toastCtrl.create({
        message: 'Add at least one file before publishing.',
        duration: 2500,
        color: 'warning',
        position: 'bottom',
      });
      await toast.present();
      return;
    }

    const ok = await this.productService.setPublished(product.id, nextState);
    if (ok) {
      const toast = await this.toastCtrl.create({
        message: nextState ? 'Product is now live!' : 'Product moved to drafts.',
        duration: 2000,
        color: nextState ? 'success' : 'medium',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.productService.getMyProducts();
    event.target.complete();
  }
}
