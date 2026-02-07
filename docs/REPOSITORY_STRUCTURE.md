# FitOS Repository Structure Guide

**Last Updated:** January 23, 2026
**Purpose:** Prevent structural confusion and ensure consistent organization

---

## Repository Overview

FitOS uses an **Nx monorepo** architecture with Angular, Ionic, Capacitor for the frontend and Python/FastAPI for the AI backend.

```
fitos-app/
├── apps/               # Applications
├── libs/               # Shared libraries
├── docs/               # Documentation
├── supabase/           # Database & functions
├── scripts/            # Repository setup scripts
└── [config files]      # Root configuration
```

---

## Apps Directory (`apps/`)

### `apps/mobile/` - Ionic Angular Mobile App

**Tech Stack:** Angular 21.1.1, Ionic 8.7.17, Capacitor 8.0.1

**Structure:**
```
apps/mobile/
├── src/
│   ├── app/
│   │   ├── core/           # Services, guards, interceptors
│   │   ├── features/       # Feature modules (auth, workouts, nutrition, etc.)
│   │   └── shared/         # Shared components, pipes, directives
│   ├── theme/              # SCSS variables, design tokens
│   ├── environments/       # Environment configs
│   └── index.html
├── capacitor.config.ts     # Capacitor native configuration
├── project.json            # Nx project configuration
└── package.json            # Mobile-specific dependencies
```

**Build Output:** `dist/apps/mobile/browser/`
**Capacitor webDir:** Points to `../../dist/apps/mobile/browser`

**Important:**
- Uses standalone components (no NgModule)
- Signals for state management
- OnPush change detection
- Dark mode by default

---

### `apps/landing/` - Marketing Landing Page

**Tech Stack:** Angular 21.1.1 with SSR (Server-Side Rendering)

**Structure:**
```
apps/landing/
├── src/
│   ├── app/
│   ├── assets/
│   └── styles.scss
├── server.ts               # SSR entry point
├── project.json
└── (no package.json - uses root)
```

**Build Output:** `dist/apps/landing/`

**Nx Commands:**
```bash
npm run start:landing    # Dev server (port 4201)
npm run build:landing    # Production build with SSR
```

---

### `apps/ai-backend/` - Python AI Backend

**Tech Stack:** Python 3.11+, FastAPI, LangGraph, Anthropic Claude

**Structure:**
```
apps/ai-backend/
├── app/                    # Python application code (NOT apps/)
│   ├── agents/            # LangGraph AI agents
│   ├── routes/            # FastAPI endpoints
│   ├── core/              # Config, auth, database
│   ├── integrations/      # Terra API, Deepgram, Stripe
│   └── [feature modules]  # Nutrition, recovery, chronotype, etc.
├── tests/                 # pytest tests
├── scripts/               # Python setup scripts
├── main.py                # FastAPI entry point
├── pyproject.toml         # Poetry dependencies
└── Dockerfile             # Cloud Run deployment
```

**IMPORTANT:**
- Main code is in `app/` folder (singular), NOT `apps/` (plural)
- Uses the root `.env` file (loaded via `app/core/config.py`)
- Scripts are Python-specific (setup.sh, run-tests.sh)

**Nx Commands:**
```bash
npm run ai:dev    # Start FastAPI with hot reload
```

---

## Libs Directory (`libs/`)

### `libs/shared/` - Shared TypeScript Types & Utilities

**Import alias:** `@fitos/shared`

**Structure:**
```
libs/shared/
├── src/
│   ├── lib/
│   │   ├── types.ts           # ALL domain types (Single Source of Truth!)
│   │   ├── constants.ts       # Shared constants
│   │   ├── utils.ts           # Utility functions
│   │   └── database.types.ts  # Supabase generated types
│   └── index.ts
└── project.json
```

**Critical Rule:** ALL domain types MUST be defined here. See `TYPE_SYSTEM_GUIDELINES.md`.

**Usage:**
```typescript
import type { Profile, Lead, EmailTemplate } from '@fitos/shared';
import { ROLES, NUTRITION_TARGETS } from '@fitos/shared';
```

---

### `libs/src/` (aka `@fitos/libs` or `shared-content`)

**Import alias:** `@fitos/libs` or `shared-content`

**Structure:**
```
libs/src/
├── lib/
│   ├── components/        # Shared UI components
│   ├── legal/             # Legal documents (privacy, terms, cookies)
│   └── help/              # ✅ Help system content (FAQs, guides, feature docs)
│       ├── faq-data.ts           # 58 comprehensive FAQs
│       ├── feature-docs-data.ts  # Feature documentation
│       ├── guides-data.ts        # Getting started guides
│       ├── help.models.ts        # Type definitions
│       └── index.ts              # Barrel exports
└── index.ts
```

**Purpose:** Shared Angular components, legal documents, and help content used across apps.

**Help System:** Unified help content shared between landing page and mobile app. Both platforms access the same 58 FAQs, feature guides, and getting started documentation for consistency.

**Note:** Different from `libs/shared` - this contains UI components and content while `libs/shared` contains types/utils.

---

## Docs Directory (`docs/`)

**All documentation lives here**, not in root (except CLAUDE.md and README.md).

**Active docs (reference material used during development):**

- `DESIGN_SYSTEM.md` - Colors, typography, spacing
- `THEMING.md` - Dark/light mode implementation
- `UX_PATTERNS.md` - Friction reduction, navigation
- `TYPE_SYSTEM_GUIDELINES.md` - Type organization rules
- `AI_INTEGRATION.md` - Voice, photo AI, coaching
- `CRM_MARKETING.md` - Lead pipeline, email automation
- `HIPAA_COMPLIANCE.md` - PHI handling, consent management
- `OFFLINE_SYNC.md` - Offline-first patterns
- `SETTINGS_PROFILE_UX.md` - Settings page standards
- `USER_ROLES_ARCHITECTURE.md` - RBAC, dashboards by role
- `COMPETITIVE_ANALYSIS.md` - Market research, feature gaps
- `PHASE1_BACKLOG.md` / `PHASE2_BACKLOG.md` - MVP & AI feature backlogs
- `STRIPE_CONNECT_IMPLEMENTATION.md` - Payments architecture
- `WEARABLE_INTEGRATION.md` - Terra API integration
- `SUPABASE_OAUTH_SETUP.md` - Auth provider configuration
- `REQUIRED_EXTERNAL_APIS.md` - API key setup guide
- `LAUNCH_CHECKLIST.md` - Pre-launch tasks
- `QUICK_START.md` - Getting started for developers

**Archived docs:** `docs/archive/` contains historical sprint summaries, deployment logs, troubleshooting notes, and planning documents.

---

## Configuration Files (Root)

### Package Management

**`package.json` (root)**
- Workspace dependencies
- All Angular, Ionic, Capacitor, Nx packages
- npm scripts for the entire monorepo
- npm overrides for security fixes

**`apps/mobile/package.json`**
- Mobile app-specific dependencies
- Identical Angular versions to root
- Same npm overrides as root

**Why two package.json files?**
- Nx workspace pattern
- Mobile app can have specific dependencies for Capacitor plugins
- Both must have same Angular/Ionic/Capacitor versions

---

### TypeScript Configuration

**`tsconfig.base.json` (root)**
- Path mappings for all libs
- Shared compiler options
- ES2022 target

**Key path mappings:**
```json
{
  "paths": {
    "@env/*": ["apps/mobile/src/environments/*"],
    "@fitos/shared": ["libs/shared/src/index.ts"],
    "@fitos/shared/*": ["libs/shared/src/lib/*"],
    "@fitos/libs": ["libs/src/index.ts"],
    "shared-content": ["libs/src/index.ts"]
  }
}
```

---

### Nx Configuration

**`nx.json`**
- Nx workspace settings
- Target defaults (build, test, lint)
- Angular plugin configuration
- Cache settings

**NOT `angular.json`** - Nx monorepos don't use angular.json

**Per-app configs:** Each app has `project.json` instead

---

### Environment Variables

**Single root `.env`** — All apps read from this one file.
- Supabase keys (URL, anon key, service role key)
- Stripe keys (publishable, secret, webhook secrets)
- Terra API keys (wearables)
- AI provider keys (Anthropic, OpenAI, Deepgram)
- Nutrition API keys (USDA, Nutritionix, Passio)
- OAuth provider keys (Google, Apple)
- AI backend configuration (LLM provider, model, tokens)
- Application settings (ports, CORS, log level)

**Important:**
- **ONE `.env` file** at root — no separate per-app .env files
- **NO `.env.example` files** — the `.env` itself has inline comments
- Never commit `.env` files (in .gitignore)

---

### VS Code Configuration

**`.vscode/` (root)**
- Workspace-wide VS Code settings
- Extensions recommendations
- TypeScript import preferences

**Why in root?**
- Shared across all apps and libs
- Consistent developer experience
- Single source of truth for IDE config

**Previous issue:** Was in `apps/mobile/.vscode`, moved to root for consistency.

---

## Build Outputs & Cache

### Angular Build Output

```
dist/
├── apps/
│   ├── mobile/
│   │   └── browser/        # Mobile app production build
│   └── landing/            # Landing page SSR build
```

**Important:**
- Capacitor now points to `dist/apps/mobile/browser` (not `www`)
- `www/` folder is obsolete and should be in .gitignore

---

### Angular Cache

```
.angular/
└── cache/                  # Build cache (shared for workspace)
```

**Note:** Both root and `apps/mobile/` have `.angular/cache` folders. This is normal - each can have its own cache.

---

### Node Modules

```
node_modules/               # Root only (Nx workspace)
```

**Important:**
- Only ONE `node_modules` at root
- NO `node_modules` in individual apps
- Nx uses workspace hoisting

**Previous confusion:** User expected `node_modules` in `apps/landing` - this is incorrect for Nx.

---

## Scripts

### Root `scripts/`

**Purpose:** Repository-level setup

```
scripts/
├── github-setup.sh         # Initialize GitHub repo
└── seed-exercises.sql      # Seed database with exercises
```

---

### AI Backend `apps/ai-backend/scripts/`

**Purpose:** Python environment setup

```
apps/ai-backend/scripts/
├── setup.sh                # Install Poetry, dependencies
└── run-tests.sh            # Run pytest suite
```

**Important:** These are separate because they're Python-specific, not TypeScript.

---

## Supabase

```
supabase/
├── migrations/             # Database schema migrations
├── functions/              # Edge Functions (Deno)
├── seed.sql                # Initial data
└── config.toml             # Local Supabase config
```

**Commands:**
```bash
npm run db:start      # Start local Supabase
npm run db:migrate    # Apply migrations
npm run db:gen-types  # Generate TypeScript types
```

---

## Common Mistakes & Prevention

### ❌ WRONG: Creating `.env.example`
```bash
# Don't do this:
touch .env.example
```

**✅ CORRECT:** Use commented `.env`:
```bash
# .env
SUPABASE_URL=your-url-here  # Get from Supabase dashboard
SUPABASE_ANON_KEY=xxx       # Public anon key
```

---

### ❌ WRONG: Putting docs in root
```bash
# Don't do this:
touch BUILD_GUIDE.md
touch DEPLOYMENT.md
```

**✅ CORRECT:** All docs go in `docs/`:
```bash
touch docs/BUILD_GUIDE.md
touch docs/DEPLOYMENT.md
```

**Exception:** Only `CLAUDE.md` and `README.md` stay in root.

---

### ❌ WRONG: Creating types in services
```typescript
// apps/mobile/src/app/core/services/lead.service.ts
export interface Lead {  // ❌ Duplicate type!
  id: string;
}
```

**✅ CORRECT:** Import from shared:
```typescript
import type { Lead } from '@fitos/shared';
```

---

### ❌ WRONG: Using `apps/` folder in Python backend
```python
# Don't create:
from apps.mobile.something import x
```

**✅ CORRECT:** Use `app/` folder:
```python
from app.routes.coach import router
```

---

### ❌ WRONG: Expecting `node_modules` in each app
```
apps/mobile/node_modules/     # ❌ Shouldn't exist
apps/landing/node_modules/    # ❌ Shouldn't exist
```

**✅ CORRECT:** Single `node_modules` at root:
```
node_modules/                 # ✅ Workspace-level
```

---

## Quick Reference

### Starting Development

```bash
# Mobile app
npm start                   # http://localhost:4200

# Landing page
npm run start:landing       # http://localhost:4201

# AI backend
npm run ai:dev              # http://localhost:8000
```

---

### Building for Production

```bash
# Build mobile app
npm run build               # → dist/apps/mobile/browser/

# Build landing page
npm run build:landing       # → dist/apps/landing/

# Build iOS/Android (after building mobile)
cd apps/mobile
npx cap sync ios
npx cap open ios
```

---

### Running Tests

```bash
# TypeScript tests
npm test

# Python tests
cd apps/ai-backend
poetry run pytest
```

---

## Nx Project Names

| Directory | Nx Project Name | Import Alias |
|-----------|----------------|--------------|
| `apps/mobile` | `fitos-mobile` | N/A |
| `apps/landing` | `fitos-landing` | N/A |
| `libs/shared` | `shared` | `@fitos/shared` |
| `libs/src` | `shared-content` | `@fitos/libs` |

**Usage:**
```bash
nx serve fitos-mobile
nx build fitos-landing
nx test shared
```

---

## Migration History

### January 23, 2026 - Repository Consolidation

**Changes Made:**
1. ✅ Moved deployment docs from root → `docs/`
2. ✅ Removed `.env.example` files (redundant)
3. ✅ Removed `apps/ai-backend/apps/` folder (unused)
4. ✅ Moved `.vscode/` from `apps/mobile/` → root
5. ✅ Updated Capacitor `webDir` from `www` → `../../dist/apps/mobile/browser`

**Not Issues (Clarified):**
- ✅ No `angular.json` at root (correct for Nx)
- ✅ `libs/src` and `libs/shared` are separate libraries (intentional)
- ✅ Scripts in root vs ai-backend serve different purposes
- ✅ Single `.env` at root shared by all apps
- ✅ `.angular/` folders in root and mobile are build caches (normal)

**Documentation Added:**
- Created `REPOSITORY_STRUCTURE.md` (this file)
- Updated `CLAUDE.md` with consolidation rules

---

## See Also

- `CLAUDE.md` - Project rules and quick reference
- `TYPE_SYSTEM_GUIDELINES.md` - Type organization rules
- `REQUIRED_EXTERNAL_APIS.md` - API key setup guide
