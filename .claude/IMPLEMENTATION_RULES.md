# FitOS Implementation Rules & Coding Standards

**Version:** 2.0 (January 30, 2026)
**Purpose:** Ensure consistent, high-quality code during sprint implementation
**Scope:** All development work in Sprints 58-69

---

## CRITICAL RULES (Must Follow Always)

### 1. Angular 21 Component Patterns

**ALWAYS use OnPush change detection and Signals:**
```typescript
// ✅ CORRECT
@Component({
  selector: 'fitos-workout-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard, IonCardHeader, AsyncPipe],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ workout().name }}</ion-card-title>
      </ion-card-header>
    </ion-card>
  `
})
export class WorkoutCardComponent {
  workout = input.required<Workout>();
  completed = output<void>();
}

// ❌ WRONG - Never use default change detection
@Component({
  selector: 'fitos-workout-card'
  // Missing changeDetection: OnPush
})
```

**ALWAYS use inject() for dependencies:**
```typescript
// ✅ CORRECT
export class WorkoutService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
}

// ❌ WRONG - Never use constructor injection
export class WorkoutService {
  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}
}
```

**ALWAYS use modern control flow:**
```typescript
// ✅ CORRECT
@if (isLoading()) {
  <ion-spinner />
} @else {
  @for (exercise of exercises(); track exercise.id) {
    <fitos-exercise-card [exercise]="exercise" />
  } @empty {
    <ion-text>No exercises found</ion-text>
  }
}

// ❌ WRONG - Never use *ngIf, *ngFor
<ion-spinner *ngIf="isLoading"></ion-spinner>
<div *ngFor="let exercise of exercises">...</div>
```

### 2. Adherence-Neutral Design (CRITICAL)

**NEVER use red/danger colors for "over target":**
```scss
// ❌ FORBIDDEN - Will cause user anxiety
.macro-over { color: var(--ion-color-danger); }
.over-budget { background: red; }
.exceeded { border-color: #ff0000; }

// ✅ REQUIRED - Use neutral alternatives
.macro-over { color: var(--fitos-nutrition-over); }  // Purple
.over-budget { background: var(--fitos-neutral-accent); }
.exceeded { border-color: var(--fitos-amber-soft); }
```

**Color Token Reference:**
```scss
// Nutrition colors (adherence-neutral)
--fitos-nutrition-calories: #6366F1;    // Indigo
--fitos-nutrition-protein: #10B981;     // Emerald/Green
--fitos-nutrition-carbs: #F59E0B;       // Amber
--fitos-nutrition-fat: #EC4899;         // Pink
--fitos-nutrition-over: #8B5CF6;        // Violet (NOT RED)

// Progress indicators
--fitos-progress-complete: #10B981;     // Green
--fitos-progress-partial: #F59E0B;      // Amber
--fitos-progress-none: #6B7280;         // Gray (NOT RED)
```

### 3. Ionic 8 Component Usage

**ALWAYS import Ionic components explicitly:**
```typescript
// ✅ CORRECT
import {
  IonCard, IonCardHeader, IonCardTitle, IonCardContent,
  IonButton, IonIcon, IonSpinner
} from '@ionic/angular/standalone';

@Component({
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton, IonIcon, IonSpinner]
})

// ❌ WRONG - Never use IonicModule
import { IonicModule } from '@ionic/angular';
@Component({ imports: [IonicModule] })
```

**ALWAYS use ion-content for scrollable pages:**
```html
<!-- ✅ CORRECT -->
<ion-header>
  <ion-toolbar>
    <ion-title>Workouts</ion-title>
  </ion-toolbar>
</ion-header>
<ion-content>
  <!-- Scrollable content here -->
</ion-content>

<!-- ❌ WRONG - Missing ion-content -->
<div class="page-content">...</div>
```

### 4. Service Pattern

**ALWAYS use Signals for state management:**
```typescript
// ✅ CORRECT
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private _workouts = signal<Workout[]>([]);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Expose as readonly
  workouts = this._workouts.asReadonly();
  loading = this._loading.asReadonly();
  error = this._error.asReadonly();

  // Computed derived state
  completedWorkouts = computed(() =>
    this._workouts().filter(w => w.status === 'completed')
  );

  async loadWorkouts(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    try {
      const { data, error } = await this.supabase.client
        .from('workouts')
        .select('*');
      if (error) throw error;
      this._workouts.set(data);
    } catch (e) {
      this._error.set(e.message);
    } finally {
      this._loading.set(false);
    }
  }
}
```

### 5. Error Handling

**ALWAYS provide user-friendly error messages:**
```typescript
// ✅ CORRECT
try {
  await this.workoutService.logSet(setData);
  this.haptic.impact(HapticStyle.Medium);
} catch (error) {
  await this.toast.present({
    message: 'Unable to save set. Please try again.',
    duration: 3000,
    color: 'warning'  // NOT danger
  });
  console.error('Set logging failed:', error);
}

// ❌ WRONG - Technical error exposed to user
catch (error) {
  alert(error.message);  // Exposes "PGRST301: JWT expired"
}
```

### 6. File Organization

**ALWAYS follow the established structure:**
```
apps/mobile/src/app/features/{feature}/
├── pages/
│   ├── {page-name}/
│   │   ├── {page-name}.page.ts
│   │   ├── {page-name}.page.html
│   │   └── {page-name}.page.scss
├── components/
│   ├── {component-name}/
│   │   └── {component-name}.component.ts
├── services/
│   └── {service-name}.service.ts
├── guards/
│   └── {guard-name}.guard.ts
└── {feature}.routes.ts
```

### 7. API Calls via Edge Functions

**NEVER expose API keys in frontend code:**
```typescript
// ❌ WRONG - API key exposed
const response = await fetch('https://api.deepgram.com', {
  headers: { 'Authorization': 'Token dk_1234567890' }
});

// ✅ CORRECT - Via Supabase Edge Function
const { data } = await this.supabase.functions.invoke('deepgram-transcribe', {
  body: { audio: audioBlob }
});
```

### 8. Voice Integration Pattern

**Voice services MUST follow this pattern:**
```typescript
@Injectable({ providedIn: 'root' })
export class VoiceService {
  private supabase = inject(SupabaseService);

  isListening = signal(false);
  transcript = signal('');

  async startListening(onResult: (text: string) => void): Promise<void> {
    this.isListening.set(true);

    // Get API key via Edge Function
    const { data: config } = await this.supabase.functions
      .invoke('get-deepgram-config');

    const socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?model=nova-3&language=en`,
      ['token', config.apiKey]
    );

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const transcript = data.channel?.alternatives?.[0]?.transcript;
      if (transcript) {
        this.transcript.set(transcript);
        onResult(transcript);
      }
    };

    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(e.data);
      }
    };
    mediaRecorder.start(250); // Send chunks every 250ms
  }

  stopListening(): void {
    this.isListening.set(false);
    // Cleanup socket and media recorder
  }
}
```

### 9. Testing Requirements

**ALWAYS include tests for services:**
```typescript
// workout.service.spec.ts
describe('WorkoutService', () => {
  let service: WorkoutService;
  let supabaseMock: jasmine.SpyObj<SupabaseService>;

  beforeEach(() => {
    supabaseMock = jasmine.createSpyObj('SupabaseService', ['client']);
    TestBed.configureTestingModule({
      providers: [
        WorkoutService,
        { provide: SupabaseService, useValue: supabaseMock }
      ]
    });
    service = TestBed.inject(WorkoutService);
  });

  it('should load workouts', async () => {
    const mockWorkouts = [{ id: '1', name: 'Test' }];
    supabaseMock.client.from.and.returnValue({
      select: () => Promise.resolve({ data: mockWorkouts, error: null })
    });

    await service.loadWorkouts();

    expect(service.workouts()).toEqual(mockWorkouts);
    expect(service.loading()).toBe(false);
  });
});
```

### 10. Accessibility (WCAG 2.1 AA)

**ALWAYS include accessibility attributes:**
```html
<!-- ✅ CORRECT -->
<ion-button (click)="logSet()" aria-label="Log workout set">
  <ion-icon name="add" aria-hidden="true"></ion-icon>
  Log Set
</ion-button>

<ion-input
  label="Weight"
  labelPlacement="floating"
  type="number"
  aria-describedby="weight-help"
/>
<ion-note id="weight-help">Enter weight in pounds or kilograms</ion-note>

<!-- ❌ WRONG - Missing accessibility -->
<ion-button (click)="logSet()">
  <ion-icon name="add"></ion-icon>
</ion-button>
```

---

## Performance Requirements

### Load Time Targets
| Page Type | Target | Maximum |
|-----------|--------|---------|
| Dashboard | 1.5s | 2.5s |
| List pages | 1s | 2s |
| Detail pages | 1s | 2s |
| Forms | 0.5s | 1s |

### Optimization Checklist
- [ ] Use `trackBy` in all loops
- [ ] Implement virtual scrolling for lists >50 items
- [ ] Lazy load feature modules
- [ ] Preload critical images
- [ ] Use skeleton loading states

---

## Build Verification

**Before committing any sprint work:**
```bash
# 1. Build must succeed
npm run build

# 2. Tests must pass
npm test

# 3. Lint must pass
npm run lint

# 4. TypeScript strict mode
npm run typecheck
```

---

## Documentation Requirements

**Every new service must include:**
```typescript
/**
 * WorkoutService handles all workout-related operations including
 * template creation, session logging, and history retrieval.
 *
 * @example
 * ```typescript
 * const workoutService = inject(WorkoutService);
 * await workoutService.loadWorkouts();
 * const workouts = workoutService.workouts();
 * ```
 *
 * @see {@link Workout} for type definitions
 * @see {@link WorkoutTemplate} for template operations
 */
@Injectable({ providedIn: 'root' })
export class WorkoutService { ... }
```

---

## Prohibited Patterns

❌ **Never do these:**
1. Use `any` type without explicit comment justifying it
2. Use `@ts-ignore` without justification
3. Hardcode API keys in source files
4. Use `setTimeout` for state updates (use RxJS or Signals)
5. Import entire libraries when only one function needed
6. Skip error handling on async operations
7. Use `console.log` in production code (use proper logging)
8. Modify user preferences without explicit consent
9. Use red/danger colors for nutrition over-target
10. Create components without OnPush change detection

---

*Rules effective for all Sprint 58-69 implementation work*
