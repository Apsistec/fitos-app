# Known Issues

This file tracks known issues that need to be addressed in future work.

## TypeScript Compilation Errors (as of 2026-01-02)

### 1. Epic 10.1 Messaging - Database Schema Mismatch
**Files Affected:**
- `apps/mobile/src/app/core/services/messaging.service.ts`
- `apps/mobile/src/app/features/messages/pages/chat/chat.page.ts`
- `apps/mobile/src/app/features/messages/pages/conversations/conversations.page.ts`

**Issue:**
The messaging service uses `sent_at` field, but the database schema (messages table) has `created_at` instead.

**Error:**
```
TS2339: Property 'sent_at' does not exist on type 'Message'.
```

**Fix Required:**
Either:
1. Update messaging service to use `created_at` instead of `sent_at`, OR
2. Add migration to rename `created_at` to `sent_at` in messages table

**Impact:** Messaging feature will not compile until fixed.

---

### 2. Epic 5.4 Progress Charts - Service Method Mismatches
**Files Affected:**
- `apps/mobile/src/app/features/workouts/pages/progress/progress.page.ts`

**Issues:**

#### Issue 2.1: WorkoutSessionService.getWorkoutHistory signature
Progress page calls `getWorkoutHistory(userId, options)` but the service signature is `getWorkoutHistory(limit, offset)` (no userId parameter - it gets it from auth).

**Error:**
```
TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
```

**Fix Required:**
Use `getClientWorkoutHistory(userId, limit, offset)` instead of `getWorkoutHistory(userId, options)`.

#### Issue 2.2: ExerciseService missing getExercises method
Progress page calls `exerciseService.getExercises()` but only `getExercise(id)` exists.

**Error:**
```
TS2551: Property 'getExercises' does not exist on type 'ExerciseService'.
```

**Fix Required:**
Add `getExercises()` method to ExerciseService, or refactor progress page to use a different approach.

#### Issue 2.3: Implicit 'any' types in progress page
Multiple array operations have implicit 'any' types for parameters.

**Errors:**
```
TS7006: Parameter 'ex' implicitly has an 'any' type.
TS7006: Parameter 'set' implicitly has an 'any' type.
TS7006: Parameter 'sum' implicitly has an 'any' type.
```

**Fix Required:**
Add explicit type annotations for all array operation parameters.

**Impact:** Progress charts feature will not compile until fixed.

---

### 3. Chat Page - Implicit 'any' type
**File:** `apps/mobile/src/app/features/messages/pages/chat/chat.page.ts`

**Issue:**
Array find operation has implicit 'any' type for parameter.

**Error:**
```
TS7006: Parameter 'c' implicitly has an 'any' type.
```

**Fix Required:**
Add explicit type: `clients.find((c: ClientWithProfile) => ...)`

---

## Warnings (Non-blocking)

### Unused Imports
- IonItem, IonLabel, IonText, IonBadge unused in various components
- These can be cleaned up during code review

### Optional Chain Operations
- Some optional chain operations in measurements page could use regular dot notation
- Non-critical, but could be simplified

---

## Recommendation

These issues should be addressed before the next deployment. Suggested priority:

1. **P0:** Fix messaging schema mismatch (breaks Epic 10.1)
2. **P0:** Fix progress charts service calls (breaks Epic 5.4)
3. **P1:** Add explicit types to eliminate implicit 'any' errors
4. **P2:** Clean up unused imports

Created: 2026-01-02
Last Updated: 2026-01-02
