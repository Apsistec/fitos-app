# Sprint 53: Progressive Onboarding & Auth Enhancement - Implementation Plan

**Sprint:** 53
**Feature:** Email OTP, Native Social Login, 7-Stage Progressive Onboarding
**Goal:** Reduce signup friction and increase Day-30 retention through research-backed onboarding
**Priority:** P0 (Critical)
**Story Points:** 34
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 53 replaces magic link authentication with email OTP (keeps users in-app), adds native Google/Apple sign-in via `@capgo/capacitor-social-login`, and expands the basic onboarding wizard into a 7-stage progressive flow. Research from RevenueCat shows longer onboarding flows outperform shorter ones in fitness apps — Noom uses 52+ screens, Lose It! saw trial starts increase by double digits after extending onboarding.

**Strategic Value:**
- Email OTP eliminates the "leave app → open email → tap link → return" friction
- Native social login reduces signup from ~60 seconds to ~5 seconds
- Extended onboarding correlates with higher retention in fitness apps
- Progressive profiling defers detailed preferences to future sessions
- $0/month cost (Supabase Auth OTP included, native social login is free)

---

## Goals

1. Add email OTP authentication as primary passwordless method
2. Implement native Google and Apple sign-in with signInWithIdToken()
3. Expand onboarding from basic wizard to 7-stage progressive flow
4. Create post-onboarding progressive profiling (1-2 questions per session)
5. Track onboarding analytics per stage

---

## Technical Architecture

### Database Schema

```sql
-- Expand profiles for progressive onboarding
ALTER TABLE profiles
  ADD COLUMN onboarding_stage INTEGER DEFAULT 0,
  ADD COLUMN last_profiling_step INTEGER DEFAULT 0,
  ADD COLUMN life_context JSONB DEFAULT '{}',
  ADD COLUMN behavioral_assessment JSONB DEFAULT '{}',
  ADD COLUMN imported_health_data BOOLEAN DEFAULT false,
  ADD COLUMN onboarding_completed_at TIMESTAMPTZ;

-- Onboarding funnel analytics
CREATE TABLE onboarding_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stage INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  time_spent_seconds INTEGER,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Post-onboarding progressive profiling questions
CREATE TABLE progressive_profiling_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  question_text TEXT NOT NULL,
  answer JSONB,
  asked_at TIMESTAMPTZ,
  answered_at TIMESTAMPTZ,
  session_number INTEGER NOT NULL
);

CREATE INDEX idx_onboarding_analytics_user ON onboarding_analytics(user_id);
CREATE INDEX idx_profiling_queue_user ON progressive_profiling_queue(user_id, session_number);

ALTER TABLE onboarding_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE progressive_profiling_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding" ON onboarding_analytics
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own profiling" ON progressive_profiling_queue
  FOR ALL USING (user_id = auth.uid());
```

### 7-Stage Onboarding Flow

```
Stage 1: Goal Anchoring     → "What's your primary fitness goal?"
Stage 2: Life Context        → Timeline, events, motivation
Stage 3: Health Import       → Import from Apple Health/Health Connect (optional)
Stage 4: Behavioral Assessment → Activity level, preferences, schedule
Stage 5: Social Proof        → Success stories interstitial
Stage 6: Plan Preview        → Personalized plan based on inputs
Stage 7: Paywall             → Subscription options (Stripe integration)
```

### Progressive Profiling Schedule

```
Session 2:  Ask about dietary preferences
Session 3:  Ask about injury history
Week 1:     Prompt for wearable integration
After first workout: Ask about exercise experience level
After first meal log: Ask about cooking frequency
Limit: 1-2 questions per session, never interrupt core actions
```

### Auth Flow: signInWithIdToken()

```
Native Plugin (Google/Apple) → Get ID Token
ID Token → supabase.auth.signInWithIdToken({ provider, token, nonce })
Supabase → Validates token with provider, issues JWT
App → Authenticated, proceed to onboarding or dashboard
```

This avoids the fragile OAuth redirect flow which has documented session persistence problems in Capacitor WebViews.

---

## Implementation Tasks

### Task 53.1: Install Plugin & Create Social Login Service

**Files to create:**
- `apps/mobile/src/app/core/services/social-login.service.ts`

**Deliverables:**
- Install `@capgo/capacitor-social-login`
- Native Google sign-in (credential manager on Android, Google Sign-In on iOS)
- Native Apple sign-in (ASAuthorizationController on iOS)
- Platform detection: native on iOS/Android, Supabase OAuth fallback on web
- Returns ID token to auth.service.ts

**Technical Specifications:**
```typescript
@Injectable({ providedIn: 'root' })
export class SocialLoginService {
  private readonly authService = inject(AuthService);

  async signInWithGoogle(): Promise<AuthResponse>;
  async signInWithApple(): Promise<AuthResponse>;
  private async handleIdToken(provider: string, idToken: string, nonce?: string): Promise<AuthResponse>;
}
```

### Task 53.2: Enhance Auth Service with OTP & ID Token

**Files to modify:**
- `apps/mobile/src/app/core/services/auth.service.ts`

**Deliverables:**
- Add `signInWithOtp(email: string)`: Call `supabase.auth.signInWithOtp({ email })`
- Add `verifyOtp(email: string, token: string)`: Call `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- Add `signInWithIdToken(provider, idToken, nonce?)`: For native social login flow
- Keep existing magic link and password auth as fallbacks
- Configure Supabase email OTP settings (expiry, rate limiting)

### Task 53.3: Update Login & Register Pages

**Files to modify:**
- `apps/mobile/src/app/features/auth/pages/login/login.page.ts`
- `apps/mobile/src/app/features/auth/pages/register/register.page.ts`

**Deliverables:**
- Add "Continue with Google" button (styled per Google branding guidelines)
- Add "Continue with Apple" button (styled per Apple HIG, required for App Store)
- Add email OTP flow as primary passwordless option
- Keep email/password as secondary option
- OTP input using existing `otp-input` shared component

### Task 53.4: Create 7 Onboarding Stage Components

**Files to create:**
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/goal-anchoring/goal-anchoring.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/life-context/life-context.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/health-import/health-import.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/behavioral-assessment/behavioral-assessment.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/social-proof/social-proof.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/plan-preview/plan-preview.component.ts`
- `apps/mobile/src/app/features/auth/pages/onboarding/stages/paywall/paywall.component.ts`

**Deliverables:**
- Stage 1 (Goal Anchoring): Visual goal cards (lose weight, build muscle, get stronger, improve health, athletic performance), motivational framing
- Stage 2 (Life Context): Timeline picker, upcoming events, motivation source selector
- Stage 3 (Health Import): Apple Health/Health Connect data import (weight, height, age from HealthKit). Skip-able if Sprint 49 not complete or user declines
- Stage 4 (Behavioral Assessment): Activity level slider, exercise frequency, diet style, preferred training times
- Stage 5 (Social Proof): Success stories carousel, transformation metrics, testimonials. Appears as interstitial at drop-off point
- Stage 6 (Plan Preview): AI-generated personalized plan based on all inputs, progress prediction graph
- Stage 7 (Paywall): Subscription tiers, feature comparison, free trial CTA (integrates with existing Stripe flow)

### Task 53.5: Enhance Onboarding Page

**Files to modify:**
- `apps/mobile/src/app/features/auth/pages/onboarding/onboarding.page.ts`

**Deliverables:**
- Expand from basic wizard to 7-stage progressive flow
- Animated progress bar showing stage completion
- Stage-based navigation (next/back/skip)
- Analytics tracking per stage (time spent, completion)
- Save progress to `profiles.onboarding_stage`

### Task 53.6: Create Progressive Profiling Service

**Files to create:**
- `apps/mobile/src/app/core/services/progressive-profiling.service.ts`

**Deliverables:**
- `getNextQuestions(count)`: Get 1-2 questions for current session
- `submitAnswer(questionKey, answer)`: Save to profiling queue, advance counter
- `shouldShowProfiling()`: Check session gap, respect rate limits
- Question categories: dietary preferences, injury history, wearable interest, exercise experience, cooking frequency, sleep schedule
- Limit: 1-2 questions per session, never during core actions

### Task 53.7: Create Profiling Prompt Component

**Files to create:**
- `apps/mobile/src/app/features/dashboard/components/profiling-prompt/profiling-prompt.component.ts`

**Deliverables:**
- Card on dashboard with 1-2 contextual questions
- Dismissible (can skip questions)
- Explain why question is being asked
- Smooth animation, dark theme

### Task 53.8: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213050000_progressive_onboarding.sql`

---

## User Flows

### Flow 1: New User Signs Up with Google

```
1. User → Taps "Continue with Google"
2. SocialLoginService → Opens native Google credential manager
3. Google → Returns ID token
4. AuthService → Calls supabase.auth.signInWithIdToken({ provider: 'google', token })
5. Supabase → Validates, creates user, issues JWT
6. App → Navigates to Stage 1 onboarding
7. User → Completes 7 stages (3-5 minutes)
8. App → Saves all preferences, navigates to dashboard
```

### Flow 2: Email OTP Login

```
1. User → Enters email, taps "Send Code"
2. AuthService → Calls supabase.auth.signInWithOtp({ email })
3. User → Receives 6-digit code in email (stays in app)
4. User → Enters code in OTP input
5. AuthService → Calls supabase.auth.verifyOtp({ email, token, type: 'email' })
6. App → Authenticated, navigates to dashboard
```

### Flow 3: Progressive Profiling (Session 3)

```
1. User → Opens app for 3rd session
2. ProfilingService → shouldShowProfiling() returns true
3. Dashboard → Shows profiling prompt card
4. Card → "We noticed you're interested in meal prep. Do you cook most meals at home?"
5. User → Selects answer or dismisses
6. ProfilingService → Saves answer, increments last_profiling_step
7. Card → Disappears until next qualifying session
```

---

## Acceptance Criteria

- [ ] Email OTP: user enters email, receives 6-digit code, authenticates without leaving app
- [ ] Google sign-in: one tap on native, completes in <5 seconds
- [ ] Apple sign-in: one tap on iOS, completes in <5 seconds (mandatory per App Store)
- [ ] Onboarding has 7 stages with animated progress bar
- [ ] Onboarding takes 3-5 minutes to complete
- [ ] Social proof interstitial appears at Stage 5
- [ ] Health data import offered at Stage 3 (requires Sprint 49; skip if not available)
- [ ] Personalized plan preview at Stage 6
- [ ] Paywall at Stage 7 integrates with existing Stripe
- [ ] Progressive profiling: 1-2 questions per post-onboarding session
- [ ] `last_profiling_step` counter advances correctly
- [ ] Onboarding analytics track time spent and completion per stage
- [ ] Existing magic link and password auth continue to work
- [ ] Dark theme applied, adherence-neutral colors throughout

---

## Risk Mitigation

### Risk 1: App Store Rejection (Apple Sign-In)
- Apple Guideline 4.8 requires Sign in with Apple when offering third-party social login
- **Mitigation:** Apple Sign-In implemented as primary social option on iOS

### Risk 2: Onboarding Drop-Off
- 7 stages may cause abandonment if too long
- **Mitigation:** Social proof interstitials at drop-off points, all stages skippable, progress saved per stage so users can resume

### Risk 3: OTP Email Deliverability
- Codes may land in spam
- **Mitigation:** Supabase handles email via their infrastructure; fallback to magic link available

---

## Dependencies

- Sprint 49 (optional): Health import stage uses HealthKit/Health Connect service
- Can proceed without Sprint 49 by making Stage 3 skippable or hidden

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 53.1 - Install Plugin & Create Social Login Service
