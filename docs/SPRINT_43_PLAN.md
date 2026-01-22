# Sprint 43: Outcome-Based Pricing Implementation Plan

**Sprint:** 43
**Duration:** 2 weeks
**Priority:** P2 (Medium)
**Story Points:** 8
**Status:** 🚀 In Progress
**Started:** January 21, 2026

---

## Executive Summary

Sprint 43 implements **Outcome-Based Pricing** to align platform success with trainer success. This feature allows trainers to offer premium tiers where pricing scales based on verified client results (weight loss, strength gains, body composition improvements).

**Strategic Value:**
- Differentiates FitOS from fixed-price competitors
- Aligns incentives between platform, trainers, and clients
- Increases trainer confidence in platform value
- Creates viral marketing through client success stories
- Addresses market demand for performance-based coaching

---

## Goals

1. Create flexible pricing tiers that scale with client outcomes
2. Automate result verification using existing workout and nutrition data
3. Build celebration systems for achieved milestones
4. Provide analytics dashboard for outcome tracking
5. Ensure compliance and prevent gaming of the system

---

## Technical Architecture

### Database Schema

```sql
-- Outcome-Based Pricing Tiers
CREATE TABLE outcome_pricing_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  base_price_cents INTEGER NOT NULL,
  outcome_bonus_cents INTEGER,
  verification_method TEXT CHECK (verification_method IN ('weight_loss', 'strength_gain', 'body_comp', 'consistency', 'custom')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome Goals for Clients
CREATE TABLE client_outcome_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  pricing_tier_id UUID REFERENCES outcome_pricing_tiers(id),
  goal_type TEXT NOT NULL CHECK (goal_type IN ('weight_loss', 'strength_gain', 'body_comp', 'consistency', 'custom')),
  target_value DECIMAL(10,2),
  current_value DECIMAL(10,2),
  start_value DECIMAL(10,2),
  target_date DATE,
  verification_frequency TEXT DEFAULT 'weekly' CHECK (verification_frequency IN ('daily', 'weekly', 'biweekly', 'monthly')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'abandoned', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Result Verification Records
CREATE TABLE outcome_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES client_outcome_goals(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  verification_type TEXT NOT NULL,
  measured_value DECIMAL(10,2) NOT NULL,
  verification_method TEXT CHECK (verification_method IN ('manual', 'workout_data', 'nutrition_data', 'photo', 'wearable')),
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  verified_by UUID REFERENCES profiles(id),
  confidence_score DECIMAL(3,2), -- 0.00-1.00
  notes TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outcome Milestones
CREATE TABLE outcome_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL REFERENCES client_outcome_goals(id) ON DELETE CASCADE,
  milestone_percent DECIMAL(5,2) NOT NULL, -- 25.00 = 25% of goal
  achieved_at TIMESTAMPTZ,
  bonus_applied BOOLEAN DEFAULT false,
  bonus_amount_cents INTEGER,
  celebration_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pricing Adjustments History
CREATE TABLE pricing_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  goal_id UUID REFERENCES client_outcome_goals(id),
  adjustment_type TEXT CHECK (adjustment_type IN ('milestone_bonus', 'goal_achieved', 'consistency_bonus', 'early_achievement')),
  amount_cents INTEGER NOT NULL,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  stripe_invoice_id TEXT,
  metadata JSONB
);

-- Indexes for performance
CREATE INDEX idx_outcome_goals_client ON client_outcome_goals(client_id);
CREATE INDEX idx_outcome_goals_trainer ON client_outcome_goals(trainer_id);
CREATE INDEX idx_outcome_goals_status ON client_outcome_goals(status);
CREATE INDEX idx_verifications_goal ON outcome_verifications(goal_id);
CREATE INDEX idx_milestones_goal ON outcome_milestones(goal_id);
```

---

## Implementation Tasks

### Task 43.1: Database Schema and Migrations ✅

**Files to create:**
- `supabase/migrations/20260121000000_outcome_based_pricing.sql`

**Deliverables:**
- Complete schema with all tables, constraints, and indexes
- Row Level Security (RLS) policies
- Database functions for common queries

---

### Task 43.2: Backend API Endpoints

**Files to create:**
- `supabase/functions/outcome-pricing/create-tier.ts`
- `supabase/functions/outcome-pricing/set-client-goal.ts`
- `supabase/functions/outcome-pricing/verify-result.ts`
- `supabase/functions/outcome-pricing/calculate-milestone.ts`

**Endpoints:**

1. **POST /outcome-pricing/tiers** - Create pricing tier
2. **GET /outcome-pricing/tiers/:trainerId** - List trainer's tiers
3. **PUT /outcome-pricing/tiers/:tierId** - Update tier
4. **DELETE /outcome-pricing/tiers/:tierId** - Deactivate tier

5. **POST /outcome-pricing/goals** - Set client goal
6. **GET /outcome-pricing/goals/:clientId** - Get client's goals
7. **PUT /outcome-pricing/goals/:goalId** - Update goal progress
8. **POST /outcome-pricing/goals/:goalId/verify** - Record verification

9. **GET /outcome-pricing/analytics/:trainerId** - Trainer outcome analytics
10. **GET /outcome-pricing/client-progress/:clientId** - Client progress dashboard

---

### Task 43.3: Automated Result Verification System

**Files to create:**
- `apps/ai-backend/app/outcome_verification/__init__.py`
- `apps/ai-backend/app/outcome_verification/weight_tracker.py`
- `apps/ai-backend/app/outcome_verification/strength_tracker.py`
- `apps/ai-backend/app/outcome_verification/consistency_tracker.py`

**Features:**
- Pull data from existing workout logs (strength gains)
- Pull data from nutrition tracking (weight trends)
- Pull data from wearables (consistency metrics)
- Calculate confidence scores based on data quality
- Detect anomalies and flag suspicious entries

**Verification Logic:**

```python
class OutcomeVerifier:
    def verify_weight_loss(self, client_id: str, goal_id: str) -> VerificationResult:
        """
        Verify weight loss progress using nutrition logs and trends
        - 7-day moving average to smooth fluctuations
        - Require minimum 3 weeks of data for confidence
        - Flag rapid changes (>2lbs/week) for manual review
        """
        pass

    def verify_strength_gain(self, client_id: str, goal_id: str) -> VerificationResult:
        """
        Verify strength gains using workout logs
        - Track 1RM progress on compound movements
        - Compare baseline to current (minimum 4-week window)
        - Confidence based on consistency of logging
        """
        pass

    def verify_consistency(self, client_id: str, goal_id: str) -> VerificationResult:
        """
        Verify consistency goals (e.g., 4 workouts/week for 12 weeks)
        - Pull from workout_logs table
        - Calculate adherence percentage
        - High confidence score (based on log timestamps)
        """
        pass
```

---

### Task 43.4: Mobile UI - Trainer Tier Management

**Files to create:**
- `apps/mobile/src/app/features/outcome-pricing/`
  - `pages/pricing-tiers/pricing-tiers.page.ts`
  - `pages/create-tier/create-tier.page.ts`
  - `pages/tier-analytics/tier-analytics.page.ts`
  - `components/tier-card/tier-card.component.ts`
  - `components/goal-setup/goal-setup.component.ts`

**Features:**
- Create and manage pricing tiers
- Set outcome criteria (weight, strength, consistency)
- View tier performance analytics
- Configure bonus structures

**UI Design Principles:**
- Clear value proposition for each tier
- Simple goal configuration
- Visual progress indicators
- Adherence-neutral language

---

### Task 43.5: Mobile UI - Client Goal Tracking

**Files to create:**
- `apps/mobile/src/app/features/outcome-pricing/`
  - `pages/my-goals/my-goals.page.ts`
  - `pages/goal-detail/goal-detail.page.ts`
  - `components/progress-chart/progress-chart.component.ts`
  - `components/milestone-card/milestone-card.component.ts`

**Features:**
- View active goals and progress
- Visual progress charts (weight trends, strength gains)
- Milestone celebration UI
- Verification history

---

### Task 43.6: Success Celebration System

**Files to create:**
- `apps/mobile/src/app/features/outcome-pricing/services/celebration.service.ts`
- `apps/mobile/src/app/features/outcome-pricing/components/celebration-modal/celebration-modal.component.ts`

**Features:**
- Milestone achievement animations (25%, 50%, 75%, 100%)
- Push notifications for milestones
- Shareable success cards (social proof)
- Trainer notification when client achieves goal

**Celebration Triggers:**
- 25% of goal achieved
- 50% of goal achieved (halfway celebration)
- 75% of goal achieved (final push)
- 100% of goal achieved (major celebration)
- Early achievement (beat target date)
- Consistency streaks (4 weeks, 8 weeks, 12 weeks)

---

### Task 43.7: Analytics Dashboard

**Files to create:**
- `apps/mobile/src/app/features/outcome-pricing/pages/outcome-analytics/outcome-analytics.page.ts`
- `apps/mobile/src/app/features/outcome-pricing/components/outcome-metrics/outcome-metrics.component.ts`

**Metrics to Display:**

**For Trainers:**
- Active outcome-based clients
- Average goal completion rate
- Revenue from outcome bonuses
- Most effective goal types
- Client satisfaction scores
- Verification confidence scores

**For Gym Owners:**
- Outcome-based pricing adoption rate
- Platform revenue from bonuses
- Trainer performance by outcome achievement
- Client retention for outcome-based tiers

---

### Task 43.8: Stripe Integration for Bonuses

**Files to modify:**
- `supabase/functions/stripe-webhook/index.ts`
- `apps/mobile/src/app/core/services/payment.service.ts`

**Features:**
- Create invoice items for milestone bonuses
- Automatic billing when milestones achieved
- Clear line items showing outcome bonuses
- Optional client pre-approval for bonus charges

**Billing Flow:**
```typescript
// When milestone achieved:
1. Verify milestone achievement
2. Calculate bonus amount
3. (Optional) Request client pre-approval
4. Create Stripe invoice item
5. Attach to next billing cycle OR bill immediately
6. Send celebration notification
7. Update trainer payout
```

---

## Anti-Gaming Measures

To prevent gaming of the system:

1. **Minimum Time Windows:** Goals require minimum duration (e.g., 4 weeks for strength, 8 weeks for weight)
2. **Confidence Scoring:** Low-confidence verifications flagged for manual review
3. **Anomaly Detection:** Rapid changes flagged (e.g., 10lb weight loss in 1 week)
4. **Historical Baseline:** Require baseline period before goal starts
5. **Multiple Data Points:** Cross-verify using multiple sources (workouts + nutrition + wearables)
6. **Trainer Review Required:** High-value bonuses require trainer confirmation
7. **Client Authentication:** Photo verification with timestamp for major milestones

---

## User Flows

### Flow 1: Trainer Creates Outcome-Based Tier

```
1. Trainer → Settings → Pricing Tiers → "Create Outcome Tier"
2. Fill in:
   - Tier name (e.g., "Results-Driven Package")
   - Base monthly price ($200)
   - Outcome goal type (weight loss)
   - Bonus structure ($50 per 5% body weight lost)
   - Duration (12 weeks)
3. Save tier
4. Tier becomes available for new client signups
```

### Flow 2: Client Enrolls in Outcome Tier

```
1. Trainer assigns client to outcome tier
2. Client onboarding:
   - Set specific goal (lose 20lbs)
   - Record baseline (current weight: 200lbs)
   - Agree to verification frequency (weekly)
   - Review bonus structure
3. Client accepts terms
4. Goal tracking begins
```

### Flow 3: Milestone Achievement

```
1. System detects milestone (5lbs lost = 25% of goal)
2. Automated verification:
   - Pull weight data from nutrition logs
   - Calculate 7-day moving average
   - Assign confidence score
3. If confidence > 0.80:
   - Trigger celebration modal
   - Send push notification
   - Notify trainer
   - Calculate bonus
   - Add to next invoice
4. If confidence < 0.80:
   - Request manual verification (photo, trainer confirmation)
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Trainer adoption | 30% of active trainers |
| Client enrollment | 20% of new clients |
| Goal completion rate | 65%+ |
| Verification accuracy | 90%+ confidence |
| Client satisfaction | 4.5/5 rating |
| Revenue from bonuses | 15% increase in trainer earnings |
| False positives (gaming) | <2% |

---

## Acceptance Criteria

- [ ] Trainers can create outcome-based pricing tiers
- [ ] Clients can enroll in outcome tiers with clear goals
- [ ] Automated verification works for weight, strength, and consistency
- [ ] Manual verification option available
- [ ] Milestone celebrations trigger at 25%, 50%, 75%, 100%
- [ ] Bonuses automatically billed via Stripe
- [ ] Analytics dashboard shows outcome metrics
- [ ] Anti-gaming measures prevent fraud
- [ ] RLS policies secure all data access
- [ ] Mobile UI follows design system (dark-first, adherence-neutral)
- [ ] Works offline (local goal tracking)
- [ ] Unit tests >80% coverage for verification logic
- [ ] E2E tests for critical flows

---

## Risk Mitigation

### Risk 1: Gaming/Fraud
**Mitigation:**
- Multi-source verification
- Anomaly detection
- Trainer approval for high-value bonuses
- Confidence scoring system

### Risk 2: Billing Disputes
**Mitigation:**
- Clear terms and conditions
- Transparent verification logs
- Client pre-approval option
- Easy dispute resolution flow

### Risk 3: Low Adoption
**Mitigation:**
- Make optional (not required)
- Clear value proposition
- Success stories and case studies
- Gradual rollout with select trainers

### Risk 4: Legal/Compliance
**Mitigation:**
- Disclaimers about weight loss variability
- No guaranteed results language
- Trainer license verification
- Compliance review before launch

---

## Testing Strategy

### Unit Tests
- Verification logic for each goal type
- Confidence score calculation
- Milestone detection
- Bonus calculation
- Anomaly detection

### Integration Tests
- Database queries and RLS policies
- Edge Function endpoints
- Stripe billing integration
- Push notification delivery

### E2E Tests
- Complete tier creation flow
- Client enrollment and goal setting
- Milestone achievement and celebration
- Bonus billing and payout

---

## Rollout Plan

### Phase 1: Private Beta (Week 1)
- Deploy to staging
- Invite 5-10 select trainers
- Monitor verification accuracy
- Gather feedback

### Phase 2: Limited Release (Week 2)
- Deploy to production with feature flag
- Gradual rollout to 25% of trainers
- Monitor metrics and gaming attempts
- Iterate on verification logic

### Phase 3: General Availability (Week 3)
- Enable for all trainers (optional)
- Marketing push around success stories
- Launch celebration

---

## Related Documentation

- `ROADMAP.md` - Sprint 43 in overall roadmap
- `SPRINTS_27-45_ROADMAP.md` - Detailed sprint planning
- `STRIPE_INTEGRATION.md` - Payment processing
- `DESIGN_SYSTEM.md` - UI design standards
- `UX_PATTERNS.md` - Friction reduction patterns

---

## Definition of Done

- [x] Implementation plan documented
- [ ] Database migration created and tested
- [ ] Backend API endpoints implemented
- [ ] Automated verification system working
- [ ] Mobile UI components built
- [ ] Celebration system functional
- [ ] Analytics dashboard complete
- [ ] Stripe integration tested
- [ ] Unit tests written (>80% coverage)
- [ ] E2E tests passing
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Feature flag implemented
- [ ] Deployed to staging
- [ ] Beta testing complete
- [ ] Legal review complete
- [ ] Production deployment approved

---

**Status:** ✅ Planning Complete - Ready for Implementation
**Next Step:** Task 43.1 - Database Schema and Migrations
