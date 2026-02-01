/**
 * Multi-Location Franchise Dashboard
 *
 * Main dashboard for franchise owners and multi-location operators:
 * - Organization-wide metrics
 * - Location performance comparison
 * - Royalty payment tracking
 * - Quick actions for location management
 *
 * Sprint 40: Multi-Location Management
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { FranchiseService } from '../../services/franchise.service';
import {
  Organization,
  Location,
  LocationAnalytics,
  OrganizationAnalytics,
  RoyaltyPayment,
} from '../../models/franchise.models';

@Component({
  selector: 'app-franchise-dashboard',
  templateUrl: './franchise-dashboard.component.html',
  styleUrls: ['./franchise-dashboard.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FranchiseDashboardComponent implements OnInit, OnDestroy {
  private franchiseService = inject(FranchiseService);
  private router = inject(Router);
  private destroy$ = new Subject<void>();

  // Signals for reactive state
  organization = signal<Organization | null>(null);
  locations = signal<Location[]>([]);
  analytics = signal<OrganizationAnalytics | null>(null);
  overduePayments = signal<RoyaltyPayment[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  // View mode
  viewMode = signal<'grid' | 'list'>('grid');

  // Computed values
  totalLocations = computed(() => this.locations().length);
  activeLocations = computed(
    () => this.locations().filter((loc) => loc.status === 'active').length
  );
  totalRevenue = computed(() => this.analytics()?.totalGrossRevenue || 0);
  totalMembers = computed(() => this.analytics()?.totalActiveMembers || 0);
  retentionRate = computed(() => this.analytics()?.networkRetentionRate || 0);
  totalOverdue = computed(() =>
    this.overduePayments().reduce((sum, payment) => sum + payment.totalFees, 0)
  );

  ngOnInit() {
    this.loadDashboardData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load all dashboard data
   */
  async loadDashboardData() {
    try {
      this.loading.set(true);
      this.error.set(null);

      // Get current organization from service
      const org = this.franchiseService.getCurrentOrganization();
      if (!org) {
        // TODO: Load from user's profile or show organization selector
        this.error.set('No organization selected');
        this.loading.set(false);
        return;
      }

      this.organization.set(org);

      // Load locations
      this.franchiseService
        .listOrganizationLocations(org.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (locations) => {
            this.locations.set(locations);
            this.loadAnalytics(org.id);
            this.loadOverduePayments(org.id);
          },
          error: (err) => {
            console.error('Error loading locations:', err);
            this.error.set('Failed to load locations');
            this.loading.set(false);
          },
        });
    } catch (err) {
      console.error('Error loading dashboard:', err);
      this.error.set('Failed to load dashboard data');
      this.loading.set(false);
    }
  }

  /**
   * Load organization analytics
   */
  private loadAnalytics(organizationId: string) {
    // TODO: Get actual analytics data from API
    // For now, set mock data
    const mockAnalytics: OrganizationAnalytics = {
      organizationId,
      periodType: 'monthly',
      periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      periodEnd: new Date().toISOString(),
      totalLocations: this.locations().length,
      totalMembers: 1250,
      totalNewMembers: 85,
      totalCanceledMembers: 23,
      totalActiveMembers: 1227,
      networkRetentionRate: 98.2,
      totalGrossRevenue: 284500,
      totalMembershipRevenue: 198150,
      totalTrainingRevenue: 72300,
      totalRetailRevenue: 9050,
      totalOtherRevenue: 5000,
      totalWorkouts: 8450,
      totalClassesBooked: 2340,
      averageAttendanceRate: 87.5,
      totalUniqueActiveClients: 1150,
      totalMessagesSent: 3240,
      totalCheckIns: 876,
      totalNutritionLogs: 5430,
      totalStaff: 48,
      totalTrainers: 32,
      locations: [],
    };

    this.analytics.set(mockAnalytics);
    this.loading.set(false);
  }

  /**
   * Load overdue royalty payments
   */
  private loadOverduePayments(organizationId: string) {
    this.franchiseService
      .getOverdueRoyalties(organizationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.overduePayments.set(response.overdue_payments || []);
        },
        error: (err) => {
          console.error('Error loading overdue payments:', err);
        },
      });
  }

  /**
   * Navigate to location details
   */
  viewLocation(location: Location) {
    this.router.navigate(['/franchise/locations', location.id]);
  }

  /**
   * Navigate to add new location
   */
  addLocation() {
    this.router.navigate(['/franchise/locations/new']);
  }

  /**
   * Navigate to royalty dashboard
   */
  viewRoyalties() {
    this.router.navigate(['/franchise/royalties']);
  }

  /**
   * Navigate to analytics
   */
  viewAnalytics() {
    this.router.navigate(['/franchise/analytics']);
  }

  /**
   * Toggle view mode
   */
  toggleViewMode() {
    this.viewMode.set(this.viewMode() === 'grid' ? 'list' : 'grid');
  }

  /**
   * Refresh dashboard
   */
  async refresh(event?: any) {
    await this.loadDashboardData();
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
   * Get location type icon
   */
  getLocationIcon(type: 'headquarters' | 'branch' | 'franchise'): string {
    return this.franchiseService.getLocationTypeIcon(type);
  }
}
