import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * Video submission types
 */
export type VideoStatus = 'pending' | 'reviewed' | 'archived';
export type AnnotationType = 'marker' | 'drawing' | 'comment' | 'correction';
export type CorrectionType =
  | 'knee_valgus'
  | 'hip_hinge'
  | 'bar_path'
  | 'depth'
  | 'tempo'
  | 'foot_position'
  | 'grip_width'
  | 'elbow_flare'
  | 'lower_back_arch'
  | 'head_position'
  | 'breathing'
  | 'bracing'
  | 'other';

export interface DrawingData {
  type: 'arrow' | 'circle' | 'line' | 'rectangle';
  points: number[]; // [x1, y1, x2, y2, ...] coordinates
  color: string; // Hex color
  thickness?: number;
}

export interface VideoSubmission {
  id: string;
  client_id: string;
  trainer_id: string;
  exercise_id?: string;
  exercise_name?: string;
  storage_path: string;
  thumbnail_path?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  status: VideoStatus;
  client_notes?: string;
  submitted_at: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoAnnotation {
  id: string;
  video_id: string;
  trainer_id: string;
  timestamp_seconds: number;
  annotation_type: AnnotationType;
  drawing_data?: DrawingData;
  text_comment?: string;
  correction_type?: CorrectionType;
  created_at: string;
}

export interface CorrectionTemplate {
  id: string;
  trainer_id: string;
  correction_type: string;
  title: string;
  description: string;
  drawing_template?: DrawingData;
  use_count: number;
  last_used_at?: string;
  created_at: string;
}

export interface CreateVideoSubmissionInput {
  client_id: string;
  trainer_id: string;
  exercise_id?: string;
  exercise_name?: string;
  storage_path: string;
  thumbnail_path?: string;
  duration_seconds?: number;
  file_size_bytes?: number;
  client_notes?: string;
}

export interface CreateAnnotationInput {
  video_id: string;
  timestamp_seconds: number;
  annotation_type: AnnotationType;
  drawing_data?: DrawingData;
  text_comment?: string;
  correction_type?: CorrectionType;
}

/**
 * VideoFeedbackService - Manage form check video submissions and annotations
 *
 * Features:
 * - Video upload and storage management
 * - Trainer annotation tools (markers, drawings, comments)
 * - Correction templates for common form issues
 * - Timeline-based feedback
 * - Status tracking (pending/reviewed/archived)
 *
 * Storage:
 * - Videos stored in 'form-check-videos' bucket (private)
 * - Thumbnails stored in 'video-thumbnails' bucket (public)
 */
@Injectable({
  providedIn: 'root',
})
export class VideoFeedbackService {
  private supabase = inject(SupabaseService);

  // State
  submissions = signal<VideoSubmission[]>([]);
  annotations = signal<VideoAnnotation[]>([]);
  templates = signal<CorrectionTemplate[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  /**
   * Get video submissions for a trainer
   */
  async getTrainerSubmissions(
    trainerId: string,
    status?: VideoStatus
  ): Promise<VideoSubmission[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      let query = this.supabase.client
        .from('video_submissions')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('submitted_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      this.submissions.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load submissions';
      this.error.set(errorMessage);
      console.error('Error getting trainer submissions:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get video submissions for a client
   */
  async getClientSubmissions(clientId: string): Promise<VideoSubmission[]> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('video_submissions')
        .select('*')
        .eq('client_id', clientId)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      this.submissions.set(data || []);
      return data || [];
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to load submissions';
      this.error.set(errorMessage);
      console.error('Error getting client submissions:', err);
      return [];
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Get single video submission
   */
  async getSubmission(videoId: string): Promise<VideoSubmission | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('video_submissions')
        .select('*')
        .eq('id', videoId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return data;
    } catch (err) {
      console.error('Error getting submission:', err);
      return null;
    }
  }

  /**
   * Create video submission
   */
  async createSubmission(
    input: CreateVideoSubmissionInput
  ): Promise<VideoSubmission | null> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const { data, error } = await this.supabase.client
        .from('video_submissions')
        .insert(input)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const current = this.submissions();
      this.submissions.set([data, ...current]);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to create submission';
      this.error.set(errorMessage);
      console.error('Error creating submission:', err);
      return null;
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Update video submission status
   */
  async updateSubmissionStatus(
    videoId: string,
    status: VideoStatus
  ): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('video_submissions')
        .update({ status })
        .eq('id', videoId);

      if (error) throw error;

      // Update local state
      const current = this.submissions();
      const updated = current.map((s) =>
        s.id === videoId ? { ...s, status } : s
      );
      this.submissions.set(updated);

      return true;
    } catch (err) {
      console.error('Error updating submission status:', err);
      return false;
    }
  }

  /**
   * Get annotations for a video
   */
  async getVideoAnnotations(videoId: string): Promise<VideoAnnotation[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('video_annotations')
        .select('*')
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true });

      if (error) throw error;

      this.annotations.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting video annotations:', err);
      return [];
    }
  }

  /**
   * Create annotation
   */
  async createAnnotation(
    trainerId: string,
    input: CreateAnnotationInput
  ): Promise<VideoAnnotation | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('video_annotations')
        .insert({
          ...input,
          trainer_id: trainerId,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const current = this.annotations();
      this.annotations.set([...current, data].sort((a, b) =>
        a.timestamp_seconds - b.timestamp_seconds
      ));

      return data;
    } catch (err) {
      console.error('Error creating annotation:', err);
      return null;
    }
  }

  /**
   * Delete annotation
   */
  async deleteAnnotation(annotationId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('video_annotations')
        .delete()
        .eq('id', annotationId);

      if (error) throw error;

      // Update local state
      const current = this.annotations();
      this.annotations.set(current.filter((a) => a.id !== annotationId));

      return true;
    } catch (err) {
      console.error('Error deleting annotation:', err);
      return false;
    }
  }

  /**
   * Get correction templates for a trainer
   */
  async getTrainerTemplates(trainerId: string): Promise<CorrectionTemplate[]> {
    try {
      const { data, error } = await this.supabase.client
        .from('correction_templates')
        .select('*')
        .eq('trainer_id', trainerId)
        .order('use_count', { ascending: false });

      if (error) throw error;

      this.templates.set(data || []);
      return data || [];
    } catch (err) {
      console.error('Error getting correction templates:', err);
      return [];
    }
  }

  /**
   * Create correction template
   */
  async createTemplate(
    trainerId: string,
    correctionType: string,
    title: string,
    description: string,
    drawingTemplate?: DrawingData
  ): Promise<CorrectionTemplate | null> {
    try {
      const { data, error } = await this.supabase.client
        .from('correction_templates')
        .insert({
          trainer_id: trainerId,
          correction_type: correctionType,
          title,
          description,
          drawing_template: drawingTemplate,
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const current = this.templates();
      this.templates.set([data, ...current]);

      return data;
    } catch (err) {
      console.error('Error creating template:', err);
      return null;
    }
  }

  /**
   * Upload video to storage
   */
  async uploadVideo(
    file: File,
    clientId: string,
    _exerciseId?: string
  ): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const fileName = `${clientId}/${timestamp}_${file.name}`;

      const { data, error } = await this.supabase.client.storage
        .from('form-check-videos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      return data.path;
    } catch (err) {
      console.error('Error uploading video:', err);
      return null;
    }
  }

  /**
   * Get signed URL for video
   */
  async getVideoUrl(storagePath: string): Promise<string | null> {
    try {
      const { data, error } = await this.supabase.client.storage
        .from('form-check-videos')
        .createSignedUrl(storagePath, 3600); // 1 hour expiry

      if (error) throw error;

      return data.signedUrl;
    } catch (err) {
      console.error('Error getting video URL:', err);
      return null;
    }
  }

  /**
   * Delete video from storage
   */
  async deleteVideo(storagePath: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client.storage
        .from('form-check-videos')
        .remove([storagePath]);

      if (error) throw error;

      return true;
    } catch (err) {
      console.error('Error deleting video:', err);
      return false;
    }
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error.set(null);
  }
}
