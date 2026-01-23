import { Component, OnInit, ElementRef, AfterViewInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="features-page">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 class="section-title">Everything You Need to Scale Your Training Business</h1>
          <p class="section-subtitle">
            FitOS combines powerful coaching tools, built-in CRM, and AI-powered features—all in one platform. No more juggling multiple apps or paying per-client fees.
          </p>
        </div>
      </div>

      <!-- Problem Statement -->
      <div class="problem-section">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="section-heading">Tired of Glitchy Apps That Make Your Business Look Bad?</h2>
          <div class="problem-grid">
            <div class="problem-card">
              <div class="problem-icon">🐛</div>
              <h3>Unreliable Platforms</h3>
              <p>"Trainerize is far too glitchy... made me feel like it was diminishing the quality of my business."</p>
            </div>
            <div class="problem-card">
              <div class="problem-icon">💸</div>
              <h3>Hidden Costs</h3>
              <p>Per-client fees that eat into your revenue. $350/month just for unlimited clients? That's your profit margin.</p>
            </div>
            <div class="problem-card">
              <div class="problem-icon">📱</div>
              <h3>Limited Mobile Editing</h3>
              <p>Most platforms only let you view on mobile. Need to edit a workout? Good luck doing that from the gym floor.</p>
            </div>
            <div class="problem-card">
              <div class="problem-icon">🎨</div>
              <h3>Clinical, Outdated Design</h3>
              <p>"Too clinical" interfaces that require training videos for everything. Your clients deserve better.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Features Grid -->
      <div class="features-section">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="section-heading">Built for Solo Trainers Who Want to Scale</h2>

          <!-- Coaching Tools -->
          <div class="feature-category">
            <div class="category-header">
              <span class="category-badge">Coaching Tools</span>
              <h3>Program Smarter, Not Harder</h3>
            </div>
            <div class="features-grid">
              <div class="feature-card">
                <div class="feature-icon">🏋️</div>
                <h4>Full Mobile Editing</h4>
                <p>Edit workouts, adjust programs, and respond to clients from anywhere. No more being chained to your laptop.</p>
                <span class="competitor-note">❌ Trainerize: Mobile viewing only</span>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📁</div>
                <h4>Workout Organization</h4>
                <p>Folders, templates, and smart search. Stop scrolling through endless lists to find that program you wrote last month.</p>
                <span class="competitor-note">❌ TrueCoach: "For the love of god please let us create folders"</span>
              </div>
              <div class="feature-card">
                <div class="feature-icon">⚡</div>
                <h4>Lightning-Fast Programming</h4>
                <p>Keyboard shortcuts, smart defaults, and intelligent autocomplete. Build programs in minutes, not hours.</p>
              </div>
              <div class="feature-card">
                <div class="feature-icon">📊</div>
                <h4>Real-Time Progress Tracking</h4>
                <p>See exactly when clients log workouts, nutrition, and measurements. Automated alerts for at-risk clients.</p>
              </div>
            </div>
          </div>

          <!-- AI-Powered Features -->
          <div class="feature-category">
            <div class="category-header">
              <span class="category-badge premium">AI-Powered</span>
              <h3>Let AI Handle the Busy Work</h3>
            </div>
            <div class="features-grid">
              <div class="feature-card premium">
                <div class="feature-icon">🎤</div>
                <h4>Voice Logging</h4>
                <p>Clients log workouts and meals by voice. "10 reps at 185" or "two eggs and toast"—done in seconds.</p>
                <span class="competitor-note">✓ 73% faster than manual entry</span>
              </div>
              <div class="feature-card premium">
                <div class="feature-icon">📸</div>
                <h4>Photo Nutrition AI</h4>
                <p>Snap a photo, get instant macro breakdown. Transparent results clients can edit—not a black box.</p>
                <span class="competitor-note">❌ Most apps: Generic estimates or no photo logging</span>
              </div>
              <div class="feature-card premium">
                <div class="feature-icon">🤖</div>
                <h4>AI Coaching Assistant</h4>
                <p>24/7 AI coach trained on your methodology. Answers common questions so you can focus on high-value coaching.</p>
                <span class="competitor-note">❌ WHOOP: $30/month extra + hardware required</span>
              </div>
              <div class="feature-card premium">
                <div class="feature-icon">🎯</div>
                <h4>Just-In-Time Interventions</h4>
                <p>Proactive check-ins when clients need them most. Research-backed timing prevents dropouts before they happen.</p>
              </div>
            </div>
          </div>

          <!-- Business Tools -->
          <div class="feature-category">
            <div class="category-header">
              <span class="category-badge business">Business Tools</span>
              <h3>Built-In CRM & Marketing</h3>
            </div>
            <div class="features-grid">
              <div class="feature-card business">
                <div class="feature-icon">🎯</div>
                <h4>Lead Pipeline Management</h4>
                <p>Track leads from first contact to paying client. Never lose a prospect in the shuffle again.</p>
                <span class="competitor-note">❌ Trainerize: 5.5/10 marketing features, no real CRM</span>
              </div>
              <div class="feature-card business">
                <div class="feature-icon">✉️</div>
                <h4>Email Marketing Automation</h4>
                <p>Drip campaigns, newsletters, and automated follow-ups. No need for Mailchimp or Constant Contact.</p>
                <span class="competitor-note">❌ All competitors: Require external tools</span>
              </div>
              <div class="feature-card business">
                <div class="feature-icon">💳</div>
                <h4>Integrated Payments</h4>
                <p>Stripe-powered billing. Automatic invoicing, payment tracking, and client subscription management.</p>
              </div>
              <div class="feature-card business">
                <div class="feature-icon">📈</div>
                <h4>Business Analytics</h4>
                <p>Revenue tracking, client retention metrics, and growth insights. Know your numbers at a glance.</p>
              </div>
            </div>
          </div>

          <!-- Client Experience -->
          <div class="feature-category">
            <div class="category-header">
              <span class="category-badge client">Client Experience</span>
              <h3>Your Clients Will Love It</h3>
            </div>
            <div class="features-grid">
              <div class="feature-card client">
                <div class="feature-icon">🌙</div>
                <h4>Dark Mode Default</h4>
                <p>Designed for gym environments. Glanceable data with 15:1+ contrast ratios. Easy on the eyes, even at 5 AM.</p>
                <span class="competitor-note">✓ Based on WHOOP's award-winning design philosophy</span>
              </div>
              <div class="feature-card client">
                <div class="feature-icon">⏱️</div>
                <h4>Sub-10-Second Logging</h4>
                <p>One-tap workout logging with smart predictions. MacroFactor-style efficiency for nutrition tracking.</p>
                <span class="competitor-note">✓ 1.5x fewer actions than MyFitnessPal</span>
              </div>
              <div class="feature-card client">
                <div class="feature-icon">🎨</div>
                <h4>Adherence-Neutral Design</h4>
                <p>No red numbers when "over" targets. Purple accents, not shame. Research shows this improves compliance by 42%.</p>
                <span class="competitor-note">✓ MacroFactor pioneered this—we're bringing it to coaching</span>
              </div>
              <div class="feature-card client">
                <div class="feature-icon">⌚</div>
                <h4>Wearable Integration</h4>
                <p>Apple Health, Google Fit, Garmin, WHOOP, Oura. Sync sleep, HRV, and activity data automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Technical Differentiators -->
      <div class="tech-section">
        <div class="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="section-heading">Built for Reliability, Not Shareholder Value</h2>
          <div class="tech-grid">
            <div class="tech-card">
              <h4>✅ Offline-First Architecture</h4>
              <p>Works in gym dead zones. Syncs automatically when back online. Never lose data again.</p>
            </div>
            <div class="tech-card">
              <h4>✅ Modern Tech Stack</h4>
              <p>Angular 21, Ionic 8, Supabase. Native iOS and Android apps, not a wrapper. Fast, reliable, and constantly improving.</p>
            </div>
            <div class="tech-card">
              <h4>✅ Data Ownership</h4>
              <p>Export your data anytime. No lock-in. Your business, your data.</p>
            </div>
            <div class="tech-card">
              <h4>✅ Independent & Focused</h4>
              <p>Not owned by ABC Fitness or a VC-backed unicorn. Built by trainers, for trainers.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- CTA Section -->
      <div class="cta-section">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="cta-heading">Ready to Upgrade Your Coaching Platform?</h2>
          <p class="cta-text">
            Join solo trainers who've switched from Trainerize, TrueCoach, and PT Distinction. Unlimited clients, no per-client fees, and AI features that actually work.
          </p>
          <div class="cta-buttons">
            <a href="https://app.fitos.app" class="cta-button primary">Start Free Trial</a>
            <a href="/pricing" class="cta-button secondary">See Pricing</a>
          </div>
          <p class="cta-note">14-day free trial. No credit card required.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .features-page {
      min-height: 100vh;
    }

    /* Scroll Animation Classes */
    .problem-card,
    .feature-card,
    .comparison-row,
    .differentiator-card {
      opacity: 0;
      transform: translateY(30px);
      transition: opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1),
                  transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .problem-card.visible,
    .feature-card.visible,
    .comparison-row.visible,
    .differentiator-card.visible {
      opacity: 1;
      transform: translateY(0);
    }

    /* Stagger animation delay */
    .problem-card:nth-child(1) { transition-delay: 0.1s; }
    .problem-card:nth-child(2) { transition-delay: 0.2s; }
    .problem-card:nth-child(3) { transition-delay: 0.3s; }
    .problem-card:nth-child(4) { transition-delay: 0.4s; }

    .feature-card:nth-child(odd) { transition-delay: 0.1s; }
    .feature-card:nth-child(even) { transition-delay: 0.2s; }

    /* Hero Section */
    .hero-section {
      padding: 80px 0 60px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border-bottom: 1px solid var(--fitos-border-default);
    }

    .section-title {
      font-size: 3rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 24px;
      color: var(--fitos-text-primary);
      line-height: 1.2;
    }

    .section-subtitle {
      font-size: 1.25rem;
      text-align: center;
      color: var(--fitos-text-secondary);
      max-width: 800px;
      margin: 0 auto;
      line-height: 1.6;
    }

    /* Problem Section */
    .problem-section {
      padding: 80px 0;
      background-color: var(--fitos-bg-primary);
    }

    .section-heading {
      font-size: 2.5rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 48px;
      color: var(--fitos-text-primary);
    }

    .problem-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 24px;
      margin-top: 48px;
    }

    .problem-card {
      padding: 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 16px;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .problem-card:hover {
      border-color: rgba(239, 68, 68, 0.3);
      box-shadow: 0 12px 32px rgba(239, 68, 68, 0.15);
      transform: translateY(-4px);
    }

    .problem-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .problem-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .problem-card p {
      font-size: 0.9rem;
      color: var(--fitos-text-tertiary);
      font-style: italic;
      line-height: 1.5;
    }

    /* Features Section */
    .features-section {
      padding: 80px 0;
      background-color: var(--fitos-bg-primary);
    }

    .feature-category {
      margin-bottom: 80px;
    }

    .category-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .category-badge {
      display: inline-block;
      padding: 8px 16px;
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      color: white;
      font-size: 0.875rem;
      font-weight: 600;
      border-radius: 20px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .category-badge.premium {
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
    }

    .category-badge.business {
      background: linear-gradient(135deg, #10b981, #3b82f6);
    }

    .category-badge.client {
      background: linear-gradient(135deg, #f59e0b, #ef4444);
    }

    .category-header h3 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--fitos-text-primary);
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
    }

    .feature-card {
      padding: 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 16px;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }

    .feature-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .feature-card.premium::before {
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
    }

    .feature-card.business::before {
      background: linear-gradient(90deg, #10b981, #3b82f6);
    }

    .feature-card.client::before {
      background: linear-gradient(90deg, #f59e0b, #ef4444);
    }

    .feature-card:hover {
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.15);
      transform: translateY(-4px);
    }

    .feature-card:hover::before {
      opacity: 1;
    }

    .feature-icon {
      font-size: 2.5rem;
      margin-bottom: 16px;
      display: block;
    }

    .feature-card h4 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .feature-card p {
      font-size: 0.95rem;
      color: var(--fitos-text-secondary);
      line-height: 1.6;
      margin-bottom: 12px;
    }

    .competitor-note {
      display: block;
      font-size: 0.8rem;
      color: var(--fitos-text-tertiary);
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--fitos-border-default);
      font-style: italic;
    }

    /* Tech Section */
    .tech-section {
      padding: 80px 0;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border-top: 1px solid var(--fitos-border-default);
      border-bottom: 1px solid var(--fitos-border-default);
    }

    .tech-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 24px;
      margin-top: 48px;
    }

    .tech-card {
      padding: 24px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .tech-card h4 {
      font-size: 1.1rem;
      font-weight: 600;
      margin-bottom: 8px;
      color: var(--fitos-accent-primary);
    }

    .tech-card p {
      font-size: 0.9rem;
      color: var(--fitos-text-secondary);
      line-height: 1.5;
    }

    /* CTA Section */
    .cta-section {
      padding: 80px 0;
      background-color: var(--fitos-bg-primary);
    }

    .cta-heading {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 24px;
      color: var(--fitos-text-primary);
    }

    .cta-text {
      font-size: 1.1rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 40px;
      line-height: 1.6;
    }

    .cta-buttons {
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    }

    .cta-button {
      padding: 16px 40px;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.25s ease;
      display: inline-block;
    }

    .cta-button.primary {
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      color: white;
      box-shadow: 0 4px 16px rgba(16, 185, 129, 0.3);
    }

    .cta-button.primary:hover {
      box-shadow: 0 8px 32px rgba(16, 185, 129, 0.4);
      transform: translateY(-2px);
    }

    .cta-button.secondary {
      background-color: transparent;
      color: var(--fitos-text-primary);
      border: 2px solid var(--fitos-accent-primary);
    }

    .cta-button.secondary:hover {
      background-color: var(--fitos-accent-primary);
      color: white;
    }

    .cta-note {
      margin-top: 24px;
      font-size: 0.9rem;
      color: var(--fitos-text-tertiary);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .section-title {
        font-size: 2rem;
      }

      .section-heading {
        font-size: 1.75rem;
      }

      .cta-heading {
        font-size: 1.75rem;
      }

      .features-grid {
        grid-template-columns: 1fr;
      }

      .problem-grid {
        grid-template-columns: 1fr;
      }

      .cta-buttons {
        flex-direction: column;
      }

      .cta-button {
        width: 100%;
        text-align: center;
      }
    }
  `],
})
export class FeaturesComponent implements AfterViewInit {
  private platformId = inject(PLATFORM_ID);

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit() {
    // Only run animations in browser, not during SSR
    if (isPlatformBrowser(this.platformId)) {
      this.setupScrollAnimations();
    }
  }

  private setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    const animatedElements = this.elementRef.nativeElement.querySelectorAll(
      '.problem-card, .feature-card, .comparison-row, .differentiator-card'
    );

    animatedElements.forEach((el: Element) => {
      observer.observe(el);
    });
  }
}
