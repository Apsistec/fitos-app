import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

interface DocCategory {
  id: string;
  title: string;
  description: string;
  icon: string;
  docs: DocItem[];
}

interface DocItem {
  id: string;
  title: string;
  description: string;
  filename: string;
  category: string;
}

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="docs-page">
      <div class="docs-container">
        <!-- Header -->
        <div class="docs-header">
          <h1>FitOS Documentation</h1>
          <p class="subtitle">Technical guides, architecture docs, and development resources from our GitHub repository</p>
        </div>

        <!-- Category Navigation -->
        <div class="category-nav">
          @for (category of categories; track category.id) {
            <button
              class="category-button"
              [class.active]="selectedCategory() === category.id"
              (click)="selectCategory(category.id)"
            >
              <span class="category-icon">{{ category.icon }}</span>
              <span class="category-title">{{ category.title }}</span>
            </button>
          }
        </div>

        <!-- Docs Grid -->
        <div class="docs-grid">
          @for (category of filteredCategories(); track category.id) {
            <div class="category-section">
              <div class="category-header">
                <span class="category-icon-large">{{ category.icon }}</span>
                <div>
                  <h2>{{ category.title }}</h2>
                  <p class="category-description">{{ category.description }}</p>
                </div>
              </div>

              <div class="docs-list">
                @for (doc of category.docs; track doc.id) {
                  <a [href]="getGitHubUrl(doc.filename)" target="_blank" rel="noopener noreferrer" class="doc-card">
                    <div class="doc-title">{{ doc.title }}</div>
                    <div class="doc-description">{{ doc.description }}</div>
                    <div class="doc-link">
                      <span>View on GitHub</span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </div>
                  </a>
                }
              </div>
            </div>
          }
        </div>

        <!-- GitHub Link -->
        <div class="github-banner">
          <h3>📚 Full Documentation Repository</h3>
          <p>All documentation is maintained in our GitHub repository for version control and transparency.</p>
          <a href="https://github.com/anthropics/fitos-app/tree/main/docs" target="_blank" rel="noopener noreferrer" class="github-button">
            Browse All Docs on GitHub
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .docs-page {
      min-height: 100vh;
      background-color: var(--fitos-bg-primary);
      padding: 64px 0 120px;
    }

    .docs-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 16px;
    }

    .docs-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .docs-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
      max-width: 800px;
      margin: 0 auto;
    }

    .category-nav {
      display: flex;
      gap: 12px;
      margin-bottom: 48px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .category-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 24px;
      color: var(--fitos-text-secondary);
      font-size: 0.95rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .category-button:hover {
      border-color: var(--fitos-accent-primary);
      color: var(--fitos-accent-primary);
    }

    .category-button.active {
      background-color: var(--fitos-accent-primary);
      border-color: var(--fitos-accent-primary);
      color: white;
    }

    .category-icon {
      font-size: 1.2rem;
    }

    .docs-grid {
      display: flex;
      flex-direction: column;
      gap: 64px;
    }

    .category-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .category-header {
      display: flex;
      align-items: flex-start;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 2px solid var(--fitos-border-default);
    }

    .category-icon-large {
      font-size: 2.5rem;
    }

    .category-header h2 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--fitos-text-primary);
      margin-bottom: 4px;
    }

    .category-description {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
    }

    .docs-list {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 20px;
    }

    .doc-card {
      display: flex;
      flex-direction: column;
      padding: 24px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
      text-decoration: none;
      transition: all 0.25s ease;
    }

    .doc-card:hover {
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 8px 24px rgba(16, 185, 129, 0.15);
      transform: translateY(-2px);
    }

    .doc-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--fitos-text-primary);
      margin-bottom: 8px;
    }

    .doc-description {
      font-size: 0.95rem;
      color: var(--fitos-text-secondary);
      line-height: 1.5;
      flex: 1;
      margin-bottom: 12px;
    }

    .doc-link {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 0.875rem;
      color: var(--fitos-accent-primary);
      font-weight: 500;
    }

    .doc-link svg {
      transition: transform 0.25s ease;
    }

    .doc-card:hover .doc-link svg {
      transform: translate(2px, -2px);
    }

    .github-banner {
      margin-top: 64px;
      padding: 48px;
      text-align: center;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), rgba(139, 92, 246, 0.05));
      border: 1px solid var(--fitos-border-default);
      border-radius: 16px;
    }

    .github-banner h3 {
      font-size: 1.75rem;
      font-weight: 600;
      color: var(--fitos-text-primary);
      margin-bottom: 12px;
    }

    .github-banner p {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 24px;
    }

    .github-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 14px 28px;
      background-color: #24292e;
      color: white;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      text-decoration: none;
      transition: all 0.25s ease;
    }

    .github-button:hover {
      background-color: #1b1f23;
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
    }

    @media (max-width: 768px) {
      .docs-header h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .docs-list {
        grid-template-columns: 1fr;
      }

      .github-banner {
        padding: 32px 24px;
      }
    }
  `],
})
export class DocsComponent implements OnInit {
  selectedCategory = signal<string | null>(null);

  categories: DocCategory[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Setup guides, architecture overview, and development workflow',
      icon: '🚀',
      docs: [
        { id: 'repo-structure', title: 'Repository Structure', description: 'Complete guide to the monorepo organization', filename: 'REPOSITORY_STRUCTURE.md', category: 'getting-started' },
        { id: 'dev-workflow', title: 'Development Workflow', description: 'Git workflow, branching strategy, and PR process', filename: 'DEVELOPMENT_WORKFLOW.md', category: 'getting-started' },
        { id: 'build-mobile', title: 'Building Mobile Apps', description: 'iOS and Android build instructions', filename: 'BUILD_MOBILE_APPS.md', category: 'getting-started' },
        { id: 'deploy', title: 'Deployment Guide', description: 'Production deployment procedures', filename: 'DEPLOY.md', category: 'getting-started' },
      ],
    },
    {
      id: 'architecture',
      title: 'Architecture & Design',
      description: 'System architecture, design patterns, and technical decisions',
      icon: '🏗️',
      docs: [
        { id: 'design-system', title: 'Design System', description: 'Colors, typography, spacing, and components', filename: 'DESIGN_SYSTEM.md', category: 'architecture' },
        { id: 'type-system', title: 'Type System Guidelines', description: 'TypeScript type definitions and naming conventions', filename: 'TYPE_SYSTEM_GUIDELINES.md', category: 'architecture' },
        { id: 'user-roles', title: 'User Roles Architecture', description: 'RBAC, permissions, and dashboards by role', filename: 'USER_ROLES_ARCHITECTURE.md', category: 'architecture' },
        { id: 'offline-sync', title: 'Offline Sync Strategy', description: 'Offline-first patterns and background sync', filename: 'OFFLINE_SYNC.md', category: 'architecture' },
      ],
    },
    {
      id: 'features',
      title: 'Features & Implementation',
      description: 'Feature documentation, integration guides, and implementation details',
      icon: '⚙️',
      docs: [
        { id: 'ai-integration', title: 'AI Integration', description: 'Voice logging, photo nutrition AI, and coaching', filename: 'AI_INTEGRATION.md', category: 'features' },
        { id: 'crm-marketing', title: 'CRM & Marketing', description: 'Lead pipeline and email automation', filename: 'CRM_MARKETING.md', category: 'features' },
        { id: 'required-apis', title: 'Required External APIs', description: 'Third-party services and integration setup', filename: 'REQUIRED_EXTERNAL_APIS.md', category: 'features' },
        { id: 'hipaa', title: 'HIPAA Compliance', description: 'PHI classification and compliance requirements', filename: 'HIPAA_COMPLIANCE.md', category: 'features' },
      ],
    },
    {
      id: 'guides',
      title: 'Development Guides',
      description: 'Best practices, patterns, and coding guidelines',
      icon: '📚',
      docs: [
        { id: 'angular-ionic', title: 'Angular & Ionic Rules', description: 'Framework-specific best practices', filename: 'ANGULAR_IONIC_RULES.md', category: 'guides' },
        { id: 'ux-patterns', title: 'UX Patterns', description: 'Friction reduction and navigation patterns', filename: 'UX_PATTERNS.md', category: 'guides' },
        { id: 'settings-ux', title: 'Settings & Profile UX', description: 'Settings page design standards', filename: 'SETTINGS_PROFILE_UX.md', category: 'guides' },
        { id: 'theming', title: 'Theming Guide', description: 'Dark/light mode implementation', filename: 'THEMING.md', category: 'guides' },
        { id: 'changelog-guide', title: 'Changelog Management', description: 'How to update the changelog system', filename: 'CHANGELOG_GUIDE.md', category: 'guides' },
      ],
    },
    {
      id: 'planning',
      title: 'Planning & Research',
      description: 'Product planning, competitive analysis, and sprint documentation',
      icon: '📋',
      docs: [
        { id: 'competitive', title: 'Competitive Analysis', description: 'Market research and feature gaps', filename: 'COMPETITIVE_ANALYSIS.md', category: 'planning' },
        { id: 'cost-analysis', title: 'Cost Analysis', description: 'Infrastructure costs and projections', filename: 'COST_ANALYSIS.md', category: 'planning' },
        { id: 'phase1-backlog', title: 'Phase 1 Backlog', description: 'MVP features (Sprints 0-8)', filename: 'PHASE1_BACKLOG.md', category: 'planning' },
        { id: 'phase2-backlog', title: 'Phase 2 Backlog', description: 'AI/CRM features (Sprints 7-16)', filename: 'PHASE2_BACKLOG.md', category: 'planning' },
      ],
    },
  ];

  ngOnInit() {
    // Initialize with all categories visible
  }

  filteredCategories = signal<DocCategory[]>(this.categories);

  selectCategory(categoryId: string | null) {
    this.selectedCategory.set(categoryId);

    if (categoryId === null) {
      this.filteredCategories.set(this.categories);
    } else {
      this.filteredCategories.set(
        this.categories.filter(cat => cat.id === categoryId)
      );
    }
  }

  getGitHubUrl(filename: string): string {
    return `https://github.com/anthropics/fitos-app/blob/main/docs/${filename}`;
  }
}
