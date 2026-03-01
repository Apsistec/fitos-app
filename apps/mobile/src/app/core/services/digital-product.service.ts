import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProductType = 'pdf_program' | 'video_series' | 'template_bundle' | 'custom_plan';

export interface DigitalProduct {
  id: string;
  trainer_id: string;
  title: string;
  description: string | null;
  type: ProductType;
  price_cents: number;
  currency: string;
  preview_url: string | null;
  file_urls: string[];
  thumbnail_url: string | null;
  stripe_price_id: string | null;
  stripe_product_id: string | null;
  is_published: boolean;
  purchase_count: number;
  created_at: string;
}

export interface DigitalProductWithTrainer extends DigitalProduct {
  trainer_name: string;
  is_purchased: boolean;
}

export interface ProductPurchase {
  id: string;
  client_id: string;
  product_id: string;
  stripe_payment_intent_id: string | null;
  purchased_at: string;
  download_count: number;
}

export interface CreateProductDto {
  title: string;
  description?: string;
  type: ProductType;
  price_cents: number;
  thumbnail_url?: string;
  preview_url?: string;
  file_urls?: string[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class DigitalProductService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── Signals ────────────────────────────────────────────────────────────
  /** Trainer's own products (draft + published). */
  myProducts = signal<DigitalProduct[]>([]);

  /** Client-facing product list from their trainer(s). */
  trainerProducts = signal<DigitalProductWithTrainer[]>([]);

  /** Purchases made by the current client. */
  purchases = signal<ProductPurchase[]>([]);

  isLoading = signal(false);
  error = signal<string | null>(null);

  // ── Trainer: product management ────────────────────────────────────────

  /** Load all products created by the authenticated trainer. */
  async getMyProducts(): Promise<void> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return;

    this.isLoading.set(true);
    const { data, error } = await this.supabase.client
      .from('digital_products')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('created_at', { ascending: false });

    this.isLoading.set(false);
    if (error) { this.error.set(error.message); return; }
    this.myProducts.set((data ?? []) as DigitalProduct[]);
  }

  /**
   * Create a new digital product.
   * Calls the `create-stripe-product` Edge Function to register the Stripe Price,
   * then inserts the DB record with the returned stripe_price_id.
   */
  async createProduct(dto: CreateProductDto): Promise<DigitalProduct | null> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return null;

    this.isLoading.set(true);
    try {
      // ── 1. Register with Stripe (via Edge Function) ──────────────────
      let stripePriceId: string | null = null;
      let stripeProductId: string | null = null;

      if (dto.price_cents > 0) {
        const { data: stripeData, error: stripeError } = await this.supabase.client
          .functions
          .invoke('create-stripe-product', {
            body: {
              name: dto.title,
              description: dto.description ?? '',
              price_cents: dto.price_cents,
              currency: 'usd',
            },
          });

        if (stripeError) {
          this.error.set(`Stripe error: ${stripeError.message}`);
          return null;
        }

        stripePriceId = (stripeData as { price_id: string; product_id: string }).price_id;
        stripeProductId = (stripeData as { price_id: string; product_id: string }).product_id;
      }

      // ── 2. Insert DB record ─────────────────────────────────────────
      const { data: record, error: dbError } = await this.supabase.client
        .from('digital_products')
        .insert({
          trainer_id: trainerId,
          title: dto.title,
          description: dto.description ?? null,
          type: dto.type,
          price_cents: dto.price_cents,
          thumbnail_url: dto.thumbnail_url ?? null,
          preview_url: dto.preview_url ?? null,
          file_urls: dto.file_urls ?? [],
          stripe_price_id: stripePriceId,
          stripe_product_id: stripeProductId,
          is_published: false,
        })
        .select()
        .single();

      if (dbError) { this.error.set(dbError.message); return null; }

      const product = record as DigitalProduct;
      this.myProducts.update((prev) => [product, ...prev]);
      return product;

    } finally {
      this.isLoading.set(false);
    }
  }

  /** Update an existing product's metadata. Does not re-create Stripe Price. */
  async updateProduct(
    productId: string,
    updates: Partial<Pick<DigitalProduct, 'title' | 'description' | 'thumbnail_url' | 'preview_url' | 'file_urls'>>,
  ): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('digital_products')
      .update({ ...updates })
      .eq('id', productId);

    if (error) { this.error.set(error.message); return false; }

    this.myProducts.update((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
    );
    return true;
  }

  /** Toggle a product between draft and published. */
  async setPublished(productId: string, published: boolean): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('digital_products')
      .update({ is_published: published })
      .eq('id', productId);

    if (error) { this.error.set(error.message); return false; }

    this.myProducts.update((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, is_published: published } : p))
    );
    return true;
  }

  /** Delete a draft product (cannot delete published products with purchases). */
  async deleteProduct(productId: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('digital_products')
      .delete()
      .eq('id', productId)
      .eq('is_published', false); // Guard: only drafts can be deleted

    if (error) { this.error.set(error.message); return false; }

    this.myProducts.update((prev) => prev.filter((p) => p.id !== productId));
    return true;
  }

  // ── Client: browse & purchase ──────────────────────────────────────────

  /**
   * Load published products from the client's trainer(s).
   * Uses `get_client_trainer_products` RPC to scope results to the relationship.
   */
  async getTrainerProducts(): Promise<void> {
    const clientId = this.auth.user()?.id;
    if (!clientId) return;

    this.isLoading.set(true);
    const { data, error } = await this.supabase.client.rpc(
      'get_client_trainer_products',
      { p_client_id: clientId },
    );
    this.isLoading.set(false);

    if (error) { this.error.set(error.message); return; }
    this.trainerProducts.set((data ?? []) as DigitalProductWithTrainer[]);
  }

  /**
   * Load purchases made by the current client.
   */
  async getMyPurchases(): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('digital_product_purchases')
      .select('*')
      .order('purchased_at', { ascending: false });

    if (!error) this.purchases.set((data ?? []) as ProductPurchase[]);
  }

  /**
   * Purchase a product.
   * For paid products, calls `create-marketplace-payment-intent` Edge Function.
   * For free products, inserts the purchase record directly.
   */
  async purchaseProduct(product: DigitalProduct | DigitalProductWithTrainer): Promise<boolean> {
    const clientId = this.auth.user()?.id;
    if (!clientId) return false;

    this.isLoading.set(true);
    try {
      let paymentIntentId: string | null = null;

      // ── Paid product: create PaymentIntent via Edge Function ──────────
      if (product.price_cents > 0) {
        const { data: piData, error: piError } = await this.supabase.client
          .functions
          .invoke('create-marketplace-payment-intent', {
            body: {
              product_id: product.id,
              stripe_price_id: product.stripe_price_id,
              trainer_id: product.trainer_id,
              client_id: clientId,
            },
          });

        if (piError) { this.error.set(piError.message); return false; }

        // In a full implementation, we'd handle 3DS confirmation here.
        // For now, we record the payment intent and mark as purchased.
        paymentIntentId = (piData as { payment_intent_id: string }).payment_intent_id;
      }

      // ── Insert purchase record ─────────────────────────────────────────
      const { error: dbError } = await this.supabase.client
        .from('digital_product_purchases')
        .insert({
          client_id: clientId,
          product_id: product.id,
          stripe_payment_intent_id: paymentIntentId,
        });

      if (dbError) { this.error.set(dbError.message); return false; }

      // ── Mark as purchased in local state ──────────────────────────────
      this.trainerProducts.update((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, is_purchased: true } : p))
      );
      return true;

    } finally {
      this.isLoading.set(false);
    }
  }

  /** Increment download count when a client downloads a purchased file. */
  async incrementDownloadCount(purchaseId: string): Promise<void> {
    await this.supabase.client
      .from('digital_product_purchases')
      .update({ download_count: (this.purchases().find((p) => p.id === purchaseId)?.download_count ?? 0) + 1 })
      .eq('id', purchaseId);
  }

  /** Check if the current client has purchased a given product. */
  isPurchased(productId: string): boolean {
    return this.purchases().some((p) => p.product_id === productId);
  }
}
