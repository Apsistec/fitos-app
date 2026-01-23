import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '@fitos/libs';
import type { AccordionItem } from '@fitos/libs';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  template: `
    <div class="pricing-page">
      <!-- Hero Section -->
      <div class="hero-section">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="section-title">Simple, Transparent Pricing</h1>
          <p class="section-subtitle">
            Unlimited clients. No per-client fees. No hidden costs. Just one flat rate with everything included.
          </p>
          <div class="billing-toggle">
            <button
              class="toggle-button"
              [class.active]="billingPeriod() === 'monthly'"
              (click)="billingPeriod.set('monthly')"
            >
              Monthly
            </button>
            <button
              class="toggle-button"
              [class.active]="billingPeriod() === 'annual'"
              (click)="billingPeriod.set('annual')"
            >
              Annual
              <span class="savings-badge">Save 20%</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Pricing Cards -->
      <div class="pricing-section">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="pricing-grid">
            <!-- Free Tier -->
            <div class="pricing-card">
              <div class="card-header">
                <h3>Free</h3>
                <div class="price">
                  <span class="price-amount">$0</span>
                  <span class="price-period">/forever</span>
                </div>
                <p class="price-description">Perfect for getting started</p>
              </div>
              <div class="card-body">
                <ul class="feature-list">
                  <li><span class="check">✓</span> Up to 3 active clients</li>
                  <li><span class="check">✓</span> Workout programming</li>
                  <li><span class="check">✓</span> Basic nutrition tracking</li>
                  <li><span class="check">✓</span> Client messaging</li>
                  <li><span class="check">✓</span> Progress tracking</li>
                  <li><span class="cross">✗</span> Mobile app</li>
                  <li><span class="cross">✗</span> AI features</li>
                  <li><span class="cross">✗</span> CRM & marketing</li>
                </ul>
              </div>
              <div class="card-footer">
                <a href="https://app.fitos.app/register" class="cta-button secondary">Get Started Free</a>
              </div>
            </div>

            <!-- Starter Tier -->
            <div class="pricing-card">
              <div class="card-header">
                <h3>Starter</h3>
                <div class="price">
                  @if (billingPeriod() === 'monthly') {
                    <span class="price-amount">$29</span>
                    <span class="price-period">/month</span>
                  } @else {
                    <span class="price-amount">$23</span>
                    <span class="price-period">/month</span>
                    <div class="annual-note">Billed annually at $279</div>
                  }
                </div>
                <p class="price-description">For solo trainers getting started</p>
              </div>
              <div class="card-body">
                <ul class="feature-list">
                  <li><span class="check">✓</span> Up to 25 clients</li>
                  <li><span class="check">✓</span> Everything in Free, plus:</li>
                  <li><span class="check">✓</span> Native mobile apps (iOS & Android)</li>
                  <li><span class="check">✓</span> Wearable integrations</li>
                  <li><span class="check">✓</span> Custom branding</li>
                  <li><span class="check">✓</span> Advanced analytics</li>
                  <li><span class="check">✓</span> Email support</li>
                  <li><span class="cross">✗</span> AI features</li>
                  <li><span class="cross">✗</span> CRM & marketing</li>
                </ul>
              </div>
              <div class="card-footer">
                <a href="https://app.fitos.app/register?plan=starter" class="cta-button secondary">Start 14-Day Trial</a>
              </div>
            </div>

            <!-- Pro Tier (Most Popular) -->
            <div class="pricing-card popular">
              <div class="popular-badge">Most Popular</div>
              <div class="card-header">
                <h3>Pro</h3>
                <div class="price">
                  @if (billingPeriod() === 'monthly') {
                    <span class="price-amount">$59</span>
                    <span class="price-period">/month</span>
                  } @else {
                    <span class="price-amount">$47</span>
                    <span class="price-period">/month</span>
                    <div class="annual-note">Billed annually at $569</div>
                  }
                </div>
                <p class="price-description">For growing training businesses</p>
              </div>
              <div class="card-body">
                <ul class="feature-list">
                  <li><span class="check">✓</span> Up to 100 clients</li>
                  <li><span class="check">✓</span> Everything in Starter, plus:</li>
                  <li><span class="check">✓</span> Voice workout & meal logging</li>
                  <li><span class="check">✓</span> Photo nutrition AI</li>
                  <li><span class="check">✓</span> AI coaching assistant</li>
                  <li><span class="check">✓</span> Full CRM suite</li>
                  <li><span class="check">✓</span> Email marketing automation</li>
                  <li><span class="check">✓</span> Priority support</li>
                  <li><span class="check">✓</span> Custom domain</li>
                </ul>
              </div>
              <div class="card-footer">
                <a href="https://app.fitos.app/register?plan=pro" class="cta-button primary">Start 14-Day Trial</a>
              </div>
            </div>

            <!-- Business Tier -->
            <div class="pricing-card">
              <div class="card-header">
                <h3>Business</h3>
                <div class="price">
                  @if (billingPeriod() === 'monthly') {
                    <span class="price-amount">$129</span>
                    <span class="price-period">/month</span>
                  } @else {
                    <span class="price-amount">$103</span>
                    <span class="price-period">/month</span>
                    <div class="annual-note">Billed annually at $1,239</div>
                  }
                </div>
                <p class="price-description">For studios and teams</p>
              </div>
              <div class="card-body">
                <ul class="feature-list">
                  <li><span class="check">✓</span> Unlimited clients</li>
                  <li><span class="check">✓</span> Everything in Pro, plus:</li>
                  <li><span class="check">✓</span> Multi-trainer accounts</li>
                  <li><span class="check">✓</span> Team collaboration tools</li>
                  <li><span class="check">✓</span> White-label mobile apps</li>
                  <li><span class="check">✓</span> Advanced business analytics</li>
                  <li><span class="check">✓</span> Dedicated account manager</li>
                  <li><span class="check">✓</span> Custom integrations</li>
                  <li><span class="check">✓</span> SLA guarantee</li>
                </ul>
              </div>
              <div class="card-footer">
                <a href="https://app.fitos.app/register?plan=business" class="cta-button secondary">Start 14-Day Trial</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Comparison Section -->
      <div class="comparison-section">
        <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="section-heading">How FitOS Compares</h2>
          <div class="comparison-table-container">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>25 Clients</th>
                  <th>50 Clients</th>
                  <th>AI Features</th>
                  <th>Built-in CRM</th>
                </tr>
              </thead>
              <tbody>
                <tr class="highlight">
                  <td><strong>FitOS Pro</strong></td>
                  <td class="price-cell">$59/mo</td>
                  <td class="price-cell">$59/mo</td>
                  <td class="check-cell">✓</td>
                  <td class="check-cell">✓</td>
                </tr>
                <tr>
                  <td>Trainerize</td>
                  <td class="price-cell">~$120/mo</td>
                  <td class="price-cell">~$165/mo</td>
                  <td class="cross-cell">✗</td>
                  <td class="cross-cell">✗</td>
                </tr>
                <tr>
                  <td>TrueCoach</td>
                  <td class="price-cell">~$107/mo</td>
                  <td class="price-cell">$110/mo</td>
                  <td class="cross-cell">✗</td>
                  <td class="cross-cell">✗</td>
                </tr>
                <tr>
                  <td>PT Distinction</td>
                  <td class="price-cell">~$60/mo</td>
                  <td class="price-cell">~$85/mo</td>
                  <td class="cross-cell">✗</td>
                  <td class="cross-cell">✗</td>
                </tr>
                <tr>
                  <td>Everfit</td>
                  <td class="price-cell">$80-120+/mo</td>
                  <td class="price-cell">$120-160+/mo</td>
                  <td class="partial-cell">Partial</td>
                  <td class="cross-cell">✗</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="comparison-note">
            * Competitor pricing includes necessary add-ons. Most don't include AI features or CRM—you'd need to pay for additional tools.
          </p>
        </div>
      </div>

      <!-- FAQ Section -->
      <div class="faq-section">
        <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 class="section-heading">Frequently Asked Questions</h2>
          <fitos-accordion [items]="faqItems" [singleExpand]="true" />
        </div>
      </div>

      <!-- Final CTA -->
      <div class="final-cta-section">
        <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 class="cta-heading">Start Your 14-Day Free Trial</h2>
          <p class="cta-text">
            No credit card required. Cancel anytime. Get full access to all Pro features during your trial.
          </p>
          <a href="https://app.fitos.app/register" class="cta-button large">Try FitOS Free</a>
          <p class="cta-note">Have questions? <a href="/help" class="help-link">Visit our help center</a> or <a href="mailto:sales@fitos.app" class="help-link">email sales</a></p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pricing-page {
      min-height: 100vh;
    }

    /* Hero Section */
    .hero-section {
      padding: 80px 0 60px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border-bottom: 1px solid var(--fitos-border-default);
    }

    .section-title {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 24px;
      color: var(--fitos-text-primary);
      line-height: 1.2;
    }

    .section-subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 40px;
      line-height: 1.6;
    }

    .billing-toggle {
      display: inline-flex;
      gap: 8px;
      background-color: var(--fitos-bg-secondary);
      padding: 6px;
      border-radius: 12px;
      border: 1px solid var(--fitos-border-default);
    }

    .toggle-button {
      padding: 12px 24px;
      border: none;
      background: transparent;
      color: var(--fitos-text-secondary);
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.25s ease;
      position: relative;
    }

    .toggle-button.active {
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      color: white;
    }

    .savings-badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      background-color: rgba(239, 68, 68, 0.2);
      color: #ef4444;
      font-size: 0.75rem;
      border-radius: 4px;
      font-weight: 700;
    }

    .toggle-button.active .savings-badge {
      background-color: rgba(255, 255, 255, 0.3);
      color: white;
    }

    /* Pricing Section */
    .pricing-section {
      padding: 80px 0;
      background-color: var(--fitos-bg-primary);
    }

    .pricing-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 32px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .pricing-card {
      background-color: var(--fitos-bg-secondary);
      border: 2px solid var(--fitos-border-default);
      border-radius: 16px;
      padding: 40px 32px;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: all 0.3s ease;
    }

    .pricing-card:hover {
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.15);
      transform: translateY(-4px);
    }

    .pricing-card.popular {
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 12px 40px rgba(16, 185, 129, 0.2);
    }

    .popular-badge {
      position: absolute;
      top: -16px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      color: white;
      padding: 6px 20px;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-header {
      text-align: center;
      margin-bottom: 32px;
    }

    .card-header h3 {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .price {
      margin-bottom: 12px;
    }

    .price-amount {
      font-size: 3.5rem;
      font-weight: 700;
      color: var(--fitos-accent-primary);
    }

    .price-period {
      font-size: 1.1rem;
      color: var(--fitos-text-tertiary);
      margin-left: 4px;
    }

    .annual-note {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
      margin-top: 8px;
    }

    .price-description {
      color: var(--fitos-text-secondary);
      font-size: 1rem;
    }

    .card-body {
      flex-grow: 1;
      margin-bottom: 32px;
    }

    .feature-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .feature-list li {
      padding: 12px 0;
      color: var(--fitos-text-secondary);
      display: flex;
      align-items: flex-start;
      gap: 12px;
      line-height: 1.5;
    }

    .check {
      color: var(--fitos-accent-primary);
      font-weight: 700;
      font-size: 1.1rem;
    }

    .cross {
      color: var(--fitos-text-tertiary);
      font-size: 1.1rem;
    }

    .card-footer {
      text-align: center;
    }

    .cta-button {
      display: inline-block;
      padding: 14px 32px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 10px;
      text-decoration: none;
      transition: all 0.25s ease;
      width: 100%;
      text-align: center;
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

    .cta-button.large {
      padding: 18px 48px;
      font-size: 1.2rem;
      width: auto;
      display: inline-block;
    }

    /* Comparison Section */
    .comparison-section {
      padding: 80px 0;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.03), rgba(139, 92, 246, 0.03));
      border-top: 1px solid var(--fitos-border-default);
    }

    .section-heading {
      font-size: 2.5rem;
      font-weight: 700;
      text-align: center;
      margin-bottom: 48px;
      color: var(--fitos-text-primary);
    }

    .comparison-table-container {
      overflow-x: auto;
      margin-bottom: 24px;
    }

    .comparison-table {
      width: 100%;
      border-collapse: collapse;
      background-color: var(--fitos-bg-secondary);
      border-radius: 12px;
      overflow: hidden;
    }

    .comparison-table th,
    .comparison-table td {
      padding: 16px;
      text-align: left;
      border-bottom: 1px solid var(--fitos-border-default);
    }

    .comparison-table th {
      background-color: var(--fitos-bg-tertiary);
      color: var(--fitos-text-primary);
      font-weight: 600;
      font-size: 0.95rem;
    }

    .comparison-table td {
      color: var(--fitos-text-secondary);
    }

    .comparison-table tr.highlight {
      background: linear-gradient(90deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
    }

    .price-cell {
      font-weight: 600;
      color: var(--fitos-text-primary);
    }

    .check-cell {
      color: var(--fitos-accent-primary);
      font-weight: 700;
      font-size: 1.2rem;
    }

    .cross-cell {
      color: var(--fitos-text-tertiary);
      font-size: 1.2rem;
    }

    .partial-cell {
      color: #f59e0b;
      font-size: 0.875rem;
      font-style: italic;
    }

    .comparison-note {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
      font-style: italic;
      text-align: center;
    }

    /* FAQ Section */
    .faq-section {
      padding: 80px 0;
      background-color: var(--fitos-bg-primary);
    }

    /* Final CTA Section */
    .final-cta-section {
      padding: 80px 0;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border-top: 1px solid var(--fitos-border-default);
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

    .cta-note {
      margin-top: 24px;
      font-size: 0.95rem;
      color: var(--fitos-text-tertiary);
    }

    .help-link {
      color: var(--fitos-accent-primary);
      text-decoration: none;
      transition: color 0.25s ease;
    }

    .help-link:hover {
      color: var(--fitos-accent-secondary);
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .pricing-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

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

      .pricing-grid {
        grid-template-columns: 1fr;
      }

      .comparison-table {
        font-size: 0.875rem;
      }

      .comparison-table th,
      .comparison-table td {
        padding: 12px 8px;
      }
    }
  `],
})
export class PricingComponent {
  billingPeriod = signal<'monthly' | 'annual'>('monthly');

  faqItems: AccordionItem[] = [
    {
      id: 'switch-plans',
      title: 'Can I switch plans anytime?',
      content: 'Yes! Upgrade or downgrade anytime. Changes take effect immediately, and we\'ll prorate the difference.',
    },
    {
      id: 'client-limit',
      title: 'What happens when I hit my client limit?',
      content: 'You\'ll get a notification when you\'re at 80% capacity. You can upgrade to the next tier with one click, or remove inactive clients.',
    },
    {
      id: 'refunds',
      title: 'Do you offer refunds?',
      content: 'Yes! 30-day money-back guarantee, no questions asked. If FitOS isn\'t right for you, we\'ll refund your first month.',
    },
    {
      id: 'payment-methods',
      title: 'What payment methods do you accept?',
      content: 'We accept all major credit cards via Stripe. Annual plans can also pay via ACH transfer.',
    },
    {
      id: 'free-trial',
      title: 'Can I try before I buy?',
      content: 'Absolutely! All paid plans include a 14-day free trial. No credit card required to start.',
    },
    {
      id: 'more-clients',
      title: 'What if I need more than 100 clients?',
      content: 'The Business plan includes unlimited clients. Perfect for growing studios or teams with multiple trainers.',
    },
  ];
}
