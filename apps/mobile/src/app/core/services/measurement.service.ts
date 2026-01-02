import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import type { Tables } from '@fitos/shared';

export interface MeasurementWithChart {
  measurements: Tables<'measurements'>[];
  chartData: {
    dates: string[];
    weights: number[];
  };
}

export interface ProgressPhoto extends Tables<'progress_photos'> {
  url?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MeasurementService {
  private supabase = inject(SupabaseService);
  private auth = inject(AuthService);

  // State signals
  measurementsSignal = signal<Tables<'measurements'>[]>([]);
  photosSignal = signal<ProgressPhoto[]>([]);
  isLoadingSignal = signal(false);
  errorSignal = signal<string | null>(null);

  /**
   * Get all measurements for a client
   */
  async getMeasurements(clientId: string): Promise<Tables<'measurements'>[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const { data, error } = await this.supabase
        .from('measurements')
        .select('*')
        .eq('client_id', clientId)
        .order('measured_at', { ascending: false });

      if (error) throw error;

      this.measurementsSignal.set(data || []);
      return data || [];
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load measurements';
      this.errorSignal.set(message);
      console.error('Error fetching measurements:', error);
      return [];
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Get measurement data formatted for charts
   */
  async getMeasurementChartData(clientId: string): Promise<MeasurementWithChart> {
    const measurements = await this.getMeasurements(clientId);

    // Sort by date (oldest first) for chart
    const sorted = [...measurements].reverse();

    const chartData = {
      dates: sorted.map(m => new Date(m.measured_at).toLocaleDateString()),
      weights: sorted.map(m => m.weight_kg || 0),
    };

    return {
      measurements,
      chartData,
    };
  }

  /**
   * Log a new measurement
   */
  async logMeasurement(measurement: {
    client_id: string;
    weight_kg?: number;
    body_fat_percent?: number;
    chest_cm?: number;
    waist_cm?: number;
    hips_cm?: number;
    thigh_cm?: number;
    arm_cm?: number;
    notes?: string;
  }): Promise<Tables<'measurements'> | null> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const { data, error } = await this.supabase
        .from('measurements')
        .insert({
          ...measurement,
          measured_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      this.measurementsSignal.update(m => [data, ...m]);

      return data;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save measurement';
      this.errorSignal.set(message);
      console.error('Error saving measurement:', error);
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Update an existing measurement
   */
  async updateMeasurement(
    id: string,
    updates: Partial<Tables<'measurements'>>
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('measurements')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Update local state
      this.measurementsSignal.update(measurements =>
        measurements.map(m => (m.id === id ? { ...m, ...updates } : m))
      );

      return true;
    } catch (error) {
      console.error('Error updating measurement:', error);
      return false;
    }
  }

  /**
   * Delete a measurement
   */
  async deleteMeasurement(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('measurements')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      this.measurementsSignal.update(measurements =>
        measurements.filter(m => m.id !== id)
      );

      return true;
    } catch (error) {
      console.error('Error deleting measurement:', error);
      return false;
    }
  }

  /**
   * Get progress photos for a client
   */
  async getProgressPhotos(clientId: string): Promise<ProgressPhoto[]> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      const { data, error } = await this.supabase
        .from('progress_photos')
        .select('*')
        .eq('client_id', clientId)
        .order('taken_at', { ascending: false });

      if (error) throw error;

      // Generate signed URLs for photos
      const photosWithUrls = await Promise.all(
        (data || []).map(async (photo) => {
          if (photo.storage_path) {
            const { data: urlData } = await this.supabase
              .storage
              .from('progress-photos')
              .createSignedUrl(photo.storage_path, 3600); // 1 hour expiry

            return {
              ...photo,
              url: urlData?.signedUrl,
            };
          }
          return photo;
        })
      );

      this.photosSignal.set(photosWithUrls);
      return photosWithUrls;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load photos';
      this.errorSignal.set(message);
      console.error('Error fetching progress photos:', error);
      return [];
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Upload a progress photo
   */
  async uploadProgressPhoto(
    clientId: string,
    file: File,
    notes?: string
  ): Promise<ProgressPhoto | null> {
    try {
      this.isLoadingSignal.set(true);
      this.errorSignal.set(null);

      // Generate unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${clientId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await this.supabase
        .storage
        .from('progress-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Save photo record to database
      const { data: photoData, error: photoError } = await this.supabase
        .from('progress_photos')
        .insert({
          client_id: clientId,
          storage_path: uploadData.path,
          notes: notes || null,
          taken_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (photoError) throw photoError;

      // Generate signed URL
      const { data: urlData } = await this.supabase
        .storage
        .from('progress-photos')
        .createSignedUrl(uploadData.path, 3600);

      const photoWithUrl = {
        ...photoData,
        url: urlData?.signedUrl,
      };

      // Update local state
      this.photosSignal.update(photos => [photoWithUrl, ...photos]);

      return photoWithUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to upload photo';
      this.errorSignal.set(message);
      console.error('Error uploading progress photo:', error);
      return null;
    } finally {
      this.isLoadingSignal.set(false);
    }
  }

  /**
   * Delete a progress photo
   */
  async deleteProgressPhoto(id: string, storagePath: string): Promise<boolean> {
    try {
      // Delete from storage
      const { error: storageError } = await this.supabase
        .storage
        .from('progress-photos')
        .remove([storagePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await this.supabase
        .from('progress_photos')
        .delete()
        .eq('id', id);

      if (dbError) throw dbError;

      // Update local state
      this.photosSignal.update(photos => photos.filter(p => p.id !== id));

      return true;
    } catch (error) {
      console.error('Error deleting progress photo:', error);
      return false;
    }
  }

  /**
   * Clear service state
   */
  clearState(): void {
    this.measurementsSignal.set([]);
    this.photosSignal.set([]);
    this.errorSignal.set(null);
    this.isLoadingSignal.set(false);
  }
}
