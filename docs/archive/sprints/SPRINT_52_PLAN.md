# Sprint 52: Context-Aware Notifications + Geofencing - Implementation Plan

**Sprint:** 52
**Feature:** Gym Proximity Detection, Smart Push Notifications, JITAI Enhancement
**Goal:** Intelligent notifications triggered by location, behavior, and habit formation patterns
**Priority:** P1 (High)
**Story Points:** 34
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 52 enhances the existing JITAI service with geofencing-based gym proximity detection and Firebase Cloud Messaging for smart push notifications. The system limits notifications to 2-3/day with positive framing, applies a 66-day habit decay model, and uses send-time prediction to maximize engagement. Research shows JITAI outperforms static interventions with an effect size of g = 0.868.

**Strategic Value:**
- Context-aware notifications have 3-5x higher engagement than time-based
- Geofencing triggers workout reminders exactly when user arrives at gym
- 66-day decay prevents notification fatigue (68% of users who uninstall cite this)
- Firebase A/B Testing optimizes notification copy/timing for free
- $399 one-time plugin cost + $0-50/month operations

---

## Goals

1. Implement gym proximity detection via geofencing + Wi-Fi SSID confirmation
2. Integrate FCM push notifications with deep-link routing
3. Enhance JITAI service with geofencing as opportunity signal
4. Build notification fatigue prevention with 2-3/day limit and 66-day decay
5. Create user-facing notification preferences

---

## Technical Architecture

### Database Schema

```sql
-- Gym locations for geofencing
CREATE TABLE gym_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID REFERENCES franchise_locations(id),
  latitude NUMERIC(10,7) NOT NULL,
  longitude NUMERIC(10,7) NOT NULL,
  radius_meters INTEGER DEFAULT 100,
  wifi_ssid TEXT,
  label TEXT,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notification delivery and engagement tracking
CREATE TABLE notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'jitai', 'geofence_arrival', 'workout_reminder',
    'streak_risk', 'nutrition_reminder', 'goal_proximity'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  delivered_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  action_taken TEXT,
  channel TEXT DEFAULT 'push'
);

-- User notification preferences
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  max_daily_notifications INTEGER DEFAULT 3,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '07:00',
  geofence_enabled BOOLEAN DEFAULT true,
  enabled_types TEXT[] DEFAULT ARRAY['workout_reminder', 'streak_risk', 'goal_proximity'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ML-based send time optimization
CREATE TABLE send_time_predictions (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  predicted_best_hour INTEGER NOT NULL CHECK (predicted_best_hour BETWEEN 0 AND 23),
  confidence NUMERIC(3,2),
  sample_size INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, day_of_week)
);

-- Indexes
CREATE INDEX idx_notification_log_user ON notification_log(user_id, delivered_at DESC);
CREATE INDEX idx_gym_locations_geo ON gym_locations(latitude, longitude);

-- RLS
ALTER TABLE gym_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE send_time_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own notifications" ON notification_log
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users manage own preferences" ON notification_preferences
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Users view own predictions" ON send_time_predictions
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Trainers manage gym locations" ON gym_locations
  FOR ALL USING (created_by = auth.uid());
```

### Notification Fatigue Prevention

```
Daily limit: max 2-3 notifications (user configurable)
Quiet hours: default 10pm-7am (user configurable)
Positive framing only: never punitive language
66-day decay model:
  - Days 1-7: up to 3 notifications/day (habit formation)
  - Days 8-21: up to 2 notifications/day (consistency building)
  - Days 22-66: up to 1 notification/day (habit solidification)
  - Days 67+: 0-1 notifications/week (habit formed, minimal nudging)
```

---

## Implementation Tasks

### Task 52.1: Install Plugins & Create Geofence Service

**Files to create:**
- `apps/mobile/src/app/core/services/geofence.service.ts`

**Deliverables:**
- Install `@transistorsoft/capacitor-background-geolocation` v7.2.1 ($399 license)
- Install `@capgo/capacitor-wifi` for Wi-Fi SSID detection
- Install `@capacitor/push-notifications`
- Geofence service with gym registration, entry/exit events, proximity signals
- Dynamic geofence loading (overcomes 20 iOS / 100 Android limits)
- Signal state: `isNearGym`, `nearestGym`, `isTracking`

### Task 52.2: Create Notification Orchestrator Service

**Files to create:**
- `apps/mobile/src/app/core/services/notification.service.ts`

**Deliverables:**
- Central notification orchestrator for all notification types
- FCM token registration and channel setup
- Local notification scheduling
- Push notification → deep-link routing
- Fatigue limit enforcement (max 2-3/day)
- Quiet hours respect
- 66-day habit decay model
- Delivery/open tracking analytics

### Task 52.3: Create Edge Functions

**Files to create:**
- `supabase/functions/send-push-notification/index.ts`
- `supabase/functions/predict-send-time/index.ts`

**Deliverables:**
- FCM push via Firebase Admin SDK
- Send-time prediction: analyze notification_log open times, predict best hour per user per day
- Respect notification preferences and fatigue limits server-side

### Task 52.4: Enhance JITAI Service

**Files to modify:**
- `apps/mobile/src/app/core/services/jitai.service.ts`

**Deliverables:**
- Add `updateOpportunityFromGeofence(isNearGym: boolean)`: Factor gym proximity into opportunity score
- Add `updateOpportunityFromWifi(ssid: string)`: Secondary gym detection
- Integrate notification preferences for fatigue limits
- Add geofence_arrival as new intervention trigger type

### Task 52.5: Enhance Firebase Service

**Files to modify:**
- `apps/mobile/src/app/core/services/firebase.service.ts`

**Deliverables:**
- FCM token registration on app init
- `onNotificationReceived()` handler (foreground)
- `onNotificationOpened()` handler (background/terminated → deep-link routing)
- Notification analytics event tracking

### Task 52.6: Create Notification Preferences Page

**Files to create:**
- `apps/mobile/src/app/features/settings/pages/notification-prefs/notification-prefs.page.ts`
- `apps/mobile/src/app/features/settings/components/gym-location-picker/gym-location-picker.component.ts`

**Files to modify:**
- `apps/mobile/src/app/app.routes.ts` (add `tabs/settings/notification-preferences` route)

**Deliverables:**
- Max daily notifications slider (1-5, default 3)
- Quiet hours time pickers
- Notification type toggles
- Geofence enable/disable toggle
- Map-based gym location selector for geofence setup

### Task 52.7: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213040000_geofencing_notifications.sql`

---

## Acceptance Criteria

- [ ] Geofence triggers notification within 30 seconds of gym arrival
- [ ] Wi-Fi SSID confirms gym presence as secondary signal
- [ ] Max 2-3 notifications per day enforced regardless of triggers
- [ ] Quiet hours respected (default 10pm-7am, user configurable)
- [ ] Notification frequency decays over 66 days as habit forms
- [ ] Push notifications deep-link to correct app section
- [ ] All notifications use positive framing (never punitive)
- [ ] Notification preferences UI allows full user control
- [ ] Firebase A/B testing framework ready for optimization
- [ ] Background location permission requested with clear explanation
- [ ] "Always Allow" location gracefully handled on both platforms

---

## Risk Mitigation

### Risk 1: Background Location Permission
- iOS requires "Always Allow" (users must enable in Settings on iOS 13+)
- Android 11+ requires Settings navigation for "Allow all the time"
- **Mitigation:** Progressive permission request with clear value explanation, feature degrades gracefully without background location

### Risk 2: Notification Fatigue
- 68% of fitness app uninstalls cite notification fatigue
- **Mitigation:** Hard daily cap, 66-day decay, positive-only framing, user control

### Risk 3: Battery Impact
- Background geolocation can drain battery
- **Mitigation:** Transistorsoft uses accelerometer-based power optimization, dwell detection reduces GPS polling

---

## Dependencies

- Sprint 46 (deep-link service for notification routing)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 52.1 - Install Plugins & Create Geofence Service
