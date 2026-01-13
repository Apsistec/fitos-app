# FitOS Infrastructure Cost Analysis

**Version:** 1.0  
**Date:** January 2026  
**Business Model:** 2-person startup, US market

---

## Executive Summary

| Scale | Monthly Cost | Per-User Cost |
|-------|--------------|---------------|
| 100 users | $400-800 | $4-8 |
| 1,000 users | $1,200-2,000 | $1.20-2.00 |
| 10,000 users | $7,300-14,500 | $0.73-1.45 |

**Break-even:** 21 customers at $29/mo, 10 at $59/mo, or 6 at $99/mo

---

## Fixed Monthly Costs

These costs are incurred regardless of user count:

| Service | Cost | Purpose | Notes |
|---------|------|---------|-------|
| **Supabase Pro** | $25/mo | Database, Auth, Storage, Edge Functions | 8GB database, 250GB bandwidth |
| **Cloud Run (base)** | $50-100/mo | AI backend hosting | Minimum instance for low latency |
| **Resend (email)** | $20/mo | Email sending | 50K emails/mo |
| **Domain + DNS** | $15/mo | fitos.app | Cloudflare |
| **Apple Developer** | $8.25/mo | App Store | $99/year |
| **Google Play** | $2.08/mo | Play Store | $25 one-time, amortized |
| **Error Monitoring** | $0-29/mo | Sentry | Free tier initially |
| **Misc/Buffer** | $50/mo | Unexpected costs | |
| **TOTAL** | **$170-250/mo** | | |

---

## Variable Costs Per User

### AI Services

| Service | 100 Users | 10K Users | Notes |
|---------|-----------|-----------|-------|
| **AI Chat (Claude 3.5 Haiku)** | $0.10-0.30/user | $0.05-0.20/user | 20-50 queries/user/mo |
| **AI Chat (Claude 3.5 Sonnet)** | $0.30-1.00/user | $0.20-0.60/user | Complex coaching only |
| **Voice STT (Deepgram)** | $0.15-0.40/user | $0.08-0.25/user | 10-30 min/user/mo |
| **Voice TTS (Deepgram Aura)** | $0.05-0.15/user | $0.03-0.10/user | Confirmation responses |

**AI Cost Optimization:**
- Use Claude 3.5 Haiku ($0.25/$1.25 per 1M tokens) for routine queries
- Reserve Claude 3.5 Sonnet ($3/$15 per 1M tokens) for complex coaching
- Cache common AI responses (30-50% reduction)
- Batch API calls where possible

### Food Recognition

| Service | 100 Users | 10K Users | Notes |
|---------|-----------|-----------|-------|
| **Passio AI** | $0.25-0.50/user | $0.15-0.30/user | 50-100 scans/user/mo |
| **Alternative: SnapCalorie** | $0.20-0.40/user | $0.12-0.25/user | Simpler API |

**Passio Pricing Tiers:**
- Free: Limited testing
- $25/mo: ~500 scans
- $100/mo: ~2,500 scans
- $300/mo: ~10,000 scans
- Enterprise: Custom

### Wearable Integration

| Service | 100 Users | 10K Users | Notes |
|---------|-----------|-----------|-------|
| **Health Connect + HealthKit** | $0 | $0 | Native integration |
| **Terra API** | $0.80-1.00/user | $0.40-0.60/user | Garmin/WHOOP/Oura |

**Terra Pricing:**
- Free: 100K credits
- After free tier: $0.005/credit
- Minimum: $399/mo

**Recommendation:** Start with Health Connect + HealthKit only (covers 80%+ of users). Add Terra at 100+ users when Garmin/WHOOP/Oura requests become frequent.

### Infrastructure

| Service | 100 Users | 10K Users | Notes |
|---------|-----------|-----------|-------|
| **Supabase Overages** | $0.25-0.50/user | $0.02-0.05/user | Database reads/storage |
| **Cloud Run Compute** | $0.10-0.20/user | $0.02-0.05/user | AI inference spikes |
| **Cloudflare** | $0 | $0-0.01/user | CDN, caching |

---

## Scenario Analysis

### Scenario 1: 100 Users (Year 1 Target)

| Category | Monthly Cost |
|----------|--------------|
| Fixed Costs | $200 |
| AI Services (Haiku only) | $30-50 |
| Voice | $20-40 |
| Food Recognition (Passio $25 tier) | $25 |
| Wearables (native only) | $0 |
| Infrastructure overages | $25-50 |
| **TOTAL** | **$300-365** |
| **Per User** | **$3.00-3.65** |

**Gross Margin at $29/mo:** ~87%  
**Gross Margin at $59/mo:** ~94%

### Scenario 2: 1,000 Users (Year 2 Target)

| Category | Monthly Cost |
|----------|--------------|
| Fixed Costs | $250 |
| AI Services | $200-400 |
| Voice | $150-300 |
| Food Recognition (Passio $100 tier) | $100 |
| Wearables (Terra minimum) | $399 |
| Infrastructure overages | $100-200 |
| **TOTAL** | **$1,199-1,649** |
| **Per User** | **$1.20-1.65** |

**Gross Margin at $29/mo:** ~94%  
**Gross Margin at $59/mo:** ~97%

### Scenario 3: 10,000 Users (Scale)

| Category | Monthly Cost |
|----------|--------------|
| Fixed Costs (Supabase Team) | $600 |
| AI Services | $1,500-3,000 |
| Voice | $800-2,000 |
| Food Recognition | $1,500-3,000 |
| Wearables (Terra at scale) | $4,000-6,000 |
| Infrastructure | $300-500 |
| **TOTAL** | **$8,700-15,100** |
| **Per User** | **$0.87-1.51** |

**Gross Margin at $29/mo:** ~95%  
**Gross Margin at $59/mo:** ~98%

---

## Cost Optimization Strategies

### 1. AI Cost Reduction (30-50% savings)

```typescript
// Use Haiku for simple queries, Sonnet for complex
const selectModel = (query: string, context: any): string => {
  const complexPatterns = [
    /program|periodization|injury|pain|medical/i,
    /why should I|explain the science|research/i,
    /create.*plan|design.*workout/i
  ];
  
  const isComplex = complexPatterns.some(p => p.test(query)) 
    || context.requiresReasoning;
  
  return isComplex ? 'claude-3-5-sonnet' : 'claude-3-5-haiku';
};

// Cache common responses
const responseCache = new Map<string, CachedResponse>();

const getCachedOrGenerate = async (query: string): Promise<string> => {
  const normalized = normalizeQuery(query);
  const cached = responseCache.get(normalized);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.response; // Free!
  }
  
  const response = await generateAIResponse(query);
  
  // Cache common fitness questions for 24h
  if (isCommonQuery(query)) {
    responseCache.set(normalized, {
      response,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000
    });
  }
  
  return response;
};
```

### 2. Voice Cost Reduction (20-30% savings)

```typescript
// Use streaming only for real-time workout logging
// Use batch transcription for nutrition logging (can wait 1-2 sec)

const transcribe = async (
  audio: Blob, 
  mode: 'realtime' | 'batch'
): Promise<string> => {
  if (mode === 'realtime') {
    // Streaming - higher cost but instant
    return await deepgramStream(audio);
  } else {
    // Batch - 40% cheaper, 1-2 sec latency
    return await deepgramBatch(audio);
  }
};

// Implement voice activation detection to reduce transcription time
const detectSpeech = (audioBuffer: Float32Array): boolean => {
  const rms = Math.sqrt(
    audioBuffer.reduce((sum, val) => sum + val * val, 0) / audioBuffer.length
  );
  return rms > SPEECH_THRESHOLD;
};
```

### 3. Wearable Cost Control

**Phase 1 (0-100 users):** Native only
- Health Connect + HealthKit = $0/month
- Covers: Apple Watch, Samsung, Fitbit (via Health Connect), Google Fit

**Phase 2 (100+ users):** Selective Terra
- Only enable Terra for users who specifically request Garmin/WHOOP/Oura
- Estimated 20-30% of users need Terra = 70% cost savings vs full rollout

```typescript
// Feature flag for Terra
const needsTerraIntegration = (user: User): boolean => {
  const terraDevices = ['Garmin', 'WHOOP', 'Oura', 'Polar', 'Coros'];
  return user.requestedDevices?.some(d => terraDevices.includes(d)) ?? false;
};
```

### 4. Database Optimization

```sql
-- Partition large tables by date
CREATE TABLE nutrition_logs (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL,
  -- ... other columns
) PARTITION BY RANGE (logged_at);

-- Create monthly partitions
CREATE TABLE nutrition_logs_2026_01 
  PARTITION OF nutrition_logs 
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- Archive old data to cold storage after 12 months
-- Reduces active database size by 60-80%
```

---

## Year 1 Budget Projection

**Assumptions:**
- Launch Month 3
- 10 users Month 3, growing to 100 by Month 12
- Average $44/user revenue (mix of $29 and $59 tiers)

| Month | Users | Revenue | Costs | Net |
|-------|-------|---------|-------|-----|
| 1 | 0 | $0 | $200 | -$200 |
| 2 | 0 | $0 | $200 | -$200 |
| 3 | 10 | $440 | $220 | +$220 |
| 4 | 20 | $880 | $240 | +$640 |
| 5 | 35 | $1,540 | $270 | +$1,270 |
| 6 | 50 | $2,200 | $300 | +$1,900 |
| 7 | 60 | $2,640 | $320 | +$2,320 |
| 8 | 70 | $3,080 | $340 | +$2,740 |
| 9 | 80 | $3,520 | $360 | +$3,160 |
| 10 | 90 | $3,960 | $380 | +$3,580 |
| 11 | 95 | $4,180 | $390 | +$3,790 |
| 12 | 100 | $4,400 | $400 | +$4,000 |
| **TOTAL** | | **$26,840** | **$3,620** | **+$23,220** |

**Year 1 Summary:**
- Total Revenue: $26,840
- Total Costs: $3,620
- Net Profit: $23,220
- Gross Margin: 86.5%

---

## API Pricing Reference

### Anthropic Claude

| Model | Input | Output | Best For |
|-------|-------|--------|----------|
| Claude 3.5 Haiku | $0.25/1M | $1.25/1M | Quick responses, simple queries |
| Claude 3.5 Sonnet | $3.00/1M | $15.00/1M | Complex reasoning, coaching |
| Claude 3 Opus | $15.00/1M | $75.00/1M | Not recommended (cost) |

### Deepgram

| Service | Price | Notes |
|---------|-------|-------|
| Nova-2 STT | $0.0043/min | Real-time streaming |
| Nova-2 STT (batch) | $0.0025/min | Non-real-time |
| Aura TTS | $0.015/1K chars | Voice responses |

### Supabase

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | 500MB DB, 1GB storage, 2GB bandwidth |
| Pro | $25/mo | 8GB DB, 100GB storage, 250GB bandwidth |
| Team | $599/mo | Unlimited, SOC2, priority support |

### Terra API

| Usage | Price |
|-------|-------|
| First 100K credits | Free |
| After free tier | $0.005/credit |
| Typical user/month | 150-200 credits ($0.75-1.00) |
| Minimum commitment | $399/mo |

### Passio AI

| Tier | Price | Scans |
|------|-------|-------|
| Starter | $25/mo | ~500 |
| Growth | $100/mo | ~2,500 |
| Scale | $300/mo | ~10,000 |
| Enterprise | Custom | Unlimited |

---

## Cost Monitoring Dashboard

Track these metrics weekly:

```typescript
interface CostMetrics {
  // AI costs
  claudeTokensUsed: number;
  claudeCost: number;
  avgTokensPerQuery: number;
  cacheHitRate: number;
  
  // Voice costs
  deepgramMinutes: number;
  deepgramCost: number;
  avgMinutesPerUser: number;
  
  // Food recognition
  passioScans: number;
  passioCost: number;
  avgScansPerUser: number;
  
  // Infrastructure
  supabaseReads: number;
  supabaseStorage: number;
  cloudRunCPUHours: number;
  
  // Aggregates
  totalCost: number;
  costPerUser: number;
  costPerActiveUser: number;
  grossMargin: number;
}
```

---

## Recommendations

### Immediate (Months 1-3)
1. Start with Supabase Pro ($25) + minimal Cloud Run ($50)
2. Use Claude 3.5 Haiku only for AI features
3. Native wearable integration only (Health Connect + HealthKit)
4. Passio $25 tier for photo nutrition

### Growth (Months 4-6)
1. Add response caching to reduce AI costs 30-50%
2. Implement smart model selection (Haiku vs Sonnet)
3. Add Terra only for users requesting Garmin/WHOOP/Oura
4. Upgrade Passio tier based on usage

### Scale (Months 7-12)
1. Consider Supabase Team for enterprise features
2. Negotiate volume discounts with API providers
3. Evaluate self-hosting voice transcription (Whisper)
4. Implement cold storage for historical data

---

## Summary

FitOS has a highly favorable unit economics profile:

- **Per-user costs:** $3-4 at startup scale, dropping to <$1.50 at 10K users
- **Gross margins:** 85-97% depending on tier
- **Break-even:** Very achievable at 10-25 customers
- **Wearables strategy:** Native-first saves $0.80-1.00/user initially

The key cost drivers are:
1. Wearables (40-50% of variable costs) - defer Terra until necessary
2. AI services (25-30%) - use Haiku, cache aggressively
3. Food recognition (15-20%) - tier appropriately

With careful optimization, FitOS can maintain 85%+ gross margins at any scale.
