import { Routes } from '@angular/router';
import { authGuard, noAuthGuard, trainerOrOwnerGuard, onboardingCompleteGuard } from './core/guards';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'tabs',
    pathMatch: 'full',
  },
  {
    path: 'auth',
    canActivate: [noAuthGuard],
    children: [
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      },
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.page').then((m) => m.LoginPage),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/pages/register/register.page').then((m) => m.RegisterPage),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/pages/forgot-password/forgot-password.page').then(
            (m) => m.ForgotPasswordPage
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
    canActivate: [authGuard, onboardingCompleteGuard],
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
        ],
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings.page').then((m) => m.SettingsPage),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'tabs',
  },
];
