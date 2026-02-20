import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * ProgressiveProfilingService
 * Sprint 53.2 — Phase 4D Smart Engagement
 *
 * Manages post-onboarding progressive profiling questions shown
 * on the dashboard (1-2 per session, never interrupting core actions).
 *
 * Question lifecycle:
 *   1. On new user creation → seed questions are inserted into `progressive_profiling_queue`
 *   2. Each session → `getNextQuestions(2)` pulls unanswered, unskipped questions
 *   3. User answers or skips → `submitAnswer()` / `skipQuestion()` updates the row
 *   4. `shouldShowProfiling()` gates display (once per session, skip if onboarding just completed)
 */

export interface ProfilingQuestion {
  id: string;
  question_key: string;
  question_text: string;
  session_number: number;
}

/** Default seed questions for new clients (inserted at onboarding completion) */
const SEED_QUESTIONS: Array<{ question_key: string; question_text: string }> = [
  {
    question_key: 'preferred_workout_time',
    question_text: 'What time of day do you usually work out?',
  },
  {
    question_key: 'equipment_access',
    question_text: 'What equipment do you have access to?',
  },
  {
    question_key: 'fitness_experience',
    question_text: 'How long have you been working out regularly?',
  },
  {
    question_key: 'primary_barrier',
    question_text: "What's your biggest challenge when it comes to staying consistent?",
  },
  {
    question_key: 'support_style',
    question_text: 'How do you prefer to be motivated?',
  },
  {
    question_key: 'injury_history',
    question_text: 'Do you have any injuries or areas we should be careful with?',
  },
  {
    question_key: 'diet_style',
    question_text: 'How would you describe your current eating habits?',
  },
  {
    question_key: 'social_sharing',
    question_text: 'Would you like to share your progress with your trainer?',
  },
];

/** Minimum gap between profiling sessions (ms) — 24 hours */
const SESSION_GAP_MS = 24 * 60 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class ProgressiveProfilingService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  /** Currently loaded questions for this session */
  currentQuestions = signal<ProfilingQuestion[]>([]);

  /** Whether the profiling prompt is actively being shown */
  isShowing = signal(false);

  /** Session-level flag — only show once per app launch */
  private shownThisSession = false;

  /** Timestamp key used in localStorage for session gap tracking */
  private readonly LAST_SHOWN_KEY = 'fitos_profiling_last_shown';

  // ──────────────────────────────────────────────────────────────────────────
  // Public API
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Determines whether profiling should be shown this session.
   * Criteria:
   *  - Not already shown this app launch
   *  - Onboarding is complete (profile.onboarding_completed_at is set)
   *  - At least SESSION_GAP_MS has elapsed since last profiling
   *  - There are unanswered questions remaining
   */
  async shouldShowProfiling(): Promise<boolean> {
    if (this.shownThisSession) return false;

    const profile = this.auth.profile();
    if (!profile) return false;

    // Check onboarding is complete
    if (!(profile as any).onboarding_completed_at) return false;

    // Check session gap
    const lastShown = localStorage.getItem(this.LAST_SHOWN_KEY);
    if (lastShown) {
      const elapsed = Date.now() - parseInt(lastShown, 10);
      if (elapsed < SESSION_GAP_MS) return false;
    }

    // Check if there are questions remaining
    const questions = await this.getNextQuestions(1);
    return questions.length > 0;
  }

  /**
   * Fetches the next N unanswered, unskipped questions for the current user.
   * Returns an empty array if the user is not authenticated.
   */
  async getNextQuestions(count = 2): Promise<ProfilingQuestion[]> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return [];

    const { data, error } = await this.supabase.client
      .from('progressive_profiling_queue')
      .select('id, question_key, question_text, session_number')
      .eq('user_id', userId)
      .is('answered_at', null)
      .eq('skipped', false)
      .order('session_number', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(count);

    if (error || !data) return [];

    const questions = data as ProfilingQuestion[];
    this.currentQuestions.set(questions);
    return questions;
  }

  /**
   * Loads questions for the current session and marks the session as started.
   * Call this when actually presenting the prompt to the user.
   */
  async startSession(): Promise<ProfilingQuestion[]> {
    const questions = await this.getNextQuestions(2);
    if (questions.length > 0) {
      this.shownThisSession = true;
      localStorage.setItem(this.LAST_SHOWN_KEY, Date.now().toString());
      this.isShowing.set(true);
    }
    return questions;
  }

  /**
   * Saves a user's answer for a given question key and marks it answered.
   */
  async submitAnswer(questionId: string, answer: string): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    await this.supabase.client
      .from('progressive_profiling_queue')
      .update({
        answer,
        answered_at: new Date().toISOString(),
      })
      .eq('id', questionId)
      .eq('user_id', userId);

    // Remove from current session list
    this.currentQuestions.update(qs => qs.filter(q => q.id !== questionId));

    // If all answered, close the prompt
    if (this.currentQuestions().length === 0) {
      this.isShowing.set(false);
    }
  }

  /**
   * Marks a question as skipped so it won't be shown again.
   */
  async skipQuestion(questionId: string): Promise<void> {
    const userId = this.auth.currentUser()?.id;
    if (!userId) return;

    await this.supabase.client
      .from('progressive_profiling_queue')
      .update({ skipped: true })
      .eq('id', questionId)
      .eq('user_id', userId);

    this.currentQuestions.update(qs => qs.filter(q => q.id !== questionId));

    if (this.currentQuestions().length === 0) {
      this.isShowing.set(false);
    }
  }

  /**
   * Dismisses the profiling prompt for this session without skipping questions.
   * Questions will be offered again next session (after SESSION_GAP_MS).
   */
  dismiss(): void {
    this.isShowing.set(false);
    this.currentQuestions.set([]);
  }

  /**
   * Seeds the profiling queue for a new user at onboarding completion.
   * Should be called once when `onboarding_completed_at` is first set.
   */
  async seedQuestionsForNewUser(userId: string): Promise<void> {
    const rows = SEED_QUESTIONS.map((q, i) => ({
      user_id:       userId,
      question_key:  q.question_key,
      question_text: q.question_text,
      session_number: Math.floor(i / 2) + 1, // 2 questions per session slot
    }));

    // Use upsert with conflict on (user_id, question_key) to be idempotent
    await this.supabase.client
      .from('progressive_profiling_queue')
      .upsert(rows, { onConflict: 'user_id,question_key', ignoreDuplicates: true });
  }
}
