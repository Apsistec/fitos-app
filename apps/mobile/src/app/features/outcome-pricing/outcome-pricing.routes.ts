import { Routes } from '@angular/router';

/**
 * Outcome-Based Pricing Routes
 */
export const OUTCOME_PRICING_ROUTES: Routes = [
  {
    path: 'tiers',
    loadComponent: () =>
      import('./pages/pricing-tiers/pricing-tiers.page').then(m => m.PricingTiersPage)
  },
  {
    path: 'tiers/create',
    loadComponent: () =>
      import('./pages/create-tier/create-tier.page').then(m => m.CreateTierPage)
  },
  {
    path: 'tiers/:id',
    loadComponent: () =>
      import('./pages/tier-detail/tier-detail.page').then(m => m.TierDetailPage)
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./pages/my-goals/my-goals.page').then(m => m.MyGoalsPage)
  },
  {
    path: 'goals/:id',
    loadComponent: () =>
      import('./pages/goal-detail/goal-detail.page').then(m => m.GoalDetailPage)
  },
  {
    path: '',
    redirectTo: 'tiers',
    pathMatch: 'full'
  }
];
