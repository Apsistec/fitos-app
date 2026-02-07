# FitOS Master Implementation Prompt

**Version:** 1.0
**Created:** January 30, 2026
**Purpose:** Single prompt to drive complete implementation of Sprints 58-69

---

## PROMPT START

You are implementing FitOS, an AI-native fitness coaching platform. Your task is to complete the design-to-code implementation for all 102 pages across 12 sprints.

### Project Context

**Repository:** `/sessions/affectionate-nice-cray/mnt/fitos-app`
**Tech Stack:** Angular 21 + Ionic 8 + Capacitor 8 + Supabase + LangGraph
**Design Source:** Google Stitch (designs already generated)
**Current State:** 95% backend complete, ~68% frontend complete

### Critical Documentation (Read First)

Before any implementation:
1. **FINAL_SERVICE_DECISIONS.md** - API selections and configurations
2. **IMPLEMENTATION_SPRINTS_DETAILED.md** - Sprint tasks and acceptance criteria
3. **IMPLEMENTATION_RULES.md** - Coding standards and patterns
4. **.skills/skills/fitos-dev/SKILL.md** - Development skill reference

### Implementation Order

Execute sprints in this exact order (critical path dependencies):

```
Week 1:     Sprint 58 (Auth) → Sprint 59 (Dashboard)
Week 2-3:   Sprint 60 (Workouts) → Sprint 61 (Nutrition)
Week 4-5:   Sprint 62 (Coaching) → Sprint 63 (Clients) → Sprint 64 (CRM)
Week 6-8:   Sprint 65 (Settings) → Sprint 66 (Analytics)
Week 9-10:  Sprint 67 (Franchise) → Sprint 68 (Help/Social)
Week 11-12: Sprint 69 (Landing)
```

### Per-Sprint Workflow

For each sprint, follow this exact process:

#### Step 1: Read Sprint Requirements
```bash
# Review the sprint tasks in IMPLEMENTATION_SPRINTS_DETAILED.md
# Identify all pages/components to implement
# Note any API integrations required
```

#### Step 2: Verify Design Files Exist
```bash
# Check for Stitch-generated designs
ls apps/mobile/src/app/features/{feature}/pages/
```

#### Step 3: Implement Each Page
For each page in the sprint:

```typescript
// 1. Create/update the page component
// 2. Apply Stitch design (dark-first, glow effects)
// 3. Add Ionic components with explicit imports
// 4. Connect to services for real data
// 5. Implement all user interactions
// 6. Add error handling and loading states
// 7. Ensure accessibility attributes
```

#### Step 4: Verify Implementation
```bash
# Build must succeed
npm run build

# Run any existing tests
npm test -- --passWithNoTests

# Check for TypeScript errors
npx tsc --noEmit
```

#### Step 5: Document Completion
Update sprint status in the relevant docs.

---

## Sprint-Specific Instructions

### Sprint 58: Auth & Onboarding

**Files to modify/create:**
```
apps/mobile/src/app/features/auth/pages/
├── login/login.page.ts
├── trainer-login/trainer-login.page.ts
├── client-login/client-login.page.ts
├── gym-owner-login/gym-owner-login.page.ts
├── register/register.page.ts
├── trainer-register/trainer-register.page.ts
├── client-register/client-register.page.ts
├── forgot-password/forgot-password.page.ts
├── reset-password/reset-password.page.ts
├── verify-email/verify-email.page.ts
├── mfa-setup/mfa-setup.page.ts
├── mfa-verify/mfa-verify.page.ts
└── onboarding/onboarding.page.ts
```

**Key requirements:**
- Dark theme with accent glow on role selection cards
- MFA setup with TOTP QR code
- Chronotype quiz in onboarding (5-item rMEQ)
- OAuth buttons for Google and Apple

### Sprint 59: Dashboard & Navigation

**Files to modify/create:**
```
apps/mobile/src/app/features/dashboard/pages/
├── dashboard/dashboard.page.ts
├── components/
│   ├── trainer-dashboard/trainer-dashboard.component.ts
│   ├── client-dashboard/client-dashboard.component.ts
│   └── gym-owner-dashboard/gym-owner-dashboard.component.ts
apps/mobile/src/app/layout/
└── tabs/tabs.page.ts
```

**Key requirements:**
- Role-based dashboard switching
- Real-time Supabase subscriptions
- Tab badges for unread counts
- Pull-to-refresh

### Sprint 60: Workouts (VOICE INTEGRATION)

**Files to modify/create:**
```
apps/mobile/src/app/features/workouts/pages/
├── workout-list/workout-list.page.ts
├── workout-builder/workout-builder.page.ts
├── active-workout/active-workout.page.ts
├── workout-complete/workout-complete.page.ts
├── exercise-library/exercise-library.page.ts
├── progress/progress.page.ts
└── measurements/measurements.page.ts
apps/mobile/src/app/features/workouts/components/
├── rest-timer/rest-timer.component.ts
├── set-logger/set-logger.component.ts
└── exercise-card/exercise-card.component.ts
```

**CRITICAL: Voice logging implementation:**
```typescript
// In active-workout.page.ts
// Integrate VoiceService from core/services/voice.service.ts

// Voice command patterns:
const WORKOUT_PATTERNS = {
  logSet: /(\d+)\s*(reps?|x)\s*(?:at\s*)?(\d+(?:\.\d+)?)\s*(kg|lbs?)?/i,
  repeatLast: /repeat|same|again/i,
  completeExercise: /done|finished|complete|next/i,
  startRest: /rest|break|pause/i
};

// Usage:
// "10 reps at 135" → logs { reps: 10, weight: 135 }
// "repeat" → copies last set
// "done" → moves to next exercise
```

### Sprint 61: Nutrition (VOICE + PHOTO AI)

**Files to modify/create:**
```
apps/mobile/src/app/features/nutrition/pages/
├── nutrition/nutrition.page.ts
├── add-food/add-food.page.ts
├── voice-nutrition/voice-nutrition.page.ts
├── photo-nutrition/photo-nutrition.page.ts
└── food-detail/food-detail.page.ts
apps/mobile/src/app/features/nutrition/components/
├── macro-ring/macro-ring.component.ts
├── meal-card/meal-card.component.ts
└── food-item/food-item.component.ts
```

**CRITICAL: Adherence-neutral colors:**
```scss
// NEVER use red for over-target
// In nutrition.page.scss and macro-ring.component.scss:

.macro-ring {
  &.calories { --progress-color: var(--fitos-nutrition-calories); }  // Indigo
  &.protein { --progress-color: var(--fitos-nutrition-protein); }    // Green
  &.carbs { --progress-color: var(--fitos-nutrition-carbs); }        // Amber
  &.fat { --progress-color: var(--fitos-nutrition-fat); }            // Pink
  &.over { --progress-color: var(--fitos-nutrition-over); }          // Violet/Purple
}
```

**Voice nutrition pattern:**
```typescript
// "chicken breast 6 ounces" → calls Edamam NLP API
// Returns: { name: "Chicken Breast", quantity: 6, unit: "oz", macros: {...} }
```

**Photo nutrition pattern:**
```typescript
// 1. Capture/select image
// 2. Send to Gemini 2.5 Flash via Edge Function
// 3. Display identified foods with confidence scores
// 4. Cross-reference with USDA for accurate macros
// 5. User confirms and logs
```

### Sprint 62: Coaching & Messages

**Files to modify/create:**
```
apps/mobile/src/app/features/coaching/pages/
├── coaching-chat/coaching-chat.page.ts
├── methodology-setup/methodology-setup.page.ts
└── components/
    ├── chat-message/chat-message.component.ts
    └── quick-actions/quick-actions.component.ts
apps/mobile/src/app/features/messages/pages/
├── messages-list/messages-list.page.ts
└── message-chat/message-chat.page.ts
```

**AI Chat integration:**
```typescript
// Connect to LangGraph backend
const response = await this.http.post(
  `${environment.aiBackendUrl}/coach/chat`,
  {
    message: userMessage,
    conversationHistory: this.messages().slice(-10),
    userContext: {
      todaysWorkout: this.todaysWorkout(),
      nutritionProgress: this.nutritionProgress(),
      recoveryScore: this.recoveryScore()
    }
  }
);
```

### Sprint 63: Client Management

**Standard CRUD implementation with attention alerts.**

### Sprint 64: CRM & Marketing

**Key feature: Kanban board with CDK DragDrop for lead pipeline.**

### Sprint 65: Settings & Profile

**Key feature: Stripe Connect Express onboarding for trainers.**

### Sprint 66-69: Follow sprint tasks in IMPLEMENTATION_SPRINTS_DETAILED.md

---

## API Integration Checklist

Before implementing features that require external APIs, ensure Edge Functions exist:

| Feature | Edge Function | Status |
|---------|---------------|--------|
| Voice STT | `supabase/functions/deepgram-transcribe` | Create if missing |
| Voice TTS | `supabase/functions/deepgram-speak` | Create if missing |
| Food Search | `supabase/functions/edamam-search` | Create if missing |
| Photo Food | `supabase/functions/gemini-food-recognition` | Create if missing |
| AI Chat | `supabase/functions/ai-coach-chat` | Create if missing |
| Email Send | `supabase/functions/resend-email` | Create if missing |

**Edge Function template:**
```typescript
// supabase/functions/deepgram-transcribe/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const DEEPGRAM_API_KEY = Deno.env.get('DEEPGRAM_API_KEY');

serve(async (req) => {
  const { audio } = await req.json();

  const response = await fetch('https://api.deepgram.com/v1/listen?model=nova-3', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${DEEPGRAM_API_KEY}`,
      'Content-Type': 'audio/wav'
    },
    body: audio
  });

  const result = await response.json();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
});
```

---

## Verification Checklist (Per Sprint)

After completing each sprint, verify:

- [ ] All pages render without errors
- [ ] Navigation between pages works
- [ ] Data loads from Supabase correctly
- [ ] Forms submit and save data
- [ ] Error states display properly
- [ ] Loading states show during async operations
- [ ] Dark theme applied correctly
- [ ] No red colors for nutrition over-target
- [ ] Accessibility attributes present
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors

---

## Completion Criteria

The implementation is complete when:

1. All 102 pages are implemented and functional
2. Voice workout logging works end-to-end
3. Voice nutrition logging works end-to-end
4. Photo food recognition works end-to-end
5. AI coaching chat connects to LangGraph backend
6. All forms save data to Supabase
7. Real-time updates work (messages, dashboard)
8. Build succeeds with no errors
9. Adherence-neutral design verified (no red over-target)
10. Mobile app runs on iOS simulator and Android emulator

---

## Troubleshooting

### Build Fails
```bash
# Check for import errors
npm run build 2>&1 | grep -i "error"

# Common fix: Missing Ionic imports
# Add missing imports to component's imports array
```

### TypeScript Errors
```bash
# Run type check
npx tsc --noEmit

# Common fix: Signal access without parentheses
# WRONG: this.workouts.length
# CORRECT: this.workouts().length
```

### API Not Working
```bash
# Check Edge Function logs
supabase functions logs deepgram-transcribe

# Check if API key is set
supabase secrets list
```

---

## START IMPLEMENTATION

Begin with Sprint 58 (Auth & Onboarding). Follow the sprint tasks in IMPLEMENTATION_SPRINTS_DETAILED.md.

After completing each sprint:
1. Run `npm run build` to verify
2. Test the implemented features
3. Update the sprint status
4. Move to the next sprint

Good luck! 🚀

---

*PROMPT END*
