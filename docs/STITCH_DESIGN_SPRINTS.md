# FitOS Stitch Design Sprints

**Created:** January 29, 2026
**Tool:** Google Stitch (AI-powered UI design)
**MCP Server:** `@_davideast/stitch-mcp` via API Key auth
**Skills:** `design-md`, `enhance-prompt` (installed globally)
**Design System:** See `DESIGN_SYSTEM.md` for tokens, colors, typography

---

## Overview

This document tracks the design overhaul of all FitOS pages using Google Stitch.
The goal is to generate professional, consistent UI designs for every screen in the
mobile app and landing site, then apply those designs to the Angular/Ionic codebase.

**Approach:**
1. Extract design context from existing screens using Stitch `design-md` skill
2. Generate optimized Stitch prompts using `enhance-prompt` skill
3. Create designs in Stitch per feature area
4. Review and iterate on generated designs
5. Apply designs to Angular/Ionic components

---

## Prerequisites

### Stitch MCP Configuration

Located in `~/.claude.json`:

```json
{
  "mcpServers": {
    "stitch": {
      "type": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "<API_KEY>"
      }
    }
  }
}
```

### Google Cloud

- **Project:** `fitos-88fff`
- **Auth:** `email@douglaswhite.dev` via `gcloud auth login`
- **gcloud:** Installed via Homebrew

### Stitch Skills (installed globally)

```bash
npx skills add google-labs-code/stitch-skills --skill design-md --skill enhance-prompt --global --yes
```

- `~/.agents/skills/design-md` - Extracts design systems into DESIGN.md
- `~/.agents/skills/enhance-prompt` - Transforms UI ideas into Stitch-optimized prompts

---

## Design Principles (from DESIGN_SYSTEM.md)

- **Dark-First, Glanceable Design** (WHOOP-inspired)
- **Adherence-Neutral Psychology** (no red for "over target")
- **Friction-Minimized Interaction** (< 10 seconds for any data entry)
- **Primary accent:** `#10B981` (energetic teal/green)
- **Secondary accent:** `#8B5CF6` (purple/violet)
- **Font:** Inter + system fallbacks, SF Mono for data
- **Icons:** Ionicons (outline for nav, filled for selected)
- **Mobile-first** with Ionic framework components

---

## Sprint Schedule

### Design Sprint 46: Auth & Onboarding (Priority: High)

**Goal:** Professional, trust-building first impression for all auth screens
**Stitch Project:** `projects/12317444059489313469`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Login (Role Select) | `/auth/login` | Reviewing |
| 2 | Trainer Login | `/auth/login/trainer` | Reviewing |
| 3 | Client Login | `/auth/login/client` | Reviewing |
| 4 | Gym Owner Login | `/auth/login/gym-owner` | Reviewing |
| 5 | SSO Login | `/auth/sso-login` | Reviewing |
| 6 | Register (Role Select) | `/auth/register` | Reviewing |
| 7 | Trainer Register | `/auth/register/trainer` | Reviewing |
| 8 | Client Register | `/auth/register/client` | Reviewing |
| 9 | Gym Owner Register | `/auth/register/gym-owner` | Reviewing |
| 10 | Forgot Password | `/auth/forgot-password` | Reviewing |
| 11 | Verify Email | `/auth/verify-email` | Reviewing |
| 12 | Reset Password | `/auth/reset-password` | Reviewing |
| 13 | MFA Setup | `/auth/mfa-setup` | Reviewing |
| 14 | MFA Verify | `/auth/mfa-verify` | Reviewing |
| 15 | Onboarding | `/onboarding` | Reviewing |

**Design Notes:**
- Role selection should feel welcoming, not bureaucratic
- Login/register forms: clean, minimal, dark background with accent highlights
- MFA setup: clear visual hierarchy for method cards (already redesigned in code)
- Onboarding: step indicator, progress feel, skip option

---

### Design Sprint 47: Dashboard & Core Navigation (Priority: High)

**Goal:** Information-dense but scannable home screen with role-specific content
**Stitch Project:** `projects/15713137891627036408`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Dashboard | `/tabs/dashboard` | Reviewing |
| 2 | Tabs Container | `/tabs` | Reviewing |

**Design Notes:**
- Dashboard: hero metric cards, today's workout preview, nutrition summary ring
- Tab bar: icon + label, accent color for active state
- Role-specific widgets (trainer: client overview, owner: revenue)
- Dark background with glowing stat cards

---

### Design Sprint 48: Workouts (Priority: High)

**Goal:** Gym-ready interface that works at arm's length with sweaty hands
**Stitch Project:** `projects/1851034083344145603`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Workout List | `/tabs/workouts` | Reviewing |
| 2 | Exercise Library | `/tabs/workouts/exercises` | Reviewing |
| 3 | Exercise Form | `/tabs/workouts/exercises/new` | Reviewing |
| 4 | Workout Builder | `/tabs/workouts/builder` | Reviewing |
| 5 | Assign Workout | `/tabs/workouts/assign` | Reviewing |
| 6 | Active Workout | `/tabs/workouts/active/:id` | Reviewing |
| 7 | Workout History | `/tabs/workouts/history` | Reviewing |
| 8 | Workout Detail | `/tabs/workouts/history/:id` | Reviewing |
| 9 | Progress Charts | `/tabs/workouts/progress` | Reviewing |
| 10 | Measurements | `/tabs/workouts/measurements` | Reviewing |

**Design Notes:**
- Active workout: extra large touch targets, high contrast, rest timer
- Workout builder: drag-and-drop feel, exercise cards
- Progress: charts with mono font numbers, trend indicators
- Exercise library: filterable grid with muscle group icons

---

### Design Sprint 49: Nutrition (Priority: High)

**Goal:** Adherence-neutral food logging that feels effortless
**Stitch Project:** `projects/2214746930003329037`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Nutrition Log | `/tabs/nutrition` | Reviewing |
| 2 | Add Food | `/tabs/nutrition/add` | Reviewing |
| 3 | Voice Nutrition | `/tabs/nutrition/voice` | Reviewing |
| 4 | Photo Nutrition | `/tabs/nutrition/photo` | Reviewing |

**Design Notes:**
- Macro rings with adherence-neutral colors (never red for "over")
- Calorie: indigo, Protein: green, Carbs: amber, Fat: pink, Over: purple
- Voice input: pulsing mic animation, real-time transcript
- Photo: camera viewfinder overlay, AI identification results

---

### Design Sprint 50: Coaching & Messages (Priority: Medium)

**Goal:** Natural chat experience with AI coaching indicators
**Stitch Project:** `projects/2660539694892899208`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Coaching Chat | `/tabs/coaching/chat` | Reviewing |
| 2 | Methodology Setup | `/tabs/coaching/methodology-setup` | Reviewing |
| 3 | Insights Dashboard | embedded | Reviewing |
| 4 | Conversations List | `/tabs/messages` | Reviewing |
| 5 | Message Chat | `/tabs/messages/chat/:id` | Reviewing |

**Design Notes:**
- Chat bubbles with AI vs human distinction
- Typing indicator animation
- Quick action chips above input
- Conversation list with avatar, preview, unread badge

---

### Design Sprint 51: Client Management (Priority: Medium)

**Goal:** Trainer-centric client dashboard with actionable insights
**Stitch Project:** `projects/14557078187966128142`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Client List | `/tabs/clients` | Reviewing |
| 2 | Invite Client | `/tabs/clients/invite` | Reviewing |
| 3 | Invitations List | `/tabs/clients/invitations` | Reviewing |
| 4 | Client Detail | `/tabs/clients/:id` | Reviewing |
| 5 | Set Nutrition Targets | `/tabs/clients/:id/nutrition-targets` | Reviewing |
| 6 | Graduation | `/tabs/clients/:id/graduation` | Reviewing |
| 7 | Video Review | `/tabs/clients/video-review/:id` | Reviewing |

**Design Notes:**
- Client list: avatar, name, last activity, adherence indicator
- Client detail: tabs for overview/workouts/nutrition/progress
- Graduation: celebration design with achievement badges
- Video review: side-by-side video with annotation tools

---

### Design Sprint 52: CRM & Marketing (Priority: Medium)

**Goal:** Professional business tools that feel native to a fitness app
**Stitch Project:** `projects/14295455250109521956`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | CRM Hub | internal | Reviewing |
| 2 | Lead Pipeline | `/tabs/crm/pipeline` | Reviewing |
| 3 | Email Templates | `/tabs/crm/templates` | Reviewing |
| 4 | Email Sequences | `/tabs/crm/sequences` | Reviewing |
| 5 | Email Analytics | `/tabs/crm/analytics` | Reviewing |
| 6 | Email Campaigns | internal | Reviewing |
| 7 | Form Builder | internal | Reviewing |
| 8 | Lead Detail | internal | Reviewing |

**Design Notes:**
- Pipeline: Kanban columns with card drag indicators
- Email template editor: WYSIWYG preview
- Analytics: open/click/reply charts with trend lines

---

### Design Sprint 53: Settings & Profile (Priority: Medium)

**Goal:** Organized settings with clear navigation hierarchy
**Stitch Project:** `projects/1853405871396452861`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Settings Home | `/tabs/settings` | Reviewing |
| 2 | Edit Profile | `/tabs/settings/profile` | Reviewing |
| 3 | Trainer Pricing | `/tabs/settings/pricing` | Reviewing |
| 4 | My Subscription | `/tabs/settings/subscription` | Reviewing |
| 5 | Wearables | `/tabs/settings/wearables` | Reviewing |
| 6 | Payment History | `/tabs/settings/payments` | Reviewing |
| 7 | Notifications | `/tabs/settings/notifications` | Reviewing |
| 8 | Privacy & Security | `/tabs/settings/privacy` | Reviewing |
| 9 | Change Password | `/tabs/settings/change-password` | Reviewing |
| 10 | Stripe Connect | `/tabs/settings/stripe-connect` | Reviewing |
| 11 | Chronotype | `/tabs/settings/chronotype` | Reviewing |
| 12 | Help Hub | `/tabs/settings/help` | Reviewing |
| 13 | Terms & Privacy | `/tabs/settings/terms` | Reviewing |
| 14 | Integrations | `/tabs/settings/integrations` | Reviewing |

**Design Notes:**
- Settings list: grouped sections with icons
- Profile: avatar upload, form fields, role badge
- Subscription: current plan card, upgrade CTA
- Wearables: device cards with connection status

---

### Design Sprint 54: Analytics & Business (Priority: Low)

**Goal:** Data-rich dashboards for gym owners and trainers
**Stitch Project:** `projects/11949277000781767716`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Owner Analytics | `/tabs/analytics` | Reviewing |
| 2 | Payment Analytics | internal | Reviewing |
| 3 | Pricing Tiers | `/outcome-pricing/tiers` | Reviewing |
| 4 | Create Tier | `/outcome-pricing/tiers/create` | Reviewing |
| 5 | Tier Detail | `/outcome-pricing/tiers/:id` | Reviewing |
| 6 | My Goals | `/outcome-pricing/goals` | Reviewing |
| 7 | Goal Detail | `/outcome-pricing/goals/:id` | Reviewing |
| 8 | Trainer Payouts | internal | Reviewing |

**Design Notes:**
- Charts: dark background, accent-colored lines/bars
- Metric cards with trend arrows and percentage changes
- Goal progress: circular progress indicators

---

### Design Sprint 55: Franchise & Enterprise (Priority: Low)

**Goal:** Multi-location management with clear data hierarchy
**Stitch Project:** `projects/4368094376255775214`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Franchise Dashboard | `/franchise/dashboard` | Reviewing |
| 2 | Location Form | `/franchise/locations/new` | Reviewing |
| 3 | Location Detail | `/franchise/locations/:id` | Reviewing |
| 4 | Royalty Dashboard | `/franchise/royalties` | Reviewing |
| 5 | Franchise Analytics | `/franchise/analytics` | Reviewing |

**Design Notes:**
- Multi-location map view or card grid
- Per-location metrics comparison
- Royalty tracking with payment status

---

### Design Sprint 56: Help, Social & Specialty (Priority: Low)

**Goal:** Supporting pages that maintain design consistency
**Stitch Project:** `projects/9313239997448920445`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Help Center | `/tabs/settings/help/center` | Reviewing |
| 2 | FAQ | `/tabs/settings/help/faq` | Reviewing |
| 3 | Getting Started | `/tabs/settings/help/getting-started` | Reviewing |
| 4 | Feature Guide | `/tabs/settings/help/guide/:slug` | Reviewing |
| 5 | Contact Support | `/tabs/settings/help/contact` | Reviewing |
| 6 | Leaderboard | `/tabs/social/leaderboard` | Reviewing |
| 7 | Wellness Check-In | embedded | Reviewing |
| 8 | SEO Dashboard | internal | Reviewing |
| 9 | Google Business | internal | Reviewing |
| 10 | Keywords | internal | Reviewing |
| 11 | Reviews | internal | Reviewing |
| 12 | SSO Audit | internal | Reviewing |
| 13 | SSO Config | internal | Reviewing |

---

### Design Sprint 57: Landing Site (Priority: Medium)

**Goal:** Marketing website that converts visitors to signups
**Stitch Project:** `projects/2079243473916629379`

| # | Page | Route | Status |
|---|------|-------|--------|
| 1 | Home | `/` | Reviewing |
| 2 | Features | `/features` | Reviewing |
| 3 | Pricing | `/pricing` | Reviewing |
| 4 | Changelog | `/changelog` | Reviewing |
| 5 | Roadmap | `/roadmap` | Reviewing |
| 6 | Blog | `/blog` | Reviewing |
| 7 | Help | `/help` | Reviewing |
| 8 | Docs | `/docs` | Reviewing |
| 9 | Privacy Policy | `/privacy` | Reviewing |
| 10 | Terms of Service | `/terms` | Reviewing |
| 11 | Cookie Policy | `/cookies` | Reviewing |

**Design Notes:**
- Hero section with app mockup and CTA
- Feature showcase with screenshots/animations
- Pricing table: three tiers, highlighted recommended
- Blog: card grid with featured post hero
- Light mode for landing site (marketing convention)

---

## Workflow Per Sprint

### Step 1: Extract Design Context
```
Use Stitch `design-md` skill to analyze existing screens and
generate a DESIGN.md capturing colors, typography, layout patterns.
```

### Step 2: Generate Stitch Prompts
```
Use `enhance-prompt` skill to transform page descriptions into
Stitch-optimized prompts that reference the FitOS design system.
```

### Step 3: Generate Designs in Stitch
```
Use Stitch MCP tools to create designs for each page.
- generate_ui: Create initial design from prompt
- iterate: Refine based on feedback
- export: Get design assets and code
```

### Step 4: Review & Iterate
```
Compare generated designs against DESIGN_SYSTEM.md tokens.
Verify adherence-neutral colors, dark-first theme, touch targets.
```

### Step 5: Apply to Codebase
```
Convert Stitch designs to Angular/Ionic components.
- Update inline templates and styles
- Use Ionic components (IonCard, IonButton, etc.)
- Apply design tokens from variables.scss
- Verify build compiles
```

---

## Summary

| Sprint | Feature Area | Pages | Priority | Status |
|--------|-------------|-------|----------|--------|
| 46 | Auth & Onboarding | 15 | High | Reviewing |
| 47 | Dashboard & Navigation | 2 | High | Reviewing |
| 48 | Workouts | 10 | High | Reviewing |
| 49 | Nutrition | 4 | High | Reviewing |
| 50 | Coaching & Messages | 5 | Medium | Reviewing |
| 51 | Client Management | 7 | Medium | Reviewing |
| 52 | CRM & Marketing | 8 | Medium | Reviewing |
| 53 | Settings & Profile | 14 | Medium | Reviewing |
| 54 | Analytics & Business | 8 | Low | Reviewing |
| 55 | Franchise & Enterprise | 5 | Low | Reviewing |
| 56 | Help, Social & Specialty | 13 | Low | Reviewing |
| 57 | Landing Site | 11 | Medium | Reviewing |
| **Total** | | **102** | | **All Generated** |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| Pending | Not yet started |
| Designing | Stitch design in progress |
| Reviewing | Design generated, under review |
| Implementing | Applying design to codebase |
| Complete | Design applied and verified |
