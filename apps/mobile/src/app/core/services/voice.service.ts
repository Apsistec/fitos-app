import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Voice Service for FitOS
 * Handles voice-to-text for workout and nutrition logging
 * Uses Deepgram Nova-3 for speech recognition with keyterm boosting
 */

export type VoiceContext = 'workout' | 'nutrition';

export interface VoiceConfig {
  language?: string;
  model?: string;
  keywords?: string[];
  endpointing?: number;
  context?: VoiceContext;
}

export interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export interface ParsedWorkoutCommand {
  type: 'log_set' | 'repeat' | 'skip' | 'next' | 'rest' | 'done' | 'unknown';
  reps?: number;
  weight?: number;
  unit?: 'lbs' | 'kg';
  duration?: number;
}

export interface ParsedNutritionCommand {
  type: 'log_food' | 'unknown';
  description: string;
  quantity?: number;
  unit?: string;
}

// ─── Workout context keyterms (Nova-3 boosting) ───────────────────────────────
// Covers commands, units, common exercises, equipment, and modifiers
const WORKOUT_KEYTERMS: string[] = [
  // Commands
  'rep', 'reps', 'set', 'sets', 'repeat', 'skip', 'next', 'done', 'finish',
  'rest', 'break', 'pause', 'continue',

  // Units
  'pound', 'pounds', 'lbs', 'lb',
  'kilogram', 'kilograms', 'kilo', 'kilos', 'kg',
  'plate', 'plates', 'bar', 'bodyweight',

  // Compound lifts
  'bench', 'bench press', 'incline', 'decline',
  'squat', 'squat rack', 'front squat', 'box squat',
  'deadlift', 'romanian', 'sumo', 'conventional',
  'overhead press', 'ohp', 'military press',
  'row', 'barbell row', 'bent over',

  // Isolation exercises
  'curl', 'bicep curl', 'hammer curl', 'preacher curl',
  'tricep', 'tricep extension', 'skullcrusher', 'pushdown',
  'lateral raise', 'front raise', 'face pull',
  'leg press', 'leg extension', 'leg curl', 'hamstring curl',
  'calf raise', 'hip thrust', 'glute bridge',
  'pulldown', 'lat pulldown', 'pull-up', 'pullup', 'chin-up', 'chinup',
  'dip', 'dips',

  // Equipment types
  'dumbbell', 'dumbbells', 'barbell', 'cable', 'machine',
  'kettlebell', 'resistance band', 'band', 'ez bar',
  'trap bar', 'hex bar', 'smith machine',

  // Cardio
  'treadmill', 'elliptical', 'bike', 'rowing', 'rower', 'stairclimber',
  'minute', 'minutes', 'second', 'seconds', 'hour',
  'mile', 'miles', 'kilometer', 'kilometers',
  'sprint', 'walk', 'jog', 'run',

  // Modifiers
  'tempo', 'slow', 'explosive', 'pause', 'drop', 'superset',
  'failure', 'max', 'warm up', 'warmup', 'working set',
  'rpe', 'effort', 'easy', 'hard', 'moderate',

  // Numbers as words (for better recognition)
  'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'nine', 'ten',
  'twelve', 'fifteen', 'twenty', 'thirty',
  'forty five', 'ninety', 'one hundred', 'one thirty five',
  'one forty five', 'two twenty five', 'three fifteen',
  'four hundred', 'four fifty',
];

// ─── Nutrition context keyterms ───────────────────────────────────────────────
const NUTRITION_KEYTERMS: string[] = [
  // Meal logging commands
  'log', 'add', 'track', 'ate', 'eat', 'eating', 'had', 'drank', 'drink',

  // Meal types
  'breakfast', 'lunch', 'dinner', 'snack', 'meal', 'pre-workout', 'post-workout',

  // Portion units
  'cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp',
  'teaspoon', 'teaspoons', 'tsp',
  'ounce', 'ounces', 'oz',
  'gram', 'grams', 'g',
  'pound', 'pounds', 'lb', 'lbs',
  'slice', 'slices', 'piece', 'pieces',
  'serving', 'servings', 'portion', 'handful',
  'bottle', 'can', 'scoop', 'scoops',

  // Common foods
  'egg', 'eggs', 'chicken', 'beef', 'steak', 'salmon', 'tuna', 'turkey',
  'rice', 'brown rice', 'white rice', 'quinoa', 'oats', 'oatmeal',
  'bread', 'toast', 'bagel', 'tortilla', 'wrap',
  'potato', 'sweet potato', 'broccoli', 'spinach', 'salad',
  'banana', 'apple', 'berries', 'strawberry', 'blueberry',
  'milk', 'water', 'juice', 'coffee', 'protein shake', 'shake',
  'yogurt', 'cheese', 'butter', 'oil', 'olive oil',
  'nuts', 'almonds', 'peanut butter', 'almond butter',
  'protein bar', 'granola bar', 'cracker',
  'pasta', 'noodle', 'soup', 'salsa', 'hummus',

  // Macros and nutrition terms
  'protein', 'carb', 'carbs', 'fat', 'calories', 'calorie',
  'fiber', 'sugar', 'sodium', 'macro', 'macros',

  // Quantities as words
  'half', 'quarter', 'whole', 'one and a half',
  'one', 'two', 'three', 'four', 'five',
  'six', 'seven', 'eight', 'ten', 'twelve',
];

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private supabase = inject(SupabaseService);

  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;

  // State signals
  private _isListening = signal(false);
  private _isProcessing = signal(false);
  private _transcript = signal('');
  private _partialTranscript = signal('');
  private _error = signal<string | null>(null);
  private _confidence = signal(0);
  private _context = signal<VoiceContext>('workout');

  // Public readonly signals
  isListening = this._isListening.asReadonly();
  isProcessing = this._isProcessing.asReadonly();
  transcript = this._transcript.asReadonly();
  partialTranscript = this._partialTranscript.asReadonly();
  error = this._error.asReadonly();
  confidence = this._confidence.asReadonly();
  currentContext = this._context.asReadonly();

  // Computed
  hasError = computed(() => this._error() !== null);
  displayTranscript = computed(() =>
    this._partialTranscript() || this._transcript()
  );

  /**
   * Switch voice context to optimise keyword boosting.
   * Call before startListening() or mid-session to swap active keyterm set.
   */
  setContext(context: VoiceContext): void {
    this._context.set(context);
    // If actively listening, reconnect with new keyterms immediately
    if (this._isListening()) {
      this.reconnectWithContext();
    }
  }

  /**
   * Check if voice input is supported
   */
  isSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.error('Microphone permission denied:', err);
      this._error.set('Microphone permission denied');
      return false;
    }
  }

  /**
   * Start listening for voice input
   */
  async startListening(config?: VoiceConfig): Promise<void> {
    if (this._isListening()) return;

    // Apply context from config if provided
    if (config?.context) {
      this._context.set(config.context);
    }

    try {
      this._error.set(null);
      this._transcript.set('');
      this._partialTranscript.set('');
      this._isProcessing.set(true);

      // Get microphone stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      // Connect to Deepgram WebSocket
      await this.connectDeepgram(config);

      // Start recording
      this.startRecording();

      this._isListening.set(true);
      this._isProcessing.set(false);
    } catch (err) {
      console.error('Error starting voice input:', err);
      this._error.set('Failed to start voice input');
      this._isProcessing.set(false);
      this.cleanup();
    }
  }

  /**
   * Stop listening
   */
  stopListening(): void {
    if (!this._isListening()) return;

    this._isListening.set(false);
    this.cleanup();
  }

  /**
   * Parse workout voice command
   */
  parseWorkoutCommand(transcript: string): ParsedWorkoutCommand {
    const text = transcript.toLowerCase().trim();

    // Check for simple commands first
    if (text.includes('repeat')) {
      return { type: 'repeat' };
    }
    if (text.includes('skip')) {
      return { type: 'skip' };
    }
    if (text.includes('next')) {
      return { type: 'next' };
    }
    if (text.includes('done') || text.includes('finish')) {
      return { type: 'done' };
    }
    if (text.includes('rest') || text.includes('break')) {
      // Try to extract rest duration
      const durationMatch = text.match(/(\d+)\s*(second|sec|minute|min)/);
      if (durationMatch) {
        let duration = parseInt(durationMatch[1], 10);
        if (durationMatch[2].startsWith('min')) {
          duration *= 60;
        }
        return { type: 'rest', duration };
      }
      return { type: 'rest' };
    }

    // Parse set logging: "10 reps at 185 pounds"
    const setMatch = text.match(
      /(\d+)\s*(?:reps?|rep)\s*(?:at|with|@)?\s*(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilograms?)?/i
    );

    if (setMatch) {
      const reps = parseInt(setMatch[1], 10);
      const weight = parseFloat(setMatch[2]);
      const unitText = setMatch[3]?.toLowerCase() || 'lbs';
      const unit: 'lbs' | 'kg' = unitText.startsWith('k') ? 'kg' : 'lbs';

      return { type: 'log_set', reps, weight, unit };
    }

    // Alternate pattern: "185 for 10"
    const altMatch = text.match(
      /(\d+(?:\.\d+)?)\s*(lbs?|pounds?|kg|kilograms?)?\s*(?:for|x)\s*(\d+)/i
    );

    if (altMatch) {
      const weight = parseFloat(altMatch[1]);
      const unitText = altMatch[2]?.toLowerCase() || 'lbs';
      const unit: 'lbs' | 'kg' = unitText.startsWith('k') ? 'kg' : 'lbs';
      const reps = parseInt(altMatch[3], 10);

      return { type: 'log_set', reps, weight, unit };
    }

    // Just reps (bodyweight exercise)
    const repsOnlyMatch = text.match(/^(\d+)\s*(?:reps?|rep)?$/i);
    if (repsOnlyMatch) {
      return { type: 'log_set', reps: parseInt(repsOnlyMatch[1], 10) };
    }

    return { type: 'unknown' };
  }

  /**
   * Parse nutrition voice command
   */
  parseNutritionCommand(transcript: string): ParsedNutritionCommand {
    const text = transcript.trim();

    // Try to extract quantity and unit
    const quantityMatch = text.match(
      /^(\d+(?:\.\d+)?)\s*(oz|ounce|g|gram|cup|tbsp|tsp|slice|piece|serving)?s?\s+(?:of\s+)?(.+)$/i
    );

    if (quantityMatch) {
      return {
        type: 'log_food',
        quantity: parseFloat(quantityMatch[1]),
        unit: quantityMatch[2] || 'serving',
        description: quantityMatch[3],
      };
    }

    // No quantity detected, use the whole transcript
    return {
      type: 'log_food',
      description: text,
    };
  }

  /**
   * Text-to-speech feedback
   */
  async speak(text: string): Promise<void> {
    if (!('speechSynthesis' in window)) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.1;
    utterance.pitch = 1;

    return new Promise((resolve) => {
      utterance.onend = () => resolve();
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Connect to Deepgram WebSocket using Nova-3 with keyterm boosting
   */
  private async connectDeepgram(config?: VoiceConfig): Promise<void> {
    const apiKey = await this.getDeepgramApiKey();

    const params = new URLSearchParams({
      model: config?.model || 'nova-3',
      language: config?.language || 'en-US',
      punctuate: 'true',
      interim_results: 'true',
      endpointing: String(config?.endpointing || 300),
      smart_format: 'true',
    });

    // Nova-3 uses `keyterm` (not `keywords`) for boosting
    const contextKeyterms = this._context() === 'nutrition'
      ? NUTRITION_KEYTERMS
      : WORKOUT_KEYTERMS;
    const extraKeyterms = config?.keywords ?? [];
    const allKeyterms = [...contextKeyterms, ...extraKeyterms];
    allKeyterms.forEach(kt => params.append('keyterm', kt));

    const wsUrl = `wss://api.deepgram.com/v1/listen?${params.toString()}`;

    this.socket = new WebSocket(wsUrl, ['token', apiKey]);

    this.socket.onmessage = (event) => this.handleDeepgramMessage(event);
    this.socket.onerror = (err) => {
      console.error('Deepgram WebSocket error:', err);
      this._error.set('Voice recognition connection error');
    };
    this.socket.onclose = () => {
      if (this._isListening()) {
        this._error.set('Voice recognition disconnected');
        this.stopListening();
      }
    };

    // Wait for connection
    await new Promise<void>((resolve, reject) => {
      if (!this.socket) return reject(new Error('No socket'));
      this.socket.onopen = () => resolve();
      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  /**
   * Reconnect with updated keyterms when context changes mid-session
   */
  private async reconnectWithContext(): Promise<void> {
    try {
      // Gracefully close the current socket
      if (this.socket) {
        this.socket.onclose = null; // prevent stopListening() trigger
        this.socket.close();
        this.socket = null;
      }
      // Reconnect with new context keyterms (reuse existing stream)
      await this.connectDeepgram();
    } catch (err) {
      console.error('Error reconnecting with new context:', err);
    }
  }

  /**
   * Handle incoming Deepgram messages
   */
  private handleDeepgramMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);

      if (data.type === 'Results') {
        const result = data.channel?.alternatives?.[0];
        if (!result) return;

        const transcript = result.transcript || '';
        const confidence = result.confidence || 0;
        const isFinal = data.is_final;

        if (isFinal && transcript) {
          this._transcript.set(transcript);
          this._partialTranscript.set('');
          this._confidence.set(confidence);
        } else if (transcript) {
          this._partialTranscript.set(transcript);
        }
      }
    } catch (err) {
      console.error('Error parsing Deepgram message:', err);
    }
  }

  /**
   * Start MediaRecorder and stream to Deepgram
   */
  private startRecording(): void {
    if (!this.stream || !this.socket) return;

    this.mediaRecorder = new MediaRecorder(this.stream, {
      mimeType: 'audio/webm;codecs=opus',
    });

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(event.data);
      }
    };

    this.mediaRecorder.start(250); // Send audio chunks every 250ms
  }

  /**
   * Get Deepgram API key from backend Edge Function
   */
  private async getDeepgramApiKey(): Promise<string> {
    try {
      const response = await this.supabase.client.functions.invoke('deepgram-key');

      if (response.error) {
        console.error('Failed to get Deepgram API key:', response.error);
        throw new Error('Failed to retrieve API key');
      }

      if (!response.data?.key) {
        console.error('No API key in response');
        throw new Error('No API key returned');
      }

      return response.data.key;
    } catch (err) {
      console.error('Error getting Deepgram API key:', err);
      // Return empty string to allow graceful degradation
      // The connection will fail but won't crash the app
      return '';
    }
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder = null;
    }

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }
}
