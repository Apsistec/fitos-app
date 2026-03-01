import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MilestoneType = 'pr_set' | 'sessions_completed' | 'streak' | 'custom';

export interface MilestoneBadge {
  id: string;
  trainer_id: string;
  name: string;
  icon: string;
  color: string;
  description: string | null;
}

export interface Milestone {
  id: string;
  client_id: string;
  trainer_id: string | null;
  type: MilestoneType;
  title: string;
  description: string | null;
  value: number | null;
  unit: string | null;
  badge_id: string | null;
  achieved_at: string;
  card_generated: boolean;
}

export interface AwardMilestoneDto {
  title: string;
  description?: string;
  value?: number;
  unit?: string;
  badgeId?: string;
}

// Session count thresholds for auto-award
const SESSION_MILESTONES = [10, 25, 50, 100, 200, 500];

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class MilestoneService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── Signals ────────────────────────────────────────────────────────────
  milestones = signal<Milestone[]>([]);
  isLoading = signal(false);

  /**
   * When set, the UI should display the achievement card for this milestone.
   * Call `dismissCard()` to clear after the user closes/shares the card.
   */
  pendingCard = signal<Milestone | null>(null);

  // ── Read ───────────────────────────────────────────────────────────────

  /** Load all milestones for a client (newest first). */
  async getClientMilestones(clientId: string): Promise<void> {
    this.isLoading.set(true);
    const { data, error } = await this.supabase.client
      .from('milestones')
      .select('*')
      .eq('client_id', clientId)
      .order('achieved_at', { ascending: false });
    this.isLoading.set(false);
    if (!error) {
      this.milestones.set((data ?? []) as Milestone[]);
    }
  }

  // ── Award ──────────────────────────────────────────────────────────────

  /**
   * Award a milestone to a client. Inserts the DB record, updates local state,
   * and sets `pendingCard` so the UI can show the achievement overlay.
   */
  async awardMilestone(
    clientId: string,
    type: MilestoneType,
    dto: AwardMilestoneDto,
  ): Promise<Milestone | null> {
    const trainerId = this.auth.user()?.id ?? null;

    const { data: record, error } = await this.supabase.client
      .from('milestones')
      .insert({
        client_id: clientId,
        trainer_id: trainerId,
        type,
        title: dto.title,
        description: dto.description ?? null,
        value: dto.value ?? null,
        unit: dto.unit ?? null,
        badge_id: dto.badgeId ?? null,
      })
      .select()
      .single();

    if (error) return null;

    const milestone = record as Milestone;
    this.milestones.update((prev) => [milestone, ...prev]);
    this.pendingCard.set(milestone);
    return milestone;
  }

  /**
   * Auto-check and award session-count milestones (10, 25, 50, 100, 200, 500).
   * Safe to call after every session completion — skips already-awarded thresholds.
   */
  async checkAndAwardSessionMilestones(clientId: string): Promise<void> {
    // Fetch completed session count
    const { count: sessionCount } = await this.supabase.client
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('client_id', clientId)
      .eq('status', 'completed');

    if (!sessionCount) return;

    for (const threshold of SESSION_MILESTONES) {
      if (sessionCount < threshold) break; // thresholds are sorted ascending

      // Check if already awarded for this threshold
      const { count: existing } = await this.supabase.client
        .from('milestones')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
        .eq('type', 'sessions_completed')
        .eq('value', threshold);

      if ((existing ?? 0) > 0) continue;

      await this.awardMilestone(clientId, 'sessions_completed', {
        title: `${threshold} Sessions Completed!`,
        description: `You've completed ${threshold} training sessions. Keep crushing it!`,
        value: threshold,
        unit: 'sessions',
      });
    }
  }

  /**
   * Auto-award a PR milestone when a new personal record is set.
   * Call from workout-set logging after `is_pr = true` is confirmed.
   */
  async awardPRMilestone(
    clientId: string,
    exerciseName: string,
    weight: number,
    unit: 'lbs' | 'kg' = 'lbs',
  ): Promise<void> {
    await this.awardMilestone(clientId, 'pr_set', {
      title: `New Personal Record!`,
      description: `${exerciseName} — ${weight} ${unit}`,
      value: weight,
      unit,
    });
  }

  // ── Card lifecycle ──────────────────────────────────────────────────────

  /** Clear the pending card (user dismissed or shared). */
  dismissCard(): void {
    this.pendingCard.set(null);
  }

  /** Mark the card as generated (after share or download). */
  async markCardGenerated(milestoneId: string): Promise<void> {
    await this.supabase.client
      .from('milestones')
      .update({ card_generated: true })
      .eq('id', milestoneId);

    this.milestones.update((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, card_generated: true } : m))
    );
  }

  // ── Custom badges (trainer) ─────────────────────────────────────────────

  /** Load custom badge definitions created by the authenticated trainer. */
  async getMyBadges(): Promise<MilestoneBadge[]> {
    const { data } = await this.supabase.client
      .from('milestone_badges')
      .select('*')
      .order('created_at', { ascending: false });
    return (data ?? []) as MilestoneBadge[];
  }

  /** Create a new custom badge definition. */
  async createBadge(
    name: string,
    icon: string,
    color: string,
    description?: string,
  ): Promise<MilestoneBadge | null> {
    const trainerId = this.auth.user()?.id;
    if (!trainerId) return null;

    const { data, error } = await this.supabase.client
      .from('milestone_badges')
      .insert({ trainer_id: trainerId, name, icon, color, description: description ?? null })
      .select()
      .single();

    return error ? null : (data as MilestoneBadge);
  }
}
