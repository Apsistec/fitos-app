# FitOS Sprints 78–86: Security Hardening Roadmap

**Last Updated:** 2026-03-06
**Phase 5 Status:** 📋 Planned (Sprints 54–61)
**Current Phase:** Phase 7 — Service Security Hardening
**Priority:** P0 — CRITICAL (must complete before public launch)
**Based on:** Comprehensive service-layer security audit (March 2026)

---

## Executive Summary

A full security audit of all 50+ Angular services in `core/services/` identified **150+ issues** across severity levels. The most critical findings include: pervasive IDOR (Insecure Direct Object Reference) vulnerabilities allowing cross-user data access, client-side financial calculations for payroll/revenue/billing, HIPAA audit trail failures, OAuth tokens stored in client-readable tables, and API keys exposed in client bundles.

**This phase must be completed before any public launch or beta expansion.**

### Severity Breakdown (Deduplicated)

| Severity | Count | Examples |
|----------|-------|---------|
| CRITICAL | ~18 | IDOR on appointments, client-side payroll, audit log failures, OAuth token exposure |
| HIGH | ~45 | Missing ownership checks, N+1 query storms, API key leaks, mock data in production |
| MEDIUM | ~65 | Console logging PII, no pagination, hardcoded locales, input validation gaps |
| LOW | ~22 | Type safety, stale activity cleanup, minor UX issues |

### Duplicate Issue Note

The following services had duplicate entries in the audit source document. All duplicates have been merged and deduplicated in this roadmap:
- **client.service.ts** — N+1 query, IDOR, and pagination issues appeared twice
- **stripe.service.ts** — Commission rate and role auth issues appeared twice
- **supabase.service.ts** — NavigatorLock issue appeared twice
- **rbac.service.ts** — cancelInvitation and audit log scope issues appeared twice

---

## Quick Reference

| Sprint | Focus | Severity | Points | Status |
|--------|-------|----------|--------|--------|
| 78 | Core Auth & Identity — IDOR Fixes | CRITICAL | 13 | 📋 Planned |
| 79 | Financial Security — Server-Side Calculations | CRITICAL | 13 | 📋 Planned |
| 80 | HIPAA & Compliance — Audit Trail Hardening | CRITICAL | 13 | 📋 Planned |
| 81 | Token, Key & Session Security | CRITICAL/HIGH | 8 | 📋 Planned |
| 82 | Authorization Sweep — Client/CRM/Social | HIGH | 13 | 📋 Planned |
| 83 | Authorization Sweep — Scheduling/Payments/Recovery | HIGH | 13 | 📋 Planned |
| 84 | Input Validation, Mock Data & Compliance | HIGH/MEDIUM | 8 | 📋 Planned |
| 85 | Performance — N+1 Queries & Pagination | HIGH/MEDIUM | 8 | 📋 Planned |
| 86 | Production Readiness — Logging & Polish | MEDIUM/LOW | 5 | 📋 Planned |

**Total Estimated Points:** 94

---

## Sprint 78: Core Auth & Identity — IDOR Fixes (13 points)

**Goal:** Eliminate all CRITICAL authorization bypass vulnerabilities in core identity, AI coaching, appointment, and assignment services.

**Rationale:** These services handle the most sensitive operations (authentication, AI conversations, appointment management, workout assignments) and currently accept arbitrary user IDs from callers instead of deriving them from the authenticated session.

### Tasks

#### 78.1 — Auth Service Hardening
**File:** `core/services/auth.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| JWT decoded client-side without signature verification used for role display | HIGH | Add explicit comment limiting `roleFromToken` to cosmetic use only; use `profile().role` for all access control |
| `loadProfile` signs user out on ANY error including network blips | HIGH | Distinguish network errors (retry) from auth errors (sign out) |
| Open redirect via unvalidated `returnUrl` in sessionStorage | HIGH | Validate URL is relative path starting with `/` and not `//` |
| `signInWithOtp` silently creates new accounts (`shouldCreateUser: true`) | MEDIUM | Set `shouldCreateUser: false` for sign-in flow |
| Duplicate `changePassword`/`updatePassword` methods | MEDIUM | Delete `updatePassword()`, keep `changePassword()` |
| `waitForInitialization` polls at 50ms (CPU waste) | MEDIUM | Convert to signal-based `effect()` approach |
| `isRefreshing` flag shared between two refresh paths | MEDIUM | Use separate flags per refresh path |
| 30+ `console.log/error` calls leak user IDs | LOW | Wrap in `isDevMode()` guard |
| `loadProfile` uses `select('*')` — over-fetches PII | LOW | Select only needed columns |

#### 78.2 — AI Coach Service — Session-Derived Identity
**File:** `core/services/ai-coach.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `loadConversation(userId)` accepts arbitrary user ID | CRITICAL | Remove parameter; derive from `auth.user()` |
| `sendMessage()` uses caller-supplied `userContext.user_id` for DB writes | CRITICAL | Always use `sessionUser.id` from auth |
| `collectTrainingData(trainerId)` accepts arbitrary trainer ID | CRITICAL | Remove parameter; derive from auth session |
| `generateId()` uses `Math.random()` | HIGH | Use `crypto.randomUUID()` |
| AI backend URL falls back to `localhost` in production | HIGH | Throw if not configured |
| `retry` operator retries on 401/403 errors | HIGH | Skip retry on 4xx except 429 |

#### 78.3 — Appointment FSM — Ownership Enforcement
**File:** `core/services/appointment-fsm.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `transition()` has no ownership/authorization check | CRITICAL | Verify caller is trainer or client on the appointment; restrict trainer-only transitions |
| `deny()` deletes any `requested` appointment without trainer check | CRITICAL | Add `.eq('trainer_id', user.id)` |
| DB update has no ownership filter (relies on RLS only) | HIGH | Add defense-in-depth `.eq('trainer_id')` |
| Cancellation fee is fire-and-forget with no audit trail | HIGH | `await` the fee charge; write failed charges to `client_ledger` |
| Notifications sent with no explicit recipient | HIGH | Add `recipientId` to each `notify.send()` call |
| `resolveCancelStatus()` uses `as any` casts | MEDIUM | Define `AppointmentWithServiceType` interface |
| `createVisitRecord()` failure silently swallowed | MEDIUM | Flag for manual reconciliation if visit insert fails after status commit |

#### 78.4 — Appointment Service — Session-Derived Identity
**File:** `core/services/appointment.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `loadAppointments(trainerId)` accepts arbitrary trainer ID | CRITICAL | Remove parameter; derive from auth session |
| `getClientAppointments(clientId)` has no auth check | CRITICAL | Remove parameter; use `auth.user().id` |
| `getVisitsForAppointment(appointmentId)` has no authorization | CRITICAL | Join through appointment to verify party membership |
| `createAppointment()` accepts arbitrary `trainer_id` and `client_id` | HIGH | Override DTO values with session-derived IDs |
| `updateAppointment()` has no ownership check | HIGH | Add `.eq('trainer_id', user.id)` |
| `handleRealtimeChange()` trusts raw payload without validation | HIGH | Add `isValidAppointment()` type guard |

#### 78.5 — Assignment Service — Relationship Verification
**File:** `core/services/assignment.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `loadClientAssignments(clientId)` has no authorization | CRITICAL | Verify caller is client or assigned trainer |
| `getTodaySchedule(trainerId)` accepts arbitrary trainer ID | CRITICAL | Remove parameter; derive from auth |
| `getRecentActivity(trainerId)` accepts arbitrary trainer ID | CRITICAL | Remove parameter; derive from auth |
| `updateAssignmentStatus()` has no ownership check | HIGH | Scope to trainer or client with `.or()` |
| `assignWorkout()` doesn't validate trainer-client relationship | HIGH | Verify relationship before insert |
| Writes to `workouts` table but reads from `assigned_workouts` | HIGH | Audit and use canonical table consistently |

### Acceptance Criteria
- [ ] All 6 services pass ownership verification tests
- [ ] No service method accepts arbitrary user/trainer/client IDs from callers
- [ ] All DB writes include session-derived ownership filters
- [ ] `crypto.randomUUID()` replaces `Math.random()` for all ID generation
- [ ] Auth service distinguishes network errors from auth errors

---

## Sprint 79: Financial Security — Server-Side Calculations (13 points)

**Goal:** Move ALL financial calculations (balance, payroll, revenue, pricing) from client-side `reduce()` to server-side RPCs. Ensure purchase flows only complete after payment confirmation.

### Tasks

#### 79.1 — Client Ledger — Server-Side Balance
**File:** `core/services/client-ledger.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Client-side balance computation via `reduce()` | CRITICAL | Create `get_client_ledger_balance` RPC |
| No authorization — any user can add ledger entries | HIGH | Verify `currentUserId === dto.trainer_id` |
| No amount validation (negative, zero, infinite) | MEDIUM | Validate positive, finite, max 100,000 |

#### 79.2 — Cancellation Policy — Server-Side Balance
**File:** `core/services/cancellation-policy.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `getLedgerBalance()` computes balance client-side | CRITICAL | Use same `get_client_ledger_balance` RPC |
| No authorization guard on CRUD operations | HIGH | Add `.eq('trainer_id', trainerId)` to all mutations |
| Missing pagination on ledger entries | HIGH | Add `.limit()` and `.range()` |
| `calculatePenalty` performs fee logic client-side | MEDIUM | Refresh policies before calculating; have Edge Function return computed penalty |

#### 79.3 — Payroll — Server-Side Calculations
**File:** `core/services/payroll.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Client-side financial calculations for payroll totals | CRITICAL | Have RPC return pre-computed totals |
| No ownership check on `deletePayRate` and `markProcessed` | HIGH | Add `.eq('trainer_id', trainerId)` |
| CSV export includes client names in plaintext | MEDIUM | Option to anonymize client names |

#### 79.4 — Sale Transactions — Server-Side Revenue
**File:** `core/services/sale-transactions.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Client-side revenue aggregation via `reduce()` | CRITICAL | Create `get_daily_revenue_summary` and `get_outstanding_balances` RPCs |
| No authorization on `getClientHistory` and `getTransaction` | HIGH | Scope to trainer or client |
| Missing pagination on revenue report | MEDIUM | Add `.limit(1000)` or cursor pagination |

#### 79.5 — Digital Product — Payment Before Access
**File:** `core/services/digital-product.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Purchase record inserted before payment confirmation | CRITICAL | Return `client_secret`; insert record only on `payment_intent.succeeded` webhook |
| No trainer-scoped authorization on product mutations | HIGH | Add `.eq('trainer_id', trainerId)` |
| Race condition on `incrementDownloadCount` | HIGH | Use `increment_download_count` RPC |
| `file_urls` exposed in product listing before purchase | MEDIUM | Exclude from unpurchased product queries |

#### 79.6 — Pricing Option — Server-Side Sales Logic
**File:** `core/services/pricing-option.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| No ownership check on `updatePricingOption` and `archivePricingOption` | HIGH | Add `.eq('trainer_id', trainerId)` |
| `sellToClient` performs complex business logic client-side | MEDIUM | Move to Edge Function for atomic execution |

#### 79.7 — Supporting Financial Services
**Files:** `subscription.service.ts`, `trainer-performance.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `monthlyRevenue` computed client-side with inaccurate multipliers | MEDIUM | Create `get_trainer_mrr` RPC |
| N+1 query storm in trainer metrics (5+ queries per trainer) | HIGH | Create `get_trainer_performance_metrics` RPC |
| Client-side facility metrics with hardcoded CAC ($100 placeholder) | MEDIUM | Compute server-side; remove or label placeholder |

### Database Migrations Required

```sql
-- RPC: get_client_ledger_balance
CREATE OR REPLACE FUNCTION get_client_ledger_balance(p_client_id uuid)
RETURNS numeric AS $$
  SELECT COALESCE(SUM(CASE WHEN entry_type = 'credit' THEN amount ELSE -amount END), 0)
  FROM client_ledger WHERE client_id = p_client_id;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- RPC: get_daily_revenue_summary
-- RPC: get_outstanding_balances
-- RPC: get_trainer_mrr
-- RPC: get_trainer_performance_metrics
-- RPC: increment_download_count
-- RPC: get_payroll_summary (with pre-computed totals)
```

### Acceptance Criteria
- [ ] Zero financial calculations happen client-side
- [ ] All RPCs created and tested with correct output
- [ ] Digital product purchases only recorded after payment confirmation
- [ ] All financial mutation methods include trainer ownership checks
- [ ] Payroll CSV export offers anonymization option

---

## Sprint 80: HIPAA & Compliance — Audit Trail Hardening (13 points)

**Goal:** Fix critical HIPAA compliance gaps in audit logging, health data consent, mental health screening, and session timeout.

### Tasks

#### 80.1 — Audit Log Service — Complete Overhaul
**File:** `core/services/audit-log.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Audit logs route through AI backend (wrong security boundary) | CRITICAL | Write directly to Supabase with insert-only RLS |
| Fire-and-forget — audit failures silently swallowed | CRITICAL | Retry 3x; queue locally on failure; flush on next launch |
| `generateUuid()` uses `Math.random()` for HIPAA session IDs | CRITICAL | Use `crypto.randomUUID()` |
| Identity fields (`user_id`, `user_email`) trust caller input | HIGH | Always override from authenticated session |
| Read methods have no role authorization gate | HIGH | Assert compliance/owner role before read access |
| `before_data`/`after_data` can contain raw PHI | HIGH | Sanitize to store only field names, not values |
| `console.debug` leaks resource context in production | HIGH | Remove or gate behind `isDevMode()` |
| `sessionStorage` for session ID — unreliable in Capacitor | MEDIUM | Use Capacitor `Preferences` or derive from auth token |
| `logDataExport` loses array structure via `join(',')` | MEDIUM | Store as JSON array or log one entry per resource |
| `ip_address` field is client-supplied (spoofable) | MEDIUM | Remove from client interface; capture server-side |
| No `timestamp` set client-side | LOW | Set `timestamp: new Date().toISOString()` |

#### 80.2 — Wellness Service — Auth & Consent
**File:** `core/services/wellness.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Mental health screening data sent without auth headers | HIGH | Add Bearer token from auth session |
| `logCrisisResourceAccess` is a no-op `console.log` | MEDIUM | Persist to `crisis_resource_access_log` table |
| Screening history stored only in client-side signal | MEDIUM | Persist to `wellness_screenings` table |

#### 80.3 — Health Sync — Consent Verification
**File:** `core/services/health-sync.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Health data synced without explicit data processing consent | MEDIUM | Check `user_consents.health_data_sync` before syncing |
| Mock data written to production DB in development | LOW | Guard mock data behind `!environment.production` |

#### 80.4 — HealthKit — Calorie Write Contradiction
**File:** `core/services/healthkit.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `saveWorkout` writes calories to HealthKit despite "never display calorie burn" rule | MEDIUM | Remove calorie writes; only write workout duration |

#### 80.5 — Idle Timeout — Timer & Info Leakage
**File:** `core/services/idle-timeout.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Timer stacking on re-init | MEDIUM | Cancel previous timers via `resetTimer$` Subject |
| DOM manipulation via `document.getElementById` | MEDIUM | Use Ionic's programmatic alert API |
| Console logs expose HIPAA timeout configuration | MEDIUM | Remove all production console output |
| Timeout reason leaked in URL query params | LOW | Use reason code only; login page displays message |

#### 80.6 — Firebase — Analytics Consent
**File:** `core/services/firebase.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| `trackApiPerformance` logs all API URLs to GA4 | MEDIUM | Categorize URLs generically (supabase_rest, supabase_functions, external) |
| No user consent check before enabling analytics | LOW | Gate analytics behind `analytics_consent` check |

### Acceptance Criteria
- [ ] Audit logs write directly to Supabase (not through AI backend)
- [ ] Failed audit writes retry 3x and queue for later
- [ ] No PHI values stored in audit `before_data`/`after_data`
- [ ] Health data sync requires explicit consent
- [ ] Crisis resource access logged persistently
- [ ] Idle timeout has no timer stacking or info leakage

---

## Sprint 81: Token, Key & Session Security (8 points)

**Goal:** Eliminate all client-side API key exposure, fix OAuth token storage, harden SSO sessions, and remove hardcoded localhost fallbacks.

### Tasks

#### 81.1 — Integration Service — OAuth Token Isolation
**File:** `core/services/integration.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| OAuth tokens stored in client-readable Supabase table | CRITICAL | Move token exchange to Edge Function; exclude token columns from client queries; add RLS blocking SELECT on token columns |
| No user ownership check on mutations | HIGH | Add `.eq('user_id', userId)` to all mutations |
| `getUserIntegrations` accepts arbitrary `userId` | MEDIUM | Derive from auth session |

#### 81.2 — SSO Service — Session & CSRF Hardening
**File:** `core/services/sso.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| SSO session stored in `localStorage` unencrypted | CRITICAL | Use `sessionStorage`; or httpOnly cookies set by server |
| `setupAutoRefresh` uses uncancelled `setTimeout` | MEDIUM | Track and cancel timer on logout |
| No CSRF protection on SSO callback | MEDIUM | Validate `state` parameter against stored value |
| Console logging in production | MEDIUM | Remove or gate |

#### 81.3 — Voice Service — Deepgram Key Scoping
**File:** `core/services/voice.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| Deepgram API key exposed in WebSocket subprotocol | HIGH | Ensure Edge Function returns temporary, scoped API key with short TTL |
| `getDeepgramApiKey` returns empty string on failure | MEDIUM | Throw descriptive error |

#### 81.4 — Food Service — API Key Proxy
**File:** `core/services/food.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| USDA API key embedded in client-side URL | HIGH | Proxy through Supabase Edge Function |
| SQL-wildcard injection in `searchCachedFoods` | MEDIUM | Escape `%` and `_` in user input |
| Unbounded in-memory cache with no eviction | MEDIUM | Enforce `CACHE_SIZE` with LRU eviction |

#### 81.5 — Supabase Service — NavigatorLock Restoration
**File:** `core/services/supabase.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| NavigatorLock disabled unconditionally (token refresh race) | HIGH | Only disable in development via environment guard |
| `from<T>()` wrapper loses type safety | MEDIUM | Remove wrapper; use `this.supabase.client.from()` directly |
| `rpc()` wrapper accepts `params?: object` | MEDIUM | Remove wrapper for direct typed usage |

#### 81.6 — Hardcoded Localhost Removal
**Files:** `support.service.ts`, `chronotype.service.ts`, `jitai.service.ts`, `ai-coach.service.ts`

| Issue | Severity | Fix |
|-------|----------|-----|
| All four services fall back to `http://localhost:8000` in production | HIGH | Throw error if `aiBackendUrl` is not configured |
| JITAI/chronotype send requests without auth headers | HIGH | Add Bearer token from auth session |

### Acceptance Criteria
- [ ] Zero API keys in client-side JavaScript bundles
- [ ] OAuth tokens never returned to client
- [ ] SSO sessions stored in `sessionStorage` (not `localStorage`)
- [ ] CSRF protection on SSO callback
- [ ] NavigatorLock enabled in production
- [ ] No `localhost` fallback URLs reach production

---

## Sprint 82: Authorization Sweep — Client/CRM/Social (13 points)

**Goal:** Add ownership checks to all client management, CRM, social, and content services.

### Tasks

#### 82.1 — Accountability Group Service
| Issue | Severity | Fix |
|-------|----------|-----|
| `updateGroup()`/`deleteGroup()` no ownership check | CRITICAL | Add `.eq('trainer_id', user.id)` |
| Raw `updates` object allows `trainer_id` reassignment | CRITICAL | Allowlist safe fields before DB write |
| `addMember()`/`removeMember()` no ownership check | HIGH | Verify group ownership before modifying |
| `getGroupMembers()` exposes PII without authorization | HIGH | Validate ownership before fetching members |
| `addMember()` max_members enforcement is client-side | MEDIUM | Enforce via DB trigger or atomic RPC |

#### 82.2 — Autonomy Service
| Issue | Severity | Fix |
|-------|----------|-----|
| No trainer-client relationship verification on any query | HIGH | Add `.eq('trainer_id', user.id)` to all queries |
| Score calculation performed client-side | MEDIUM | Move to `create_autonomy_assessment` RPC |

#### 82.3 — Check-In Service
| Issue | Severity | Fix |
|-------|----------|-----|
| No trainer-scoped authorization on template mutations | HIGH | Add `.eq('trainer_id', user.id)` |
| Client can submit response for any check-in | HIGH | Add `.eq('client_id', user.id)` |

#### 82.4 — Lead Service
| Issue | Severity | Fix |
|-------|----------|-----|
| No authorization on `getLead`, `deleteLead`, `completeTask`, `updatePipelineStage` | HIGH | Add `.eq('trainer_id', userId)` to all operations |
| `bulkUpdateStatus` has no trainer scope | MEDIUM | Add `.eq('trainer_id', userId)` |

#### 82.5 — Email Template & Email Services
| Issue | Severity | Fix |
|-------|----------|-----|
| XSS via template variable injection | HIGH | HTML-escape all variable values before insertion |
| No trainer-scoped authorization on template/sequence mutations | HIGH | Add `.eq('trainer_id', userId)` |
| CAN-SPAM: no unsubscribe link enforcement | MEDIUM | Append unsubscribe footer and physical address |
| Email metrics fetches entire `email_sends` table | HIGH | Create `get_trainer_email_metrics` RPC |
| `recordEmailOpen`/`recordEmailClick` have no authentication | MEDIUM | Use HMAC-signed tracking URLs |

#### 82.6 — Gamification Service
| Issue | Severity | Fix |
|-------|----------|-----|
| Leaderboard exposes `full_name` without consent verification | HIGH | Create `get_leaderboard` RPC enforcing privacy settings |
| `updatePreferences(userId)` accepts arbitrary user ID | MEDIUM | Derive from auth session |

#### 82.7 — Messaging Service
| Issue | Severity | Fix |
|-------|----------|-----|
| Realtime filter uses string interpolation | HIGH | Validate userId as UUID before interpolation |
| Message content stored without encryption | MEDIUM | Ensure strict RLS and audit logging; consider encryption |

#### 82.8 — Growth Analytics Service
| Issue | Severity | Fix |
|-------|----------|-----|
| PII exported via CSV through Share sheet | HIGH | Write to temp file; share as attachment, not raw text |
| No trainer-scoped filter on `exportCsv` query | MEDIUM | Add `.eq('trainer_id', trainerId)` |

### Acceptance Criteria
- [ ] All CRM/client/social services enforce ownership on every mutation
- [ ] Email template rendering escapes HTML in all variables
- [ ] Leaderboard respects user privacy opt-in settings
- [ ] CAN-SPAM compliance on all outgoing emails
- [ ] CSV exports shared as file attachments, not raw text

---

## Sprint 83: Authorization Sweep — Scheduling/Payments/Recovery (13 points)

**Goal:** Add ownership checks to scheduling, payment, recovery, content, and remaining services.

### Tasks

#### 83.1 — Availability, Scheduling Permissions & Service Types
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| availability | `setAvailability` accepts any trainer ID | MEDIUM | Verify `currentUserId === trainerId` |
| availability | Timezone mismatch in `isWithinAvailability` | MEDIUM | Convert to trainer's timezone |
| scheduling-permissions | `loadAllPermissions` has no owner scope | MEDIUM | Filter by facility ownership |
| scheduling-permissions | `upsertPermissions` allows setting for any user | MEDIUM | Verify caller manages target user |
| service-type | `updateServiceType` no ownership check | MEDIUM | Add `.eq('trainer_id', trainerId)` |

#### 83.2 — Measurement & Progress Photo Services
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| measurement | No authorization on any operations | HIGH | Scope to client or trainer with `.or()` |
| measurement | Progress photo path is predictable | HIGH | Use `crypto.randomUUID()` in path |
| progress-photo | Photos stored with permanently public URLs | HIGH | Use signed URLs with 1-hour expiry; store paths, not URLs |
| progress-photo | `deletePhoto` has no ownership check | MEDIUM | Add `.eq('client_id', userId)` |
| video-feedback | No auth on `getSubmission`, `updateSubmissionStatus`, `deleteAnnotation` | HIGH | Scope to trainer/client relationship |
| video-feedback | Video storage path is predictable | MEDIUM | Use `crypto.randomUUID()` |

#### 83.3 — Recovery Service
| Issue | Severity | Fix |
|-------|----------|-----|
| No authorization on any queries — any user can read any user's recovery data | HIGH | Verify self or trainer-client relationship |
| `calculateScore` makes 5 sequential RPC calls | MEDIUM | Combine into single `calculate_and_save_recovery_score` RPC |
| `acknowledgeScore` no ownership check | MEDIUM | Add `.eq('user_id', userId)` |

#### 83.4 — RBAC Service (Deduplicated)
| Issue | Severity | Fix |
|-------|----------|-----|
| `cancelInvitation()` no ownership check | HIGH | Add `.eq('owner_id', ownerId)` |
| `updatePermission()` audit log failure leaves permission changed | HIGH | Wrap in DB transaction via RPC |
| `applyTemplate()` single audit entry for bulk change | HIGH | Store full before/after permission snapshot |
| `getInvitationByToken` exposes full record to unauthenticated users | MEDIUM | Return minimal fields; filter to `status = 'pending'` |
| `loadAuditLog` only shows changes by owner | MEDIUM | Filter by target users under this owner |
| `hasPermission()` returns `false` when loading | LOW | Return tri-state (null = loading) |

#### 83.5 — Referral Service
| Issue | Severity | Fix |
|-------|----------|-----|
| `trackClick` uses broken RPC pattern and has no rate limiting | HIGH | Create `increment_referral_click` RPC with rate limiting |
| No server-side reward issuance verification | MEDIUM | Move to Edge Function triggered by verified events |

#### 83.6 — Stripe Service (Deduplicated)
| Issue | Severity | Fix |
|-------|----------|-----|
| `setCommissionRate()` no role/facility authorization | HIGH | Verify caller is facility owner |
| `disconnectAccount()` hard-deletes — no audit trail | MEDIUM | Soft-delete with status flag; deauthorize on Stripe's side |

#### 83.7 — Remaining Services
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| barcode-scanner | `loadRecentScans` accepts arbitrary userId | LOW | Derive from auth session |
| invitation | `cancelInvitation` no trainer scope | MEDIUM | Add `.eq('trainer_id', userId)` |
| nfc | `deleteTouchpoint` no trainer scope | MEDIUM | Add `.eq('trainer_id', user.id)` |
| notification | FCM token stored in `profiles` table | MEDIUM | Move to dedicated `push_tokens` table |
| nps | No trainer-scoped filters on surveys/testimonials | MEDIUM | Add `.eq('trainer_id', userId)` |
| passkey | `deletePasskey`/`renamePasskey` no ownership check | MEDIUM | Add `.eq('user_id', userId)` |
| trainer-methodology | `reviewResponse` no ownership check | MEDIUM | Add `.eq('trainer_id', user.id)` |
| trainer-public-profile | `getMyReviews` no trainer filter | MEDIUM | Add `.eq('trainer_id', user.id)` |
| workout | `loadTemplate` no ownership check | MEDIUM | Add `.eq('trainer_id', userId)` |
| workout-session | No auth on `getClientWorkoutHistory`, `getWorkoutDetail` | MEDIUM | Scope to trainer/client |

### Acceptance Criteria
- [ ] Progress photos use signed URLs with expiry (never public URLs)
- [ ] All scheduling/payment services enforce ownership
- [ ] RBAC permission changes are atomic with audit logs
- [ ] Referral click tracking uses server-side RPC
- [ ] FCM tokens in dedicated table with restricted access

---

## Sprint 84: Input Validation, Mock Data & Compliance (8 points)

**Goal:** Fix input validation gaps, remove mock data from production, enforce CAN-SPAM compliance, and address PII collection issues.

### Tasks

#### 84.1 — SQL Injection & Input Sanitization
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| exercise | `.or()` filter uses string interpolation | HIGH | Validate userId as UUID; or use parameterized RPC |
| exercise | `searchExercises` unsanitized `ilike` input | MEDIUM | Escape `%` and `_` characters |
| food | `searchCachedFoods` unsanitized `ilike` | MEDIUM | Escape wildcards |
| deep-link | No URL validation on deep link input | MEDIUM | Validate origin against allowlist; validate ID as UUID |
| deep-link | PWA fallback reads `window.location.href` without origin check | MEDIUM | Only process if path starts with `/action/` |

#### 84.2 — Mock Data Removal
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| photo-nutrition | Mock food recognition ALWAYS returned (API key never initialized) | HIGH | Throw user-facing error in production; mock only in dev |
| nutrition-parser | Mock Nutritionix fallback in production | HIGH | Throw error in production; mock only in dev |

#### 84.3 — PII & Data Collection
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| equipment-ocr | Raw OCR text stored (may capture other users' data) | MEDIUM | Store only parsed structured data, not raw text |
| geofence | Precise GPS coordinates stored in database | MEDIUM | Store only `gym_location_id`; omit exact coordinates |
| progressive-profiling | Health data question without special handling | LOW | Flag health-related questions with `is_health_data: true` |
| progressive-profiling | `localStorage` for session gap tracking | MEDIUM | Move to Supabase per-user storage |

#### 84.4 — CAN-SPAM Compliance
| Service | Issue | Fix |
|---------|-------|-----|
| email-template | No unsubscribe link enforcement | Append unsubscribe footer to all commercial emails |
| email | Same missing unsubscribe mechanism | Same fix as email-template |

#### 84.5 — Miscellaneous Validation
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| accountability-group | `createGroup()` no input validation | LOW | Validate name length, max_members range |
| ai-coach | No input validation on messages | MEDIUM | Trim, reject empty, cap at 2000 chars |
| chronotype/jitai | No auth headers sent to AI backend | HIGH | Add Bearer token from session |

### Acceptance Criteria
- [ ] No mock data reachable in production builds
- [ ] All `ilike`/`or` filters escape special characters
- [ ] Deep links validated against allowed origins
- [ ] All commercial emails include unsubscribe mechanism
- [ ] Equipment OCR stores only structured data, not raw text
- [ ] Geofence events store gym ID, not exact coordinates

---

## Sprint 85: Performance — N+1 Queries & Pagination (8 points)

**Goal:** Eliminate N+1 query patterns and add pagination to all unbounded queries.

### Tasks

#### 85.1 — N+1 Query Fixes
| Service | Issue | Severity | Fix |
|---------|-------|----------|-----|
| client | `getClientsNeedingAttention`: 2 queries per client (100+ for 50 clients) | HIGH | Create `get_clients_needing_attention` RPC |
| client | `getClientStats`: 3 sequential queries (parallelizable) | MEDIUM | Use `Promise.all()` |
| trainer-performance | `getTrainerMetrics`: 5+ queries per trainer | HIGH | Create `get_trainer_performance_metrics` RPC |
| milestone | `checkAndAwardSessionMilestones`: 1 query per threshold | MEDIUM | Fetch all existing milestones in one query |
| streak | `checkMilestones`: 4 queries per activity log | MEDIUM | Fetch all existing milestones in one query |
| recovery | `calculateScore`: 5 sequential RPCs | MEDIUM | Combine into single `calculate_and_save_recovery_score` RPC |

#### 85.2 — Pagination
| Service | Issue | Fix |
|---------|-------|-----|
| client | `loadClients()` no limit | Add `.range(0, 49)` |
| messaging | `loadConversations()` fetches ALL messages | Create `get_conversations` RPC returning latest per thread |
| assignment | `loadClientAssignments()` no date filter or limit | Filter last 30 days + `.limit(50)` |
| accountability-group | `getMyGroups()` no limit | Filter `is_active = true` + `.limit(50)` |
| measurement | `getMeasurements()` no limit | Add `.limit(100)` |
| lead | Various unbounded queries | Add pagination across all lead queries |

#### 85.3 — Caching & Rate Limiting
| Service | Issue | Fix |
|---------|-------|-----|
| appointment | `getAvailableSlots()` Edge Function called on every date tap | Add 1-minute client-side cache |
| auth | `window.addEventListener('focus')` fires network request every focus | Add 5-second debounce |
| jitai | Daily intervention count based on volatile signal | Query server for today's count |

#### 85.4 — Resource Cleanup
| Service | Issue | Fix |
|---------|-------|-----|
| appointment | Realtime channel never cleaned up on sign-out | Unsubscribe in auth sign-out effect |
| app-shortcuts | `startListening()` stacks duplicate listeners | Track registration state |
| app-shortcuts | Fires before auth is restored | Queue for post-login |
| celebration | `requestAnimationFrame` loop has no cancellation | Track and cancel on navigation |
| live-activity | Stale activity detection doesn't clean up properly | End orphaned activities from previous sessions |
| sync | Failed sync items silently deleted after 5 retries | Move to dead letter queue |

### Acceptance Criteria
- [ ] No service fires more than 3 queries per user action
- [ ] All list queries have `.limit()` or `.range()`
- [ ] Realtime subscriptions cleaned up on auth sign-out
- [ ] Edge Function calls debounced/cached where appropriate
- [ ] Failed sync items preserved in dead letter queue

---

## Sprint 86: Production Readiness — Logging & Polish (5 points)

**Goal:** Remove all production console logging, fix type safety issues, and address remaining low-severity items.

### Tasks

#### 86.1 — Console Logging Cleanup

**40+ services** have `console.log`, `console.error`, or `console.warn` calls that run in production, exposing internal details, user IDs, and error objects in browser DevTools.

**Approach:** Create a centralized `LogService` that no-ops in production:

```typescript
@Injectable({ providedIn: 'root' })
export class LogService {
  private enabled = !environment.production;

  debug(context: string, ...args: unknown[]): void {
    if (this.enabled) console.debug(`[${context}]`, ...args);
  }
  warn(context: string, ...args: unknown[]): void {
    if (this.enabled) console.warn(`[${context}]`, ...args);
  }
  error(context: string, ...args: unknown[]): void {
    if (this.enabled) console.error(`[${context}]`, ...args);
  }
}
```

**Services requiring cleanup (partial list — apply to ALL services):**
accountability-group, ai-coach, app-shortcuts, appointment-fsm, appointment, assignment, audit-log, auth, autonomy, availability, barcode-scanner, cancellation-policy, checkin, chronotype, client-dashboard, client-ledger, client, deep-link, digital-product, email-template, email, equipment-ocr, exercise, firebase, food, gamification, geofence, growth-analytics, haptic, health-sync, healthkit, idle-timeout, integration, invitation, jitai, lead, live-activity, measurement, messaging, milestone-detector, milestone, nfc, notification, nps, nutrition-parser, nutrition, passkey, payroll, photo-nutrition, pricing-option, program-assignment, progress-photo, progress-timeline, progressive-profiling, rbac, recovery, referral, sale-transactions, scheduling-permissions, service-type, social-login, sso, streak, stripe, subscription, support, sync, terra, trainer-methodology, trainer-performance, trainer-public-profile, update, video-feedback, voice, watch, wellness, widget, workout-session, workout

#### 86.2 — Type Safety Improvements

| Service | Issue | Fix |
|---------|-------|-----|
| ai-coach | `actions: any[]` in `AIBackendResponse` | Define `AIAction` interface |
| client-dashboard | Unsafe `Record<string, unknown>` casting | Define `AppointmentWithDetails` interface |
| growth-analytics | Pervasive `any` types | Define proper join query result types |
| notification | `any` casting on preferences and templates | Define types matching Supabase schema |
| nps | `any` casting throughout | Define typed interfaces for joins |
| referral | Pervasive `any` usage hiding real errors | Remove all `any`; define proper types |

#### 86.3 — Date/Timezone/Locale Fixes

| Service | Issue | Fix |
|---------|-------|-----|
| client | `getClientStats` uses UTC dates (wrong for non-UTC users) | Use authenticated user's timezone |
| appointment | `todayAppointments` uses string prefix match | Compare as `Date` objects |
| appointment-fsm | `formatApptTime()` uses device locale without timezone | Use explicit timezone |
| cancellation-policy | Hardcoded `'en-US'` locale | Use `navigator.language` |
| nutrition-parser | Hardcoded timezone `'US/Eastern'` | Use `Intl.DateTimeFormat().resolvedOptions().timeZone` |

#### 86.4 — Miscellaneous Low Items

| Service | Issue | Fix |
|---------|-------|-----|
| app-shortcuts | `log_workout` and `start_timer` navigate to same route | Differentiate or replace `start_timer` |
| client-dashboard | Hardcoded fallback nutrition targets (2000 cal) | Use `null` when targets not set; show "Set targets" CTA |
| invitation | `getInviteLink` uses `window.location.origin` | Use `environment.appUrl` |
| social-login | Empty `GOOGLE_WEB_CLIENT_ID` constant | Use `environment.googleWebClientId` |
| stripe | `fetchAccountStatus()` is dead code | Delete the method |
| watch | Stub service with console.log placeholders | Replace with no-ops |
| widget | Hardcoded fallback nutrition targets | Use `null`; widget shows "Set targets" |

### Acceptance Criteria
- [ ] `LogService` created and injected across all services
- [ ] Zero `console.*` calls in production builds
- [ ] No `any` type in service interfaces or response types
- [ ] All date operations use user's timezone from profile
- [ ] Dead code removed

---

## Dependencies & Prerequisites

| Sprint | Depends On |
|--------|-----------|
| 78 | None (can start immediately) |
| 79 | Sprint 78 (auth patterns established) |
| 80 | None (can run parallel with 78) |
| 81 | None (can run parallel with 78) |
| 82 | Sprint 78 (ownership pattern established) |
| 83 | Sprint 78, Sprint 82 (same pattern continuation) |
| 84 | None (can run parallel) |
| 85 | Sprints 79, 82, 83 (RPCs created there are reused) |
| 86 | All prior sprints (final cleanup pass) |

### Suggested Parallel Execution

```
Week 1-2: Sprint 78 (Core Auth) + Sprint 80 (HIPAA) + Sprint 81 (Tokens)
Week 3-4: Sprint 79 (Financial) + Sprint 84 (Validation)
Week 5-6: Sprint 82 (Auth Sweep 1) + Sprint 85 (Performance)
Week 7:   Sprint 83 (Auth Sweep 2)
Week 8:   Sprint 86 (Production Readiness)
```
