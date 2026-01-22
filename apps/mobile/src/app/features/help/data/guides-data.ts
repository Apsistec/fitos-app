/**
 * Getting Started Guides Data
 *
 * Role-specific onboarding checklists to help users get started with FitOS.
 * Each guide includes actionable steps with deep links to relevant features.
 */

import type { GettingStartedGuide } from '../models/help.models';

/**
 * All Getting Started Guides (one per role)
 */
export const GETTING_STARTED_GUIDES: GettingStartedGuide[] = [
  // ============================================================================
  // CLIENT GUIDE (8 steps)
  // ============================================================================
  {
    role: 'client',
    title: 'Getting Started with FitOS',
    description: 'Complete these steps to get the most out of your fitness journey',
    estimatedTime: '10-15 minutes',
    steps: [
      {
        id: 'client-step-1',
        title: 'Complete Your Profile',
        description: 'Add your name, photo, and basic information so your trainer can personalize your experience.',
        icon: 'person-outline',
        route: '/tabs/settings/profile',
        optional: false,
      },
      {
        id: 'client-step-2',
        title: 'Connect a Wearable Device',
        description: 'Sync your Apple Watch, Fitbit, or other device to automatically track sleep, heart rate, and recovery.',
        icon: 'watch-outline',
        route: '/tabs/settings/wearables',
        optional: true,
      },
      {
        id: 'client-step-3',
        title: 'View Your Assigned Workout',
        description: 'Check out the workout program your trainer created for you. Review exercises and see what\'s coming up.',
        icon: 'barbell-outline',
        route: '/tabs/workouts',
        optional: false,
      },
      {
        id: 'client-step-4',
        title: 'Log Your First Workout',
        description: 'Start today\'s workout and log your sets. Tap the suggested weights or enter your own.',
        icon: 'checkmark-circle-outline',
        route: '/tabs/workouts',
        optional: false,
      },
      {
        id: 'client-step-5',
        title: 'Try Voice Logging',
        description: 'Log sets hands-free by saying "10 reps at 185". Perfect for staying focused during your workout.',
        icon: 'mic-outline',
        route: '/tabs/workouts',
        optional: true,
      },
      {
        id: 'client-step-6',
        title: 'Log Your First Meal',
        description: 'Track your nutrition by searching for foods, taking a photo, or using voice commands.',
        icon: 'restaurant-outline',
        route: '/tabs/nutrition',
        optional: false,
      },
      {
        id: 'client-step-7',
        title: 'Message Your Trainer',
        description: 'Say hello to your trainer and ask any questions. They\'re here to help you succeed!',
        icon: 'chatbubble-outline',
        route: '/tabs/messages',
        optional: false,
      },
      {
        id: 'client-step-8',
        title: 'Check Your Progress',
        description: 'View your workout history, nutrition trends, and progress photos all in one place.',
        icon: 'trending-up-outline',
        route: '/tabs/progress',
        optional: false,
      },
    ],
  },

  // ============================================================================
  // TRAINER GUIDE (8 steps)
  // ============================================================================
  {
    role: 'trainer',
    title: 'Getting Started as a Trainer',
    description: 'Set up your coaching business and onboard your first clients',
    estimatedTime: '20-30 minutes',
    steps: [
      {
        id: 'trainer-step-1',
        title: 'Complete Your Profile',
        description: 'Add your business name, bio, certifications, and profile photo to build credibility with potential clients.',
        icon: 'person-outline',
        route: '/tabs/settings/profile',
        optional: false,
      },
      {
        id: 'trainer-step-2',
        title: 'Connect Stripe for Payments',
        description: 'Set up your Stripe account to accept payments from clients. This takes 5-10 minutes.',
        icon: 'card-outline',
        route: '/tabs/settings/pricing',
        optional: false,
      },
      {
        id: 'trainer-step-3',
        title: 'Set Your Pricing Tiers',
        description: 'Create pricing packages for your services (e.g., Basic, Premium, Elite). You can always adjust these later.',
        icon: 'pricetag-outline',
        route: '/tabs/settings/pricing',
        optional: false,
      },
      {
        id: 'trainer-step-4',
        title: 'Configure AI Methodology',
        description: 'Teach the AI your coaching style by answering a few questions. This helps AI assist your clients consistently.',
        icon: 'sparkles-outline',
        route: '/tabs/settings',
        optional: true,
      },
      {
        id: 'trainer-step-5',
        title: 'Create Your First Workout Template',
        description: 'Build a workout you can assign to clients. Use the exercise library and set prescribed sets/reps.',
        icon: 'barbell-outline',
        route: '/tabs/workouts',
        optional: false,
      },
      {
        id: 'trainer-step-6',
        title: 'Invite Your First Client',
        description: 'Add a client by entering their email. They\'ll receive an invitation to join FitOS.',
        icon: 'person-add-outline',
        route: '/tabs/clients',
        optional: false,
      },
      {
        id: 'trainer-step-7',
        title: 'Assign a Program',
        description: 'Once your client accepts, assign them a workout program and set their nutrition targets.',
        icon: 'calendar-outline',
        route: '/tabs/clients',
        optional: false,
      },
      {
        id: 'trainer-step-8',
        title: 'Set Up Email Sequences',
        description: 'Create automated welcome and check-in emails to save time and stay consistent with communication.',
        icon: 'mail-outline',
        route: '/tabs/clients',
        optional: true,
      },
    ],
  },

  // ============================================================================
  // GYM OWNER GUIDE (10 steps - includes trainer responsibilities + gym management)
  // ============================================================================
  {
    role: 'gym_owner',
    title: 'Getting Started as a Gym Owner',
    description: 'Set up your gym, add staff trainers, and manage your business',
    estimatedTime: '30-40 minutes',
    steps: [
      {
        id: 'owner-step-1',
        title: 'Complete Your Profile',
        description: 'Add your gym name, business information, and branding to establish your presence.',
        icon: 'person-outline',
        route: '/tabs/settings/profile',
        optional: false,
      },
      {
        id: 'owner-step-2',
        title: 'Connect Stripe for Payments',
        description: 'Set up your Stripe account to accept payments from clients and manage trainer payouts.',
        icon: 'card-outline',
        route: '/tabs/settings/pricing',
        optional: false,
      },
      {
        id: 'owner-step-3',
        title: 'Add Your Gym Locations',
        description: 'Register all your gym locations with addresses and operating hours.',
        icon: 'location-outline',
        route: '/tabs/settings',
        optional: false,
      },
      {
        id: 'owner-step-4',
        title: 'Invite Staff Trainers',
        description: 'Add your trainers to the platform. They can start coaching clients under your gym brand.',
        icon: 'people-outline',
        route: '/tabs/staff',
        optional: false,
      },
      {
        id: 'owner-step-5',
        title: 'Set Pricing Tiers',
        description: 'Create pricing packages for your services. These can be used by all trainers at your gym.',
        icon: 'pricetag-outline',
        route: '/tabs/settings/pricing',
        optional: false,
      },
      {
        id: 'owner-step-6',
        title: 'Configure Revenue Sharing',
        description: 'Set commission rates for your trainers (e.g., 70/30 split).',
        icon: 'analytics-outline',
        route: '/tabs/settings',
        optional: false,
      },
      {
        id: 'owner-step-7',
        title: 'Create Workout Templates',
        description: 'Build a library of workouts that all trainers can use, ensuring consistency across your gym.',
        icon: 'barbell-outline',
        route: '/tabs/workouts',
        optional: true,
      },
      {
        id: 'owner-step-8',
        title: 'Set Up Lead Pipeline',
        description: 'Configure your CRM pipeline to track leads from inquiry to paying member.',
        icon: 'funnel-outline',
        route: '/tabs/clients',
        optional: true,
      },
      {
        id: 'owner-step-9',
        title: 'Create Email Marketing Campaigns',
        description: 'Set up automated email sequences for lead nurturing and member retention.',
        icon: 'mail-outline',
        route: '/tabs/clients',
        optional: true,
      },
      {
        id: 'owner-step-10',
        title: 'Review Business Analytics',
        description: 'Check your dashboard for revenue, client retention, and trainer performance metrics.',
        icon: 'stats-chart-outline',
        route: '/tabs/dashboard',
        optional: false,
      },
    ],
  },
];
