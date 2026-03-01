import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AssignmentStatus = 'active' | 'completed' | 'paused';

/** Row from program_assignments joined with product + trainer info. */
export interface ProgramAssignment {
  assignment_id:  string;
  status:         AssignmentStatus;
  assigned_at:    string;
  note:           string | null;
  trainer_name:   string;
  product_id:     string;
  product_title:  string;
  product_type:   string;
  thumbnail_url:  string | null;
  file_urls:      string[];
}

/** Minimal record for a trainer-side assignment list view. */
export interface TrainerAssignment {
  id:          string;
  product_id:  string;
  client_id:   string;
  note:        string | null;
  status:      AssignmentStatus;
  assigned_at: string;
  client_name?: string;
  product_title?: string;
}

@Injectable({ providedIn: 'root' })
export class ProgramAssignmentService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── Client-side state (my assigned programs) ─────────────────────────────
  readonly myAssignments  = signal<ProgramAssignment[]>([]);
  readonly isLoading      = signal(false);
  readonly error          = signal<string | null>(null);

  // ── Trainer-side state (assignments I've made) ───────────────────────────
  readonly trainerAssignments = signal<TrainerAssignment[]>([]);

  // ─── Client: fetch my assigned programs ────────────────────────────────────

  async getMyAssignments(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .rpc('get_client_program_assignments', { p_client_id: user.id });

      if (error) throw error;

      this.myAssignments.set(
        (data ?? []).map((row: ProgramAssignment) => ({
          ...row,
          file_urls: Array.isArray(row.file_urls) ? row.file_urls : [],
        }))
      );
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? 'Failed to load assignments');
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Trainer: assign a template_bundle product to a client ─────────────────

  async assignToClient(
    productId: string,
    clientId: string,
    note?: string
  ): Promise<boolean> {
    const user = this.auth.user();
    if (!user) return false;

    try {
      const { error } = await this.supabase.client
        .from('program_assignments')
        .upsert(
          {
            product_id: productId,
            trainer_id: user.id,
            client_id:  clientId,
            note:       note ?? null,
            status:     'active',
            assigned_at: new Date().toISOString(),
            // clear completed_at if re-assigning
            completed_at: null,
          },
          { onConflict: 'product_id,client_id' }
        );

      if (error) throw error;
      return true;
    } catch {
      return false;
    }
  }

  // ─── Trainer: fetch all assignments made by this trainer ───────────────────

  async getTrainerAssignments(productId?: string): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    try {
      let query = this.supabase.client
        .from('program_assignments')
        .select(`
          id,
          product_id,
          client_id,
          note,
          status,
          assigned_at,
          profiles!program_assignments_client_id_fkey ( full_name ),
          digital_products ( title )
        `)
        .eq('trainer_id', user.id)
        .order('assigned_at', { ascending: false });

      if (productId) {
        query = query.eq('product_id', productId);
      }

      const { data, error } = await query;
      if (error) throw error;

      this.trainerAssignments.set(
        (data ?? []).map((row: TrainerAssignment & {
          profiles?: { full_name?: string };
          digital_products?: { title?: string };
        }) => ({
          id:            row.id,
          product_id:    row.product_id,
          client_id:     row.client_id,
          note:          row.note,
          status:        row.status,
          assigned_at:   row.assigned_at,
          client_name:   row.profiles?.full_name,
          product_title: row.digital_products?.title,
        }))
      );
    } catch {
      // non-fatal — trainer view degrades gracefully
    }
  }

  // ─── Update assignment status ───────────────────────────────────────────────

  async updateStatus(
    assignmentId: string,
    status: AssignmentStatus
  ): Promise<boolean> {
    try {
      const updates: Record<string, unknown> = { status };
      if (status === 'completed') {
        updates['completed_at'] = new Date().toISOString();
      }

      const { error } = await this.supabase.client
        .from('program_assignments')
        .update(updates)
        .eq('id', assignmentId);

      if (error) throw error;

      // Optimistic update on client-side signal
      this.myAssignments.update((list) =>
        list.map((a) =>
          a.assignment_id === assignmentId ? { ...a, status } : a
        )
      );

      return true;
    } catch {
      return false;
    }
  }

  // ─── Remove an assignment (trainer only) ───────────────────────────────────

  async removeAssignment(assignmentId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('program_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;

      this.trainerAssignments.update((list) =>
        list.filter((a) => a.id !== assignmentId)
      );

      return true;
    } catch {
      return false;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** True if the given product is already assigned to the given client. */
  isAssigned(productId: string, clientId: string): boolean {
    return this.trainerAssignments().some(
      (a) => a.product_id === productId && a.client_id === clientId && a.status === 'active'
    );
  }
}
