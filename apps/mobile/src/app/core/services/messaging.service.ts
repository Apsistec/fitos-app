import { Injectable, inject, signal, effect } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Tables } from '@fitos/shared';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Message extends Tables<'messages'> {
  sender?: Tables<'profiles'>;
}

export interface Conversation {
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar: string | null;
  lastMessage: Message | null;
  unreadCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State signals
  conversationsSignal = signal<Conversation[]>([]);
  currentMessagesSignal = signal<Message[]>([]);
  totalUnreadSignal = signal(0);
  isLoadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

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

  /**
   * Subscribe to real-time message updates
   */
  private subscribeToMessages(userId: string): void {
    // Unsubscribe from previous channel
    this.unsubscribe();

    // Subscribe to messages where user is sender or recipient
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
        (payload: any) => {
          console.log('New message received:', payload);
          this.handleNewMessage(payload.new as Tables<'messages'>);
        }
      )
      .subscribe();

    console.log('Subscribed to messages for user:', userId);
  }

  /**
   * Handle new message from realtime subscription
   */
  private async handleNewMessage(message: Tables<'messages'>): Promise<void> {
    // Fetch full message with sender info
    const { data } = await this.supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(*)')
      .eq('id', message.id)
      .single();

    if (data) {
      // Add to current messages if viewing that conversation
      const currentMessages = this.currentMessagesSignal();
      const isInCurrentConversation =
        currentMessages.length > 0 &&
        (currentMessages[0].sender_id === message.sender_id ||
          currentMessages[0].recipient_id === message.sender_id);

      if (isInCurrentConversation) {
        this.currentMessagesSignal.update((messages) => [...messages, data as Message]);
      }

      // Update unread count
      this.totalUnreadSignal.update((count) => count + 1);

      // Refresh conversations
      await this.loadConversations();
    }
  }

  /**
   * Unsubscribe from real-time updates
   */
  private unsubscribe(): void {
    if (this.realtimeChannel) {
      this.supabase.client.removeChannel(this.realtimeChannel);
      this.realtimeChannel = null;
    }
  }

  /**
   * Get all conversations for the current user
   */
  async loadConversations(): Promise<Conversation[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const userId = this.auth.user()?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Get all messages where user is sender or recipient
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*), recipient:profiles!messages_recipient_id_fkey(*)')
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by conversation partner
      const conversationMap = new Map<string, Conversation>();

      for (const msg of messages || []) {
        const otherUserId = msg.sender_id === userId ? msg.recipient_id : msg.sender_id;
        const otherUser = msg.sender_id === userId ? msg.recipient : msg.sender;

        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            otherUserId,
            otherUserName: otherUser?.full_name || 'Unknown',
            otherUserAvatar: otherUser?.avatar_url || null,
            lastMessage: msg as Message,
            unreadCount: 0,
          });
        }

        // Count unread messages (where user is recipient and not read)
        if (msg.recipient_id === userId && !msg.read_at) {
          const conv = conversationMap.get(otherUserId)!;
          conv.unreadCount++;
        }
      }

      const conversations = Array.from(conversationMap.values());

      // Calculate total unread
      const totalUnread = conversations.reduce((sum, conv) => sum + conv.unreadCount, 0);

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

  /**
   * Get messages for a specific conversation
   */
  async loadMessages(otherUserId: string): Promise<Message[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const userId = this.auth.user()?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data: messages, error } = await this.supabase
        .from('messages')
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      this.currentMessagesSignal.set((messages || []) as Message[]);

      // Mark messages as read
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
   * Send a message
   */
  async sendMessage(recipientId: string, content: string): Promise<Message | null> {
    try {
      const userId = this.auth.user()?.id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          content,
        })
        .select('*, sender:profiles!messages_sender_id_fkey(*)')
        .single();

      if (error) throw error;

      // Add to current messages
      this.currentMessagesSignal.update((messages) => [...messages, data as Message]);

      return data as Message;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message';
      this.errorSignal.set(message);
      console.error('Error sending message:', error);
      return null;
    }
  }

  /**
   * Mark messages from a user as read
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

      // Update unread count
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
        .eq('sender_id', userId); // Can only delete own messages

      if (error) throw error;

      // Remove from current messages
      this.currentMessagesSignal.update((messages) =>
        messages.filter((m) => m.id !== messageId)
      );

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
  }
}
