import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, trainerOrOwnerGuard, onboardingCompleteGuard, mfaRequiredGuard } from './core/guards';

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
        ],
      },
      {
        path: 'nutrition',
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
        ],
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tabs',
  },
];
