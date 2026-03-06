import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom, timeout, retry, timer } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agent?: 'workout' | 'nutrition' | 'recovery' | 'motivation' | 'general';
  confidence?: number;
}

/**
 * Base user context for AI coaching
 */
export interface BaseUserContext {
  user_id: string;
  preferences?: Record<string, unknown>;
}

/**
 * Client-specific user context for AI coaching
 */
export interface ClientUserContext extends BaseUserContext {
  role: 'client';
  goals?: string[];
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  trainer_id?: string;
  injuries_notes?: string | null;
  current_streak?: number;
  weekly_adherence?: number;
  resting_hr?: number | null;
  hrv?: number | null;
  sleep_hours?: number | null;
}

/**
 * Trainer-specific user context for AI coaching
 */
export interface TrainerUserContext extends BaseUserContext {
  role: 'trainer';
  specializations?: string[];
  client_count?: number;
}

/**
 * Union type for all user contexts
 */
export type UserContext = ClientUserContext | TrainerUserContext;

/**
 * Response shape from the AI Backend
 */
interface AIBackendResponse {
  message: string;
  agentSource: string;
  actions: any[] | null;
  shouldEscalate: boolean;
}

/**
 * Conversation metadata from Supabase
 */
interface ConversationRecord {
  id: string;
  user_id: string;
  title: string | null;
  is_active: boolean;
  last_agent: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * AICoachService - AI coaching via FastAPI/LangGraph backend
 *
 * Architecture:
 * - Calls AI Backend (FastAPI on Cloud Run) via HTTP
 * - API key stays server-side (never touches client)
 * - Multi-agent routing done server-side in coach_graph.py
 * - Conversation persistence owned by mobile app (Supabase)
 *
 * Features:
 * - Chat with specialized AI agents (workout, nutrition, recovery, motivation)
 * - Conversation history management with Supabase persistence
 * - Auto-escalation to trainer with notification
 * - Cost-optimized model routing (Haiku for simple, Sonnet for complex)
 *
 * Usage:
 * ```typescript
 * const response = await aiCoach.sendMessage('How much protein should I eat?');
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class AICoachService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private readonly AI_BACKEND_URL = (() => {
    if (!environment.aiBackendUrl) {
      throw new Error('AI Backend URL is not configured. Set aiBackendUrl in environment.');
    }
    return environment.aiBackendUrl;
  })();

  /**
   * Build Authorization headers with the current Supabase JWT.
   * All AI Backend calls must include this to pass server-side JWT validation.
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.auth.accessToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token ?? ''}`,
      'Content-Type': 'application/json',
    });
  }

  // State
  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  currentAgent = signal<string | null>(null);
  conversationId = signal<string | null>(null);

  /** True while the backend has rate-limited this user (429). Resets after Retry-After elapses. */
  rateLimited = signal(false);

  /** True when AI backend is unreachable after multiple consecutive failures. Resets after 60s. */
  aiUnavailable = signal(false);

  /** Track consecutive failures for circuit breaker pattern */
  private consecutiveFailures = 0;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 3;
  private readonly REQUEST_TIMEOUT_MS = 30_000;

  /** Message IDs that failed to persist and are pending sync */
  pendingMessages = signal<Set<string>>(new Set());

  /** Queue of messages awaiting retry */
  private pendingQueue: { conversationId: string; message: ChatMessage }[] = [];

  /** Page size for conversation history pagination */
  private readonly PAGE_SIZE = 50;

  /** Whether there are older messages available to load */
  hasEarlierMessages = signal(false);

  /**
   * Load or create active conversation for the authenticated user.
   * User ID is derived from the auth session — never caller-supplied.
   */
  async loadConversation(): Promise<void> {
    const sessionUser = this.auth.user();
    if (!sessionUser) return;
    const userId = sessionUser.id;

    try {
      // Try to find an active conversation
      const { data: conversations, error } = await this.supabase.client
        .from('ai_conversations')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('updated_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error loading conversation:', error);
        return;
      }

      if (conversations && conversations.length > 0) {
        const conversation = conversations[0] as ConversationRecord;
        this.conversationId.set(conversation.id);

        // Load last PAGE_SIZE messages (paginated — newest first, then reverse for display)
        const { data: msgData, error: msgError, count } = await this.supabase.client
          .from('ai_conversation_messages')
          .select('*', { count: 'exact' })
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: false })
          .range(0, this.PAGE_SIZE - 1);

        if (msgError) {
          console.error('Error loading messages:', msgError);
          return;
        }

        if (msgData && msgData.length > 0) {
          // Reverse to chronological order for display
          const messages: ChatMessage[] = msgData.reverse().map((m: Record<string, unknown>) => ({
            id: m.id as string,
            role: m.role as ChatMessage['role'],
            content: m.content as string,
            timestamp: m.created_at as string,
            agent: (m.agent as ChatMessage['agent']) || undefined,
            confidence: (m.confidence as number) || undefined,
          }));
          this.messages.set(messages);

          // Track if there are older messages to load
          this.hasEarlierMessages.set((count ?? 0) > this.PAGE_SIZE);

          // Restore last agent
          if (conversation.last_agent) {
            this.currentAgent.set(conversation.last_agent);
          }
        }
      }
    } catch (err) {
      console.error('Error in loadConversation:', err);
    }
  }

  /**
   * Load earlier messages for the current conversation (pagination).
   * Prepends older messages to the beginning of the message list.
   */
  async loadEarlierMessages(): Promise<void> {
    const convId = this.conversationId();
    if (!convId || !this.hasEarlierMessages()) return;

    const currentMessages = this.messages();
    const currentCount = currentMessages.length;

    try {
      const { data: msgData, error: msgError, count } = await this.supabase.client
        .from('ai_conversation_messages')
        .select('*', { count: 'exact' })
        .eq('conversation_id', convId)
        .order('created_at', { ascending: false })
        .range(currentCount, currentCount + this.PAGE_SIZE - 1);

      if (msgError) {
        console.error('Error loading earlier messages:', msgError);
        return;
      }

      if (msgData && msgData.length > 0) {
        // Reverse to chronological order and prepend
        const olderMessages: ChatMessage[] = msgData.reverse().map((m: Record<string, unknown>) => ({
          id: m.id as string,
          role: m.role as ChatMessage['role'],
          content: m.content as string,
          timestamp: m.created_at as string,
          agent: (m.agent as ChatMessage['agent']) || undefined,
          confidence: (m.confidence as number) || undefined,
        }));

        this.messages.set([...olderMessages, ...currentMessages]);
        this.hasEarlierMessages.set((count ?? 0) > currentCount + msgData.length);
      } else {
        this.hasEarlierMessages.set(false);
      }
    } catch (err) {
      console.error('Error in loadEarlierMessages:', err);
    }
  }

  /**
   * Create a new conversation for the authenticated user.
   */
  private async createConversation(): Promise<string | null> {
    const sessionUser = this.auth.user();
    if (!sessionUser) return null;

    try {
      const { data, error } = await this.supabase.client
        .from('ai_conversations')
        .insert({
          user_id: sessionUser.id,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        return null;
      }

      return data?.id || null;
    } catch (err) {
      console.error('Error in createConversation:', err);
      return null;
    }
  }

  /**
   * Persist a message to Supabase with retry on failure.
   * On first failure: retries once after 2 seconds.
   * On second failure: marks message as "pending sync" for manual retry.
   */
  private async persistMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<void> {
    const payload = {
      conversation_id: conversationId,
      role: message.role,
      content: message.content,
      agent: message.agent || null,
      confidence: message.confidence || null,
    };

    try {
      const { error } = await this.supabase.client
        .from('ai_conversation_messages')
        .insert(payload);
      if (error) throw error;
    } catch (firstErr) {
      console.warn('[AICoachService] Message persist failed, retrying in 2s:', firstErr);

      // Wait 2 seconds then retry once
      await new Promise(resolve => setTimeout(resolve, 2000));

      try {
        const { error } = await this.supabase.client
          .from('ai_conversation_messages')
          .insert(payload);
        if (error) throw error;
      } catch (secondErr) {
        console.error('[AICoachService] Message persist retry failed:', secondErr);
        // Mark as pending sync
        this.markMessagePending(message.id);
        this.pendingQueue.push({ conversationId, message });
      }
    }
  }

  /**
   * Mark a message as pending sync (failed to persist)
   */
  private markMessagePending(messageId: string): void {
    this.pendingMessages.update(pending => {
      const updated = new Set(pending);
      updated.add(messageId);
      return updated;
    });
  }

  /**
   * Retry persisting all pending messages in FIFO order.
   * Call this on reconnection or when the user taps "Retry".
   */
  async retryPendingMessages(): Promise<void> {
    const queue = [...this.pendingQueue];
    this.pendingQueue = [];

    for (const item of queue) {
      try {
        const { error } = await this.supabase.client
          .from('ai_conversation_messages')
          .insert({
            conversation_id: item.conversationId,
            role: item.message.role,
            content: item.message.content,
            agent: item.message.agent || null,
            confidence: item.message.confidence || null,
          });

        if (error) throw error;

        // Remove from pending set on success
        this.pendingMessages.update(pending => {
          const updated = new Set(pending);
          updated.delete(item.message.id);
          return updated;
        });
      } catch (err) {
        console.error('[AICoachService] Retry failed for message:', item.message.id, err);
        // Put back in queue
        this.pendingQueue.push(item);
      }
    }
  }

  /**
   * Send message to AI coach via AI Backend.
   * User identity is derived from auth session — userContext.user_id is overridden.
   */
  async sendMessage(message: string, userContext: Omit<UserContext, 'user_id'>): Promise<ChatMessage> {
    const sessionUser = this.auth.user();
    if (!sessionUser) throw new Error('User not authenticated');

    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Ensure we have a conversation
      if (!this.conversationId()) {
        const newId = await this.createConversation();
        if (newId) {
          this.conversationId.set(newId);
        }
      }

      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      this.messages.update(msgs => [...msgs, userMessage]);

      // Persist user message
      const convId = this.conversationId();
      if (convId) {
        await this.persistMessage(convId, userMessage);
      }

      // Prepare conversation history (last 10 messages)
      const history = this.messages()
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Build user context payload for AI Backend — always use session user ID
      const contextPayload = {
        user_id: sessionUser.id,
        role: userContext.role,
        goals: ('goals' in userContext) ? userContext.goals : [],
        fitness_level: ('fitness_level' in userContext) ? userContext.fitness_level : 'intermediate',
        trainer_id: ('trainer_id' in userContext) ? userContext.trainer_id : null,
        injuries_notes: ('injuries_notes' in userContext) ? userContext.injuries_notes : null,
        current_streak: ('current_streak' in userContext) ? userContext.current_streak : 0,
        weekly_adherence: ('weekly_adherence' in userContext) ? userContext.weekly_adherence : 0.0,
        resting_hr: ('resting_hr' in userContext) ? userContext.resting_hr : null,
        hrv: ('hrv' in userContext) ? userContext.hrv : null,
        sleep_hours: ('sleep_hours' in userContext) ? userContext.sleep_hours : null,
      };

      // Circuit breaker: fail fast if backend is known to be down
      if (this.aiUnavailable()) {
        throw Object.assign(new Error('Coach is temporarily unavailable. Please try again shortly.'), { name: 'CircuitOpen' });
      }

      // Call AI Backend (routing happens server-side, JWT validated server-side)
      // 30s timeout per attempt, exponential backoff retry (max 2 retries)
      const response = await firstValueFrom(
        this.http.post<AIBackendResponse>(
          `${this.AI_BACKEND_URL}/api/v1/coach/chat`,
          {
            message,
            conversationHistory: history,
            userContext: contextPayload,
          },
          { headers: this.getAuthHeaders() }
        ).pipe(
          timeout(this.REQUEST_TIMEOUT_MS),
          retry({
            count: 2,
            delay: (err, attempt) => {
              // Don't retry 4xx client errors (except 429 which is rate limiting)
              if (err instanceof HttpErrorResponse && err.status >= 400 && err.status < 500 && err.status !== 429) {
                throw err;
              }
              return timer(Math.pow(2, attempt) * 1000);
            },
          }),
        )
      );

      // Reset circuit breaker on success
      this.consecutiveFailures = 0;
      if (this.aiUnavailable()) {
        this.aiUnavailable.set(false);
      }

      const assistantContent = response.message || 'I apologize, but I had trouble processing that. Could you rephrase?';
      const agent = response.agentSource as ChatMessage['agent'] || 'general';

      // Update current agent from backend response
      this.currentAgent.set(agent || null);

      // Add assistant message to history
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        agent,
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

      // Persist assistant message
      if (convId) {
        await this.persistMessage(convId, assistantMessage);
      }

      // Check if escalation needed (backend + client-side check)
      const shouldEscalate = response.shouldEscalate || this.checkEscalation(message, assistantContent);
      if (shouldEscalate) {
        await this.createEscalation(
          sessionUser.id,
          'AI coaching escalation',
          message
        );
      }

      return assistantMessage;
    } catch (err: unknown) {
      // Handle 429 Too Many Requests — disable send until Retry-After elapses
      if (err instanceof HttpErrorResponse && err.status === 429) {
        const retryAfter = parseInt(err.headers?.get('Retry-After') || '30', 10);
        this.rateLimited.set(true);
        this.error.set("You're sending messages too quickly. Please wait a moment.");
        setTimeout(() => this.rateLimited.set(false), retryAfter * 1000);
        throw new Error('Rate limited');
      }

      // Circuit breaker already open — don't increment
      if ((err as Error)?.name === 'CircuitOpen') {
        this.error.set('Coach is temporarily unavailable. Please try again shortly.');
        throw err;
      }

      // Track consecutive failures for circuit breaker
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.CIRCUIT_BREAKER_THRESHOLD) {
        this.aiUnavailable.set(true);
        setTimeout(() => {
          this.aiUnavailable.set(false);
          this.consecutiveFailures = 0;
        }, 60_000);
      }

      // Timeout-specific message
      if ((err as Error)?.name === 'TimeoutError') {
        this.error.set('AI is taking longer than usual, please try again.');
      } else if (this.aiUnavailable()) {
        this.error.set('Coach is temporarily unavailable. Please try again shortly.');
      } else {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
        this.error.set(errorMessage);
      }
      throw err;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Check if message should be escalated to trainer
   */
  private checkEscalation(userMessage: string, aiResponse: string): boolean {
    const messageLower = userMessage.toLowerCase();

    // Escalate on pain/injury mentions
    const injuryKeywords = ['pain', 'hurt', 'injured', 'injury', 'doctor', 'medical'];
    if (injuryKeywords.some(keyword => messageLower.includes(keyword))) {
      return true;
    }

    // Escalate if AI expresses uncertainty
    const uncertaintyPhrases = ['not sure', 'recommend consulting', 'speak with your trainer', 'I apologize'];
    if (uncertaintyPhrases.some(phrase => aiResponse.toLowerCase().includes(phrase))) {
      return true;
    }

    return false;
  }

  /**
   * Create an escalation record when AI can't confidently answer
   */
  private async createEscalation(
    clientId: string,
    reason: string,
    messageContent: string
  ): Promise<void> {
    try {
      // Find the client's trainer
      const { data: profile } = await this.supabase.client
        .from('profiles')
        .select('trainer_id')
        .eq('id', clientId)
        .single();

      const trainerId = profile?.trainer_id || null;

      await this.supabase.client
        .from('ai_escalations')
        .insert({
          conversation_id: this.conversationId(),
          client_id: clientId,
          trainer_id: trainerId,
          reason,
          message_content: messageContent,
          status: 'pending',
        });

      console.log('Escalation created for trainer:', trainerId);
    } catch (err) {
      console.error('Error creating escalation:', err);
    }
  }

  /**
   * Clear conversation history and start a new conversation
   */
  async clearHistory(): Promise<void> {
    // Mark current conversation as inactive
    const convId = this.conversationId();
    if (convId) {
      try {
        await this.supabase.client
          .from('ai_conversations')
          .update({ is_active: false })
          .eq('id', convId);
      } catch (err) {
        console.error('Error deactivating conversation:', err);
      }
    }

    this.messages.set([]);
    this.currentAgent.set(null);
    this.conversationId.set(null);
  }

  /**
   * Generate unique message ID using cryptographically secure randomness.
   */
  private generateId(): string {
    return `msg_${crypto.randomUUID()}`;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }

  /**
   * Collect a trainer message as potential training data for Coach Brain.
   * Stores the message text in trainer_notes with source='message' for
   * future fine-tuning / methodology learning. Fire-and-forget safe.
   * Trainer ID is derived from the authenticated session.
   *
   * @param content   - The message text (caller ensures >= 20 chars)
   * @param source    - Origin of the content ('message' | 'note' | 'session')
   */
  async collectTrainingData(
    content: string,
    source: 'message' | 'note' | 'session' = 'message'
  ): Promise<void> {
    const sessionUser = this.auth.user();
    if (!sessionUser) return;

    try {
      await this.supabase.client.from('trainer_notes').insert({
        trainer_id: sessionUser.id,
        content,
        source,
        created_at: new Date().toISOString(),
      });
    } catch (err) {
      // Deliberately silent — caller uses .catch() for observability
      console.warn('[AICoachService] collectTrainingData failed silently:', err);
    }
  }
}
