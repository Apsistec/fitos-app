import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonChip,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  downloadOutline,
  lockClosedOutline,
  shareOutline,
  barbellOutline,
  documentsOutline,
  videocamOutline,
  sparklesOutline,
  arrowForwardOutline,
} from 'ionicons/icons';
import { Share } from '@capacitor/share';
import {
  DigitalProductService,
  DigitalProduct,
  DigitalProductWithTrainer,
  ProductType,
} from '../../../../core/services/digital-product.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProgramAssignmentService } from '../../../../core/services/program-assignment.service';

const TYPE_META: Record<ProductType, { icon: string; label: string; color: string }> = {
  pdf_program:     { icon: 'documents-outline',  label: 'Program PDF',   color: '#3B82F6' },
  video_series:    { icon: 'videocam-outline',    label: 'Video Series',  color: '#EC4899' },
  template_bundle: { icon: 'barbell-outline',     label: 'Template Pack', color: '#F59E0B' },
  custom_plan:     { icon: 'sparkles-outline',    label: 'Custom Plan',   color: '#8B5CF6' },
};

@Component({
  selector: 'app-product-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CurrencyPipe,
    DatePipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonChip,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/marketplace"></ion-back-button>
        </ion-buttons>
        <ion-title>Product Details</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="shareProduct()">
            <ion-icon slot="icon-only" name="share-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (isLoading()) {
        <div class="loading-center">
          <ion-spinner></ion-spinner>
        </div>
      } @else if (product()) {
        <!-- Hero thumbnail -->
        <div class="hero" [style.background]="heroGradient()">
          @if (product()!.thumbnail_url) {
            <img [src]="product()!.thumbnail_url" [alt]="product()!.title" class="hero-img" />
          } @else {
            <ion-icon [name]="typeIcon(product()!.type)" class="hero-icon"></ion-icon>
          }

          <!-- Type badge -->
          <div class="type-badge" [style.background]="typeColor(product()!.type) + '33'" [style.border-color]="typeColor(product()!.type) + '66'">
            <ion-icon [name]="typeIcon(product()!.type)" [style.color]="typeColor(product()!.type)"></ion-icon>
            {{ typeLabel(product()!.type) }}
          </div>
        </div>

        <div class="detail-body">
          <!-- Trainer name -->
          @if (trainerName()) {
            <div class="trainer-name">by {{ trainerName() }}</div>
          }

          <!-- Title -->
          <h1 class="product-title">{{ product()!.title }}</h1>

          <!-- Stats row -->
          <div class="stats-row">
            @if (product()!.purchase_count > 0) {
              <div class="stat-chip">
                <ion-icon name="checkmark-circle"></ion-icon>
                {{ product()!.purchase_count }} enrolled
              </div>
            }
          </div>

          <!-- Description -->
          @if (product()!.description) {
            <div class="section">
              <h3 class="section-title">About this product</h3>
              <p class="description">{{ product()!.description }}</p>
            </div>
          }

          <!-- Files (after purchase) -->
          @if (isPurchased()) {
            <div class="section">
              <h3 class="section-title">Your downloads</h3>
              @if (product()!.file_urls.length === 0) {
                <p class="empty-files">Your trainer will share files here shortly.</p>
              } @else {
                @for (url of product()!.file_urls; track url; let i = $index) {
                  <a [href]="url" target="_blank" rel="noopener" class="file-row">
                    <ion-icon name="download-outline"></ion-icon>
                    <span>File {{ i + 1 }}</span>
                    <ion-icon name="arrow-forward-outline" class="chevron"></ion-icon>
                  </a>
                }
              }
            </div>
          }

          <!-- Spacer for sticky CTA -->
          <div style="height: 100px"></div>
        </div>
      }
    </ion-content>

    <!-- Sticky purchase CTA -->
    @if (product()) {
      <div class="sticky-cta">
        @if (isPurchased()) {
          <div class="purchased-cta">
            <ion-icon name="checkmark-circle"></ion-icon>
            <span>You own this product</span>
          </div>
        } @else {
          <div class="price-row">
            @if (product()!.price_cents === 0) {
              <span class="cta-price free">Free</span>
            } @else {
              <span class="cta-price">
                {{ product()!.price_cents / 100 | currency:(product()!.currency):'symbol':'1.0-0' }}
              </span>
            }
          </div>
          <ion-button
            expand="block"
            class="buy-btn"
            [disabled]="productService.isLoading()"
            (click)="purchase()"
          >
            @if (productService.isLoading()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else if (product()!.price_cents === 0) {
              Get for free
            } @else {
              Buy now
            }
          </ion-button>
        }

        <!-- Trainer view: assign to client -->
        @if (isTrainer()) {
          <ion-button fill="outline" expand="block" class="assign-btn" (click)="assignToClient()">
            Assign to client
          </ion-button>
        }
      </div>
    }
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 17px; font-weight: 700; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    .loading-center {
      display: flex; align-items: center; justify-content: center;
      height: 60vh;
    }

    /* ── Hero ───────────────────────────────────────────────────────────── */
    .hero {
      width: 100%;
      aspect-ratio: 16/9;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
    }

    .hero-img {
      width: 100%; height: 100%; object-fit: cover; display: block;
    }

    .hero-icon {
      font-size: 80px;
      color: rgba(16, 185, 129, 0.35);
    }

    .type-badge {
      position: absolute;
      bottom: 12px;
      left: 16px;
      display: flex;
      align-items: center;
      gap: 5px;
      border: 1px solid;
      border-radius: 20px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 700;
      color: #fff;
      backdrop-filter: blur(6px);
      ion-icon { font-size: 14px; }
    }

    /* ── Detail body ─────────────────────────────────────────────────── */
    .detail-body { padding: 20px 20px 0; }

    .trainer-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-accent-primary, #10B981);
      margin-bottom: 6px;
    }

    .product-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0 0 12px;
      line-height: 1.2;
    }

    .stats-row {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .stat-chip {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 12px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 20px;
      padding: 4px 12px;
      ion-icon { font-size: 13px; color: var(--fitos-accent-primary, #10B981); }
    }

    /* ── Sections ─────────────────────────────────────────────────────── */
    .section { margin-bottom: 24px; }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0 0 10px;
    }

    .description {
      font-size: 15px;
      color: var(--fitos-text-primary, #F5F5F5);
      line-height: 1.6;
      margin: 0;
    }

    /* ── Files ────────────────────────────────────────────────────────── */
    .file-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      margin-bottom: 8px;
      text-decoration: none;
      color: var(--fitos-text-primary, #F5F5F5);
      font-size: 14px;
      font-weight: 600;
      ion-icon { font-size: 18px; color: var(--fitos-accent-primary, #10B981); }
      .chevron { margin-left: auto; color: var(--fitos-text-tertiary, #6B6B6B); font-size: 14px; }
    }

    .empty-files {
      font-size: 14px;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin: 0;
    }

    /* ── Sticky CTA ──────────────────────────────────────────────────── */
    .sticky-cta {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px 20px calc(16px + env(safe-area-inset-bottom));
      background: linear-gradient(transparent, var(--fitos-bg-primary, #0D0D0D) 30%);
    }

    .price-row {
      margin-bottom: 10px;
    }

    .cta-price {
      font-size: 28px;
      font-weight: 900;
      color: var(--fitos-text-primary, #F5F5F5);
      &.free { color: var(--fitos-accent-primary, #10B981); }
    }

    .buy-btn {
      --background: var(--fitos-accent-primary, #10B981);
      --border-radius: 14px;
      --color: #fff;
      font-weight: 700;
      font-size: 16px;
      height: 52px;
    }

    .assign-btn {
      --border-radius: 14px;
      --color: var(--fitos-accent-primary, #10B981);
      --border-color: rgba(16,185,129,0.4);
      margin-top: 8px;
      height: 48px;
      font-weight: 700;
    }

    .purchased-cta {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 16px;
      border-radius: 14px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      font-size: 16px;
      font-weight: 700;
      color: var(--fitos-accent-primary, #10B981);
      ion-icon { font-size: 22px; }
    }
  `],
})
export class ProductDetailPage implements OnInit {
  productService = inject(DigitalProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private programAssignment = inject(ProgramAssignmentService);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);

  product = signal<DigitalProduct | DigitalProductWithTrainer | null>(null);
  isLoading = signal(true);
  trainerName = signal<string | null>(null);

  isTrainer = computed(() => {
    const role = this.auth.profile()?.role;
    return role === 'trainer' || role === 'gym_owner';
  });

  isPurchased = computed(() => {
    const p = this.product();
    if (!p) return false;
    // From trainerProducts list (has is_purchased flag)
    if ('is_purchased' in p) return (p as DigitalProductWithTrainer).is_purchased;
    // Fall back to purchases signal
    return this.productService.isPurchased(p.id);
  });

  constructor() {
    addIcons({
      checkmarkCircle,
      downloadOutline,
      lockClosedOutline,
      shareOutline,
      barbellOutline,
      documentsOutline,
      videocamOutline,
      sparklesOutline,
      arrowForwardOutline,
    });
  }

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) { this.router.navigate(['/tabs/marketplace']); return; }

    this._loadProduct(productId);
  }

  private async _loadProduct(productId: string): Promise<void> {
    // First check in already-loaded list
    const fromList = this.productService.trainerProducts().find((p) => p.id === productId);
    if (fromList) {
      this.product.set(fromList);
      this.trainerName.set(fromList.trainer_name);
      this.isLoading.set(false);
      return;
    }

    // Also check trainer's own products
    const ownProduct = this.productService.myProducts().find((p) => p.id === productId);
    if (ownProduct) {
      this.product.set(ownProduct);
      this.isLoading.set(false);
      return;
    }

    // Fetch from DB
    const { data, error } = await this.productService['supabase'].client
      .from('digital_products')
      .select('*')
      .eq('id', productId)
      .single();

    this.isLoading.set(false);
    if (!error && data) this.product.set(data as DigitalProduct);
  }

  typeIcon(type: ProductType): string {
    return TYPE_META[type]?.icon ?? 'storefront-outline';
  }

  typeLabel(type: ProductType): string {
    return TYPE_META[type]?.label ?? '';
  }

  typeColor(type: ProductType): string {
    return TYPE_META[type]?.color ?? '#10B981';
  }

  heroGradient(): string {
    return 'linear-gradient(135deg, #0A1A12 0%, #0D2A1C 100%)';
  }

  async purchase(): Promise<void> {
    const p = this.product();
    if (!p) return;

    const ok = await this.productService.purchaseProduct(p);
    if (ok) {
      const toast = await this.toastCtrl.create({
        message: p.price_cents === 0 ? 'Added to your library!' : 'Purchase complete! Enjoy your product.',
        duration: 2500,
        color: 'success',
        position: 'bottom',
      });
      await toast.present();
    } else {
      const toast = await this.toastCtrl.create({
        message: this.productService.error() ?? 'Purchase failed. Please try again.',
        duration: 2500,
        color: 'warning',
        position: 'bottom',
      });
      await toast.present();
    }
  }

  async assignToClient(): Promise<void> {
    const p = this.product();
    if (!p || p.type !== 'template_bundle') {
      const toast = await this.toastCtrl.create({
        message: 'Only template bundles can be assigned to clients.',
        duration: 2000,
        color: 'medium',
        position: 'bottom',
      });
      await toast.present();
      return;
    }

    const alert = await this.alertCtrl.create({
      header: 'Assign to Client',
      message: 'Enter the client ID or navigate to the client\'s profile to assign this workout template.',
      buttons: [
        {
          text: 'Go to Clients',
          handler: () => this.router.navigate(['/tabs/clients']),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await alert.present();
  }

  async shareProduct(): Promise<void> {
    const p = this.product();
    if (!p) return;
    try {
      await Share.share({
        title: p.title,
        text: `Check out "${p.title}" — a fitness product from my trainer on FitOS! 💪`,
        dialogTitle: 'Share product',
      });
    } catch { /* cancelled */ }
  }
}
