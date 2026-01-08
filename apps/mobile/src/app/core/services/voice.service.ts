import { Injectable, inject, signal, computed } from '@angular/core';
import { Capacitor } from '@capacitor/core';

/**
 * Voice Service for FitOS
 * Handles voice-to-text for workout and nutrition logging
 * Uses Deepgram Nova-3 for speech recognition
 */

export interface VoiceConfig {
  language?: string;
  model?: string;
  keywords?: string[];
  endpointing?: number;
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

// Fitness-specific vocabulary for Deepgram keyword boosting
const FITNESS_KEYWORDS = [
  'reps', 'rep', 'sets', 'set',
  'pounds', 'lbs', 'kilograms', 'kg',
  'repeat', 'skip', 'next', 'done', 'rest',
  'bench', 'squat', 'deadlift', 'press', 'curl', 'row',
  'dumbbell', 'barbell', 'cable', 'machine',
];

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
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
  
  // Public readonly signals
  isListening = this._isListening.asReadonly();
  isProcessing = this._isProcessing.asReadonly();
  transcript = this._transcript.asReadonly();
  partialTranscript = this._partialTranscript.asReadonly();
  error = this._error.asReadonly();
  confidence = this._confidence.asReadonly();
  
  // Computed
  hasError = computed(() => this._error() !== null);
  displayTranscript = computed(() => 
    this._partialTranscript() || this._transcript()
  );

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
   * Connect to Deepgram WebSocket
   */
  private async connectDeepgram(config?: VoiceConfig): Promise<void> {
    // TODO: Get API key from environment/backend
    const apiKey = await this.getDeepgramApiKey();
    
    const params = new URLSearchParams({
      model: config?.model || 'nova-2',
      language: config?.language || 'en-US',
      punctuate: 'true',
      interim_results: 'true',
      endpointing: String(config?.endpointing || 300),
      smart_format: 'true',
    });

    // Add keyword boosting for fitness vocabulary
    const keywords = [...FITNESS_KEYWORDS, ...(config?.keywords || [])];
    keywords.forEach(kw => params.append('keywords', kw));

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
   * Get Deepgram API key from backend
   */
  private async getDeepgramApiKey(): Promise<string> {
    // TODO: Implement secure API key retrieval from backend
    // For now, return empty - this will fail but shows the architecture
    console.warn('Deepgram API key not configured');
    return '';
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
