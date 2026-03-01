import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NpsSurvey {
  id: string;
  trainer_id: string;
  sent_at: string;
  response_count: number;
  promoters: number;
  passives: number;
  detractors: number;
  score: number | null;
  created_at: string;
}

export interface NpsResponse {
  id: string;
  survey_id: string;
  trainer_id: string;
  client_id: string;
  score: number | null;
  feedback_text: string | null;
  responded_at: string | null;
  sent_at: string;
  trainer_name?: string;   // from join
}

export interface NpsQuarterTrend {
  quarter: string;         // e.g. "2026 Q1"
  score: number | null;
  response_count: number;
  promoters: number;
  passives: number;
  detractors: number;
}

export interface NpsSummary {
  current: {
    score: number | null;
    promoters: number;
    passives: number;
    detractors: number;
    total: number;
  };
  trend: NpsQuarterTrend[];
  response_rate: number;
  total_sent: number;
}

export interface TestimonialQueueItem {
  id: string;
  review_id: string;
  trainer_id: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  created_at: string;
  // Joined review fields
  rating: number;
  text: string | null;
  reviewer: string;
  client_id: string | null;
}

// ─── NPS score helpers ────────────────────────────────────────────────────────

export type NpsSegment = 'promoter' | 'passive' | 'detractor';

export function getNpsSegment(score: number): NpsSegment {
  if (score >= 9) return 'promoter';
  if (score >= 7) return 'passive';
  return 'detractor';
}

export function getNpsColor(score: number | null): string {
  if (score === null) return '#6B7280';
  if (score >= 50)  return '#10B981';  // great NPS
  if (score >= 0)   return '#F59E0B';  // average
  return '#EF4444';                    // negative NPS
}

export function getScorePrompt(score: number): string {
  if (score >= 9) return "What do you love most about training with your trainer?";
  if (score >= 7) return "What would make it a 10?";
  return "What can your trainer do to improve?";
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class NpsService {
  private supabase = inject(SupabaseService).client;

  // ── Trainer signals ─────────────────────────────────────────────────────────
  npsSummary        = signal<NpsSummary | null>(null);
  surveys           = signal<NpsSurvey[]>([]);
  testimonialQueue  = signal<TestimonialQueueItem[]>([]);
  isLoading         = signal(false);
  error             = signal<string | null>(null);

  // ── Client signals ──────────────────────────────────────────────────────────
  pendingNps        = signal<NpsResponse | null>(null);

  // ── Trainer: NPS summary ────────────────────────────────────────────────────

  async getMyNpsSummary(): Promise<NpsSummary | null> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.rpc('get_trainer_nps_summary');

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return null;
    }

    const summary = data as NpsSummary;
    this.npsSummary.set(summary);
    return summary;
  }

  // ── Trainer: survey history ─────────────────────────────────────────────────

  async getMySurveys(): Promise<NpsSurvey[]> {
    const { data, error } = await this.supabase
      .from('nps_surveys')
      .select('*')
      .order('sent_at', { ascending: false });

    if (error) {
      this.error.set(error.message);
      return [];
    }

    const list = (data ?? []) as NpsSurvey[];
    this.surveys.set(list);
    return list;
  }

  // ── Trainer: manual survey trigger ──────────────────────────────────────────
  // Creates a new survey row; Edge Function sends notifications.
  // Returns the new survey id for tracking.

  async sendSurvey(): Promise<string | null> {
    this.isLoading.set(true);

    const { data: survey, error: surveyErr } = await this.supabase
      .from('nps_surveys')
      .insert({})
      .select('id')
      .single();

    if (surveyErr || !survey) {
      this.isLoading.set(false);
      this.error.set(surveyErr?.message ?? 'Failed to create survey');
      return null;
    }

    // Invoke Edge Function to send push notifications
    const { error: fnErr } = await this.supabase.functions.invoke('send-nps-survey', {
      body: { survey_id: survey.id },
    });

    this.isLoading.set(false);

    if (fnErr) {
      this.error.set(fnErr.message);
    }

    await this.getMySurveys();
    return survey.id;
  }

  // ── Trainer: get responses for a specific survey ────────────────────────────

  async getSurveyResponses(surveyId: string): Promise<NpsResponse[]> {
    const { data, error } = await this.supabase
      .from('nps_responses')
      .select('*, profiles!client_id(full_name)')
      .eq('survey_id', surveyId)
      .order('responded_at', { ascending: false, nullsFirst: false });

    if (error) {
      this.error.set(error.message);
      return [];
    }

    return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
      ...r,
      trainer_name: (r['profiles'] as { full_name: string } | null)?.full_name ?? 'Unknown',
    })) as NpsResponse[];
  }

  // ── Trainer: testimonial approval queue ─────────────────────────────────────

  async getTestimonialQueue(): Promise<TestimonialQueueItem[]> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase
      .from('testimonial_approval_queue')
      .select(`
        *,
        trainer_reviews!review_id (
          rating,
          text,
          client_id,
          profiles!client_id ( full_name )
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return [];
    }

    const items = ((data ?? []) as Record<string, unknown>[]).map((row) => {
      const review = row['trainer_reviews'] as Record<string, unknown> | null;
      const prof   = review?.['profiles'] as { full_name: string } | null;
      return {
        id:          row['id'],
        review_id:   row['review_id'],
        trainer_id:  row['trainer_id'],
        status:      row['status'],
        reviewed_at: row['reviewed_at'],
        created_at:  row['created_at'],
        rating:      review?.['rating'] ?? 0,
        text:        review?.['text'] ?? null,
        client_id:   review?.['client_id'] ?? null,
        reviewer:    prof?.full_name ?? 'Anonymous',
      } as TestimonialQueueItem;
    });

    this.testimonialQueue.set(items);
    return items;
  }

  async approveTestimonial(queueId: string, reviewId: string): Promise<boolean> {
    // Optimistic removal from queue signal
    this.testimonialQueue.update((q) => q.filter((item) => item.id !== queueId));

    // 1. Set is_public = true on the review (makes it appear on public profile)
    const { error: reviewErr } = await this.supabase
      .from('trainer_reviews')
      .update({ is_public: true })
      .eq('id', reviewId);

    if (reviewErr) {
      this.error.set(reviewErr.message);
      return false;
    }

    // 2. Update queue status
    const { error: queueErr } = await this.supabase
      .from('testimonial_approval_queue')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('id', queueId);

    if (queueErr) {
      this.error.set(queueErr.message);
    }

    return !reviewErr && !queueErr;
  }

  async rejectTestimonial(queueId: string): Promise<boolean> {
    this.testimonialQueue.update((q) => q.filter((item) => item.id !== queueId));

    const { error } = await this.supabase
      .from('testimonial_approval_queue')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', queueId);

    if (error) {
      this.error.set(error.message);
    }
    return !error;
  }

  // ── Client: load pending NPS ────────────────────────────────────────────────

  async loadPendingNps(): Promise<NpsResponse | null> {
    const { data, error } = await this.supabase.rpc('get_pending_nps');

    if (error || !data) {
      this.pendingNps.set(null);
      return null;
    }

    const pending = data as NpsResponse;
    this.pendingNps.set(pending);
    return pending;
  }

  // ── Client: submit NPS response ─────────────────────────────────────────────

  async submitNpsResponse(
    responseId: string,
    score: number,
    feedbackText?: string | null
  ): Promise<boolean> {
    const { data, error } = await this.supabase.rpc('submit_nps_response', {
      p_response_id:   responseId,
      p_score:         score,
      p_feedback_text: feedbackText ?? null,
    });

    if (error || data === false) {
      this.error.set(error?.message ?? 'Failed to submit NPS');
      return false;
    }

    this.pendingNps.set(null);
    return true;
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  hasPromotablePendingNps(): boolean {
    return this.pendingNps() !== null;
  }
}
