import { Component, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FAQ_ITEMS, FAQ_CATEGORIES, AccordionComponent } from '@fitos/libs';
import type { FAQItem, HelpCategory, AccordionItem } from '@fitos/libs';

@Component({
  selector: 'app-help',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, AccordionComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
        <button
          class="category-pill"
          [class.active]="selectedCategory() === null"
          (click)="selectCategory(null)"
        >
          All
        </button>
        @for (category of categories; track category.id) {
          <button
            class="category-pill"
            [class.active]="selectedCategory() === category.id"
            (click)="selectCategory(category.id)"
          >
            {{ category.title }}
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
          <lib-accordion [items]="accordionItems()" [singleExpand]="true" />
        }
      </div>

      <div class="contact-section">
        <h2>Still need help?</h2>
        <p class="section-description">Can't find what you're looking for? Submit a support request and we'll get back to you within 24 hours.</p>

        @if (!showTicketForm()) {
          <button (click)="showTicketForm.set(true)" class="contact-button">
            Submit Support Request
          </button>
          <p class="email-option">
            Or email us directly at <a href="mailto:support@nutrifitos.com" class="email-link">support@nutrifitos.com</a>
          </p>
        }

        @if (showTicketForm()) {
          <div class="ticket-form-container">
            @if (submitSuccess()) {
              <div class="success-message">
                <div class="success-icon">✓</div>
                <h3>Support request submitted!</h3>
                <p>We've received your message and will respond within 24 hours to {{ supportForm.get('email')?.value }}.</p>
                <button (click)="resetForm()" class="secondary-button">
                  Submit Another Request
                </button>
              </div>
            } @else {
              <form [formGroup]="supportForm" (ngSubmit)="onSubmitTicket()" class="support-form">
                <div class="form-row">
                  <div class="form-group">
                    <label for="name">Name *</label>
                    <input
                      type="text"
                      id="name"
                      formControlName="name"
                      class="form-input"
                      placeholder="Your name"
                    />
                    @if (supportForm.get('name')?.invalid && supportForm.get('name')?.touched) {
                      <span class="error-text">Name is required</span>
                    }
                  </div>

                  <div class="form-group">
                    <label for="email">Email *</label>
                    <input
                      type="email"
                      id="email"
                      formControlName="email"
                      class="form-input"
                      placeholder="your@email.com"
                    />
                    @if (supportForm.get('email')?.invalid && supportForm.get('email')?.touched) {
                      <span class="error-text">Valid email is required</span>
                    }
                  </div>
                </div>

                <div class="form-group">
                  <label for="category">Category *</label>
                  <select
                    id="category"
                    formControlName="category"
                    class="form-input"
                  >
                    <option value="">Select a category</option>
                    @for (cat of supportCategories; track cat.value) {
                      <option [value]="cat.value">{{ cat.label }}</option>
                    }
                  </select>
                  @if (supportForm.get('category')?.invalid && supportForm.get('category')?.touched) {
                    <span class="error-text">Please select a category</span>
                  }
                </div>

                <div class="form-group">
                  <label for="subject">Subject *</label>
                  <input
                    type="text"
                    id="subject"
                    formControlName="subject"
                    class="form-input"
                    placeholder="Brief description of your issue"
                  />
                  @if (supportForm.get('subject')?.invalid && supportForm.get('subject')?.touched) {
                    <span class="error-text">Subject must be at least 5 characters</span>
                  }
                </div>

                <div class="form-group">
                  <label for="description">Description *</label>
                  <textarea
                    id="description"
                    formControlName="description"
                    class="form-textarea"
                    placeholder="Please provide as much detail as possible..."
                    rows="6"
                  ></textarea>
                  <div class="char-count">
                    {{ getDescriptionCharCount() }} / 2000 characters
                  </div>
                  @if (supportForm.get('description')?.invalid && supportForm.get('description')?.touched) {
                    <span class="error-text">Description must be at least 20 characters</span>
                  }
                </div>

                <div class="form-actions">
                  <button
                    type="button"
                    (click)="showTicketForm.set(false)"
                    class="secondary-button"
                    [disabled]="isSubmitting()"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    class="contact-button"
                    [disabled]="supportForm.invalid || isSubmitting()"
                  >
                    {{ isSubmitting() ? 'Submitting...' : 'Submit Request' }}
                  </button>
                </div>

                @if (submitError()) {
                  <div class="error-message">
                    {{ submitError() }}
                  </div>
                }
              </form>
            }
          </div>
        }
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
      margin-bottom: 64px;
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

    .contact-button:hover:not(:disabled) {
      background-color: var(--fitos-accent-secondary);
      box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
    }

    .contact-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .section-description {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 24px;
    }

    .email-option {
      margin-top: 16px;
      font-size: 0.875rem;
      color: var(--fitos-text-tertiary);
    }

    .email-link {
      color: var(--fitos-accent-primary);
      text-decoration: none;
      transition: color 0.25s ease;
    }

    .email-link:hover {
      color: var(--fitos-accent-secondary);
    }

    .ticket-form-container {
      margin-top: 32px;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .support-form {
      text-align: left;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--fitos-text-primary);
      margin-bottom: 8px;
    }

    .form-input,
    .form-textarea {
      width: 100%;
      padding: 12px 16px;
      font-size: 1rem;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 8px;
      color: var(--fitos-text-primary);
      transition: all 0.25s ease;
      font-family: inherit;
    }

    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: var(--fitos-accent-primary);
      box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
    }

    .form-textarea {
      resize: vertical;
      min-height: 120px;
    }

    .char-count {
      font-size: 0.75rem;
      color: var(--fitos-text-tertiary);
      text-align: right;
      margin-top: 4px;
    }

    .error-text {
      display: block;
      font-size: 0.75rem;
      color: var(--fitos-accent-danger, #ef4444);
      margin-top: 4px;
    }

    .form-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }

    .secondary-button {
      padding: 12px 24px;
      background-color: transparent;
      color: var(--fitos-text-secondary);
      border: 1px solid var(--fitos-border-default);
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .secondary-button:hover:not(:disabled) {
      border-color: var(--fitos-accent-primary);
      color: var(--fitos-accent-primary);
    }

    .secondary-button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .error-message {
      margin-top: 16px;
      padding: 12px 16px;
      background-color: color-mix(in srgb, var(--fitos-accent-danger, #ef4444) 10%, transparent);
      border: 1px solid color-mix(in srgb, var(--fitos-accent-danger, #ef4444) 30%, transparent);
      border-radius: 8px;
      color: var(--fitos-accent-danger, #ef4444);
      font-size: 0.875rem;
      text-align: center;
    }

    .success-message {
      text-align: center;
      padding: 48px 32px;
    }

    .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, var(--fitos-accent-primary), var(--fitos-accent-secondary));
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      color: white;
      font-weight: bold;
    }

    .success-message h3 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: var(--fitos-text-primary);
    }

    .success-message p {
      font-size: 1rem;
      color: var(--fitos-text-secondary);
      margin-bottom: 24px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
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
  private fb = new FormBuilder();

  searchQuery = '';
  selectedCategory = signal<string | null>(null);
  showTicketForm = signal(false);
  isSubmitting = signal(false);
  submitSuccess = signal(false);
  submitError = signal<string | null>(null);

  // Use shared comprehensive FAQ data (58 FAQs across 9 categories)
  categories: HelpCategory[] = FAQ_CATEGORIES.filter((cat: HelpCategory) =>
    // Show all categories for public help center
    cat.roles.includes('client') || cat.roles.includes('trainer')
  );

  allFAQs: FAQItem[] = FAQ_ITEMS;

  supportCategories = [
    { value: 'general', label: 'General Question' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'other', label: 'Other' },
  ];

  supportForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    category: ['', Validators.required],
    subject: ['', [Validators.required, Validators.minLength(5)]],
    description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
  });

  filteredFAQs = computed(() => {
    let filtered = this.allFAQs;

    // Filter by category
    const category = this.selectedCategory();
    if (category) {
      filtered = filtered.filter(faq => faq.category === category);
    }

    // Filter by search query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(faq =>
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        faq.tags.some((tag: string) => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  });

  accordionItems = computed<AccordionItem[]>(() => {
    return this.filteredFAQs().map(faq => ({
      id: faq.id,
      title: faq.question,
      content: faq.answer,
    }));
  });

  selectCategory(categoryId: string | null): void {
    this.selectedCategory.set(categoryId);
  }

  filterFAQs(): void {
    // Trigger computed signal update
    // The computed signal will automatically recalculate
  }

  getDescriptionCharCount(): number {
    return this.supportForm.get('description')?.value?.length || 0;
  }

  async onSubmitTicket(): Promise<void> {
    if (this.supportForm.invalid || this.isSubmitting()) {
      return;
    }

    this.isSubmitting.set(true);
    this.submitError.set(null);

    try {
      const formValue = this.supportForm.value;

      // For landing page (unauthenticated users), we'll use email fallback
      // In a real implementation, this would call a Supabase Edge Function or backend API
      // that creates a ticket and sends an email notification

      // For landing page submissions, we log the data and simulate ticket creation
      console.log('Support ticket submitted:', {
        name: formValue.name,
        email: formValue.email,
        category: formValue.category,
        subject: formValue.subject,
        description: formValue.description,
        source: 'landing_page',
        platform: 'web',
        timestamp: new Date().toISOString(),
      });

      // TODO: Replace with actual API call
      // await fetch('/api/support/ticket', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(ticketData),
      // });

      // Simulate API call for now
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For now, construct a mailto link as fallback
      const subject = encodeURIComponent(`[${formValue.category}] ${formValue.subject}`);
      const body = encodeURIComponent(
        `Name: ${formValue.name}\n` +
        `Email: ${formValue.email}\n` +
        `Category: ${formValue.category}\n\n` +
        `Description:\n${formValue.description}\n\n` +
        `---\n` +
        `Submitted from: Landing Page\n` +
        `Timestamp: ${new Date().toLocaleString()}`
      );

      // Open mailto in new tab (non-blocking)
      window.open(`mailto:support@nutrifitos.com?subject=${subject}&body=${body}`, '_blank');

      this.submitSuccess.set(true);
    } catch (error) {
      console.error('Failed to submit support ticket:', error);
      this.submitError.set(
        'Failed to submit support request. Please try again or email us directly at support@nutrifitos.com.'
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  resetForm(): void {
    this.supportForm.reset();
    this.submitSuccess.set(false);
    this.submitError.set(null);
    this.showTicketForm.set(false);
  }
}
