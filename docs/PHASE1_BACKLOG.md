# FitOS Phase 1 Feature Backlog (Updated)

This document outlines the complete feature set for Phase 1 MVP, broken down into user stories and implementation tasks. Updated to include Sprint 0 foundation work and reflect the three-role architecture (Client, Trainer, Gym Owner).

---

## Sprint 0: Foundation & Architecture Setup
**Status:** ✅ MOSTLY COMPLETED

### 0.1 Authentication Guards & State Management
**Priority:** P0 (Critical)
**Status:** ✅ COMPLETED

**Implementation Tasks:**
- [x] Create auth service with signals
- [x] Create basic auth guard
- [x] Fix auth guard to properly wait for initialization
- [x] Create no-auth guard (redirects authenticated users away from auth pages)
- [x] Create role-based guards (trainer, client, gym_owner)
- [x] Implement auth state persistence across refreshes
- [x] Add loading state during auth check
- [ ] Create RoleRedirectComponent for automatic routing based on role (DEFERRED)

### 0.2 HTTP Interceptors
**Priority:** P0 (Critical)
**Status:** ✅ COMPLETED

**Implementation Tasks:**
- [x] Create auth interceptor (add Bearer token to requests)
- [x] Create error interceptor (handle 401, 403, 500 errors)
- [x] Create retry interceptor (exponential backoff for GET requests)
- [x] Create loading interceptor (show/hide loading indicator)
- [x] Create analytics interceptor (log API performance)
- [x] Register all interceptors in main.ts
- [x] Test interceptor chain order

### 0.3 Responsive Layout Fixes
**Priority:** P0 (Critical)
**Status:** NOT STARTED

**Known Issues:**
- Settings page not responsive on tablet/desktop
- Home page cards layout broken (workouts/streak cards misaligned)
- Cards too large on desktop viewports
- "No workout scheduled" card oversized on tablet
- Cards not horizontally centered in grid

**Implementation Tasks:**
- [ ] Fix IonGrid usage in dashboard components
- [ ] Add proper size/sizeMd/sizeLg attributes to all ion-col elements
- [ ] Create responsive card styles with max-width constraints
- [ ] Center card grid on all breakpoints
- [ ] Fix settings page layout for tablet/desktop
- [ ] Test on mobile (375px), tablet (768px), desktop (1200px+) viewports
- [ ] Add container max-width for large screens

### 0.4 Route Protection
**Priority:** P0 (Critical)
**Status:** PARTIAL

**Known Issues:**
- Workouts page shows "not logged in" but is still viewable
- Signout button visible/active when not logged in
- No redirect to login for protected routes

**Implementation Tasks:**
- [ ] Ensure ALL routes except /auth/* require authentication
- [ ] Add redirect to /auth/login for unauthenticated users
- [ ] Store intended route for post-login redirect (returnUrl)
- [ ] Fix "not logged in" message - should redirect, not display
- [ ] Conditionally show/hide signout button based on auth state
- [ ] Add proper loading states during route transitions
- [ ] Implement canMatch guards for lazy-loaded routes

### 0.5 PWA Setup
**Priority:** P1 (High)
**Status:** ✅ COMPLETED

**Implementation Tasks:**
- [x] Run `ng add @angular/pwa` in apps/mobile
- [x] Configure ngsw-config.json for app assets (prefetch)
- [x] Configure data caching strategies (performance vs freshness)
- [x] Create manifest.webmanifest with FitOS branding
- [x] Generate PWA icons (all required sizes: 72, 96, 128, 144, 192, 512)
- [ ] Create UpdateService for app update handling (DEFERRED)
- [ ] Add update available prompt/modal (DEFERRED)
- [x] Service Worker registered in main.ts
- [x] Enabled only in production builds

### 0.6 Animations
**Priority:** P2 (Medium)
**Status:** NOT STARTED

**Implementation Tasks:**
- [ ] Add fade-in animations for page loads
- [ ] Add list stagger animations for workout/exercise lists
- [ ] Add card entrance animations for dashboard cards
- [ ] Configure Ionic page transitions (IonicRouteStrategy)
- [ ] Add loading skeleton animations
- [ ] Create shared animation triggers file

---

## Epic 1: Authentication & User Management

### 1.1 Supabase Auth Integration
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** IN PROGRESS

**User Stories:**
- As a user, I can sign up with email/password so I can create an account
- As a user, I can sign in with Google so I can use my existing account
- As a user, I can sign in with Apple so I can use my existing account
- As a user, I can reset my password if I forget it
- As a user, I can sign out of my account

**Implementation Tasks:**
- [x] Configure Supabase Auth in project
- [x] Create auth service with login/logout/register methods
- [x] Implement email/password authentication
- [ ] Configure Google OAuth provider
- [ ] Configure Apple OAuth provider (requires Apple Developer account)
- [x] Create password reset flow
- [x] Implement auth guards for protected routes
- [x] Add auth state management (signals)
- [ ] Improve login page UI styling
- [ ] Improve registration page UI styling
- [x] Handle auth errors gracefully

### 1.2 Role-Based Access Control
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** NEEDS UPDATE

**User Stories:**
- As a new user, I can choose whether I'm a trainer, client, or gym owner during signup
- As a trainer, I see a trainer-specific dashboard
- As a client, I see a client-specific dashboard
- As a gym owner, I see an owner-specific dashboard

**Implementation Tasks:**
- [ ] Add role selection step to registration flow
- [ ] Update database schema for roles (add user_role enum)
- [ ] Create RoleRedirectComponent that routes to correct dashboard
- [ ] Implement role-based route guards (trainerGuard, clientGuard, ownerGuard)
- [ ] Create separate tab navigation for each role
- [ ] Add role check utilities (isTrainer(), isClient(), isOwner())
- [ ] Create facilities table for gym owners
- [ ] Create facility_trainers junction table
- [ ] Add facility_id to profiles table

### 1.3 Onboarding Flow
**Priority:** P1 (High)
**Sprint:** 2

**User Stories:**
- As a new trainer, I can complete my business profile
- As a trainer, I can add my certifications and specializations
- As a trainer, I can upload a profile photo
- As a new client, I can enter my fitness goals
- As a client, I can enter basic health information

**Implementation Tasks:**
- [ ] Create multi-step onboarding wizard component
- [ ] Build trainer onboarding steps:
  - Business info (name, bio, timezone)
  - Certifications (multi-select)
  - Specializations (tags)
  - Avatar upload
- [ ] Build client onboarding steps:
  - Fitness goals (multi-select)
  - Experience level (beginner/intermediate/advanced)
  - Availability preferences
  - Basic measurements (optional)
- [ ] Implement avatar upload to Supabase Storage
- [ ] Create onboarding progress indicator
- [ ] Add skip/complete later option
- [ ] Mark onboarding complete in profile

### 1.4 Client Invitation System
**Priority:** P1 (High)
**Sprint:** 2
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can invite a new client via email ✅
- As a trainer, I can generate a shareable invite link ✅
- As a potential client, I can accept an invitation and create an account ✅
- As a trainer, I can see pending invitations ✅

**Implementation Tasks:**
- [x] Create invitations table in database
- [x] Build invite generation API (email + shareable link)
- [x] Create invite email template
- [x] Integrate email sending (Supabase email or Resend)
- [x] Build invite acceptance flow
- [x] Auto-associate client with trainer on acceptance
- [x] Create pending invites list UI for trainers
- [x] Add invite expiration (7 days default)
- [x] Allow resending expired invites

---

## Epic 2: Dashboard System

### 2.1 Client Dashboard
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I see my today's workout prominently ✅
- As a client, I see my weekly progress at a glance ✅
- As a client, I can quickly start my workout ✅
- As a client, I see my nutrition summary (if tracking) ✅
- As a client, I see unread messages from my trainer (deferred to Epic 10)

**Implementation Tasks:**
- [x] Create ClientDashboardPage component
- [x] Build today's workout hero card with quick-start button
- [x] Build stats row (workouts this week, current streak)
- [x] Build nutrition summary card (conditional on nutrition tracking)
- [x] Build upcoming workouts list
- [ ] Build wearable data card (conditional on connected devices) - deferred to Epic 9
- [x] Implement pull-to-refresh
- [x] Add loading skeletons for all sections
- [x] Make fully responsive (mobile-first)

### 2.2 Trainer Dashboard
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I see an overview of all my clients ✅
- As a trainer, I see clients who need my attention ✅
- As a trainer, I see today's scheduled sessions ✅
- As a trainer, I can quickly take common actions (deferred to later sprint)

**Implementation Tasks:**
- [x] Create TrainerDashboardPage component
- [x] Build client overview stats card (total, active, new this month)
- [x] Build "needs attention" section (missed workouts, unread messages)
- [x] Build today's schedule section (workouts today)
- [x] Build recent activity feed
- [ ] Build quick action buttons (new workout, invite client, etc.) - deferred
- [x] Add revenue summary card (if payments enabled)
- [x] Implement pull-to-refresh
- [x] Add loading skeletons
- [x] Make fully responsive

**Notes:** Dashboard is fully implemented with placeholder data. Backend service integration pending (marked with TODO comments in code).

### 2.3 Gym Owner Dashboard
**Priority:** P2 (Medium)
**Sprint:** 6

**User Stories:**
- As a gym owner, I see facility-wide metrics
- As a gym owner, I see trainer performance
- As a gym owner, I see revenue summary
- As a gym owner, I can manage trainers

**Implementation Tasks:**
- [ ] Create OwnerDashboardPage component
- [ ] Build facility stats card (total clients, trainers, retention)
- [ ] Build revenue overview card
- [ ] Build trainer performance table
- [ ] Build client acquisition metrics
- [ ] Build pending actions list

---

## Epic 3: Exercise Library

### 3.1 Exercise Database
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can browse a library of exercises ✅
- As a trainer, I can search for exercises by name ✅
- As a trainer, I can filter exercises by muscle group and equipment ✅
- As a client, I can view exercise demonstrations during workouts ✅

**Implementation Tasks:**
- [x] Seed database with 200+ common exercises
- [x] Create exercise search API endpoint
- [x] Implement full-text search on exercise names
- [x] Create filter by muscle group endpoint
- [x] Create filter by equipment endpoint
- [x] Build exercise library page UI
- [x] Implement search input with debounce (300ms)
- [x] Build filter chips UI
- [x] Create exercise card component
- [x] Add infinite scroll or pagination (20 per page)
- [x] Create exercise detail modal with video

### 3.2 Custom Exercises
**Priority:** P2 (Medium)
**Sprint:** 3

**User Stories:**
- As a trainer, I can create custom exercises
- As a trainer, I can edit my custom exercises
- As a trainer, I can delete my custom exercises
- As a trainer, I can add video demonstrations

**Implementation Tasks:**
- [ ] Create exercise form component
- [ ] Implement create exercise API
- [ ] Implement update exercise API
- [ ] Implement delete exercise API (soft delete)
- [ ] Add video URL field (YouTube/Vimeo embed)
- [ ] Add thumbnail upload to Supabase Storage
- [ ] Show custom exercises in library with "Custom" badge
- [ ] Add edit/delete buttons for own exercises

---

## Epic 4: Workout Builder (Trainer)

### 4.1 Workout Template Creation
**Priority:** P0 (Critical)
**Sprint:** 2
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can create a workout template ✅
- As a trainer, I can add exercises to a template ✅
- As a trainer, I can set sets, reps, and rest time for each exercise ✅
- As a trainer, I can reorder exercises via drag-and-drop ✅
- As a trainer, I can save a template for reuse ✅

**Implementation Tasks:**
- [x] Create workout builder page
- [x] Build template metadata form (name, description, tags)
- [x] Implement exercise picker (search + add)
- [x] Create exercise row component with sets/reps/rest inputs
- [x] Implement drag-and-drop reordering (CDK DragDrop)
- [x] Add remove exercise button
- [x] Create save template API
- [x] Add template validation
- [ ] Implement auto-save draft (DEFERRED)
- [ ] Add supersets/circuits support (DEFERRED)

### 4.2 Template Management
**Priority:** P1 (High)
**Sprint:** 2
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can view all my workout templates ✅
- As a trainer, I can duplicate a template ✅
- As a trainer, I can edit an existing template ✅
- As a trainer, I can delete a template ✅
- As a trainer, I can organize templates by category ✅

**Implementation Tasks:**
- [x] Create template list page (workout-list.page.ts)
- [x] Build template card component with actions menu
- [x] Implement template duplicate API
- [x] Pre-populate builder when editing
- [x] Implement template delete with confirmation
- [x] Add template search/filter
- [x] Add template categories/tags

### 4.3 Program Assignment
**Priority:** P0 (Critical)
**Sprint:** 3
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can assign a workout to a client ✅
- As a trainer, I can schedule workouts on specific dates ✅
- As a trainer, I can assign multiple workouts at once (weekly program) ✅
- As a trainer, I can add private notes to assigned workouts ✅

**Implementation Tasks:**
- [x] Create assign workout modal/page
- [x] Build client selector dropdown
- [x] Implement date picker for scheduling
- [x] Create bulk assignment (select multiple dates)
- [x] Add trainer notes field (private)
- [x] Create assigned workouts API
- [x] Show assignment confirmation
- [ ] Send push notification to client (optional) - DEFERRED

---

## Epic 5: Workout Logging (Client)

### 5.1 Today's Workout
**Priority:** P0 (Critical)
**Sprint:** 3
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I can see today's assigned workout ✅
- As a client, I can start a workout ✅
- As a client, I can see each exercise with prescribed sets/reps ✅
- As a client, I can log my actual sets/reps/weight ✅
- As a client, I can complete a workout ✅

**Implementation Tasks:**
- [x] Create workout player page (active-workout.page.ts)
- [x] Build workout detail view
- [x] Create exercise card with logging inputs
- [x] Implement one-tap set completion (match prescription)
- [x] Add quick adjust for different weight/reps
- [x] Implement set logging API
- [x] Add workout start timestamp
- [x] Add workout completion flow
- [x] Calculate workout duration automatically
- [x] Show completion summary screen

### 5.2 Rest Timer
**Priority:** P1 (High)
**Sprint:** 3
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I see a rest timer after completing a set ✅
- As a client, I get a notification when rest is complete ✅
- As a client, I can skip the rest timer ✅

**Implementation Tasks:**
- [x] Create rest timer component
- [x] Auto-start timer after set completion
- [x] Show countdown with circular progress
- [x] Implement skip button
- [x] Add audio/vibration notification on completion
- [x] Use exercise-specific rest time from workout

### 5.3 Workout History
**Priority:** P1 (High)
**Sprint:** 4
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I can view my past workouts ✅
- As a client, I can see details of a past workout ✅
- As a trainer, I can view a client's workout history ✅

**Implementation Tasks:**
- [x] Create workout history list page
- [x] Build calendar view option
- [x] Create workout history card (date, name, duration)
- [x] Build workout detail view (exercises, sets logged)
- [x] Add filter by date range
- [x] Implement trainer view of client history

### 5.4 Progress Charts
**Priority:** P2 (Medium)
**Sprint:** 4
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I can see my strength progress over time ✅
- As a client, I can see my volume progress over time ✅
- As a trainer, I can view a client's progress charts ✅

**Implementation Tasks:**
- [x] Integrate charting library (Chart.js)
- [x] Create exercise progress query (max weight over time)
- [x] Build strength progress chart component
- [x] Create volume progress query
- [x] Build volume chart component
- [x] Add exercise selector for charts
- [x] Add statistics summary (current, best, improvement %)
- [ ] Add date range filter (FUTURE ENHANCEMENT)

---

## Epic 6: Nutrition Tracking

### 6.1 Food Database Integration
**Priority:** P1 (High)
**Sprint:** 4
**Status:** ✅ COMPLETED

**User Stories:**
- As a user, I can search for foods ✅
- As a user, I can see nutrition info for a food ✅
- As a user, I can see portion size options ✅

**Implementation Tasks:**
- [x] Integrate USDA FoodData Central API
- [x] Create food search service
- [x] Cache common foods in local database
- [x] Build food search UI with results
- [x] Create food detail modal with nutrition info
- [x] Show serving size options
- [x] Handle API rate limits gracefully

### 6.2 Nutrition Logging
**Priority:** P1 (High)
**Sprint:** 5
**Status:** ✅ COMPLETED

**User Stories:**
- As a client, I can log food I've eaten ✅
- As a client, I can select the meal type (breakfast, lunch, dinner, snack) ✅
- As a client, I can adjust portion sizes ✅
- As a client, I can see my daily nutrition summary ✅

**Implementation Tasks:**
- [x] Create daily nutrition log page
- [x] Build add food flow (search -> select -> log)
- [x] Implement meal type selector
- [x] Add servings/portion input
- [x] Create nutrition entry API
- [x] Build daily summary card (calories, protein, carbs, fat)
- [x] Show progress bars for each macro
- [x] Implement quick re-log recent foods

### 6.3 Adherence-Neutral UI
**Priority:** P1 (High)
**Sprint:** 5

**User Stories:**
- As a client, I don't see red "over target" warnings
- As a client, I see neutral, non-judgmental presentation of my intake

**Implementation Tasks:**
- [ ] Design neutral color palette (no red for "over")
- [ ] Show targets as reference, not limits
- [ ] Use encouraging language in UI copy
- [ ] Avoid "good/bad" food labeling
- [ ] Show weekly averages (more forgiving than daily)
- [ ] Use neutral progress indicators (blue/gray palette)

### 6.4 Nutrition Targets
**Priority:** P2 (Medium)
**Sprint:** 5
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can set calorie/macro targets for a client ✅
- As a client, I can see my targets on the nutrition page ✅
- As a trainer, I can adjust targets over time ✅

**Implementation Tasks:**
- [x] Create target setting form for trainers
- [x] Build target management API (NutritionService.setTargets)
- [x] Show current targets on client nutrition page
- [x] Track target history (when changed via effective_from date)
- [x] Macro breakdown visualization
- [x] Validation and warning system
- [x] Private notes field

---

## Epic 7: Payment Integration

### 7.1 Stripe Connect Onboarding
**Priority:** P0 (Critical)
**Sprint:** 5

**User Stories:**
- As a trainer, I can connect my Stripe account
- As a trainer, I complete Stripe onboarding to receive payments
- As a trainer, I can see my Stripe connection status

**Implementation Tasks:**
- [ ] Set up Stripe Connect (Standard accounts)
- [ ] Create Stripe connect onboarding flow
- [ ] Store Stripe account ID in trainer profile
- [ ] Create connect/disconnect Stripe UI
- [ ] Handle Stripe webhooks for account updates
- [ ] Show connection status on settings page

### 7.2 Subscription Management
**Priority:** P0 (Critical)
**Sprint:** 6

**User Stories:**
- As a trainer, I can create subscription tiers
- As a client, I can subscribe to a trainer's service
- As a client, I can manage my subscription
- As a trainer, I can see my active subscriptions

**Implementation Tasks:**
- [ ] Create subscription products in Stripe
- [ ] Build trainer pricing configuration UI
- [ ] Implement client subscription checkout
- [ ] Handle subscription webhooks (created, updated, cancelled)
- [ ] Store subscription status in database
- [ ] Build subscription management UI for clients
- [ ] Create subscription revenue dashboard for trainers

### 7.3 Payment History
**Priority:** P2 (Medium)
**Sprint:** 6

**User Stories:**
- As a trainer, I can view my payment history
- As a client, I can view my payment history

**Implementation Tasks:**
- [ ] Fetch payments from Stripe API
- [ ] Build payment history list UI
- [ ] Add date range filter
- [ ] Show payment status badges
- [ ] Generate basic revenue reports

---

## Epic 8: Client Management (Trainer)

### 8.1 Client List
**Priority:** P0 (Critical)
**Sprint:** 1
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can view all my clients ✅
- As a trainer, I can search/filter clients ✅
- As a trainer, I can see client status at a glance ✅

**Implementation Tasks:**
- [x] Create client list page
- [x] Build client card component (name, photo, status)
- [x] Add search input with filter
- [x] Show subscription status badge
- [x] Show last activity indicator
- [x] Add quick actions menu (message, view profile)

### 8.2 Client Profile View
**Priority:** P1 (High)
**Sprint:** 4
**Status:** ✅ COMPLETED

**User Stories:**
- As a trainer, I can view a client's full profile ✅
- As a trainer, I can see a client's goals and notes ✅
- As a trainer, I can add notes about a client ✅

**Implementation Tasks:**
- [x] Create client profile page
- [x] Show personal info section
- [x] Show goals section
- [x] Show injuries/limitations
- [x] Create trainer notes section
- [x] Implement notes CRUD
- [x] Show subscription info
- [x] Link to workout history

### 8.3 Measurements & Progress Photos
**Priority:** P2 (Medium)
**Sprint:** 7

**User Stories:**
- As a client, I can log my weight and measurements
- As a client, I can upload progress photos
- As a trainer, I can view a client's measurements over time

**Implementation Tasks:**
- [ ] Create measurement logging form
- [ ] Build measurement history view
- [ ] Create weight chart
- [ ] Implement secure photo upload (Supabase Storage)
- [ ] Build progress photo gallery
- [ ] Add photo comparison view (side by side)
- [ ] Ensure photos are private (RLS policies)

---

## Epic 9: Wearable Integration

### 9.1 Terra API Setup
**Priority:** P2 (Medium)
**Sprint:** 6

**User Stories:**
- As a client, I can connect my wearable device
- As a client, I see my wearable data on my dashboard

**Implementation Tasks:**
- [ ] Set up Terra API account
- [ ] Create Terra webhook endpoint
- [ ] Build device connection flow
- [ ] Store device connections in database
- [ ] Process incoming wearable data
- [ ] Display wearable data on client dashboard

### 9.2 Wearable Data Display
**Priority:** P2 (Medium)
**Sprint:** 7

**User Stories:**
- As a client, I can see my steps, heart rate, and sleep data
- As a trainer, I can view a client's wearable data

**Implementation Tasks:**
- [ ] Create wearable data card component
- [ ] Display steps, resting HR, sleep hours
- [ ] Add HRV display (if available)
- [ ] Create wearable data charts
- [ ] Build trainer view of client wearable data

---

## Epic 10: Communication

### 10.1 In-App Messaging
**Priority:** P2 (Medium)
**Sprint:** 8

**User Stories:**
- As a trainer, I can message a client
- As a client, I can message my trainer
- As a user, I can see unread message count

**Implementation Tasks:**
- [ ] Create messages table (verify schema)
- [ ] Build conversation list page
- [ ] Create chat interface
- [ ] Implement real-time updates (Supabase Realtime)
- [ ] Add unread badge to navigation
- [ ] Mark messages as read on view
- [ ] Add message push notifications

---

## Sprint Summary

| Sprint | Duration | Focus |
|--------|----------|-------|
| 0 | 1 week | Foundation (Guards, Interceptors, Layout, PWA) |
| 1 | 2 weeks | Auth, Exercise Library, Dashboards, Client List |
| 2 | 2 weeks | Onboarding, Workout Builder, Client Invites |
| 3 | 2 weeks | Program Assignment, Client Workout Logging |
| 4 | 2 weeks | Workout History, Client Management, Charts, Nutrition DB |
| 5 | 2 weeks | Nutrition Tracking, Stripe Connect |
| 6 | 2 weeks | Subscriptions, Terra Setup, Owner Dashboard |
| 7 | 2 weeks | Wearable Data, Measurements, Progress Photos |
| 8 | 2 weeks | Messaging, Polish, Bug Fixes |

---

## Definition of Done

For each feature to be considered complete:

- [ ] Code implemented and working
- [ ] TypeScript strict mode passing
- [ ] Unit tests written (>80% coverage for services)
- [ ] E2E tests for critical user paths
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Responsive (mobile-first, tested at 375px, 768px, 1200px)
- [ ] Error handling implemented with user-friendly messages
- [ ] Loading states added (skeletons or spinners)
- [ ] OnPush change detection used
- [ ] Deployed to staging environment
