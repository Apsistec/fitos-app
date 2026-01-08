# Settings & Profile UX Design Guide

**Last Updated**: January 2026
**Status**: Active Implementation
**Based On**: Industry research of top 8 fitness apps

## Executive Summary

This document outlines the UX/UI design standards for FitOS Settings and Profile pages based on comprehensive research of industry-leading fitness coaching apps: Trainerize, MyFitnessPal, Future, TrueCoach, Fitbod, Strong, Nike Training Club, and Apple Fitness+.

## Key Principles

1. **Profile = Identity & Progress** (motivational, social, stats)
2. **Settings = System Configuration** (technical, privacy, preferences)
3. **WCAG AA Compliance** for text contrast
4. **Progressive Disclosure** for complex options
5. **Contextual Placement** for frequent actions

---

## Information Architecture

### Option A: Separate Profile Tab (Recommended)

**Main Navigation Tabs:**
```
├─ Dashboard
├─ Workouts
├─ Nutrition
├─ Profile ⭐ NEW
└─ Settings
```

#### Profile Page Structure

```
Profile
├─ Header Section
│  ├─ Large profile photo (120px, editable)
│  ├─ Full name (editable inline or via button)
│  ├─ Email (display only)
│  ├─ Member since date
│  └─ Bio (for clients)
│
├─ Quick Actions (Prominent Buttons)
│  ├─ Edit Profile →
│  ├─ Change Password (moved from Privacy)
│  └─ Manage Subscription (clients only)
│
├─ This Week Stats (Card)
│  ├─ Workouts completed: X
│  ├─ Days logged: Y
│  ├─ Streak: Z days 🔥
│  └─ Mini activity chart
│
├─ Lifetime Stats (Card)
│  ├─ Total workouts
│  ├─ Total volume lifted
│  ├─ Longest streak
│  └─ Favorite exercises
│
├─ Achievements (Card)
│  ├─ Recent badges (3-5 displayed)
│  ├─ Progress: "12 of 25 unlocked"
│  └─ View All Achievements →
│
├─ Personal Records (Card)
│  ├─ Top 5 PRs with icons
│  └─ View All PRs →
│
├─ Connected Services (Card)
│  ├─ Wearable devices (status indicators)
│  └─ Manage Devices →
│
└─ Footer
   └─ Go to Settings → (link)
```

#### Settings Page Structure

```
Settings
│
├─ PREFERENCES
│  ├─ Units (Imperial/Metric) - inline toggle
│  ├─ Timezone - picker
│  └─ Dark Mode - toggle switch
│
├─ NOTIFICATIONS
│  └─ Notification Preferences → (sub-page)
│
├─ INTEGRATIONS
│  └─ Wearable Devices → (sub-page)
│
├─ PAYMENTS (Trainers Only)
│  ├─ Stripe Connect Status
│  ├─ Pricing Tiers →
│  └─ Payment History →
│
├─ PRIVACY & SECURITY
│  ├─ Privacy Settings →
│  ├─ Active Sessions
│  ├─ Download My Data
│  └─ Delete Account (danger zone)
│
├─ SUPPORT & LEGAL
│  ├─ Help & Support →
│  ├─ Terms of Service →
│  └─ Privacy Policy →
│
└─ ACCOUNT
   ├─ Sign Out (destructive button)
   └─ Version: 0.1.0 (muted text)
```

---

## Design System

### Text Contrast Standards (WCAG AA Compliant)

| Element | Color Variable | Contrast Ratio | Usage |
|---------|---------------|----------------|-------|
| **Page Titles** | `--ion-color-dark` | 12:1+ | "Settings", "Profile" |
| **Section Headers** | `--ion-color-dark` | 12:1+ | "Preferences", "Account" |
| **Body Text** | `--ion-color-dark` | 7:1+ | Paragraphs, list items, descriptions |
| **Secondary Text** | `rgba(0,0,0,0.7)` light<br>`rgba(255,255,255,0.7)` dark | 4.5:1+ | Hints, supplementary info |
| **Tertiary/Metadata** | `--ion-color-medium` | 3:1+ | "Last updated", version numbers |
| **Disabled** | `--ion-color-medium` | 3:1+ | Disabled buttons, inactive items |

**Custom CSS Variables:**

```scss
:root {
  // Primary text (body copy)
  --fitos-text-primary: var(--ion-color-dark);

  // Secondary text (descriptions, labels)
  --fitos-text-secondary: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.7);

  // Tertiary text (timestamps, metadata)
  --fitos-text-tertiary: var(--ion-color-medium);
}

// Dark mode overrides
@media (prefers-color-scheme: dark) {
  :root {
    --fitos-text-primary: rgba(255, 255, 255, 0.95);
    --fitos-text-secondary: rgba(255, 255, 255, 0.7);
    --fitos-text-tertiary: var(--ion-color-medium);
  }
}
```

### Typography Scale

| Element | Font Size | Line Height | Weight | Usage |
|---------|-----------|-------------|--------|-------|
| **Page Title** | 28px | 1.2 | 700 | Main page headers |
| **Section Header** | 18px (1.125rem) | 1.3 | 600 | Section dividers |
| **List Item Title** | 16px (1rem) | 1.4 | 500 | Primary list text |
| **List Item Subtitle** | 14px (0.875rem) | 1.5 | 400 | Secondary list text |
| **Body Text** | 16px (1rem) | 1.7 | 400 | Paragraphs, legal content |
| **Caption** | 12px (0.75rem) | 1.4 | 400 | Metadata, footnotes |

### Spacing System

| Element | Top | Bottom | Horizontal |
|---------|-----|--------|------------|
| **Section Header** | 24px | 12px | 16px |
| **List Group** | 16px | 16px | 0 |
| **Cards** | 16px | 16px | 16px |
| **Page Padding** | 0 | 24px | 0 |
| **Between Sections** | 24px | - | - |

### Component Patterns

#### Section Header with Icon

```html
<div class="section-header">
  <ion-icon name="options-outline"></ion-icon>
  <h2>Preferences</h2>
</div>
```

```scss
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px 12px;

  ion-icon {
    font-size: 24px;
    color: var(--ion-color-primary);
  }

  h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--ion-color-dark);
  }
}
```

#### Settings List Item

```html
<ion-item button detail="true" [routerLink]="['/tabs/settings/notifications']">
  <ion-icon name="notifications-outline" slot="start" color="primary"></ion-icon>
  <ion-label>
    <h3>Notifications</h3>
    <p>Push and email preferences</p>
  </ion-label>
</ion-item>
```

```scss
ion-item {
  --padding-start: 16px;
  --padding-end: 16px;

  ion-icon[slot="start"] {
    margin-right: 16px;
    font-size: 24px;
  }

  h3 {
    font-size: 1rem;
    font-weight: 500;
    color: var(--fitos-text-primary);
    margin: 0 0 4px 0;
  }

  p {
    font-size: 0.875rem;
    color: var(--fitos-text-secondary);
    margin: 0;
  }
}
```

#### Stat Card

```html
<div class="stat-card">
  <ion-icon name="barbell-outline" class="stat-icon"></ion-icon>
  <div class="stat-content">
    <p class="stat-label">Total Workouts</p>
    <h2 class="stat-value">{{ totalWorkouts }}</h2>
  </div>
</div>
```

```scss
.stat-card {
  background: var(--ion-color-light);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;

  .stat-icon {
    font-size: 40px;
    color: var(--ion-color-primary);
  }

  .stat-content {
    flex: 1;
  }

  .stat-label {
    margin: 0 0 4px 0;
    font-size: 0.875rem;
    color: var(--fitos-text-secondary);
  }

  .stat-value {
    margin: 0;
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--ion-color-dark);
  }
}
```

#### Legal/Long-Form Content

```scss
.legal-content {
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;

  section {
    background: var(--ion-color-light);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;

    h3 {
      margin: 0 0 12px 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--ion-color-dark);
    }

    p, ul li {
      color: var(--fitos-text-primary); // ✅ High contrast
      font-size: 1rem;
      line-height: 1.7;
    }
  }

  .metadata {
    color: var(--fitos-text-tertiary);
    font-size: 0.875rem;
    margin-top: 8px;
  }
}
```

---

## Implementation Phases

### Phase 1: Quick Wins (Immediate)

**Priority 1: Fix Text Contrast**
- [ ] Update Terms page: Change body text from `--ion-color-medium` to `--fitos-text-primary`
- [ ] Update Privacy page: Same contrast fixes
- [ ] Update Help page: Ensure all body text meets WCAG AA
- [ ] Create custom text color CSS variables

**Priority 2: Move Password Change**
- [ ] Add "Change Password" button to Edit Profile page
- [ ] Keep password change modal/functionality from Privacy page
- [ ] Update Privacy page to remove password section

**Priority 3: Add Visual Section Headers**
- [ ] Add icon + header to Settings page sections
- [ ] Group related items under clear categories
- [ ] Add dividers between major sections

**Priority 4: Improve Legal Pages**
- [ ] Increase spacing between sections
- [ ] Add background cards for readability
- [ ] Larger font size for body text (16px)
- [ ] Better visual hierarchy

### Phase 2: Enhanced Profile (Medium-Term)

**Priority 5: Add Stats to Profile**
- [ ] Create "This Week" stats widget
- [ ] Add lifetime stats section
- [ ] Display current streak
- [ ] Show workout frequency chart

**Priority 6: Subscription Widget**
- [ ] Add trainer info card for clients
- [ ] Display subscription plan details
- [ ] Show next billing date
- [ ] Add "Manage Subscription" button

**Priority 7: Reorganize Settings**
- [ ] Implement new category structure
- [ ] Move Subscription from Settings to Profile
- [ ] Group Wearables under Integrations
- [ ] Add Preferences section for units/timezone/theme

**Priority 8: Achievements System (Basic)**
- [ ] Create badges/achievements data model
- [ ] Display recent achievements in Profile
- [ ] Add "View All Achievements" page
- [ ] Award first achievements (100 workouts, 7-day streak, etc.)

### Phase 3: Advanced Features (Future)

**Priority 9: Separate Profile Tab**
- [ ] Add Profile to main tab navigation
- [ ] Move all user identity content to Profile
- [ ] Streamline Settings to system config only
- [ ] User testing to validate structure

**Priority 10: Full Achievements System**
- [ ] Complete badge catalog (25+ achievements)
- [ ] Milestone celebrations (animations, notifications)
- [ ] Social proof elements
- [ ] Shareable achievement cards

**Priority 11: Personal Records Tracking**
- [ ] Track PRs for all exercises
- [ ] Display top PRs in Profile
- [ ] PR history and charts
- [ ] PR notifications

**Priority 12: Progress Photos**
- [ ] Photo gallery in Profile
- [ ] Before/after comparisons
- [ ] Photo upload with date tagging
- [ ] Privacy controls (trainer-only vs public)

---

## Accessibility Guidelines

### WCAG 2.1 AA Compliance

1. **Contrast Ratios:**
   - Normal text (< 18px): 4.5:1 minimum
   - Large text (≥ 18px): 3:1 minimum
   - Body text in FitOS: Use 7:1+ for better readability

2. **Touch Targets:**
   - Minimum: 44x44px (iOS HIG, WCAG)
   - Buttons in FitOS: 48px height minimum

3. **Focus Indicators:**
   - Visible focus states for keyboard navigation
   - Outline contrast: 3:1 against background

4. **Screen Reader Support:**
   - Proper heading hierarchy (h1 → h2 → h3)
   - ARIA labels for icon-only buttons
   - Form labels for all inputs

### Testing Checklist

- [ ] Color contrast analyzer (Chrome DevTools, WebAIM)
- [ ] Screen reader testing (VoiceOver on iOS)
- [ ] Keyboard navigation (tab order, focus states)
- [ ] Dark mode contrast verification
- [ ] Large text mode (iOS Accessibility Settings)

---

## Research Sources

Analysis based on UX patterns from:
1. **Trainerize** - Personal training platform (coach-client structure)
2. **MyFitnessPal** - Nutrition tracking (profile stats, streaks)
3. **Future** - 1-on-1 coaching (subscription in profile)
4. **TrueCoach** - Coaching platform (trainer-focused)
5. **Fitbod** - AI workouts (personal records, volume tracking)
6. **Strong** - Workout tracking (achievements, stats-heavy profile)
7. **Nike Training Club** - Social fitness (achievements, activity feed)
8. **Apple Fitness+** - Premium coaching (Apple ID integration)

### Common Patterns Identified

| Pattern | Apps Using It | Implementation in FitOS |
|---------|--------------|------------------------|
| Separate Profile/Settings | 7/8 apps | Phase 3 (optional) |
| Password in Profile | 6/8 apps | Phase 1 ✅ |
| Stats in Profile | 8/8 apps | Phase 2 ✅ |
| Achievements/Badges | 6/8 apps | Phase 2-3 ✅ |
| Subscription in Profile | 5/8 apps (paid apps) | Phase 2 ✅ |
| Wearables in Settings | 8/8 apps | Current ✅ |
| Notifications separate page | 8/8 apps | Current ✅ |

---

## Design Decisions & Rationale

### Why Separate Profile from Settings?

**Psychological:**
- Profile = **identity** (motivational, social, achievement-focused)
- Settings = **utility** (technical, privacy, system configuration)
- Mixing them dilutes the motivational aspect of profiles

**Behavioral:**
- Users visit Profile to **feel good** (see progress, stats, achievements)
- Users visit Settings to **fix something** (change password, adjust notifications)
- Different mental modes require different information architectures

**Industry Standard:**
- 7/8 top fitness apps use this separation
- Users expect it based on patterns from other apps

### Why Move Password to Profile?

**Discoverability:**
- Users expect password change near email/account info
- Currently buried under Privacy & Security (2 taps from Settings)
- Profile edit is single tap from Settings or Profile tab

**Frequency:**
- Password changes are more common than privacy settings
- Quick actions (Edit Profile, Change Password) deserve prominence

**Pattern Recognition:**
- MyFitnessPal, Strong, Fitbod all put password in Profile/Account section
- Users trained by other apps to look there first

### Why Stats & Achievements in Profile?

**Motivation:**
- Visible progress drives adherence (BCT: Self-monitoring, Feedback)
- Streaks create commitment (Cialdini's Consistency Principle)
- Achievements provide extrinsic rewards (Gamification, Hedges' g=0.42)

**Social Proof:**
- "450 workouts completed" validates the user's investment
- Creates pride in showing profile to others
- Encourages continued engagement

**Competitive Advantage:**
- Current Edit Profile is generic (name, email, timezone)
- Adding stats makes it a **destination** rather than a **chore**
- Differentiates FitOS from basic coaching platforms

---

## Migration Guide

When implementing these changes to existing Settings pages:

### Step 1: Add CSS Variables (Non-Breaking)

Add to `apps/mobile/src/theme/variables.scss`:

```scss
:root {
  --fitos-text-primary: var(--ion-color-dark);
  --fitos-text-secondary: rgba(var(--ion-text-color-rgb, 0, 0, 0), 0.7);
  --fitos-text-tertiary: var(--ion-color-medium);
}

@media (prefers-color-scheme: dark) {
  :root {
    --fitos-text-primary: rgba(255, 255, 255, 0.95);
    --fitos-text-secondary: rgba(255, 255, 255, 0.7);
  }
}
```

### Step 2: Update Existing Pages

**Replace these color references:**
```scss
// ❌ Old (poor contrast for body text)
p, ul li {
  color: var(--ion-color-medium);
}

// ✅ New (high contrast)
p, ul li {
  color: var(--fitos-text-primary);
}

// ✅ Metadata still uses medium
.last-updated, .version {
  color: var(--fitos-text-tertiary);
}
```

### Step 3: Add Section Headers

**Template:**
```html
<ion-list>
  <div class="section-header">
    <ion-icon name="cog-outline"></ion-icon>
    <h2>Preferences</h2>
  </div>
  <!-- items -->
</ion-list>
```

**Styles:**
```scss
.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 16px 12px;

  ion-icon {
    font-size: 24px;
    color: var(--ion-color-primary);
  }

  h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--fitos-text-primary);
  }
}
```

---

## Maintenance

This document should be updated when:
- New UX patterns are identified in competitor apps
- User feedback suggests different information architecture
- Accessibility standards change (WCAG updates)
- Phase 2/3 features are implemented

**Review Cadence:** Quarterly (or after major feature launches)

**Last Research Update:** January 2026
**Next Scheduled Review:** April 2026
