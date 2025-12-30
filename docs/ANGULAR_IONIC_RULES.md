# Angular 21 + Ionic 8 Development Rules & Best Practices

This document provides comprehensive rules and procedures for developing FitOS following the latest Angular 21 and Ionic 8 best practices.

---

## Table of Contents

1. [Angular 21 Core Rules](#angular-21-core-rules)
2. [Signal-First Architecture](#signal-first-architecture)
3. [Component Development](#component-development)
4. [Forms & Validation](#forms--validation)
5. [HTTP & Data Fetching](#http--data-fetching)
6. [Interceptors](#interceptors)
7. [Guards & Resolvers](#guards--resolvers)
8. [Routing & Navigation](#routing--navigation)
9. [Ionic 8 Components](#ionic-8-components)
10. [Ionic Forms Patterns](#ionic-forms-patterns)
11. [PWA Setup](#pwa-setup)
12. [Angular Material Integration](#angular-material-integration)
13. [Animations](#animations)
14. [Performance Optimization](#performance-optimization)
15. [Accessibility (WCAG)](#accessibility-wcag)
16. [AI/LLM Integration](#aillm-integration)

---

## Angular 21 Core Rules

### TypeScript Best Practices

```typescript
// ✅ DO: Use strict type checking
// tsconfig.json should have strict: true

// ✅ DO: Prefer type inference when obvious
const count = signal(0); // Type inferred as WritableSignal<number>

// ✅ DO: Avoid `any` - use `unknown` when type is uncertain
function processData(data: unknown): void {
  if (typeof data === 'string') {
    // Type narrowed to string
  }
}

// ❌ DON'T: Use any
function badExample(data: any): any { }
```

### Standalone Components (Default in Angular 21)

```typescript
// ✅ DO: Create standalone components (default - no need to specify standalone: true)
@Component({
  selector: 'app-my-component',
  imports: [CommonModule, IonContent, IonButton], // Import dependencies directly
  template: `...`
})
export class MyComponent { }

// ❌ DON'T: Set standalone: true (it's the default in Angular 21)
@Component({
  standalone: true, // Not needed!
  ...
})
```

### Modern Control Flow Syntax

```typescript
// ✅ DO: Use modern @if, @for, @switch
@Component({
  template: `
    @if (isLoading()) {
      <ion-spinner />
    } @else if (error()) {
      <ion-text color="danger">{{ error() }}</ion-text>
    } @else {
      @for (item of items(); track item.id) {
        <ion-item>{{ item.name }}</ion-item>
      } @empty {
        <p>No items found</p>
      }
    }

    @switch (status()) {
      @case ('active') {
        <ion-badge color="success">Active</ion-badge>
      }
      @case ('pending') {
        <ion-badge color="warning">Pending</ion-badge>
      }
      @default {
        <ion-badge color="medium">Unknown</ion-badge>
      }
    }
  `
})

// ❌ DON'T: Use legacy structural directives
// *ngIf, *ngFor, *ngSwitch are deprecated
```

### Dependency Injection

```typescript
// ✅ DO: Use inject() function
export class MyComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private http = inject(HttpClient);
}

// ❌ DON'T: Use constructor injection (older pattern)
// constructor(private authService: AuthService) { }
```

---

## Signal-First Architecture

### Basic Signals

```typescript
import { signal, computed, effect } from '@angular/core';

@Component({...})
export class DashboardComponent {
  // Writable signal for state
  count = signal(0);
  
  // Computed signal for derived state
  doubled = computed(() => this.count() * 2);
  isEven = computed(() => this.count() % 2 === 0);
  
  // Effects for side effects (use sparingly)
  constructor() {
    effect(() => {
      console.log(`Count changed: ${this.count()}`);
      // Avoid heavy operations here
    });
  }
  
  increment() {
    this.count.update(c => c + 1);
  }
  
  reset() {
    this.count.set(0);
  }
}
```

### Signal Inputs and Outputs

```typescript
import { input, output, model } from '@angular/core';

@Component({
  selector: 'app-workout-card',
  template: `
    <ion-card>
      <ion-card-title>{{ workout().name }}</ion-card-title>
      <ion-button (click)="onStart()">Start</ion-button>
    </ion-card>
  `
})
export class WorkoutCardComponent {
  // Signal input (replaces @Input decorator)
  workout = input.required<Workout>();
  
  // Optional input with default
  showActions = input(true);
  
  // Two-way binding with model
  isExpanded = model(false);
  
  // Signal output (replaces @Output decorator)
  started = output<Workout>();
  
  onStart() {
    this.started.emit(this.workout());
  }
}

// Usage:
// <app-workout-card [workout]="myWorkout" (started)="handleStart($event)" />
```

### linkedSignal for Derived Writable State

```typescript
import { linkedSignal } from '@angular/core';

@Component({...})
export class FilterComponent {
  items = signal<Item[]>([]);
  
  // Derived but writable - resets when items changes
  selectedItem = linkedSignal(() => this.items()[0]);
  
  selectItem(item: Item) {
    this.selectedItem.set(item);
  }
}
```

### Resource for Async Data

```typescript
import { resource, httpResource } from '@angular/core';

@Component({...})
export class ClientListComponent {
  searchQuery = signal('');
  
  // httpResource for automatic HTTP + signals
  clients = httpResource(() => ({
    url: `/api/clients`,
    params: { search: this.searchQuery() }
  }));
  
  // Or with resource() for custom async
  workouts = resource({
    params: () => ({ clientId: this.selectedClientId() }),
    loader: async ({ params, abortSignal }) => {
      const response = await fetch(`/api/workouts?clientId=${params.clientId}`, {
        signal: abortSignal
      });
      return response.json();
    }
  });
}

// Template usage:
@Component({
  template: `
    @if (clients.isLoading()) {
      <ion-spinner />
    } @else if (clients.hasValue()) {
      @for (client of clients.value(); track client.id) {
        <app-client-card [client]="client" />
      }
    } @else if (clients.error()) {
      <p>Error loading clients</p>
    }
  `
})
```

---

## Component Development

### Component Structure

```typescript
@Component({
  selector: 'app-workout-detail',
  changeDetection: ChangeDetectionStrategy.OnPush, // Always use OnPush
  imports: [
    CommonModule,
    IonContent,
    IonHeader,
    // ... other imports
  ],
  template: `...`, // Prefer inline for small components
  styles: [`...`]  // Prefer inline for small components
})
export class WorkoutDetailComponent implements OnInit {
  // 1. Injected dependencies
  private workoutService = inject(WorkoutService);
  private route = inject(ActivatedRoute);
  
  // 2. Inputs
  workoutId = input.required<string>();
  
  // 3. Outputs
  completed = output<void>();
  
  // 4. State signals
  workout = signal<Workout | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);
  
  // 5. Computed signals
  exerciseCount = computed(() => this.workout()?.exercises.length ?? 0);
  
  // 6. Lifecycle
  ngOnInit() {
    this.loadWorkout();
  }
  
  // 7. Methods
  private async loadWorkout() { }
}
```

### Host Bindings (Not Decorators)

```typescript
// ✅ DO: Use host property in decorator
@Component({
  selector: 'app-button',
  host: {
    'class': 'app-button',
    '[class.disabled]': 'disabled()',
    '[attr.aria-disabled]': 'disabled()',
    '(click)': 'handleClick($event)'
  }
})
export class ButtonComponent {
  disabled = input(false);
  
  handleClick(event: Event) {
    if (this.disabled()) {
      event.preventDefault();
    }
  }
}

// ❌ DON'T: Use @HostBinding / @HostListener decorators
```

---

## Forms & Validation

### Signal Forms (Angular 21 - Experimental but Recommended)

```typescript
import { form, Control, required, email, minLength } from '@angular/forms/signals';

@Component({
  selector: 'app-login',
  imports: [Control],
  template: `
    <form (ngSubmit)="onSubmit()">
      <ion-item>
        <ion-input 
          [control]="loginForm.email"
          label="Email"
          type="email"
        />
      </ion-item>
      
      @if (loginForm.email.errors()?.required) {
        <ion-text color="danger">Email is required</ion-text>
      }
      
      <ion-item>
        <ion-input 
          [control]="loginForm.password"
          label="Password"
          type="password"
        />
      </ion-item>
      
      <ion-button 
        expand="block" 
        type="submit"
        [disabled]="!loginForm.valid()"
      >
        Login
      </ion-button>
    </form>
  `
})
export class LoginComponent {
  // Form model as signal
  loginModel = signal({
    email: '',
    password: ''
  });
  
  // Create form with validation schema
  loginForm = form(this.loginModel, (path) => [
    required(path.email),
    email(path.email),
    required(path.password),
    minLength(path.password, 8)
  ]);
  
  onSubmit() {
    if (this.loginForm.valid()) {
      const { email, password } = this.loginModel();
      // Submit logic
    }
  }
}
```

### Reactive Forms (Current Stable)

```typescript
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';

@Component({
  imports: [ReactiveFormsModule, IonInput, IonItem],
  template: `
    <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
      <ion-item>
        <ion-input
          formControlName="email"
          label="Email"
          labelPlacement="floating"
          type="email"
          [errorText]="emailErrorText()"
        />
      </ion-item>
      
      <ion-item>
        <ion-input
          formControlName="password"
          label="Password"
          labelPlacement="floating"
          type="password"
          [helperText]="'At least 8 characters'"
          [errorText]="passwordErrorText()"
        />
      </ion-item>
    </form>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  
  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['']
  }, {
    validators: this.passwordMatchValidator
  });
  
  emailErrorText = computed(() => {
    const ctrl = this.registerForm.controls.email;
    if (ctrl.hasError('required')) return 'Email is required';
    if (ctrl.hasError('email')) return 'Invalid email format';
    return '';
  });
  
  passwordErrorText = computed(() => {
    const ctrl = this.registerForm.controls.password;
    if (ctrl.hasError('required')) return 'Password is required';
    if (ctrl.hasError('minlength')) return 'Password must be at least 8 characters';
    return '';
  });
  
  private passwordMatchValidator(group: FormGroup): ValidationErrors | null {
    const password = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { mismatch: true };
  }
}
```

---

## HTTP & Data Fetching

### HttpResource (Recommended for Angular 21)

```typescript
import { httpResource } from '@angular/core';

@Component({...})
export class ExerciseLibraryComponent {
  searchTerm = signal('');
  muscleGroup = signal<string | null>(null);
  
  // Reactive HTTP resource - refetches when signals change
  exercises = httpResource(() => ({
    url: '/api/exercises',
    params: {
      search: this.searchTerm(),
      muscle: this.muscleGroup()
    }
  }), {
    // Optional: Parse/validate response
    parse: (data) => ExerciseSchema.array().parse(data)
  });
  
  // httpResource.text() for text responses
  // httpResource.blob() for blob responses
}
```

### Traditional HttpClient with Signals

```typescript
@Injectable({ providedIn: 'root' })
export class WorkoutService {
  private http = inject(HttpClient);
  
  // State
  private _workouts = signal<Workout[]>([]);
  private _loading = signal(false);
  private _error = signal<string | null>(null);
  
  // Public readonly
  readonly workouts = this._workouts.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  
  async loadWorkouts(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);
    
    try {
      const workouts = await firstValueFrom(
        this.http.get<Workout[]>('/api/workouts')
      );
      this._workouts.set(workouts);
    } catch (err) {
      this._error.set('Failed to load workouts');
    } finally {
      this._loading.set(false);
    }
  }
}
```

---

## Interceptors

### Functional Interceptors (Recommended)

```typescript
// core/interceptors/auth.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

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
```

```typescript
// core/interceptors/error.interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const toastCtrl = inject(ToastController);
  
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let message = 'An error occurred';
      
      switch (error.status) {
        case 401:
          message = 'Please log in again';
          router.navigate(['/auth/login']);
          break;
        case 403:
          message = 'You do not have permission';
          break;
        case 404:
          message = 'Resource not found';
          break;
        case 500:
          message = 'Server error. Please try again later.';
          break;
      }
      
      // Show toast
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
```

```typescript
// core/interceptors/retry.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { retry, timer } from 'rxjs';

export const retryInterceptor: HttpInterceptorFn = (req, next) => {
  // Don't retry POST, PUT, DELETE
  if (req.method !== 'GET') {
    return next(req);
  }
  
  return next(req).pipe(
    retry({
      count: 3,
      delay: (error, retryCount) => {
        // Exponential backoff
        const delayMs = Math.pow(2, retryCount) * 1000;
        console.log(`Retrying request (${retryCount}/3) after ${delayMs}ms`);
        return timer(delayMs);
      },
      resetOnSuccess: true
    })
  );
};
```

```typescript
// core/interceptors/loading.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from '../services/loading.service';

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loadingService = inject(LoadingService);
  
  // Skip for background requests
  if (req.headers.has('X-Skip-Loading')) {
    return next(req);
  }
  
  loadingService.show();
  
  return next(req).pipe(
    finalize(() => loadingService.hide())
  );
};
```

```typescript
// core/interceptors/analytics.interceptor.ts
import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { tap } from 'rxjs';

export const analyticsInterceptor: HttpInterceptorFn = (req, next) => {
  const startTime = performance.now();
  
  return next(req).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          const duration = performance.now() - startTime;
          console.log(`[HTTP] ${req.method} ${req.url} - ${duration.toFixed(2)}ms`);
          
          // Send to analytics service
          // analyticsService.trackApiCall({ url, method, duration, status });
        }
      }
    })
  );
};
```

### Register Interceptors

```typescript
// app.config.ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { 
  authInterceptor, 
  errorInterceptor, 
  retryInterceptor,
  loadingInterceptor,
  analyticsInterceptor 
} from './core/interceptors';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        authInterceptor,
        loadingInterceptor,
        retryInterceptor,
        analyticsInterceptor,
        errorInterceptor // Error handler should be last
      ])
    )
  ]
};
```

---

## Guards & Resolvers

### Functional Guards

```typescript
// core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  // Wait for auth to initialize
  await authService.waitForInitialization();
  
  if (authService.isAuthenticated()) {
    return true;
  }
  
  // Store intended destination
  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
```

```typescript
// core/guards/role.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const trainerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isTrainer()) {
    return true;
  }
  
  // Redirect non-trainers to client dashboard
  return router.createUrlTree(['/tabs/dashboard']);
};

export const clientGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isClient()) {
    return true;
  }
  
  return router.createUrlTree(['/tabs/dashboard']);
};
```

```typescript
// core/guards/onboarding.guard.ts
export const onboardingCompleteGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  await authService.waitForInitialization();
  
  const profile = authService.profile();
  
  if (profile?.onboardingComplete) {
    return true;
  }
  
  return router.createUrlTree(['/onboarding']);
};
```

### Functional Resolvers

```typescript
// core/resolvers/workout.resolver.ts
import { ResolveFn } from '@angular/router';
import { inject } from '@angular/core';
import { WorkoutService } from '../services/workout.service';
import { Workout } from '@fitos/shared';

export const workoutResolver: ResolveFn<Workout | null> = async (route) => {
  const workoutService = inject(WorkoutService);
  const workoutId = route.paramMap.get('id');
  
  if (!workoutId) return null;
  
  try {
    return await workoutService.getById(workoutId);
  } catch (error) {
    console.error('Failed to load workout', error);
    return null;
  }
};

// Usage in routes:
{
  path: 'workout/:id',
  component: WorkoutDetailComponent,
  resolve: { workout: workoutResolver }
}

// In component:
private route = inject(ActivatedRoute);
workout = toSignal(this.route.data.pipe(map(d => d['workout'])));
```

---

## Routing & Navigation

### Route Configuration

```typescript
// app.routes.ts
import { Routes } from '@angular/router';
import { authGuard, onboardingCompleteGuard, trainerGuard } from './core/guards';
import { workoutResolver, clientResolver } from './core/resolvers';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full'
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
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
    loadComponent: () => import('./features/tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.page').then(m => m.DashboardPage)
      },
      {
        path: 'clients',
        canActivate: [trainerGuard],
        loadChildren: () => import('./features/clients/clients.routes').then(m => m.CLIENTS_ROUTES)
      },
      {
        path: 'workouts',
        loadChildren: () => import('./features/workouts/workouts.routes').then(m => m.WORKOUTS_ROUTES)
      }
    ]
  }
];
```

---

## Ionic 8 Components

### Component Imports (Standalone)

```typescript
// Always import Ionic components individually
import {
  IonContent,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonBadge,
  IonAvatar,
  IonProgressBar,
  IonToggle,
  IonCheckbox,
  IonRadio,
  IonRadioGroup,
  IonRange,
  IonDatetime,
  IonModal,
  IonAlert,
  IonToast,
  IonLoading,
  IonActionSheet,
  IonFab,
  IonFabButton,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonBackButton,
  IonButtons,
  IonMenuButton,
  IonMenu,
  IonSplitPane,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  IonReorderGroup,
  IonReorder,
  IonItemSliding,
  IonItemOptions,
  IonItemOption
} from '@ionic/angular/standalone';
```

### Icons Setup

```typescript
import { addIcons } from 'ionicons';
import {
  homeOutline,
  home,
  barbellOutline,
  barbell,
  nutritionOutline,
  nutrition,
  personOutline,
  person,
  settingsOutline,
  settings,
  addOutline,
  add,
  checkmarkOutline,
  checkmark,
  closeOutline,
  close,
  trashOutline,
  trash,
  createOutline,
  create,
  chevronForward,
  chevronBack,
  timeOutline,
  time
} from 'ionicons/icons';

// In component constructor or ngOnInit
addIcons({
  homeOutline,
  home,
  barbellOutline,
  barbell,
  // ... etc
});
```

### Responsive Grid Layout

```typescript
@Component({
  template: `
    <ion-content>
      <ion-grid>
        <ion-row>
          <!-- Full width on mobile, half on tablet, third on desktop -->
          <ion-col size="12" sizeMd="6" sizeLg="4">
            <ion-card>
              <!-- Card content -->
            </ion-card>
          </ion-col>
          
          <!-- Responsive stat cards -->
          <ion-col size="6" sizeMd="4" sizeLg="3">
            <ion-card class="stat-card">
              <!-- Stat content -->
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>
    </ion-content>
  `,
  styles: [`
    ion-grid {
      --ion-grid-padding: 8px;
      
      @media (min-width: 768px) {
        --ion-grid-padding: 16px;
        max-width: 1200px;
        margin: 0 auto;
      }
    }
    
    ion-card {
      margin: 0;
      height: 100%;
    }
  `]
})
```

---

## Ionic Forms Patterns

### Input with Validation

```typescript
@Component({
  template: `
    <ion-list>
      <ion-item>
        <ion-input
          label="Email"
          labelPlacement="floating"
          type="email"
          placeholder="you@example.com"
          [value]="email()"
          (ionInput)="onEmailChange($event)"
          [class.ion-invalid]="emailTouched() && !isEmailValid()"
          [class.ion-touched]="emailTouched()"
          [errorText]="emailError()"
          [helperText]="'Enter your email address'"
        />
      </ion-item>
      
      <ion-item>
        <ion-input
          label="Password"
          labelPlacement="floating"
          type="password"
          [value]="password()"
          (ionInput)="onPasswordChange($event)"
          [counter]="true"
          [maxlength]="50"
          [class.ion-invalid]="passwordTouched() && !isPasswordValid()"
          [class.ion-touched]="passwordTouched()"
          [errorText]="passwordError()"
        >
          <ion-input-password-toggle slot="end" />
        </ion-input>
      </ion-item>
    </ion-list>
  `
})
export class LoginFormComponent {
  email = signal('');
  password = signal('');
  emailTouched = signal(false);
  passwordTouched = signal(false);
  
  isEmailValid = computed(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.email());
  });
  
  isPasswordValid = computed(() => this.password().length >= 8);
  
  emailError = computed(() => {
    if (!this.emailTouched()) return '';
    if (!this.email()) return 'Email is required';
    if (!this.isEmailValid()) return 'Invalid email format';
    return '';
  });
  
  passwordError = computed(() => {
    if (!this.passwordTouched()) return '';
    if (!this.password()) return 'Password is required';
    if (!this.isPasswordValid()) return 'Password must be at least 8 characters';
    return '';
  });
  
  onEmailChange(event: CustomEvent) {
    this.email.set(event.detail.value ?? '');
    this.emailTouched.set(true);
  }
  
  onPasswordChange(event: CustomEvent) {
    this.password.set(event.detail.value ?? '');
    this.passwordTouched.set(true);
  }
}
```

### Select with Options

```typescript
@Component({
  template: `
    <ion-item>
      <ion-select
        label="Muscle Group"
        labelPlacement="floating"
        [value]="selectedMuscle()"
        (ionChange)="onMuscleChange($event)"
        interface="action-sheet"
      >
        @for (muscle of muscleGroups; track muscle.value) {
          <ion-select-option [value]="muscle.value">
            {{ muscle.label }}
          </ion-select-option>
        }
      </ion-select>
    </ion-item>
  `
})
export class MuscleSelectComponent {
  selectedMuscle = signal('');
  
  muscleGroups = [
    { value: 'chest', label: 'Chest' },
    { value: 'back', label: 'Back' },
    { value: 'shoulders', label: 'Shoulders' },
    { value: 'legs', label: 'Legs' },
    { value: 'arms', label: 'Arms' },
    { value: 'core', label: 'Core' }
  ];
  
  onMuscleChange(event: CustomEvent) {
    this.selectedMuscle.set(event.detail.value);
  }
}
```

---

## PWA Setup

### Add PWA Support

```bash
ng add @angular/pwa
```

### Configure Service Worker (ngsw-config.json)

```json
{
  "$schema": "./node_modules/@angular/service-worker/config/schema.json",
  "index": "/index.html",
  "assetGroups": [
    {
      "name": "app",
      "installMode": "prefetch",
      "resources": {
        "files": [
          "/favicon.ico",
          "/index.html",
          "/*.css",
          "/*.js"
        ]
      }
    },
    {
      "name": "assets",
      "installMode": "lazy",
      "updateMode": "prefetch",
      "resources": {
        "files": [
          "/assets/**",
          "/*.(svg|cur|jpg|jpeg|png|apng|webp|gif|otf|ttf|woff|woff2)"
        ]
      }
    }
  ],
  "dataGroups": [
    {
      "name": "api-performance",
      "urls": ["/api/exercises/**", "/api/workouts/**"],
      "cacheConfig": {
        "maxSize": 100,
        "maxAge": "1h",
        "timeout": "10s",
        "strategy": "performance"
      }
    },
    {
      "name": "api-freshness",
      "urls": ["/api/clients/**", "/api/messages/**"],
      "cacheConfig": {
        "maxSize": 50,
        "maxAge": "5m",
        "timeout": "5s",
        "strategy": "freshness"
      }
    }
  ]
}
```

### Web App Manifest (manifest.webmanifest)

```json
{
  "name": "FitOS - Fitness Coach OS",
  "short_name": "FitOS",
  "theme_color": "#3880ff",
  "background_color": "#ffffff",
  "display": "standalone",
  "orientation": "portrait-primary",
  "scope": "/",
  "start_url": "/",
  "icons": [
    {
      "src": "assets/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable any"
    },
    {
      "src": "assets/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable any"
    }
  ]
}
```

### Update Handling Service

```typescript
import { Injectable, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';
import { AlertController } from '@ionic/angular/standalone';

@Injectable({ providedIn: 'root' })
export class UpdateService {
  private swUpdate = inject(SwUpdate);
  private alertCtrl = inject(AlertController);
  
  initUpdateListener() {
    if (!this.swUpdate.isEnabled) return;
    
    this.swUpdate.versionUpdates
      .pipe(filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'))
      .subscribe(async () => {
        const alert = await this.alertCtrl.create({
          header: 'Update Available',
          message: 'A new version of FitOS is available. Would you like to update now?',
          buttons: [
            { text: 'Later', role: 'cancel' },
            { 
              text: 'Update', 
              handler: () => {
                window.location.reload();
              }
            }
          ]
        });
        await alert.present();
      });
  }
  
  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) return false;
    return this.swUpdate.checkForUpdate();
  }
}
```

---

## Angular Material Integration

### When to Use Angular Material

Use Angular Material for components NOT available in Ionic:
- Complex data tables (mat-table)
- Date range pickers
- Steppers
- Tree views
- Autocomplete with complex filtering

### Setup

```bash
ng add @angular/material
```

### Using Material Components with Ionic

```typescript
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';

@Component({
  imports: [
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    IonContent,
    IonHeader
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Client Reports</ion-title>
      </ion-toolbar>
    </ion-header>
    
    <ion-content>
      <table mat-table [dataSource]="dataSource" matSort>
        <ng-container matColumnDef="name">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Name</th>
          <td mat-cell *matCellDef="let client">{{ client.name }}</td>
        </ng-container>
        
        <ng-container matColumnDef="workouts">
          <th mat-header-cell *matHeaderCellDef mat-sort-header>Workouts</th>
          <td mat-cell *matCellDef="let client">{{ client.workoutCount }}</td>
        </ng-container>
        
        <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
        <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
      </table>
      
      <mat-paginator 
        [pageSizeOptions]="[10, 25, 50]" 
        showFirstLastButtons
      />
    </ion-content>
  `
})
```

---

## Animations

### Angular Animations

```typescript
import { trigger, transition, style, animate, query, stagger } from '@angular/animations';

@Component({
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    
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
    
    trigger('slideInOut', [
      transition(':enter', [
        style({ transform: 'translateX(100%)' }),
        animate('200ms ease-out', style({ transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ transform: 'translateX(-100%)' }))
      ])
    ])
  ],
  template: `
    <div [@fadeInUp] class="header">...</div>
    
    <ion-list [@listAnimation]="workouts().length">
      @for (workout of workouts(); track workout.id) {
        <ion-item>{{ workout.name }}</ion-item>
      }
    </ion-list>
  `
})
```

### Ionic Page Transitions

```typescript
// In routing module
import { IonicRouteStrategy } from '@ionic/angular';
import { RouteReuseStrategy } from '@angular/router';

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // ...
  ]
};
```

---

## Performance Optimization

### OnPush Change Detection (Required)

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush
})
```

### Track By in Loops

```typescript
// Already built into @for
@for (item of items(); track item.id) { }
```

### Lazy Loading

```typescript
// Routes are already lazy loaded
{
  path: 'workouts',
  loadChildren: () => import('./features/workouts/workouts.routes').then(m => m.WORKOUTS_ROUTES)
}
```

### Defer Loading

```typescript
@Component({
  template: `
    @defer (on viewport) {
      <app-heavy-chart [data]="chartData()" />
    } @loading {
      <ion-skeleton-text [animated]="true" />
    } @placeholder {
      <div class="chart-placeholder">Loading chart...</div>
    }
  `
})
```

### Virtual Scrolling

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@Component({
  imports: [ScrollingModule],
  template: `
    <cdk-virtual-scroll-viewport itemSize="72" class="exercise-list">
      <ion-item *cdkVirtualFor="let exercise of exercises()">
        {{ exercise.name }}
      </ion-item>
    </cdk-virtual-scroll-viewport>
  `,
  styles: [`
    .exercise-list {
      height: 400px;
    }
  `]
})
```

---

## Accessibility (WCAG)

### Required Practices

```typescript
@Component({
  template: `
    <!-- Use semantic HTML -->
    <main>
      <header>
        <h1>Workout Builder</h1>
      </header>
      
      <section aria-labelledby="exercises-heading">
        <h2 id="exercises-heading">Exercises</h2>
        
        <!-- Proper labels for inputs -->
        <ion-input
          label="Exercise Name"
          labelPlacement="floating"
          aria-describedby="exercise-name-hint"
        />
        <span id="exercise-name-hint" class="visually-hidden">
          Enter the exercise name
        </span>
        
        <!-- Icon buttons need labels -->
        <ion-button aria-label="Add exercise">
          <ion-icon slot="icon-only" name="add-outline" aria-hidden="true" />
        </ion-button>
        
        <!-- Progress indicators -->
        <ion-progress-bar
          [value]="progress()"
          [attr.aria-valuenow]="progress() * 100"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label="Workout completion progress"
        />
        
        <!-- Live regions for dynamic content -->
        <div 
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          @if (savedMessage()) {
            {{ savedMessage() }}
          }
        </div>
      </section>
    </main>
  `,
  styles: [`
    .visually-hidden {
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
  `]
})
```

### Color Contrast

```scss
// Use Ionic's color system which meets WCAG AA
// Avoid red for "over target" (per FitOS design principles)
// Use --ion-color-primary, --ion-color-success, etc.
```

---

## AI/LLM Integration

### Angular MCP Server Setup

Create `.vscode/mcp.json`:

```json
{
  "servers": {
    "angular-cli": {
      "command": "npx",
      "args": ["-y", "@angular/cli", "mcp"]
    }
  }
}
```

### Available MCP Tools

- `get_best_practices` - Retrieves Angular best practices
- `search_documentation` - Searches angular.dev
- `list_projects` - Lists Angular workspace projects
- `find_examples` - Finds code examples
- `onpush_zoneless_migration` - Migration help

### LLM Context Files

The Angular team provides:
- `https://angular.dev/llms.txt` - Index of resources
- `https://angular.dev/assets/context/llms-full.txt` - Full context

---

## File Naming Conventions

```
feature-name/
├── pages/
│   └── feature-name/
│       ├── feature-name.page.ts
│       ├── feature-name.page.html (if separate)
│       └── feature-name.page.scss (if separate)
├── components/
│   └── feature-component/
│       └── feature-component.component.ts
├── services/
│   └── feature.service.ts
├── guards/
│   └── feature.guard.ts
├── resolvers/
│   └── feature.resolver.ts
├── interceptors/
│   └── feature.interceptor.ts
└── feature.routes.ts
```

---

## Data Display Policy

### CRITICAL: No Hardcoded or "Made Up" Data

**NEVER use hardcoded or placeholder data in the UI:**

```typescript
// ❌ DON'T: Use hardcoded/fake data
<ion-text>{{ 'John Doe' }}</ion-text>
<ion-text>{{ '5 workouts' }}</ion-text>
<ion-text>{{ 150 }} lbs</ion-text>

// ✅ DO: Use real data from backend or show appropriate defaults
<ion-text>{{ clientName() || '--' }}</ion-text>
<ion-text>{{ workoutCount() || 0 }}</ion-text>
<ion-text>{{ weight() ? weight() + ' lbs' : 'N/A' }}</ion-text>

// ✅ DO: Use loading/empty states
@if (isLoading()) {
  <ion-skeleton-text />
} @else if (data()) {
  <ion-text>{{ data() }}</ion-text>
} @else {
  <ion-text color="medium">--</ion-text>
}
```

**Guidelines:**
- Use `0` for numeric values when no data exists
- Use `'--'` for text fields when no data exists
- Use `'N/A'` for optional fields when appropriate
- Use loading skeletons while data is being fetched
- Never use fake names, dates, or values

---

## Summary Checklist

- [ ] All components use `changeDetection: ChangeDetectionStrategy.OnPush`
- [ ] No `standalone: true` in decorators (it's the default)
- [ ] Use `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- [ ] Use `signal()`, `computed()`, `effect()` for state
- [ ] Use `input()`, `output()`, `model()` instead of decorators
- [ ] Use `inject()` instead of constructor injection
- [ ] Use functional interceptors
- [ ] Use functional guards and resolvers
- [ ] All forms accessible (WCAG AA compliant)
- [ ] All icons have `aria-hidden="true"` or proper labels
- [ ] Use httpResource for reactive data fetching
- [ ] Implement error handling interceptor
- [ ] Implement retry interceptor for GET requests
- [ ] Configure PWA with service worker
- [ ] Use Ionic Grid for responsive layouts
- [ ] NEVER use hardcoded/fake data - use real data or appropriate defaults (0, '--', 'N/A')
