# FitOS Theming & Dark Mode Guide v2.0

**Updated:** January 2026  
**Design Philosophy:** Dark-first, WHOOP/MacroFactor inspired

---

## Core Design Principles

1. **Dark Mode Primary** - Default to dark for gym environments
2. **Adherence-Neutral** - Never use red for "over target" in nutrition
3. **High Contrast** - 15:1+ for metrics, 7:1+ for body text
4. **Glanceable** - Key info visible in <2 seconds

---

## CSS Custom Properties

### Dark Mode (Default)

```scss
// theme/variables.scss
:root {
  // ===== Background Hierarchy =====
  // NOT pure black - reduces eye strain on OLED
  --ion-background-color: #0D0D0D;
  --ion-background-color-rgb: 13, 13, 13;
  
  --fitos-bg-primary: #0D0D0D;
  --fitos-bg-secondary: #1A1A1A;    // Cards, elevated
  --fitos-bg-tertiary: #262626;     // Inputs, interactive
  --fitos-bg-elevated: #333333;     // Modals, popovers

  // ===== Text Hierarchy =====
  --ion-text-color: #F5F5F5;
  --ion-text-color-rgb: 245, 245, 245;
  
  --fitos-text-primary: #F5F5F5;    // 15.8:1 contrast
  --fitos-text-secondary: #A3A3A3;  // 7:1 contrast
  --fitos-text-tertiary: #737373;   // 4.5:1 contrast
  --fitos-text-disabled: #525252;

  // ===== Brand Accent =====
  --ion-color-primary: #10B981;
  --ion-color-primary-rgb: 16, 185, 129;
  --ion-color-primary-contrast: #FFFFFF;
  --ion-color-primary-contrast-rgb: 255, 255, 255;
  --ion-color-primary-shade: #0E9F6E;
  --ion-color-primary-tint: #34D399;
  
  --fitos-accent-primary: #10B981;
  --fitos-accent-secondary: #8B5CF6;
  --fitos-accent-glow: rgba(16, 185, 129, 0.3);

  // ===== Status Colors =====
  --ion-color-success: #10B981;
  --ion-color-success-rgb: 16, 185, 129;
  
  --ion-color-warning: #F59E0B;
  --ion-color-warning-rgb: 245, 158, 11;
  
  --ion-color-danger: #EF4444;
  --ion-color-danger-rgb: 239, 68, 68;
  
  --ion-color-medium: #737373;
  --ion-color-medium-rgb: 115, 115, 115;

  // ===== Nutrition (Adherence-Neutral) =====
  --fitos-nutrition-calories: #6366F1;  // Indigo
  --fitos-nutrition-protein: #10B981;   // Green
  --fitos-nutrition-carbs: #F59E0B;     // Amber
  --fitos-nutrition-fat: #EC4899;       // Pink
  --fitos-nutrition-over: #8B5CF6;      // Purple (NOT red!)

  // ===== Component Backgrounds =====
  --ion-card-background: var(--fitos-bg-secondary);
  --ion-item-background: var(--fitos-bg-secondary);
  --ion-toolbar-background: var(--fitos-bg-secondary);
  --ion-tab-bar-background: var(--fitos-bg-secondary);

  // ===== Borders =====
  --fitos-border-subtle: rgba(255, 255, 255, 0.08);
  --fitos-border-default: rgba(255, 255, 255, 0.12);
  --fitos-border-strong: rgba(255, 255, 255, 0.2);

  // ===== Step Colors (Ionic internal) =====
  --ion-background-color-step-50: #1A1A1A;
  --ion-background-color-step-100: #262626;
  --ion-background-color-step-150: #333333;
  --ion-background-color-step-200: #404040;
  --ion-background-color-step-250: #4D4D4D;
  --ion-background-color-step-300: #595959;
  --ion-background-color-step-350: #666666;
  --ion-background-color-step-400: #737373;
  --ion-background-color-step-450: #808080;
  --ion-background-color-step-500: #8C8C8C;

  // ===== Spacing =====
  --fitos-space-1: 4px;
  --fitos-space-2: 8px;
  --fitos-space-3: 12px;
  --fitos-space-4: 16px;
  --fitos-space-6: 24px;
  --fitos-space-8: 32px;

  // ===== Border Radius =====
  --fitos-radius-sm: 4px;
  --fitos-radius-md: 8px;
  --fitos-radius-lg: 12px;
  --fitos-radius-xl: 16px;
  --fitos-radius-full: 9999px;

  // ===== Typography =====
  --ion-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --fitos-font-mono: 'SF Mono', 'Roboto Mono', Consolas, monospace;
}
```

### Light Mode Override

```scss
// Light mode class (toggle via ThemeService)
body.light {
  --ion-background-color: #FFFFFF;
  --ion-background-color-rgb: 255, 255, 255;
  
  --fitos-bg-primary: #FFFFFF;
  --fitos-bg-secondary: #F9FAFB;
  --fitos-bg-tertiary: #F3F4F6;
  --fitos-bg-elevated: #FFFFFF;

  --ion-text-color: #111827;
  --ion-text-color-rgb: 17, 24, 39;
  
  --fitos-text-primary: #111827;
  --fitos-text-secondary: #4B5563;
  --fitos-text-tertiary: #9CA3AF;

  --ion-color-primary: #059669;
  --ion-color-primary-rgb: 5, 150, 105;

  --ion-card-background: var(--fitos-bg-secondary);
  --ion-item-background: var(--fitos-bg-secondary);
  --ion-toolbar-background: var(--fitos-bg-primary);
  --ion-tab-bar-background: var(--fitos-bg-primary);

  --fitos-border-subtle: rgba(0, 0, 0, 0.05);
  --fitos-border-default: rgba(0, 0, 0, 0.1);
  --fitos-border-strong: rgba(0, 0, 0, 0.2);

  // Step colors for light mode
  --ion-background-color-step-50: #F9FAFB;
  --ion-background-color-step-100: #F3F4F6;
  --ion-background-color-step-150: #E5E7EB;
  --ion-background-color-step-200: #D1D5DB;
  --ion-background-color-step-250: #9CA3AF;
  --ion-background-color-step-300: #6B7280;
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

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  mode = signal<ThemeMode>('dark'); // Default to dark
  isDarkMode = signal(true);
  
  private systemPrefersDark = signal(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private async init() {
    // Load saved preference (default: dark)
    const { value } = await Preferences.get({ key: 'theme_mode' });
    this.mode.set((value as ThemeMode) || 'dark');
    
    // System preference detection
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.systemPrefersDark.set(mediaQuery.matches);
    mediaQuery.addEventListener('change', (e) => {
      this.systemPrefersDark.set(e.matches);
      this.applyTheme();
    });

    this.applyTheme();

    effect(() => {
      this.applyTheme();
      Preferences.set({ key: 'theme_mode', value: this.mode() });
    });
  }

  private applyTheme() {
    const shouldBeDark = this.mode() === 'dark' || 
      (this.mode() === 'system' && this.systemPrefersDark());
    
    this.isDarkMode.set(shouldBeDark);
    document.body.classList.toggle('light', !shouldBeDark);
    document.body.classList.toggle('dark', shouldBeDark);
    
    this.updateStatusBar(shouldBeDark);
  }

  private async updateStatusBar(isDark: boolean) {
    if (!Capacitor.isNativePlatform()) return;
    
    try {
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0D0D0D' : '#FFFFFF'
        });
      }
    } catch (e) {
      console.warn('StatusBar not available:', e);
    }
  }

  setMode(mode: ThemeMode) {
    this.mode.set(mode);
  }

  setDarkMode(isDark: boolean) {
    this.mode.set(isDark ? 'dark' : 'light');
  }

  toggle() {
    this.mode.set(this.isDarkMode() ? 'light' : 'dark');
  }
}
```

---

## Component Patterns

### Card with Glow Effect

```scss
.fitos-card {
  background: var(--fitos-bg-secondary);
  border-radius: var(--fitos-radius-lg);
  border: 1px solid var(--fitos-border-subtle);
  padding: var(--fitos-space-4);
  transition: border-color 0.2s, box-shadow 0.2s;

  &:hover, &:focus {
    border-color: var(--fitos-border-default);
  }

  &.active, &.selected {
    border-color: var(--fitos-accent-primary);
    box-shadow: 0 0 20px var(--fitos-accent-glow);
  }
}
```

### Metric Display

```scss
.fitos-metric {
  font-family: var(--fitos-font-mono);
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
  color: var(--fitos-text-primary);
  
  &.accent {
    color: var(--fitos-accent-primary);
    text-shadow: 0 0 20px var(--fitos-accent-glow);
  }
}
```

### Nutrition Progress (Adherence-Neutral)

```scss
.nutrition-progress {
  height: 8px;
  background: var(--fitos-bg-tertiary);
  border-radius: var(--fitos-radius-full);
  overflow: hidden;

  .fill {
    height: 100%;
    border-radius: var(--fitos-radius-full);
    transition: width 0.3s ease;

    &.calories { background: var(--fitos-nutrition-calories); }
    &.protein { background: var(--fitos-nutrition-protein); }
    &.carbs { background: var(--fitos-nutrition-carbs); }
    &.fat { background: var(--fitos-nutrition-fat); }
    
    // NEVER red for over - use purple
    &.over { background: var(--fitos-nutrition-over); }
  }
}
```

---

## Animation Guidelines

### Performance Rules
- Only animate `transform` and `opacity`
- Keep durations under 300ms for feedback
- Use `will-change` sparingly
- Always provide `prefers-reduced-motion` fallback

### Timing Functions

```scss
--fitos-ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--fitos-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);

--fitos-duration-fast: 150ms;
--fitos-duration-normal: 250ms;
--fitos-duration-slow: 350ms;
```

### Reduced Motion Support

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Safe Area Handling

```scss
ion-content {
  --padding-top: var(--ion-safe-area-top);
  --padding-bottom: var(--ion-safe-area-bottom);
}

ion-header ion-toolbar:first-of-type {
  padding-top: var(--ion-safe-area-top);
}

ion-tab-bar {
  padding-bottom: var(--ion-safe-area-bottom);
}
```

---

## Implementation Checklist

- [ ] Update variables.scss with dark-first colors
- [ ] Add `<meta name="color-scheme" content="dark light">` to index.html
- [ ] Update ThemeService to default to dark
- [ ] Replace all nutrition red colors with purple
- [ ] Audit text contrast (7:1+ for body, 15:1+ for metrics)
- [ ] Add glow effects to active states
- [ ] Test on OLED devices
- [ ] Add reduced motion support
