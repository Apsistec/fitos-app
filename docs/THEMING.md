# FitOS Theming & Dark Mode Guide

Complete guide for implementing themes, dark mode, and platform-specific styling.

---

## CSS Custom Properties System

### Core Theme Variables

```css
/* global.scss */
:root {
  /* ===== Brand Colors ===== */
  --ion-color-primary: #3880ff;
  --ion-color-primary-rgb: 56, 128, 255;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #3171e0;
  --ion-color-primary-tint: #4c8dff;

  --ion-color-secondary: #3dc2ff;
  --ion-color-secondary-rgb: 61, 194, 255;
  --ion-color-secondary-contrast: #ffffff;
  --ion-color-secondary-contrast-rgb: 255, 255, 255;
  --ion-color-secondary-shade: #36abe0;
  --ion-color-secondary-tint: #50c8ff;

  --ion-color-tertiary: #5260ff;
  --ion-color-tertiary-rgb: 82, 96, 255;
  --ion-color-tertiary-contrast: #ffffff;
  --ion-color-tertiary-contrast-rgb: 255, 255, 255;
  --ion-color-tertiary-shade: #4854e0;
  --ion-color-tertiary-tint: #6370ff;

  /* Status colors for workouts */
  --ion-color-success: #2dd36f;
  --ion-color-success-rgb: 45, 211, 111;
  --ion-color-success-contrast: #ffffff;
  --ion-color-success-contrast-rgb: 255, 255, 255;
  --ion-color-success-shade: #28ba62;
  --ion-color-success-tint: #42d77d;

  --ion-color-warning: #ffc409;
  --ion-color-warning-rgb: 255, 196, 9;
  --ion-color-warning-contrast: #000000;
  --ion-color-warning-contrast-rgb: 0, 0, 0;
  --ion-color-warning-shade: #e0ac08;
  --ion-color-warning-tint: #ffca22;

  --ion-color-danger: #eb445a;
  --ion-color-danger-rgb: 235, 68, 90;
  --ion-color-danger-contrast: #ffffff;
  --ion-color-danger-contrast-rgb: 255, 255, 255;
  --ion-color-danger-shade: #cf3c4f;
  --ion-color-danger-tint: #ed576b;

  --ion-color-medium: #92949c;
  --ion-color-medium-rgb: 146, 148, 156;
  --ion-color-medium-contrast: #ffffff;
  --ion-color-medium-contrast-rgb: 255, 255, 255;
  --ion-color-medium-shade: #808289;
  --ion-color-medium-tint: #9d9fa6;

  --ion-color-light: #f4f5f8;
  --ion-color-light-rgb: 244, 245, 248;
  --ion-color-light-contrast: #000000;
  --ion-color-light-contrast-rgb: 0, 0, 0;
  --ion-color-light-shade: #d7d8da;
  --ion-color-light-tint: #f5f6f9;

  /* ===== FitOS Custom Colors ===== */
  --fit-workout-complete: var(--ion-color-success);
  --fit-workout-in-progress: var(--ion-color-warning);
  --fit-workout-skipped: var(--ion-color-medium);
  --fit-workout-scheduled: var(--ion-color-primary);
  
  /* Adherence-neutral colors (no red for "over target") */
  --fit-nutrition-on-target: var(--ion-color-success);
  --fit-nutrition-under: var(--ion-color-primary);
  --fit-nutrition-over: var(--ion-color-tertiary); /* NOT red/danger */
  
  /* Streak colors */
  --fit-streak-active: #ff9500;
  --fit-streak-frozen: var(--ion-color-medium);
  
  /* ===== Spacing ===== */
  --fit-spacing-xxs: 2px;
  --fit-spacing-xs: 4px;
  --fit-spacing-sm: 8px;
  --fit-spacing-md: 16px;
  --fit-spacing-lg: 24px;
  --fit-spacing-xl: 32px;
  --fit-spacing-xxl: 48px;
  
  /* ===== Typography ===== */
  --fit-font-size-xs: 12px;
  --fit-font-size-sm: 14px;
  --fit-font-size-md: 16px;
  --fit-font-size-lg: 18px;
  --fit-font-size-xl: 24px;
  --fit-font-size-xxl: 32px;
  
  /* ===== Border Radius ===== */
  --fit-radius-sm: 4px;
  --fit-radius-md: 8px;
  --fit-radius-lg: 12px;
  --fit-radius-xl: 16px;
  --fit-radius-round: 50%;
  
  /* ===== Shadows ===== */
  --fit-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --fit-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --fit-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* ===== Safe Areas ===== */
  --ion-safe-area-top: env(safe-area-inset-top);
  --ion-safe-area-bottom: env(safe-area-inset-bottom);
  --ion-safe-area-left: env(safe-area-inset-left);
  --ion-safe-area-right: env(safe-area-inset-right);
}
```

---

## Dark Mode Implementation

### System-Preference Dark Mode

```css
/* variables.scss - Automatic dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    /* Core Ionic dark colors */
    --ion-color-primary: #428cff;
    --ion-color-primary-rgb: 66, 140, 255;
    --ion-color-primary-contrast: #ffffff;
    --ion-color-primary-shade: #3a7be0;
    --ion-color-primary-tint: #5598ff;

    --ion-color-secondary: #50c8ff;
    --ion-color-secondary-rgb: 80, 200, 255;

    --ion-color-tertiary: #6a64ff;
    --ion-color-tertiary-rgb: 106, 100, 255;

    --ion-color-success: #2fdf75;
    --ion-color-warning: #ffd534;
    --ion-color-danger: #ff4961;

    /* Background colors */
    --ion-background-color: #121212;
    --ion-background-color-rgb: 18, 18, 18;
    
    --ion-text-color: #ffffff;
    --ion-text-color-rgb: 255, 255, 255;
    
    /* Step colors (for gradients and shades) */
    --ion-background-color-step-50: #1e1e1e;
    --ion-background-color-step-100: #2a2a2a;
    --ion-background-color-step-150: #363636;
    --ion-background-color-step-200: #414141;
    --ion-background-color-step-250: #4d4d4d;
    --ion-background-color-step-300: #595959;
    --ion-background-color-step-350: #656565;
    --ion-background-color-step-400: #717171;
    --ion-background-color-step-450: #7d7d7d;
    --ion-background-color-step-500: #898989;
    --ion-background-color-step-550: #949494;
    --ion-background-color-step-600: #a0a0a0;
    --ion-background-color-step-650: #acacac;
    --ion-background-color-step-700: #b8b8b8;
    --ion-background-color-step-750: #c4c4c4;
    --ion-background-color-step-800: #d0d0d0;
    --ion-background-color-step-850: #dbdbdb;
    --ion-background-color-step-900: #e7e7e7;
    --ion-background-color-step-950: #f3f3f3;

    --ion-text-color-step-50: #f3f3f3;
    --ion-text-color-step-100: #e7e7e7;
    --ion-text-color-step-150: #dbdbdb;
    --ion-text-color-step-200: #d0d0d0;
    --ion-text-color-step-250: #c4c4c4;
    --ion-text-color-step-300: #b8b8b8;
    --ion-text-color-step-350: #acacac;
    --ion-text-color-step-400: #a0a0a0;
    --ion-text-color-step-450: #949494;
    --ion-text-color-step-500: #898989;
    --ion-text-color-step-550: #7d7d7d;
    --ion-text-color-step-600: #717171;
    --ion-text-color-step-650: #656565;
    --ion-text-color-step-700: #595959;
    --ion-text-color-step-750: #4d4d4d;
    --ion-text-color-step-800: #414141;
    --ion-text-color-step-850: #363636;
    --ion-text-color-step-900: #2a2a2a;
    --ion-text-color-step-950: #1e1e1e;

    /* Component backgrounds */
    --ion-card-background: #1e1e1e;
    --ion-item-background: #1e1e1e;
    --ion-toolbar-background: #1f1f1f;
    --ion-tab-bar-background: #1f1f1f;
    --ion-modal-background: #121212;
    
    /* FitOS dark adjustments */
    --fit-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
    --fit-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
    --fit-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  }
}
```

### Manual Dark Mode Toggle

```css
/* Class-based dark mode for manual toggle */
body.dark {
  --ion-color-primary: #428cff;
  --ion-background-color: #121212;
  --ion-background-color-rgb: 18, 18, 18;
  --ion-text-color: #ffffff;
  --ion-text-color-rgb: 255, 255, 255;
  
  --ion-card-background: #1e1e1e;
  --ion-item-background: #1e1e1e;
  --ion-toolbar-background: #1f1f1f;
  
  /* ... same as media query dark mode ... */
}
```

---

## Theme Service

```typescript
// core/services/theme.service.ts
import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Preferences } from '@capacitor/preferences';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Capacitor } from '@capacitor/core';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  // Current mode setting (what user selected)
  mode = signal<ThemeMode>('system');
  
  // Actual dark mode state (resolved from mode + system preference)
  isDark = signal(false);
  
  // System preference
  private systemPrefersDark = signal(false);
  
  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }
  
  private async init() {
    // Load saved preference
    const { value } = await Preferences.get({ key: 'theme_mode' });
    if (value) {
      this.mode.set(value as ThemeMode);
    }
    
    // Get system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark.set(mediaQuery.matches);
    
    // Listen for system changes
    mediaQuery.addEventListener('change', (e) => {
      this.systemPrefersDark.set(e.matches);
      this.updateTheme();
    });
    
    // Initial theme application
    this.updateTheme();
    
    // React to mode changes
    effect(() => {
      const mode = this.mode();
      this.updateTheme();
      Preferences.set({ key: 'theme_mode', value: mode });
    });
  }
  
  private updateTheme() {
    let shouldBeDark: boolean;
    
    switch (this.mode()) {
      case 'dark':
        shouldBeDark = true;
        break;
      case 'light':
        shouldBeDark = false;
        break;
      case 'system':
      default:
        shouldBeDark = this.systemPrefersDark();
    }
    
    this.isDark.set(shouldBeDark);
    document.body.classList.toggle('dark', shouldBeDark);
    
    // Update native status bar
    this.updateStatusBar(shouldBeDark);
  }
  
  private async updateStatusBar(isDark: boolean) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({
          color: isDark ? '#121212' : '#ffffff'
        });
      }
    } catch (error) {
      console.warn('StatusBar not available:', error);
    }
  }
  
  // Public methods
  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }
  
  toggleDarkMode() {
    if (this.mode() === 'system') {
      this.mode.set(this.isDark() ? 'light' : 'dark');
    } else {
      this.mode.set(this.isDark() ? 'light' : 'dark');
    }
  }
}
```

---

## Platform-Specific Styling

### iOS vs Material Design

```css
/* iOS-specific styles */
.ios {
  /* iOS uses San Francisco font */
  --ion-font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif;
  
  /* iOS toolbar styling */
  ion-toolbar {
    --padding-top: 12px;
    --padding-bottom: 12px;
  }
  
  /* iOS-style large titles */
  ion-title.ios-large {
    font-size: 34px;
    font-weight: 700;
  }
  
  /* iOS segment control */
  ion-segment {
    --background: var(--ion-toolbar-background);
  }
  
  /* iOS button styling */
  ion-button {
    --border-radius: 10px;
    text-transform: none;
    font-weight: 600;
  }
}

/* Material Design (Android) styles */
.md {
  /* Material uses Roboto */
  --ion-font-family: 'Roboto', 'Helvetica Neue', sans-serif;
  
  /* Material toolbar */
  ion-toolbar {
    --padding-top: 8px;
    --padding-bottom: 8px;
  }
  
  /* Material button styling */
  ion-button {
    --border-radius: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  /* Material FAB */
  ion-fab-button {
    --box-shadow: 0 3px 5px -1px rgba(0,0,0,.2), 
                  0 6px 10px 0 rgba(0,0,0,.14), 
                  0 1px 18px 0 rgba(0,0,0,.12);
  }
}
```

### Responsive Breakpoints

```css
/* Mobile-first approach */
.fit-container {
  padding: var(--fit-spacing-md);
  max-width: 100%;
}

/* Tablet (768px+) */
@media (min-width: 768px) {
  .fit-container {
    padding: var(--fit-spacing-lg);
    max-width: 720px;
    margin: 0 auto;
  }
  
  /* Two-column layout on tablet */
  .fit-dashboard-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: var(--fit-spacing-md);
  }
}

/* Desktop (1024px+) */
@media (min-width: 1024px) {
  .fit-container {
    max-width: 960px;
  }
  
  .fit-dashboard-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Large desktop (1200px+) */
@media (min-width: 1200px) {
  .fit-container {
    max-width: 1140px;
  }
  
  .fit-dashboard-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
```

---

## Component-Level Theming

### Workout Card Theming

```css
/* workout-card.component.scss */
:host {
  display: block;
}

.workout-card {
  --background: var(--ion-card-background);
  --border-radius: var(--fit-radius-lg);
  
  border-left: 4px solid var(--workout-status-color, var(--ion-color-primary));
  
  &.scheduled {
    --workout-status-color: var(--fit-workout-scheduled);
  }
  
  &.in-progress {
    --workout-status-color: var(--fit-workout-in-progress);
    animation: pulse 2s ease-in-out infinite;
  }
  
  &.completed {
    --workout-status-color: var(--fit-workout-complete);
    opacity: 0.8;
  }
  
  &.skipped {
    --workout-status-color: var(--fit-workout-skipped);
    opacity: 0.6;
  }
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(var(--ion-color-warning-rgb), 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(var(--ion-color-warning-rgb), 0); }
}

/* Dark mode adjustments */
:host-context(body.dark) {
  .workout-card {
    --background: var(--ion-background-color-step-50);
  }
}
```

### Progress Bar Theming

```css
/* Custom progress bar for nutrition (adherence-neutral) */
.nutrition-progress {
  --progress-background: var(--ion-background-color-step-100);
  --buffer-background: var(--ion-background-color-step-200);
  
  /* Never use red/danger for "over" */
  &.under-target {
    --progress-background: var(--fit-nutrition-under);
  }
  
  &.on-target {
    --progress-background: var(--fit-nutrition-on-target);
  }
  
  &.over-target {
    --progress-background: var(--fit-nutrition-over); /* Purple, not red */
  }
}
```

---

## Theme Settings Component

```typescript
@Component({
  selector: 'fit-theme-settings',
  template: `
    <ion-list>
      <ion-list-header>
        <ion-label>Appearance</ion-label>
      </ion-list-header>
      
      <ion-item>
        <ion-icon name="sunny-outline" slot="start" />
        <ion-label>Theme</ion-label>
        <ion-select 
          [value]="themeService.mode()"
          (ionChange)="themeService.setMode($event.detail.value)"
          interface="popover">
          <ion-select-option value="system">System</ion-select-option>
          <ion-select-option value="light">Light</ion-select-option>
          <ion-select-option value="dark">Dark</ion-select-option>
        </ion-select>
      </ion-item>
      
      <ion-item>
        <ion-icon [name]="themeService.isDark() ? 'moon' : 'sunny'" slot="start" />
        <ion-label>Dark Mode</ion-label>
        <ion-toggle 
          [checked]="themeService.isDark()"
          (ionChange)="themeService.toggleDarkMode()" />
      </ion-item>
    </ion-list>
  `
})
export class ThemeSettingsComponent {
  themeService = inject(ThemeService);
}
```

---

## Safe Area Handling

```css
/* Handle notches and home indicators */
ion-content {
  --padding-top: var(--ion-safe-area-top);
  --padding-bottom: var(--ion-safe-area-bottom);
}

ion-header ion-toolbar:first-of-type {
  padding-top: var(--ion-safe-area-top);
}

ion-footer ion-toolbar:last-of-type {
  padding-bottom: var(--ion-safe-area-bottom);
}

ion-tab-bar {
  padding-bottom: var(--ion-safe-area-bottom);
}

/* Full-screen modals */
ion-modal {
  --ion-safe-area-top: env(safe-area-inset-top);
  --ion-safe-area-bottom: env(safe-area-inset-bottom);
}

/* Landscape handling */
@media (orientation: landscape) {
  ion-content {
    --padding-left: var(--ion-safe-area-left);
    --padding-right: var(--ion-safe-area-right);
  }
}
```

---

## Reduced Motion Support

```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  
  /* Disable Ionic animations */
  ion-modal,
  ion-popover,
  ion-action-sheet,
  ion-alert,
  ion-toast,
  ion-loading {
    --transition-duration: 0ms;
  }
  
  /* Disable page transitions */
  ion-router-outlet {
    --ion-page-transition: none;
  }
}
```
