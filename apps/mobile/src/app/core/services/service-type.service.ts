import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { ServiceType } from '@fitos/shared';

/**
 * ServiceTypeService
 * Sprint 54.1 — Phase 5A
 *
 * Full CRUD for a trainer's service types (session offerings).
 * e.g. "60-min Personal Training", "30-min Group Class", "90-min Assessment"
 */

export type CreateServiceTypeDto = Omit<ServiceType, 'id' | 'created_at' | 'updated_at'>;
export type UpdateServiceTypeDto = Partial<CreateServiceTypeDto>;

@Injectable({ providedIn: 'root' })
export class ServiceTypeService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  serviceTypes = signal<ServiceType[]>([]);
  isLoading    = signal(false);
  error        = signal<string | null>(null);

  /** Active service types only */
  activeServiceTypes = () => this.serviceTypes().filter(st => st.is_active);

  // ── Load ─────────────────────────────────────────────────────

  async loadServiceTypes(trainerId?: string): Promise<void> {
    const tid = trainerId ?? this.auth.currentUser()?.id;
    if (!tid) return;

    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('service_types')
      .select('*')
      .eq('trainer_id', tid)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.serviceTypes.set((data ?? []) as ServiceType[]);
  }

  async getServiceType(id: string): Promise<ServiceType | null> {
    const { data } = await this.supabase.client
      .from('service_types')
      .select('*')
      .eq('id', id)
      .single();

    return data as ServiceType | null;
  }

  // ── Create ───────────────────────────────────────────────────

  async createServiceType(dto: CreateServiceTypeDto): Promise<{ data: ServiceType | null; error: Error | null }> {
    try {
      const trainerId = this.auth.currentUser()?.id;
      if (!trainerId) throw new Error('Not authenticated');

      const { data, error } = await this.supabase.client
        .from('service_types')
        .insert({ ...dto, trainer_id: trainerId })
        .select()
        .single();

      if (error) throw new Error(error.message);

      const serviceType = data as ServiceType;
      this.serviceTypes.update(list =>
        [...list, serviceType].sort((a, b) => a.sort_order - b.sort_order)
      );

      return { data: serviceType, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  // ── Update ───────────────────────────────────────────────────

  async updateServiceType(id: string, updates: UpdateServiceTypeDto): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.client
        .from('service_types')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);

      this.serviceTypes.update(list =>
        list.map(st => st.id === id ? { ...st, ...updates } : st)
      );

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  // ── Archive (soft delete) ────────────────────────────────────

  async archiveServiceType(id: string): Promise<{ error: Error | null }> {
    return this.updateServiceType(id, { is_active: false });
  }

  async restoreServiceType(id: string): Promise<{ error: Error | null }> {
    return this.updateServiceType(id, { is_active: true });
  }

  // ── Reorder ──────────────────────────────────────────────────

  async reorderServiceTypes(orderedIds: string[]): Promise<{ error: Error | null }> {
    try {
      const updates = orderedIds.map((id, index) => ({
        id,
        sort_order: index,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await this.supabase.client
        .from('service_types')
        .upsert(updates, { onConflict: 'id' });

      if (error) throw new Error(error.message);

      // Update local sort order
      this.serviceTypes.update(list => {
        const orderMap = new Map(orderedIds.map((id, i) => [id, i]));
        return [...list].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
      });

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  // ── Default service types for new trainers ───────────────────

  async seedDefaultServiceTypes(trainerId: string): Promise<void> {
    const defaults: CreateServiceTypeDto[] = [
      {
        trainer_id:            trainerId,
        name:                  '60-min Personal Training',
        duration_minutes:      60,
        base_price:            80,
        cancel_window_minutes: 1440,
        num_sessions_deducted: 1,
        buffer_after_minutes:  0,
        travel_buffer_minutes: 0,
        sell_online:           true,
        color:                 '#10B981',
        is_active:             true,
        sort_order:            0,
      },
      {
        trainer_id:            trainerId,
        name:                  '30-min Quick Session',
        duration_minutes:      30,
        base_price:            50,
        cancel_window_minutes: 720,
        num_sessions_deducted: 1,
        buffer_after_minutes:  0,
        travel_buffer_minutes: 0,
        sell_online:           true,
        color:                 '#8B5CF6',
        is_active:             true,
        sort_order:            1,
      },
      {
        trainer_id:            trainerId,
        name:                  '90-min Assessment',
        duration_minutes:      90,
        base_price:            120,
        cancel_window_minutes: 2880,
        num_sessions_deducted: 1,
        buffer_after_minutes:  15,
        travel_buffer_minutes: 0,
        sell_online:           true,
        color:                 '#3B82F6',
        is_active:             true,
        sort_order:            2,
      },
    ];

    await this.supabase.client
      .from('service_types')
      .upsert(defaults, { onConflict: 'trainer_id,name', ignoreDuplicates: true });
  }
}
