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
}
