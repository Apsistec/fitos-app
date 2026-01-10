import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalDocument } from '../../legal/privacy-policy';

@Component({
  selector: 'fitos-legal-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="legal-container">
      <div class="legal-header">
        <h1>{{ document.title }}</h1>
        <p class="last-updated">Last updated: {{ formatDate(document.lastUpdated) }}</p>
      </div>

      <div class="legal-content">
        @for (section of document.sections; track section.title) {
          <section class="legal-section">
            <h2>{{ section.title }}</h2>
            <div [innerHTML]="section.content" class="section-content"></div>
          </section>
        }
      </div>
    </div>
  `,
  styles: [`
    .legal-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 32px 16px;
    }

    .legal-header {
      margin-bottom: 48px;
      text-align: center;
    }

    .legal-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 12px;
      color: var(--fitos-text-primary, #111827);
    }

    .last-updated {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary, #9CA3AF);
    }

    .legal-content {
      line-height: 1.7;
    }

    .legal-section {
      margin-bottom: 48px;
    }

    .legal-section h2 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--fitos-text-primary, #111827);
      padding-bottom: 12px;
      border-bottom: 2px solid var(--fitos-border-default, rgba(0, 0, 0, 0.1));
    }

    .section-content {
      color: var(--fitos-text-secondary, #4B5563);
    }

    .section-content h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin: 24px 0 12px 0;
      color: var(--fitos-text-primary, #111827);
    }

    .section-content p {
      margin-bottom: 16px;
    }

    .section-content ul,
    .section-content ol {
      margin: 16px 0;
      padding-left: 24px;
    }

    .section-content li {
      margin-bottom: 8px;
    }

    .section-content a {
      color: var(--fitos-accent-primary, #10B981);
      text-decoration: underline;
    }

    .section-content a:hover {
      color: var(--fitos-accent-primary-hover, #059669);
    }

    .section-content strong {
      font-weight: 600;
      color: var(--fitos-text-primary, #111827);
    }

    .section-content table {
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .legal-container {
        padding: 24px 16px;
      }

      .legal-header h1 {
        font-size: 2rem;
      }

      .legal-section h2 {
        font-size: 1.5rem;
      }

      .section-content h3 {
        font-size: 1.125rem;
      }
    }
  `],
})
export class LegalPageComponent {
  @Input({ required: true }) document!: LegalDocument;

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
}
