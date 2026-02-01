/**
 * Multi-Location Service
 * Manages cross-location access and membership
 * Sprint 40: Multi-Location Management (Deferred to Sprint 41)
 */

import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface LocationAccess {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  is_active: boolean;
  has_access: boolean;
  membership_status?: 'active' | 'pending' | 'expired';
  check_in_count?: number;
}

interface CheckInRecord {
  id: string;
  location_id: string;
  location_name: string;
  checked_in_at: string;
  checked_out_at?: string;
  duration_minutes?: number;
}

@Injectable({
  providedIn: 'root',
})
export class MultiLocationService {
  private currentLocationId = signal<string | null>(null);
  private apiUrl = `${environment.supabaseUrl}/rest/v1`;

  constructor(private http: HttpClient) {
    this.loadCurrentLocation();
  }

  /**
   * Load current location from storage
   */
  private async loadCurrentLocation() {
    try {
      const stored = localStorage.getItem('current_location_id');
      if (stored) {
        this.currentLocationId.set(stored);
      }
    } catch (error) {
      console.error('Error loading current location:', error);
    }
  }

  /**
   * Get current location ID
   */
  async getCurrentLocationId(): Promise<string | null> {
    return this.currentLocationId();
  }

  /**
   * Get all locations user has access to
   */
  async getUserLocations(): Promise<LocationAccess[]> {
    try {
      const response = await firstValueFrom(
        this.http.get<LocationAccess[]>(`${this.apiUrl}/locations`, {
          params: {
            select: `
              id,
              name,
              address,
              city,
              state,
              is_active,
              location_memberships!inner(
                status,
                has_access
              ),
              check_ins(count)
            `,
            'location_memberships.user_id': 'eq.auth.uid()',
          },
        })
      );

      return response.map((loc: any) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        is_active: loc.is_active,
        has_access: loc.location_memberships?.[0]?.has_access || false,
        membership_status: loc.location_memberships?.[0]?.status,
        check_in_count: loc.check_ins?.[0]?.count || 0,
      }));
    } catch (error) {
      console.error('Error fetching user locations:', error);
      throw error;
    }
  }

  /**
   * Switch to a different location
   */
  async switchLocation(locationId: string): Promise<void> {
    try {
      // Verify user has access to this location
      const locations = await this.getUserLocations();
      const location = locations.find((loc) => loc.id === locationId);

      if (!location) {
        throw new Error('Location not found');
      }

      if (!location.has_access) {
        throw new Error('No access to this location');
      }

      // Update current location
      this.currentLocationId.set(locationId);
      localStorage.setItem('current_location_id', locationId);

      // Log location switch event
      await this.logLocationSwitch(locationId);
    } catch (error) {
      console.error('Error switching location:', error);
      throw error;
    }
  }

  /**
   * Request access to a location
   */
  async requestLocationAccess(locationId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/location_access_requests`, {
          location_id: locationId,
          requested_at: new Date().toISOString(),
          status: 'pending',
        })
      );
    } catch (error) {
      console.error('Error requesting location access:', error);
      throw error;
    }
  }

  /**
   * Check in to current location
   */
  async checkIn(locationId?: string): Promise<CheckInRecord> {
    try {
      const targetLocationId = locationId || this.currentLocationId();
      if (!targetLocationId) {
        throw new Error('No location selected');
      }

      const response = await firstValueFrom(
        this.http.post<CheckInRecord>(`${this.apiUrl}/check_ins`, {
          location_id: targetLocationId,
          checked_in_at: new Date().toISOString(),
        })
      );

      return response;
    } catch (error) {
      console.error('Error checking in:', error);
      throw error;
    }
  }

  /**
   * Check out from current location
   */
  async checkOut(checkInId: string): Promise<void> {
    try {
      const checkedOutAt = new Date().toISOString();

      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/check_ins?id=eq.${checkInId}`, {
          checked_out_at: checkedOutAt,
        })
      );
    } catch (error) {
      console.error('Error checking out:', error);
      throw error;
    }
  }

  /**
   * Get check-in history
   */
  async getCheckInHistory(
    locationId?: string,
    limit = 50
  ): Promise<CheckInRecord[]> {
    try {
      const params: any = {
        select: `
          id,
          location_id,
          locations(name),
          checked_in_at,
          checked_out_at,
          duration_minutes
        `,
        order: 'checked_in_at.desc',
        limit: limit.toString(),
      };

      if (locationId) {
        params['location_id'] = `eq.${locationId}`;
      }

      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/check_ins`, { params })
      );

      return response.map((record) => ({
        id: record.id,
        location_id: record.location_id,
        location_name: record.locations?.name || 'Unknown',
        checked_in_at: record.checked_in_at,
        checked_out_at: record.checked_out_at,
        duration_minutes: record.duration_minutes,
      }));
    } catch (error) {
      console.error('Error fetching check-in history:', error);
      throw error;
    }
  }

  /**
   * Get active check-in (if any)
   */
  async getActiveCheckIn(): Promise<CheckInRecord | null> {
    try {
      const response = await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/check_ins`, {
          params: {
            select: `
              id,
              location_id,
              locations(name),
              checked_in_at
            `,
            checked_out_at: 'is.null',
            order: 'checked_in_at.desc',
            limit: '1',
          },
        })
      );

      if (response.length === 0) {
        return null;
      }

      const record = response[0];
      return {
        id: record.id,
        location_id: record.location_id,
        location_name: record.locations?.name || 'Unknown',
        checked_in_at: record.checked_in_at,
      };
    } catch (error) {
      console.error('Error fetching active check-in:', error);
      return null;
    }
  }

  /**
   * Log location switch event
   */
  private async logLocationSwitch(locationId: string): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${this.apiUrl}/location_switch_logs`, {
          location_id: locationId,
          switched_at: new Date().toISOString(),
        })
      );
    } catch (error) {
      console.error('Error logging location switch:', error);
      // Non-critical, don't throw
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(locationId: string): Promise<{
    totalCheckIns: number;
    totalHours: number;
    averageDuration: number;
    lastCheckIn?: string;
  }> {
    try {
      const history = await this.getCheckInHistory(locationId, 1000);

      const totalCheckIns = history.length;
      const totalMinutes = history.reduce(
        (sum, record) => sum + (record.duration_minutes || 0),
        0
      );
      const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
      const averageDuration =
        totalCheckIns > 0 ? Math.round(totalMinutes / totalCheckIns) : 0;
      const lastCheckIn = history[0]?.checked_in_at;

      return {
        totalCheckIns,
        totalHours,
        averageDuration,
        lastCheckIn,
      };
    } catch (error) {
      console.error('Error fetching location stats:', error);
      throw error;
    }
  }
}
