# FitOS Claude Code Development Prompt

**Version:** 3.0  
**Date:** January 2026  
**Current Sprint:** 16 (Polish & Launch Prep)  
**Next Phase:** Phase 3A (Sprints 17-20)

---

## Context

You are working on FitOS, an AI-powered fitness coaching platform for solo trainers. The project uses:
- **Frontend:** Angular 21 + Ionic 8 + Capacitor 8 (TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **AI Backend:** LangGraph Python on Cloud Run
- **Key APIs:** Deepgram (voice), Passio AI (food recognition), Terra (wearables), Stripe (payments)

**Critical Design Principles:**
1. **Dark-first design** - Default to dark mode for gym environments
2. **Adherence-neutral** - NEVER use red for nutrition "over target" (use purple instead)
3. **<10 second logging** - Minimize friction for all data entry
4. **Glanceable** - Key info visible in <2 seconds

---

## Current Status

### Completed (Phases 1-2)
- ✅ User authentication, roles, onboarding
- ✅ Exercise library, workout builder, templates
- ✅ Workout logging with voice commands (Deepgram)
- ✅ Nutrition tracking with voice + photo AI
- ✅ Client management, messaging
- ✅ CRM with lead pipeline, email marketing
- ✅ AI coaching chatbot (LangGraph multi-agent)
- ✅ JITAI proactive interventions
- ✅ Wearable integration (Health Connect, HealthKit, Terra)
- ✅ Apple Watch companion app
- ✅ Stripe Connect payments

### Sprint 16 Tasks (Current)

Complete all remaining Polish & Launch Prep tasks:

1. **Performance Optimization (Epic 16.1)**
   - Run Lighthouse audit, target 90+ performance score
   - Analyze and reduce bundle size (target <2MB initial)
   - Implement WebP images with lazy loading
   - Profile and fix any UI jank (60fps target)

2. **Accessibility (Epic 16.2)**
   - Run automated a11y audit (Axe, Lighthouse)
   - Test with VoiceOver (iOS) and TalkBack (Android)
   - Fix all WCAG 2.1 AA violations
   - Ensure 44px minimum touch targets

3. **Celebration Animations (Epic 16.3)**
   - Add confetti animation on workout completion
   - Create personal record celebration (new PR)
   - Implement streak milestone celebrations (7, 30, 100 days)

4. **App Store Preparation (Epic 16.4)**
   - Create screenshots for all device sizes
   - Write App Store description and keywords
   - Update privacy policy
   - Configure TestFlight beta distribution

---

## Implementation Instructions

### Step 1: Performance Optimization

```bash
# Analyze current bundle
cd apps/mobile
npm run build -- --stats-json
npx webpack-bundle-analyzer dist/apps/mobile/stats.json
```

**Files to check:**
- `apps/mobile/src/main.ts` - Ensure zone.js optimization for zoneless
- `apps/mobile/src/app/app.routes.ts` - All routes must use `loadComponent`
- Check for any eager imports that should be lazy

**Performance fixes to implement:**
```typescript
// app.routes.ts - Ensure lazy loading
export const routes: Routes = [
  {
    path: 'tabs',
    loadComponent: () => import('./features/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      // ... all routes should use loadComponent
    ]
  }
];
```

### Step 2: Accessibility Audit

Run automated audit:
```bash
npm install -g lighthouse
lighthouse http://localhost:4200 --view --preset=desktop
```

**Common fixes needed:**
```html
<!-- Add aria-labels to icon buttons -->
<ion-button fill="clear" aria-label="Open settings">
  <ion-icon name="settings-outline" slot="icon-only"></ion-icon>
</ion-button>

<!-- Ensure form controls have labels -->
<ion-item>
  <ion-label position="stacked">Email Address</ion-label>
  <ion-input type="email" autocomplete="email"></ion-input>
</ion-item>

<!-- Add skip link for keyboard navigation -->
<a href="#main-content" class="skip-link">Skip to main content</a>
```

**Add to `global.scss`:**
```scss
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  padding: 8px;
  background: var(--ion-color-primary);
  color: white;
  z-index: 100;
  
  &:focus {
    top: 0;
  }
}
```

### Step 3: Celebration Animations

**Install canvas-confetti:**
```bash
npm install canvas-confetti
npm install -D @types/canvas-confetti
```

**Create celebration service:**

File: `apps/mobile/src/app/core/services/celebration.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import confetti from 'canvas-confetti';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';

@Injectable({ providedIn: 'root' })
export class CelebrationService {

  async workoutComplete(): Promise<void> {
    await this.haptic(ImpactStyle.Heavy);
    
    // Main burst
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10B981', '#8B5CF6', '#F59E0B'], // FitOS brand colors
      disableForReducedMotion: true
    });
  }

  async personalRecord(): Promise<void> {
    await this.haptic(ImpactStyle.Heavy);
    
    // Gold confetti for PR
    const duration = 2000;
    const end = Date.now() + duration;
    
    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
        disableForReducedMotion: true
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#FFD700', '#FFA500', '#FF8C00'],
        disableForReducedMotion: true
      });
      
      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    
    frame();
  }

  async streakMilestone(days: number): Promise<void> {
    await this.haptic(ImpactStyle.Medium);
    
    // Scale intensity based on milestone
    const particleCount = days >= 100 ? 200 : days >= 30 ? 150 : 100;
    
    confetti({
      particleCount,
      spread: 100,
      origin: { y: 0.5 },
      colors: ['#10B981', '#8B5CF6', '#3B82F6'],
      shapes: ['star', 'circle'],
      disableForReducedMotion: true
    });
  }

  private async haptic(style: ImpactStyle): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Haptics.impact({ style });
    }
  }
}
```

**Integrate into workout completion:**

File: `apps/mobile/src/app/features/workouts/pages/active-workout/active-workout.page.ts`

```typescript
import { CelebrationService } from '@core/services/celebration.service';

// In component class
private celebration = inject(CelebrationService);

async completeWorkout(): Promise<void> {
  // ... existing completion logic
  
  // Check for personal records
  const prsAchieved = this.checkForPersonalRecords();
  
  if (prsAchieved.length > 0) {
    await this.celebration.personalRecord();
  } else {
    await this.celebration.workoutComplete();
  }
  
  // Check streak milestones
  const currentStreak = await this.getStreak();
  if ([7, 30, 100, 365].includes(currentStreak)) {
    await this.celebration.streakMilestone(currentStreak);
  }
}
```

### Step 4: App Store Preparation

**Screenshot automation script:**

File: `scripts/generate-screenshots.ts`

```typescript
// Use Puppeteer to capture screenshots at different sizes
import puppeteer from 'puppeteer';

const DEVICE_SIZES = {
  'iphone-6.7': { width: 1290, height: 2796 },
  'iphone-6.5': { width: 1242, height: 2688 },
  'iphone-5.5': { width: 1242, height: 2208 },
  'ipad-12.9': { width: 2048, height: 2732 }
};

const SCREENS = [
  { path: '/tabs/dashboard', name: '01-dashboard' },
  { path: '/tabs/workouts/active/demo', name: '02-active-workout' },
  { path: '/tabs/nutrition', name: '03-nutrition' },
  { path: '/tabs/coaching', name: '04-ai-coach' },
  { path: '/tabs/crm', name: '05-crm-pipeline' },
  { path: '/tabs/clients/demo/progress', name: '06-progress-charts' }
];

// Implementation would capture each screen at each size
```

**App Store metadata:**

File: `docs/APP_STORE_METADATA.md`

```markdown
## iOS App Store

**Name:** FitOS - AI Fitness Coaching
**Subtitle:** Voice-Powered Workout & Nutrition

**Description:**
FitOS is the AI-powered fitness coaching platform built for modern trainers. Log workouts with your voice, track nutrition with a photo, and keep clients engaged with intelligent coaching.

KEY FEATURES:

🎙️ Voice Workout Logging
Say "10 reps at 185" and move on. No fumbling with your phone between sets.

📸 Photo Nutrition Tracking  
Snap a picture of your meal. AI identifies foods and logs macros automatically.

🤖 AI Coaching Assistant
24/7 intelligent coaching that sounds like YOU, not a generic chatbot.

📊 Built-in CRM
Track leads, send automated emails, and grow your business—all in one app.

⌚ Apple Watch Support
Log workouts from your wrist. See today's program at a glance.

🌙 Dark Mode Default
Designed for the gym floor. Easy on your eyes, easy on your battery.

DESIGNED FOR TRAINERS:
- Workout builder with templates
- Client management and messaging
- Progress tracking and charts
- Stripe payments built-in
- No external tools required

**Keywords:** fitness,workout,trainer,nutrition,AI,voice,tracking,coaching,gym,personal training

**Category:** Health & Fitness
**Age Rating:** 4+
```

---

## Phase 3A Preview (Post-Launch)

### Sprint 17: Coach Brain AI

**New service needed:**
```typescript
// apps/mobile/src/app/core/services/coach-brain.service.ts
@Injectable({ providedIn: 'root' })
export class CoachBrainService {
  private supabase = inject(SupabaseService);
  private http = inject(HttpClient);
  
  async getTrainerMethodology(trainerId: string): Promise<TrainerMethodology> {
    // Fetch trainer's saved methodology
  }
  
  async generateResponse(
    trainerId: string, 
    clientQuery: string,
    context: CoachingContext
  ): Promise<string> {
    // Generate trainer-voiced response using RAG
  }
  
  async trainOnHistoricalData(trainerId: string): Promise<void> {
    // Analyze past programs and messages to learn voice
  }
}
```

### Sprint 19: Adaptive Streaks

**Database migration:**
```sql
-- Update client_profiles with streak configuration
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS streak_config JSONB DEFAULT '{
  "type": "weekly",
  "min_days_per_week": 3,
  "grace_days_per_month": 4,
  "repair_enabled": true,
  "repair_options": {
    "bonus_workout": true,
    "extended_session": true
  }
}'::jsonb;

-- Create streak history table
CREATE TABLE streak_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  days_completed INTEGER NOT NULL DEFAULT 0,
  grace_days_used INTEGER NOT NULL DEFAULT 0,
  repairs_used INTEGER NOT NULL DEFAULT 0,
  status TEXT CHECK (status IN ('achieved', 'partial', 'repaired', 'missed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_streak_history_user ON streak_history(user_id, week_start DESC);
```

---

## Critical Reminders

### Angular 21 Patterns (Required)

```typescript
// Use signals for state
count = signal(0);
doubled = computed(() => this.count() * 2);

// Use new control flow
@if (isLoading()) {
  <app-skeleton />
} @else {
  <app-content [data]="data()" />
}

@for (item of items(); track item.id) {
  <app-item [data]="item" />
}

// Standalone components only
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule]
})
```

### Adherence-Neutral (NEVER VIOLATE)

```scss
// ❌ WRONG - Never use red/danger for nutrition
.over-target { color: var(--ion-color-danger); }

// ✅ CORRECT - Use purple for over-target
.over-target { color: var(--fitos-nutrition-over); } // #8B5CF6
```

### Performance (Required)

```typescript
// OnPush on ALL components
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})

// trackBy on ALL *ngFor / @for
@for (item of items(); track item.id) { }

// Virtual scrolling for lists >50 items
<cdk-virtual-scroll-viewport itemSize="60">
  @for (item of items(); track item.id) { }
</cdk-virtual-scroll-viewport>
```

---

## File Structure

```
apps/mobile/src/app/
├── core/
│   ├── guards/              # Auth, role guards
│   ├── interceptors/        # HTTP interceptors
│   └── services/            # All services
├── features/
│   ├── auth/                # Login, register, onboarding
│   ├── clients/             # Client management
│   ├── coaching/            # AI chat
│   ├── crm/                 # Leads, email campaigns
│   ├── dashboard/           # Role-based dashboards
│   ├── messages/            # In-app messaging
│   ├── nutrition/           # Voice, photo, manual logging
│   ├── settings/            # Profile, wearables, theme
│   └── workouts/            # Builder, library, active
├── shared/
│   ├── components/          # Reusable components
│   ├── animations/          # Animation triggers
│   └── utils/               # Helper functions
└── app.routes.ts
```

---

## Commands

```bash
npm start              # Start dev server
npm run build          # Production build
npm test               # Run tests
npm run lint           # Lint code
npm run db:migrate     # Run Supabase migrations
npm run db:gen-types   # Generate TypeScript types
```

---

## Success Criteria for Sprint 16

- [ ] Lighthouse Performance: 90+
- [ ] Lighthouse Accessibility: 100
- [ ] Bundle size: <2MB initial load
- [ ] All celebration animations working
- [ ] App Store screenshots captured
- [ ] TestFlight build submitted
- [ ] Play Store listing complete
- [ ] Privacy policy updated

After completing Sprint 16, the app will be ready for beta testing and soft launch.
