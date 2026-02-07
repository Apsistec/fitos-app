import { Component, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccordionComponent } from '@fitos/libs';
import type { AccordionItem } from '@fitos/libs';
import { CHANGELOG_VERSIONS } from './changelog.data';

export interface ChangelogVersion {
  version: string;
  date: string;
  changes: {
    type: 'feature' | 'improvement' | 'bugfix' | 'breaking';
    description: string;
  }[];
}

@Component({
  selector: 'app-changelog',
  standalone: true,
  imports: [CommonModule, AccordionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="changelog-container">
      <div class="changelog-header">
        <h1>Changelog</h1>
        <p class="subtitle">Track FitOS product updates and improvements</p>
      </div>

      <div class="changelog-content">
        @if (accordionItems.length > 0) {
          <lib-accordion
            [items]="accordionItems"
            [singleExpand]="true"
            [defaultExpandedId]="accordionItems[0].id"
          />
        } @else {
          <div class="no-versions">
            <p>No changelog entries yet. Check back soon for updates!</p>
          </div>
        }

        <div class="coming-soon">
          <h3>🚀 Coming Soon</h3>
          <ul>
            <li>AI-powered voice workout logging (Deepgram integration)</li>
            <li>Photo nutrition analysis with transparent breakdown</li>
            <li>Built-in CRM and email marketing automation</li>
            <li>Apple Watch companion app with offline sync</li>
            <li>Advanced analytics dashboard with client insights</li>
            <li>JITAI (Just-in-Time Adaptive Interventions) for coaching</li>
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

    .no-versions {
      text-align: center;
      padding: 64px 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .no-versions p {
      font-size: 1.125rem;
      color: var(--fitos-text-secondary);
    }

    .coming-soon {
      padding: 32px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .coming-soon h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 20px;
      color: var(--fitos-text-primary);
    }

    .coming-soon ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .coming-soon li {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
      padding: 12px 0;
      padding-left: 28px;
      position: relative;
      line-height: 1.6;
    }

    .coming-soon li::before {
      content: '→';
      position: absolute;
      left: 0;
      color: var(--fitos-accent-primary);
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
    }
  `],
})
export class ChangelogComponent implements OnInit {
  versions: ChangelogVersion[] = CHANGELOG_VERSIONS;
  accordionItems: AccordionItem[] = [];

  ngOnInit() {
    this.accordionItems = this.versions.map(version => ({
      id: `version-${version.version}`,
      title: `Version ${version.version}`,
      content: this.renderChangelogContent(version),
    }));
  }

  private renderChangelogContent(version: ChangelogVersion): string {
    const emojiMap = {
      feature: '✨',
      improvement: '🔧',
      bugfix: '🐛',
      breaking: '⚠️',
    };

    const typeLabels = {
      feature: 'New Feature',
      improvement: 'Improvement',
      bugfix: 'Bug Fix',
      breaking: 'Breaking Change',
    };

    const groupedChanges = version.changes.reduce((acc, change) => {
      if (!acc[change.type]) {
        acc[change.type] = [];
      }
      acc[change.type].push(change.description);
      return acc;
    }, {} as Record<string, string[]>);

    let html = `<div style="margin-bottom: 16px; color: var(--fitos-text-tertiary); font-size: 0.95rem;">${version.date}</div>`;

    Object.entries(groupedChanges).forEach(([type, changes]) => {
      const emoji = emojiMap[type as keyof typeof emojiMap];
      const label = typeLabels[type as keyof typeof typeLabels];
      html += `<h4 style="font-size: 1.1rem; font-weight: 600; color: var(--fitos-text-primary); margin: 24px 0 12px 0;">${emoji} ${label}</h4>`;
      html += '<ul style="margin: 0; padding-left: 24px;">';
      changes.forEach(change => {
        html += `<li style="margin: 8px 0; color: var(--fitos-text-secondary); line-height: 1.6;">${change}</li>`;
      });
      html += '</ul>';
    });

    return html;
  }
}
