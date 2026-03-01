import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AccountabilityGroup {
  id:          string;
  trainer_id:  string;
  name:        string;
  description: string | null;
  emoji:       string;
  max_members: number;
  is_active:   boolean;
  created_at:  string;
  updated_at:  string;
  /** Populated via join for trainer list views */
  member_count?: number;
}

export interface GroupMember {
  id:        string;
  group_id:  string;
  client_id: string;
  joined_at: string;
  /** Populated via join */
  full_name?: string;
  avatar_url?: string;
}

export interface PodActivityRow {
  group_id:          string;
  group_name:        string;
  group_emoji:       string;
  member_id:         string;
  display_name:      string;
  workouts_this_week: number;
  sessions_this_week: number;
  last_active:       string | null;
}

export interface CreateGroupDto {
  name:        string;
  description?: string;
  emoji?:      string;
  max_members?: number;
}

@Injectable({ providedIn: 'root' })
export class AccountabilityGroupService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ── Trainer state ──────────────────────────────────────────────────────────
  readonly groups      = signal<AccountabilityGroup[]>([]);
  readonly members     = signal<GroupMember[]>([]);
  readonly isLoading   = signal(false);
  readonly error       = signal<string | null>(null);

  // ── Client state ──────────────────────────────────────────────────────────
  readonly podActivity = signal<PodActivityRow[]>([]);

  // ─── Trainer: Group CRUD ────────────────────────────────────────────────────

  async getMyGroups(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('accountability_groups')
        .select(`
          *,
          accountability_group_members ( count )
        `)
        .eq('trainer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.groups.set(
        (data ?? []).map((g: AccountabilityGroup & { accountability_group_members?: { count: number }[] }) => ({
          ...g,
          member_count: g.accountability_group_members?.[0]?.count ?? 0,
        }))
      );
    } catch (err: unknown) {
      this.error.set((err as Error).message ?? 'Failed to load groups');
    } finally {
      this.isLoading.set(false);
    }
  }

  async createGroup(dto: CreateGroupDto): Promise<AccountabilityGroup | null> {
    const user = this.auth.user();
    if (!user) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('accountability_groups')
        .insert({
          trainer_id:  user.id,
          name:        dto.name,
          description: dto.description ?? null,
          emoji:       dto.emoji ?? '💪',
          max_members: dto.max_members ?? 6,
        })
        .select()
        .single();

      if (error) throw error;

      const group: AccountabilityGroup = { ...data, member_count: 0 };
      this.groups.update((list) => [group, ...list]);
      return group;
    } catch {
      return null;
    }
  }

  async updateGroup(id: string, updates: Partial<CreateGroupDto & { is_active: boolean }>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('accountability_groups')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this.groups.update((list) =>
        list.map((g) => (g.id === id ? { ...g, ...updates } : g))
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteGroup(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('accountability_groups')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.groups.update((list) => list.filter((g) => g.id !== id));
      return true;
    } catch {
      return false;
    }
  }

  // ─── Trainer: Member management ─────────────────────────────────────────────

  async getGroupMembers(groupId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase.client
        .from('accountability_group_members')
        .select(`
          *,
          profiles ( full_name, avatar_url )
        `)
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      this.members.set(
        (data ?? []).map((m: GroupMember & { profiles?: { full_name?: string; avatar_url?: string } }) => ({
          id:        m.id,
          group_id:  m.group_id,
          client_id: m.client_id,
          joined_at: m.joined_at,
          full_name: m.profiles?.full_name,
          avatar_url: m.profiles?.avatar_url,
        }))
      );
    } catch {
      this.members.set([]);
    }
  }

  async addMember(groupId: string, clientId: string): Promise<boolean> {
    // Check max_members constraint
    const group = this.groups().find((g) => g.id === groupId);
    if (group && (group.member_count ?? 0) >= group.max_members) {
      return false; // Group is full
    }

    try {
      const { error } = await this.supabase.client
        .from('accountability_group_members')
        .insert({ group_id: groupId, client_id: clientId });

      if (error) throw error;

      // Update count on local group
      this.groups.update((list) =>
        list.map((g) =>
          g.id === groupId ? { ...g, member_count: (g.member_count ?? 0) + 1 } : g
        )
      );

      return true;
    } catch {
      return false;
    }
  }

  async removeMember(groupId: string, clientId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('accountability_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('client_id', clientId);

      if (error) throw error;

      this.members.update((list) =>
        list.filter((m) => !(m.group_id === groupId && m.client_id === clientId))
      );

      this.groups.update((list) =>
        list.map((g) =>
          g.id === groupId ? { ...g, member_count: Math.max(0, (g.member_count ?? 1) - 1) } : g
        )
      );

      return true;
    } catch {
      return false;
    }
  }

  // ─── Client: Pod activity feed ──────────────────────────────────────────────

  async loadPodActivity(): Promise<void> {
    const user = this.auth.user();
    if (!user) return;

    this.isLoading.set(true);

    try {
      const { data, error } = await this.supabase.client
        .rpc('get_pod_activity_feed', { p_client_id: user.id });

      if (error) throw error;
      this.podActivity.set(data ?? []);
    } catch {
      this.podActivity.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  isGroupFull(groupId: string): boolean {
    const group = this.groups().find((g) => g.id === groupId);
    if (!group) return false;
    return (group.member_count ?? 0) >= group.max_members;
  }

  isClientInGroup(groupId: string, clientId: string): boolean {
    return this.members().some(
      (m) => m.group_id === groupId && m.client_id === clientId
    );
  }
}
