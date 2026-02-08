# FitOS Master Development Prompt

## Context

FitOS is an AI-native fitness coaching platform built with Angular 21, Ionic 8, Capacitor 8, TypeScript 5.9, and Supabase. It serves 3 user types: Client, Trainer, and Gym Owner.

## Critical Issues to Fix First

1. **Auth bypass**: Users can register as any role and login as any role. The login must validate the user's stored role matches the requested login endpoint.
2. **No role differentiation**: All users see the same features. Each role needs distinct tabs, dashboards, and feature access.
3. **Stubbed data**: Dashboard and many features have hardcoded/empty data instead of real Supabase queries.

## Tech Stack Rules (ALWAYS follow)

### Angular 21 Patterns

- ALWAYS use `ChangeDetectionStrategy.OnPush`
- ALWAYS use Signals (`signal()`, `computed()`, `effect()`, `input()`, `output()`)
- ALWAYS use `inject()` for DI, never constructor injection
- ALWAYS use modern control flow: `@if`, `@for`, `@switch`
- ALWAYS use standalone components with `imports: []`
- NEVER use NgModules, never use `ngOnInit` when `effect()` suffices
- Use `httpResource` for data fetching where appropriate
- Use `linkedSignal` for derived mutable state

### Ionic 8 Patterns

- Use `ion-*` components for all UI (ion-card, ion-list, ion-button, etc.)
- Use `IonModal`, `IonActionSheet` for overlays
- Use `ion-refresher` for pull-to-refresh
- Use `ion-infinite-scroll` for pagination
- Use `ion-skeleton-text` for loading states
- Safe area support via CSS env() for notches

### Design System

- Dark-first design (default dark mode)
- Use `var(--fitos-*)` design tokens, NEVER hardcode colors
- Adherence-neutral: NO red for "over" targets, use amber/yellow
- Glow effects for card depth (Hevy-inspired)
- Sub-10-second interaction goal for all logging actions
- Vibrant accent: `--fitos-accent: #00ff88`

### Supabase Patterns

- All data via `supabase.client.from('table').select()`
- RLS policies enforce data access per role
- Real-time subscriptions for messaging and live data
- Edge Functions for server-side logic
- Generated types from `database.types.ts`

### File Organization

``` git
apps/mobile/src/app/
├── core/services/     # Singleton services (inject pattern)
├── core/guards/       # Route guards
├── features/
│   ├── auth/          # Auth pages
│   ├── client/        # Client-only features (NEW)
│   ├── trainer/       # Trainer-only features (NEW)
│   ├── owner/         # Owner-only features (NEW)
│   ├── workouts/      # Workout features
│   ├── nutrition/     # Nutrition features
│   ├── coaching/      # AI coaching
│   ├── messages/      # Messaging
│   ├── crm/           # CRM (trainer/owner)
│   ├── analytics/     # Analytics
│   ├── settings/      # Settings
│   ├── help/          # Help center
│   └── social/        # Leaderboard
├── shared/            # Shared components
└── layout/            # App shell
```

## Sprint Execution Guide

### Sprint 1: Auth & Role Enforcement

**Task 1.1: Fix Login Role Validation**
In auth.service.ts, after successful signIn(), load the user's profile and check their role. If the login was attempted from /auth/login/trainer but the user's role is 'client', reject with error message "This account is registered as a Client. Please use the Client login."

Implementation:

```typescript
async signIn(email: string, password: string, expectedRole?: UserRole): Promise<void> {
  const { data, error } = await this.supabase.client.auth.signInWithPassword({ email, password });
  if (error) throw error;

  await this.loadProfile(data.user.id);

  if (expectedRole && this._state().profile?.role !== expectedRole) {
    await this.signOut();
    throw new Error(`This account is registered as a ${this._state().profile?.role}. Please use the correct login page.`);
  }
}
```

Update each login page to pass the expected role:

- `/auth/login/client` → passes `expectedRole: 'client'`
- `/auth/login/trainer` → passes `expectedRole: 'trainer'`
- `/auth/login/owner` → passes `expectedRole: 'gym_owner'`

**Task 1.2: Fix Registration to Properly Store Role**
Ensure signUp stores the role in the profile table correctly via the database trigger or direct insert.

```typescript
async signUp(email: string, password: string, fullName: string, role: UserRole): Promise<void> {
  const { data, error } = await this.supabase.client.auth.signUp({ email, password });
  if (error) throw error;

  // Insert profile with role
  const { error: profileError } = await this.supabase.client
    .from('profiles')
    .insert({
      id: data.user!.id,
      email,
      full_name: fullName,
      role,
      created_at: new Date().toISOString()
    });

  if (profileError) throw profileError;
}
```

**Task 1.3: Add Role to JWT Claims**
The custom access token hook (migration 20260125165000) should add user_role to JWT. Verify it works by decoding the token after login.

**Task 1.4: Enhance Route Guards**
Every feature route must have the appropriate role guard. Create a comprehensive guard mapping:

```typescript
// src/app/core/guards/role.guard.ts
export const clientGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.profile()?.role === 'client') {
    return true;
  }

  router.navigate(['/auth/unauthorized']);
  return false;
};

export const trainerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.profile()?.role === 'trainer') {
    return true;
  }

  router.navigate(['/auth/unauthorized']);
  return false;
};

export const trainerOrOwnerGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (['trainer', 'gym_owner'].includes(auth.profile()?.role || '')) {
    return true;
  }

  router.navigate(['/auth/unauthorized']);
  return false;
};
```

Route guard mapping:

- `/tabs/workouts/*` → all roles (but different sub-routes per role)
- `/tabs/nutrition/*` → clientGuard
- `/tabs/clients/*` → trainerOrOwnerGuard
- `/tabs/crm/*` → trainerOrOwnerGuard
- `/tabs/analytics/*` → trainerOrOwnerGuard
- `/tabs/social/*` → all roles

### Sprint 2: Tab Architecture & Navigation

**Task 2.1: Create Role-Specific Tab Configurations**
Instead of one tabs.page.ts with @if conditions, create a tab config service:

```typescript
// src/app/core/services/tab-config.service.ts
import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

export interface TabConfig {
  label: string;
  icon: string;
  route: string;
}

@Injectable({ providedIn: 'root' })
export class TabConfigService {
  private auth = inject(AuthService);

  tabs = computed(() => {
    const role = this.auth.profile()?.role;
    switch (role) {
      case 'client': return this.clientTabs;
      case 'trainer': return this.trainerTabs;
      case 'gym_owner': return this.ownerTabs;
      default: return [];
    }
  });

  private clientTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', route: '/tabs/dashboard' },
    { label: 'Workouts', icon: 'barbell-outline', route: '/tabs/workouts' },
    { label: 'Nutrition', icon: 'nutrition-outline', route: '/tabs/nutrition' },
    { label: 'AI Coach', icon: 'sparkles-outline', route: '/tabs/coaching' },
    { label: 'More', icon: 'ellipsis-horizontal-outline', route: '/tabs/more' },
  ];

  private trainerTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', route: '/tabs/dashboard' },
    { label: 'Clients', icon: 'people-outline', route: '/tabs/clients' },
    { label: 'CRM', icon: 'briefcase-outline', route: '/tabs/crm' },
    { label: 'Analytics', icon: 'bar-chart-outline', route: '/tabs/analytics' },
    { label: 'More', icon: 'ellipsis-horizontal-outline', route: '/tabs/more' },
  ];

  private ownerTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', route: '/tabs/dashboard' },
    { label: 'Gym', icon: 'fitness-outline', route: '/tabs/gym' },
    { label: 'Reports', icon: 'document-outline', route: '/tabs/reports' },
    { label: 'Admin', icon: 'settings-outline', route: '/tabs/admin' },
    { label: 'More', icon: 'ellipsis-horizontal-outline', route: '/tabs/more' },
  ];
}
```

Update tabs.page.ts to use this service:

```typescript
export class TabsPage {
  tabConfig = inject(TabConfigService);

  tabs = this.tabConfig.tabs;
}
```

**Task 2.2: Create Role-Specific Dashboards**
Split the single dashboard.page.ts into 3 separate dashboard components:

- **ClientDashboardPage** - Shows:
  - Today's workout plan with progress
  - Nutrition intake vs. targets (pie chart)
  - Weekly streak indicator
  - Wearable data summary (if connected)
  - Next scheduled workout
  - AI Coach tip of the day

- **TrainerDashboardPage** - Shows:
  - List of assigned clients with status
  - Clients needing attention (missed workouts, messages)
  - Quick actions (create workout, send message)
  - Weekly revenue summary
  - New messages badge

- **OwnerDashboardPage** - Shows:
  - Facility KPIs (active members, check-ins today, avg utilization)
  - Trainer performance overview
  - Revenue overview (30-day summary)
  - Membership growth metrics
  - System health/alerts

Implementation pattern:

```typescript
// src/app/features/client/dashboard/client-dashboard.page.ts
@Component({
  selector: 'fit-client-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonButton],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Dashboard</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher (ionRefresh)="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <ion-skeleton-text animated style="width: 100%; height: 200px" />
      } @else if (todayWorkout()) {
        <ion-card class="workout-card">
          <ion-card-header>
            <ion-card-title>Today's Workout</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <!-- Workout details -->
          </ion-card-content>
        </ion-card>
      }
    </ion-content>
  `
})
export class ClientDashboardPage {
  private auth = inject(AuthService);
  private workoutService = inject(WorkoutService);

  loading = signal(false);
  todayWorkout = computed(() => this.workoutService.todayWorkout());

  refreshData(event: any) {
    this.workoutService.loadTodayWorkout().finally(() => {
      event.target.complete();
    });
  }
}
```

**Task 2.3: Create "More" Tab**
The More tab serves as overflow navigation with role-specific links:

```typescript
// src/app/features/more/more.page.ts
@Component({
  selector: 'fit-more',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>More</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (item of menuItems(); track item.route) {
          <ion-item [routerLink]="item.route">
            <ion-icon [name]="item.icon" slot="start"></ion-icon>
            <ion-label>{{ item.label }}</ion-label>
            <ion-icon name="chevron-forward-outline" slot="end"></ion-icon>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `
})
export class MorePage {
  private auth = inject(AuthService);

  menuItems = computed(() => {
    const role = this.auth.profile()?.role;
    switch (role) {
      case 'client': return [
        { label: 'Messages', icon: 'chatbubble-outline', route: '/tabs/messages' },
        { label: 'Social', icon: 'people-outline', route: '/tabs/social' },
        { label: 'Settings', icon: 'settings-outline', route: '/tabs/settings' },
        { label: 'Help', icon: 'help-circle-outline', route: '/tabs/help' },
      ];
      case 'trainer': return [
        { label: 'Messages', icon: 'chatbubble-outline', route: '/tabs/messages' },
        { label: 'Coach Brain', icon: 'sparkles-outline', route: '/tabs/coach-brain' },
        { label: 'Settings', icon: 'settings-outline', route: '/tabs/settings' },
        { label: 'Help', icon: 'help-circle-outline', route: '/tabs/help' },
      ];
      case 'gym_owner': return [
        { label: 'Messages', icon: 'chatbubble-outline', route: '/tabs/messages' },
        { label: 'Settings', icon: 'settings-outline', route: '/tabs/settings' },
        { label: 'Help', icon: 'help-circle-outline', route: '/tabs/help' },
      ];
      default: return [];
    }
  });
}
```

**Client More Tab Items:**

- Messages - Direct messaging with trainers/clients
- Social - View leaderboard, compete with others
- Settings - Profile, notifications, preferences
- Help - Help center and FAQ

**Trainer More Tab Items:**

- Messages - Direct messaging with clients
- Coach Brain - AI-assisted training recommendations
- Settings - Profile, payment, notifications
- Help - Help center and FAQ

**Owner More Tab Items:**

- Messages - Internal messaging
- Settings - Facility settings, team management
- Help - Help center and FAQ

### Sprint 3: Workout Features

*Task 3.1: Client Workout Dashboard**

- View assigned workouts
- Filter by status (today, upcoming, completed)
- Quick-log current exercise with sub-10-second interaction
- Show exercise progress and form tips
- Mark workout as complete

*Task 3.2: Trainer Workout Creation**

- Create custom workouts from exercise library
- Build workout structure (warm-up, main, cool-down)
- Assign to specific clients or groups
- Set target reps/sets/weight
- Add exercise form cues and tips

*Task 3.3: Workout History & Analytics**

- View completed workout history
- Track personal records (PRs)
- Show volume progression over time
- Generate insights on consistency

### Sprint 4: Nutrition Features

*Task 4.1: Client Nutrition Dashboard**

- Log meals (quick-add common meals)
- View daily macro targets and consumption
- Adherence-neutral progress display (use amber/yellow, not red)
- View suggested meals aligned to targets
- Track water intake

*Task 4.2: Nutrition Library**

- Browse meals by cuisine, prep time
- View macro breakdowns
- Create custom meals/recipes
- Export meal plans

*Task 4.3: Trainer Nutrition Coaching**

- Create customized meal plans for clients
- Monitor client adherence
- Adjust macros based on progress
- Generate nutrition reports

### Sprint 5: Messaging & Real-time Features

*Task 5.1: Messaging Infrastructure**

- Real-time message sync via Supabase subscriptions
- Message threading and search
- File/image sharing
- Message read status

*Task 5.2: Trainer-Client Messaging**

- Dedicated inbox for trainer-client conversations
- Quick message templates for common responses
- Message history with context

*Task 5.3: Group Messaging (Owner)**

- Create facility-wide announcements
- Group messaging for trainer teams

### Sprint 6: AI Coaching Features

*Task 6.1: AI Coach Assistant**

- LLM-powered coaching recommendations
- Form checking via video analysis (if camera available)
- Personalized tips based on performance
- Daily motivational messages

*Task 6.2: Workout Suggestions**

- AI suggests next exercises based on history
- Auto-generate workout plans
- Progressive overload recommendations

### Sprint 7: CRM & Client Management

*Task 7.1: Trainer Client List**

- View all assigned clients
- Filter by goal, status, or engagement level
- Quick actions (message, view progress, assign workout)
- Track client health metrics

*Task 7.2: Owner Facility Management**

- Manage trainers and their assignments
- View facility utilization
- Manage membership tiers
- Attendance tracking

### Sprint 8: Analytics & Reporting

*Task 8.1: Client Analytics**

- Personal progress charts (strength, consistency)
- Body metrics tracking
- Goal achievement tracking
- Export progress reports

*Task 8.2: Trainer Analytics**

- Client outcome metrics
- Revenue and retention analytics
- Performance rankings
- Export client reports

*Task 8.3: Owner Reports**

- Facility KPI dashboard
- Revenue reports
- Trainer performance rankings
- Membership trends

### Sprint 9: Settings & Preferences

*Task 9.1: User Profile Settings**

- Edit profile (name, photo, bio)
- Manage privacy settings
- Notification preferences
- Theme selection (dark/light)

*Task 9.2: Wearable Integration**

- Connect fitness trackers (Fitbit, Apple Watch, Garmin)
- Sync data (steps, calories, heart rate)
- Display wearable data on dashboard

*Task 9.3: Payment & Billing**

- Manage subscription (trainer/owner)
- View payment history
- Update payment method

### Sprint 10: Help Center & Documentation

*Task 10.1: Help Center Search**

- Searchable help articles
- Role-specific filtering
- Related articles suggestions
- Feedback on article usefulness

*Task 10.2: In-App Tutorials**

- First-time user onboarding
- Feature tours
- Video tutorials for complex features

### Sprint 11: Social & Community

*Task 11.1: Leaderboard**

- Global leaderboard (by workout volume, PRs)
- Friend leaderboard
- Filter by timeframe (week, month, all-time)
- Achievement badges

*Task 11.2: Social Feed**

- Share achievements and PRs
- Follow other users
- Like and comment on updates
- Create challenges

### Sprint 12: Polish & Launch

*Task 12.1: Performance Optimization**

- Lazy load feature modules
- Optimize images and assets
- Implement service worker for offline support
- Profile and fix slow operations

*Task 12.2: Testing & QA**

- Unit tests for core services (min 80% coverage)
- Integration tests for auth flows
- E2E tests for critical user journeys
- Manual testing on real devices

*Task 12.3: Deployment**

- Build for iOS and Android
- Configure push notifications
- Setup error tracking (Sentry)
- Create app store listings

## Component Template

Every new component should follow this template:

```typescript
import { Component, ChangeDetectionStrategy, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButton,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonSkeletonText,
  IonIcon,
  IonRefresher,
  IonRefresherContent,
} from '@ionic/angular/standalone';

@Component({
  selector: 'fit-feature-name',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButton,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonSkeletonText,
    IonIcon,
    IonRefresher,
    IonRefresherContent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Feature Name</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <ion-refresher (ionRefresh)="refreshData($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      @if (loading()) {
        <ion-skeleton-text animated style="width: 100%; height: 200px" />
      } @else if (data().length > 0) {
        <ion-list>
          @for (item of data(); track item.id) {
            <ion-item>
              <ion-label>{{ item.name }}</ion-label>
            </ion-item>
          }
        </ion-list>
      } @else {
        <div class="empty-state">
          <p>No data available</p>
        </div>
      }
    </ion-content>
  `,
  styles: [`
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 400px;
      color: var(--fitos-text-secondary);
    }
  `]
})
export class FeatureNamePage {
  private someService = inject(SomeService);

  loading = signal(false);
  data = computed(() => this.someService.data());

  constructor() {
    effect(() => {
      // Called whenever dependencies change
      this.loadData();
    });
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      await this.someService.load();
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  refreshData(event: any): void {
    this.loadData().finally(() => {
      event.target.complete();
    });
  }
}
```

## Service Template

Every service should follow this pattern:

```typescript
import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { SupabaseService } from '../services/supabase.service';
import { AuthService } from './auth.service';

export interface DataItem {
  id: string;
  name: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class FeatureService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  private _data = signal<DataItem[]>([]);
  data = _data.asReadonly();

  private _loading = signal(false);
  loading = _loading.asReadonly();

  private _error = signal<string | null>(null);
  error = _error.asReadonly();

  // Computed values
  itemCount = computed(() => this._data().length);

  constructor() {
    effect(() => {
      // Auto-load when user changes
      if (this.auth.profile()?.id) {
        this.load();
      }
    });
  }

  async load(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      const userId = this.auth.profile()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('feature_table')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this._data.set(data || []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._error.set(message);
      console.error('Failed to load data:', error);
    } finally {
      this._loading.set(false);
    }
  }

  async create(item: Omit<DataItem, 'id' | 'created_at'>): Promise<void> {
    try {
      const userId = this.auth.profile()?.id;
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await this.supabase.client
        .from('feature_table')
        .insert([{ ...item, user_id: userId }])
        .select();

      if (error) throw error;
      if (data?.[0]) {
        this._data.update(items => [data[0] as DataItem, ...items]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._error.set(message);
      throw error;
    }
  }

  async update(id: string, updates: Partial<DataItem>): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('feature_table')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this._data.update(items =>
        items.map(item => (item.id === id ? { ...item, ...updates } : item))
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._error.set(message);
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.supabase.client
        .from('feature_table')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this._data.update(items => items.filter(item => item.id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this._error.set(message);
      throw error;
    }
  }
}
```

## Help Center Article Template

Every feature needs a help center article in `/apps/mobile/src/app/features/help/content/`:

```typescript
// src/app/features/help/content/feature-name.article.ts
export interface HelpArticle {
  id: string;
  title: string;
  category: 'getting-started' | 'workouts' | 'nutrition' | 'business' | 'account' | 'messaging' | 'analytics';
  roles: UserRole[];
  content: string; // Markdown
  relatedArticles: string[];
  videoUrl?: string;
}

export const FEATURE_NAME_ARTICLE: HelpArticle = {
  id: 'feature-name-guide',
  title: 'How to Use Feature Name',
  category: 'workouts',
  roles: ['client', 'trainer'],
  content: `
# How to Use Feature Name

## Overview
This feature helps you [describe the feature purpose].

## Getting Started
1. Navigate to the Feature Name section
2. Click the "Create" button
3. Fill in the required fields
4. Save your changes

## Tips & Tricks
- Tip 1: [useful tip]
- Tip 2: [useful tip]
- Tip 3: [useful tip]

## Troubleshooting
**Issue:** [Common issue]
**Solution:** [How to fix it]

## Learn More
See [Related Article] for more information.
  `,
  relatedArticles: ['getting-started-guide', 'other-feature'],
  videoUrl: 'https://fitos.com/videos/feature-guide'
};
```

## Database Schema Requirements

Every new feature requires appropriate Supabase tables with:

1. **Proper Timestamps**
   - `created_at`: TIMESTAMP with default `now()`
   - `updated_at`: TIMESTAMP with default `now()` and trigger to auto-update

2. **User References**
   - `user_id`: UUID references auth.users (ON DELETE CASCADE)

3. **Role-Based Data**
   - For client data: single `user_id` per record
   - For trainer data: `trainer_id` and `client_id` foreign keys
   - For owner data: `gym_id` reference

4. **RLS Policies** (MANDATORY)
   Every table must have RLS enabled with policies:

   ```sql
   -- Client can see their own data
   CREATE POLICY "Users can view own data"
     ON table_name FOR SELECT
     USING (auth.uid() = user_id);

   -- Trainer can see their clients' data
   CREATE POLICY "Trainers can view client data"
     ON table_name FOR SELECT
     USING (
       EXISTS (
         SELECT 1 FROM coaching_relationships
         WHERE trainer_id = auth.uid()
         AND client_id = table_name.user_id
       )
     );
   ```

## Testing Checklist (Every Feature)

- [ ] Auth: Verify role guard blocks unauthorized access
- [ ] Data Loading: Service loads real Supabase data (not stub)
- [ ] Create: New items save to database correctly
- [ ] Update: Edits persist to database
- [ ] Delete: Deletion removes from database and UI
- [ ] Offline: App doesn't crash when offline
- [ ] Loading States: Skeleton text shows while loading
- [ ] Error Handling: Errors display user-friendly messages
- [ ] Role Differentiation: Each role sees appropriate features
- [ ] Design Tokens: No hardcoded colors, all CSS variables
- [ ] Signals: No BehaviorSubject or RxJS, pure Signals
- [ ] Change Detection: OnPush confirmed in component decorator
- [ ] Accessibility: Proper ARIA labels, screen reader compatible
- [ ] Mobile: Tested on iOS and Android devices
- [ ] Dark Mode: Theme looks good in dark mode
- [ ] 10-Second Rule: Critical actions (logging workout) < 10 seconds
- [ ] Help Center: Help article written and indexed

## Design Token Reference

Use these CSS variables (defined in `globals.css`):

```css
/* Colors */
--fitos-primary: #00ff88;
--fitos-accent: #00ff88;
--fitos-success: #10b981;
--fitos-warning: #f59e0b;  /* Use for "over" targets, not red */
--fitos-danger: #ef4444;
--fitos-info: #3b82f6;

/* Neutrals (Dark Theme) */
--fitos-bg-primary: #0f172a;
--fitos-bg-secondary: #1e293b;
--fitos-bg-tertiary: #334155;
--fitos-text-primary: #f1f5f9;
--fitos-text-secondary: #cbd5e1;
--fitos-text-muted: #94a3b8;
--fitos-border: #475569;

/* Spacing */
--fitos-spacing-xs: 0.25rem;
--fitos-spacing-sm: 0.5rem;
--fitos-spacing-md: 1rem;
--fitos-spacing-lg: 1.5rem;
--fitos-spacing-xl: 2rem;

/* Border Radius */
--fitos-radius-sm: 0.375rem;
--fitos-radius-md: 0.5rem;
--fitos-radius-lg: 0.75rem;

/* Shadows (Glow Effect) */
--fitos-shadow-sm: 0 0 15px rgba(0, 255, 136, 0.1);
--fitos-shadow-md: 0 0 25px rgba(0, 255, 136, 0.15);
--fitos-shadow-lg: 0 0 40px rgba(0, 255, 136, 0.2);
```

## Supabase Types

Always use generated types from `database.types.ts`:

```typescript
import { Database } from '@/database.types';

type TableName = Database['public']['Tables']['table_name']['Row'];
type InsertTableName = Database['public']['Tables']['table_name']['Insert'];
type UpdateTableName = Database['public']['Tables']['table_name']['Update'];
```

## Performance Guidelines

- **Image Optimization**: Use webp format, max 1200px width for mobile
- **Lazy Loading**: Feature modules should be lazy loaded
- **Pagination**: Load 20 items initially, use ion-infinite-scroll for more
- **Caching**: Cache read-only data (exercises, nutrition info) with 24-hour TTL
- **Debouncing**: Search and filter inputs should debounce 300ms
- **Service Worker**: Implement for offline support, cache critical assets

## Common Patterns

### Pull-to-Refresh

```typescript
async refreshData(event: any): Promise<void> {
  await this.service.load();
  event.target.complete();
}
```

### Infinite Scroll

```typescript
async loadMore(event: any): Promise<void> {
  await this.service.loadMore();
  event.target.complete();
}
```

### Real-time Subscription

```typescript
private subscriptions = new Set<Subscription>();

subscribeToUpdates(): void {
  const sub = this.supabase.client
    .from('table_name')
    .on('*', payload => {
      // Handle update
      this.handleRealtimeUpdate(payload);
    })
    .subscribe();

  this.subscriptions.add(sub);
}

ngOnDestroy(): void {
  this.subscriptions.forEach(sub => sub.unsubscribe());
}
```

## Error Handling Best Practices

Always handle three states:

1. **Loading**: Show skeleton text
2. **Error**: Show user-friendly error message with retry button
3. **Success**: Show data

```typescript
@if (loading()) {
  <ion-skeleton-text animated style="width: 100%; height: 200px" />
} @else if (error()) {
  <div class="error-state">
    <ion-icon name="alert-circle-outline"></ion-icon>
    <p>{{ error() }}</p>
    <ion-button (click)="retry()">Retry</ion-button>
  </div>
} @else {
  <!-- Data content -->
}
```

## Quality Checklist (Every PR)

### Code Quality

- [ ] OnPush change detection on all components
- [ ] Signals used exclusively (no BehaviorSubject, Observable chains)
- [ ] inject() used for all dependencies (no constructor DI)
- [ ] Modern control flow (@if, @for, @switch)
- [ ] Standalone components with imports array
- [ ] No NgModules or ngOnInit unless absolutely necessary
- [ ] TypeScript strict mode passes
- [ ] No console.log statements (except for debugging)
- [ ] Error messages are user-friendly

### UI/UX

- [ ] Ionic components used for all UI elements
- [ ] Design tokens used (no hardcoded colors)
- [ ] Adherence-neutral (no red for "over" targets)
- [ ] Dark mode tested and looks good
- [ ] Loading states with skeleton text
- [ ] Error states with retry option
- [ ] 10-second rule for critical actions
- [ ] Accessible ARIA labels and semantic HTML

### Data & Features

- [ ] Real Supabase data (not stubbed)
- [ ] RLS policy created and tested
- [ ] Role guard enforces access control
- [ ] Create/Update/Delete operations persist
- [ ] Real-time updates via subscriptions (if applicable)
- [ ] Offline support (caching/service worker)
- [ ] Pagination/infinite scroll for lists
- [ ] Search and filters implemented

### Testing

- [ ] Manual testing on iOS device
- [ ] Manual testing on Android device
- [ ] Tested with slow network (throttle in DevTools)
- [ ] Tested with no network (offline)
- [ ] All user roles tested
- [ ] Edge cases handled (empty state, errors, max length)
- [ ] Unit tests for services (min 80% coverage)
- [ ] E2E tests for critical user flows

### Documentation

- [ ] Help article written and indexed
- [ ] Code comments for complex logic
- [ ] README updated with new features
- [ ] Commit message describes "why" not just "what"
- [ ] PR description explains changes and testing

### Security & Privacy

- [ ] No sensitive data in logs or console
- [ ] No API keys or secrets in code
- [ ] RLS policies prevent data leakage
- [ ] Input validation on all forms
- [ ] CSRF protection on state-changing operations
- [ ] No hardcoded user IDs or test data

## Deployment Checklist

Before each release:

- [ ] All critical issues resolved
- [ ] Testing checklist 100% complete
- [ ] Help center articles published
- [ ] Performance profiling completed (no jank)
- [ ] Accessibility audit passed
- [ ] Security audit passed
- [ ] Analytics events configured
- [ ] Error tracking configured (Sentry)
- [ ] Release notes written
- [ ] App version bumped (semver)
- [ ] Build runs without warnings
- [ ] iOS build signed and provisioned
- [ ] Android build signed
- [ ] Screenshots and metadata updated for app stores
- [ ] Submission to Apple App Store
- [ ] Submission to Google Play Store

## Debugging Tips

### View Network Requests

Open DevTools (F12 → Network tab) and check Supabase requests for:

- Correct table name
- Correct filters
- RLS errors (401 on should-be-allowed requests)
- Response data structure

### View Console Errors

Open DevTools (F12 → Console tab) for:

- Auth errors
- Service initialization issues
- Signal dependency errors

### Test RLS Policies

Use Supabase dashboard → SQL Editor:

```sql
SELECT * FROM table_name WHERE auth.uid() = 'YOUR_USER_ID';
```

Should return your data if RLS allows it.

### Test Role Logic

In browser console:

```typescript
// Check current user
const auth = ng.probe(document.querySelector('ion-app')).injector.get(AuthService);
console.log(auth.profile());
```

## Git Commit Message Format

Use conventional commits:

``` git
feat: add workout dashboard for clients

- Implement client-specific workout view
- Add real-time workout progress tracking
- Create RLS policies for workout access

Fixes #123
```

Format: `<type>: <description>`

Types:

- `feat:` - New feature
- `fix:` - Bug fix
- `refactor:` - Code reorganization (no behavior change)
- `perf:` - Performance improvement
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Build, CI, etc.

## Resources

- **Angular 21 Docs**: <https://angular.dev>
- **Ionic 8 Docs**: <https://ionicframework.com/docs>
- **Supabase Docs**: <https://supabase.com/docs>
- **TypeScript Handbook**: <https://www.typescriptlang.org/docs>
- **Design System**: See `globals.css` and design tokens above

## Support

For questions or blockers:

1. Check existing code examples in codebase
2. Consult tech stack documentation above
3. Review error messages carefully
4. Check Supabase dashboard for data issues
5. Profile performance with Chrome DevTools

---

**Last Updated**: 2025-02-07
**Maintained By**: FitOS Development Team
