import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Tables } from '@fitos/shared';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message extends Tables<'messages'> {
  sender?: Tables<'profiles'>;
}

export type ConversationType = 'client_coaching' | 'team' | 'group_announcement';

export interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  /** Sprint 62 (EP-07): conversation_type from the messages table */
  conversationType: ConversationType;
}

/**
 * Sprint 62 (EP-07 US-074): Team contact returned by get_team_contacts() RPC.
 * Used to populate the Team tab contact directory.
 */
export interface TeamContact {
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── State signals ─────────────────────────────────────────────
  conversationsSignal   = signal<Conversation[]>([]);
  currentMessagesSignal = signal<Message[]>([]);
  totalUnreadSignal     = signal(0);
  isLoadingSignal       = signal(false);
  errorSignal           = signal<string | null>(null);

  // Sprint 62: Team contacts directory (for New Chat on Team tab)
  teamContactsSignal = signal<TeamContact[]>([]);

  // Sprint 62 (EP-07): Derived signals filtered by conversation_type
  clientConversations = computed(() =>
    this.conversationsSignal().filter(c => c.conversationType === 'client_coaching')
  );
  teamConversations = computed(() =>
    this.conversationsSignal().filter(c => c.conversationType === 'team')
  );

  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    // Auto-subscribe when user is authenticated
    effect(() => {
      const user = this.auth.user();
      if (user) {
        this.subscribeToMessages(user.id);
      } else {
        this.unsubscribe();
      }
    });
  }

  // ── Real-time subscription ────────────────────────────────────

  private subscribeToMessages(userId: string): void {
    this.unsubscribe();

    this.realtimeChannel = this.supabase.client
      .channel(`messages:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload: Record<string, unknown>) => {
          this.handleNewMessage(payload.new as Tables<'messages'>);
        }
      )
      .subscribe();
  }

  private async handleNewMessage(message: Tables<'messages'>): Promise<void> {
    const { data } = await this.supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('id', message.id)
      .single();

    if (data) {
      const currentMessages = this.currentMessagesSignal();
      const isInCurrentConversation =
        currentMessages.length > 0 &&
        (currentMessages[0].sender_id === message.sender_id ||
          currentMessages[0].recipient_id === message.sender_id);

      if (isInCurrentConversation) {
        this.currentMessagesSignal.update(msgs => [...msgs, data as Message]);
      }

      this.totalUnreadSignal.update(count => count + 1);
      await this.loadConversations();
    }
  }

  private unsubscribe(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  // ── Conversations ─────────────────────────────────────────────

  /**
   * Load all conversations (both client_coaching and team).
   * Grouped by (otherUserId, conversationType) pair so the same person
   * can appear in both the Clients tab and the Team tab.
   */
  async loadConversations(): Promise<Conversation[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*), recipient:profiles!messages_recipient_id_fkey(*)')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by (otherUserId + conversationType) so client_coaching vs team
      // messages with the same person appear as separate conversations.
      const conversationMap = new Map<string, Conversation>();

      for (const msg of messages || []) {
        const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        const otherUser   = msg.sender_id === userId ? msg.recipient  : msg.sender;
        const convType    = ((msg as any).conversation_type as ConversationType) ?? 'client_coaching';
        const key         = `${otherUserId}::${convType}`;

        if (!conversationMap.has(key)) {
          conversationMap.set(key, {
            otherUserId,
            otherUserName:    (otherUser as any)?.full_name ?? 'Unknown',
            otherUserAvatar:  (otherUser as any)?.avatar_url ?? null,
            lastMessage:      msg as Message,
            unreadCount:      0,
            conversationType: convType,
          });
        }

        if (msg.recipient_id === userId && !msg.read_at) {
          const conv = conversationMap.get(key);
          if (conv) conv.unreadCount++;
        }
      }

      const conversations = Array.from(conversationMap.values());
      const totalUnread   = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

      this.conversationsSignal.set(conversations);
      this.totalUnreadSignal.set(totalUnread);

      return conversations;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load conversations';
      this.errorSignal.set(message);
      console.error('Error loading conversations:', error);
      return [];
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  // ── Team contacts (EP-07 US-074) ──────────────────────────────

  /**
   * Fetch team contacts via get_team_contacts() RPC (Sprint 62 migration).
   * Returns all facility staff excluding the current user.
   */
  async loadTeamContacts(): Promise<TeamContact[]> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) return [];

      const { data, error } = await this.supabase.client
        .rpc('get_team_contacts', { p_user_id: userId });

      if (error) throw error;

      const contacts = (data ?? []) as TeamContact[];
      this.teamContactsSignal.set(contacts);
      return contacts;
    } catch (error) {
      console.error('Error loading team contacts:', error);
      return [];
    }
  }

  // ── Messages ─────────────────────────────────────────────────

  /**
   * Load messages for a specific conversation, filtered by conversation_type.
   */
  async loadMessages(otherUserId: string, conversationType: ConversationType = 'client_coaching'): Promise<Message[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .eq('conversation_type', conversationType)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.currentMessagesSignal.set((messages || []) as Message[]);
      await this.markAsRead(otherUserId);

      return (messages || []) as Message[];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load messages';
      this.errorSignal.set(message);
      console.error('Error loading messages:', error);
      return [];
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Send a client_coaching message (existing behavior, unchanged).
   */
  async sendMessage(recipientId: string, content: string): Promise<Message | null> {
    return this._send(recipientId, content, 'client_coaching');
  }

  /**
   * Send a team message (EP-07 US-070–073).
   * facility_id is required for RLS to enforce facility scoping.
   */
  async sendTeamMessage(recipientId: string, content: string, facilityId: string): Promise<Message | null> {
    return this._send(recipientId, content, 'team', facilityId);
  }

  private async _send(
    recipientId: string,
    content: string,
    conversationType: ConversationType,
    facilityId?: string,
  ): Promise<Message | null> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) throw new Error('User not authenticated');

      const payload: Record<string, unknown> = {
        sender_id:         userId,
        recipient_id:      recipientId,
        content,
        conversation_type: conversationType,
      };
      if (facilityId) payload['facility_id'] = facilityId;

      const { data, error } = await this.supabase
        .from('messages')
        .insert(payload)
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .single();

      if (error) throw error;

      this.currentMessagesSignal.update(msgs => [...msgs, data as Message]);
      return data as Message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      this.errorSignal.set(message);
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Mark messages from a sender as read
   */
  async markAsRead(senderId: string): Promise<void> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) return;

      const { error } = await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('recipient_id', userId)
        .eq('sender_id', senderId)
        .is('read_at', null);

      if (error) throw error;

      await this.loadConversations();
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }

  /**
   * Delete a message (only if sender)
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) return false;

      const { error } = await this.supabase
        .from('messages')
        .delete()
        .eq('id', messageId)
        .eq('sender_id', userId);

      if (error) throw error;

      this.currentMessagesSignal.update(msgs => msgs.filter(m => m.id !== messageId));
      return true;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Clear service state and unsubscribe
   */
  clearState(): void {
    this.unsubscribe();
    this.conversationsSignal.set([]);
    this.currentMessagesSignal.set([]);
    this.totalUnreadSignal.set(0);
    this.errorSignal.set(null);
    this.isLoadingSignal.set(false);
    this.teamContactsSignal.set([]);
  }
}
