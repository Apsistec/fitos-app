import {
  Component,
  Output,
  EventEmitter,
  signal,
  inject,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSpinner,
  IonNote,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  locationOutline,
  addCircleOutline,
  trashOutline,
  checkmarkCircleOutline,
  wifiOutline,
} from 'ionicons/icons';

import { GeofenceService, GymLocation } from '../../../../core/services/geofence.service';
import { HapticService } from '../../../../core/services/haptic.service';

export interface GymLocationSaved {
  gym: GymLocation;
}

@Component({
  selector: 'app-gym-location-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonItem,
    IonLabel,
    IonList,
    IonSpinner,
    IonNote,
  ],
  template: `
    <div class="gym-picker">
      <h3 class="section-title">
        <ion-icon name="location-outline"></ion-icon>
        Gym Locations
      </h3>

      <ion-note class="picker-hint">
        Set your gym location to receive arrival notifications and smarter workout reminders.
      </ion-note>

      <!-- Existing locations -->
      @if (geofence.gymLocations().length > 0) {
        <ion-list class="location-list">
          @for (gym of geofence.gymLocations(); track gym.id) {
            <ion-item lines="none" class="location-item">
              <ion-icon slot="start" name="location-outline" class="loc-icon"></ion-icon>
              <ion-label>
                <h3>{{ gym.name }}</h3>
                <p>{{ gym.radiusMeters }}m radius
                  @if (gym.wifiSsid) {
                    · <ion-icon name="wifi-outline" style="font-size:11px"></ion-icon> {{ gym.wifiSsid }}
                  }
                </p>
              </ion-label>
              <ion-button
                slot="end"
                fill="clear"
                color="danger"
                (click)="removeGym(gym)"
                aria-label="Remove gym"
              >
                <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
              </ion-button>
            </ion-item>
          }
        </ion-list>
      }

      <!-- Add new location form -->
      @if (!showAddForm()) {
        <ion-button
          expand="block"
          fill="outline"
          class="add-btn"
          (click)="showAddForm.set(true)"
        >
          <ion-icon slot="start" name="add-circle-outline"></ion-icon>
          Add Gym Location
        </ion-button>
      } @else {
        <div class="add-form">
          <ion-item lines="none" class="form-item">
            <ion-input
              [(ngModel)]="newGymName"
              label="Gym Name"
              labelPlacement="floating"
              placeholder="e.g. Equinox Downtown"
              fill="outline"
            ></ion-input>
          </ion-item>

          <ion-item lines="none" class="form-item">
            <ion-input
              [(ngModel)]="newGymRadius"
              label="Detection Radius (metres)"
              labelPlacement="floating"
              type="number"
              fill="outline"
              [value]="100"
              min="50"
              max="2000"
            ></ion-input>
          </ion-item>

          <ion-item lines="none" class="form-item">
            <ion-input
              [(ngModel)]="newGymWifiSsid"
              label="Wi-Fi SSID (optional)"
              labelPlacement="floating"
              placeholder="e.g. Equinox_Guest"
              fill="outline"
            ></ion-input>
          </ion-item>

          @if (locationError()) {
            <ion-note color="danger" class="error-note">{{ locationError() }}</ion-note>
          }

          <div class="form-actions">
            <ion-button fill="outline" color="medium" (click)="cancelAdd()">
              Cancel
            </ion-button>
            <ion-button
              (click)="useCurrentLocation()"
              [disabled]="isSaving()"
              class="use-location-btn"
            >
              @if (isSaving()) {
                <ion-spinner slot="start" name="crescent"></ion-spinner>
                Saving…
              } @else {
                <ion-icon slot="start" name="location-outline"></ion-icon>
                Use My Location
              }
            </ion-button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .gym-picker {
      padding: 4px 0;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 8px 0;
      font-size: 15px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .section-title ion-icon {
      color: var(--ion-color-primary, #10B981);
      font-size: 18px;
    }

    .picker-hint {
      display: block;
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .location-list {
      background: transparent;
      margin-bottom: 12px;
    }

    .location-item {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      margin-bottom: 6px;
      border-radius: 10px;
    }

    .loc-icon {
      color: var(--ion-color-primary, #10B981);
    }

    .location-item h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .location-item p {
      font-size: 12px;
      color: var(--fitos-text-secondary, #A3A3A3);
    }

    .add-btn {
      --border-radius: 10px;
    }

    .add-form {
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 12px;
      padding: 16px;
      border: 1px solid rgba(255, 255, 255, 0.06);
    }

    .form-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --background: transparent;
      margin-bottom: 10px;
    }

    .error-note {
      display: block;
      font-size: 12px;
      margin: 4px 0 8px 0;
    }

    .form-actions {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
      margin-top: 8px;
    }

    .form-actions ion-button {
      --border-radius: 10px;
      font-weight: 700;
    }

    .use-location-btn {
      --border-radius: 10px;
    }
  `],
})
export class GymLocationPickerComponent {
  @Output() gymSaved = new EventEmitter<GymLocationSaved>();

  geofence = inject(GeofenceService);
  haptic   = inject(HapticService);

  showAddForm  = signal(false);
  isSaving     = signal(false);
  locationError = signal<string | null>(null);

  newGymName     = '';
  newGymRadius   = 100;
  newGymWifiSsid = '';

  cancelAdd(): void {
    this.showAddForm.set(false);
    this.resetForm();
  }

  async useCurrentLocation(): Promise<void> {
    if (!this.newGymName.trim()) {
      this.locationError.set('Please enter a gym name first');
      return;
    }

    this.isSaving.set(true);
    this.locationError.set(null);

    try {
      // Request location permission if needed
      const permission = await this.geofence.checkPermission();
      if (permission !== 'granted') {
        const granted = await this.geofence.requestPermission();
        if (!granted) {
          this.locationError.set('Location permission required to detect gym');
          return;
        }
      }

      // Get current position via one-shot check
      const proximity = await this.geofence.getCurrentProximity();
      const lastPos = this.geofence.lastPosition();

      if (!lastPos) {
        // Trigger a fresh position read
        const pos = await this.readCurrentPosition();
        if (!pos) {
          this.locationError.set('Could not read your current location. Please try again.');
          return;
        }

        const saved = await this.geofence.registerGymLocation({
          name: this.newGymName.trim(),
          latitude: pos.latitude,
          longitude: pos.longitude,
          radiusMeters: Math.max(50, Math.min(2000, this.newGymRadius || 100)),
          wifiSsid: this.newGymWifiSsid.trim() || undefined,
        });

        if (saved) {
          await this.haptic.success();
          this.gymSaved.emit({ gym: saved });
          this.showAddForm.set(false);
          this.resetForm();
        } else {
          this.locationError.set('Failed to save gym location');
        }
        return;
      }

      const saved = await this.geofence.registerGymLocation({
        name: this.newGymName.trim(),
        latitude: lastPos.lat,
        longitude: lastPos.lng,
        radiusMeters: Math.max(50, Math.min(2000, this.newGymRadius || 100)),
        wifiSsid: this.newGymWifiSsid.trim() || undefined,
      });

      if (saved) {
        await this.haptic.success();
        this.gymSaved.emit({ gym: saved });
        this.showAddForm.set(false);
        this.resetForm();
      } else {
        this.locationError.set('Failed to save gym location');
      }
    } catch (err) {
      console.error('[GymLocationPicker] useCurrentLocation error:', err);
      this.locationError.set('An error occurred. Please try again.');
    } finally {
      this.isSaving.set(false);
    }
  }

  async removeGym(gym: GymLocation): Promise<void> {
    await this.haptic.light();
    // Optimistic removal from local state
    // (RLS prevents users from deleting others' entries)
    const { error } = await this.geofence['supabase'].client
      .from('gym_locations')
      .update({ is_active: false })
      .eq('id', gym.id);

    if (!error) {
      this.geofence['_gymLocations'].update(locs => locs.filter(l => l.id !== gym.id));
    }
  }

  private async readCurrentPosition(): Promise<{ latitude: number; longitude: number } | null> {
    try {
      const mod = await (import('@capacitor/geolocation' as string) as Promise<{
        Geolocation: {
          getCurrentPosition: (opts?: object) => Promise<{
            coords: { latitude: number; longitude: number; accuracy: number };
          }>;
        };
      }>);
      const pos = await mod.Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 });
      return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    } catch {
      return null;
    }
  }

  private resetForm(): void {
    this.newGymName     = '';
    this.newGymRadius   = 100;
    this.newGymWifiSsid = '';
    this.locationError.set(null);
  }

  constructor() {
    addIcons({ locationOutline, addCircleOutline, trashOutline, checkmarkCircleOutline, wifiOutline });
  }
}
