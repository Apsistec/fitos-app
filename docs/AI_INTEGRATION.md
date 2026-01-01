# FitOS AI Integration Architecture

Patterns for integrating AI agents, voice AI, and LangGraph multi-agent orchestration.

---

## Architecture Overview

FitOS uses a multi-agent AI architecture with:
- **LangGraph** for stateful multi-agent orchestration (backend)
- **Deepgram** for voice AI (STT/TTS)
- **MCP (Model Context Protocol)** for standardized tool integration
- **Supabase** for agent memory and state persistence

---

## AI Agent System

### Agent Roles

| Agent | Purpose | Capabilities |
|-------|---------|--------------|
| **Coach Agent** | Trainer's AI assistant | Voice program creation, client prioritization, check-in summaries |
| **Client Agent** | Member-facing AI | Voice workout logging, photo meal tracking, conversational check-ins |
| **Habit Agent** | Behavior change | Streak tracking, habit stacking, predictive intervention |
| **Analytics Agent** | Data synthesis | Wearable integration, trend analysis, recovery scoring |
| **Billing Agent** | Payment operations | Stripe integration, automated invoicing, payment recovery |
| **Scheduling Agent** | Calendar management | Google Calendar, booking optimization, reminders |

### Frontend Integration Service

```typescript
// core/services/ai-agent.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  agentId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface AgentResponse {
  message: AgentMessage;
  actions?: AgentAction[];
  suggestions?: string[];
}

export interface AgentAction {
  type: 'log_workout' | 'schedule_session' | 'send_reminder' | 'create_program' | 'log_meal';
  data: any;
  confirmed: boolean;
}

@Injectable({ providedIn: 'root' })
export class AIAgentService {
  private http = inject(HttpClient);
  
  // State
  private _messages = signal<AgentMessage[]>([]);
  private _isProcessing = signal(false);
  private _currentAgent = signal<string>('client');
  
  // Public
  messages = this._messages.asReadonly();
  isProcessing = this._isProcessing.asReadonly();
  currentAgent = this._currentAgent.asReadonly();
  
  // Last AI message
  lastResponse = computed(() => {
    const msgs = this._messages();
    return msgs.filter(m => m.role === 'assistant').pop();
  });
  
  // Send message to agent
  async sendMessage(content: string, context?: Record<string, any>): Promise<AgentResponse> {
    const userMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    
    this._messages.update(msgs => [...msgs, userMessage]);
    this._isProcessing.set(true);
    
    try {
      const response = await this.http.post<AgentResponse>(
        `${environment.aiApiUrl}/agent/chat`,
        {
          message: content,
          agentId: this._currentAgent(),
          context: {
            ...context,
            conversationHistory: this._messages().slice(-10) // Last 10 messages for context
          }
        }
      ).toPromise();
      
      if (response) {
        this._messages.update(msgs => [...msgs, response.message]);
        
        // Auto-execute confirmed actions
        for (const action of response.actions || []) {
          if (action.confirmed) {
            await this.executeAction(action);
          }
        }
      }
      
      return response!;
    } finally {
      this._isProcessing.set(false);
    }
  }
  
  // Execute agent action
  private async executeAction(action: AgentAction): Promise<void> {
    switch (action.type) {
      case 'log_workout':
        // Call workout service
        break;
      case 'log_meal':
        // Call nutrition service
        break;
      case 'schedule_session':
        // Call scheduling service
        break;
    }
  }
  
  // Clear conversation
  clearConversation(): void {
    this._messages.set([]);
  }
  
  // Switch agent
  setAgent(agentId: string): void {
    this._currentAgent.set(agentId);
  }
}
```

---

## Voice AI Integration (Deepgram)

### Voice Service

```typescript
// core/services/voice.service.ts
import { Injectable, inject, signal, NgZone } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  intent?: VoiceIntent;
}

export interface VoiceIntent {
  action: 'log_set' | 'skip_exercise' | 'start_timer' | 'stop_timer' | 'next_exercise' | 'ask_question';
  parameters: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private ngZone = inject(NgZone);
  
  // State
  private _isListening = signal(false);
  private _transcript = signal('');
  private _error = signal<string | null>(null);
  
  // Public
  isListening = this._isListening.asReadonly();
  transcript = this._transcript.asReadonly();
  error = this._error.asReadonly();
  
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  
  // Fitness-specific keywords for better recognition
  private keywords = [
    'squat', 'deadlift', 'bench', 'press', 'curl', 'row',
    'rep', 'reps', 'set', 'sets', 'weight', 'pounds', 'kilos',
    'skip', 'next', 'done', 'complete', 'rest', 'timer',
    'start', 'stop', 'pause', 'resume'
  ];
  
  async startListening(onCommand: (cmd: VoiceCommand) => void): Promise<void> {
    if (this._isListening()) return;
    
    try {
      // Get microphone access
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });
      
      // Setup Deepgram WebSocket
      const params = new URLSearchParams({
        model: 'nova-2',
        language: 'en',
        smart_format: 'true',
        punctuate: 'true',
        interim_results: 'true',
        endpointing: '300',
        keywords: this.keywords.map(k => `${k}:2`).join(',') // Boost fitness terms
      });
      
      this.socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ['token', environment.deepgramApiKey]
      );
      
      this.socket.onopen = () => {
        this._isListening.set(true);
        this._error.set(null);
        this.startRecording();
      };
      
      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript || '';
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
        const isFinal = data.is_final || false;
        
        this.ngZone.run(() => {
          this._transcript.set(transcript);
          
          if (isFinal && transcript.trim()) {
            const command: VoiceCommand = {
              transcript,
              confidence,
              isFinal,
              intent: this.parseIntent(transcript)
            };
            onCommand(command);
          }
        });
      };
      
      this.socket.onerror = (error) => {
        this.ngZone.run(() => {
          this._error.set('Voice connection error');
          this.stopListening();
        });
      };
      
      this.socket.onclose = () => {
        this.ngZone.run(() => {
          this._isListening.set(false);
        });
      };
      
    } catch (error) {
      this._error.set('Microphone access denied');
      throw error;
    }
  }
  
  private startRecording(): void {
    if (!this.audioStream) return;
    
    this.mediaRecorder = new MediaRecorder(this.audioStream, {
      mimeType: 'audio/webm;codecs=opus'
    });
    
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0 && this.socket?.readyState === WebSocket.OPEN) {
        this.socket.send(event.data);
      }
    };
    
    this.mediaRecorder.start(250); // Send audio every 250ms
  }
  
  stopListening(): void {
    this.mediaRecorder?.stop();
    this.socket?.close();
    this.audioStream?.getTracks().forEach(track => track.stop());
    
    this.mediaRecorder = null;
    this.socket = null;
    this.audioStream = null;
    
    this._isListening.set(false);
    this._transcript.set('');
  }
  
  // Parse natural language into intent
  private parseIntent(transcript: string): VoiceIntent | undefined {
    const lower = transcript.toLowerCase();
    
    // Log set: "3 sets of 10 at 135 pounds" or "did 8 reps at 185"
    const setMatch = lower.match(/(\d+)\s*(?:sets?\s*(?:of\s*)?)?(\d+)?\s*(?:reps?)?\s*(?:at\s*)?(\d+)?\s*(pounds?|lbs?|kilos?|kgs?)?/);
    if (setMatch) {
      const [, sets, reps, weight, unit] = setMatch;
      return {
        action: 'log_set',
        parameters: {
          sets: sets ? parseInt(sets) : undefined,
          reps: reps ? parseInt(reps) : undefined,
          weight: weight ? parseInt(weight) : undefined,
          unit: unit?.startsWith('k') ? 'kg' : 'lbs'
        }
      };
    }
    
    // Skip exercise: "skip this" or "skip exercise"
    if (lower.includes('skip')) {
      return { action: 'skip_exercise', parameters: {} };
    }
    
    // Timer commands
    if (lower.includes('start') && (lower.includes('timer') || lower.includes('rest'))) {
      return { action: 'start_timer', parameters: {} };
    }
    if (lower.includes('stop') && lower.includes('timer')) {
      return { action: 'stop_timer', parameters: {} };
    }
    
    // Next exercise
    if (lower.includes('next') || lower.includes('done')) {
      return { action: 'next_exercise', parameters: {} };
    }
    
    // Question (fallback to AI agent)
    return { action: 'ask_question', parameters: { question: transcript } };
  }
  
  // Text-to-Speech using Deepgram Aura
  async speak(text: string): Promise<void> {
    const response = await fetch('https://api.deepgram.com/v1/speak?model=aura-asteria-en', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${environment.deepgramApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });
    
    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);
    await audio.play();
    
    // Cleanup
    audio.onended = () => URL.revokeObjectURL(audioUrl);
  }
}
```

---

## Photo-to-Nutrition AI

```typescript
// features/nutrition/services/food-recognition.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { environment } from '../../../../environments/environment';

export interface FoodRecognitionResult {
  foods: RecognizedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  confidence: number;
}

export interface RecognizedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class FoodRecognitionService {
  private http = inject(HttpClient);
  
  async recognizeFromPhoto(): Promise<FoodRecognitionResult> {
    // Take or select photo
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Log Meal',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo'
    });
    
    // Send to AI API for recognition
    const response = await this.http.post<FoodRecognitionResult>(
      `${environment.aiApiUrl}/nutrition/recognize`,
      {
        image: photo.base64String,
        format: photo.format
      }
    ).toPromise();
    
    return response!;
  }
  
  // Parse natural language food description
  async parseNaturalLanguage(description: string): Promise<FoodRecognitionResult> {
    // Uses Nutritionix NLP API for 90%+ accuracy
    const response = await this.http.post<FoodRecognitionResult>(
      `${environment.aiApiUrl}/nutrition/parse`,
      { text: description }
    ).toPromise();
    
    return response!;
  }
}
```

---

## Proactive AI Interventions (JITAI)

```typescript
// core/services/intervention.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { AIAgentService } from './ai-agent.service';
import { WorkoutService } from '../../features/workouts/services/workout.service';

export interface InterventionContext {
  vulnerability: number;  // Risk of skipping (0-1)
  receptivity: number;    // Willingness to engage (0-1)
  opportunity: number;    // Context allows action (0-1)
}

export interface Intervention {
  id: string;
  type: 'nudge' | 'reminder' | 'celebration' | 'concern';
  message: string;
  priority: number;
  scheduledAt: Date;
}

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private aiAgent = inject(AIAgentService);
  private workoutService = inject(WorkoutService);
  
  // Track intervention frequency (max 2-3 per day)
  private todayInterventions = signal(0);
  private readonly MAX_DAILY_INTERVENTIONS = 3;
  
  // Evaluate context and potentially trigger intervention
  async evaluateAndIntervene(context: InterventionContext): Promise<void> {
    if (this.todayInterventions() >= this.MAX_DAILY_INTERVENTIONS) {
      return; // Prevent notification fatigue
    }
    
    // Calculate intervention score
    const score = this.calculateInterventionScore(context);
    
    if (score > 0.7) {
      const intervention = await this.generateIntervention(context);
      await this.deliverIntervention(intervention);
    }
  }
  
  private calculateInterventionScore(context: InterventionContext): number {
    // Goldilocks principle: not too early, not too late
    // High vulnerability + high receptivity + high opportunity = intervene
    return (context.vulnerability * 0.4) + 
           (context.receptivity * 0.35) + 
           (context.opportunity * 0.25);
  }
  
  private async generateIntervention(context: InterventionContext): Promise<Intervention> {
    // Use AI agent to generate personalized message
    const response = await this.aiAgent.sendMessage(
      'Generate a supportive, personalized nudge for a client who might skip their workout',
      {
        vulnerabilityScore: context.vulnerability,
        recentWorkouts: await this.workoutService.getRecentWorkouts(7),
        userPreferences: await this.getUserPreferences()
      }
    );
    
    return {
      id: crypto.randomUUID(),
      type: context.vulnerability > 0.8 ? 'concern' : 'nudge',
      message: response.message.content,
      priority: Math.round(context.vulnerability * 10),
      scheduledAt: new Date()
    };
  }
  
  private async deliverIntervention(intervention: Intervention): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [{
        id: intervention.id.hashCode(),
        title: intervention.type === 'celebration' ? '🎉 Great job!' : '💪 Quick check-in',
        body: intervention.message,
        schedule: { at: intervention.scheduledAt },
        actionTypeId: 'INTERVENTION',
        extra: { interventionId: intervention.id }
      }]
    });
    
    this.todayInterventions.update(count => count + 1);
  }
  
  private async getUserPreferences(): Promise<any> {
    // Load user communication preferences
    return {};
  }
}
```

---

## Trainer Methodology Learning

```typescript
// features/trainer/services/methodology.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface TrainerMethodology {
  id: string;
  trainerId: string;
  programmingStyle: string;
  communicationTone: string;
  exercisePreferences: ExercisePreference[];
  progressionSchemes: ProgressionScheme[];
  coachingPhrases: string[];
  nutritionPhilosophy: string;
}

@Injectable({ providedIn: 'root' })
export class MethodologyService {
  private http = inject(HttpClient);
  
  // Learn from trainer's existing programs
  async analyzePrograms(programs: any[]): Promise<void> {
    await this.http.post(
      `${environment.aiApiUrl}/trainer/learn-methodology`,
      { programs }
    ).toPromise();
  }
  
  // Learn from trainer's communication style
  async analyzeMessages(messages: any[]): Promise<void> {
    await this.http.post(
      `${environment.aiApiUrl}/trainer/learn-communication`,
      { messages }
    ).toPromise();
  }
  
  // Get AI response in trainer's voice
  async generateInTrainerVoice(
    prompt: string, 
    context: Record<string, any>
  ): Promise<string> {
    const response = await this.http.post<{ message: string }>(
      `${environment.aiApiUrl}/trainer/generate-response`,
      { prompt, context }
    ).toPromise();
    
    return response!.message;
  }
}
```

---

## Usage in Components

### Voice-Enabled Workout Logging

```typescript
@Component({
  selector: 'fit-voice-logger',
  template: `
    <div class="voice-logger">
      <ion-button 
        [color]="voiceService.isListening() ? 'danger' : 'primary'"
        (click)="toggleListening()">
        <ion-icon [name]="voiceService.isListening() ? 'mic' : 'mic-outline'" slot="start" />
        {{ voiceService.isListening() ? 'Stop' : 'Voice Log' }}
      </ion-button>
      
      @if (voiceService.isListening()) {
        <div class="transcript">
          <ion-text>{{ voiceService.transcript() || 'Listening...' }}</ion-text>
        </div>
      }
      
      @if (voiceService.error()) {
        <ion-text color="danger">{{ voiceService.error() }}</ion-text>
      }
    </div>
  `
})
export class VoiceLoggerComponent {
  voiceService = inject(VoiceService);
  private workoutService = inject(WorkoutService);
  
  async toggleListening() {
    if (this.voiceService.isListening()) {
      this.voiceService.stopListening();
    } else {
      await this.voiceService.startListening(cmd => this.handleCommand(cmd));
    }
  }
  
  private async handleCommand(command: VoiceCommand) {
    if (!command.intent) return;
    
    switch (command.intent.action) {
      case 'log_set':
        const { reps, weight, unit } = command.intent.parameters;
        await this.workoutService.logSet({ reps, weight, unit });
        await this.voiceService.speak(`Logged ${reps} reps at ${weight} ${unit}`);
        break;
        
      case 'skip_exercise':
        await this.workoutService.skipCurrentExercise();
        await this.voiceService.speak('Exercise skipped');
        break;
        
      case 'next_exercise':
        await this.workoutService.nextExercise();
        break;
    }
  }
}
```

### AI Chat Component

```typescript
@Component({
  selector: 'fit-ai-chat',
  template: `
    <ion-content>
      <div class="messages">
        @for (message of aiAgent.messages(); track message.id) {
          <div [class]="'message ' + message.role">
            <ion-text>{{ message.content }}</ion-text>
            <small>{{ message.timestamp | date:'shortTime' }}</small>
          </div>
        }
        
        @if (aiAgent.isProcessing()) {
          <div class="message assistant typing">
            <ion-spinner name="dots" />
          </div>
        }
      </div>
    </ion-content>
    
    <ion-footer>
      <ion-toolbar>
        <ion-input 
          [(ngModel)]="userMessage"
          placeholder="Ask your AI coach..."
          (keyup.enter)="sendMessage()" />
        <ion-button slot="end" (click)="sendMessage()" [disabled]="!userMessage">
          <ion-icon slot="icon-only" name="send" />
        </ion-button>
      </ion-toolbar>
    </ion-footer>
  `
})
export class AIChatComponent {
  aiAgent = inject(AIAgentService);
  userMessage = '';
  
  async sendMessage() {
    if (!this.userMessage.trim()) return;
    
    const message = this.userMessage;
    this.userMessage = '';
    
    await this.aiAgent.sendMessage(message);
  }
}
```
