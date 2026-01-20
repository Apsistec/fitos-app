/**
 * Franchise Management Service
 *
 * Handles API calls for multi-location and franchise operations:
 * - Organization & location management
 * - Royalty calculation and tracking
 * - Cross-location analytics
 *
 * Sprint 40: Multi-Location Management
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { environment } from '@env/environment';
import {
  Organization,
  Location,
  RoyaltyPayment,
  LocationAnalytics,
  OrganizationAnalytics,
  RoyaltyCalculationRequest,
  RoyaltyCalculationResponse,
  LocationComparison,
} from '../models/franchise.models';

@Injectable({
  providedIn: 'root',
})
export class FranchiseService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/api/v1/franchise`;

  // State management
  private currentOrganizationSubject = new BehaviorSubject<Organization | null>(null);
  public currentOrganization$ = this.currentOrganizationSubject.asObservable();

  private locationsSubject = new BehaviorSubject<Location[]>([]);
  public locations$ = this.locationsSubject.asObservable();

  // =====================================================================
  // ORGANIZATION MANAGEMENT
  // =====================================================================

  /**
   * Create new organization
   */
  createOrganization(data: Partial<Organization>): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations`, data).pipe(
      tap((org) => this.currentOrganizationSubject.next(org))
    );
  }

  /**
   * Get organization by ID
   */
  getOrganization(organizationId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/organizations/${organizationId}`).pipe(
      tap((org) => this.currentOrganizationSubject.next(org))
    );
  }

  /**
   * Set current organization (for UI context)
   */
  setCurrentOrganization(organization: Organization | null): void {
    this.currentOrganizationSubject.next(organization);
  }

  /**
   * Get current organization value
   */
  getCurrentOrganization(): Organization | null {
    return this.currentOrganizationSubject.value;
  }

  // =====================================================================
  // LOCATION MANAGEMENT
  // =====================================================================

  /**
   * Create new location
   */
  createLocation(data: Partial<Location>): Observable<Location> {
    return this.http.post<Location>(`${this.baseUrl}/locations`, data).pipe(
      tap((location) => {
        const currentLocations = this.locationsSubject.value;
        this.locationsSubject.next([...currentLocations, location]);
      })
    );
  }

  /**
   * Get location by ID
   */
  getLocation(locationId: string): Observable<Location> {
    return this.http.get<Location>(`${this.baseUrl}/locations/${locationId}`);
  }

  /**
   * List all locations for an organization
   */
  listOrganizationLocations(organizationId: string): Observable<Location[]> {
    return this.http
      .get<{ organization_id: string; locations: Location[] }>(
        `${this.baseUrl}/organizations/${organizationId}/locations`
      )
      .pipe(
        map((response) => response.locations),
        tap((locations) => this.locationsSubject.next(locations))
      );
  }

  /**
   * Get locations state
   */
  getLocations(): Location[] {
    return this.locationsSubject.value;
  }

  // =====================================================================
  // ROYALTY CALCULATION
  // =====================================================================

  /**
   * Calculate royalties for a location
   */
  calculateRoyalties(request: RoyaltyCalculationRequest): Observable<RoyaltyCalculationResponse> {
    return this.http.post<RoyaltyCalculationResponse>(
      `${this.baseUrl}/royalties/calculate`,
      request
    );
  }

  /**
   * Calculate organization-wide royalties
   */
  calculateOrganizationRoyalties(
    organizationId: string,
    periodStart: string,
    periodEnd: string,
    locationsRevenue: any[]
  ): Observable<any> {
    return this.http.post(`${this.baseUrl}/royalties/organization`, {
      organization_id: organizationId,
      period_start: periodStart,
      period_end: periodEnd,
      locations_revenue: locationsRevenue,
    });
  }

  /**
   * Get overdue royalty payments
   */
  getOverdueRoyalties(organizationId: string): Observable<{
    organization_id: string;
    overdue_payments: RoyaltyPayment[];
    total_overdue_amount: number;
  }> {
    return this.http.get<any>(`${this.baseUrl}/royalties/overdue/${organizationId}`);
  }

  // =====================================================================
  // ANALYTICS
  // =====================================================================

  /**
   * Aggregate analytics for a single location
   */
  aggregateLocationAnalytics(
    locationId: string,
    periodType: string,
    periodStart: string,
    periodEnd: string,
    data: any
  ): Observable<LocationAnalytics> {
    return this.http.post<LocationAnalytics>(`${this.baseUrl}/analytics/location`, {
      location_id: locationId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      data,
    });
  }

  /**
   * Aggregate analytics for entire organization
   */
  aggregateOrganizationAnalytics(
    organizationId: string,
    periodType: string,
    periodStart: string,
    periodEnd: string,
    locationsData: LocationAnalytics[]
  ): Observable<OrganizationAnalytics> {
    return this.http.post<OrganizationAnalytics>(`${this.baseUrl}/analytics/organization`, {
      organization_id: organizationId,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      locations_data: locationsData,
    });
  }

  /**
   * Compare locations by metric
   */
  compareLocations(
    locationsData: LocationAnalytics[],
    metric: string = 'grossRevenue'
  ): Observable<LocationComparison> {
    return this.http.post<LocationComparison>(`${this.baseUrl}/analytics/compare`, {
      locations_data: locationsData,
      metric,
    });
  }

  /**
   * Get top performing locations
   */
  getTopPerformers(
    locationsData: LocationAnalytics[],
    metric: string = 'grossRevenue',
    limit: number = 5
  ): Observable<{ metric: string; top_performers: LocationAnalytics[] }> {
    return this.http.post<any>(`${this.baseUrl}/analytics/top-performers`, {
      locations_data: locationsData,
      metric,
      limit,
    });
  }

  // =====================================================================
  // UTILITY METHODS
  // =====================================================================

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }

  /**
   * Format percentage
   */
  formatPercentage(rate: number): string {
    return `${(rate * 100).toFixed(2)}%`;
  }

  /**
   * Calculate retention rate
   */
  calculateRetentionRate(totalMembers: number, canceledMembers: number): number {
    if (totalMembers === 0) return 0;
    return ((totalMembers - canceledMembers) / totalMembers) * 100;
  }

  /**
   * Get payment status color
   */
  getPaymentStatusColor(
    status: 'pending' | 'processing' | 'paid' | 'overdue' | 'waived' | 'disputed'
  ): string {
    const colorMap = {
      pending: 'warning',
      processing: 'primary',
      paid: 'success',
      overdue: 'danger',
      waived: 'medium',
      disputed: 'danger',
    };
    return colorMap[status] || 'medium';
  }

  /**
   * Get location type icon
   */
  getLocationTypeIcon(type: 'headquarters' | 'branch' | 'franchise'): string {
    const iconMap = {
      headquarters: 'business',
      branch: 'location',
      franchise: 'storefront',
    };
    return iconMap[type] || 'location';
  }
}
