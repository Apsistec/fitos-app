import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { PricingOption, ClientService } from '@fitos/shared';

export interface CreatePricingOptionDto {
  trainer_id: string;
  name: string;
  option_type: PricingOption['option_type'];
  price: number;
  session_count?: number;
  expiration_days?: number;
  service_type_ids?: string[];
  autopay_interval?: PricingOption['autopay_interval'];
  autopay_session_count?: number;
  revenue_category?: string;
  sell_online?: boolean;
  sort_order?: number;
}

/**
 * PricingOptionService — Sprint 58 (Phase 5C)
 *
 * Manages trainer-defined pricing packages (session packs, time passes,
 * drop-ins, contracts) and client-owned purchased services (client_services).
 *
 * Key behaviors:
 * - FIFO session selection: soonest-expiring package consumed first
 * - Atomic session decrement via DB RPC (prevents race conditions)
 * - Signal state for reactive UI updates
 */
@Injectable({ providedIn: 'root' })
export class PricingOptionService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── Signal state ──────────────────────────────────────────────────────────

  readonly pricingOptions = signal<PricingOption[]>([]);
  readonly isLoading      = signal(false);
  readonly error          = signal<string | null>(null);

  readonly activeOptions = computed<PricingOption[]>(() =>
    this.pricingOptions().filter(o => o.is_active)
  );

  readonly sessionPackOptions = computed<PricingOption[]>(() =>
    this.activeOptions().filter(o => o.option_type === 'session_pack')
  );

  readonly contractOptions = computed<PricingOption[]>(() =>
    this.activeOptions().filter(o => o.option_type === 'contract')
  );

  // ── Pricing Option CRUD ───────────────────────────────────────────────────

  async loadPricingOptions(trainerId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('pricing_options')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.pricingOptions.set((data ?? []) as PricingOption[]);
  }

  async createPricingOption(dto: CreatePricingOptionDto): Promise<PricingOption | null> {
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('pricing_options')
      .insert({
        trainer_id:           dto.trainer_id,
        name:                 dto.name,
        option_type:          dto.option_type,
        price:                dto.price,
        session_count:        dto.session_count ?? null,
        expiration_days:      dto.expiration_days ?? null,
        service_type_ids:     dto.service_type_ids ?? [],
        autopay_interval:     dto.autopay_interval ?? null,
        autopay_session_count: dto.autopay_session_count ?? null,
        revenue_category:     dto.revenue_category ?? 'personal_training',
        sell_online:          dto.sell_online ?? true,
        sort_order:           dto.sort_order ?? 0,
      })
      .select()
      .single();

    if (error) {
      this.error.set(error.message);
      return null;
    }

    const created = data as PricingOption;
    this.pricingOptions.update(opts => [...opts, created]);
    return created;
  }

  async updatePricingOption(id: string, dto: Partial<CreatePricingOptionDto>): Promise<void> {
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('pricing_options')
      .update(dto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.error.set(error.message);
      return;
    }

    const updated = data as PricingOption;
    this.pricingOptions.update(opts =>
      opts.map(o => o.id === id ? updated : o)
    );
  }

  /** Soft-delete (archive) — preserves existing client_services referencing this option */
  async archivePricingOption(id: string): Promise<void> {
    this.error.set(null);

    const { error } = await this.supabase.client
      .from('pricing_options')
      .update({ is_active: false })
      .eq('id', id);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.pricingOptions.update(opts =>
      opts.map(o => o.id === id ? { ...o, is_active: false } : o)
    );
  }

  async restorePricingOption(id: string): Promise<void> {
    this.error.set(null);

    const { error } = await this.supabase.client
      .from('pricing_options')
      .update({ is_active: true })
      .eq('id', id);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.pricingOptions.update(opts =>
      opts.map(o => o.id === id ? { ...o, is_active: true } : o)
    );
  }

  // ── Client Services ───────────────────────────────────────────────────────

  /**
   * Load all active client_services for a given client (trainer-side view).
   * Returns services joined with their pricing_option.
   */
  async getClientServices(clientId: string): Promise<ClientService[]> {
    const { data, error } = await this.supabase.client
      .from('client_services')
      .select(`
        *,
        pricing_option:pricing_options(*)
      `)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('expires_at', { ascending: true, nullsFirst: false });

    if (error) {
      this.error.set(error.message);
      return [];
    }

    return (data ?? []) as ClientService[];
  }

  /**
   * FIFO: returns client's active services that cover the given service type,
   * sorted soonest-expiring first (packages expiring soon are consumed first).
   * Time passes (sessions_remaining = null) come after finite packs.
   */
  async getApplicableServices(
    clientId: string,
    serviceTypeId: string
  ): Promise<ClientService[]> {
    const all = await this.getClientServices(clientId);

    return all.filter(cs => {
      const opt = cs.pricing_option;
      if (!opt) return false;
      // Drop-ins are used once at checkout — included if they cover this service type
      return opt.service_type_ids.includes(serviceTypeId);
    });
  }

  /**
   * Sell a pricing option to a client — creates a client_services row.
   * For session_pack: sets sessions_remaining = session_count.
   * For time_pass: leaves sessions_remaining null (unlimited).
   * For drop_in: sets sessions_remaining = 1.
   * For contract: created by the create-subscription Edge Function.
   */
  async sellToClient(
    clientId: string,
    pricingOptionId: string,
    opts?: {
      stripePaymentIntentId?: string;
      activateNow?: boolean;
    }
  ): Promise<ClientService | null> {
    this.error.set(null);

    // Load the option to compute initial sessions and expiry
    const { data: optData, error: optErr } = await this.supabase.client
      .from('pricing_options')
      .select('*')
      .eq('id', pricingOptionId)
      .single();

    if (optErr || !optData) {
      this.error.set(optErr?.message ?? 'Option not found');
      return null;
    }

    const opt = optData as PricingOption;
    const trainerId = opt.trainer_id;

    const now = new Date();
    const activatedAt = opts?.activateNow ? now.toISOString() : null;
    let expiresAt: string | null = null;

    if (opt.expiration_days && activatedAt) {
      const expiry = new Date(now);
      expiry.setDate(expiry.getDate() + opt.expiration_days);
      expiresAt = expiry.toISOString();
    }

    let sessionsRemaining: number | null = null;
    let sessionsTotal: number | null = null;

    if (opt.option_type === 'session_pack' && opt.session_count) {
      sessionsRemaining = opt.session_count;
      sessionsTotal     = opt.session_count;
    } else if (opt.option_type === 'drop_in') {
      sessionsRemaining = 1;
      sessionsTotal     = 1;
    }
    // time_pass and contract: sessions_remaining stays null (unlimited)

    const { data, error } = await this.supabase.client
      .from('client_services')
      .insert({
        client_id:                clientId,
        trainer_id:               trainerId,
        pricing_option_id:        pricingOptionId,
        stripe_payment_intent_id: opts?.stripePaymentIntentId ?? null,
        sessions_remaining:       sessionsRemaining,
        sessions_total:           sessionsTotal,
        activated_at:             activatedAt,
        expires_at:               expiresAt,
        is_active:                true,
      })
      .select(`*, pricing_option:pricing_options(*)`)
      .single();

    if (error) {
      this.error.set(error.message);
      return null;
    }

    return data as ClientService;
  }

  /**
   * Atomically decrement sessions_remaining via DB RPC.
   * Returns new sessions_remaining (null for time_pass).
   * Throws if already at 0, inactive, or expired.
   */
  async decrementSession(clientServiceId: string): Promise<number | null> {
    const { data, error } = await this.supabase.client
      .rpc('decrement_sessions_remaining', { p_client_service_id: clientServiceId });

    if (error) {
      this.error.set(error.message);
      throw new Error(error.message);
    }

    return data as number | null;
  }
}
