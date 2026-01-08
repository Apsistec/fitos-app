# FitOS Design System

**Version 2.0** | Based on competitive analysis of 16 fitness platforms

---

## Design Philosophy

FitOS follows three core principles derived from market research:

1. **Dark-First, Glanceable Design** - WHOOP's "data serving design, not designer-serving design"
2. **Adherence-Neutral Psychology** - MacroFactor's shame-free color philosophy
3. **Friction-Minimized Interaction** - Under 10 seconds for any data entry

---

## Color System

### Dark Mode (Primary)

```scss
// Core backgrounds - NOT pure black (reduces eye strain on OLED)
--fitos-bg-primary: #0D0D0D;        // Main background
--fitos-bg-secondary: #1A1A1A;      // Cards, elevated surfaces
--fitos-bg-tertiary: #262626;       // Inputs, interactive elements
--fitos-bg-elevated: #333333;       // Modals, popovers

// Text hierarchy
--fitos-text-primary: #F5F5F5;      // Headlines, primary content (15.8:1 contrast)
--fitos-text-secondary: #A3A3A3;    // Body text, descriptions (7:1 contrast)
--fitos-text-tertiary: #737373;     // Metadata, timestamps (4.5:1 contrast)
--fitos-text-disabled: #525252;     // Disabled states

// Brand accent - Energetic teal/green (WHOOP-inspired)
--fitos-accent-primary: #10B981;    // Primary actions, success
--fitos-accent-primary-rgb: 16, 185, 129;
--fitos-accent-glow: rgba(16, 185, 129, 0.3); // For glow effects

// Secondary accent - Purple/violet for variety
--fitos-accent-secondary: #8B5CF6;
--fitos-accent-secondary-rgb: 139, 92, 246;

// Status colors (adherence-neutral - NO RED for "over target")
--fitos-status-success: #10B981;    // Completed, on-track
--fitos-status-info: #3B82F6;       // Information, tips
--fitos-status-warning: #F59E0B;    // Needs attention
--fitos-status-error: #EF4444;      // Errors only, never for nutrition "over"

// Nutrition colors (adherence-neutral palette)
--fitos-nutrition-calories: #6366F1;  // Indigo (neutral)
--fitos-nutrition-protein: #10B981;   // Green
--fitos-nutrition-carbs: #F59E0B;     // Amber
--fitos-nutrition-fat: #EC4899;       // Pink
--fitos-nutrition-over: #8B5CF6;      // Purple (NOT red)

// Borders and dividers
--fitos-border-subtle: rgba(255, 255, 255, 0.08);
--fitos-border-default: rgba(255, 255, 255, 0.12);
--fitos-border-strong: rgba(255, 255, 255, 0.2);
```

### Light Mode (Secondary)

```scss
// Core backgrounds
--fitos-bg-primary: #FFFFFF;
--fitos-bg-secondary: #F9FAFB;
--fitos-bg-tertiary: #F3F4F6;
--fitos-bg-elevated: #FFFFFF;

// Text hierarchy
--fitos-text-primary: #111827;
--fitos-text-secondary: #4B5563;
--fitos-text-tertiary: #9CA3AF;
--fitos-text-disabled: #D1D5DB;

// Borders
--fitos-border-subtle: rgba(0, 0, 0, 0.05);
--fitos-border-default: rgba(0, 0, 0, 0.1);
--fitos-border-strong: rgba(0, 0, 0, 0.2);
```

### Ionic Variable Mapping

```scss
// variables.scss - Dark mode primary
:root {
  --ion-background-color: var(--fitos-bg-primary);
  --ion-background-color-rgb: 13, 13, 13;
  
  --ion-text-color: var(--fitos-text-primary);
  --ion-text-color-rgb: 245, 245, 245;
  
  --ion-color-primary: var(--fitos-accent-primary);
  --ion-color-primary-rgb: 16, 185, 129;
  --ion-color-primary-contrast: #FFFFFF;
  --ion-color-primary-shade: #0E9F6E;
  --ion-color-primary-tint: #34D399;
  
  --ion-card-background: var(--fitos-bg-secondary);
  --ion-item-background: var(--fitos-bg-secondary);
  --ion-toolbar-background: var(--fitos-bg-secondary);
  --ion-tab-bar-background: var(--fitos-bg-secondary);
  
  // Step colors for gradients (dark mode)
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
}
```

---

## Typography

### Font Stack

```scss
// Primary font - System fonts for performance, Inter as fallback
--fitos-font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;

// Monospace for numbers/data
--fitos-font-mono: 'SF Mono', 'Roboto Mono', Consolas, monospace;
```

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `--fitos-text-xs` | 12px | 400 | 1.4 | Metadata, badges |
| `--fitos-text-sm` | 14px | 400 | 1.5 | Secondary text, labels |
| `--fitos-text-base` | 16px | 400 | 1.6 | Body text |
| `--fitos-text-lg` | 18px | 500 | 1.5 | Emphasized text |
| `--fitos-text-xl` | 20px | 600 | 1.4 | Section headers |
| `--fitos-text-2xl` | 24px | 700 | 1.3 | Page titles |
| `--fitos-text-3xl` | 30px | 700 | 1.2 | Hero numbers |
| `--fitos-text-4xl` | 36px | 800 | 1.1 | Dashboard metrics |

### Implementation

```scss
.fitos-heading-1 {
  font-size: var(--fitos-text-2xl);
  font-weight: 700;
  line-height: 1.3;
  color: var(--fitos-text-primary);
  letter-spacing: -0.02em;
}

.fitos-heading-2 {
  font-size: var(--fitos-text-xl);
  font-weight: 600;
  line-height: 1.4;
  color: var(--fitos-text-primary);
}

.fitos-body {
  font-size: var(--fitos-text-base);
  font-weight: 400;
  line-height: 1.6;
  color: var(--fitos-text-secondary);
}

.fitos-metric {
  font-family: var(--fitos-font-mono);
  font-size: var(--fitos-text-4xl);
  font-weight: 800;
  line-height: 1;
  color: var(--fitos-text-primary);
}
```

---

## Spacing System

Based on 4px base unit:

```scss
--fitos-space-0: 0;
--fitos-space-1: 4px;
--fitos-space-2: 8px;
--fitos-space-3: 12px;
--fitos-space-4: 16px;
--fitos-space-5: 20px;
--fitos-space-6: 24px;
--fitos-space-8: 32px;
--fitos-space-10: 40px;
--fitos-space-12: 48px;
--fitos-space-16: 64px;
```

---

## Border Radius

```scss
--fitos-radius-sm: 4px;    // Badges, small elements
--fitos-radius-md: 8px;    // Buttons, inputs
--fitos-radius-lg: 12px;   // Cards
--fitos-radius-xl: 16px;   // Large cards, modals
--fitos-radius-2xl: 24px;  // Hero elements
--fitos-radius-full: 9999px; // Pills, avatars
```

---

## Shadows & Elevation

Dark mode uses lighter overlays instead of shadows:

```scss
// Light mode shadows
--fitos-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--fitos-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
--fitos-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--fitos-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.15);

// Dark mode - use elevation via background color
// Higher elevation = lighter background
.fitos-elevation-1 { background: var(--fitos-bg-secondary); }
.fitos-elevation-2 { background: var(--fitos-bg-tertiary); }
.fitos-elevation-3 { background: var(--fitos-bg-elevated); }

// Glow effects for dark mode
--fitos-glow-primary: 0 0 20px rgba(16, 185, 129, 0.3);
--fitos-glow-accent: 0 0 20px rgba(139, 92, 246, 0.3);
```

---

## Component Patterns

### Card Component

```scss
.fitos-card {
  background: var(--fitos-bg-secondary);
  border-radius: var(--fitos-radius-lg);
  border: 1px solid var(--fitos-border-subtle);
  padding: var(--fitos-space-4);
  
  // Hover state with subtle glow
  &:hover {
    border-color: var(--fitos-border-default);
  }
  
  // Active/selected state
  &.active {
    border-color: var(--fitos-accent-primary);
    box-shadow: var(--fitos-glow-primary);
  }
}

// Hero card variant (larger, more prominent)
.fitos-card-hero {
  @extend .fitos-card;
  padding: var(--fitos-space-6);
  border-radius: var(--fitos-radius-xl);
  background: linear-gradient(
    135deg,
    var(--fitos-bg-secondary) 0%,
    var(--fitos-bg-tertiary) 100%
  );
}
```

### Stat Card (Dashboard)

```scss
.fitos-stat-card {
  background: var(--fitos-bg-secondary);
  border-radius: var(--fitos-radius-lg);
  padding: var(--fitos-space-4);
  display: flex;
  flex-direction: column;
  gap: var(--fitos-space-2);
  
  .stat-value {
    font-family: var(--fitos-font-mono);
    font-size: var(--fitos-text-3xl);
    font-weight: 800;
    color: var(--fitos-text-primary);
  }
  
  .stat-label {
    font-size: var(--fitos-text-sm);
    color: var(--fitos-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  
  .stat-change {
    font-size: var(--fitos-text-xs);
    display: flex;
    align-items: center;
    gap: var(--fitos-space-1);
    
    &.positive { color: var(--fitos-status-success); }
    &.negative { color: var(--fitos-status-warning); }
  }
}
```

### Button Variants

```scss
// Primary button
.fitos-btn-primary {
  background: var(--fitos-accent-primary);
  color: #FFFFFF;
  font-weight: 600;
  padding: var(--fitos-space-3) var(--fitos-space-6);
  border-radius: var(--fitos-radius-md);
  border: none;
  
  &:hover {
    background: var(--fitos-accent-primary-shade);
  }
  
  &:active {
    transform: scale(0.98);
  }
}

// Secondary button
.fitos-btn-secondary {
  background: transparent;
  color: var(--fitos-accent-primary);
  border: 1px solid var(--fitos-accent-primary);
  font-weight: 600;
  padding: var(--fitos-space-3) var(--fitos-space-6);
  border-radius: var(--fitos-radius-md);
}

// Ghost button
.fitos-btn-ghost {
  background: transparent;
  color: var(--fitos-text-secondary);
  border: none;
  padding: var(--fitos-space-2) var(--fitos-space-4);
  
  &:hover {
    background: var(--fitos-bg-tertiary);
    color: var(--fitos-text-primary);
  }
}
```

### Progress Bar (Adherence-Neutral)

```scss
.fitos-progress {
  height: 8px;
  background: var(--fitos-bg-tertiary);
  border-radius: var(--fitos-radius-full);
  overflow: hidden;
  
  .progress-fill {
    height: 100%;
    border-radius: var(--fitos-radius-full);
    transition: width 0.3s ease;
    
    // Never use red for "over target"
    &.calories { background: var(--fitos-nutrition-calories); }
    &.protein { background: var(--fitos-nutrition-protein); }
    &.carbs { background: var(--fitos-nutrition-carbs); }
    &.fat { background: var(--fitos-nutrition-fat); }
    &.over { background: var(--fitos-nutrition-over); } // Purple, not red
  }
}
```

---

## Animation Guidelines

### Timing Functions

```scss
--fitos-ease-default: cubic-bezier(0.4, 0, 0.2, 1);
--fitos-ease-in: cubic-bezier(0.4, 0, 1, 1);
--fitos-ease-out: cubic-bezier(0, 0, 0.2, 1);
--fitos-ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);
```

### Duration Standards

```scss
--fitos-duration-fast: 150ms;    // Micro-interactions, hover states
--fitos-duration-normal: 250ms;  // Most transitions
--fitos-duration-slow: 350ms;    // Page transitions, modals
--fitos-duration-slower: 500ms;  // Celebration animations
```

### Performance Rules

1. **Only animate `transform` and `opacity`** - Hardware accelerated, 60fps capable
2. Use `will-change` sparingly for known animations
3. Provide `prefers-reduced-motion` fallbacks
4. Keep transitions under 300ms for feedback, under 500ms for pages

### Reduced Motion Support

```scss
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Iconography

### Icon Guidelines

- Use outline icons for navigation, filled for selected states
- 24px default size, 20px for compact, 32px for features
- Icons should have 2px stroke weight
- Primary icons: Ionicons (already in Ionic)

### Custom Icon Colors

```scss
.fitos-icon {
  color: var(--fitos-text-tertiary);
  
  &.active { color: var(--fitos-accent-primary); }
  &.success { color: var(--fitos-status-success); }
  &.warning { color: var(--fitos-status-warning); }
  &.error { color: var(--fitos-status-error); }
}
```

---

## Responsive Breakpoints

```scss
// Mobile-first approach
$breakpoints: (
  'sm': 576px,   // Large phones
  'md': 768px,   // Tablets
  'lg': 1024px,  // Small desktops
  'xl': 1280px,  // Large desktops
  '2xl': 1536px  // Extra large
);

// Mixins
@mixin sm { @media (min-width: 576px) { @content; } }
@mixin md { @media (min-width: 768px) { @content; } }
@mixin lg { @media (min-width: 1024px) { @content; } }
@mixin xl { @media (min-width: 1280px) { @content; } }
```

---

## Accessibility Requirements

### Contrast Ratios (WCAG AA)

| Element | Minimum Ratio | FitOS Target |
|---------|---------------|--------------|
| Body text | 4.5:1 | 7:1+ |
| Large text (18px+) | 3:1 | 4.5:1+ |
| Interactive elements | 3:1 | 4.5:1+ |
| Gym environment (bright) | - | 15:1+ for metrics |

### Touch Targets

- Minimum: 44x44px (iOS HIG, WCAG)
- FitOS standard: 48px height minimum for buttons
- Spacing between targets: 8px minimum

### Focus States

```scss
.fitos-focus-visible {
  &:focus-visible {
    outline: 2px solid var(--fitos-accent-primary);
    outline-offset: 2px;
  }
}
```

---

## Implementation Checklist

- [ ] Update `variables.scss` with new color system
- [ ] Create `_design-tokens.scss` partial with all tokens
- [ ] Update all cards to use `.fitos-card` pattern
- [ ] Implement dark mode as default
- [ ] Add light mode toggle support
- [ ] Audit all text for contrast compliance
- [ ] Replace red "over target" colors with purple
- [ ] Add reduced motion media queries
- [ ] Update button styles to new variants
- [ ] Implement glow effects for interactive states
