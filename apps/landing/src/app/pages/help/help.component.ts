import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="help-container">
      <div class="help-header">
        <h1>Help Center</h1>
        <p class="subtitle">Find answers to common questions about FitOS</p>
      </div>

      <div class="search-section">
        <input
          type="text"
          [(ngModel)]="searchQuery"
          (input)="filterFAQs()"
          placeholder="Search for help..."
          class="search-input"
        />
      </div>

      <div class="categories">
        @for (category of categories; track category) {
          <button
            class="category-pill"
            [class.active]="selectedCategory() === category"
            (click)="selectCategory(category)"
          >
            {{ category }}
          </button>
        }
      </div>

      <div class="faq-content">
        @if (filteredFAQs().length === 0) {
          <div class="no-results">
            <p>No results found for "{{ searchQuery }}"</p>
            <p class="hint">Try different keywords or browse by category</p>
          </div>
        } @else {
          @for (faq of filteredFAQs(); track faq.question) {
            <div class="faq-item">
              <h3 class="question">{{ faq.question }}</h3>
              <p class="answer">{{ faq.answer }}</p>
            </div>
          }
        }
      </div>

      <div class="contact-section">
        <h2>Still need help?</h2>
        <p>Can't find what you're looking for? Contact our support team.</p>
        <a href="mailto:support@fitos.app" class="contact-button">
          Contact Support
        </a>
      </div>
    </div>
  `,
  styles: [`
    .help-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 64px 16px 120px;
    }

    .help-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .help-header h1 {
      font-size: 3rem;
      font-weight: 700;
      margin-bottom: 16px;
      color: var(--fitos-text-primary);
    }

    .subtitle {
      font-size: 1.25rem;
      color: var(--fitos-text-secondary);
    }

    .search-section {
      margin-bottom: 32px;
    }

    .search-input {
      width: 100%;
      padding: 16px 20px;
      font-size: 1rem;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
      color: var(--fitos-text-primary);
      transition: all 0.25s ease;
    }

    .search-input::placeholder {
      color: var(--fitos-text-tertiary);
    }

    .search-input:focus {
      outline: none;
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }

    .categories {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 48px;
      justify-content: center;
    }

    .category-pill {
      padding: 10px 20px;
      border-radius: 24px;
      border: 1px solid var(--fitos-border-default);
      background-color: var(--fitos-bg-secondary);
      color: var(--fitos-text-secondary);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .category-pill:hover {
      border-color: var(--fitos-accent-primary);
      color: var(--fitos-accent-primary);
    }

    .category-pill.active {
      background-color: var(--fitos-accent-primary);
      border-color: var(--fitos-accent-primary);
      color: white;
    }

    .faq-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
      margin-bottom: 64px;
    }

    .faq-item {
      padding: 24px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
      transition: all 0.25s ease;
    }

    .faq-item:hover {
      border-color: var(--fitos-border-strong);
    }

    .question {
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .answer {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--fitos-text-secondary);
    }

    .no-results {
      text-align: center;
      padding: 64px 32px;
    }

    .no-results p {
      font-size: 1.125rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 8px;
    }

    .no-results .hint {
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
    }

    .contact-section {
      text-align: center;
      padding: 48px 32px;
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid var(--fitos-border-default);
      border-radius: 12px;
    }

    .contact-section h2 {
      font-size: 1.75rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .contact-section p {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 24px;
    }

    .contact-button {
      display: inline-block;
      padding: 12px 32px;
      background-color: var(--fitos-accent-primary);
      color: white;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.25s ease;
    }

    .contact-button:hover {
      background-color: var(--fitos-accent-secondary);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }

    @media (max-width: 768px) {
      .help-container {
        padding: 48px 16px 80px;
      }

      .help-header h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 1rem;
      }

      .categories {
        justify-content: flex-start;
      }
    }
  `],
})
export class HelpComponent {
  searchQuery = '';
  selectedCategory = signal<string>('All');

  categories = ['All', 'Getting Started', 'Workouts', 'Nutrition', 'Clients', 'Billing', 'Technical'];

  allFAQs: FAQItem[] = [
    {
      question: 'How do I get started with FitOS?',
      answer: 'Sign up at app.fitos.app, choose your role (trainer or client), complete the onboarding flow, and start exploring! Trainers can immediately create workouts and invite clients. Clients need an invitation from their trainer.',
      category: 'Getting Started',
    },
    {
      question: 'What is the pricing model for trainers?',
      answer: 'FitOS costs $49/month for trainers with unlimited clients. There are no per-client fees, allowing you to scale your business without increasing costs.',
      category: 'Billing',
    },
    {
      question: 'Do clients pay separately?',
      answer: 'No. Clients access FitOS for free. You (the trainer) set your own coaching fees and handle payments directly with your clients outside the platform.',
      category: 'Billing',
    },
    {
      question: 'How do I create a workout program?',
      answer: 'Navigate to the Workouts tab, tap "New Program", select exercises from our 500+ exercise library, set sets/reps/rest periods, and assign to clients. Programs can be one-time or recurring.',
      category: 'Workouts',
    },
    {
      question: 'Can clients log workouts with voice commands?',
      answer: 'Voice logging is coming in Q1 2026! This feature will allow hands-free workout tracking with commands like "10 reps at 185 pounds".',
      category: 'Workouts',
    },
    {
      question: 'How does nutrition tracking work?',
      answer: 'Clients can log meals manually by searching our food database, or use voice logging (e.g., "two eggs and toast"). Photo nutrition analysis is coming in Q1-Q2 2026.',
      category: 'Nutrition',
    },
    {
      question: 'What does "adherence-neutral" mean?',
      answer: 'We never use red or "danger" colors when clients exceed nutrition targets. Going over isn\'t a failure - it\'s data. This reduces guilt and promotes a healthier relationship with tracking.',
      category: 'Nutrition',
    },
    {
      question: 'How do I invite clients to FitOS?',
      answer: 'Go to the Clients tab, tap "Invite Client", enter their email, and they\'ll receive an invitation link to create their account and connect with you.',
      category: 'Clients',
    },
    {
      question: 'Can I see my clients\' workout history?',
      answer: 'Yes! Tap any client in the Clients tab to view their workout logs, nutrition data, progress photos, and wearable metrics (if connected).',
      category: 'Clients',
    },
    {
      question: 'Which wearable devices are supported?',
      answer: 'FitOS integrates with Apple Health, Google Fit, Fitbit, Garmin, Oura, and WHOOP via Terra API. Clients can connect their devices in Settings.',
      category: 'Technical',
    },
    {
      question: 'Does FitOS work offline?',
      answer: 'Yes! Workout logging and nutrition tracking work offline. Data syncs automatically when you reconnect to the internet.',
      category: 'Technical',
    },
    {
      question: 'Is there a dark mode?',
      answer: 'Dark mode is the default! FitOS is designed dark-first for optimal visibility in gym environments. You can switch to light mode in Settings if preferred.',
      category: 'Technical',
    },
    {
      question: 'How do I cancel my subscription?',
      answer: 'Go to Settings > Billing > Manage Subscription. You can cancel anytime - no long-term contracts. Your access continues until the end of your billing period.',
      category: 'Billing',
    },
    {
      question: 'What happens to my data if I cancel?',
      answer: 'Your data is retained for 90 days after cancellation. You can export all client data before canceling. After 90 days, data is permanently deleted per our privacy policy.',
      category: 'Billing',
    },
  ];

  filteredFAQs = signal<FAQItem[]>(this.allFAQs);

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
    this.filterFAQs();
  }

  filterFAQs(): void {
    let filtered = this.allFAQs;

    // Filter by category
    if (this.selectedCategory() !== 'All') {
      filtered = filtered.filter(faq => faq.category === this.selectedCategory());
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query)
      );
    }

    this.filteredFAQs.set(filtered);
  }
}
