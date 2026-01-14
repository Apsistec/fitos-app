# FitOS Sprints 18-26 Implementation Roadmap

**Last Updated:** 2026-01-14
**Sprint 23 Status:** ✅ COMPLETE
**Current Sprint:** Sprint 24 (Integration Marketplace)

---

## Quick Reference

| Sprint | Feature | Status | Points | Dependencies |
|--------|---------|--------|--------|--------------|
| 17 | AI Feature Frontend Integration | ✅ COMPLETE | 13 | None |
| 18 | AI Coaching Chat UI | 🔲 NOT STARTED | 8 | Sprint 17 |
| 19 | Adaptive Streak Healing | 🔲 NOT STARTED | 8 | None |
| 20 | CRM Pipeline & Email Marketing | 🔲 NOT STARTED | 13 | None |
| 21 | Progressive Autonomy Transfer | ✅ COMPLETE | 8 | Sprint 20 |
| 22 | Video Feedback System | ✅ COMPLETE | 13 | None |
| 23 | Wearable Recovery Integration | ✅ COMPLETE | 8 | None |
| 24 | Integration Marketplace | 🔲 NOT STARTED | 13 | None |
| 25 | Gym Owner Business Analytics | 🔲 NOT STARTED | 8 | Sprint 20 |
| 26 | Advanced Gamification | 🔲 NOT STARTED | 8 | Sprint 19 |

**Total Remaining:** 58 story points (Sprints 21, 22, 23 complete)

---

## Sprint 18: AI Coaching Chat UI (8 points)

### Overview
Build chat interface for AI coaching conversations with streaming responses and quick actions.

### Tasks

#### Task 18.1: Chat Page Component
**Files to create:**
- `apps/mobile/src/app/features/coaching/pages/chat/chat.page.ts`
- `apps/mobile/src/app/features/coaching/components/chat-message/chat-message.component.ts`
- `apps/mobile/src/app/features/coaching/components/typing-indicator/typing-indicator.component.ts`
- `apps/mobile/src/app/features/coaching/components/quick-actions/quick-actions.component.ts`

**Features:**
- Message list with user/assistant bubbles
- Auto-scroll to new messages
- Markdown rendering in responses
- Quick action buttons:
  - "What should I eat today?"
  - "How's my progress?"
  - "Modify today's workout"
  - "Talk to my trainer" (escalation)
- Voice input option (reuse `VoiceService`)
- Load conversation history from Supabase

**API Integration:**
```typescript
POST /api/v1/coach/chat
Body: {
  message: string,
  userContext: {
    user_id: string,
    role: 'client' | 'trainer',
    goals: string[],
    fitness_level: string,
    trainer_methodology_id?: string
  }
}
```

#### Task 18.2: Coach Brain Integration
**Files to modify:**
- `apps/mobile/src/app/core/services/ai-coach.service.ts` (already exists)
- `apps/ai-backend/app/services/coach_brain.py`

**Features:**
- Fetch trainer's methodology from `trainer_methodology` table
- Include methodology in prompt context
- Store responses in `methodology_response_logs`
- Default prompts when no methodology set
- Streaming response support

**Database Schema:**
```sql
-- Already exists from Sprint 16
CREATE TABLE coach_conversations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  trainer_id UUID REFERENCES profiles(id),
  message TEXT,
  role TEXT CHECK (role IN ('user', 'assistant')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Sprint 19: Adaptive Streak Healing (8 points)

### Overview
Implement weekly-based streak system with forgiveness mechanisms.

### Tasks

#### Task 19.1: Streak Database Schema
**File to create:**
- `supabase/migrations/00014_streak_system.sql`

**Schema:**
```sql
CREATE TABLE streaks (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  streak_type TEXT CHECK (streak_type IN ('workout', 'nutrition', 'combined')),
  current_weeks INTEGER DEFAULT 0,
  longest_weeks INTEGER DEFAULT 0,
  target_days_per_week INTEGER DEFAULT 4,
  grace_days_remaining INTEGER DEFAULT 4,
  last_grace_reset TIMESTAMPTZ DEFAULT NOW(),
  repair_available BOOLEAN DEFAULT false,
  repair_expires_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE weekly_consistency (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  week_start DATE NOT NULL,
  streak_type TEXT NOT NULL,
  target_days INTEGER NOT NULL,
  completed_days INTEGER DEFAULT 0,
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'achieved', 'partial', 'missed')),
  repair_used BOOLEAN DEFAULT false,
  UNIQUE(user_id, week_start, streak_type)
);
```

#### Task 19.2: Streak Service
**File to create:**
- `apps/mobile/src/app/core/services/streak.service.ts`

**Features:**
- `calculateWeeklyStreak(userId, type)` - Calculate current streak
- `checkStreakStatus()` - Called on app open
- `repairStreak(method: 'bonus_workout' | 'extended_session')` - Repair mechanisms
- `useGraceDay()` - Use one of 4 monthly grace days
- `getStreakMilestones()` - 7, 30, 100, 365 days

**Streak Logic:**
- Week = Monday-Sunday
- "Consistent week" = 4+ days of activity (configurable)
- Missing 1-2 days = "partial" (streak continues)
- Missing 3+ days = repair needed or streak resets
- Repair options:
  - Bonus workout (extra session = +1 day credit)
  - Extended session (150% duration = +1 day credit)
  - Grace day (4/month, auto-refills)

#### Task 19.3: Streak UI Components
**Files to create:**
- `apps/mobile/src/app/shared/components/streak-widget/streak-widget.component.ts`
- `apps/mobile/src/app/shared/components/streak-repair-modal/streak-repair-modal.component.ts`

**Features:**
- Weekly consistency bands (not daily chains)
- Current streak in weeks
- This week's progress (e.g., "3/4 days")
- Forgiveness messaging: "Life happens. Pick up where you left off."
- Repair modal with clear explanations
- Countdown until repair expires

---

## Sprint 20: CRM Pipeline & Email Marketing (13 points)

### Overview
Visual lead pipeline and built-in email marketing for trainers.

### Tasks

#### Task 20.1: Kanban Board Component
**Files to create:**
- `apps/mobile/src/app/features/crm/components/lead-kanban/lead-kanban.component.ts`
- `apps/mobile/src/app/features/crm/components/lead-card/lead-card.component.ts`

**Features:**
- Angular CDK DragDrop
- Stages: New → Contacted → Qualified → Consultation → Won/Lost
- Lead card: name, source, days in stage, last activity
- Mobile: horizontal scroll with snap points

#### Task 20.2: Lead Detail Page
**File to create:**
- `apps/mobile/src/app/features/crm/pages/lead-detail/lead-detail.page.ts`

**Sections:**
- Lead info (name, email, phone, source, value)
- Stage selector with change history
- Activity timeline (calls, emails, meetings, notes)
- Add activity buttons (quick log)
- Next follow-up scheduler
- Convert to client button

#### Task 20.3: Email Template Editor
**Files to create:**
- `apps/mobile/src/app/features/crm/pages/email-campaigns/template-editor/template-editor.page.ts`
- `apps/mobile/src/app/features/crm/components/template-editor/template-editor.component.ts`

**Features:**
- Lightweight editor (Quill or custom)
- Bold, italic, links, images
- Variable insertion: `{{first_name}}`, `{{trainer_name}}`, `{{gym_name}}`
- Preview mode with sample data
- Pre-built templates (welcome, win-back, referral, promotion)

#### Task 20.4: Sequence Builder
**File to create:**
- `apps/mobile/src/app/features/crm/pages/email-campaigns/sequence-builder/sequence-builder.page.ts`

**Features:**
- Visual timeline of steps
- Each step: delay + template + optional condition
- Triggers: lead_created, lead_stage_changed, days_since_last_visit
- Status: draft, active, paused
- Stats: sent, opened, clicked, converted

---

## Sprint 21: Progressive Autonomy Transfer (8 points)

### Overview
Score client readiness for independence and graduation flow.

### Tasks

#### Task 21.1: Autonomy Assessment
**Files to create:**
- `supabase/migrations/00015_autonomy_system.sql`
- `apps/mobile/src/app/core/services/autonomy.service.ts`

**Schema:**
```sql
CREATE TABLE autonomy_assessments (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  workout_knowledge JSONB, -- {form: 80, periodization: 70, modification: 85}
  nutrition_knowledge JSONB, -- {tracking_accuracy: 90, portion_estimation: 75, flexibility: 80}
  behavior_consistency JSONB, -- {workout_90d: 85, nutrition_90d: 70, self_initiated: 60}
  overall_score INTEGER,
  readiness_level TEXT CHECK (readiness_level IN ('learning', 'progressing', 'near_ready', 'ready')),
  recommended_action TEXT,
  assessed_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Service Features:**
- `calculateAutonomyScore(clientId)` - Aggregate scoring
- `getReadinessLevel(score)` - learning/progressing/near_ready/ready
- `getRecommendedAction(clientId)` - continue, reduce_frequency, offer_graduation
- `scheduleAssessment(clientId)` - Auto-schedule next assessment

#### Task 21.2: Trainer Dashboard Widget
**Files to create:**
- `apps/mobile/src/app/features/clients/components/autonomy-indicator/autonomy-indicator.component.ts`
- `apps/mobile/src/app/features/clients/components/graduation-alert/graduation-alert.component.ts`

#### Task 21.3: Client Graduation Flow
**File to create:**
- `apps/mobile/src/app/features/clients/pages/graduation/graduation.page.ts`

**Flow:**
1. Trainer triggers graduation review
2. Show client's progress journey (before/after stats)
3. Celebrate achievements (confetti!)
4. Explain maintenance mode benefits
5. Set quarterly check-in schedule
6. Reduce pricing tier
7. Send celebration email

---

## Sprint 22: Video Feedback System (13 points)

### Overview
Clients submit form check videos, trainers annotate with timestamps and drawings.

### Tasks

#### Task 22.1: Video Upload
**Files to create:**
- `supabase/migrations/00016_video_feedback.sql`
- `apps/mobile/src/app/features/workouts/pages/video-submit/video-submit.page.ts`

**Schema:**
```sql
CREATE TABLE video_submissions (
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  exercise_id UUID REFERENCES exercises(id),
  storage_path TEXT NOT NULL,
  thumbnail_path TEXT,
  duration_seconds INTEGER,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'archived')),
  client_notes TEXT
);

CREATE TABLE video_annotations (
  id UUID PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES video_submissions(id),
  timestamp_seconds DECIMAL(10,2),
  annotation_type TEXT CHECK (annotation_type IN ('marker', 'drawing', 'comment')),
  content JSONB, -- {type: 'arrow', points: [...], color: '#ff0000'}
  text_comment TEXT
);
```

#### Task 22.2: Trainer Annotation Tools
**Files to create:**
- `apps/mobile/src/app/features/clients/pages/video-review/video-review.page.ts`
- `apps/mobile/src/app/features/clients/components/video-annotator/video-annotator.component.ts`

**Features:**
- Video player with controls
- Timeline with annotation markers
- Drawing overlay (arrows, circles, text)
- Comment system tied to timestamps
- Common corrections library (save/reuse)

---

## Sprint 23: Wearable Recovery Integration (8 points)

### Overview
Calculate recovery scores from wearable data and auto-adjust workout intensity.

### Tasks

#### Task 23.1: Recovery Score Calculation
**Files to create:**
- `supabase/migrations/00017_recovery_scores.sql`
- `apps/mobile/src/app/core/services/recovery.service.ts`

**Schema:**
```sql
CREATE TABLE recovery_scores (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id),
  score_date DATE NOT NULL,
  hrv_score INTEGER,
  sleep_score INTEGER,
  resting_hr_score INTEGER,
  subjective_score INTEGER,
  overall_score INTEGER,
  category TEXT CHECK (category IN ('recovered', 'moderate', 'under_recovered', 'critical')),
  intensity_modifier DECIMAL(3,2), -- 0.5 to 1.2
  volume_modifier DECIMAL(3,2),
  suggested_action TEXT,
  data_sources JSONB,
  confidence DECIMAL(3,2),
  UNIQUE(user_id, score_date)
);
```

#### Task 23.2: Auto-Intensity Adjustment
**Files to modify:**
- `apps/mobile/src/app/features/workouts/pages/active-workout/active-workout.page.ts`

**Features:**
- Show recovery status before workout
- If under_recovered:
  - Alert with recommendation ("Reduce volume 20% today")
  - Offer to auto-adjust weights/reps
  - Allow override with confirmation
- Log whether recommendation was followed

#### Task 23.3: Trainer Alerts
**Files to modify:**
- `apps/mobile/src/app/features/dashboard/dashboard.page.ts`
- `apps/mobile/src/app/features/dashboard/components/trainer-needs-attention/trainer-needs-attention.component.ts`

---

## Sprint 24: Integration Marketplace (13 points)

### Overview
OAuth and data mapping for third-party apps (MyFitnessPal, Google Calendar, Calendly).

### Tasks

#### Task 24.1: Integration Framework
**Files to create:**
- `supabase/migrations/00018_integrations.sql`
- `apps/mobile/src/app/core/services/integration.service.ts`

#### Task 24.2: MyFitnessPal Sync
**File to create:**
- `supabase/functions/mfp-sync/index.ts`

#### Task 24.3: Calendar Integrations
**File to create:**
- `supabase/functions/calendar-sync/index.ts`

---

## Sprint 25: Gym Owner Business Analytics (8 points)

### Overview
Facility-wide analytics for gym owners with multi-trainer insights.

### Tasks

#### Task 25.1: Multi-Trainer Dashboard
**File to create:**
- `apps/mobile/src/app/features/analytics/pages/owner-analytics/owner-analytics.page.ts`

**Metrics:**
- Total revenue (sum of all trainers)
- Revenue per trainer (bar chart)
- Client count by trainer
- Retention rate by trainer (66-71% benchmark)
- LTV:CAC ratio
- Churn rate (3-5% monthly target)
- Visit frequency distribution

#### Task 25.2: Trainer Performance Scoring
**File to create:**
- `apps/mobile/src/app/core/services/trainer-performance.service.ts`

---

## Sprint 26: Advanced Gamification (8 points)

### Overview
Optional social comparison on activity only (never weight/appearance).

### Tasks

#### Task 26.1: Activity-Based Leaderboards
**File to create:**
- `apps/mobile/src/app/features/social/pages/leaderboard/leaderboard.page.ts`

**Leaderboard Types:**
- Weekly steps
- Workouts completed
- Consistency streak
- Improvement (% gain over last month)

**NOT Included:**
- Weight/body composition
- Photos/appearance
- Calorie deficits

**Privacy:**
- Opt-in only
- Anonymize option
- "Compare to self" default mode

#### Task 26.2: Weekly Challenges
**File to create:**
- `apps/mobile/src/app/features/social/pages/challenges/challenges.page.ts`

---

## Common Patterns Across All Sprints

### Component Template
```typescript
@Component({
  selector: 'app-feature',
  standalone: true,
  imports: [/* explicit imports */],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `...`,
  styles: [`...`]
})
export class FeatureComponent {
  private service = inject(FeatureService);

  items = this.service.items;
  loading = this.service.loading;

  trackById = (index: number, item: Item) => item.id;
}
```

### Service Template
```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private supabase = inject(SupabaseService);

  items = signal<Item[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  isEmpty = computed(() => this.items().length === 0);

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .from('items')
        .select('*');
      if (error) throw error;
      this.items.set(data);
    } catch (err) {
      this.error.set(err.message);
    } finally {
      this.loading.set(false);
    }
  }
}
```

### Design System Checklist
- ✅ Use CSS variables (`var(--fitos-bg-primary)`)
- ✅ Dark mode support (automatically via variables)
- ✅ Adherence-neutral colors (purple for nutrition over-target)
- ✅ OnPush change detection
- ✅ Signal-based state
- ✅ Standalone components
- ✅ TrackBy functions
- ✅ WCAG 2.1 AA compliance
- ✅ 48px+ touch targets
- ✅ Reduced motion support

---

## Estimated Timeline

Assuming 1 sprint = 1 week:
- Sprint 18: Week of Jan 13, 2026
- Sprint 19: Week of Jan 20, 2026
- Sprint 20: Week of Jan 27, 2026 (2 weeks due to 13 points)
- Sprint 21: Week of Feb 10, 2026
- Sprint 22: Week of Feb 17, 2026 (2 weeks due to 13 points)
- Sprint 23: Week of Mar 3, 2026
- Sprint 24: Week of Mar 10, 2026 (2 weeks due to 13 points)
- Sprint 25: Week of Mar 24, 2026
- Sprint 26: Week of Mar 31, 2026

**Phase 2 Complete:** ~April 7, 2026 (11 weeks total)

---

## Ready to Start Sprint 18?

When you're ready to begin Sprint 18 (AI Coaching Chat UI), I'll help you:

1. Create the chat page component with message bubbles
2. Build the typing indicator animation
3. Integrate with the Coach Brain service
4. Set up conversation history loading
5. Add quick action buttons
6. Implement voice input for chat
7. Test streaming responses

Just let me know when you're ready to proceed! 🚀
