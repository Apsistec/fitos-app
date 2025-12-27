# FitOS - AI-Powered Fitness Coaching Platform

> The personal trainer's personal trainer software

FitOS is an AI-powered fitness coaching platform built specifically for solo trainers, combining evidence-based behavior change techniques with modern AI capabilities to help trainers scale without losing the human touch.

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Mobile/Web | Ionic + Angular | Cross-platform, TypeScript, proven ecosystem |
| Backend/Database | Supabase + pgvector | PostgreSQL, vector embeddings for AI, predictable pricing |
| AI Orchestration | LangGraph (Python) | Stateful workflows, checkpointing, multi-agent |
| Voice STT | Deepgram Nova-3 | Sub-300ms latency, 6.84% WER |
| Voice TTS | Deepgram Aura-2 | Sub-200ms TTFB |
| Payments | Stripe | Agent Toolkit for autonomous billing |
| Wearables | Terra API | 99% market coverage, normalized schema |

## Monorepo Structure

```
fitos-app/
├── apps/
│   ├── mobile/          # Ionic Angular mobile app (iOS/Android/PWA)
│   ├── landing/         # Marketing landing page
│   └── ai-backend/      # LangGraph Python backend (Cloud Run)
├── libs/
│   └── shared/          # Shared TypeScript types, utilities
├── supabase/
│   └── migrations/      # Database migrations
└── docs/                # Documentation
```

## Phase 1 MVP Features (Months 1-3)

### Core Authentication & User Management
- [ ] Supabase Auth integration (email, Google, Apple)
- [ ] Trainer vs Client role distinction
- [ ] Trainer onboarding flow
- [ ] Client invitation system

### Workout Logging & Program Delivery
- [ ] Exercise database (seeded with common exercises)
- [ ] Workout builder for trainers
- [ ] Program templates (copy/duplicate across clients)
- [ ] One-tap workout logging for clients
- [ ] Set/rep/weight tracking
- [ ] Rest timer with notifications
- [ ] Workout history and progress charts

### Basic Nutrition Tracking
- [ ] USDA FoodData Central integration
- [ ] Manual food entry with macro breakdown
- [ ] Daily nutrition summary
- [ ] Adherence-neutral UI (no red/shame colors)

### Payment Integration
- [ ] Stripe Connect for trainer payouts
- [ ] Subscription management
- [ ] Invoice generation
- [ ] Payment status tracking

### Wearable Integration
- [ ] Terra API setup
- [ ] Garmin, Fitbit, Apple Health, Oura connections
- [ ] Resting heart rate display
- [ ] Sleep duration/quality metrics
- [ ] Step count tracking
- [ ] **No calorie burn display** (research shows inaccuracy)

### Client Management
- [ ] Client list with search/filter
- [ ] Client profile with goals, notes
- [ ] Progress photos (secure storage)
- [ ] Measurement tracking
- [ ] Communication log

## Phase 2 Features (Months 4-6)
- Multi-agent AI architecture (LangGraph)
- Churn prediction model
- Adherence-neutral nutrition algorithm
- Voice AI with Deepgram
- MCP tool integration

## Phase 3 Features (Months 7-9)
- Trainer methodology learning (RAG)
- Proactive JITAI interventions
- Photo nutrition logging (Passio AI)
- Advanced periodization automation

## Getting Started

### Prerequisites
- Node.js 20+
- pnpm or npm
- Supabase CLI
- Python 3.11+ (for AI backend)
- Poetry (Python package manager)

### Installation

```bash
# Clone the repo
git clone https://github.com/yourusername/fitos-app.git
cd fitos-app

# Install dependencies
npm install

# Start Supabase locally
supabase start

# Generate TypeScript types from database
npm run db:gen-types

# Start the mobile app
npm start
```

### Environment Variables

Create `.env` in the root:

```env
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Stripe
STRIPE_PUBLISHABLE_KEY=your_publishable_key
STRIPE_SECRET_KEY=your_secret_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret

# Terra API
TERRA_API_KEY=your_terra_key
TERRA_DEV_ID=your_dev_id

# Deepgram (Phase 2)
DEEPGRAM_API_KEY=your_deepgram_key
```

## Development

```bash
# Mobile app
npm start

# Landing page
npm run start:landing

# AI backend
npm run ai:dev

# Run tests
npm test

# Lint
npm run lint
```

## Database Migrations

```bash
# Create a new migration
supabase migration new <migration_name>

# Apply migrations
npm run db:migrate

# Reset database (caution: destroys data)
npm run db:reset
```

## Deployment

- **Mobile**: Capacitor builds for iOS/Android, PWA via Vercel/Netlify
- **Landing**: Vercel or Firebase Hosting
- **AI Backend**: Google Cloud Run
- **Database**: Supabase Cloud

## Research Foundation

Every major feature is grounded in peer-reviewed research:

- **Behavior Change**: Michie's BCT Taxonomy v1 - interventions need 3+ BCT clusters
- **Habit Formation**: 59-66 days median (not 21 days myth)
- **Wearable Accuracy**: Oura Gen 4 achieves CCC=0.99 for HRV
- **Gamification**: Hedge's g = 0.42 for physical activity (JMIR meta-analysis)
- **ACWR**: 0.80-1.30 range for lowest injury risk

## License

Proprietary - All rights reserved

## Contact

Doug White - [your email]
