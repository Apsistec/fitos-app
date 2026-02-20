import { Injectable, signal, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './supabase.service';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Food data returned from the barcode-lookup Edge Function */
export interface BarcodeFoodResult {
  barcode: string;
  food_name: string;
  brand?: string;
  serving_size?: number;
  serving_unit?: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  source: 'openfoodfacts' | 'usda' | 'fatsecret' | 'manual';
}

/** Recent scan from barcode_scan_history table */
export interface RecentScan {
  id: string;
  barcode: string;
  food_name: string;
  brand?: string;
  calories?: number;
  scanned_at: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private supabase = inject(SupabaseService);

  // ─── State ─────────────────────────────────────────────────────────────────
  readonly isScanning   = signal(false);
  readonly isLooking    = signal(false);   // true while calling Edge Function
  readonly lastBarcode  = signal<string | null>(null);
  readonly lastResult   = signal<BarcodeFoodResult | null>(null);
  readonly recentScans  = signal<RecentScan[]>([]);
  readonly error        = signal<string | null>(null);

  /** Lazy-loaded plugin reference — null on web */
  private async getPlugin() {
    if (!Capacitor.isNativePlatform()) return null;
    try {
      const { BarcodeScanner } = await import(
        '@capacitor-mlkit/barcode-scanning' as string
      ) as { BarcodeScanner: typeof import('@capacitor-mlkit/barcode-scanning').BarcodeScanner };
      return BarcodeScanner;
    } catch {
      return null;
    }
  }

  // ─── Public API ────────────────────────────────────────────────────────────

  /** Returns true when running on iOS or Android with ML Kit available */
  async isSupported(): Promise<boolean> {
    const plugin = await this.getPlugin();
    if (!plugin) return false;
    try {
      const { supported } = await plugin.isSupported();
      return supported;
    } catch {
      return false;
    }
  }

  /** Request camera permission. Returns true if granted. */
  async requestPermission(): Promise<boolean> {
    const plugin = await this.getPlugin();
    if (!plugin) return false;
    try {
      const status = await plugin.checkPermissions();
      if (status.camera === 'granted') return true;
      const requested = await plugin.requestPermissions();
      return requested.camera === 'granted';
    } catch {
      return false;
    }
  }

  /**
   * Open the ML Kit barcode scanner UI and return the raw barcode string.
   * Uses the built-in `scan()` method that presents a full-screen camera view
   * without requiring WebView customisation.
   * Returns null if cancelled or unsupported.
   */
  async scan(): Promise<string | null> {
    this.error.set(null);
    this.lastBarcode.set(null);

    const plugin = await this.getPlugin();
    if (!plugin) {
      this.error.set('Barcode scanning is not supported on this platform.');
      return null;
    }

    const permitted = await this.requestPermission();
    if (!permitted) {
      this.error.set('Camera permission is required to scan barcodes.');
      return null;
    }

    this.isScanning.set(true);
    try {
      // Check for Google Barcode Scanner module on Android
      if (Capacitor.getPlatform() === 'android') {
        const { available } = await plugin.isGoogleBarcodeScannerModuleAvailable();
        if (!available) {
          await plugin.installGoogleBarcodeScannerModule();
          // Module installed — user must re-try; show friendly message
          this.error.set('Barcode scanner module installed. Please try again.');
          return null;
        }
      }

      const { barcodes } = await plugin.scan({
        formats: [
          'EAN_13',
          'EAN_8',
          'UPC_A',
          'UPC_E',
          'CODE_128',
          'CODE_39',
          'QR_CODE',
        ] as import('@capacitor-mlkit/barcode-scanning').BarcodeFormat[],
      });

      const barcode = barcodes?.[0]?.rawValue ?? null;
      this.lastBarcode.set(barcode);
      return barcode;
    } catch (err: unknown) {
      // User cancelled — not an error worth surfacing
      const msg = err instanceof Error ? err.message : '';
      if (!msg.toLowerCase().includes('cancel')) {
        this.error.set('Barcode scan failed. Please try again.');
      }
      return null;
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Look up nutrition data for a barcode via the Supabase Edge Function.
   * The Edge Function pipeline: local cache → Open Food Facts → USDA → FatSecret → null
   */
  async lookupBarcode(barcode: string): Promise<BarcodeFoodResult | null> {
    this.isLooking.set(true);
    this.error.set(null);
    this.lastResult.set(null);

    try {
      const { data, error } = await this.supabase.client.functions.invoke<BarcodeFoodResult>(
        'barcode-lookup',
        { body: { barcode } }
      );

      if (error) throw error;
      if (!data) return null;

      this.lastResult.set(data);
      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Barcode lookup failed';
      this.error.set(msg);
      console.error('[BarcodeScannerService] lookup error:', err);
      return null;
    } finally {
      this.isLooking.set(false);
    }
  }

  /**
   * Log a successful barcode scan to the user's history.
   * Called after the user confirms logging the food.
   */
  async logScan(
    userId: string,
    food: Pick<BarcodeFoodResult, 'barcode' | 'food_name' | 'brand' | 'calories'>
  ): Promise<void> {
    try {
      await this.supabase.client.rpc('log_barcode_scan', {
        p_user_id:   userId,
        p_barcode:   food.barcode,
        p_food_name: food.food_name,
        p_brand:     food.brand ?? null,
        p_calories:  food.calories ?? null,
      });
      // Refresh recent scans after logging
      await this.loadRecentScans(userId);
    } catch (err) {
      console.error('[BarcodeScannerService] logScan error:', err);
    }
  }

  /** Load the user's recent scan history (most recent 20 items) */
  async loadRecentScans(userId: string): Promise<RecentScan[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('barcode_scan_history')
        .select('id, barcode, food_name, brand, calories, scanned_at')
        .eq('user_id', userId)
        .order('scanned_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      const scans = (data ?? []) as RecentScan[];
      this.recentScans.set(scans);
      return scans;
    } catch (err) {
      console.error('[BarcodeScannerService] loadRecentScans error:', err);
      return [];
    }
  }

  /** Clear error state */
  clearError(): void {
    this.error.set(null);
  }
}
