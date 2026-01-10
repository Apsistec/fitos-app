import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="changelog-container">
      <div class="changelog-header">
        <h1>Changelog</h1>
        <p class="subtitle">Track FitOS product updates and improvements</p>
      </div>

      <div class="changelog-content">
        <div class="version-block">
          <div class="version-header">
            <h2>Version 1.0.0</h2>
            <span class="date">January 10, 2026</span>
          </div>
          <div class="changes">
            <h3>🎉 Initial Release</h3>
            <ul>
              <li>Exercise library with 500+ exercises</li>
              <li>Workout builder and logging</li>
              <li>Nutrition tracking with voice logging</li>
              <li>Client messaging and progress tracking</li>
              <li>Stripe payments integration</li>
              <li>Wearable device integration (Apple Health, Google Fit)</li>
              <li>Dark mode design optimized for gym environments</li>
            </ul>
          </div>
        </div>

        <div class="coming-soon">
          <h3>Coming Soon</h3>
          <ul>
            <li>AI-powered voice workout logging</li>
            <li>Photo nutrition analysis</li>
            <li>Built-in CRM and email marketing</li>
            <li>Apple Watch companion app</li>
            <li>Advanced analytics and insights</li>
          </ul>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .changelog-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 64px 16px 120px;
    }

    .changelog-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .changelog-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
    }

    .changelog-content {
      display: flex;
      flex-direction: column;
      gap: 48px;
    }

    .version-block {
      padding: 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .version-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--fitos-border-default);
    }

    .version-header h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--fitos-accent-primary);
    }

    .date {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
    }

    .changes h3 {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .changes ul {
      list-style: none;
      padding: 0;
    }

    .changes li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: var(--fitos-text-secondary);
      line-height: 1.6;
    }

    .changes li::before {
      content: '•';
      position: absolute;
      left: 8px;
      color: var(--fitos-accent-primary);
      font-weight: bold;
    }

    .coming-soon {
      padding: 32px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .coming-soon h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .coming-soon ul {
      list-style: none;
      padding: 0;
    }

    .coming-soon li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      color: var(--fitos-text-secondary);
      line-height: 1.6;
    }

    .coming-soon li::before {
      content: '→';
      position: absolute;
      left: 8px;
      color: var(--fitos-accent-secondary);
      font-weight: bold;
    }

    @media (max-width: 768px) {
      .changelog-container {
        padding: 48px 16px 80px;
      }

      .changelog-header h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .version-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .version-block,
      .coming-soon {
        padding: 24px;
      }
    }
  `],
})
export class ChangelogComponent {}
