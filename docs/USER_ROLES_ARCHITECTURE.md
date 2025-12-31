# FitOS User Roles & Dashboards Architecture

## Overview

Based on comprehensive competitive analysis of ABC Trainerize, PT Distinction, TrueCoach, and others, FitOS needs to support multiple user types with role-specific dashboards and features. This document defines each user role and their requirements.

---

## User Types

### 1. Client (End User)

The person receiving fitness coaching services.

**Dashboard Features:**
- Today's workout summary with quick start
- Weekly/monthly workout calendar
- Nutrition summary (if tracking)
- Progress metrics (strength, body comp)
- Recent trainer messages
- Upcoming scheduled sessions
- Streak/consistency indicators
- Wearable data summary (if connected)

**Key Screens:**
- Client Dashboard (home)
- Workout player (active workout)
- Workout history
- Nutrition log
- Progress tracking (photos, measurements)
- Messages with trainer
- Profile/settings

### 2. Trainer (Solo/Independent Coach)

Individual personal trainers or coaches managing their own clients.

**Dashboard Features:**
- Client overview grid/list
- Today's scheduled sessions
- Clients needing attention (missed workouts, messages)
- Quick action buttons (assign workout, send message)
- Revenue summary (if payments enabled)
- Unread messages count
- Client activity feed

**Key Screens:**
- Trainer Dashboard (home)
- Client list
- Individual client detail
- Workout builder
- Template library
- Exercise library
- Assign workout
- Message center
- Settings (business profile, payment setup)

### 3. Gym Owner

Owns/operates a fitness facility with multiple trainers.

**Dashboard Features:**
- Facility overview (total clients, active trainers)
- Revenue dashboard
- Trainer performance metrics
- Client satisfaction/retention metrics
- Recent activity across facility
- Pending trainer/client approvals

**Key Screens:**
- Owner Dashboard
- Trainer management
- Client overview (all trainers)
- Revenue reports
- Settings (facility, trainers, branding)

### 4. Gym Staff

Non-trainer staff (front desk, managers) with limited access.

**Dashboard Features:**
- Daily schedule view
- Client check-in
- Message forwarding
- Basic reporting access

**Key Screens:**
- Staff Dashboard
- Schedule view
- Client lookup
- Limited settings

### 5. Admin (System)

Platform administrators (internal Anthropic/FitOS use).

**Dashboard Features:**
- Platform metrics
- User management
- Support tickets
- System health

---

## Role-Based Access Control (RBAC)

```typescript
export type UserRole = 
  | 'client'
  | 'trainer'
  | 'gym_owner'
  | 'gym_staff'
  | 'admin';

export interface RolePermissions {
  // Workout Management
  canCreateWorkouts: boolean;
  canAssignWorkouts: boolean;
  canLogWorkouts: boolean;
  
  // Client Management
  canViewAllClients: boolean;
  canManageOwnClients: boolean;
  canInviteClients: boolean;
  
  // Trainer Management
  canManageTrainers: boolean;
  canViewTrainerMetrics: boolean;
  
  // Financial
  canViewRevenue: boolean;
  canManagePayments: boolean;
  canSetPricing: boolean;
  
  // Nutrition
  canSetNutritionTargets: boolean;
  canLogNutrition: boolean;
  
  // Communication
  canMessageClients: boolean;
  canMessageTrainer: boolean;
  canSendBulkMessages: boolean;
  
  // Reporting
  canViewOwnProgress: boolean;
  canViewClientProgress: boolean;
  canViewFacilityReports: boolean;
  
  // Settings
  canManageFacilitySettings: boolean;
  canManageBranding: boolean;
}

export const rolePermissions: Record<UserRole, RolePermissions> = {
  client: {
    canCreateWorkouts: false,
    canAssignWorkouts: false,
    canLogWorkouts: true,
    canViewAllClients: false,
    canManageOwnClients: false,
    canInviteClients: false,
    canManageTrainers: false,
    canViewTrainerMetrics: false,
    canViewRevenue: false,
    canManagePayments: false,
    canSetPricing: false,
    canSetNutritionTargets: false,
    canLogNutrition: true,
    canMessageClients: false,
    canMessageTrainer: true,
    canSendBulkMessages: false,
    canViewOwnProgress: true,
    canViewClientProgress: false,
    canViewFacilityReports: false,
    canManageFacilitySettings: false,
    canManageBranding: false
  },
  trainer: {
    canCreateWorkouts: true,
    canAssignWorkouts: true,
    canLogWorkouts: true,
    canViewAllClients: false,
    canManageOwnClients: true,
    canInviteClients: true,
    canManageTrainers: false,
    canViewTrainerMetrics: false,
    canViewRevenue: true,
    canManagePayments: true,
    canSetPricing: true,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canMessageClients: true,
    canMessageTrainer: false,
    canSendBulkMessages: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: false,
    canManageFacilitySettings: false,
    canManageBranding: true
  },
  gym_owner: {
    canCreateWorkouts: true,
    canAssignWorkouts: true,
    canLogWorkouts: true,
    canViewAllClients: true,
    canManageOwnClients: true,
    canInviteClients: true,
    canManageTrainers: true,
    canViewTrainerMetrics: true,
    canViewRevenue: true,
    canManagePayments: true,
    canSetPricing: true,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canMessageClients: true,
    canMessageTrainer: true,
    canSendBulkMessages: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: true,
    canManageFacilitySettings: true,
    canManageBranding: true
  },
  gym_staff: {
    canCreateWorkouts: false,
    canAssignWorkouts: false,
    canLogWorkouts: false,
    canViewAllClients: true,
    canManageOwnClients: false,
    canInviteClients: false,
    canManageTrainers: false,
    canViewTrainerMetrics: false,
    canViewRevenue: false,
    canManagePayments: false,
    canSetPricing: false,
    canSetNutritionTargets: false,
    canLogNutrition: false,
    canMessageClients: true,
    canMessageTrainer: true,
    canSendBulkMessages: false,
    canViewOwnProgress: false,
    canViewClientProgress: false,
    canViewFacilityReports: false,
    canManageFacilitySettings: false,
    canManageBranding: false
  },
  admin: {
    // Full access
    canCreateWorkouts: true,
    canAssignWorkouts: true,
    canLogWorkouts: true,
    canViewAllClients: true,
    canManageOwnClients: true,
    canInviteClients: true,
    canManageTrainers: true,
    canViewTrainerMetrics: true,
    canViewRevenue: true,
    canManagePayments: true,
    canSetPricing: true,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canMessageClients: true,
    canMessageTrainer: true,
    canSendBulkMessages: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: true,
    canManageFacilitySettings: true,
    canManageBranding: true
  }
};
```

---

## Navigation Structure

### Client Navigation (Bottom Tabs)

```
[Dashboard] [Workouts] [Nutrition] [Progress] [Messages]
```

### Trainer Navigation (Bottom Tabs + Side Menu)

Bottom Tabs:
```
[Dashboard] [Clients] [Workouts] [Messages] [More]
```

Side Menu (via More):
```
- Exercise Library
- Templates
- Programs
- Settings
- Help & Support
```

### Gym Owner Navigation

Bottom Tabs:
```
[Overview] [Trainers] [Clients] [Reports] [More]
```

Side Menu:
```
- Revenue Dashboard
- Facility Settings
- Branding
- Billing
- Support
```

---

## Dashboard Specifications

### Client Dashboard

```typescript
interface ClientDashboard {
  // Hero Section
  todayWorkout: {
    id: string | null;
    name: string;
    status: 'scheduled' | 'in_progress' | 'completed' | 'skipped';
    estimatedDuration: number;
    exerciseCount: number;
  } | null;
  
  // Stats Row
  stats: {
    weeklyWorkouts: number;
    currentStreak: number;
    weeklyTarget: number;
  };
  
  // Nutrition (if tracking)
  nutrition?: {
    caloriesConsumed: number;
    caloriesTarget: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  
  // Upcoming
  upcomingWorkouts: Array<{
    id: string;
    name: string;
    scheduledDate: Date;
  }>;
  
  // Messages
  unreadMessages: number;
  
  // Wearables
  wearableData?: {
    steps: number;
    restingHR: number;
    sleepHours: number;
    hrv?: number;
  };
}
```

### Trainer Dashboard

```typescript
interface TrainerDashboard {
  // Overview Stats
  stats: {
    totalClients: number;
    activeClients: number;
    sessionsThisWeek: number;
    revenueThisMonth: number;
  };
  
  // Today's Schedule
  todaySchedule: Array<{
    clientId: string;
    clientName: string;
    clientAvatar: string;
    time: string;
    type: 'session' | 'workout_due';
  }>;
  
  // Attention Needed
  needsAttention: Array<{
    clientId: string;
    clientName: string;
    reason: 'missed_workout' | 'unread_message' | 'inactive' | 'goal_achieved';
    daysSince?: number;
  }>;
  
  // Recent Activity
  recentActivity: Array<{
    clientId: string;
    clientName: string;
    action: 'completed_workout' | 'logged_food' | 'sent_message' | 'updated_weight';
    timestamp: Date;
    details?: string;
  }>;
  
  // Quick Actions
  quickActions: Array<{
    label: string;
    icon: string;
    route: string;
  }>;
}
```

### Gym Owner Dashboard

```typescript
interface GymOwnerDashboard {
  // Facility Overview
  facilityStats: {
    totalClients: number;
    activeClients: number;
    totalTrainers: number;
    retentionRate: number;
  };
  
  // Revenue
  revenue: {
    thisMonth: number;
    lastMonth: number;
    ytd: number;
    changePercent: number;
  };
  
  // Trainer Performance
  trainerPerformance: Array<{
    trainerId: string;
    trainerName: string;
    clientCount: number;
    workoutsDelivered: number;
    avgRating: number;
    revenue: number;
  }>;
  
  // Client Metrics
  clientMetrics: {
    newThisMonth: number;
    churnedThisMonth: number;
    avgSessionsPerClient: number;
  };
  
  // Pending Actions
  pendingActions: Array<{
    type: 'trainer_approval' | 'client_issue' | 'payment_failed';
    details: string;
    actionUrl: string;
  }>;
}
```

---

## Database Schema Additions

```sql
-- Add roles enum
CREATE TYPE user_role AS ENUM ('client', 'trainer', 'gym_owner', 'gym_staff', 'admin');

-- Modify profiles table
ALTER TABLE profiles 
  ADD COLUMN role user_role DEFAULT 'client',
  ADD COLUMN facility_id UUID REFERENCES facilities(id);

-- Add facilities table (for gym owners)
CREATE TABLE facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id),
  name TEXT NOT NULL,
  description TEXT,
  logo_url TEXT,
  primary_color TEXT,
  secondary_color TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add trainer-facility relationships
CREATE TABLE facility_trainers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  commission_rate DECIMAL(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, trainer_id)
);

-- Add staff table
CREATE TABLE facility_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'staff' CHECK (role IN ('manager', 'staff', 'front_desk')),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, user_id)
);
```

---

## Route Structure

```typescript
export const routes: Routes = [
  // Auth routes (all users)
  { path: 'auth', loadChildren: () => import('./features/auth/auth.routes') },
  { path: 'onboarding', loadChildren: () => import('./features/onboarding/onboarding.routes') },
  
  // Client routes
  {
    path: 'client',
    canActivate: [authGuard, roleGuard('client')],
    loadComponent: () => import('./features/client/client-tabs.page'),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/client/dashboard/client-dashboard.page') },
      { path: 'workouts', loadChildren: () => import('./features/client/workouts/client-workouts.routes') },
      { path: 'nutrition', loadChildren: () => import('./features/client/nutrition/client-nutrition.routes') },
      { path: 'progress', loadChildren: () => import('./features/client/progress/client-progress.routes') },
      { path: 'messages', loadChildren: () => import('./features/shared/messages/messages.routes') },
      { path: 'settings', loadComponent: () => import('./features/shared/settings/settings.page') },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Trainer routes
  {
    path: 'trainer',
    canActivate: [authGuard, roleGuard('trainer')],
    loadComponent: () => import('./features/trainer/trainer-tabs.page'),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/trainer/dashboard/trainer-dashboard.page') },
      { path: 'clients', loadChildren: () => import('./features/trainer/clients/trainer-clients.routes') },
      { path: 'workouts', loadChildren: () => import('./features/trainer/workouts/trainer-workouts.routes') },
      { path: 'exercises', loadChildren: () => import('./features/trainer/exercises/exercises.routes') },
      { path: 'messages', loadChildren: () => import('./features/shared/messages/messages.routes') },
      { path: 'settings', loadComponent: () => import('./features/trainer/settings/trainer-settings.page') },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Gym Owner routes
  {
    path: 'owner',
    canActivate: [authGuard, roleGuard('gym_owner')],
    loadComponent: () => import('./features/owner/owner-tabs.page'),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/owner/dashboard/owner-dashboard.page') },
      { path: 'trainers', loadChildren: () => import('./features/owner/trainers/owner-trainers.routes') },
      { path: 'clients', loadChildren: () => import('./features/owner/clients/owner-clients.routes') },
      { path: 'reports', loadChildren: () => import('./features/owner/reports/owner-reports.routes') },
      { path: 'settings', loadComponent: () => import('./features/owner/settings/owner-settings.page') },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },
  
  // Redirect based on role
  {
    path: '',
    canActivate: [authGuard],
    component: RoleRedirectComponent // Redirects to appropriate dashboard
  }
];
```

---

## Phase 1 MVP Scope

For Phase 1, focus on:

1. **Client Role** - Full implementation
2. **Trainer Role** - Full implementation
3. **Gym Owner** - Basic implementation (can manage trainers, view reports)
4. **Staff** - Deferred to Phase 2

This aligns with the competitive landscape where solo trainers and small gym owners are the primary market.
