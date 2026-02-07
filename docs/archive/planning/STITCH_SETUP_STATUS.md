# Stitch MCP Setup Status

**Date:** January 30, 2026  
**Purpose:** Track Google Stitch integration setup and design pipeline progress

---

## Completed ✅

### MCP Server Configuration
- [x] Stitch MCP server configured in `~/.claude.json` with API key auth
- [x] Server URL: `https://stitch.googleapis.com/mcp`
- [x] Authentication method: API Key (via `X-Goog-Api-Key` header)

### Google Cloud
- [x] gcloud CLI installed (Homebrew, v553.0.0)
- [x] Authenticated as `email@douglaswhite.dev`
- [x] Active project: `fitos-88fff`

### Stitch Skills
- [x] `design-md` skill installed globally (`~/.agents/skills/design-md`)
- [x] `enhance-prompt` skill installed globally (`~/.agents/skills/enhance-prompt`)
- [x] Skills linked to: Claude Code, Codex, Cursor, Gemini CLI

### Documentation
- [x] App page inventory completed (96+ mobile pages, 11 landing pages)
- [x] Design sprint plan created (`docs/STITCH_DESIGN_SPRINTS.md`)
- [x] 12 design sprints planned (Sprints 46-57)
- [x] Pages organized by feature area and priority
- [x] **Implementation sprints created (`docs/STITCH_IMPLEMENTATION_SPRINTS.md`)**
- [x] **12 implementation sprints planned (Sprints 58-69)**
- [x] **Data population requirements documented**

### Design Generation (Sprints 46-57)
- [x] Sprint 46: Auth & Onboarding (15 pages) - **All designs generated**
- [x] Sprint 47: Dashboard & Navigation (2 pages) - **All designs generated**
- [x] Sprint 48: Workouts (10 pages) - **All designs generated**
- [x] Sprint 49: Nutrition (4 pages) - **All designs generated**
- [x] Sprint 50: Coaching & Messages (5 pages) - **All designs generated**
- [x] Sprint 51: Client Management (7 pages) - **All designs generated**
- [x] Sprint 52: CRM & Marketing (8 pages) - **All designs generated**
- [x] Sprint 53: Settings & Profile (14 pages) - **All designs generated**
- [x] Sprint 54: Analytics & Business (8 pages) - **All designs generated**
- [x] Sprint 55: Franchise & Enterprise (5 pages) - **All designs generated**
- [x] Sprint 56: Help, Social & Specialty (13 pages) - **All designs generated**
- [x] Sprint 57: Landing Site (11 pages) - **All designs generated**

**Total: 102 pages with Stitch designs generated**

---

## In Progress 🔄

### Design Review
- [ ] Review all generated designs against DESIGN_SYSTEM.md
- [ ] Verify adherence-neutral colors (no red for "over target")
- [ ] Check touch target sizes (44px minimum)
- [ ] Validate dark-first theme consistency
- [ ] Confirm glow effects on interactive elements

---

## Not Yet Started ⏳

### Implementation (Sprints 58-69)
- [ ] Sprint 58: Auth & Onboarding - 18 points
- [ ] Sprint 59: Dashboard & Navigation - 12 points
- [ ] Sprint 60: Workouts - 25 points
- [ ] Sprint 61: Nutrition - 20 points
- [ ] Sprint 62: Coaching & Messages - 18 points
- [ ] Sprint 63: Client Management - 16 points
- [ ] Sprint 64: CRM & Marketing - 22 points
- [ ] Sprint 65: Settings & Profile - 18 points
- [ ] Sprint 66: Analytics & Business - 15 points
- [ ] Sprint 67: Franchise & Enterprise - 12 points
- [ ] Sprint 68: Help, Social & Specialty - 14 points
- [ ] Sprint 69: Landing Site - 18 points

**Total Implementation: 208 story points (~12 weeks)**

### API Key Configuration (Required for Implementation)
- [ ] Deepgram Nova-3 API key → Edge Function `get-deepgram-key`
- [ ] Nutritionix API key → Edge Function `get-nutritionix-key`
- [ ] Passio AI API key → Edge Function `get-passio-key`
- [ ] Claude/GPT-4 API key → Edge Function `get-llm-key`
- [ ] Resend API key → Edge Function `get-resend-key`
- [ ] Stripe Connect configuration → Via Stripe SDK

---

## Key Files

| File | Purpose | Status |
|------|---------|--------|
| `~/.claude.json` | Stitch MCP server config (user-level) | ✅ |
| `docs/STITCH_DESIGN_SPRINTS.md` | Design sprint plan with all 102 pages | ✅ Updated |
| `docs/STITCH_IMPLEMENTATION_SPRINTS.md` | **Implementation tasks & data population** | ✅ New |
| `docs/DESIGN_SYSTEM.md` | Design tokens, colors, typography | ✅ |
| `docs/GAP_ANALYSIS_2026.md` | Feature gaps and recommendations | ✅ |
| `docs/IMPLEMENTATION_ASSESSMENT.md` | Current codebase status (68%) | ✅ |
| `docs/SPRINT_PLANNING.md` | Original sprint history (1-45) | ✅ |
| `docs/ROADMAP.md` | Strategic roadmap | ✅ |
| `~/.agents/skills/design-md/SKILL.md` | Design extraction skill | ✅ |
| `~/.agents/skills/enhance-prompt/SKILL.md` | Prompt optimization skill | ✅ |

---

## Stitch Project IDs

| Sprint | Feature Area | Stitch Project ID |
|--------|--------------|-------------------|
| 46 | Auth & Onboarding | `12317444059489313469` |
| 47 | Dashboard & Navigation | `15713137891627036408` |
| 48 | Workouts | `1851034083344145603` |
| 49 | Nutrition | `2214746930003329037` |
| 50 | Coaching & Messages | `2660539694892899208` |
| 51 | Client Management | `14557078187966128142` |
| 52 | CRM & Marketing | `14295455250109521956` |
| 53 | Settings & Profile | `1853405871396452861` |
| 54 | Analytics & Business | `11949277000781767716` |
| 55 | Franchise & Enterprise | `4368094376255775214` |
| 56 | Help, Social & Specialty | `9313239997448920445` |
| 57 | Landing Site | `2079243473916629379` |

---

## Next Steps

### Immediate (This Week)
1. **Review generated designs** - Ensure consistency with design system
2. **Configure API keys** - Create Supabase Edge Functions for secure key retrieval
3. **Begin Sprint 58** - Auth & Onboarding implementation

### Short-term (Next 4 Weeks)
1. Complete Sprints 58-61 (Auth, Dashboard, Workouts, Nutrition)
2. These are the highest-impact, user-facing pages
3. Voice and photo nutrition integration

### Medium-term (Weeks 5-12)
1. Complete remaining implementation sprints (62-69)
2. CRM, Settings, Analytics, Landing Site
3. Full feature parity with design mockups

---

## Critical Path

```
Design Generation (Complete)
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│                    IMPLEMENTATION PHASE                     │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Sprint 58 ─▶ Sprint 59 ─▶ Sprint 60 ─▶ Sprint 61        │
│  Auth          Dashboard    Workouts     Nutrition         │
│  (Week 1)      (Week 2)     (Week 2-3)   (Week 3-4)       │
│                                                            │
│                           ┌──────────────────────┐         │
│                           │ API Key Config       │         │
│                           │ (Parallel)           │         │
│                           │ - Deepgram           │         │
│                           │ - Nutritionix        │         │
│                           │ - Passio AI          │         │
│                           │ - Claude/GPT-4       │         │
│                           └──────────────────────┘         │
│                                                            │
│  Sprints 62-69 ─▶ Final Testing ─▶ App Store Submission  │
│  (Weeks 4-12)     (Week 13)        (Week 14)              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Design Fidelity | >95% | Pixel comparison with Stitch exports |
| Build Success | 100% | `npm run build` passes after each sprint |
| Test Coverage | >80% | Unit tests on new services |
| Accessibility | WCAG 2.1 AA | Automated + manual audit |
| Performance | Lighthouse >90 | Mobile performance score |
| Data Population | 100% | All pages show real data |

---

## Related Documentation

- `STITCH_DESIGN_SPRINTS.md` - Design sprint details
- `STITCH_IMPLEMENTATION_SPRINTS.md` - **Implementation tasks and data requirements**
- `DESIGN_SYSTEM.md` - Design tokens and patterns
- `GAP_ANALYSIS_2026.md` - Feature gaps to address
- `IMPLEMENTATION_ASSESSMENT.md` - Current status (68% complete)
