# FitOS Stitch Design Sprints

**Created:** January 29, 2026  
**Updated:** January 30, 2026  
**Tool:** Google Stitch (AI-powered UI design)  
**MCP Server:** `@_davideast/stitch-mcp` via API Key auth  
**Skills:** `design-md`, `enhance-prompt` (installed globally)  
**Design System:** See `DESIGN_SYSTEM.md` for tokens, colors, typography  
**Implementation:** See `STITCH_IMPLEMENTATION_SPRINTS.md` for code application

---

## Overview

This document tracks the design overhaul of all FitOS pages using Google Stitch.
The goal is to generate professional, consistent UI designs for every screen in the
mobile app and landing site, then apply those designs to the Angular/Ionic codebase.

**Current Status:** All 102 pages have designs generated and are in "Reviewing" status.

**Next Step:** Begin implementation sprints (58-69) defined in `STITCH_IMPLEMENTATION_SPRINTS.md`

**Approach:**
1. ✅ Extract design context from existing screens using Stitch `design-md` skill
2. ✅ Generate optimized Stitch prompts using `enhance-prompt` skill
3. ✅ Create designs in Stitch per feature area
4. 🔄 Review and iterate on generated designs
5. ⏳ Apply designs to Angular/Ionic components (Sprints 58-69)

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

## Design Sprint Schedule

### Design Sprint 46: Auth & Onboarding (Priority: High)

**Goal:** Professional, trust-building first impression for all auth screens  
**Stitch Project:** `projects/12317444059489313469`  
**Implementation Sprint:** 58

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Login (Role Select) | `/auth/login` | ✅ Complete | ⏳ Pending |
| 2 | Trainer Login | `/auth/login/trainer` | ✅ Complete | ⏳ Pending |
| 3 | Client Login | `/auth/login/client` | ✅ Complete | ⏳ Pending |
| 4 | Gym Owner Login | `/auth/login/gym-owner` | ✅ Complete | ⏳ Pending |
| 5 | SSO Login | `/auth/sso-login` | ✅ Complete | ⏳ Pending |
| 6 | Register (Role Select) | `/auth/register` | ✅ Complete | ⏳ Pending |
| 7 | Trainer Register | `/auth/register/trainer` | ✅ Complete | ⏳ Pending |
| 8 | Client Register | `/auth/register/client` | ✅ Complete | ⏳ Pending |
| 9 | Gym Owner Register | `/auth/register/gym-owner` | ✅ Complete | ⏳ Pending |
| 10 | Forgot Password | `/auth/forgot-password` | ✅ Complete | ⏳ Pending |
| 11 | Verify Email | `/auth/verify-email` | ✅ Complete | ⏳ Pending |
| 12 | Reset Password | `/auth/reset-password` | ✅ Complete | ⏳ Pending |
| 13 | MFA Setup | `/auth/mfa-setup` | ✅ Complete | ⏳ Pending |
| 14 | MFA Verify | `/auth/mfa-verify` | ✅ Complete | ⏳ Pending |
| 15 | Onboarding | `/onboarding` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Role selection should feel welcoming, not bureaucratic
- Login/register forms: clean, minimal, dark background with accent highlights
- MFA setup: clear visual hierarchy for method cards (already redesigned in code)
- Onboarding: step indicator, progress feel, skip option

---

### Design Sprint 47: Dashboard & Core Navigation (Priority: High)

**Goal:** Information-dense but scannable home screen with role-specific content  
**Stitch Project:** `projects/15713137891627036408`  
**Implementation Sprint:** 59

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Dashboard | `/tabs/dashboard` | ✅ Complete | ⏳ Pending |
| 2 | Tabs Container | `/tabs` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Dashboard: hero metric cards, today's workout preview, nutrition summary ring
- Tab bar: icon + label, accent color for active state
- Role-specific widgets (trainer: client overview, owner: revenue)
- Dark background with glowing stat cards

---

### Design Sprint 48: Workouts (Priority: High)

**Goal:** Gym-ready interface that works at arm's length with sweaty hands  
**Stitch Project:** `projects/1851034083344145603`  
**Implementation Sprint:** 60

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Workout List | `/tabs/workouts` | ✅ Complete | ⏳ Pending |
| 2 | Exercise Library | `/tabs/workouts/exercises` | ✅ Complete | ⏳ Pending |
| 3 | Exercise Form | `/tabs/workouts/exercises/new` | ✅ Complete | ⏳ Pending |
| 4 | Workout Builder | `/tabs/workouts/builder` | ✅ Complete | ⏳ Pending |
| 5 | Assign Workout | `/tabs/workouts/assign` | ✅ Complete | ⏳ Pending |
| 6 | Active Workout | `/tabs/workouts/active/:id` | ✅ Complete | ⏳ Pending |
| 7 | Workout History | `/tabs/workouts/history` | ✅ Complete | ⏳ Pending |
| 8 | Workout Detail | `/tabs/workouts/history/:id` | ✅ Complete | ⏳ Pending |
| 9 | Progress Charts | `/tabs/workouts/progress` | ✅ Complete | ⏳ Pending |
| 10 | Measurements | `/tabs/workouts/measurements` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Active workout: extra large touch targets, high contrast, rest timer
- Workout builder: drag-and-drop feel, exercise cards
- Progress: charts with mono font numbers, trend indicators
- Exercise library: filterable grid with muscle group icons

**Critical Features to Include:**
- Voice logging integration (Deepgram)
- Smart weight/rep predictions
- Haptic feedback on set completion
- Rest timer with countdown animation

---

### Design Sprint 49: Nutrition (Priority: High)

**Goal:** Adherence-neutral food logging that feels effortless  
**Stitch Project:** `projects/2214746930003329037`  
**Implementation Sprint:** 61

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Nutrition Log | `/tabs/nutrition` | ✅ Complete | ⏳ Pending |
| 2 | Add Food | `/tabs/nutrition/add` | ✅ Complete | ⏳ Pending |
| 3 | Voice Nutrition | `/tabs/nutrition/voice` | ✅ Complete | ⏳ Pending |
| 4 | Photo Nutrition | `/tabs/nutrition/photo` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Macro rings with adherence-neutral colors (NEVER red for "over")
- Calorie: indigo, Protein: green, Carbs: amber, Fat: pink, Over: purple
- Voice input: pulsing mic animation, real-time transcript
- Photo: camera viewfinder overlay, AI identification results

**Critical Color Rules (from DESIGN_SYSTEM.md):**
```scss
--fitos-nutrition-calories: #6366F1;  // Indigo (neutral)
--fitos-nutrition-protein: #10B981;   // Green
--fitos-nutrition-carbs: #F59E0B;     // Amber
--fitos-nutrition-fat: #EC4899;       // Pink
--fitos-nutrition-over: #8B5CF6;      // Purple (NOT red)
```

---

### Design Sprint 50: Coaching & Messages (Priority: Medium)

**Goal:** Natural chat experience with AI coaching indicators  
**Stitch Project:** `projects/2660539694892899208`  
**Implementation Sprint:** 62

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Coaching Chat | `/tabs/coaching/chat` | ✅ Complete | ⏳ Pending |
| 2 | Methodology Setup | `/tabs/coaching/methodology-setup` | ✅ Complete | ⏳ Pending |
| 3 | Insights Dashboard | embedded | ✅ Complete | ⏳ Pending |
| 4 | Conversations List | `/tabs/messages` | ✅ Complete | ⏳ Pending |
| 5 | Message Chat | `/tabs/messages/chat/:id` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Chat bubbles with AI vs human distinction
- Typing indicator animation
- Quick action chips above input
- Conversation list with avatar, preview, unread badge

---

### Design Sprint 51: Client Management (Priority: Medium)

**Goal:** Trainer-centric client dashboard with actionable insights  
**Stitch Project:** `projects/14557078187966128142`  
**Implementation Sprint:** 63

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Client List | `/tabs/clients` | ✅ Complete | ⏳ Pending |
| 2 | Invite Client | `/tabs/clients/invite` | ✅ Complete | ⏳ Pending |
| 3 | Invitations List | `/tabs/clients/invitations` | ✅ Complete | ⏳ Pending |
| 4 | Client Detail | `/tabs/clients/:id` | ✅ Complete | ⏳ Pending |
| 5 | Set Nutrition Targets | `/tabs/clients/:id/nutrition-targets` | ✅ Complete | ⏳ Pending |
| 6 | Graduation | `/tabs/clients/:id/graduation` | ✅ Complete | ⏳ Pending |
| 7 | Video Review | `/tabs/clients/video-review/:id` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Client list: avatar, name, last activity, adherence indicator (NOT red)
- Client detail: tabs for overview/workouts/nutrition/progress
- Graduation: celebration design with achievement badges
- Video review: side-by-side video with annotation tools

---

### Design Sprint 52: CRM & Marketing (Priority: Medium)

**Goal:** Professional business tools that feel native to a fitness app  
**Stitch Project:** `projects/14295455250109521956`  
**Implementation Sprint:** 64

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | CRM Hub | internal | ✅ Complete | ⏳ Pending |
| 2 | Lead Pipeline | `/tabs/crm/pipeline` | ✅ Complete | ⏳ Pending |
| 3 | Email Templates | `/tabs/crm/templates` | ✅ Complete | ⏳ Pending |
| 4 | Email Sequences | `/tabs/crm/sequences` | ✅ Complete | ⏳ Pending |
| 5 | Email Analytics | `/tabs/crm/analytics` | ✅ Complete | ⏳ Pending |
| 6 | Email Campaigns | internal | ✅ Complete | ⏳ Pending |
| 7 | Form Builder | internal | ✅ Complete | ⏳ Pending |
| 8 | Lead Detail | internal | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Pipeline: Kanban columns with card drag indicators
- Email template editor: WYSIWYG preview
- Analytics: open/click/reply charts with trend lines

---

### Design Sprint 53: Settings & Profile (Priority: Medium)

**Goal:** Organized settings with clear navigation hierarchy  
**Stitch Project:** `projects/1853405871396452861`  
**Implementation Sprint:** 65

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Settings Home | `/tabs/settings` | ✅ Complete | ⏳ Pending |
| 2 | Edit Profile | `/tabs/settings/profile` | ✅ Complete | ⏳ Pending |
| 3 | Trainer Pricing | `/tabs/settings/pricing` | ✅ Complete | ⏳ Pending |
| 4 | My Subscription | `/tabs/settings/subscription` | ✅ Complete | ⏳ Pending |
| 5 | Wearables | `/tabs/settings/wearables` | ✅ Complete | ⏳ Pending |
| 6 | Payment History | `/tabs/settings/payments` | ✅ Complete | ⏳ Pending |
| 7 | Notifications | `/tabs/settings/notifications` | ✅ Complete | ⏳ Pending |
| 8 | Privacy & Security | `/tabs/settings/privacy` | ✅ Complete | ⏳ Pending |
| 9 | Change Password | `/tabs/settings/change-password` | ✅ Complete | ⏳ Pending |
| 10 | Stripe Connect | `/tabs/settings/stripe-connect` | ✅ Complete | ⏳ Pending |
| 11 | Chronotype | `/tabs/settings/chronotype` | ✅ Complete | ⏳ Pending |
| 12 | Help Hub | `/tabs/settings/help` | ✅ Complete | ⏳ Pending |
| 13 | Terms & Privacy | `/tabs/settings/terms` | ✅ Complete | ⏳ Pending |
| 14 | Integrations | `/tabs/settings/integrations` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Settings list: grouped sections with icons
- Profile: avatar upload, form fields, role badge
- Subscription: current plan card, upgrade CTA
- Wearables: device cards with connection status

---

### Design Sprint 54: Analytics & Business (Priority: Low)

**Goal:** Data-rich dashboards for gym owners and trainers  
**Stitch Project:** `projects/11949277000781767716`  
**Implementation Sprint:** 66

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Owner Analytics | `/tabs/analytics` | ✅ Complete | ⏳ Pending |
| 2 | Payment Analytics | internal | ✅ Complete | ⏳ Pending |
| 3 | Pricing Tiers | `/outcome-pricing/tiers` | ✅ Complete | ⏳ Pending |
| 4 | Create Tier | `/outcome-pricing/tiers/create` | ✅ Complete | ⏳ Pending |
| 5 | Tier Detail | `/outcome-pricing/tiers/:id` | ✅ Complete | ⏳ Pending |
| 6 | My Goals | `/outcome-pricing/goals` | ✅ Complete | ⏳ Pending |
| 7 | Goal Detail | `/outcome-pricing/goals/:id` | ✅ Complete | ⏳ Pending |
| 8 | Trainer Payouts | internal | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Charts: dark background, accent-colored lines/bars
- Metric cards with trend arrows and percentage changes
- Goal progress: circular progress indicators

---

### Design Sprint 55: Franchise & Enterprise (Priority: Low)

**Goal:** Multi-location management with clear data hierarchy  
**Stitch Project:** `projects/4368094376255775214`  
**Implementation Sprint:** 67

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Franchise Dashboard | `/franchise/dashboard` | ✅ Complete | ⏳ Pending |
| 2 | Location Form | `/franchise/locations/new` | ✅ Complete | ⏳ Pending |
| 3 | Location Detail | `/franchise/locations/:id` | ✅ Complete | ⏳ Pending |
| 4 | Royalty Dashboard | `/franchise/royalties` | ✅ Complete | ⏳ Pending |
| 5 | Franchise Analytics | `/franchise/analytics` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Multi-location map view or card grid
- Per-location metrics comparison
- Royalty tracking with payment status

---

### Design Sprint 56: Help, Social & Specialty (Priority: Low)

**Goal:** Supporting pages that maintain design consistency  
**Stitch Project:** `projects/9313239997448920445`  
**Implementation Sprint:** 68

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Help Center | `/tabs/settings/help/center` | ✅ Complete | ⏳ Pending |
| 2 | FAQ | `/tabs/settings/help/faq` | ✅ Complete | ⏳ Pending |
| 3 | Getting Started | `/tabs/settings/help/getting-started` | ✅ Complete | ⏳ Pending |
| 4 | Feature Guide | `/tabs/settings/help/guide/:slug` | ✅ Complete | ⏳ Pending |
| 5 | Contact Support | `/tabs/settings/help/contact` | ✅ Complete | ⏳ Pending |
| 6 | Leaderboard | `/tabs/social/leaderboard` | ✅ Complete | ⏳ Pending |
| 7 | Wellness Check-In | embedded | ✅ Complete | ⏳ Pending |
| 8 | SEO Dashboard | internal | ✅ Complete | ⏳ Pending |
| 9 | Google Business | internal | ✅ Complete | ⏳ Pending |
| 10 | Keywords | internal | ✅ Complete | ⏳ Pending |
| 11 | Reviews | internal | ✅ Complete | ⏳ Pending |
| 12 | SSO Audit | internal | ✅ Complete | ⏳ Pending |
| 13 | SSO Config | internal | ✅ Complete | ⏳ Pending |

---

### Design Sprint 57: Landing Site (Priority: Medium)

**Goal:** Marketing website that converts visitors to signups  
**Stitch Project:** `projects/2079243473916629379`  
**Implementation Sprint:** 69

| # | Page | Route | Design Status | Implementation Status |
|---|------|-------|---------------|----------------------|
| 1 | Home | `/` | ✅ Complete | ⏳ Pending |
| 2 | Features | `/features` | ✅ Complete | ⏳ Pending |
| 3 | Pricing | `/pricing` | ✅ Complete | ⏳ Pending |
| 4 | Changelog | `/changelog` | ✅ Complete | ⏳ Pending |
| 5 | Roadmap | `/roadmap` | ✅ Complete | ⏳ Pending |
| 6 | Blog | `/blog` | ✅ Complete | ⏳ Pending |
| 7 | Help | `/help` | ✅ Complete | ⏳ Pending |
| 8 | Docs | `/docs` | ✅ Complete | ⏳ Pending |
| 9 | Privacy Policy | `/privacy` | ✅ Complete | ⏳ Pending |
| 10 | Terms of Service | `/terms` | ✅ Complete | ⏳ Pending |
| 11 | Cookie Policy | `/cookies` | ✅ Complete | ⏳ Pending |

**Design Notes:**
- Hero section with app mockup and CTA
- Feature showcase with screenshots/animations
- Pricing table: three tiers, highlighted recommended
- Blog: card grid with featured post hero
- **Light mode for landing site** (marketing convention)

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
See STITCH_IMPLEMENTATION_SPRINTS.md for detailed tasks.
- Update inline templates and styles
- Use Ionic components (IonCard, IonButton, etc.)
- Apply design tokens from variables.scss
- Integrate real data via services
- Verify build compiles
```

---

## Summary

| Design Sprint | Feature Area | Pages | Design Status | Impl. Sprint |
|---------------|-------------|-------|---------------|--------------|
| 46 | Auth & Onboarding | 15 | ✅ Complete | Sprint 58 |
| 47 | Dashboard & Navigation | 2 | ✅ Complete | Sprint 59 |
| 48 | Workouts | 10 | ✅ Complete | Sprint 60 |
| 49 | Nutrition | 4 | ✅ Complete | Sprint 61 |
| 50 | Coaching & Messages | 5 | ✅ Complete | Sprint 62 |
| 51 | Client Management | 7 | ✅ Complete | Sprint 63 |
| 52 | CRM & Marketing | 8 | ✅ Complete | Sprint 64 |
| 53 | Settings & Profile | 14 | ✅ Complete | Sprint 65 |
| 54 | Analytics & Business | 8 | ✅ Complete | Sprint 66 |
| 55 | Franchise & Enterprise | 5 | ✅ Complete | Sprint 67 |
| 56 | Help, Social & Specialty | 13 | ✅ Complete | Sprint 68 |
| 57 | Landing Site | 11 | ✅ Complete | Sprint 69 |
| **Total** | | **102** | **All Generated** | **208 pts** |

---

## Status Legend

| Status | Meaning |
|--------|---------|
| ⏳ Pending | Not yet started |
| 🔄 In Progress | Actively being worked on |
| ✅ Complete | Design generated and approved |
| 🚀 Deployed | Applied to codebase and verified |

---

## Next Steps

1. **Review all generated designs** - Ensure consistency with DESIGN_SYSTEM.md
2. **Begin Sprint 58** - Auth & Onboarding implementation
3. **Configure API keys** - Deepgram, Nutritionix, Passio AI, Claude/GPT-4
4. **Follow STITCH_IMPLEMENTATION_SPRINTS.md** - Detailed tasks per page

---

## Related Documentation

- `STITCH_IMPLEMENTATION_SPRINTS.md` - **Implementation tasks and data population**
- `STITCH_SETUP_STATUS.md` - Stitch MCP configuration status
- `DESIGN_SYSTEM.md` - Design tokens, colors, typography
- `GAP_ANALYSIS_2026.md` - Feature gaps and recommendations
- `IMPLEMENTATION_ASSESSMENT.md` - Current codebase status (68%)
