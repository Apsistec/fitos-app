import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface RoadmapItem {
  title: string;
  description: string;
  status: 'completed' | 'in-progress' | 'planned';
  quarter: string;
}

@Component({
  selector: 'app-roadmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="roadmap-container">
      <div class="roadmap-header">
        <h1>Product Roadmap</h1>
        <p class="subtitle">See what we're building next for FitOS</p>
      </div>

      <div class="roadmap-content">
        @for (item of roadmapItems; track item.title) {
          <div class="roadmap-item" [class.completed]="item.status === 'completed'" [class.in-progress]="item.status === 'in-progress'">
            <div class="status-badge">
              @if (item.status === 'completed') {
                <span class="badge completed">✓ Completed</span>
              } @else if (item.status === 'in-progress') {
                <span class="badge in-progress">⚡ In Progress</span>
              } @else {
                <span class="badge planned">📋 Planned</span>
              }
              <span class="quarter">{{ item.quarter }}</span>
            </div>
            <h3>{{ item.title }}</h3>
            <p>{{ item.description }}</p>
          </div>
        }
      </div>

      <div class="feedback-section">
        <h2>Have a feature request?</h2>
        <p>We'd love to hear from you. Email us at <a href="mailto:feedback@fitos.app">feedback@fitos.app</a></p>
      </div>
    </div>
  `,
  styles: [`
    .roadmap-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 64px 16px 120px;
    }

    .roadmap-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .roadmap-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
    }

    .roadmap-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 64px;
    }

    .roadmap-item {
      padding: 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
      transition: all 0.25s ease;
    }

    .roadmap-item:hover {
      border-color: var(--fitos-border-strong);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }

    .roadmap-item.completed {
      opacity: 0.7;
    }

    .roadmap-item.in-progress {
      border-color: var(--fitos-accent-primary);
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent);
    }

    .status-badge {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .badge.completed {
      background-color: rgba(16, 185, 129, 0.2);
      color: var(--fitos-accent-primary);
    }

    .badge.in-progress {
      background-color: rgba(139, 92, 246, 0.2);
      color: var(--fitos-accent-secondary);
    }

    .badge.planned {
      background-color: var(--fitos-bg-tertiary);
      color: var(--fitos-text-secondary);
    }

    .quarter {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
      font-weight: 500;
    }

    .roadmap-item h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .roadmap-item p {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--fitos-text-secondary);
    }

    .feedback-section {
      text-align: center;
      padding: 48px 32px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .feedback-section h2 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .feedback-section p {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
    }

    .feedback-section a {
      color: var(--fitos-accent-primary);
      text-decoration: underline;
      font-weight: 500;
    }

    .feedback-section a:hover {
      color: var(--fitos-accent-secondary);
    }

    @media (max-width: 768px) {
      .roadmap-container {
        padding: 48px 16px 80px;
      }

      .roadmap-header h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .roadmap-item {
        padding: 24px;
      }

      .status-badge {
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }
    }
  `],
})
export class RoadmapComponent {
  roadmapItems: RoadmapItem[] = [
    {
      title: 'Core Platform (MVP)',
      description: 'Exercise library, workout builder, nutrition tracking, client management, payments, and wearable integration.',
      status: 'completed',
      quarter: 'Q4 2025',
    },
    {
      title: 'Dark Mode Redesign',
      description: 'Complete design system overhaul with dark-first approach, optimized for gym environments with high-contrast text.',
      status: 'in-progress',
      quarter: 'Q1 2026',
    },
    {
      title: 'Voice Workout Logging',
      description: 'Hands-free workout tracking with voice commands powered by Deepgram. Log sets, reps, and weight without touching your phone.',
      status: 'planned',
      quarter: 'Q1 2026',
    },
    {
      title: 'Photo Nutrition Analysis',
      description: 'Snap a photo of your meal and get transparent nutrition breakdown with AI-powered food recognition.',
      status: 'planned',
      quarter: 'Q1-Q2 2026',
    },
    {
      title: 'Built-in CRM & Email Marketing',
      description: 'Lead pipeline management, automated email sequences, and client communication tools - no external tools needed.',
      status: 'planned',
      quarter: 'Q2 2026',
    },
    {
      title: 'AI Coaching Agents',
      description: 'Multi-agent AI system that learns trainer methodology and provides proactive coaching interventions.',
      status: 'planned',
      quarter: 'Q2 2026',
    },
    {
      title: 'Apple Watch App',
      description: 'Native watchOS companion app for glanceable workout tracking and real-time heart rate monitoring.',
      status: 'planned',
      quarter: 'Q2-Q3 2026',
    },
    {
      title: 'Advanced Analytics',
      description: 'Comprehensive insights dashboard with progress trends, adherence metrics, and predictive analytics.',
      status: 'planned',
      quarter: 'Q3 2026',
    },
  ];
}
