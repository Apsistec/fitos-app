import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface BlogPost {
  title: string;
  excerpt: string;
  date: string;
  category: string;
  readTime: string;
  slug: string;
}

@Component({
  selector: 'app-blog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="blog-container">
      <div class="blog-header">
        <h1>FitOS Blog</h1>
        <p class="subtitle">Insights on fitness technology, coaching, and business growth</p>
      </div>

      <div class="blog-grid">
        @for (post of blogPosts; track post.slug) {
          <article class="blog-card">
            <div class="card-header">
              <span class="category">{{ post.category }}</span>
              <span class="read-time">{{ post.readTime }} read</span>
            </div>
            <h2>{{ post.title }}</h2>
            <p class="excerpt">{{ post.excerpt }}</p>
            <div class="card-footer">
              <span class="date">{{ post.date }}</span>
              <a href="#" class="read-more">Read More →</a>
            </div>
          </article>
        }
      </div>

      <div class="coming-soon">
        <h3>Coming Soon</h3>
        <p>We're launching our blog with in-depth articles on fitness coaching, technology, and business growth. Check back soon!</p>
      </div>
    </div>
  `,
  styles: [`
    .blog-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 64px 16px 120px;
    }

    .blog-header {
      text-align: center;
      margin-bottom: 64px;
    }

    .blog-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
    }

    .blog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 32px;
      margin-bottom: 64px;
    }

    .blog-card {
      padding: 32px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
      transition: all 0.25s ease;
      display: flex;
      flex-direction: column;
    }

    .blog-card:hover {
      border-color: var(--fitos-border-strong);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
      transform: translateY(-4px);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .category {
      display: inline-block;
      padding: 4px 12px;
      background-color: rgba(16, 185, 129, 0.2);
      color: var(--fitos-accent-primary);
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .read-time {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
    }

    .blog-card h2 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
      line-height: 1.3;
    }

    .excerpt {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--fitos-text-secondary);
      margin-bottom: 24px;
      flex-grow: 1;
    }

    .card-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 16px;
      border-top: 1px solid var(--fitos-border-subtle);
    }

    .date {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
    }

    .read-more {
      color: var(--fitos-accent-primary);
      font-weight: 600;
      text-decoration: none;
      transition: color 0.25s ease;
    }

    .read-more:hover {
      color: var(--fitos-accent-secondary);
    }

    .coming-soon {
      text-align: center;
      padding: 64px 32px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .coming-soon h3 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .coming-soon p {
      font-size: 1.125rem;
      color: var(--fitos-text-secondary);
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .blog-container {
        padding: 48px 16px 80px;
      }

      .blog-header h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .blog-grid {
        grid-template-columns: 1fr;
        gap: 24px;
      }

      .blog-card {
        padding: 24px;
      }
    }
  `],
})
export class BlogComponent {
  blogPosts: BlogPost[] = [
    {
      title: 'Why Per-Client Pricing Is Killing Your Training Business',
      excerpt: 'Most fitness software charges per client, creating a perverse incentive to limit growth. Learn why flat pricing is the future of trainer software.',
      date: 'Coming Soon',
      category: 'Business',
      readTime: '5 min',
      slug: 'per-client-pricing-problem',
    },
    {
      title: 'Voice Logging: The Future of Workout Tracking',
      excerpt: 'Reduce workout friction by 80% with hands-free logging. Discover how voice commands are transforming the gym experience.',
      date: 'Coming Soon',
      category: 'Technology',
      readTime: '4 min',
      slug: 'voice-logging-future',
    },
    {
      title: 'The Psychology of Adherence-Neutral Nutrition',
      excerpt: 'Why we never use red for "over target" and how color psychology affects client adherence to nutrition plans.',
      date: 'Coming Soon',
      category: 'Coaching',
      readTime: '6 min',
      slug: 'adherence-neutral-nutrition',
    },
  ];
}
