import { Injectable, inject, signal } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { NfcTouchpoint, NfcScanLog, NfcTagType, DeepLinkParams, DeepLinkType } from '@fitos/shared';

const BASE_URL = 'https://www.nutrifitos.app';

@Injectable({ providedIn: 'root' })
export class NfcService {
  private supabase = inject(SupabaseService);
  private authService = inject(AuthService);

  // Signals
  readonly isScanning = signal(false);
  readonly lastScan = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly touchpoints = signal<NfcTouchpoint[]>([]);
  readonly isLoading = signal(false);

  /**
   * Returns true if the device has NFC hardware and the plugin is available.
   * @capgo/capacitor-nfc is optional — fall back gracefully when absent.
   */
  isSupported(): boolean {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      // The plugin will be available after `npm install @capgo/capacitor-nfc`
      // and native sync. Guard with a try/catch so the app does not crash
      // in environments where the plugin is absent.
      return typeof (window as unknown as Record<string, unknown>)['CapacitorNfc'] !== 'undefined';
    } catch {
      return false;
    }
  }

  /**
   * Build a nutrifitos.app deep-link URI from a typed params object.
   */
  generateDeepLink(params: DeepLinkParams): string {
    switch (params.type) {
      case 'checkin':
        return `${BASE_URL}/action/checkin/${params.facilityId ?? ''}`;
      case 'workout':
        return `${BASE_URL}/action/workout/${params.workoutTemplateId ?? ''}`;
      case 'equipment':
        return `${BASE_URL}/action/equipment/${params.equipmentId ?? ''}`;
    }
  }

  /**
   * Start an NFC scanning session.
   * Reads the first NDEF URI record and returns it.
   * Falls back gracefully when plugin is unavailable.
   */
  async scanTag(): Promise<string | null> {
    if (!this.isSupported()) {
      this.error.set('NFC is not supported on this device.');
      return null;
    }

    this.isScanning.set(true);
    this.error.set(null);

    try {
      // Dynamic import so the app compiles without the native plugin installed.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nfcMod: any = await import('@capgo/capacitor-nfc' as string).catch(() => null);
      if (!nfcMod) {
        this.error.set('NFC plugin not installed. Run: npm install @capgo/capacitor-nfc');
        this.isScanning.set(false);
        return null;
      }
      const { Nfc } = nfcMod;
      await Nfc.startScanSession();

      return await new Promise<string | null>((resolve) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Nfc.addListener('nfcTagScanned', async (event: any) => {
          const uri = this.extractUriFromNdef(event);
          if (uri) {
            this.lastScan.set(uri);
            await this.logScan(uri);
          }
          await Nfc.stopScanSession();
          this.isScanning.set(false);
          resolve(uri);
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NFC scan failed';
      this.error.set(msg);
      this.isScanning.set(false);
      return null;
    }
  }

  /**
   * Write a URI string to an NTAG213 NFC tag.
   * Trainer-only operation.
   */
  async writeTag(uri: string): Promise<boolean> {
    if (!this.isSupported()) {
      this.error.set('NFC is not supported on this device.');
      return false;
    }

    this.isScanning.set(true);
    this.error.set(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const nfcMod: any = await import('@capgo/capacitor-nfc' as string).catch(() => null);
      if (!nfcMod) {
        this.error.set('NFC plugin not installed. Run: npm install @capgo/capacitor-nfc');
        this.isScanning.set(false);
        return false;
      }
      const { Nfc } = nfcMod;
      await Nfc.startScanSession();

      return await new Promise<boolean>((resolve) => {
        Nfc.addListener('nfcTagScanned', async () => {
          try {
            await Nfc.write({
              message: {
                records: [
                  {
                    recordType: 'url',
                    data: uri,
                  },
                ],
              },
            });
            await Nfc.stopScanSession();
            this.isScanning.set(false);
            resolve(true);
          } catch (writeErr) {
            const msg = writeErr instanceof Error ? writeErr.message : 'Write failed';
            this.error.set(msg);
            await Nfc.stopScanSession();
            this.isScanning.set(false);
            resolve(false);
          }
        });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'NFC write failed';
      this.error.set(msg);
      this.isScanning.set(false);
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Supabase CRUD
  // ---------------------------------------------------------------------------

  async loadTouchpoints(): Promise<void> {
    this.isLoading.set(true);
    const user = this.authService.user();
    if (!user) return;

    const { data, error } = await this.supabase.client
      .from('nfc_touchpoints')
      .select('*')
      .eq('trainer_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      this.touchpoints.set(data as NfcTouchpoint[]);
    }
    this.isLoading.set(false);
  }

  async createTouchpoint(params: {
    tag_type: NfcTagType;
    label: string;
    deep_link_uri: string;
    facility_id?: string;
    equipment_id?: string;
    workout_template_id?: string;
  }): Promise<NfcTouchpoint | null> {
    const user = this.authService.user();
    if (!user) return null;

    const { data, error } = await this.supabase.client
      .from('nfc_touchpoints')
      .insert({ ...params, trainer_id: user.id })
      .select()
      .single();

    if (error) {
      this.error.set(error.message);
      return null;
    }

    this.touchpoints.update((list) => [data as NfcTouchpoint, ...list]);
    return data as NfcTouchpoint;
  }

  async deleteTouchpoint(id: string): Promise<boolean> {
    const { error } = await this.supabase.client
      .from('nfc_touchpoints')
      .delete()
      .eq('id', id);

    if (error) {
      this.error.set(error.message);
      return false;
    }

    this.touchpoints.update((list) => list.filter((t) => t.id !== id));
    return true;
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private extractUriFromNdef(event: Record<string, unknown>): string | null {
    try {
      const tag = event['nfcTag'] as Record<string, unknown> | undefined;
      const message = tag?.['message'] as Record<string, unknown> | undefined;
      const records = message?.['records'] as Array<Record<string, unknown>> | undefined;
      if (!records?.length) return null;

      const uriRecord = records.find((r) => r['recordType'] === 'url' || r['recordType'] === 'uri');
      if (!uriRecord) return null;

      return uriRecord['data'] as string ?? null;
    } catch {
      return null;
    }
  }

  private async logScan(uri: string): Promise<void> {
    const user = this.authService.user();
    if (!user) return;

    // Look up the touchpoint id from the URI
    const { data } = await this.supabase.client
      .from('nfc_touchpoints')
      .select('id')
      .eq('deep_link_uri', uri)
      .maybeSingle();

    if (!data) return;

    const platform = Capacitor.getPlatform() as 'ios' | 'android' | 'web';
    await this.supabase.client.from('nfc_scan_logs').insert({
      touchpoint_id: data.id,
      user_id: user.id,
      platform,
    });
  }
}
