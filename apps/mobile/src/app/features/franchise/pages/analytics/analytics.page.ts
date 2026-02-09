/**
 * Analytics Page
 *
 * Organization-wide analytics and location comparisons:
 * - Revenue trends and breakdowns
 * - Member growth metrics
 * - Location performance rankings
 * - Custom date range selection
 *
 * Sprint 40: Multi-Location Management
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { FranchiseService } from '../../services/franchise.service';
import {
  OrganizationAnalytics,
  LocationAnalytics,
} from '../../models/franchise.models';

type MetricType = 'revenue' | 'members' | 'workouts' | 'retention';
type PeriodType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.page.html',
  styleUrls: ['./analytics.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsPage implements OnInit, OnDestroy {
  private franchiseService = inject(FranchiseService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // State
  analytics = signal<OrganizationAnalytics | null>(null);
  locationAnalytics = signal<LocationAnalytics[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // Filters
  selectedMetric = signal<MetricType>('revenue');
  selectedPeriod = signal<PeriodType>('monthly');
  dateRange = signal({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  // Computed rankings
  topPerformers = computed(() => {
    const locations = this.locationAnalytics();
    const metric = this.selectedMetric();

    const metricMap: Record<MetricType, keyof LocationAnalytics> = {
      revenue: 'grossRevenue',
      members: 'activeMembers',
      workouts: 'totalWorkouts',
      retention: 'memberRetentionRate',
    };

    return [...locations]
      .sort((a, b) => {
        const key = metricMap[metric];
        return (b[key] as number) - (a[key] as number);
      })
      .slice(0, 5);
  });

  bottomPerformers = computed(() => {
    const locations = this.locationAnalytics();
    const metric = this.selectedMetric();

    const metricMap: Record<MetricType, keyof LocationAnalytics> = {
      revenue: 'grossRevenue',
      members: 'activeMembers',
      workouts: 'totalWorkouts',
      retention: 'memberRetentionRate',
    };

    return [...locations]
      .sort((a, b) => {
        const key = metricMap[metric];
        return (a[key] as number) - (b[key] as number);
      })
      .slice(0, 3);
  });

  // Summary metrics
  averageRevenue = computed(() => {
    const locations = this.locationAnalytics();
    if (locations.length === 0) return 0;
    const total = locations.reduce((sum, loc) => sum + loc.grossRevenue, 0);
    return total / locations.length;
  });

  averageMembers = computed(() => {
    const locations = this.locationAnalytics();
    if (locations.length === 0) return 0;
    const total = locations.reduce((sum, loc) => sum + loc.activeMembers, 0);
    return Math.round(total / locations.length);
  });

  ngOnInit() {
    this.loadAnalytics();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load analytics data
   */
  loadAnalytics() {
    this.loading.set(true);
    this.error.set(null);

    const organization = this.franchiseService.getCurrentOrganization();
    if (!organization) {
      this.error.set('No organization selected');
      this.loading.set(false);
      return;
    }

    // TODO: Replace with actual API call
    // For now, use mock data
    setTimeout(() => {
      const mockLocationAnalytics: LocationAnalytics[] = [
        {
          id: 'analytics_001',
          locationId: 'loc_downtown',
          periodType: 'monthly',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          totalMembers: 450,
          newMembers: 28,
          canceledMembers: 12,
          activeMembers: 438,
          memberRetentionRate: 97.3,
          grossRevenue: 24500,
          membershipRevenue: 15000,
          trainingRevenue: 8500,
          retailRevenue: 1000,
          otherRevenue: 0,
          totalWorkouts: 3200,
          totalClassesBooked: 840,
          averageAttendanceRate: 92.5,
          uniqueActiveClients: 410,
          messagesSent: 1240,
          checkInsCompleted: 320,
          nutritionLogs: 1850,
          totalStaff: 18,
          totalTrainers: 12,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: 'analytics_002',
          locationId: 'loc_westside',
          periodType: 'monthly',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          totalMembers: 320,
          newMembers: 22,
          canceledMembers: 18,
          activeMembers: 302,
          memberRetentionRate: 94.4,
          grossRevenue: 18200,
          membershipRevenue: 12000,
          trainingRevenue: 5500,
          retailRevenue: 700,
          otherRevenue: 0,
          totalWorkouts: 2150,
          totalClassesBooked: 580,
          averageAttendanceRate: 88.3,
          uniqueActiveClients: 285,
          messagesSent: 890,
          checkInsCompleted: 215,
          nutritionLogs: 1120,
          totalStaff: 14,
          totalTrainers: 9,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
        {
          id: 'analytics_003',
          locationId: 'loc_eastbay',
          periodType: 'monthly',
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          totalMembers: 280,
          newMembers: 19,
          canceledMembers: 8,
          activeMembers: 272,
          memberRetentionRate: 97.1,
          grossRevenue: 16800,
          membershipRevenue: 11200,
          trainingRevenue: 5100,
          retailRevenue: 500,
          otherRevenue: 0,
          totalWorkouts: 1920,
          totalClassesBooked: 510,
          averageAttendanceRate: 90.2,
          uniqueActiveClients: 255,
          messagesSent: 780,
          checkInsCompleted: 195,
          nutritionLogs: 980,
          totalStaff: 12,
          totalTrainers: 8,
          createdAt: '2026-02-01T00:00:00Z',
          updatedAt: '2026-02-01T00:00:00Z',
        },
      ];

      const mockOrgAnalytics: OrganizationAnalytics = {
        organizationId: organization.id,
        periodType: 'monthly',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalLocations: 3,
        totalMembers: 1050,
        totalNewMembers: 69,
        totalCanceledMembers: 38,
        totalActiveMembers: 1012,
        networkRetentionRate: 96.4,
        totalGrossRevenue: 59500,
        totalMembershipRevenue: 38200,
        totalTrainingRevenue: 19100,
        totalRetailRevenue: 2200,
        totalOtherRevenue: 0,
        totalWorkouts: 7270,
        totalClassesBooked: 1930,
        averageAttendanceRate: 90.3,
        totalUniqueActiveClients: 950,
        totalMessagesSent: 2910,
        totalCheckIns: 730,
        totalNutritionLogs: 3950,
        totalStaff: 44,
        totalTrainers: 29,
        locations: mockLocationAnalytics,
      };

      this.analytics.set(mockOrgAnalytics);
      this.locationAnalytics.set(mockLocationAnalytics);
      this.loading.set(false);
    }, 500);
  }

  /**
   * Change selected metric
   */
  selectMetric(metric: MetricType) {
    this.selectedMetric.set(metric);
  }

  /**
   * Change period
   */
  selectPeriod(period: PeriodType) {
    this.selectedPeriod.set(period);
    // TODO: Reload data with new period
  }

  /**
   * Update date range
   */
  updateDateRange(start: string, end: string) {
    this.dateRange.set({ start, end });
    // TODO: Reload data with new date range
  }

  /**
   * View location details
   */
  viewLocation(locationId: string) {
    this.router.navigate(['/franchise/locations', locationId]);
  }

  /**
   * Export report
   */
  async exportReport() {
    const analytics = this.analytics();
    if (!analytics) return;

    // Create report content
    const report = {
      period: `${analytics.periodStart} to ${analytics.periodEnd}`,
      totalLocations: analytics.totalLocations,
      totalRevenue: analytics.totalGrossRevenue,
      totalMembers: analytics.totalActiveMembers,
      retentionRate: analytics.networkRetentionRate,
      locations: this.locationAnalytics().map(loc => ({
        id: loc.locationId,
        revenue: loc.grossRevenue,
        members: loc.activeMembers,
        retention: loc.memberRetentionRate,
      })),
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  /**
   * Refresh data
   */
  async refresh(event?: any) {
    await this.loadAnalytics();
    if (event) {
      event.target.complete();
    }
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return this.franchiseService.formatCurrency(amount);
  }

  /**
   * Format number
   */
  formatNumber(num: number): string {
    return new Intl.NumberFormat('en-US').format(num);
  }

  /**
   * Get metric value for location
   */
  getMetricValue(location: LocationAnalytics, metric: MetricType): number {
    const metricMap: Record<MetricType, keyof LocationAnalytics> = {
      revenue: 'grossRevenue',
      members: 'activeMembers',
      workouts: 'totalWorkouts',
      retention: 'memberRetentionRate',
    };
    return location[metricMap[metric]] as number;
  }

  /**
   * Format metric value
   */
  formatMetricValue(value: number, metric: MetricType): string {
    if (metric === 'revenue') {
      return this.formatCurrency(value);
    }
    if (metric === 'retention') {
      return `${value.toFixed(1)}%`;
    }
    return this.formatNumber(value);
  }
}
