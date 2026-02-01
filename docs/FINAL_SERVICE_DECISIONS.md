# FitOS Final Service Decisions & Technology Stack

**Created:** January 30, 2026
**Purpose:** Consolidated technology decisions based on API analysis and market intelligence research
**Status:** APPROVED - Ready for Implementation

---

## Executive Summary

This document represents the **final service selection decisions** for FitOS based on comprehensive research including:
- API cost analysis and build vs. buy evaluation
- Competitive landscape and market intelligence
- Fitness science validation (2023-2025 research)
- Bootstrapped startup economics optimization

**Total estimated monthly cost at launch (500 clients):** $1,500-2,000/month
**Target market position:** MacroFactor's design + TrainHeroic's UX + Built-in CRM

---

## 1. VOICE AI: Deepgram Nova-3 ✅ SELECTED

### Decision Rationale
- **Cost:** $0.0077/minute streaming (best value for real-time)
- **Latency:** 300ms P50 (sub-500ms required for workout logging)
- **Accuracy:** 6.84% median WER (54% better than competitors)
- **Features:** Custom vocabulary boosting for fitness terms, HIPAA compliant

### Configuration
```typescript
// environment.ts
export const environment = {
  deepgram: {
    apiUrl: 'wss://api.deepgram.com/v1/listen',
    model: 'nova-3',
    language: 'en',
    features: {
      smartFormat: true,
      punctuate: true,
      utterances: true,
      vadEvents: true
    },
    keywords: [
      'squat:2', 'deadlift:2', 'bench:2', 'press:2', 'curl:2',
      'rep:2', 'reps:2', 'set:2', 'sets:2', 'kg:2', 'lbs:2',
      'done:2', 'rest:2', 'repeat:2'
    ]
  }
};
```

### Cost Projection
| Scale | Minutes/Month | Monthly Cost |
|-------|---------------|--------------|
| 500 clients | 2,500 | $23 |
| 10,000 clients | 50,000 | $450 |
| 100,000 clients | 500,000 | $4,500 |

### Alternative Considered
- AssemblyAI: $0.0025/min but requires custom vocabulary add-on
- OpenAI Whisper: No real-time streaming

---

## 2. NUTRITION DATABASE: Hybrid Approach ✅ SELECTED

### Strategy: USDA Base + Edamam NLP + Open Food Facts Barcodes

### Decision Rationale
- USDA FoodData Central: Free, government-verified, 380K foods
- Edamam: $69/month for NLP parsing ("chicken breast with rice")
- Open Food Facts: Free, 4M+ international barcodes
- **Avoided:** Nutritionix ($1,850+/month enterprise) - overkill for MVP

### Configuration
```typescript
// environment.ts
export const environment = {
  nutrition: {
    primary: {
      provider: 'usda',
      apiUrl: 'https://api.nal.usda.gov/fdc/v1',
      // API key via Edge Function
    },
    nlp: {
      provider: 'edamam',
      apiUrl: 'https://api.edamam.com/api/nutrition-data',
      // API key via Edge Function
    },
    barcode: {
      provider: 'openfoodfacts',
      apiUrl: 'https://world.openfoodfacts.org/api/v2'
      // No API key required
    }
  }
};
```

### Cost Projection
| Scale | API Calls/Month | Monthly Cost |
|-------|-----------------|--------------|
| 500 clients | 50,000 | $69 (Edamam Pro) |
| 10,000 clients | 1,000,000 | $299 (Edamam Enterprise) |
| 100,000 clients | 10,000,000 | $1,850+ (Nutritionix) |

### Phase 2 Migration Path
At 10K+ clients, evaluate Nutritionix for restaurant menu coverage (202K+ items).

---

## 3. PHOTO FOOD RECOGNITION: Gemini 2.5 Flash ✅ SELECTED

### Decision Rationale
- **Cost:** $0.001-0.004/image (vs $0.05+/image for Passio AI)
- **Accuracy:** 88.35% Expert-Weighted Recall on FoodNExTDB
- **Context:** Superior understanding of complex/mixed dishes
- **User Satisfaction:** 20% improvement reported (CalCam case study)

### Configuration
```typescript
// environment.ts
export const environment = {
  photoNutrition: {
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    apiUrl: 'https://generativelanguage.googleapis.com/v1',
    maxTokens: 1024,
    systemPrompt: `You are a nutrition analysis assistant. Analyze the food in this image and return:
1. List of identified foods with portion estimates
2. Confidence score (0-1) for each item
3. Estimated macronutrients (calories, protein, carbs, fat)
Return JSON format only.`
  }
};
```

### Cost Projection
| Scale | Photos/Month | Monthly Cost |
|-------|--------------|--------------|
| 500 clients | 5,000 | $15 |
| 10,000 clients | 100,000 | $200 |
| 100,000 clients | 1,000,000 | $2,000 |

### Hybrid Flow
1. Gemini analyzes photo → identifies foods + portions
2. Cross-reference with USDA database → precise macros
3. User confirms/adjusts → logs to nutrition service

---

## 4. LLM COACHING: Claude Haiku + Sonnet Routing ✅ SELECTED

### Decision Rationale
- **Claude Haiku:** $0.25/$1.25 per MTok - 80% of queries (simple)
- **Claude Sonnet:** $3.00/$15.00 per MTok - 20% of queries (complex)
- **Expected savings:** 40-60% vs using flagship models exclusively
- **Quality:** Anthropic models excel at empathetic, nuanced coaching

### Query Routing Logic
```typescript
// ai-coach.service.ts
interface QueryClassification {
  complexity: 'simple' | 'complex';
  category: 'workout' | 'nutrition' | 'recovery' | 'motivation' | 'general';
  requiresRAG: boolean;
  trainerOverride: boolean;
}

function selectModel(query: QueryClassification): string {
  // Escalate to Sonnet for:
  // - Complex workout programming
  // - Personalized meal plans
  // - Injury/recovery concerns
  // - Mental health adjacent topics

  if (query.complexity === 'complex' ||
      query.trainerOverride ||
      query.category === 'recovery') {
    return 'claude-sonnet-4-5';
  }
  return 'claude-haiku-4-5';
}
```

### Configuration
```typescript
// environment.ts
export const environment = {
  llm: {
    provider: 'anthropic',
    models: {
      simple: 'claude-haiku-4-5-20251001',
      complex: 'claude-sonnet-4-5-20250929',
      batch: 'claude-haiku-4-5-20251001' // 50% batch discount
    },
    contextWindow: 200000,
    promptCaching: true, // For trainer methodology
    maxConversationHistory: 10
  }
};
```

### Cost Projection (Blended Rate)
| Scale | Tokens/Month | Monthly Cost |
|-------|--------------|--------------|
| 500 clients | 5M | $25 |
| 10,000 clients | 100M | $500-800 |
| 100,000 clients | 1B | $5,000-8,000 |

---

## 5. PAYMENTS: Stripe Connect Express ✅ SELECTED

### Decision Rationale
- **Transaction fee:** 2.9% + $0.30 (industry standard)
- **Platform fee:** $2/active connected account
- **Trainer onboarding:** Minutes via Express flow
- **Instant payouts:** 1.5% fee (competitive advantage for trainers)
- **Split payments:** Native destination charges with application fees

### Configuration
```typescript
// stripe.config.ts
export const stripeConfig = {
  // Platform (FitOS)
  platformPublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  platformSecretKey: process.env.STRIPE_SECRET_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,

  // Connect settings
  connect: {
    accountType: 'express', // Not standard/custom
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true }
    },
    // Application fee: 5-10% of each transaction
    applicationFeePercent: 5,
    // Payout schedule
    payoutSchedule: {
      interval: 'weekly',
      weeklyAnchor: 'friday'
    }
  },

  // Subscription products
  products: {
    trainerBasic: 'prod_trainer_basic',
    trainerPro: 'prod_trainer_pro',
    gymOwner: 'prod_gym_owner',
    client: 'prod_client' // For direct billing
  }
};
```

### Revenue Model
| Transaction Type | FitOS Fee | Stripe Fee | Trainer Receives |
|------------------|-----------|------------|------------------|
| $100 session | $5 (5%) | $3.20 | $91.80 |
| $200/mo subscription | $10 (5%) | $6.10 | $183.90 |

---

## 6. EMAIL: Resend ✅ SELECTED

### Decision Rationale
- **Cost:** $20/month for 10K emails (vs SES complexity)
- **DX:** React Email templates, modern API
- **Deliverability:** Strong inbox placement
- **Simplicity:** No infrastructure to manage

### Configuration
```typescript
// email.config.ts
export const emailConfig = {
  provider: 'resend',
  apiKey: process.env.RESEND_API_KEY,
  fromAddress: 'noreply@fitos.app',
  replyTo: 'support@fitos.app',

  templates: {
    welcome: 're_template_welcome',
    verification: 're_template_verify',
    passwordReset: 're_template_reset',
    sessionReminder: 're_template_reminder',
    weeklyReport: 're_template_report'
  }
};
```

### Cost Projection
| Scale | Emails/Month | Monthly Cost |
|-------|--------------|--------------|
| 500 clients | 15,000 | $20 |
| 10,000 clients | 300,000 | $200 |
| 100,000 clients | 3,000,000 | $650 |

---

## 7. WEARABLES: Terra API + HealthKit Native ✅ SELECTED

### Decision Rationale
- **Terra API:** 150+ wearables via single integration
- **HealthKit:** Native iOS access for deeper data
- **Data focus:** HRV, sleep, resting HR (NOT calorie burn)
- **ACWR:** Recovery-based training recommendations

### Configuration
```typescript
// wearables.config.ts
export const wearablesConfig = {
  terra: {
    apiKey: process.env.TERRA_API_KEY,
    devId: process.env.TERRA_DEV_ID,
    webhookSecret: process.env.TERRA_WEBHOOK_SECRET,

    providers: [
      'GARMIN', 'FITBIT', 'OURA', 'WHOOP',
      'POLAR', 'SAMSUNG', 'COROS'
    ],

    dataTypes: [
      'activity', 'sleep', 'body', 'daily', 'menstruation'
    ],

    // Explicitly NOT tracking calorie burn (inaccurate)
    excludeMetrics: ['calories_burned', 'active_calories']
  },

  healthKit: {
    // Native HealthKit for iOS
    dataTypes: [
      'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      'HKQuantityTypeIdentifierRestingHeartRate',
      'HKCategoryTypeIdentifierSleepAnalysis',
      'HKQuantityTypeIdentifierStepCount',
      'HKQuantityTypeIdentifierActiveEnergyBurned' // For reference only
    ]
  }
};
```

### HRV-Based Recovery Algorithm (Kiviniemi)
```typescript
interface RecoveryRecommendation {
  score: number; // 0-100
  recommendation: 'high_intensity' | 'moderate' | 'light' | 'rest';
  reason: string;
}

function calculateRecovery(
  todayHRV: number,
  weeklyAverage: number,
  restingHR: number,
  sleepQuality: number
): RecoveryRecommendation {
  const hrvRatio = todayHRV / weeklyAverage;

  if (hrvRatio >= 1.05 && sleepQuality >= 0.7) {
    return {
      score: 90,
      recommendation: 'high_intensity',
      reason: 'HRV above baseline with good sleep - optimal for hard training'
    };
  }
  // ... additional logic
}
```

---

## 8. MONITORING & ERROR TRACKING: Sentry + PostHog ✅ SELECTED

### Decision Rationale
- **Sentry:** Industry-standard error tracking, replay for debugging
- **PostHog:** Product analytics, feature flags, session recording
- **Combined cost:** ~$0 at launch (free tiers), ~$100/mo at scale

### Configuration
```typescript
// monitoring.config.ts
export const monitoringConfig = {
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1, // 10% of transactions
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% on error
    integrations: ['Angular', 'HttpClient', 'BrowserTracing']
  },

  posthog: {
    apiKey: process.env.POSTHOG_API_KEY,
    apiHost: 'https://app.posthog.com',
    autocapture: true,
    sessionRecording: true,
    featureFlags: true
  }
};
```

### Key Metrics to Track
```typescript
// Analytics events
const TRACKED_EVENTS = {
  // Acquisition
  'user_signed_up': { role: string },
  'trainer_onboarded': { plan: string },

  // Engagement
  'workout_started': { type: string },
  'workout_completed': { duration: number },
  'nutrition_logged': { method: 'manual' | 'voice' | 'photo' },
  'ai_coach_message': { agent: string },

  // Retention
  'streak_achieved': { days: number },
  'streak_broken': { days: number },
  'milestone_reached': { type: string },

  // Revenue
  'subscription_started': { plan: string, amount: number },
  'subscription_canceled': { reason: string },
  'payout_requested': { amount: number }
};
```

---

## 9. DATABASE & BACKEND: Supabase (Current) ✅ CONFIRMED

### Decision Rationale
- **Already implemented:** 30 migrations, RLS policies
- **Features:** PostgreSQL, Auth, Storage, Realtime, Edge Functions
- **Cost:** $25/month Pro tier (plenty for MVP)
- **pgvector:** AI embeddings for exercise similarity

### Optimization Notes
```sql
-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_workouts_user_date
  ON workouts(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nutrition_logs_user_date
  ON nutrition_logs(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON messages(conversation_id, created_at DESC);

-- Vector index for exercise similarity
CREATE INDEX IF NOT EXISTS idx_exercises_embedding
  ON exercises USING ivfflat (embedding vector_cosine_ops);
```

---

## 10. AI BACKEND: LangGraph on Cloud Run ✅ CONFIRMED

### Decision Rationale
- **Already built:** Multi-agent architecture ready
- **Deployment:** Cloud Run for serverless scaling
- **Cost:** ~$50-100/month at launch
- **MCP compatible:** Future-proofed for tool integrations

### Deployment Configuration
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/fitos-ai', './apps/ai-backend']

  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/fitos-ai']

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'fitos-ai'
      - '--image=gcr.io/$PROJECT_ID/fitos-ai'
      - '--region=us-central1'
      - '--platform=managed'
      - '--allow-unauthenticated'
      - '--memory=2Gi'
      - '--cpu=2'
      - '--min-instances=1'
      - '--max-instances=10'
```

---

## Total Monthly Cost Summary

### MVP Phase (500 clients)

| Service | Monthly Cost |
|---------|--------------|
| Deepgram (Voice) | $23 |
| Edamam (Nutrition NLP) | $69 |
| Gemini (Photo Food) | $15 |
| Claude (AI Coaching) | $25 |
| Resend (Email) | $20 |
| Stripe (Payments) | ~$1,600* |
| Supabase | $25 |
| Cloud Run (AI Backend) | $50 |
| Firebase Hosting | $0 |
| Sentry + PostHog | $0 |
| **Total Fixed APIs** | **$227/month** |
| **Total with Stripe** | **~$1,850/month** |

*Stripe fees are transaction-based (2.9% + $0.30)

### Growth Phase (10,000 clients)

| Service | Monthly Cost |
|---------|--------------|
| Deepgram (Voice) | $450 |
| Nutritionix (Upgrade) | $1,850 |
| Gemini (Photo Food) | $200 |
| Claude (AI Coaching) | $800 |
| Resend (Email) | $200 |
| Stripe (Payments) | ~$32,000* |
| Supabase | $199 |
| Cloud Run (AI Backend) | $500 |
| Sentry + PostHog | $100 |
| **Total Fixed APIs** | **$4,300/month** |
| **Total with Stripe** | **~$36,000/month** |

---

## Market Differentiation Summary

Based on competitive analysis, FitOS differentiates through:

### vs. TrueCoach (16K coaches, no AI)
✅ AI-powered coaching with trainer methodology learning
✅ Voice workout logging
✅ Built-in CRM + email marketing

### vs. Trainerize (650K coaches, slow/buggy)
✅ Fast, native mobile experience
✅ Adherence-neutral psychology
✅ Sub-10-second logging workflows

### vs. Everfit (200K coaches, nickel-and-dime pricing)
✅ All-inclusive pricing (no add-ons)
✅ Transparent, predictable costs
✅ Superior voice/photo nutrition logging

### vs. Consumer Apps (MyFitnessPal, etc.)
✅ Trainer-client relationship built-in
✅ Professional accountability
✅ HRV-based recovery (not just tracking)

---

## Implementation Priority

### Phase 1 (Weeks 1-4): Core Experience
1. **Sprint 58:** Auth & Onboarding
2. **Sprint 59:** Dashboard & Navigation
3. **Sprint 60:** Workouts (including voice logging)
4. **Sprint 61:** Nutrition (including photo AI)

### Phase 2 (Weeks 5-8): Business Features
5. **Sprint 62:** AI Coaching & Messaging
6. **Sprint 63:** Client Management
7. **Sprint 64:** CRM & Email Marketing
8. **Sprint 65:** Settings & Integrations

### Phase 3 (Weeks 9-12): Polish & Scale
9. **Sprint 66:** Analytics & Business
10. **Sprint 67:** Franchise & Enterprise
11. **Sprint 68:** Help, Social & Wellness
12. **Sprint 69:** Landing Site

---

## API Keys Required

| Service | Environment Variable | Status |
|---------|---------------------|--------|
| Deepgram | `DEEPGRAM_API_KEY` | ⏳ Needed |
| Edamam | `EDAMAM_APP_ID`, `EDAMAM_API_KEY` | ⏳ Needed |
| Gemini | `GOOGLE_AI_API_KEY` | ⏳ Needed |
| Anthropic | `ANTHROPIC_API_KEY` | ⏳ Needed |
| Resend | `RESEND_API_KEY` | ⏳ Needed |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` | ✅ Test keys configured |
| Terra | `TERRA_API_KEY`, `TERRA_DEV_ID` | ⏳ Needed |
| Sentry | `SENTRY_DSN` | ⏳ Needed |
| PostHog | `POSTHOG_API_KEY` | ⏳ Needed |
| Supabase | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | ✅ Configured |

---

## Appendix: Rejected Alternatives

### Voice AI
- **OpenAI Realtime API:** $0.30/minute (33x more expensive than Deepgram)
- **AWS Transcribe:** 700ms latency (too slow for real-time)
- **Google Cloud STT:** No custom vocabulary boosting

### Nutrition
- **Nutritionix:** $1,850/month minimum (overkill for MVP)
- **Passio AI:** $0.05/image (5x more expensive than Gemini)
- **Custom NLP:** $100-150K development cost

### LLM
- **GPT-4o:** $2.50/$10 per MTok (more expensive, less empathetic)
- **Self-hosted Llama:** Engineering overhead not justified at scale
- **Gemini:** Strong but Anthropic better for coaching tone

### Payments
- **PayPal Commerce:** Worse trainer onboarding experience
- **Square:** Not designed for marketplaces
- **Adyen:** Enterprise complexity not needed

---

*Document approved for implementation: January 30, 2026*
