# FitOS Phase 2 Development Prompt for Claude Code

## PROJECT CONTEXT

You are working on **FitOS**, an AI-powered fitness coaching platform built with:
- **Frontend**: Angular 21, Ionic 8, Capacitor 6, TypeScript 5.8
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Realtime)
- **Repository**: `~/Dev/fitos-app` (Nx monorepo)

FitOS is a B2B SaaS for personal trainers with three user roles: Trainers, Clients, and Gym Owners.

---

## CRITICAL: READ DOCUMENTATION FIRST

Before starting ANY work, you MUST read and internalize these documents in the `docs/` folder:

### Required Reading (in order):
1. `CLAUDE.md` - Project rules, architecture decisions, quick reference
2. `DESIGN_SYSTEM.md` - Dark-first colors, typography, component patterns
3. `ANGULAR_IONIC_RULES.md` - Angular 21 patterns, Ionic 8 APIs, signals
4. `SPRINT_PLANNING.md` - Sprint breakdown with point estimates
5. `PHASE2_BACKLOG.md` - Detailed feature specifications
6. `AI_INTEGRATION.md` - Voice, photo AI, LangGraph architecture
7. `CRM_MARKETING.md` - Lead pipeline, email automation schemas
8. `UX_PATTERNS.md` - Friction reduction, adherence-neutral design
9. `COMPETITIVE_ANALYSIS.md` - Feature gaps we're addressing
10. `THEMING.md` - Theme implementation details

### Critical Rules from Documentation:
- **NEVER use red for nutrition "over target"** - Use purple (#8B5CF6)
- **NEVER display wearable calorie burn** - Research shows inaccuracy
- **Dark mode is DEFAULT** - body starts with class="dark"
- **OnPush change detection** on ALL components
- **Signals** for all state management (no BehaviorSubject)
- **@for/@if/@switch** control flow (not *ngFor/*ngIf)
- **input()/output()/model()** for component I/O (not @Input/@Output)
- **inject()** for DI (not constructor injection)

---

## IMMEDIATE TASK: COMMIT EXISTING CHANGES

First, commit and push all existing changes from the previous session:

```bash
cd ~/Dev/fitos-app
git add .
git status
git commit -m "feat: Phase 2 foundation - dark-first design system, voice/CRM services

## Design System (Sprint 6.5)
- Add _design-tokens.scss with dark-first color palette
- Update variables.scss with Ionic variable mappings  
- Set dark mode as default (body class='dark')
- Add adherence-neutral nutrition colors (purple for 'over')
- Update global.scss with comprehensive Ionic overrides

## Theme Service
- Support dark/light/system mode selection
- Persist preference with Capacitor Preferences
- Update StatusBar for native apps

## Component Updates  
- Settings page: 3-way theme selector
- StatCard: monospace metrics, design tokens
- ClientTodayWorkoutCard: hero card with glow
- WearableDataCard: dark mode styling

## Phase 2 Services
- VoiceService: Deepgram integration skeleton
- VoiceLoggerComponent: mic button UI
- LeadService: CRM pipeline management
- app.constants.ts: shared constants

## Documentation
- 7 new docs, 4 updated docs
- Comprehensive sprint planning"

git push origin main
```

---

## DEVELOPMENT WORKFLOW

For each Sprint/Epic, follow this process:

### 1. Pre-Sprint Checklist
Before starting work on any sprint:
- [ ] Read relevant documentation sections
- [ ] Ask clarifying questions if requirements are unclear
- [ ] Identify dependencies on previous sprints
- [ ] List files that will be created/modified
- [ ] Confirm understanding before proceeding

### 2. Implementation
- Follow patterns in `ANGULAR_IONIC_RULES.md`
- Use design tokens from `DESIGN_SYSTEM.md`
- Match component structure from existing code
- Write TypeScript strict mode compliant code
- Add loading states and error handling

### 3. Post-Sprint Commit
After completing each sprint/epic:
```bash
git add .
git commit -m "feat(sprint-X): [description]

- [specific changes]
- [files created]
- [features implemented]"
git push origin main
```

---

## SPRINT SEQUENCE

### Sprint 6.5: Polish (CURRENT - VERIFY COMPLETE)
**Goal**: Fix remaining dark mode issues, verify theme works

Tasks to verify/complete:
- [ ] Test dark mode renders correctly
- [ ] Verify Settings page theme selector works
- [ ] Check all text has proper contrast (WCAG AA)
- [ ] Ensure no red colors in nutrition UI
- [ ] Complete CRM migration file (00010_crm_leads.sql)

### Sprint 7: Design System Refresh
**Goal**: Full implementation of dark-first design system

Key deliverables:
- Typography utility classes
- Card components with glow effects
- Button variants (primary, secondary, ghost)
- Skeleton loading patterns
- Icon button styles

### Sprint 8: Voice Workout Logging
**Goal**: Hands-free workout logging with Deepgram

Key deliverables:
- Deepgram Edge Function for API key management
- VoiceService WebSocket streaming
- Voice command parsing (reps, weight, repeat, skip)
- Integration with ActiveWorkoutPage
- Haptic feedback on successful log

### Sprint 9: Voice Nutrition Logging
**Goal**: Natural language food logging

Key deliverables:
- Nutritionix NLP API integration
- Voice-to-food parsing
- Confirmation UI with editable results
- Multi-food entry support

### Sprint 10: Photo Nutrition AI
**Goal**: Snap photo to log meal

Key deliverables:
- Passio AI or SnapCalorie integration
- Camera capture flow
- Transparent food breakdown UI
- Portion size adjustment

### Sprint 11: CRM Foundation
**Goal**: Lead pipeline for trainers

Key deliverables:
- Complete database migrations
- Lead pipeline Kanban UI (drag-drop)
- Lead detail page with activity timeline
- Lead capture form generator

### Sprint 12: Email Marketing
**Goal**: Built-in email campaigns

Key deliverables:
- Resend/SendGrid integration
- Email template editor (WYSIWYG)
- Sequence builder UI
- Pre-built templates (welcome, nurture)

### Sprint 13-14: AI Coaching
**Goal**: GPT-4 coaching chatbot with JITAI

Key deliverables:
- LangGraph multi-agent backend
- Chat UI with typing indicators
- RAG for user context
- Proactive intervention engine

### Sprint 15: Apple Watch
**Goal**: Wrist-based workout logging

Key deliverables:
- watchOS companion app
- WatchConnectivity sync
- Today's workout complication

### Sprint 16: Polish & Launch
**Goal**: Production ready

Key deliverables:
- Performance optimization
- Accessibility audit
- Celebration animations
- App store preparation

---

## FILE STRUCTURE REFERENCE

```
fitos-app/
├── apps/
│   ├── mobile/src/
│   │   ├── app/
│   │   │   ├── core/services/     # Injectable services
│   │   │   ├── features/          # Feature modules
│   │   │   │   ├── dashboard/
│   │   │   │   ├── workouts/
│   │   │   │   ├── nutrition/
│   │   │   │   ├── clients/
│   │   │   │   ├── settings/
│   │   │   │   └── crm/           # NEW: CRM features
│   │   │   └── shared/
│   │   │       ├── components/
│   │   │       ├── constants/
│   │   │       └── animations/
│   │   ├── theme/
│   │   │   ├── _design-tokens.scss
│   │   │   └── variables.scss
│   │   └── global.scss
│   ├── landing/                   # Marketing site
│   └── ai-backend/                # Python AI service
├── supabase/
│   ├── migrations/
│   └── functions/                 # Edge Functions
├── docs/                          # Documentation
└── libs/shared/                   # Shared types
```

---

## COMPONENT TEMPLATE

When creating new components, follow this pattern:

```typescript
import { Component, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonContent, IonCard, /* etc */ } from '@ionic/angular/standalone';

@Component({
  selector: 'app-feature-name',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonContent, IonCard],
  template: `
    @if (loading()) {
      <app-skeleton />
    } @else {
      <ion-content>
        @for (item of items(); track item.id) {
          <app-item-card [item]="item" />
        }
      </ion-content>
    }
  `,
  styles: [`
    :host {
      display: block;
    }
    
    /* Use design tokens */
    .card {
      background: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-subtle);
      border-radius: var(--fitos-radius-lg);
    }
  `]
})
export class FeatureNameComponent {
  private service = inject(FeatureService);
  
  // State
  items = signal<Item[]>([]);
  loading = signal(true);
  
  // Computed
  hasItems = computed(() => this.items().length > 0);
}
```

---

## SERVICE TEMPLATE

```typescript
import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private supabase = inject(SupabaseService);
  
  // Private mutable state
  private _items = signal<Item[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  
  // Public readonly
  items = this._items.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();
  
  // Computed
  hasError = computed(() => this._error() !== null);
  
  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      const { data, error } = await this.supabase.client
        .from('items')
        .select('*');
        
      if (error) throw error;
      this._items.set(data || []);
    } catch (err) {
      this._error.set('Failed to load items');
      console.error(err);
    } finally {
      this._loading.set(false);
    }
  }
}
```

---

## QUESTIONS TO ASK BEFORE EACH SPRINT

Before starting work on any sprint, ask:

1. **Dependencies**: Are there any incomplete items from previous sprints that block this work?
2. **API Keys**: Are external service credentials available (Deepgram, Nutritionix, Passio)?
3. **Design Clarification**: Are there specific UI mockups or should I follow the design system?
4. **Scope Confirmation**: Should I implement all tasks in the sprint or a subset?
5. **Testing Requirements**: What level of testing is expected?
6. **Edge Cases**: Are there specific error scenarios to handle?

---

## SUCCESS CRITERIA

For each sprint to be considered complete:
- [ ] All specified features implemented
- [ ] TypeScript strict mode passes
- [ ] OnPush change detection on all components
- [ ] Design tokens used (no hardcoded colors)
- [ ] Loading states added
- [ ] Error handling implemented
- [ ] Code committed and pushed to main
- [ ] Works in dark mode (default) and light mode

---

## BEGIN WORK

Now that you have context:

1. First, **commit the existing changes** using the git commands above
2. Then, **ask clarifying questions** about Sprint 6.5 completion status
3. After confirmation, **proceed with Sprint 7** implementation

Remember: Read the docs, ask questions, then implement. Quality over speed.
