/**
 * Sprint 67 — Trainer Public Profile SSR Page
 *
 * Route:   /t/:username   (nutrifitos.com/t/johndoe)
 * Render:  RenderMode.Server  (dynamic per-username SSR, not pre-rendered)
 * SEO:     Open Graph + JSON-LD structured data; Title + Meta tags set server-side
 *
 * Data flow:
 *   1. ActivatedRoute param → username signal
 *   2. resource() fetches Supabase RPC `get_trainer_public_profile` via REST
 *   3. Page renders with real content on first byte (no JS hydration needed for SEO)
 */
import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  PLATFORM_ID,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

// ─── Inline types (landing app avoids importing from mobile services) ─────────

interface Certification {
  name: string;
  issuer: string;
  year: number;
}

interface TrainerReview {
  id: string;
  rating: number;
  text: string | null;
  is_featured: boolean;
  created_at: string;
  reviewer: string;
}

interface PublicProfileData {
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
  display_name: string;
  avatar_url: string | null;
  reviews: TrainerReview[];
  avg_rating: number | null;
  review_count: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-trainer-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, HttpClientModule],
  template: `
    @if (isLoading()) {
      <div class="profile-loading">
        <div class="loading-spinner"></div>
      </div>
    }

    @if (!isLoading() && !profile()) {
      <div class="not-found">
        <h1>Trainer Not Found</h1>
        <p>No trainer profile exists at this URL.</p>
        <a href="/" class="back-link">← Back to FitOS</a>
      </div>
    }

    @if (!isLoading() && profile(); as p) {
      <!-- ── JSON-LD structured data for Google ─────────────────────────────── -->
      <!-- Injected server-side via Meta service -->

      <!-- ── Hero ─────────────────────────────────────────────────────────── -->
      <section class="hero-section">
        <div class="hero-inner">
          <div class="hero-avatar">
            @if (p.hero_photo_url) {
              <img [src]="p.hero_photo_url" [alt]="p.display_name" class="avatar-img" />
            } @else {
              <div class="avatar-initials">{{ initials(p.display_name) }}</div>
            }
          </div>

          <div class="hero-content">
            <h1 class="trainer-name">{{ p.display_name }}</h1>

            @if (p.avg_rating) {
              <div class="rating-row">
                <div class="stars" [attr.aria-label]="p.avg_rating + ' out of 5 stars'">
                  @for (_ of starsArray(p.avg_rating); track $index) {
                    <span class="star filled">★</span>
                  }
                  @for (_ of emptyStarsArray(p.avg_rating); track $index) {
                    <span class="star">★</span>
                  }
                </div>
                <span class="rating-label">{{ p.avg_rating | number:'1.1-1' }} ({{ p.review_count }} review{{ p.review_count === 1 ? '' : 's' }})</span>
              </div>
            }

            @if (p.specialty_tags.length > 0) {
              <div class="tags-row">
                @for (tag of p.specialty_tags; track tag) {
                  <span class="tag">{{ tag }}</span>
                }
              </div>
            }

            <div class="hero-meta">
              @if (p.years_experience) {
                <span class="meta-item">{{ p.years_experience }}+ years experience</span>
              }
              @if (p.certifications.length > 0) {
                <span class="meta-item">{{ p.certifications.length }} certification{{ p.certifications.length === 1 ? '' : 's' }}</span>
              }
            </div>

            <div class="hero-ctas">
              @if (p.is_accepting_clients) {
                <a [href]="bookingHref(p)" class="btn-primary">
                  Book a Free Consultation
                  @if (p.intro_session_price_cents === 0 || p.intro_session_price_cents === null) {
                    <span class="cta-sub">No commitment required</span>
                  }
                </a>
              } @else {
                <div class="not-accepting">
                  <span>Currently not accepting new clients</span>
                </div>
              }
              <a href="https://www.nutrifitos.app" class="btn-secondary">Download FitOS App</a>
            </div>
          </div>
        </div>
      </section>

      <!-- ── About ─────────────────────────────────────────────────────────── -->
      @if (p.bio) {
        <section class="content-section">
          <div class="section-inner">
            <h2 class="section-title">About {{ firstName(p.display_name) }}</h2>
            <p class="bio-text">{{ p.bio }}</p>
          </div>
        </section>
      }

      <!-- ── Certifications ─────────────────────────────────────────────────── -->
      @if (p.certifications.length > 0) {
        <section class="content-section alt-bg">
          <div class="section-inner">
            <h2 class="section-title">Certifications & Education</h2>
            <div class="certs-grid">
              @for (cert of p.certifications; track cert.name) {
                <div class="cert-card">
                  <div class="cert-icon">🎓</div>
                  <div class="cert-info">
                    <div class="cert-name">{{ cert.name }}</div>
                    <div class="cert-meta">{{ cert.issuer }}@if (cert.year) { · {{ cert.year }} }</div>
                  </div>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- ── Reviews ───────────────────────────────────────────────────────── -->
      @if (p.reviews.length > 0) {
        <section class="content-section">
          <div class="section-inner">
            <h2 class="section-title">Client Reviews</h2>

            <!-- Featured reviews first -->
            @if (featuredReviews(p.reviews).length > 0) {
              <div class="featured-reviews">
                @for (r of featuredReviews(p.reviews); track r.id) {
                  <div class="review-card featured">
                    <div class="review-stars">
                      @for (_ of starsArray(r.rating); track $index) { <span class="star filled">★</span> }
                    </div>
                    @if (r.text) {
                      <blockquote class="review-text">"{{ r.text }}"</blockquote>
                    }
                    <div class="review-author">— {{ r.reviewer }}</div>
                    <div class="featured-badge">⭐ Featured Review</div>
                  </div>
                }
              </div>
            }

            <!-- All public reviews -->
            <div class="reviews-list">
              @for (r of regularReviews(p.reviews); track r.id) {
                <div class="review-row">
                  <div class="review-row-stars">
                    @for (_ of starsArray(r.rating); track $index) { <span class="star-sm filled">★</span> }
                    @for (_ of emptyStarsArray(r.rating); track $index) { <span class="star-sm">★</span> }
                  </div>
                  @if (r.text) {
                    <p class="review-row-text">{{ r.text }}</p>
                  }
                  <div class="review-row-meta">{{ r.reviewer }} · {{ r.created_at | date:'MMMM yyyy' }}</div>
                </div>
              }
            </div>
          </div>
        </section>
      }

      <!-- ── Final CTA ─────────────────────────────────────────────────────── -->
      <section class="cta-section">
        <div class="section-inner">
          <h2>Ready to start your fitness journey?</h2>
          <p>Work with {{ firstName(p.display_name) }} and get a personalized training plan powered by FitOS.</p>
          @if (p.is_accepting_clients) {
            <a [href]="bookingHref(p)" class="btn-primary large">
              Book with {{ firstName(p.display_name) }}
            </a>
          }
          <div class="powered-by">
            <a href="https://www.nutrifitos.com" class="powered-link">
              Powered by <strong>FitOS</strong> — The AI Fitness Coach Platform
            </a>
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    /* ── Globals ──── */
    :host {
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0D0D0D;
      color: #F5F5F5;
      min-height: 100vh;
    }

    /* ── Loading ──── */
    .profile-loading {
      display: flex; align-items: center; justify-content: center;
      min-height: 60vh;
    }
    .loading-spinner {
      width: 40px; height: 40px;
      border: 3px solid rgba(16,185,129,0.2);
      border-top-color: #10B981;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── Not found ── */
    .not-found {
      text-align: center; padding: 80px 24px;
    }
    .not-found h1 { font-size: 28px; font-weight: 800; margin-bottom: 12px; }
    .not-found p  { color: #A3A3A3; margin-bottom: 24px; }
    .back-link { color: #10B981; text-decoration: none; font-weight: 600; }

    /* ── Hero ───── */
    .hero-section {
      background: linear-gradient(135deg, #0D0D0D 0%, #111827 100%);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      padding: 60px 24px;
    }
    .hero-inner {
      max-width: 860px; margin: 0 auto;
      display: flex; gap: 40px; align-items: flex-start;
      flex-wrap: wrap;
    }

    .hero-avatar { flex-shrink: 0; }
    .avatar-img {
      width: 140px; height: 140px; border-radius: 50%;
      object-fit: cover;
      border: 3px solid #10B981;
    }
    .avatar-initials {
      width: 140px; height: 140px; border-radius: 50%;
      background: linear-gradient(135deg, #10B981, #059669);
      display: flex; align-items: center; justify-content: center;
      font-size: 48px; font-weight: 900; color: white;
    }

    .hero-content { flex: 1; min-width: 0; }
    .trainer-name { font-size: 36px; font-weight: 900; margin: 0 0 12px; }

    .rating-row {
      display: flex; align-items: center; gap: 8px; margin-bottom: 12px;
    }
    .stars { display: flex; gap: 2px; }
    .star { font-size: 20px; color: rgba(255,255,255,0.2); }
    .star.filled { color: #F59E0B; }
    .rating-label { font-size: 14px; color: #A3A3A3; }

    .tags-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
    .tag {
      background: rgba(16,185,129,0.1); color: #10B981;
      border: 1px solid rgba(16,185,129,0.25);
      border-radius: 20px; padding: 4px 14px;
      font-size: 13px; font-weight: 600;
    }

    .hero-meta { display: flex; gap: 16px; flex-wrap: wrap; margin-bottom: 24px; }
    .meta-item { font-size: 14px; color: #A3A3A3; }
    .meta-item::before { content: '·'; margin-right: 8px; color: #4B5563; }
    .meta-item:first-child::before { display: none; }

    .hero-ctas { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }

    .btn-primary {
      display: inline-flex; flex-direction: column; align-items: center;
      background: #10B981; color: white;
      border-radius: 14px; padding: 14px 28px;
      font-size: 16px; font-weight: 800;
      text-decoration: none; cursor: pointer;
      transition: background 0.15s, transform 0.1s;
    }
    .btn-primary:hover { background: #059669; transform: translateY(-1px); }
    .btn-primary.large { padding: 18px 40px; font-size: 18px; }
    .cta-sub { font-size: 11px; font-weight: 400; opacity: 0.8; margin-top: 2px; }

    .btn-secondary {
      display: inline-block;
      background: rgba(255,255,255,0.06); color: #F5F5F5;
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 14px; padding: 14px 24px;
      font-size: 14px; font-weight: 600;
      text-decoration: none;
      transition: background 0.15s;
    }
    .btn-secondary:hover { background: rgba(255,255,255,0.1); }

    .not-accepting {
      background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px; padding: 12px 20px;
      font-size: 14px; color: #A3A3A3;
    }

    /* ── Content sections ── */
    .content-section { padding: 56px 24px; }
    .content-section.alt-bg { background: rgba(255,255,255,0.02); }
    .section-inner { max-width: 860px; margin: 0 auto; }
    .section-title {
      font-size: 26px; font-weight: 800; margin: 0 0 24px;
    }

    .bio-text {
      font-size: 16px; line-height: 1.7; color: #D1D5DB;
      white-space: pre-line; max-width: 680px;
    }

    /* ── Certs ── */
    .certs-grid { display: flex; flex-direction: column; gap: 12px; }
    .cert-card {
      display: flex; align-items: center; gap: 14px;
      background: rgba(255,255,255,0.04); border-radius: 12px;
      padding: 14px 16px; max-width: 480px;
    }
    .cert-icon { font-size: 24px; flex-shrink: 0; }
    .cert-name { font-size: 15px; font-weight: 700; }
    .cert-meta { font-size: 13px; color: #A3A3A3; margin-top: 2px; }

    /* ── Reviews ── */
    .featured-reviews { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 32px; }
    .review-card.featured {
      background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2);
      border-radius: 16px; padding: 20px;
      flex: 1; min-width: 280px; max-width: 400px;
      position: relative;
    }
    .review-stars { display: flex; gap: 3px; margin-bottom: 10px; }
    .review-text {
      font-size: 15px; line-height: 1.6; color: #D1D5DB;
      font-style: italic; margin: 0 0 12px;
    }
    .review-author { font-size: 13px; color: #A3A3A3; font-weight: 600; }
    .featured-badge {
      position: absolute; top: 14px; right: 14px;
      font-size: 11px; color: #10B981;
    }

    .reviews-list { display: flex; flex-direction: column; gap: 0; }
    .review-row {
      padding: 16px 0;
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .review-row:last-child { border-bottom: none; }
    .review-row-stars { display: flex; gap: 2px; margin-bottom: 6px; }
    .star-sm { font-size: 14px; color: rgba(255,255,255,0.2); }
    .star-sm.filled { color: #F59E0B; }
    .review-row-text {
      font-size: 14px; color: #D1D5DB; line-height: 1.6;
      margin: 0 0 6px;
    }
    .review-row-meta { font-size: 12px; color: #6B7280; }

    /* ── Final CTA ── */
    .cta-section {
      background: linear-gradient(135deg, #064E3B, #065F46);
      padding: 72px 24px; text-align: center;
    }
    .cta-section h2 { font-size: 28px; font-weight: 900; margin: 0 0 12px; }
    .cta-section p  { font-size: 16px; color: rgba(255,255,255,0.8); margin: 0 0 32px; }
    .powered-by { margin-top: 24px; }
    .powered-link {
      font-size: 13px; color: rgba(255,255,255,0.5);
      text-decoration: none;
    }
    .powered-link strong { color: rgba(255,255,255,0.8); }

    /* ── Responsive ── */
    @media (max-width: 640px) {
      .hero-inner { flex-direction: column; align-items: center; text-align: center; }
      .trainer-name { font-size: 28px; }
      .rating-row, .hero-meta, .hero-ctas { justify-content: center; }
      .tags-row { justify-content: center; }
      .review-card.featured { max-width: 100%; }
    }
  `],
})
export class TrainerProfileComponent implements OnInit {
  private route      = inject(ActivatedRoute);
  private meta       = inject(Meta);
  private titleSvc   = inject(Title);
  private http       = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);

  profile   = signal<PublicProfileData | null>(null);
  isLoading = signal(true);

  async ngOnInit(): Promise<void> {
    const username = this.route.snapshot.paramMap.get('username') ?? '';
    if (!username) {
      this.isLoading.set(false);
      return;
    }

    // Call Supabase RPC via REST (SSR-safe with HttpClient)
    const rpcUrl = `${environment.supabaseUrl}/rest/v1/rpc/get_trainer_public_profile`;

    try {
      const data = await firstValueFrom(
        this.http.post<PublicProfileData | null>(
          rpcUrl,
          { p_username: username.toLowerCase() },
          {
            headers: {
              apikey:          environment.supabaseAnonKey,
              Authorization:   `Bearer ${environment.supabaseAnonKey}`,
              'Content-Type':  'application/json',
            },
          }
        )
      );

      this.profile.set(data);
      this.setMetaTags(data, username);
    } catch {
      this.profile.set(null);
    }

    this.isLoading.set(false);
  }

  // ── SEO meta tags ──────────────────────────────────────────────────────────

  private setMetaTags(profile: PublicProfileData | null, username: string): void {
    if (!profile) {
      this.titleSvc.setTitle('Trainer Not Found | FitOS');
      return;
    }

    const name    = profile.display_name;
    const tags    = profile.specialty_tags.slice(0, 3).join(', ');
    const rating  = profile.avg_rating ? ` · ${profile.avg_rating}★` : '';
    const title   = `${name} — Personal Trainer${rating} | FitOS`;
    const desc    = profile.bio
      ? profile.bio.slice(0, 155)
      : `Train with ${name} on FitOS. ${tags ? `Specializing in ${tags}.` : ''} Book a free consultation today.`;
    const image   = profile.hero_photo_url ?? 'https://www.nutrifitos.com/assets/og-default.jpg';
    const url     = `https://www.nutrifitos.com/t/${username}`;

    this.titleSvc.setTitle(title);

    const metaTags = [
      { name: 'description',          content: desc },
      // Open Graph
      { property: 'og:type',          content: 'profile' },
      { property: 'og:title',         content: title },
      { property: 'og:description',   content: desc },
      { property: 'og:image',         content: image },
      { property: 'og:url',           content: url },
      { property: 'og:site_name',     content: 'FitOS' },
      // Twitter Card
      { name: 'twitter:card',         content: 'summary_large_image' },
      { name: 'twitter:title',        content: title },
      { name: 'twitter:description',  content: desc },
      { name: 'twitter:image',        content: image },
      // Schema hints
      { name: 'robots',               content: 'index, follow' },
    ];

    for (const tag of metaTags) {
      if ('property' in tag) {
        this.meta.updateTag({ property: tag.property, content: tag.content });
      } else {
        this.meta.updateTag({ name: tag.name, content: tag.content });
      }
    }

    // JSON-LD structured data (browser-only; SSR hydration-safe via script tag)
    if (isPlatformBrowser(this.platformId)) {
      this.injectJsonLd(profile, url, image);
    }
  }

  private injectJsonLd(profile: PublicProfileData, url: string, image: string): void {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name:        profile.display_name,
      url,
      image,
      description: profile.bio ?? undefined,
      jobTitle:    'Personal Trainer',
      worksFor: { '@type': 'Organization', name: 'FitOS' },
      ...(profile.avg_rating ? {
        aggregateRating: {
          '@type': 'AggregateRating',
          ratingValue:  profile.avg_rating,
          reviewCount:  profile.review_count,
          bestRating:   5,
          worstRating:  1,
        }
      } : {}),
    });
    document.head.appendChild(script);
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  initials(name: string): string {
    const parts = name.trim().split(' ');
    return (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  }

  firstName(name: string): string {
    return name.trim().split(' ')[0] ?? name;
  }

  starsArray(rating: number): number[] {
    return Array.from({ length: Math.round(rating) });
  }

  emptyStarsArray(rating: number): number[] {
    return Array.from({ length: 5 - Math.round(rating) });
  }

  featuredReviews(reviews: TrainerReview[]): TrainerReview[] {
    return reviews.filter((r) => r.is_featured);
  }

  regularReviews(reviews: TrainerReview[]): TrainerReview[] {
    return reviews.filter((r) => !r.is_featured);
  }

  bookingHref(profile: PublicProfileData): string {
    if (profile.booking_url_override) return profile.booking_url_override;
    // Deep-link to FitOS app booking with intro service pre-selected
    return `https://www.nutrifitos.app/book/${profile.username}?service=intro`;
  }
}
