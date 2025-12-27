# CLAUDE.md - FitOS Development Guide

## Project Overview

FitOS is an AI-powered fitness coaching platform for solo trainers. This monorepo contains:

- `apps/mobile` - Ionic Angular mobile app (iOS, Android, PWA)
- `apps/landing` - Marketing landing page (Angular)
- `apps/ai-backend` - LangGraph Python backend for AI agents
- `libs/shared` - Shared TypeScript types and utilities
- `supabase/` - Database migrations and configuration

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Ionic 8 + Angular 18 + TypeScript |
| Backend | Supabase (PostgreSQL + pgvector + Auth) |
| AI | LangGraph (Python) on Cloud Run |
| Payments | Stripe Connect |
| Wearables | Terra API |
| Voice (Phase 2) | Deepgram Nova-3 / Aura-2 |

## Key Commands

```bash
# Start mobile app
npm start

# Start landing page
npm run start:landing

# Start Supabase locally
npm run db:start

# Run migrations
npm run db:migrate

# Generate TypeScript types from database
npm run db:gen-types

# Start AI backend (Phase 2)
npm run ai:dev
```

## Database

- PostgreSQL 15 with pgvector extension
- Row Level Security (RLS) enabled on all tables
- Use `supabase/migrations/` for schema changes
- Always generate types after migration: `npm run db:gen-types`

## Code Style

- Strict TypeScript (`strict: true`)
- Angular standalone components preferred
- Ionic components for UI
- Tailwind CSS for custom styling
- Follow Angular style guide

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
│   │   └── settings/
│   ├── shared/         # Shared components, pipes
│   └── app.routes.ts
├── environments/
└── theme/
```

## Important Patterns

### Supabase Client
```typescript
import { createClient } from '@supabase/supabase-js';
import { Database } from '@fitos/shared';

const supabase = createClient<Database>(
  environment.supabaseUrl,
  environment.supabaseAnonKey
);
```

### RLS Policies
All data access is controlled by RLS. Key patterns:
- Clients can only see their own data
- Trainers can see their clients' data
- System exercises are public; custom exercises are private

### Adherence-Neutral Design
**IMPORTANT:** Never use red colors for "over target" in nutrition.
Use neutral colors. See `libs/shared/src/lib/constants.ts` for color palette.

### Wearable Data
**IMPORTANT:** Never display calorie burn from wearables.
Research shows it's inaccurate. Only display:
- Resting heart rate
- HRV
- Sleep duration/quality
- Steps

## Phase 1 Scope

Focus on these features (see `docs/PHASE1_BACKLOG.md`):
1. Authentication (Supabase Auth)
2. Exercise library
3. Workout builder (trainer)
4. Workout logging (client)
5. Basic nutrition tracking
6. Stripe payments
7. Terra wearable integration
8. Client management

## DO NOT Implement Yet (Phase 2+)

- Voice logging (Deepgram)
- AI coaching conversations
- Churn prediction
- Photo nutrition logging
- Proactive JITAI interventions
- Trainer methodology learning

## Testing

```bash
# Unit tests
npm test

# E2E tests
npm run e2e
```

## Deployment

- **Mobile**: Capacitor builds → App Store / Play Store
- **PWA**: Vercel or Firebase Hosting
- **Landing**: Vercel or Firebase Hosting
- **AI Backend**: Google Cloud Run
- **Database**: Supabase Cloud

## Environment Variables

Copy `.env.example` to `.env` and fill in:
- Supabase credentials
- Stripe keys
- Terra API keys
- OAuth provider credentials

## Research References

Key research informing design decisions:

1. **Behavior Change**: Michie's BCT Taxonomy v1 - need 3+ BCT clusters
2. **Habit Formation**: 59-66 days median (not 21 days)
3. **ACWR**: 0.80-1.30 range for lowest injury risk
4. **Wearable Accuracy**: Oura HRV CCC=0.99, but NO wearable is accurate for calories
5. **Gamification**: Hedge's g=0.42 initially, declines over time

See the strategy document for full citations.
