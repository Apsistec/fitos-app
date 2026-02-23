# Claude Max Migration - Complete Guide

## Summary of Findings

✅ **Your FitOS app is well-architected!** The mobile app doesn't directly call Anthropic API - it goes through your AI Backend, which is the right approach.

### Architecture Flow

```g
Mobile App (port 4200)
    ↓ HTTP Request
AI Backend (port 8000 / Cloud Run)
    ↓ Uses langchain-anthropic + anthropic SDK
Anthropic API
```

## Anthropic API Key Locations Found

### 1. ✅ **Edge Function** (UPDATED)

**File**: `supabase/functions/anthropic-key/index.ts`

- **Status**: ✅ Already updated to Claude Max configuration
- **Note**: This function is NOT currently called by the mobile app
- **Action**: None needed (already done)

### 2. ⚠️ **AI Backend Configuration**

**File**: `apps/ai-backend/app/core/config.py`

- **Current**: Looks for `ANTHROPIC_API_KEY` environment variable
- **Used by**: `apps/ai-backend/app/core/llm.py` via `langchain-anthropic`
- **Action**: Update `.env` with your Claude Max API key

### 3. ⚠️ **Root Environment File**

**File**: `.env` (root level)

- **Current**: Comment about Anthropic key, but variable appears to be removed/commented
- **Action**: Add your Claude Max API key here

## How to Complete the Migration

### Step 1: Get Your Claude Max API Key

1. Go to: <https://console.anthropic.com/settings/keys>
2. Click "Create Key" or use an existing key
3. Copy your API key (format: `sk-ant-api03-...`)
4. **Important**: This key will be associated with your Claude Max subscription

### Step 2: Update Root `.env` File

Open `/Users/dougwhite/Dev/fitos-app/.env` and add/update:

```bash
# ============================================================================
# AI / LLM Providers
# ============================================================================
# Anthropic Claude Max — Get from: https://console.anthropic.com/settings/keys
# Note: API calls are charged against Claude Max subscription (no per-token charges)
ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE

# OpenAI (optional) — Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=sk-YOUR-OPENAI-KEY-HERE

# Deepgram (voice logging) — Get from: https://console.deepgram.com/
DEEPGRAM_API_KEY=YOUR-DEEPGRAM-KEY-HERE

# Resend (email) — Get from: https://resend.com/api-keys
RESEND_API_KEY=YOUR-RESEND-KEY-HERE
 
# ============================================================================
# AI Backend Configuration (apps/ai-backend)
# ============================================================================
DEFAULT_LLM_PROVIDER=anthropic
DEFAULT_MODEL=claude-sonnet-4-5-20250514
MAX_TOKENS=2048
TEMPERATURE=0.7

# JITAI Configuration
MAX_DAILY_INTERVENTIONS=3
INTERVENTION_THRESHOLD=0.7
```

### Step 3: Update AI Backend Model Names (Optional)

The AI Backend currently uses older model names. Update to latest Claude Max models:

**File**: `apps/ai-backend/app/core/llm.py`

Find the `get_fast_llm()` and `get_smart_llm()` functions and update:

```python
def get_fast_llm(**kwargs: Any):
    """Get a fast, cheap LLM for simple tasks"""
    return get_llm(
        model="claude-3-5-haiku-20241022" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o-mini",
        **kwargs
    )


def get_smart_llm(**kwargs: Any):
    """Get the most capable LLM for complex reasoning"""
    return get_llm(
        model="claude-sonnet-4-5-20250514" if settings.DEFAULT_LLM_PROVIDER == "anthropic" else "gpt-4o",
        **kwargs
    )
```

### Step 4: Update Default Model in `.env`

Update the `DEFAULT_MODEL` to use the latest Sonnet 4.5:

```bash
DEFAULT_MODEL=claude-sonnet-4-5-20250514
```

### Step 5: Test Locally

1. **Start Supabase**:

   ```bash
   npm run db:start
   ```

2. **Start AI Backend**:

   ```bash
   cd apps/ai-backend
   poetry install  # If you haven't already
   poetry run python -m uvicorn main:app --reload
   ```

3. **Start Mobile App** (in another terminal):

   ```bash
   npm start
   ```

4. **Test AI Coach**:
   - Open <http://localhost:4200>
   - Navigate to AI Coach chat
   - Send a message: "How much protein should I eat?"
   - Verify you get a response

5. **Check Logs**:
   - AI Backend terminal should show: "Processing chat for user..."
   - Mobile app Network tab should show successful call to `localhost:8000/api/v1/coach/chat`

### Step 6: Update Cloud Run Deployment

When you deploy your AI Backend to Google Cloud Run:

1. Go to Google Cloud Console
2. Find your Cloud Run service for the AI Backend
3. Click "Edit & Deploy New Revision"
4. Under "Variables & Secrets" → "Environment Variables"
5. Add or update:

   ```f
   ANTHROPIC_API_KEY=sk-ant-api03-YOUR-KEY-HERE
   DEFAULT_MODEL=claude-sonnet-4-5-20250514
   DEFAULT_LLM_PROVIDER=anthropic
   ```

6. Deploy

### Step 7: Verify in Anthropic Console

1. Go to: <https://console.anthropic.com/>
2. Navigate to "Usage" or "API" section
3. Send a few test messages through your app
4. Verify API calls are appearing
5. Confirm billing is against your Max subscription, not pay-as-you-go

## What You Get with Claude Max

### Benefits

- ✅ **Fixed monthly cost** - No surprises from token usage
- ✅ **Higher rate limits** - Priority tier with better limits
- ✅ **Latest models** - Access to Sonnet 4.5, Haiku, Opus 4.5
- ✅ **Better for development** - Test without worrying about costs

### Model Recommendations for FitOS

```python
# Quick responses (routine queries)
model="claude-3-5-haiku-20241022"
# Use for: Simple confirmations, basic questions

# Standard intelligence (most queries)
model="claude-sonnet-4-5-20250514"  
# Use for: Workout planning, nutrition advice, general coaching

# Advanced reasoning (complex tasks)
model="claude-opus-4-5-20251101"
# Use for: Complex program design, medical edge cases
```

Current usage in your backend:

- `get_fast_llm()` → Used for routing/classification
- `get_llm()` → Used by specialist agents (workout, nutrition, recovery, motivation)
- `get_smart_llm()` → Not currently used, but available for complex tasks

## Current Backend Configuration

Your AI Backend at `apps/ai-backend/` uses:

**Packages**:

- `langchain-anthropic` v0.2.5
- `anthropic` v0.39.0
- `langgraph` v1.0.0

**Config** (`app/core/config.py`):

- Loads from root `.env` file (correct!)
- Default provider: `anthropic`
- Default model: `claude-sonnet-4.5` (older name, should update to `claude-sonnet-4-5-20250514`)

**LLM Usage** (`app/core/llm.py`):

- `ChatAnthropic` from `langchain-anthropic`
- Uses `settings.ANTHROPIC_API_KEY`
- Good error handling if key is missing

**Agent Flow** (`app/agents/coach_graph.py`):

- Router → Specialist Agent → Escalation Check
- Specialist agents use `get_llm()` which respects your DEFAULT_MODEL setting

## Troubleshooting

### Error: "ANTHROPIC_API_KEY not set in environment"

- **Cause**: `.env` file doesn't have the key or AI Backend isn't loading it
- **Fix**: Verify `.env` exists at root level and has `ANTHROPIC_API_KEY=...`
- **Test**: `cd apps/ai-backend && poetry run python -c "from app.core.config import settings; print(settings.ANTHROPIC_API_KEY)"`

### Error: "Could not authenticate with Anthropic API"

- **Cause**: Invalid API key or key not associated with Max subscription
- **Fix**: Verify your key at <https://console.anthropic.com/settings/keys>
- **Note**: Make sure you're using a key from YOUR account, not the example key

### Error: "Failed to get AI response"

- **Cause**: AI Backend is down or not reachable
- **Fix**: Check AI Backend is running on port 8000
- **Test**: `curl http://localhost:8000/health`

### API calls not showing in Anthropic Console

- **Cause**: Using wrong API key or calls not reaching Anthropic
- **Fix**: Check logs in AI Backend terminal
- **Debug**: Add logging in `llm.py` to confirm API key being used

## Files Changed

1. ✅ `supabase/functions/anthropic-key/index.ts` - Updated to Claude Max config
2. ⚠️ `.env` - Need to add your Claude Max API key
3. ⚠️ `apps/ai-backend/app/core/llm.py` - Recommended to update model names
4. ✅ `docs/CLAUDE_MAX_MIGRATION.md` - This guide

## Next Steps

1. [ ] Add Claude Max API key to `.env`
2. [ ] Test locally with AI Backend + Mobile App
3. [ ] Update model names in `llm.py` (optional but recommended)
4. [ ] Deploy to Cloud Run with new key
5. [ ] Verify in Anthropic Console that calls are appearing
6. [ ] Confirm billing is against Max subscription

## Questions?

If you run into issues:

1. Check AI Backend logs: Look for errors in the terminal where uvicorn is running
2. Check browser console: Network tab should show successful calls to `/api/v1/coach/chat`
3. Check Anthropic Console: Verify API calls are showing up under your account

Let me know if you need help with any step!

---

**Last Updated**: 2026-02-15
**Status**: Edge Function updated ✅, AI Backend needs key update ⚠️
