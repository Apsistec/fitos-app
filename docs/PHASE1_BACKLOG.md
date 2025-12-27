# FitOS Phase 1 Feature Backlog

This document outlines the complete feature set for Phase 1 MVP (Months 1-3), broken down into user stories and implementation tasks.

---

## Epic 1: Authentication & User Management

### 1.1 Supabase Auth Integration
**Priority:** P0 (Critical)
**Sprint:** 1

**User Stories:**
- As a user, I can sign up with email/password so I can create an account
- As a user, I can sign in with Google so I can use my existing account
- As a user, I can sign in with Apple so I can use my existing account
- As a user, I can reset my password if I forget it
- As a user, I can sign out of my account

**Implementation Tasks:**
- [ ] Configure Supabase Auth in project
- [ ] Create auth service with login/logout/register methods
- [ ] Implement email/password authentication
- [ ] Configure Google OAuth provider
- [ ] Configure Apple OAuth provider
- [ ] Create password reset flow
- [ ] Implement auth guards for protected routes
- [ ] Add auth state management (NgRx or signals)
- [ ] Create login page UI
- [ ] Create registration page UI
- [ ] Handle auth errors gracefully

### 1.2 Role-Based Access
**Priority:** P0 (Critical)
**Sprint:** 1

**User Stories:**
- As a new user, I can choose whether I'm a trainer or client during signup
- As a trainer, I see a trainer-specific dashboard
- As a client, I see a client-specific dashboard

**Implementation Tasks:**
- [ ] Add role selection to registration flow
- [ ] Create trainer_profiles record on trainer signup
- [ ] Create client_profiles record on client signup
- [ ] Implement role-based route guards
- [ ] Create separate navigation for trainer/client
- [ ] Add role check utilities

### 1.3 Trainer Onboarding
**Priority:** P1 (High)
**Sprint:** 2

**User Stories:**
- As a new trainer, I can complete my business profile
- As a trainer, I can add my certifications and specializations
- As a trainer, I can upload a profile photo

**Implementation Tasks:**
- [ ] Create onboarding wizard component
- [ ] Build business info form (name, bio, timezone)
- [ ] Build certifications input (multi-select/tags)
- [ ] Build specializations input
- [ ] Implement avatar upload to Supabase Storage
- [ ] Create onboarding progress indicator
- [ ] Add skip/complete later option
- [ ] Mark onboarding complete in profile

### 1.4 Client Invitation System
**Priority:** P1 (High)
**Sprint:** 2

**User Stories:**
- As a trainer, I can invite a new client via email
- As a trainer, I can generate a shareable invite link
- As a potential client, I can accept an invitation and create an account
- As a trainer, I can see pending invitations

**Implementation Tasks:**
- [ ] Create invitations table in database
- [ ] Build invite generation API (email + link)
- [ ] Create invite email template
- [ ] Integrate email sending (Supabase/Resend)
- [ ] Build invite acceptance flow
- [ ] Auto-associate client with trainer on acceptance
- [ ] Create pending invites list UI for trainers
- [ ] Add invite expiration (7 days default)

---

## Epic 2: Exercise Library

### 2.1 Exercise Database
**Priority:** P0 (Critical)
**Sprint:** 1

**User Stories:**
- As a trainer, I can browse a library of exercises
- As a trainer, I can search for exercises by name
- As a trainer, I can filter exercises by muscle group and equipment

**Implementation Tasks:**
- [ ] Seed database with 200+ common exercises
- [ ] Create exercise search API endpoint
- [ ] Implement full-text search on exercise names
- [ ] Create filter by category endpoint
- [ ] Create filter by muscle group endpoint
- [ ] Create filter by equipment endpoint
- [ ] Build exercise library page UI
- [ ] Implement search input with debounce
- [ ] Build filter chips/dropdown UI
- [ ] Create exercise card component
- [ ] Add infinite scroll or pagination

### 2.2 Custom Exercises
**Priority:** P2 (Medium)
**Sprint:** 3

**User Stories:**
- As a trainer, I can create custom exercises
- As a trainer, I can edit my custom exercises
- As a trainer, I can delete my custom exercises

**Implementation Tasks:**
- [ ] Create exercise form component
- [ ] Implement create exercise API
- [ ] Implement update exercise API
- [ ] Implement delete exercise API
- [ ] Add video URL field (YouTube/Vimeo embed)
- [ ] Add thumbnail upload
- [ ] Show custom exercises in library with badge
- [ ] Add edit/delete buttons for own exercises

---

## Epic 3: Workout Builder (Trainer)

### 3.1 Workout Template Creation
**Priority:** P0 (Critical)
**Sprint:** 2

**User Stories:**
- As a trainer, I can create a workout template
- As a trainer, I can add exercises to a template
- As a trainer, I can set sets, reps, and rest time for each exercise
- As a trainer, I can reorder exercises via drag-and-drop
- As a trainer, I can save a template for reuse

**Implementation Tasks:**
- [ ] Create workout builder page
- [ ] Build template metadata form (name, description, tags)
- [ ] Implement exercise picker (search + add)
- [ ] Create exercise row component with sets/reps/rest inputs
- [ ] Implement drag-and-drop reordering (CDK DragDrop)
- [ ] Add remove exercise button
- [ ] Create save template API
- [ ] Add template validation
- [ ] Implement auto-save draft

### 3.2 Template Management
**Priority:** P1 (High)
**Sprint:** 2

**User Stories:**
- As a trainer, I can view all my workout templates
- As a trainer, I can duplicate a template
- As a trainer, I can edit an existing template
- As a trainer, I can delete a template

**Implementation Tasks:**
- [ ] Create template list page
- [ ] Build template card component with actions
- [ ] Implement template duplicate API
- [ ] Pre-populate builder when editing
- [ ] Implement template delete with confirmation
- [ ] Add template search/filter

### 3.3 Program Assignment
**Priority:** P0 (Critical)
**Sprint:** 3

**User Stories:**
- As a trainer, I can assign a workout to a client
- As a trainer, I can schedule workouts on specific dates
- As a trainer, I can assign multiple workouts at once (weekly program)
- As a trainer, I can add private notes to assigned workouts

**Implementation Tasks:**
- [ ] Create assign workout modal/page
- [ ] Build client selector dropdown
- [ ] Implement date picker for scheduling
- [ ] Create bulk assignment (select multiple dates)
- [ ] Add trainer notes field (private)
- [ ] Create assigned workouts API
- [ ] Show assignment confirmation
- [ ] Send notification to client (optional)

---

## Epic 4: Workout Logging (Client)

### 4.1 Today's Workout
**Priority:** P0 (Critical)
**Sprint:** 3

**User Stories:**
- As a client, I can see today's assigned workout
- As a client, I can start a workout
- As a client, I can see each exercise with prescribed sets/reps
- As a client, I can log my actual sets/reps/weight
- As a client, I can complete a workout

**Implementation Tasks:**
- [ ] Create workout dashboard showing today's workout
- [ ] Build workout detail page
- [ ] Create exercise card with logging inputs
- [ ] Implement one-tap set completion (match prescription)
- [ ] Add quick adjust for different weight/reps
- [ ] Implement set logging API
- [ ] Add workout start timestamp
- [ ] Add workout completion flow
- [ ] Calculate workout duration
- [ ] Show completion summary

### 4.2 Rest Timer
**Priority:** P1 (High)
**Sprint:** 3

**User Stories:**
- As a client, I see a rest timer after completing a set
- As a client, I get a notification when rest is complete
- As a client, I can skip the rest timer

**Implementation Tasks:**
- [ ] Create rest timer component
- [ ] Auto-start timer after set completion
- [ ] Show countdown with visual progress
- [ ] Implement skip button
- [ ] Add audio/vibration notification
- [ ] Use exercise-specific rest time

### 4.3 Workout History
**Priority:** P1 (High)
**Sprint:** 4

**User Stories:**
- As a client, I can view my past workouts
- As a client, I can see details of a past workout
- As a trainer, I can view a client's workout history

**Implementation Tasks:**
- [ ] Create workout history list page
- [ ] Build calendar view option
- [ ] Create workout history card (date, name, duration)
- [ ] Build workout detail view (exercises, sets logged)
- [ ] Add filter by date range
- [ ] Implement trainer view of client history

### 4.4 Progress Charts
**Priority:** P2 (Medium)
**Sprint:** 4

**User Stories:**
- As a client, I can see my strength progress over time
- As a client, I can see my volume progress over time
- As a trainer, I can view a client's progress charts

**Implementation Tasks:**
- [ ] Integrate charting library (ngx-charts or Chart.js)
- [ ] Create exercise progress query (max weight over time)
- [ ] Build strength progress chart component
- [ ] Create volume progress query
- [ ] Build volume chart component
- [ ] Add exercise selector for charts
- [ ] Add date range filter

---

## Epic 5: Nutrition Tracking

### 5.1 Food Database Integration
**Priority:** P1 (High)
**Sprint:** 4

**User Stories:**
- As a user, I can search for foods
- As a user, I can see nutrition info for a food
- As a user, I can see portion size options

**Implementation Tasks:**
- [ ] Integrate USDA FoodData Central API
- [ ] Create food search service
- [ ] Cache common foods in local database
- [ ] Build food search UI with results
- [ ] Create food detail modal with nutrition info
- [ ] Show serving size options
- [ ] Handle API rate limits gracefully

### 5.2 Nutrition Logging
**Priority:** P1 (High)
**Sprint:** 5

**User Stories:**
- As a client, I can log food I've eaten
- As a client, I can select the meal type (breakfast, lunch, dinner, snack)
- As a client, I can adjust portion sizes
- As a client, I can see my daily nutrition summary

**Implementation Tasks:**
- [ ] Create daily nutrition log page
- [ ] Build add food flow (search -> select -> log)
- [ ] Implement meal type selector
- [ ] Add servings/portion input
- [ ] Create nutrition entry API
- [ ] Build daily summary card (calories, protein, carbs, fat)
- [ ] Show progress bars for each macro
- [ ] Implement quick re-log recent foods

### 5.3 Adherence-Neutral UI
**Priority:** P1 (High)
**Sprint:** 5

**User Stories:**
- As a client, I don't see red "over target" warnings
- As a client, I see neutral, non-judgmental presentation of my intake

**Implementation Tasks:**
- [ ] Design neutral color palette (no red)
- [ ] Show targets as reference, not limits
- [ ] Use encouraging language in UI copy
- [ ] Avoid "good/bad" food labeling
- [ ] Show weekly averages (more forgiving than daily)

### 5.4 Nutrition Targets
**Priority:** P2 (Medium)
**Sprint:** 5

**User Stories:**
- As a trainer, I can set calorie/macro targets for a client
- As a client, I can see my targets on the nutrition page
- As a trainer, I can adjust targets over time

**Implementation Tasks:**
- [ ] Create target setting form for trainers
- [ ] Build target management API
- [ ] Show current targets on client dashboard
- [ ] Track target history (when changed)
- [ ] Allow client to view but not edit targets

---

## Epic 6: Payment Integration

### 6.1 Stripe Connect Onboarding
**Priority:** P0 (Critical)
**Sprint:** 5

**User Stories:**
- As a trainer, I can connect my Stripe account
- As a trainer, I complete Stripe onboarding to receive payments
- As a trainer, I can see my Stripe connection status

**Implementation Tasks:**
- [ ] Set up Stripe Connect in test mode
- [ ] Create Stripe Connect onboarding flow
- [ ] Generate OAuth link for trainer onboarding
- [ ] Handle OAuth callback
- [ ] Store Stripe account ID in trainer profile
- [ ] Check onboarding completion status
- [ ] Show connected/pending status in settings

### 6.2 Subscription Management
**Priority:** P1 (High)
**Sprint:** 6

**User Stories:**
- As a trainer, I can create subscription plans
- As a trainer, I can assign a plan to a client
- As a client, I can view my active subscription
- As a client, I can update my payment method

**Implementation Tasks:**
- [ ] Create Stripe products/prices for trainer
- [ ] Build plan creation UI for trainers
- [ ] Create subscription assignment flow
- [ ] Implement Stripe Checkout for client payment
- [ ] Handle successful subscription webhook
- [ ] Store subscription in database
- [ ] Build client subscription view
- [ ] Add update payment method (Customer Portal)

### 6.3 Invoice & Payment Status
**Priority:** P2 (Medium)
**Sprint:** 6

**User Stories:**
- As a trainer, I can see all invoices for my clients
- As a trainer, I can see payment status (paid, overdue)
- As a client, I can view my invoice history

**Implementation Tasks:**
- [ ] Sync invoices via Stripe webhooks
- [ ] Create invoice list page for trainers
- [ ] Build invoice detail view
- [ ] Show payment status badges
- [ ] Add overdue payment alerts
- [ ] Create client invoice history view

---

## Epic 7: Wearable Integration

### 7.1 Terra API Setup
**Priority:** P1 (High)
**Sprint:** 6

**User Stories:**
- As a client, I can connect my wearable device
- As a client, I can choose from popular wearable brands

**Implementation Tasks:**
- [ ] Set up Terra API account
- [ ] Implement Terra widget for device connection
- [ ] Handle Terra OAuth callback
- [ ] Store Terra user ID and provider
- [ ] Create wearable connections list UI
- [ ] Add disconnect option

### 7.2 Health Data Sync
**Priority:** P1 (High)
**Sprint:** 7

**User Stories:**
- As a client, my sleep data syncs automatically
- As a client, my step count syncs automatically
- As a client, my heart rate data syncs automatically

**Implementation Tasks:**
- [ ] Set up Terra webhook endpoint
- [ ] Handle daily data webhook
- [ ] Parse and store sleep metrics
- [ ] Parse and store step count
- [ ] Parse and store resting heart rate
- [ ] Parse and store HRV (if available)
- [ ] Create data sync status indicator
- [ ] Handle sync errors gracefully

### 7.3 Wearable Dashboard
**Priority:** P2 (Medium)
**Sprint:** 7

**User Stories:**
- As a client, I can see my wearable data summary
- As a trainer, I can see a client's wearable data

**Implementation Tasks:**
- [ ] Create wearable data dashboard
- [ ] Build sleep summary card
- [ ] Build steps summary card
- [ ] Build heart rate/HRV card
- [ ] Add weekly trends view
- [ ] Create trainer view of client wearables
- [ ] **DO NOT show calorie burn** (intentional - research shows inaccuracy)

---

## Epic 8: Client Management

### 8.1 Client List
**Priority:** P0 (Critical)
**Sprint:** 4

**User Stories:**
- As a trainer, I can see all my clients
- As a trainer, I can search for a client
- As a trainer, I can see client status at a glance

**Implementation Tasks:**
- [ ] Create client list page
- [ ] Build client card component (name, photo, status)
- [ ] Add search input with filter
- [ ] Show subscription status badge
- [ ] Show last activity indicator
- [ ] Add quick actions (message, view profile)

### 8.2 Client Profile View
**Priority:** P1 (High)
**Sprint:** 4

**User Stories:**
- As a trainer, I can view a client's full profile
- As a trainer, I can see a client's goals and notes
- As a trainer, I can add notes about a client

**Implementation Tasks:**
- [ ] Create client profile page
- [ ] Show personal info section
- [ ] Show goals section
- [ ] Show injuries/limitations
- [ ] Create trainer notes section
- [ ] Implement notes CRUD
- [ ] Show subscription info
- [ ] Link to workout history

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
- [ ] Ensure photos are private (RLS)

---

## Epic 9: Communication

### 9.1 In-App Messaging
**Priority:** P2 (Medium)
**Sprint:** 8

**User Stories:**
- As a trainer, I can message a client
- As a client, I can message my trainer
- As a user, I can see unread message count

**Implementation Tasks:**
- [ ] Create messages table (already in schema)
- [ ] Build conversation list page
- [ ] Create chat interface
- [ ] Implement real-time updates (Supabase Realtime)
- [ ] Add unread badge to navigation
- [ ] Mark messages as read on view
- [ ] Add message notifications

---

## Sprint Summary

| Sprint | Duration | Focus |
|--------|----------|-------|
| 1 | 2 weeks | Auth, Exercise Library, Project Setup |
| 2 | 2 weeks | Trainer Onboarding, Workout Builder |
| 3 | 2 weeks | Program Assignment, Client Workout Logging |
| 4 | 2 weeks | Workout History, Client Management, Charts |
| 5 | 2 weeks | Nutrition Tracking, Stripe Connect |
| 6 | 2 weeks | Subscriptions, Terra Setup |
| 7 | 2 weeks | Wearable Data, Measurements |
| 8 | 2 weeks | Messaging, Polish, Bug Fixes |

---

## Definition of Done

For each feature to be considered complete:

- [ ] Code implemented and working
- [ ] Unit tests written (>80% coverage for services)
- [ ] E2E tests for critical paths
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Accessible (WCAG 2.1 AA)
- [ ] Responsive (mobile-first)
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Deployed to staging
