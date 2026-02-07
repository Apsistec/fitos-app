/**
 * Help Service
 *
 * Central service for managing help content, search functionality,
 * and progress tracking for the getting started guides.
 *
 * Step completion is computed from real app state (profile data,
 * connected services, logged workouts, etc.) rather than manual toggles.
 */

import { Injectable, inject, signal } from '@angular/core';
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
import { AuthService } from '../../../core/services/auth.service';
import { TerraService } from '../../../core/services/terra.service';
import { WorkoutService } from '../../../core/services/workout.service';
import { WorkoutSessionService } from '../../../core/services/workout-session.service';
import { NutritionService } from '../../../core/services/nutrition.service';
import { MessagingService } from '../../../core/services/messaging.service';
import { StripeService } from '../../../core/services/stripe.service';
import { ClientService } from '../../../core/services/client.service';
import { AssignmentService } from '../../../core/services/assignment.service';
import { EmailTemplateService } from '../../../core/services/email-template.service';
import { LeadService } from '../../../core/services/lead.service';
import { MeasurementService } from '../../../core/services/measurement.service';
import { InvitationService } from '../../../core/services/invitation.service';
import { TrainerMethodologyService } from '../../../core/services/trainer-methodology.service';

@Injectable({
  providedIn: 'root',
})
export class HelpService {
  private authService = inject(AuthService);
  private terraService = inject(TerraService);
  private workoutService = inject(WorkoutService);
  private workoutSessionService = inject(WorkoutSessionService);
  private nutritionService = inject(NutritionService);
  private messagingService = inject(MessagingService);
  private stripeService = inject(StripeService);
  private clientService = inject(ClientService);
  private assignmentService = inject(AssignmentService);
  private emailTemplateService = inject(EmailTemplateService);
  private leadService = inject(LeadService);
  private measurementService = inject(MeasurementService);
  private invitationService = inject(InvitationService);
  private trainerMethodologyService = inject(TrainerMethodologyService);

  // Async completion checks stored as signals
  private _hasLoggedWorkout = signal(false);
  private _hasLoggedMeal = signal(false);
  private _hasSentMessage = signal(false);
  private _hasMethodologySetup = signal(false);
  private _asyncChecksLoaded = signal(false);

  constructor() {}

  /**
   * Load async completion data that can't be derived from existing signals.
   * Call this when the Getting Started page is opened.
   */
  async loadCompletionData(): Promise<void> {
    if (this._asyncChecksLoaded()) return;

    const profile = this.authService.profile();
    if (!profile) return;

    const checks: Promise<void>[] = [];

    // Check if user has logged a workout (client)
    if (profile.role === 'client') {
      checks.push(
        this.workoutSessionService.getWorkoutCount(profile.id, 365).then(count => {
          this._hasLoggedWorkout.set(count > 0);
        })
      );
    }

    // Check nutrition log
    checks.push(
      (async () => {
        const log = this.nutritionService.currentLogSignal();
        this._hasLoggedMeal.set(
          !!(log?.entries && log.entries.length > 0)
        );
      })()
    );

    // Check messaging
    checks.push(
      (async () => {
        const conversations = this.messagingService.conversationsSignal();
        this._hasSentMessage.set(conversations.length > 0);
      })()
    );

    // Check trainer methodology setup
    if (profile.role === 'trainer' || profile.role === 'gym_owner') {
      checks.push(
        this.trainerMethodologyService.hasCompletedSetup().then(result => {
          this._hasMethodologySetup.set(result);
        })
      );
    }

    await Promise.allSettled(checks);
    this._asyncChecksLoaded.set(true);
  }

  /**
   * Check if a specific step is complete based on real app state.
   */
  private isStepCompleteFromState(stepId: string): boolean {
    switch (stepId) {
      // --- Client Steps ---
      case 'client-step-1': // Complete Your Profile
        return this.isProfileComplete();
      case 'client-step-2': // Connect a Wearable Device
        return this.terraService.connections().some(c => c.is_active);
      case 'client-step-3': // View Your Assigned Workout
        return this.assignmentService.assignments().length > 0;
      case 'client-step-4': // Log Your First Workout
        return this._hasLoggedWorkout();
      case 'client-step-5': // Try Voice Logging (checked same as workout logged - no separate tracking)
        return this._hasLoggedWorkout();
      case 'client-step-6': // Log Your First Meal
        return this._hasLoggedMeal();
      case 'client-step-7': // Message Your Trainer
        return this._hasSentMessage();
      case 'client-step-8': // Check Your Progress
        return this.measurementService.measurementsSignal().length > 0 ||
               this.measurementService.photosSignal().length > 0;

      // --- Trainer Steps ---
      case 'trainer-step-1': // Complete Your Profile
        return this.isProfileComplete();
      case 'trainer-step-2': // Connect Stripe for Payments
        return this.stripeService.isConnected();
      case 'trainer-step-3': // Set Your Pricing Tiers
        return this.stripeService.isConnected() && !this.stripeService.requiresAction();
      case 'trainer-step-4': // Configure AI Methodology
        return this._hasMethodologySetup();
      case 'trainer-step-5': // Create Your First Workout Template
        return this.workoutService.templates().length > 0;
      case 'trainer-step-6': // Invite Your First Client
        return this.invitationService.invitations().length > 0 ||
               this.clientService.clients().length > 0;
      case 'trainer-step-7': // Assign a Program
        return this.assignmentService.assignments().length > 0;
      case 'trainer-step-8': // Set Up Email Sequences
        return this.emailTemplateService.sequences().length > 0;

      // --- Gym Owner Steps ---
      case 'owner-step-1': // Complete Your Profile
        return this.isProfileComplete();
      case 'owner-step-2': // Connect Stripe for Payments
        return this.stripeService.isConnected();
      case 'owner-step-3': // Add Your Gym Locations
        // Gym location data isn't tracked via a dedicated service signal yet;
        // fall back to false until that feature is implemented
        return false;
      case 'owner-step-4': // Invite Staff Trainers
        return this.clientService.clients().length > 0;
      case 'owner-step-5': // Set Pricing Tiers
        return this.stripeService.isConnected() && !this.stripeService.requiresAction();
      case 'owner-step-6': // Configure Revenue Sharing
        // Revenue sharing config isn't tracked via a signal yet
        return false;
      case 'owner-step-7': // Create Workout Templates
        return this.workoutService.templates().length > 0;
      case 'owner-step-8': // Set Up Lead Pipeline
        return this.leadService.leads().length > 0 ||
               this.leadService.pipelineStages().length > 0;
      case 'owner-step-9': // Create Email Marketing Campaigns
        return this.emailTemplateService.sequences().length > 0;
      case 'owner-step-10': // Review Business Analytics
        // No direct tracking for "viewed analytics"; consider complete if they have clients
        return this.clientService.clients().length > 0;

      default:
        return false;
    }
  }

  private isProfileComplete(): boolean {
    const profile = this.authService.profile();
    return !!(profile?.fullName);
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
   * Get getting started guide for a specific role.
   * Completion status is derived from real app state.
   */
  getGettingStartedGuide(userRole: UserRole): GettingStartedGuide | undefined {
    const guide = GETTING_STARTED_GUIDES.find((g) => g.role === userRole);
    if (!guide) return undefined;

    return {
      ...guide,
      steps: guide.steps.map((step) => ({
        ...step,
        completed: this.isStepCompleteFromState(step.id),
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
   * Check if a step is complete based on real app state
   */
  isStepComplete(stepId: string): boolean {
    return this.isStepCompleteFromState(stepId);
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
   * Refresh async completion data (forces re-check)
   */
  async refreshCompletionData(): Promise<void> {
    this._asyncChecksLoaded.set(false);
    await this.loadCompletionData();
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
