import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
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
 * User context for AI coaching
 */
export interface UserContext {
  user_id: string;
  role: 'client' | 'trainer';
  goals?: string[];
  fitness_level?: 'beginner' | 'intermediate' | 'advanced';
  preferences?: Record<string, any>;
}

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
 * AICoachService - Multi-agent AI coaching integration
 *
 * Features:
 * - Chat with specialized AI agents
 * - Workout, nutrition, recovery, motivation coaching
 * - Conversation history management
 * - Auto-escalation to trainer
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

  // AI Backend URL
  // TODO: Load from environment
  private readonly AI_BACKEND_URL = environment.aiBackendUrl || 'http://localhost:8000';

  // State
  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  currentAgent = signal<string | null>(null);

  /**
   * Send message to AI coach
   */
  async sendMessage(message: string, userContext: UserContext): Promise<ChatMessage> {
    this.isProcessing.set(true);
    this.error.set(null);

    try {
      // Add user message to history
      const userMessage: ChatMessage = {
        id: this.generateId(),
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      this.messages.update(msgs => [...msgs, userMessage]);

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
        agent: response.agent as any,
        confidence: response.confidence,
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

      this.currentAgent.set(response.agent);

      // Handle escalation
      if (response.shouldEscalate) {
        console.warn('AI Coach escalating to trainer:', response.escalationReason);
        // TODO: Notify trainer
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
   * Clear conversation history
   */
  clearHistory(): void {
    this.messages.set([]);
    this.currentAgent.set(null);
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

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.messages.set([]);
    this.currentAgent.set(null);
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
}

