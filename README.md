# FitOS

**The Personal Trainer's Personal Trainer Software**

AI-powered fitness coaching platform for solo trainers. Unlimited clients, one price.

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Frontend | Ionic + Angular | 8.7 / 20 |
| Native | Capacitor | 8 |
| Backend | Supabase (PostgreSQL + pgvector) | - |
| AI | LangGraph (Python) | - |
| Payments | Stripe Connect | - |
| Wearables | Terra API | - |

## Requirements

- **Node.js**: >=20.11.0
- **npm**: >=10.0.0
- **Docker**: For local Supabase development
- **Xcode** (macOS): For iOS development
- **Android Studio**: For Android development

## Monorepo Structure

```
fitos-app/
├── apps/
│   ├── mobile/          # Ionic Angular mobile app (iOS/Android/PWA)
│   ├── landing/         # Marketing website (Angular SSR)
│   └── ai-backend/      # LangGraph Python backend
├── libs/
│   └── shared/          # Shared TypeScript types and utilities
├── supabase/
│   ├── migrations/      # Database migrations
│   └── config.toml      # Local Supabase config
└── docs/                # Documentation and backlog
```

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/yourusername/fitos-app.git
cd fitos-app
npm install
```

### 2. Setup Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Start Supabase (requires Docker)

```bash
npm run db:start
npm run db:migrate
npm run db:gen-types
```

### 4. Start Development Server

```bash
# Mobile app
npm start

# Landing page
npm run start:landing
```

## Key Features

### Phase 1 (MVP)
- ✅ Authentication (Email, Google, Apple)
- ✅ Exercise library with 200+ exercises
- ✅ Workout builder for trainers
- ✅ Workout logging for clients
- ✅ Adherence-neutral nutrition tracking
- ✅ Stripe payment integration
- ✅ Wearable sync (Garmin, Fitbit, Oura, etc.)
- ✅ Client management dashboard

### Phase 2 (Coming Soon)
- 🔜 AI coaching conversations
- 🔜 Voice workout logging
- 🔜 Photo nutrition logging
- 🔜 Churn prediction

### Phase 3 (Future)
- 📋 Multi-trainer/gym support
- 📋 White-label options
- 📋 Advanced analytics

## Research Foundation

Built on evidence-based behavior change principles:
- Michie's BCT Taxonomy v1
- ACWR injury prevention (0.8-1.3 safe zone)
- HRV-based recovery recommendations
- 66-day habit formation research

## License

Private - All rights reserved.
