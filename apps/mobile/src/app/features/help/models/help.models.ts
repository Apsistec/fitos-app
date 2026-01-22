/**
 * Help System Type Definitions
 *
 * Defines all interfaces and types for the FitOS Help & Documentation System.
 * Uses shared UserRole type from @fitos/shared for consistency.
 */

import type { UserRole } from '@fitos/shared';

/**
 * Help content categories for organizing documentation
 */
export type HelpCategoryId =
  | 'account-billing'
  | 'workouts-programs'
  | 'nutrition-tracking'
  | 'ai-coaching'
  | 'managing-clients'
  | 'crm-marketing'
  | 'payments'
  | 'wearables-devices'
  | 'technical-issues';

/**
 * Help category with metadata
 */
export interface HelpCategory {
  id: HelpCategoryId;
  title: string;
  description: string;
  icon: string; // Ionicon name
  articleCount: number;
  roles: UserRole[]; // Which roles can see this category
  route?: string; // Optional route for navigation
}

/**
 * Individual FAQ item
 */
export interface FAQItem {
  id: string;
  question: string;
  answer: string; // HTML string for rich formatting
  category: HelpCategoryId;
  roles: UserRole[]; // Which roles can see this FAQ
  tags: string[]; // For search functionality
  helpful?: number; // Thumbs up count (future feature)
  notHelpful?: number; // Thumbs down count (future feature)
}

/**
 * Generic help article (for future expansion)
 */
export interface HelpArticle {
  id: string;
  title: string;
  slug: string; // URL-friendly identifier
  content: string; // HTML string
  category: HelpCategoryId;
  roles: UserRole[];
  tags: string[];
  lastUpdated: Date;
  readTime: number; // Estimated minutes to read
}

/**
 * Individual step in a getting started checklist
 */
export interface GettingStartedStep {
  id: string;
  title: string;
  description: string;
  icon: string; // Ionicon name
  route?: string; // Deep link to feature
  optional?: boolean; // Is this step optional?
  completed?: boolean; // Tracked in localStorage
}

/**
 * Role-specific getting started guide
 */
export interface GettingStartedGuide {
  role: UserRole;
  title: string;
  description: string;
  estimatedTime: string; // e.g., "10-15 minutes"
  steps: GettingStartedStep[];
}

/**
 * Section within a feature guide
 */
export interface FeatureGuideSection {
  id: string;
  title: string;
  icon?: string; // Optional ionicon name
  content: string; // HTML string with instructions
  tips?: string[]; // Pro tips for this section
}

/**
 * Comprehensive feature guide
 */
export interface FeatureGuide {
  id: string;
  title: string;
  slug: string; // URL-friendly identifier
  description: string;
  icon: string; // Ionicon name
  roles: UserRole[]; // Which roles can access this guide
  sections: FeatureGuideSection[];
  videoUrl?: string; // Optional tutorial video
  relatedGuides?: string[]; // IDs of related guides
  lastUpdated: Date;
  estimatedReadTime: number; // Minutes
}

/**
 * Search result item (union of all searchable content)
 */
export interface SearchResult {
  id: string;
  type: 'faq' | 'guide' | 'article';
  title: string;
  excerpt: string; // Short preview of content
  matchScore: number; // Relevance score
  route: string; // Navigation route
  icon?: string;
}

/**
 * Support ticket category
 */
export type SupportCategory = 'bug' | 'feature_request' | 'billing' | 'other';

/**
 * Device information for support tickets
 */
export interface DeviceInfo {
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  osVersion: string;
  deviceModel: string;
}

/**
 * Support ticket submission payload
 */
export interface SupportTicketPayload {
  category: SupportCategory;
  subject: string;
  description: string;
  deviceInfo: DeviceInfo;
  screenshotUrl?: string;
}

/**
 * Support ticket response
 */
export interface SupportTicketResponse {
  success: boolean;
  ticketId: string;
  message: string;
}
