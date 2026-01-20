/**
 * Franchise Module Routes
 *
 * Sprint 40: Multi-Location Management
 */

import { Routes } from '@angular/router';

export const franchiseRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./components/franchise-dashboard/franchise-dashboard.component').then(
        (m) => m.FranchiseDashboardComponent
      ),
  },
  {
    path: 'locations/new',
    loadComponent: () =>
      import('./pages/location-form/location-form.page').then((m) => m.LocationFormPage),
  },
  {
    path: 'locations/:id/edit',
    loadComponent: () =>
      import('./pages/location-form/location-form.page').then((m) => m.LocationFormPage),
  },
  {
    path: 'locations/:id',
    loadComponent: () =>
      import('./pages/location-detail/location-detail.page').then((m) => m.LocationDetailPage),
  },
  {
    path: 'royalties',
    loadComponent: () =>
      import('./pages/royalty-dashboard/royalty-dashboard.page').then(
        (m) => m.RoyaltyDashboardPage
      ),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./pages/analytics/analytics.page').then((m) => m.AnalyticsPage),
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full',
  },
];
