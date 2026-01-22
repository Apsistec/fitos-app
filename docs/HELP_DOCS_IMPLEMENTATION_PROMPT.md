# FitOS Help & Documentation System Implementation

## Task Overview

Implement a comprehensive in-app help and documentation system for FitOS. This system should serve three distinct user roles (Client, Trainer, Gym Owner) with role-appropriate content, searchable FAQs, contextual help, and support contact options.

---

## Phase 1: Foundation - Help Center Structure

### 1.1 Create the Help Feature Module

Create a new help feature module at `apps/mobile/src/app/features/help/` with the following structure:

```
features/help/
├── help.routes.ts
├── pages/
│   ├── help-center/
│   │   └── help-center.page.ts          # Main help hub with search
│   ├── faq/
│   │   └── faq.page.ts                   # Searchable FAQ with accordions
│   ├── getting-started/
│   │   └── getting-started.page.ts      # Role-based onboarding guides
│   ├── feature-guide/
│   │   └── feature-guide.page.ts        # Individual feature documentation
│   └── contact-support/
│       └── contact-support.page.ts      # Support ticket/contact form
├── components/
│   ├── help-search/
│   │   └── help-search.component.ts     # Reusable search component
│   ├── faq-accordion/
│   │   └── faq-accordion.component.ts   # Expandable FAQ item
│   ├── help-card/
│   │   └── help-card.component.ts       # Navigation card for help categories
│   └── article-viewer/
│       └── article-viewer.component.ts  # Renders help article content
├── services/
│   └── help.service.ts                  # Help content management
├── models/
│   └── help.models.ts                   # TypeScript interfaces
└── data/
    ├── faq-data.ts                      # FAQ content organized by role/category
    ├── guides-data.ts                   # Getting started guides by role
    └── feature-docs-data.ts             # Feature documentation content
```

### 1.2 Help Models (help.models.ts)

```typescript
export type UserRole = 'client' | 'trainer' | 'owner';

export interface HelpCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  roles: UserRole[];  // Which roles can see this category
  articleCount: number;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  roles: UserRole[];
  tags: string[];     // For search
}

export interface HelpArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  roles: UserRole[];
  content: string;    // Markdown or HTML
  videoUrl?: string;  // Optional tutorial video
  relatedArticles?: string[];
  lastUpdated: Date;
}

export interface GettingStartedStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  route?: string;     // Deep link to feature
  completed?: boolean;
}

export interface GettingStartedGuide {
  role: UserRole;
  title: string;
  description: string;
  steps: GettingStartedStep[];
}
```

### 1.3 Update Routes

Add help routes to `apps/mobile/src/app/app.routes.ts` under the settings children:

```typescript
{
  path: 'help',
  children: [
    {
      path: '',
      loadComponent: () =>
        import('./features/help/pages/help-center/help-center.page').then(
          (m) => m.HelpCenterPage
        ),
    },
    {
      path: 'faq',
      loadComponent: () =>
        import('./features/help/pages/faq/faq.page').then((m) => m.FaqPage),
    },
    {
      path: 'faq/:category',
      loadComponent: () =>
        import('./features/help/pages/faq/faq.page').then((m) => m.FaqPage),
    },
    {
      path: 'getting-started',
      loadComponent: () =>
        import('./features/help/pages/getting-started/getting-started.page').then(
          (m) => m.GettingStartedPage
        ),
    },
    {
      path: 'guide/:slug',
      loadComponent: () =>
        import('./features/help/pages/feature-guide/feature-guide.page').then(
          (m) => m.FeatureGuidePage
        ),
    },
    {
      path: 'contact',
      loadComponent: () =>
        import('./features/help/pages/contact-support/contact-support.page').then(
          (m) => m.ContactSupportPage
        ),
    },
  ],
},
```

---

## Phase 2: Help Center Main Page

### 2.1 Help Center Page (help-center.page.ts)

Create the main help hub with:

1. **Search bar** at the top (prominent, always visible)
2. **Role-based content filtering** using AuthService to detect user role
3. **Category cards** showing:
   - Getting Started
   - Workouts & Programs
   - Nutrition Tracking
   - AI Coaching (all roles)
   - Managing Clients (trainer/owner only)
   - CRM & Marketing (trainer/owner only)
   - Payments & Billing
   - Wearables & Integrations
   - Account & Settings
4. **Quick links** section:
   - Contact Support
   - Video Tutorials
   - What's New (changelog)
5. **Popular articles** section based on role

**Design Requirements:**
- Follow dark-first design from `docs/DESIGN_SYSTEM.md`
- Use `--fitos-bg-secondary` for cards
- Use `--fitos-accent-primary` (#10B981) for icons and accents
- Minimum 44x44px touch targets
- High contrast text (15:1+ for primary text)

### 2.2 Help Search Component

Create a reusable search component that:
- Searches across FAQ questions, article titles, and tags
- Shows instant results as user types (debounced 300ms)
- Groups results by type (FAQ, Guide, Article)
- Highlights matching text
- Supports keyboard navigation
- Shows "No results" state with suggestion to contact support

```typescript
// Example structure
@Component({
  selector: 'app-help-search',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  // ...
})
export class HelpSearchComponent {
  searchQuery = signal('');
  searchResults = computed(() => this.helpService.search(this.searchQuery(), this.userRole()));
  // ...
}
```

---

## Phase 3: FAQ System

### 3.1 FAQ Data Structure (faq-data.ts)

Organize FAQs by category with role filtering:

```typescript
export const FAQ_CATEGORIES = [
  { id: 'account', title: 'Account & Billing', icon: 'person-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'workouts', title: 'Workouts & Programs', icon: 'barbell-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'nutrition', title: 'Nutrition Tracking', icon: 'nutrition-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'ai-coaching', title: 'AI Coaching', icon: 'bulb-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'clients', title: 'Managing Clients', icon: 'people-outline', roles: ['trainer', 'owner'] },
  { id: 'crm', title: 'CRM & Marketing', icon: 'funnel-outline', roles: ['trainer', 'owner'] },
  { id: 'payments', title: 'Payments', icon: 'card-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'wearables', title: 'Wearables & Devices', icon: 'watch-outline', roles: ['client', 'trainer', 'owner'] },
  { id: 'technical', title: 'Technical Issues', icon: 'build-outline', roles: ['client', 'trainer', 'owner'] },
];

export const FAQ_ITEMS: FAQItem[] = [
  // Account & Billing
  {
    id: 'faq-1',
    question: 'How do I change my subscription plan?',
    answer: `To change your subscription plan:\n\n1. Go to **Settings** > **My Subscription**\n2. Tap **Change Plan**\n3. Select your new plan\n4. Confirm the change\n\nChanges take effect at your next billing cycle.`,
    category: 'account',
    roles: ['client'],
    tags: ['subscription', 'billing', 'plan', 'upgrade', 'downgrade'],
  },
  {
    id: 'faq-2',
    question: 'How do I set up Stripe to receive payments from clients?',
    answer: `To start accepting payments:\n\n1. Go to **Settings** > **Payments**\n2. Tap **Connect Stripe Account**\n3. Complete the Stripe onboarding process\n4. Once verified, set your pricing tiers in **Pricing Tiers**\n\nPayments are deposited directly to your bank account.`,
    category: 'payments',
    roles: ['trainer', 'owner'],
    tags: ['stripe', 'payments', 'connect', 'money', 'billing'],
  },
  // ... Add 50+ FAQs covering all categories and roles
];
```

### 3.2 FAQ Categories to Include

**For All Users:**
- Account setup and profile management
- Password and security
- Notification settings
- App troubleshooting (sync issues, login problems)
- Wearable device connection (Apple Watch, Garmin, etc.)
- Data export and privacy

**For Clients:**
- How to log workouts
- Using voice logging
- Photo nutrition tracking
- Viewing assigned programs
- Messaging your trainer
- Understanding progress metrics
- Subscription management

**For Trainers:**
- Creating workout templates
- Assigning programs to clients
- Using the exercise library
- Setting nutrition targets
- AI methodology setup
- Reviewing AI responses
- CRM and lead management
- Email marketing automation
- Setting pricing tiers
- Understanding analytics

**For Gym Owners:**
- All trainer FAQs plus:
- Multi-location management
- Staff/trainer management
- Business analytics
- Enterprise features

### 3.3 FAQ Page Component

Create with:
- Category tabs or segment at top
- Search within FAQs
- Accordion-style expandable items using `ion-accordion-group`
- "Was this helpful?" feedback on each answer
- Deep linking to specific FAQ (route params)

---

## Phase 4: Getting Started Guides

### 4.1 Role-Based Onboarding Checklists

Create interactive getting-started guides for each role:

**Client Getting Started:**
1. Complete your profile
2. Connect a wearable device (optional)
3. View your assigned workout
4. Log your first workout
5. Try voice logging
6. Log your first meal
7. Message your trainer
8. Check your progress

**Trainer Getting Started:**
1. Complete your profile
2. Connect Stripe for payments
3. Set your pricing tiers
4. Configure AI methodology
5. Create your first workout template
6. Invite your first client
7. Assign a program
8. Set up email sequences

**Owner Getting Started:**
1. All trainer steps plus:
2. Add your gym locations
3. Invite trainers to your team
4. Configure business analytics
5. Set up lead capture

### 4.2 Getting Started Page

- Show checklist with progress indicator
- Deep link each step to the relevant feature
- Track completion in local storage or user preferences
- Show congratulations when complete
- Option to reset/redo the guide

---

## Phase 5: Feature Documentation

### 5.1 Feature Guide Content

Create detailed guides for each major feature. Structure each guide with:

```typescript
export interface FeatureGuide {
  slug: string;
  title: string;
  description: string;
  roles: UserRole[];
  sections: {
    title: string;
    content: string;  // Markdown
    videoUrl?: string;
    tips?: string[];
  }[];
  relatedGuides: string[];
}
```

**Feature Guides to Create:**

1. **Voice Workout Logging** (all roles)
   - Supported commands
   - Best practices
   - Troubleshooting

2. **Photo Nutrition Tracking** (all roles)
   - How it works
   - Editing AI results
   - Tips for accuracy

3. **AI Coaching Chat** (all roles)
   - What to ask
   - How AI learns your style
   - Limitations

4. **Workout Builder** (trainer/owner)
   - Creating templates
   - Exercise library
   - Assigning to clients

5. **CRM Pipeline** (trainer/owner)
   - Lead stages
   - Moving leads
   - Automation

6. **Email Marketing** (trainer/owner)
   - Creating templates
   - Setting up sequences
   - Analytics

7. **Wearable Integration** (all roles)
   - Supported devices
   - What data syncs
   - Troubleshooting

8. **Apple Watch App** (all roles)
   - Installation
   - Workout logging
   - Viewing assignments

---

## Phase 6: Contact Support

### 6.1 Contact Support Page

Create a support contact page with:

1. **Support options:**
   - Email: support@fitos.app (pre-filled mailto link)
   - In-app feedback form
   - Link to community (future)

2. **Feedback form fields:**
   - Category dropdown (Bug, Feature Request, Billing, Other)
   - Subject line
   - Description (textarea)
   - Optional screenshot attachment
   - Device/app version (auto-populated)

3. **Expected response time** indicator

4. **Links to:**
   - FAQ (maybe your question is answered)
   - Status page (for known issues)
   - Feature request voting (future)

---

## Phase 7: Update Existing Help Page

### 7.1 Replace Current Help Page

Update `apps/mobile/src/app/features/settings/pages/help/help.page.ts` to redirect to the new help center or serve as the entry point:

```typescript
@Component({
  selector: 'app-help',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonIcon,
    IonLabel,
    RouterLink,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/settings"></ion-back-button>
        </ion-buttons>
        <ion-title>Help & Support</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="help-container">
        <!-- Search -->
        <app-help-search />
        
        <!-- Quick Actions -->
        <ion-list class="help-list">
          <ion-item button detail routerLink="/tabs/settings/help/getting-started">
            <ion-icon name="rocket-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Getting Started</h3>
              <p>Step-by-step setup guide</p>
            </ion-label>
          </ion-item>
          
          <ion-item button detail routerLink="/tabs/settings/help/faq">
            <ion-icon name="help-circle-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>FAQs</h3>
              <p>Frequently asked questions</p>
            </ion-label>
          </ion-item>
          
          <!-- Role-specific guides -->
          @if (isTrainer()) {
            <ion-item button detail routerLink="/tabs/settings/help/guide/workout-builder">
              <ion-icon name="barbell-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>Workout Builder Guide</h3>
                <p>Create and assign programs</p>
              </ion-label>
            </ion-item>
            
            <ion-item button detail routerLink="/tabs/settings/help/guide/crm">
              <ion-icon name="funnel-outline" slot="start"></ion-icon>
              <ion-label>
                <h3>CRM & Marketing Guide</h3>
                <p>Manage leads and email campaigns</p>
              </ion-label>
            </ion-item>
          }
          
          <ion-item button detail routerLink="/tabs/settings/help/guide/voice-logging">
            <ion-icon name="mic-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>Voice Logging Guide</h3>
              <p>Log workouts with your voice</p>
            </ion-label>
          </ion-item>
          
          <ion-item button detail routerLink="/tabs/settings/help/guide/ai-coaching">
            <ion-icon name="bulb-outline" slot="start"></ion-icon>
            <ion-label>
              <h3>AI Coaching Guide</h3>
              <p>Get the most from your AI coach</p>
            </ion-label>
          </ion-item>
        </ion-list>
        
        <!-- Contact Support -->
        <div class="support-section">
          <h2>Need More Help?</h2>
          <ion-button expand="block" fill="outline" (click)="sendEmail()">
            <ion-icon name="mail-outline" slot="start"></ion-icon>
            Contact Support
          </ion-button>
        </div>
        
        <div class="version-info">
          <p>FitOS v{{ appVersion }}</p>
        </div>
      </div>
    </ion-content>
  `,
  // ... styles following design system
})
```

---

## Design & UX Requirements

### Follow Design System

Reference `docs/DESIGN_SYSTEM.md` for all styling:

```scss
.help-container {
  max-width: 768px;
  margin: 0 auto;
  padding: 16px;
  padding-bottom: env(safe-area-inset-bottom, 16px);
}

.help-list {
  background: transparent;
  
  ion-item {
    --background: var(--fitos-bg-secondary);
    --color: var(--fitos-text-primary);
    --border-color: var(--fitos-border-subtle);
    margin-bottom: 8px;
    border-radius: 12px;
    
    ion-icon[slot="start"] {
      color: var(--fitos-accent-primary);
    }
    
    h3 {
      color: var(--fitos-text-primary);
      font-weight: 500;
    }
    
    p {
      color: var(--fitos-text-secondary);
    }
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 0 12px;
  
  ion-icon {
    font-size: 24px;
    color: var(--fitos-accent-primary);
  }
  
  h2 {
    font-size: 1.125rem;
    font-weight: 600;
    margin: 0;
    color: var(--fitos-text-primary);
  }
}

// FAQ Accordion styling
ion-accordion-group {
  ion-accordion {
    background: var(--fitos-bg-secondary);
    border-radius: 12px;
    margin-bottom: 8px;
    
    ion-item[slot="header"] {
      --background: transparent;
      --color: var(--fitos-text-primary);
    }
    
    .ion-padding {
      background: var(--fitos-bg-tertiary);
      color: var(--fitos-text-secondary);
      line-height: 1.6;
    }
  }
}
```

### Angular Patterns (Required)

- **Standalone components** for all new components
- **Signals** for all reactive state
- **OnPush change detection** on every component
- **Control flow syntax** (@if, @for) not *ngIf/*ngFor
- **Lazy loading** for all routes
- **trackBy** equivalent with track in @for loops

### Accessibility Requirements

- Minimum 44x44px touch targets
- 7:1+ contrast ratio for body text
- 15:1+ contrast for primary text in gym environments
- Proper heading hierarchy (h1, h2, h3)
- ARIA labels on interactive elements
- Keyboard navigation support

---

## Content Writing Guidelines

### Tone & Voice

- **Friendly and encouraging** - not corporate
- **Action-oriented** - tell users what to do
- **Concise** - respect users' time
- **Role-aware** - speak to their specific context

### FAQ Answer Format

```markdown
To [accomplish task]:

1. [First step]
2. [Second step]
3. [Third step]

**Tip:** [Helpful additional info]
```

### Guide Section Format

```markdown
## [Section Title]

[Brief explanation of what this covers]

### How to [specific task]

1. [Step with specific UI element in **bold**]
2. [Next step]
3. [Final step]

> 💡 **Pro tip:** [Expert advice]

### Common issues

- **[Problem]**: [Solution]
- **[Problem]**: [Solution]
```

---

## Testing Checklist

- [ ] Help center loads for all user roles
- [ ] Search returns relevant results
- [ ] FAQs filter correctly by role
- [ ] Accordion expand/collapse works
- [ ] Getting started checklist tracks progress
- [ ] Deep links to features work
- [ ] Contact form submits successfully
- [ ] All content renders in dark mode
- [ ] All content renders in light mode
- [ ] Touch targets meet 44px minimum
- [ ] Text contrast meets requirements
- [ ] Back navigation works correctly

---

## Files to Create/Modify

### New Files:
- `apps/mobile/src/app/features/help/help.routes.ts`
- `apps/mobile/src/app/features/help/models/help.models.ts`
- `apps/mobile/src/app/features/help/services/help.service.ts`
- `apps/mobile/src/app/features/help/data/faq-data.ts`
- `apps/mobile/src/app/features/help/data/guides-data.ts`
- `apps/mobile/src/app/features/help/data/feature-docs-data.ts`
- `apps/mobile/src/app/features/help/pages/help-center/help-center.page.ts`
- `apps/mobile/src/app/features/help/pages/faq/faq.page.ts`
- `apps/mobile/src/app/features/help/pages/getting-started/getting-started.page.ts`
- `apps/mobile/src/app/features/help/pages/feature-guide/feature-guide.page.ts`
- `apps/mobile/src/app/features/help/pages/contact-support/contact-support.page.ts`
- `apps/mobile/src/app/features/help/components/help-search/help-search.component.ts`
- `apps/mobile/src/app/features/help/components/faq-accordion/faq-accordion.component.ts`
- `apps/mobile/src/app/features/help/components/help-card/help-card.component.ts`

### Files to Modify:
- `apps/mobile/src/app/app.routes.ts` - Add help routes
- `apps/mobile/src/app/features/settings/pages/help/help.page.ts` - Update to use new system

---

## Implementation Order

1. **Phase 1**: Create folder structure, models, and basic routing
2. **Phase 2**: Implement help center main page with search
3. **Phase 3**: Build FAQ system with accordion components
4. **Phase 4**: Create getting started guides
5. **Phase 5**: Add feature documentation pages
6. **Phase 6**: Implement contact support form
7. **Phase 7**: Update existing help page and integrate

Start with Phase 1 and proceed sequentially. Test each phase before moving to the next.
