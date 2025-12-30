import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { noAuthGuard } from './core/guards/no-auth.guard';

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
    canActivate: [authGuard],
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
            path: 'exercises',
            loadComponent: () =>
              import('./features/workouts/pages/exercise-library/exercise-library.page').then(
                (m) => m.ExerciseLibraryPage
              ),
          },
          {
            path: 'builder',
            loadComponent: () =>
              import('./features/workouts/pages/workout-builder/workout-builder.page').then(
                (m) => m.WorkoutBuilderPage
              ),
          },
          {
            path: 'builder/:id',
            loadComponent: () =>
              import('./features/workouts/pages/workout-builder/workout-builder.page').then(
                (m) => m.WorkoutBuilderPage
              ),
          },
          {
            path: 'assign',
            loadComponent: () =>
              import('./features/workouts/pages/assign-workout/assign-workout.page').then(
                (m) => m.AssignWorkoutPage
              ),
          },
          {
            path: 'active/:id',
            loadComponent: () =>
              import('./features/workouts/pages/active-workout/active-workout.page').then(
                (m) => m.ActiveWorkoutPage
              ),
          },
          {
            path: 'history/:id',
            loadComponent: () =>
              import('./features/workouts/pages/workout-detail/workout-detail.page').then(
                (m) => m.WorkoutDetailPage
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
        path: 'clients',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/clients/pages/client-list/client-list.page').then(
                (m) => m.ClientListPage
              ),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./features/clients/pages/client-detail/client-detail.page').then(
                (m) => m.ClientDetailPage
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
