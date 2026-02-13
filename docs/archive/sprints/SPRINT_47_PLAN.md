# Sprint 47: App Shortcuts & Quick Actions - Implementation Plan

**Sprint:** 47
**Feature:** Native iOS Quick Actions & Android App Shortcuts
**Goal:** Add long-press shortcuts for instant access to common actions
**Priority:** P1 (High)
**Story Points:** 8
**Duration:** 1 week
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 47 adds iOS/Android quick actions (3D Touch / long-press) for "Log Workout", "Quick Add Food", "Add Water", and "Start Timer". This is the highest-ROI, lowest-effort feature in Phase 4 — implementation takes under a day for the core shortcuts plus a quick water logging modal.

**Strategic Value:**
- Reduces common actions to a single gesture from home screen
- $0/month recurring cost
- Complements NFC tags for users who prefer software shortcuts

---

## Goals

1. Register 4 app shortcuts on app launch
2. Route shortcut actions through the deep-link service (Sprint 46)
3. Create a quick water logging modal for one-tap hydration tracking

---

## Implementation Tasks

### Task 47.1: Install Plugin & Create Shortcuts Service

**Files to create:**
- `apps/mobile/src/app/core/services/app-shortcuts.service.ts`

**Files to modify:**
- `apps/mobile/src/app/app.component.ts` (register shortcuts in initializeApp)

**Deliverables:**
- Install `@capawesome/capacitor-app-shortcuts` v8.0.0
- Register shortcuts: Log Workout, Quick Add Food, Add Water, Start Timer
- Listen for shortcut click events, route via deep-link.service.ts
- Update shortcuts when user role changes

**Technical Specifications:**
```typescript
@Injectable({ providedIn: 'root' })
export class AppShortcutsService {
  private readonly deepLinkService = inject(DeepLinkService);

  async registerShortcuts(): Promise<void> {
    await AppShortcuts.set({
      shortcuts: [
        { id: 'log-workout', title: 'Log Workout', icon: '<fitness>' },
        { id: 'add-food', title: 'Quick Add Food', icon: '<restaurant>' },
        { id: 'add-water', title: 'Add Water', icon: '<water>' },
        { id: 'start-timer', title: 'Start Timer', icon: '<timer>' },
      ]
    });

    AppShortcuts.addListener('shortcutItemClick', (event) => {
      this.handleShortcutAction(event.shortcutId);
    });
  }

  private handleShortcutAction(action: string): void {
    const routes: Record<string, string> = {
      'log-workout': '/tabs/workouts',
      'add-food': '/tabs/nutrition/add',
      'add-water': '/tabs/nutrition/water',
      'start-timer': '/tabs/workouts/timer',
    };
    this.deepLinkService.handleUrl(routes[action] ?? '/tabs/dashboard');
  }
}
```

### Task 47.2: Create Quick Water Modal

**Files to create:**
- `apps/mobile/src/app/features/nutrition/components/quick-water/quick-water.component.ts`

**Deliverables:**
- Minimal modal with 250ml / 500ml / 750ml / custom quick buttons
- One-tap logging with haptic feedback
- Auto-dismiss after logging
- Dark theme, adherence-neutral colors

---

## Acceptance Criteria

- [ ] Long-press app icon shows 4 Quick Actions on iOS and Android
- [ ] "Log Workout" opens workout list or active workout
- [ ] "Quick Add Food" opens add food page
- [ ] "Add Water" opens quick water modal, logs with one tap
- [ ] "Start Timer" opens rest timer overlay
- [ ] Shortcuts registered on app launch
- [ ] Water modal auto-dismisses and updates nutrition totals

---

## Dependencies

- Sprint 46: Reuses `deep-link.service.ts` for action routing

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 47.1 - Install Plugin & Create Shortcuts Service
