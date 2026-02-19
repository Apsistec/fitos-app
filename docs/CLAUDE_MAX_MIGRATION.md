# Migration to Claude Max - Action Items

## Overview
FitOS currently uses the Anthropic API with a pay-as-you-go API key. This document outlines the changes needed to switch to Claude Max subscription, which includes API access without per-token charges.

## Current Architecture

```
Mobile App (Ionic Angular)
    ↓
AI Backend (FastAPI on Cloud Run)
    ↓
Anthropic API (with ANTHROPIC_API_KEY)
```

## Changes Completed

### ✅ 1. Updated Edge Function
**File**: `supabase/functions/anthropic-key/index.ts`

**Changes**:
- Removed dependency on `ANTHROPIC_API_KEY` environment variable
- Updated to return Claude Max configuration instead of API key
- Added latest model versions (Sonnet 4.5, Haiku, Opus 4.5)
- Documented that API access is included in Claude Max subscription

**Note**: This Edge Function is not currently called by the mobile app, but has been updated for future use.

## Changes Still Needed

### ⚠️ 2. Update AI Backend
**Location**: `apps/ai-backend/`

**Action Required**: 
The AI Backend is where actual Anthropic API calls are made. You need to:

1. **Review current implementation**:
   ```bash
   cd apps/ai-backend
   grep -r "anthropic" app/
   grep -r "ANTHROPIC_API_KEY" app/
   ```

2. **Update to use Claude Max**:
   - If using `@anthropic-ai/sdk`, ensure it's configured for Max subscription
   - Claude Max provides API access through the same API endpoints
   - The key difference is billing - charges go against your Max subscription instead of pay-as-you-go

3. **Configuration**:
   - Claude Max API access uses the same API key format
   - Get your Max API key from: https://console.anthropic.com/settings/keys
   - The key will be associated with your Max subscription
   - Set this as `ANTHROPIC_API_KEY` in your environment

### ⚠️ 3. Update Environment Variables

**File**: `.env` (root level)

**Current**:
```bash
# Anthropic — Get from: https://console.anthropic.com/settings/keys
# (commented out or missing)
```

**Action**:
1. Get your Claude Max API key from Anthropic Console
2. Update `.env`:
   ```bash
   # Anthropic Claude Max — Get from: https://console.anthropic.com/settings/keys
   # Note: This key is associated with Claude Max subscription (no per-token charges)
   ANTHROPIC_API_KEY=sk-ant-api03-...your-max-key-here
   ```

### ⚠️ 4. Update Supabase Environment Variables

**Location**: Supabase Dashboard → Settings → Edge Functions → Environment Variables

**Action**:
1. Go to: https://supabase.com/dashboard/project/dmcogmopboebqiimzoej/settings/functions
2. Remove or update `ANTHROPIC_API_KEY` variable
3. Set it to your Claude Max API key if you plan to use the Edge Function

**Note**: Currently the mobile app doesn't call this Edge Function, so this is optional.

### ⚠️ 5. Update Cloud Run Environment

**Location**: Google Cloud Run (where AI Backend is deployed)

**Action**:
1. Go to your Cloud Run service for the AI Backend
2. Update environment variables:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-...your-max-key-here
   ```
3. Deploy updated configuration

## Verification Steps

After making changes:

1. **Test AI Backend Locally**:
   ```bash
   cd apps/ai-backend
   # Set ANTHROPIC_API_KEY in .env
   poetry run python -m uvicorn main:app --reload
   # Test API endpoints
   ```

2. **Test Mobile App**:
   ```bash
   npm start
   # Navigate to /tabs/coaching/chat
   # Send a message to AI Coach
   # Verify response is generated
   ```

3. **Check Anthropic Console**:
   - Go to: https://console.anthropic.com/
   - Verify API calls are showing up under your Max subscription
   - Confirm no charges beyond subscription fee

## Benefits of Claude Max

1. **Cost Predictability**: Fixed monthly cost, no per-token charges
2. **Higher Rate Limits**: Max tier gets priority and higher limits
3. **Latest Models**: Access to Sonnet 4.5, Opus 4.5
4. **Better for Development**: Unlimited testing without worrying about costs

## Model Recommendations

For FitOS use cases:

- **Haiku** (`claude-3-5-haiku-20241022`): Quick responses, simple queries
  - Use for: Workout logging confirmations, simple nutrition questions
  
- **Sonnet 4.5** (`claude-sonnet-4-5-20250514`): Standard intelligence
  - Use for: Most coaching questions, program generation, nutrition advice
  
- **Opus 4.5** (`claude-opus-4-5-20251101`): Advanced reasoning
  - Use for: Complex program design, medical considerations, edge cases

## Questions?

If you need help with:
- Finding where Anthropic API is called in the backend
- Updating the backend configuration
- Testing the changes

Just let me know and I can help you through the specific implementation!

---

**Last Updated**: 2026-02-15
**Status**: Edge Function updated, AI Backend updates pending
