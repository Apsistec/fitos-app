# FitOS AI Integration Architecture v2.0

**Updated:** January 2026  
**Based on:** WHOOP Coach, Noom Welli, Stanford GPTCoach research

---

## Architecture Overview

FitOS implements a multi-agent AI system with:
- **LangGraph** for stateful multi-agent orchestration
- **Deepgram Nova-3** for voice AI (STT) with <300ms latency
- **Deepgram Aura-2** for TTS with <200ms latency
- **Claude/GPT-4** for coaching conversations
- **Passio AI/SnapCalorie** for photo nutrition recognition
- **JITAI Framework** for proactive interventions

---

## Voice AI Implementation

### Deepgram Integration

```typescript
// core/services/voice.service.ts
import { Injectable, signal, inject, NgZone } from '@angular/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { environment } from '../../../environments/environment';

export interface VoiceCommand {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  intent?: VoiceIntent;
}

export interface VoiceIntent {
  action: 'log_set' | 'repeat_set' | 'skip_exercise' | 'next_exercise' | 
          'start_timer' | 'stop_timer' | 'log_food' | 'ask_question';
  parameters: Record<string, any>;
  confidence: number;
}

@Injectable({ providedIn: 'root' })
export class VoiceService {
  private ngZone = inject(NgZone);
  
  // State
  isListening = signal(false);
  transcript = signal('');
  error = signal<string | null>(null);
  
  private socket: WebSocket | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  
  // Fitness keywords for better recognition
  private readonly FITNESS_KEYWORDS = [
    'squat', 'deadlift', 'bench', 'press', 'curl', 'row', 'pullup', 'pushup',
    'rep', 'reps', 'set', 'sets', 'weight', 'pounds', 'kilos', 'kg', 'lbs',
    'skip', 'next', 'done', 'complete', 'rest', 'timer', 'repeat',
    'start', 'stop', 'pause', 'resume'
  ];

  async startListening(onCommand: (cmd: VoiceCommand) => void): Promise<void> {
    if (this.isListening()) return;

    try {
      // Request microphone
      this.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000
        }
      });

      // Connect to Deepgram with fitness keyword boosting
      const params = new URLSearchParams({
        model: 'nova-2',
        language: 'en',
        smart_format: 'true',
        punctuate: 'true',
        interim_results: 'true',
        endpointing: '300',
        keywords: this.FITNESS_KEYWORDS.map(k => `${k}:2`).join(',')
      });

      this.socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?${params}`,
        ['token', environment.deepgramApiKey]
      );

      this.socket.onopen = () => {
        this.isListening.set(true);
        this.error.set(null);
        this.startRecording();
        Haptics.impact({ style: ImpactStyle.Light });
      };

      this.socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        const transcript = data.channel?.alternatives?.[0]?.transcript || '';
        const confidence = data.channel?.alternatives?.[0]?.confidence || 0;
        const isFinal = data.is_final || false;

        this.ngZone.run(() => {
          this.transcript.set(transcript);

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

      this.socket.onerror = () => {
        this.ngZone.run(() => {
          this.error.set('Voice connection error');
          this.stopListening();
        });
      };

      this.socket.onclose = () => {
        this.ngZone.run(() => this.isListening.set(false));
      };

    } catch (error) {
      this.error.set('Microphone access denied');
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

    this.mediaRecorder.start(250); // Send every 250ms for low latency
  }

  stopListening(): void {
    this.mediaRecorder?.stop();
    this.socket?.close();
    this.audioStream?.getTracks().forEach(track => track.stop());
    
    this.mediaRecorder = null;
    this.socket = null;
    this.audioStream = null;
    
    this.isListening.set(false);
    this.transcript.set('');
  }

  // Parse voice input into structured intent
  private parseIntent(transcript: string): VoiceIntent | undefined {
    const lower = transcript.toLowerCase().trim();

    // Repeat command (highest priority for quick logging)
    if (/^repeat$/i.test(lower) || /^same$/i.test(lower)) {
      return { action: 'repeat_set', parameters: {}, confidence: 1.0 };
    }

    // Log set: "3 sets of 10 at 185" or "10 reps at 185" or "185 for 10"
    const setPatterns = [
      /(\d+)\s*(?:sets?\s*(?:of\s*)?)?(\d+)\s*(?:reps?)?\s*(?:at\s*)?(\d+)?\s*(pounds?|lbs?|kilos?|kgs?)?/i,
      /(\d+)\s*(?:for|at)\s*(\d+)\s*(?:reps?)?/i,
      /(\d+)\s*(?:reps?)\s*(?:at\s*)?(\d+)?/i
    ];

    for (const pattern of setPatterns) {
      const match = lower.match(pattern);
      if (match) {
        return {
          action: 'log_set',
          parameters: this.extractSetParameters(match),
          confidence: 0.9
        };
      }
    }

    // Skip exercise
    if (/skip/i.test(lower)) {
      return { action: 'skip_exercise', parameters: {}, confidence: 0.95 };
    }

    // Next exercise
    if (/next|done|complete/i.test(lower)) {
      return { action: 'next_exercise', parameters: {}, confidence: 0.9 };
    }

    // Timer commands
    if (/start.*(timer|rest)/i.test(lower)) {
      return { action: 'start_timer', parameters: {}, confidence: 0.9 };
    }
    if (/stop.*(timer|rest)/i.test(lower)) {
      return { action: 'stop_timer', parameters: {}, confidence: 0.9 };
    }

    // Default: treat as question for AI
    return { action: 'ask_question', parameters: { question: transcript }, confidence: 0.5 };
  }

  private extractSetParameters(match: RegExpMatchArray): Record<string, any> {
    const numbers = match.filter(m => m && /^\d+$/.test(m)).map(Number);
    const unit = match.find(m => m && /^(pounds?|lbs?|kilos?|kgs?)$/i.test(m));

    // Heuristic: largest number is usually weight, others are sets/reps
    const sorted = [...numbers].sort((a, b) => b - a);
    
    return {
      weight: sorted[0] || undefined,
      reps: sorted[1] || sorted[0] || undefined,
      sets: numbers.length > 2 ? sorted[2] : 1,
      unit: unit?.startsWith('k') ? 'kg' : 'lbs'
    };
  }

  // Text-to-Speech for confirmations
  async speak(text: string): Promise<void> {
    try {
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
      audio.onended = () => URL.revokeObjectURL(audioUrl);
    } catch (error) {
      console.warn('TTS failed:', error);
    }
  }
}
```

---

## Photo Nutrition AI

### Food Recognition Service

```typescript
// features/nutrition/services/food-recognition.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { environment } from '../../../../environments/environment';

export interface RecognizedFood {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
  editable: boolean; // User can adjust
}

export interface FoodRecognitionResult {
  foods: RecognizedFood[];
  totals: { calories: number; protein: number; carbs: number; fat: number };
  overallConfidence: number;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class FoodRecognitionService {
  private http = inject(HttpClient);

  async recognizeFromPhoto(): Promise<FoodRecognitionResult> {
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Prompt,
      promptLabelHeader: 'Log Meal',
      promptLabelPhoto: 'Choose from Gallery',
      promptLabelPicture: 'Take Photo'
    });

    // Send to AI backend for recognition
    const result = await this.http.post<FoodRecognitionResult>(
      `${environment.aiApiUrl}/nutrition/recognize`,
      {
        image: photo.base64String,
        format: photo.format
      }
    ).toPromise();

    return result!;
  }

  // Natural language parsing (Nutritionix NLP)
  async parseNaturalLanguage(description: string): Promise<FoodRecognitionResult> {
    const result = await this.http.post<FoodRecognitionResult>(
      `${environment.aiApiUrl}/nutrition/parse`,
      { text: description }
    ).toPromise();

    return result!;
  }

  // Verify/correct AI suggestions using verified database
  async verifyFood(food: RecognizedFood, correction?: Partial<RecognizedFood>): Promise<RecognizedFood> {
    const result = await this.http.post<RecognizedFood>(
      `${environment.aiApiUrl}/nutrition/verify`,
      { original: food, correction }
    ).toPromise();

    return result!;
  }
}
```

---

## AI Coaching Agent

### Multi-Agent Architecture

```typescript
// core/services/ai-coach.service.ts
import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  agentSource?: 'workout' | 'nutrition' | 'recovery' | 'motivation' | 'general';
  actions?: ChatAction[];
}

export interface ChatAction {
  type: 'log_workout' | 'adjust_program' | 'set_reminder' | 'escalate_trainer';
  label: string;
  data: any;
  executed: boolean;
}

@Injectable({ providedIn: 'root' })
export class AICoachService {
  private http = inject(HttpClient);

  // State
  private _messages = signal<ChatMessage[]>([]);
  private _isThinking = signal(false);

  messages = this._messages.asReadonly();
  isThinking = this._isThinking.asReadonly();
  
  lastMessage = computed(() => {
    const msgs = this._messages();
    return msgs[msgs.length - 1];
  });

  async sendMessage(content: string, context?: Record<string, any>): Promise<ChatMessage> {
    // Add user message
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date()
    };
    this._messages.update(msgs => [...msgs, userMessage]);
    this._isThinking.set(true);

    try {
      // Send to LangGraph backend
      const response = await this.http.post<{
        message: string;
        agentSource: string;
        actions?: ChatAction[];
        shouldEscalate?: boolean;
      }>(
        `${environment.aiApiUrl}/coach/chat`,
        {
          message: content,
          conversationHistory: this._messages().slice(-10),
          userContext: context
        }
      ).toPromise();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response!.message,
        timestamp: new Date(),
        agentSource: response!.agentSource as any,
        actions: response!.actions
      };

      this._messages.update(msgs => [...msgs, assistantMessage]);
      return assistantMessage;

    } finally {
      this._isThinking.set(false);
    }
  }

  async executeAction(action: ChatAction): Promise<void> {
    await this.http.post(
      `${environment.aiApiUrl}/coach/action`,
      { action }
    ).toPromise();
    
    // Mark action as executed
    this._messages.update(msgs => 
      msgs.map(m => ({
        ...m,
        actions: m.actions?.map(a => 
          a === action ? { ...a, executed: true } : a
        )
      }))
    );
  }

  clearConversation(): void {
    this._messages.set([]);
  }
}
```

---

## JITAI Proactive Interventions

### Intervention Service

```typescript
// core/services/intervention.service.ts
import { Injectable, inject, signal } from '@angular/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface JITAIContext {
  vulnerability: number;  // 0-1: Risk of skipping workout
  receptivity: number;    // 0-1: Willingness to engage
  opportunity: number;    // 0-1: Context allows action
}

export interface Intervention {
  id: string;
  type: 'nudge' | 'reminder' | 'celebration' | 'concern' | 'insight';
  title: string;
  message: string;
  priority: number;
  action?: {
    label: string;
    route: string;
  };
}

@Injectable({ providedIn: 'root' })
export class InterventionService {
  private http = inject(HttpClient);
  
  // Track daily intervention count (max 2-3 per day)
  private todayCount = signal(0);
  private readonly MAX_DAILY = 3;

  async evaluateAndIntervene(userId: string): Promise<Intervention | null> {
    if (this.todayCount() >= this.MAX_DAILY) {
      return null; // Prevent notification fatigue
    }

    try {
      // Get JITAI context from backend
      const context = await this.http.get<JITAIContext>(
        `${environment.aiApiUrl}/jitai/context/${userId}`
      ).toPromise();

      // Goldilocks principle: intervene at the right moment
      const shouldIntervene = this.calculateInterventionScore(context!) > 0.7;

      if (!shouldIntervene) return null;

      // Generate personalized intervention
      const intervention = await this.http.post<Intervention>(
        `${environment.aiApiUrl}/jitai/generate`,
        { userId, context }
      ).toPromise();

      await this.deliverIntervention(intervention!);
      this.todayCount.update(c => c + 1);

      return intervention!;

    } catch (error) {
      console.error('Intervention evaluation failed:', error);
      return null;
    }
  }

  private calculateInterventionScore(context: JITAIContext): number {
    // Weighted scoring based on research
    return (
      (context.vulnerability * 0.40) +
      (context.receptivity * 0.35) +
      (context.opportunity * 0.25)
    );
  }

  private async deliverIntervention(intervention: Intervention): Promise<void> {
    await LocalNotifications.schedule({
      notifications: [{
        id: this.hashCode(intervention.id),
        title: intervention.title,
        body: intervention.message,
        schedule: { at: new Date() },
        actionTypeId: intervention.action ? 'INTERVENTION_ACTION' : undefined,
        extra: { interventionId: intervention.id, route: intervention.action?.route }
      }]
    });
  }

  private hashCode(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}
```

---

## Backend API Endpoints

### AI Service Routes (Python/LangGraph)

```python
# apps/ai-backend/routes/coach.py
from fastapi import APIRouter, HTTPException
from langgraph.graph import StateGraph
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/coach", tags=["AI Coach"])

class ChatRequest(BaseModel):
    message: str
    conversationHistory: List[dict]
    userContext: Optional[dict] = None

class ChatResponse(BaseModel):
    message: str
    agentSource: str
    actions: Optional[List[dict]] = None
    shouldEscalate: bool = False

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Multi-agent coaching conversation.
    Routes to appropriate specialist agent based on query.
    """
    # LangGraph orchestration
    graph = build_coach_graph()
    result = await graph.ainvoke({
        "message": request.message,
        "history": request.conversationHistory,
        "context": request.userContext
    })
    
    return ChatResponse(
        message=result["response"],
        agentSource=result["agent_used"],
        actions=result.get("suggested_actions"),
        shouldEscalate=result.get("escalate", False)
    )

# apps/ai-backend/routes/jitai.py
@router.get("/context/{user_id}")
async def get_jitai_context(user_id: str):
    """
    Calculate JITAI context scores for a user.
    """
    # Fetch user data
    user_data = await get_user_engagement_data(user_id)
    wearable_data = await get_wearable_data(user_id)
    
    vulnerability = calculate_vulnerability(user_data, wearable_data)
    receptivity = calculate_receptivity(user_data)
    opportunity = calculate_opportunity(user_data)
    
    return {
        "vulnerability": vulnerability,
        "receptivity": receptivity,
        "opportunity": opportunity
    }

@router.post("/generate")
async def generate_intervention(user_id: str, context: dict):
    """
    Generate a personalized intervention message using AI.
    """
    prompt = build_intervention_prompt(user_id, context)
    response = await llm.generate(prompt)
    
    return {
        "id": str(uuid4()),
        "type": determine_intervention_type(context),
        "title": response.title,
        "message": response.message,
        "priority": calculate_priority(context)
    }
```

---

## Environment Configuration

```typescript
// environments/environment.ts
export const environment = {
  production: false,
  supabaseUrl: 'YOUR_SUPABASE_URL',
  supabaseAnonKey: 'YOUR_SUPABASE_ANON_KEY',
  
  // AI Services
  aiApiUrl: 'http://localhost:8000/api/v1',
  deepgramApiKey: 'YOUR_DEEPGRAM_KEY',
  
  // Feature Flags
  features: {
    voiceLogging: true,
    photoNutrition: true,
    aiCoach: true,
    jitaiInterventions: true
  }
};
```

---

## Implementation Phases

### Phase 2A: Voice & Photo AI (Sprints 8-10)
- Deepgram integration for voice logging
- Natural language food parsing
- Photo-to-nutrition recognition
- Voice feedback via TTS

### Phase 2B: AI Coaching (Sprints 13-14)
- LangGraph multi-agent backend
- Chat UI in mobile app
- Trainer methodology learning
- JITAI intervention system

### Phase 2C: Apple Watch (Sprint 15)
- WatchOS companion app
- Wrist-based workout logging
- Today's workout complication
- Phone-watch sync

---

## Testing Strategy

### Voice Service Testing
```typescript
describe('VoiceService', () => {
  it('should parse "10 reps at 185" correctly', () => {
    const intent = service['parseIntent']('10 reps at 185');
    expect(intent?.action).toBe('log_set');
    expect(intent?.parameters.reps).toBe(10);
    expect(intent?.parameters.weight).toBe(185);
  });

  it('should recognize "repeat" command', () => {
    const intent = service['parseIntent']('repeat');
    expect(intent?.action).toBe('repeat_set');
    expect(intent?.confidence).toBe(1.0);
  });

  it('should handle gym noise gracefully', async () => {
    // Mock noisy audio stream
    // Verify error handling doesn't crash app
  });
});
```

### AI Coach Testing
```typescript
describe('AICoachService', () => {
  it('should route nutrition questions to nutrition agent', async () => {
    const response = await service.sendMessage('How much protein should I eat?');
    expect(response.agentSource).toBe('nutrition');
  });

  it('should escalate complex questions to trainer', async () => {
    const response = await service.sendMessage('I have sharp knee pain during squats');
    expect(response.actions).toContainEqual(
      expect.objectContaining({ type: 'escalate_trainer' })
    );
  });
});
```
