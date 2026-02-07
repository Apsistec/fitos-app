# FitOS Sprints 27-45 Implementation Roadmap

**Last Updated:** 2026-01-15
**Phase 2 Status:** ✅ COMPLETE (Sprints 17-26)
**Current Phase:** Phase 3 - Market Leadership
**Based on:** Gap Analysis and Feature Roadmap 2026

---

## Quick Reference

| Sprint | Feature | Priority | Points | Status |
|--------|---------|----------|--------|--------|
| **Phase 3A: Payment Infrastructure** |
| 27 | Stripe Connect Foundation | P0 | 13 | 📋 Planned |
| 28 | Stripe Connect Marketplace | P0 | 13 | 📋 Planned |
| 29 | Payment Analytics & Recovery | P0 | 8 | 📋 Planned |
| **Phase 3B: Agentic AI** |
| 30 | LangGraph 1.0 Multi-Agent | P0 | 13 | 📋 Planned |
| 31 | Apple Health MCP Integration | P0 | 8 | 📋 Planned |
| 32 | Voice AI Sub-500ms | P1 | 13 | 📋 Planned |
| **Phase 3C: Fitness Science** |
| 33 | AI Workout Generation | P1 | 13 | 📋 Planned |
| 34 | HRV Recovery System | P0 | 8 | 📋 Planned |
| 35 | Chronotype Optimization | P1 | 8 | 📋 Planned |
| **Phase 3D: Advanced Features** |
| 36 | Nutrition Intelligence | P1 | 13 | 📋 Planned |
| 37 | Mental Health Integration | P2 | 8 | 📋 Planned |
| 38 | 66-Day Habit Tracking | P1 | 8 | 📋 Planned |
| **Phase 3E: Scale & Enterprise** |
| 39 | Integration Marketplace v2 | P1 | 13 | 📋 Planned |
| 40 | Multi-Location Management | P1 | 13 | 📋 Planned |
| 41 | Enterprise SSO | P2 | 8 | 📋 Planned |
| **Phase 3F: Market Leadership** |
| 42 | Local SEO Automation | P2 | 8 | 📋 Planned |
| 43 | Outcome-Based Pricing | P2 | 8 | 📋 Planned |
| 44 | A2A Protocol Compatibility | P2 | 5 | 📋 Planned |
| 45 | Healthcare Integration Prep | P2 | 8 | 📋 Planned |

**Total Phase 3:** 189 story points across 19 sprints

---

## Phase 3A: Payment Infrastructure (Sprints 27-29)

### Sprint 27: Stripe Connect Foundation (13 points)

**Goal:** Implement Stripe Connect Express accounts for marketplace functionality

**Strategic Value:** Enables gym→trainer payment splits, marketplace economics, instant payouts

#### Task 27.1: Express Account Onboarding Flow
**Files to create:**
- `apps/mobile/src/app/features/payments/pages/connect-onboarding/connect-onboarding.page.ts`
- `apps/mobile/src/app/core/services/stripe-connect.service.ts`
- `supabase/functions/stripe-connect/index.ts`

**Features:**
- 2-minute onboarding with Stripe handling KYC
- Connected account creation for gym owners and trainers
- Onboarding status tracking
- Dashboard link generation

**Database Schema:**
```sql
CREATE TABLE stripe_connect_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  stripe_account_id TEXT NOT NULL,
  account_type TEXT DEFAULT 'express' CHECK (account_type IN ('express', 'standard', 'custom')),
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  details_submitted BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE stripe_connect_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES stripe_connect_accounts(id),
  application_fee_percent DECIMAL(5,2) DEFAULT 10.00,
  payout_schedule TEXT DEFAULT 'daily',
  statement_descriptor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- [ ] Gym owners can onboard in <3 minutes
- [ ] Trainers can onboard via invitation link
- [ ] Account status visible in settings
- [ ] Webhook handles account updates

---

#### Task 27.2: Destination Charges Implementation
**Files to modify:**
- `apps/mobile/src/app/core/services/payment.service.ts`
- `supabase/functions/create-payment-intent/index.ts`

**Features:**
- Payment routing to connected accounts
- Automatic platform fee deduction (10%)
- Support for gym→trainer secondary splits

**Payment Flow:**
```typescript
// Client pays $100 for training session
const paymentIntent = await stripe.paymentIntents.create({
  amount: 10000, // $100.00
  currency: 'usd',
  transfer_data: {
    destination: gymOwnerStripeAccountId,
  },
  application_fee_amount: 1000, // $10.00 platform fee
  metadata: {
    client_id: clientId,
    trainer_id: trainerId,
    session_type: 'personal_training'
  }
});
```

**Acceptance Criteria:**
- [ ] Payments route to correct connected account
- [ ] Platform fee collected automatically
- [ ] Trainer secondary transfers work

---

### Sprint 28: Stripe Connect Marketplace (13 points)

**Goal:** Complete marketplace functionality with embedded components and trainer payouts

#### Task 28.1: Connect Embedded Components
**Files to create:**
- `apps/mobile/src/app/features/payments/components/connect-dashboard/connect-dashboard.component.ts`
- `apps/mobile/src/app/features/payments/components/payout-settings/payout-settings.component.ts`

**Features:**
- White-labeled account dashboard
- Payout settings management
- Balance and transaction views
- Dispute management

**Implementation:**
```typescript
// Using Stripe Connect Embedded Components
@Component({
  selector: 'fit-connect-dashboard',
  template: `
    <div class="connect-dashboard">
      <stripe-connect-account-management
        [stripeConnectInstance]="stripeConnectInstance"
      />
    </div>
  `
})
export class ConnectDashboardComponent {
  stripeConnectInstance = signal<StripeConnectInstance | null>(null);
  
  async ngOnInit() {
    const { stripeConnectInstance } = await loadConnectAndInitialize({
      publishableKey: environment.stripePublishableKey,
      fetchClientSecret: this.fetchClientSecret.bind(this)
    });
    this.stripeConnectInstance.set(stripeConnectInstance);
  }
}
```

---

#### Task 28.2: Trainer Payout System
**Files to create:**
- `apps/mobile/src/app/features/payments/pages/trainer-payouts/trainer-payouts.page.ts`
- `supabase/functions/process-trainer-payout/index.ts`

**Features:**
- Instant payout capability
- Commission tracking
- Payout history
- Tax document access (1099)

**Database Schema:**
```sql
CREATE TABLE trainer_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  gym_id UUID REFERENCES gyms(id),
  stripe_transfer_id TEXT,
  amount_cents INTEGER NOT NULL,
  commission_percent DECIMAL(5,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  payout_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE trainer_commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  gym_id UUID REFERENCES gyms(id),
  commission_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

### Sprint 29: Payment Analytics & Recovery (8 points)

**Goal:** Implement Smart Retries and payment analytics

#### Task 29.1: Smart Retries Activation
**Files to modify:**
- `supabase/functions/subscription-webhook/index.ts`

**Features:**
- Enable Stripe Smart Retries (ML-optimized retry timing)
- Failed payment recovery workflows
- Customer communication automation

**Expected Impact:** +57% failed payment recovery (industry benchmark from Deliveroo)

---

#### Task 29.2: Payment Analytics Dashboard
**Files to create:**
- `apps/mobile/src/app/features/analytics/pages/payment-analytics/payment-analytics.page.ts`

**Metrics:**
- MRR and MRR growth
- Churn rate (voluntary vs involuntary)
- Failed payment recovery rate
- Average revenue per user
- LTV:CAC ratio

---

## Phase 3B: Agentic AI (Sprints 30-32)

### Sprint 30: LangGraph 1.0 Multi-Agent (13 points)

**Goal:** Upgrade to LangGraph 1.0 with production-ready multi-agent orchestration

**Key LangGraph 1.0 Features:**
- Stable API with commitment to no breaking changes until 2.0
- State persistence and checkpointing
- Human-in-the-loop interrupts
- LangSmith Deployment for production hosting

#### Task 30.1: Multi-Agent Supervisor Pattern
**Files to create:**
- `apps/ai-backend/app/agents/supervisor.py`
- `apps/ai-backend/app/agents/workout_agent.py`
- `apps/ai-backend/app/agents/nutrition_agent.py`
- `apps/ai-backend/app/agents/recovery_agent.py`

**Architecture:**
```python
from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import create_react_agent

class CoachSupervisor:
    def __init__(self):
        self.workout_agent = create_workout_agent()
        self.nutrition_agent = create_nutrition_agent()
        self.recovery_agent = create_recovery_agent()
        
    def build_graph(self):
        builder = StateGraph(CoachState)
        
        builder.add_node("router", self.route_query)
        builder.add_node("workout", self.workout_agent)
        builder.add_node("nutrition", self.nutrition_agent)
        builder.add_node("recovery", self.recovery_agent)
        builder.add_node("synthesize", self.synthesize_response)
        
        builder.add_edge(START, "router")
        builder.add_conditional_edges(
            "router",
            self.determine_agent,
            ["workout", "nutrition", "recovery"]
        )
        builder.add_edge("workout", "synthesize")
        builder.add_edge("nutrition", "synthesize")
        builder.add_edge("recovery", "synthesize")
        builder.add_edge("synthesize", END)
        
        return builder.compile(checkpointer=MemorySaver())
```

---

#### Task 30.2: Human-in-the-Loop Workflows
**Files to create:**
- `apps/mobile/src/app/features/coaching/components/ai-approval/ai-approval.component.ts`
- `supabase/functions/ai-approval-webhook/index.ts`

**Features:**
- Trainer approval before significant program changes
- Interrupt points for sensitive recommendations
- Approval history tracking

---

### Sprint 31: Apple Health MCP Integration (8 points)

**Goal:** Integrate Apple Health MCP server for natural language health queries

**Available MCP Servers:**
- Momentum's open-source server (HealthKit data)
- Neiltron's implementation (SQL-like access)

#### Task 31.1: MCP Server Integration
**Files to create:**
- `apps/ai-backend/app/mcp/health_server.py`
- `apps/ai-backend/app/mcp/stripe_server.py`

**Features:**
- Natural language queries against health data
- Unified health + payment data in agent conversations
- Cross-provider compatibility

**Example Queries:**
- "How did my sleep compare to my workout performance this week?"
- "Show me my heart rate variability trend for the last month"
- "What's my average step count on rest days vs training days?"

---

### Sprint 32: Voice AI Sub-500ms (13 points)

**Goal:** Achieve sub-500ms voice coaching latency for real-time conversations

#### Task 32.1: Deepgram Nova-3 Upgrade
**Files to modify:**
- `apps/mobile/src/app/core/services/voice.service.ts`

**Improvements:**
- Upgrade from Nova-2 to Nova-3 (5.26% WER)
- Implement Deepgram Flux for turn detection
- 11+ language support

---

#### Task 32.2: Optimized TTS Pipeline
**Files to create:**
- `apps/mobile/src/app/core/services/tts.service.ts`

**Stack Options:**
- ElevenLabs Conversational AI 2.0
- OpenAI Realtime API (GA August 2025)
- Deepgram Aura-2

**Target Latency Breakdown:**
| Component | Target | Current |
|-----------|--------|---------|
| STT (Nova-3/Flux) | 100-300ms | ~300ms |
| LLM (GPT-4o-mini) | 100-400ms | ~400ms |
| TTS (ElevenLabs) | 50-250ms | ~300ms |
| **Total** | **~465ms** | ~1000ms |

---

## Phase 3C: Fitness Science (Sprints 33-35)

### Sprint 33: AI Workout Generation (13 points)

**Goal:** Match Everfit's AI workout generation capability (text-to-workout in 2 seconds)

#### Task 33.1: Text-to-Workout Engine
**Files to create:**
- `apps/ai-backend/app/services/workout_generator.py`
- `apps/mobile/src/app/features/programs/pages/ai-builder/ai-builder.page.ts`

**Features:**
- Natural language program creation
- PDF import with OCR
- Voice-to-program creation
- Auto-periodization with block programming

**Example Prompts:**
- "Create a 4-day upper/lower split for intermediate lifters"
- "Build a 12-week powerlifting peaking program"
- "Design a hypertrophy block focusing on back development"

---

#### Task 33.2: Auto-Regulating Load Management
**Files to create:**
- `apps/mobile/src/app/core/services/autoregulation.service.ts`

**Features:**
- RPE-based load adjustment
- HRV integration for daily readiness
- Velocity loss threshold integration (for VBT users)
- Fatigue accumulation tracking

---

### Sprint 34: HRV Recovery System (8 points)

**Goal:** Implement recovery scoring and auto-intensity adjustment

#### Task 34.1: Recovery Score Algorithm
**Files to create:**
- `apps/mobile/src/app/core/services/recovery-score.service.ts`
- `supabase/migrations/00022_recovery_scores.sql`

**Database Schema:**
```sql
CREATE TABLE recovery_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  score_date DATE NOT NULL,
  hrv_score INTEGER, -- 0-100
  sleep_score INTEGER, -- 0-100
  resting_hr_score INTEGER, -- 0-100
  subjective_score INTEGER, -- 0-100 (optional client input)
  overall_score INTEGER NOT NULL, -- Weighted composite
  category TEXT CHECK (category IN ('recovered', 'moderate', 'under_recovered', 'critical')),
  intensity_modifier DECIMAL(3,2), -- 0.5 to 1.2
  volume_modifier DECIMAL(3,2), -- 0.5 to 1.2
  suggested_action TEXT,
  data_sources JSONB,
  confidence DECIMAL(3,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, score_date)
);
```

**Recovery Algorithm:**
```typescript
interface RecoveryScore {
  overall: number; // 0-100
  components: {
    hrv: { score: number; weight: 0.40; trend: 'up' | 'stable' | 'down' };
    sleep: { score: number; weight: 0.35; quality: number; duration: number };
    restingHR: { score: number; weight: 0.15; delta: number };
    subjective: { score: number; weight: 0.10 }; // Optional
  };
  category: 'recovered' | 'moderate' | 'under_recovered' | 'critical';
  recommendation: {
    intensityModifier: number; // 0.5-1.2
    volumeModifier: number; // 0.5-1.2
    suggestedAction: string;
  };
}
```

---

### Sprint 35: Chronotype Optimization (8 points)

**Goal:** Implement chronotype-based training recommendations

**Research Evidence:**
- Evening chronotypes perform 8.4% worse in the morning
- Morning-type athletes are 6% slower in evening sessions
- 70% of population experiences "social jetlag"

#### Task 35.1: Chronotype Assessment
**Files to create:**
- `apps/mobile/src/app/features/onboarding/pages/chronotype/chronotype.page.ts`
- `apps/mobile/src/app/core/services/chronotype.service.ts`

**Features:**
- Simplified 5-7 question MEQ assessment during onboarding
- Optimal workout window recommendations
- Morning lark vs night owl workout templates
- Integration with scheduling suggestions

**Chronotype Categories:**
- **Definite Morning:** Peak performance 6-10am
- **Moderate Morning:** Peak performance 8am-12pm
- **Intermediate:** Flexible, slight afternoon preference
- **Moderate Evening:** Peak performance 4-8pm
- **Definite Evening:** Peak performance 6-10pm

---

## Phase 3D: Advanced Features (Sprints 36-38)

### Sprint 36: Nutrition Intelligence (13 points)

**Goal:** Build expenditure algorithm inspired by MacroFactor methodology

#### Task 36.1: Adaptive Calorie Algorithm
**Files to create:**
- `apps/mobile/src/app/core/services/expenditure.service.ts`

**Features:**
- Weekly adjustment based on weight trends
- Metabolic adaptation detection
- Chrono-nutrition meal timing recommendations
- Pre/intra/post workout nutrition calculator

---

### Sprint 37: Mental Health Integration (8 points)

**Goal:** Implement validated mental health screening with safety guardrails

**Research:** BMJ 2024 meta-analysis found exercise comparable to psychotherapy for MDD

#### Task 37.1: Wellness Check-Ins
**Files to create:**
- `apps/mobile/src/app/features/wellness/pages/wellness-checkin/wellness-checkin.page.ts`

**Features:**
- PHQ-2/GAD-2 bi-weekly screenings (2 questions each)
- Mood-boosting workout suggestions for elevated stress
- Crisis resource display for concerning patterns
- Mental health provider referral pathway

**Safety Requirements:**
- Clear "screening for informational purposes" disclaimers
- PHQ-9 Question 9 (suicidality) triggers immediate resources
- **Legal review REQUIRED before implementation**

---

### Sprint 38: 66-Day Habit Tracking (8 points)

**Goal:** Replace 21-day myth with science-backed 66-day habit formation

**Research:** University of South Australia 2024 meta-analysis debunked 21-day myth:
- Health habits take 59-66 days median
- Gym habits specifically require 4-7 months
- Morning habits form 43% more reliably
- Self-selected habits have 37% higher success

#### Task 38.1: Habit Formation System
**Files to create:**
- `apps/mobile/src/app/features/habits/pages/habit-tracker/habit-tracker.page.ts`
- `apps/mobile/src/app/core/services/habit.service.ts`

**Features:**
- 66-day progress visualization
- JITAI-style context-aware notifications
- Morning vs evening habit recommendations
- Habit stacking suggestions

---

## Phase 3E: Scale & Enterprise (Sprints 39-41)

### Sprint 39: Integration Marketplace v2 (13 points)

**Goal:** Expand third-party integrations beyond basic sync

#### Task 39.1: Zapier Webhook Support
**Features:**
- Custom webhook triggers
- 3,000+ app integrations via Zapier
- No-code automation for trainers

#### Task 39.2: Calendar Integrations
**Integrations:**
- Google Calendar (bi-directional sync)
- Apple Calendar
- Calendly (scheduling)
- Acuity Scheduling

---

### Sprint 40: Multi-Location Management (13 points)

**Goal:** Support gym chains and franchise operations

**Features:**
- Centralized owner dashboard
- Per-location analytics
- Cross-location trainer management
- Consolidated billing

---

### Sprint 41: Enterprise SSO (8 points)

**Goal:** Enable corporate wellness program integration

**Features:**
- SAML 2.0 integration
- OIDC support
- Directory sync (Azure AD, Okta, Google Workspace)
- Role-based access control

---

## Phase 3F: Market Leadership (Sprints 42-45)

### Sprint 42: Local SEO Automation (8 points)

**Goal:** Automated Google Business Profile optimization

**Research:** 46% of Google searches are local

**Features:**
- Auto-generate Google Business profiles from trainer data
- Schema.org structured data for trainer pages
- Review request automation post-milestone
- Local keyword targeting suggestions

---

### Sprint 43: Outcome-Based Pricing (8 points)

**Goal:** Align platform success with trainer success

**Features:**
- Optional premium tier
- Pricing scales with verified client results
- Automated result verification (weight, strength gains)
- Success celebration system

---

### Sprint 44: A2A Protocol Compatibility (5 points)

**Goal:** Prepare for future multi-agent ecosystems

**Context:** Google's Agent2Agent protocol (April 2025, Linux Foundation)

**Features:**
- A2A-compatible agent design
- Interoperability with wearable company agents
- Nutrition app agent integration readiness
- Healthcare provider agent compatibility

---

### Sprint 45: Healthcare Integration Prep (8 points)

**Goal:** Position for corporate wellness and clinical markets

**Features:**
- HIPAA compliance assessment
- Cloud Identity Platform migration (if needed)
- Audit logging implementation
- BAA preparation

---

## Success Metrics

### Phase 3A (Payment Infrastructure)
| Metric | Target |
|--------|--------|
| Stripe Connect adoption | 80% of gym owners |
| Payment split accuracy | 100% |
| Failed payment recovery | +57% |
| Trainer payout satisfaction | 4.5/5 |

### Phase 3B (Agentic AI)
| Metric | Target |
|--------|--------|
| Voice latency | <500ms |
| Agent routing accuracy | 95%+ |
| Human-in-loop compliance | 100% |
| MCP query success rate | 90%+ |

### Phase 3C (Fitness Science)
| Metric | Target |
|--------|--------|
| AI workout quality | 4.0/5 trainer rating |
| Recovery score accuracy | 85% vs wearable |
| Chronotype adoption | 60% of users |

### Phase 3D-F (Advanced/Enterprise)
| Metric | Target |
|--------|--------|
| Integration adoption | 50% of trainers |
| Enterprise conversion | 20% inquiry to close |
| Local search visibility | +75% |

---

## Estimated Timeline

| Phase | Sprints | Duration | Target Completion |
|-------|---------|----------|-------------------|
| 3A: Payments | 27-29 | 6 weeks | Feb 2026 |
| 3B: Agentic AI | 30-32 | 6 weeks | Mar 2026 |
| 3C: Fitness Science | 33-35 | 6 weeks | May 2026 |
| 3D: Advanced | 36-38 | 6 weeks | Jun 2026 |
| 3E: Enterprise | 39-41 | 6 weeks | Aug 2026 |
| 3F: Leadership | 42-45 | 8 weeks | Oct 2026 |

**Phase 3 Complete:** ~October 2026

---

## Related Documentation

- `GAP_ANALYSIS_2026.md` - Comprehensive market analysis
- `ROADMAP.md` - Strategic overview
- `AI_INTEGRATION.md` - Current AI architecture
- `WEARABLE_INTEGRATION.md` - Health Connect guide
- `STRIPE_CONNECT_IMPLEMENTATION.md` - Payment infrastructure (to create)
