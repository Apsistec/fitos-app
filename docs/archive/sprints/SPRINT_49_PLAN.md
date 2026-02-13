# Sprint 49: Direct Health Sync + Dynamic Island - Implementation Plan

**Sprint:** 49
**Feature:** HealthKit/Health Connect Direct Integration & Dynamic Island Workout Timer
**Goal:** Replace Terra API for Apple/Google health data with free direct sync; add Dynamic Island
**Priority:** P0 (Critical)
**Story Points:** 34
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 49 replaces the Terra API dependency ($79/month at 100 users) with free, direct HealthKit (iOS) and Health Connect (Android) integration via `@capgo/capacitor-health`. This provides faster sync, more data types (body fat %, lean body mass, sleep stages), and background delivery. Additionally, it adds Dynamic Island workout timer using `capacitor-live-activities` for iPhone 14+ users.

**Strategic Value:**
- Eliminates $79-790/month Terra API cost for Apple Health/Health Connect users
- Adds body composition data types not available via Terra
- Dynamic Island keeps active workout visible during rest periods
- Terra kept only for third-party wearables (Garmin, Whoop, Oura)

---

## Goals

1. Replace healthkit.service.ts stubs with real `@capgo/capacitor-health` plugin calls
2. Implement background sync for both iOS and Android health platforms
3. Add smart scale passthrough data (weight, body fat %, bone mass)
4. Create Dynamic Island live activity for active workouts
5. Maintain Terra API for non-Apple/Google wearables

---

## Technical Architecture

### Database Schema

```sql
-- Expand wearable_daily_data with new health metrics
ALTER TABLE wearable_daily_data
  ADD COLUMN body_fat_pct NUMERIC(5,2),
  ADD COLUMN lean_body_mass_kg NUMERIC(6,2),
  ADD COLUMN bone_mass_kg NUMERIC(5,2),
  ADD COLUMN hrv_rmssd NUMERIC(6,2),
  ADD COLUMN hrv_sdnn NUMERIC(6,2),
  ADD COLUMN sleep_deep_mins INTEGER,
  ADD COLUMN sleep_rem_mins INTEGER,
  ADD COLUMN sleep_light_mins INTEGER,
  ADD COLUMN sleep_awake_mins INTEGER,
  ADD COLUMN data_source TEXT DEFAULT 'terra' CHECK (data_source IN ('healthkit', 'health_connect', 'terra'));

-- Sync audit log
CREATE TABLE health_sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL CHECK (sync_type IN ('foreground', 'background')),
  data_types_synced TEXT[] NOT NULL,
  records_synced INTEGER DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now(),
  duration_ms INTEGER
);

CREATE INDEX idx_health_sync_log_user ON health_sync_log(user_id);
ALTER TABLE health_sync_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sync logs" ON health_sync_log
  FOR ALL USING (user_id = auth.uid());
```

### Data Types Supported

| Data Type | Health Connect | HealthKit | @capgo Plugin |
|-----------|---------------|-----------|---------------|
| HRV | RMSSD | SDNN | Yes |
| Body fat % | Yes | Yes | Yes |
| Lean body mass | Yes | Yes | Partial (enhanced) |
| Sleep stages | Yes | Yes | Yes |
| Steps | Yes | Yes | Yes |
| Resting HR | Yes | Yes | Yes |
| Weight | Yes | Yes | Yes |
| Bone mass | Yes | Yes | Via extension |

**IMPORTANT:** NEVER display calorie burn from wearables (per project rules).

---

## Implementation Tasks

### Task 49.1: Install Plugins & Enhance HealthKit Service

**Files to modify:**
- `apps/mobile/src/app/core/services/healthkit.service.ts` (replace stubs with real calls)

**Deliverables:**
- Install `@capgo/capacitor-health`, `@capacitor/background-runner`
- Replace all TODO/stub methods with real plugin calls
- Add expanded data type authorization (HRV, body fat, sleep stages)
- Add `readBodyComposition()` for smart scale data
- Add `readSleepStages()` for detailed sleep breakdown
- Add `enableBackgroundDelivery()` for iOS background sync
- Keep existing public signal interface unchanged

### Task 49.2: Create Health Sync Service

**Files to create:**
- `apps/mobile/src/app/core/services/health-sync.service.ts`

**Deliverables:**
- Orchestrate sync between health plugin and Supabase
- `syncAll()`: Full foreground sync of all authorized data types
- `syncBackground()`: Minimal background sync (background runner)
- Platform detection: iOS → HealthKit, Android → Health Connect
- Write to `wearable_daily_data` with correct `data_source`
- Log sync events to `health_sync_log`

### Task 49.3: Create Dynamic Island Live Activity

**Files to create:**
- `apps/mobile/src/app/core/services/live-activity.service.ts`
- `apps/mobile/ios/App/FitOSLiveActivity/WorkoutLiveActivity.swift`

**Files to modify:**
- `apps/mobile/src/app/core/services/workout-session.service.ts` (integrate live activity lifecycle)

**Deliverables:**
- Install `capacitor-live-activities` (ludufre)
- Live activity service with start/update/end methods
- SwiftUI Dynamic Island compact/expanded views
- Show current exercise, set count, rest timer countdown
- iOS 16.1+ only, graceful no-op on Android

### Task 49.4: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213010000_health_sync_expanded.sql`

### Task 49.5: Update Wearables Settings Page

**Files to modify:**
- Wearables settings page (add Apple Health / Health Connect direct options alongside Terra)

**Deliverables:**
- "Apple Health" connection option (iOS only)
- "Health Connect" connection option (Android only)
- Existing Terra providers remain for Garmin/Whoop/Oura
- Connection status indicators for each source

### Task 49.6: Configure Background Runner

**Files to modify:**
- `capacitor.config.ts` (add BackgroundRunner plugin config)

**Deliverables:**
- Background task registration for periodic health sync
- iOS: HealthKit background delivery entitlement
- Android: WorkManager-based periodic sync (15-min minimum intervals)

---

## Acceptance Criteria

- [ ] HealthKit authorization prompts for all data types on iOS
- [ ] Health Connect authorization on Android
- [ ] HRV (RMSSD + SDNN), body fat %, lean body mass, sleep stages sync to Supabase
- [ ] Background sync runs at least every 4 hours (iOS) / 6 hours (Android)
- [ ] Smart scale data flows through Health Connect/HealthKit passthrough
- [ ] Dynamic Island shows workout name and rest timer during active workout (iPhone 14+)
- [ ] Terra integration remains functional for Garmin/Whoop/Oura users
- [ ] Wearables settings shows both direct and Terra connection options
- [ ] Calorie burn NEVER displayed from wearables
- [ ] Health sync log tracks sync events for debugging

---

## Dependencies

- Sprint 48 (widget service data format alignment)
- Sprint 53 will use healthkit.service.ts for onboarding health import (optional)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 49.1 - Install Plugins & Enhance HealthKit Service
