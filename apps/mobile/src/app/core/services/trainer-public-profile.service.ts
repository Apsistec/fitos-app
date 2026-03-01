import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Certification {
  name: string;
  issuer: string;
  year: number;
}

export interface TrainerPublicProfile {
  id: string;
  trainer_id: string;
  username: string;
  bio: string | null;
  specialty_tags: string[];
  hero_photo_url: string | null;
  years_experience: number | null;
  certifications: Certification[];
  is_accepting_clients: boolean;
  intro_session_price_cents: number | null;
  booking_url_override: string | null;
  display_name?: string;
  avatar_url?: string | null;
  trainer_email?: string;
  created_at: string;
  updated_at: string;
}

export interface TrainerReview {
  id: string;
  trainer_id: string;
  client_id: string | null;
  rating: number;
  text: string | null;
  is_public: boolean;
  is_featured: boolean;
  session_id: string | null;
  created_at: string;
  reviewer?: string;
}

export interface PublicProfileData extends TrainerPublicProfile {
  reviews: TrainerReview[];
  avg_rating: number | null;
  review_count: number;
}

export interface UpsertProfileDto {
  username: string;
  bio?: string | null;
  specialty_tags?: string[];
  hero_photo_url?: string | null;
  years_experience?: number | null;
  certifications?: Certification[];
  is_accepting_clients?: boolean;
  intro_session_price_cents?: number | null;
  booking_url_override?: string | null;
}

export interface SubmitReviewDto {
  trainer_id: string;
  rating: number;
  text?: string | null;
  session_id?: string | null;
}

// ─── Specialty tag presets ────────────────────────────────────────────────────

export const SPECIALTY_TAGS = [
  'Weight Loss',
  'Muscle Building',
  'Strength Training',
  'HIIT',
  'Yoga',
  'Pilates',
  'Athletic Performance',
  'Rehabilitation',
  'Senior Fitness',
  'Prenatal Fitness',
  'Postpartum Recovery',
  'Nutrition Coaching',
  'Bodybuilding',
  'Powerlifting',
  'CrossFit',
  'Cardio',
  'Flexibility',
  'Functional Fitness',
  'Online Coaching',
  'Group Training',
] as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class TrainerPublicProfileService {
  private supabase = inject(SupabaseService).client;

  // ── Trainer signals ─────────────────────────────────────────────────────────
  myProfile  = signal<TrainerPublicProfile | null>(null);
  myReviews  = signal<TrainerReview[]>([]);
  isLoading  = signal(false);
  error      = signal<string | null>(null);

  // ── Trainer: read own profile ───────────────────────────────────────────────

  async getMyProfile(): Promise<TrainerPublicProfile | null> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase
      .from('trainer_public_profiles')
      .select('*')
      .single();

    this.isLoading.set(false);

    if (error && error.code !== 'PGRST116') {   // PGRST116 = no rows
      this.error.set(error.message);
      return null;
    }

    const profile = data as TrainerPublicProfile | null;
    this.myProfile.set(profile);
    return profile;
  }

  // ── Trainer: upsert own profile ─────────────────────────────────────────────

  async saveProfile(dto: UpsertProfileDto): Promise<TrainerPublicProfile | null> {
    this.isLoading.set(true);
    this.error.set(null);

    const { data, error } = await this.supabase.rpc('upsert_trainer_public_profile', {
      p_username:                   dto.username.toLowerCase().trim(),
      p_bio:                        dto.bio ?? null,
      p_specialty_tags:             dto.specialty_tags ?? [],
      p_hero_photo_url:             dto.hero_photo_url ?? null,
      p_years_experience:           dto.years_experience ?? null,
      p_certifications:             dto.certifications ?? [],
      p_is_accepting_clients:       dto.is_accepting_clients ?? true,
      p_intro_session_price_cents:  dto.intro_session_price_cents ?? null,
      p_booking_url_override:       dto.booking_url_override ?? null,
    });

    this.isLoading.set(false);

    if (error) {
      this.error.set(
        error.message.includes('unique')
          ? 'That username is already taken. Please choose another.'
          : error.message
      );
      return null;
    }

    const saved = data as TrainerPublicProfile;
    this.myProfile.set(saved);
    return saved;
  }

  // ── Public: fetch any trainer profile by username (SSR-safe) ───────────────
  // This is also called from the mobile app to preview one's own profile URL.

  async getProfileByUsername(username: string): Promise<PublicProfileData | null> {
    const { data, error } = await this.supabase.rpc('get_trainer_public_profile', {
      p_username: username.toLowerCase(),
    });

    if (error || !data) return null;
    return data as PublicProfileData;
  }

  // ── Trainer: list own reviews ───────────────────────────────────────────────

  async getMyReviews(): Promise<TrainerReview[]> {
    this.isLoading.set(true);

    const { data, error } = await this.supabase
      .from('trainer_reviews')
      .select('*, profiles!client_id(full_name)')
      .order('created_at', { ascending: false });

    this.isLoading.set(false);

    if (error) {
      this.error.set(error.message);
      return [];
    }

    const reviews = (data ?? []).map((r: Record<string, unknown>) => ({
      ...r,
      reviewer: (r['profiles'] as { full_name: string } | null)?.full_name ?? 'Anonymous',
    })) as TrainerReview[];

    this.myReviews.set(reviews);
    return reviews;
  }

  // ── Trainer: pin/unpin a review ─────────────────────────────────────────────
  // Max 3 featured reviews enforced here.

  async setFeatured(reviewId: string, featured: boolean): Promise<boolean> {
    // Guard: max 3 featured
    if (featured) {
      const currentFeatured = this.myReviews().filter((r) => r.is_featured).length;
      if (currentFeatured >= 3) {
        this.error.set('You can only pin up to 3 featured reviews.');
        return false;
      }
    }

    // Optimistic update
    this.myReviews.update((reviews) =>
      reviews.map((r) => (r.id === reviewId ? { ...r, is_featured: featured } : r))
    );

    const { error } = await this.supabase
      .from('trainer_reviews')
      .update({ is_featured: featured })
      .eq('id', reviewId);

    if (error) {
      this.error.set(error.message);
      // Revert
      this.myReviews.update((reviews) =>
        reviews.map((r) => (r.id === reviewId ? { ...r, is_featured: !featured } : r))
      );
      return false;
    }
    return true;
  }

  // ── Trainer: set review public/private ──────────────────────────────────────

  async setPublic(reviewId: string, isPublic: boolean): Promise<boolean> {
    // Optimistic
    this.myReviews.update((reviews) =>
      reviews.map((r) => (r.id === reviewId ? { ...r, is_public: isPublic } : r))
    );

    const { error } = await this.supabase
      .from('trainer_reviews')
      .update({ is_public: isPublic })
      .eq('id', reviewId);

    if (error) {
      this.error.set(error.message);
      this.myReviews.update((reviews) =>
        reviews.map((r) => (r.id === reviewId ? { ...r, is_public: !isPublic } : r))
      );
      return false;
    }
    return true;
  }

  // ── Client: submit a review ─────────────────────────────────────────────────

  async submitReview(dto: SubmitReviewDto): Promise<boolean> {
    const { error } = await this.supabase.from('trainer_reviews').insert({
      trainer_id: dto.trainer_id,
      rating:     dto.rating,
      text:       dto.text ?? null,
      session_id: dto.session_id ?? null,
      is_public:  false,   // starts private; trainer approves
      is_featured: false,
    });

    if (error) {
      this.error.set(error.message);
      return false;
    }
    return true;
  }

  // ── Username availability check ─────────────────────────────────────────────

  async isUsernameAvailable(username: string): Promise<boolean> {
    const { data } = await this.supabase
      .from('trainer_public_profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .maybeSingle();
    return !data;   // true if no row found (available)
  }

  // ── Helper ──────────────────────────────────────────────────────────────────

  publicProfileUrl(username: string): string {
    return `https://www.nutrifitos.com/t/${username}`;
  }
}
