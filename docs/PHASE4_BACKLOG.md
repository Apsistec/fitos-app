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
| --- | --- | --- | --- |
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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

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
**Status:** ✅ Complete

**User Stories:**

- As a client, I can photograph my treadmill display and auto-log cardio data

**Implementation Tasks:**

- [x] Install `@pantrist/capacitor-plugin-ml-kit-text-recognition@8.0.0` (Capacitor 8 compatible)
- [x] Create migration `20260213030000_equipment_ocr_logs.sql`
  - `equipment_ocr_logs` table: id, user_id, equipment_type (treadmill/elliptical/bike/rower/stairclimber/other), recognized_text, parsed_data (jsonb), confidence, photo_url, session_id (FK), created_at
- [x] Create `EquipmentOcrService` in `apps/mobile/src/app/core/services/equipment-ocr.service.ts`
  - `captureAndRecognize()`: Photo via `@capacitor/camera` + ML Kit text detection
  - `parseEquipmentDisplay(text, equipmentType)`: Equipment-specific regex per type; confidence = fieldsFound/maxFields
  - `mapToWorkoutLog(parsed)`: Convert to workout session note
  - Signal state: `isProcessing`, `lastResult`, `error`
- [x] Create equipment OCR component at `features/workouts/components/equipment-ocr/equipment-ocr.component.ts`
  - Equipment type selector (treadmill/elliptical/bike/rower/stairclimber/other)
  - Metrics confirmation grid with confidence badge
  - Re-scan and "Log Cardio" action buttons
- [x] Added collapsible "Scan Cardio Equipment" panel to active workout page

**Acceptance Criteria:**

- Equipment OCR captures displays with >85% accuracy in gym lighting
- Parsed data shown for confirmation before logging
- Works offline (ML Kit on-device)

### 51.2 Enhanced Voice Logging

**Priority:** P1 (High)
**Sprint:** 51
**Status:** ✅ Complete

**User Stories:**

- As a client, voice recognition accurately understands fitness terms like "deadlift", "superset", "RPE"
- As a client, voice commands work better in both workout and nutrition contexts

**Implementation Tasks:**

- [x] **ENHANCED** `apps/mobile/src/app/core/services/voice.service.ts`
  - Expanded keywords from ~15 to 100+ terms split into two context sets:
    - `WORKOUT_KEYTERMS`: 90+ terms covering commands, units, compound lifts, isolation exercises, equipment, cardio, modifiers
    - `NUTRITION_KEYTERMS`: 80+ terms covering meal types, portion units, common foods, macros
  - DONE: expand FITNESS_KEYWORDS from ~20 to 100+ terms:
    - 50+ exercise names (deadlift, squat, bench press, lat pulldown, etc.)
    - Equipment terms (cable, Smith machine, leg press, etc.)
    - Nutrition terms (protein, carbs, calories, chicken, rice, etc.)
    - Units (quarter, half, one-fifty, two-twenty-five)
    - Commands (superset, drop set, rest-pause, AMRAP, RPE)
  - [x] Switch to Deepgram Nova-3 `keyterm` param (replaces `keywords`; up to 6x recognition improvement)
  - [x] Upgrade model from `nova-2` to `nova-3`
  - [x] Added `setContext(context: 'workout' | 'nutrition')`: swaps active keyterm set; reconnects mid-session
  - [x] Added `currentContext` readonly signal for UI binding
- [x] Added voice context indicator (Workout / Nutrition chip toggle) to active workout page

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
**Status:** ✅ Complete

**User Stories:**

- As a client, I receive a workout reminder when I arrive at the gym
- As a trainer, I can set up gym locations for my clients' geofencing

**Implementation Tasks:**

- [x] Install `@capacitor/geolocation` (free alternative to $399 TransistorSoft plugin — Haversine formula handles geofencing natively)
- [x] Install `@capgo/capacitor-wifi` for secondary Wi-Fi SSID gym detection
- [x] Install `@capacitor/push-notifications`
- [x] Create migration `20260213040000_geofencing_notifications.sql`
  - `gym_locations` table: id, facility_id, trainer_id, latitude, longitude, radius_meters (50-2000, default 100), wifi_ssid, is_active; RLS trainer-manages-own + client-reads-own-facility
  - `notification_log` table: id, user_id, notification_type enum (10 types), title, body, data jsonb, channel, delivered_at, opened_at, action_taken, fcm_message_id
  - `notification_preferences` table: user_id (PK), all type booleans, max_daily_notifications (1-10), quiet_hours_start/end, habit_decay_enabled, days_since_onboarding; RLS user-owns
  - `send_time_predictions` table: (user_id, day_of_week) PK, predicted_best_hour, confidence, sample_size
  - `geofence_events` table: audit log of all entry/exit events
  - `get_daily_notification_count()` + `is_in_quiet_hours()` helper functions
- [x] Create `GeofenceService` in `apps/mobile/src/app/core/services/geofence.service.ts`
  - Haversine formula geofencing (no paid plugin)
  - Hysteresis counting (N=2) prevents rapid entry/exit flapping
  - Secondary Wi-Fi SSID confirmation via `@capgo/capacitor-wifi`
  - `registerGymLocation()`, `loadGymLocations()`, `getCurrentProximity()`, `isOnGymWifi()`
  - `onGeofenceEntry(cb)` / `onGeofenceExit(cb)` callbacks with unsubscribe
  - Signal state: `isNearGym`, `nearestGym`, `isTracking`, `gymLocations`, `lastPosition`, `error`

### 52.2 Smart Notification Orchestrator

**Priority:** P1 (High)
**Sprint:** 52
**Status:** ✅ Complete

**User Stories:**

- As a client, I receive max 2-3 notifications per day, always positively framed
- As a client, notification frequency decreases as my habits form over 66 days
- As a client, I control which notification types I receive

**Implementation Tasks:**

- [x] Create `NotificationService` in `apps/mobile/src/app/core/services/notification.service.ts`
  - Central orchestrator for push + local notifications
  - `initialize()`: Loads prefs, checks push permission, refreshes daily count
  - `send(payload)`: Enforces type-enabled, quiet hours, fatigue limit before scheduling
  - `requestPermission()`: FCM registration + token capture
  - `sendGeofenceArrival()`, `sendStreakRisk()`, `sendWorkoutReminder()` pre-built senders
  - `loadPreferences()` / `savePreferences()` backed by `notification_preferences` table
  - `recordOpenTime()`: Exponential moving average (α=0.3) send-time learning
  - `getBestSendHour()`: Reads `send_time_predictions` for personalised send time
  - `effectiveMaxDaily` computed signal: 66-day linear decay from maxDaily→1
- [x] Create edge functions:
  - `supabase/functions/send-push-notification/index.ts`: FCM v1 API push with server-side quiet-hours + daily-limit check
  - `supabase/functions/predict-send-time/index.ts`: Weighted EMA prediction cron / on-demand
- [x] **ENHANCED** `apps/mobile/src/app/core/services/jitai.service.ts`
  - `updateOpportunityFromGeofence(isNearGym)`: +0.5 boost when at gym
  - `updateOpportunityFromWifi(ssid, gymWifiSsids)`: +0.3 boost when on gym Wi-Fi
  - `getLocalOpportunityBoost()`: Returns combined capped boost factor
- [x] **ENHANCED** `apps/mobile/src/app/core/services/firebase.service.ts`
  - `trackFcmRegistration()`, `trackNotificationReceived()`, `trackNotificationOpened()`, `trackGeofenceEntry()`
- [x] Enhanced `features/settings/pages/notifications/notifications.page.ts`
  - Push permission banner + enable button
  - All notification type toggles wired to `NotificationService.savePreferences()`
  - Quiet hours time pickers (start/end)
  - Max daily notifications range slider (1-10)
  - 66-day habit decay toggle
  - Gym location picker (shown when geofence enabled)
  - Daily stats row (sent today / remaining)
- [x] Created gym location picker at `features/settings/components/gym-location-picker/gym-location-picker.component.ts`
- Route `tabs/settings/notifications` already existed — no new route needed

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
**Status:** ✅ Complete

**User Stories:**

- As a new user, I can sign up with a 6-digit email code without leaving the app
- As a new user, I can sign in with Google or Apple in <5 seconds

**Implementation Tasks:**

- [x] Install `@capgo/capacitor-social-login`
- [x] **ENHANCED** `apps/mobile/src/app/core/services/auth.service.ts`
  - Added `signInWithOtp(email)`: Call `supabase.auth.signInWithOtp({ email })`
  - Added `verifyOtp(email, token)`: Call `supabase.auth.verifyOtp()`
  - Added `signInWithIdToken(provider, idToken, nonce?)`: For native social login
  - Existing magic link preserved as fallback
- [x] Created `SocialLoginService` in `apps/mobile/src/app/core/services/social-login.service.ts`
  - `signInWithGoogle()`: Native ID token via plugin on Capacitor, Supabase OAuth fallback on web
  - `signInWithApple()`: iOS native flow with SHA-256 nonce; web fallback
  - Platform detection: Capacitor.isNativePlatform() / Capacitor.getPlatform()
- [x] Created `OtpLoginComponent` at `features/auth/components/otp-login/otp-login.component.ts`
  - 2-step: email entry → 6-digit code; 60-second resend cooldown
- [x] Updated all 3 login pages (client, trainer, gym-owner):
  - IonSegment Password/Email Code tabs
  - Native social login via SocialLoginService with per-button spinners
  - OtpLoginComponent integrated

### 53.2 7-Stage Progressive Onboarding

**Priority:** P0 (Critical)
**Sprint:** 53
**Status:** ✅ Complete

**User Stories:**

- As a new user, onboarding feels personalized and motivating (not a boring form)
- As a new user, I see a personalized plan preview before committing
- As a returning user, the app asks me 1-2 preference questions per session to refine my experience

**Implementation Tasks:**

- [x] Created migration `20260213050000_progressive_onboarding.sql`
  - Added to `profiles`: onboarding_stage (smallint 0-7), last_profiling_step, life_context (jsonb), behavioral_assessment (jsonb), imported_health_data (boolean), onboarding_completed_at (timestamptz)
  - `onboarding_analytics` table with RLS (user-owns-own)
  - `progressive_profiling_queue` table with partial index on unanswered questions
  - `social_proof_stories` table with RLS (anyone reads active; trainer manages own)
  - `get_onboarding_completion_rate(p_trainer_id)` analytics function
- [x] **REWROTE** onboarding page at `features/auth/pages/onboarding/onboarding.page.ts`
  - Expanded from 3-step wizard to full 7-stage progressive flow with progress bar
  - Stage 1: Profile (all roles — name, goal, weight/height)
  - Stage 2: Goal Anchoring (clients) — 2-col goal grid + motivation chips
  - Stage 3: Life Context — timeline, key event, activity level selects
  - Stage 4: Health Import — Apple Health (iOS) / Google Fit (Android) with skip
  - Stage 5: Social Proof interstitial — goal-category-mapped success story
  - Stage 6: Plan Preview — computed workouts/week, calorie target, timeline
  - Stage 7: Role-specific setup (trainer bio/specialty or gym owner facility)
  - Role-aware totalStages: clients=7, trainers/owners=2
  - Back navigation via prevStage()
  - markOnboardingComplete() upserts onboarding_completed_at
- [x] Created `ProgressiveProfilingService` in `apps/mobile/src/app/core/services/progressive-profiling.service.ts`
  - `shouldShowProfiling()`: Checks onboarding complete + 24h session gap + questions remain
  - `getNextQuestions(count)`: Fetches unanswered unskipped questions ordered by session_number
  - `startSession()`: Loads questions + records session timestamp in localStorage
  - `submitAnswer(questionId, answer)`: Saves answer, updates signal, auto-closes when done
  - `skipQuestion(questionId)`: Marks skipped permanently
  - `seedQuestionsForNewUser(userId)`: Inserts 8 seed questions at onboarding completion
  - 24h SESSION_GAP_MS prevents same-day re-prompting
- [x] Created `ProfilingPromptComponent` at `features/dashboard/components/profiling-prompt/profiling-prompt.component.ts`
  - Shows 1-2 structured/free-text questions per session
  - Progress dots, dismiss button, Skip/Next/Done actions
  - Wired into client dashboard at top of content area
  - Pre-built answer configs for all 8 seed question types

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
| ---------- | ------------- | ---------------- | ----------------- |
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

``` general
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

**Phase Status:** ✅ Complete
**Completed:** Sprint 46 (NFC/QR), Sprint 47 (App Shortcuts & Quick Water), Sprint 48 (Widgets), Sprint 49 (Direct Health Sync + Dynamic Island), Sprint 50 (Barcode Scanning & Food Database Pipeline), Sprint 51 (Equipment OCR + Enhanced Voice Logging), Sprint 52 (Context-Aware Notifications + Geofencing), Sprint 53 (Progressive Onboarding & Auth Enhancement)
**Next Step:** Phase 5 - Scheduling & Practice Management (Sprint 54)
