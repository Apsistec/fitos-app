/**
 * Help Service
 *
 * Central service for managing help content, search functionality,
 * and progress tracking for the getting started guides.
 */

import { Injectable, inject, signal, computed } from '@angular/core';
import type { UserRole } from '@fitos/shared';
import type {
  FAQItem,
  HelpCategory,
  GettingStartedGuide,
  GettingStartedStep,
  FeatureGuide,
  SearchResult,
  HelpCategoryId,
} from '@fitos/libs';
import { FAQ_ITEMS, FAQ_CATEGORIES } from '@fitos/libs';
import { GETTING_STARTED_GUIDES } from '@fitos/libs';
import { FEATURE_GUIDES } from '@fitos/libs';

@Injectable({
  providedIn: 'root',
})
export class HelpService {
  private readonly STORAGE_KEY = 'fitos_help_progress';

  // Signals for reactive state
  private _completedSteps = signal<Set<string>>(new Set());

  // Public computed signals
  readonly completedSteps = this._completedSteps.asReadonly();

  constructor() {
    this.loadProgress();
  }

  /**
   * Search across all help content (FAQs, guides, articles)
   */
  searchContent(query: string, userRole: UserRole): SearchResult[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results: SearchResult[] = [];

    // Search FAQs
    const faqs = this.getFAQsByRole(userRole);
    faqs.forEach((faq) => {
      const questionMatch = faq.question.toLowerCase().includes(searchTerm);
      const answerMatch = faq.answer.toLowerCase().includes(searchTerm);
      const tagMatch = faq.tags.some((tag) =>
        tag.toLowerCase().includes(searchTerm)
      );

      if (questionMatch || answerMatch || tagMatch) {
        const matchScore = questionMatch ? 3 : tagMatch ? 2 : 1;
        results.push({
          id: faq.id,
          type: 'faq',
          title: faq.question,
          excerpt: this.stripHtml(faq.answer).substring(0, 150) + '...',
          matchScore,
          route: `/tabs/settings/help/faq/${faq.category}`,
          icon: 'help-circle-outline',
        });
      }
    });

    // Search Feature Guides
    const guides = this.getFeatureGuidesByRole(userRole);
    guides.forEach((guide) => {
      const titleMatch = guide.title.toLowerCase().includes(searchTerm);
      const descMatch = guide.description.toLowerCase().includes(searchTerm);
      const contentMatch = guide.sections.some((section) =>
        section.content.toLowerCase().includes(searchTerm)
      );

      if (titleMatch || descMatch || contentMatch) {
        const matchScore = titleMatch ? 3 : descMatch ? 2 : 1;
        results.push({
          id: guide.id,
          type: 'guide',
          title: guide.title,
          excerpt: guide.description,
          matchScore,
          route: `/tabs/settings/help/guide/${guide.slug}`,
          icon: guide.icon,
        });
      }
    });

    // Sort by match score (highest first)
    return results.sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Get all FAQ categories filtered by user role
   */
  getCategories(userRole: UserRole): HelpCategory[] {
    return FAQ_CATEGORIES.filter((category) =>
      category.roles.includes(userRole)
    );
  }

  /**
   * Get all FAQs filtered by user role
   */
  getFAQsByRole(userRole: UserRole): FAQItem[] {
    return FAQ_ITEMS.filter((faq) => faq.roles.includes(userRole));
  }

  /**
   * Get FAQs by category and role
   */
  getFAQsByCategory(categoryId: HelpCategoryId, userRole: UserRole): FAQItem[] {
    return FAQ_ITEMS.filter(
      (faq) => faq.category === categoryId && faq.roles.includes(userRole)
    );
  }

  /**
   * Get a specific FAQ by ID
   */
  getFAQById(id: string): FAQItem | undefined {
    return FAQ_ITEMS.find((faq) => faq.id === id);
  }

  /**
   * Get getting started guide for a specific role
   */
  getGettingStartedGuide(userRole: UserRole): GettingStartedGuide | undefined {
    const guide = GETTING_STARTED_GUIDES.find((g) => g.role === userRole);
    if (!guide) return undefined;

    // Merge completion status from localStorage
    const completedStepIds = this._completedSteps();
    return {
      ...guide,
      steps: guide.steps.map((step) => ({
        ...step,
        completed: completedStepIds.has(step.id),
      })),
    };
  }

  /**
   * Get all feature guides filtered by role
   */
  getFeatureGuidesByRole(userRole: UserRole): FeatureGuide[] {
    return FEATURE_GUIDES.filter((guide) => guide.roles.includes(userRole));
  }

  /**
   * Get a specific feature guide by slug
   */
  getFeatureGuideBySlug(slug: string): FeatureGuide | undefined {
    return FEATURE_GUIDES.find((guide) => guide.slug === slug);
  }

  /**
   * Get related feature guides
   */
  getRelatedGuides(guideId: string, userRole: UserRole): FeatureGuide[] {
    const guide = FEATURE_GUIDES.find((g: FeatureGuide) => g.id === guideId);
    if (!guide || !guide.relatedGuides) return [];

    return FEATURE_GUIDES.filter(
      (g: FeatureGuide) =>
        guide.relatedGuides?.includes(g.id) && g.roles.includes(userRole)
    );
  }

  /**
   * Mark a getting started step as complete
   */
  markStepComplete(stepId: string): void {
    const updated = new Set(this._completedSteps());
    updated.add(stepId);
    this._completedSteps.set(updated);
    this.saveProgress();
  }

  /**
   * Mark a getting started step as incomplete
   */
  markStepIncomplete(stepId: string): void {
    const updated = new Set(this._completedSteps());
    updated.delete(stepId);
    this._completedSteps.set(updated);
    this.saveProgress();
  }

  /**
   * Check if a step is complete
   */
  isStepComplete(stepId: string): boolean {
    return this._completedSteps().has(stepId);
  }

  /**
   * Get completion progress for a guide
   */
  getGuideProgress(userRole: UserRole): { completed: number; total: number; percentage: number } {
    const guide = this.getGettingStartedGuide(userRole);
    if (!guide) return { completed: 0, total: 0, percentage: 0 };

    const total = guide.steps.length;
    const completed = guide.steps.filter((step: GettingStartedStep) => step.completed).length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return { completed, total, percentage };
  }

  /**
   * Reset all progress (clear completed steps)
   */
  resetProgress(): void {
    this._completedSteps.set(new Set());
    this.saveProgress();
  }

  /**
   * Load progress from localStorage
   */
  private loadProgress(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const stepIds = JSON.parse(stored) as string[];
        this._completedSteps.set(new Set(stepIds));
      }
    } catch (error) {
      console.error('Failed to load help progress:', error);
    }
  }

  /**
   * Save progress to localStorage
   */
  private saveProgress(): void {
    try {
      const stepIds = Array.from(this._completedSteps());
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stepIds));
    } catch (error) {
      console.error('Failed to save help progress:', error);
    }
  }

  /**
   * Strip HTML tags from a string for search excerpts
   */
  private stripHtml(html: string): string {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  }
}
