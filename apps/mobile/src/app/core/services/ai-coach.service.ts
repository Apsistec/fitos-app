import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SupabaseService } from './supabase.service';

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
 * AI Coach chat request
 */
interface ChatRequest {
  message: string;
  conversationHistory: Array<{ role: string; content: string }>;
  userContext: UserContext;
}

/**
 * AI Coach chat response
 */
interface ChatResponse {
  response: string;
  agent: string;
  confidence: number;
  shouldEscalate: boolean;
  escalationReason?: string;
}

/**
 * Coach Brain request (trainer methodology-based)
 */
interface CoachBrainRequest {
  trainer_id: string;
  client_id?: string;
  query: string;
}

/**
 * Coach Brain response
 */
interface CoachBrainResponse {
  response: string;
  context_used: Array<{
    content: string;
    input_type: string;
    similarity: number;
  }>;
  error?: string;
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
 * AICoachService - Multi-agent AI coaching integration
 *
 * Features:
 * - Chat with specialized AI agents
 * - Workout, nutrition, recovery, motivation coaching
 * - Conversation history management with Supabase persistence
 * - Auto-escalation to trainer with notification
 * - RAG for personalized context
 *
 * Backend:
 * - FastAPI + LangGraph multi-agent system
 * - Deployed on Google Cloud Run
 * - Uses Anthropic Claude or OpenAI GPT-4
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
  private http = inject(HttpClient);
  private supabase = inject(SupabaseService);

  // AI Backend URL
  private readonly AI_BACKEND_URL = environment.aiBackendUrl || 'http://localhost:8000';

  // State
  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  currentAgent = signal<string | null>(null);
  conversationId = signal<string | null>(null);

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
   * Send message to AI coach
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
        this.persistMessage(convId, userMessage);
      }

      // Prepare conversation history (last 10 messages)
      const history = this.messages()
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call AI backend
      const request: ChatRequest = {
        message,
        conversationHistory: history,
        userContext,
      };

      const response = await firstValueFrom(
        this.http.post<ChatResponse>(`${this.AI_BACKEND_URL}/api/v1/coach/chat`, request)
      );

      // Add assistant message to history
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        agent: response.agent as ChatMessage['agent'],
        confidence: response.confidence,
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

      this.currentAgent.set(response.agent);

      // Persist assistant message
      if (convId) {
        this.persistMessage(convId, assistantMessage);
      }

      // Handle escalation
      if (response.shouldEscalate) {
        console.warn('AI Coach escalating to trainer:', response.escalationReason);
        await this.createEscalation(
          userContext.user_id,
          response.escalationReason || 'AI confidence too low',
          message
        );
      }

      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get AI response';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isProcessing.set(false);
    }
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
   * Send message using Coach Brain (trainer methodology-based responses)
   *
   * This method uses the trainer's specific methodology and voice for responses.
   * Should be used when responding to client questions on behalf of a trainer.
   */
  async sendCoachBrainMessage(
    trainerId: string,
    query: string,
    clientId?: string
  ): Promise<ChatMessage> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        role: 'user',
        content: query,
        timestamp: new Date().toISOString(),
      };
      this.messages.update(msgs => [...msgs, userMessage]);

      // Call Coach Brain API
      const request: CoachBrainRequest = {
        trainer_id: trainerId,
        client_id: clientId,
        query: query,
      };

      const response = await firstValueFrom(
        this.http.post<CoachBrainResponse>(
          `${this.AI_BACKEND_URL}/api/v1/coach-brain/respond`,
          request
        )
      );

      // Add assistant message to history
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        agent: 'general',
        confidence: 0.9, // Coach Brain responses are high confidence
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

      return assistantMessage;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get Coach Brain response';
      this.error.set(errorMessage);
      throw new Error(errorMessage);
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Automatically collect training data from trainer messages
   * Call this whenever a trainer sends a message to learn from their voice
   */
  async collectTrainingData(
    trainerId: string,
    content: string,
    inputType: 'message' | 'program' | 'feedback' | 'note' | 'workout_description',
    sourceId?: string
  ): Promise<boolean> {
    try {
      await firstValueFrom(
        this.http.post(`${this.AI_BACKEND_URL}/api/v1/coach-brain/add-training-data`, {
          trainer_id: trainerId,
          content,
          input_type: inputType,
          source_id: sourceId
        })
      );
      return true;
    } catch (error) {
      console.error('Failed to add training data:', error);
      return false;
    }
  }

}
