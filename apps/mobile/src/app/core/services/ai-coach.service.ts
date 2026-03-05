import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
  private readonly AI_BACKEND_URL = environment.aiBackendUrl || 'http://localhost:8000';

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

  /**
   * Load or create active conversation for user
   */
  async loadConversation(userId: string): Promise<void> {
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

        // Load messages for this conversation
        const { data: msgData, error: msgError } = await this.supabase.client
          .from('ai_conversation_messages')
          .select('*')
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true });

        if (msgError) {
          console.error('Error loading messages:', msgError);
          return;
        }

        if (msgData && msgData.length > 0) {
          const messages: ChatMessage[] = msgData.map((m: Record<string, unknown>) => ({
            id: m.id as string,
            role: m.role as ChatMessage['role'],
            content: m.content as string,
            timestamp: m.created_at as string,
            agent: (m.agent as ChatMessage['agent']) || undefined,
            confidence: (m.confidence as number) || undefined,
          }));
          this.messages.set(messages);

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
   * Create a new conversation
   */
  private async createConversation(userId: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('ai_conversations')
        .insert({
          user_id: userId,
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
   * Persist a message to Supabase
   */
  private async persistMessage(
    conversationId: string,
    message: ChatMessage
  ): Promise<void> {
    try {
      await this.supabase.client
        .from('ai_conversation_messages')
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content,
          agent: message.agent || null,
          confidence: message.confidence || null,
        });
    } catch (err) {
      console.error('Error persisting message:', err);
    }
  }

  /**
   * Send message to AI coach via AI Backend
   */
  async sendMessage(message: string, userContext: UserContext): Promise<ChatMessage> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Ensure we have a conversation
      if (!this.conversationId()) {
        const newId = await this.createConversation(userContext.user_id);
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

      // Build user context payload for AI Backend
      const contextPayload = {
        user_id: userContext.user_id,
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

      // Call AI Backend (routing happens server-side, JWT validated server-side)
      const response = await firstValueFrom(
        this.http.post<AIBackendResponse>(
          `${this.AI_BACKEND_URL}/api/v1/coach/chat`,
          {
            message,
            conversationHistory: history,
            userContext: contextPayload,
          },
          { headers: this.getAuthHeaders() }
        )
      );

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
          userContext.user_id,
          'AI coaching escalation',
          message
        );
      }

      return assistantMessage;
    } catch (err) {
      // Handle 429 Too Many Requests — disable send until Retry-After elapses
      if (err instanceof HttpErrorResponse && err.status === 429) {
        const retryAfter = parseInt(err.headers?.get('Retry-After') || '30', 10);
        this.rateLimited.set(true);
        this.error.set("You're sending messages too quickly. Please wait a moment.");
        setTimeout(() => this.rateLimited.set(false), retryAfter * 1000);
        throw new Error('Rate limited');
      }

      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
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
   * Generate unique message ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
   *
   * @param trainerId - The trainer's user ID
   * @param content   - The message text (caller ensures >= 20 chars)
   * @param source    - Origin of the content ('message' | 'note' | 'session')
   */
  async collectTrainingData(
    trainerId: string,
    content: string,
    source: 'message' | 'note' | 'session' = 'message'
  ): Promise<void> {
    try {
      await this.supabase.client.from('trainer_notes').insert({
        trainer_id: trainerId,
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
