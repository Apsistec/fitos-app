# FitOS Implementation Sprints - Detailed Task Breakdown

**Created:** January 30, 2026
**Scope:** Sprints 58-69 (Design Implementation + Data Population)
**Total Duration:** 12 weeks (~208 story points)
**Prerequisites:** FINAL_SERVICE_DECISIONS.md, STITCH_DESIGN_SPRINTS.md

---

## Sprint Execution Overview

Each sprint follows this workflow:
1. **Design Application:** Apply Stitch-generated UI to Angular/Ionic components
2. **Data Integration:** Connect to real services via Supabase/Edge Functions
3. **Feature Implementation:** Complete any missing functionality from gap analysis
4. **Testing:** Unit tests, E2E tests, build verification
5. **Verification:** Visual comparison, accessibility audit

---

## SPRINT 58: Authentication & Onboarding
**Duration:** 1 week | **Points:** 18 | **Priority:** CRITICAL

### Objectives
- Apply dark-first design to all auth pages
- Complete MFA/Passkey flows
- Implement chronotype quiz in onboarding
- Test OAuth providers (Google, Apple)

### Detailed Tasks

#### 58.1 Auth Page Design Application (6 points)
```
Tasks:
[ ] Apply Stitch design to login-role-select.page.html
    - Role cards (Trainer/Client/Gym Owner) with glow effect
    - Dark background with accent highlights
    - Brand logo placement

[ ] Apply Stitch design to trainer-login.page.html
    - Email/password form with ion-input
    - "Forgot password?" link
    - SSO buttons (Google, Apple)
    - Error state styling (adherence-neutral)

[ ] Apply Stitch design to client-login.page.html
    - Similar to trainer but different accent
    - Trainer code input option
    - Remember me checkbox

[ ] Apply Stitch design to gym-owner-login.page.html
    - MFA prompt banner if enabled
    - Business-focused messaging

[ ] Apply Stitch design to register pages (3 variants)
    - Multi-step form indicator
    - Plan selection cards
    - Terms acceptance checkbox

[ ] Apply Stitch design to password-reset flows
    - Forgot password form
    - Email sent confirmation
    - New password form with strength indicator
```

#### 58.2 MFA & Passkey Implementation (5 points)
```
Tasks:
[ ] Complete mfa-setup.page.ts implementation
    - TOTP QR code generation
    - Recovery code display and download
    - SMS option (if enabled)

[ ] Complete mfa-verify.page.ts implementation
    - 6-digit input with auto-advance
    - Resend code button with cooldown
    - "Use recovery code" fallback

[ ] Test WebAuthn passkey flow
    - Registration ceremony
    - Authentication ceremony
    - Device management UI

[ ] Add MFA to auth guard for sensitive routes
    - Settings > Security
    - Settings > Payments
    - Client > Assign workout
```

#### 58.3 Onboarding Flow (4 points)
```
Tasks:
[ ] Create onboarding step indicator component
    - Progress dots/bar
    - Step titles
    - Skip option (where allowed)

[ ] Implement profile setup step
    - Avatar upload with camera option
    - Name, bio, timezone
    - Role-specific fields

[ ] Implement chronotype quiz step
    - 5-item rMEQ questionnaire
    - Calculate chronotype score
    - Save to user preferences

[ ] Implement goals setup step
    - Goal selection cards
    - Custom goal input
    - Priority ranking

[ ] Implement trainer code step (clients only)
    - Code input with validation
    - QR scan option
    - Skip and find later option
```

#### 58.4 OAuth Integration Testing (3 points)
```
Tasks:
[ ] Test Google OAuth flow end-to-end
    - Popup vs redirect
    - New user creation
    - Existing user linking

[ ] Test Apple OAuth flow end-to-end
    - Sign in with Apple button styling
    - Private email relay handling
    - Real name extraction

[ ] Test email verification flow
    - Send verification email
    - Token validation
    - Resend functionality
```

### Acceptance Criteria
- [ ] All auth pages match Stitch designs ≥95%
- [ ] User registration creates profile in Supabase
- [ ] MFA setup generates valid TOTP codes
- [ ] OAuth creates/links accounts correctly
- [ ] Onboarding saves all data to user profile
- [ ] `npm run build` succeeds with no errors

---

## SPRINT 59: Dashboard & Core Navigation
**Duration:** 4 days | **Points:** 12 | **Priority:** CRITICAL

### Objectives
- Implement role-based dashboard switching
- Create real-time data subscriptions
- Build tab navigation with badge counts

### Detailed Tasks

#### 59.1 Role-Based Dashboard (6 points)
```
Tasks:
[ ] Create DashboardService with role detection
    interface DashboardService {
      userRole: Signal<UserRole>;
      dashboardData: Signal<DashboardData>;
      loadDashboard(): Promise<void>;
      subscribeToUpdates(): Subscription;
    }

[ ] Implement TrainerDashboardComponent
    - Today's sessions card (ion-card with list)
    - Active clients count with trend
    - Pending messages badge
    - Weekly revenue chart (Chart.js mini)
    - Clients needing attention alerts

[ ] Implement ClientDashboardComponent
    - Today's workout hero card
    - Nutrition progress rings (adherence-neutral)
    - Current streak display
    - Next session countdown
    - AI coach quick access

[ ] Implement GymOwnerDashboardComponent
    - Monthly revenue overview
    - Active members/trainers count
    - Pending payouts banner
    - Location comparison (if multi-location)
```

#### 59.2 Real-Time Subscriptions (3 points)
```
Tasks:
[ ] Implement Supabase Realtime subscription
    // In DashboardService
    private setupRealtimeSubscription() {
      this.supabase.channel('dashboard')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id=eq.${this.userId}`
        }, () => this.refreshMessageCount())
        .subscribe();
    }

[ ] Add skeleton loading states for each card
    - Shimmer animation on load
    - Graceful transition to content

[ ] Implement pull-to-refresh
    - ion-refresher component
    - Reload all dashboard data
```

#### 59.3 Tab Navigation (3 points)
```
Tasks:
[ ] Create tabs.page.ts with role-based tabs
    // Trainer tabs
    const trainerTabs = [
      { tab: 'dashboard', icon: 'home' },
      { tab: 'clients', icon: 'people' },
      { tab: 'workouts', icon: 'barbell' },
      { tab: 'crm', icon: 'business' },
      { tab: 'settings', icon: 'settings' }
    ];

    // Client tabs
    const clientTabs = [
      { tab: 'dashboard', icon: 'home' },
      { tab: 'workouts', icon: 'barbell' },
      { tab: 'nutrition', icon: 'nutrition' },
      { tab: 'coaching', icon: 'chatbubbles' },
      { tab: 'settings', icon: 'settings' }
    ];

[ ] Implement badge counts on tabs
    - Messages unread count
    - Notifications count
    - Client attention count (trainer)

[ ] Add Ionicons (outline default, filled when active)
```

### Acceptance Criteria
- [ ] Dashboard loads within 2 seconds
- [ ] Role-appropriate content displays
- [ ] Real-time updates work (test with 2 browser tabs)
- [ ] Tab badges update on new data
- [ ] Pull-to-refresh works correctly

---

## SPRINT 60: Workouts
**Duration:** 1.5 weeks | **Points:** 25 | **Priority:** CRITICAL

### Objectives
- Complete workout builder with drag-and-drop
- Implement voice workout logging (Deepgram)
- Build active workout experience with rest timer
- Create progress charts

### Detailed Tasks

#### 60.1 Workout List & Templates (5 points)
```
Tasks:
[ ] Create workout-list.page.ts
    - Assigned workouts section (from trainer)
    - My templates section (user-created)
    - "Today's Workout" highlighted card
    - Filter by: date, muscle group, type

[ ] Create workout-card.component.ts
    - Exercise preview (first 3)
    - Duration estimate
    - Muscle group icons
    - Last completed date

[ ] Implement template creation modal
    - Name and description
    - Exercise selection
    - Save to templates
```

#### 60.2 Exercise Library (4 points)
```
Tasks:
[ ] Create exercise-library.page.ts
    - Grid view with muscle group icons
    - Search with debounce
    - Filter chips (muscle groups)
    - Favorites section

[ ] Create exercise-detail-modal.component.ts
    - Exercise video/animation placeholder
    - Muscle group diagram
    - Instructions text
    - Add to workout button

[ ] Create custom-exercise.page.ts
    - Name, description, category
    - Primary/secondary muscles
    - Equipment required
    - Video upload option
```

#### 60.3 Workout Builder (6 points)
```
Tasks:
[ ] Create workout-builder.page.ts
    - Exercise list with CDK DragDrop
    - Add exercise button (opens library)
    - Reorder via drag handle
    - Remove exercise via swipe

[ ] Create exercise-config.component.ts
    - Sets × Reps inputs
    - Rest time selector
    - Notes field
    - Superset grouping option

[ ] Implement template save flow
    - Name prompt
    - Save to templates table
    - Assign to client option
```

#### 60.4 Active Workout - Voice Logging ⭐ (8 points)
```
Tasks:
[ ] Create active-workout.page.ts
    - Current exercise display
    - Set logging cards
    - Rest timer countdown
    - Previous performance reference

[ ] Integrate VoiceService for workout logging
    // Voice command patterns
    const WORKOUT_PATTERNS = {
      logSet: /(\d+)\s*(reps?|x)\s*(?:at\s*)?(\d+(?:\.\d+)?)\s*(kg|lbs?|pounds?)?/i,
      // "10 reps at 135 lbs" → { reps: 10, weight: 135, unit: 'lbs' }
      repeatLast: /repeat|same|again/i,
      // "repeat" → copy last set
      completeExercise: /done|finished|complete|next/i,
      // "done" → move to next exercise
      startRest: /rest|break|pause/i
      // "rest" → start rest timer
    };

[ ] Implement smart set prediction
    // Predict based on last workout
    function predictNextSet(exerciseHistory: SetHistory[]): SetSuggestion {
      const lastWorkout = exerciseHistory[0];
      return {
        weight: lastWorkout.weight,
        reps: lastWorkout.reps,
        confidence: 0.9
      };
    }

[ ] Create rest-timer.component.ts
    - Countdown animation (circular)
    - Skip button
    - Add time button (+30s)
    - Haptic on complete

[ ] Implement one-tap "Repeat Last Set" button
    - Pre-fills weight/reps from previous set
    - Single tap to log

[ ] Add haptic feedback (Capacitor Haptics)
    - On set logged: medium impact
    - On exercise complete: success notification
    - On workout complete: heavy impact

[ ] Create workout-complete.page.ts
    - Summary stats (volume, duration)
    - Personal records highlight
    - Share option
    - Confetti animation (canvas-confetti)
```

#### 60.5 Progress & Measurements (2 points)
```
Tasks:
[ ] Create progress.page.ts
    - Exercise selection dropdown
    - Line chart: weight over time
    - Bar chart: volume per workout
    - Date range selector

[ ] Create measurements.page.ts
    - Body diagram for tap-to-select
    - Measurement history list
    - Add measurement modal
    - Photo comparison slider
```

### Acceptance Criteria
- [ ] Voice command "10 reps at 185" logs correctly
- [ ] Rest timer starts automatically and plays sound
- [ ] Drag-and-drop reorders exercises
- [ ] Progress charts render correctly
- [ ] Workout completion triggers celebration

---

## SPRINT 61: Nutrition
**Duration:** 1 week | **Points:** 20 | **Priority:** CRITICAL

### Objectives
- Implement adherence-neutral macro tracking
- Complete voice nutrition logging (Deepgram + Edamam)
- Complete photo nutrition AI (Gemini)
- Build unified food entry interface

### Detailed Tasks

#### 61.1 Nutrition Dashboard (4 points)
```
Tasks:
[ ] Create nutrition.page.ts
    - Macro rings with adherence-neutral colors
    - NEVER use red for "over target"
    - Meal timeline (not buckets)
    - Quick add floating action button

[ ] Implement MacroRingComponent
    <fitos-macro-ring
      [value]="consumed()"
      [target]="target()"
      [type]="'protein'"
      [showOver]="true" />

    // Color mapping - ADHERENCE NEUTRAL
    const MACRO_COLORS = {
      calories: 'var(--fitos-nutrition-calories)',  // Indigo
      protein: 'var(--fitos-nutrition-protein)',    // Green
      carbs: 'var(--fitos-nutrition-carbs)',        // Amber
      fat: 'var(--fitos-nutrition-fat)',            // Pink
      over: 'var(--fitos-nutrition-over)'           // Purple (NOT RED)
    };

[ ] Create meal-card.component.ts
    - Food item list
    - Total macros for meal
    - Time stamp
    - Edit/delete actions
```

#### 61.2 Food Search & Manual Entry (4 points)
```
Tasks:
[ ] Create add-food.page.ts
    - Unified search bar (text, barcode, voice, photo)
    - Recent foods section
    - Favorites section
    - Search results list

[ ] Implement food search with Edamam
    async searchFood(query: string): Promise<FoodResult[]> {
      // First check local cache/custom foods
      // Then call Edamam NLP API
      // Cross-reference with USDA for verified macros
    }

[ ] Create food-detail-modal.component.ts
    - Serving size selector
    - Macro breakdown
    - Add to meal button
    - Save to favorites option

[ ] Implement barcode scanner
    - Camera integration (Capacitor)
    - Lookup via Open Food Facts API
    - Manual barcode entry fallback
```

#### 61.3 Voice Nutrition Logging ⭐ (6 points)
```
Tasks:
[ ] Create voice-nutrition.page.ts
    - Mic button with animation
    - Real-time transcript display
    - Parsed food preview cards
    - Confirm and log button

[ ] Integrate with Deepgram Nova-3
    // Connect to Deepgram
    const socket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?` +
      `model=nova-3&language=en&smart_format=true`,
      ['token', apiKey]
    );

[ ] Implement NutritionParserService
    // Parse natural language to food items
    async parseNutrition(transcript: string): Promise<ParsedFood[]> {
      // Call Edamam Natural Language API
      const response = await this.http.post(
        'https://api.edamam.com/api/nutrition-data',
        { ingr: transcript }
      );
      return this.mapToFoodItems(response);
    }

    // Examples:
    // "chicken breast 6 ounces" → { name: "Chicken Breast", quantity: 6, unit: "oz" }
    // "two eggs and toast" → [{ name: "Egg", quantity: 2 }, { name: "Toast", quantity: 1 }]

[ ] Add confirmation flow
    - Show parsed items with macros
    - Allow quantity adjustment
    - Allow item removal
    - Log all items on confirm
```

#### 61.4 Photo Nutrition AI ⭐ (6 points)
```
Tasks:
[ ] Create photo-nutrition.page.ts
    - Camera viewfinder
    - Gallery option
    - Loading state with AI animation
    - Results overlay on image

[ ] Integrate with Gemini 2.5 Flash
    async recognizeFood(imageBase64: string): Promise<FoodRecognition> {
      const response = await this.http.post(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent`,
        {
          contents: [{
            parts: [
              { text: FOOD_RECOGNITION_PROMPT },
              { inline_data: { mime_type: 'image/jpeg', data: imageBase64 }}
            ]
          }]
        }
      );
      return this.parseFoodRecognition(response);
    }

[ ] Create FoodRecognitionPrompt
    const FOOD_RECOGNITION_PROMPT = `
    Analyze this food image and return JSON with:
    {
      "foods": [
        {
          "name": "food name",
          "portion": "estimated portion (e.g., '1 cup', '6 oz')",
          "confidence": 0.0-1.0,
          "macros": { "calories": 0, "protein": 0, "carbs": 0, "fat": 0 }
        }
      ],
      "requiresConfirmation": true/false (if any confidence < 0.7)
    }
    `;

[ ] Implement confidence-based confirmation
    - High confidence (>0.8): Show preview, one-tap confirm
    - Medium confidence (0.5-0.8): Show with edit option
    - Low confidence (<0.5): Manual correction required

[ ] Cross-reference with USDA for accurate macros
    - Use Gemini for identification
    - Look up USDA FoodData for verified nutrition
```

### Acceptance Criteria
- [ ] Macro rings use adherence-neutral colors (NO RED)
- [ ] Voice: "chicken breast 6 ounces" logs correctly
- [ ] Photo: Identifies common foods with >70% accuracy
- [ ] Barcode scanner finds products
- [ ] All logged foods appear in meal timeline

---

## SPRINT 62: Coaching & Messages
**Duration:** 1 week | **Points:** 18 | **Priority:** HIGH

### Objectives
- Connect to LangGraph AI backend
- Build chat UI with markdown rendering
- Implement trainer escalation flow
- Create real-time messaging

### Detailed Tasks

#### 62.1 AI Coaching Chat (8 points)
```
Tasks:
[ ] Create coaching-chat.page.ts
    - Message list with AI/user distinction
    - Input bar with send button
    - Voice input option
    - Quick action chips

[ ] Implement AICoachService
    @Injectable({ providedIn: 'root' })
    export class AICoachService {
      private messages = signal<ChatMessage[]>([]);

      async sendMessage(content: string): Promise<void> {
        // Add user message
        this.messages.update(m => [...m, { role: 'user', content }]);

        // Send to LangGraph backend
        const response = await this.http.post<AIResponse>(
          `${environment.aiBackendUrl}/coach/chat`,
          {
            message: content,
            conversationHistory: this.messages().slice(-10),
            userContext: this.getUserContext()
          }
        ).toPromise();

        // Add AI response
        this.messages.update(m => [...m, {
          role: 'assistant',
          content: response.message,
          agent: response.agent,
          metadata: response.metadata
        }]);
      }
    }

[ ] Create chat-message.component.ts
    - User message (right aligned, accent color)
    - AI message (left aligned, neutral color)
    - Markdown rendering for AI responses
    - Timestamp display

[ ] Implement quick action chips
    const QUICK_ACTIONS = [
      { label: 'Suggest workout', prompt: 'Suggest a workout for today' },
      { label: 'Review nutrition', prompt: 'How was my nutrition today?' },
      { label: 'Recovery advice', prompt: 'Should I train hard today?' },
      { label: 'Motivation', prompt: 'I need some motivation' }
    ];

[ ] Add typing indicator animation
    - Three dots bouncing
    - Show while awaiting response
```

#### 62.2 Trainer Methodology (4 points)
```
Tasks:
[ ] Create methodology-setup.page.ts
    - Coaching philosophy textarea
    - Communication style preferences
    - Response examples
    - Save to trainer profile

[ ] Implement methodology in AI prompts
    // System prompt includes trainer voice
    const systemPrompt = `
    You are an AI assistant for ${trainerName}'s clients.
    Coaching philosophy: ${methodology.philosophy}
    Communication style: ${methodology.style}
    Key phrases: ${methodology.phrases.join(', ')}
    Always maintain this voice in your responses.
    `;
```

#### 62.3 Human Messaging (6 points)
```
Tasks:
[ ] Create messages-list.page.ts
    - Conversation list
    - Unread badges
    - Last message preview
    - Online status indicator

[ ] Create message-chat.page.ts
    - Real-time message list
    - Input with send button
    - Delivery/read receipts
    - Typing indicator

[ ] Implement Supabase Realtime for messages
    this.supabase.channel('messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        this.messages.update(m => [...m, payload.new]);
      })
      .subscribe();

[ ] Implement trainer escalation
    - AI detects concerning keywords
    - Creates notification for trainer
    - Shows "Trainer notified" in chat
```

### Acceptance Criteria
- [ ] AI responds within 3 seconds
- [ ] Messages distinguish AI vs human visually
- [ ] Real-time messages update instantly
- [ ] Escalation notifies trainer correctly

---

## SPRINT 63: Client Management
**Duration:** 1 week | **Points:** 16 | **Priority:** HIGH

### Detailed Tasks

#### 63.1 Client List (4 points)
```
Tasks:
[ ] Create client-list.page.ts
    - Client cards with avatar
    - Adherence indicator (green/yellow, NOT red)
    - Last activity timestamp
    - Filter: active/paused/graduated

[ ] Create client-card.component.ts
    - Name and avatar
    - Adherence score (progress bar)
    - Quick action buttons
    - Alert badge if needs attention
```

#### 63.2 Client Detail (6 points)
```
Tasks:
[ ] Create client-detail.page.ts
    - Tab bar: Overview | Workouts | Nutrition | Messages
    - Overview: progress summary, measurements, goals
    - Workouts: assigned and completed
    - Nutrition: macro adherence charts
    - Messages: conversation with client

[ ] Create client-overview.component.ts
    - Progress photo comparison
    - Weight chart
    - Goal progress
    - Recent milestones

[ ] Create nutrition-targets-modal.component.ts
    - Macro sliders (protein, carbs, fat)
    - Calorie auto-calculation
    - Save to client profile
```

#### 63.3 Client Invites & Graduation (3 points)
```
Tasks:
[ ] Create invite-client.page.ts
    - Email invite form
    - Generate invite link
    - QR code display
    - Track pending invites

[ ] Create graduation-modal.component.ts
    - Graduation criteria checklist
    - Achievement badges earned
    - Maintenance plan assignment
    - Congratulations message
```

#### 63.4 Video Review (3 points)
```
Tasks:
[ ] Create video-review.page.ts
    - Video player with timeline
    - Add annotation at timestamp
    - Text/voice annotation input
    - Send to client
```

### Acceptance Criteria
- [ ] Client list loads with pagination
- [ ] Client detail shows comprehensive data
- [ ] Nutrition targets save correctly
- [ ] Video annotations timestamp correctly

---

## SPRINT 64: CRM & Marketing
**Duration:** 1.5 weeks | **Points:** 22 | **Priority:** HIGH

### Detailed Tasks

#### 64.1 Lead Pipeline (8 points)
```
Tasks:
[ ] Create lead-pipeline.page.ts
    - Kanban board with CDK DragDrop
    - Columns: New | Contacted | Qualified | Consultation | Won | Lost
    - Lead cards with value and score

[ ] Create lead-card.component.ts
    - Name, email, phone
    - Lead score badge
    - Value (estimated revenue)
    - Last activity

[ ] Create lead-detail.page.ts
    - Contact information
    - Activity timeline
    - Tasks list
    - Notes section
```

#### 64.2 Email Marketing (10 points)
```
Tasks:
[ ] Create email-templates.page.ts
    - Template list with preview
    - Create new template button
    - Template categories

[ ] Create email-template-editor.page.ts
    - WYSIWYG editor (Quill or similar)
    - Variable insertion ({{first_name}}, etc.)
    - Preview mode
    - Save template

[ ] Create email-sequences.page.ts
    - Sequence list
    - Create new sequence
    - Sequence performance stats

[ ] Create sequence-builder.page.ts
    - Visual timeline
    - Add step: email/wait/condition
    - Configure triggers
    - Activate/deactivate

[ ] Integrate with Resend API
    async sendEmail(template: string, to: string, variables: object) {
      return this.http.post('/api/email/send', {
        template,
        to,
        variables
      });
    }
```

#### 64.3 Email Analytics (4 points)
```
Tasks:
[ ] Create email-analytics.page.ts
    - Sent/Opened/Clicked metrics
    - Trend charts
    - Per-campaign breakdown
    - Best performing templates
```

### Acceptance Criteria
- [ ] Leads drag between stages
- [ ] Email templates support variables
- [ ] Sequences trigger automatically
- [ ] Analytics show real data

---

## SPRINT 65: Settings & Profile
**Duration:** 1 week | **Points:** 18 | **Priority:** MEDIUM

### Detailed Tasks

#### 65.1 Profile & Preferences (6 points)
```
Tasks:
[ ] Create settings.page.ts
    - Section navigation (ion-list)
    - Profile, Billing, Wearables, Notifications, Privacy

[ ] Create profile-edit.page.ts
    - Avatar upload
    - Personal info form
    - Bio/About textarea
    - Save button

[ ] Create notification-preferences.page.ts
    - Push notification toggles
    - Email notification toggles
    - Quiet hours setting
```

#### 65.2 Wearable Connections (4 points)
```
Tasks:
[ ] Create wearables.page.ts
    - Connected devices list
    - Add device button
    - Sync status per device
    - Data permissions

[ ] Implement Terra connection flow
    - OAuth redirect to Terra
    - Handle callback
    - Save connection to database
    - Start data sync
```

#### 65.3 Payments & Stripe Connect (5 points)
```
Tasks:
[ ] Create payment-history.page.ts
    - Transaction list
    - Filter by date
    - Download receipts

[ ] Create stripe-connect.page.ts (trainers)
    - Onboarding status
    - Balance display
    - Payout schedule
    - Bank account management
```

#### 65.4 Security & Privacy (3 points)
```
Tasks:
[ ] Create privacy.page.ts
    - Data export request
    - Account deletion request
    - Privacy settings

[ ] Create change-password.page.ts
    - Current password
    - New password with strength
    - Confirm password
```

### Acceptance Criteria
- [ ] Profile changes save immediately
- [ ] Wearables connect via Terra
- [ ] Stripe Connect onboarding works
- [ ] Data export generates file

---

## SPRINT 66: Analytics & Business
**Duration:** 1 week | **Points:** 15 | **Priority:** MEDIUM

### Detailed Tasks

#### 66.1 Revenue Analytics (8 points)
```
Tasks:
[ ] Create analytics.page.ts (gym owner)
    - Revenue chart (line)
    - Member growth chart (area)
    - Trainer performance table
    - Churn rate display

[ ] Create payment-analytics.component.ts
    - Payment trends
    - Failed payment rate
    - Average transaction value
```

#### 66.2 Outcome-Based Pricing (7 points)
```
Tasks:
[ ] Create pricing-tiers.page.ts
    - Tier list
    - Create new tier

[ ] Create tier-detail.page.ts
    - Tier configuration
    - Enrolled clients
    - Outcome tracking
    - Bonus payments
```

### Acceptance Criteria
- [ ] Charts render correctly on mobile
- [ ] Revenue matches Stripe data
- [ ] Outcome tracking calculates bonuses

---

## SPRINT 67: Franchise & Enterprise
**Duration:** 5 days | **Points:** 12 | **Priority:** LOW

### Detailed Tasks

#### 67.1 Multi-Location (8 points)
```
Tasks:
[ ] Create franchise-dashboard.page.ts
    - Location cards/map
    - Aggregate metrics
    - Location comparison

[ ] Create location-detail.page.ts
    - Per-location analytics
    - Staff list
    - Equipment/resources
```

#### 67.2 Royalty Tracking (4 points)
```
Tasks:
[ ] Create royalty-dashboard.page.ts
    - Royalty due calculations
    - Payment history
    - Overdue alerts
```

### Acceptance Criteria
- [ ] Multiple locations display correctly
- [ ] Royalty calculations are accurate

---

## SPRINT 68: Help, Social & Wellness
**Duration:** 1 week | **Points:** 14 | **Priority:** LOW

### Detailed Tasks

#### 68.1 Help System (6 points)
```
Tasks:
[ ] Create help-center.page.ts
    - Category list
    - Search functionality
    - Article display

[ ] Create contact-support.page.ts
    - Support ticket form
    - Category selection
    - Attachment option
```

#### 68.2 Social Features (4 points)
```
Tasks:
[ ] Create leaderboard.page.ts
    - Weekly/monthly rankings
    - Privacy opt-out
    - Personal rank highlight
```

#### 68.3 Wellness Check-In (4 points)
```
Tasks:
[ ] Create wellness-checkin.component.ts
    - PHQ-2 questions (depression screening)
    - GAD-2 questions (anxiety screening)
    - Score calculation
    - Resource display if flagged
    - 988 crisis line one-tap

[ ] Implement crisis resource display
    // If score indicates concern
    if (phq2Score >= 3 || gad2Score >= 3) {
      this.showCrisisResources();
    }
```

### Acceptance Criteria
- [ ] Help search returns relevant results
- [ ] Leaderboard respects privacy
- [ ] Wellness check-in flags appropriately

---

## SPRINT 69: Landing Site
**Duration:** 1 week | **Points:** 18 | **Priority:** MEDIUM

### Detailed Tasks

#### 69.1 Marketing Pages (12 points)
```
Tasks:
[ ] Create landing home page
    - Hero section with app mockup
    - Feature highlights
    - Testimonials
    - CTA buttons

[ ] Create features page
    - Feature cards
    - Screenshots/demos
    - Comparison table

[ ] Create pricing page
    - Pricing table
    - Monthly/annual toggle
    - FAQ section
```

#### 69.2 Content Pages (6 points)
```
Tasks:
[ ] Create blog page
    - Article list
    - Categories
    - Search

[ ] Create documentation page
    - Navigation sidebar
    - Markdown rendering
    - Code examples
```

### Acceptance Criteria
- [ ] Landing loads in <2 seconds
- [ ] Pricing displays correctly
- [ ] Blog articles render markdown

---

## Implementation Checklist Summary

### Critical Path (Must Complete First)
1. Sprint 58: Auth (blocks all features)
2. Sprint 59: Dashboard (blocks navigation)
3. Sprint 60: Workouts (core feature)
4. Sprint 61: Nutrition (core feature)

### API Integrations Required
| Sprint | API | Edge Function |
|--------|-----|---------------|
| 60 | Deepgram | `get-deepgram-key` |
| 61 | Edamam | `get-edamam-key` |
| 61 | Gemini | `get-gemini-key` |
| 62 | Anthropic | `get-anthropic-key` |
| 64 | Resend | `get-resend-key` |
| 65 | Terra | `get-terra-key` |

### Testing Requirements Per Sprint
- [ ] `npm run build` succeeds
- [ ] Unit test coverage >80%
- [ ] E2E tests for critical flows
- [ ] Accessibility audit passes
- [ ] Performance: Lighthouse >90

---

*Document ready for implementation: January 30, 2026*
