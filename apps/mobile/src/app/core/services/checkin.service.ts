import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = 'rating' | 'text' | 'yes_no';

export interface CheckinQuestion {
  id:       string;   // client-generated UUID
  text:     string;
  type:     QuestionType;
  required: boolean;
}

export interface CheckinTemplate {
  id:                   string;
  trainer_id:           string;
  name:                 string;
  questions:            CheckinQuestion[];
  send_day_of_week:     number | null;  // 0=Sun…6=Sat
  send_time:            string | null;  // "HH:MM"
  assigned_client_ids:  string[] | null;
  is_active:            boolean;
  created_at:           string;
  updated_at:           string;
}

export type AnswerValue = number | string | boolean;

export interface CheckinAnswer {
  question_id: string;
  value:       AnswerValue;
}

export interface CheckinResponse {
  id:                 string;
  client_id:          string;
  trainer_id:         string;
  template_id:        string;
  sent_at:            string;
  responded_at:       string | null;
  questions_snapshot: CheckinQuestion[];
  responses:          CheckinAnswer[];
  overall_mood:       number | null;
}

export interface WeeklySummaryRow {
  week_start:      string;
  overall_mood:    number | null;
  response_count:  number;
  sent_count:      number;
}

export interface CreateTemplateDto {
  name:                string;
  questions:           CheckinQuestion[];
  send_day_of_week?:   number;
  send_time?:          string;
  assigned_client_ids?: string[];
}

@Injectable({ providedIn: 'root' })
export class CheckinService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── Trainer state ──────────────────────────────────────────────────────────
  readonly templates    = signal<CheckinTemplate[]>([]);
  readonly isLoading    = signal(false);
  readonly error        = signal<string | null>(null);

  // ── Client state ──────────────────────────────────────────────────────────
  readonly pendingResponse  = signal<CheckinResponse | null>(null);
  readonly myResponses      = signal<CheckinResponse[]>([]);

  // ─── Trainer: Template CRUD ─────────────────────────────────────────────────

  async getMyTemplates(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('checkin_templates')
        .select('*')
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      this.templates.set(data ?? []);
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? 'Failed to load templates');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createTemplate(dto: CreateTemplateDto): Promise<CheckinTemplate | null> {
    const user = this.auth.user();
    if (!user) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('checkin_templates')
        .insert({
          trainer_id:          user.id,
          name:                dto.name,
          questions:           dto.questions,
          send_day_of_week:    dto.send_day_of_week ?? null,
          send_time:           dto.send_time ?? null,
          assigned_client_ids: dto.assigned_client_ids ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      this.templates.update((list) => [data, ...list]);
      return data;
    } catch {
      return null;
    }
  }

  async updateTemplate(
    id: string,
    updates: Partial<CreateTemplateDto & { is_active: boolean }>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('checkin_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this.templates.update((list) =>
        list.map((t) => (t.id === id ? { ...t, ...updates } : t))
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteTemplate(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('checkin_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.templates.update((list) => list.filter((t) => t.id !== id));
      return true;
    } catch {
      return false;
    }
  }

  /** Trainer: send a check-in immediately to a client (ad-hoc send). */
  async sendCheckinNow(templateId: string, clientId: string): Promise<boolean> {
    const user = this.auth.user();
    if (!user) return false;

    const template = this.templates().find((t) => t.id === templateId);
    if (!template) return false;

    try {
      const { error } = await this.supabase.client
        .from('checkin_responses')
        .insert({
          client_id:          clientId,
          trainer_id:         user.id,
          template_id:        templateId,
          questions_snapshot: template.questions,
          sent_at:            new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  // ─── Trainer: Read client responses ────────────────────────────────────────

  async getClientResponses(clientId: string): Promise<CheckinResponse[]> {
    const user = this.auth.user();
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .from('checkin_responses')
      .select('*')
      .eq('client_id', clientId)
      .eq('trainer_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(50);

    if (error) return [];
    return data ?? [];
  }

  async getClientWeeklySummary(clientId: string): Promise<WeeklySummaryRow[]> {
    const user = this.auth.user();
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .rpc('get_client_checkin_summary', {
        p_client_id:  clientId,
        p_trainer_id: user.id,
      });

    if (error) return [];
    return data ?? [];
  }

  // ─── Client: Load pending check-in ─────────────────────────────────────────

  /** Load the most recent unanswered check-in for the current client. */
  async loadPendingCheckin(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('checkin_responses')
      .select('*')
      .eq('client_id', user.id)
      .is('responded_at', null)
      .order('sent_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      this.pendingResponse.set(null);
      return;
    }

    this.pendingResponse.set(data);
  }

  /** Load a specific check-in by ID (deep-link from notification). */
  async loadCheckinById(responseId: string): Promise<CheckinResponse | null> {
    const user = this.auth.user();
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('checkin_responses')
      .select('*')
      .eq('id', responseId)
      .eq('client_id', user.id)
      .single();

    if (error || !data) return null;

    this.pendingResponse.set(data);
    return data;
  }

  // ─── Client: Submit response ────────────────────────────────────────────────

  async submitResponse(
    responseId: string,
    answers: CheckinAnswer[]
  ): Promise<boolean> {
    // Compute overall_mood from rating-type answers
    const ratingAnswers = answers.filter(
      (a) => typeof a.value === 'number'
    );
    const avgMood =
      ratingAnswers.length > 0
        ? Math.round(
            ratingAnswers.reduce((sum, a) => sum + (a.value as number), 0) /
              ratingAnswers.length
          )
        : null;

    try {
      const { error } = await this.supabase.client
        .from('checkin_responses')
        .update({
          responses:    answers,
          overall_mood: avgMood,
          responded_at: new Date().toISOString(),
        })
        .eq('id', responseId);

      if (error) throw error;

      this.pendingResponse.set(null);

      // Append to client's own history
      this.myResponses.update((list) => {
        const existing = list.find((r) => r.id === responseId);
        if (!existing) return list;
        return list.map((r) =>
          r.id === responseId
            ? {
                ...r,
                responses:    answers,
                overall_mood: avgMood,
                responded_at: new Date().toISOString(),
              }
            : r
        );
      });

      return true;
    } catch {
      return false;
    }
  }

  async getMyResponses(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('checkin_responses')
      .select('*')
      .eq('client_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(30);

    if (!error && data) {
      this.myResponses.set(data);
    }
  }
}
