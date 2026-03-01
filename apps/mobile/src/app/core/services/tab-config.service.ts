import { Injectable, inject, computed } from '@angular/core';
import { AuthService } from './auth.service';

export interface TabConfig {
  label: string;
  icon: string;
  iconFilled: string;
  route: string;
  badge?: () => number;
}

@Injectable({ providedIn: 'root' })
export class TabConfigService {
  private auth = inject(AuthService);

  readonly tabs = computed<TabConfig[]>(() => {
    const role = this.auth.profile()?.role;
    switch (role) {
      case 'client':
        return this.clientTabs;
      case 'trainer':
        return this.trainerTabs;
      case 'gym_owner':
        return this.ownerTabs;
      default:
        return this.defaultTabs;
    }
  });

  private readonly clientTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', iconFilled: 'home', route: 'dashboard' },
    { label: 'Workouts', icon: 'barbell-outline', iconFilled: 'barbell', route: 'workouts' },
    { label: 'Nutrition', icon: 'nutrition-outline', iconFilled: 'nutrition', route: 'nutrition' },
    { label: 'AI Coach', icon: 'sparkles-outline', iconFilled: 'sparkles', route: 'coaching' },
    // Sprint 65: Shop tab replaces More for clients — trainer products are the primary CTA
    { label: 'Shop', icon: 'storefront-outline', iconFilled: 'storefront', route: 'marketplace' },
  ];

  private readonly trainerTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', iconFilled: 'home', route: 'dashboard' },
    { label: 'Clients', icon: 'people-outline', iconFilled: 'people', route: 'clients' },
    { label: 'Schedule', icon: 'calendar-outline', iconFilled: 'calendar', route: 'schedule' },
    { label: 'Business', icon: 'briefcase-outline', iconFilled: 'briefcase', route: 'business' },
    // Sprint 65: Shop tab — trainers manage their product catalogue
    { label: 'Shop', icon: 'storefront-outline', iconFilled: 'storefront', route: 'marketplace' },
  ];

  private readonly ownerTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', iconFilled: 'home', route: 'dashboard' },
    { label: 'Trainers', icon: 'people-outline', iconFilled: 'people', route: 'trainers' },
    { label: 'Schedule', icon: 'calendar-outline', iconFilled: 'calendar', route: 'schedule' },
    { label: 'Business', icon: 'briefcase-outline', iconFilled: 'briefcase', route: 'business' },
    { label: 'More', icon: 'ellipsis-horizontal-outline', iconFilled: 'ellipsis-horizontal', route: 'more' },
  ];

  private readonly defaultTabs: TabConfig[] = [
    { label: 'Home', icon: 'home-outline', iconFilled: 'home', route: 'dashboard' },
    { label: 'Settings', icon: 'settings-outline', iconFilled: 'settings', route: 'settings' },
  ];
}
