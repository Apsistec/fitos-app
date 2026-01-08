# FitOS Phase 2 Feature Backlog

**Version 2.0** | Post-MVP Enhancement Phase  
**Timeline:** Months 4-9 (after Phase 1 MVP completion)  
**Focus:** AI Features, CRM/Marketing, Voice Logging, Design Refresh

---

## Executive Summary

Phase 2 transforms FitOS from a functional fitness platform into a market-differentiating product through:

1. **Voice & AI Logging** - Sub-10-second data entry for workouts and nutrition
2. **Built-in CRM & Marketing** - Eliminate the 5-10 tool juggling trainers currently face
3. **Dark-First Design Refresh** - Premium visual experience inspired by WHOOP/MacroFactor
4. **Agentic AI Coaching** - GPT-4 powered coaching with JITAI proactive interventions

---

## Sprint Schedule Overview

| Sprint | Duration | Focus Area |
|--------|----------|------------|
| 7 | 2 weeks | Dark Mode Redesign & Design System |
| 8 | 2 weeks | Voice Workout Logging |
| 9 | 2 weeks | Voice/AI Nutrition Logging |
| 10 | 2 weeks | Photo-to-Nutrition AI |
| 11 | 2 weeks | CRM Foundation & Lead Management |
| 12 | 2 weeks | Email Marketing & Automation |
| 13 | 2 weeks | AI Coaching Chatbot |
| 14 | 2 weeks | Proactive Interventions (JITAI) |
| 15 | 2 weeks | Apple Watch Companion |
| 16 | 2 weeks | Polish, Performance, Launch Prep |

---

## Epic 11: Design System Refresh

### 11.1 Dark Mode as Primary
**Priority:** P0 (Critical)  
**Sprint:** 7  
**Status:** Not Started

**User Stories:**
- As a user, the app defaults to dark mode for gym environments
- As a user, I can switch to light mode if preferred
- As a user, I experience high contrast that's readable in any lighting

**Implementation Tasks:**
- [ ] Update `variables.scss` with new dark-first color system
- [ ] Create `_design-tokens.scss` with all CSS custom properties
- [ ] Update `--ion-background-color` to #0D0D0D (not pure black)
- [ ] Update all `--ion-text-color` values for 7:1+ contrast
- [ ] Add accent glow effects for interactive states
- [ ] Update Ionic component overrides for dark theme
- [ ] Add `<meta name="color-scheme" content="dark light" />` to index.html
- [ ] Test on OLED devices for burn-in prevention (no static bright elements)

**Acceptance Criteria:**
- App opens in dark mode by default
- All text meets WCAG AA contrast (4.5:1 minimum, 7:1 target)
- Light mode toggle works correctly
- Status bar matches theme on iOS/Android

### 11.2 Adherence-Neutral Color Update
**Priority:** P0 (Critical)  
**Sprint:** 7  
**Status:** Not Started

**User Stories:**
- As a client logging nutrition, I never see red "over target" warnings
- As a client, colors celebrate consistency, not perfection

**Implementation Tasks:**
- [ ] Replace all `--ion-color-danger` usage in nutrition with `--fitos-nutrition-over` (purple)
- [ ] Update NutritionSummaryComponent progress bar colors
- [ ] Update nutrition target displays to show neutral language
- [ ] Remove any "over/under" judgmental copy
- [ ] Update streak UI to include forgiveness messaging

**Acceptance Criteria:**
- No red colors appear anywhere in nutrition tracking
- Over-target values show in purple/violet, not red
- Copy uses neutral language ("logged", "tracked") not ("good", "bad")

### 11.3 Card & Component Refresh
**Priority:** P1 (High)  
**Sprint:** 7  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create `.fitos-card` base component with new styling
- [ ] Add glow effects on hover/active states
- [ ] Update StatCard component with new typography
- [ ] Create hero card variant for today's workout
- [ ] Add subtle gradient backgrounds to elevated surfaces
- [ ] Implement Hevy-style depth effects for premium feel

### 11.4 Typography & Spacing Update
**Priority:** P1 (High)  
**Sprint:** 7  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Add Inter font (or use system fonts with proper fallbacks)
- [ ] Create typography utility classes
- [ ] Update all headings to new scale
- [ ] Add monospace font for numeric displays (metrics, timers)
- [ ] Audit and fix all spacing inconsistencies

---

## Epic 12: Voice Workout Logging

### 12.1 Voice Service Integration (Deepgram)
**Priority:** P0 (Critical)  
**Sprint:** 8  
**Status:** Not Started

**User Stories:**
- As a client, I can log sets by speaking during rest periods
- As a client, I don't need to touch my phone while lifting

**Implementation Tasks:**
- [ ] Set up Deepgram account and API keys
- [ ] Create `VoiceService` with WebSocket streaming
- [ ] Implement microphone permission handling (Capacitor)
- [ ] Add fitness keyword boosting for better recognition
- [ ] Create voice intent parser for workout commands
- [ ] Handle background noise (gym environment)
- [ ] Add voice feedback via Deepgram Aura TTS

**Technical Specifications:**
```typescript
// Voice commands to support:
"3 sets of 10 at 185 pounds"
"did 8 reps at 185"
"skip this exercise"
"next exercise"
"start rest timer"
"stop timer"
```

### 12.2 Voice Workout Logging UI
**Priority:** P0 (Critical)  
**Sprint:** 8  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create VoiceLoggerComponent (mic button + transcript display)
- [ ] Integrate into active workout page
- [ ] Add pulsing animation during listening
- [ ] Show real-time transcript with confidence indicator
- [ ] Auto-dismiss after successful log
- [ ] Add haptic feedback on successful recognition
- [ ] Handle edge cases (background noise, unclear speech)

### 12.3 "Repeat Last Set" Voice Command
**Priority:** P1 (High)  
**Sprint:** 8  
**Status:** Not Started

**User Stories:**
- As a client, I can say "repeat" to duplicate my last logged set

**Implementation Tasks:**
- [ ] Add "repeat" intent to voice parser
- [ ] Store last logged set in session state
- [ ] Implement one-word repeat functionality
- [ ] Add haptic/audio confirmation

---

## Epic 13: Voice & AI Nutrition Logging

### 13.1 Natural Language Food Logging
**Priority:** P0 (Critical)  
**Sprint:** 9  
**Status:** Not Started

**User Stories:**
- As a client, I can describe my meal in natural language
- As a client, I can log "a fist-sized chicken breast and some rice"

**Implementation Tasks:**
- [ ] Integrate Nutritionix NLP API (90% accuracy)
- [ ] Create natural language parsing service
- [ ] Build food confirmation UI (editable breakdown)
- [ ] Handle portion size estimation ("a handful", "fist-sized")
- [ ] Support multi-food entries ("eggs, toast, and coffee")
- [ ] Cache parsed results for quick re-logging

### 13.2 Voice Food Logging
**Priority:** P1 (High)  
**Sprint:** 9  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Add voice input option to nutrition logging
- [ ] Reuse VoiceService from workout logging
- [ ] Create food-specific intent parser
- [ ] Show parsed foods for confirmation
- [ ] One-tap confirm or edit flow

### 13.3 AI Describe Feature
**Priority:** P1 (High)  
**Sprint:** 9  
**Status:** Not Started

**User Stories:**
- As a client, I can type "lunch at Chipotle" and get macro estimates

**Implementation Tasks:**
- [ ] Create AI description endpoint (Claude/GPT-4)
- [ ] Build restaurant menu knowledge base
- [ ] Handle vague descriptions with clarifying questions
- [ ] Show confidence level for estimates

---

## Epic 14: Photo-to-Nutrition AI

### 14.1 Food Photo Recognition
**Priority:** P0 (Critical)  
**Sprint:** 10  
**Status:** Not Started

**User Stories:**
- As a client, I can snap a photo of my meal to log it
- As a client, I see a breakdown of identified foods I can edit

**Implementation Tasks:**
- [ ] Evaluate and integrate food recognition API (Passio AI or SnapCalorie)
- [ ] Create photo capture flow (Capacitor Camera)
- [ ] Build food identification results UI
- [ ] Allow editing of individual identified foods
- [ ] Show confidence scores for each item
- [ ] Handle multi-food plates
- [ ] Fall back to manual logging for low-confidence results

**Technical Specifications:**
- Target accuracy: 85%+ for common foods
- Processing time: <3 seconds
- Transparent breakdown (not opaque single entry)

### 14.2 Portion Size Estimation
**Priority:** P1 (High)  
**Sprint:** 10  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Integrate depth estimation (if available via LiDAR)
- [ ] Use reference objects for scale
- [ ] Allow manual portion adjustment
- [ ] Learn from user corrections over time

---

## Epic 15: CRM & Lead Management

### 15.1 Lead Pipeline
**Priority:** P0 (Critical)  
**Sprint:** 11  
**Status:** Not Started

**User Stories:**
- As a trainer, I can track leads through my sales pipeline
- As a trainer, I can see which marketing efforts drive revenue

**Implementation Tasks:**
- [ ] Create `leads` table in database
- [ ] Build LeadService with CRUD operations
- [ ] Create visual pipeline UI (Kanban-style)
  - Stages: New → Contacted → Qualified → Consultation → Won/Lost
- [ ] Add drag-and-drop stage changes
- [ ] Track lead source attribution
- [ ] Calculate conversion rates per stage
- [ ] Add lead scoring based on engagement

**Database Schema:**
```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  source TEXT, -- 'website', 'instagram', 'referral', 'facebook', 'manual'
  source_detail TEXT, -- campaign name, referrer name, etc.
  stage TEXT DEFAULT 'new',
  score INTEGER DEFAULT 0,
  notes TEXT,
  last_contacted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE lead_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  activity_type TEXT, -- 'email_sent', 'email_opened', 'call', 'meeting', 'note'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 15.2 Lead Capture Forms
**Priority:** P1 (High)  
**Sprint:** 11  
**Status:** Not Started

**User Stories:**
- As a trainer, I can embed lead capture forms on my website
- As a trainer, leads automatically appear in my pipeline

**Implementation Tasks:**
- [ ] Create embeddable form widget (iframe or JS snippet)
- [ ] Build form builder UI (customizable fields)
- [ ] Generate embed code for trainers
- [ ] Auto-create lead on form submission
- [ ] Send notification to trainer
- [ ] Support lead magnets (PDF download after signup)

### 15.3 Client Lifecycle Tracking
**Priority:** P2 (Medium)  
**Sprint:** 11  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Track client lifecycle stages (Active → At-Risk → Churned → Win-back)
- [ ] Calculate engagement scores based on activity
- [ ] Flag at-risk clients automatically
- [ ] Track reasons for churn

---

## Epic 16: Email Marketing & Automation

### 16.1 Email Sending Infrastructure
**Priority:** P0 (Critical)  
**Sprint:** 12  
**Status:** Not Started

**User Stories:**
- As a trainer, I can send emails without using external tools
- As a trainer, I can see email open/click rates

**Implementation Tasks:**
- [ ] Integrate email provider (Resend, SendGrid, or Postmark)
- [ ] Create email templates table
- [ ] Build template editor UI (WYSIWYG)
- [ ] Implement email sending service
- [ ] Track opens and clicks
- [ ] Handle unsubscribes (CAN-SPAM compliance)
- [ ] Create fitness-specific email templates

### 16.2 Email Sequences
**Priority:** P1 (High)  
**Sprint:** 12  
**Status:** Not Started

**User Stories:**
- As a trainer, I can create automated email sequences for new leads
- As a trainer, I can set up win-back campaigns for churned clients

**Implementation Tasks:**
- [ ] Create sequences table (multi-step campaigns)
- [ ] Build sequence builder UI (visual timeline)
- [ ] Implement delay logic (send after X days)
- [ ] Add trigger conditions (lead created, client inactive, etc.)
- [ ] Support dynamic content (personalization tokens)
- [ ] Pre-built templates:
  - Welcome sequence (4 emails over 7 days)
  - Lead nurture (5 emails over 14 days)
  - Win-back campaign (3 emails over 21 days)

### 16.3 Marketing Analytics Dashboard
**Priority:** P2 (Medium)  
**Sprint:** 12  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create marketing dashboard for trainers
- [ ] Show lead source attribution chart
- [ ] Display email performance metrics
- [ ] Calculate marketing ROI (leads → clients → revenue)
- [ ] Compare campaign performance

---

## Epic 17: AI Coaching Chatbot

### 17.1 AI Agent Foundation
**Priority:** P0 (Critical)  
**Sprint:** 13  
**Status:** Not Started

**User Stories:**
- As a client, I can ask questions about my fitness and get personalized answers
- As a client, the AI knows my workout history and goals

**Implementation Tasks:**
- [ ] Set up LangGraph/LangChain backend service
- [ ] Create chat conversation table
- [ ] Implement RAG (Retrieval Augmented Generation) for:
  - User's workout history
  - User's nutrition logs
  - User's goals and preferences
  - General fitness knowledge base
- [ ] Build AI Agent service (multi-agent architecture)
- [ ] Create chat UI component
- [ ] Implement conversation memory (last 10 messages context)

**Agent Architecture:**
```
                    ┌─────────────────────────────┐
                    │     Coach Orchestrator      │
                    │     (LangGraph Supervisor)   │
                    └─────────────┬───────────────┘
                                  │
    ┌─────────────┬───────────────┼───────────────┬─────────────┐
    ↓             ↓               ↓               ↓             ↓
┌─────────┐ ┌───────────┐ ┌──────────────┐ ┌────────────┐ ┌───────────┐
│ Workout │ │ Nutrition │ │   Recovery   │ │ Motivation │ │   Admin   │
│  Agent  │ │   Agent   │ │    Agent     │ │   Agent    │ │   Agent   │
└─────────┘ └───────────┘ └──────────────┘ └────────────┘ └───────────┘
```

### 17.2 Trainer Methodology Learning
**Priority:** P1 (High)  
**Sprint:** 13  
**Status:** Not Started

**User Stories:**
- As a trainer, the AI coaches my clients in my voice and methodology
- As a trainer, I can customize what the AI says about nutrition philosophy

**Implementation Tasks:**
- [ ] Create trainer methodology profile
- [ ] Allow trainers to upload/describe their approach
- [ ] Fine-tune AI responses to match trainer voice
- [ ] Add "escalate to trainer" for complex questions
- [ ] Log AI conversations for trainer review

### 17.3 Chat UI
**Priority:** P0 (Critical)  
**Sprint:** 13  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create chat page (message list + input)
- [ ] Implement real-time message updates
- [ ] Add typing indicator while AI processes
- [ ] Support markdown rendering in responses
- [ ] Add quick action buttons for common questions
- [ ] Implement voice input for chat

---

## Epic 18: Proactive AI Interventions (JITAI)

### 18.1 Intervention Detection System
**Priority:** P1 (High)  
**Sprint:** 14  
**Status:** Not Started

**User Stories:**
- As a client, I receive timely nudges when I might skip a workout
- As a client, nudges are helpful, not annoying

**Implementation Tasks:**
- [ ] Create intervention rules engine
- [ ] Implement vulnerability scoring:
  - Days since last workout
  - Wearable data (sleep, HRV, stress)
  - Calendar density
  - Historical dropout patterns
- [ ] Implement receptivity detection:
  - Time of day preferences
  - Recent app engagement
  - Notification response history
- [ ] Add frequency caps (max 2-3 per day)
- [ ] Create intervention templates

**JITAI Framework:**
```typescript
interface JITAIContext {
  vulnerability: number;  // 0-1, risk of skipping
  receptivity: number;    // 0-1, willingness to engage
  opportunity: number;    // 0-1, context allows action
}

// Intervene when: vulnerability > 0.6 AND receptivity > 0.5 AND opportunity > 0.4
```

### 18.2 Intelligent Notifications
**Priority:** P1 (High)  
**Sprint:** 14  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create notification service with AI-generated content
- [ ] Personalize messages based on user history
- [ ] Implement notification scheduling
- [ ] Track notification engagement
- [ ] A/B test notification copy
- [ ] Allow users to customize notification preferences

### 18.3 Churn Prediction Model
**Priority:** P2 (Medium)  
**Sprint:** 14  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create engagement scoring system
- [ ] Build churn risk indicators for trainer dashboard
- [ ] Alert trainers about at-risk clients
- [ ] Track intervention effectiveness

---

## Epic 19: Apple Watch Companion App

### 19.1 Watch App Foundation
**Priority:** P1 (High)  
**Sprint:** 15  
**Status:** Not Started

**User Stories:**
- As a client with Apple Watch, I can log workouts from my wrist
- As a client, my watch shows today's workout at a glance

**Implementation Tasks:**
- [ ] Create watchOS app target in Xcode
- [ ] Implement WatchConnectivity for phone-watch sync
- [ ] Build today's workout complication
- [ ] Create workout logging interface (haptic-driven)
- [ ] Sync logged sets back to phone
- [ ] Display rest timer on watch

### 19.2 Watch Workout Logging
**Priority:** P1 (High)  
**Sprint:** 15  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create exercise list view
- [ ] Implement quick-log buttons (+/- weight, +/- reps)
- [ ] Add "Complete Set" button with haptic feedback
- [ ] Auto-advance to next exercise
- [ ] Sync data when phone is in range

---

## Epic 20: Performance & Polish

### 20.1 Performance Optimization
**Priority:** P0 (Critical)  
**Sprint:** 16  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Audit and implement virtual scrolling for all long lists
- [ ] Ensure all feature modules are lazy-loaded
- [ ] Verify OnPush change detection everywhere
- [ ] Add trackBy to all *ngFor loops
- [ ] Profile and fix any jank (target 60fps)
- [ ] Optimize image loading (lazy load, WebP format)
- [ ] Implement skeleton loading for all data-dependent views

### 20.2 Animation Polish
**Priority:** P1 (High)  
**Sprint:** 16  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Add workout completion celebration (confetti + haptic)
- [ ] Implement progress ring animations
- [ ] Add card hover/tap micro-interactions
- [ ] Polish rest timer countdown animation
- [ ] Add streak milestone celebrations
- [ ] Ensure all animations use transform/opacity only

### 20.3 Accessibility Audit
**Priority:** P1 (High)  
**Sprint:** 16  
**Status:** Not Started

**Implementation Tasks:**
- [ ] Run automated accessibility audit (Lighthouse, axe)
- [ ] Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Verify all touch targets are 44px minimum
- [ ] Ensure proper heading hierarchy
- [ ] Add ARIA labels to icon-only buttons
- [ ] Test reduced motion preferences

---

## Definition of Done (Phase 2)

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
- [ ] Deployed to staging

---

## Success Metrics

### User Experience
- Data entry time: <10 seconds per log
- Voice logging accuracy: >90%
- App load time: <2 seconds
- Crash rate: <0.1%

### Business Impact
- Trainer marketing tool adoption: 60%+
- Email open rates: 30%+
- Client retention improvement: 20%+
- Voice logging adoption: 40%+ of logs

### Technical
- Lighthouse Performance score: 90+
- Lighthouse Accessibility score: 100
- Bundle size increase: <30%
- API response time: <200ms P95
