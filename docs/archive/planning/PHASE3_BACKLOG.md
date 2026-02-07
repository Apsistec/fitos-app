# FitOS Phase 3 Feature Backlog

**Version:** 1.0  
**Date:** January 2026  
**Timeline:** Months 8-16 (after Phase 2 launch)  
**Focus:** Competitive Differentiation, Advanced AI, Market Expansion

---

## Executive Summary

Phase 3 transforms FitOS from a solid fitness coaching platform into a market-differentiating leader through:

1. **"Coach Brain" AI** - AI that sounds like the trainer, not a generic chatbot
2. **Progressive Autonomy Transfer** - Systematically reduce client dependency (SDT-aligned)
3. **Adaptive Streak Healing** - Research-backed engagement that forgives, not punishes
4. **Video Feedback System** - Async form correction addressing AI's #1 limitation
5. **Recovery-Based Programming** - Auto-adjust intensity based on HRV/sleep
6. **Local SEO Automation** - 46% of Google searches are local
7. **Integration Marketplace** - Compete on core UX, not ecosystem lock-in

**Research Foundation:**
- Stanford GPTCoach (CHI 2025): Facilitative, non-prescriptive AI approach
- UCL/Loughborough 2024: Breaking streaks is "especially demotivating"
- Filipino adolescent study 2025: SDT effects (autonomy d=1.72, competence d=2.16)
- 2024 Lancet systematic review: Gamification +489 steps/day, -0.70 kg

---

## Sprint Schedule Overview

| Sprint | Duration | Focus Area | Priority |
|--------|----------|------------|----------|
| 17 | 2 weeks | "Coach Brain" AI Assistant | P0 |
| 18 | 2 weeks | Progressive Autonomy Transfer | P1 |
| 19 | 2 weeks | Adaptive Streak Healing | P0 |
| 20 | 2 weeks | Coach-Client Video Feedback | P1 |
| 21 | 2 weeks | Wearable Recovery Integration | P1 |
| 22 | 2 weeks | Natural Language Program Design | P2 |
| 23 | 2 weeks | Local SEO Automation | P2 |
| 24 | 2 weeks | Integration Marketplace Foundation | P2 |
| 25 | 2 weeks | Gym Owner Business Analytics | P1 |
| 26 | 2 weeks | Outcome-Based Pricing Tier | P2 |
| 27 | 2 weeks | Advanced Gamification | P1 |
| 28 | 2 weeks | Enterprise Readiness | P2 |

---

## Epic 21: "Coach Brain" AI Assistant

### 21.1 Trainer Methodology Learning System
**Priority:** P0 (Critical)  
**Sprint:** 17  
**Status:** Not Started

**User Stories:**
- As a trainer, the AI coaches my clients using my programming philosophy
- As a trainer, I can customize what the AI says about nutrition and training
- As a client, the AI responses feel consistent with my trainer's voice
- As a trainer, I can review and approve AI response patterns

**Implementation Tasks:**
- [ ] Create `trainer_methodology` table with structured philosophy fields
- [ ] Build methodology questionnaire UI (training philosophy, nutrition approach, communication style)
- [ ] Implement RAG pipeline for trainer methodology retrieval
- [ ] Create prompt engineering templates that inject trainer voice
- [ ] Build methodology analyzer for historical programs
- [ ] Implement A/B testing framework for AI voice consistency
- [ ] Add trainer approval workflow for new response types
- [ ] Create methodology similarity scoring for response generation

**Database Schema:**
```sql
CREATE TABLE trainer_methodology (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  training_philosophy TEXT, -- "Progressive overload focus, periodization..."
  nutrition_approach TEXT,  -- "Flexible dieting, adherence-neutral..."
  communication_style TEXT, -- "Direct but supportive, uses humor..."
  key_phrases TEXT[],       -- ["trust the process", "consistency is key"]
  avoid_phrases TEXT[],     -- ["cheat meal", "burn calories"]
  response_examples JSONB,  -- Approved response templates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE methodology_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  input_type TEXT, -- 'message', 'program', 'feedback'
  content TEXT,
  embedding vector(1536), -- For RAG retrieval
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**AI Architecture:**
```python
# Coach Brain multi-layer prompt system
class CoachBrainPrompt:
    def build_prompt(self, trainer_id: str, query: str, context: dict) -> str:
        methodology = self.get_trainer_methodology(trainer_id)
        historical_responses = self.get_similar_responses(trainer_id, query)
        
        return f"""
        You are an AI assistant for {methodology.trainer_name}'s fitness coaching business.
        
        ## Trainer Philosophy
        {methodology.training_philosophy}
        
        ## Communication Style
        {methodology.communication_style}
        
        ## Key Phrases to Use
        {', '.join(methodology.key_phrases)}
        
        ## Phrases to Avoid
        {', '.join(methodology.avoid_phrases)}
        
        ## Example Responses from This Trainer
        {self.format_examples(historical_responses)}
        
        ## Current Client Context
        {self.format_context(context)}
        
        Respond to this client query in the trainer's voice:
        "{query}"
        """
```

**Acceptance Criteria:**
- AI responses match trainer voice with 85%+ trainer approval rating
- Clients rate AI consistency 4.5/5
- No generic AI phrases leak through ("As an AI...", "I don't have personal opinions...")

### 21.2 AI Voice Customization UI
**Priority:** P1 (High)  
**Sprint:** 17  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create methodology setup wizard (5 steps)
- [ ] Build sample conversation preview
- [ ] Implement voice testing interface
- [ ] Add response editing and approval workflow
- [ ] Create methodology import from existing content

---

## Epic 22: Progressive Autonomy Transfer

### 22.1 Client Independence Scoring
**Priority:** P1 (High)  
**Sprint:** 18  
**Status:** Not Started

**User Stories:**
- As a trainer, I can see which clients are ready for more independence
- As a client, I'm celebrated when I reach self-programming readiness
- As a trainer, I can gradually transfer workout design responsibility
- As a client, I feel empowered, not abandoned, when gaining autonomy

**Implementation Tasks:**
- [ ] Create `autonomy_score` calculation engine
- [ ] Build independence assessment questionnaire
- [ ] Implement workout creation capability scoring
- [ ] Create nutrition self-management scoring
- [ ] Build trainer dashboard showing client readiness levels
- [ ] Implement graduated responsibility transfer workflow
- [ ] Create celebration animations for autonomy milestones
- [ ] Add "maintenance mode" pricing tier

**Autonomy Score Components:**
```typescript
interface AutonomyAssessment {
  workoutKnowledge: {
    exerciseFormScore: number;        // 0-100: Can perform exercises correctly
    programUnderstanding: number;      // 0-100: Understands periodization
    selfModificationSkill: number;     // 0-100: Can adjust when needed
  };
  nutritionKnowledge: {
    macroTrackingAccuracy: number;    // 0-100: Logs accurately
    portionEstimation: number;        // 0-100: Estimates without scales
    flexibleApproach: number;         // 0-100: Not rigid/obsessive
  };
  behaviorConsistency: {
    workoutAdherence90Days: number;   // 0-100: Last 90 days
    nutritionAdherence90Days: number; // 0-100: Last 90 days
    selfInitiated: number;            // 0-100: Actions without prompting
  };
  overallReadiness: number;           // Weighted composite
  recommendedAction: 'continue' | 'reduce_frequency' | 'maintenance_ready';
}
```

**SDT Alignment:**
- Autonomy: Client chooses when to graduate
- Competence: Clear skill progression visualization
- Relatedness: Graduation celebrated, not abandoned

**Acceptance Criteria:**
- 40%+ clients voluntarily convert to maintenance mode
- Client self-efficacy increases 30%+ post-graduation
- No negative sentiment about "being dropped"

### 22.2 Maintenance Mode Features
**Priority:** P2 (Medium)  
**Sprint:** 18  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create reduced-price maintenance tier
- [ ] Build quarterly check-in scheduling
- [ ] Implement on-demand consultation booking
- [ ] Add re-engagement pathway for returning clients

---

## Epic 23: Adaptive Streak Healing

### 23.1 Forgiveness-First Streak System
**Priority:** P0 (Critical)  
**Sprint:** 19  
**Status:** Not Started

**User Stories:**
- As a client, missing one day doesn't destroy my motivation
- As a client, I can "repair" my streak with extra effort
- As a client, life events don't penalize my progress tracking
- As a client, I see weekly consistency, not daily perfection

**Research Foundation:**
> "UCL/Loughborough 2024 analysis of 13,799 negative posts revealed breaking streaks is 'especially demotivating'—users experience loss of streak + loss of progress feeling, with ~8% decrease in behavior continuation."

**Implementation Tasks:**
- [ ] Refactor streak system from daily to weekly basis
- [ ] Implement streak repair mechanisms
- [ ] Create "grace days" for life events (travel, illness, rest days)
- [ ] Build streak visualization that shows consistency bands, not chains
- [ ] Add streak milestone celebrations (7, 30, 100 days)
- [ ] Implement forgiveness messaging UI
- [ ] Create A/B testing for streak healing effectiveness
- [ ] Add streak recovery notifications

**Streak Repair Mechanisms:**
```typescript
interface StreakConfig {
  // Weekly-based streaks (not daily)
  minDaysPerWeek: number;          // e.g., 3 days = "consistent week"
  graceDaysPerMonth: number;       // e.g., 4 days can be skipped
  
  // Repair options
  repairOptions: {
    bonusWorkout: boolean;         // Extra workout repairs 1 missed day
    extendedSession: boolean;      // 150% normal duration repairs 1 day
    nextDayDouble: boolean;        // Two workouts next day repairs
  };
  
  // Celebration thresholds
  milestones: [7, 14, 30, 60, 90, 180, 365];
  
  // Forgiveness messaging
  missedDayMessage: string;        // "Life happens. Pick up where you left off."
}

interface WeeklyConsistency {
  week: string;                    // "2026-W02"
  targetDays: number;              // 4
  completedDays: number;           // 3
  status: 'achieved' | 'partial' | 'missed';
  streakContribution: 'maintains' | 'repairs' | 'breaks';
}
```

**UI Design Principles:**
- Never show "streak broken" in red
- Use progress bands showing weekly ranges
- Celebrate partial completion ("3/4 is great!")
- Offer repair immediately after miss

**Acceptance Criteria:**
- Streak continuation after miss: +40% vs. current
- User sentiment on streaks: 4.5/5 positive
- Weekly retention improvement: +15%

### 23.2 Smart Recovery Day Integration
**Priority:** P1 (High)  
**Sprint:** 19  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Detect planned rest days (don't count against streak)
- [ ] Integrate wearable recovery data for auto-rest suggestions
- [ ] Create "active recovery" options that maintain streak
- [ ] Build deload week support

---

## Epic 24: Coach-Client Video Feedback

### 24.1 Async Video Submission System
**Priority:** P1 (High)  
**Sprint:** 20  
**Status:** Not Started

**User Stories:**
- As a client, I can submit form check videos for trainer review
- As a trainer, I can annotate videos with corrections
- As a client, I see timestamped feedback on my form
- As a trainer, I can build a library of common corrections

**Strategic Value:**
> "Addresses the #1 limitation of AI (cannot assess form/injury risk) while enabling remote coaching."

**Implementation Tasks:**
- [ ] Create video upload flow (Capacitor + Supabase Storage)
- [ ] Build video compression pipeline (target: <50MB per video)
- [ ] Implement trainer annotation tools (timestamp markers, drawing)
- [ ] Create video playback with annotations overlay
- [ ] Build common corrections library for trainers
- [ ] Implement video retention policy (30-90 days)
- [ ] Add video request feature (trainer can request specific angles)
- [ ] Create notification system for video feedback

**Database Schema:**
```sql
CREATE TABLE video_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  exercise_id UUID REFERENCES exercises(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'pending', -- pending, reviewed, archived
  client_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE video_annotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id UUID NOT NULL REFERENCES video_submissions(id) ON DELETE CASCADE,
  timestamp_seconds DECIMAL(10,2) NOT NULL,
  annotation_type TEXT, -- 'marker', 'drawing', 'comment'
  content JSONB, -- {type: 'arrow', points: [...], color: '#ff0000'}
  text_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE correction_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  exercise_id UUID REFERENCES exercises(id),
  issue_type TEXT, -- 'knee_cave', 'back_rounding', 'depth'
  template_annotations JSONB,
  text_template TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Acceptance Criteria:**
- Video submission rate: 20%+ of active clients
- Trainer response time: <24 hours average
- Form improvement tracking: Measurable before/after

---

## Epic 25: Wearable Recovery Integration

### 25.1 Recovery-Based Auto-Adjustment
**Priority:** P1 (High)  
**Sprint:** 21  
**Status:** Not Started

**User Stories:**
- As a client, my workout intensity adjusts based on my recovery
- As a trainer, I see which clients are under-recovered before they arrive
- As a client, I understand why my workout was modified
- As a trainer, I can override auto-adjustments

**Implementation Tasks:**
- [ ] Create recovery score calculation from HRV/sleep/resting HR
- [ ] Build recovery threshold configuration per client
- [ ] Implement auto-intensity adjustment logic
- [ ] Create trainer dashboard widget for recovery alerts
- [ ] Build client recovery explanation UI
- [ ] Add override workflow for trainers
- [ ] Implement recovery trend visualization
- [ ] Create recovery-based deload suggestions

**Recovery Score Algorithm:**
```typescript
interface RecoveryInputs {
  hrv: {
    current: number;
    baseline7Day: number;
    trend: 'improving' | 'stable' | 'declining';
  };
  sleep: {
    durationHours: number;
    efficiency: number;        // 0-100
    deepSleepMinutes: number;
    remSleepMinutes: number;
  };
  restingHR: {
    current: number;
    baseline7Day: number;
  };
  subjectiveReadiness?: number;  // 1-10 from client
}

interface RecoveryScore {
  overall: number;               // 0-100
  category: 'recovered' | 'moderate' | 'under_recovered' | 'critical';
  recommendation: {
    intensityModifier: number;   // 0.5-1.2
    volumeModifier: number;      // 0.5-1.2
    suggestedAction: string;     // "Proceed as planned" | "Reduce volume 20%"
  };
  confidence: number;            // Based on data completeness
}

const calculateRecoveryScore = (inputs: RecoveryInputs): RecoveryScore => {
  const hrvScore = calculateHRVScore(inputs.hrv);        // 40% weight
  const sleepScore = calculateSleepScore(inputs.sleep);  // 35% weight
  const hrScore = calculateHRScore(inputs.restingHR);    // 15% weight
  const subjectiveScore = inputs.subjectiveReadiness 
    ? inputs.subjectiveReadiness * 10 
    : null;                                              // 10% weight if available
  
  // Weighted composite
  const overall = weightedAverage([
    { score: hrvScore, weight: subjectiveScore ? 0.35 : 0.40 },
    { score: sleepScore, weight: subjectiveScore ? 0.30 : 0.35 },
    { score: hrScore, weight: 0.15 },
    { score: subjectiveScore, weight: 0.10 }
  ]);
  
  return {
    overall,
    category: categorizeRecovery(overall),
    recommendation: generateRecommendation(overall),
    confidence: calculateConfidence(inputs)
  };
};
```

**Acceptance Criteria:**
- Recovery-adjusted workout adoption: 60%+
- Overtraining incident reduction: 40%+
- Client injury rate reduction: 25%+

---

## Epic 26: Natural Language Program Design

### 26.1 Text-to-Workout Converter
**Priority:** P2 (Medium)  
**Sprint:** 22  
**Status:** Not Started

**User Stories:**
- As a trainer, I can type "4-day upper/lower split for intermediate" and get a program
- As a trainer, I can import existing PDF programs
- As a trainer, I can dictate programs via voice
- As a trainer, I can edit AI-generated programs easily

**Implementation Tasks:**
- [ ] Create program generation prompt engineering
- [ ] Build PDF OCR and parsing pipeline
- [ ] Implement voice-to-program flow
- [ ] Create program preview and editing UI
- [ ] Build program template suggestions
- [ ] Add exercise substitution intelligence
- [ ] Implement periodization auto-structuring
- [ ] Create program quality scoring

**Acceptance Criteria:**
- Program creation time: -70%
- Trainer adoption: 50%+
- Generated program quality: 4.0/5 trainer rating

---

## Epic 27: Local SEO Automation

### 27.1 Google Business Profile Generator
**Priority:** P2 (Medium)  
**Sprint:** 23  
**Status:** Not Started

**User Stories:**
- As a trainer, my Google Business profile is auto-populated
- As a trainer, I'm prompted to collect reviews at the right moments
- As a trainer, I appear in local fitness searches
- As a trainer, I can manage multiple locations (if applicable)

**Implementation Tasks:**
- [ ] Build Google Business API integration
- [ ] Create profile generation from trainer data
- [ ] Implement structured data (Schema.org) for trainer pages
- [ ] Build review request automation (post-milestone)
- [ ] Create local keyword optimization suggestions
- [ ] Add competitor visibility analysis
- [ ] Implement citation building for local directories

**Acceptance Criteria:**
- Google Business profile completeness: 90%+
- Local search visibility: +50%
- Review request response rate: 30%+

---

## Epic 28: Integration Marketplace

### 28.1 Third-Party Integration Framework
**Priority:** P2 (Medium)  
**Sprint:** 24  
**Status:** Not Started

**User Stories:**
- As a trainer, I can connect my preferred tools (MFP, Calendly, etc.)
- As a trainer, I'm not locked into the FitOS ecosystem
- As a client, my data syncs with apps I already use
- As a trainer, I can trigger automations via webhooks

**Implementation Tasks:**
- [ ] Create integration framework architecture
- [ ] Build MyFitnessPal nutrition sync
- [ ] Implement Calendly scheduling integration
- [ ] Create Zapier webhook support
- [ ] Build integration marketplace UI
- [ ] Add data mapping configuration
- [ ] Implement sync conflict resolution
- [ ] Create integration health monitoring

**Initial Integrations:**
| Integration | Type | Priority |
|-------------|------|----------|
| MyFitnessPal | Nutrition sync | P0 |
| Calendly | Scheduling | P0 |
| Zapier | Automation | P1 |
| Google Calendar | Scheduling | P1 |
| Apple Calendar | Scheduling | P1 |
| Stripe | Payments (existing) | ✅ |

**Acceptance Criteria:**
- Integration adoption: 40%+ trainers
- Third-party tool reduction: 2+ per trainer
- Integration satisfaction: 4.0/5

---

## Epic 29: Gym Owner Business Analytics

### 29.1 Multi-Trainer Dashboard
**Priority:** P1 (High)  
**Sprint:** 25  
**Status:** Not Started

**User Stories:**
- As a gym owner, I see revenue and retention across all trainers
- As a gym owner, I can identify top-performing trainers
- As a gym owner, I understand client acquisition costs
- As a gym owner, I can set and track business goals

**Implementation Tasks:**
- [ ] Build owner dashboard with trainer breakdown
- [ ] Create revenue per trainer analytics
- [ ] Implement client acquisition cost tracking
- [ ] Build retention cohort analysis
- [ ] Create trainer performance scoring
- [ ] Add goal setting and tracking
- [ ] Implement benchmarking against industry averages
- [ ] Create exportable reports

**Key Metrics (from Research):**
| KPI | Benchmark | Source |
|-----|-----------|--------|
| Member Retention Rate | 66-71% annual | IHRSA/HFA |
| Monthly Churn Rate | 3-5% acceptable | Industry |
| Visit Frequency Target | 2×/week | IHRSA |
| PT Studio Retention | 80% | HFA 2024 |

**Acceptance Criteria:**
- Gym owner adoption: 15% of customer base
- Analytics engagement: Weekly usage
- Upsell to Business tier: 20%+

---

## Epic 30: Advanced Gamification

### 30.1 Activity-Based Social Features
**Priority:** P1 (High)  
**Sprint:** 27  
**Status:** Not Started

**User Stories:**
- As a client, I can see how my activity compares to peers (if I choose)
- As a client, I can join weekly challenges with forgiveness built-in
- As a client, I can celebrate friends' achievements
- As a client, my privacy is respected by default

**Research Foundation:**
> "Social comparison has a U-shaped relationship with outcomes. Users with high self-control experience positive effects; users with low self-control experience negative emotions. Appearance-based comparison decreases body satisfaction."

**Implementation Tasks:**
- [ ] Create activity-based leaderboards (not appearance)
- [ ] Build weekly challenges with repair mechanisms
- [ ] Implement supportive community features
- [ ] Create privacy-first defaults
- [ ] Add opt-in social features
- [ ] Build achievement celebration system
- [ ] Create challenge variety (strength, consistency, improvement)
- [ ] Implement anti-comparison safeguards

**Design Principles (from Research):**
- Focus on activity (steps, workouts) NOT appearance
- Enable supportive communities over pure competition
- Make social features optional with private defaults
- Avoid fitspiration content (decreases body satisfaction)

**Acceptance Criteria:**
- Challenge participation: 40%+
- Activity increase: +15% steps/week
- Body composition negative impact: <5%

---

## Success Metrics Summary

### Phase 3A (Sprints 17-20)
| Metric | Target |
|--------|--------|
| Coach Brain approval rate | 85%+ |
| Streak continuation post-miss | +40% |
| Video submission rate | 20%+ clients |
| Maintenance mode conversion | 40%+ |

### Phase 3B (Sprints 21-24)
| Metric | Target |
|--------|--------|
| Recovery-adjusted adoption | 60%+ |
| Program creation time | -70% |
| Local search visibility | +50% |
| Integration adoption | 40%+ trainers |

### Phase 3C (Sprints 25-28)
| Metric | Target |
|--------|--------|
| Gym owner adoption | 15%+ |
| Challenge participation | 40%+ |
| Enterprise conversion | 20%+ |
| Overall app rating | 4.7+ |

---

## Definition of Done (Phase 3)

For each feature to be considered complete:

- [ ] Code implemented and working
- [ ] TypeScript strict mode passing
- [ ] Unit tests written (>80% coverage for services)
- [ ] E2E tests for critical user paths
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] WCAG 2.1 AA accessible
- [ ] Works in dark and light mode
- [ ] Responsive (375px, 768px, 1200px)
- [ ] Error handling with user-friendly messages
- [ ] Loading states (skeletons)
- [ ] OnPush change detection
- [ ] Performance profiled (60fps target)
- [ ] Analytics events added
- [ ] Feature flag implemented
- [ ] Deployed to staging
- [ ] User research validated (where applicable)

---

## Related Documentation

- `ROADMAP.md` - Strategic overview and timeline
- `SPRINT_PLANNING.md` - Detailed sprint breakdown
- `MARKET_RESEARCH_REPORT.md` - Competitive analysis
- `AI_INTEGRATION.md` - Voice, photo, coaching architecture
- `COST_ANALYSIS.md` - Infrastructure cost projections
- `WEARABLE_INTEGRATION.md` - Health Connect/HealthKit guide
