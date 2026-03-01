import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonNote,
  IonSpinner,
  IonChip,
  AlertController,
  ToastController,
  LoadingController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  trashOutline,
  checkmarkOutline,
  documentOutline,
  linkOutline,
  imagesOutline,
  playCircleOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import {
  DigitalProductService,
  DigitalProduct,
  ProductType,
  CreateProductDto,
} from '../../../../core/services/digital-product.service';
import { AuthService } from '../../../../core/services/auth.service';

// ─── Form state type ──────────────────────────────────────────────────────────
interface ProductForm {
  title: string;
  description: string;
  type: ProductType;
  price_cents: number;
  isFree: boolean;
  priceDisplay: string;      // formatted dollar string e.g. "29"
  preview_url: string;
  thumbnail_url: string;
  file_urls: string[];
}

const TYPE_OPTIONS: { value: ProductType; label: string; hint: string }[] = [
  {
    value: 'pdf_program',
    label: 'PDF Program',
    hint: 'Training plans, guides, or workbooks in PDF format',
  },
  {
    value: 'video_series',
    label: 'Video Series',
    hint: 'Instructional videos or course content',
  },
  {
    value: 'template_bundle',
    label: 'Template Bundle',
    hint: 'Workout templates that can be assigned to clients directly',
  },
  {
    value: 'custom_plan',
    label: 'Custom Plan',
    hint: 'Personalized programming packages',
  },
];

@Component({
  selector: 'app-product-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DecimalPipe,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonToggle,
    IonNote,
    IonSpinner,
    IonChip,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/marketplace/manage"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ isEditMode() ? 'Edit Product' : 'New Product' }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="save(false)" [disabled]="isSaving() || !isValid()">
            @if (isSaving()) {
              <ion-spinner name="crescent" slot="icon-only"></ion-spinner>
            } @else {
              Save
            }
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="form-body">

        <!-- ── Basic Info ───────────────────────────────────────────────── -->
        <div class="section-header">Basic Info</div>
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Product Title <span class="req">*</span></ion-label>
            <ion-input
              [(ngModel)]="form().title"
              (ngModelChange)="patchForm({ title: $event })"
              placeholder="e.g. 12-Week Fat Loss Program"
              maxlength="120"
              clearInput
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Type <span class="req">*</span></ion-label>
            <ion-select
              [value]="form().type"
              (ionChange)="patchForm({ type: $event.detail.value })"
              placeholder="Select type"
              interface="action-sheet"
            >
              @for (opt of typeOptions; track opt.value) {
                <ion-select-option [value]="opt.value">{{ opt.label }}</ion-select-option>
              }
            </ion-select>
          </ion-item>

          @if (selectedTypeHint()) {
            <ion-item lines="none" class="hint-item">
              <ion-icon name="information-circle-outline" slot="start" color="medium"></ion-icon>
              <ion-note>{{ selectedTypeHint() }}</ion-note>
            </ion-item>
          }

          <ion-item>
            <ion-label position="stacked">Description</ion-label>
            <ion-textarea
              [value]="form().description"
              (ionInput)="patchForm({ description: $event.detail.value ?? '' })"
              placeholder="What's included? Who is this for?"
              rows="4"
              maxlength="2000"
              autoGrow
            ></ion-textarea>
          </ion-item>
        </ion-list>

        <!-- ── Pricing ──────────────────────────────────────────────────── -->
        <div class="section-header">Pricing</div>
        <ion-list>
          <ion-item>
            <ion-label>Free Product</ion-label>
            <ion-toggle
              [checked]="form().isFree"
              (ionChange)="onFreeToggle($event.detail.checked)"
              slot="end"
            ></ion-toggle>
          </ion-item>

          @if (!form().isFree) {
            <ion-item>
              <ion-label position="stacked">Price (USD) <span class="req">*</span></ion-label>
              <div class="price-row">
                <span class="currency-symbol">$</span>
                <ion-input
                  type="number"
                  [value]="form().priceDisplay"
                  (ionInput)="onPriceInput($event.detail.value)"
                  placeholder="0"
                  min="1"
                  max="9999"
                  inputmode="decimal"
                ></ion-input>
              </div>
            </ion-item>
            <ion-item lines="none" class="hint-item">
              <ion-note>Minimum $1.00. Stripe processing fees apply.</ion-note>
            </ion-item>
          }
        </ion-list>

        <!-- ── Media ────────────────────────────────────────────────────── -->
        <div class="section-header">Media</div>
        <ion-list>
          <ion-item>
            <ion-label position="stacked">Thumbnail URL</ion-label>
            <ion-input
              [value]="form().thumbnail_url"
              (ionInput)="patchForm({ thumbnail_url: $event.detail.value ?? '' })"
              placeholder="https://…"
              type="url"
              clearInput
            ></ion-input>
          </ion-item>

          <ion-item>
            <ion-label position="stacked">Preview URL <ion-note>(public teaser)</ion-note></ion-label>
            <ion-input
              [value]="form().preview_url"
              (ionInput)="patchForm({ preview_url: $event.detail.value ?? '' })"
              placeholder="Short video or sample PDF link"
              type="url"
              clearInput
            ></ion-input>
          </ion-item>
        </ion-list>

        <!-- ── Deliverables ─────────────────────────────────────────────── -->
        <div class="section-header">
          Deliverables
          <span class="section-sub">(links clients download after purchase)</span>
        </div>
        <ion-list>
          @for (url of form().file_urls; track $index) {
            <ion-item>
              <ion-icon name="document-outline" slot="start" class="file-icon"></ion-icon>
              <ion-input
                [value]="url"
                (ionInput)="updateFileUrl($index, $event.detail.value ?? '')"
                placeholder="https://…"
                type="url"
              ></ion-input>
              <ion-button
                slot="end"
                fill="clear"
                color="danger"
                size="small"
                (click)="removeFileUrl($index)"
              >
                <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
              </ion-button>
            </ion-item>
          }
          <ion-item button detail="false" (click)="addFileUrl()">
            <ion-icon name="link-outline" slot="start" color="primary"></ion-icon>
            <ion-label color="primary">Add file URL</ion-label>
          </ion-item>
        </ion-list>

        <!-- ── Publish CTA ──────────────────────────────────────────────── -->
        <div class="publish-section">
          <button
            class="publish-btn"
            [disabled]="isSaving() || !isValid()"
            (click)="save(true)"
          >
            @if (isSaving()) {
              <ion-spinner name="crescent"></ion-spinner>
            } @else {
              <ion-icon name="checkmark-outline"></ion-icon>
              {{ isEditMode() && existingProduct()?.is_published ? 'Save & Keep Live' : 'Save & Publish' }}
            }
          </button>

          @if (isEditMode() && existingProduct()) {
            <button
              class="danger-btn"
              [disabled]="isSaving()"
              (click)="confirmDelete()"
            >
              <ion-icon name="trash-outline"></ion-icon>
              Delete Product
            </button>
          }
        </div>

        <div class="bottom-spacer"></div>
      </div>
    </ion-content>
  `,
  styles: [`
    ion-toolbar { --background: transparent; --border-width: 0; }
    ion-title { font-size: 18px; font-weight: 800; }
    ion-content { --background: var(--fitos-bg-primary, #0D0D0D); }

    ion-list {
      background: transparent;
      margin: 0 16px 8px;
      border-radius: 14px;
      overflow: hidden;
    }

    ion-item {
      --background: rgba(255,255,255,0.04);
      --border-color: rgba(255,255,255,0.06);
      --color: var(--fitos-text-primary, #F5F5F5);
    }

    ion-label[position="stacked"] {
      font-size: 12px;
      font-weight: 700;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .req { color: var(--fitos-accent-primary, #10B981); }

    /* ── Section headers ─── */
    .section-header {
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: var(--fitos-text-tertiary, #6B6B6B);
      padding: 20px 20px 8px;
    }

    .section-sub {
      font-size: 11px;
      font-weight: 500;
      text-transform: none;
      letter-spacing: 0;
      color: var(--fitos-text-tertiary, #6B6B6B);
      margin-left: 6px;
    }

    /* ── Hint item ───────── */
    .hint-item {
      --background: transparent;
      --border-color: transparent;
    }

    ion-note {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #6B6B6B);
    }

    /* ── Price row ───────── */
    .price-row {
      display: flex;
      align-items: center;
      gap: 4px;
      width: 100%;
    }

    .currency-symbol {
      font-size: 20px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      flex-shrink: 0;
    }

    /* ── File row ────────── */
    .file-icon { font-size: 18px; color: var(--fitos-text-tertiary, #6B6B6B); }

    /* ── Publish section ─── */
    .publish-section {
      margin: 24px 16px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .publish-btn, .danger-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      border-radius: 14px;
      padding: 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      ion-icon { font-size: 20px; }
      ion-spinner { --color: #fff; }
    }

    .publish-btn {
      background: var(--fitos-accent-primary, #10B981);
      color: #fff;
      &:disabled { opacity: 0.5; }
    }

    .danger-btn {
      background: rgba(239,68,68,0.1);
      border: 1px solid rgba(239,68,68,0.25);
      color: #EF4444;
      font-size: 14px;
      padding: 14px;
    }

    .bottom-spacer { height: 48px; }
    .form-body { padding-bottom: 16px; }
  `],
})
export class ProductFormPage implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private alertCtrl = inject(AlertController);
  private toastCtrl = inject(ToastController);
  private loadingCtrl = inject(LoadingController);
  productService = inject(DigitalProductService);
  private auth = inject(AuthService);

  readonly typeOptions = TYPE_OPTIONS;

  isEditMode = signal(false);
  isSaving = signal(false);
  existingProduct = signal<DigitalProduct | null>(null);

  form = signal<ProductForm>({
    title: '',
    description: '',
    type: 'pdf_program',
    price_cents: 0,
    isFree: true,
    priceDisplay: '',
    preview_url: '',
    thumbnail_url: '',
    file_urls: [],
  });

  selectedTypeHint = computed(() => {
    const found = TYPE_OPTIONS.find((o) => o.value === this.form().type);
    return found?.hint ?? '';
  });

  isValid = computed(() => {
    const f = this.form();
    const hasTitleAndType = f.title.trim().length >= 2 && !!f.type;
    const priceOk = f.isFree || f.price_cents >= 100; // min $1
    return hasTitleAndType && priceOk;
  });

  constructor() {
    addIcons({
      cloudUploadOutline,
      trashOutline,
      checkmarkOutline,
      documentOutline,
      linkOutline,
      imagesOutline,
      playCircleOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEditMode.set(true);
      this.loadExisting(id);
    }
  }

  private loadExisting(id: string): void {
    const product =
      this.productService.myProducts().find((p) => p.id === id) ?? null;
    if (!product) return;

    this.existingProduct.set(product);
    this.form.set({
      title: product.title,
      description: product.description ?? '',
      type: product.type,
      price_cents: product.price_cents,
      isFree: product.price_cents === 0,
      priceDisplay: product.price_cents > 0
        ? String(product.price_cents / 100)
        : '',
      preview_url: product.preview_url ?? '',
      thumbnail_url: product.thumbnail_url ?? '',
      file_urls: [...(product.file_urls ?? [])],
    });
  }

  // ── Patch helpers ─────────────────────────────────────────────────────────

  patchForm(partial: Partial<ProductForm>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  onFreeToggle(isFree: boolean): void {
    this.patchForm({ isFree, price_cents: 0, priceDisplay: '' });
  }

  onPriceInput(raw: string | null | undefined): void {
    const dollars = parseFloat(raw ?? '0') || 0;
    const cents = Math.round(Math.max(0, dollars) * 100);
    this.patchForm({ price_cents: cents, priceDisplay: raw ?? '' });
  }

  addFileUrl(): void {
    this.patchForm({ file_urls: [...this.form().file_urls, ''] });
  }

  updateFileUrl(index: number, value: string): void {
    const urls = [...this.form().file_urls];
    urls[index] = value;
    this.patchForm({ file_urls: urls });
  }

  removeFileUrl(index: number): void {
    const urls = this.form().file_urls.filter((_, i) => i !== index);
    this.patchForm({ file_urls: urls });
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  async save(publish: boolean): Promise<void> {
    if (!this.isValid() || this.isSaving()) return;
    this.isSaving.set(true);

    const f = this.form();
    const dto: CreateProductDto = {
      title:         f.title.trim(),
      description:   f.description.trim() || undefined,
      type:          f.type,
      price_cents:   f.isFree ? 0 : f.price_cents,
      preview_url:   f.preview_url.trim() || undefined,
      thumbnail_url: f.thumbnail_url.trim() || undefined,
      file_urls:     f.file_urls.filter((u) => u.trim().length > 0),
    };

    try {
      if (this.isEditMode() && this.existingProduct()) {
        const id = this.existingProduct()!.id;
        const updated = await this.productService.updateProduct(id, dto);
        if (updated && publish && !this.existingProduct()!.is_published) {
          await this.productService.setPublished(id, true);
        }
        await this.showToast('Product updated!', 'success');
      } else {
        const product = await this.productService.createProduct(dto);
        if (product && publish) {
          await this.productService.setPublished(product.id, true);
        }
        await this.showToast(
          publish ? 'Product published!' : 'Draft saved!',
          'success'
        );
      }
      this.router.navigate(['/tabs/marketplace/manage'], { replaceUrl: true });
    } catch {
      await this.showToast('Something went wrong. Please try again.', 'warning');
    } finally {
      this.isSaving.set(false);
    }
  }

  async confirmDelete(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Delete Product',
      message:
        'This will permanently delete the product. Published products with purchases cannot be deleted.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: () => this.deleteProduct(),
        },
      ],
    });
    await alert.present();
  }

  private async deleteProduct(): Promise<void> {
    const product = this.existingProduct();
    if (!product) return;

    this.isSaving.set(true);
    const ok = await this.productService.deleteProduct(product.id);
    this.isSaving.set(false);

    if (ok) {
      await this.showToast('Product deleted.', 'medium');
      this.router.navigate(['/tabs/marketplace/manage'], { replaceUrl: true });
    } else {
      await this.showToast(
        'Cannot delete a product with purchases. Unpublish it instead.',
        'warning'
      );
    }
  }

  private async showToast(message: string, color: string): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2500,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
