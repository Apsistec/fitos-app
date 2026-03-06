/**
 * FitOS Local Database (IndexedDB via Dexie.js)
 *
 * Sprint 65 — Offline Sync Foundation
 * Stores offline-capable entities and a sync queue for background upload.
 */

import Dexie, { type Table } from 'dexie';

/* ────────────────────────────────────────────────────────────
 *  Entity types stored locally
 * ──────────────────────────────────────────────────────────── */

export interface LocalWorkout {
  id: string;
  user_id: string;
  template_id?: string | null;
  name: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped';
  scheduled_date?: string | null;
  completed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  synced_at?: string | null;
  _deleted?: boolean;
}

export interface LocalWorkoutSet {
  id: string;
  workout_id: string;
  workout_exercise_id: string;
  set_number: number;
  reps_completed?: number | null;
  weight_used?: number | null;
  rpe?: number | null;
  notes?: string | null;
  created_at: string;
  synced_at?: string | null;
}

/**
 * Caches the full workout plan (exercises + metadata) so
 * the active-workout page can load entirely from IndexedDB.
 */
export interface ActiveWorkoutCache {
  id: string;                    // workout_id
  workout_name: string;
  exercises_json: string;        // JSON-stringified ExerciseProgress[]
  status: string;
  started_at?: string | null;
  cached_at: string;
}

export interface LocalNutritionLog {
  id: string;
  user_id: string;
  meal_type: string;
  food_name: string;
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
  serving_size?: string | null;
  logged_at: string;
  created_at: string;
  updated_at: string;
  synced_at?: string | null;
}

export interface LocalMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  conversation_type: string;
  read_at?: string | null;
  created_at: string;
  synced_at?: string | null;
}

/* ────────────────────────────────────────────────────────────
 *  Sync queue — FIFO queue of pending server writes
 * ──────────────────────────────────────────────────────────── */

export interface SyncQueueItem {
  id?: number;                   // auto-incremented
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  table: string;                 // Supabase table name
  record_id: string;             // Primary key of the record
  data: Record<string, unknown>; // Payload to send
  timestamp: number;             // Date.now() when queued
  retry_count: number;
  last_error?: string;
}

/* ────────────────────────────────────────────────────────────
 *  Database class
 * ──────────────────────────────────────────────────────────── */

class FitOSDatabase extends Dexie {
  workouts!: Table<LocalWorkout>;
  workout_sets!: Table<LocalWorkoutSet>;
  active_workout_cache!: Table<ActiveWorkoutCache>;
  nutrition_logs!: Table<LocalNutritionLog>;
  messages!: Table<LocalMessage>;
  sync_queue!: Table<SyncQueueItem>;

  constructor() {
    super('FitOSDatabase');

    this.version(1).stores({
      workouts:              'id, user_id, status, scheduled_date, synced_at',
      workout_sets:          'id, workout_id, workout_exercise_id, synced_at',
      active_workout_cache:  'id, cached_at',
      nutrition_logs:        'id, user_id, meal_type, logged_at, synced_at',
      messages:              'id, sender_id, receiver_id, created_at, synced_at',
      sync_queue:            '++id, table, timestamp, retry_count',
    });
  }
}

export const db = new FitOSDatabase();
