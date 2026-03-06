# FitOS Phase 6B — Platform Hardening & Quality
**Sprints 70–73 | Estimated: 8 weeks**

> **Sprint Renumbering Note (March 2026):** Originally numbered 62–65, renumbered to 70–73
> because Phase 6A Client Experience (Sprints 62–69) was completed first and occupies those slots.

Generated from comprehensive tri-domain audit: Security, Service Resilience, and UI/UX quality.

---

## Audit Summary & Validation

All findings below were verified against the codebase. Items marked 🔴 are confirmed critical and should block any public launch of affected features.

### Security Audit — Confirmed Findings

| # | Finding | Confirmed Risk | Severity |
|---|---------|---------------|----------|
| S1 | `invitations` RLS policy `USING (TRUE)` — any authenticated user can query all invitations across all trainers | Data exposure: emails, trainer IDs, invite codes | 🔴 Critical |
| S2 | AI Coach `/chat` endpoint accepts `user_id` from request body — no server-side JWT extraction | Identity spoofing: any user can impersonate any other | 🔴 Critical |
| S3 | No rate limiting on AI endpoints — LLM calls exposed to hammering | Financial DoS: uncapped LLM cost exposure | 🔴 High |
| S4 | Nutrition image endpoint accepts unbounded base64 — no size or format validation | DoS vector via memory exhaustion | 🟡 Medium |
| S5 | `python-jose` dependency last updated 2021, known stale | Unpatched JWT vulnerability exposure | 🟡 Medium |

### Service Resilience — Confirmed Findings

| # | Finding | Confirmed Risk | Severity |
|---|---------|---------------|----------|
| R1 | `OFFLINE_SYNC.md` exists but zero implementation (no `SyncService`, no IndexedDB) | Data loss when gym WiFi drops during workout | 🔴 High |
| R2 | 0 uses of `takeUntilDestroyed()` across all components — subscriptions never cleaned up | Memory leaks accumulate across navigation | 🔴 High |
| R3 | AI Backend has no timeout or fallback when Cloud Run is unreachable | UX dead end — users wait indefinitely | 🟡 Medium |
| R4 | Concurrent edits use last-write-wins with no conflict detection | Silent data corruption on simultaneous edits | 🟡 Medium |
| R5 | Conversation message persistence has silent `catch` — failures swallowed | Messages lost with no user feedback | 🟡 Medium |
| R6 | Conversation history loads ALL messages with no pagination | Performance degradation; memory spike on long chats | 🟡 Medium |

### UI/UX Quality — Confirmed Findings

| # | Finding | Confirmed Risk | Severity |
|---|---------|---------------|----------|
| U1 | ~220 components (~60%) missing `ChangeDetectionStrategy.OnPush` — violates CLAUDE.md | Excessive re-renders; degraded performance in zoneless mode | 🔴 High |
| U2 | 143 constructor-based dependency injections — violates Angular 21 standard | Tech debt; blocks future Angular migration compatibility | 🟡 Medium |
| U3 | No `CdkVirtualScrollViewport` on exercise library, workout history, or conversation lists | Scroll jank and potential OOM on large datasets | 🟡 Medium |

---

## Phase 6 Sprint Plan

### Sprint 70 — Security Hardening
**Duration:** 2 weeks | **Scope:** Supabase RLS, FastAPI auth & rate limiting, input validation

#### Stories

**S70.1 — Fix Invitations RLS Policy** *(Critical)*
- Change `USING (TRUE)` to `USING (trainer_id = auth.uid())` so trainers can only read their own invitations
- Create a Supabase Edge Function `validate-invite-code` that accepts a token and does a privileged lookup — clients use this to redeem invitations without needing broad read access
- Add `WITH CHECK (trainer_id = auth.uid())` to the INSERT policy
- Migration: `supabase/migrations/XXXXXX_fix_invitations_rls.sql`
- Test: verify cross-trainer invitation enumeration is blocked

**S70.2 — Server-Side JWT Extraction on AI Endpoints** *(Critical)*
- Remove `user_id` from all FastAPI request body models
- Extract `user_id` from the Authorization header JWT using Supabase's JWKS endpoint
- Apply to: `/chat`, `/methodology`, `/review`, and any other AI endpoints that currently trust client-supplied identity
- Return `401` if token is missing, expired, or invalid
- Never trust client-supplied `user_id` for any privileged operation

**S70.3 — Rate Limiting on AI Endpoints** *(High)*
- Add `SlowAPI` to the FastAPI AI backend (`pip install slowapi`)
- Apply per-user rate limits: `/chat` → 60 req/min, `/nutrition/analyze` → 20 req/min
- Use `request.state.user_id` (from JWT, post S62.2) as the rate limit key
- Return `429 Too Many Requests` with `Retry-After` header
- Add rate limit headers to all AI responses for client-side display

**S70.4 — Nutrition Image Input Validation** *(Medium)*
- Reject requests where base64 payload exceeds 5MB (decode length check, not string length)
- Validate MIME type is `image/jpeg`, `image/png`, or `image/webp` before processing
- Return `400` with descriptive error message for oversized or invalid images
- Add validation in the Supabase Edge Function layer as well (defense in depth)

**S70.5 — Replace python-jose with PyJWT** *(Medium)*
- `pip uninstall python-jose` → `pip install PyJWT[cryptography]`
- Update all JWT decode/verify calls to PyJWT API
- Add `algorithms=["RS256"]` explicitly (never allow `alg: none`)
- Update `requirements.txt` and `pyproject.toml`
- Run existing auth test suite to verify no regressions

**Acceptance Criteria:**
- [ ] No authenticated user can read another trainer's invitations via direct Supabase query
- [ ] AI endpoints return 401 when called without valid JWT
- [ ] AI endpoints return 429 after exceeding rate limit
- [ ] Nutrition endpoint rejects images > 5MB
- [ ] python-jose removed from all requirements files

---

### Sprint 71 — Service Resilience
**Duration:** 2 weeks | **Scope:** Subscription lifecycle, AI timeouts, message persistence, pagination

#### Stories

**S71.1 — Subscription Cleanup with `takeUntilDestroyed()`** *(High)*
- Audit all components using `.subscribe()` — generate a list with file paths and line numbers
- Replace all manual `ngOnDestroy` + `Subject`/`takeUntil` patterns with Angular's built-in `takeUntilDestroyed()` from `@angular/core/rxjs-interop`
- For services with long-lived subscriptions (e.g., Supabase Realtime), use `DestroyRef` to register teardown
- Pattern: `this.someObservable$.pipe(takeUntilDestroyed()).subscribe(...)`
- Verify no memory leak regressions using Chrome DevTools heap snapshots on navigation flows

**S71.2 — AI Backend Timeout & Fallback** *(Medium)*
- Add 30-second timeout to all HTTP calls to Cloud Run AI backend in Angular `AiService`
- On timeout: show non-blocking toast "AI is taking longer than usual, please try again"
- On total failure (circuit open): show inline fallback message in chat UI: "Coach is temporarily unavailable"
- Implement exponential backoff retry (max 2 retries) before showing failure state
- Add health check endpoint on FastAPI (`GET /health`) for monitoring

**S71.3 — Conversation Message Persistence with Retry** *(Medium)*
- Replace silent `catch` in conversation message persistence with surfaced error handling
- On first Supabase persist failure: retry once after 2 seconds
- On second failure: mark message as "pending sync" in local state with a visible indicator (not adherence-alerting — use subtle indicator, not red)
- Add a "Retry" action to failed messages
- On reconnection (network event or manual retry): flush pending messages in order

**S71.4 — Conversation History Pagination** *(Medium)*
- Implement cursor-based pagination for conversation history: load last 50 messages on open
- Add "Load earlier messages" trigger at the top of the chat list (tap to load previous 50)
- Use Supabase's `range()` and `order('created_at', { ascending: false })` with offset tracking
- Cache loaded pages in the service's signal store — don't reload on re-navigation
- Scroll position should be preserved when loading earlier messages (no jump to top)

**S71.5 — Optimistic Locking for Concurrent Edits** *(Medium)*
- Add `updated_at` timestamp to all frequently-edited entities: `workouts`, `programs`, `client_profiles`
- On save: include `updated_at` in the WHERE clause (`UPDATE ... WHERE id = ? AND updated_at = ?`)
- If no rows updated (stale `updated_at`): surface a non-blocking conflict warning
- Offer: "Your changes" vs "Latest version" side-by-side with merge or overwrite options
- Priority tables: `workouts`, `programs`, `nutrition_logs`

**Acceptance Criteria:**
- [ ] 0 components with manual `ngOnDestroy` subscription teardown (all use `takeUntilDestroyed()`)
- [ ] AI chat shows timeout message at 30 seconds, never hangs indefinitely
- [ ] Failed messages are visually flagged and retry-able
- [ ] Opening a long conversation loads only the last 50 messages
- [ ] Stale concurrent edit is caught and surfaces a user-friendly resolution UI

---

### Sprint 72 — Performance & Virtual Scrolling
**Duration:** 2 weeks | **Scope:** OnPush enforcement, virtual scrolling, list performance

#### Stories

**S72.1 — Enforce OnPush Across All Components** *(High)*
- Generate full list of components missing `ChangeDetectionStrategy.OnPush`
- Add OnPush to all ~220 affected components
- In parallel: audit each component's template for non-signal state that would break under OnPush — migrate to signals or `markForCheck()` where necessary
- Add ESLint rule `@angular-eslint/prefer-on-push-component-change-detection` to `eslint.config.mjs` to prevent regression
- Prioritize high-traffic components first: dashboards, workout list, client list, chat

**S72.2 — Virtual Scrolling for Exercise Library** *(Medium)*
- Wrap `exercise-library.page` list in `<cdk-virtual-scroll-viewport itemSize="72">`
- Replace `*ngFor` / `@for` with `*cdkVirtualFor`
- Ensure filter/search updates are compatible with virtual scroll (full list must remain in memory; only rendering is virtualized)
- Test with 500+ exercise dataset to confirm smooth scrolling

**S72.3 — Virtual Scrolling for Workout History** *(Medium)*
- Wrap `workout-history.page` in `CdkVirtualScrollViewport`
- Set `itemSize` to match the workout history card height (measure in px)
- Confirm pagination integrates correctly: load more data as user scrolls toward the bottom (infinite scroll pattern with CDK)

**S72.4 — Virtual Scrolling for Conversation Lists** *(Medium)*
- Apply `CdkVirtualScrollViewport` to `conversations.page` (conversation list view)
- For `chat.page` (message thread): use standard reverse virtual scroll pattern — newest messages at bottom, load older messages from top
- CDK virtual scroll with inverted direction for chat: `transform: scaleY(-1)` pattern or `@angular/cdk/scrolling` inverted viewport

**S72.5 — Performance Regression Testing** *(Verification)*
- Use Angular DevTools to capture render counts before and after OnPush migration
- Use Playwright to record key user flows and measure frame times
- Document baseline vs. post-Sprint 64 metrics in `docs/performance-benchmarks.md`

**Acceptance Criteria:**
- [ ] ESLint rule blocks any new component without OnPush (CI enforced)
- [ ] Exercise library scrolls at 60fps with 500+ items
- [ ] Workout history loads without jank at 200+ entries
- [ ] Angular DevTools shows zero unnecessary re-renders on static screens

---

### Sprint 73 — Angular Modernization & Offline Sync Foundation
**Duration:** 2 weeks | **Scope:** inject() migration, SyncService, IndexedDB, offline-first patterns

#### Stories

**S73.1 — Migrate Constructor DI to `inject()`** *(Medium)*
- Replace all 143 constructor-based injections with `inject()` calls
- Pattern: `constructor(private svc: MyService)` → `private svc = inject(MyService)`
- Remove constructors entirely where DI was the only content
- Update unit tests that use `TestBed.inject()` (no change needed) or constructor mocking
- Add ESLint rule `@angular-eslint/prefer-inject` to enforce going forward

**S73.2 — Offline Sync Foundation (SyncService + IndexedDB)** *(High)*
- Implement `SyncService` (the documented but missing service from `OFFLINE_SYNC.md`)
- Use Dexie.js (`npm install dexie`) as the IndexedDB abstraction layer
- Local schema: `workouts`, `nutrition_logs`, `workout_sessions`, `messages` — the four most critical offline-capable entities
- Write operations go to IndexedDB first, then queue a sync event
- On network restoration: `SyncService` processes the queue in FIFO order with conflict resolution (server wins by default; surface conflicts to user for `workouts` and `programs`)
- Use Angular's `NetworkStatusService` (or `fromEvent(window, 'online/offline')`) to drive sync triggers

**S73.3 — Offline-Capable Workout Execution** *(High)*
- `active-workout.page` must function fully offline
- Read workout plan from IndexedDB if Supabase is unreachable
- Write completed sets to IndexedDB queue immediately
- Sync completed workout data on next connection — show "Syncing…" badge until confirmed
- Test: airplane mode mid-workout → complete workout → reconnect → verify data appears in history

**S73.4 — Offline Indicator in App Shell** *(Medium)*
- Add persistent but unobtrusive offline indicator to app shell (not a blocking modal)
- Show "Offline — data will sync when reconnected" in a bottom banner (adherence-neutral: use `--fitos-neutral` color, not red/danger)
- Banner auto-dismisses 3 seconds after connection restores and sync completes
- Show count of pending sync items: "3 items queued"

**S73.5 — Offline Nutrition Logging** *(Medium)*
- `nutrition-log.page` queues food entries to IndexedDB when offline
- Photo nutrition and barcode features: gracefully degrade (show "AI analysis requires connection" message, save item as manual entry for later)
- Voice nutrition: capture audio locally, queue for transcription on reconnect (Deepgram requires connection — store audio blob in IndexedDB)

**Acceptance Criteria:**
- [ ] 0 constructor-based injections in codebase (ESLint enforced)
- [ ] `SyncService` exists with IndexedDB schema and queue processor
- [ ] Completing a workout in airplane mode results in successful sync on reconnect
- [ ] Offline banner appears within 2 seconds of network loss, never blocks UI
- [ ] Nutrition log entries created offline sync correctly on reconnect

---

## Phase 6 Rollup

| Sprint | Theme | Audit Items Resolved | Est. Duration |
|--------|-------|---------------------|---------------|
| 70 | Security Hardening | S1, S2, S3, S4, S5 | 2 weeks |
| 71 | Service Resilience | R2, R3, R5, R6, R4 | 2 weeks |
| 72 | Performance | U1, U3 | 2 weeks |
| 73 | Modernization + Offline | R1, U2 | 2 weeks |

**Total: 8 weeks, 14 high-priority issues resolved, 0 regressions expected**

---

## Items That Are Already Passing ✅

These areas passed the audit and require no action:
- No hardcoded secrets in codebase
- Auth guards and route protection working correctly
- CORS properly restricted
- Edge Functions have JWT validation
- No PII logged to console
- Auth/error interceptors implemented
- Dark-first design system
- Adherence-neutral nutrition colors
- WCAG AA contrast ratios
- Loading and empty states
- Lazy loading of feature modules
- Modern `@if`/`@for` control flow (built-in, not `*ngIf`/`*ngFor`)
- Responsive design
- Reduced motion support

---

*Generated: March 2026 | Renumbered March 2026 from 62–65 → 70–73 to resolve overlap with Phase 6A Client Experience (Sprints 62–69)*