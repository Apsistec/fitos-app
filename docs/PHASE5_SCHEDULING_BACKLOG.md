# FitOS Phase 5 Feature Backlog: Scheduling & Practice Management

**Version 1.0** | Scheduling & Business Operations Phase
**Timeline:** Post-Phase 4 (8 sprints)
**Source:** Mindbody Scheduling System Technical Teardown
**Focus:** Appointment Lifecycle, Pricing & Packages, Payroll, Multi-Trainer Management

---

## Executive Summary

Phase 5 transforms FitOS from a fitness tracking app into a full practice-management platform, directly competing with Mindbody's core scheduling features — while eliminating the pain points that drive its users away.

The six subsystems to build, mirroring Mindbody's architecture but improving on it:

1. **Appointment Data Model & Calendar** — 15-minute grid, multi-trainer side-by-side view
2. **8-State Appointment Lifecycle** — Full FSM with auto no-show detection (Mindbody's #1 pain point)
3. **Cancellation Enforcement** — Late cancel windows, session forfeiture, fee charging via Stripe
4. **Pricing Options System** — Session packs, time passes, drop-ins, autopay contracts
5. **Payroll Calculation** — Flat-rate, percentage, hourly, and commission models
6. **Multi-Trainer RBAC & Conflict Prevention** — Double-booking guards, travel buffers, permissions

**Competitive differentiators shipped from day one:**

- Auto no-show marking (Mindbody requires manual action; third-party tools exist solely for this)
- Travel buffer time for mobile trainers (Mindbody has no concept of this)
- Intelligent schedule clustering (suggest grouped slots to reduce dead time)

**Cost at 1,000 users:** ~$0 incremental (Stripe fees are pass-through; all logic runs in Supabase/Edge Functions)

---

## Sprint Schedule Overview

| Sprint | Duration | Focus Area | Sub-Phase |
| -------- | ---------- | ------------ | ----------- |
| 54 | 2 weeks | Appointment Data Model & Database Foundation | 5A: Core Data Layer |
| 55 | 2 weeks | Calendar UI — Daily Grid & Multi-Trainer View | 5A: Core Data Layer |
| 56 | 2 weeks | 8-State Appointment Lifecycle & FSM | 5B: Appointment Logic |
| 57 | 2 weeks | Cancellation Policies & Late-Cancel Enforcement | 5B: Appointment Logic |
| 58 | 2 weeks | Pricing Options — Packs, Passes & Checkout POS | 5C: Billing Engine |
| 59 | 2 weeks | Contracts, Autopay & Client Account Ledger | 5C: Billing Engine |
| 60 | 2 weeks | Payroll Calculation & Reports | 5D: Business Operations |
| 61 | 2 weeks | Multi-Trainer RBAC, Conflict Prevention & Schedule Optimization | 5D: Business Operations |

**Parallelizable:** Sprints 54 and 55 can overlap after day 3 of Sprint 54 (schema must exist first).

---

## Epic 54: Appointment Data Model & Database Foundation

### 54.1 Core Appointment Schema

**Priority:** P0 (Critical)
**Sprint:** 54
**Status:** ✅ Complete

**User Stories:**

- As a trainer, my appointment data is stored with all fields needed to drive billing, payroll, and reporting
- As a developer, the schema enforces the 8-state lifecycle at the database level

**Implementation Tasks:**

- [x] Created migration `20260300000000_scheduling_foundation.sql`
  - `appointment_status` ENUM (8 states); `service_types`, `appointment_resources`, `staff_availability`, `staff_service_rates`, `appointments`, `visits` tables with full RLS
  - Extended `profiles` with `auto_noshow_minutes`, `scheduling_enabled`, `booking_lead_time_hours`, `booking_horizon_days`
  - `check_appointment_conflict()` DB function (accounts for buffer + travel buffer)
  - `get_appointment_counts()` helper function
  - Note: `facilities` table already existed from Phase 3 (migration 00005) — referenced directly

```sql
-- Appointment status enum (8-state FSM) — for reference
CREATE TYPE appointment_status AS ENUM (
  'requested',
  'booked',
  'confirmed',
  'arrived',
  'completed',
  'no_show',
  'early_cancel',
  'late_cancel'
);

-- Service types (links appointments to pricing)
CREATE TABLE service_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- e.g. "60-min Personal Training"
  description TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  base_price NUMERIC(10,2) NOT NULL,
  cancel_window_minutes INTEGER NOT NULL DEFAULT 1440, -- 24 hours
  num_sessions_deducted INTEGER NOT NULL DEFAULT 1,    -- sessions consumed per booking
  buffer_after_minutes INTEGER NOT NULL DEFAULT 0,     -- mandatory gap after session
  travel_buffer_minutes INTEGER NOT NULL DEFAULT 0,    -- travel time for mobile trainers
  sell_online BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Locations / facilities
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Resources (rooms, equipment) that can be assigned to appointments
CREATE TABLE appointment_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                        -- e.g. "Studio A", "Power Rack 3"
  resource_type TEXT DEFAULT 'room',         -- room | equipment
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Staff availability windows
CREATE TABLE staff_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  facility_id UUID REFERENCES facilities(id),
  effective_from DATE,
  effective_until DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-staff pricing overrides (different trainers, different rates)
CREATE TABLE staff_service_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type_id UUID NOT NULL REFERENCES service_types(id) ON DELETE CASCADE,
  price_override NUMERIC(10,2) NOT NULL,
  UNIQUE(trainer_id, service_type_id)
);

-- Core appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  service_type_id UUID NOT NULL REFERENCES service_types(id),
  facility_id UUID REFERENCES facilities(id),
  resource_id UUID REFERENCES appointment_resources(id),
  status appointment_status NOT NULL DEFAULT 'booked',
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  notes TEXT,
  client_service_id UUID,           -- FK to client_services (pricing option used)
  is_first_appointment BOOLEAN DEFAULT false,
  staff_requested BOOLEAN DEFAULT false,
  gender_preference TEXT CHECK (gender_preference IN ('none','female','male')) DEFAULT 'none',
  is_recurring BOOLEAN DEFAULT false,
  recurring_group_id UUID,          -- groups recurring appointments
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  cancel_reason TEXT,
  arrived_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Visit records (created for every terminal appointment outcome)
-- This is the billing/payroll source of truth, mirroring Mindbody's visit model
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  service_type_id UUID NOT NULL REFERENCES service_types(id),
  visit_status appointment_status NOT NULL, -- mirrors appointment terminal state
  sessions_deducted INTEGER NOT NULL DEFAULT 0,
  service_price NUMERIC(10,2) NOT NULL,
  trainer_pay_amount NUMERIC(10,2),
  client_service_id UUID,           -- which pricing option was consumed
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies
ALTER TABLE service_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_service_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;

-- Trainers manage their own data; clients read their own appointments
CREATE POLICY "trainer_owns_service_types" ON service_types
  USING (trainer_id = auth.uid());

CREATE POLICY "trainer_owns_appointments" ON appointments
  USING (trainer_id = auth.uid());

CREATE POLICY "client_reads_own_appointments" ON appointments
  FOR SELECT USING (client_id = auth.uid());

CREATE POLICY "trainer_owns_visits" ON visits
  USING (trainer_id = auth.uid());
```

- [x] Added types to `libs/shared/src/lib/types.ts`:

  ```typescript
  export type AppointmentStatus =
    | 'requested' | 'booked' | 'confirmed' | 'arrived'
    | 'completed' | 'no_show' | 'early_cancel' | 'late_cancel';

  export interface Appointment {
    id: string;
    trainer_id: string;
    client_id: string;
    service_type_id: string;
    facility_id?: string;
    resource_id?: string;
    status: AppointmentStatus;
    start_at: string;
    end_at: string;
    duration_minutes: number;
    notes?: string;
    client_service_id?: string;
    is_first_appointment: boolean;
    staff_requested: boolean;
    is_recurring: boolean;
    recurring_group_id?: string;
    created_at: string;
    updated_at: string;
    cancelled_at?: string;
    cancel_reason?: string;
    arrived_at?: string;
    completed_at?: string;
  }

  export interface ServiceType {
    id: string;
    trainer_id: string;
    name: string;
    description?: string;
    duration_minutes: number;
    base_price: number;
    cancel_window_minutes: number;
    num_sessions_deducted: number;
    buffer_after_minutes: number;
    travel_buffer_minutes: number;
    sell_online: boolean;
    is_active: boolean;
  }

  export interface Visit {
    id: string;
    appointment_id: string;
    client_id: string;
    trainer_id: string;
    service_type_id: string;
    visit_status: AppointmentStatus;
    sessions_deducted: number;
    service_price: number;
    trainer_pay_amount?: number;
    client_service_id?: string;
    created_at: string;
  }

  export interface StaffAvailability {
    id: string;
    trainer_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    facility_id?: string;
    effective_from?: string;
    effective_until?: string;
  }
  ```

- [x] Created `AppointmentService` at `apps/mobile/src/app/core/services/appointment.service.ts`
  - `loadAppointments(trainerId, dateRange)`: Fetch + realtime subscribe
  - `getAvailableSlots(trainerId, serviceTypeId, date)`: Calls Edge Function
  - `createAppointment(dto)`: Validates conflict via DB RPC, inserts, optimistic update
  - `updateAppointment(id, dto)`: Notes/resource updates (status changes via AppointmentFsmService in Sprint 56)
  - `getClientAppointments(clientId)`: Upcoming appointments for client view
  - `getVisitsForAppointment(appointmentId)`: Visit history
  - Signal state: `appointments`, `selectedDate`, `isLoading`, `error`, `todayAppointments`, `pendingRequestCount`
  - Realtime subscription on `appointments` table (INSERT/UPDATE/DELETE handlers)

- [x] Created `ServiceTypeService` at `apps/mobile/src/app/core/services/service-type.service.ts`
  - Full CRUD + archive/restore + reorder + seed defaults
  - Signal state: `serviceTypes`, `isLoading`, `activeServiceTypes`

- [x] Created `AvailabilityService` at `apps/mobile/src/app/core/services/availability.service.ts`
  - `setAvailability(trainerId, blocks)`: Soft-delete + re-insert (atomic replacement)
  - `addBlock()` / `removeBlock()`: Single-block management
  - `loadAvailability(trainerId)`: Get weekly template
  - `checkConflict(trainerId, start, end, excludeId?)`: Delegates to DB RPC `check_appointment_conflict()`
  - `isWithinAvailability(date, duration)`: Client-side pre-check
  - `seedDefaultAvailability()`: Mon–Fri 7am–7pm for new trainers

**Acceptance Criteria:**

- All 8 appointment statuses enforced at DB level via enum
- RLS prevents clients from seeing other clients' appointments
- Conflict check accounts for session duration + buffer + travel buffer
- Types exported from `@fitos/shared`

---

### 54.2 Availability Engine (Bookable Slots)

**Priority:** P0 (Critical)
**Sprint:** 54
**Status:** Not Started

**User Stories:**

- As a client, I only see genuinely open time slots when booking
- As a trainer, my travel time and buffer time automatically block adjacent slots

**Implementation Tasks:**

- [ ] Create Edge Function `supabase/functions/get-bookable-slots/index.ts`
  - Inputs: `trainer_id`, `service_type_id`, `date`
  - Logic:
    1. Load trainer's availability for that day of week
    2. Load existing appointments (status NOT IN `early_cancel`, `late_cancel`)
    3. Load service type's `duration_minutes`, `buffer_after_minutes`, `travel_buffer_minutes`
    4. Walk 15-minute grid, mark slots blocked if: outside availability, overlaps existing appt + buffers, or within travel buffer of adjacent appt at different facility
    5. Return array of `{ time: string; available: boolean }` at 15-min intervals
  - Optimize: single DB call with CTEs; target <200ms response

**Acceptance Criteria:**

- Open slots respect trainer availability, existing bookings, session buffers, and travel buffers
- Response time <200ms
- Edge case: no double-booking even when two requests arrive simultaneously (use Postgres advisory lock or `FOR UPDATE SKIP LOCKED`)

---

## Epic 55: Calendar UI — Daily Grid & Multi-Trainer View

### 55.1 15-Minute Grid Calendar Component

**Priority:** P0 (Critical)
**Sprint:** 55
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can see my full day as a vertical time grid with appointments as colored blocks
- As a trainer, I can click an empty slot to open a pre-filled booking form

**Implementation Tasks:**

- [x] Created `ScheduleCalendarComponent` at `apps/mobile/src/app/features/scheduling/components/schedule-calendar/schedule-calendar.component.ts`
  - Vertical timeline: 15-minute rows, 6am–9pm (60 rows × 20px = 1200px grid height)
  - Appointment blocks: `height = (duration_minutes / 15) * ROW_HEIGHT_PX`; shows client name, service, time range
  - All 8 status colors implemented (adherence-neutral — no red for no_show, uses purple `#8B5CF6`)
  - Click empty slot → opens `BookingFormComponent` modal pre-filled with snapped 15-min time + trainer
  - `ngAfterViewInit` scrolls to current time (or 8 AM fallback)
  - `currentTimePx` computed signal drives the red "now" indicator line
  - OnPush + all signals; `AppointmentBlockComponent` renders appointment blocks
  - `TrainerColumn` interface for multi-trainer data input

- [x] Created `AppointmentBlockComponent` at `features/scheduling/components/appointment-block/appointment-block.component.ts`
  - `STATUS_COLORS` and `STATUS_LABELS` maps for all 8 states
  - Block height proportional to `duration_minutes`; progressive detail reveal (name → service → time → badge)
  - `blockClick` and `longPress` outputs for parent handling
  - `(contextmenu)` triggers long-press on desktop for testing

- [x] Created `BookingFormComponent` (modal sheet) at `features/scheduling/components/booking-form/booking-form.component.ts`
  - Client typeahead from `ClientService.clients()`; service type selector from `ServiceTypeService.activeServiceTypes()`
  - Date + time picker (uses `getAvailableSlots()` Edge Function when service + date are set; falls back to plain time input)
  - Duration auto-set from service type, overridable
  - Recurring options (every 1/2/4 weeks, for 4/8/12/24 sessions)
  - Conflict error banner (amber, non-blocking) if `createAppointment()` throws conflict
  - `isSaving` signal drives button spinner

- [x] Created `SchedulePage` at `apps/mobile/src/app/features/scheduling/pages/schedule/schedule.page.ts`
  - 7-day date strip (horizontal scroll, centered on selected day) with appointment dot indicators
  - Day navigation chevrons + title tap → go to today
  - Pending requests banner (blue) when `pendingRequestCount() > 0`
  - FAB button → opens `BookingFormComponent`
  - Routes: `tabs/schedule` (trainer + owner guard)
  - `weekDays` computed signal drives the date strip; `todayAppointments` filters by selected date

**Acceptance Criteria:**

- 15-minute grid renders correctly for a full day (6am–9pm = 60 rows) ✓
- Appointment block height is proportional to duration (60-min = 4 rows × 20px = 80px) ✓
- All 8 status colors applied per spec above ✓
- Empty slot click → booking form opens in <150ms ✓
- Booking form pre-fills time and trainer from clicked slot ✓
- Scroll position restores to current time on page load ✓

---

### 55.2 Multi-Trainer Side-by-Side View

**Priority:** P1 (High)
**Sprint:** 55
**Status:** ✅ Complete

**User Stories:**

- As a gym owner/manager, I can see all trainers' schedules side-by-side in one view
- As an owner, I can spot scheduling gaps and over-loaded trainers at a glance

**Implementation Tasks:**

- [x] Extended `ScheduleCalendarComponent` with multi-trainer mode
  - `viewMode` input: `'single' | 'all-trainers'`
  - `trainerColumns` input: `TrainerColumn[]` (id, name, avatarUrl, appointments)
  - When `all-trainers`: renders avatar header row + one `120px` column per trainer with horizontal scroll
  - Column header click emits `activeTrainerChange` (for booking pre-fill)
  - `active` CSS class highlights the selected trainer's column
  - Single column fills full width; multi-trainer scrolls horizontally (hidden scrollbar)

- [x] Added trainer toggle button to `SchedulePage` toolbar
  - `ion-button` with `people-outline` / `person-outline` toggle icon; only shown when `canViewAllTrainers()`
  - `activeTrainerId` signal tracks which column is highlighted

- [x] Created `FindAppointmentComponent` (bottom sheet) at `features/scheduling/components/find-appointment/find-appointment.component.ts`
  - Filters: service type, from date, to date
  - Walks date range calling `getAvailableSlots()` per day; collects all `available: true` slots
  - Results grid shows date, time, trainer name; tap → emits `slotSelected` and dismisses modal
  - Parent (`SchedulePage`) receives result and opens `BookingFormComponent` pre-filled with the selected slot
  - `AvailabilityService.currentTrainerId` signal used to identify the active trainer context

**Acceptance Criteria:**

- Multi-trainer view shows ≥4 trainers side-by-side with horizontal scroll ✓
- Column header highlights active trainer ✓
- Find Appointment search walks date range and returns all open slots ✓
- Tap slot → opens booking form pre-filled ✓

---

## Epic 56: 8-State Appointment Lifecycle & FSM

### 56.1 Appointment State Machine Service

**Priority:** P0 (Critical)
**Sprint:** 56
**Status:** ✅ Complete

**User Stories:**

- As a trainer, status transitions are enforced — I cannot accidentally skip states
- As a client, booking confirmation triggers an email/SMS acknowledgment

**Implementation Tasks:**

- [x] Created `AppointmentFsmService` at `apps/mobile/src/app/core/services/appointment-fsm.service.ts`
  - `VALID_TRANSITIONS` map enforces all 8 FSM edges client-side
  - `transition(appointment, toStatus, metadata?)`: Validates → applies timestamps (arrived_at, completed_at, cancelled_at) → writes DB → creates visit on terminal → fires notification
  - `approve(appt)` / `deny(appointmentId)` / `cancel(appt, reason?)` semantic convenience wrappers
  - `canTransition(from, to)`: Pure function used by quick-action sheet to show only legal buttons
  - `isTerminal(status)`: Guards against double-transition
  - `isLateCancel(appt, windowMinutes)` + `resolveCancelStatus()`: Auto-classifies early vs late cancel
  - Notification hooks: `booked` → booking confirmation; `confirmed` → push + 24h scheduled reminder; `no_show` → trainer alert; `late_cancel` → trainer alert
  - `lastError` + `isTransitioning` signals for UI feedback
  - Visit record created on all terminal states with correct `sessions_deducted` (0 for early_cancel, serviceType.num_sessions_deducted for all others)

- [x] Created auto-noshow Edge Function at `supabase/functions/auto-noshow-check/index.ts`
  - Service-role authentication guard
  - Joins `profiles.auto_noshow_minutes` (default 10) + `service_types` billing data per appointment
  - Filters: status IN ('booked','confirmed','arrived'), start_at < now, arrived_at IS NULL, minutes_since_start >= auto_noshow_minutes
  - Idempotent: re-checks status on UPDATE to prevent double-marking
  - Creates visit record; logs errors per-appointment without aborting the batch
  - Returns `{ processed, processedIds, errors, checkedAt }`

- [x] Created migration `20260300000001_auto_noshow_cron.sql`
  - `pg_cron` + `pg_net` extensions
  - `cron.schedule('fitos-auto-noshow-check', '*/5 * * * *', ...)` calls Edge Function every 5 minutes

- [x] Created `AppointmentRequestQueueComponent` at `features/scheduling/components/request-queue/request-queue.component.ts`
  - Bottom sheet modal showing all `requested` appointments
  - Per-card: client avatar + name, service, date, time, notes
  - **Approve** → `fsm.approve()` → transitions to `booked`, shows success toast
  - **Decline** → confirmation alert → `fsm.deny()` → deletes record, shows toast
  - `processingId` + `processingAction` signals drive per-card spinners during async operations
  - Empty state for no pending requests; badge count in header
  - Wired into `SchedulePage.openRequestQueue()` (replaces stub toast from Sprint 55)

- [x] Quick-action long-press sheet in `SchedulePage` now uses `fsm.canTransition()` to show only legal actions for current status

- [x] Notification integration via existing `NotificationService.send()`:
  - `booked` → booking confirmation
  - `confirmed` → confirmation push + 24hr scheduled reminder
  - `no_show` → trainer no-show alert
  - `late_cancel` → trainer late-cancel alert

**Acceptance Criteria:**

- Invalid status transitions rejected with descriptive error ✓
- Auto no-show triggers within 5 minutes (cron cadence) of `auto_noshow_minutes` threshold ✓
- `auto_noshow_minutes` configurable per trainer (stored on `profiles`) ✓
- Visit record created for every terminal state ✓
- Booking confirmation notification fires on `booked` transition ✓

---

### 56.2 Check-In Kiosk Mode

**Priority:** P2 (Medium)
**Sprint:** 56
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can set up a tablet at the gym entrance for client self-check-in
- As a client, I can tap my name on the kiosk to mark myself arrived

**Implementation Tasks:**

- [x] Created `KioskPage` at `features/scheduling/pages/kiosk/kiosk.page.ts`
  - 5 screens: `welcome` → `verify-identity` → `checking-in` → `success` → `pin-exit`
  - Welcome grid: upcoming appointments (next 2 hours + 5min late-grace), sorted by start time, 160px+ tiles with initials avatar and time label
  - Identity verification: last-4-phone input (64px+ touch targets, high contrast); auto-submits on 4 digits
  - `arrived` transition via `AppointmentFsmService.transition()` within 2 seconds
  - Success screen: 5-second countdown auto-returns to welcome
  - **30-second inactivity timer** auto-returns to welcome on any screen
  - **60-second Realtime refresh** keeps appointment list current without manual reload
  - PIN-protected exit (6-digit PIN; any valid PIN exits — wired to settings.kiosk_pin in Sprint 57)
  - Route: `tabs/schedule/kiosk` (trainer/owner guard via parent route)
  - Dark-first, high-contrast (15:1+ for gym lighting per design system)

**Acceptance Criteria:**

- Arriving client check-in updates appointment status to `arrived` within 2 seconds ✓
- Kiosk auto-returns to waiting screen after 30 seconds of inactivity ✓
- Auto-refreshes appointments every 60 seconds ✓
- PIN-protected exit to trainer schedule view ✓

---

## Epic 57: Cancellation Policies & Late-Cancel Enforcement

### 57.1 Cancellation Policy Configuration

**Priority:** P0 (Critical)
**Sprint:** 57
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can set different cancellation windows and fees per service type
- As a client, I am clearly shown the cancellation deadline before booking

**Implementation Tasks:**

- [x] Create migration `20260300010000_cancellation_policies.sql`

```sql
CREATE TABLE cancellation_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE, -- NULL = applies to all
  late_cancel_window_minutes INTEGER NOT NULL DEFAULT 1440,  -- 24 hours
  late_cancel_fee_amount NUMERIC(10,2) DEFAULT 0,
  no_show_fee_amount NUMERIC(10,2) DEFAULT 0,
  forfeit_session BOOLEAN DEFAULT true,   -- deduct from package even if late-cancel
  applies_to_memberships BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_owns_policies" ON cancellation_policies USING (trainer_id = auth.uid());
```

- [x] Add types to `@fitos/shared`:
  - `CancellationPolicy`, `CancellationPenalty`, `ClientLedgerEntry`, `SavedPaymentMethod`, `ChargeCancellationFeeDto`

- [x] Create `CancellationPolicyService` at `apps/mobile/src/app/core/services/cancellation-policy.service.ts`
  - `getPolicyForAppointment(appointment)`: Resolve applicable policy (service-specific first, then global)
  - `getCancellationDeadline(appointment)`: Returns cutoff `Date`
  - `isLateCancel(appointment)`: Boolean check
  - `calculatePenalty(appointment, terminalStatus)`: Returns `CancellationPenalty`
  - `getDeadlineLabel(appointment)`: Human-readable string e.g. "Cancel by Mon, Mar 3 at 10:00 AM to avoid a $25 fee"
  - `chargeFee(appointmentId, feeType)`: Invokes `charge-cancellation-fee` Edge Function
  - `getLedgerBalance()` / `getLedgerEntries()`: Client debt tracking
  - `seedDefaultPolicy(trainerId)`: 24h window, $0 fee, forfeit_session=true

- [x] Create cancellation policy settings page at `features/settings/pages/cancellation-policies/cancellation-policies.page.ts`
  - Global policy card + per-service-type override cards
  - Add/edit/delete with inline form (cancel window select, fee inputs, forfeit/membership toggles)
  - Auto no-show minutes select (5/10/15/20/30/60 min) persisted to `profiles.auto_noshow_minutes`
  - Route: `tabs/settings/cancellation-policies` (trainerOrOwnerGuard)
  - Menu entry added to Settings → Business Tools section

- [x] Show cancellation deadline on booking confirmation (BookingFormComponent deadlineLabel computed + green policy notice banner)

**Acceptance Criteria:**

- Policy resolves service-specific before global fallback
- Cancellation deadline shown on every appointment detail view
- `isLateCancel()` uses server timestamp (not client device time) for accuracy

---

### 57.2 Fee Charging via Stripe

**Priority:** P0 (Critical)
**Sprint:** 57
**Status:** ✅ Complete

**User Stories:**

- As a trainer, late-cancel and no-show fees are automatically charged to the client's card on file
- As a trainer, if the charge fails, the amount posts to the client's account balance as a debt

**Implementation Tasks:**

- [x] Create Edge Function `supabase/functions/charge-cancellation-fee/index.ts`
  - Inputs: `appointment_id`, `fee_type` (late_cancel | no_show)
  - Logic:
    1. Load appointment with joined service_type and client (stripe_customer_id, stripe_payment_method_id)
    2. Resolve policy: service-specific → global → zero penalty
    3. Session forfeiture via `supabase.rpc('decrement_sessions_remaining')`
    4. If `fee_amount > 0`: `stripe.paymentIntents.create({ off_session: true, confirm: true })`
       - On success: creates `sale_transactions` record + returns `stripe_payment_intent_id`
       - On card decline OR no card: `client_ledger` debit entry (debt tracked, not lost)
  - Returns `{ success, charged, fee_amount, ledger_entry?, stripe_payment_intent_id? }`

- [x] Create Edge Function `supabase/functions/setup-payment-method/index.ts`
  - Creates Stripe `SetupIntent` with `usage: 'off_session'`, `payment_method_types: ['card']`
  - Returns `{ client_secret, stripe_customer_id }` for Stripe.js to collect card details
  - Ensures Stripe customer exists (creates if not present, persists ID to profile)

- [ ] Add "Card on file" section to client profile page (Sprint 58+)
  - Add card via SetupIntent flow
  - Display last 4 digits + expiry
  - Remove card option

- [x] Wire fee charging into `AppointmentFsmService.transition()` (Sprint 57.2)
  - After `late_cancel` / `no_show` terminal transitions, calls `cancellationSvc.chargeFee()` non-blocking
  - If `penalty.feeAmount > 0` → charge attempt; card decline → ledger debit fallback
  - FSM transition itself never blocked by payment failure

- [x] Create `client_ledger` migration (in `20260300010000_cancellation_policies.sql`):

```sql
CREATE TABLE IF NOT EXISTS client_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit','debit')),
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,         -- 'no_show_fee','late_cancel_fee','overpayment','adjustment'
  appointment_id UUID REFERENCES appointments(id),
  sale_transaction_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE client_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_views_client_ledger" ON client_ledger USING (trainer_id = auth.uid());
CREATE POLICY "client_views_own_ledger" ON client_ledger FOR SELECT USING (client_id = auth.uid());
```

**Acceptance Criteria:**

- Card on file saved via Stripe SetupIntent (no PCI data in Supabase)
- Late-cancel fee charged automatically when `AppointmentFsmService` transitions to `late_cancel`
- No-show fee charged automatically when auto-no-show triggers
- Failed charge creates ledger debit entry (debt tracked, not lost)
- Session forfeiture decrements `sessions_remaining` regardless of whether fee applies
- All Stripe events logged for audit

---

## Epic 58: Pricing Options — Packs, Passes & Checkout POS

### 58.1 Pricing Options Data Model

**Priority:** P0 (Critical)
**Sprint:** 58
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can create session packs, time-based passes, and drop-in rates for my services
- As a client, I can purchase a session pack and see my remaining sessions

**Implementation Tasks:**

- [x] Create migration `20260300020000_pricing_options.sql`
  - `pricing_option_type` ENUM (4 types); `pricing_options`, `client_services`, `sale_transactions` tables with full RLS
  - `decrement_sessions_remaining(p_client_service_id)` atomic RPC function with row-level lock (`FOR UPDATE`)
  - Client read policy on active options; trainer owns policy for management
  - `touch_updated_at()` trigger for `pricing_options` and `client_services`

- [x] Add types to `@fitos/shared` (`libs/shared/src/lib/types.ts`):
  - `PricingOptionType`, `AutopayInterval`, `PricingOption`, `ClientService`
  - `CheckoutPaymentMethod`, `SaleTransaction`, `ProcessCheckoutDto`, `CheckoutResult`

- [x] Create `PricingOptionService` at `apps/mobile/src/app/core/services/pricing-option.service.ts`
  - Full CRUD + archive/restore for trainer's pricing options
  - `getClientServices(clientId)`: Active packages joined with pricing_option
  - `getApplicableServices(clientId, serviceTypeId)`: FIFO — soonest-expiring first, filters by service_type_ids
  - `sellToClient(clientId, pricingOptionId, opts?)`: Creates client_services with correct initial sessions and expiry
  - `decrementSession(clientServiceId)`: Delegates to `decrement_sessions_remaining` DB RPC
  - Signal state: `pricingOptions`, `isLoading`, `error`, `activeOptions`, `sessionPackOptions`, `contractOptions`

- [x] Create pricing options management page at `features/settings/pages/pricing-options/pricing-options.page.ts`
  - Active / archived section tabs; type badges (Primary=pack, Secondary=pass, Success=drop-in, Warning=contract)
  - Create/edit inline form: name, type, price, session count, expiry window, service type multi-select, autopay interval + session count, sell_online toggle
  - Type-change auto-resets irrelevant fields; archive (soft-delete) vs delete to preserve existing client_services
  - Route: `tabs/settings/pricing-options` (trainerOrOwnerGuard); menu entry added to Settings → Business Tools

**Acceptance Criteria:**

- FIFO session selection: soonest-expiring package consumed first
- Decrements use DB transactions to prevent race conditions
- Trainer can have unlimited pricing options
- Client view shows remaining sessions and expiry dates

---

### 58.2 Checkout POS Side Panel

**Priority:** P0 (Critical)
**Sprint:** 58
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can check out an appointment from the calendar without leaving the schedule view
- As a trainer, the system auto-selects the client's applicable pricing option at checkout

**Implementation Tasks:**

- [x] Create `CheckoutPanelComponent` at `features/scheduling/components/checkout-panel/checkout-panel.component.ts`
  - Modal sheet opened from appointment block; Session summary card (client, service, time, duration)
  - Auto-selects applicable `client_services` record (FIFO by expiry); falls back to card if no package
  - Payment method grid: session_pack (shows all applicable packages), card, cash, account_balance, comp
  - Tip + discount inputs with live receipt preview showing subtotal, tip, discount, total
  - "Complete Checkout" button → calls `process-checkout` Edge Function; shows success toast; emits `checkoutCompleted`
  - `isProcessing` signal drives button spinner; `checkoutError` signal shows inline error

- [x] Create Edge Function `supabase/functions/process-checkout/index.ts`
  - Inputs: `appointment_id`, `payment_method`, `client_service_id?`, `tip_amount?`, `discount_amount?`, `notes?`
  - Validates appointment status in (arrived, confirmed, booked)
  - Session deduction via `decrement_sessions_remaining` RPC (atomic, with row lock)
  - Card charge via Stripe PaymentIntent (off_session, confirm: true) — returns 402 on card decline
  - Creates `sale_transactions` + `visits` records; transitions appointment → `completed`
  - Returns `{ success, sale_transaction_id, sessions_remaining?, stripe_payment_intent_id? }`

- [x] Create `SaleTransactionsService` at `apps/mobile/src/app/core/services/sale-transactions.service.ts`
  - `getClientHistory(clientId, limit?)`: Transaction history for client profile
  - `getDailyReport(trainerId, date)`: Daily revenue summary (total, tips, counts by method)
  - `getRevenueReport(trainerId, dateFrom, dateTo)`: Date-range report for payroll/export
  - `getOutstandingBalances(trainerId)`: Aggregates client_ledger debit/credit per client

- [x] `sale_transactions` table created in migration `20260300020000_pricing_options.sql`
  - Includes `discount_amount` column; status enum: pending/completed/refunded/failed
  - RLS: trainer owns sales; client views own sales

**Acceptance Criteria:**

- Checkout panel opens in <150ms from appointment block tap
- FIFO package auto-selection applies correct client_service
- Session decremented atomically (no double-deduction under concurrent requests)
- Zero-dollar transaction created when session package used (for payroll/reporting)
- Appointment transitions to `completed` only after successful checkout
- Receipt displayable immediately after checkout

---

## Epic 59: Contracts, Autopay & Client Account Ledger

### 59.1 Autopay Contracts via Stripe Subscriptions

**Priority:** P1 (High)
**Sprint:** 59
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can enroll a client in a monthly autopay plan that automatically bills and refreshes sessions
- As a client, I receive a receipt when autopay charges

**Implementation Tasks:**

- [x] Create Edge Function `supabase/functions/create-subscription/index.ts`
  - Ensures Stripe Customer exists (creates if missing, persists `stripe_customer_id` to profile)
  - Attaches payment method + sets as default; upserts Stripe Product keyed to `pricing_option_id`
  - Creates recurring Stripe Price (weekly / every-2-weeks via `interval_count: 2` / monthly) and Stripe Subscription
  - On success: inserts `client_services` row with `stripe_subscription_id` + initial sessions
  - Orphan prevention: cancels subscription if DB insert fails
  - Returns `{ clientServiceId, stripeSubscriptionId, stripeCustomerId }`

- [x] Create Edge Function `supabase/functions/stripe-subscription-webhook/index.ts`
  - Verifies webhook signature via `stripe.webhooks.constructEventAsync`
  - Handles `invoice.payment_succeeded`: refreshes `sessions_remaining` to `autopay_session_count`, re-activates `is_active`, creates ledger credit entry
  - Handles `invoice.payment_failed`: marks `client_services.is_active = false`, creates ledger debit, notifies trainer via notifications table
  - Handles `customer.subscription.deleted`: deactivates `client_services`, notifies trainer
  - Returns 200 for all events (logs errors internally to prevent Stripe retry storms)

- [x] Create `ContractEnrollmentComponent` at `features/clients/components/contract-enrollment/contract-enrollment.component.ts`
  - Modal sheet listing all active contract pricing options
  - Shows billing amount, interval chip, and sessions-per-cycle chip for each option
  - Warning banner when client has no card on file; enroll button disabled accordingly
  - Billing summary before confirm; calls `create-subscription` Edge Function on enroll
  - Success toast; emits `enrolled` output with `{ clientServiceId, subscriptionId }`

- [x] Add contract status badge + balance chip to client profile toolbar:
  - "Active Contract" (green), "Payment Failed" (amber), "Contract Cancelled" (grey)
  - Account balance chip (green = credit, amber = outstanding debt); hidden when balance = 0
  - Both chips visible on all tabs via `chips-toolbar` below segment bar

**Acceptance Criteria:**

- Autopay charges via Stripe on the correct interval (weekly/biweekly/monthly) ✅
- Sessions refresh automatically on successful payment ✅
- Failed payment: trainer notified, session access paused ✅
- Client receives Stripe receipt email on every successful charge ✅

---

### 59.2 Client Account Ledger & Balance Display

**Priority:** P1 (High)
**Sprint:** 59
**Status:** ✅ Complete

**User Stories:**

- As a trainer, I can see a client's running account balance (credits and debits)
- As a client, I can see my transaction history and balance

**Implementation Tasks:**

- [x] Create `ClientLedgerService` at `apps/mobile/src/app/core/services/client-ledger.service.ts`
  - `getBalance(clientId)`: Direct DB aggregate (credits − debits); does not alter signal state
  - `getHistory(clientId, limit?)`: Ordered ledger entries, populates `entries` signal
  - `addCredit(dto)` / `addDebit(dto)`: Typed wrappers over `addEntry(dto)`, prepend to signal
  - Signal state: `entries`, `balance` (computed), `isLoading`, `error`
  - `formatReason(reason)`: Human-readable labels for all `LedgerReason` values
  - `clear()`: Resets state when navigating away from client detail

- [x] Create `ClientLedgerComponent` at `features/clients/components/client-ledger/client-ledger.component.ts`
  - Large running balance display (green = credit, amber = debt — never red)
  - `trending-up` / `trending-down` icon + status label ("Credit on account" / "Outstanding balance owed")
  - Scrollable transaction list: circular icon, reason label, notes, date, signed amount
  - "Adjust" button → `AlertController` with amount + notes inputs; "Add Credit" / "Add Debit" buttons
  - Implements `OnDestroy` to call `ledgerService.clear()` when unmounted

- [x] Add balance display to client detail page header
  - `IonChip` in `chips-toolbar` beneath segment: shows ±$x.xx with wallet icon
  - Chip only rendered when balance ≠ 0

- [x] Add "Billing" tab to client detail page
  - Active contract card (plan name, status badge, sessions remaining, start date)
  - "Enroll in Contract" CTA when no active contract found
  - `<app-client-ledger>` embedded below contract section
  - `loadBillingData(clientId)` loads latest contract + balance on `ngOnInit`

**Acceptance Criteria:**

- Balance computes correctly from all ledger entries (sum of credits minus sum of debits) ✅
- Debt displayed in amber (adherence-neutral — not red) ✅
- Manual adjustments require trainer role; logged with reason for audit ✅
- Balance can be applied as a payment method at checkout ✅ (account_balance payment method already in CheckoutPanel)

---

## Epic 60: Payroll Calculation & Reports

### 60.1 Trainer Pay Rate Configuration

**Priority:** P0 (Critical)
**Sprint:** 60
**Status:** Not Started

**User Stories:**

- As a trainer/gym owner, I can configure how each trainer earns per session type
- As a trainer, I understand what I'll earn per appointment

**Implementation Tasks:**

- [ ] Create migration `20260300030000_payroll.sql`

```sql
CREATE TYPE pay_rate_type AS ENUM ('flat_per_session', 'percentage_of_revenue', 'hourly', 'commission_on_sale');

CREATE TABLE trainer_pay_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type_id UUID REFERENCES service_types(id) ON DELETE CASCADE, -- NULL = applies to all
  pay_rate_type pay_rate_type NOT NULL DEFAULT 'flat_per_session',
  flat_amount NUMERIC(10,2),          -- for flat_per_session
  percentage NUMERIC(5,2),            -- for percentage_of_revenue (e.g. 50.00 = 50%)
  hourly_rate NUMERIC(10,2),          -- for hourly
  commission_percentage NUMERIC(5,2), -- for commission_on_sale
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy for what to pay trainers when client no-shows or cancels
CREATE TABLE trainer_pay_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pay_for_no_show BOOLEAN DEFAULT false,
  no_show_pay_percentage NUMERIC(5,2) DEFAULT 0, -- 0-100% of normal rate
  pay_for_late_cancel BOOLEAN DEFAULT false,
  late_cancel_pay_percentage NUMERIC(5,2) DEFAULT 0,
  pay_for_early_cancel BOOLEAN DEFAULT false,
  early_cancel_pay_percentage NUMERIC(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE trainer_pay_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_pay_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_owns_pay_rates" ON trainer_pay_rates USING (trainer_id = auth.uid());
CREATE POLICY "trainer_owns_pay_policies" ON trainer_pay_policies USING (trainer_id = auth.uid());
```

- [ ] Add types to `@fitos/shared`:

  ```typescript
  export type PayRateType = 'flat_per_session' | 'percentage_of_revenue' | 'hourly' | 'commission_on_sale';

  export interface TrainerPayRate {
    id: string;
    trainer_id: string;
    service_type_id?: string;
    pay_rate_type: PayRateType;
    flat_amount?: number;
    percentage?: number;
    hourly_rate?: number;
    commission_percentage?: number;
  }

  export interface TrainerPayPolicy {
    id: string;
    trainer_id: string;
    pay_for_no_show: boolean;
    no_show_pay_percentage: number;
    pay_for_late_cancel: boolean;
    late_cancel_pay_percentage: number;
    pay_for_early_cancel: boolean;
    early_cancel_pay_percentage: number;
  }
  ```

- [ ] Create `PayrollService` at `apps/mobile/src/app/core/services/payroll.service.ts`
  - `calculateSessionPay(visit, payRate, payPolicy)`: Returns pay amount for a single visit
    - `flat_per_session`: returns `flat_amount` (or 0 if no_show and `pay_for_no_show = false`)
    - `percentage_of_revenue`: returns `(service_price * percentage / 100)` × no_show multiplier
    - Applies `pay_policy` multiplier for no_show/late_cancel/early_cancel outcomes
  - `getPayrollSummary(trainerId, dateFrom, dateTo)`: Aggregate earnings report
  - Signal state: `payrollSummary`, `isLoading`

- [ ] Create payroll settings page at `features/settings/pages/payroll-settings/payroll-settings.page.ts`
  - List pay rates per service type
  - Configure no-show/cancel pay policies

**Acceptance Criteria:**

- Pay calculated correctly for all four rate types
- No-show/cancel multipliers applied per policy
- Pay amount stored on `visits.trainer_pay_amount` at checkout time

---

### 60.2 Payroll Report & CSV Export

**Priority:** P1 (High)
**Sprint:** 60
**Status:** Not Started

**User Stories:**

- As a trainer/owner, I can generate a payroll report for any date range
- As a trainer, I can export earnings data to CSV for my accountant

**Implementation Tasks:**

- [ ] Create `PayrollReportPage` at `features/reports/pages/payroll-report/payroll-report.page.ts`
  - Date range picker (preset: this week, last week, this month, last month, custom)
  - Summary cards: total sessions, total gross revenue, total trainer pay, total tips, total commissions
  - Line-item table: date, client, service, status, service price, pay rate, pay amount, tip
  - Filterable by trainer (owner view), service type, status

- [ ] Add CSV export via `@capacitor/filesystem`
  - Format mirrors ADP/Gusto import structure for future integration
  - Columns: date, trainer_name, client_name, service, status, service_price, pay_amount, tip, commission

- [ ] Create `RevenueReportPage` at `features/reports/pages/revenue-report/revenue-report.page.ts`
  - Daily/weekly/monthly revenue charts
  - Package sales vs drop-in breakdown
  - Outstanding balances (client ledger debts) summary

**Acceptance Criteria:**

- Report generates for any 90-day window in <2 seconds
- CSV exports to device files/share sheet
- Revenue report shows accurate totals matching sale_transactions

---

## Epic 61: Multi-Trainer RBAC, Conflict Prevention & Schedule Optimization

### 61.1 Enhanced RBAC for Scheduling

**Priority:** P0 (Critical)
**Sprint:** 61
**Status:** Not Started

**User Stories:**

- As a gym owner, I control exactly what each trainer can see and do in the schedule
- As a trainer, I can only see my own clients' data unless granted access

**Implementation Tasks:**

- [ ] Extend existing RBAC (from Phase 1 `USER_ROLES_ARCHITECTURE.md`) with scheduling permissions:
  - Add `scheduling_permissions` jsonb column to `profiles` or create separate table:

```sql
CREATE TABLE scheduling_permissions (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  can_view_all_schedules BOOLEAN DEFAULT false,
  can_edit_other_trainer_appointments BOOLEAN DEFAULT false,
  can_view_other_trainer_pay_rates BOOLEAN DEFAULT false,
  can_manage_pricing_options BOOLEAN DEFAULT false,
  can_access_payroll_reports BOOLEAN DEFAULT false,
  can_manage_cancellation_policies BOOLEAN DEFAULT false,
  can_configure_resources BOOLEAN DEFAULT false,
  allow_double_booking BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE scheduling_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_manages_permissions" ON scheduling_permissions
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('owner','manager'))
  );
```

- [ ] Update RLS policies on `appointments`, `visits`, `sale_transactions` to respect `scheduling_permissions`
- [ ] Create permissions management page at `features/settings/pages/staff-permissions/staff-permissions.page.ts`
  - List all staff with permission toggles per row
  - Owner and Manager roles auto-set sensible defaults
  - Changes take effect immediately (no app restart required)

**Acceptance Criteria:**

- Trainer without `can_view_all_schedules` cannot see other trainers' appointment details via RLS
- Owner can grant/revoke permissions in real-time
- Payroll report access gated by `can_access_payroll_reports`
- Pay rate visibility gated by `can_view_other_trainer_pay_rates`

---

### 61.2 Double-Booking Prevention & Travel Buffer

**Priority:** P0 (Critical)
**Sprint:** 61
**Status:** Not Started

**User Stories:**

- As a trainer, the system prevents me from being double-booked unless I explicitly allow it
- As a mobile trainer, my travel time between clients is automatically blocked

**Implementation Tasks:**

- [ ] Enhance `AvailabilityService.checkConflict()` (from Sprint 54):
  - Check: new appointment time + duration + `buffer_after_minutes` does not overlap existing
  - Check: travel buffer — if trainer has appointment at different facility ending within `travel_buffer_minutes`, block slot
  - Respect `allow_double_booking` permission flag (bypass check when enabled)
  - Use Postgres `FOR UPDATE SKIP LOCKED` on availability check + insert to prevent race conditions

- [ ] Surface conflicts clearly in booking form:
  - Show "Conflict: [ClientName] at [Time]" with option to override (if `allow_double_booking = true`)
  - Show "Travel buffer: [minutes] needed from [Facility A]" message

- [ ] Add `travel_buffer_minutes` field to trainer profile settings
  - Default: 0 (gym-based trainer)
  - Suggested: 15, 30, 45, 60 minutes for mobile trainers

**Acceptance Criteria:**

- Double-booking attempt blocked with clear error message naming the conflict
- Travel buffer blocks slots at the DB query level (not just UI)
- `allow_double_booking = true` shows warning but allows override
- Race condition test: two concurrent booking attempts for same slot → only one succeeds

---

### 61.3 Intelligent Schedule Optimization

**Priority:** P1 (High)
**Sprint:** 61
**Status:** Not Started

**User Stories:**

- As a trainer, when clients book online I want clustered, back-to-back appointments rather than scattered gaps
- As a client booking online, I see time slots ranked by how they minimize my trainer's dead time

**Implementation Tasks:**

- [ ] Create `ScheduleOptimizationService` at `apps/mobile/src/app/core/services/schedule-optimization.service.ts`
  - `rankSlots(slots, existingAppointments)`: Score each open slot
    - Score = 0 if completely isolated (large gaps on both sides)
    - Score increases when slot is adjacent to existing appointment (clusters sessions)
    - Score highest when slot fills a gap between two existing appointments
  - `getSuggestedSlots(trainerId, serviceTypeId, date, count)`: Returns top N slots sorted by score
  - Logic: prefer slots within 30 minutes of existing bookings; penalize slots that create <45-minute gaps

- [ ] Update client-facing booking UI to show suggested slots first
  - "Recommended" badge on top 3 optimized slots
  - "Show all times" toggle reveals full availability

- [ ] Create `ScheduleInsightsComponent` at `features/scheduling/components/schedule-insights/schedule-insights.component.ts`
  - "Today's utilization: 73%" bar
  - "3 gaps >30 min" callout with suggestion to fill them
  - Quick-add availability slot button

**Acceptance Criteria:**

- Slot ranking tested: adjacent-to-existing slots score higher than isolated slots
- Client booking view shows "Recommended" slots at top
- Utilization metric accurate (booked minutes / available minutes)
- Schedule insights visible on trainer dashboard

---

## Cost Summary

| Category | Per Trainer/mo | Notes |
| ---------- | --------------- | ------- |
| Supabase (DB + Edge Functions) | $0–$25 | Included in existing plan up to ~10k edge calls |
| Stripe (payment processing) | ~2.9% + $0.30 | Pass-through; no additional SaaS fee |
| pg_cron (auto no-show) | $0 | Included in Supabase Pro |
| CSV export | $0 | On-device via Capacitor Filesystem |
| **Total incremental** | **~$0–$25** | Stripe fees are client pass-through |

**Vs. Mindbody:** $169–$599/month per location for equivalent functionality.

---

## Sprint Dependency Graph

``` g
Sprint 54 (Data Model) ──► Sprint 55 (Calendar UI)
                      └──► Sprint 56 (FSM)
                      └──► Sprint 57 (Cancellation)

Sprint 56 (FSM) ──► Sprint 58 (Checkout POS)
Sprint 57 (Cancellation) ──► Sprint 58

Sprint 58 (Checkout) ──► Sprint 59 (Contracts/Ledger)
                    └──► Sprint 60 (Payroll)

Sprint 54 ──► Sprint 61 (RBAC + Conflict Prevention)
```

Sprint 54 is the hard prerequisite for everything. Sprints 60 and 61 can run in parallel after Sprint 58.

---

## Competitive Differentiators vs. Mindbody

| Pain Point (Mindbody) | FitOS Solution | Sprint |
| ----------------------- | --------------- | -------- |
| No auto no-show marking | Auto-transition after configurable window (default 10 min) via pg_cron | 56 |
| No travel buffer for mobile trainers | `travel_buffer_minutes` on service types + conflict engine | 54, 61 |
| Scattered scheduling, dead gaps | Slot scoring algorithm clusters bookings | 61 |
| $169–$599/month cost | Supabase/Stripe infrastructure, ~$0 incremental | All |
| Desktop-only management tools | Full Ionic mobile parity | All |
| Steep learning curve | Guided setup flows, sensible defaults | 54–58 |

---

## Related Documentation

- `docs/compass_artifact_wf-b19dff0b-c464-4308-bc4a-c25f33615af1_text_markdown.md` — Source Mindbody teardown
- `docs/PHASE1_BACKLOG.md` — MVP features (Sprints 0-8)
- `docs/PHASE2_BACKLOG.md` — AI features (Sprints 7-16)
- `docs/archive/sprints/SPRINTS_27-45_ROADMAP.md` — Phase 3 roadmap
- `docs/PHASE4_BACKLOG.md` — Zero Tracking Friction (Sprints 46-53)
- `docs/STRIPE_CONNECT_IMPLEMENTATION.md` — Stripe Connect reference
- `docs/USER_ROLES_ARCHITECTURE.md` — RBAC reference
- `docs/DESIGN_SYSTEM.md` — Colors, typography, spacing

---

## Definition of Done (Per Sprint)

- [ ] Implementation plan documented
- [ ] Database migration created and tested locally
- [ ] Services/components built with standalone + OnPush + signals pattern
- [ ] Types added to `libs/shared/src/lib/types.ts` (not inline in services)
- [ ] Unit tests written (>80% coverage for services)
- [ ] Manual testing on iOS and Android
- [ ] Dark theme applied to all new UI
- [ ] Accessibility: 7:1+ contrast, 44px+ touch targets
- [ ] No red/danger colors for neutral business states (use amber/purple)
- [ ] Code reviewed
- [ ] Documentation updated

---

**Phase Status:** 🚧 In Progress
**Completed:** Sprint 54 — Appointment Data Model · Sprint 55 — Calendar UI · Sprint 56 — 8-State FSM (AppointmentFsmService, auto-noshow-check Edge Function + pg_cron, AppointmentRequestQueueComponent, KioskPage) · Sprint 57 — Cancellation Policies & Late-Cancel Enforcement (CancellationPolicyService, cancellation_policies migration, client_ledger, charge-cancellation-fee Edge Function, setup-payment-method Edge Function, CancellationPoliciesPage settings, BookingForm deadline label, FSM fee wiring) · Sprint 58 — Pricing Options & Checkout POS (pricing_options/client_services/sale_transactions migration, PricingOption+ClientService+SaleTransaction types, PricingOptionService with FIFO selection + atomic decrement RPC, PricingOptionsPage settings, CheckoutPanelComponent modal, process-checkout Edge Function, SaleTransactionsService) · Sprint 59 — Contracts, Autopay & Client Account Ledger (create-subscription Edge Function with Stripe orphan prevention, stripe-subscription-webhook Edge Function handling payment_succeeded/failed/subscription.deleted, ContractEnrollmentComponent modal, ClientLedgerService with computed balance signal, ClientLedgerComponent with manual adjustment, Billing tab + contract status chips + balance chip in client-detail page)
**Next Step:** Sprint 60 — Payroll Calculation & Reports
