# FitOS Phase 4 Feature Backlog

**Version 1.0** | Zero Tracking Friction Phase
**Timeline:** Post-launch enhancement (8 sprints)
**Focus:** Physical Touchpoints, Native OS Integration, AI Data Entry, Smart Engagement

---

## Executive Summary

Phase 4 eliminates tracking friction through six interconnected feature areas:

1. **NFC/QR Touchpoints** - Physical tags and codes for instant gym check-in and workout start
2. **Widgets & Shortcuts** - Native home screen/lock screen widgets and app quick actions
3. **AI Data Entry** - Barcode scanning, equipment OCR, and enhanced voice logging
4. **Direct Health Sync** - Free HealthKit/Health Connect replacing Terra for most users
5. **Context-Aware Notifications** - Geofencing + JITAI for smart push notifications
6. **Progressive Onboarding** - Extended onboarding flow with email OTP and native social login

**Cost at 1,000 users:** ~$786-836/month (voice $113-161, food photos ~$625, everything else $0-50)
**One-time cost:** $399 (geolocation plugin license)
**Key principle:** On-device processing eliminates per-call fees; platform-native capabilities replace paid services.

---

## Sprint Schedule Overview

| Sprint | Duration | Focus Area | Sub-Phase |
|--------|----------|------------|-----------|
| 46 | 2 weeks | NFC/QR Check-In & Deep Links | 4A: Physical Touchpoints |
| 47 | 1 week | App Shortcuts & Quick Actions | 4A: Physical Touchpoints |
| 48 | 2 weeks | Home Screen & Lock Screen Widgets | 4B: Native OS Integration |
| 49 | 2 weeks | Direct Health Sync + Dynamic Island | 4B: Native OS Integration |
| 50 | 2 weeks | Barcode Scanning & Food Database Pipeline | 4C: AI Data Entry |
| 51 | 2 weeks | Equipment OCR + Enhanced Voice Logging | 4C: AI Data Entry |
| 52 | 2 weeks | Context-Aware Notifications + Geofencing | 4D: Smart Engagement |
| 53 | 2 weeks | Progressive Onboarding & Auth Enhancement | 4D: Smart Engagement |

**Parallelizable:** Sprints 46, 48, 50, 51 can start independently.

---

## Epic 46: NFC/QR Physical Touchpoints

### 46.1 NFC Tag Read/Write
**Priority:** P0 (Critical)
**Sprint:** 46
**Status:** ✅ Complete

**User Stories:**
- As a client, I can tap my phone on an NFC tag at the gym and land on my workout in <3 seconds
- As a trainer, I can write deep-link URLs to NFC tags from the app for my clients
- As a trainer, I can view scan analytics for my NFC tags

**Implementation Tasks:**
- [ ] Install `@capgo/capacitor-nfc` v8.0.10
- [ ] Create `NfcService` in `apps/mobile/src/app/core/services/nfc.service.ts`
  - `scanTag()`: Start NFC session, parse NDEF URI record
  - `writeTag(uri: string)`: Write NDEF URI to NTAG213 (trainer-only)
  - `isSupported()`: Check NFC hardware availability
  - `generateDeepLink(type, params)`: Build `nutrifitos.app/action/...` URIs
  - Signal state: `isScanning`, `lastScan`, `error`
- [ ] Create database migration `20260213000000_nfc_touchpoints.sql`
  - `nfc_touchpoints` table: id, trainer_id, facility_id, tag_type (check_in/equipment/workout_start), deep_link_uri, label, equipment_id, workout_template_id, scan_count, created_at, updated_at
  - `nfc_scan_logs` table: id, touchpoint_id, user_id, scanned_at, platform
  - RLS: trainers manage their touchpoints, all users can scan
- [ ] Create NFC tag management page at `features/settings/pages/nfc-tags/nfc-tags.page.ts`
- [ ] Create floating NFC scan button component at `features/dashboard/components/nfc-scanner/nfc-scanner.component.ts`

**Acceptance Criteria:**
- User taps phone on NTAG213 tag, app opens to correct workout
- Trainer can write deep-link URI to NFC tag from settings
- Scan events logged for analytics
- Falls back gracefully to PWA URL when native app not installed

### 46.2 QR Code Generation
**Priority:** P0 (Critical)
**Sprint:** 46
**Status:** ✅ Complete

**User Stories:**
- As a trainer, I can generate QR codes for workout programs to print or display
- As a client, I can scan a QR code to quickly access my assigned workout

**Implementation Tasks:**
- [ ] Install `angularx-qrcode` v21.0.4
- [ ] Create QR check-in component at `features/clients/components/qr-checkin/qr-checkin.component.ts`
  - Generate canvas/SVG QR codes with FitOS branding
  - Support logo embedding and custom colors (dark theme)
  - Print-friendly output for trainers
- [ ] Add QR code display to trainer client management pages

**Acceptance Criteria:**
- QR code links to same deep-link URI as NFC tags
- QR codes render correctly in dark mode with branded colors
- QR codes scannable by any phone camera app

### 46.3 Deep-Link Router
**Priority:** P0 (Critical)
**Sprint:** 46
**Status:** ✅ Complete

**User Stories:**
- As a user, deep links from NFC/QR/notifications all route to the correct in-app screen

**Implementation Tasks:**
- [ ] Create `DeepLinkService` in `apps/mobile/src/app/core/services/deep-link.service.ts`
  - Central router replacing fragmented listeners in auth.service.ts and sso.service.ts
  - Parse `/action/checkin/:facilityId`, `/action/workout/:templateId`, `/action/equipment/:equipmentId`
  - Route to Angular Router targets after authentication check
  - Handle both `@capacitor/app` appUrlOpen and web `window.location` deep links
- [ ] Add `apple-app-site-association` to Firebase Hosting `.well-known` path
- [ ] Add `assetlinks.json` to Firebase Hosting `.well-known` path
- [ ] Register DeepLinkService in app initialization

**Acceptance Criteria:**
- Deep links work from NFC tags, QR codes, and push notifications
- `apple-app-site-association` and `assetlinks.json` validated
- Unauthenticated users redirect to login, then to deep-link target after auth

---

## Epic 47: App Shortcuts & Quick Actions

### 47.1 Native App Shortcuts
**Priority:** P1 (High)
**Sprint:** 47
**Status:** ✅ Complete

**User Stories:**
- As a client, I can long-press the app icon and quickly jump to "Log Workout", "Add Food", "Add Water", or "Start Timer"

**Implementation Tasks:**
- [ ] Install `@capawesome/capacitor-app-shortcuts` v8.0.0
- [ ] Create `AppShortcutsService` in `apps/mobile/src/app/core/services/app-shortcuts.service.ts`
  - `registerShortcuts()`: Called on app init
  - `handleShortcutAction(action)`: Route via deep-link.service.ts
  - Shortcuts: Log Workout, Quick Add Food, Add Water, Start Timer
  - Update shortcuts when user role changes
- [ ] Register shortcuts in `app.component.ts` `initializeApp()`

**Acceptance Criteria:**
- Long-press app icon shows 3-4 Quick Actions on iOS and Android
- Each shortcut navigates to correct page/action
- Shortcuts registered on app launch

### 47.2 Quick Water Logging
**Priority:** P1 (High)
**Sprint:** 47
**Status:** ✅ Complete

**User Stories:**
- As a client, I can log water intake with a single tap from the shortcut

**Implementation Tasks:**
- [ ] Create quick water modal at `features/nutrition/components/quick-water/quick-water.component.ts`
  - 250ml / 500ml / 750ml / custom quick buttons
  - One-tap logging, auto-dismiss
  - Haptic feedback on log

**Acceptance Criteria:**
- Water logged with single tap from shortcut
- Modal auto-dismisses after logging
- Nutrition totals update immediately

---

## Epic 48: Home Screen & Lock Screen Widgets

### 48.1 Widget Data Bridge
**Priority:** P1 (High)
**Sprint:** 48
**Status:** Not Started

**User Stories:**
- As a client, I can see my daily calorie ring, next workout, and streak on my home screen without opening the app

**Implementation Tasks:**
- [ ] Install `capacitor-widget-bridge` v8.0.0
- [ ] Create `WidgetService` in `apps/mobile/src/app/core/services/widget.service.ts`
  - `updateWidgetData()`: Push latest data to native widget via bridge
  - Data shape: caloriesCurrent, caloriesTarget, proteinCurrent, proteinTarget, nextWorkoutName, nextWorkoutTime, streakWeeks, streakType
  - Called after: nutrition log, workout completion, streak update
- [ ] Integrate calls from `nutrition.service.ts`, `workout-session.service.ts`, `streak.service.ts`

### 48.2 iOS Widgets (SwiftUI)
**Priority:** P1 (High)
**Sprint:** 48
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create WidgetKit extension in `apps/mobile/ios/App/FitOSWidget/`
- [ ] `CalorieRingWidget.swift`: Circular progress for daily calories/protein
- [ ] `NextWorkoutWidget.swift`: Next scheduled workout name + time
- [ ] `StreakWidget.swift`: Current streak counter with flame icon
- [ ] Lock screen variants: `accessoryCircular` (calorie ring gauge), `accessoryRectangular` (next workout)
- [ ] Dark theme matching `--fitos-bg-primary: #0D0D0D`
- [ ] Configure App Groups for shared UserDefaults

### 48.3 Android Widgets (Glance)
**Priority:** P1 (High)
**Sprint:** 48
**Status:** Not Started

**Implementation Tasks:**
- [ ] Create widget classes in `apps/mobile/android/app/src/main/java/com/fitos/app/widgets/`
- [ ] `CalorieRingWidget.kt`: RemoteViews calorie ring
- [ ] `NextWorkoutWidget.kt`: Next workout info
- [ ] `StreakWidget.kt`: Streak counter
- [ ] Configure SharedPreferences for data bridge

**Acceptance Criteria (All 48.x):**
- iOS home screen widget shows calorie ring with current/target
- iOS lock screen widget shows streak count
- Android home screen widget shows calorie ring and next workout
- Widgets update within 30 seconds of in-app data change
- Widgets show placeholder state when no data available
- Dark theme applied to all widgets

---

## Epic 49: Direct Health Sync + Dynamic Island

### 49.1 HealthKit/Health Connect Direct Integration
**Priority:** P0 (Critical)
**Sprint:** 49
**Status:** Not Started

**User Stories:**
- As a client, I can sync health data directly from Apple Health or Health Connect without a third-party service
- As a client, my smart scale data (weight, body fat %) syncs automatically

**Implementation Tasks:**
- [ ] Install `@capgo/capacitor-health` (free, SPM-ready, Capacitor 8 compatible)
- [ ] Install `@capacitor/background-runner`
- [ ] Create migration `20260213010000_health_sync_expanded.sql`
  - Add to `wearable_daily_data`: body_fat_pct, lean_body_mass_kg, bone_mass_kg, hrv_rmssd, hrv_sdnn, sleep_deep_mins, sleep_rem_mins, sleep_light_mins, sleep_awake_mins, data_source (healthkit/health_connect/terra)
  - `health_sync_log` table: id, user_id, sync_type, data_types_synced, records_synced, synced_at, duration_ms
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/healthkit.service.ts`:
  - Replace all stub implementations with real `@capgo/capacitor-health` calls
  - Add `requestAuthorization()` for expanded data types
  - Add `readBodyComposition()` for smart scale passthrough
  - Add `readSleepStages()` for detailed sleep analysis
  - Add `enableBackgroundDelivery()` for iOS background sync
  - Keep same public signal interface
- [ ] Create `HealthSyncService` in `apps/mobile/src/app/core/services/health-sync.service.ts`
  - Orchestrate sync between health plugin and Supabase
  - `syncAll()`: Full foreground sync
  - `syncBackground()`: Minimal background sync via background runner
  - Platform detection: iOS uses HealthKit, Android uses Health Connect
  - Write to `wearable_daily_data` with correct `data_source`
- [ ] Configure `@capacitor/background-runner` in `capacitor.config.ts`
- [ ] Update wearables settings page: Add "Apple Health" / "Health Connect" direct options alongside Terra

**Note:** Terra kept for Garmin/Whoop/Oura users. NEVER display calorie burn from wearables.

### 49.2 Dynamic Island Workout Timer
**Priority:** P2 (Medium)
**Sprint:** 49
**Status:** Not Started

**User Stories:**
- As a client on iPhone 14+, I can see my active workout and rest timer on the Dynamic Island

**Implementation Tasks:**
- [ ] Install `capacitor-live-activities` (ludufre)
- [ ] Create `LiveActivityService` in `apps/mobile/src/app/core/services/live-activity.service.ts`
  - `startWorkoutActivity(workout)`: Start Dynamic Island live activity
  - `updateActivity(exercise, setNumber, restRemaining)`: Update display
  - `endActivity()`: End on workout completion
  - iOS 16.1+ only, graceful no-op on Android and older iOS
- [ ] Create Widget Extension in `apps/mobile/ios/App/FitOSLiveActivity/`
  - `WorkoutLiveActivity.swift`: Dynamic Island compact/expanded views
  - Show current exercise, set count, rest timer countdown
- [ ] Integrate with `workout-session.service.ts`: start/update/end activity lifecycle

**Acceptance Criteria (All 49.x):**
- HealthKit authorization prompts for all data types on iOS
- Health Connect authorization on Android
- HRV, body fat %, lean body mass, sleep stages sync to Supabase
- Background sync runs at least every 4 hours (iOS) / 6 hours (Android)
- Smart scale data flows through Health Connect/HealthKit
- Dynamic Island shows workout name and rest timer (iPhone 14+)
- Terra remains functional for Garmin/Whoop/Oura users
- Calorie burn NEVER displayed from wearables

---

## Epic 50: Barcode Scanning & Food Database Pipeline

### 50.1 On-Device Barcode Scanner
**Priority:** P0 (Critical)
**Sprint:** 50
**Status:** Not Started

**User Stories:**
- As a client, I can scan a food barcode and instantly see nutrition information
- As a client, I can quickly re-log previously scanned items

**Implementation Tasks:**
- [ ] Install `@capacitor-mlkit/barcode-scanning`
- [ ] Create `BarcodeScannerService` in `apps/mobile/src/app/core/services/barcode-scanner.service.ts`
  - `scan()`: Open ML Kit scanner, return UPC/EAN string
  - `isSupported()`: Check camera + ML Kit availability
  - `requestPermission()`: Camera permission flow
  - Signal state: `isScanning`, `lastBarcode`, `error`
- [ ] Create barcode scan page at `features/nutrition/pages/barcode-scan/barcode-scan.page.ts`
  - Full-screen scanner overlay with viewfinder
  - Recent scans list
  - Manual barcode entry fallback
- [ ] Create barcode result component at `features/nutrition/components/barcode-result/barcode-result.component.ts`
  - Show found food with nutrition details
  - Edit quantities before logging
- [ ] Add route `tabs/nutrition/scan`
- [ ] Add "Scan Barcode" button to add-food page

### 50.2 Multi-Source Food Database Pipeline
**Priority:** P0 (Critical)
**Sprint:** 50
**Status:** Not Started

**User Stories:**
- As a client, barcode lookups find results >95% of the time via multiple databases

**Implementation Tasks:**
- [ ] Create migration `20260213020000_barcode_food_cache.sql`
  - `barcode_food_cache` table: barcode (PK), food_name, brand, serving_size, serving_unit, calories, protein, carbs, fat, fiber, sugar, sodium, source (openfoodfacts/usda/fatsecret/manual), verified, last_fetched_at
  - `barcode_scan_history` table: id, user_id, barcode, food_name, scanned_at
- [ ] Create edge function `supabase/functions/barcode-lookup/index.ts`
  - Pipeline: (1) barcode_food_cache → (2) Open Food Facts API → (3) USDA FoodData Central → (4) FatSecret API → (5) null
  - Cache successful lookups
  - Return standardized Food shape matching food.service.ts
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/food.service.ts`
  - Add `lookupBarcode(barcode: string): Promise<Food | null>` method
  - Call `barcode-lookup` edge function
  - Integrate with existing `searchResults` signal

**Acceptance Criteria:**
- Camera opens barcode scanner with viewfinder overlay
- UPC/EAN detected on-device in <500ms
- Nutrition resolved from cache or remote APIs in <2 seconds
- Found food shows full macros, user can edit serving size
- Results cached for future lookups
- "Not found" offers manual entry fallback
- Recent scans available for quick re-logging

---

## Epic 51: Equipment OCR + Enhanced Voice Logging

### 51.1 Gym Equipment Display OCR
**Priority:** P2 (Medium)
**Sprint:** 51
**Status:** Not Started

**User Stories:**
- As a client, I can photograph my treadmill display and auto-log cardio data

**Implementation Tasks:**
- [ ] Install ML Kit Text Recognition v2 Capacitor plugin
- [ ] Create migration `20260213030000_equipment_ocr_logs.sql`
  - `equipment_ocr_logs` table: id, user_id, equipment_type (treadmill/elliptical/bike/rower/stairclimber), recognized_text, parsed_data (jsonb), confidence, photo_url, session_id (FK), created_at
- [ ] Create `EquipmentOcrService` in `apps/mobile/src/app/core/services/equipment-ocr.service.ts`
  - `captureAndRecognize()`: Photo + ML Kit Text Recognition
  - `parseEquipmentDisplay(text, equipmentType)`: Extract distance, duration, speed, incline via regex per type
  - `mapToWorkoutLog(parsed)`: Convert to workout session data
  - Signal state: `isProcessing`, `lastResult`, `error`
- [ ] Create equipment OCR component at `features/workouts/components/equipment-ocr/equipment-ocr.component.ts`
  - Camera overlay optimized for equipment displays
  - Landscape guide frame, flash toggle
  - Parsed results for confirmation before logging
- [ ] Add "Scan Equipment" button to active workout page for cardio exercises

**Acceptance Criteria:**
- Equipment OCR captures displays with >85% accuracy in gym lighting
- Parsed data shown for confirmation before logging
- Works offline (ML Kit on-device)

### 51.2 Enhanced Voice Logging
**Priority:** P1 (High)
**Sprint:** 51
**Status:** Not Started

**User Stories:**
- As a client, voice recognition accurately understands fitness terms like "deadlift", "superset", "RPE"
- As a client, voice commands work better in both workout and nutrition contexts

**Implementation Tasks:**
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/voice.service.ts`
  - Expand FITNESS_KEYWORDS from ~20 to 100+ terms:
    - 50+ exercise names (deadlift, squat, bench press, lat pulldown, etc.)
    - Equipment terms (cable, Smith machine, leg press, etc.)
    - Nutrition terms (protein, carbs, calories, chicken, rice, etc.)
    - Units (quarter, half, one-fifty, two-twenty-five)
    - Commands (superset, drop set, rest-pause, AMRAP, RPE)
  - Switch to Deepgram Nova-3 keyterm prompting format (up to 6x recognition improvement)
  - Upgrade model from nova-2 to nova-3
  - Add `setContext(context: 'workout' | 'nutrition')`: Swap active keyword sets by context
- [ ] Add voice context indicator to active workout page

**Acceptance Criteria:**
- Voice recognition accuracy improves measurably for fitness terms
- Deepgram model upgraded to nova-3
- Context switches automatically between workout and nutrition modes
- Keyword list expanded to 100+ fitness-specific terms

---

## Epic 52: Context-Aware Notifications + Geofencing

### 52.1 Geofencing & Gym Proximity Detection
**Priority:** P1 (High)
**Sprint:** 52
**Status:** Not Started

**User Stories:**
- As a client, I receive a workout reminder when I arrive at the gym
- As a trainer, I can set up gym locations for my clients' geofencing

**Implementation Tasks:**
- [ ] Install `@transistorsoft/capacitor-background-geolocation` v7.2.1 ($399 one-time license)
- [ ] Install `@capgo/capacitor-wifi` for secondary Wi-Fi SSID gym detection
- [ ] Install `@capacitor/push-notifications`
- [ ] Create migration `20260213040000_geofencing_notifications.sql`
  - `gym_locations` table: id, facility_id, latitude, longitude, radius_meters (default 100), wifi_ssid, created_at
  - `notification_log` table: id, user_id, notification_type (jitai/geofence_arrival/workout_reminder/streak_risk/nutrition_reminder), title, body, delivered_at, opened_at, action_taken, channel
  - `notification_preferences` table: user_id (PK), max_daily_notifications (default 3), quiet_hours_start (default '22:00'), quiet_hours_end (default '07:00'), geofence_enabled (default true), enabled_types (text array)
  - `send_time_predictions` table: user_id, day_of_week, predicted_best_hour, confidence, sample_size, updated_at
- [ ] Create `GeofenceService` in `apps/mobile/src/app/core/services/geofence.service.ts`
  - `registerGymGeofences(locations)`: Set up geofences
  - `onGeofenceEntry(callback)` / `onGeofenceExit(callback)`
  - `getCurrentProximity()`: Check if near any gym
  - Signal state: `isNearGym`, `nearestGym`, `isTracking`

### 52.2 Smart Notification Orchestrator
**Priority:** P1 (High)
**Sprint:** 52
**Status:** Not Started

**User Stories:**
- As a client, I receive max 2-3 notifications per day, always positively framed
- As a client, notification frequency decreases as my habits form over 66 days
- As a client, I control which notification types I receive

**Implementation Tasks:**
- [ ] Create `NotificationService` in `apps/mobile/src/app/core/services/notification.service.ts`
  - Central orchestrator for all notifications
  - `initialize()`: Register FCM token, set up channels
  - `scheduleLocal(notification)`: Schedule local notification
  - `handlePush(payload)`: Route push to deep link
  - `checkFatigueLimit()`: Enforce max 2-3/day
  - `respectQuietHours()`: No notifications during quiet hours
  - `trackDelivery()` / `trackOpen()`: Analytics
  - 66-day habit decay model: reduce frequency as habits form
- [ ] Create edge functions:
  - `supabase/functions/send-push-notification/index.ts`: FCM push via Firebase Admin
  - `supabase/functions/predict-send-time/index.ts`: Analyze open times for best send hour
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/jitai.service.ts`
  - Add `updateOpportunityFromGeofence(isNearGym)`: Factor gym proximity into opportunity score
  - Add `updateOpportunityFromWifi(ssid)`: Secondary gym signal
  - Integrate notification preferences for fatigue limits
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/firebase.service.ts`
  - Add FCM token registration
  - Add `onNotificationReceived()` / `onNotificationOpened()` handlers
- [ ] Create notification preferences page at `features/settings/pages/notification-prefs/notification-prefs.page.ts`
- [ ] Create gym location picker at `features/settings/components/gym-location-picker/gym-location-picker.component.ts`
- [ ] Add route `tabs/settings/notification-preferences`

**Acceptance Criteria:**
- Geofence triggers notification within 30 seconds of gym arrival
- Wi-Fi SSID provides secondary gym confirmation
- Max 2-3 notifications per day enforced
- Quiet hours respected (default 10pm-7am)
- Notification frequency decays over 66 days
- Push notifications deep-link to correct section
- All notifications use positive framing (never punitive)
- User can fully control notification types and timing

---

## Epic 53: Progressive Onboarding & Auth Enhancement

### 53.1 Email OTP & Native Social Login
**Priority:** P0 (Critical)
**Sprint:** 53
**Status:** Not Started

**User Stories:**
- As a new user, I can sign up with a 6-digit email code without leaving the app
- As a new user, I can sign in with Google or Apple in <5 seconds

**Implementation Tasks:**
- [ ] Install `@capgo/capacitor-social-login`
- [ ] **ENHANCE** `apps/mobile/src/app/core/services/auth.service.ts`
  - Add `signInWithOtp(email)`: Call `supabase.auth.signInWithOtp({ email })`
  - Add `verifyOtp(email, token)`: Call `supabase.auth.verifyOtp()`
  - Add `signInWithIdToken(provider, idToken, nonce?)`: For native social login
  - Keep existing magic link as fallback
- [ ] Create `SocialLoginService` in `apps/mobile/src/app/core/services/social-login.service.ts`
  - `signInWithGoogle()`: Get Google ID token via plugin, pass to auth.service.signInWithIdToken()
  - `signInWithApple()`: Get Apple ID token, pass to auth service
  - Platform detection: Native on iOS/Android, Supabase OAuth fallback on web
- [ ] Update login page: Add "Continue with Google" / "Continue with Apple" buttons, email OTP flow
- [ ] Update register page: Same social login additions
- [ ] Configure Google and Apple OAuth in Supabase for signInWithIdToken() flow

### 53.2 7-Stage Progressive Onboarding
**Priority:** P0 (Critical)
**Sprint:** 53
**Status:** Not Started

**User Stories:**
- As a new user, onboarding feels personalized and motivating (not a boring form)
- As a new user, I see a personalized plan preview before committing
- As a returning user, the app asks me 1-2 preference questions per session to refine my experience

**Implementation Tasks:**
- [ ] Create migration `20260213050000_progressive_onboarding.sql`
  - Add to `profiles`: onboarding_stage (int 0-7), last_profiling_step (int), life_context (jsonb), behavioral_assessment (jsonb), imported_health_data (boolean), onboarding_completed_at (timestamp)
  - `onboarding_analytics` table: id, user_id, stage, step_name, time_spent_seconds, completed, created_at
  - `progressive_profiling_queue` table: id, user_id, question_key, question_text, answer, asked_at, answered_at, session_number
- [ ] **ENHANCE** onboarding page at `features/auth/pages/onboarding/onboarding.page.ts`
  - Expand from basic wizard to 7-stage progressive flow with progress bar
- [ ] Create 7 onboarding stage components in `features/auth/pages/onboarding/stages/`:
  - `goal-anchoring/` — Stage 1: Primary fitness goal with motivational framing
  - `life-context/` — Stage 2: Timeline, events, motivation source
  - `health-import/` — Stage 3: Import stats from Apple Health/Health Connect
  - `behavioral-assessment/` — Stage 4: Activity level, exercise preferences, schedule
  - `social-proof/` — Stage 5: Success stories interstitial (every ~5 screens)
  - `plan-preview/` — Stage 6: Personalized plan preview
  - `paywall/` — Stage 7: Subscription options (integrates with existing Stripe)
- [ ] Create `ProgressiveProfilingService` in `apps/mobile/src/app/core/services/progressive-profiling.service.ts`
  - `getNextQuestions(count)`: Get 1-2 questions for this session
  - `submitAnswer(questionKey, answer)`: Save and advance counter
  - `shouldShowProfiling()`: Check session gap threshold
  - Limit to 1-2 questions per session, never interrupt core actions
- [ ] Create profiling prompt component at `features/dashboard/components/profiling-prompt/profiling-prompt.component.ts`

**Acceptance Criteria:**
- Email OTP: User enters email, receives 6-digit code, authenticated without leaving app
- Google sign-in completes in <5 seconds via native flow
- Apple sign-in completes in <5 seconds on iOS
- Onboarding has 7 stages with progress bar, takes 3-5 minutes
- Social proof interstitials appear every ~5 screens
- Health data import offered during onboarding (requires Sprint 49)
- Personalized plan preview shown before paywall
- Progressive profiling shows 1-2 questions per post-onboarding session
- Existing magic link and password auth continue to work as fallbacks
- Onboarding analytics track time spent and completion per stage

---

## Cost Summary

| Category | 100 users/mo | 1,000 users/mo | 10,000 users/mo |
|----------|-------------|----------------|-----------------|
| Voice (Deepgram Nova-3 batch) | $16 | $161 | $1,613 |
| Food photos (Passio AI) | $63 | $625 | $6,250 |
| Barcode + OCR (on-device) | $0 | $0 | $0 |
| Health sync (direct) | $0 | $0 | $0 |
| NFC/QR/Widgets/Shortcuts | $0 | $0 | $0 |
| Notifications (FCM + Cloud Fn) | $0 | $0-5 | $10-50 |
| Auth (Supabase) | $0 | $0 | $0 |
| **Total** | **$79** | **$786-791** | **$7,873-7,913** |

**One-time:** $399 (Transistorsoft geolocation license)

Budget alternative: GPT-4o Mini for voice drops total to $74 / $738 / $7,375.

---

## Sprint Dependency Graph

```
Sprint 46 (NFC/QR) ─── Sprint 47 (Shortcuts)
                   └── Sprint 52 (Notifications, uses deep-link service)

Sprint 48 (Widgets) ── Sprint 49 (Health Sync)
                                └── Sprint 53 (Onboarding, optional health import)

Sprint 50 (Barcode) ... independent
Sprint 51 (OCR/Voice) ... independent
```

---

## Related Documentation

- `docs/PHASE1_BACKLOG.md` - Phase 1 MVP features (Sprints 0-8)
- `docs/PHASE2_BACKLOG.md` - Phase 2 AI features (Sprints 7-16)
- `docs/archive/sprints/SPRINTS_27-45_ROADMAP.md` - Phase 3 roadmap
- `docs/DESIGN_SYSTEM.md` - Colors, typography, spacing
- `docs/AI_INTEGRATION.md` - Voice, photo, coaching architecture
- `docs/UX_PATTERNS.md` - Friction reduction patterns
- `docs/Zero tracking friction_ a cost-optimized implementation blueprint.pdf` - Source blueprint

---

## Definition of Done (Per Sprint)

- [ ] Implementation plan documented
- [ ] Database migration created and tested
- [ ] Services/components built with standalone + OnPush + signals pattern
- [ ] Types added to `@fitos/shared` (not inline in services)
- [ ] Unit tests written (>80% coverage for services)
- [ ] Manual testing on iOS and Android
- [ ] Dark theme applied to all new UI
- [ ] Accessibility: 7:1+ contrast, 44px+ touch targets
- [ ] Code reviewed
- [ ] Documentation updated

---

**Phase Status:** 🚧 In Progress
**Completed:** Sprint 46 (NFC/QR), Sprint 47 (App Shortcuts & Quick Water)
**Next Step:** Sprint 48 - Home Screen & Lock Screen Widgets
