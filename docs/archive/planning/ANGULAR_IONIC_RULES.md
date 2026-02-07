# FitOS Development Rules: Angular 21 + Ionic 8 + Capacitor 6

This document provides **comprehensive, production-ready rules** for developing FitOS following Angular 21, Ionic 8, and Capacitor 6 best practices. Every API, component, pattern, and capability is documented for the AI-powered fitness coaching platform.

---

## Table of Contents

1. [Angular 21 Core Architecture](#angular-21-core-architecture)
2. [Signals System (Complete API)](#signals-system-complete-api)
3. [Template Syntax & Control Flow](#template-syntax--control-flow)
4. [Component Queries](#component-queries)
5. [Dependency Injection](#dependency-injection)
6. [Forms (Signal Forms & Reactive)](#forms-signal-forms--reactive)
7. [HTTP Client & Interceptors](#http-client--interceptors)
8. [Routing, Guards & Resolvers](#routing-guards--resolvers)
9. [Lifecycle Hooks](#lifecycle-hooks)
10. [Host Elements & Styling](#host-elements--styling)
11. [Animations](#animations)
12. [Ionic 8 Complete Component API](#ionic-8-complete-component-api)
13. [Ionic Patterns & Lifecycle](#ionic-patterns--lifecycle)
14. [Capacitor 6 Plugin APIs](#capacitor-6-plugin-apis)
15. [Angular Material CDK](#angular-material-cdk)
16. [Theming & Dark Mode](#theming--dark-mode)
17. [Accessibility (WCAG 2.1 AA)](#accessibility-wcag-21-aa)
18. [Performance Optimization](#performance-optimization)
19. [Testing Patterns](#testing-patterns)

---

## Angular 21 Core Architecture

### Standalone Components (Default)

In Angular 21, standalone components are the **default**. Never specify `standalone: true`.

```typescript
// ✅ CORRECT: No standalone property needed
@Component({
  selector: 'fit-workout-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonButton],
  template: `
    <ion-card>
      <ion-card-header>
        <ion-card-title>{{ workout().name }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        {{ workout().description }}
      </ion-card-content>
    </ion-card>
  `
})
export class WorkoutCardComponent {
  workout = input.required<Workout>();
}

// ❌ WRONG: Don't specify standalone
@Component({
  standalone: true, // NOT NEEDED IN ANGULAR 21
  ...
})
```

### Component Structure Order

Follow this consistent order in all components:

```typescript
@Component({
  selector: 'fit-exercise-logger',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [/* imports */],
  host: {
    'class': 'exercise-logger',
    '[class.completed]': 'isCompleted()',
    '(keydown.enter)': 'onEnter($event)'
  },
  template: `...`,
  styles: [`...`]
})
export class ExerciseLoggerComponent implements OnInit {
  // 1. Injected dependencies
  private workoutService = inject(WorkoutService);
  private destroyRef = inject(DestroyRef);
  
  // 2. Inputs (signal-based)
  exercise = input.required<Exercise>();
  showTimer = input(true);
  
  // 3. Outputs
  completed = output<ExerciseLog>();
  skipped = output<string>();
  
  // 4. Models (two-way binding)
  weight = model(0);
  reps = model(0);
  
  // 5. Queries
  inputRef = viewChild<ElementRef>('weightInput');
  setCards = viewChildren(SetCardComponent);
  
  // 6. State signals
  isLoading = signal(false);
  error = signal<string | null>(null);
  currentSet = signal(1);
  
  // 7. Computed signals
  totalVolume = computed(() => this.weight() * this.reps() * this.currentSet());
  isCompleted = computed(() => this.currentSet() > this.exercise().targetSets);
  
  // 8. Linked signals
  selectedWeight = linkedSignal(() => this.exercise().suggestedWeight);
  
  // 9. Resources
  exerciseHistory = httpResource<ExerciseLog[]>(() => 
    `/api/exercises/${this.exercise().id}/history`
  );
  
  // 10. Effects (use sparingly)
  constructor() {
    effect(() => {
      // Side effects when signals change
      console.log(`Set ${this.currentSet()} completed`);
    });
  }
  
  // 11. Lifecycle hooks
  ngOnInit() {
    this.loadExerciseData();
  }
  
  // 12. Public methods
  logSet() { }
  
  // 13. Private methods
  private loadExerciseData() { }
}
```

---

## Signals System (Complete API)

### Signal Creation & Mutation

| Method | Description | Example |
|--------|-------------|---------|
| `signal(value)` | Create writable signal | `count = signal(0)` |
| `signal.set(value)` | Replace value | `count.set(10)` |
| `signal.update(fn)` | Update from previous | `count.update(v => v + 1)` |
| `signal.asReadonly()` | Expose read-only | `public count = this._count.asReadonly()` |
| `computed(fn)` | Derived read-only | `double = computed(() => this.count() * 2)` |
| `effect(fn)` | Side effects | `effect(() => localStorage.set('count', this.count()))` |

### Signal Inputs

```typescript
// Required input - throws if not provided
exercise = input.required<Exercise>();

// Optional with default
showDetails = input(false);

// With alias
userName = input('', { alias: 'name' });

// With transform
reps = input(0, { 
  transform: (value: string | number) => typeof value === 'string' ? parseInt(value, 10) : value 
});

// Reading input values (always call as function)
const exerciseName = this.exercise().name;
```

### Signal Outputs

```typescript
// Basic output
completed = output<Exercise>();

// Emit values
this.completed.emit(exercise);

// With alias
workoutFinished = output<WorkoutSummary>({ alias: 'finished' });
```

### Model (Two-Way Binding)

```typescript
// In component
weight = model(0);
weight = model.required<number>();

// In template - parent component
<fit-weight-input [(weight)]="currentWeight" />

// Or expanded form
<fit-weight-input [weight]="currentWeight()" (weightChange)="currentWeight.set($event)" />
```

### linkedSignal (Derived Writable State)

```typescript
// Resets when source changes, but can be manually overridden
exercise = input.required<Exercise>();
selectedWeight = linkedSignal(() => this.exercise().suggestedWeight);

// User can override
adjustWeight(newWeight: number) {
  this.selectedWeight.set(newWeight);
}
// But when exercise() changes, selectedWeight resets to new suggestedWeight
```

### Resource & httpResource

```typescript
// httpResource for HTTP requests with signals
workouts = httpResource<Workout[]>(() => ({
  url: '/api/workouts',
  params: { userId: this.userId(), status: this.filterStatus() }
}));

// Access resource state
@if (workouts.isLoading()) {
  <ion-spinner />
} @else if (workouts.hasValue()) {
  @for (workout of workouts.value(); track workout.id) {
    <fit-workout-card [workout]="workout" />
  }
} @else if (workouts.error()) {
  <p>Error: {{ workouts.error().message }}</p>
}

// resource() for custom async operations
clientData = resource({
  params: () => ({ id: this.clientId() }),
  loader: async ({ params, abortSignal }) => {
    const response = await fetch(`/api/clients/${params.id}`, { signal: abortSignal });
    if (!response.ok) throw new Error('Failed to load client');
    return response.json();
  }
});

// Reload resource manually
refreshClients() {
  this.clientData.reload();
}
```

### Effects Best Practices

```typescript
// ✅ GOOD: Use for synchronization with external systems
effect(() => {
  localStorage.setItem('theme', this.darkMode() ? 'dark' : 'light');
});

// ✅ GOOD: Use onCleanup for subscriptions
effect((onCleanup) => {
  const subscription = this.workoutService.subscribe(this.workoutId());
  onCleanup(() => subscription.unsubscribe());
});

// ❌ BAD: Don't modify signals in effects without allowSignalWrites
effect(() => {
  this.derivedValue.set(this.sourceValue() * 2); // ERROR!
});

// ⚠️ USE SPARINGLY: allowSignalWrites
effect(() => {
  this.derivedValue.set(this.sourceValue() * 2);
}, { allowSignalWrites: true });
```

### RxJS Interop

```typescript
import { toSignal, toObservable } from '@angular/core/rxjs-interop';

// Convert Observable to Signal
private route = inject(ActivatedRoute);
workoutId = toSignal(this.route.params.pipe(map(p => p['id'])), { initialValue: '' });

// Convert Signal to Observable
weightChanges$ = toObservable(this.weight);
```

---

## Template Syntax & Control Flow

### Modern Control Flow (Required)

```typescript
// @if with @else
@if (isLoading()) {
  <ion-spinner />
} @else if (error()) {
  <ion-text color="danger">{{ error() }}</ion-text>
} @else {
  <fit-workout-list [workouts]="workouts()" />
}

// @for with track (REQUIRED) and @empty
@for (exercise of exercises(); track exercise.id; let i = $index, first = $first, last = $last) {
  <fit-exercise-card 
    [exercise]="exercise" 
    [index]="i"
    [class.first]="first"
    [class.last]="last" />
} @empty {
  <ion-text>No exercises in this workout</ion-text>
}

// Available @for context variables:
// $count - total items
// $index - current index (0-based)
// $first - true if first item
// $last - true if last item
// $even - true if even index
// $odd - true if odd index

// @switch
@switch (workout().status) {
  @case ('scheduled') {
    <ion-badge color="primary">Scheduled</ion-badge>
  }
  @case ('in_progress') {
    <ion-badge color="warning">In Progress</ion-badge>
  }
  @case ('completed') {
    <ion-badge color="success">Completed</ion-badge>
  }
  @default {
    <ion-badge color="medium">Unknown</ion-badge>
  }
}
```

### @defer for Lazy Loading

```typescript
// Basic defer - loads on idle
@defer {
  <fit-workout-analytics [data]="analyticsData()" />
} @placeholder {
  <ion-skeleton-text animated style="width: 100%; height: 200px" />
}

// Defer with triggers
@defer (on viewport) {
  <fit-progress-chart />
}

@defer (on interaction) {
  <fit-advanced-settings />
}

@defer (on hover) {
  <fit-exercise-preview />
}

@defer (on timer(5s)) {
  <fit-recommendations />
}

@defer (on immediate) {
  <fit-critical-alerts />
}

// Defer with conditions
@defer (when showAdvanced()) {
  <fit-advanced-options />
}

// Defer with prefetch
@defer (on viewport; prefetch on idle) {
  <fit-workout-history />
}

// Complete defer block with all states
@defer (on viewport; prefetch on idle) {
  <fit-heavy-component />
} @loading (after 100ms; minimum 500ms) {
  <ion-spinner />
} @placeholder (minimum 200ms) {
  <div class="placeholder">Loading workout data...</div>
} @error {
  <ion-text color="danger">Failed to load component</ion-text>
}
```

### @let for Template Variables

```typescript
// Declare template-local variables
@let totalSets = exercise().sets * exercise().reps;
@let isHeavy = exercise().weight > 100;

<ion-card [class.heavy-lift]="isHeavy">
  <ion-card-content>
    Total volume: {{ totalSets * exercise().weight }} kg
  </ion-card-content>
</ion-card>

// Useful for unwrapping signals once
@let workout = currentWorkout();
@if (workout) {
  <h1>{{ workout.name }}</h1>
  <p>{{ workout.exercises.length }} exercises</p>
}
```

### Content Projection

```typescript
// Single slot
@Component({
  selector: 'fit-card',
  template: `
    <div class="card">
      <ng-content />
    </div>
  `
})

// Multi-slot with select
@Component({
  selector: 'fit-modal',
  template: `
    <div class="modal">
      <header>
        <ng-content select="[slot=header]" />
      </header>
      <main>
        <ng-content />
      </main>
      <footer>
        <ng-content select="[slot=footer]" />
      </footer>
    </div>
  `
})

// Usage
<fit-modal>
  <h2 slot="header">Edit Exercise</h2>
  <fit-exercise-form />
  <ion-button slot="footer">Save</ion-button>
</fit-modal>
```

### ng-template and ng-container

```typescript
// ng-template for reusable template fragments
<ng-template #loadingTemplate>
  <ion-spinner />
  <ion-text>Loading...</ion-text>
</ng-template>

@if (isLoading()) {
  <ng-container *ngTemplateOutlet="loadingTemplate" />
}

// ng-template with context
<ng-template #exerciseTemplate let-exercise let-index="index">
  <ion-item>
    <ion-label>{{ index + 1 }}. {{ exercise.name }}</ion-label>
  </ion-item>
</ng-template>

@for (ex of exercises(); track ex.id; let i = $index) {
  <ng-container *ngTemplateOutlet="exerciseTemplate; context: { $implicit: ex, index: i }" />
}

// ng-container for grouping without extra DOM
<ng-container *ngIf="user()">
  <ion-item>{{ user().name }}</ion-item>
  <ion-item>{{ user().email }}</ion-item>
</ng-container>
```

---

## Component Queries

### Signal-Based Queries (Preferred)

```typescript
// viewChild - query single element/component in view
weightInput = viewChild<ElementRef>('weightInput');
timerComponent = viewChild(TimerComponent);
requiredInput = viewChild.required<ElementRef>('requiredElement');

// viewChildren - query multiple
exerciseCards = viewChildren(ExerciseCardComponent);
allInputs = viewChildren<ElementRef>('input');

// contentChild - query projected content
projectedHeader = contentChild<ElementRef>('header');

// contentChildren - query multiple projected
projectedItems = contentChildren(ItemComponent);

// With options
deepContent = contentChildren(ItemComponent, { descendants: true });
readAsElement = viewChild('myComponent', { read: ElementRef });
```

### Using Queries

```typescript
// In component
weightInput = viewChild<ElementRef<HTMLInputElement>>('weightInput');

// Focus after view init
ngAfterViewInit() {
  this.weightInput()?.nativeElement.focus();
}

// Computed based on query results
hasExercises = computed(() => this.exerciseCards().length > 0);

// React to query changes in effect
effect(() => {
  const cards = this.exerciseCards();
  console.log(`${cards.length} exercise cards rendered`);
});
```

---

## Dependency Injection

### inject() Function (Required)

```typescript
// ✅ CORRECT: Use inject()
@Component({...})
export class WorkoutComponent {
  private workoutService = inject(WorkoutService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  private elementRef = inject(ElementRef);
  private ngZone = inject(NgZone);
}

// ❌ WRONG: Constructor injection
@Component({...})
export class WorkoutComponent {
  constructor(
    private workoutService: WorkoutService, // DON'T DO THIS
    private router: Router
  ) {}
}
```

### Injection Tokens

```typescript
// Create token
export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL');
export const WORKOUT_CONFIG = new InjectionToken<WorkoutConfig>('WORKOUT_CONFIG');

// Provide
bootstrapApplication(AppComponent, {
  providers: [
    { provide: API_BASE_URL, useValue: 'https://api.fitos.app' },
    { provide: WORKOUT_CONFIG, useValue: { maxSets: 10, restTimerDefault: 90 } }
  ]
});

// Inject
@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = inject(API_BASE_URL);
  private config = inject(WORKOUT_CONFIG);
}
```

### Provider Configurations

```typescript
// useClass - provide different implementation
{ provide: StorageService, useClass: IndexedDBStorageService }

// useValue - provide static value
{ provide: MAX_EXERCISES, useValue: 50 }

// useFactory - create with dependencies
{
  provide: WorkoutService,
  useFactory: (http: HttpClient, config: AppConfig) => {
    return config.offline ? new OfflineWorkoutService() : new OnlineWorkoutService(http);
  },
  deps: [HttpClient, APP_CONFIG]
}

// useExisting - alias
{ provide: AbstractLogger, useExisting: ConsoleLoggerService }
```

### Injection Modifiers

```typescript
// Optional - don't throw if not found
private analytics = inject(AnalyticsService, { optional: true });

// Self - only check this injector
private localService = inject(LocalService, { self: true });

// SkipSelf - skip this injector, check parents
private parentService = inject(ParentService, { skipSelf: true });

// Host - stop at host component
private hostService = inject(HostService, { host: true });
```

---

## Forms (Signal Forms & Reactive)

### Signal Forms (Angular 21 - Experimental)

```typescript
import { FormGroup, FormControl, Validators } from '@angular/forms';

// Signal-based form with computed validation
@Component({...})
export class WorkoutFormComponent {
  // Form state as signals
  workoutName = signal('');
  targetSets = signal(3);
  targetReps = signal(10);
  
  // Computed validation
  isValid = computed(() => {
    return this.workoutName().length >= 3 && 
           this.targetSets() > 0 && 
           this.targetReps() > 0;
  });
  
  errors = computed(() => {
    const errors: string[] = [];
    if (this.workoutName().length < 3) errors.push('Name must be at least 3 characters');
    if (this.targetSets() <= 0) errors.push('Sets must be positive');
    if (this.targetReps() <= 0) errors.push('Reps must be positive');
    return errors;
  });
}
```

### Reactive Forms with Ionic

```typescript
@Component({
  imports: [ReactiveFormsModule, IonInput, IonItem, IonList, IonButton],
  template: `
    <form [formGroup]="exerciseForm" (ngSubmit)="onSubmit()">
      <ion-list>
        <ion-item>
          <ion-input
            formControlName="name"
            label="Exercise Name"
            labelPlacement="floating"
            fill="outline"
            [errorText]="nameError()"
            [helperText]="'Enter the exercise name'"
          />
        </ion-item>
        
        <ion-item>
          <ion-input
            formControlName="sets"
            type="number"
            label="Sets"
            labelPlacement="floating"
            fill="outline"
            inputmode="numeric"
          />
        </ion-item>
        
        <ion-item>
          <ion-input
            formControlName="reps"
            type="number"
            label="Reps"
            labelPlacement="floating"
            fill="outline"
            inputmode="numeric"
          />
        </ion-item>
        
        <ion-item>
          <ion-input
            formControlName="weight"
            type="number"
            label="Weight (kg)"
            labelPlacement="floating"
            fill="outline"
            inputmode="decimal"
            [counter]="true"
            [maxlength]="5"
          >
            <ion-input-password-toggle slot="end" *ngIf="false" />
          </ion-input>
        </ion-item>
      </ion-list>
      
      <ion-button expand="block" type="submit" [disabled]="!exerciseForm.valid">
        Save Exercise
      </ion-button>
    </form>
  `
})
export class ExerciseFormComponent {
  private fb = inject(FormBuilder);
  
  exerciseForm = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    sets: [3, [Validators.required, Validators.min(1), Validators.max(20)]],
    reps: [10, [Validators.required, Validators.min(1), Validators.max(100)]],
    weight: [0, [Validators.min(0)]]
  });
  
  nameError = computed(() => {
    const ctrl = this.exerciseForm.controls.name;
    if (ctrl.hasError('required') && ctrl.touched) return 'Name is required';
    if (ctrl.hasError('minlength')) return 'Name must be at least 3 characters';
    return '';
  });
  
  onSubmit() {
    if (this.exerciseForm.valid) {
      const exercise = this.exerciseForm.value;
      // Save exercise
    }
  }
}
```

### Custom ControlValueAccessor

```typescript
@Component({
  selector: 'fit-weight-selector',
  providers: [{
    provide: NG_VALUE_ACCESSOR,
    useExisting: forwardRef(() => WeightSelectorComponent),
    multi: true
  }],
  template: `
    <div class="weight-selector">
      <ion-button fill="clear" (click)="decrease()">
        <ion-icon name="remove" />
      </ion-button>
      <span>{{ value() }} kg</span>
      <ion-button fill="clear" (click)="increase()">
        <ion-icon name="add" />
      </ion-button>
    </div>
  `
})
export class WeightSelectorComponent implements ControlValueAccessor {
  value = signal(0);
  disabled = signal(false);
  
  private onChange: (value: number) => void = () => {};
  private onTouched: () => void = () => {};
  
  writeValue(value: number): void {
    this.value.set(value || 0);
  }
  
  registerOnChange(fn: (value: number) => void): void {
    this.onChange = fn;
  }
  
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  
  setDisabledState(isDisabled: boolean): void {
    this.disabled.set(isDisabled);
  }
  
  increase() {
    this.value.update(v => v + 2.5);
    this.onChange(this.value());
    this.onTouched();
  }
  
  decrease() {
    this.value.update(v => Math.max(0, v - 2.5));
    this.onChange(this.value());
    this.onTouched();
  }
}
```

---

## HTTP Client & Interceptors

### HTTP Client Configuration

```typescript
// main.ts
bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(
      withFetch(), // Use Fetch API instead of XMLHttpRequest
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        retryInterceptor,
        errorInterceptor,
        loggingInterceptor
      ])
    )
  ]
});
```

### Functional Interceptors

```typescript
// auth.interceptor.ts
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.accessToken();
  
  if (token && !req.url.includes('/auth/')) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }
  
  return next(req);
};

// loading.interceptor.ts
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip for background requests
  if (req.context.get(SKIP_LOADING)) {
    return next(req);
  }
  
  loadingService.show();
  
  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};

// Create context token
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

// Use context
this.http.get('/api/data', {
  context: new HttpContext().set(SKIP_LOADING, true)
});

// retry.interceptor.ts
export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Only retry GET requests
  if (req.method !== 'GET') {
    return next(req);
  }
  
  return next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        return timer(delay);
      },
      resetOnSuccess: true
    })
  );
};

// error.interceptor.ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastCtrl = inject(ToastController);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An error occurred';
      
      switch (error.status) {
        case 401:
          router.navigate(['/auth/login']);
          message = 'Session expired. Please login again.';
          break;
        case 403:
          message = 'You do not have permission to perform this action.';
          break;
        case 404:
          message = 'Resource not found.';
          break;
        case 422:
          message = error.error?.message || 'Validation error.';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
        case 0:
          message = 'Network error. Check your connection.';
          break;
      }
      
      toastCtrl.create({
        message,
        duration: 3000,
        color: 'danger',
        position: 'top'
      }).then(toast => toast.present());
      
      return throwError(() => error);
    })
  );
};

// logging.interceptor.ts
export const loggingInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = performance.now();
  
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event.type === HttpEventType.Response) {
          const duration = performance.now() - startTime;
          console.log(`[HTTP] ${req.method} ${req.url} - ${event.status} (${duration.toFixed(0)}ms)`);
        }
      },
      error: (error) => {
        const duration = performance.now() - startTime;
        console.error(`[HTTP ERROR] ${req.method} ${req.url} - ${error.status} (${duration.toFixed(0)}ms)`);
      }
    })
  );
};
```

---

## Routing, Guards & Resolvers

### Route Configuration

```typescript
// app.routes.ts
export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canMatch: [noAuthGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () => import('./features/onboarding/onboarding.page').then(m => m.OnboardingPage)
  },
  {
    path: 'tabs',
    canActivate: [authGuard, onboardingCompleteGuard],
    loadComponent: () => import('./layout/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'workouts',
        loadChildren: () => import('./features/workouts/workouts.routes').then(m => m.WORKOUTS_ROUTES)
      },
      {
        path: 'workout/:id',
        loadComponent: () => import('./features/workouts/workout-detail/workout-detail.page').then(m => m.WorkoutDetailPage),
        resolve: { workout: workoutResolver }
      },
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'tabs'
  }
];
```

### Functional Guards

```typescript
// auth.guard.ts
export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Wait for auth initialization
  await authService.initialized$.pipe(filter(Boolean), take(1)).toPromise();
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Redirect to login with return URL
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};

// no-auth.guard.ts (redirect authenticated users away from auth pages)
export const noAuthGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (!authService.isAuthenticated()) {
    return true;
  }
  
  return router.createUrlTree(['/tabs/dashboard']);
};

// role.guard.ts
export const roleGuard = (allowedRoles: UserRole[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    
    const userRole = authService.userRole();
    
    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }
    
    return router.createUrlTree(['/unauthorized']);
  };
};

// Usage:
{ path: 'admin', canActivate: [roleGuard(['admin', 'trainer'])] }

// onboarding-complete.guard.ts
export const onboardingCompleteGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.profile()?.onboardingComplete) {
    return true;
  }
  
  return router.createUrlTree(['/onboarding']);
};
```

### Functional Resolvers

```typescript
// workout.resolver.ts
export const workoutResolver: ResolveFn<Workout | null> = async (route) => {
  const workoutService = inject(WorkoutService);
  const workoutId = route.paramMap.get('id');
  
  if (!workoutId) return null;
  
  try {
    return await workoutService.getWorkout(workoutId);
  } catch (error) {
    console.error('Failed to load workout:', error);
    return null;
  }
};

// Access in component
@Component({...})
export class WorkoutDetailPage {
  private route = inject(ActivatedRoute);
  
  workout = toSignal(
    this.route.data.pipe(map(data => data['workout'] as Workout)),
    { initialValue: null }
  );
}
```

---

## Lifecycle Hooks

### Angular Lifecycle Hooks

```typescript
@Component({...})
export class WorkoutPlayerComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  exercise = input.required<Exercise>();
  
  private destroyRef = inject(DestroyRef);
  
  // Called when input properties change
  ngOnChanges(changes: SimpleChanges) {
    if (changes['exercise']) {
      this.resetState();
    }
  }
  
  // Called once after first ngOnChanges
  ngOnInit() {
    this.loadExerciseHistory();
  }
  
  // Called after view is initialized
  ngAfterViewInit() {
    this.focusFirstInput();
  }
  
  // Called before component is destroyed
  ngOnDestroy() {
    this.saveProgress();
  }
  
  constructor() {
    // Alternative to ngOnDestroy using DestroyRef
    this.destroyRef.onDestroy(() => {
      this.cleanup();
    });
  }
}
```

### afterRender and afterNextRender

```typescript
@Component({...})
export class ChartComponent {
  private elementRef = inject(ElementRef);
  
  constructor() {
    // Run after every render
    afterRender(() => {
      this.updateChartDimensions();
    });
    
    // Run only after next render
    afterNextRender(() => {
      this.initializeChart();
    });
  }
}
```

### Ionic Lifecycle Hooks

```typescript
@Component({...})
export class WorkoutPage implements OnInit {
  
  // Angular - one time setup
  ngOnInit() {
    this.setupSubscriptions();
  }
  
  // Ionic - called every time page is about to enter
  ionViewWillEnter() {
    this.refreshData();
  }
  
  // Ionic - called after page has entered
  ionViewDidEnter() {
    this.startTimer();
    this.focusInput();
  }
  
  // Ionic - called when page is about to leave
  ionViewWillLeave() {
    this.pauseTimer();
  }
  
  // Ionic - called after page has left
  ionViewDidLeave() {
    this.saveProgress();
  }
}
```

---

## Host Elements & Styling

### Host Property (Not Decorators)

```typescript
@Component({
  selector: 'fit-workout-card',
  host: {
    'class': 'workout-card',
    '[class.completed]': 'isCompleted()',
    '[class.in-progress]': 'isInProgress()',
    '[attr.role]': '"article"',
    '[attr.aria-label]': 'workout().name',
    '[style.--card-color]': 'workout().color',
    '(click)': 'onClick($event)',
    '(keydown.enter)': 'onEnter($event)',
    '(keydown.space)': 'onSpace($event)'
  },
  template: `...`
})
export class WorkoutCardComponent {
  workout = input.required<Workout>();
  isCompleted = computed(() => this.workout().status === 'completed');
  isInProgress = computed(() => this.workout().status === 'in_progress');
}
```

### Styling with CSS Custom Properties

```typescript
@Component({
  selector: 'fit-exercise-card',
  styles: [`
    :host {
      display: block;
      padding: var(--exercise-card-padding, 16px);
      background: var(--ion-card-background);
      border-radius: var(--exercise-card-radius, 8px);
    }
    
    :host(.completed) {
      opacity: 0.7;
      background: var(--ion-color-success-tint);
    }
    
    :host-context(ion-content.dark) {
      background: var(--ion-background-color-step-100);
    }
  `]
})
```

### ViewEncapsulation

```typescript
@Component({
  encapsulation: ViewEncapsulation.Emulated, // Default - scoped styles
  // ViewEncapsulation.None - global styles (use sparingly)
  // ViewEncapsulation.ShadowDom - true shadow DOM
})
```

---

## Animations

### Angular Animations

```typescript
import { trigger, state, style, animate, transition, query, stagger, group } from '@angular/animations';

@Component({
  animations: [
    // Fade in/out
    trigger('fadeInOut', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('200ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    
    // Slide up
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    
    // Stagger list items
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(15px)' }),
          stagger(50, [
            animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),
    
    // Expand/collapse
    trigger('expandCollapse', [
      state('collapsed', style({ height: '0', overflow: 'hidden' })),
      state('expanded', style({ height: '*', overflow: 'hidden' })),
      transition('collapsed <=> expanded', animate('200ms ease-in-out'))
    ])
  ],
  template: `
    <div [@fadeInOut]>Fading content</div>
    
    <ion-list [@listAnimation]="exercises().length">
      @for (exercise of exercises(); track exercise.id) {
        <ion-item [@slideUp]>{{ exercise.name }}</ion-item>
      }
    </ion-list>
    
    <div [@expandCollapse]="isExpanded() ? 'expanded' : 'collapsed'">
      Expandable content
    </div>
  `
})
```

---

## Ionic 8 Complete Component API

### IonInput (Complete API)

```html
<ion-input
  type="text|password|email|number|search|tel|url|date|time|datetime-local|month|week"
  value="string"
  placeholder="string"
  label="string"
  labelPlacement="floating|stacked|fixed|start|end"
  fill="solid|outline"
  shape="round"
  helperText="string"
  errorText="string"
  counter="true|false"
  counterFormatter="function"
  maxlength="number"
  minlength="number"
  max="number|string"
  min="number|string"
  step="string"
  multiple="true|false"
  pattern="string"
  required="true|false"
  readonly="true|false"
  disabled="true|false"
  clearInput="true|false"
  clearOnEdit="true|false"
  inputmode="none|text|decimal|numeric|tel|search|email|url"
  enterkeyhint="enter|done|go|next|previous|search|send"
  autocomplete="on|off|name|email|..."
  autocorrect="on|off"
  autocapitalize="off|none|on|sentences|words|characters"
  spellcheck="true|false"
  debounce="number"
  (ionInput)="onInput($event)"
  (ionChange)="onChange($event)"
  (ionBlur)="onBlur($event)"
  (ionFocus)="onFocus($event)"
>
  <!-- Password toggle -->
  <ion-input-password-toggle slot="end" />
</ion-input>
```

### IonTextarea (Complete API)

```html
<ion-textarea
  value="string"
  placeholder="string"
  label="string"
  labelPlacement="floating|stacked|fixed|start|end"
  fill="solid|outline"
  shape="round"
  helperText="string"
  errorText="string"
  counter="true|false"
  counterFormatter="function"
  maxlength="number"
  minlength="number"
  rows="number"
  cols="number"
  autoGrow="true|false"
  wrap="hard|soft|off"
  required="true|false"
  readonly="true|false"
  disabled="true|false"
  spellcheck="true|false"
  autocapitalize="off|none|on|sentences|words|characters"
  enterkeyhint="enter|done|go|next|previous|search|send"
  inputmode="none|text|decimal|numeric|tel|search|email|url"
  debounce="number"
  (ionInput)="onInput($event)"
  (ionChange)="onChange($event)"
  (ionBlur)="onBlur($event)"
  (ionFocus)="onFocus($event)"
/>
```

### IonSelect (Complete API)

```html
<ion-select
  value="any"
  placeholder="string"
  label="string"
  labelPlacement="floating|stacked|fixed|start|end"
  fill="solid|outline"
  shape="round"
  interface="alert|popover|action-sheet"
  interfaceOptions="object"
  compareWith="function|string"
  multiple="true|false"
  disabled="true|false"
  cancelText="string"
  okText="string"
  selectedText="string"
  justify="start|end|space-between"
  (ionChange)="onChange($event)"
  (ionCancel)="onCancel($event)"
  (ionDismiss)="onDismiss($event)"
  (ionFocus)="onFocus($event)"
  (ionBlur)="onBlur($event)"
>
  <ion-select-option value="value" disabled="true|false">
    Label
  </ion-select-option>
</ion-select>

<!-- Custom compareWith for objects -->
<ion-select [compareWith]="compareExercises">
  @for (exercise of exercises(); track exercise.id) {
    <ion-select-option [value]="exercise">{{ exercise.name }}</ion-select-option>
  }
</ion-select>

compareExercises = (e1: Exercise, e2: Exercise) => e1?.id === e2?.id;
```

### IonModal (Complete API)

```html
<ion-modal
  [isOpen]="isOpen()"
  [trigger]="'trigger-button-id'"
  [presentingElement]="presentingElement"
  [canDismiss]="canDismissHandler"
  [breakpoints]="[0, 0.25, 0.5, 0.75, 1]"
  [initialBreakpoint]="0.5"
  [backdropBreakpoint]="0.25"
  [handle]="true"
  [handleBehavior]="'cycle'"
  [showBackdrop]="true"
  [backdropDismiss]="true"
  [keyboardClose]="true"
  [animated]="true"
  [cssClass]="'custom-modal'"
  [enterAnimation]="customEnterAnimation"
  [leaveAnimation]="customLeaveAnimation"
  (ionModalDidPresent)="onDidPresent()"
  (ionModalWillPresent)="onWillPresent()"
  (ionModalDidDismiss)="onDidDismiss($event)"
  (ionModalWillDismiss)="onWillDismiss($event)"
  (ionBreakpointDidChange)="onBreakpointChange($event)"
>
  <ng-template>
    <ion-header>
      <ion-toolbar>
        <ion-title>Modal Title</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismissModal()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <!-- Modal content -->
    </ion-content>
  </ng-template>
</ion-modal>

<!-- canDismiss handler -->
canDismissHandler = async (data?: any, role?: string) => {
  if (role === 'gesture' || role === 'backdrop') {
    return this.confirmDiscard();
  }
  return true;
};
```

### IonDatetime (Complete API)

```html
<ion-datetime
  value="string"
  min="string"
  max="string"
  presentation="date|time|date-time|month|year|month-year|time-date"
  locale="string"
  firstDayOfWeek="0-6"
  hourCycle="h12|h23"
  showDefaultTitle="true|false"
  showDefaultButtons="true|false"
  showClearButton="true|false"
  preferWheel="true|false"
  multiple="true|false"
  [highlightedDates]="highlightedDatesCallback"
  [isDateEnabled]="isDateEnabledCallback"
  [titleSelectedDatesFormatter]="formatSelectedDates"
  doneText="string"
  cancelText="string"
  clearText="string"
  disabled="true|false"
  readonly="true|false"
  (ionChange)="onChange($event)"
  (ionCancel)="onCancel($event)"
  (ionFocus)="onFocus($event)"
  (ionBlur)="onBlur($event)"
/>

<!-- Highlighted dates callback -->
highlightedDatesCallback = (isoString: string) => {
  const date = new Date(isoString);
  const workoutDates = this.workoutDates();
  return workoutDates.some(d => d.toDateString() === date.toDateString())
    ? { textColor: '#fff', backgroundColor: '#3880ff' }
    : undefined;
};

<!-- Is date enabled callback -->
isDateEnabledCallback = (isoString: string) => {
  const date = new Date(isoString);
  return date >= new Date(); // Only future dates
};
```

### IonRefresher

```html
<ion-content>
  <ion-refresher
    slot="fixed"
    [pullFactor]="0.5"
    [pullMin]="60"
    [pullMax]="120"
    [closeDuration]="280ms"
    [snapbackDuration]="280ms"
    [disabled]="isRefreshDisabled()"
    (ionRefresh)="handleRefresh($event)"
    (ionPull)="onPull($event)"
    (ionStart)="onStart($event)"
  >
    <ion-refresher-content
      pullingIcon="chevron-down-circle-outline"
      pullingText="Pull to refresh"
      refreshingSpinner="circles"
      refreshingText="Refreshing..."
    />
  </ion-refresher>
  
  <!-- Content -->
</ion-content>

async handleRefresh(event: RefresherCustomEvent) {
  try {
    await this.loadData();
  } finally {
    event.target.complete();
  }
}
```

### IonInfiniteScroll

```html
<ion-content>
  <!-- Content -->
  
  <ion-infinite-scroll
    threshold="100px"
    [disabled]="isInfiniteScrollDisabled()"
    position="bottom"
    (ionInfinite)="loadMore($event)"
  >
    <ion-infinite-scroll-content
      loadingSpinner="bubbles|circles|crescent|dots|lines|lines-small|lines-sharp|lines-sharp-small"
      loadingText="Loading more..."
    />
  </ion-infinite-scroll>
</ion-content>

async loadMore(event: InfiniteScrollCustomEvent) {
  const newItems = await this.loadNextPage();
  this.items.update(current => [...current, ...newItems]);
  
  event.target.complete();
  
  if (newItems.length === 0) {
    event.target.disabled = true;
  }
}
```

### IonItemSliding

```html
<ion-list>
  @for (exercise of exercises(); track exercise.id) {
    <ion-item-sliding #slidingItem>
      <ion-item>
        <ion-label>
          <h2>{{ exercise.name }}</h2>
          <p>{{ exercise.sets }} × {{ exercise.reps }}</p>
        </ion-label>
      </ion-item>
      
      <ion-item-options side="start">
        <ion-item-option color="success" (click)="complete(exercise); slidingItem.close()">
          <ion-icon slot="icon-only" name="checkmark" />
        </ion-item-option>
      </ion-item-options>
      
      <ion-item-options side="end">
        <ion-item-option color="primary" (click)="edit(exercise); slidingItem.close()">
          <ion-icon slot="icon-only" name="create" />
        </ion-item-option>
        <ion-item-option color="danger" expandable (click)="delete(exercise)">
          <ion-icon slot="icon-only" name="trash" />
        </ion-item-option>
      </ion-item-options>
    </ion-item-sliding>
  }
</ion-list>
```

### Toasts, Alerts, Action Sheets

```typescript
// Toast
private toastCtrl = inject(ToastController);

async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
  const toast = await this.toastCtrl.create({
    message,
    duration: 3000,
    position: 'top',
    color,
    buttons: [{ icon: 'close', role: 'cancel' }]
  });
  await toast.present();
}

// Alert
private alertCtrl = inject(AlertController);

async confirmDelete(exercise: Exercise): Promise<boolean> {
  const alert = await this.alertCtrl.create({
    header: 'Delete Exercise',
    message: `Are you sure you want to delete "${exercise.name}"?`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Delete', role: 'destructive', handler: () => true }
    ]
  });
  await alert.present();
  const { role } = await alert.onDidDismiss();
  return role === 'destructive';
}

// Action Sheet
private actionSheetCtrl = inject(ActionSheetController);

async showExerciseOptions(exercise: Exercise) {
  const actionSheet = await this.actionSheetCtrl.create({
    header: exercise.name,
    buttons: [
      { text: 'Edit', icon: 'create', handler: () => this.edit(exercise) },
      { text: 'Duplicate', icon: 'copy', handler: () => this.duplicate(exercise) },
      { text: 'Delete', icon: 'trash', role: 'destructive', handler: () => this.delete(exercise) },
      { text: 'Cancel', icon: 'close', role: 'cancel' }
    ]
  });
  await actionSheet.present();
}
```

---

## Ionic Patterns & Lifecycle

### Platform Detection

```typescript
import { Platform } from '@ionic/angular/standalone';

@Component({...})
export class AppComponent {
  private platform = inject(Platform);
  
  isIOS = this.platform.is('ios');
  isAndroid = this.platform.is('android');
  isMobile = this.platform.is('mobile');
  isDesktop = this.platform.is('desktop');
  isPWA = this.platform.is('pwa');
  isCapacitor = this.platform.is('capacitor');
  
  // Platform ready
  constructor() {
    this.platform.ready().then(() => {
      this.initializeApp();
    });
  }
}
```

### Hardware Back Button

```typescript
import { Platform } from '@ionic/angular/standalone';
import { App } from '@capacitor/app';

@Component({...})
export class AppComponent {
  private platform = inject(Platform);
  
  constructor() {
    this.platform.backButton.subscribeWithPriority(10, async () => {
      if (this.canGoBack()) {
        window.history.back();
      } else {
        const shouldExit = await this.confirmExit();
        if (shouldExit) {
          App.exitApp();
        }
      }
    });
  }
}
```

### Keyboard Handling

```typescript
import { Keyboard } from '@capacitor/keyboard';

@Component({...})
export class ChatComponent {
  keyboardHeight = signal(0);
  
  constructor() {
    Keyboard.addListener('keyboardWillShow', (info) => {
      this.keyboardHeight.set(info.keyboardHeight);
    });
    
    Keyboard.addListener('keyboardWillHide', () => {
      this.keyboardHeight.set(0);
    });
  }
  
  async hideKeyboard() {
    await Keyboard.hide();
  }
}
```

### Gestures

```typescript
import { GestureController, Gesture } from '@ionic/angular/standalone';

@Component({...})
export class SwipeableCardComponent implements AfterViewInit {
  private gestureCtrl = inject(GestureController);
  private elementRef = inject(ElementRef);
  
  private gesture?: Gesture;
  
  ngAfterViewInit() {
    this.gesture = this.gestureCtrl.create({
      el: this.elementRef.nativeElement,
      gestureName: 'swipe-card',
      threshold: 15,
      onStart: () => this.onSwipeStart(),
      onMove: (detail) => this.onSwipeMove(detail),
      onEnd: (detail) => this.onSwipeEnd(detail)
    });
    this.gesture.enable();
  }
  
  ngOnDestroy() {
    this.gesture?.destroy();
  }
  
  private onSwipeMove(detail: GestureDetail) {
    const el = this.elementRef.nativeElement;
    el.style.transform = `translateX(${detail.deltaX}px)`;
  }
}
```

---

## Capacitor 6 Plugin APIs

### App Plugin

```typescript
import { App, URLOpenListenerEvent } from '@capacitor/app';

// App lifecycle
App.addListener('appStateChange', ({ isActive }) => {
  if (isActive) {
    this.onResume();
  } else {
    this.onPause();
  }
});

// Deep links
App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
  const url = new URL(event.url);
  // Handle deep link
});

// Back button (Android)
App.addListener('backButton', ({ canGoBack }) => {
  if (canGoBack) {
    window.history.back();
  } else {
    App.minimizeApp();
  }
});

// App info
const info = await App.getInfo();
// { name, id, build, version }

// Exit/minimize
await App.exitApp();
await App.minimizeApp();
```

### Camera Plugin

```typescript
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';

async takeProgressPhoto(): Promise<string | undefined> {
  const permissions = await Camera.checkPermissions();
  if (permissions.camera !== 'granted') {
    const requested = await Camera.requestPermissions();
    if (requested.camera !== 'granted') {
      throw new Error('Camera permission denied');
    }
  }
  
  const photo: Photo = await Camera.getPhoto({
    quality: 80,
    allowEditing: true,
    resultType: CameraResultType.Uri,
    source: CameraSource.Prompt,
    width: 1080,
    height: 1920,
    correctOrientation: true,
    promptLabelHeader: 'Progress Photo',
    promptLabelPhoto: 'Choose from Gallery',
    promptLabelPicture: 'Take Photo'
  });
  
  return photo.webPath;
}

async pickMultiplePhotos(): Promise<Photo[]> {
  const result = await Camera.pickImages({
    quality: 80,
    limit: 5
  });
  return result.photos;
}
```

### Filesystem Plugin

```typescript
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

// Write file
async saveWorkout(workout: Workout): Promise<void> {
  await Filesystem.writeFile({
    path: `workouts/${workout.id}.json`,
    data: JSON.stringify(workout),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true
  });
}

// Read file
async loadWorkout(id: string): Promise<Workout> {
  const result = await Filesystem.readFile({
    path: `workouts/${id}.json`,
    directory: Directory.Data,
    encoding: Encoding.UTF8
  });
  return JSON.parse(result.data as string);
}

// List directory
async listWorkouts(): Promise<string[]> {
  const result = await Filesystem.readdir({
    path: 'workouts',
    directory: Directory.Data
  });
  return result.files.map(f => f.name);
}

// Delete file
async deleteWorkout(id: string): Promise<void> {
  await Filesystem.deleteFile({
    path: `workouts/${id}.json`,
    directory: Directory.Data
  });
}

// Get URI for file
async getWorkoutUri(id: string): Promise<string> {
  const result = await Filesystem.getUri({
    path: `workouts/${id}.json`,
    directory: Directory.Data
  });
  return result.uri;
}
```

### Haptics Plugin

```typescript
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Impact feedback (button taps)
async onButtonTap() {
  await Haptics.impact({ style: ImpactStyle.Light }); // Light, Medium, Heavy
}

// Notification feedback
async onSetComplete() {
  await Haptics.notification({ type: NotificationType.Success }); // Success, Warning, Error
}

// Vibrate
async onTimerEnd() {
  await Haptics.vibrate({ duration: 500 });
}

// Selection feedback (picker scrolling)
async onPickerChange() {
  await Haptics.selectionChanged();
}
```

### Local Notifications

```typescript
import { LocalNotifications, ScheduleOptions } from '@capacitor/local-notifications';

// Request permission
await LocalNotifications.requestPermissions();

// Schedule notification
async scheduleWorkoutReminder(workout: Workout): Promise<void> {
  await LocalNotifications.schedule({
    notifications: [{
      id: workout.id.hashCode(),
      title: 'Workout Reminder',
      body: `Time for ${workout.name}!`,
      schedule: {
        at: new Date(workout.scheduledTime),
        allowWhileIdle: true
      },
      sound: 'workout_reminder.wav',
      smallIcon: 'ic_stat_workout',
      largeIcon: 'ic_launcher',
      actionTypeId: 'WORKOUT_REMINDER',
      extra: { workoutId: workout.id }
    }]
  });
}

// Handle notification action
LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
  const workoutId = notification.notification.extra?.workoutId;
  if (workoutId) {
    this.router.navigate(['/workout', workoutId]);
  }
});

// Cancel notification
await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });

// Get pending notifications
const pending = await LocalNotifications.getPending();
```

### Push Notifications

```typescript
import { PushNotifications, Token, PushNotificationSchema } from '@capacitor/push-notifications';

// Register for push
async registerPush(): Promise<void> {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;
  
  await PushNotifications.register();
}

// Handle registration
PushNotifications.addListener('registration', (token: Token) => {
  // Send token to server
  this.authService.registerPushToken(token.value);
});

// Handle registration error
PushNotifications.addListener('registrationError', (error) => {
  console.error('Push registration failed:', error);
});

// Handle received notification (foreground)
PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
  this.showInAppNotification(notification);
});

// Handle notification tap
PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
  const data = notification.notification.data;
  this.handleDeepLink(data);
});
```

### Network Plugin

```typescript
import { Network, ConnectionStatus } from '@capacitor/network';

// Get current status
const status = await Network.getStatus();
this.isOnline.set(status.connected);
this.connectionType.set(status.connectionType); // wifi, cellular, none, unknown

// Monitor changes
Network.addListener('networkStatusChange', (status: ConnectionStatus) => {
  this.isOnline.set(status.connected);
  
  if (status.connected) {
    this.syncService.syncPendingChanges();
  }
});
```

### Preferences Plugin

```typescript
import { Preferences } from '@capacitor/preferences';

// Save value
async savePreference(key: string, value: any): Promise<void> {
  await Preferences.set({
    key,
    value: JSON.stringify(value)
  });
}

// Load value
async loadPreference<T>(key: string, defaultValue: T): Promise<T> {
  const { value } = await Preferences.get({ key });
  return value ? JSON.parse(value) : defaultValue;
}

// Remove value
await Preferences.remove({ key: 'user_settings' });

// Clear all
await Preferences.clear();

// Get all keys
const { keys } = await Preferences.keys();
```

### Status Bar Plugin

```typescript
import { StatusBar, Style } from '@capacitor/status-bar';

// Set style
await StatusBar.setStyle({ style: Style.Dark }); // Dark, Light, Default

// Set background color (Android)
await StatusBar.setBackgroundColor({ color: '#3880ff' });

// Show/hide
await StatusBar.show();
await StatusBar.hide();

// Overlay mode
await StatusBar.setOverlaysWebView({ overlay: true });
```

### Splash Screen Plugin

```typescript
import { SplashScreen } from '@capacitor/splash-screen';

// Hide with fade
await SplashScreen.hide({ fadeOutDuration: 500 });

// Show (if auto-hide is disabled)
await SplashScreen.show({
  autoHide: false,
  fadeInDuration: 300,
  fadeOutDuration: 300,
  showDuration: 2000
});
```

### Share Plugin

```typescript
import { Share } from '@capacitor/share';

async shareWorkout(workout: Workout): Promise<void> {
  const canShare = await Share.canShare();
  if (!canShare.value) return;
  
  await Share.share({
    title: workout.name,
    text: `Check out my workout: ${workout.name}`,
    url: `https://fitos.app/workout/${workout.id}`,
    dialogTitle: 'Share Workout'
  });
}
```

### Device Plugin

```typescript
import { Device, DeviceInfo, BatteryInfo } from '@capacitor/device';

// Get device info
const info: DeviceInfo = await Device.getInfo();
// { name, model, platform, operatingSystem, osVersion, manufacturer, isVirtual, webViewVersion }

// Get device ID
const { identifier } = await Device.getId();

// Get battery info
const battery: BatteryInfo = await Device.getBatteryInfo();
// { batteryLevel, isCharging }

// Get language
const { value: languageCode } = await Device.getLanguageCode();
```

---

## Angular Material CDK

### Drag and Drop

```typescript
import { DragDropModule, CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';

@Component({
  imports: [DragDropModule],
  template: `
    <div cdkDropList (cdkDropListDropped)="drop($event)">
      @for (exercise of exercises(); track exercise.id) {
        <div cdkDrag>
          <div class="drag-handle" cdkDragHandle>⠿</div>
          {{ exercise.name }}
          <div *cdkDragPlaceholder class="placeholder"></div>
        </div>
      }
    </div>
  `
})
export class ExerciseListComponent {
  exercises = signal<Exercise[]>([]);
  
  drop(event: CdkDragDrop<Exercise[]>) {
    moveItemInArray(this.exercises(), event.previousIndex, event.currentIndex);
    this.exercises.update(arr => [...arr]); // Trigger reactivity
  }
}
```

### Virtual Scrolling

```typescript
import { ScrollingModule, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';

@Component({
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="72" class="viewport">
      <ion-item *cdkVirtualFor="let workout of workouts(); trackBy: trackWorkout">
        <ion-label>{{ workout.name }}</ion-label>
      </ion-item>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .viewport {
      height: 100%;
    }
  `]
})
export class WorkoutListComponent {
  workouts = signal<Workout[]>([]);
  trackWorkout = (index: number, workout: Workout) => workout.id;
}
```

### Breakpoint Observer

```typescript
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

@Component({...})
export class DashboardComponent {
  private breakpointObserver = inject(BreakpointObserver);
  
  isHandset = toSignal(
    this.breakpointObserver.observe([Breakpoints.Handset]).pipe(
      map(result => result.matches)
    ),
    { initialValue: true }
  );
  
  isTablet = toSignal(
    this.breakpointObserver.observe([Breakpoints.Tablet]).pipe(
      map(result => result.matches)
    ),
    { initialValue: false }
  );
  
  columns = computed(() => {
    if (this.isHandset()) return 1;
    if (this.isTablet()) return 2;
    return 3;
  });
}
```

### A11y (Accessibility)

```typescript
import { A11yModule, FocusTrap, LiveAnnouncer, FocusMonitor } from '@angular/cdk/a11y';

@Component({
  imports: [A11yModule]
})
export class WorkoutModalComponent {
  private liveAnnouncer = inject(LiveAnnouncer);
  private focusMonitor = inject(FocusMonitor);
  
  async onSetComplete(setNumber: number, reps: number, weight: number) {
    await this.liveAnnouncer.announce(
      `Set ${setNumber} completed: ${reps} reps at ${weight} kg`,
      'polite'
    );
  }
  
  ngAfterViewInit() {
    this.focusMonitor.monitor(this.buttonRef).subscribe(origin => {
      if (origin === 'keyboard') {
        this.showKeyboardFocusRing();
      }
    });
  }
}
```

---

## Theming & Dark Mode

### CSS Custom Properties

```css
/* global styles or theme variables */
:root {
  /* Primary brand colors */
  --ion-color-primary: #3880ff;
  --ion-color-primary-rgb: 56, 128, 255;
  --ion-color-primary-contrast: #ffffff;
  --ion-color-primary-shade: #3171e0;
  --ion-color-primary-tint: #4c8dff;
  
  /* Success (completed workouts) */
  --ion-color-success: #2dd36f;
  --ion-color-success-rgb: 45, 211, 111;
  
  /* Warning (attention needed) */
  --ion-color-warning: #ffc409;
  
  /* Danger (errors, destructive) */
  --ion-color-danger: #eb445a;
  
  /* Custom FitOS colors */
  --fit-workout-complete: var(--ion-color-success);
  --fit-workout-in-progress: var(--ion-color-warning);
  --fit-workout-skipped: var(--ion-color-medium);
  
  /* Spacing */
  --fit-spacing-xs: 4px;
  --fit-spacing-sm: 8px;
  --fit-spacing-md: 16px;
  --fit-spacing-lg: 24px;
  --fit-spacing-xl: 32px;
  
  /* Safe areas */
  --ion-safe-area-top: env(safe-area-inset-top);
  --ion-safe-area-bottom: env(safe-area-inset-bottom);
  --ion-safe-area-left: env(safe-area-inset-left);
  --ion-safe-area-right: env(safe-area-inset-right);
}
```

### Dark Mode

```css
/* System preference detection */
@media (prefers-color-scheme: dark) {
  :root {
    --ion-color-primary: #428cff;
    --ion-background-color: #121212;
    --ion-background-color-rgb: 18, 18, 18;
    --ion-text-color: #ffffff;
    --ion-text-color-rgb: 255, 255, 255;
    
    --ion-card-background: #1e1e1e;
    --ion-item-background: #1e1e1e;
    --ion-toolbar-background: #1f1f1f;
    
    /* Step colors for gradients */
    --ion-background-color-step-50: #1e1e1e;
    --ion-background-color-step-100: #2a2a2a;
    --ion-background-color-step-150: #363636;
    --ion-background-color-step-200: #414141;
  }
}

/* Class-based dark mode (for manual toggle) */
body.dark {
  --ion-color-primary: #428cff;
  --ion-background-color: #121212;
  /* ... same as above */
}
```

### Theme Service

```typescript
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
  
  darkMode = signal(this.prefersDark.matches);
  
  constructor() {
    // Listen for system changes
    this.prefersDark.addEventListener('change', (e) => {
      this.setDarkMode(e.matches);
    });
    
    // Load user preference
    this.loadUserPreference();
  }
  
  private async loadUserPreference() {
    const { value } = await Preferences.get({ key: 'darkMode' });
    if (value !== null) {
      this.setDarkMode(value === 'true');
    }
  }
  
  toggleDarkMode() {
    this.setDarkMode(!this.darkMode());
  }
  
  setDarkMode(isDark: boolean) {
    this.darkMode.set(isDark);
    document.body.classList.toggle('dark', isDark);
    
    // Update status bar
    if (Capacitor.isNativePlatform()) {
      StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    }
    
    // Save preference
    Preferences.set({ key: 'darkMode', value: String(isDark) });
  }
}
```

### Platform-Specific Styling

```css
/* iOS specific */
.ios {
  ion-toolbar {
    --padding-top: 12px;
    --padding-bottom: 12px;
  }
}

/* Material Design (Android) */
.md {
  ion-toolbar {
    --padding-top: 8px;
    --padding-bottom: 8px;
  }
  
  ion-button {
    --border-radius: 4px;
  }
}
```

---

## Accessibility (WCAG 2.1 AA)

### ARIA Attributes

```html
<!-- Interactive elements need labels -->
<ion-button aria-label="Start workout" (click)="startWorkout()">
  <ion-icon slot="icon-only" name="play" />
</ion-button>

<!-- Forms need labels and descriptions -->
<ion-input
  label="Weight (kg)"
  aria-describedby="weight-hint"
  [attr.aria-invalid]="weightInvalid()"
  [attr.aria-errormessage]="weightInvalid() ? 'weight-error' : null"
/>
<span id="weight-hint" class="sr-only">Enter the weight in kilograms</span>
<span id="weight-error" *ngIf="weightInvalid()">Weight must be positive</span>

<!-- Lists need roles -->
<ion-list role="list" aria-label="Today's exercises">
  @for (exercise of exercises(); track exercise.id) {
    <ion-item role="listitem">
      {{ exercise.name }}
    </ion-item>
  }
</ion-list>

<!-- Live regions for dynamic content -->
<div 
  aria-live="polite" 
  aria-atomic="true" 
  class="sr-only"
  [attr.aria-label]="announcement()"
>
  {{ announcement() }}
</div>

<!-- Progress indicators -->
<ion-progress-bar
  [value]="progress()"
  role="progressbar"
  [attr.aria-valuenow]="progress() * 100"
  aria-valuemin="0"
  aria-valuemax="100"
  [attr.aria-label]="'Workout progress: ' + (progress() * 100) + '%'"
/>
```

### Focus Management

```typescript
@Component({...})
export class ExerciseFormComponent {
  private firstInput = viewChild<ElementRef>('firstInput');
  
  ngAfterViewInit() {
    // Focus first input when form opens
    this.firstInput()?.nativeElement.focus();
  }
  
  onSave() {
    // Return focus to trigger element after modal closes
    this.savedAnnouncement();
    this.triggerButton?.focus();
  }
}
```

### Color Contrast

```css
/* WCAG AA requires 4.5:1 for normal text, 3:1 for large text */
:root {
  /* These meet 4.5:1 on white */
  --fit-text-primary: #1a1a1a;    /* 12.6:1 */
  --fit-text-secondary: #595959;   /* 7:1 */
  --fit-text-tertiary: #767676;    /* 4.5:1 */
  
  /* These meet 4.5:1 on dark backgrounds */
  --fit-text-on-dark: #ffffff;
  --fit-text-secondary-on-dark: #b3b3b3;
}
```

### Touch Targets

```css
/* Minimum 48x48px touch targets */
.touch-target {
  min-width: 48px;
  min-height: 48px;
  padding: 12px;
}

ion-button {
  --padding-start: 16px;
  --padding-end: 16px;
  min-height: 48px;
}

ion-checkbox, ion-radio, ion-toggle {
  --size: 24px;
  padding: 12px;
}
```

### Reduced Motion

```css
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

### Screen Reader Only Content

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## Performance Optimization

### OnPush Change Detection (Required)

```typescript
// ALL components must use OnPush with signals
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Lazy Loading

```typescript
// Routes
{
  path: 'analytics',
  loadComponent: () => import('./analytics/analytics.page').then(m => m.AnalyticsPage)
}

// Components with @defer
@defer (on viewport) {
  <fit-heavy-chart />
}
```

### TrackBy in @for

```typescript
// Always use track with unique identifier
@for (workout of workouts(); track workout.id) { }

// Only use $index for truly static content
@for (day of weekDays; track $index) { }
```

### Virtual Scrolling for Long Lists

```html
<cdk-virtual-scroll-viewport itemSize="72">
  <ion-item *cdkVirtualFor="let item of items()">{{ item.name }}</ion-item>
</cdk-virtual-scroll-viewport>
```

### Image Optimization

```html
<!-- Use NgOptimizedImage -->
<img ngSrc="/assets/exercise.jpg" width="200" height="200" priority />

<!-- Lazy load below-fold images -->
<img ngSrc="/assets/exercise.jpg" width="200" height="200" loading="lazy" />
```

### Bundle Size

```typescript
// Import only what you need from Ionic
import { IonButton } from '@ionic/angular/standalone'; // ✅
import * as Ionic from '@ionic/angular'; // ❌

// Import specific icons
import { addIcons } from 'ionicons';
import { play, pause, stop } from 'ionicons/icons';
addIcons({ play, pause, stop });
```

---

## Testing Patterns

### Jest Configuration

```javascript
// jest.config.js
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  moduleNameMapper: {
    '@capacitor/(.*)': '<rootDir>/__mocks__/@capacitor/$1',
    '@ionic/angular/standalone': '<rootDir>/__mocks__/@ionic/angular/standalone'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@ionic|@stencil|ionicons)/)'
  ]
};
```

### Testing Signals

```typescript
describe('WorkoutService', () => {
  let service: WorkoutService;
  
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [WorkoutService]
    });
    service = TestBed.inject(WorkoutService);
  });
  
  it('should update workout count', () => {
    expect(service.workoutCount()).toBe(0);
    
    service.addWorkout({ name: 'Squats', sets: 3 });
    
    expect(service.workoutCount()).toBe(1);
  });
  
  it('should compute total volume', () => {
    service.addSet({ reps: 10, weight: 100 });
    service.addSet({ reps: 8, weight: 100 });
    
    expect(service.totalVolume()).toBe(1800);
  });
});
```

### Testing Components with Signals

```typescript
describe('WorkoutCardComponent', () => {
  it('should display workout name', async () => {
    const { fixture } = await render(WorkoutCardComponent, {
      componentInputs: {
        workout: { id: '1', name: 'Leg Day', status: 'scheduled' }
      }
    });
    
    expect(fixture.nativeElement.textContent).toContain('Leg Day');
  });
  
  it('should emit completed event', async () => {
    const completedSpy = jest.fn();
    const { fixture } = await render(WorkoutCardComponent, {
      componentInputs: { workout: mockWorkout },
      componentOutputs: { completed: { emit: completedSpy } as any }
    });
    
    const button = fixture.nativeElement.querySelector('[data-testid="complete-btn"]');
    button.click();
    
    expect(completedSpy).toHaveBeenCalledWith(mockWorkout);
  });
});
```

### Mocking Capacitor Plugins

```typescript
// __mocks__/@capacitor/haptics.ts
export const Haptics = {
  impact: jest.fn().mockResolvedValue(undefined),
  notification: jest.fn().mockResolvedValue(undefined),
  vibrate: jest.fn().mockResolvedValue(undefined),
  selectionStart: jest.fn().mockResolvedValue(undefined),
  selectionChanged: jest.fn().mockResolvedValue(undefined),
  selectionEnd: jest.fn().mockResolvedValue(undefined)
};

export const ImpactStyle = { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' };
export const NotificationType = { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' };
```

### E2E Testing with Playwright

```typescript
// e2e/workout.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workout Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/tabs/dashboard');
  });
  
  test('should complete a workout', async ({ page }) => {
    await page.click('[data-testid="start-workout-btn"]');
    await page.waitForURL(/\/workout\/.+/);
    
    // Complete first exercise
    await page.click('[data-testid="complete-set-btn"]');
    await expect(page.locator('[data-testid="set-1-complete"]')).toBeVisible();
    
    // Complete workout
    await page.click('[data-testid="finish-workout-btn"]');
    await expect(page.locator('[data-testid="workout-summary"]')).toBeVisible();
  });
});
```

---

## Summary Checklist

Before every commit, ensure:

- [ ] All components use `ChangeDetectionStrategy.OnPush`
- [ ] No `standalone: true` in decorators
- [ ] Using `@if`, `@for`, `@switch` (not `*ngIf`, `*ngFor`)
- [ ] Using `signal()`, `computed()`, `effect()` for state
- [ ] Using `input()`, `output()`, `model()` for component I/O
- [ ] Using `inject()` for dependency injection
- [ ] All `@for` loops have `track` expression
- [ ] Ionic components imported individually
- [ ] Forms use `labelPlacement`, `fill`, `helperText`, `errorText`
- [ ] Touch targets are minimum 48x48px
- [ ] ARIA labels on icon-only buttons
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Reduced motion respected
- [ ] Functional guards and interceptors (not class-based)
- [ ] HTTP errors handled with user-friendly messages
- [ ] Loading states for async operations
- [ ] Offline capability considered
- [ ] Dark mode supported
