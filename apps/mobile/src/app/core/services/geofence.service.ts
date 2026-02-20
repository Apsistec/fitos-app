import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * GeofenceService
 * Sprint 52: Context-Aware Notifications + Geofencing
 *
 * Implements geofencing using @capacitor/geolocation + Haversine distance
 * (avoids the $399 TransistorSoft license).
 * Secondary gym confirmation via @capgo/capacitor-wifi SSID matching.
 */

export interface GymLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  wifiSsid?: string;
  facilityId?: string;
}

export interface GeofenceEvent {
  type: 'enter' | 'exit';
  gym: GymLocation;
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  wifiSsid?: string;
}

// How often to poll location when tracking (ms)
const POLL_INTERVAL_MS = 30_000; // 30 seconds
// Hysteresis: require this many consecutive readings inside/outside before firing event
const HYSTERESIS_COUNT = 2;

@Injectable({
  providedIn: 'root',
})
export class GeofenceService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ── State signals ──────────────────────────────────────────────────────────
  private _isTracking = signal(false);
  private _isNearGym = signal(false);
  private _nearestGym = signal<GymLocation | null>(null);
  private _gymLocations = signal<GymLocation[]>([]);
  private _lastPosition = signal<{ lat: number; lng: number; accuracy: number } | null>(null);
  private _error = signal<string | null>(null);

  // Public readonly
  isTracking  = this._isTracking.asReadonly();
  isNearGym   = this._isNearGym.asReadonly();
  nearestGym  = this._nearestGym.asReadonly();
  gymLocations = this._gymLocations.asReadonly();
  lastPosition = this._lastPosition.asReadonly();
  error       = this._error.asReadonly();

  // Computed
  isSupported = computed(() => {
    try {
      return typeof window !== 'undefined' && 'navigator' in window;
    } catch {
      return false;
    }
  });

  // ── Internal state ─────────────────────────────────────────────────────────
  private watchId: string | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private entryCallbacks: Array<(event: GeofenceEvent) => void> = [];
  private exitCallbacks: Array<(event: GeofenceEvent) => void> = [];
  // Hysteresis counters per gym id
  private insideCounts = new Map<string, number>();
  private outsideCounts = new Map<string, number>();
  private currentlyInside = new Set<string>();

  // ─── Plugin lazy loaders ───────────────────────────────────────────────────
  private async getGeoPlugin() {
    try {
      const mod = await (import('@capacitor/geolocation' as string) as Promise<{
        Geolocation: {
          checkPermissions: () => Promise<{ location: string }>;
          requestPermissions: (opts?: { permissions: string[] }) => Promise<{ location: string }>;
          getCurrentPosition: (opts?: object) => Promise<{
            coords: { latitude: number; longitude: number; accuracy: number };
          }>;
          watchPosition: (opts: object, cb: (pos: {
            coords: { latitude: number; longitude: number; accuracy: number };
          } | null, err?: Error) => void) => Promise<string>;
          clearWatch: (opts: { id: string }) => Promise<void>;
        };
      }>);
      return mod.Geolocation;
    } catch {
      return null;
    }
  }

  private async getWifiPlugin() {
    try {
      const mod = await (import('@capgo/capacitor-wifi' as string) as Promise<{
        CapacitorWifi: { getSsid: () => Promise<{ value: string | null }> };
      }>);
      return mod.CapacitorWifi;
    } catch {
      return null;
    }
  }

  // ─── Permissions ──────────────────────────────────────────────────────────
  async checkPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    const geo = await this.getGeoPlugin();
    if (!geo) return 'denied';
    try {
      const status = await geo.checkPermissions();
      const state = status.location;
      if (state === 'granted') return 'granted';
      if (state === 'denied') return 'denied';
      return 'prompt';
    } catch {
      return 'denied';
    }
  }

  async requestPermission(): Promise<boolean> {
    const geo = await this.getGeoPlugin();
    if (!geo) return false;
    try {
      const result = await geo.requestPermissions({ permissions: ['location'] });
      return result.location === 'granted';
    } catch {
      this._error.set('Location permission denied');
      return false;
    }
  }

  // ─── Load gym locations from Supabase ─────────────────────────────────────
  async loadGymLocations(facilityId?: string): Promise<GymLocation[]> {
    try {
      let query = this.supabase.client
        .from('gym_locations')
        .select('*')
        .eq('is_active', true);

      if (facilityId) {
        query = query.eq('facility_id', facilityId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const locations: GymLocation[] = (data || []).map((row: {
        id: string;
        name: string;
        latitude: number;
        longitude: number;
        radius_meters: number;
        wifi_ssid?: string;
        facility_id?: string;
      }) => ({
        id: row.id,
        name: row.name,
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        radiusMeters: row.radius_meters,
        wifiSsid: row.wifi_ssid,
        facilityId: row.facility_id,
      }));

      this._gymLocations.set(locations);
      return locations;
    } catch (err) {
      console.error('[GeofenceService] loadGymLocations error:', err);
      return [];
    }
  }

  // ─── Register a gym location ───────────────────────────────────────────────
  async registerGymLocation(location: Omit<GymLocation, 'id'>): Promise<GymLocation | null> {
    try {
      const user = this.auth.user();
      if (!user) return null;

      const { data, error } = await this.supabase.client
        .from('gym_locations')
        .insert({
          trainer_id: user.id,
          facility_id: location.facilityId,
          name: location.name,
          latitude: location.latitude,
          longitude: location.longitude,
          radius_meters: location.radiusMeters,
          wifi_ssid: location.wifiSsid ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      const gym: GymLocation = {
        id: data.id,
        name: data.name,
        latitude: Number(data.latitude),
        longitude: Number(data.longitude),
        radiusMeters: data.radius_meters,
        wifiSsid: data.wifi_ssid,
        facilityId: data.facility_id,
      };

      this._gymLocations.update(locs => [...locs, gym]);
      return gym;
    } catch (err) {
      console.error('[GeofenceService] registerGymLocation error:', err);
      this._error.set('Failed to save gym location');
      return null;
    }
  }

  // ─── Start tracking ────────────────────────────────────────────────────────
  async startTracking(gyms?: GymLocation[]): Promise<boolean> {
    if (this._isTracking()) return true;

    const geo = await this.getGeoPlugin();
    if (!geo) {
      this._error.set('Geolocation not available');
      return false;
    }

    const permission = await this.checkPermission();
    if (permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return false;
    }

    // Load gyms if not provided
    if (gyms) {
      this._gymLocations.set(gyms);
    } else if (this._gymLocations().length === 0) {
      await this.loadGymLocations();
    }

    try {
      // Use watchPosition for continuous tracking
      this.watchId = await geo.watchPosition(
        { enableHighAccuracy: false, timeout: 10000 },
        (position, err) => {
          if (err) {
            console.error('[GeofenceService] watchPosition error:', err);
            return;
          }
          if (position) {
            this.handlePositionUpdate(
              position.coords.latitude,
              position.coords.longitude,
              position.coords.accuracy,
            );
          }
        }
      );

      this._isTracking.set(true);
      this._error.set(null);
      return true;
    } catch (err) {
      console.error('[GeofenceService] startTracking error:', err);
      this._error.set('Failed to start location tracking');
      return false;
    }
  }

  // ─── Stop tracking ─────────────────────────────────────────────────────────
  async stopTracking(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    const geo = await this.getGeoPlugin();
    if (geo && this.watchId) {
      try { await geo.clearWatch({ id: this.watchId }); } catch { /* noop */ }
      this.watchId = null;
    }

    this._isTracking.set(false);
    this._isNearGym.set(false);
    this._nearestGym.set(null);
    this.insideCounts.clear();
    this.outsideCounts.clear();
    this.currentlyInside.clear();
  }

  // ─── One-shot proximity check ──────────────────────────────────────────────
  async getCurrentProximity(): Promise<{ isNearGym: boolean; nearestGym: GymLocation | null; distanceMeters: number | null }> {
    const geo = await this.getGeoPlugin();
    if (!geo) return { isNearGym: false, nearestGym: null, distanceMeters: null };

    try {
      const pos = await geo.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000 });
      const { latitude, longitude } = pos.coords;

      let nearestGym: GymLocation | null = null;
      let minDist = Infinity;

      for (const gym of this._gymLocations()) {
        const dist = this.haversineMeters(latitude, longitude, gym.latitude, gym.longitude);
        if (dist < minDist) {
          minDist = dist;
          nearestGym = gym;
        }
      }

      const isNear = nearestGym !== null && minDist <= nearestGym.radiusMeters;
      return { isNearGym: isNear, nearestGym, distanceMeters: minDist === Infinity ? null : Math.round(minDist) };
    } catch (err) {
      console.error('[GeofenceService] getCurrentProximity error:', err);
      return { isNearGym: false, nearestGym: null, distanceMeters: null };
    }
  }

  // ─── Get current Wi-Fi SSID ────────────────────────────────────────────────
  async getCurrentWifiSsid(): Promise<string | null> {
    const wifi = await this.getWifiPlugin();
    if (!wifi) return null;
    try {
      const result = await wifi.getSsid();
      return result.value ?? null;
    } catch {
      return null;
    }
  }

  // ─── Check if user is near a specific gym by Wi-Fi SSID ───────────────────
  async isOnGymWifi(): Promise<{ matched: boolean; gym: GymLocation | null }> {
    const ssid = await this.getCurrentWifiSsid();
    if (!ssid) return { matched: false, gym: null };

    const matched = this._gymLocations().find(g => g.wifiSsid && g.wifiSsid === ssid) ?? null;
    return { matched: matched !== null, gym: matched };
  }

  // ─── Register callbacks ────────────────────────────────────────────────────
  onGeofenceEntry(callback: (event: GeofenceEvent) => void): () => void {
    this.entryCallbacks.push(callback);
    return () => {
      this.entryCallbacks = this.entryCallbacks.filter(cb => cb !== callback);
    };
  }

  onGeofenceExit(callback: (event: GeofenceEvent) => void): () => void {
    this.exitCallbacks.push(callback);
    return () => {
      this.exitCallbacks = this.exitCallbacks.filter(cb => cb !== callback);
    };
  }

  // ─── Internal: handle position update ────────────────────────────────────
  private async handlePositionUpdate(lat: number, lng: number, accuracy: number): Promise<void> {
    this._lastPosition.set({ lat, lng, accuracy });

    const ssid = await this.getCurrentWifiSsid();
    let closestNearby: GymLocation | null = null;
    let closestDist = Infinity;

    for (const gym of this._gymLocations()) {
      const dist = this.haversineMeters(lat, lng, gym.latitude, gym.longitude);
      const inRadius = dist <= gym.radiusMeters;
      // Optional Wi-Fi secondary confirmation (OR logic: GPS inside OR on gym Wi-Fi)
      const onGymWifi = ssid !== null && gym.wifiSsid === ssid;
      const isInside = inRadius || onGymWifi;

      if (isInside && dist < closestDist) {
        closestDist = dist;
        closestNearby = gym;
      }

      this.applyHysteresis(gym, isInside, lat, lng, accuracy, ssid);
    }

    this._isNearGym.set(closestNearby !== null);
    this._nearestGym.set(closestNearby);
  }

  private applyHysteresis(
    gym: GymLocation,
    isInside: boolean,
    lat: number,
    lng: number,
    accuracy: number,
    ssid: string | null,
  ): void {
    if (isInside) {
      this.outsideCounts.set(gym.id, 0);
      const count = (this.insideCounts.get(gym.id) ?? 0) + 1;
      this.insideCounts.set(gym.id, count);

      if (count >= HYSTERESIS_COUNT && !this.currentlyInside.has(gym.id)) {
        this.currentlyInside.add(gym.id);
        const event: GeofenceEvent = { type: 'enter', gym, latitude: lat, longitude: lng, accuracyMeters: accuracy, wifiSsid: ssid ?? undefined };
        this.entryCallbacks.forEach(cb => cb(event));
        this.logGeofenceEvent(event);
      }
    } else {
      this.insideCounts.set(gym.id, 0);
      const count = (this.outsideCounts.get(gym.id) ?? 0) + 1;
      this.outsideCounts.set(gym.id, count);

      if (count >= HYSTERESIS_COUNT && this.currentlyInside.has(gym.id)) {
        this.currentlyInside.delete(gym.id);
        const event: GeofenceEvent = { type: 'exit', gym, latitude: lat, longitude: lng, accuracyMeters: accuracy, wifiSsid: ssid ?? undefined };
        this.exitCallbacks.forEach(cb => cb(event));
        this.logGeofenceEvent(event);
      }
    }
  }

  // ─── Log geofence event to Supabase ──────────────────────────────────────
  private async logGeofenceEvent(event: GeofenceEvent): Promise<void> {
    try {
      const user = this.auth.user();
      if (!user) return;

      await this.supabase.client.from('geofence_events').insert({
        user_id: user.id,
        gym_location_id: event.gym.id,
        event_type: event.type,
        latitude: event.latitude,
        longitude: event.longitude,
        accuracy_meters: event.accuracyMeters ?? null,
        wifi_ssid: event.wifiSsid ?? null,
        triggered_notification: false,
      });
    } catch (err) {
      console.error('[GeofenceService] logGeofenceEvent error:', err);
    }
  }

  // ─── Haversine distance (metres) ─────────────────────────────────────────
  private haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6_371_000; // Earth radius in metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
