# FitOS Sprint Readiness Audit

**Generated:** March 2026
**Purpose:** Issue 21 deliverable — journey-by-journey audit of what's built, what's partially built, and what needs sprint planning.
**Scope:** All 100 user journeys across 4 roles (Client, Trainer, Owner, Admin Assistant) + all epics in EPICS_V2.md

**Readiness Key:**
- ✅ **Committed** — Component exists, backend wired, tests passing, ready for production
- 🔶 **Backend Gap** — Angular component exists but no corresponding Edge Function / Supabase table / Stripe webhook handler
- 🔷 **Roadmapped** — Sprint number assigned in backlog, stories written but not formally estimated or pulled
- 📋 **Backlog** — Feature identified, no sprint assigned, needs planning session
- ❌ **Not Started** — No component, no schema, no stories

---

## Part A: Client User Journeys

| Code | Title | Status | Gap / Notes |
|------|-------|--------|-------------|
| J-C01 | Register as Client | ✅ Committed | client-register.page exists |
| J-C02 | Complete Onboarding | ✅ Committed | onboarding.page with fitness assessment |
| J-C03 | Accept Trainer Invitation | ✅ Committed | invitation acceptance flow built |
| J-C04 | Connect Wearable Device | ✅ Committed | Terra API integration complete |
| J-C05 | View Today's Workout | ✅ Committed | home dashboard + workout cards |
| J-C06 | Execute Workout | ✅ Committed | active-workout.page built |
| J-C07 | Log Workout via Voice | ✅ Committed | Deepgram Nova-3 integration |
| J-C08 | View Workout History | ✅ Committed | workout-history.page |
| J-C09 | View Progress & PRs | ✅ Committed | progress.page + PR tracking |
| J-C10 | Log Food via Search | ✅ Committed | USDA FoodData Central search |
| J-C11 | Log Food via Voice | ✅ Committed | Deepgram voice → food parse |
| J-C12 | Log Food via Photo | ✅ Committed | Vision API photo nutrition |
| J-C13 | View Daily Nutrition Summary | ✅ Committed | macro bars, daily view |
| J-C14 | View Nutrition History & Trends | ✅ Committed | weekly/monthly heatmap |
| J-C15 | Message Trainer | ✅ Committed | conversations.page + chat.page |
| J-C16 | Submit Form Check Video | ✅ Committed | video upload + trainer review flow |
| J-C17 | View AI Coach | ✅ Committed | ai-coach.page + LangGraph backend |
| J-C18 | View Recovery Score | ✅ Committed | wearable HRV/sleep aggregation |
| J-C19 | Complete Wellness Check-in | ✅ Committed | daily check-in component |
| J-C20 | View Chronotype Assessment | ✅ Committed | chronotype quiz |
| J-C21 | View Streaks & Badges | ✅ Committed | gamification components |
| J-C22 | View Leaderboard | ✅ Committed | leaderboard.page (facility-scoped) |
| J-C23 | Celebrate Milestones | ✅ Committed | confetti + share flow |
| J-C24 | Edit Profile | ✅ Committed | profile settings |
| J-C25 | Manage Subscription | ✅ Committed | Stripe subscription management |
| J-C26 | Access Help Center | ✅ Committed | help-center.page |
| J-C27 | Set Notification Preferences | 🔶 Backend Gap | UI exists (notifications.page 17.4); no notification engine backend. **EP-23 needed.** |
| J-C28 | Manage Privacy Settings | ✅ Committed | GDPR/CCPA data controls |

**Client Summary:** 27/28 committed. 1 backend gap (notifications engine).

---

## Part B: Trainer User Journeys

| Code | Title | Status | Gap / Notes |
|------|-------|--------|-------------|
| J-T01 | Register as Trainer | ✅ Committed | trainer-register.page |
| J-T02 | Complete Business Setup | ✅ Committed | business setup onboarding |
| J-T03 | Connect Stripe Account | ✅ Committed | Stripe Connect flow |
| J-T04 | Setup Coach Brain AI | ✅ Committed | methodology upload, LangGraph |
| J-T05 | Invite New Client | ✅ Committed | invite flow + email |
| J-T06 | View Client List | ✅ Committed | client-list.page with status/activity |
| J-T07 | View Client Detail | ✅ Committed | client-detail.page |
| J-T08 | Set Client Nutrition Targets | ✅ Committed | set-nutrition-targets.page (Journey 5.6) |
| J-T09 | Assess Client Autonomy | ✅ Committed | autonomy scorer |
| J-T10 | Graduate Client | ✅ Committed | graduation flow |
| J-T11 | Create Exercise | ✅ Committed | exercise creator |
| J-T12 | Browse Exercise Library | ✅ Committed | exercise-library.page |
| J-T13 | Build Workout Template (Mode 3 only) | 🔶 Backend Gap | Manual builder exists. Modes 1-2,4-5 (AI automation, conversational, template library, save-as-template) not built. **EP-03 US-026a-e needed.** |
| J-T14 | Assign Workout to Client | ✅ Committed | workout assignment + scheduling |
| J-T15 | Review Client Workout History | ✅ Committed | prescribed vs actual view |
| J-T16 | Review Form Check Video | ✅ Committed | video review with timeline annotations |
| J-T17 | Send Video Feedback | ✅ Committed | timestamped feedback sender |
| J-T18 | Message Client | ✅ Committed | 1:1 messaging built |
| J-T18+ | Message Team (Trainer ↔ Trainer, Trainer ↔ Owner) | ❌ Not Started | Team tab in conversations.page not built. **EP-07 US-070-075 needed.** |
| J-T19 | Review AI Coach Responses | ✅ Committed | AI response review/approve |
| J-T20 | Manage Coach Brain Settings | ✅ Committed | Coach Brain configuration |
| J-T21 | View CRM Pipeline | ✅ Committed | CRM pipeline view |
| J-T22 | Manage Lead | ✅ Committed | lead CRUD + notes |
| J-T23 | Create Email Template | ✅ Committed | template editor with variable substitution |
| J-T24 | Setup Email Sequence | ✅ Committed | drip campaign builder |
| J-T25 | View CRM Analytics | ✅ Committed | conversion rates, pipeline analytics |
| J-T26 | View Client Analytics | ✅ Committed | aggregate progress + retention |
| J-T27 | View Revenue Dashboard | ✅ Committed | MRR + payment breakdown |
| J-T28 | Set Pricing Tiers | ✅ Committed | pricing tier configuration |
| J-T29 | View Payment History | ✅ Committed | transaction log |
| J-T30 | Clock In/Out for Sessions | 🔶 Backend Gap | time-tracking UI component exists; no Supabase `session_time_entries` table or payroll integration. **EP-21 Sprint 60 needed.** |
| J-T31 | View Session Schedule | 🔷 Roadmapped | Calendar UI Sprint 55; basic view built, multi-trainer side-by-side planned. |
| J-T32 | Log Session Notes | ✅ Committed | post-session notes on client record |
| J-T33 | Edit Business Profile | ✅ Committed | profile settings |
| J-T34 | Manage Integrations | 🔶 Backend Gap | integrations.page UI exists; QuickBooks (EP-27) and some integrations not wired. |
| J-T35 | Access Help Center | ✅ Committed | trainer-specific help content |
| J-T36 | Set Notification Preferences | 🔶 Backend Gap | UI exists; notification engine (EP-23) not built. |
| J-T37 (new) | Set Client Hydration Target | 📋 Backlog | Minor addition to set-nutrition-targets.page. **EP-05 US-051.** No sprint assigned. |

**Trainer Summary:** 27/36 committed. 4 backend gaps (workout builder modes, team messaging, clock-in payroll wiring, integrations). 2 roadmapped. 1 backlog (hydration).

---

## Part C: Gym Owner User Journeys

| Code | Title | Status | Gap / Notes |
|------|-------|--------|-------------|
| J-O01 | Register as Gym Owner | ✅ Committed | gym-owner-register.page |
| J-O02 | Complete Business Setup | ✅ Committed | facility onboarding |
| J-O03 | Connect Stripe Account | ✅ Committed | Stripe Connect for facility |
| J-O04 | Add Facility/Location | ✅ Committed | multi-location support |
| J-O05 | Invite Trainer | ✅ Committed | trainer invitation flow |
| J-O06 | View Trainer List | ✅ Committed | trainer management list |
| J-O07 | View Trainer Performance | ✅ Committed | trainer performance metrics |
| J-O08 | Manage Trainer Permissions | 🔷 Roadmapped | UI shell exists (trainer-permissions.page); full RBAC granularity planned Sprint 61. **EP-25.** |
| J-O09 | View All Members | ✅ Committed | cross-trainer member list |
| J-O10 | View Member Detail | ✅ Committed | member detail with trainer notes |
| J-O11 | View Member Retention | ✅ Committed | churn risk scoring + heatmap |
| J-O12 | View Revenue Dashboard | ✅ Committed | facility MRR, breakdown by trainer |
| J-O13 | View Financial Reports | ✅ Committed | P&L, export |
| J-O14 | Manage Pricing | ✅ Committed | facility-wide pricing configuration |
| J-O15 | View Payment History | ✅ Committed | transaction log |
| J-O16 | Setup Stripe & Payouts | ✅ Committed | Stripe Connect + payout config |
| J-O17 | View Facility Analytics | ✅ Committed | facility-wide metrics |
| J-O18 | View Client Outcomes | ✅ Committed | aggregate results |
| J-O19 | Export Reports | 🔶 Backend Gap | PDF/CSV export UI exists; accounting-friendly financial export (EP-11 US-110-113) not built for QuickBooks/CSV format. |
| J-O20 | View Facility CRM Pipeline | ✅ Committed | cross-trainer pipeline |
| J-O21 | Manage Marketing Campaigns | ✅ Committed | email campaigns + A/B testing |
| J-O22 | View Acquisition Analytics | ✅ Committed | CAC, LTV, conversion funnels |
| J-O23 | Manage Facility Settings | ✅ Committed | hours, branding, amenities |
| J-O24 | Manage Staff Accounts | 🔶 Backend Gap | UI shows trainer accounts; Admin Assistant management (invite, permission config) not built. **EP-25 US-250-254.** |
| J-O25 | Access Help Center | ✅ Committed | owner-specific help content |
| J-O26 | View Audit Logs | ✅ Committed | HIPAA-compliant access logs |
| J-O27 (new) | Invite Admin Assistant | 📋 Backlog | Not built. **EP-01 US-004, EP-25.** Priority: P0 for Admin Assistant launch. |
| J-O28 (new) | Configure Admin Assistant Permissions | 📋 Backlog | Not built. **EP-25 US-251-252.** Priority: P0 for Admin Assistant launch. |
| J-O29 (new) | Manage Waivers | 📋 Backlog | Not built. **EP-26 US-260-266.** Priority: P0 for public launch. |
| J-O30 (new) | View Financial Export (accounting) | 📋 Backlog | Not built. **EP-11 US-110-113.** Priority: P1. |

**Owner Summary:** 21/26 (original) committed. 3 backend gaps. 2 new P0 backlog journeys (Admin Assistant, Waivers). 1 new P1 backlog (Financial Export).

---

## Part D: Admin Assistant User Journeys

**Status: All 10 journeys not started (new role — no components exist)**

| Code | Title | Status | Sprint |
|------|-------|--------|--------|
| J-A01 | Accept Invitation & Create Account | ❌ Not Started | Needs sprint planning |
| J-A02 | Complete Admin Assistant Onboarding | ❌ Not Started | Needs sprint planning |
| J-A03 | Set Up Own Profile | ❌ Not Started | Needs sprint planning |
| J-A04 | View Multi-Trainer Schedule | 🔷 Roadmapped | Reuses EP-19 calendar (Sprint 55); scoped view needed |
| J-A05 | Book / Modify Appointment on Behalf of Trainer | 🔷 Roadmapped | EP-19 booking flow (Sprint 55-56); permission check needed |
| J-A06 | Check In Client for Appointment | 🔷 Roadmapped | EP-19 check-in (Sprint 56); permission-gated |
| J-A07 | Message Team Members | ❌ Not Started | Needs EP-07 team messaging (US-070-075) |
| J-A08 | Receive Task Assignments from Owner | ❌ Not Started | Needs EP-07 + task tagging |
| J-A09 | View Own Permissions | ❌ Not Started | Needs EP-25 RBAC read-only view |
| J-A10 | Set Notification Preferences | ❌ Not Started | Needs EP-23 notification engine |

**Admin Assistant Summary:** 0/10 committed. 3 roadmapped (reuse scheduling). 7 not started.

---

## Part E: New Epics — Sprint Planning Required

| Epic | Title | Current State | Action Required | Suggested Sprint |
|------|-------|---------------|-----------------|-----------------|
| EP-07 (extension) | Team Messaging | 1:1 trainer-client exists | Add conversation_type column; build Team tab UI; add facility_id FK | Sprint 62 |
| EP-11 (extension) | Financial Export | Reports exist; no accounting export | Build CSV export + accounting view (US-110-113) | Sprint 63 |
| EP-23 | Notification Engine | Preference UI exists; no engine | Build notification_templates table, Edge Function dispatcher, push sender | Sprint 62 |
| EP-25 | RBAC | Permission toggles in owner settings planned Sprint 61 | Elevate: add admin_assistants table, permission_overrides JSONB, RBAC settings screen, audit log | Sprint 61 (elevated) |
| EP-26 | Legal & Waivers | terms.page = platform terms only | New epic: waiver table, editor, signature flow, storage, management dashboard | Sprint 64 (P0 pre-launch) |
| EP-27 | QuickBooks Integration | None | New epic: QBO OAuth, webhook sync, account mapping (complex — needs QBO-certified dev) | Sprint 70+ |
| Admin Auth (EP-01 extension) | Admin Assistant Auth | No components | invitation.page, admin-assistant-register.page, onboarding | Sprint 62 |
| Admin Dashboard (new) | Admin Assistant Dashboard | No components | aa-dashboard.page, aa-tabs.page, schedule view scoped | Sprint 62 |

---

## Part F: Backend Wiring Audit — "Built" Components with Missing Backend

These components have Angular UI but the backend integration is incomplete or unverified:

| Component | UI Status | Backend Status | Action |
|-----------|-----------|----------------|--------|
| notifications.page | ✅ Built | ❌ No notification engine | EP-23 implementation |
| integrations.page (QuickBooks slot) | ✅ UI slot | ❌ No QBO OAuth | EP-27 Sprint 70+ |
| time-tracking (J-T30) | ✅ UI built | ❌ No session_time_entries table | Create migration + Edge Function; Sprint 60 |
| cancellation-policies.page | ✅ Built | 🔶 No grace threshold tracking | EP-19 US-093 rewrite; Sprint 57 |
| no-show fee charging | 🔶 Basic | 🔶 No free-threshold logic | EP-19 US-213 rewrite; Sprint 57 |
| admin-assistants invite | ❌ Not built | ❌ Not built | EP-01 US-004; Sprint 62 |
| waiver system | ❌ Not built | ❌ Not built | EP-26; Sprint 64 |
| RBAC settings screen | 🔶 Shell only | ❌ No permission_overrides logic | EP-25; Sprint 61 |
| team messaging tab | ❌ Not built | ❌ Not built | EP-07; Sprint 62 |
| financial accounting export | 🔶 Basic CSV | ❌ No accounting categories | EP-11 US-110-113; Sprint 63 |
| AI workout builder (mode 1,2,4,5) | ❌ Not built | ❌ Not built | EP-03 US-026a-e; Sprint 65+ |
| hydration goal setting | 🔶 Partial | 🔶 No hydration_target field | EP-05 US-051; minor addition |
| client-to-client connections | ❌ Not built | ❌ Not built | EP-13 US-130-133; Phase 6+ |

---

## Part G: Proposed Sprint Sequence for Outstanding Work

Based on the audit, here's the recommended sprint order for all unstarted/partial work:

### Pre-Launch P0 Blockers (must complete before public launch)

**Sprint 61 (already planned): EP-25 RBAC**
- Build admin_assistants table migration
- Build RBAC settings screen (permission_overrides config)
- Permission audit log
- Route guard enforcement for admin_assistant role

**Sprint 62 (new): Admin Assistant Core**
- EP-01 US-004: Admin Assistant invitation flow + registration
- Admin Assistant onboarding (J-A01, J-A02, J-A03)
- Admin Assistant dashboard + tabs
- EP-07 US-070-075: Team messaging (conversation_type column + Team tab)
- J-A07, J-A08: Team messaging for Admin Assistants

**Sprint 63 (new): Notifications + Financial Export**
- EP-23 US-230-243: Notification engine (templates table, Edge Function dispatcher, push integration)
- EP-11 US-110-113: Financial accounting export (CSV + accounting categories view)

**Sprint 64 (new): Waivers**
- EP-26 US-260-266: Full waiver system (table, editor, signature flow, storage, management dashboard)
- Required before public launch for legal protection

### P1 Improvements (post-launch, high value)

**Sprint 65 (new): AI Workout Builder Modes**
- EP-03 US-026a: Full AI automation mode
- EP-03 US-026b: AI-assisted conversational builder
- EP-03 US-026d: Template-based quick start
- EP-03 US-026e: Save as template

**Sprint 66 (new): No-Show Policy + Clock-In Payroll**
- EP-19 US-093 (rewrite): Configurable no-show grace threshold
- EP-19 US-213 (rewrite): Granular fee configuration
- EP-19 US-214: No-show fee waiver
- EP-21: Clock-in/out payroll wiring (session_time_entries table + payroll report)

**Sprint 67 (new): Hydration + Minor Gaps**
- EP-05 US-051: Hydration goal setting (minor addition to set-nutrition-targets.page)
- Backend wiring audit cleanup (time-tracking table, etc.)

### P2 Nice-to-Have (Phase 6+)

**Sprint 68+ (unscheduled):**
- EP-13 US-130-133: Client-to-client social connections
- EP-27: QuickBooks integration (needs external QuickBooks-certified developer)

---

## Summary Scorecard

| Category | Total | Committed | Backend Gap | Roadmapped | Backlog / Not Started |
|----------|-------|-----------|-------------|------------|----------------------|
| Client Journeys | 28 | 27 | 1 | 0 | 0 |
| Trainer Journeys | 37 | 27 | 4 | 2 | 4 |
| Owner Journeys | 30 | 21 | 3 | 1 | 5 |
| Admin Asst Journeys | 10 | 0 | 0 | 3 | 7 |
| New Epics (23-27) | — | 0 | 0 | 0 | 5 |
| **Total** | **105** | **75 (71%)** | **8 (8%)** | **6 (6%)** | **21 (20%)** |

**Immediate action items (P0):**
1. Plan Sprint 61 RBAC in detail (elevate from single story)
2. Plan Sprint 62 Admin Assistant Core
3. Plan Sprint 64 Waivers (legal protection needed pre-launch)
4. Wire notification preference UI to actual notification engine (EP-23)

**Owner input needed:**
- Confirm Admin Assistant is in scope for next launch milestone
- Confirm waiver system is P0 (legal counsel recommends before first paying client)
- Confirm QuickBooks priority (P2 → can be deferred to Phase 6)
- Confirm client-to-client social connections priority (P2 → Phase 6)
