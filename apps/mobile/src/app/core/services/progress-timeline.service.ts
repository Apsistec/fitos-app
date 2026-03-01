import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type TimelineEventType =
  | 'appointment_completed'
  | 'workout_logged'
  | 'measurement_taken'
  | 'pr_set'
  | 'milestone_achieved';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  subtitle?: string;
  /** ISO 8601 */
  occurred_at: string;
  /** ISO 8601 week label, e.g. "Mar 3 – Mar 9, 2026" */
  weekLabel?: string;
  isPR: boolean;
  meta?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ProgressTimelineService {
  private supabase = inject(SupabaseService);

  events = signal<TimelineEvent[]>([]);
  isLoading = signal(false);
  hasMore = signal(true);
  error = signal<string | null>(null);

  private pageSize = 20;
  private offset = 0;
  private currentClientId: string | null = null;

  /** Load initial page for a client. Call with trainer OR client userId. */
  async load(clientId: string): Promise<void> {
    this.currentClientId = clientId;
    this.offset = 0;
    this.events.set([]);
    this.hasMore.set(true);
    await this._fetchPage();
  }

  /** Load next page (infinite scroll). */
  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.isLoading() || !this.currentClientId) return;
    await this._fetchPage();
  }

  private async _fetchPage(): Promise<void> {
    if (!this.currentClientId) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const clientId = this.currentClientId;
      const from = this.offset;
      const to = from + this.pageSize - 1;

      // Fetch all event types in parallel, then merge & sort
      const [completedAppts, workoutSessions, measurements, prs] = await Promise.all([
        this._fetchCompletedAppointments(clientId, from, to),
        this._fetchWorkoutSessions(clientId, from, to),
        this._fetchMeasurements(clientId, from, to),
        this._fetchPRs(clientId, from, to),
      ]);

      const rawEvents: TimelineEvent[] = [
        ...completedAppts,
        ...workoutSessions,
        ...measurements,
        ...prs,
      ].sort((a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime());

      const pageEvents = rawEvents.slice(0, this.pageSize);

      // Add week labels (sticky headers)
      const decorated = this._addWeekLabels(pageEvents, this.offset === 0 ? [] : this.events());

      this.events.update((prev) => (this.offset === 0 ? decorated : [...prev, ...decorated]));
      this.offset += this.pageSize;
      this.hasMore.set(rawEvents.length >= this.pageSize);
    } catch (err) {
      this.error.set(err instanceof Error ? err.message : 'Failed to load timeline');
      console.error('[ProgressTimelineService]', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Data Fetchers ────────────────────────────────────────────────────────

  private async _fetchCompletedAppointments(clientId: string, from: number, to: number): Promise<TimelineEvent[]> {
    const { data, error } = await this.supabase.client
      .from('appointments')
      .select('id, start_at, service_type_id, service_types(name)')
      .eq('client_id', clientId)
      .eq('status', 'completed')
      .order('start_at', { ascending: false })
      .range(from, to);

    if (error) return [];

    return (data || []).map((a) => ({
      id: `appt-${a.id}`,
      type: 'appointment_completed' as TimelineEventType,
      title: 'Session Completed',
      subtitle: (a.service_types as Record<string, unknown>)?.['name'] as string || 'Training Session',
      occurred_at: a.start_at,
      isPR: false,
    }));
  }

  private async _fetchWorkoutSessions(clientId: string, from: number, to: number): Promise<TimelineEvent[]> {
    const { data, error } = await this.supabase.client
      .from('workout_sessions')
      .select('id, completed_at, rating, workout_templates(name)')
      .eq('client_id', clientId)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .range(from, to);

    if (error) return [];

    return (data || []).map((s) => ({
      id: `ws-${s.id}`,
      type: 'workout_logged' as TimelineEventType,
      title: 'Workout Logged',
      subtitle: (s.workout_templates as Record<string, unknown>)?.['name'] as string || 'Custom Workout',
      occurred_at: s.completed_at as string,
      isPR: false,
      meta: { rating: s.rating },
    }));
  }

  private async _fetchMeasurements(clientId: string, from: number, to: number): Promise<TimelineEvent[]> {
    const { data, error } = await this.supabase.client
      .from('measurements')
      .select('id, recorded_at, weight_kg, body_fat_percentage')
      .eq('user_id', clientId)
      .order('recorded_at', { ascending: false })
      .range(from, to);

    if (error) return [];

    return (data || []).map((m) => {
      const parts: string[] = [];
      if (m.weight_kg) parts.push(`${m.weight_kg} kg`);
      if (m.body_fat_percentage) parts.push(`${m.body_fat_percentage}% BF`);
      return {
        id: `meas-${m.id}`,
        type: 'measurement_taken' as TimelineEventType,
        title: 'Measurement Recorded',
        subtitle: parts.join(' · ') || undefined,
        occurred_at: m.recorded_at,
        isPR: false,
      };
    });
  }

  private async _fetchPRs(clientId: string, from: number, to: number): Promise<TimelineEvent[]> {
    // logged_sets with is_pr = true — use supabase query
    const { data, error } = await this.supabase.client
      .from('logged_sets')
      .select('id, created_at, exercise_name, weight_kg, reps')
      .eq('client_id', clientId)
      .eq('is_pr', true)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) return [];

    return (data || []).map((p) => ({
      id: `pr-${p.id}`,
      type: 'pr_set' as TimelineEventType,
      title: `New PR — ${p.exercise_name}`,
      subtitle: p.weight_kg ? `${p.weight_kg} kg × ${p.reps} reps` : `${p.reps} reps`,
      occurred_at: p.created_at,
      isPR: true,
    }));
  }

  // ─── Week Grouping ─────────────────────────────────────────────────────────

  private _addWeekLabels(newEvents: TimelineEvent[], existing: TimelineEvent[]): TimelineEvent[] {
    const seenWeeks = new Set<string>(
      existing.filter((e) => e.weekLabel).map((e) => e.weekLabel!)
    );

    return newEvents.map((e) => {
      const weekKey = this._weekKey(e.occurred_at);
      if (!seenWeeks.has(weekKey)) {
        seenWeeks.add(weekKey);
        return { ...e, weekLabel: this._weekRangeLabel(e.occurred_at) };
      }
      return e;
    });
  }

  private _weekKey(dateStr: string): string {
    const d = new Date(dateStr);
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return monday.toISOString().split('T')[0];
  }

  private _weekRangeLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const dayOfWeek = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const fmt = (dt: Date) =>
      dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const year = sunday.getFullYear();
    const thisYear = new Date().getFullYear();
    return `${fmt(monday)} – ${fmt(sunday)}${year !== thisYear ? `, ${year}` : ''}`;
  }
}
