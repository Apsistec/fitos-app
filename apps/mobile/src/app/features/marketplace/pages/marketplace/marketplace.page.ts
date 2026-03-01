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
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonIcon,
  IonChip,
  IonCard,
  IonCardContent,
  IonBadge,
  IonRefresher,
  IonRefresherContent,
  IonSkeletonText,
  RefresherCustomEvent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  storefrontOutline,
  documentsOutline,
  videocamOutline,
  barbellOutline,
  sparklesOutline,
  checkmarkCircle,
  lockClosedOutline,
} from 'ionicons/icons';
import {
  DigitalProductService,
  DigitalProductWithTrainer,
  ProductType,
} from '../../../../core/services/digital-product.service';
import { AuthService } from '../../../../core/services/auth.service';

// ─── Product type display metadata ────────────────────────────────────────────
const TYPE_META: Record<ProductType, { icon: string; label: string }> = {
  pdf_program:     { icon: 'documents-outline',  label: 'Program PDF' },
  video_series:    { icon: 'videocam-outline',    label: 'Video Series' },
  template_bundle: { icon: 'barbell-outline',     label: 'Template Pack' },
  custom_plan:     { icon: 'sparkles-outline',    label: 'Custom Plan' },
};

type TypeFilter = 'all' | ProductType;

@Component({
  selector: 'app-marketplace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonIcon,
    IonChip,
    IonCard,
    IonCardContent,
    IonBadge,
    IonRefresher,
    IonRefresherContent,
    IonSkeletonText,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Shop</ion-title>
      </ion-toolbar>

      <!-- Type filter chips -->
      <ion-toolbar class="filter-toolbar">
        <div class="filter-chips">
          <ion-chip
            [class.active]="typeFilter() === 'all'"
            (click)="setFilter('all')"
          >All</ion-chip>
          <ion-chip
            [class.active]="typeFilter() === 'pdf_program'"
            (click)="setFilter('pdf_program')"
          >
            <ion-icon name="documents-outline"></ion-icon>
            Programs
          </ion-chip>
          <ion-chip
            [class.active]="typeFilter() === 'video_series'"
            (click)="setFilter('video_series')"
          >
            <ion-icon name="videocam-outline"></ion-icon>
            Videos
          </ion-chip>
          <ion-chip
            [class.active]="typeFilter() === 'template_bundle'"
            (click)="setFilter('template_bundle')"
          >
            <ion-icon name="barbell-outline"></ion-icon>
            Templates
          </ion-chip>
          <ion-chip
            [class.active]="typeFilter() === 'custom_plan'"
            (click)="setFilter('custom_plan')"
          >
            <ion-icon name="sparkles-outline"></ion-icon>
            Plans
          </ion-chip>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <!-- Skeleton loading -->
      @if (productService.isLoading() && productService.trainerProducts().length === 0) {
        <div class="product-grid">
          @for (i of [1,2,3,4]; track i) {
            <div class="product-skeleton">
              <ion-skeleton-text animated class="thumb-skeleton"></ion-skeleton-text>
              <div class="skeleton-body">
                <ion-skeleton-text animated style="width: 75%; height: 16px;"></ion-skeleton-text>
                <ion-skeleton-text animated style="width: 50%; height: 12px; margin-top: 6px;"></ion-skeleton-text>
                <ion-skeleton-text animated style="width: 35%; height: 14px; margin-top: 8px;"></ion-skeleton-text>
              </div>
            </div>
          }
        </div>
      }

      <!-- Empty state -->
      @if (!productService.isLoading() && filteredProducts().length === 0) {
        <div class="empty-state">
          <ion-icon name="storefront-outline"></ion-icon>
          <h3>No products yet</h3>
          <p>Your trainer hasn't listed any products yet. Check back soon!</p>
        </div>
      }

      <!-- Product grid -->
      @if (filteredProducts().length > 0) {
        <div class="product-grid">
          @for (product of filteredProducts(); track product.id) {
            <ion-card class="product-card" (click)="openProduct(product)">
              <!-- Thumbnail -->
              <div class="product-thumb">
                @if (product.thumbnail_url) {
                  <img [src]="product.thumbnail_url" [alt]="product.title" loading="lazy" />
                } @else {
                  <div class="thumb-placeholder">
                    <ion-icon [name]="typeIcon(product.type)"></ion-icon>
                  </div>
                }

                <!-- Purchased badge -->
                @if (product.is_purchased) {
                  <div class="purchased-overlay">
                    <ion-icon name="checkmark-circle"></ion-icon>
                  </div>
                }

                <!-- Type chip -->
                <div class="type-chip">{{ typeLabel(product.type) }}</div>
              </div>

              <ion-card-content class="product-body">
                <!-- Trainer name -->
                <div class="trainer-name">{{ product.trainer_name }}</div>

                <!-- Title -->
                <h3 class="product-title">{{ product.title }}</h3>

                <!-- Price row -->
                <div class="price-row">
                  @if (product.price_cents === 0) {
                    <span class="price free">Free</span>
                  } @else {
                    <span class="price">
                      {{ product.price_cents / 100 | currency:product.currency:'symbol':'1.0-0' }}
                    </span>
                  }
                  @if (product.purchase_count > 0) {
                    <span class="buyers">{{ product.purchase_count }} enrolled</span>
                  }
                </div>
              </ion-card-content>
            </ion-card>
          }
        </div>
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 20px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    /* ── Filter chips ─────────────────────────────────────────────────── */
    .filter-toolbar { --background: transparent; }

    .filter-chips {
      display: flex;
      gap: 8px;
      padding: 0 16px 12px;
      overflow-x: auto;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }

    ion-chip {
      --background: rgba(255,255,255,0.06);
      --color: var(--fitos-text-secondary, #A3A3A3);
      border: 1px solid rgba(255,255,255,0.08);
      font-size: 13px;
      font-weight: 600;
      flex-shrink: 0;
      transition: background 150ms, color 150ms;

      &.active {
        --background: rgba(16, 185, 129, 0.15);
        --color: var(--fitos-accent-primary, #10B981);
        border-color: rgba(16, 185, 129, 0.3);
      }

      ion-icon { font-size: 14px; margin-inline-end: 4px; }
    }

    /* ── Product grid ─────────────────────────────────────────────────── */
    .product-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      padding: 16px;
    }

    ion-card.product-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      box-shadow: none;
      margin: 0;
      cursor: pointer;
      transition: transform 150ms, border-color 150ms;

      &:active { transform: scale(0.97); }
    }

    /* ── Thumbnail ────────────────────────────────────────────────────── */
    .product-thumb {
      position: relative;
      aspect-ratio: 4/3;
      overflow: hidden;
      border-radius: 14px 14px 0 0;
      background: rgba(255,255,255,0.04);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
    }

    .thumb-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #0A1A12 0%, #0D2A1C 100%);
      ion-icon { font-size: 40px; color: rgba(16,185,129,0.4); }
    }

    .purchased-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      background: rgba(16, 185, 129, 0.9);
      border-radius: 50%;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      ion-icon { font-size: 16px; color: #fff; }
    }

    .type-chip {
      position: absolute;
      bottom: 8px;
      left: 8px;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      border-radius: 6px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      color: rgba(255,255,255,0.8);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* ── Product body ─────────────────────────────────────────────────── */
    ion-card-content.product-body { padding: 10px 12px 14px; }

    .trainer-name {
      font-size: 11px;
      font-weight: 600;
      color: var(--fitos-accent-primary, #10B981);
      margin-bottom: 3px;
    }

    .product-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0 0 8px;
      line-height: 1.3;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .price-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }

    .price {
      font-size: 16px;
      font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
      &.free { color: var(--fitos-accent-primary, #10B981); }
    }

    .buyers {
      font-size: 10px;
      color: var(--fitos-text-tertiary, #6B6B6B);
    }

    /* ── Skeleton ─────────────────────────────────────────────────────── */
    .product-skeleton {
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 14px;
      overflow: hidden;
    }

    .thumb-skeleton {
      display: block;
      aspect-ratio: 4/3;
      margin: 0;
      border-radius: 0;
    }

    .skeleton-body { padding: 10px 12px 14px; }

    /* ── Empty state ──────────────────────────────────────────────────── */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px 32px;
      gap: 12px;
      text-align: center;
      ion-icon { font-size: 64px; color: rgba(255,255,255,0.08); }
      h3 { margin: 0; font-size: 18px; font-weight: 700; color: var(--fitos-text-secondary, #A3A3A3); }
      p { margin: 0; font-size: 14px; color: var(--fitos-text-tertiary, #6B6B6B); line-height: 1.5; }
    }
  `],
})
export class MarketplacePage implements OnInit {
  productService = inject(DigitalProductService);
  private auth = inject(AuthService);
  private router = inject(Router);

  typeFilter = signal<TypeFilter>('all');

  filteredProducts = computed<DigitalProductWithTrainer[]>(() => {
    const filter = this.typeFilter();
    const products = this.productService.trainerProducts();
    return filter === 'all' ? products : products.filter((p) => p.type === filter);
  });

  constructor() {
    addIcons({
      storefrontOutline,
      documentsOutline,
      videocamOutline,
      barbellOutline,
      sparklesOutline,
      checkmarkCircle,
      lockClosedOutline,
    });
  }

  ngOnInit(): void {
    this.productService.getTrainerProducts();
    this.productService.getMyPurchases();
  }

  setFilter(type: TypeFilter): void {
    this.typeFilter.set(type);
  }

  typeIcon(type: ProductType): string {
    return TYPE_META[type]?.icon ?? 'storefront-outline';
  }

  typeLabel(type: ProductType): string {
    return TYPE_META[type]?.label ?? '';
  }

  openProduct(product: DigitalProductWithTrainer): void {
    this.router.navigate(['/tabs/marketplace/product', product.id]);
  }

  async handleRefresh(event: RefresherCustomEvent): Promise<void> {
    await this.productService.getTrainerProducts();
    event.target.complete();
  }
}
