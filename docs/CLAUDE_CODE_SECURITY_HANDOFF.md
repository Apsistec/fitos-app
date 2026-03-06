# Claude Code Development Handoff — Phase 7: Service Security Hardening

**Date:** March 6, 2026
**Project:** FitOS
**Phase:** 6 — Security Hardening (Sprints 78–86)

---

## Context Summary

FitOS is an AI-powered fitness business management platform built with Angular 21, Ionic 8, Capacitor 8, Supabase, and Firebase/GCP. A comprehensive security audit of all 50+ Angular services in `core/services/` identified ~150 issues across severity levels. This phase addresses all findings systematically.

**Critical patterns to fix across the entire codebase:**
1. Services accept arbitrary user/trainer/client IDs from callers instead of deriving from authenticated session
2. Financial calculations (balance, payroll, revenue) happen client-side via `reduce()`
3. HIPAA audit trail routes through the wrong backend and silently drops failures
4. OAuth tokens and API keys exposed in client-side code
5. `console.log/error/warn` runs in production across 40+ services

---

## Immediate Priority: Sprint 78 — Core Auth & Identity IDOR Fixes

### Key Documents to Review
1. `/docs/SPRINTS_78-86_SECURITY_ROADMAP.md` — Full sprint planning with exact issues and fixes
2. `/docs/PHASE7_SECURITY_BACKLOG.md` — Backlog with service-level issue inventory
3. `/docs/ROADMAP.md` — Strategic context

### Universal Fix Pattern (Apply to ALL services)

**Before (vulnerable):**
```typescript
async loadAppointments(trainerId: string): Promise<void> {
  const { data } = await this.supabase.client
    .from('appointments')
    .select('*')
    .eq('trainer_id', trainerId);  // ← caller-supplied, exploitable
}
```

**After (secure):**
```typescript
async loadAppointments(): Promise<void> {
  const user = this.auth.user();
  if (!user) return;
  const { data } = await this.supabase.client
    .from('appointments')
    .select('*')
    .eq('trainer_id', user.id);  // ← session-derived, secure
}
```

### Sprint 78 Files to Modify

1. `apps/mobile/src/app/core/services/auth.service.ts`
   - Add `isDevMode()` guard to 30+ console calls
   - Fix `loadProfile` catch block to distinguish network vs auth errors
   - Validate `returnUrl` in `handlePostLogin()`
   - Set `shouldCreateUser: false` on `signInWithOtp`
   - Delete duplicate `updatePassword()` method
   - Replace `setInterval` polling with signal `effect()` in `waitForInitialization`

2. `apps/mobile/src/app/core/services/ai-coach.service.ts`
   - Remove `userId` parameter from `loadConversation()` — derive from `this.auth.user()`
   - Remove `userContext.user_id` usage in `sendMessage()` — use `sessionUser.id`
   - Remove `trainerId` parameter from `collectTrainingData()`
   - Replace `Math.random()` with `crypto.randomUUID()` in `generateId()`
   - Throw if `environment.aiBackendUrl` is not set (remove localhost fallback)
   - Skip retry on 4xx HTTP errors (except 429)

3. `apps/mobile/src/app/core/services/appointment-fsm.service.ts`
   - Add ownership check in `transition()`: verify caller is trainer or client
   - Add `.eq('trainer_id', user.id)` to `deny()` delete query
   - Add `.eq('trainer_id')` defense-in-depth to DB update in `transition()`
   - `await` cancellation fee charge; write failures to `client_ledger`
   - Add `recipientId` to all `notify.send()` calls
   - Define `AppointmentWithServiceType` interface (remove `as any` casts)

4. `apps/mobile/src/app/core/services/appointment.service.ts`
   - Remove `trainerId` parameter from `loadAppointments()` — derive from auth
   - Remove `clientId` parameter from `getClientAppointments()` — use `auth.user().id`
   - Add party membership join to `getVisitsForAppointment()`
   - Override DTO's `trainer_id`/`client_id` in `createAppointment()`
   - Add `.eq('trainer_id', user.id)` to `updateAppointment()`
   - Add `isValidAppointment()` type guard for realtime payloads

5. `apps/mobile/src/app/core/services/assignment.service.ts`
   - Verify caller is client or trainer in `loadClientAssignments()`
   - Remove `trainerId` parameter from `getTodaySchedule()` and `getRecentActivity()`
   - Add ownership scope to `updateAssignmentStatus()`
   - Validate trainer-client relationship in `assignWorkout()`
   - Audit `workouts` vs `assigned_workouts` table usage

### Testing Checklist for Sprint 78
- [ ] Auth: Network error during profile load does NOT sign user out
- [ ] Auth: Return URL validated as relative path (no external redirects)
- [ ] AI Coach: Cannot load another user's conversations
- [ ] AI Coach: Cannot create conversations attributed to another user
- [ ] Appointment FSM: Client cannot mark own appointment as completed
- [ ] Appointment FSM: Cannot transition appointment for unrelated user
- [ ] Appointment: Cannot load another trainer's calendar
- [ ] Appointment: Cannot view another client's appointments
- [ ] Assignment: Cannot view another trainer's schedule
- [ ] Assignment: Cannot modify another client's workout status
- [ ] All ID generation uses crypto.randomUUID()
- [ ] No localhost fallback URLs in production builds

---

## Quick Command to Start

```bash
# Open the repo and review the security roadmap
cd ~/Dev/fitos-app
cat docs/SPRINTS_78-86_SECURITY_ROADMAP.md

# Start with auth.service.ts (highest impact)
code apps/mobile/src/app/core/services/auth.service.ts

# Run tests after each service fix
npm test -- --filter=auth
```

---

## Key Principle

**Every service method that touches the database must derive the user identity from `this.auth.user()`, NEVER from a caller-supplied parameter.** This single principle eliminates the majority of CRITICAL and HIGH issues in this audit.
