# FitOS Epic Registry — Version 2.0

**Generated:** March 2026
**Status:** Authoritative — all prior epic numbering superseded by this document
**Scope:** All epics sequentially numbered EP-01 through EP-27 (no gaps)

---

## Epic Numbering Index

| ID | Title | Priority | Phase | Status |
|----|-------|----------|-------|--------|
| EP-01 | Authentication & Onboarding | P0 | 1 | Built |
| EP-02 | Client Profile & Account | P0 | 1 | Built |
| EP-03 | Workout Builder & Templates | P0 | 1 | Built |
| EP-04 | Workout Execution & Logging | P0 | 1 | Built |
| EP-05 | Nutrition Tracking & Goals | P0 | 1 | Built |
| EP-06 | Recovery & Wellness | P1 | 1 | Built |
| EP-07 | Messaging (Client ↔ Trainer + Team) | P0 | 1 | Partial |
| EP-08 | Exercise Library | P0 | 1 | Built |
| EP-09 | Progress & Analytics | P1 | 1 | Built |
| EP-10 | Payments & Stripe Connect | P0 | 1 | Built |
| EP-11 | Financial Reporting & Export | P1 | 2 | Partial |
| EP-12 | CRM & Email Marketing | P1 | 2 | Built |
| EP-13 | Social & Gamification | P2 | 2 | Partial |
| EP-14 | AI Coaching & JITAI | P1 | 2 | Built |
| EP-15 | Voice Logging | P1 | 2 | Built |
| EP-16 | Photo Nutrition AI | P1 | 2 | Built |
| EP-17 | Settings & Integrations | P1 | 2 | Built |
| EP-18 | Wearables (Terra API) | P1 | 2 | Built |
| EP-19 | Scheduling & Appointments | P0 | 5 | Partial |
| EP-20 | Pricing Options & Checkout POS | P0 | 5 | Partial |
| EP-21 | Payroll Calculation | P1 | 5 | Planned |
| EP-22 | Video Form Review | P1 | 2 | Built |
| EP-23 | Notification & Alert Engine | P0 | New | Planned |
| EP-24 | Client-to-Client Social Connections | P2 | New | Planned |
| EP-25 | Role-Based Access Control (RBAC) | P0 | 5 | Planned |
| EP-26 | Legal & Waivers | P0 | New | Planned |
| EP-27 | QuickBooks & Accounting Integration | P2 | New | Planned |

---

## EP-01: Authentication & Onboarding

**Status:** Built (gaps noted)
**Roles:** Client, Trainer, Gym Owner, Admin Assistant

### Issues Resolved
- **Issue 1:** Admin Assistant is a fourth auth role, invitation-only (not public registration)
- **Issue 13:** Owner auth grants composite Trainer+Owner access (no role switching)
- **Issue 17:** Admin Assistant registration is Owner-initiated invite flow

### User Stories

**US-001** — Client self-registration
*As a prospective client, I want to register with email/password so I can access my assigned workouts.*
AC: Email verified before access granted; role = 'client' assigned; redirects to client onboarding.

**US-002** — Trainer self-registration
*As a trainer, I want to register with business details so I can begin onboarding my clients.*
AC: Role = 'trainer'; redirects to trainer onboarding; Stripe Connect initiated.

**US-003** — Gym Owner self-registration
*As a gym owner, I want to register with facility details so I can manage my trainers and clients.*
AC: Role = 'gym_owner'; Owner inherits all Trainer permissions by default; facility record created.

**US-004** — Admin Assistant invitation-based registration
*As a gym owner, I want to invite an admin assistant by email so they can help manage my facility without full owner access.*
AC: Owner enters email in Team Management → system sends invitation with one-time setup link → Admin Assistant creates password → account linked to facility with default permissions → Owner receives confirmation.
Note: Admin Assistants CANNOT self-register. The registration path `/auth/register?role=admin_assistant` is blocked.

**US-005** — Client onboarding (role-specific)
*As a new client, I want a guided onboarding so I can complete my fitness profile and connect to my trainer.*
AC: Height/weight/goals captured; wearable connection offered; trainer connection flow if invite exists.

**US-006** — Trainer onboarding (role-specific)
*As a new trainer, I want guided business setup so I can configure my services and connect Stripe before inviting clients.*
AC: Business name/bio/certifications; Stripe Connect; Coach Brain AI intro; first client invite prompt.

**US-007** — Gym Owner onboarding (role-specific)
*As a new gym owner, I want guided facility setup so I can configure my business and invite my first trainer.*
AC: Facility name/address/hours; Stripe Connect; branding upload; first trainer invite prompt.
Note: Owner onboarding also offers the Trainer setup steps (since Owner = Trainer superset).

**US-008** — Admin Assistant onboarding (role-specific)
*As a new admin assistant, I want a brief onboarding that explains what I have access to and how to use the schedule.*
AC: Shows granted permissions (from Owner's RBAC config); schedule overview; how to check in clients; team messaging intro.

**US-009** — Multi-factor authentication
*As any user, I want to enable MFA so my account is protected.*
AC: TOTP and SMS options; MFA required for financial actions.

**US-010** — Social login (Google, Apple)
*As any user, I want to sign in with Google or Apple so I don't have to manage a password.*
AC: Available for Client, Trainer, Owner; NOT available for Admin Assistant invitation flow (email/password only for first login).

---

## EP-02: Client Profile & Account

**Status:** Built
**Roles:** Client (primary), Trainer (read), Owner (read)

No changes from v1. See existing implementation.

---

## EP-03: Workout Builder & Templates

**Status:** Built (AI modes need expansion)
**Roles:** Trainer (primary), Owner (via composite role)

### Issue 18: Five Workout Builder Modes

The existing workout-builder.page covers Mode 3 (manual form builder). Four additional modes are needed:

**US-026a** — Full AI automation mode
*As a trainer, I want the AI to generate a complete multi-week program for a client based on their goals, history, and recovery data so I can review and assign it in one step.*
AC: AI analyzes: client goal (hypertrophy/strength/fat loss/general), training history (volume, frequency, PRs), recent recovery scores, trainer's documented methodology. Produces: 4-12 week periodized program with daily workouts, sets/reps/weight %, rest periods, and progression notes. Trainer sees program in review mode; can edit any field; approves or rejects. Assigned to client with one tap after approval.

**US-026b** — AI-assisted conversational builder
*As a trainer, I want to describe a workout in natural language and have the AI fill in the form so I can build programs faster without switching mental modes.*
AC: Trainer types or dictates: "Upper body push day, 4 exercises, focusing on chest and shoulders, moderate intensity." AI populates: exercises from library matching description, default sets/reps/weight based on client's last logged session for each exercise, trainer's preferred rep ranges from Coach Brain methodology. Flags missing required fields (e.g., no rest period specified). Trainer confirms or adjusts any field. Time to complete: target <2 minutes.

**US-026c** — Manual form builder (existing)
*As a trainer, I want to build workouts field-by-field so I have precise control over every parameter.*
AC: Existing workout-builder.page; no changes needed.

**US-026d** — Template-based quick start
*As a trainer, I want to start from a pre-built program template and customize it for a specific client so I can onboard new clients quickly.*
AC: Template library accessible from builder; includes: FitOS system templates (Beginner Strength 3x/week, Intermediate Hypertrophy, General Cardio Base, Athletic Performance) and trainer's own saved templates; selecting a template pre-populates the builder; trainer can customize any field before assigning.

**US-026e** — Save program as template
*As a trainer, I want to save any completed program as a reusable template so I can apply it to future clients with minimal rework.*
AC: "Save as Template" option on any existing program; template stored in trainer's library (not client-specific); template appears in Mode 4 quick-start library; trainer can mark templates as public (shared to FitOS template marketplace) or private.

---

## EP-04: Workout Execution & Logging

**Status:** Built
**Roles:** Client (primary), Trainer (via composite Owner role)

No structural changes. Owner-as-Trainer (Issue 13) means Owner can also execute workouts as a client.

---

## EP-05: Nutrition Tracking & Goals

**Status:** Built
**Roles:** Client (logging), Trainer (goal setting), Owner (goal setting via composite role)

### Issue 10: Trainer nutrition goal assignment — already exists

The `set-nutrition-targets.page` (Journey 5.6) already allows trainers to set macro targets per client. This story documents the existing feature explicitly:

**US-050** — Trainer sets client nutrition targets (existing)
*As a trainer, I want to set daily macro targets (protein, carbs, fat, calories) for each client so their nutrition dashboard shows relevant goals.*
AC: Trainer selects client → Nutrition Targets → enters values → saved to client profile → client's nutrition dashboard shows targets immediately. Supported fields: calories, protein (g), carbs (g), fat (g), meal timing guidance.
**Sprint Status:** Committed (Journey 5.6 is built).

### Issue 11: Hydration goal setting

**US-051** — Trainer sets client hydration target (new)
*As a trainer, I want to set a daily water intake target for my client so their hydration tracking has a meaningful goal to measure against.*
AC: Hydration target field added to the existing `set-nutrition-targets.page` (or a linked "Hydration Goals" sub-section); unit toggle: oz or ml; default: 64 oz / 1,900 ml; client's quick-water.page shows goal progress bar using this target; if no target set, quick-water shows generic guidance ("aim for 8 glasses").
**Sprint Status:** Roadmapped (minor addition to existing page).

---

## EP-06: Recovery & Wellness

**Status:** Built
**Roles:** Client (primary), Trainer (read)

No structural changes.

---

## EP-07: Messaging (Client ↔ Trainer + Team)

**Status:** Partial — client↔trainer 1:1 is built; team messaging not built
**Roles:** All roles

### Issue 5: Internal team messaging

The existing `conversations.page` and `chat.page` support 1:1 trainer-client messaging. Team messaging requires:

**US-070** — Owner messages Trainer
*As a gym owner, I want to message my trainers directly so I can coordinate without leaving the app.*
AC: Conversations list has "Team" tab (separate from "Clients" tab); Owner → Trainer conversation starts from Team tab or Trainer list; messages stored in existing `messages` table with conversation_type = 'team'.

**US-071** — Trainer messages Trainer
*As a trainer, I want to message other trainers at my facility so we can coordinate handoffs and shared clients.*
AC: Available if facility has multiple trainers; Trainer sees "Team" tab in conversations list; only trainers at the same facility visible in team contacts.

**US-072** — Owner messages Admin Assistant
*As a gym owner, I want to message my admin assistant so I can assign tasks and coordinate.*
AC: Admin Assistants appear in Owner's Team tab; Owner → Admin Assistant conversations supported.

**US-073** — Admin Assistant messages Trainer
*As an admin assistant, I want to message trainers so I can coordinate scheduling and client communication on the Owner's behalf.*
AC: Admin Assistants see all facility trainers in their Messages view; conversation starts from their Messages screen.

**US-074** — Team conversation type filter
*As any user, I want the conversations list to separate client chats from team chats so I don't confuse operational messages with coaching messages.*
AC: Two tabs in conversations.page: "Clients" (trainer↔client, default tab) and "Team" (facility staff↔staff); tab selection persists across sessions; unread badge counts are separate per tab.

**US-075** — Group announcement channel
*As a gym owner, I want to send announcements to all staff at once so I don't have to message each person individually.*
AC: Owner can create a "All Team" broadcast message; recipients: all active trainers and admin assistants at the facility; displayed in each recipient's "Team" tab as a group thread; replies visible to all participants.

**Database change:** Add `conversation_type` column to conversations table: `'client_coaching' | 'team' | 'group_announcement'`. Add `facility_id` FK for team conversations to enforce facility-level isolation.

---

## EP-08: Exercise Library

**Status:** Built
**Roles:** Trainer (primary), Owner (via composite)

No changes.

---

## EP-09: Progress & Analytics

**Status:** Built
**Roles:** Client (own), Trainer (clients), Owner (facility-wide)

No changes.

---

## EP-10: Payments & Stripe Connect

**Status:** Built
**Roles:** Trainer (own revenue), Owner (facility-wide)

No changes.

---

## EP-11: Financial Reporting & Export

**Status:** Partial — analytics exist; accounting export not built
**Roles:** Owner (primary), Admin Assistant (if granted by Owner)

### Issue 8: Financial data export for accounting

**US-110** — Financial transactions view
*As a gym owner, I want to see all financial transactions in an accounting-friendly format so I can reconcile my books and prepare tax reports.*
AC: Date-range filter (daily/weekly/monthly/custom); transaction type filter: session fees, membership payments, package purchases, application fees, refunds, failed payments; columns: date, client name, trainer name, service type, gross amount, Stripe fee, net amount, Stripe transfer ID; default sort: date descending.

**US-111** — Export transactions to CSV
*As a gym owner, I want to export transaction data to CSV so I can import it into my accounting software.*
AC: Export button on Financial Transactions view; exports all rows in current filter; file named `fitos-transactions-{date-range}.csv`; columns match the view; includes Stripe transfer IDs for reconciliation.

**US-112** — Revenue category breakdown
*As a gym owner, I want to see revenue broken down by category (sessions, memberships, products, fees, refunds) so I can track which services drive my business.*
AC: Summary bar at top of Financial Transactions view shows totals per category for selected date range; can filter to single category.

**US-113** — Accounting-friendly P&L summary
*As a gym owner, I want a monthly P&L summary that shows gross revenue, Stripe fees, trainer payouts, and net to me so I have a clear picture of profitability.*
AC: Monthly view; Gross Revenue = all successful charges; Platform Fees = Stripe fees + FitOS subscription; Trainer Payouts = sum of all trainer Stripe transfers; Net = Gross - Fees - Payouts; exportable as PDF.

**Sprint Status:** Roadmapped (new stories, no existing component; Phase 5+).

---

## EP-12: CRM & Email Marketing

**Status:** Built
**Roles:** Trainer (primary), Owner (facility-wide view), Admin Assistant (if granted)

### Issue 4: Member Communications to Owner AND Trainer

The existing CRM epic (Journey 8.1-8.11) already grants access to Trainer and Owner. This entry documents that Admin Assistant access requires Owner to grant `canSendBulkMessages` permission. No new development needed for Trainer/Owner access — this was a PRD documentation error.

No new user stories required. Update cross-reference table to show: CRM & Marketing → Trainer ✓, Owner ✓, Admin Assistant (permission-gated).

---

## EP-13: Social & Gamification

**Status:** Partial — leaderboard/badges built; client-to-client connections not built
**Roles:** Client (primary)

### Issue 6: Client-to-client social connections

**US-130** — Client discovery within facility
*As a client, I want to discover other clients at my gym so I can connect with people who share my goals.*
AC: "Community" section visible within the existing Gamification/Social area; shows other clients at the same facility who have opted in to being discoverable; default: NOT discoverable (opt-in required); shows display name and current streak only (no health data); facility-scoped only (no cross-facility discovery).

**US-131** — Connection request flow
*As a client, I want to send and accept connection requests so I can build my gym community.*
AC: "Connect" button on discoverable client profiles; recipient sees connection request notification; can accept or decline; once connected: can see each other's public milestones (PRs, streaks); connected clients appear in a "Friends" leaderboard segment.

**US-132** — Client-to-client messaging
*As a connected client, I want to message my gym friends so we can motivate each other.*
AC: Messages tab shows "Friends" sub-tab (separate from Trainer); 1:1 messaging between connected clients using existing chat infrastructure; trainer cannot read client-to-client messages (privacy); facility-scoped.

**US-133** — Privacy controls for client discovery
*As a client, I want full control over my discoverability so I can choose whether to participate in community features.*
AC: Privacy Settings (Journey J-C28) includes: "Allow others to discover me" toggle (default OFF); "Show my streak on leaderboard" toggle (default ON for opt-in leaderboard); "Allow connection requests" toggle (default OFF); all three can be independently configured.

**Sprint Status:** Backlog (not yet scheduled; estimated Phase 6+).

---

## EP-14: AI Coaching & JITAI

**Status:** Built
**Roles:** Client (receives), Trainer (configures)

No changes.

---

## EP-15: Voice Logging

**Status:** Built
**Roles:** Client (primary)

No changes.

---

## EP-16: Photo Nutrition AI

**Status:** Built
**Roles:** Client (primary)

No changes.

---

## EP-17: Settings & Integrations

**Status:** Built
**Roles:** All roles (scoped)

No structural changes beyond what's now managed in EP-25 (RBAC) and EP-27 (QuickBooks).

---

## EP-18: Wearables (Terra API)

**Status:** Built
**Roles:** Client (primary)

**Reminder:** Per CLAUDE.md, NEVER display calorie burn from wearables. Only display: resting heart rate, HRV, sleep duration/quality, steps.

---

## EP-19: Scheduling & Appointments

**Status:** Partial (Sprints 54-57 complete per Phase 5 backlog)
**Roles:** Trainer, Owner, Admin Assistant

### Issue 20: Enhanced no-show policy configuration

The current US-093 (auto no-show) and US-213 (no-show fee charging) are too simplistic. Rewritten here:

**US-093** — Configurable auto no-show grace threshold (rewritten)
*As a gym owner, I want to configure how many no-shows a client gets for free before fees are charged so I can apply my business policy fairly.*
AC: Settings > Cancellation Policies > No-Show Configuration:
- "Free no-shows allowed per billing period" — number input (default: 0, meaning fees apply immediately)
- "Billing period" — monthly or per-enrollment-period
- "Count resets" toggle: on billing cycle renewal or never (accumulates)
- System tracks `no_show_count` per client per billing period in `client_service_records` table
- Fee charged only when `no_show_count > free_threshold`
- Notification sent to client showing: "You have X/Y free no-shows used this month. Further no-shows will incur a $Z fee."

**US-213** — Granular no-show/late-cancel fee configuration (rewritten)
*As a gym owner, I want to set separate no-show and late-cancel fees as either flat dollar amounts or full session cost so I can enforce my exact policy.*
AC: Settings > Cancellation Policies:
- No-show fee type: toggle between "Flat amount" ($ field) or "Full session cost" (auto-calculates from service type)
- Late-cancel fee type: same toggle
- Late-cancel window: minutes input (default 1440 = 24 hours)
- Applies to: service category selector (can have different policies per service type)
- Fee charged to Stripe card on file; if charge fails → posted to client ledger as debt
- Client receives itemized notification: "No-show fee of $X charged for [appointment] on [date]"
- Owner sees no-show fee revenue in Financial Reports (EP-11) as separate line item

**US-214** — No-show fee waiver by staff
*As a trainer or admin assistant, I want to waive a no-show fee for a client with a good reason so I can maintain client relationships.*
AC: On client's payment history, no-show fees show "Waive" button (requires permission `canProcessCheckout`); waiver requires reason note; creates audit log entry; waived fees appear as $0 in reports with "waived" annotation.

---

## EP-20: Pricing Options & Checkout POS

**Status:** Partial (Sprints 58-59)
**Roles:** Trainer, Owner, Admin Assistant

No new stories beyond Phase 5 backlog. Admin Assistant access requires Owner to grant `canProcessCheckout`.

---

## EP-21: Payroll Calculation

**Status:** Planned (Sprint 60-61)
**Roles:** Owner (primary), Admin Assistant (if granted)

No changes to existing Phase 5 backlog stories.

---

## EP-22: Video Form Review

**Status:** Built
**Roles:** Client (submits), Trainer (reviews), Owner (via composite)

No changes.

---

## EP-23: Notification & Alert Engine

**Status:** Planned (new epic)
**Priority:** P0 — core UX
**Roles:** All roles

### Issue 19: Comprehensive notification system

The existing `notifications.page` (17.4) handles preference toggles. This epic covers the notification engine and all alert types.

**US-230** — Client workout reminders
*As a client, I want push notifications for my scheduled workouts so I don't forget to train.*
AC: Notification sent N minutes before scheduled workout (N configurable in client preferences: 15/30/60 min); includes workout name, duration, quick link to start; cancellable from notification.

**US-231** — Client hydration reminders
*As a client with a hydration target set, I want periodic reminders to drink water so I stay on track.*
AC: Configurable reminder frequency (every 1/2/3 hours during configurable active hours); only sent if today's logged water < target; quiet hours respected; stops sending once daily target reached.

**US-232** — Client nutrition logging reminders
*As a client, I want mealtime reminders to log my food so I don't fall behind on nutrition tracking.*
AC: Three configurable reminder times (breakfast/lunch/dinner); only fires if no food logged in that meal slot; message varies: "Time to log lunch! Tap to add."

**US-233** — Client milestone celebrations
*As a client, I want to receive a notification when I achieve a PR or milestone so I feel recognized.*
AC: Triggers on: new PR (any exercise), streak milestone (7/30/100 days), goal achieved (weight goal, strength goal), first workout completed; notification includes confetti animation on open; option to share to social.

**US-234** — Client new message notification
*As a client, I want a notification when my trainer sends me a message so I respond promptly.*
AC: Push notification within 30 seconds of message sent; includes trainer name and message preview (first 50 chars); deep links to conversation.

**US-235** — Trainer session reminders
*As a trainer, I want reminders for my upcoming sessions so I'm prepared.*
AC: Configurable lead time (default 30 minutes); includes client name, session type, location; only for confirmed appointments.

**US-236** — Trainer no-show notification
*As a trainer, I want to be notified when a client no-shows so I can handle it immediately.*
AC: Fires after auto-no-show transition (configurable window); includes client name, appointment time; quick action: "Message Client" or "Waive Fee."

**US-237** — Trainer new form check notification
*As a trainer, I want to be notified when a client submits a form check video so I don't miss reviews.*
AC: Push within 60 seconds of video upload; includes client name, exercise name; deep links to review screen.

**US-238** — Trainer client milestone notification
*As a trainer, I want to know when my clients hit milestones so I can celebrate with them.*
AC: Same triggers as US-233 (PR, streak, goal); trainer receives parallel notification; quick action: "Send Congratulations Message."

**US-239** — Owner churn risk alert
*As a gym owner, I want to be alerted when a client is at risk of churning so I can intervene before they cancel.*
AC: Churn risk calculated weekly (low engagement: no workout in 14+ days, no login in 7+ days); notification batch sent Monday morning; includes client name, last activity date, suggested action.

**US-240** — Owner payment failure alert
*As a gym owner, I want immediate notification of payment failures so I can follow up with clients.*
AC: Fires within 5 minutes of Stripe webhook payment_failed event; includes client name, amount, failure reason; deep links to client payment history.

**US-241** — Admin Assistant schedule change notification
*As an admin assistant, I want to be notified of schedule changes so I can update clients.*
AC: Fires on appointment creation/modification/cancellation by any trainer; includes trainer name, client name, change type, new time; only if Admin Assistant has `canManageAllSchedules` permission.

**US-242** — Notification snooze
*As any user, I want to snooze all notifications for a set period so I can focus without distractions.*
AC: "Pause all notifications" option in notification settings; options: 1 hour, 4 hours, today, this week; snooze state persists across app restarts; shows "Notifications paused until [time]" banner in app.

**US-243** — Per-type notification toggles
*As any user, I want to independently enable or disable each notification type so I get only relevant alerts.*
AC: Notification settings page shows grouped toggles per category (Workouts, Nutrition, Messages, Milestones, Reminders); each type has: push notification toggle, in-app alert toggle, email digest toggle (daily/weekly/never).

**Database:** New `notification_templates` table (type, title_template, body_template, variables); `user_notification_preferences` table (user_id, notification_type, push_enabled, in_app_enabled, email_frequency, snooze_until); `notification_log` table (user_id, type, sent_at, opened_at, action_taken).

---

## EP-24: Client-to-Client Social Connections

**Status:** Planned (new epic)
**Priority:** P2
**Roles:** Client (primary)

See US-130 through US-133 in EP-13 above. These stories belong under EP-13 (Social & Gamification) as an extension. EP-24 is a cross-reference stub.

---

## EP-25: Role-Based Access Control (RBAC)

**Status:** Planned (new first-class epic — elevated from Sprint 61 single story)
**Priority:** P0 — needed for Admin Assistant launch
**Roles:** Owner (configures), Admin Assistant (subject to)

### Issue 9: Granular RBAC permission system

**US-250** — Permission group templates
*As a gym owner, I want to start from a permission template when setting up an admin assistant so I don't have to configure everything from scratch.*
AC: Three built-in templates: "Scheduling Focus" (calendar, check-in, messaging only), "Front Desk Full" (scheduling + checkout + CRM view), "Operations Manager" (all except financials and RBAC); Owner can apply template then customize; templates stored as JSONB presets.

**US-251** — Granular permission toggle per feature category
*As a gym owner, I want to enable or disable specific capabilities for each admin assistant so I can control exactly what they can access.*
AC: Permissions settings screen (Settings > Team > [Admin Assistant name] > Permissions) shows grouped toggles:
- Scheduling: Manage all schedules, Check in clients, Process checkout
- Client Data: View client list, View workout history, View nutrition data, View health data
- Financial: View revenue dashboard, Export financial data, Process refunds
- Marketing: View CRM pipeline, Send bulk messages, Access email templates
- Each toggle immediately updates `permission_overrides` JSONB for that user.

**US-252** — Per-user permission overrides
*As a gym owner, I want individual admin assistants to have different permissions so I can trust more experienced staff with more access.*
AC: Each admin assistant in the Team Management screen has their own permission configuration independent of other admin assistants; changes take effect on the admin assistant's next action (no re-login required — enforced server-side).

**US-253** — Permission change audit log
*As a gym owner, I want to see a history of permission changes so I can track what access was granted and when.*
AC: Audit log in Settings > Team > Audit; shows: date/time, changed by (always Owner), target user, permission name, old value → new value; last 12 months of history; exportable to CSV.

**US-254** — Route guard enforcement
*As a developer, I want permission checks enforced at both the UI and API level so admin assistants cannot bypass restrictions.*
AC: Angular route guards check `permission_overrides` from JWT claims; Supabase RLS policies check `admin_assistants.permission_overrides` for data access; Edge Functions validate permissions before processing any mutation; all permission checks are server-authoritative (UI toggles are for UX only).

**Sprint Status:** Roadmapped (Sprint 61 from Phase 5 backlog, elevated to separate epic; needs full sprint plan).

---

## EP-26: Legal & Waivers

**Status:** Planned (new epic — legal protection, P0 for launch)
**Priority:** P0
**Roles:** Owner (manages), Client (signs), Admin Assistant (views if permitted)

### Issue 12: Waiver/legal agreement system

**US-260** — Waiver template library
*As a gym owner, I want access to pre-built waiver templates so I don't have to draft legal language from scratch.*
AC: FitOS ships 4 system waiver templates (Liability Release, Assumption of Risk, Photo/Video Consent, Health Disclaimer); templates are starting points only with explicit "Consult your attorney" warning; Owner can view and base their custom waiver on these.

**US-261** — Custom waiver editor
*As a gym owner, I want to paste my own legal language into a waiver so I can use my attorney-provided documents.*
AC: Rich text editor (or plain text with formatting preserved); fields: waiver title, effective date, legal body text, signature type (checkbox vs. digital signature); preview mode shows client-facing view; can save multiple active waivers for different purposes.

**US-262** — Required signature during client onboarding
*As a gym owner, I want clients to sign my waiver before accessing any training features so my business is protected.*
AC: Owner toggles "Require waiver signature before feature access" per waiver; if enabled: client sees waiver screen on first login after it's published; client must sign/check before proceeding; unsigned clients are blocked from workouts, nutrition, and messaging screens; "waiver required" banner shown until signed.

**US-263** — Signature types
*As a gym owner, I want to choose between checkbox and digital signature so I can match my legal requirements.*
AC: Checkbox: "I agree to the terms above" with timestamp; Digital signature: finger-draw or typed name canvas; both include: signer name, email, IP address, timestamp, app version, device type; all metadata stored for legal validity.

**US-264** — Signed waiver storage
*As a gym owner, I want signed waivers stored securely with timestamps so I have legal documentation if needed.*
AC: Signed waivers stored in Supabase Storage (encrypted at rest); record in `waiver_signatures` table: waiver_id, signer_id, signed_at, signature_data_url, ip_address, metadata JSONB; Owner can view/download any client's signed waiver; stored for minimum 7 years (configurable).

**US-265** — Waiver management dashboard
*As a gym owner, I want to see which clients have and haven't signed each waiver so I can follow up with unsigned clients.*
AC: Settings > Waivers > [Waiver Name] > Signatures tab; table: client name, status (Signed/Pending/Exempt), signed date, download link; bulk export; filter: unsigned clients; "Send Reminder" button → sends notification to unsigned clients.

**US-266** — Waiver re-signature on update
*As a gym owner, I want clients to re-sign when I update waiver language so they always consent to current terms.*
AC: When Owner publishes a new waiver version (major change toggle), all existing signatures are marked "outdated"; clients are prompted to re-sign on next login; old signed versions remain in archive.

**Database:**
```sql
CREATE TABLE waivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  title TEXT NOT NULL,
  body_html TEXT NOT NULL,
  signature_type TEXT CHECK (signature_type IN ('checkbox', 'digital')) DEFAULT 'checkbox',
  is_required BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE waiver_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  waiver_id UUID NOT NULL REFERENCES waivers(id),
  signer_id UUID NOT NULL REFERENCES profiles(id),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signature_data TEXT,   -- typed name or base64 canvas PNG
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'
);
```

**Sprint Status:** Backlog (no sprint assigned; should be prioritized before public launch).

---

## EP-27: QuickBooks & Accounting Integration

**Status:** Planned (new epic)
**Priority:** P2 (Phase 5+)
**Roles:** Owner (primary), Admin Assistant (if granted `canExportFinancialData`)

### Issue 7: QuickBooks integration with Stripe data

**US-270** — QuickBooks OAuth connection
*As a gym owner, I want to connect my QuickBooks Online account so FitOS can sync transaction data automatically.*
AC: Settings > Integrations > QuickBooks Online; OAuth 2.0 flow (Intuit OAuth); connection stores refresh token securely in Supabase secrets; connection status shown; disconnect option available.

**US-271** — Automatic transaction sync
*As a gym owner, I want new transactions to automatically sync to QuickBooks so I don't have to manually export.*
AC: Stripe webhook → Edge Function → create QuickBooks journal entry; mapping: session fees → "Personal Training Revenue" account, membership fees → "Membership Revenue" account, Stripe fees → "Payment Processing Fees" expense, trainer payouts → "Contractor Expense" account; accounts mappable by Owner in settings.

**US-272** — QuickBooks account mapping
*As a gym owner, I want to configure which QuickBooks accounts FitOS uses for each transaction type so my chart of accounts stays organized.*
AC: Settings > Integrations > QuickBooks > Account Mapping; dropdowns populated from Owner's actual QBO accounts (fetched via API); separate mappings for: session revenue, membership revenue, package revenue, refunds, Stripe fees, trainer payouts.

**US-273** — Sync status and reconciliation view
*As a gym owner, I want to see which transactions have synced to QuickBooks and fix any errors so my books are always accurate.*
AC: Settings > Integrations > QuickBooks > Sync Status; table: transaction date, description, amount, sync status (synced/pending/error), QBO transaction ID; "Retry" button on failed syncs; "Last synced at" timestamp.

**Note:** QuickBooks integration complexity is high. Stripe Connect marketplace integration with QBO requires careful handling of application fees vs. destination charges. Recommend engaging a QBO-certified developer for this feature. Phase 5+ priority.

**Sprint Status:** Backlog (not scheduled; Phase 6+).

---

## Issue 2: Class/Instructor Management → Owner Responsibility

**Resolution:** No new epic needed. The Phase 5 scheduling backlog (EP-19) assigns all class and schedule management to the Trainer and Owner roles. There is no standalone "Studio Manager" journey for class management — the Owner, using their composite Trainer+Owner access, manages class/instructor scheduling through the existing scheduling system (EP-19) and trainer management screen (J-O05 through J-O08).

If Admin Assistants need to manage classes on behalf of the Owner, this is controlled by the `canManageAllSchedules` permission in EP-25.

---

## Issue 15: Sprint Readiness Status

| Epic | Status | Sprint | Readiness |
|------|--------|--------|-----------|
| EP-01 Auth | Built | Done | Committed — gaps tracked above |
| EP-02 Client Profile | Built | Done | Committed |
| EP-03 Workout Builder | Built (modes 1-2,4-5 missing) | New | Roadmapped |
| EP-04 Workout Execution | Built | Done | Committed |
| EP-05 Nutrition Goals | Built + Issue 11 | New | Roadmapped (Issue 11 minor) |
| EP-06 Recovery | Built | Done | Committed |
| EP-07 Messaging | Partial (team messaging missing) | New | Roadmapped |
| EP-08 Exercise Library | Built | Done | Committed |
| EP-09 Analytics | Built | Done | Committed |
| EP-10 Payments | Built | Done | Committed |
| EP-11 Financial Export | Partial | New | Roadmapped |
| EP-12 CRM | Built | Done | Committed |
| EP-13 Social | Partial (client connections missing) | New | Backlog |
| EP-14 AI Coaching | Built | Done | Committed |
| EP-15 Voice | Built | Done | Committed |
| EP-16 Photo Nutrition | Built | Done | Committed |
| EP-17 Settings | Built | Done | Committed |
| EP-18 Wearables | Built | Done | Committed |
| EP-19 Scheduling | Partial | Sprints 54-57 | Committed |
| EP-20 Pricing/POS | Partial | Sprints 58-59 | Committed |
| EP-21 Payroll | Planned | Sprint 60 | Roadmapped |
| EP-22 Video Review | Built | Done | Committed |
| EP-23 Notifications | Planned | New | Roadmapped |
| EP-24 Social Connections | Planned | New | Backlog |
| EP-25 RBAC | Planned | Sprint 61 | Roadmapped |
| EP-26 Waivers | Planned | New | Backlog (P0 — pre-launch) |
| EP-27 QuickBooks | Planned | New | Backlog (Phase 6+) |

**Readiness key:**
- **Committed** — Stories written, estimated, sprint assigned, ready to pull
- **Roadmapped** — Sprint number assigned, stories exist but not yet formally estimated
- **Backlog** — No sprint assigned; needs sprint planning session
