# Mindbody scheduling system: a complete technical teardown for building FitOS

Mindbody's appointment scheduling system is built around **six interconnected subsystems**: a time-grid calendar, an 8-state appointment lifecycle, a "pricing options" billing model, transaction-based invoicing, configurable staff payroll, and role-based multi-trainer management. The entire architecture centers on the concept of **visits** — each appointment completion or cancellation generates a visit record that drives billing, payroll, and reporting downstream. The most critical insight for building FitOS: Mindbody does not use traditional invoices. Instead, it uses a **transaction-based POS model** where checkout events create sale records, and session packages (called "pricing options") serve as the primary payment vehicle rather than per-session charges.

This report provides field-level detail across all six areas, sufficient for designing database schemas, Supabase tables, Stripe integration logic, and Angular/Ionic UI components.

---

## The appointment data model and API architecture

Mindbody's Public API V6 (`https://api.mindbodyonline.com/public/v6/`) exposes appointments through a dedicated `/appointment/` endpoint group. The core appointment object contains these fields, which map directly to what your Supabase schema needs:

| Field | Type | Purpose |
|-------|------|---------|
| `Id` | integer | Unique appointment ID |
| `Status` | enum string | Current lifecycle state |
| `StartDateTime` / `EndDateTime` | ISO 8601 datetime | Time slot (local timezone) |
| `Duration` | integer (minutes) | Session length |
| `StaffId` | integer | Assigned trainer |
| `ClientId` | string | Booked client |
| `SessionTypeId` | integer | Service type (e.g., "60-min PT Session") |
| `LocationId` | integer | Business location |
| `ClientServiceId` | integer | Which purchased package pays for this session |
| `Resources` | array of `{id, name}` | Rooms/equipment assigned |
| `Notes` | string | Free-text appointment notes |
| `GenderPreference` | enum: None/Female/Male | Staff gender preference |
| `StaffRequested` | boolean | Whether client specifically requested this trainer |
| `FirstAppointment` | boolean | Client's first-ever appointment flag |
| `AddOns` | array | Supplementary services booked on top |

The booking workflow follows a **7-step API call sequence**: fetch locations → fetch staff → fetch session types → query bookable time slots (`GET /appointment/bookableitems`) → look up client → check client's active pricing options (`GET /client/clientservices`) → create appointment (`POST /appointment/addappointment`). The `bookableitems` endpoint is the availability engine — it cross-references staff schedules, existing bookings, and resource availability to return only valid open slots.

**Session types** are the bridge concept linking appointments to pricing. Each session type belongs to a **program** (which has a `ScheduleType` of "Appointment" vs "Class"), and programs define cancellation windows via a `CancelOffset` field. Session types specify `DefaultTimeLength` in minutes and `NumDeducted` (how many visits are consumed from a package per booking). For FitOS, your schema needs a `service_types` table with duration, program association, deduction count, and price fields.

Mindbody fires **webhook events** for real-time sync: `appointmentBooking.created`, `appointmentBooking.updated`, and `appointmentBooking.cancelled`. Each payload includes `siteId`, `appointmentId`, `staffId`, `clientId`, `startDateTime`, `endDateTime`, `durationMinutes`, `sessionTypeId`, `status`, `isConfirmed`, and `hasArrived`. For FitOS, replicate this with Supabase Realtime subscriptions or Edge Function webhooks.

---

## The 15-minute grid calendar and multi-trainer schedule view

The Mindbody schedule UI is a **vertical daily timeline** with time increments running down the left axis at **15-minute intervals**. Each appointment renders as a colored rectangular block whose vertical height maps proportionally to duration — a 60-minute session spans 4 grid rows. The block displays **client name**, **service name**, and relies on color coding to convey status.

The critical UI distinction for owners is the **single-trainer vs. all-trainers view**. In single-trainer mode, one column fills the viewport showing that trainer's full day. In multi-trainer mode, each staff member gets their own **vertical column** arranged side-by-side, with trainer names at the top. Columns are ordered by a configurable **Staff Sort Order** setting. This side-by-side view is what owners use to manage scheduling across their entire team — they can see gaps, conflicts, and utilization at a glance.

The left sidebar contains: **dual mini-calendars** (two-month date picker), a **"Today" button**, **navigation arrows** for day-by-day movement, a **Check In/Check Out button** (clipboard icon), **staff filter controls**, and **color status legend tiles** at the bottom. The color tiles are interactive — clicking one reveals a dropdown with preset swatches and a hex color picker. Colors render at **40% lighter** than the selected swatch on actual appointment blocks.

Mindbody offers **five color-coding modes**: status-only, service-category-only, or three hybrid modes that combine both (defaulting to either category or status colors, with the other appearing only on terminal states like Completed or No-Show). For FitOS, implement at minimum status-based coloring with these defaults: Booked (blue), Confirmed (green), Arrived (yellow), Completed (gray), No-Show (red).

**Booking interaction patterns**: clicking an empty time slot opens a booking form pre-populated with that time and the staff column's trainer. The booking form includes: client search, staff selector, session type dropdown, date/time picker, duration (auto-set from session type, overridable), resource/room assignment, pricing option selector, notes field, confirmation checkbox, and recurring options. A separate "Find an Appointment" screen lets users search by criteria (staff, service, date range) to find open slots. Rescheduling happens through the **Modify Appointment** screen rather than drag-and-drop — users edit the time/date fields directly.

---

## The 8-state appointment lifecycle and status transitions

The appointment status system operates as a **finite state machine** with 8 states. This is the most critical business logic to replicate precisely in FitOS:

```
REQUESTED → BOOKED → CONFIRMED → ARRIVED → COMPLETED
                 ↓         ↓          ↓
            EARLY_CANCEL  LATE_CANCEL  NO_SHOW
```

**REQUESTED** — Optional state when "request-only" booking is enabled. Client submits a request; staff approves (→ BOOKED) or denies (→ deleted). Managed through a dedicated "Manage Appointment Requests" queue.

**BOOKED** — Default initial state on creation. The appointment appears on the schedule in the "booked" color. This is the starting state for all standard bookings.

**CONFIRMED** — Intermediate acknowledgment state. Triggered when a client responds to a confirmation email/SMS or when staff manually checks the "Confirmed?" checkbox. Treated as a sub-state of BOOKED in some API contexts.

**ARRIVED** — Client has checked in. Set manually by staff, via a check-in kiosk, or through the "Appointment Arrival" feature. This intermediate state sits between confirmation and completion.

**COMPLETED** — Terminal successful state. **Only reached through the checkout process** — there is no way to mark an appointment completed without processing payment or applying a pricing option. This is a critical design constraint: completion always involves a financial transaction.

**NO_SHOW** — Terminal negative state. **Mindbody does NOT auto-mark no-shows.** Staff must manually change the status. This is a widely cited pain point — third-party tools like Bitlancer exist solely to automate this. For FitOS, implement an auto-no-show feature that triggers N minutes after the appointment start time if no arrival is recorded. This is a clear competitive advantage.

**EARLY_CANCEL** — Cancellation that occurs **before** the late-cancel window cutoff. The session credit is returned to the client's package. Early-cancelled appointments are NOT retrievable through the `GetStaffAppointments` API — they exist only as visit records.

**LATE_CANCEL** — Cancellation that occurs **within** the late-cancel window. The session is **forfeited** (decremented from the package even though the client didn't attend). The system determines early vs. late automatically: `if (cancelTime >= appointmentStart - cancelWindowMinutes) → LATE_CANCEL`.

**Key business rules for the state machine:**
- Cancellation windows are configured **per service category** in minutes (e.g., 1440 minutes = 24 hours)
- Rescheduling creates a **new appointment** — the original transitions to early or late cancel depending on timing
- The waitlist **stops auto-filling** once inside the late-cancel window
- Terminal states (Completed, No-Show, Early Cancel, Late Cancel) cannot transition further, though Completed can be voided/refunded

---

## Cancel/pay, late cancellation enforcement, and no-show fees

"Cancel/pay" is Mindbody's concept for scenarios where the client cancels but still incurs a financial penalty. The enforcement mechanism differs by client payment type:

**For session-package clients:** The primary penalty is **session forfeiture** — the visit still decrements from their package count, consuming one of their purchased sessions. This is the default built-in behavior and requires no additional configuration. A client with a 10-pack who late-cancels goes from 7 remaining to 6, same as if they attended.

**For unlimited-membership clients:** Session forfeiture has no practical impact (they have unlimited visits), so businesses must charge a **flat monetary fee**. Mindbody has a "No-Show/Late Cancel Fees" settings screen (available on certain plans) where owners configure: a flat dollar amount for late cancels, a separate (typically higher) amount for no-shows, and which service categories the fees apply to. The fee charges to the client's **credit card on file**. If the card charge fails, the fee posts to the client's **account balance** as a debt (negative balance).

**For individual/drop-in clients:** If prepaid, the business simply retains the payment. If unpaid, staff manually processes the fee at their next visit or charges the card on file.

The late-cancel window determination is pure timestamp math:
```
cutoffTime = appointmentStartTime - cancelWindowMinutes
if (currentTime >= cutoffTime) → LATE_CANCEL with penalty
if (currentTime < cutoffTime) → EARLY_CANCEL, session returned
```

For FitOS with Stripe, implement this as: store the card via Stripe's `SetupIntent`, create a `PaymentIntent` with the fee amount when a late cancel or no-show occurs, and fall back to account balance (a ledger entry in Supabase) if the charge fails. The fee configuration should live on a `cancellation_policies` table linked to service categories, with fields for `late_cancel_window_minutes`, `late_cancel_fee_amount`, `no_show_fee_amount`, and `forfeit_session` boolean.

---

## The pricing options system and how checkout connects to billing

Mindbody's billing architecture revolves around **"Pricing Options"** — the purchasable items that grant clients access to services. This is the single most important concept to model correctly in FitOS. There are no traditional invoices; instead, everything flows through a POS-style checkout that creates **sale records**.

**Pricing option taxonomy:**

| Type | Example | How it works |
|------|---------|-------------|
| **Session pack** (count-based) | "10 PT Sessions – $800" | Fixed number of sessions, FIFO expiration |
| **Time-based pass** | "30-Day Unlimited – $200" | Unlimited sessions within a time window |
| **Drop-in / single session** | "Single PT – $100" | One-time use at full rate |
| **Contract / autopay** | "$150/month, 8 sessions/cycle" | Recurring billing, sessions refresh each cycle |

Each pricing option is configured with: **name**, **price**, **session count** (for count-based), **expiration period** (days/weeks/months from purchase or activation), **service categories** it covers, **revenue category** (for reporting), **sell-online toggle**, **tax settings**, and **autopay configuration** (for contracts). Critically, a pricing option is **created within a specific service category** — a package covering both "Personal Training" and "Stretching" requires separate pricing options for each category.

**Session decrementing logic:** When a client has multiple active pricing options, Mindbody uses **FIFO by expiration date** — the package expiring soonest is consumed first. Staff can also manually override which pricing option to apply at checkout. When a package expires with unused sessions, those sessions are **forfeited** by default (though staff can manually extend expiration dates).

The **checkout flow** is the critical billing moment. In Mindbody's current V2 POS, checkout happens via a **slide-out side panel** from the schedule view (no page navigation required):

1. Staff clicks "Check Out" on the appointment block
2. Side panel displays: client name, service rendered, price, available pricing options on the client's account
3. System auto-selects the applicable pricing option (FIFO logic) — or displays the drop-in rate if none exists
4. Staff can add retail products, add-on services, or modify the payment method
5. **Tip entry field** appears (tips can also be added to closed orders after the fact)
6. Payment method selection: pricing option (session deduction), credit card (on file/swiped/tapped), cash, check, gift card, account balance, or **split payment** across multiple methods
7. Transaction completes → sale record created → appointment status becomes COMPLETED → receipt generated

**Revenue recognition timing matters for your Stripe integration.** When a client buys a 10-pack for $800, the **full charge happens at purchase time** via Stripe. Each subsequent session checkout shows the pricing option as the payment method with a $0 charge — the revenue was already collected. For contracts/autopay, Stripe charges the recurring amount each billing cycle, and sessions refresh. Implement this with Stripe's `Subscription` objects for contracts and one-time `PaymentIntents` for package purchases.

The **client account balance** functions as a ledger/wallet: positive balance = credit (from overpayments, returns, or manual adjustments), negative balance = debt (from failed no-show charges or declined cards). In Supabase, model this as a `client_ledger` table with debit/credit entries and a computed running balance.

**Per-staff pricing** is supported — different trainers can charge different rates for the same session type. This is configured at the intersection of staff member and service type. For FitOS, add a `staff_service_rates` junction table with `staff_id`, `service_type_id`, and `price_override` fields.

---

## Payroll calculation from session data

Mindbody calculates trainer compensation through four configurable pay rate types, all set per staff member per service:

**Flat-rate per session:** A fixed dollar amount per completed appointment regardless of what the client paid. Example: trainer earns $40 per 60-minute session whether the client paid $100 drop-in or used a package session worth $80. This is the simplest model and the most common for personal training.

**Percentage of revenue:** Trainer receives a configurable percentage of the appointment's service price. Example: 50% of a $100 session = $50. When a session is paid by package, the effective per-session rate (total package price ÷ session count) determines the revenue base. This requires your payroll logic to know both the service price and the payment method used.

**Hourly rate with time clock:** Staff clock in/out through the software or Business mobile app. Hours worked × hourly rate = base pay, independent of sessions completed. Often combined with per-session or commission pay.

**Commission on sales:** Percentage of product sales, package sales, or membership sales. Configurable per item or per staff member. Not directly tied to session completion but appears in payroll reports alongside session earnings.

For the **incremental/group training model**, Mindbody supports tiered pay based on client count: 1-5 clients = $30, 6-10 = $45, 11-15 = $60. This uses numbered "pay rate slots" (1-21) with configurable ranges. This matters less for 1-on-1 personal training but is relevant if FitOS supports small-group training.

**How session outcomes affect trainer pay** is the critical business question. By default, **no-shows do NOT automatically generate staff pay** — this is a business policy decision. Mindbody provides the support article "How to pay staff for no-shows and late cancellations" to guide owners through configuration. The owner can choose whether to: pay full session rate for no-shows, pay partial rate, or pay nothing. For late cancels and early cancels, the same policy flexibility exists. For FitOS, model this as a `trainer_pay_policies` configuration with boolean flags and rate overrides per status type.

**Payroll reports** aggregate: staff name, sessions performed, pay rates applied, calculated amounts, tips collected, commissions earned, and hours worked. Reports run for any custom date range (the owner selects weekly, bi-weekly, or monthly periods). Mindbody **does not process actual payroll** (no tax withholding or direct deposit) — it exports earnings data to CSV or integrates directly with **ADP's RUN platform** via a connector app. For FitOS, build payroll summary reports exportable to CSV, with future integration potential for Gusto, ADP, or similar.

---

## Multi-trainer management, permissions, and conflict prevention

The owner's view presents all trainer columns side-by-side in the daily schedule, enabling at-a-glance management of the entire team's bookings, gaps, and utilization. Staff availability is configured through a dedicated screen (Staff → Availability) where trainers define **availability blocks** per day — start time, end time, optionally for specific date ranges. Trainers can set their own availability through the Business mobile app, though owner/manager permissions control whether they can override system settings.

**Double-booking prevention** is enabled by default. The system validates against existing bookings, staff availability windows, and resource assignments when any appointment is created. A specific toggle exists to **allow** double-booking for businesses that want it (e.g., a trainer supervising two clients on adjacent equipment). Buffer time between appointments is configurable per service type — it creates mandatory spacing invisible to clients booking online.

**The RBAC system** has four effective tiers:

- **Owner** — Unique login (one per site). Full control over everything. Exclusive access to: subscription billing, third-party API integrations, marketing tools, and all financial data.
- **Manager** — All calendars, all staff information, reports, payroll, client data, schedule editing. Cannot modify subscription or API settings.
- **Staff/Practitioner** — Manage own calendar, view own schedule, check in clients, process payments, limited client data. Cannot see other trainers' pay rates or financial reports.
- **Front Desk** — Access all calendars for booking purposes, POS checkout, client check-in, limited reporting. Read-only on schedule configuration.

Permissions are organized into **custom permission groups** rather than fixed roles, with granular toggles across categories: Settings, Client data, Classes/Courses, Appointments, Reports, Staff management, and Manager Tools. Staff members can be limited to viewing **only their own schedule** or all schedules. Critical for FitOS: the `staff_pay_rates` and `View/edit staff member personal information` permissions control who can see and modify compensation data.

---

## Where Mindbody falls short and where FitOS can win

User reviews across G2 (**3.6/5**), Capterra (**4.0/5**), and Software Advice consistently reveal the same pain points — each representing a competitive opportunity for FitOS:

**No automatic no-show marking** is the most frequently cited operational frustration. Staff must manually change each missed appointment to No-Show status. Third-party tools (Bitlancer, O2M Studio) exist solely to fill this gap. FitOS should auto-transition appointments to No-Show status after a configurable window (default 10 minutes post-start).

**No travel buffer time** for mobile trainers was called out specifically by personal trainers who travel between clients. Mindbody cannot block transition time between appointments at different locations. FitOS should add a `travel_buffer_minutes` field on service types or staff profiles.

**No schedule optimization** — clients book whenever slots are open, creating fragmented days with scattered appointments and dead gaps between sessions. An intelligent scheduling system that suggests clustered time slots to clients would dramatically improve trainer utilization.

**High cost** ($169–$599/month per location) drives independent trainers and small gyms to seek alternatives. Many reviewers note "almost my whole profit was going to rent and scheduling software." FitOS on Supabase/Stripe has a dramatically lower infrastructure cost basis.

**Steep learning curve** — setup takes "over a week" versus hours for competitors like Vagaro or GlossGenius. The pricing-options-within-service-categories architecture, while powerful, is confusing for non-technical owners. FitOS should flatten this hierarchy with guided setup flows.

**Limited mobile functionality** — many management tools are desktop-only (schedule color customization, detailed reporting, some configuration). An Ionic-based FitOS with feature parity across mobile and web has a clear advantage.

On the other hand, Mindbody's **consumer marketplace app** (2.8M+ active users providing customer acquisition), **700+ partner integrations**, and **FitMetrix performance tracking** integration are genuine moats that FitOS would need to address through alternative distribution channels and partnerships.

---

## Conclusion: schema and architecture implications for FitOS

The Mindbody teardown reveals a system built around **visits and pricing options** rather than traditional invoices and subscriptions. For FitOS on Supabase, the core tables should model: `appointments` (with the 8-state status enum), `service_types` (with duration, base price, cancel window), `pricing_options` (session packs, passes, contracts), `client_services` (purchased pricing options with remaining counts and expiration), `visits` (the billing/payroll record created from each appointment outcome), `sale_transactions` (checkout records with line items and payment methods), and `client_ledger` (account balance entries).

The Stripe integration maps cleanly: `PaymentIntents` for package purchases and drop-in sessions, `SetupIntents` for storing cards (enabling no-show/late-cancel charges), `Subscriptions` for contract/autopay billing, and `Refunds` for cancellations of prepaid sessions. The FIFO session-decrementing logic and per-staff pricing overrides are the most complex business logic to implement correctly.

The three highest-impact competitive differentiators FitOS should ship from day one are **automatic no-show detection**, **travel buffer time for mobile trainers**, and **intelligent schedule optimization** that clusters appointments to minimize dead time. These address Mindbody's most painful gaps while costing relatively little to build.