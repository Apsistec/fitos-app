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
**Status:** Not Started

**User Stories:**

- As a trainer, I can see my full day as a vertical time grid with appointments as colored blocks
- As a trainer, I can click an empty slot to open a pre-filled booking form

**Implementation Tasks:**

- [ ] Create `ScheduleCalendarComponent` at `apps/mobile/src/app/features/scheduling/components/schedule-calendar/schedule-calendar.component.ts`
  - Vertical timeline: 15-minute rows from configurable start/end hours (default 6am–9pm)
  - Appointment blocks: height = `(duration_minutes / 15) * rowHeight`; display client name + service name
  - Color coding by status:
    - `booked` → `--fitos-accent-primary` (teal)
    - `confirmed` → `#22C55E` (green)
    - `arrived` → `#EAB308` (yellow)
    - `completed` → `#6B7280` (gray)
    - `no_show` → `#8B5CF6` (purple, not red — adherence-neutral)
    - `early_cancel` → `#374151` (dark gray)
    - `late_cancel` → `#B45309` (amber)
    - `requested` → `#3B82F6` (blue, pending)
  - Click empty slot → opens booking modal pre-filled with time + trainer
  - Click appointment block → opens appointment detail sheet
  - Scroll to current time on load
  - Touch-optimized: 44px minimum touch targets for appointment blocks
  - OnPush + signals; virtual scroll for the time rows

- [ ] Create `AppointmentBlockComponent` at `features/scheduling/components/appointment-block/appointment-block.component.ts`
  - Displays status color, client name, service, time
  - Long-press reveals quick actions: Confirm, Mark Arrived, Check Out, Cancel

- [ ] Create `BookingFormModal` at `features/scheduling/components/booking-form/booking-form.component.ts`
  - Fields: client search (typeahead from clients list), service type selector, date/time picker, duration (auto-set, overridable), resource/room selector, pricing option selector, notes, confirmation toggle, recurring options
  - Validates against availability engine before submit
  - Inline error if slot no longer available

- [ ] Create scheduling page at `apps/mobile/src/app/features/scheduling/pages/schedule/schedule.page.ts`
  - Houses calendar + sidebar
  - Sidebar: mini date-picker (2-month view), Today button, staff filter, color legend
  - Route: `tabs/schedule`

**Acceptance Criteria:**

- 15-minute grid renders correctly for a full day (6am–9pm = 60 rows)
- Appointment block height is proportional to duration (60-min = 4 rows)
- Status colors applied per spec above
- Empty slot click → booking form opens in <150ms
- Booking form pre-fills time and trainer from clicked slot
- Scroll position restores to current time on page load

---

### 55.2 Multi-Trainer Side-by-Side View

**Priority:** P1 (High)
**Sprint:** 55
**Status:** Not Started

**User Stories:**

- As a gym owner/manager, I can see all trainers' schedules side-by-side in one view
- As an owner, I can spot scheduling gaps and over-loaded trainers at a glance

**Implementation Tasks:**

- [ ] Extend `ScheduleCalendarComponent` with multi-trainer mode
  - When `viewMode = 'all-trainers'`: render one vertical column per trainer
  - Trainer name header at top of each column
  - Columns ordered by configurable `sort_order` field on `profiles`
  - Horizontal scroll when > 3 trainers
  - Responsive: collapse to single-trainer picker on mobile viewport <768px

- [ ] Add trainer filter bar to schedule page
  - "All Trainers" / individual trainer chips
  - Owner/manager role: sees all-trainer view by default
  - Trainer role: single-column (own schedule) by default, can be granted permission to view others

- [ ] Add `Find an Appointment` bottom sheet at `features/scheduling/components/find-appointment/find-appointment.component.ts`
  - Search by: trainer, service type, date range
  - Returns list of available slots matching criteria
  - Tap slot → opens booking form

**Acceptance Criteria:**

- Multi-trainer view shows ≥4 trainers side-by-side with horizontal scroll
- Column order respects trainer sort_order
- Staff role can only see own column unless granted permission
- Find Appointment search returns results in <500ms

---

## Epic 56: 8-State Appointment Lifecycle & FSM

### 56.1 Appointment State Machine Service

**Priority:** P0 (Critical)
**Sprint:** 56
**Status:** Not Started

**User Stories:**

- As a trainer, status transitions are enforced — I cannot accidentally skip states
- As a client, booking confirmation triggers an email/SMS acknowledgment

**Implementation Tasks:**

- [ ] Create `AppointmentFsmService` at `apps/mobile/src/app/core/services/appointment-fsm.service.ts`
  - Enforce valid transitions:

    ``` g
    requested  → booked (approve) | deleted (deny)
    booked     → confirmed | arrived | early_cancel | late_cancel
    confirmed  → arrived | early_cancel | late_cancel
    arrived    → completed | no_show
    completed  → (terminal; refund path handled by checkout service)
    no_show    → (terminal)
    early_cancel → (terminal)
    late_cancel  → (terminal)
    ```

  - `transition(appointmentId, toStatus, metadata?)`: Validates allowed transition, applies business rules, writes DB, creates visit record on terminal state
  - `isLateCancel(appointment)`: Returns true if `now >= start_at - cancel_window_minutes`
  - `canTransition(from, to)`: Pure function for UI guard checks
  - Emits Supabase realtime event on every state change

- [ ] **Auto No-Show Detection** (key competitive differentiator):
  - Create Edge Function `supabase/functions/auto-noshow-check/index.ts`
    - Runs on a pg_cron schedule every 5 minutes
    - Query: `SELECT * FROM appointments WHERE status IN ('booked','confirmed','arrived') AND start_at < now() - interval '10 minutes' AND arrived_at IS NULL`
    - For each result: transition to `no_show`, create visit record, trigger no-show fee if applicable
    - Configurable window per trainer: `auto_noshow_minutes` field on `profiles` (default 10)
  - Add `auto_noshow_minutes` to trainer settings page

- [ ] Create `AppointmentRequestQueueComponent` at `features/scheduling/components/request-queue/request-queue.component.ts`
  - Shows all `requested` status appointments
  - Approve → transitions to `booked`, sends confirmation
  - Deny → deletes appointment, sends notification
  - Badge count on schedule tab icon

- [ ] Integrate with existing notification infrastructure (Sprint 52 `NotificationService`)
  - Booking created → SMS/push to client
  - Confirmed → push to client
  - 24hr reminder → push to client and trainer
  - No-show auto-triggered → push to trainer

**Acceptance Criteria:**

- Invalid status transitions rejected with descriptive error
- Auto no-show triggers within 15 minutes of appointment start if no arrival recorded
- Auto no-show window is configurable per trainer (5–60 minutes)
- Visit record created for every terminal state (completed, no_show, early_cancel, late_cancel)
- Booking confirmation notification fires within 30 seconds of appointment creation

---

### 56.2 Check-In Kiosk Mode

**Priority:** P2 (Medium)
**Sprint:** 56
**Status:** Not Started

**User Stories:**

- As a trainer, I can set up a tablet at the gym entrance for client self-check-in
- As a client, I can tap my name on the kiosk to mark myself arrived

**Implementation Tasks:**

- [ ] Create `KioskPage` at `features/scheduling/pages/kiosk/kiosk.page.ts`
  - Shows upcoming appointments for the day (next 2 hours)
  - Client taps their name → confirms identity (last 4 of phone or DOB) → status transitions to `arrived`
  - Large touch targets (64px+), high contrast for gym lighting
  - Auto-refreshes every 60 seconds via Realtime subscription
  - PIN-protected exit (trainer sets PIN in settings)

**Acceptance Criteria:**

- Kiosk page accessible from trainer settings
- Arriving client check-in updates appointment status to `arrived` within 2 seconds
- Kiosk auto-returns to waiting screen after 30 seconds of inactivity

---

## Epic 57: Cancellation Policies & Late-Cancel Enforcement

### 57.1 Cancellation Policy Configuration

**Priority:** P0 (Critical)
**Sprint:** 57
**Status:** Not Started

**User Stories:**

- As a trainer, I can set different cancellation windows and fees per service type
- As a client, I am clearly shown the cancellation deadline before booking

**Implementation Tasks:**

- [ ] Create migration `20260300010000_cancellation_policies.sql`

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

- [ ] Add types to `@fitos/shared`:

  ```typescript
  export interface CancellationPolicy {
    id: string;
    trainer_id: string;
    service_type_id?: string;
    late_cancel_window_minutes: number;
    late_cancel_fee_amount: number;
    no_show_fee_amount: number;
    forfeit_session: boolean;
    applies_to_memberships: boolean;
  }
  ```

- [ ] Create `CancellationPolicyService` at `apps/mobile/src/app/core/services/cancellation-policy.service.ts`
  - `getPolicyForAppointment(appointment)`: Resolve applicable policy (service-specific first, then global)
  - `getCancellationDeadline(appointment)`: Returns cutoff `Date`
  - `isLateCancel(appointment)`: Boolean check
  - `calculatePenalty(appointment, clientService)`: Returns `{ forfeitSession: boolean; feeAmount: number }`

- [ ] Create cancellation policy settings page at `features/settings/pages/cancellation-policies/cancellation-policies.page.ts`
  - List policies with late-cancel window and fee amounts
  - Add/edit/delete policies per service type

- [ ] Show cancellation deadline on booking confirmation and appointment detail screens

**Acceptance Criteria:**

- Policy resolves service-specific before global fallback
- Cancellation deadline shown on every appointment detail view
- `isLateCancel()` uses server timestamp (not client device time) for accuracy

---

### 57.2 Fee Charging via Stripe

**Priority:** P0 (Critical)
**Sprint:** 57
**Status:** Not Started

**User Stories:**

- As a trainer, late-cancel and no-show fees are automatically charged to the client's card on file
- As a trainer, if the charge fails, the amount posts to the client's account balance as a debt

**Implementation Tasks:**

- [ ] Create Edge Function `supabase/functions/charge-cancellation-fee/index.ts`
  - Inputs: `appointment_id`, `fee_type` (late_cancel | no_show)
  - Logic:
    1. Load applicable policy → determine fee amount
    2. Load client's Stripe `customer_id` and `default_payment_method`
    3. If session-package client and `forfeit_session = true` → decrement `client_services.sessions_remaining`
    4. If `fee_amount > 0`:
       - Try `stripe.paymentIntents.create({ amount, customer, payment_method, confirm: true, off_session: true })`
       - On success: create `sale_transactions` record
       - On failure (card declined): insert debit into `client_ledger` (negative balance = debt)
    5. Create `visits` record with terminal status

- [ ] Create Edge Function `supabase/functions/setup-payment-method/index.ts`
  - Creates Stripe `SetupIntent` for saving card without charge
  - Returns `client_secret` for Stripe.js to collect card details
  - Stores `payment_method_id` on client's profile

- [ ] Add "Card on file" section to client profile page
  - Add card via SetupIntent flow
  - Display last 4 digits + expiry
  - Remove card option

- [ ] Create `client_ledger` migration if not already present from Phase billing work:

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
**Status:** Not Started

**User Stories:**

- As a trainer, I can create session packs, time-based passes, and drop-in rates for my services
- As a client, I can purchase a session pack and see my remaining sessions

**Implementation Tasks:**

- [ ] Create migration `20260300020000_pricing_options.sql`

```sql
CREATE TYPE pricing_option_type AS ENUM (
  'session_pack',    -- fixed count, e.g. 10 sessions for $800
  'time_pass',       -- unlimited within window, e.g. 30-day pass
  'drop_in',         -- single session at full rate
  'contract'         -- recurring autopay, sessions refresh each cycle
);

CREATE TABLE pricing_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,                          -- "10-Pack Personal Training"
  option_type pricing_option_type NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  session_count INTEGER,                       -- NULL for time_pass/contract unlimited
  expiration_days INTEGER,                     -- days from purchase/activation; NULL = no expiry
  service_type_ids UUID[] NOT NULL DEFAULT '{}', -- which services this covers
  autopay_interval TEXT CHECK (autopay_interval IN ('weekly','biweekly','monthly')),
  autopay_session_count INTEGER,               -- sessions per autopay cycle
  revenue_category TEXT DEFAULT 'personal_training',
  sell_online BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchased pricing options (what a specific client owns)
CREATE TABLE client_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES profiles(id),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  pricing_option_id UUID NOT NULL REFERENCES pricing_options(id),
  stripe_subscription_id TEXT,               -- for contract/autopay types
  sessions_remaining INTEGER,               -- NULL for time_pass (unlimited)
  sessions_total INTEGER,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pricing_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_owns_pricing_options" ON pricing_options USING (trainer_id = auth.uid());
CREATE POLICY "trainer_views_client_services" ON client_services USING (trainer_id = auth.uid());
CREATE POLICY "client_views_own_services" ON client_services FOR SELECT USING (client_id = auth.uid());
```

- [ ] Add types to `@fitos/shared`:

  ```typescript
  export type PricingOptionType = 'session_pack' | 'time_pass' | 'drop_in' | 'contract';

  export interface PricingOption {
    id: string;
    trainer_id: string;
    name: string;
    option_type: PricingOptionType;
    price: number;
    session_count?: number;
    expiration_days?: number;
    service_type_ids: string[];
    autopay_interval?: 'weekly' | 'biweekly' | 'monthly';
    autopay_session_count?: number;
    sell_online: boolean;
    is_active: boolean;
  }

  export interface ClientService {
    id: string;
    client_id: string;
    trainer_id: string;
    pricing_option_id: string;
    stripe_subscription_id?: string;
    sessions_remaining?: number;
    sessions_total?: number;
    purchased_at: string;
    activated_at?: string;
    expires_at?: string;
    is_active: boolean;
  }
  ```

- [ ] Create `PricingOptionService` at `apps/mobile/src/app/core/services/pricing-option.service.ts`
  - Full CRUD for trainer's pricing options
  - `getClientServices(clientId)`: Active packages for a client
  - `getApplicableServices(clientId, serviceTypeId)`: Filter to matching service types, sorted FIFO by expiration (soonest first)
  - `decrementSession(clientServiceId)`: Decrement `sessions_remaining` (use DB transaction)
  - Signal state: `pricingOptions`, `isLoading`

- [ ] Create pricing options management page at `features/settings/pages/pricing-options/pricing-options.page.ts`
  - List active/inactive options with type badges
  - Create/edit form: name, type, price, session count, expiry window, applicable services, autopay settings

**Acceptance Criteria:**

- FIFO session selection: soonest-expiring package consumed first
- Decrements use DB transactions to prevent race conditions
- Trainer can have unlimited pricing options
- Client view shows remaining sessions and expiry dates

---

### 58.2 Checkout POS Side Panel

**Priority:** P0 (Critical)
**Sprint:** 58
**Status:** Not Started

**User Stories:**

- As a trainer, I can check out an appointment from the calendar without leaving the schedule view
- As a trainer, the system auto-selects the client's applicable pricing option at checkout

**Implementation Tasks:**

- [ ] Create `CheckoutPanelComponent` at `features/scheduling/components/checkout-panel/checkout-panel.component.ts`
  - Opens as slide-out bottom sheet from appointment block (no page navigation)
  - Displays: client name, service rendered, effective price
  - Auto-selects applicable `client_services` record (FIFO logic)
  - If no package → shows drop-in price
  - Payment method selector: pricing option (deduct session), card on file, cash, account balance, split payment
  - Tip entry field (numeric input)
  - "Add Service" button to add on-top services or retail items
  - "Complete Checkout" button → triggers transaction, transitions appointment to `completed`

- [ ] Create Edge Function `supabase/functions/process-checkout/index.ts`
  - Inputs: `appointment_id`, `payment_method`, `client_service_id?`, `tip_amount?`
  - Logic:
    1. Load appointment, verify status = `arrived` (or `confirmed` for direct checkout)
    2. If `client_service_id`: call `decrementSession()`, set `charge_amount = 0`
    3. If card/cash: create Stripe PaymentIntent or log cash
    4. Create `sale_transactions` record with line items
    5. Transition appointment → `completed`
    6. Create `visits` record
    7. Update trainer pay (via payroll service)
  - Return receipt data

- [ ] Create `SaleTransactionsService` at `apps/mobile/src/app/core/services/sale-transactions.service.ts`
  - `createSale(dto)`: Record sale with line items
  - `getClientHistory(clientId)`: Transaction history for client profile
  - `getDailyReport(trainerId, date)`: Daily revenue summary

- [ ] Add `sale_transactions` migration:

```sql
CREATE TABLE sale_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  appointment_id UUID REFERENCES appointments(id),
  client_service_id UUID REFERENCES client_services(id),
  stripe_payment_intent_id TEXT,
  payment_method TEXT NOT NULL,   -- 'session_pack'|'card'|'cash'|'account_balance'|'split'
  subtotal NUMERIC(10,2) NOT NULL,
  tip_amount NUMERIC(10,2) DEFAULT 0,
  total NUMERIC(10,2) NOT NULL,
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sale_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trainer_owns_sales" ON sale_transactions USING (trainer_id = auth.uid());
```

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
**Status:** Not Started

**User Stories:**

- As a trainer, I can enroll a client in a monthly autopay plan that automatically bills and refreshes sessions
- As a client, I receive a receipt when autopay charges

**Implementation Tasks:**

- [ ] Create Edge Function `supabase/functions/create-subscription/index.ts`
  - Creates Stripe `Product` + `Price` for the contract pricing option
  - Creates Stripe `Subscription` with the client's saved payment method
  - On success: insert `client_services` row with `stripe_subscription_id`
  - Returns `{ clientServiceId, stripeSubscriptionId }`

- [ ] Create Edge Function `supabase/functions/stripe-subscription-webhook/index.ts`
  - Handles `invoice.payment_succeeded`: refresh `sessions_remaining` to `autopay_session_count`
  - Handles `invoice.payment_failed`: mark `client_services.is_active = false`, notify trainer
  - Handles `customer.subscription.deleted`: deactivate `client_services`, notify trainer

- [ ] Create `ContractEnrollmentComponent` at `features/clients/components/contract-enrollment/contract-enrollment.component.ts`
  - Select autopay pricing option from list
  - Confirm billing amount and start date
  - Requires card on file (or add card inline)

- [ ] Add contract status badge to client profile: "Active Contract", "Payment Failed", "Cancelled"

**Acceptance Criteria:**

- Autopay charges via Stripe on the correct interval (weekly/biweekly/monthly)
- Sessions refresh automatically on successful payment
- Failed payment: trainer notified, session access paused
- Client receives Stripe receipt email on every successful charge

---

### 59.2 Client Account Ledger & Balance Display

**Priority:** P1 (High)
**Sprint:** 59
**Status:** Not Started

**User Stories:**

- As a trainer, I can see a client's running account balance (credits and debts)
- As a client, I can see my transaction history and balance

**Implementation Tasks:**

- [ ] Create `ClientLedgerService` at `apps/mobile/src/app/core/services/client-ledger.service.ts`
  - `getBalance(clientId)`: Computed from sum of debits/credits
  - `getHistory(clientId)`: Ordered ledger entries
  - `addCredit(clientId, amount, reason)`: Manual credit (overpayment, goodwill)
  - `addDebit(clientId, amount, reason, appointmentId?)`: Manual debit
  - Signal state: `balance`, `ledgerEntries`, `isLoading`

- [ ] Create `ClientLedgerComponent` at `features/clients/components/client-ledger/client-ledger.component.ts`
  - Running balance shown prominently (green = credit, amber = debt — never red)
  - Scrollable transaction list: date, description, amount, running balance
  - Manual adjustment button (trainer only)
  - "Apply balance to checkout" option in CheckoutPanel

- [ ] Add balance display to client profile header

**Acceptance Criteria:**

- Balance computes correctly from all ledger entries (sum of credits minus sum of debits)
- Debt displayed in amber (adherence-neutral — not red)
- Manual adjustments require trainer role; logged with reason for audit
- Balance can be applied as a payment method at checkout

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
**Completed:** Sprint 54 — Appointment Data Model & Database Foundation (migration, types, AppointmentService, ServiceTypeService, AvailabilityService, get-bookable-slots Edge Function)
**Next Step:** Sprint 55 — Calendar UI (Daily Grid & Multi-Trainer View)
