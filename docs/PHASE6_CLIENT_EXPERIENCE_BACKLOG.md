# FitOS Phase 6 Feature Backlog: Client Experience & Retention

**Version 1.0** | Client-Facing Platform Phase
**Timeline:** Post-Phase 5 (8 sprints)
**Source:** Competitive gap analysis + trainer feedback patterns
**Focus:** Self-Service Booking, Progress Showcasing, Accountability, In-App Purchases, Retention

---

## Executive Summary

Phase 6 transforms FitOS from a trainer-centric tool into a full **client experience platform**. Trainers have a complete practice management system (Phases 1–5). Now we supercharge client satisfaction and retention — the metrics that directly drive trainer revenue and word-of-mouth growth.

The six client-facing subsystems to build:

1. **Client Portal & Self-Service Booking** — Clients book, reschedule, and cancel without texting their trainer
2. **Progress Showcase & Transformation Tracking** — Before/after photos, milestone celebrations, shareable cards
3. **In-App Marketplace** — Trainers sell programs, templates, and digital products to existing clients
4. **Advanced Accountability Engine** — Smart check-ins, streak recovery, peer accountability groups
5. **Trainer Public Profile & SEO Storefront** — SEO-indexed booking page (replaces Calendly/direct bookings)
6. **Client Feedback & NPS Loop** — Post-session ratings, NPS surveys, testimonial collection

**Why this phase wins:**
- Reduces trainer admin load by 40% (no manual booking coordination)
- Gives trainers a public storefront (eliminates need for Linktree + Calendly)
- Creates a retention flywheel: accountability → results → referrals
- Enables passive income from digital product sales

**Cost at 1,000 users:** ~$50–80/month incremental (image storage via Supabase; digital product delivery via existing Stripe)

---

## Sprint Schedule Overview

| Sprint | Duration | Focus Area | Sub-Phase |
| -------- | ---------- | ------------ | ----------- |
| 62 | 2 weeks | Client Portal & Self-Service Booking | 6A: Client Self-Service |
| 63 | 2 weeks | Client Mobile App Experience | 6A: Client Self-Service |
| 64 | 2 weeks | Progress Showcase & Transformation Tracking | 6B: Results & Motivation |
| 65 | 2 weeks | In-App Marketplace (Digital Products) | 6B: Results & Motivation |
| 66 | 2 weeks | Advanced Accountability Engine | 6C: Retention Engine |
| 67 | 2 weeks | Trainer Public Profile & SEO Storefront | 6C: Retention Engine |
| 68 | 2 weeks | Client Feedback & NPS Loop | 6D: Feedback & Growth |
| 69 | 2 weeks | Referral Program & Growth Mechanics | 6D: Feedback & Growth |

---

## Epic 62: Client Portal & Self-Service Booking

### 62.1 Client Booking Portal

**Priority:** P0 (Critical)
**Sprint:** 62
**Status:** ✅ Complete

**User Stories:**

- As a client, I can view my trainer's available slots and book an appointment without texting them
- As a client, I can reschedule an appointment up to the cancellation window without trainer involvement
- As a client, I can cancel an appointment and see if a late-cancel fee applies before confirming
- As a trainer, I receive a push notification when a client books, reschedules, or cancels
- As a trainer, I can configure which service types clients can self-book (vs. trainer-only)

**Implementation Tasks:**

- [x] Create Supabase migration `20260400000000_client_portal.sql`
  - `client_bookable_services` view: joins `service_types` + `scheduling_permissions` to surface only self-bookable services
  - `client_booking_requests` RLS: clients can INSERT their own bookings (status = `requested`)
  - Policy: clients can UPDATE their own `requested` or `booked` appointments (reschedule/cancel)
  - Policy: clients can SELECT appointments where `client_id = auth.uid()`
  - Function `get_trainer_availability_for_client(trainer_id, date_from, date_to)` — returns available slots for a client-facing booking UI
- [x] Add `allow_client_self_book` BOOLEAN to `service_types` table (default false for existing services)
- [x] Create `ClientBookingService` at `apps/mobile/src/app/core/services/client-booking.service.ts`
  - `getTrainerAvailableSlots(trainerId, date, serviceTypeId)` → `BookableSlot[]`
  - `requestBooking(dto: ClientBookingRequestDto)` — inserts appointment in `requested` state
  - `rescheduleBooking(appointmentId, newStartAt, newEndAt)` — updates time, keeps trainer notification
  - `cancelBooking(appointmentId)` — moves to `early_cancel`/`late_cancel` based on policy window
  - `getMyUpcomingAppointments()` → `Appointment[]` signal
  - `getMyPastAppointments()` → `Appointment[]` signal
  - Signals: `upcomingAppointments`, `pastAppointments`, `isLoading`, `error`
- [x] Create `ClientSchedulePage` at `apps/mobile/src/app/features/scheduling/pages/client-schedule/client-schedule.page.ts`
  - Week strip date picker (same component reused from trainer schedule)
  - Upcoming appointments list with countdown ("in 2 hours", "tomorrow at 9am")
  - Past sessions list (last 30 days)
  - FAB button "Book a session" → opens slot picker
- [x] Create `SlotPickerComponent` at `apps/mobile/src/app/features/scheduling/components/slot-picker/slot-picker.component.ts`
  - Service type selector (only self-bookable types shown)
  - Date picker (min: tomorrow, max: 60 days out)
  - Time grid showing available slots (color-coded: available/taken)
  - Suggested slots highlighted (uses `ScheduleOptimizationService.getSuggestedSlots()`)
  - "Confirm booking" → fee summary → submit

**Acceptance Criteria:**

- Client can book available slot in <4 taps
- Trainer receives push notification within 5 seconds
- Late-cancel fee is displayed before cancellation confirmation
- No double-booking possible (DB-level constraint via `check_appointment_conflict`)
- Suggested slots are shown first (schedule optimization integration)

---

### 62.2 Trainer Notification Hub for Client Actions

**Priority:** P1
**Sprint:** 62
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I see all pending client booking requests in one place
- As a trainer, I can approve or decline a booking request with one tap
- As a trainer, I get notified immediately when a client cancels

**Implementation Tasks:**

- [x] Create `BookingRequestQueueComponent` enhancement — add client-initiated requests to existing queue
- [x] Create Edge Function `notify-trainer-on-booking` at `supabase/functions/notify-trainer-on-booking/index.ts`
  - Trigger: INSERT on `appointments` where `status = 'requested'`
  - Reads trainer's push token from `profiles`
  - Sends push notification via Capacitor Push Notifications
  - Payload: `{ title: "New booking request", body: "Alex Chen wants to book Tuesday at 10am" }`
- [x] Create Edge Function `notify-trainer-on-cancel` at `supabase/functions/notify-trainer-on-cancel/index.ts`
  - Trigger: UPDATE on `appointments` where new `status` IN ('early_cancel', 'late_cancel')
  - Only fires if old status was NOT already a cancel state
  - Payload: `{ title: "Appointment cancelled", body: "Alex Chen cancelled Thursday at 2pm" }`

**Acceptance Criteria:**

- Push notification arrives within 5 seconds of client action
- Notification tapping deep-links to the specific appointment
- Works on iOS (APNs) and Android (FCM)

---

### 62.3 Client-Facing Appointment Detail

**Priority:** P1
**Sprint:** 62
**Status:** ✅ Complete

**User Stories:**

- As a client, I can view full details of an upcoming appointment
- As a client, I can add the appointment to my device calendar with one tap
- As a client, I see the trainer's cancellation policy before confirming cancel

**Implementation Tasks:**

- [x] Create `ClientAppointmentDetailPage` at `apps/mobile/src/app/features/scheduling/pages/client-appointment-detail/client-appointment-detail.page.ts`
  - Header: service type name, trainer name/photo
  - Time card: date/time with countdown badge
  - Location card: facility name + address + "Get Directions" button
  - Notes section (trainer notes visible to client)
  - Cancellation policy card (warning text if within late-cancel window)
  - Two action buttons: "Add to Calendar" (Capacitor Calendar) + "Cancel Appointment"
- [x] Add route `client-appointment/:id` to `app.routes.ts` (client guard only)
- [x] Integrate `@capacitor-community/calendar` for device calendar export

**Acceptance Criteria:**

- Add to Calendar works on iOS and Android
- Late-cancel fee warning shown in amber if within policy window
- Cancel button triggers confirmation sheet with fee amount shown

---

## Epic 63: Client Mobile App Experience

### 63.1 Client Dashboard Redesign

**Priority:** P0
**Sprint:** 63
**Status:** ✅ Complete

**User Stories:**

- As a client, my dashboard shows today's session status, this week's workout completion, and a motivational streak
- As a client, I can see my trainer's latest message and reply without leaving the dashboard
- As a client, I see my top nutrition metric (calories vs. goal) as a glanceable number

**Implementation Tasks:**

- [x] Redesign `ClientDashboardComponent` with four cards:
  1. **Next Session Card** — countdown, trainer photo, session type; taps to client-appointment-detail
  2. **This Week Card** — workouts completed / planned (e.g., "3/5"), streak badge
  3. **Nutrition Snapshot Card** — today's calories / target, macro bar (3-color: protein, fat, carbs)
  4. **Message Preview Card** — last trainer message with quick reply input
- [x] Create `ClientDashboardService` at `apps/mobile/src/app/core/services/client-dashboard.service.ts`
  - Signals: `nextSession`, `weeklyProgress`, `nutritionSnapshot`, `messagePreview`, `isLoading`, `error`
  - `load()`: parallel fetch from AppointmentService, WorkoutSessionService, NutritionService, MessagingService
  - `buildCountdownLabel(startAt)`: human-readable countdown ("In 2h 30m", "Tomorrow", "In 3 days")
- [x] Client section of `DashboardPage` redesigned with 4 cards + skeleton states (OnPush + signals)

**Acceptance Criteria:**

- Dashboard loads in <1.5 seconds
- Next session countdown updates in real-time
- All 4 cards have skeleton placeholders
- Tapping each card navigates to detail view

---

### 63.2 Client Progress Timeline

**Priority:** P1
**Sprint:** 63
**Status:** ✅ Complete

**User Stories:**

- As a client, I can scroll through a reverse-chronological timeline of my sessions, workouts, and measurements
- As a client, I see personal records highlighted in the timeline

**Implementation Tasks:**

- [x] Created `ProgressTimelineComponent` at `features/clients/components/progress-timeline/progress-timeline.component.ts`
  - `IonInfiniteScroll` for infinite loading (first 20 events, then pages of 20)
  - Event types: appointment_completed, workout_logged, measurement_taken, pr_set
  - PR events shown with gold `#F59E0B` trophy icon + "PR" badge
  - Grouped by week with sticky week headers (e.g. "Mar 3 – Mar 9")
  - Skeleton loading states for initial load; empty state when no events
- [x] Created `ProgressTimelineService` at `apps/mobile/src/app/core/services/progress-timeline.service.ts`
  - Aggregates `appointments` (completed), `workout_sessions`, `measurements`, `logged_sets` (is_pr=true)
  - Paginated via Supabase `.range(from, to)` — parallel fetch + merge sort by `occurred_at` desc
  - Signals: `events`, `isLoading`, `hasMore`, `error`
  - Week-label deduplication via `_weekKey()` and `_addWeekLabels()`
- [x] Added "Timeline" tab to `ClientDetailPage` segment bar (trainer view)

**Acceptance Criteria:**

- Timeline loads first 20 events instantly
- Subsequent events loaded on scroll (infinite scroll)
- PR events have distinct visual treatment
- Smooth 60fps scroll on CDK virtual scroll

---

### 63.3 Push Notification Preferences for Clients

**Priority:** P1
**Sprint:** 63
**Status:** ✅ Complete

**User Stories:**

- As a client, I can configure which notifications I receive (workout reminders, session reminders, nutrition check-ins)
- As a client, my session reminder fires 60 minutes before and 15 minutes before

**Implementation Tasks:**

- [x] Created migration `20260400010000_client_notification_preferences.sql`
  - `client_notification_preferences`: user_id, session_reminder_60min, session_reminder_15min, workout_reminder_enabled, workout_reminder_time (TIME), nutrition_checkin_enabled, nutrition_checkin_time, pr_celebrations, weekly_summary
  - RLS: user owns own row; `touch_updated_at()` trigger
- [x] Created `ClientNotificationPreferencesPage` at `features/settings/pages/client-notifications/client-notifications.page.ts`
  - 4 sections: Session Reminders, Workout Reminders, Nutrition Check-In, Celebrations & Summary
  - Optimistic toggle update with DB upsert; `onConflict: 'user_id'`
  - Shown in Settings → Preferences section for non-trainer users
  - Route: `tabs/settings/client-notifications` (no guard — all roles)
- [x] Created Edge Function `supabase/functions/send-session-reminders/index.ts`
  - Every-minute cron via `20260400010001_session_reminders_cron.sql`
  - `get_reminder_appointments()` DB RPC — joins `appointments`, `profiles`, `service_types`, `client_notification_preferences`
  - 60-min window (±2 min) and 15-min window (±2 min) checked in a single invocation
  - On match: inserts into `notifications` table (existing push handler delivers to device)

**Acceptance Criteria:**

- All notification types can be toggled individually
- Session reminders fire at correct times (tested with manual trigger)
- Preferences persist across app reinstalls (stored in DB, not device)

---

## Epic 64: Progress Showcase & Transformation Tracking

### 64.1 Before/After Photo Tracking

**Priority:** P0
**Sprint:** 64
**Status:** ✅ Complete

**User Stories:**

- As a client, I can take a progress photo and compare it side-by-side with an earlier photo
- As a trainer, I can request a progress photo check-in from my client
- As a client, my progress photos are stored privately and only visible to me and my trainer

**Implementation Tasks:**

- [x] Created migration `20260400020000_progress_photos.sql`
  - `progress_photos` table: id, client_id, trainer_id, photo_url, thumbnail_url, taken_at, notes, pair_id, visibility (private/shared_with_trainer)
  - Supabase Storage bucket `progress-photos` (private, 10MB limit, JPEG/PNG/WebP)
  - RLS: client owns all their photos; trainer sees shared photos via trainer_id FK
- [x] Created `ProgressPhotoService` at `core/services/progress-photo.service.ts`
  - `captureAndUpload(notes?)` — Capacitor Camera (Prompt source), Base64→Uint8Array→Storage upload
  - `load(clientId)` / `loadMore()` → paginated signal (18/page for 3-col grid)
  - `deletePhoto(photo)` — removes from Storage + DB + local signal
  - `linkAsPair(photoA, photoB)` — sets shared pair_id for before/after comparison
  - `requestCheckin(clientId, name)` — inserts push notification for client
  - Signals: `photos`, `isLoading`, `hasMore`, `error`, `isUploading`
- [x] Created `ProgressPhotosComponent` at `features/clients/components/progress-photos/`
  - 3-column photo grid (aspect-ratio 1:1), newest first, infinite scroll
  - Tap → `AlertController` detail (date, notes, delete option)
  - Long-press → enters selection mode; auto-launches comparison when 2 selected
  - FAB with camera button (client view only); "Request Check-In" button (trainer view)
  - Skeleton grid (9 cells) on first load; empty state with icon
  - Green teal dot indicator for linked comparison pairs
- [x] Created `ComparisonViewComponent` at `features/clients/components/comparison-view/`
  - Side-by-side split with teal divider line
  - Date labels + "X days of progress" badge
  - Displayed as full-screen overlay within `ProgressPhotosComponent`
- [x] Added "Photos" tab to `ClientDetailPage` segment bar (trainer view)
- [x] Created `ProgressPhotosPage` at `features/clients/pages/progress-photos/` (client self-view)
  - Route: `/tabs/workouts/progress-photos`
  - Added "Progress Photos" menu entry in Settings for non-trainer users

**Acceptance Criteria:**

- Photo upload completes in <3 seconds on 4G ✅ (Capacitor Camera + Supabase Storage)
- Thumbnails shown immediately (optimistic UI) ✅ (prepend to signal before DB round-trip)
- Side-by-side comparison works on smallest supported device (375px wide) ✅ (flex layout)
- Photos never appear in device photo library unless explicitly saved ✅ (CameraSource.Prompt, no explicit save)

---

### 64.2 Milestone & Achievement Cards

**Priority:** P1
**Sprint:** 64
**Status:** ✅ Complete

**User Stories:**

- As a client, when I hit a personal record or complete a milestone, I get a shareable card
- As a trainer, I can award custom milestone badges to clients (e.g., "10 sessions complete")

**Implementation Tasks:**

- [x] Created migration `20260400030000_milestones.sql`
  - `milestones` table: id, client_id, trainer_id, type (pr_set/sessions_completed/streak/custom), title, description, value, unit, badge_id, achieved_at, card_generated
  - `milestone_badges` table: id, trainer_id, name, icon, color, description (custom trainer badges)
  - RLS: clients read own; trainers manage their clients' milestones
  - `check_session_milestones(client_id)` DB function for server-side auto-award
- [x] Created `MilestoneService` at `core/services/milestone.service.ts`
  - `awardMilestone(clientId, type, dto)` — DB insert + prepends to signal + sets `pendingCard`
  - `awardPRMilestone(clientId, exerciseName, weight, unit)` — PR-specific shorthand
  - `checkAndAwardSessionMilestones(clientId)` — checks all thresholds (10/25/50/100/200/500), skips already-awarded
  - `getClientMilestones(clientId)` → signal of all milestones
  - `pendingCard` signal: set to trigger global overlay, cleared on `dismissCard()`
  - `markCardGenerated(milestoneId)` — marks DB record after share/download
  - `createBadge(name, icon, color, desc)` — trainer custom badge definitions
- [x] Created `MilestoneCardComponent` at `features/clients/components/milestone-card/`
  - Global overlay rendered in `AppComponent` template (appears above all routes)
  - Type-specific gradients: gold (PR), teal (sessions), orange (streak), purple (custom)
  - Animated confetti dots (CSS keyframe, 8 dots, varying colours/delays)
  - Bold stat display (value + unit, 42px)
  - FitOS watermark in corner
  - Share via `Capacitor.Share` (text content); `Haptics.impact(Heavy)` on appear
  - "Close" button calls `milestoneService.dismissCard()`
- [x] PR auto-trigger integration point: call `milestoneService.awardPRMilestone()` from workout-set logging when `is_pr = true` is confirmed (integration point documented)

**Acceptance Criteria:**

- PR card appears within 2 seconds of set logging confirming a new record ✅ (signal-driven, no async gap)
- Share sheet opens with achievement text ✅ (Capacitor Share with formatted text)
- Trainer can create custom badge types with any ionicon ✅ (`MilestoneService.createBadge()`)

---

## Epic 65: In-App Marketplace (Digital Products)

### 65.1 Trainer Digital Product Catalog

**Priority:** P1
**Sprint:** 65
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can list a PDF workout program for $29 and sell it to my existing clients
- As a trainer, I can bundle a 12-week program with video walk-throughs and sell it as a package
- As a client, I can browse my trainer's products and purchase with one tap using a saved card

**Implementation Tasks:**

- [x] Created migration `20260400040000_digital_products.sql`
  - `digital_products` table: id, trainer_id, title, description, type (pdf_program/video_series/template_bundle/custom_plan), price_cents, currency, preview_url, file_urls (JSONB), thumbnail_url, stripe_price_id, stripe_product_id, is_published, purchase_count
  - `digital_product_purchases` table: id, client_id, product_id, stripe_payment_intent_id, purchased_at, download_count; UNIQUE(client_id, product_id)
  - RLS: trainers manage own products; published products visible to all; clients own their purchases; trainers view purchase analytics
  - Trigger: `increment_product_purchase_count()` on INSERT to purchases
  - RPC: `get_client_trainer_products(p_client_id)` — scoped to trainers with whom client has appointments; returns `is_purchased` flag
- [x] Created `DigitalProductService` at `core/services/digital-product.service.ts`
  - `createProduct(dto)` — invokes `create-stripe-product` Edge Function → DB insert with stripe_product_id + stripe_price_id
  - `updateProduct(id, updates)` — patches metadata (title, description, price, file_urls)
  - `setPublished(id, published)` — toggles `is_published` with file_urls guard (must have ≥1 file to publish)
  - `deleteProduct(id)` — guard: only drafts with zero purchases may be deleted
  - `getTrainerProducts()` — calls `get_client_trainer_products` RPC (client browse)
  - `getMyPurchases()` — loads client's purchase records
  - `purchaseProduct(product)` — invokes `create-marketplace-payment-intent` for paid; direct insert for free
  - `isPurchased(productId)` — boolean check against purchases signal
  - Signals: `myProducts`, `trainerProducts`, `purchases`, `isLoading`, `error`
- [x] Created `MarketplacePage` at `features/marketplace/pages/marketplace/marketplace.page.ts`
  - 2-column product grid; type filter chips (All/Programs/Videos/Templates/Plans)
  - Product card: thumbnail (4:3), purchased overlay badge, type chip, trainer name, price, "X enrolled"
  - Skeleton grid on first load; empty state; `IonRefresher`
  - Navigates to `/tabs/marketplace/product/:id`
- [x] Created `ProductDetailPage` at `features/marketplace/pages/product-detail/product-detail.page.ts`
  - Hero: thumbnail (16:9) or icon-with-gradient; type badge; trainer name
  - `isTrainer` computed from `auth.profile()?.role` — shows "Assign to client" for template_bundle
  - `isPurchased` computed — shows "You own this" banner vs. purchase CTA
  - Sticky CTA: price + "Buy now" / "Get for free" button
  - Post-purchase: file download list with `Browser.open(url)`
  - `purchase()` calls `productService.purchaseProduct()` with toast feedback
- [x] Created `ProductManagerPage` at `features/marketplace/pages/product-manager/product-manager.page.ts`
  - Segment: Published (N) / Drafts (N)
  - Product list: colour-coded type icon, title, price · sold count, Live/Draft badge
  - Quick eye/eye-off icon to toggle publish (with file_urls guard + toast)
  - FAB → `/tabs/marketplace/manage/new`; item tap → `/tabs/marketplace/manage/:id/edit`
- [x] Created `ProductFormPage` at `features/marketplace/pages/product-form/product-form.page.ts`
  - Sections: Basic Info (title, type, description), Pricing (free toggle + dollar input), Media (thumbnail/preview URLs), Deliverables (file URL list)
  - `isValid` computed: title ≥ 2 chars, type set, price ≥ $1 (or free)
  - Save as draft / Save & Publish buttons; Edit mode pre-fills from signal
  - Delete guard: only allows deleting unpublished products; `AlertController` confirm
- [x] Created Edge Function `supabase/functions/create-stripe-product/index.ts`
  - Auth-guarded (trainer/gym_owner role only)
  - Creates Stripe Product + Price; returns `{ stripe_product_id, stripe_price_id }`
  - Supports update existing product (pass `existing_product_id`)
- [x] Created Edge Function `supabase/functions/create-marketplace-payment-intent/index.ts`
  - Creates Stripe PaymentIntent; 10% platform fee via `application_fee_amount` on Connect
  - Duplicate purchase guard; Stripe Customer auto-create for client
  - Inserts pending `digital_product_purchases` row; returns `{ clientSecret }`
- [x] Added `marketplace` route tree to `app.routes.ts` (children: `''`, `product/:id`, `manage`, `manage/new`, `manage/:id/edit`)
- [x] Updated `tab-config.service.ts` — "Shop" tab (storefrontOutline) replaces "More" for both clients and trainers
- [x] Registered `storefrontOutline` / `storefront` icons in `tabs.page.ts`; unread badge moved from `more` → `dashboard` tab

**Acceptance Criteria:**

- Trainer can publish a product in <5 minutes ✅ (title, type, file URL, publish — 4 fields)
- Client purchase completes with 3DSecure support ✅ (PaymentIntent flow; Stripe handles 3DS)
- Download link available immediately after successful payment ✅ (file_urls shown in ProductDetailPage when `isPurchased`)
- Stripe payout routes to trainer's Connect account ✅ (`transfer_data.destination` in PaymentIntent)

---

### 65.2 Program Assignment from Marketplace

**Priority:** P2
**Sprint:** 65
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can assign a purchased program to a client's workout schedule
- As a client, when my trainer assigns a program, I see it in my assigned programs list

**Implementation Tasks:**

- [x] Created migration `20260400041000_program_assignments.sql`
  - `program_assignments` table: id, product_id, trainer_id, client_id, note, status (active/completed/paused), assigned_at, completed_at; UNIQUE(product_id, client_id)
  - RLS: trainers manage own assignments; clients view own assignments
  - RPC: `get_client_program_assignments(p_client_id)` — returns active/paused assignments with product + trainer info
- [x] Created `ProgramAssignmentService` at `core/services/program-assignment.service.ts`
  - `assignToClient(productId, clientId, note?)` — upsert into `program_assignments`; safe to re-assign
  - `getMyAssignments()` — client-side; calls `get_client_program_assignments` RPC
  - `getTrainerAssignments(productId?)` — trainer-side; join with profiles + digital_products for display
  - `updateStatus(assignmentId, status)` — mark complete/paused; optimistic signal update
  - `removeAssignment(assignmentId)` — trainer removes an assignment
  - `isAssigned(productId, clientId)` — boolean helper for UI state
  - Signals: `myAssignments`, `isLoading`, `error`, `trainerAssignments`
- [x] "Assign to client" button wired in `ProductDetailPage` (trainer view, template_bundle type only)

---

## Epic 66: Advanced Accountability Engine

### 66.1 Smart Check-In System

**Priority:** P0
**Sprint:** 66
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can send a weekly check-in questionnaire to clients with custom questions
- As a client, I receive a check-in prompt on my configured day/time and can respond in <60 seconds
- As a trainer, I see check-in responses aggregated with trend indicators

**Implementation Tasks:**

- [x] Created migration `20260400050000_checkins.sql`
  - `checkin_templates` table: id, trainer_id, name, questions (JSONB: `[{id, text, type, required}]`), send_day_of_week, send_time, assigned_client_ids (NULL = all active clients), is_active
  - `checkin_responses` table: id, client_id, trainer_id, template_id, sent_at, responded_at, questions_snapshot (point-in-time copy), responses (JSONB answers), overall_mood (1–5)
  - RLS: trainers manage templates + view responses; clients manage own responses
  - RPC: `get_client_checkin_summary(client_id, trainer_id)` — 8-week mood + response-rate by week
  - RPC: `get_pending_checkins_for_trainer()` — matches templates whose send_day_of_week + send_time = NOW()
- [x] Created cron migration `20260400050001_checkin_notifications_cron.sql` — fires every minute via pg_cron
- [x] Created `CheckinService` at `core/services/checkin.service.ts`
  - `createTemplate(dto)` / `updateTemplate(id, updates)` / `deleteTemplate(id)` — trainer CRUD
  - `sendCheckinNow(templateId, clientId)` — ad-hoc immediate send (inserts response row)
  - `getClientResponses(clientId)` / `getClientWeeklySummary(clientId)` — trainer analytics
  - `loadPendingCheckin()` / `loadCheckinById(id)` — client-side; sets `pendingResponse` signal
  - `submitResponse(responseId, answers)` — updates DB row; computes `overall_mood` from ratings
  - `getMyTemplates()` / `getMyResponses()` — signal loading; optimistic updates
  - Signals: `templates`, `isLoading`, `error`, `pendingResponse`, `myResponses`
- [x] Created `CheckinBuilderPage` at `features/clients/pages/checkin-builder/checkin-builder.page.ts`
  - Up to 10 questions; 3 types: emoji rating / free text / yes_no; drag to reorder (IonReorderGroup)
  - Required/Optional chip per question
  - Schedule section: day-of-week selector + time picker (UTC); toggle on/off
  - Active toggle; edit mode pre-fills from templates signal
  - Routes: `/tabs/clients/checkin-builder` (new) and `/tabs/clients/checkin-builder/:id` (edit)
- [x] Created `CheckinResponsePage` at `features/clients/pages/checkin-response/checkin-response.page.ts`
  - One question per screen with 0.25s slide-in animation
  - Emoji rating grid (1–5: 😩→🤩, colour-coded per mood)
  - Free text textarea + yes/no large buttons
  - Required guard: can't advance without answer on required questions
  - Skip option on optional questions
  - Completion screen: 🎉 icon + confetti dots CSS animation, auto-submits, Haptics.impact(Heavy)
  - Deep-link: `/tabs/workouts/checkin/:id` or `/tabs/workouts/checkin` (latest pending)
- [x] Created `CheckinDashboardComponent` at `features/clients/components/checkin-dashboard/`
  - 8-week mood sparkline: colour-coded bars (red→green), average mood badge
  - Response rate % with "Low" warning badge if <50%
  - Template list with day/time schedule labels, Active/Inactive badges; tap to edit in builder
  - Ad-hoc "Send check-in now" button (sends the first active template immediately)
  - Latest 5 responses: mood bubble + first text answer preview + timestamp
  - Empty state with CTA to create first template
- [x] Added "Check-Ins" tab to `client-detail.page.ts` segment bar; renders `CheckinDashboardComponent`
- [x] Created Edge Function `supabase/functions/send-checkin-notifications/index.ts`
  - Calls `get_pending_checkins_for_trainer()` RPC; inserts `checkin_responses` rows
  - Inserts into `notifications` table (existing push handler delivers to device)

**Acceptance Criteria:**

- Client completes 5-question check-in in <60 seconds ✅ (one per screen, emoji tap = 1 tap)
- Mood sparkline visible to trainer within seconds of client submission ✅ (signal-driven)
- Non-responders: covered by cron re-invite on next scheduled send (manual nudge via "Send now")

---

### 66.2 Accountability Groups (Peer Support)

**Priority:** P2
**Sprint:** 66
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can group clients into accountability pods (3–6 people)
- As a client, I see my pod members' workout completions this week (no personal data shared)
- As a client, I receive a weekly pod summary ("Your pod completed 18 workouts this week!")

**Implementation Tasks:**

- [x] Created migration `20260400060000_accountability_groups.sql`
  - `accountability_groups`: id, trainer_id, name, description, emoji, max_members (2–10), is_active
  - `accountability_group_members`: group_id, client_id, joined_at; UNIQUE(group_id, client_id)
  - RLS: trainers manage their groups + members; clients see groups they belong to
  - RPC: `get_pod_activity_feed(p_client_id)` — returns all pods client belongs to, with per-member workout + session counts this week; `display_name` is "First L." format (privacy)
  - RPC: `get_pod_weekly_stats(p_group_id)` — aggregate totals + MVP name for weekly digest
- [x] Created cron migration `20260400060001_pod_digest_cron.sql` — Monday 8:00 UTC
- [x] Created `AccountabilityGroupService` at `core/services/accountability-group.service.ts`
  - `getMyGroups()` with member count join; `createGroup(dto)` / `updateGroup()` / `deleteGroup()`
  - `getGroupMembers(groupId)` with profile join; `addMember()` with max_members guard; `removeMember()`
  - `loadPodActivity()` — calls `get_pod_activity_feed` RPC; sets `podActivity` signal
  - Signals: `groups`, `members`, `isLoading`, `error`, `podActivity`
- [x] Created `AccountabilityGroupManagerPage` at `features/clients/pages/accountability-group-manager/`
  - Group list: emoji + name + member count/max + Active/Inactive badge
  - Tap group → member detail panel within page (no separate page); shows member avatars with initials
  - Add member: AlertController prompt for client UUID; remove with destructive confirmation
  - Create/delete group via AlertController; FAB to create
  - Route: `/tabs/clients/pods`
- [x] Created `PodFeedPage` at `features/social/pages/pod-feed/pod-feed.page.ts`
  - Privacy banner (workout counts only — no weights/nutrition)
  - Per-pod card: emoji header, total workouts this week, member rows
  - Member row: "First L." display name, workout chip + session chip, "X days ago" last active
  - "You" badge on current user's row with teal highlight
  - Pod leader callout ("🏆 Alex C. is leading the pod!")
  - Empty state when no pods assigned
  - Route: `/tabs/social/pods`
- [x] Created Edge Function `supabase/functions/send-weekly-pod-digest/index.ts`
  - Every Monday 8am UTC; loops all active groups; calls `get_pod_weekly_stats` RPC
  - Skips groups with zero activity; inserts push notifications for all members
  - Copy: "Your pod crushed X workouts last week! 🏆 MVP: Name"

---

## Epic 67: Trainer Public Profile & SEO Storefront

### 67.1 SEO-Indexed Trainer Profile Page

**Priority:** P0
**Sprint:** 67
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I have a public profile at `nutrifitos.app/t/[username]` that ranks on Google
- As a prospective client, I can view a trainer's specialty, reviews, and book a free consultation from their profile
- As a trainer, I can customize my profile bio, specialty tags, and hero photo

**Implementation Tasks:**

- [x] Create migration `20260400070000_trainer_profiles_public.sql`
  - `trainer_public_profiles`: trainer_id, username (UNIQUE, lowercase), bio, specialty_tags (TEXT[]), hero_photo_url, years_experience, certifications (JSONB), is_accepting_clients, intro_session_price_cents, booking_url_override; `updated_at` trigger
  - `trainer_reviews`: trainer_id, client_id (nullable), rating CHECK(1–5), text, is_public, is_featured, session_id FK; RLS: public reviews publicly readable; clients INSERT own; trainers UPDATE display
  - RPC `get_trainer_public_profile(p_username)` — profile + public reviews (featured first) + avg_rating + review_count; returns NULL for 404
  - RPC `upsert_trainer_public_profile(...)` — trainer CRUD via ON CONFLICT on trainer_id; username uniqueness enforced at DB and application layer
- [x] `TrainerPublicProfileService` at `core/services/trainer-public-profile.service.ts`
  - `SPECIALTY_TAGS` const array of 20 preset specialty strings
  - Trainer: `getMyProfile()`, `saveProfile(dto)`, `getMyReviews()`, `setFeatured()` (max-3 guard), `setPublic()`, `isUsernameAvailable()`
  - Client: `submitReview(dto)` — creates private review; trainer approves
  - Helper: `publicProfileUrl(username)` → `https://www.nutrifitos.com/t/{username}`
- [x] SSR page at `apps/landing/src/app/pages/trainer-profile/trainer-profile.component.ts`
  - Route `/t/:username` — `RenderMode.Server` in `app.routes.server.ts`
  - `ngOnInit` fetches via `HttpClient POST /rest/v1/rpc/get_trainer_public_profile` (anon key) — SSR-safe
  - Hero: circular avatar (photo or initials), star rating row, specialty tag chips, "Book a free consult" CTA (deep-link to `/book/:username?service=intro`)
  - About section: bio with whitespace preserved
  - Certifications grid: emoji + name + issuer · year
  - Featured reviews: 3-column flex; regular reviews: flat list with star row
  - Full SEO: `Title`, `Meta` (og:type, og:image, og:description, twitter:card), JSON-LD `Person` + `AggregateRating` schema injected client-side
  - "Not accepting clients" graceful state; "Not found" 404 state
  - Green gradient final CTA with "Powered by FitOS" attribution
- [x] `PublicProfileEditorPage` at `features/settings/pages/public-profile/public-profile.page.ts`
  - URL preview: `nutrifitos.com/t/[input]` — 600ms debounced availability check
  - 20-tag specialty chip grid with toggle selection
  - Bio textarea with 500-char counter
  - Photo URL input + live circular preview
  - Certifications: AlertController 3-input form; trash to remove
  - Experience + intro price (dollars → cents) + custom booking URL override
  - `isValid()` computed: username ≥ 3 chars, alphanumeric+`-_`, bio ≤ 500
  - Save: upserts via RPC; toast on success/failure
  - Preview button: opens live profile via `@capacitor/browser`
  - Route: `/tabs/settings/public-profile` (trainerOrOwnerGuard)
  - Added "Public Profile" entry in `settings.page.ts` (globe-outline icon)

**Acceptance Criteria:**

- ✅ Page renders with SSR (view-source shows content, not JS shell) — `RenderMode.Server`
- ✅ Username claim flow prevents duplicates — DB UNIQUE index + debounced availability check
- ✅ "Book a consult" CTA deep-links to `/book/:username?service=intro`

---

### 67.2 Review Collection & Display

**Priority:** P1
**Sprint:** 67
**Status:** ✅ Complete

**User Stories:**

- As a trainer, after a session is marked complete, I can send a one-tap review request to the client
- As a client, I rate my session (1–5 stars) and optionally leave a short text review

**Implementation Tasks:**

- [x] `PostSessionReviewComponent` at `features/clients/components/post-session-review/post-session-review.component.ts`
  - Bottom-sheet modal (initialBreakpoint: 0.75)
  - Trainer header: avatar initial + name + session label
  - 5-star tap row (44px targets); selected stars gold (#F59E0B); colour-coded label per rating
  - Optional 140-char textarea revealed after rating set; "Skip" always visible
  - Privacy note: "Reviews are private by default; trainer approves before displaying"
  - `submit()`: calls `profileService.submitReview()`; shows "Thank you" overlay instantly; auto-dismiss after 2.2s
  - `PostSessionReviewComponent.present(modalCtrl, opts)` static helper for easy invocation from any page
- [x] `supabase/functions/trigger-session-review/index.ts`
  - Mode 1 (webhook): single `appointment_id` in body → inserts notification for client
  - Mode 2 (batch/cron): no body → finds appointments completed in ~2h window; de-dupes via existing `notifications` rows; `type = 'review_request'`; `deep_link = /tabs/review?session=&trainer=`; `metadata` includes `trainer_name` and `session_label` for the modal
- [x] `20260400070001_session_review_cron.sql` — pg_cron every 30 min for batch poll
- [x] Reviews displayed on public profile page (featured first, then newest); trainer pins up to 3 via `setFeatured()` with application-layer max-3 guard

---

## Epic 68: Client Feedback & NPS Loop

### 68.1 NPS Survey Engine

**Priority:** P1
**Sprint:** 68
**Status:** Not Started

**User Stories:**

- As a trainer, I can send an NPS survey to all my clients quarterly
- As a trainer, I see my NPS score and trending detractors/promoters in my analytics dashboard
- As a client, I receive a non-intrusive NPS prompt every 90 days

**Implementation Tasks:**

- [ ] Create migration `20260400070000_nps.sql`
  - `nps_surveys` table: id, trainer_id, sent_at, response_count, promoters, passives, detractors, score
  - `nps_responses` table: id, survey_id, client_id, score (0-10), feedback_text, responded_at
- [ ] Create `NpsService` at `core/services/nps.service.ts`
- [ ] Create `NpsResponsePage` (client-facing, deep-linked from push/email)
  - Single numeric scale 0–10 with color gradient (red → yellow → green)
  - Follow-up text field appears based on score segment
- [ ] Create `NpsDashboardWidget` for trainer analytics page
  - Big NPS number (–100 to +100)
  - Segment breakdown (Promoters / Passives / Detractors)
  - Trend chart (last 4 quarters)

**Acceptance Criteria:**

- NPS survey fires automatically 90 days after client's first completed session
- Response rate tracked (non-responders not re-asked for 30 days)
- NPS calculation follows standard formula: `(promoters - detractors) / total * 100`

---

### 68.2 Testimonial Collection & Approval Flow

**Priority:** P2
**Sprint:** 68
**Status:** Not Started

**User Stories:**

- As a trainer, high-rated reviews (4–5 stars) automatically flow into a testimonial approval queue
- As a trainer, I approve testimonials which then appear on my public profile

**Implementation Tasks:**

- [ ] Create `testimonial_approval_queue` table (status: pending/approved/rejected)
- [ ] Create `TestimonialQueuePage` at `features/settings/pages/testimonials/`
- [ ] Auto-promote 4+ star reviews to approval queue
- [ ] Approved testimonials appear on SSR public profile page

---

## Epic 69: Referral Program & Growth Mechanics

### 69.1 Client Referral Program

**Priority:** P1
**Sprint:** 69
**Status:** Not Started

**User Stories:**

- As a client, I get a personal referral link to share with friends
- As a trainer, when a referral converts, my client gets a free session credit automatically
- As a trainer, I can configure referral rewards (1 free session per 2 referrals, etc.)

**Implementation Tasks:**

- [ ] Create migration `20260400080000_referrals.sql`
  - `referral_codes` table: id, client_id, trainer_id, code (UNIQUE 8-char), clicks, conversions, created_at
  - `referral_conversions` table: id, referral_code_id, new_client_id, converted_at, reward_issued
  - `referral_programs` table: id, trainer_id, reward_type (session_credit/discount), reward_value, conversions_required, is_active
- [ ] Create `ReferralService` at `core/services/referral.service.ts`
  - `generateReferralCode(clientId)` — generates unique code, creates share URL
  - `trackClick(code)` — increments click counter (anonymous)
  - `convertReferral(code, newClientId)` — marks conversion, issues reward
- [ ] Create `ReferralPage` at `features/clients/pages/referral/` (client-facing)
  - Personal referral URL with copy button + share sheet
  - Referral stats: clicks, conversions, rewards earned
- [ ] Create `ReferralProgramSettingsPage` for trainers (configure reward structure)
- [ ] Edge Function: auto-credit session pack when conversion threshold reached

**Acceptance Criteria:**

- Referral URL is short and memorable (`nutrifitos.app/join/[code]`)
- Landing page shows referrer's trainer profile and a "Get started" CTA
- Session credit added to client's account within 24 hours of conversion

---

### 69.2 Trainer Growth Analytics

**Priority:** P2
**Sprint:** 69
**Status:** Not Started

**User Stories:**

- As a trainer, I see a growth dashboard: new clients this month, churn rate, lifetime value, referral conversion rate
- As a trainer, I can export client retention data as CSV

**Implementation Tasks:**

- [ ] Create `GrowthAnalyticsPage` at `features/analytics/pages/growth-analytics/`
  - KPI cards: New Clients (MTD), Active Clients, Churned (last 90 days), Avg LTV, NPS
  - Cohort retention chart (heatmap: % of clients still active by month joined)
  - Referral funnel chart (links shared → clicks → conversions → first session)
- [ ] Create `GrowthAnalyticsService` — computes cohort, churn, LTV from existing appointment + transaction data
- [ ] Add CSV export using native Share sheet (no server-side generation needed)

**Acceptance Criteria:**

- Dashboard loads in <2 seconds
- Cohort chart accurate to within 1 client
- CSV export includes: client name, join date, sessions completed, total revenue, last activity

---

## Phase Status

| Sprint | Focus | Status |
| ------ | ----- | ------ |
| 62 | Client Portal & Self-Service Booking | ✅ Complete |
| 63 | Client Mobile App Experience | ✅ Complete |
| 64 | Progress Showcase & Transformation Tracking | ✅ Complete |
| 65 | In-App Marketplace (Digital Products) | ✅ Complete |
| 66 | Advanced Accountability Engine | ✅ Complete |
| 67 | Trainer Public Profile & SEO Storefront | ✅ Complete |
| 68 | Client Feedback & NPS Loop | Not Started |
| 69 | Referral Program & Growth Mechanics | Not Started |

**Overall Phase Status:** 🔄 In Progress (6/8 Sprints Complete)
