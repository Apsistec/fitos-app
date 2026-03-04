# FitOS AI Architecture Rewire — Claude Code Sprint Handoff

## Context & Decision Summary

> **Sprint Numbering Note**: These are numbered 68–71 as the next available slots after the
> existing sprint plan (Sprints 61–67 are planned for RBAC, Admin Assistant, Notifications,
> Waivers, AI Workout Builder, No-Show Policy, and Hydration). However, Sprint 68 (Rewire)
> fixes a **security vulnerability** (API key exposed client-side) and corrects a broken
> architecture. Consider prioritizing it ahead of Sprints 65–67 (P1 improvements) or even
> running it in parallel with Sprint 61–64 (P0 blockers) since the AI rewire touches
> completely different files.

FitOS currently has **two parallel paths** for AI features that overlap and conflict. After a full codebase audit, the decision is to **use Path B (AI Backend on FastAPI/LangGraph)** as the single AI layer, and **rewire Path A's frontend (mobile app) to call Path B instead of calling Anthropic directly**.

### Why Path B Wins

- **Security**: Path A (`ai-coach.service.ts`) fetches the Anthropic API key from a Supabase Edge Function, then stores it client-side and calls `api.anthropic.com` directly from the user's device. Anyone with a network proxy can steal the key. Path B keeps the key server-side on Cloud Run.
- **Features**: Path B has LangGraph multi-agent orchestration with real tool use, Coach Brain RAG (learns each trainer's voice), AI workout generation, periodization, autoregulation/readiness scoring, voice streaming (Deepgram), JITAI interventions, and chrono-nutrition. Path A is just different system prompts sent to the same Sonnet call.
- **Cost control**: Path B can route cheap queries to Haiku and expensive ones to Sonnet. Path A uses Sonnet for everything.
- **Deployment**: Path B already has a Dockerfile and `cloudbuild.yaml` for Cloud Run.

### Critical Correction

The migration docs (`docs/CLAUDE_MAX_MIGRATION.md` and `docs/CLAUDE_MAX_MIGRATION_COMPLETE.md`) and the Edge Function (`supabase/functions/anthropic-key/index.ts`) contain **false claims** that "Claude Max subscription includes API access without per-token charges." This is incorrect. The Anthropic Console API **always** charges per-token regardless of subscription tier. The Max subscription only covers interactive usage (claude.ai chat, Claude Code CLI/desktop). FitOS must use a Console API key with credits loaded, and those credits are charged per-token.

---

## Architecture After Rewire

```
Mobile App (Ionic Angular)
    ↓ HTTP/WebSocket to AI Backend
AI Backend (FastAPI on Cloud Run)
    ↓ Uses ANTHROPIC_API_KEY server-side
    ├── langchain-anthropic (specialist agents via LangGraph)
    ├── anthropic SDK (Coach Brain RAG)
    ├── Deepgram SDK (voice STT/TTS)
    └── OpenAI SDK (embeddings for RAG)
```

The mobile app **never** touches the Anthropic API key. All AI calls go through the AI Backend.

---

## Sprint 68: Rewire Frontend to AI Backend

### Task 68.1: Refactor `ai-coach.service.ts` to Call AI Backend

**File**: `apps/mobile/src/app/core/services/ai-coach.service.ts`

**Current behavior**: Calls Supabase Edge Function to get API key, then calls `https://api.anthropic.com/v1/messages` directly.

**Target behavior**: Calls AI Backend at `environment.aiBackendUrl + '/api/v1/coach/chat'`. No API key handling on client side.

**Specific changes**:

1. **Remove** the `getAnthropicConfig()` method entirely (lines ~110-140). Delete the `apiKeyCache` property and `API_KEY_CACHE_TTL` constant.

2. **Remove** the direct Anthropic fetch call in `sendMessage()` (the `fetch('https://api.anthropic.com/v1/messages', ...)` block around lines ~195-215).

3. **Add** an `HttpClient` injection and a backend URL property:

```typescript
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

// In the class:
private http = inject(HttpClient);
private readonly AI_BACKEND_URL = environment.aiBackendUrl || 'http://localhost:8000';
```

4. **Replace** the Anthropic fetch call in `sendMessage()` with a call to the AI Backend:

```typescript
const response = await firstValueFrom(
  this.http.post<{
    message: string;
    agentSource: string;
    actions: any[] | null;
    shouldEscalate: boolean;
  }>(`${this.AI_BACKEND_URL}/api/v1/coach/chat`, {
    message: message,
    conversationHistory: history.map(msg => ({
      role: msg.role,
      content: msg.content,
    })),
    userContext: {
      user_id: userContext.user_id,
      role: userContext.role,
      goals: ('goals' in userContext) ? userContext.goals : [],
      fitness_level: ('fitness_level' in userContext) ? userContext.fitness_level : 'intermediate',
      trainer_id: ('trainer_id' in userContext) ? userContext.trainer_id : null,
      injuries_notes: null,
      current_streak: 0,
      weekly_adherence: 0.0,
      resting_hr: null,
      hrv: null,
      sleep_hours: null,
    },
  })
);

const assistantContent = response.message || 'I apologize, but I had trouble processing that. Could you rephrase?';
const agent = response.agentSource as ChatMessage['agent'] || 'general';
```

5. **Remove** the client-side `routeQuery()` method (lines ~148-178). Routing is now done server-side in `coach_graph.py`.

6. **Remove** the `getAgentSystemPrompt()` method (lines ~183-198). System prompts are now in `specialists.py` on the backend.

7. **Keep** all conversation persistence logic (Supabase `ai_conversations` and `ai_conversation_messages` tables). The mobile app still owns conversation history — the backend is stateless per-request.

8. **Keep** the `checkEscalation()` and `createEscalation()` methods, but also respect `response.shouldEscalate` from the backend:

```typescript
const shouldEscalate = response.shouldEscalate || this.checkEscalation(message, assistantContent);
```

9. **Update** the `UserContext` interfaces to include backend-expected fields:

```typescript
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
```

### Task 68.2: Add `aiBackendUrl` to Environment Files

**Files**:
- `apps/mobile/src/environments/environment.ts`
- `apps/mobile/src/environments/environment.prod.ts`

**Changes**:

```typescript
// environment.ts (dev)
export const environment = {
  production: false,
  // ... existing properties
  aiBackendUrl: 'http://localhost:8000',
};

// environment.prod.ts
export const environment = {
  production: true,
  // ... existing properties
  aiBackendUrl: 'https://YOUR-CLOUD-RUN-URL.run.app',
};
```

**Note**: Check if `aiBackendUrl` already exists in these files. The `jitai.service.ts` already references `environment.aiBackendUrl`, so it may already be defined.

### Task 68.3: Update AI Backend `AgentState` to Accept Frontend's Context Shape

**File**: `apps/ai-backend/app/agents/state.py`

Review the `UserContext` model in the backend's state definition. Ensure it can accept the fields the mobile app sends. The backend's `UserContext` (used in `routes/coach.py` as a Pydantic model) needs to match what the frontend sends.

**Check**: `apps/ai-backend/app/agents/state.py` and `apps/ai-backend/app/routes/coach.py` for the `UserContext` Pydantic model. Add any missing optional fields that the frontend now sends (`injuries_notes`, `current_streak`, `weekly_adherence`, `resting_hr`, `hrv`, `sleep_hours`).

### Task 68.4: Delete or Archive the Supabase Edge Function

**File**: `supabase/functions/anthropic-key/index.ts`

This function is no longer needed. It was a key-dispensing endpoint for the now-removed client-side API pattern. Either:
- Delete the directory `supabase/functions/anthropic-key/`
- Or move it to an `archive/` folder

Also remove the corresponding Supabase Edge Function deployment if it exists in production.

### Task 68.5: Update Migration Docs to Reflect Correct Architecture

**Files**:
- `docs/CLAUDE_MAX_MIGRATION.md`
- `docs/CLAUDE_MAX_MIGRATION_COMPLETE.md`

Either delete these (they contain incorrect information about Claude Max API billing) or replace with a single doc that states:

- FitOS uses Anthropic Console API with per-token billing
- API key lives as `ANTHROPIC_API_KEY` environment variable on the AI Backend (Cloud Run)
- Mobile app calls AI Backend, never touches the API key
- Console credits must be funded separately from any Claude subscription

### Task 68.6: Add HttpClientModule / provideHttpClient to App Config

**Check**: Ensure `HttpClient` is available in the mobile app's providers. If `ai-coach.service.ts` currently doesn't use `HttpClient` (it uses raw `fetch`), you need to confirm `provideHttpClient()` is in the app's bootstrap config. The `jitai.service.ts` already injects `HttpClient`, so this is likely already configured. Verify in `apps/mobile/src/main.ts` or the app config.

---

## Sprint 69: Cost Optimization — Smart Model Routing

### Problem

Currently, `specialists.py` calls `get_smart_llm()` (Sonnet 4.5) for every single response, including simple ones like "How many calories in an apple?" At ~$3/M input + $15/M output tokens for Sonnet vs ~$0.25/M input + $1.25/M output for Haiku, that's a 12x cost difference for queries that don't need Sonnet-level intelligence.

### Task 69.1: Add Complexity-Based Model Selection to Specialist Agents

**File**: `apps/ai-backend/app/core/llm.py`

The `get_fast_llm()` and `get_smart_llm()` functions already exist. Add a third:

```python
def get_routine_llm(**kwargs: Any):
    """Get LLM for routine/simple coaching responses (Haiku-class)"""
    return get_llm(
        model="claude-3-5-haiku-20241022" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o-mini",
        temperature=0.6,
        **kwargs
    )
```

### Task 69.2: Add Query Complexity Classifier to `coach_graph.py`

**File**: `apps/ai-backend/app/agents/coach_graph.py`

After the existing `route_query()` function, add a complexity classifier. This does NOT use an LLM — it's keyword/heuristic based (free):

```python
def classify_complexity(message: str) -> Literal["simple", "moderate", "complex"]:
    """
    Classify query complexity to determine which model tier to use.
    
    Simple (Haiku): Factual lookups, confirmations, basic questions
    Moderate (Haiku): Most coaching questions with straightforward answers
    Complex (Sonnet): Program design, multi-factor analysis, nuanced advice
    """
    message_lower = message.lower()
    
    complex_keywords = [
        "design", "program", "plan", "periodiz", "create a",
        "build me", "generate", "compare", "analyze", "why does",
        "explain how", "what if", "injury", "pain", "medical",
        "plateau", "stall", "not progressing", "customize",
        "adjust my", "review my", "optimize"
    ]
    if any(keyword in message_lower for keyword in complex_keywords):
        return "complex"
    
    simple_keywords = [
        "how many calories", "how much protein", "what is",
        "when should i", "how long", "is it ok", "can i",
        "log", "record", "track", "yes", "no", "thanks",
        "repeat", "same", "ok", "got it"
    ]
    if any(keyword in message_lower for keyword in simple_keywords):
        return "simple"
    
    return "moderate"
```

### Task 69.3: Wire Complexity into Specialist Agents

**File**: `apps/ai-backend/app/agents/specialists.py`

Change each agent function to accept complexity and choose the right model:

```python
from app.core.llm import get_smart_llm, get_routine_llm

def workout_agent(state: AgentState) -> AgentState:
    complexity = state.get("complexity", "moderate")
    llm = get_smart_llm() if complexity == "complex" else get_routine_llm()
    # ... rest of function unchanged
```

Apply the same pattern to `nutrition_agent`, `recovery_agent`, `motivation_agent`, and `general_agent`.

### Task 69.4: Pass Complexity Through the Graph

**File**: `apps/ai-backend/app/agents/coach_graph.py`

Add complexity classification before routing to specialists:

```python
def classify_and_route(state: AgentState) -> AgentState:
    """Add complexity classification to state before routing"""
    state["complexity"] = classify_complexity(state["message"])
    return state
```

**File**: `apps/ai-backend/app/agents/state.py`

Add `complexity` to the `AgentState` TypedDict:

```python
class AgentState(TypedDict):
    # ... existing fields
    complexity: str  # "simple", "moderate", "complex"
```

### Task 69.5: Update Model Names to Latest Versions

**File**: `apps/ai-backend/app/core/llm.py`

```python
def get_fast_llm(**kwargs: Any):
    return get_llm(
        model="claude-3-5-haiku-20241022" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o-mini",
        **kwargs
    )

def get_routine_llm(**kwargs: Any):
    return get_llm(
        model="claude-3-5-haiku-20241022" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o-mini",
        temperature=0.6,
        **kwargs
    )

def get_smart_llm(**kwargs: Any):
    return get_llm(
        model="claude-sonnet-4-5-20250514" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o",
        **kwargs
    )
```

**File**: `apps/ai-backend/app/core/config.py` — set `DEFAULT_MODEL: str = "claude-sonnet-4-5-20250514"`

### Cost Impact Estimate

| Scenario | Model Used | Est. Cost/Message | Monthly (8 msgs/day) |
|----------|-----------|-------------------|---------------------|
| Current (all Sonnet) | Sonnet 4.5 | ~$0.01 | ~$2.40/user |
| After optimization (70% Haiku, 30% Sonnet) | Mixed | ~$0.004 | ~$0.96/user |
| Workout generation (Sonnet, longer output) | Sonnet 4.5 | ~$0.04 | ~$0.16/user (1/wk) |
| Coach Brain RAG (Sonnet, longer context) | Sonnet 4.5 | ~$0.015 | ~$0.45/user (1/day) |

**Estimated total after optimization: ~$0.80–$1.50/month per active user** (down from ~$2.50–$4.00).

---

## Sprint 70: API Key Setup & Backend Deployment

### Task 70.1: Create and Configure Anthropic Console API Key

**Manual steps (not code)**:

1. Go to `https://console.anthropic.com/settings/keys`
2. Click "Create Key" — name it "FitOS Production"
3. Copy the key (format: `sk-ant-api03-...`)
4. Add credits: `https://console.anthropic.com/settings/billing`
   - Start with $20 credit, enable auto-reload at $5 threshold with $20 reload
   - Set monthly spend limit (e.g., $50 to start)
5. This is billed separately from the $200/month Max subscription

### Task 70.2: Set API Key in Root `.env`

**File**: `.env` (root of fitos-app)

```bash
# Anthropic Console API (per-token billing, separate from Max subscription)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
OPENAI_API_KEY=sk-YOUR-OPENAI-KEY-HERE
DEFAULT_LLM_PROVIDER=anthropic
DEFAULT_MODEL=claude-sonnet-4-5-20250514
MAX_TOKENS=2048
TEMPERATURE=0.7
```

### Task 70.3: Verify AI Backend Runs Locally

```bash
cd apps/ai-backend
poetry install
python -m uvicorn main:app --reload --port 8000
curl http://localhost:8000/api/v1/health
curl -X POST http://localhost:8000/api/v1/coach/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How much protein should I eat?","conversationHistory":[],"userContext":{"user_id":"test","role":"client","goals":["muscle_gain"],"fitness_level":"intermediate"}}'
```

### Task 70.4: Deploy AI Backend to Cloud Run

Update env vars in Cloud Run: `ANTHROPIC_API_KEY`, `DEFAULT_MODEL`, `DEFAULT_LLM_PROVIDER`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ENVIRONMENT=production`

### Task 70.5: Update `environment.prod.ts` with Cloud Run URL

### Task 70.6: Clean Up Shell Environment Variable

Ensure `ANTHROPIC_API_KEY` is NOT set as a shell env var (only in `.env` file). If set, remove from `~/.zshrc` and run `unset ANTHROPIC_API_KEY`.

---

## Sprint 71: Integration Testing & Monitoring

### Task 71.1: End-to-End Test

Test all 5 agent routes through mobile app → AI Backend → Anthropic.

### Task 71.2: Verify Conversation Persistence

Confirm Supabase tables still work after the rewire.

### Task 71.3: Add Cost Monitoring

Create `apps/ai-backend/app/core/usage_tracker.py` with token/cost logging.

### Task 71.4: Verify Cost Optimization

Confirm Haiku vs Sonnet routing in logs matches complexity expectations.

---

## Files Changed Summary

### Modified

| File | Sprint | Change |
|------|--------|--------|
| `apps/mobile/src/app/core/services/ai-coach.service.ts` | 68.1 | Remove direct Anthropic calls, add backend HTTP calls |
| `apps/mobile/src/environments/environment.ts` | 68.2 | Add `aiBackendUrl` |
| `apps/mobile/src/environments/environment.prod.ts` | 68.2 | Add `aiBackendUrl` |
| `apps/ai-backend/app/agents/state.py` | 68.3, 69.4 | Add frontend context fields + complexity |
| `apps/ai-backend/app/routes/coach.py` | 68.3 | Ensure UserContext accepts new fields |
| `apps/ai-backend/app/core/llm.py` | 69.1, 69.5 | Add `get_routine_llm()`, update model names |
| `apps/ai-backend/app/agents/coach_graph.py` | 69.2, 69.4 | Add complexity classifier |
| `apps/ai-backend/app/agents/specialists.py` | 69.3 | Use complexity-based model selection |
| `apps/ai-backend/app/core/config.py` | 69.5 | Update DEFAULT_MODEL |
| `.env` | 70.2 | Add/update ANTHROPIC_API_KEY |

### New

| File | Sprint | Purpose |
|------|--------|---------|
| `apps/ai-backend/app/core/usage_tracker.py` | 71.3 | Token usage and cost logging |

### Deleted/Archived

| File | Sprint | Reason |
|------|--------|--------|
| `supabase/functions/anthropic-key/` | 68.4 | Key stays server-side now |
| `docs/CLAUDE_MAX_MIGRATION.md` | 68.5 | Incorrect billing info |
| `docs/CLAUDE_MAX_MIGRATION_COMPLETE.md` | 68.5 | Incorrect billing info |

---

## Key Decisions & Constraints

1. **Anthropic API billing is per-token, always.** No subscription covers API calls.
2. **API key never goes to the client device.** All Anthropic calls go through the AI Backend.
3. **Keyword routing stays.** Free and fast. Don't change to LLM-based routing.
4. **Conversation persistence stays in the mobile app.** Backend is stateless.
5. **Haiku for routine queries, Sonnet for complex ones.** Target 70% Haiku / 30% Sonnet.
6. **Coach Brain RAG uses Sonnet always.**
7. **Workout generation uses Sonnet always.**
8. **AI Backend Dockerfile and cloudbuild.yaml already exist.**
9. **OpenAI is used for embeddings in Coach Brain** — small separate cost.

---

## Verification Checklist

- [ ] `ai-coach.service.ts` has no references to `api.anthropic.com` or `getAnthropicConfig`
- [ ] `ai-coach.service.ts` calls `environment.aiBackendUrl + '/api/v1/coach/chat'`
- [ ] `supabase/functions/anthropic-key/` is deleted or archived
- [ ] `ANTHROPIC_API_KEY` is NOT set as a shell environment variable on dev machine
- [ ] `ANTHROPIC_API_KEY` IS set in root `.env` file (for backend to read)
- [ ] AI Backend starts locally and responds to `/api/v1/health`
- [ ] AI Backend chat endpoint returns responses with correct `agentSource`
- [ ] Mobile app AI Coach chat works end-to-end through backend
- [ ] Conversation history persists across app restarts
- [ ] Simple queries log as Haiku model in backend logs
- [ ] Complex queries log as Sonnet model in backend logs
- [ ] Anthropic Console shows API calls under the account
- [ ] Migration docs are deleted or corrected
- [ ] Console API credits are funded with auto-reload enabled
