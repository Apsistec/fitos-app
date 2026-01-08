# FitOS Development Workflow

**Quick Reference for Daily Development**

---

## Before Coding

### 1. Read Relevant Docs

| Task | Required Reading |
|------|------------------|
| Styling/theming | `DESIGN_SYSTEM.md`, `THEMING.md` |
| New feature | `PHASE2_BACKLOG.md`, `SPRINT_PLANNING.md` |
| UX decisions | `UX_PATTERNS.md`, `COMPETITIVE_ANALYSIS.md` |
| AI features | `AI_INTEGRATION.md` |
| CRM/marketing | `CRM_MARKETING.md` |
| Angular patterns | `ANGULAR_IONIC_RULES.md` |

### 2. Check Design Tokens

```scss
// Always use tokens, never hardcode
background: var(--fitos-bg-secondary);  // ✅
background: #1A1A1A;                     // ❌
```

---

## Code Patterns

### Component Template

```typescript
@Component({
  selector: 'app-feature',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonicModule, CommonModule],
  template: `
    @if (loading()) {
      <app-skeleton />
    } @else {
      <ion-content>
        @for (item of items(); track item.id) {
          <app-item [data]="item" />
        }
      </ion-content>
    }
  `
})
export class FeatureComponent {
  private service = inject(FeatureService);
  
  items = signal<Item[]>([]);
  loading = signal(true);
}
```

### Service Template

```typescript
@Injectable({ providedIn: 'root' })
export class FeatureService {
  private supabase = inject(SupabaseService);
  
  private _items = signal<Item[]>([]);
  items = this._items.asReadonly();
  
  async load(): Promise<void> {
    const { data } = await this.supabase.client
      .from('items')
      .select('*');
    this._items.set(data || []);
  }
}
```

---

## Critical Rules

### ❌ Never Do

```scss
// Never use red for nutrition "over"
.over { color: var(--ion-color-danger); }

// Never display wearable calorie burn
<span>{{ caloriesBurned }}</span>

// Never hardcode colors
color: #EF4444;
```

### ✅ Always Do

```scss
// Use adherence-neutral colors
.over { color: var(--fitos-nutrition-over); }

// Display only reliable wearable data
<span>{{ restingHeartRate }}</span>
<span>{{ hrv }}</span>
<span>{{ sleepHours }}</span>

// Use design tokens
color: var(--fitos-text-primary);
```

---

## Git Workflow

```bash
# Feature branch
git checkout -b feature/voice-logging

# Commit format
git commit -m "feat(voice): add workout voice logging service"
git commit -m "fix(nutrition): use adherence-neutral colors"
git commit -m "docs: update AI integration architecture"

# PR checklist
- [ ] TypeScript strict passes
- [ ] OnPush change detection
- [ ] WCAG AA contrast
- [ ] Dark mode works
- [ ] Loading states added
```

---

## Testing

```bash
npm test               # Unit tests
npm run test:coverage  # Coverage report
npm run lint           # ESLint
npm run e2e            # E2E tests
```

### Coverage Targets

| Type | Target |
|------|--------|
| Services | 80%+ |
| Components | 60%+ |
| E2E critical paths | 100% |

---

## Performance Checklist

- [ ] OnPush change detection
- [ ] Virtual scrolling for lists >50 items
- [ ] Lazy loading feature modules
- [ ] trackBy on all @for loops
- [ ] Only animate transform/opacity
- [ ] Skeleton loading states
- [ ] Image lazy loading

---

## Accessibility Checklist

- [ ] Text contrast 4.5:1+ (7:1+ for metrics)
- [ ] Touch targets 44x44px minimum
- [ ] ARIA labels on icon buttons
- [ ] Proper heading hierarchy
- [ ] Reduced motion support

---

## Quick Commands

```bash
# Development
npm start                    # Start mobile app
npm run start:landing        # Start landing page

# Database
npm run db:start             # Local Supabase
npm run db:migrate           # Run migrations
npm run db:gen-types         # Generate types

# Build
npm run build                # Production build
npm run build:ios            # iOS build
npm run build:android        # Android build

# Deploy
npm run deploy:functions     # Edge Functions
npx cap sync                 # Sync to native
```

---

## File Locations

| Need | Location |
|------|----------|
| Design tokens | `apps/mobile/src/theme/variables.scss` |
| Components | `apps/mobile/src/app/features/[feature]/` |
| Services | `apps/mobile/src/app/core/services/` |
| Shared components | `apps/mobile/src/app/shared/components/` |
| Database migrations | `supabase/migrations/` |
| Edge Functions | `supabase/functions/` |
| Documentation | `docs/` |
