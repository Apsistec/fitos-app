/**
 * Location Switcher Component
 * Allows users to switch between accessible locations
 * Sprint 40: Multi-Location Management (Deferred to Sprint 41)
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonicModule,
  ModalController,
  ToastController,
} from '@ionic/angular';
import { MultiLocationService } from '../../services/multi-location.service';

interface Location {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  isActive: boolean;
  isCurrent: boolean;
  hasAccess: boolean;
  membershipStatus?: 'active' | 'pending' | 'expired';
  checkInCount?: number;
}

@Component({
  selector: 'app-location-switcher',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './location-switcher.component.html',
  styleUrls: ['./location-switcher.component.scss'],
})
export class LocationSwitcherComponent implements OnInit {
  locations = signal<Location[]>([]);
  loading = signal(true);
  currentLocationId = signal<string | null>(null);

  // Computed values
  accessibleLocations = computed(() =>
    this.locations().filter((loc) => loc.hasAccess)
  );

  currentLocation = computed(() =>
    this.locations().find((loc) => loc.isCurrent)
  );

  otherLocations = computed(() =>
    this.locations().filter((loc) => loc.hasAccess && !loc.isCurrent)
  );

  constructor(
    private modalController: ModalController,
    private toastController: ToastController,
    private multiLocationService: MultiLocationService
  ) {}

  async ngOnInit() {
    await this.loadLocations();
  }

  async loadLocations() {
    try {
      this.loading.set(true);
      const [locations, currentId] = await Promise.all([
        this.multiLocationService.getUserLocations(),
        this.multiLocationService.getCurrentLocationId(),
      ]);

      this.currentLocationId.set(currentId);

      // Transform locations
      const transformedLocations = locations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        address: loc.address,
        city: loc.city,
        state: loc.state,
        isActive: loc.is_active,
        isCurrent: loc.id === currentId,
        hasAccess: loc.has_access,
        membershipStatus: loc.membership_status,
        checkInCount: loc.check_in_count || 0,
      }));

      this.locations.set(transformedLocations);
    } catch (error) {
      console.error('Error loading locations:', error);
      await this.showToast('Failed to load locations', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async switchLocation(location: Location) {
    if (location.isCurrent) {
      await this.dismiss();
      return;
    }

    if (!location.hasAccess) {
      await this.showToast(
        'You do not have access to this location',
        'warning'
      );
      return;
    }

    try {
      await this.multiLocationService.switchLocation(location.id);

      // Update current location
      this.locations.update((locs) =>
        locs.map((loc) => ({
          ...loc,
          isCurrent: loc.id === location.id,
        }))
      );

      await this.showToast(`Switched to ${location.name}`, 'success');
      await this.dismiss(location);
    } catch (error) {
      console.error('Error switching location:', error);
      await this.showToast('Failed to switch location', 'danger');
    }
  }

  async requestAccess(location: Location) {
    try {
      await this.multiLocationService.requestLocationAccess(location.id);
      await this.showToast('Access request sent', 'success');
      await this.loadLocations(); // Reload to show pending status
    } catch (error) {
      console.error('Error requesting access:', error);
      await this.showToast('Failed to request access', 'danger');
    }
  }

  getLocationIcon(location: Location): string {
    if (location.isCurrent) return 'location';
    if (!location.hasAccess) return 'lock-closed-outline';
    return 'location-outline';
  }

  getLocationColor(location: Location): string {
    if (location.isCurrent) return 'primary';
    if (!location.hasAccess) return 'medium';
    if (location.membershipStatus === 'expired') return 'warning';
    return 'dark';
  }

  getMembershipBadgeColor(status?: string): string {
    switch (status) {
      case 'active':
        return 'success';
      case 'pending':
        return 'warning';
      case 'expired':
        return 'danger';
      default:
        return 'medium';
    }
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }

  async dismiss(data?: any) {
    await this.modalController.dismiss(data);
  }
}
