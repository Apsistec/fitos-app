import { Injectable, inject, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface ProgressPhoto {
  id: string;
  client_id: string;
  trainer_id: string | null;
  photo_url: string;
  thumbnail_url: string;
  taken_at: string;
  notes: string | null;
  pair_id: string | null;
  visibility: 'private' | 'shared_with_trainer';
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class ProgressPhotoService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // ─── Signals ──────────────────────────────────────────────────────────────
  photos = signal<ProgressPhoto[]>([]);
  isLoading = signal(false);
  hasMore = signal(true);
  error = signal<string | null>(null);
  isUploading = signal(false);

  private _offset = 0;
  private _clientId = '';
  private readonly _pageSize = 18; // divisible by 3 for 3-column grid

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Load the first page of photos for a client. Resets all state. */
  async load(clientId: string): Promise<void> {
    this._clientId = clientId;
    this._offset = 0;
    this.photos.set([]);
    this.hasMore.set(true);
    this.error.set(null);
    await this._fetchPage();
  }

  /** Append the next page (called by infinite scroll). */
  async loadMore(): Promise<void> {
    if (!this.hasMore() || this.isLoading()) return;
    this._offset += this._pageSize;
    await this._fetchPage();
  }

  /**
   * Prompts the user to take or select a photo, compresses, uploads to
   * Supabase Storage, and inserts a DB record. Returns the new photo or null.
   */
  async captureAndUpload(notes?: string): Promise<ProgressPhoto | null> {
    const userId = this.auth.user()?.id;
    if (!userId) return null;

    try {
      // ── 1. Acquire image via Capacitor Camera ──────────────────────────
      const photo = await Camera.getPhoto({
        quality: 85,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Prompt,
      });

      if (!photo.base64String) return null;

      this.isUploading.set(true);

      // ── 2. Upload full-size image ──────────────────────────────────────
      const timestamp = Date.now();
      const ext = photo.format ?? 'jpeg';
      const fullPath = `${userId}/${timestamp}_full.${ext}`;
      const thumbPath = `${userId}/${timestamp}_thumb.${ext}`;
      const mimeType = `image/${ext}`;

      const bytes = this._base64ToUint8Array(photo.base64String);

      const { error: upFullErr } = await this.supabase.client.storage
        .from('progress-photos')
        .upload(fullPath, bytes, { contentType: mimeType, upsert: false });

      if (upFullErr) {
        this.error.set(`Upload failed: ${upFullErr.message}`);
        return null;
      }

      // ── 3. Upload thumbnail (same bytes; display CSS handles sizing) ───
      // Production enhancement: resize on Edge Function to save bandwidth.
      await this.supabase.client.storage
        .from('progress-photos')
        .upload(thumbPath, bytes, { contentType: mimeType, upsert: false });

      // ── 4. Get signed public URLs ──────────────────────────────────────
      const { data: fullUrlData } = this.supabase.client.storage
        .from('progress-photos')
        .getPublicUrl(fullPath);

      const { data: thumbUrlData } = this.supabase.client.storage
        .from('progress-photos')
        .getPublicUrl(thumbPath);

      // ── 5. Insert DB record ────────────────────────────────────────────
      const { data: record, error: dbErr } = await this.supabase.client
        .from('progress_photos')
        .insert({
          client_id: userId,
          trainer_id: null, // self-taken; trainer_id populated on check-in request
          photo_url: fullUrlData.publicUrl,
          thumbnail_url: thumbUrlData.publicUrl,
          notes: notes ?? null,
          visibility: 'shared_with_trainer',
        })
        .select()
        .single();

      if (dbErr) {
        this.error.set(`Database error: ${dbErr.message}`);
        return null;
      }

      const newPhoto = record as ProgressPhoto;
      // Prepend so newest appears first
      this.photos.update((prev) => [newPhoto, ...prev]);
      return newPhoto;

    } catch (err) {
      // User cancelled camera — not a real error
      const msg = (err as Error).message ?? '';
      if (!msg.includes('cancel') && !msg.includes('denied')) {
        this.error.set(msg);
      }
      return null;
    } finally {
      this.isUploading.set(false);
    }
  }

  /** Delete a photo from storage and DB. */
  async deletePhoto(photo: ProgressPhoto): Promise<boolean> {
    // Delete storage files
    const userId = this.auth.user()?.id;
    if (userId) {
      const fullName = this._storagePathFromUrl(photo.photo_url);
      const thumbName = this._storagePathFromUrl(photo.thumbnail_url);
      await this.supabase.client.storage
        .from('progress-photos')
        .remove([fullName, thumbName].filter(Boolean) as string[]);
    }

    // Delete DB record
    const { error } = await this.supabase.client
      .from('progress_photos')
      .delete()
      .eq('id', photo.id);

    if (error) {
      this.error.set(error.message);
      return false;
    }

    this.photos.update((prev) => prev.filter((p) => p.id !== photo.id));
    return true;
  }

  /**
   * Mark two photos as a before/after comparison pair.
   * Both photos get the same pair_id.
   */
  async linkAsPair(photoA: ProgressPhoto, photoB: ProgressPhoto): Promise<void> {
    const pairId = photoA.pair_id ?? crypto.randomUUID();

    await this.supabase.client
      .from('progress_photos')
      .update({ pair_id: pairId })
      .in('id', [photoA.id, photoB.id]);

    this.photos.update((prev) =>
      prev.map((p) =>
        p.id === photoA.id || p.id === photoB.id ? { ...p, pair_id: pairId } : p
      )
    );
  }

  /**
   * Trainer sends a push notification asking a client to submit a progress photo.
   */
  async requestCheckin(clientId: string, clientName: string): Promise<void> {
    await this.supabase.client.from('notifications').insert({
      user_id: clientId,
      title: 'Progress Photo Check-In',
      body: `Your trainer is requesting a progress photo update. Tap to take a photo now.`,
      type: 'photo_checkin_request',
      data: { client_name: clientName },
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async _fetchPage(): Promise<void> {
    this.isLoading.set(true);
    try {
      const { data, error } = await this.supabase.client
        .from('progress_photos')
        .select('*')
        .eq('client_id', this._clientId)
        .order('taken_at', { ascending: false })
        .range(this._offset, this._offset + this._pageSize - 1);

      if (error) {
        this.error.set(error.message);
        return;
      }

      const rows = (data ?? []) as ProgressPhoto[];
      if (rows.length < this._pageSize) this.hasMore.set(false);
      this.photos.update((prev) => [...prev, ...rows]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private _base64ToUint8Array(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /** Extract the storage object path from a public URL. */
  private _storagePathFromUrl(url: string): string {
    // URL format: .../storage/v1/object/public/progress-photos/<path>
    const match = url.match(/progress-photos\/(.+)$/);
    return match ? match[1] : '';
  }
}
