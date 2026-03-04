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

### 4. Admin Assistant (formerly "Gym Staff")

Delegated staff member who acts on the Owner's behalf with configurable permissions. This is a hybrid of Mindbody's "Front Desk" and "Manager" tiers — a single role whose capabilities are governed by the Owner's RBAC configuration. Admin Assistants are created through an **invitation-only flow** from the Owner (not public self-registration).

**Default Dashboard Features (configurable by Owner):**
- Daily schedule view across all trainers
- Client check-in and appointment management
- Internal team messaging (Owner ↔ Admin Assistant, Trainer ↔ Admin Assistant)
- Notification routing for assigned tasks
- Access to financial summaries (if Owner grants financial permission)
- CRM pipeline access (if Owner grants CRM permission)

**Key Screens:**
- Admin Assistant Dashboard
- Schedule view (all trainers, read/write per permission)
- Client lookup (name, contact, membership status — no health data by default)
- Internal team messages
- Appointment management (booking, cancellation, check-in)
- Limited settings (own profile only; facility settings gated by permission)

**What Admin Assistants CANNOT do (by default, unless Owner explicitly grants):**
- View client health/workout/nutrition data
- View trainer pay rates or payroll data
- Modify facility financial settings
- Access audit logs
- Change other users' permissions

### 5. Admin (System)

Platform administrators (internal Anthropic/FitOS use).

**Dashboard Features:**
- Platform metrics
- User management
- Support tickets
- System health

---

## Role-Based Access Control (RBAC)

### Composite Role: Owner inherits Trainer

The `gym_owner` role is a **superset** of the `trainer` role. Owners have all trainer capabilities (workout building, client management, active workout execution, Coach Brain AI) plus Owner-exclusive features (business settings, financials, team management). No account switching required.

```typescript
// Route guard helper — use this instead of checking role === 'trainer' directly
export function hasTrainerAccess(role: UserRole): boolean {
  return role === 'trainer' || role === 'gym_owner';
}

// Feature guard for owner-exclusive features
export function hasOwnerAccess(role: UserRole): boolean {
  return role === 'gym_owner';
}
```

### Admin Assistant: Invitation-Only

Admin Assistants are **not publicly registerable**. They are created by the Owner through the Team Management settings screen. The invitation flow:
1. Owner enters Admin Assistant's email in Team Management
2. System sends invitation email with one-time setup link
3. Admin Assistant creates their password via the link
4. Account is linked to the Owner's facility with default permissions
5. Owner can adjust permissions at any time after creation

### Role Definitions

```typescript
export type UserRole =
  | 'client'
  | 'trainer'
  | 'gym_owner'       // Superset of trainer — inherits all trainer permissions
  | 'admin_assistant' // Renamed from 'gym_staff' — invitation-only, configurable permissions
  | 'admin';          // Platform admin (internal FitOS use only)

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
  canManageAdminAssistants: boolean; // Create/edit/delete Admin Assistant accounts

  // Financial
  canViewRevenue: boolean;
  canManagePayments: boolean;
  canSetPricing: boolean;
  canViewPayroll: boolean;
  canExportFinancialData: boolean;

  // Nutrition
  canSetNutritionTargets: boolean;
  canLogNutrition: boolean;
  canSetHydrationTargets: boolean; // Issue 11: Hydration goal setting

  // Communication
  canMessageClients: boolean;
  canMessageTrainer: boolean;
  canMessageTeam: boolean;         // Issue 5: Internal team messaging
  canSendBulkMessages: boolean;

  // Scheduling (Phase 5)
  canManageAllSchedules: boolean;
  canManageOwnSchedule: boolean;
  canCheckInClients: boolean;
  canProcessCheckout: boolean;

  // Reporting
  canViewOwnProgress: boolean;
  canViewClientProgress: boolean;
  canViewFacilityReports: boolean;

  // Legal & Waivers (Issue 12)
  canManageWaiverTemplates: boolean;
  canViewSignedWaivers: boolean;

  // RBAC (Issue 9)
  canConfigurePermissions: boolean; // Owner can grant/restrict per-user permissions
  canViewAuditLogs: boolean;

  // Settings
  canManageFacilitySettings: boolean;
  canManageBranding: boolean;
  canManageIntegrations: boolean;
}

// NOTE: Admin Assistant permissions below are DEFAULTS only.
// The Owner can override any of these per-user via the RBAC settings screen (Issue 9).
export const defaultRolePermissions: Record<UserRole, RolePermissions> = {
  client: {
    canCreateWorkouts: false,
    canAssignWorkouts: false,
    canLogWorkouts: true,
    canViewAllClients: false,
    canManageOwnClients: false,
    canInviteClients: false,
    canManageTrainers: false,
    canViewTrainerMetrics: false,
    canManageAdminAssistants: false,
    canViewRevenue: false,
    canManagePayments: false,
    canSetPricing: false,
    canViewPayroll: false,
    canExportFinancialData: false,
    canSetNutritionTargets: false,
    canLogNutrition: true,
    canSetHydrationTargets: false,
    canMessageClients: false,
    canMessageTrainer: true,
    canMessageTeam: false,
    canSendBulkMessages: false,
    canManageAllSchedules: false,
    canManageOwnSchedule: false,
    canCheckInClients: false,
    canProcessCheckout: false,
    canViewOwnProgress: true,
    canViewClientProgress: false,
    canViewFacilityReports: false,
    canManageWaiverTemplates: false,
    canViewSignedWaivers: false,
    canConfigurePermissions: false,
    canViewAuditLogs: false,
    canManageFacilitySettings: false,
    canManageBranding: false,
    canManageIntegrations: false,
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
    canManageAdminAssistants: false,
    canViewRevenue: true,      // Own revenue only
    canManagePayments: true,   // Own clients only
    canSetPricing: true,       // Own pricing tiers
    canViewPayroll: false,
    canExportFinancialData: false,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canSetHydrationTargets: true,
    canMessageClients: true,
    canMessageTrainer: false,
    canMessageTeam: true,      // Can message within facility team
    canSendBulkMessages: true,
    canManageAllSchedules: false,
    canManageOwnSchedule: true,
    canCheckInClients: true,
    canProcessCheckout: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: false,
    canManageWaiverTemplates: false,
    canViewSignedWaivers: true, // Own clients' waivers
    canConfigurePermissions: false,
    canViewAuditLogs: false,
    canManageFacilitySettings: false,
    canManageBranding: true,
    canManageIntegrations: false,
  },
  gym_owner: {
    // gym_owner is a SUPERSET of trainer — all trainer permissions plus owner-exclusive ones
    canCreateWorkouts: true,
    canAssignWorkouts: true,
    canLogWorkouts: true,
    canViewAllClients: true,
    canManageOwnClients: true,
    canInviteClients: true,
    canManageTrainers: true,
    canViewTrainerMetrics: true,
    canManageAdminAssistants: true,
    canViewRevenue: true,
    canManagePayments: true,
    canSetPricing: true,
    canViewPayroll: true,
    canExportFinancialData: true,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canSetHydrationTargets: true,
    canMessageClients: true,
    canMessageTrainer: true,
    canMessageTeam: true,
    canSendBulkMessages: true,
    canManageAllSchedules: true,
    canManageOwnSchedule: true,
    canCheckInClients: true,
    canProcessCheckout: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: true,
    canManageWaiverTemplates: true,
    canViewSignedWaivers: true,
    canConfigurePermissions: true, // Owner exclusively manages RBAC
    canViewAuditLogs: true,
    canManageFacilitySettings: true,
    canManageBranding: true,
    canManageIntegrations: true,
  },
  admin_assistant: {
    // DEFAULT permissions — Owner can expand or restrict any of these per-user
    canCreateWorkouts: false,
    canAssignWorkouts: false,
    canLogWorkouts: false,
    canViewAllClients: true,       // Contact info only; no health data by default
    canManageOwnClients: false,
    canInviteClients: false,
    canManageTrainers: false,
    canViewTrainerMetrics: false,
    canManageAdminAssistants: false,
    canViewRevenue: false,         // Must be explicitly granted by Owner
    canManagePayments: false,
    canSetPricing: false,
    canViewPayroll: false,
    canExportFinancialData: false,
    canSetNutritionTargets: false,
    canLogNutrition: false,
    canSetHydrationTargets: false,
    canMessageClients: true,
    canMessageTrainer: true,
    canMessageTeam: true,
    canSendBulkMessages: false,
    canManageAllSchedules: true,   // Core function: scheduling on behalf of trainers
    canManageOwnSchedule: false,
    canCheckInClients: true,
    canProcessCheckout: false,     // Must be explicitly granted by Owner
    canViewOwnProgress: false,
    canViewClientProgress: false,
    canViewFacilityReports: false,
    canManageWaiverTemplates: false,
    canViewSignedWaivers: false,
    canConfigurePermissions: false, // NEVER granted to Admin Assistants
    canViewAuditLogs: false,
    canManageFacilitySettings: false,
    canManageBranding: false,
    canManageIntegrations: false,
  },
  admin: {
    // Full platform access — internal FitOS staff only
    canCreateWorkouts: true,
    canAssignWorkouts: true,
    canLogWorkouts: true,
    canViewAllClients: true,
    canManageOwnClients: true,
    canInviteClients: true,
    canManageTrainers: true,
    canViewTrainerMetrics: true,
    canManageAdminAssistants: true,
    canViewRevenue: true,
    canManagePayments: true,
    canSetPricing: true,
    canViewPayroll: true,
    canExportFinancialData: true,
    canSetNutritionTargets: true,
    canLogNutrition: true,
    canSetHydrationTargets: true,
    canMessageClients: true,
    canMessageTrainer: true,
    canMessageTeam: true,
    canSendBulkMessages: true,
    canManageAllSchedules: true,
    canManageOwnSchedule: true,
    canCheckInClients: true,
    canProcessCheckout: true,
    canViewOwnProgress: true,
    canViewClientProgress: true,
    canViewFacilityReports: true,
    canManageWaiverTemplates: true,
    canViewSignedWaivers: true,
    canConfigurePermissions: true,
    canViewAuditLogs: true,
    canManageFacilitySettings: true,
    canManageBranding: true,
    canManageIntegrations: true,
  },
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

Note: Owner navigation **includes all Trainer tabs** plus Owner-exclusive sections. Owner is a superset of Trainer — they see both the coaching tools and the business management tools.

Bottom Tabs:
```
[Dashboard] [Clients] [Workouts] [Business] [More]
```

Business tab includes (Owner-exclusive):
```
- Revenue Dashboard
- Trainer Management
- Member Overview
- Financial Reports
- CRM Pipeline
- Marketing Campaigns
- Payroll
```

Side Menu (via More):
```
- Exercise Library (shared with Trainer)
- Templates & Programs (shared with Trainer)
- Coach Brain AI (shared with Trainer)
- Team Management (Admin Assistants)
- Facility Settings
- RBAC Permissions
- Waivers & Legal
- Integrations (QuickBooks, etc.)
- Audit Logs
- Help & Support
```

### Admin Assistant Navigation

Bottom Tabs:
```
[Dashboard] [Schedule] [Clients] [Messages] [More]
```

Dashboard shows: Today's appointments across all trainers, pending check-ins, unread messages, tasks assigned by Owner.

Side Menu (via More):
```
- Settings (own profile only)
- Help & Support
```

Note: The Owner can grant additional menu items per-user via RBAC settings.

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
-- Add roles enum (renamed gym_staff → admin_assistant for clarity)
CREATE TYPE user_role AS ENUM ('client', 'trainer', 'gym_owner', 'admin_assistant', 'admin');

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

-- Admin Assistant accounts (invitation-only, linked to facility)
-- Renamed from facility_staff for clarity
CREATE TABLE admin_assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id),  -- Owner who invited them
  invitation_email TEXT NOT NULL,
  invitation_accepted_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  -- Per-user permission overrides (Owner-configurable via RBAC settings screen)
  -- Stored as JSONB; keys map to RolePermissions interface fields
  -- null = use role default, true = grant, false = deny
  permission_overrides JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(facility_id, user_id)
);

-- RBAC permission change audit log
CREATE TABLE rbac_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facilities(id),
  changed_by UUID NOT NULL REFERENCES profiles(id),  -- Owner who made the change
  target_user_id UUID NOT NULL REFERENCES profiles(id),
  permission_key TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN,
  changed_at TIMESTAMPTZ DEFAULT NOW()
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
  
  // Gym Owner routes (superset of trainer — includes all trainer routes)
  {
    path: 'owner',
    canActivate: [authGuard, roleGuard('gym_owner')],
    loadComponent: () => import('./features/owner/owner-tabs.page'),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/owner/dashboard/owner-dashboard.page') },
      // Trainer-inherited routes (Owner has access to all coaching features)
      { path: 'clients', loadChildren: () => import('./features/trainer/clients/trainer-clients.routes') },
      { path: 'workouts', loadChildren: () => import('./features/trainer/workouts/trainer-workouts.routes') },
      { path: 'exercises', loadChildren: () => import('./features/trainer/exercises/exercises.routes') },
      // Owner-exclusive routes
      { path: 'trainers', loadChildren: () => import('./features/owner/trainers/owner-trainers.routes') },
      { path: 'members', loadChildren: () => import('./features/owner/members/owner-members.routes') },
      { path: 'reports', loadChildren: () => import('./features/owner/reports/owner-reports.routes') },
      { path: 'team', loadChildren: () => import('./features/owner/team/owner-team.routes') },  // Admin Assistants
      { path: 'permissions', loadChildren: () => import('./features/owner/rbac/rbac.routes') }, // Issue 9
      { path: 'waivers', loadChildren: () => import('./features/owner/waivers/waivers.routes') }, // Issue 12
      { path: 'messages', loadChildren: () => import('./features/shared/messages/messages.routes') },
      { path: 'settings', loadComponent: () => import('./features/owner/settings/owner-settings.page') },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' }
    ]
  },

  // Admin Assistant routes (scope controlled by per-user permission_overrides)
  {
    path: 'admin-assistant',
    canActivate: [authGuard, roleGuard('admin_assistant')],
    loadComponent: () => import('./features/admin-assistant/admin-assistant-tabs.page'),
    children: [
      { path: 'dashboard', loadComponent: () => import('./features/admin-assistant/dashboard/aa-dashboard.page') },
      { path: 'schedule', loadChildren: () => import('./features/admin-assistant/schedule/aa-schedule.routes') },
      { path: 'clients', loadComponent: () => import('./features/admin-assistant/clients/aa-clients.page') },
      { path: 'messages', loadChildren: () => import('./features/shared/messages/messages.routes') },
      { path: 'settings', loadComponent: () => import('./features/shared/settings/settings.page') },
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
3. **Gym Owner** - Full implementation (includes composite Trainer access + business management)
4. **Admin Assistant** - Basic implementation (scheduling, check-in, messaging; RBAC in Phase 5)

This aligns with the competitive landscape where solo trainers and small gym owners are the primary market.

---

## Issues Resolved by This Architecture

| Issue | Resolution |
|-------|-----------|
| Issue 1 | "Studio Manager" renamed to "Admin Assistant" — fourth role, invitation-only |
| Issue 3 | Terminology standardized: "Trainer" used throughout (not "Instructor") |
| Issue 5 | `canMessageTeam: true` for Trainer, Owner, Admin Assistant; team messaging supported |
| Issue 9 | `permission_overrides` JSONB on `admin_assistants` table; Owner configures per-user |
| Issue 13 | `gym_owner` role explicitly inherits all Trainer permissions; `hasTrainerAccess()` helper |
| Issue 17 | Admin Assistant auth is invitation-only (not public registration); tracked in routes |
