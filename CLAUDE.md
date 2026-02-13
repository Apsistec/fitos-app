# CLAUDE.md - FitOS Development Guide

## Project Overview

FitOS is an AI-powered fitness coaching platform for solo trainers. Monorepo structure:

- `apps/mobile` - Ionic Angular mobile app (iOS, Android, PWA)
- `apps/landing` - Marketing landing page (Angular SSR)
- `apps/ai-backend` - LangGraph Python backend for AI agents
- `libs/shared` - Shared TypeScript types and utilities
- `supabase/` - Database migrations and Edge Functions

## Tech Stack (2026 Standard)

| Layer | Technology | Version | Key 2026 Feature |
|-------|------------|---------|------------------|
| Frontend | Angular | 21.0.x | Zoneless by default; Stable Signal Forms |
| UI Framework | Ionic | 8.7.x | Ionicons v8; Native iOS 19 / Android 15 haptics |
| Native Runtime | Capacitor | 8.0.x | SPM (Swift Package Manager); Edge-to-Edge Android |
| TypeScript | TypeScript | 5.9.x | Latest stable with Angular 21 |
| Node.js | Node.js | 22.12.x | Required for latest Angular/Capacitor CLI |
| Backend | Supabase | Latest | PostgreSQL + pgvector + Auth + Realtime |
| AI Backend | LangGraph | Latest | Python on Cloud Run |
| Voice AI | Deepgram | Nova-3/Aura-2 | Real-time transcription |
| Payments | Stripe Connect | Latest | Trainer payouts |
| Wearables | Terra API | Latest | Multi-platform health data |

## Version Requirements (STRICT)

- **Node.js**: ^22.12.0 (LTS - Required for Angular 21)
- **npm**: >=10.0.0
- **Angular**: ~21.0.0 (Zoneless by default)
- **Ionic**: ^8.7.16 (Latest stable)
- **Capacitor**: ^8.0.0 (SPM for iOS, Edge-to-Edge Android)
- **TypeScript**: ~5.9.0 (Compatible with Angular 21)
- **Test Runner**: Vitest 3.x (Default for Angular 21, replaces Karma/Jasmine)

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
| `docs/REPOSITORY_STRUCTURE.md` | **CRITICAL** Repository organization, file locations |
| `docs/TYPE_SYSTEM_GUIDELINES.md` | **CRITICAL** Type definitions, naming conventions |
| `docs/DESIGN_SYSTEM.md` | Colors, typography, spacing, components |
| `docs/THEMING.md` | Dark/light mode implementation |
| `docs/UX_PATTERNS.md` | Friction reduction, navigation patterns |
| `docs/COMPETITIVE_ANALYSIS.md` | Market research, feature gaps |
| `docs/PHASE1_BACKLOG.md` | MVP features (Sprints 0-8) |
| `docs/PHASE2_BACKLOG.md` | AI/CRM features (Sprints 7-16) |
| `docs/PHASE4_BACKLOG.md` | Zero Tracking Friction features (Sprints 46-53) |
| `docs/AI_INTEGRATION.md` | Voice, photo, coaching architecture |
| `docs/CRM_MARKETING.md` | Lead pipeline, email automation |
| `docs/USER_ROLES_ARCHITECTURE.md` | RBAC, dashboards by role |
| `docs/SETTINGS_PROFILE_UX.md` | Settings page design standards |
| `docs/OFFLINE_SYNC.md` | Offline-first patterns |
| `docs/CONFIG_VALIDATION.md` | **CRITICAL** Config file rules, validation checklist, single-source-of-truth registry |

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

### Type System (READ FIRST!)
**BEFORE creating any type, interface, or service property:**
1. **Check `libs/shared/src/lib/types.ts`** - Does it exist there?
2. **Check the service definition** - What properties actually exist?
3. **Match database column names** - Use `snake_case`, exact names
4. **Read `docs/TYPE_SYSTEM_GUIDELINES.md`** for full rules

**Common violations that cause build errors:**
- Creating duplicate types in services (❌ `export interface EmailTemplate`)
- Making up service property names (❌ `authService.currentUser()`)
- Mismatching DB field names (❌ `body` when DB has `body_html`)

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

### Config Validation (MANDATORY)
**Read:** `docs/CONFIG_VALIDATION.md`

**EVERY TIME you add, update, or remove any config file**, you MUST run the full validation checklist from `docs/CONFIG_VALIDATION.md`. This is not optional.

**Key rules that prevent the most common failures:**

1. **`.env` is the single source of truth** for all environment variables
   - `environment.ts` dev values must match `.env` values
   - `supabase/config.toml` `env()` names must match `.env` variable names exactly
   - When `.env` changes, update ALL consumers

2. **Root `package.json` owns ALL dependencies**
   - App `package.json` files contain ONLY `scripts` and `engines`
   - NEVER add dependencies to `apps/mobile/package.json` or `apps/landing/package.json`
   - After any dependency change, verify: `npm ls @angular/core` shows single version, all deduped
   - NEVER allow `apps/*/node_modules/` to exist

3. **One config file per concern — NO duplicates**
   - ONE `capacitor.config.ts` at root (never `apps/mobile/`)
   - NO `angular.json` in apps (use `project.json` for NX)
   - ONE `ngsw-config.json` at `apps/mobile/ngsw-config.json`
   - Pytest config in `pytest.ini` only (not also in `pyproject.toml`)

4. **TypeScript config chain must be correct**
   - `tsconfig.app.json` extends `./tsconfig.json` (NOT `../../tsconfig.base.json`)
   - If app tsconfig has `baseUrl: "."`, shared path aliases must be redeclared relative to app dir
   - Verify builds actually pick up strict settings (a wrong `extends` silently drops strictness)

5. **Cross-file consistency checks after ANY config change**
   - `project.json` outputPath ↔ `capacitor.config.ts` webDir ↔ `firebase.json` public
   - `firebase.json` header sources ↔ actual filenames in build output
   - `docker-compose.yml` env_file path ↔ actual `.env` location
   - All lint targets use same executor (`@nx/eslint:lint`)
   - All apps have `build`, `serve`, `test`, `lint` targets

### Performance Requirements
- OnPush change detection on all components
- Virtual scrolling for lists >50 items
- Lazy load all feature modules
- trackBy on all *ngFor
- Only animate transform/opacity

### Git and Configuration Management
**NEVER disable or modify Git settings (GPG signing, hooks, config) without user approval.**

When encountering Git configuration issues (e.g., GPG signing failures):
1. Explain the issue clearly
2. Present all available options to fix it
3. Ask the user which approach they prefer
4. Only proceed after receiving explicit approval

Examples of settings that require user approval before modification:
- GPG signing (`--no-gpg-sign`, `--no-verify`)
- Git hooks (pre-commit, commit-msg)
- Git config (user.name, user.email, commit.gpgsign)
- IDE or editor settings
- Environment variables
- Build configurations

### Feature, Service, and Code Management (CRITICAL)
**NEVER disable, remove, or turn off ANY features, services, functionality, or code without EXPLICIT user approval.**

This is a CRITICAL rule that applies to ALL situations:

#### What Requires User Approval BEFORE Action:
- **Removing code** - Never delete functions, methods, classes, components, or any code
- **Removing UI elements** - Never remove buttons, cards, forms, or any UI components
- **Disabling features** - Never disable or comment out functionality
- **Removing services** - Never remove service methods, API calls, or integrations
- **Removing guards** - Never remove or bypass route guards
- **Removing imports** - Never remove imports that are used (even if you think they're not)
- **Simplifying code** - Never "simplify" by removing options or functionality

#### When Encountering Errors:
1. **Explain the error clearly** - Show what's happening
2. **Investigate the root cause** - Find out WHY it's failing
3. **Present options to FIX the issue** - NOT disable it
4. **Ask the user which approach they prefer**
5. **Only remove/disable if user EXPLICITLY says to remove it**

#### Specific Examples That Are FORBIDDEN Without Approval:
- ❌ Removing Google/Apple sign-in options because "they don't belong on MFA page"
- ❌ Removing a guard because "it's causing errors"
- ❌ Removing a service method because "it's not being used"
- ❌ Removing UI cards/buttons because "they're not needed"
- ❌ Commenting out code because "it's causing issues"
- ❌ Removing validation because "it's too strict"
- ❌ Removing error handling because "it's verbose"

#### The Only Acceptable Approach:
1. If something seems wrong or unnecessary, ASK the user first
2. Explain your reasoning
3. Wait for explicit approval before making ANY removal
4. If the user says no, find another solution that KEEPS the functionality

**Remember: The user built this application with intent. Every feature, button, and line of code exists for a reason. Your job is to FIX issues, not remove functionality.**

---

## Repository Structure

**Full details:** `docs/REPOSITORY_STRUCTURE.md`

### Key Locations

```
apps/
├── mobile/             # Ionic Angular app (port 4200)
│   └── src/app/
│       ├── core/       # Services, guards
│       └── features/   # Feature modules
├── landing/            # Marketing site (port 4201)
└── ai-backend/         # Python FastAPI
    └── app/            # Python code (NOT apps/)

libs/
├── shared/             # @fitos/shared (types, utils)
└── src/                # @fitos/libs (UI components)

docs/                   # ALL documentation
```

### Critical Repository Rules

**NEVER:**
- ❌ Create `.env.example` files (use commented `.env` instead)
- ❌ Put documentation in root (use `docs/` folder)
- ❌ Create types in services (use `@fitos/shared`)
- ❌ Use `apps/` folder in Python backend (use `app/` folder)
- ❌ Add dependencies to app-level `package.json` (root only)
- ❌ Create `angular.json` in apps (use `project.json` for NX)
- ❌ Create `capacitor.config.*` in apps (root only)
- ❌ Create duplicate config files (check `docs/CONFIG_VALIDATION.md` registry)

**ALWAYS:**
- ✅ Import types from `@fitos/shared`
- ✅ Match database column names exactly (`snake_case`)
- ✅ Put new docs in `docs/` folder
- ✅ Check `docs/REPOSITORY_STRUCTURE.md` before creating files
- ✅ Run config validation checklist (`docs/CONFIG_VALIDATION.md`) after ANY config change
- ✅ Use `.env` as single source of truth for environment variables
- ✅ Verify `npm ls @angular/core` shows single deduped version after dependency changes

---

## Phase Overview

### Phase 1: MVP (Complete)
- Auth, roles, onboarding
- Exercise library, workout builder
- Workout logging, nutrition tracking
- Stripe payments, wearable integration
- Messaging

### Phase 2: Differentiation (Complete)
- Sprint 7: Dark mode redesign
- Sprint 8-9: Voice logging (Deepgram)
- Sprint 10: Photo nutrition AI
- Sprint 11-12: CRM & email marketing
- Sprint 13-14: AI coaching + JITAI
- Sprint 15: Apple Watch
- Sprint 16: Polish

### Phase 3: Advanced Features (Complete)
- Sprints 17-26: AI coaching, recovery, gamification, payments
- Sprints 27-45: Enterprise, HIPAA, A2A, marketplace

### Phase 4: Zero Tracking Friction (Planning)
- Sprint 46-47: NFC/QR touchpoints, app shortcuts
- Sprint 48-49: Widgets, health sync, Dynamic Island
- Sprint 50-51: Barcode scanning, equipment OCR, voice enhancement
- Sprint 52-53: Context-aware notifications, progressive onboarding

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

**Single root `.env` file** — used by all apps (mobile, ai-backend, edge functions).

See the `.env` file itself for inline comments on where to get each key.

Key groups:
```
# Supabase
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Stripe
STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_THIN_WEBHOOK_SECRET

# Terra (Wearables)
TERRA_API_KEY, TERRA_DEV_ID, TERRA_WEBHOOK_SECRET

# AI Providers
ANTHROPIC_API_KEY, DEEPGRAM_API_KEY

# Nutrition
USDA_API_KEY

# Email
RESEND_API_KEY
```

---

## Production URLs

- **Mobile App (PWA)**: https://www.nutrifitos.app
- **Landing Page**: https://www.nutrifitos.com
- **Supabase Project**: `dmcogmopboebqiimzoej`

---

## MCP Servers (Model Context Protocol)

This project has MCP servers configured in `.mcp.json`. **USE THESE TOOLS** for direct API access:

### Supabase MCP
- **Remote**: Connected to production project `dmcogmopboebqiimzoej`
- **Local**: Connected to local Supabase instance at `http://127.0.0.1:54321`
- **Use for**: Database queries, Edge Function logs, auth management, storage operations

### Stripe MCP
- **Use for**: Customer management, subscription queries, payment intents, invoice management
- **Available tools**: `list_customers`, `list_subscriptions`, `list_invoices`, `list_products`, `list_prices`, `fetch_stripe_resources`, `search_stripe_documentation`

### Firebase MCP
- **Project dir**: `/Users/dougwhite/Dev/fitos-app`
- **Use for**: Firebase Hosting deployment status, Cloud Functions logs, Firestore queries (if used), project management

### When to Use MCP Tools
- Checking Edge Function logs → Use Supabase MCP
- Querying database directly → Use Supabase MCP
- Looking up Stripe customers/subscriptions → Use Stripe MCP
- Debugging payment issues → Use Stripe MCP
- Checking Firebase deployment status → Use Firebase MCP

**IMPORTANT**: Always prefer MCP tools over manual CLI commands when available.

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
