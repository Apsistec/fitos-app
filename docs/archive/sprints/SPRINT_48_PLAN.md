# Sprint 48: Home Screen & Lock Screen Widgets - Implementation Plan

**Sprint:** 48
**Feature:** Native iOS (SwiftUI WidgetKit) & Android (Glance) Widgets
**Goal:** Display calorie ring, next workout, and streak on home/lock screen
**Priority:** P1 (High)
**Story Points:** 21
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 48 implements native home screen and lock screen widgets that keep fitness data visible without opening the app. The Ionic/Capacitor app pushes data via `capacitor-widget-bridge` to native SwiftUI (iOS) and Glance/RemoteViews (Android) widgets. All widget UI must be written natively — the Capacitor plugin serves as a data bridge only.

**Strategic Value:**
- Widgets are the #1 retention driver for fitness apps
- Calorie ring on lock screen provides constant motivation
- $0/month recurring cost
- Requires significant native code but zero ongoing maintenance

---

## Goals

1. Create widget data bridge service to push calorie/workout/streak data to native layer
2. Build iOS SwiftUI widgets (home screen + lock screen variants)
3. Build Android Glance widgets (home screen)
4. Integrate data updates from nutrition, workout, and streak services

---

## Implementation Tasks

### Task 48.1: Install Plugin & Create Widget Service

**Files to create:**
- `apps/mobile/src/app/core/services/widget.service.ts`

**Files to modify:**
- `apps/mobile/src/app/core/services/nutrition.service.ts` (call updateWidgetData after log)
- `apps/mobile/src/app/core/services/workout-session.service.ts` (call after workout complete)
- `apps/mobile/src/app/core/services/streak.service.ts` (call after streak update)

**Deliverables:**
- Install `capacitor-widget-bridge` v8.0.0
- Widget service that pushes structured data to native widget layer
- Automatic updates on data changes

**Data Shape:**
```typescript
interface WidgetData {
  caloriesCurrent: number;
  caloriesTarget: number;
  proteinCurrent: number;
  proteinTarget: number;
  nextWorkoutName: string | null;
  nextWorkoutTime: string | null;
  streakWeeks: number;
  streakType: 'workout' | 'nutrition' | 'combined';
  lastUpdated: string;
}
```

### Task 48.2: iOS SwiftUI Widgets

**Files to create:**
- `apps/mobile/ios/App/FitOSWidget/CalorieRingWidget.swift`
- `apps/mobile/ios/App/FitOSWidget/NextWorkoutWidget.swift`
- `apps/mobile/ios/App/FitOSWidget/StreakWidget.swift`
- `apps/mobile/ios/App/FitOSWidget/FitOSWidgetBundle.swift`

**Deliverables:**
- Home screen widgets: CalorieRing (medium), NextWorkout (small), Streak (small)
- Lock screen widgets: `accessoryCircular` (calorie gauge), `accessoryRectangular` (next workout)
- Dark theme matching `--fitos-bg-primary: #0D0D0D`
- App Groups configuration for shared UserDefaults
- Placeholder/empty state views

### Task 48.3: Android Glance Widgets

**Files to create:**
- `apps/mobile/android/app/src/main/java/com/fitos/app/widgets/CalorieRingWidget.kt`
- `apps/mobile/android/app/src/main/java/com/fitos/app/widgets/NextWorkoutWidget.kt`
- `apps/mobile/android/app/src/main/java/com/fitos/app/widgets/StreakWidget.kt`

**Deliverables:**
- Home screen widgets using Glance (Jetpack Compose for widgets) or RemoteViews
- SharedPreferences bridge for data from Capacitor
- Widget update receiver

---

## Acceptance Criteria

- [ ] iOS home screen widget shows calorie ring with current/target
- [ ] iOS lock screen circular widget shows calorie gauge
- [ ] iOS lock screen rectangular widget shows next workout name + time
- [ ] Android home screen widget shows calorie ring and next workout
- [ ] Widgets update within 30 seconds of in-app data change
- [ ] Widgets show placeholder state when no data available
- [ ] Dark theme (#0D0D0D background) applied to all widgets
- [ ] Adherence-neutral colors (purple for over-target, not red)

---

## Dependencies

- None (reads from existing services)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 48.1 - Install Plugin & Create Widget Service
