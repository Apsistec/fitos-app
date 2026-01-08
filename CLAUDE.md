# CLAUDE.md - FitOS Development Guide

## Project Overview

FitOS is an AI-powered fitness coaching platform for solo trainers. Monorepo structure:

- `apps/mobile` - Ionic Angular mobile app (iOS, Android, PWA)
- `apps/landing` - Marketing landing page (Angular SSR)
- `apps/ai-backend` - LangGraph Python backend for AI agents
- `libs/shared` - Shared TypeScript types and utilities
- `supabase/` - Database migrations and Edge Functions

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Ionic 8.7 + Angular 20 + TypeScript 5.8 |
| Native | Capacitor 8 |
| Backend | Supabase (PostgreSQL + pgvector + Auth) |
| AI | LangGraph (Python) on Cloud Run |
| Voice AI | Deepgram Nova-3/Aura-2 |
| Payments | Stripe Connect |
| Wearables | Terra API |

## Version Requirements

- **Node.js**: >=20.11.0
- **npm**: >=10.0.0
- **Angular**: 20.x
- **Ionic**: 8.7.x
- **Capacitor**: 8.x

## Key Commands

```bash
npm start              # Start mobile app
npm run start:landing  # Start landing page
npm run db:start       # Start Supabase locally
npm run db:migrate     # Run migrations
npm run db:gen-types   # Generate TypeScript types
npm run lint           # Lint code
npm test               # Unit tests
```

---

## Design Philosophy

**Read First:** `docs/DESIGN_SYSTEM.md`

### Core Principles
1. **Dark-First** - Default to dark mode for gym environments
2. **Adherence-Neutral** - Never use red for nutrition "over target"
3. **<10 Second Logging** - Minimize friction for all data entry
4. **Glanceable** - Key info visible in <2 seconds

### Color System (Dark Mode Default)
```scss
--fitos-bg-primary: #0D0D0D;        // Not pure black
--fitos-accent-primary: #10B981;    // Energetic teal
--fitos-nutrition-over: #8B5CF6;    // Purple, NOT red
```

---

## Documentation Index

| Document | Purpose |
|----------|---------|
| `docs/DESIGN_SYSTEM.md` | Colors, typography, spacing, components |
| `docs/THEMING.md` | Dark/light mode implementation |
| `docs/UX_PATTERNS.md` | Friction reduction, navigation patterns |
| `docs/COMPETITIVE_ANALYSIS.md` | Market research, feature gaps |
| `docs/PHASE1_BACKLOG.md` | MVP features (Sprints 0-8) |
| `docs/PHASE2_BACKLOG.md` | AI/CRM features (Sprints 7-16) |
| `docs/AI_INTEGRATION.md` | Voice, photo, coaching architecture |
| `docs/CRM_MARKETING.md` | Lead pipeline, email automation |
| `docs/USER_ROLES_ARCHITECTURE.md` | RBAC, dashboards by role |
| `docs/SETTINGS_PROFILE_UX.md` | Settings page design standards |
| `docs/OFFLINE_SYNC.md` | Offline-first patterns |

---

## Angular 20 Patterns

### Signals (Required)
```typescript
import { signal, computed, effect } from '@angular/core';

const count = signal(0);
const doubled = computed(() => count() * 2);
```

### Control Flow (Required)
```html
@if (isLoading()) {
  <app-skeleton />
} @else {
  <app-content />
}

@for (item of items(); track item.id) {
  <app-item [data]="item" />
}
```

### Standalone Components (Default)
```typescript
@Component({
  standalone: true,
  imports: [CommonModule, IonicModule],
  // ...
})
```

---

## Critical Rules

### Adherence-Neutral Nutrition
**NEVER use red/danger colors for nutrition "over target".**
```scss
// ❌ WRONG
.over-target { color: var(--ion-color-danger); }

// ✅ CORRECT  
.over-target { color: var(--fitos-nutrition-over); } // Purple
```

### Wearable Data Display
**NEVER display calorie burn from wearables** (research shows inaccuracy).

Only display:
- Resting heart rate
- HRV
- Sleep duration/quality
- Steps

### Performance Requirements
- OnPush change detection on all components
- Virtual scrolling for lists >50 items
- Lazy load all feature modules
- trackBy on all *ngFor
- Only animate transform/opacity

---

## File Structure

```
apps/mobile/src/
├── app/
│   ├── core/           # Services, guards, interceptors
│   ├── features/       # Feature modules
│   │   ├── auth/
│   │   ├── workouts/
│   │   ├── nutrition/
│   │   ├── clients/
│   │   ├── dashboard/
│   │   ├── messages/
│   │   └── settings/
│   ├── shared/         # Shared components, pipes
│   └── app.routes.ts
├── theme/              # variables.scss, design tokens
└── environments/
```

---

## Phase Overview

### Phase 1: MVP (Complete)
- Auth, roles, onboarding
- Exercise library, workout builder
- Workout logging, nutrition tracking
- Stripe payments, wearable integration
- Messaging

### Phase 2: Differentiation (In Progress)
- Sprint 7: Dark mode redesign
- Sprint 8-9: Voice logging (Deepgram)
- Sprint 10: Photo nutrition AI
- Sprint 11-12: CRM & email marketing
- Sprint 13-14: AI coaching + JITAI
- Sprint 15: Apple Watch
- Sprint 16: Polish

---

## AI Feature Architecture

**Read:** `docs/AI_INTEGRATION.md`

### Voice Logging (Deepgram)
```typescript
// Commands supported:
"10 reps at 185"    // Log set
"repeat"            // Duplicate last
"skip"              // Skip exercise
"two eggs and toast" // Log food
```

### Photo Nutrition
- Transparent breakdown (not opaque single entry)
- User can edit each identified food
- Falls back to manual for low confidence

### AI Coaching
- Multi-agent architecture (workout, nutrition, recovery, motivation)
- Trainer methodology learning
- JITAI proactive interventions

---

## CRM Architecture

**Read:** `docs/CRM_MARKETING.md`

### Lead Pipeline
```
New → Contacted → Qualified → Consultation → Won/Lost
```

### Built-in Email Marketing
- Template editor
- Automated sequences
- Open/click tracking
- No external tools required

---

## Testing

```bash
npm test         # Unit tests
npm run e2e      # E2E tests
npm run lint     # ESLint
```

Coverage target: >80% for services.

---

## Environment Variables

Required in `.env`:
```
SUPABASE_URL=
SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TERRA_API_KEY=
TERRA_DEV_ID=
DEEPGRAM_API_KEY=
```

---

## Quick Reference

### Contrast Requirements
- Body text: 7:1+ ratio
- Large text: 4.5:1+ ratio
- Metrics in gym: 15:1+ ratio

### Touch Targets
- Minimum: 44×44px
- Standard buttons: 48px height

### Animation Timing
- Fast feedback: 150ms
- Normal transitions: 250ms
- Page transitions: 350ms
