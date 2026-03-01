import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, trainerOrOwnerGuard, clientGuard, onboardingCompleteGuard, mfaRequiredGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'login/trainer',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/trainer/trainer-login.page').then(
            (m) => m.TrainerLoginPage
          ),
      },
      {
        path: 'login/client',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/client/client-login.page').then(
            (m) => m.ClientLoginPage
          ),
      },
      {
        path: 'login/gym-owner',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/login/gym-owner/gym-owner-login.page').then(
            (m) => m.GymOwnerLoginPage
          ),
      },
      {
        path: 'register',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'register/trainer',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/trainer/trainer-register.page').then(
            (m) => m.TrainerRegisterPage
          ),
      },
      {
        path: 'register/client',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/client/client-register.page').then(
            (m) => m.ClientRegisterPage
          ),
      },
      {
        path: 'register/gym-owner',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/register/gym-owner/gym-owner-register.page').then(
            (m) => m.GymOwnerRegisterPage
          ),
      },
      {
        path: 'forgot-password',
        canActivate: [noAuthGuard],
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./features/auth/pages/verify-email/verify-email.page').then(
            (m) => m.VerifyEmailPage
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.page').then(
            (m) => m.ResetPasswordPage
          ),
      },
      {
        path: 'mfa-setup',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auth/pages/mfa-setup/mfa-setup.page').then(
            (m) => m.MfaSetupPage
          ),
      },
      {
        path: 'mfa-verify',
        canActivate: [authGuard],
        loadComponent: () =>
          import('./features/auth/pages/mfa-verify/mfa-verify.page').then(
            (m) => m.MfaVerifyPage
          ),
      },
    ],
  },
  {
    path: 'onboarding',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/auth/pages/onboarding/onboarding.page').then((m) => m.OnboardingPage),
  },
  {
    path: 'tabs',
    canActivate: [authGuard, mfaRequiredGuard, onboardingCompleteGuard],
    loadComponent: () => import('./features/tabs/tabs.page').then((m) => m.TabsPage),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'workouts',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/workouts/pages/workout-list/workout-list.page').then(
                (m) => m.WorkoutListPage
              ),
          },
          {
            // Exercise library - trainers and gym owners only
            path: 'exercises',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/exercise-library/exercise-library.page').then(
                (m) => m.ExerciseLibraryPage
              ),
          },
          {
            // Create custom exercise - trainers and gym owners only
            path: 'exercises/new',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/exercise-form/exercise-form.page').then(
                (m) => m.ExerciseFormPage
              ),
          },
          {
            // Edit custom exercise - trainers and gym owners only
            path: 'exercises/:id/edit',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/exercise-form/exercise-form.page').then(
                (m) => m.ExerciseFormPage
              ),
          },
          {
            // Workout builder - trainers and gym owners only
            path: 'builder',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/workout-builder/workout-builder.page').then(
                (m) => m.WorkoutBuilderPage
              ),
          },
          {
            // Edit workout - trainers and gym owners only
            path: 'builder/:id',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/workout-builder/workout-builder.page').then(
                (m) => m.WorkoutBuilderPage
              ),
          },
          {
            // Assign workout - trainers and gym owners only
            path: 'assign',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/workouts/pages/assign-workout/assign-workout.page').then(
                (m) => m.AssignWorkoutPage
              ),
          },
          {
            // Active workout - everyone (clients do workouts)
            path: 'active/:id',
            loadComponent: () =>
              import('./features/workouts/pages/active-workout/active-workout.page').then(
                (m) => m.ActiveWorkoutPage
              ),
          },
          {
            // Workout completion celebration screen
            path: 'complete/:id',
            loadComponent: () =>
              import('./features/workouts/pages/workout-complete/workout-complete.page').then(
                (m) => m.WorkoutCompletePage
              ),
          },
          {
            // Workout history list - everyone
            path: 'history',
            loadComponent: () =>
              import('./features/workouts/pages/workout-history/workout-history.page').then(
                (m) => m.WorkoutHistoryPage
              ),
          },
          {
            // Workout detail - everyone
            path: 'history/:id',
            loadComponent: () =>
              import('./features/workouts/pages/workout-detail/workout-detail.page').then(
                (m) => m.WorkoutDetailPage
              ),
          },
          {
            // Progress charts - everyone
            path: 'progress',
            loadComponent: () =>
              import('./features/workouts/pages/progress/progress.page').then(
                (m) => m.ProgressPage
              ),
          },
          {
            // Measurements & photos - everyone
            path: 'measurements',
            loadComponent: () =>
              import('./features/clients/pages/measurements/measurements.page').then(
                (m) => m.MeasurementsPage
              ),
          },
          {
            // Progress photos - client self-view (Sprint 64.1)
            path: 'progress-photos',
            loadComponent: () =>
              import('./features/clients/pages/progress-photos/progress-photos.page').then(
                (m) => m.ProgressPhotosPage
              ),
          },
          {
            // Sprint 66.1: Checkin response — client responds to a pending check-in
            // Deep-linked from push notification with ?id=<response_id>
            path: 'checkin',
            loadComponent: () =>
              import('./features/clients/pages/checkin-response/checkin-response.page').then(
                (m) => m.CheckinResponsePage
              ),
          },
          {
            // Sprint 66.1: Direct link to specific response
            path: 'checkin/:id',
            loadComponent: () =>
              import('./features/clients/pages/checkin-response/checkin-response.page').then(
                (m) => m.CheckinResponsePage
              ),
          },
          {
            // Sprint 68: NPS response — client rates their trainer (deep-linked from push)
            path: 'nps',
            loadComponent: () =>
              import('./features/clients/pages/nps-response/nps-response.page').then(
                (m) => m.NpsResponsePage
              ),
          },
          {
            // Sprint 68: Deep-link to a specific NPS response by ID
            path: 'nps/:id',
            loadComponent: () =>
              import('./features/clients/pages/nps-response/nps-response.page').then(
                (m) => m.NpsResponsePage
              ),
          },
          {
            // Sprint 69: Client referral page — share personal referral link
            path: 'referral',
            loadComponent: () =>
              import('./features/clients/pages/referral/referral.page').then(
                (m) => m.ReferralPage
              ),
          },
        ],
      },
      {
        path: 'nutrition',
        canActivate: [clientGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/nutrition/pages/nutrition-log/nutrition-log.page').then(
                (m) => m.NutritionLogPage
              ),
          },
          {
            path: 'add',
            loadComponent: () =>
              import('./features/nutrition/pages/add-food/add-food.page').then(
                (m) => m.AddFoodPage
              ),
          },
          {
            path: 'voice',
            loadComponent: () =>
              import('./features/nutrition/components/voice-nutrition/voice-nutrition.component').then(
                (m) => m.VoiceNutritionComponent
              ),
          },
          {
            path: 'photo',
            loadComponent: () =>
              import('./features/nutrition/pages/photo-nutrition/photo-nutrition.page').then(
                (m) => m.PhotoNutritionPage
              ),
          },
          {
            path: 'history',
            loadComponent: () =>
              import('./features/nutrition/pages/nutrition-history/nutrition-history.page').then(
                (m) => m.NutritionHistoryPage
              ),
          },
          {
            path: 'scan',
            loadComponent: () =>
              import('./features/nutrition/pages/barcode-scan/barcode-scan.page').then(
                (m) => m.BarcodeScanPage
              ),
          },
          {
            // Quick water logging — launched from app shortcut / deep link
            path: 'water',
            loadComponent: () =>
              import('./features/nutrition/pages/quick-water/quick-water.page').then(
                (m) => m.QuickWaterPage
              ),
          },
        ],
      },
      {
        path: 'coaching',
        children: [
          {
            path: '',
            redirectTo: 'chat',
            pathMatch: 'full',
          },
          {
            path: 'chat',
            loadComponent: () =>
              import('./features/coaching/pages/chat/chat.page').then(
                (m) => m.ChatPage
              ),
          },
          {
            path: 'methodology-setup',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/coaching/pages/methodology-setup/methodology-setup.page').then(
                (m) => m.MethodologySetupPage
              ),
          },
          {
            path: 'response-review',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/coaching/components/response-review/response-review.component').then(
                (m) => m.ResponseReviewComponent
              ),
          },
          {
            path: 'insights',
            loadComponent: () =>
              import('./features/coaching/pages/insights-dashboard/insights-dashboard.page').then(
                (m) => m.InsightsDashboardPage
              ),
          },
        ],
      },
      {
        path: 'messages',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/messages/pages/conversations/conversations.page').then(
                (m) => m.ConversationsPage
              ),
          },
          {
            path: 'chat/:id',
            loadComponent: () =>
              import('./features/messages/pages/chat/chat.page').then(
                (m) => m.ChatPage
              ),
          },
        ],
      },
      {
        // Clients - trainers and gym owners only
        path: 'clients',
        canActivate: [trainerOrOwnerGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/clients/pages/client-list/client-list.page').then(
                (m) => m.ClientListPage
              ),
          },
          {
            path: 'invite',
            loadComponent: () =>
              import('./features/clients/pages/invite-client/invite-client.page').then(
                (m) => m.InviteClientPage
              ),
          },
          {
            path: 'invitations',
            loadComponent: () =>
              import('./features/clients/pages/invitations-list/invitations-list.page').then(
                (m) => m.InvitationsListPage
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/clients/pages/client-detail/client-detail.page').then(
                (m) => m.ClientDetailPage
              ),
          },
          {
            path: ':id/nutrition-targets',
            loadComponent: () =>
              import('./features/clients/pages/set-nutrition-targets/set-nutrition-targets.page').then(
                (m) => m.SetNutritionTargetsPage
              ),
          },
          {
            path: ':id/graduation',
            loadComponent: () =>
              import('./features/clients/pages/graduation/graduation.page').then(
                (m) => m.GraduationPage
              ),
          },
          {
            path: 'video-review/:id',
            loadComponent: () =>
              import('./features/clients/pages/video-review/video-review.page').then(
                (m) => m.VideoReviewPage
              ),
          },
          {
            // Sprint 66.1: Checkin template builder
            path: 'checkin-builder',
            loadComponent: () =>
              import('./features/clients/pages/checkin-builder/checkin-builder.page').then(
                (m) => m.CheckinBuilderPage
              ),
          },
          {
            // Sprint 66.1: Edit existing checkin template
            path: 'checkin-builder/:id',
            loadComponent: () =>
              import('./features/clients/pages/checkin-builder/checkin-builder.page').then(
                (m) => m.CheckinBuilderPage
              ),
          },
          {
            // Sprint 66.2: Accountability pod manager
            path: 'pods',
            loadComponent: () =>
              import('./features/clients/pages/accountability-group-manager/accountability-group-manager.page').then(
                (m) => m.AccountabilityGroupManagerPage
              ),
          },
        ],
      },
      {
        // CRM - trainers and gym owners only
        path: 'crm',
        canActivate: [trainerOrOwnerGuard],
        children: [
          {
            path: '',
            redirectTo: 'pipeline',
            pathMatch: 'full',
          },
          {
            path: 'pipeline',
            loadComponent: () =>
              import('./features/crm/pages/pipeline/pipeline.page').then(
                (m) => m.PipelinePage
              ),
          },
          {
            path: 'templates',
            loadComponent: () =>
              import('./features/crm/pages/templates/templates.page').then(
                (m) => m.TemplatesPage
              ),
          },
          {
            path: 'sequences',
            loadComponent: () =>
              import('./features/crm/pages/sequences/sequences.page').then(
                (m) => m.SequencesPage
              ),
          },
          {
            path: 'analytics',
            loadComponent: () =>
              import('./features/crm/pages/email-analytics/email-analytics.page').then(
                (m) => m.EmailAnalyticsPage
              ),
          },
          {
            path: 'leads/:id',
            loadComponent: () =>
              import('./features/crm/pages/lead-detail/lead-detail.page').then(
                (m) => m.LeadDetailPage
              ),
          },
          {
            path: 'forms',
            loadComponent: () =>
              import('./features/crm/pages/form-builder/form-builder.page').then(
                (m) => m.FormBuilderPage
              ),
          },
          {
            path: 'campaigns',
            loadComponent: () =>
              import('./features/crm/pages/email-campaigns/email-campaigns.page').then(
                (m) => m.EmailCampaignsPage
              ),
          },
        ],
      },
      {
        // Analytics - gym owners only
        path: 'analytics',
        canActivate: [trainerOrOwnerGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/analytics/pages/owner-analytics/owner-analytics.page').then(
                (m) => m.OwnerAnalyticsPage
              ),
          },
          {
            // Sprint 69: Trainer growth analytics (cohort retention, referral funnel, KPIs)
            path: 'growth',
            loadComponent: () =>
              import('./features/analytics/pages/growth-analytics/growth-analytics.page').then(
                (m) => m.GrowthAnalyticsPage
              ),
          },
        ],
      },
      {
        path: 'settings',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/settings/settings.page').then((m) => m.SettingsPage),
          },
          {
            // Trainer pricing - trainers and gym owners only
            path: 'pricing',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/trainer-pricing/trainer-pricing.page').then(
                (m) => m.TrainerPricingPage
              ),
          },
          {
            // Client subscription management
            path: 'subscription',
            loadComponent: () =>
              import('./features/settings/pages/my-subscription/my-subscription.page').then(
                (m) => m.MySubscriptionPage
              ),
          },
          {
            // Wearable devices
            path: 'wearables',
            loadComponent: () =>
              import('./features/settings/pages/wearables/wearables.page').then(
                (m) => m.WearablesPage
              ),
          },
          {
            // Payment history
            path: 'payments',
            loadComponent: () =>
              import('./features/settings/pages/payment-history/payment-history.page').then(
                (m) => m.PaymentHistoryPage
              ),
          },
          {
            // Edit Profile
            path: 'profile',
            loadComponent: () =>
              import('./features/settings/pages/edit-profile/edit-profile.page').then(
                (m) => m.EditProfilePage
              ),
          },
          {
            // Notifications
            path: 'notifications',
            loadComponent: () =>
              import('./features/settings/pages/notifications/notifications.page').then(
                (m) => m.NotificationsPage
              ),
          },
          {
            // Privacy & Security
            path: 'privacy',
            loadComponent: () =>
              import('./features/settings/pages/privacy/privacy.page').then(
                (m) => m.PrivacyPage
              ),
          },
          {
            // Change Password
            path: 'change-password',
            loadComponent: () =>
              import('./features/settings/pages/change-password/change-password.page').then(
                (m) => m.ChangePasswordPage
              ),
          },
          {
            // Help & Support
            path: 'help',
            children: [
              {
                path: '',
                loadComponent: () =>
                  import('./features/settings/pages/help/help.page').then(
                    (m) => m.HelpPage
                  ),
              },
              {
                path: 'center',
                loadComponent: () =>
                  import('./features/help/pages/help-center/help-center.page').then(
                    (m) => m.HelpCenterPage
                  ),
              },
              {
                path: 'faq',
                loadComponent: () =>
                  import('./features/help/pages/faq/faq.page').then(
                    (m) => m.FAQPage
                  ),
              },
              {
                path: 'faq/:category',
                loadComponent: () =>
                  import('./features/help/pages/faq/faq.page').then(
                    (m) => m.FAQPage
                  ),
              },
              {
                path: 'getting-started',
                loadComponent: () =>
                  import('./features/help/pages/getting-started/getting-started.page').then(
                    (m) => m.GettingStartedPage
                  ),
              },
              {
                path: 'guide/:slug',
                loadComponent: () =>
                  import('./features/help/pages/feature-guide/feature-guide.page').then(
                    (m) => m.FeatureGuidePage
                  ),
              },
              {
                path: 'contact',
                loadComponent: () =>
                  import('./features/help/pages/contact-support/contact-support.page').then(
                    (m) => m.ContactSupportPage
                  ),
              },
            ],
          },
          {
            // Terms & Privacy Policy
            path: 'terms',
            loadComponent: () =>
              import('./features/settings/pages/terms/terms.page').then(
                (m) => m.TermsPage
              ),
          },
          {
            // Integrations
            path: 'integrations',
            loadComponent: () =>
              import('./features/settings/pages/integrations/integrations.page').then(
                (m) => m.IntegrationsPage
              ),
          },
          {
            // NFC & QR Touchpoints - trainers/owners only
            path: 'nfc-tags',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/nfc-tags/nfc-tags.page').then(
                (m) => m.NfcTagsPage
              ),
          },
          {
            // Cancellation Policies — trainers/owners only
            path: 'cancellation-policies',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/cancellation-policies/cancellation-policies.page').then(
                (m) => m.CancellationPoliciesPage
              ),
          },
          {
            // Pricing Options (session packs, passes, contracts) — trainers/owners only
            path: 'pricing-options',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/pricing-options/pricing-options.page').then(
                (m) => m.PricingOptionsPage
              ),
          },
          {
            // Payroll Settings (pay rates & no-show/cancel policy) — trainers/owners only
            path: 'payroll-settings',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/payroll-settings/payroll-settings.page').then(
                (m) => m.PayrollSettingsPage
              ),
          },
          {
            // Payroll Report — trainers/owners only
            path: 'payroll-report',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/reports/pages/payroll-report/payroll-report.page').then(
                (m) => m.PayrollReportPage
              ),
          },
          {
            // Revenue Report — trainers/owners only
            path: 'revenue-report',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/reports/pages/revenue-report/revenue-report.page').then(
                (m) => m.RevenueReportPage
              ),
          },
          {
            // Staff Scheduling Permissions — gym owners only
            path: 'staff-permissions',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/staff-permissions/staff-permissions.page').then(
                (m) => m.StaffPermissionsPage
              ),
          },
          {
            // Client notification preferences — all roles (clients primarily)
            path: 'client-notifications',
            loadComponent: () =>
              import('./features/settings/pages/client-notifications/client-notifications.page').then(
                (m) => m.ClientNotificationsPage
              ),
          },
          {
            // Sprint 67: Public profile editor — trainers/owners only
            path: 'public-profile',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/public-profile/public-profile.page').then(
                (m) => m.PublicProfilePage
              ),
          },
          {
            // Sprint 68: Testimonial approval queue — trainers/owners only
            path: 'testimonials',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/testimonials/testimonials.page').then(
                (m) => m.TestimonialsPage
              ),
          },
          {
            // Sprint 69: Referral program configuration — trainers/owners only
            path: 'referral-program',
            canActivate: [trainerOrOwnerGuard],
            loadComponent: () =>
              import('./features/settings/pages/referral-program/referral-program.page').then(
                (m) => m.ReferralProgramPage
              ),
          },
        ],
      },
      {
        // Social/Gamification
        path: 'social',
        children: [
          {
            path: '',
            redirectTo: 'leaderboard',
            pathMatch: 'full',
          },
          {
            path: 'leaderboard',
            loadComponent: () =>
              import('./features/social/pages/leaderboard/leaderboard.page').then(
                (m) => m.LeaderboardPage
              ),
          },
          {
            path: 'feed',
            loadComponent: () =>
              import('./features/social/pages/feed/feed.page').then(
                (m) => m.FeedPage
              ),
          },
          {
            // Sprint 66.2: Accountability pod activity feed (client-facing)
            path: 'pods',
            loadComponent: () =>
              import('./features/social/pages/pod-feed/pod-feed.page').then(
                (m) => m.PodFeedPage
              ),
          },
        ],
      },
      {
        // Schedule — trainers and gym owners
        path: 'schedule',
        canActivate: [trainerOrOwnerGuard],
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/scheduling/pages/schedule/schedule.page').then(
                (m) => m.SchedulePage
              ),
          },
          {
            // Kiosk check-in mode — tablet at gym entrance, PIN-protected exit
            path: 'kiosk',
            loadComponent: () =>
              import('./features/scheduling/pages/kiosk/kiosk.page').then(
                (m) => m.KioskPage
              ),
          },
        ],
      },
      {
        path: 'more',
        loadComponent: () => import('./features/more/more.page').then(m => m.MorePage),
      },
      {
        path: 'business',
        canActivate: [trainerOrOwnerGuard],
        loadComponent: () => import('./features/business/business.page').then(m => m.BusinessPage),
      },
      {
        // ── Marketplace — Sprint 65 ──────────────────────────────────────────
        // Clients browse & purchase trainer digital products.
        // Trainers manage their own product catalogue.
        path: 'marketplace',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/marketplace/pages/marketplace/marketplace.page').then(
                (m) => m.MarketplacePage
              ),
          },
          {
            path: 'product/:id',
            loadComponent: () =>
              import('./features/marketplace/pages/product-detail/product-detail.page').then(
                (m) => m.ProductDetailPage
              ),
          },
          {
            // Trainer product manager (published / drafts list)
            path: 'manage',
            loadComponent: () =>
              import('./features/marketplace/pages/product-manager/product-manager.page').then(
                (m) => m.ProductManagerPage
              ),
          },
          {
            // Create new product
            path: 'manage/new',
            loadComponent: () =>
              import('./features/marketplace/pages/product-form/product-form.page').then(
                (m) => m.ProductFormPage
              ),
          },
          {
            // Edit existing product
            path: 'manage/:id/edit',
            loadComponent: () =>
              import('./features/marketplace/pages/product-form/product-form.page').then(
                (m) => m.ProductFormPage
              ),
          },
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tabs',
  },
];
