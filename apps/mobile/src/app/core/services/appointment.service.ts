import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type {
  Appointment,
  AppointmentStatus,
  CreateAppointmentDto,
  BookableSlot,
  Visit,
  APPOINTMENT_TERMINAL_STATES,
} from '@fitos/shared';

/**
 * AppointmentService
 * Sprint 54.1 — Phase 5A: Appointment Data Model & Database Foundation
 *
 * Central service for all appointment CRUD + calendar data.
 * Works with the 8-state FSM enforced at DB level.
 * Realtime subscription keeps calendar current without manual refresh.
 */

export interface AppointmentDateRange {
  start: Date;
  end: Date;
}

@Injectable({ providedIn: 'root' })
export class AppointmentService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── State signals ────────────────────────────────────────────
  appointments = signal<Appointment[]>([]);
  selectedDate = signal<Date>(new Date());
  isLoading    = signal(false);
  error        = signal<string | null>(null);

  /** Appointments for the currently selected date */
  todayAppointments = computed(() => {
    const selected = this.selectedDate();
    const dateStr = selected.toISOString().split('T')[0];
    return this.appointments().filter(a => a.start_at.startsWith(dateStr));
  });

  /** Count of appointments in 'requested' status (needs trainer action) */
  pendingRequestCount = computed(() =>
    this.appointments().filter(a => a.status === 'requested').length
  );

  private realtimeChannel: ReturnType<typeof this.supabase.client.channel> | null = null;

  // ── Calendar loading ─────────────────────────────────────────

  /**
   * Loads appointments for a trainer within the given date range.
   * Also subscribes to realtime changes on the appointments table.
   */
  async loadAppointments(
    trainerId: string,
    range: AppointmentDateRange,
  ): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.client
      .from('appointments')
      .select(`
        *,
        service_type:service_types(id, name, duration_minutes, base_price, color, buffer_after_minutes, travel_buffer_minutes),
        client:profiles!appointments_client_id_fkey(id, full_name, avatar_url)
      `)
      .eq('trainer_id', trainerId)
      .gte('start_at', range.start.toISOString())
      .lte('start_at', range.end.toISOString())
      .order('start_at', { ascending: true });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return;
    }

    this.appointments.set((data ?? []) as unknown as Appointment[]);
    this.subscribeToRealtime(trainerId);
  }

  /**
   * Loads upcoming appointments for a client.
   */
  async getClientAppointments(clientId: string, limit = 20): Promise<Appointment[]> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select(`
        *,
        service_type:service_types(id, name, duration_minutes, color),
        trainer:profiles!appointments_trainer_id_fkey(id, full_name, avatar_url)
      `)
      .eq('client_id', clientId)
      .gte('start_at', new Date().toISOString())
      .not('status', 'in', '("early_cancel","late_cancel")')
      .order('start_at', { ascending: true })
      .limit(limit);

    if (error || !data) return [];
    return data as unknown as Appointment[];
  }

  // ── CRUD operations ──────────────────────────────────────────

  /**
   * Creates a new appointment.
   * Validates no conflict exists before inserting.
   */
  async createAppointment(dto: CreateAppointmentDto): Promise<{ data: Appointment | null; error: Error | null }> {
    try {
      // Look up service type to calculate end_at and check buffers
      const { data: st, error: stErr } = await this.supabase.client
        .from('service_types')
        .select('duration_minutes')
        .eq('id', dto.service_type_id)
        .single();

      if (stErr || !st) throw new Error('Service type not found');

      const startAt = new Date(dto.start_at);
      const endAt   = new Date(startAt.getTime() + st.duration_minutes * 60_000);

      // Server-side conflict check (belt-and-suspenders on top of Edge Function availability check)
      const { data: conflict } = await this.supabase.client
        .rpc('check_appointment_conflict', {
          p_trainer_id: dto.trainer_id,
          p_start_at:   startAt.toISOString(),
          p_end_at:     endAt.toISOString(),
        });

      if (conflict) {
        throw new Error('This time slot is no longer available. Please choose another.');
      }

      const { data, error } = await this.supabase.client
        .from('appointments')
        .insert({
          trainer_id:           dto.trainer_id,
          client_id:            dto.client_id,
          service_type_id:      dto.service_type_id,
          facility_id:          dto.facility_id,
          resource_id:          dto.resource_id,
          start_at:             startAt.toISOString(),
          end_at:               endAt.toISOString(),
          duration_minutes:     st.duration_minutes,
          notes:                dto.notes,
          client_service_id:    dto.client_service_id,
          is_recurring:         dto.is_recurring ?? false,
          recurring_group_id:   dto.recurring_group_id,
          gender_preference:    dto.gender_preference ?? 'none',
          status:               'booked',
        })
        .select(`
          *,
          service_type:service_types(id, name, duration_minutes, base_price, color, buffer_after_minutes, travel_buffer_minutes),
          client:profiles!appointments_client_id_fkey(id, full_name, avatar_url)
        `)
        .single();

      if (error) throw new Error(error.message);

      const appt = data as unknown as Appointment;

      // Optimistically add to local state
      this.appointments.update(list => [...list, appt].sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
      ));

      return { data: appt, error: null };
    } catch (err) {
      return { data: null, error: err as Error };
    }
  }

  /**
   * Updates an appointment's notes or resource (non-status changes).
   * For status changes use AppointmentFsmService.
   */
  async updateAppointment(
    id: string,
    updates: Partial<Pick<Appointment, 'notes' | 'resource_id' | 'facility_id'>>,
  ): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.client
        .from('appointments')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw new Error(error.message);

      this.appointments.update(list =>
        list.map(a => a.id === id ? { ...a, ...updates } : a)
      );

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  }

  /**
   * Fetches available booking slots from the Edge Function.
   */
  async getAvailableSlots(
    trainerId: string,
    serviceTypeId: string,
    date: string,
  ): Promise<BookableSlot[]> {
    try {
      const { data, error } = await this.supabase.client.functions.invoke(
        'get-bookable-slots',
        { body: { trainer_id: trainerId, service_type_id: serviceTypeId, date } },
      );

      if (error || !data) return [];
      return data.slots as BookableSlot[];
    } catch {
      return [];
    }
  }

  /**
   * Gets the visit records for a given appointment.
   */
  async getVisitsForAppointment(appointmentId: string): Promise<Visit[]> {
    const { data } = await this.supabase.client
      .from('visits')
      .select('*')
      .eq('appointment_id', appointmentId)
      .order('created_at', { ascending: false });

    return (data ?? []) as Visit[];
  }

  // ── Realtime ─────────────────────────────────────────────────

  private subscribeToRealtime(trainerId: string): void {
    // Unsubscribe from any previous channel
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
    }

    this.realtimeChannel = this.supabase.client
      .channel(`appointments:${trainerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `trainer_id=eq.${trainerId}`,
        },
        (payload) => this.handleRealtimeChange(payload),
      )
      .subscribe();
  }

  private handleRealtimeChange(payload: Record<string, unknown>): void {
    const eventType = payload['eventType'] as string;
    const newRecord = payload['new'] as Appointment | null;
    const oldRecord = payload['old'] as Appointment | null;

    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          this.appointments.update(list =>
            [...list, newRecord].sort(
              (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()
            )
          );
        }
        break;
      case 'UPDATE':
        if (newRecord) {
          this.appointments.update(list =>
            list.map(a => a.id === newRecord.id ? { ...a, ...newRecord } : a)
          );
        }
        break;
      case 'DELETE':
        if (oldRecord) {
          this.appointments.update(list => list.filter(a => a.id !== oldRecord.id));
        }
        break;
    }
  }

  unsubscribe(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }
}
