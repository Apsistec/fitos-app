# FitOS Stitch Design Implementation Sprints

**Created:** January 30, 2026  
**Purpose:** Apply Stitch-generated designs and implement data population for all pages  
**Prerequisites:** STITCH_DESIGN_SPRINTS.md (design generation), DESIGN_SYSTEM.md (tokens)  
**Related:** IMPLEMENTATION_ASSESSMENT.md (68% complete), GAP_ANALYSIS_2026.md

---

## Overview

This document defines the implementation sprints to **apply Stitch designs** and **populate real data** on every page in FitOS. Each sprint corresponds to the design sprints (46-57) but focuses on:

1. **Converting Stitch designs** → Angular/Ionic components
2. **Integrating data services** → Real backend data via Supabase
3. **Implementing missing features** → From gap analysis
4. **Testing & verification** → Build compilation and functionality

**Total Implementation Effort:** ~180 story points across 12 sprints

---

## Sprint Dependencies

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DESIGN GENERATION (Stitch)                        │
│              Sprints 46-57 in STITCH_DESIGN_SPRINTS.md               │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  IMPLEMENTATION (This Document)                      │
│              Sprints 58-69: Apply Designs + Populate Data           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Sprint 58: Auth & Onboarding

**Design Source:** Sprint 46 (Stitch Project: `12317444059489313469`)  
**Priority:** HIGH | **Points:** 18 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Login (Role Select) | `/auth/login` | Reviewing | N/A | Apply dark theme, role cards, accent glow |
| Trainer Login | `/auth/login/trainer` | Reviewing | `AuthService` | Email/password form, error states |
| Client Login | `/auth/login/client` | Reviewing | `AuthService` | Email/password form, SSO options |
| Gym Owner Login | `/auth/login/gym-owner` | Reviewing | `AuthService` | Email/password form, MFA prompt |
| SSO Login | `/auth/sso-login` | Reviewing | `AuthService` | Google/Apple OAuth buttons |
| Register (Role Select) | `/auth/register` | Reviewing | N/A | Role selection cards |
| Trainer Register | `/auth/register/trainer` | Reviewing | `AuthService` | Multi-step form, business info |
| Client Register | `/auth/register/client` | Reviewing | `AuthService` | Basic info, trainer code |
| Gym Owner Register | `/auth/register/gym-owner` | Reviewing | `AuthService` | Business info, Stripe Connect |
| Forgot Password | `/auth/forgot-password` | Reviewing | `AuthService` | Email input, success state |
| Verify Email | `/auth/verify-email` | Reviewing | `AuthService` | Token validation, resend |
| Reset Password | `/auth/reset-password` | Reviewing | `AuthService` | New password form, validation |
| MFA Setup | `/auth/mfa-setup` | Reviewing | `AuthService` | Method cards, QR code |
| MFA Verify | `/auth/mfa-verify` | Reviewing | `AuthService` | 6-digit code input |
| Onboarding | `/onboarding` | Reviewing | `UserService` | Step indicator, profile setup |

### Data Population Requirements

```typescript
// AuthService data requirements
interface AuthPageData {
  // Login pages
  savedEmail?: string;           // From localStorage
  ssoProviders: string[];        // ['google', 'apple']
  mfaRequired: boolean;          // From user profile
  
  // Registration pages
  trainerCode?: string;          // Query param or manual entry
  pricingTiers: PricingTier[];   // For subscription selection
  
  // Onboarding
  userProfile: Partial<Profile>; // Prefill from registration
  chronotypeQuiz: Question[];    // For optimal training times
  goals: Goal[];                 // User fitness goals
}
```

### Implementation Checklist

- [ ] Apply Stitch designs to all 15 auth page templates
- [ ] Implement dark-first color tokens from DESIGN_SYSTEM.md
- [ ] Add glow effects on role selection cards
- [ ] Connect registration to Supabase Auth
- [ ] Add form validation with adherence-neutral feedback
- [ ] Implement MFA setup flow (TOTP, SMS)
- [ ] Add chronotype quiz to onboarding
- [ ] Test OAuth flows (Google, Apple)
- [ ] Verify email verification flow end-to-end
- [ ] Add loading states and error handling
- [ ] Build compiles without errors

### Acceptance Criteria

1. All auth pages match Stitch designs within 95% fidelity
2. Registration creates user in Supabase with correct role
3. Login sets JWT token and redirects to role-appropriate dashboard
4. MFA setup generates valid TOTP codes
5. Onboarding captures all required profile data

---

## Implementation Sprint 59: Dashboard & Core Navigation

**Design Source:** Sprint 47 (Stitch Project: `15713137891627036408`)  
**Priority:** HIGH | **Points:** 12 | **Duration:** 4 days

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Dashboard | `/tabs/dashboard` | Reviewing | Multiple services | Hero metrics, quick actions |
| Tabs Container | `/tabs` | Reviewing | N/A | Tab bar, role-based tabs |

### Data Population Requirements

```typescript
// DashboardService data requirements per role
interface TrainerDashboardData {
  todaysSessions: Session[];       // Scheduled for today
  activeClients: number;           // From clients table
  pendingMessages: number;         // Unread count
  weeklyRevenue: number;           // From payments
  recentActivity: Activity[];      // Last 10 actions
  clientsNeedingAttention: Client[]; // No activity 7+ days
}

interface ClientDashboardData {
  todaysWorkout: Workout | null;   // Assigned for today
  nutritionProgress: MacroSummary; // Today's macros
  streakDays: number;              // Current streak
  nextSession: Session | null;     // Upcoming with trainer
  weeklyProgress: ProgressSummary; // Weight, measurements
  coachMessages: Message[];        // Unread from trainer/AI
}

interface GymOwnerDashboardData {
  monthlyRevenue: number;          // From all trainers
  activeMembers: number;           // Total clients
  trainerCount: number;            // Active trainers
  pendingPayouts: number;          // Stripe Connect balance
  locationMetrics: LocationStats[];// Per-location stats
  recentSignups: User[];           // Last 7 days
}
```

### Implementation Checklist

- [ ] Apply Stitch dashboard design with hero metric cards
- [ ] Implement role-based dashboard switching
- [ ] Create `DashboardService` with real-time subscriptions
- [ ] Add today's workout preview card (client)
- [ ] Add nutrition ring summary with adherence-neutral colors
- [ ] Add client attention alerts (trainer)
- [ ] Add revenue/payout summary (gym owner)
- [ ] Implement tab bar with role-appropriate icons
- [ ] Add badge counts on tabs (messages, notifications)
- [ ] Create skeleton loading states for each card
- [ ] Add pull-to-refresh functionality

### Acceptance Criteria

1. Dashboard loads within 2 seconds with skeleton states
2. Real-time data updates when backend changes
3. Role-specific widgets display correctly
4. Tab navigation works with proper state preservation
5. Badges update on new messages/notifications

---

## Implementation Sprint 60: Workouts

**Design Source:** Sprint 48 (Stitch Project: `1851034083344145603`)  
**Priority:** HIGH | **Points:** 25 | **Duration:** 1.5 weeks

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Workout List | `/tabs/workouts` | Reviewing | `WorkoutService` | Assigned workouts, templates |
| Exercise Library | `/tabs/workouts/exercises` | Reviewing | `ExerciseService` | Searchable grid, muscle filters |
| Exercise Form | `/tabs/workouts/exercises/new` | Reviewing | `ExerciseService` | Custom exercise creation |
| Workout Builder | `/tabs/workouts/builder` | Reviewing | `WorkoutService` | Drag-drop exercise cards |
| Assign Workout | `/tabs/workouts/assign` | Reviewing | `WorkoutService`, `ClientService` | Client selection, scheduling |
| Active Workout | `/tabs/workouts/active/:id` | Reviewing | `WorkoutService`, `VoiceService` | Live logging, rest timer |
| Workout History | `/tabs/workouts/history` | Reviewing | `WorkoutService` | Calendar view, filters |
| Workout Detail | `/tabs/workouts/history/:id` | Reviewing | `WorkoutService` | Set details, notes |
| Progress Charts | `/tabs/workouts/progress` | Reviewing | `ProgressService` | Line/bar charts |
| Measurements | `/tabs/workouts/measurements` | Reviewing | `MeasurementService` | Body measurements |

### Data Population Requirements

```typescript
// Workout data structures
interface WorkoutListData {
  assignedWorkouts: Workout[];     // From trainer
  workoutTemplates: WorkoutTemplate[]; // User's saved
  todaysWorkout: Workout | null;   // Auto-selected
  completedThisWeek: number;       // Completion count
}

interface ActiveWorkoutData {
  workout: Workout;                // Full workout object
  currentExercise: Exercise;       // Active exercise
  completedSets: Set[];            // Already logged
  restTimer: RestTimerState;       // Countdown state
  previousPerformance: Set[];      // Last time this exercise
  voiceEnabled: boolean;           // Deepgram active
  smartSuggestion: SetSuggestion;  // AI-predicted weight/reps
}

interface ProgressData {
  exerciseProgress: {              // Per exercise
    [exerciseId: string]: {
      dates: Date[];
      weights: number[];
      reps: number[];
      volume: number[];            // weight × reps
    };
  };
  bodyMeasurements: Measurement[]; // Historical
  photos: ProgressPhoto[];         // Progress pics
}
```

### Voice Integration Requirements (Gap Analysis Item)

```typescript
// Voice workout logging implementation
interface VoiceWorkoutConfig {
  keywords: ['set', 'reps', 'repeat', 'done', 'rest'];
  patterns: {
    logSet: /(\d+)\s*(reps?|x)\s*(?:at\s*)?(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)?/i;
    repeatLast: /repeat|same|again/i;
    completeExercise: /done|finished|complete|next/i;
    startRest: /rest|break|pause/i;
  };
  hapticFeedback: true;            // On successful parse
  confirmationRequired: false;     // Direct logging
}
```

### Implementation Checklist

- [ ] Apply Stitch designs to all 10 workout pages
- [ ] Implement workout list with filters (date, type, muscle)
- [ ] Build exercise library with muscle group icons
- [ ] Create drag-and-drop workout builder (CDK DragDrop)
- [ ] **Integrate VoiceService into ActiveWorkoutPage**
- [ ] Implement smart weight/rep predictions
- [ ] Add rest timer with countdown animation
- [ ] Create "repeat last set" one-tap button
- [ ] Build progress charts with Chart.js
- [ ] Add measurement logging with body diagram
- [ ] **Add haptic feedback on set completion**
- [ ] Implement workout completion celebration

### Acceptance Criteria

1. Workout builder allows drag-and-drop exercise ordering
2. Active workout logs sets via voice or tap
3. Rest timer auto-starts with configurable duration
4. Progress charts show exercise volume over time
5. Voice commands work for: set logging, repeat, done, rest

---

## Implementation Sprint 61: Nutrition

**Design Source:** Sprint 49 (Stitch Project: `2214746930003329037`)  
**Priority:** HIGH | **Points:** 20 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Nutrition Log | `/tabs/nutrition` | Reviewing | `NutritionService` | Macro rings, meal list |
| Add Food | `/tabs/nutrition/add` | Reviewing | `NutritionService`, `NutritionParserService` | Search, manual entry |
| Voice Nutrition | `/tabs/nutrition/voice` | Reviewing | `NutritionParserService`, `VoiceService` | Voice logging |
| Photo Nutrition | `/tabs/nutrition/photo` | Reviewing | `PhotoNutritionService` | Camera, AI identification |

### Data Population Requirements

```typescript
// Nutrition data structures
interface NutritionDayData {
  date: Date;
  meals: Meal[];                   // Breakfast, lunch, dinner, snacks
  macros: {
    calories: { consumed: number; target: number };
    protein: { consumed: number; target: number };
    carbs: { consumed: number; target: number };
    fat: { consumed: number; target: number };
  };
  adherenceScore: number;          // 0-100 (never negative)
  aiInsights: string[];            // AI-generated tips
}

interface FoodSearchResult {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  macros: MacroValues;
  source: 'nutritionix' | 'usda' | 'custom';
  confidence?: number;             // For AI-identified foods
}

interface PhotoNutritionResult {
  foods: Array<{
    name: string;
    confidence: number;            // 0-1
    portion: string;
    macros: MacroValues;
    boundingBox?: BoundingBox;     // For image overlay
  }>;
  totalMacros: MacroValues;
  requiresConfirmation: boolean;   // <70% confidence
}
```

### Adherence-Neutral Color Implementation

```scss
// CRITICAL: No red for "over target"
.macro-ring {
  &.calories { 
    --progress-color: var(--fitos-nutrition-calories);  // Indigo
  }
  &.protein { 
    --progress-color: var(--fitos-nutrition-protein);   // Green
  }
  &.carbs { 
    --progress-color: var(--fitos-nutrition-carbs);     // Amber
  }
  &.fat { 
    --progress-color: var(--fitos-nutrition-fat);       // Pink
  }
  &.over { 
    --progress-color: var(--fitos-nutrition-over);      // Purple, NOT red
  }
}
```

### Implementation Checklist

- [ ] Apply Stitch designs with adherence-neutral colors
- [ ] Implement macro rings that cap at 100% (no overflow styling)
- [ ] **Configure Nutritionix API via Edge Function**
- [ ] Build food search with autocomplete
- [ ] **Implement voice nutrition logging**
- [ ] **Implement photo nutrition with Passio AI**
- [ ] Create portion size adjustment UI
- [ ] Add meal templates for quick logging
- [ ] Build water intake tracker
- [ ] Add AI-generated nutrition insights
- [ ] Never display "over" in negative/red colors

### Acceptance Criteria

1. Macro rings show progress with adherence-neutral colors
2. Voice logging parses: "Chicken breast, 6 ounces"
3. Photo nutrition identifies foods with >70% confidence
4. Food search returns results within 300ms
5. No red coloring appears anywhere in nutrition UI

---

## Implementation Sprint 62: Coaching & Messages

**Design Source:** Sprint 50 (Stitch Project: `2660539694892899208`)  
**Priority:** MEDIUM | **Points:** 18 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Coaching Chat | `/tabs/coaching/chat` | Reviewing | `AICoachService` | AI chat, quick actions |
| Methodology Setup | `/tabs/coaching/methodology-setup` | Reviewing | `CoachService` | Trainer methodology config |
| Insights Dashboard | embedded | Reviewing | `InsightsService` | AI-generated insights |
| Conversations List | `/tabs/messages` | Reviewing | `MessageService` | Chat list, unread badges |
| Message Chat | `/tabs/messages/chat/:id` | Reviewing | `MessageService` | Real-time messaging |

### Data Population Requirements

```typescript
// AI Coaching data
interface CoachingChatData {
  messages: ChatMessage[];          // Conversation history
  availableAgents: AgentType[];     // workout, nutrition, recovery, motivation
  trainerOverrides: TrainerRule[];  // Custom trainer rules
  quickActions: QuickAction[];      // Pre-defined prompts
  escalationThreshold: number;      // When to involve human trainer
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'trainer';
  content: string;
  agent?: AgentType;                // Which specialist responded
  timestamp: Date;
  metadata?: {
    workoutSuggestion?: Workout;
    nutritionSuggestion?: Meal;
    escalated?: boolean;
  };
}

// Human messaging data
interface MessageThreadData {
  thread: MessageThread;
  messages: Message[];
  participants: User[];
  unreadCount: number;
  lastSeen: { [userId: string]: Date };
}
```

### AI Integration Requirements (LangGraph)

```typescript
// Connect to LangGraph backend
interface AICoachConfig {
  endpoint: string;                 // Cloud Run URL
  apiKey: string;                   // From Edge Function
  agents: {
    workout: { prompt: string; tools: string[] };
    nutrition: { prompt: string; tools: string[] };
    recovery: { prompt: string; tools: string[] };
    motivation: { prompt: string; tools: string[] };
  };
  contextWindow: number;            // Messages to include
  ragEnabled: boolean;              // Retrieve user history
}
```

### Implementation Checklist

- [ ] Apply Stitch chat designs with AI/human distinction
- [ ] **Build chat UI with message list component**
- [ ] **Add typing indicator animation**
- [ ] **Implement quick action chips**
- [ ] Connect to LangGraph AI backend
- [ ] Add markdown rendering in AI responses
- [ ] Implement trainer methodology input
- [ ] Build real-time messaging with Supabase Realtime
- [ ] Add unread badges on conversation list
- [ ] Implement trainer escalation flow
- [ ] Add voice input option for chat

### Acceptance Criteria

1. AI responses arrive within 3 seconds
2. Chat distinguishes AI vs trainer messages visually
3. Quick actions send pre-defined prompts
4. Real-time messaging updates instantly
5. Escalation notifies trainer via push notification

---

## Implementation Sprint 63: Client Management

**Design Source:** Sprint 51 (Stitch Project: `14557078187966128142`)  
**Priority:** MEDIUM | **Points:** 16 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Client List | `/tabs/clients` | Reviewing | `ClientService` | Client cards, filters |
| Invite Client | `/tabs/clients/invite` | Reviewing | `InviteService` | Email/link invite |
| Invitations List | `/tabs/clients/invitations` | Reviewing | `InviteService` | Pending invites |
| Client Detail | `/tabs/clients/:id` | Reviewing | `ClientService` | Tabs: overview/workouts/nutrition |
| Set Nutrition Targets | `/tabs/clients/:id/nutrition-targets` | Reviewing | `NutritionService` | Macro goal setting |
| Graduation | `/tabs/clients/:id/graduation` | Reviewing | `ClientService` | Client independence |
| Video Review | `/tabs/clients/video-review/:id` | Reviewing | `VideoService` | Form check, annotations |

### Data Population Requirements

```typescript
// Client management data
interface ClientListData {
  clients: Client[];
  filters: {
    status: 'active' | 'paused' | 'graduated';
    lastActivity: 'week' | 'month' | 'all';
    adherence: 'high' | 'medium' | 'low' | 'all';
  };
  sortBy: 'name' | 'lastActivity' | 'adherence';
}

interface ClientDetailData {
  client: Client;
  subscription: Subscription;
  recentWorkouts: Workout[];
  nutritionHistory: NutritionDay[];
  progressPhotos: ProgressPhoto[];
  measurements: Measurement[];
  messages: Message[];
  adherenceScore: {
    workouts: number;
    nutrition: number;
    overall: number;
  };
  alerts: ClientAlert[];          // Needs attention items
}

interface ClientAlert {
  type: 'no_workout_7_days' | 'missed_nutrition_3_days' | 'weight_stall' | 'message_unanswered';
  severity: 'info' | 'warning';
  message: string;
  action: string;
}
```

### Implementation Checklist

- [ ] Apply Stitch designs to client pages
- [ ] Build client list with adherence indicators (not red)
- [ ] Implement client invite via email/link
- [ ] Create client detail with tabbed interface
- [ ] Add nutrition target setting with macro calculator
- [ ] Build graduation flow with achievement badges
- [ ] **Implement video review with annotation tools**
- [ ] Add "needs attention" alerts system
- [ ] Create client adherence scoring (adherence-neutral)
- [ ] Build progress photo comparison view

### Acceptance Criteria

1. Client list loads with pagination (20 per page)
2. Filters persist across navigation
3. Client detail shows comprehensive overview
4. Nutrition targets save to client profile
5. Video review allows timestamp annotations

---

## Implementation Sprint 64: CRM & Marketing

**Design Source:** Sprint 52 (Stitch Project: `14295455250109521956`)  
**Priority:** MEDIUM | **Points:** 22 | **Duration:** 1.5 weeks

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| CRM Hub | internal | Reviewing | `LeadService` | Overview dashboard |
| Lead Pipeline | `/tabs/crm/pipeline` | Reviewing | `LeadService` | Kanban board |
| Email Templates | `/tabs/crm/templates` | Reviewing | `EmailService` | Template WYSIWYG |
| Email Sequences | `/tabs/crm/sequences` | Reviewing | `EmailService` | Automation builder |
| Email Analytics | `/tabs/crm/analytics` | Reviewing | `EmailService` | Open/click charts |
| Email Campaigns | internal | Reviewing | `EmailService` | Bulk sends |
| Form Builder | internal | Reviewing | `LeadService` | Lead capture forms |
| Lead Detail | internal | Reviewing | `LeadService` | Lead profile |

### Data Population Requirements

```typescript
// CRM data structures
interface LeadPipelineData {
  stages: LeadStage[];              // new, contacted, qualified, etc.
  leads: {
    [stageId: string]: Lead[];
  };
  totalValue: number;               // Sum of all lead values
  conversionRate: number;           // Won / Total
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  stage: LeadStage;
  value: number;                    // Estimated revenue
  source: string;                   // How they found you
  assignedTo?: string;              // Trainer ID
  activities: LeadActivity[];
  score: number;                    // Lead scoring 0-100
  createdAt: Date;
  lastContactAt?: Date;
}

interface EmailSequenceData {
  sequence: EmailSequence;
  steps: SequenceStep[];
  enrolledLeads: number;
  performance: {
    sent: number;
    opened: number;
    clicked: number;
    converted: number;
  };
}
```

### Implementation Checklist

- [ ] Apply Stitch designs to CRM pages
- [ ] **Build Kanban board with drag-and-drop**
- [ ] Implement lead card component
- [ ] Create lead detail with activity timeline
- [ ] **Build WYSIWYG email template editor**
- [ ] **Implement sequence builder with visual timeline**
- [ ] Connect to Resend/SendGrid for email sending
- [ ] Add open/click tracking pixels
- [ ] Build email analytics charts
- [ ] Create lead capture form generator
- [ ] Implement lead scoring algorithm

### Acceptance Criteria

1. Leads drag between stages smoothly
2. Email templates support variable substitution
3. Sequences trigger on lead stage change
4. Analytics show real-time open/click data
5. Lead forms capture and create leads automatically

---

## Implementation Sprint 65: Settings & Profile

**Design Source:** Sprint 53 (Stitch Project: `1853405871396452861`)  
**Priority:** MEDIUM | **Points:** 18 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Settings Home | `/tabs/settings` | Reviewing | N/A | Section navigation |
| Edit Profile | `/tabs/settings/profile` | Reviewing | `UserService` | Profile form |
| Trainer Pricing | `/tabs/settings/pricing` | Reviewing | `PricingService` | Package setup |
| My Subscription | `/tabs/settings/subscription` | Reviewing | `SubscriptionService` | Current plan |
| Wearables | `/tabs/settings/wearables` | Reviewing | `WearableService` | Device connections |
| Payment History | `/tabs/settings/payments` | Reviewing | `PaymentService` | Transaction list |
| Notifications | `/tabs/settings/notifications` | Reviewing | `NotificationService` | Push preferences |
| Privacy & Security | `/tabs/settings/privacy` | Reviewing | `UserService` | Data controls |
| Change Password | `/tabs/settings/change-password` | Reviewing | `AuthService` | Password form |
| Stripe Connect | `/tabs/settings/stripe-connect` | Reviewing | `StripeService` | Payout setup |
| Chronotype | `/tabs/settings/chronotype` | Reviewing | `UserService` | Training time prefs |
| Help Hub | `/tabs/settings/help` | Reviewing | `HelpService` | Help articles |
| Terms & Privacy | `/tabs/settings/terms` | Reviewing | N/A | Legal content |
| Integrations | `/tabs/settings/integrations` | Reviewing | `IntegrationService` | Third-party apps |

### Data Population Requirements

```typescript
// Settings data structures
interface SettingsData {
  profile: UserProfile;
  subscription: Subscription;
  notifications: NotificationPreferences;
  wearables: ConnectedDevice[];
  integrations: Integration[];
  stripeAccount?: StripeConnectAccount;
}

interface ConnectedDevice {
  id: string;
  type: 'apple_watch' | 'fitbit' | 'garmin' | 'whoop' | 'oura';
  name: string;
  lastSync: Date;
  dataTypes: string[];            // Steps, HRV, sleep, etc.
  status: 'connected' | 'disconnected' | 'syncing';
}

interface StripeConnectAccount {
  accountId: string;
  status: 'pending' | 'active' | 'restricted';
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  balance: {
    available: number;
    pending: number;
  };
  nextPayout?: Date;
}
```

### Implementation Checklist

- [ ] Apply Stitch designs with grouped sections
- [ ] Build profile edit with avatar upload
- [ ] Implement trainer pricing package builder
- [ ] Create subscription management UI
- [ ] **Integrate wearable connections (Health Connect)**
- [ ] Build payment history with receipts
- [ ] Implement notification preferences
- [ ] Add privacy controls (data export, deletion)
- [ ] **Complete Stripe Connect Express onboarding**
- [ ] Build chronotype quiz and preferences
- [ ] Create help article search

### Acceptance Criteria

1. Profile changes save immediately
2. Wearables show real-time sync status
3. Stripe Connect allows payout setup
4. Notification preferences respected
5. Data export generates downloadable file

---

## Implementation Sprint 66: Analytics & Business

**Design Source:** Sprint 54 (Stitch Project: `11949277000781767716`)  
**Priority:** LOW | **Points:** 15 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Owner Analytics | `/tabs/analytics` | Reviewing | `AnalyticsService` | Revenue, member charts |
| Payment Analytics | internal | Reviewing | `PaymentService` | Payment trends |
| Pricing Tiers | `/outcome-pricing/tiers` | Reviewing | `PricingService` | Outcome-based tiers |
| Create Tier | `/outcome-pricing/tiers/create` | Reviewing | `PricingService` | New tier form |
| Tier Detail | `/outcome-pricing/tiers/:id` | Reviewing | `PricingService` | Tier stats |
| My Goals | `/outcome-pricing/goals` | Reviewing | `GoalService` | Client goals |
| Goal Detail | `/outcome-pricing/goals/:id` | Reviewing | `GoalService` | Goal progress |
| Trainer Payouts | internal | Reviewing | `PayoutService` | Payout history |

### Data Population Requirements

```typescript
// Analytics data
interface AnalyticsDashboardData {
  revenue: {
    thisMonth: number;
    lastMonth: number;
    trend: number;                // Percentage change
    byTrainer: { [trainerId: string]: number };
    byService: { [serviceType: string]: number };
  };
  members: {
    active: number;
    new: number;
    churned: number;
    retentionRate: number;
  };
  sessions: {
    completed: number;
    cancelled: number;
    noShow: number;
  };
  payouts: {
    pending: number;
    scheduled: Payout[];
    history: Payout[];
  };
}
```

### Implementation Checklist

- [ ] Apply Stitch analytics designs
- [ ] Build revenue trend charts (Chart.js)
- [ ] Create member growth charts
- [ ] Implement trainer performance comparison
- [ ] Build outcome-based pricing tier system
- [ ] Create goal tracking with milestones
- [ ] Add payout scheduling and history
- [ ] Build exportable reports (CSV, PDF)

### Acceptance Criteria

1. Analytics dashboard loads in <3 seconds
2. Charts render correctly on mobile
3. Revenue calculations match Stripe data
4. Goals track progress automatically
5. Reports export with correct formatting

---

## Implementation Sprint 67: Franchise & Enterprise

**Design Source:** Sprint 55 (Stitch Project: `4368094376255775214`)  
**Priority:** LOW | **Points:** 12 | **Duration:** 5 days

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Franchise Dashboard | `/franchise/dashboard` | Reviewing | `FranchiseService` | Multi-location overview |
| Location Form | `/franchise/locations/new` | Reviewing | `LocationService` | Add location |
| Location Detail | `/franchise/locations/:id` | Reviewing | `LocationService` | Location stats |
| Royalty Dashboard | `/franchise/royalties` | Reviewing | `RoyaltyService` | Fee tracking |
| Franchise Analytics | `/franchise/analytics` | Reviewing | `AnalyticsService` | Cross-location comparison |

### Data Population Requirements

```typescript
// Franchise data
interface FranchiseDashboardData {
  locations: Location[];
  totals: {
    revenue: number;
    members: number;
    trainers: number;
  };
  locationComparison: {
    [locationId: string]: {
      revenue: number;
      members: number;
      growth: number;
    };
  };
  royalties: {
    due: number;
    paid: number;
    overdue: number;
  };
}
```

### Implementation Checklist

- [ ] Apply Stitch franchise designs
- [ ] Build location map/card view
- [ ] Implement location creation form
- [ ] Create per-location metrics
- [ ] Build royalty tracking system
- [ ] Add cross-location analytics
- [ ] Implement location benchmarking

### Acceptance Criteria

1. Multi-location view shows all locations
2. Location drill-down shows detailed metrics
3. Royalty calculations are accurate
4. Cross-location comparisons are useful

---

## Implementation Sprint 68: Help, Social & Specialty

**Design Source:** Sprint 56 (Stitch Project: `9313239997448920445`)  
**Priority:** LOW | **Points:** 14 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Help Center | `/tabs/settings/help/center` | Reviewing | `HelpService` | Article categories |
| FAQ | `/tabs/settings/help/faq` | Reviewing | `HelpService` | Common questions |
| Getting Started | `/tabs/settings/help/getting-started` | Reviewing | `HelpService` | Onboarding guide |
| Feature Guide | `/tabs/settings/help/guide/:slug` | Reviewing | `HelpService` | Feature docs |
| Contact Support | `/tabs/settings/help/contact` | Reviewing | `SupportService` | Support form |
| Leaderboard | `/tabs/social/leaderboard` | Reviewing | `SocialService` | Rankings |
| Wellness Check-In | embedded | Reviewing | `WellnessService` | PHQ-2/GAD-2 |
| SEO Dashboard | internal | Reviewing | `SEOService` | Local SEO |
| Google Business | internal | Reviewing | `GoogleService` | GBP management |
| Keywords | internal | Reviewing | `SEOService` | Keyword tracking |
| Reviews | internal | Reviewing | `ReviewService` | Review management |
| SSO Audit | internal | Reviewing | `SSOService` | Enterprise audit |
| SSO Config | internal | Reviewing | `SSOService` | SAML/OIDC setup |

### Implementation Checklist

- [ ] Apply Stitch help designs
- [ ] Build searchable help article system
- [ ] Create interactive feature guides
- [ ] Implement support ticket form
- [ ] Build leaderboard with opt-in privacy
- [ ] **Add wellness check-in (PHQ-2, GAD-2)**
- [ ] Create local SEO dashboard
- [ ] Build review aggregation
- [ ] Implement enterprise SSO configuration

### Acceptance Criteria

1. Help search returns relevant results
2. Support tickets create in support system
3. Leaderboard respects privacy settings
4. Wellness check-in flags at-risk users
5. SSO configuration validates properly

---

## Implementation Sprint 69: Landing Site

**Design Source:** Sprint 57 (Stitch Project: `2079243473916629379`)  
**Priority:** MEDIUM | **Points:** 18 | **Duration:** 1 week

### Pages to Implement

| Page | Route | Design Status | Data Source | Implementation Tasks |
|------|-------|---------------|-------------|---------------------|
| Home | `/` | Reviewing | N/A | Hero, features, CTA |
| Features | `/features` | Reviewing | N/A | Feature showcase |
| Pricing | `/pricing` | Reviewing | `PricingService` | Plan comparison |
| Changelog | `/changelog` | Reviewing | `ChangelogService` | Release notes |
| Roadmap | `/roadmap` | Reviewing | N/A | Future plans |
| Blog | `/blog` | Reviewing | `BlogService` | Article list |
| Help | `/help` | Reviewing | `HelpService` | Public docs |
| Docs | `/docs` | Reviewing | `DocsService` | API/integration docs |
| Privacy Policy | `/privacy` | Reviewing | N/A | Legal |
| Terms of Service | `/terms` | Reviewing | N/A | Legal |
| Cookie Policy | `/cookies` | Reviewing | N/A | Legal |

### Data Population Requirements

```typescript
// Landing site data
interface LandingSiteData {
  pricing: {
    tiers: PricingTier[];
    currency: string;
    annualDiscount: number;
  };
  changelog: {
    releases: Release[];
  };
  blog: {
    posts: BlogPost[];
    categories: string[];
  };
  testimonials: Testimonial[];
  stats: {
    trainers: number;
    clients: number;
    workoutsLogged: number;
  };
}
```

### Implementation Checklist

- [ ] Apply Stitch designs (LIGHT mode for landing)
- [ ] Build hero section with app mockup
- [ ] Create feature showcase with animations
- [ ] Implement pricing table with toggle (monthly/annual)
- [ ] Build changelog with release notes
- [ ] Create blog with markdown rendering
- [ ] Implement documentation site
- [ ] Add SEO meta tags for all pages
- [ ] Create testimonial carousel
- [ ] Build contact/demo request form

### Acceptance Criteria

1. Landing site loads in <2 seconds
2. Pricing displays correct tier info
3. Blog posts render markdown correctly
4. SEO meta tags are present
5. Demo request form submits to CRM

---

## Summary: Implementation Effort

| Sprint | Feature Area | Pages | Points | Duration |
|--------|-------------|-------|--------|----------|
| 58 | Auth & Onboarding | 15 | 18 | 1 week |
| 59 | Dashboard & Navigation | 2 | 12 | 4 days |
| 60 | Workouts | 10 | 25 | 1.5 weeks |
| 61 | Nutrition | 4 | 20 | 1 week |
| 62 | Coaching & Messages | 5 | 18 | 1 week |
| 63 | Client Management | 7 | 16 | 1 week |
| 64 | CRM & Marketing | 8 | 22 | 1.5 weeks |
| 65 | Settings & Profile | 14 | 18 | 1 week |
| 66 | Analytics & Business | 8 | 15 | 1 week |
| 67 | Franchise & Enterprise | 5 | 12 | 5 days |
| 68 | Help, Social & Specialty | 13 | 14 | 1 week |
| 69 | Landing Site | 11 | 18 | 1 week |
| **Total** | | **102** | **208** | **~12 weeks** |

---

## Critical Path Dependencies

```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│  Sprint 58     │────▶│  Sprint 59     │────▶│  Sprint 60     │
│  Auth & Onboard│     │  Dashboard     │     │  Workouts      │
│  (Week 1)      │     │  (Week 2)      │     │  (Week 2-3)    │
└────────────────┘     └────────────────┘     └────────────────┘
                                                     │
                       ┌────────────────┐            │
                       │  Sprint 61     │◀───────────┘
                       │  Nutrition     │
                       │  (Week 3-4)    │
                       └────────────────┘
                              │
         ┌───────────────────┬┴────────────────┐
         ▼                   ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│  Sprint 62     │  │  Sprint 63     │  │  Sprint 64     │
│  Coaching      │  │  Clients       │  │  CRM           │
│  (Week 4-5)    │  │  (Week 5)      │  │  (Week 5-6)    │
└────────────────┘  └────────────────┘  └────────────────┘
         │                   │                  │
         └───────────────────┼──────────────────┘
                             ▼
                   ┌────────────────┐
                   │  Sprint 65-69  │
                   │  Remaining     │
                   │  (Week 6-12)   │
                   └────────────────┘
```

---

## API Key Requirements

Before implementation can begin, the following API keys must be configured:

| API | Purpose | Sprint Dependency | Edge Function |
|-----|---------|-------------------|---------------|
| Deepgram Nova-3 | Voice STT | Sprint 60, 61 | `get-deepgram-key` |
| Nutritionix | Food search | Sprint 61 | `get-nutritionix-key` |
| Passio AI | Photo nutrition | Sprint 61 | `get-passio-key` |
| Claude/GPT-4 | AI coaching | Sprint 62 | `get-llm-key` |
| Resend | Email sending | Sprint 64 | `get-resend-key` |
| Stripe Connect | Payments | Sprint 65 | Via Stripe SDK |

---

## Testing Requirements

Each sprint must pass:

1. **Build Verification:** `npm run build` succeeds
2. **Unit Tests:** >80% coverage on new services
3. **E2E Tests:** Critical flows (auth, workout log, nutrition log)
4. **Design Fidelity:** Pixel comparison with Stitch exports
5. **Accessibility:** WCAG 2.1 AA compliance
6. **Performance:** Lighthouse score >90

---

## Related Documentation

- `STITCH_DESIGN_SPRINTS.md` - Design generation (Sprints 46-57)
- `DESIGN_SYSTEM.md` - Design tokens and patterns
- `GAP_ANALYSIS_2026.md` - Feature gaps and technology recommendations
- `IMPLEMENTATION_ASSESSMENT.md` - Current implementation status (68%)
- `AI_INTEGRATION.md` - LangGraph multi-agent architecture
- `WEARABLE_INTEGRATION.md` - Health Connect setup
- `STRIPE_CONNECT_IMPLEMENTATION.md` - Payment infrastructure
