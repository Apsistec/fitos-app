/**
 * Location Detail Page
 *
 * Individual location analytics and management:
 * - Location-specific metrics
 * - Performance vs network average
 * - Staff management
 * - Quick edit location
 *
 * Sprint 40: Multi-Location Management
 */

import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { FranchiseService } from '../../services/franchise.service';
import { Location, LocationAnalytics } from '../../models/franchise.models';

@Component({
  selector: 'app-location-detail',
  templateUrl: './location-detail.page.html',
  styleUrls: ['./location-detail.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LocationDetailPage implements OnInit, OnDestroy {
  private franchiseService = inject(FranchiseService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private destroy$ = new Subject<void>();

  // State
  location = signal<Location | null>(null);
  analytics = signal<LocationAnalytics | null>(null);
  networkAverage = signal<any | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  // Computed comparisons
  revenueVsAverage = computed(() => {
    const loc = this.analytics();
    const avg = this.networkAverage();
    if (!loc || !avg) return 0;
    return ((loc.grossRevenue - avg.revenue) / avg.revenue) * 100;
  });

  membersVsAverage = computed(() => {
    const loc = this.analytics();
    const avg = this.networkAverage();
    if (!loc || !avg) return 0;
    return ((loc.activeMembers - avg.members) / avg.members) * 100;
  });

  retentionVsAverage = computed(() => {
    const loc = this.analytics();
    const avg = this.networkAverage();
    if (!loc || !avg) return 0;
    return loc.memberRetentionRate - avg.retention;
  });

  ngOnInit() {
    const locationId = this.route.snapshot.paramMap.get('id');
    if (locationId) {
      this.loadLocationDetails(locationId);
    } else {
      this.error.set('No location ID provided');
      this.loading.set(false);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Load location details and analytics
   */
  loadLocationDetails(locationId: string) {
    this.loading.set(true);
    this.error.set(null);

    // Load location info
    this.franchiseService.getLocation(locationId).subscribe({
      next: (location) => {
        this.location.set(location);
        this.loadLocationAnalytics(locationId);
      },
      error: (err) => {
        console.error('Error loading location:', err);
        this.error.set('Failed to load location details');
        this.loading.set(false);
      },
    });
  }

  /**
   * Load location analytics
   */
  private loadLocationAnalytics(locationId: string) {
    // TODO: Replace with actual API call
    // For now, use mock data
    setTimeout(() => {
      const mockAnalytics: LocationAnalytics = {
        id: 'analytics_001',
        locationId,
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
      };

      const mockNetworkAverage = {
        revenue: 19833,
        members: 337,
        retention: 96.3,
        workouts: 2423,
      };

      this.analytics.set(mockAnalytics);
      this.networkAverage.set(mockNetworkAverage);
      this.loading.set(false);
    }, 500);
  }

  /**
   * Edit location
   */
  editLocation() {
    const loc = this.location();
    if (loc) {
      this.router.navigate(['/franchise/locations', loc.id, 'edit']);
    }
  }

  /**
   * Deactivate location
   */
  async deactivateLocation() {
    const loc = this.location();
    if (!loc) return;

    const alert = await this.alertController.create({
      header: 'Deactivate Location',
      message: `Are you sure you want to deactivate ${loc.name}? This can be reversed later.`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Deactivate',
          role: 'destructive',
          handler: () => {
            // TODO: Implement deactivation API call
            console.log('Deactivating location:', loc.id);
          },
        },
      ],
    });

    await alert.present();
  }

  /**
   * View staff
   */
  viewStaff() {
    const loc = this.location();
    if (loc) {
      this.router.navigate(['/franchise/locations', loc.id, 'staff']);
    }
  }

  /**
   * View royalty payments
   */
  viewRoyalties() {
    // Navigate to royalties filtered by this location
    this.router.navigate(['/franchise/royalties'], {
      queryParams: { locationId: this.location()?.id },
    });
  }

  /**
   * Refresh data
   */
  async refresh(event?: any) {
    const locationId = this.route.snapshot.paramMap.get('id');
    if (locationId) {
      this.loadLocationDetails(locationId);
    }
    if (event) {
      setTimeout(() => event.target.complete(), 500);
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
   * Get comparison color
   */
  getComparisonColor(value: number): string {
    if (value > 5) return 'success';
    if (value < -5) return 'danger';
    return 'warning';
  }

  /**
   * Get comparison icon
   */
  getComparisonIcon(value: number): string {
    if (value > 0) return 'trending-up';
    if (value < 0) return 'trending-down';
    return 'remove';
  }
}
