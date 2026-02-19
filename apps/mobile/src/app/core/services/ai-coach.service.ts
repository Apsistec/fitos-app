import { Injectable, inject, signal } from '@angular/core';
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
 * AICoachService - Client-side AI coaching with Claude Max
 *
 * Architecture:
 * - NO separate AI backend required
 * - Calls Anthropic API directly from client
 * - API key fetched securely from Supabase Edge Function
 * - Uses Claude Max subscription (no per-token charges)
 * - Multi-agent routing done client-side
 *
 * Features:
 * - Chat with specialized AI agents
 * - Workout, nutrition, recovery, motivation coaching
 * - Conversation history management with Supabase persistence
 * - Auto-escalation to trainer with notification
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

  // State
  messages = signal<ChatMessage[]>([]);
  isProcessing = signal(false);
  error = signal<string | null>(null);
  currentAgent = signal<string | null>(null);
  conversationId = signal<string | null>(null);

  // Cache API key to avoid repeated Edge Function calls
  private apiKeyCache: { key: string; timestamp: number } | null = null;
  private readonly API_KEY_CACHE_TTL = 3600000; // 1 hour

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
   * Get Anthropic API configuration from Supabase Edge Function
   * Uses Claude Max subscription
   */
  private async getAnthropicConfig(): Promise<{ key: string; models: any } | null> {
    // Check cache first
    const now = Date.now();
    if (this.apiKeyCache && (now - this.apiKeyCache.timestamp) < this.API_KEY_CACHE_TTL) {
      return { key: this.apiKeyCache.key, models: {} };
    }

    try {
      const { data, error } = await this.supabase.client.functions.invoke('anthropic-key');

      if (error) {
        console.error('Error fetching Anthropic config:', error);
        return null;
      }

      // Cache the API key
      if (data?.key) {
        this.apiKeyCache = {
          key: data.key,
          timestamp: now,
        };
      }

      return data;
    } catch (err) {
      console.error('Error in getAnthropicConfig:', err);
      return null;
    }
  }

  /**
   * Route user query to appropriate specialist agent
   * Simple keyword-based routing (client-side)
   */
  private routeQuery(message: string): string {
    const messageLower = message.toLowerCase();

    // Workout keywords
    const workoutKeywords = ['workout', 'exercise', 'training', 'set', 'rep', 'weight', 'squat', 'deadlift', 'bench'];
    if (workoutKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'workout';
    }

    // Nutrition keywords
    const nutritionKeywords = ['food', 'eat', 'protein', 'calorie', 'macro', 'diet', 'meal', 'nutrition'];
    if (nutritionKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'nutrition';
    }

    // Recovery keywords
    const recoveryKeywords = ['sleep', 'rest', 'sore', 'tired', 'recovery', 'hrv', 'heart rate'];
    if (recoveryKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'recovery';
    }

    // Motivation keywords
    const motivationKeywords = ['motivation', 'struggle', 'skip', 'quit', 'hard', 'difficult', 'give up'];
    if (motivationKeywords.some(keyword => messageLower.includes(keyword))) {
      return 'motivation';
    }

    return 'general';
  }

  /**
   * Get system prompt for specific agent
   */
  private getAgentSystemPrompt(agent: string, userContext: UserContext): string {
    const baseContext = `You are a fitness coaching assistant. User role: ${userContext.role}.`;

    const prompts: Record<string, string> = {
      workout: `${baseContext} You specialize in workout programming, exercise technique, and training adaptations. Provide evidence-based guidance.`,
      nutrition: `${baseContext} You specialize in sports nutrition. IMPORTANT: Use adherence-neutral language. Never use red/danger colors for being over target - use purple instead. Focus on sustainable habits.`,
      recovery: `${baseContext} You specialize in recovery, sleep, and stress management. Help interpret HRV and readiness scores.`,
      motivation: `${baseContext} You specialize in behavior change and motivation. Use evidence-based techniques from Michie's BCT Taxonomy.`,
      general: `${baseContext} You are a general fitness coach. Route complex questions to appropriate specialists or suggest escalating to the user's trainer.`,
    };

    return prompts[agent] || prompts.general;
  }

  /**
   * Send message to AI coach (client-side)
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

      // Route to appropriate agent
      const agent = this.routeQuery(message);
      this.currentAgent.set(agent);

      // Get Anthropic API config
      const config = await this.getAnthropicConfig();
      if (!config) {
        throw new Error('Failed to get AI configuration');
      }

      // Prepare conversation history (last 10 messages)
      const history = this.messages()
        .slice(-10)
        .map(msg => ({
          role: msg.role,
          content: msg.content,
        }));

      // Call Anthropic API directly from client
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.key,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250514', // Latest Sonnet 4.5 from Claude Max
          max_tokens: 2048,
          system: this.getAgentSystemPrompt(agent, userContext),
          messages: history,
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.statusText}`);
      }

      const data = await response.json();
      const assistantContent = data.content[0]?.text || 'I apologize, but I had trouble processing that. Could you rephrase?';

      // Add assistant message to history
      const assistantMessage: ChatMessage = {
        id: this.generateId(),
        role: 'assistant',
        content: assistantContent,
        timestamp: new Date().toISOString(),
        agent: agent as ChatMessage['agent'],
        confidence: 0.9, // Client-side routing has fixed confidence
      };
      this.messages.update(msgs => [...msgs, assistantMessage]);

      // Persist assistant message
      if (convId) {
        await this.persistMessage(convId, assistantMessage);
      }

      // Check if escalation needed
      const shouldEscalate = this.checkEscalation(message, assistantContent);
      if (shouldEscalate) {
        await this.createEscalation(
          userContext.user_id,
          'AI coaching escalation',
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
}
