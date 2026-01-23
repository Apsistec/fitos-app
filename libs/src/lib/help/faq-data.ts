/**
 * FAQ Data
 *
 * Contains all FAQ items and categories for the help system.
 * Content is written in HTML format for rich formatting.
 *
 * Total FAQs: 58 items across 9 categories
 */

import type { FAQItem, HelpCategory } from './help.models';

/**
 * FAQ Categories with metadata
 */
export const FAQ_CATEGORIES: HelpCategory[] = [
  {
    id: 'account-billing',
    title: 'Account & Billing',
    description: 'Manage your account, subscription, and billing settings',
    icon: 'person-circle-outline',
    articleCount: 7,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/account-billing',
  },
  {
    id: 'workouts-programs',
    title: 'Workouts & Programs',
    description: 'Learn about workout logging, programs, and exercise library',
    icon: 'barbell-outline',
    articleCount: 8,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/workouts-programs',
  },
  {
    id: 'nutrition-tracking',
    title: 'Nutrition Tracking',
    description: 'Food logging, photo nutrition, and macro tracking',
    icon: 'restaurant-outline',
    articleCount: 7,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/nutrition-tracking',
  },
  {
    id: 'ai-coaching',
    title: 'AI Coaching',
    description: 'Voice logging, AI chat, and proactive coaching features',
    icon: 'sparkles-outline',
    articleCount: 6,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/ai-coaching',
  },
  {
    id: 'managing-clients',
    title: 'Managing Clients',
    description: 'Client management, program assignment, and progress tracking',
    icon: 'people-outline',
    articleCount: 8,
    roles: ['trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/managing-clients',
  },
  {
    id: 'crm-marketing',
    title: 'CRM & Marketing',
    description: 'Lead pipeline, email campaigns, and client acquisition',
    icon: 'mail-outline',
    articleCount: 7,
    roles: ['trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/crm-marketing',
  },
  {
    id: 'payments',
    title: 'Payments & Pricing',
    description: 'Stripe setup, pricing tiers, and payment processing',
    icon: 'card-outline',
    articleCount: 6,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/payments',
  },
  {
    id: 'wearables-devices',
    title: 'Wearables & Devices',
    description: 'Connect fitness trackers, smartwatches, and health apps',
    icon: 'watch-outline',
    articleCount: 5,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/wearables-devices',
  },
  {
    id: 'technical-issues',
    title: 'Technical Issues',
    description: 'Troubleshooting, sync problems, and app performance',
    icon: 'bug-outline',
    articleCount: 4,
    roles: ['client', 'trainer', 'gym_owner'],
    route: '/tabs/settings/help/faq/technical-issues',
  },
];

/**
 * All FAQ Items (58 total)
 */
export const FAQ_ITEMS: FAQItem[] = [
  // ============================================================================
  // ACCOUNT & BILLING (7 FAQs)
  // ============================================================================
  {
    id: 'account-001',
    question: 'How do I update my profile information?',
    answer: `
      <p>To update your profile information:</p>
      <ol>
        <li>Tap <strong>More</strong> tab at the bottom</li>
        <li>Select <strong>Settings</strong></li>
        <li>Tap <strong>Edit Profile</strong></li>
        <li>Update your name, email, photo, or other details</li>
        <li>Tap <strong>Save Changes</strong></li>
      </ol>
      <p><strong>Note:</strong> Profile photo changes may take a few minutes to appear everywhere in the app.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['profile', 'account', 'settings', 'edit'],
  },
  {
    id: 'account-002',
    question: 'How do I change my password?',
    answer: `
      <p>To change your password:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Privacy & Security</strong></li>
        <li>Tap <strong>Change Password</strong></li>
        <li>Enter your current password</li>
        <li>Enter and confirm your new password</li>
        <li>Tap <strong>Update Password</strong></li>
      </ol>
      <p><strong>Security tip:</strong> Use a strong password with at least 8 characters, including uppercase, lowercase, numbers, and symbols.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['password', 'security', 'login', 'privacy'],
  },
  {
    id: 'account-003',
    question: 'How do I cancel my subscription?',
    answer: `
      <p>To cancel your subscription:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>My Subscription</strong></li>
        <li>Tap <strong>Manage Subscription</strong></li>
        <li>Select <strong>Cancel Subscription</strong></li>
        <li>Choose a cancellation reason (optional)</li>
        <li>Confirm cancellation</li>
      </ol>
      <p><strong>Important:</strong> You'll retain access until the end of your current billing period. No refunds are provided for partial months.</p>
      <p>If you're a client, canceling will notify your trainer. Your workout and nutrition data will be preserved.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['cancel', 'subscription', 'billing', 'membership'],
  },
  {
    id: 'account-004',
    question: 'How do I update my payment method?',
    answer: `
      <p>To update your payment method:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>My Subscription</strong></li>
        <li>Tap <strong>Payment Method</strong></li>
        <li>Add a new card or select an existing one</li>
        <li>Tap <strong>Set as Default</strong></li>
      </ol>
      <p>Your new payment method will be charged on your next billing date. We accept Visa, Mastercard, American Express, and Discover.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['payment', 'credit card', 'billing', 'stripe'],
  },
  {
    id: 'account-005',
    question: 'Can I get a refund?',
    answer: `
      <p>Our refund policy:</p>
      <ul>
        <li><strong>Within 7 days:</strong> Full refund available if you haven't used the app extensively</li>
        <li><strong>After 7 days:</strong> No refunds for partial months, but you can cancel anytime</li>
        <li><strong>Technical issues:</strong> Contact support for case-by-case evaluation</li>
      </ul>
      <p>To request a refund, go to <strong>Settings</strong> → <strong>Help & Support</strong> → <strong>Contact Support</strong> and select <strong>Billing</strong> as your category.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['refund', 'billing', 'money back', 'cancel'],
  },
  {
    id: 'account-006',
    question: 'How do I delete my account?',
    answer: `
      <p>To permanently delete your account:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Privacy & Security</strong></li>
        <li>Scroll to <strong>Danger Zone</strong></li>
        <li>Tap <strong>Delete Account</strong></li>
        <li>Enter your password to confirm</li>
        <li>Tap <strong>Permanently Delete</strong></li>
      </ol>
      <p><strong>Warning:</strong> This action cannot be undone. All your data, including workouts, nutrition logs, progress photos, and messages will be permanently deleted.</p>
      <p><strong>Trainers:</strong> You must transfer or remove all clients before deleting your account.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['delete', 'account', 'privacy', 'data'],
  },
  {
    id: 'account-007',
    question: 'What happens if my payment fails?',
    answer: `
      <p>If your payment fails:</p>
      <ol>
        <li>You'll receive an email notification</li>
        <li>Your subscription status changes to <strong>Past Due</strong></li>
        <li>We'll retry charging your card 3 times over 7 days</li>
        <li>After 7 days, your account will be downgraded to free tier</li>
      </ol>
      <p>To resolve a failed payment, update your payment method in <strong>Settings</strong> → <strong>My Subscription</strong>.</p>
      <p><strong>Note:</strong> Your data is never deleted due to payment issues. It's preserved for 30 days after downgrade.</p>
    `,
    category: 'account-billing',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['payment failed', 'billing', 'past due', 'subscription'],
  },

  // ============================================================================
  // WORKOUTS & PROGRAMS (8 FAQs)
  // ============================================================================
  {
    id: 'workout-001',
    question: 'How do I log a workout?',
    answer: `
      <p>To log a workout:</p>
      <ol>
        <li>Go to the <strong>Workouts</strong> tab</li>
        <li>Tap <strong>Today's Workout</strong> or select from your program</li>
        <li>For each exercise, tap <strong>Add Set</strong></li>
        <li>Enter weight and reps, or tap the suggested values</li>
        <li>Tap <strong>Complete Set</strong></li>
        <li>When finished, tap <strong>Complete Workout</strong></li>
      </ol>
      <p><strong>Pro tip:</strong> Use voice commands like "10 reps at 185" to log sets hands-free during your workout.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['workout', 'logging', 'sets', 'reps', 'exercise'],
  },
  {
    id: 'workout-002',
    question: 'Can I create my own workout?',
    answer: `
      <p><strong>Clients:</strong> You can log custom exercises, but workout programs are assigned by your trainer.</p>
      <p><strong>Trainers:</strong> Yes! To create a workout:</p>
      <ol>
        <li>Go to <strong>Workouts</strong> tab</li>
        <li>Tap <strong>Create Workout</strong></li>
        <li>Add a workout name and optional notes</li>
        <li>Tap <strong>Add Exercise</strong> from the library</li>
        <li>Set prescribed sets, reps, weight, or leave blank for client choice</li>
        <li>Save and assign to clients or add to a program</li>
      </ol>
      <p>You can save workouts as templates for reuse with multiple clients.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['create', 'workout', 'custom', 'program', 'builder'],
  },
  {
    id: 'workout-003',
    question: 'How do I edit or skip an exercise?',
    answer: `
      <p>During a workout:</p>
      <ul>
        <li><strong>To skip:</strong> Swipe left on the exercise and tap <strong>Skip</strong>, or say "skip" using voice logging</li>
        <li><strong>To substitute:</strong> Tap the exercise name → <strong>Substitute Exercise</strong> → select a replacement</li>
        <li><strong>To edit sets/reps:</strong> Tap the set you want to modify</li>
        <li><strong>To delete a set:</strong> Swipe left on the set and tap <strong>Delete</strong></li>
      </ul>
      <p><strong>Note:</strong> If your trainer prescribed the workout, they'll see which exercises you skipped or substituted.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['edit', 'skip', 'substitute', 'exercise', 'workout'],
  },
  {
    id: 'workout-004',
    question: 'What do the colored tags on exercises mean?',
    answer: `
      <p>Exercise tags help you understand the workout structure:</p>
      <ul>
        <li><strong>🔴 Compound:</strong> Multi-joint exercises (squats, deadlifts, bench press)</li>
        <li><strong>🟠 Accessory:</strong> Single-joint exercises for targeted muscle work</li>
        <li><strong>🟢 Cardio:</strong> Cardiovascular conditioning exercises</li>
        <li><strong>🔵 Core:</strong> Abdominal and core stability exercises</li>
        <li><strong>🟣 Warm-up:</strong> Mobility and activation exercises</li>
      </ul>
      <p>Muscle group badges show which areas are targeted (e.g., Chest, Back, Legs).</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['tags', 'exercise', 'categories', 'muscle groups'],
  },
  {
    id: 'workout-005',
    question: 'How do rest timers work?',
    answer: `
      <p>Rest timers start automatically after you complete a set:</p>
      <ol>
        <li>Complete a set by tapping <strong>Complete Set</strong></li>
        <li>A timer appears with your prescribed rest time (or 60s default)</li>
        <li>You'll get a notification when rest is complete</li>
        <li>Tap <strong>Start Next Set</strong> to continue</li>
      </ol>
      <p><strong>Customization:</strong></p>
      <ul>
        <li>Tap the timer to adjust time mid-rest</li>
        <li>Skip rest by tapping <strong>Skip Rest</strong></li>
        <li>Disable auto-timers in <strong>Settings</strong> → <strong>Workout Preferences</strong></li>
      </ul>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['rest timer', 'workout', 'sets', 'rest period'],
  },
  {
    id: 'workout-006',
    question: 'How do I view my workout history?',
    answer: `
      <p>To see your past workouts:</p>
      <ol>
        <li>Go to <strong>Progress</strong> tab</li>
        <li>Tap <strong>Workout History</strong></li>
        <li>Browse by date or search for specific workouts</li>
        <li>Tap any workout to see full details</li>
      </ol>
      <p>You can also view exercise-specific history by tapping an exercise during a workout and selecting <strong>View History</strong>.</p>
      <p><strong>Trainers:</strong> View client workout history from their profile page.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['history', 'workout', 'logs', 'past workouts'],
  },
  {
    id: 'workout-007',
    question: 'What is a workout program?',
    answer: `
      <p>A workout program is a structured training plan spanning multiple weeks:</p>
      <ul>
        <li><strong>Phases:</strong> Programs are divided into phases (e.g., Hypertrophy, Strength, Deload)</li>
        <li><strong>Progression:</strong> Exercises progress week-to-week with increasing volume or intensity</li>
        <li><strong>Schedule:</strong> Specific workouts assigned to specific days</li>
      </ul>
      <p><strong>Clients:</strong> Your trainer assigns programs to you. View your current program in the <strong>Workouts</strong> tab.</p>
      <p><strong>Trainers:</strong> Build programs using the <strong>Program Builder</strong> and assign them to clients.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['program', 'plan', 'training', 'schedule'],
  },
  {
    id: 'workout-008',
    question: 'How do I track personal records (PRs)?',
    answer: `
      <p>FitOS automatically tracks your personal records:</p>
      <ul>
        <li><strong>1RM:</strong> Estimated one-rep max for each exercise</li>
        <li><strong>Volume PR:</strong> Most total weight lifted (sets × reps × weight)</li>
        <li><strong>Rep PR:</strong> Most reps performed at a given weight</li>
      </ul>
      <p>When you set a new PR, you'll see a 🎉 celebration with confetti and haptic feedback!</p>
      <p>View all your PRs in <strong>Progress</strong> → <strong>Personal Records</strong>.</p>
    `,
    category: 'workouts-programs',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['PR', 'personal record', '1RM', 'max', 'achievements'],
  },

  // ============================================================================
  // NUTRITION TRACKING (7 FAQs)
  // ============================================================================
  {
    id: 'nutrition-001',
    question: 'How do I log food?',
    answer: `
      <p>You have multiple ways to log food in FitOS:</p>
      <ol>
        <li><strong>Search:</strong> Tap <strong>Nutrition</strong> → <strong>Add Food</strong> → search for the item</li>
        <li><strong>Photo:</strong> Tap the camera icon, take a photo, and AI will identify foods</li>
        <li><strong>Voice:</strong> Say "two eggs and toast" and AI will log it</li>
        <li><strong>Barcode:</strong> Scan packaged foods for instant logging</li>
        <li><strong>Go-To Foods:</strong> Your frequently eaten foods appear at the top</li>
      </ol>
      <p><strong>Pro tip:</strong> Photo and voice logging are fastest for whole meals!</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['food', 'logging', 'nutrition', 'meal', 'tracking'],
  },
  {
    id: 'nutrition-002',
    question: 'How accurate is photo nutrition?',
    answer: `
      <p>Photo nutrition uses AI to estimate macros with ~85-90% accuracy for common foods.</p>
      <p><strong>Best results:</strong></p>
      <ul>
        <li>Take photos from directly above</li>
        <li>Ensure good lighting</li>
        <li>Include a reference object (hand, phone) for portion size</li>
        <li>Capture the full plate in frame</li>
      </ul>
      <p>After AI analyzes your photo, you can:</p>
      <ul>
        <li>Edit any identified food</li>
        <li>Adjust portion sizes</li>
        <li>Add missing items</li>
        <li>Delete incorrect identifications</li>
      </ul>
      <p><strong>Note:</strong> FitOS shows transparent breakdowns (not a single opaque entry) so you can verify accuracy.</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['photo', 'AI', 'accuracy', 'nutrition', 'camera'],
  },
  {
    id: 'nutrition-003',
    question: 'How do I set my macro targets?',
    answer: `
      <p><strong>Clients:</strong> Your trainer sets your macro targets based on your goals. View them in <strong>Nutrition</strong> tab.</p>
      <p><strong>Trainers/Self-coached:</strong> To set targets:</p>
      <ol>
        <li>Go to <strong>Nutrition</strong> → <strong>Settings</strong></li>
        <li>Choose <strong>Custom Targets</strong></li>
        <li>Enter daily protein, carbs, and fat targets in grams</li>
        <li>Or use <strong>Auto-calculate</strong> based on your body weight and goals</li>
        <li>Save targets</li>
      </ol>
      <p>Targets can also be set per day of the week (e.g., higher carbs on training days).</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['macros', 'targets', 'goals', 'nutrition', 'protein'],
  },
  {
    id: 'nutrition-004',
    question: 'What do the colors mean in nutrition tracking?',
    answer: `
      <p>FitOS uses an <strong>adherence-neutral</strong> color system:</p>
      <ul>
        <li><strong>🟢 Green:</strong> Within ±5% of your target</li>
        <li><strong>🟠 Orange:</strong> Slightly under target (5-15% below)</li>
        <li><strong>🟣 Purple:</strong> Over target</li>
      </ul>
      <p><strong>Important:</strong> Purple is NOT red! Going over targets occasionally is normal and not "bad." We focus on weekly averages, not daily perfection.</p>
      <p><strong>Weekly view:</strong> Shows average daily intake to help you see the bigger picture beyond single-day fluctuations.</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['colors', 'macros', 'targets', 'adherence', 'nutrition'],
  },
  {
    id: 'nutrition-005',
    question: 'How do I create custom foods?',
    answer: `
      <p>To create a custom food:</p>
      <ol>
        <li>Go to <strong>Nutrition</strong> → <strong>Add Food</strong></li>
        <li>Tap <strong>Create Custom Food</strong></li>
        <li>Enter food name</li>
        <li>Add serving size and unit</li>
        <li>Enter macros: protein, carbs, fat (calories auto-calculate)</li>
        <li>Save food</li>
      </ol>
      <p>Custom foods are saved to your library and appear in your search results.</p>
      <p><strong>Pro tip:</strong> Create custom recipes with multiple ingredients and save them for quick logging!</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['custom', 'food', 'recipe', 'create', 'nutrition'],
  },
  {
    id: 'nutrition-006',
    question: 'Can I track micronutrients (vitamins/minerals)?',
    answer: `
      <p>Currently, FitOS focuses on macronutrients (protein, carbs, fat) and calories for simplicity and adherence.</p>
      <p>Micronutrient tracking is planned for a future update. For now, we recommend:</p>
      <ul>
        <li>Eating a variety of whole foods</li>
        <li>Including colorful vegetables and fruits</li>
        <li>Taking a multivitamin if needed (consult your doctor)</li>
      </ul>
      <p>Want to see micronutrient tracking sooner? Vote for this feature in <strong>Settings</strong> → <strong>Feature Requests</strong>.</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['micronutrients', 'vitamins', 'minerals', 'tracking'],
  },
  {
    id: 'nutrition-007',
    question: 'How do I edit or delete a logged food?',
    answer: `
      <p>To edit a food entry:</p>
      <ol>
        <li>Go to <strong>Nutrition</strong> tab</li>
        <li>Find the food entry you want to edit</li>
        <li>Tap the entry to open details</li>
        <li>Tap <strong>Edit</strong></li>
        <li>Adjust serving size, macros, or meal time</li>
        <li>Tap <strong>Save</strong></li>
      </ol>
      <p>To delete a food entry:</p>
      <ol>
        <li>Swipe left on the food entry</li>
        <li>Tap <strong>Delete</strong></li>
        <li>Confirm deletion</li>
      </ol>
      <p>Changes are synced immediately with your trainer (if you have one).</p>
    `,
    category: 'nutrition-tracking',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['edit', 'delete', 'food', 'logging', 'nutrition'],
  },

  // ============================================================================
  // AI COACHING (6 FAQs)
  // ============================================================================
  {
    id: 'ai-001',
    question: 'How does voice logging work?',
    answer: `
      <p>Voice logging lets you log workouts and food hands-free:</p>
      <p><strong>Workout commands:</strong></p>
      <ul>
        <li>"10 reps at 185" → Logs a set</li>
        <li>"repeat" → Duplicates your last set</li>
        <li>"skip" → Skips the current exercise</li>
        <li>"next" → Moves to next exercise</li>
        <li>"start timer" → Begins rest timer</li>
      </ul>
      <p><strong>Food commands:</strong></p>
      <ul>
        <li>"Two eggs and toast" → AI parses and logs</li>
        <li>"Fist-sized chicken breast" → Estimates portion</li>
        <li>"Lunch at Chipotle, chicken bowl" → AI estimates macros</li>
      </ul>
      <p><strong>Setup:</strong> Enable microphone access when prompted. Voice logging uses Deepgram AI for real-time transcription.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['voice', 'logging', 'AI', 'hands-free', 'speech'],
  },
  {
    id: 'ai-002',
    question: 'What is AI coaching?',
    answer: `
      <p>FitOS includes AI-powered coaching to supplement your trainer (or coach you if self-directed):</p>
      <ul>
        <li><strong>Workout AI:</strong> Suggests exercise substitutions, progression adjustments, and form tips</li>
        <li><strong>Nutrition AI:</strong> Helps with meal planning, macro distribution, and food suggestions</li>
        <li><strong>Recovery AI:</strong> Monitors sleep, HRV, and readiness to adjust training intensity</li>
        <li><strong>Motivation AI:</strong> Proactive check-ins and encouragement</li>
      </ul>
      <p><strong>Trainers:</strong> AI learns YOUR coaching methodology from your programs and client interactions, then applies it consistently.</p>
      <p>Access AI coaching via the <strong>Chat</strong> button in the app header.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['AI', 'coaching', 'chat', 'assistance', 'training'],
  },
  {
    id: 'ai-003',
    question: 'Is my data used to train AI?',
    answer: `
      <p><strong>No.</strong> Your personal data (workouts, nutrition, messages) is NEVER used to train public AI models.</p>
      <p>Here's how AI works in FitOS:</p>
      <ul>
        <li>AI recommendations are based on <strong>your own data only</strong></li>
        <li>Your trainer's methodology is learned from their programming patterns</li>
        <li>General fitness knowledge comes from pre-trained models (not your data)</li>
        <li>All AI processing follows strict privacy and encryption standards</li>
      </ul>
      <p>Read our full AI privacy policy in <strong>Settings</strong> → <strong>Privacy & Security</strong>.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['AI', 'privacy', 'data', 'training', 'security'],
  },
  {
    id: 'ai-004',
    question: 'Can I turn off AI features?',
    answer: `
      <p>Yes! You have full control over AI features:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>AI Preferences</strong></li>
        <li>Toggle individual features on/off:
          <ul>
            <li>Voice logging</li>
            <li>Photo nutrition</li>
            <li>AI coaching chat</li>
            <li>Proactive suggestions</li>
            <li>Smart notifications</li>
          </ul>
        </li>
        <li>Save preferences</li>
      </ol>
      <p><strong>Note:</strong> Disabling AI features won't affect your trainer's ability to coach you.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['AI', 'disable', 'turn off', 'settings', 'preferences'],
  },
  {
    id: 'ai-005',
    question: 'How do proactive coaching nudges work?',
    answer: `
      <p>FitOS uses JITAI (Just-In-Time Adaptive Interventions) to send helpful nudges at optimal moments:</p>
      <ul>
        <li><strong>Workout reminders:</strong> When you typically train but haven't started</li>
        <li><strong>Nutrition check-ins:</strong> If you haven't logged food by mid-day</li>
        <li><strong>Recovery alerts:</strong> When HRV drops significantly (suggesting extra rest)</li>
        <li><strong>Milestone celebrations:</strong> When you hit a PR or streak</li>
      </ul>
      <p>Nudges are <strong>non-judgmental</strong> and focus on support, not shame.</p>
      <p><strong>Customize:</strong> Go to <strong>Settings</strong> → <strong>Notifications</strong> to adjust nudge frequency and timing.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['JITAI', 'nudges', 'notifications', 'proactive', 'reminders'],
  },
  {
    id: 'ai-006',
    question: 'Does AI replace my trainer?',
    answer: `
      <p><strong>No!</strong> AI is designed to <strong>enhance</strong> your trainer's coaching, not replace them.</p>
      <p><strong>Your trainer:</strong></p>
      <ul>
        <li>Creates your programs and sets your targets</li>
        <li>Makes strategic decisions about your training</li>
        <li>Provides personalized guidance and accountability</li>
        <li>Builds a relationship with you</li>
      </ul>
      <p><strong>AI assists by:</strong></p>
      <ul>
        <li>Making logging faster (voice, photo)</li>
        <li>Answering quick questions 24/7</li>
        <li>Providing real-time form tips during workouts</li>
        <li>Freeing up your trainer's time for strategic coaching</li>
      </ul>
      <p>Think of AI as your trainer's assistant, not their replacement.</p>
    `,
    category: 'ai-coaching',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['AI', 'trainer', 'coaching', 'replacement', 'human'],
  },

  // ============================================================================
  // MANAGING CLIENTS (8 FAQs - Trainer/Owner only)
  // ============================================================================
  {
    id: 'clients-001',
    question: 'How do I add a new client?',
    answer: `
      <p>To add a client:</p>
      <ol>
        <li>Go to <strong>Clients</strong> tab</li>
        <li>Tap <strong>Add Client</strong></li>
        <li>Enter their email address</li>
        <li>Select a pricing tier (or custom pricing)</li>
        <li>Optionally add initial notes</li>
        <li>Tap <strong>Send Invitation</strong></li>
      </ol>
      <p>Your client will receive an email to create their account. Once they accept, they'll appear in your client list.</p>
      <p><strong>Note:</strong> Clients must have a FitOS account. If they don't, they'll be prompted to create one when accepting your invitation.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['add', 'client', 'invite', 'new', 'onboarding'],
  },
  {
    id: 'clients-002',
    question: 'How do I assign a workout program?',
    answer: `
      <p>To assign a program:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → select a client</li>
        <li>Tap <strong>Programs</strong></li>
        <li>Tap <strong>Assign Program</strong></li>
        <li>Select from your program templates or create a new one</li>
        <li>Set the start date</li>
        <li>Optionally add a welcome message</li>
        <li>Tap <strong>Assign</strong></li>
      </ol>
      <p>Your client will be notified and can view the program in their <strong>Workouts</strong> tab.</p>
      <p><strong>Pro tip:</strong> Use program templates to save time when onboarding new clients with similar goals.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['assign', 'program', 'workout', 'client', 'training'],
  },
  {
    id: 'clients-003',
    question: 'How do I track client progress?',
    answer: `
      <p>View client progress from their profile:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → select a client</li>
        <li>Tap <strong>Progress</strong> tab</li>
        <li>View:
          <ul>
            <li><strong>Workout compliance:</strong> Completed vs. assigned workouts</li>
            <li><strong>Nutrition adherence:</strong> Macro tracking consistency</li>
            <li><strong>Body metrics:</strong> Weight, body fat %, measurements</li>
            <li><strong>Progress photos:</strong> Side-by-side comparisons</li>
            <li><strong>Performance:</strong> Strength gains and PRs</li>
          </ul>
        </li>
      </ol>
      <p><strong>Dashboard view:</strong> See all clients' weekly compliance at a glance from your trainer dashboard.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['progress', 'tracking', 'client', 'compliance', 'metrics'],
  },
  {
    id: 'clients-004',
    question: 'How do I message clients?',
    answer: `
      <p>FitOS includes built-in messaging:</p>
      <ol>
        <li>Go to <strong>Messages</strong> tab</li>
        <li>Select a client or tap <strong>New Message</strong></li>
        <li>Type your message</li>
        <li>Optionally attach:
          <ul>
            <li>Workout links</li>
            <li>Progress photos</li>
            <li>Nutrition targets</li>
            <li>Files/documents</li>
          </ul>
        </li>
        <li>Tap <strong>Send</strong></li>
      </ol>
      <p>Clients receive push notifications for new messages. You can also message from a client's profile page.</p>
      <p><strong>Pro tip:</strong> Use <strong>Broadcast Message</strong> to send announcements to all clients at once.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['messaging', 'communication', 'client', 'chat'],
  },
  {
    id: 'clients-005',
    question: 'How do I adjust client nutrition targets?',
    answer: `
      <p>To update a client's macros:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → select client</li>
        <li>Tap <strong>Nutrition</strong></li>
        <li>Tap <strong>Edit Targets</strong></li>
        <li>Enter new protein, carbs, and fat targets</li>
        <li>Optionally set different targets for training vs. rest days</li>
        <li>Add a note explaining the changes (client will see this)</li>
        <li>Tap <strong>Save & Notify Client</strong></li>
      </ol>
      <p>Your client receives a notification and can see the new targets immediately in their <strong>Nutrition</strong> tab.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['nutrition', 'macros', 'targets', 'client', 'adjust'],
  },
  {
    id: 'clients-006',
    question: 'What happens when a client cancels?',
    answer: `
      <p>When a client cancels their subscription:</p>
      <ol>
        <li>You receive a notification</li>
        <li>Their status changes to <strong>Canceled</strong> in your client list</li>
        <li>They retain access until the end of their billing period</li>
        <li>After that, they're moved to <strong>Inactive Clients</strong></li>
        <li>You can still view their historical data</li>
      </ol>
      <p><strong>Reactivation:</strong> Inactive clients can reactivate anytime. You'll be notified and they'll resume their previous program.</p>
      <p><strong>Note:</strong> You don't lose your historical data with that client, even if they leave.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['cancel', 'client', 'subscription', 'inactive', 'churn'],
  },
  {
    id: 'clients-007',
    question: 'How do I handle client check-ins?',
    answer: `
      <p>FitOS streamlines weekly check-ins:</p>
      <ol>
        <li><strong>Set check-in day:</strong> Configure in client settings (e.g., every Sunday)</li>
        <li><strong>Client submits:</strong> They're prompted to log weight, photos, and weekly reflection</li>
        <li><strong>You review:</strong> Check-ins appear in your <strong>Dashboard</strong> with a notification</li>
        <li><strong>Respond:</strong> Leave feedback, adjust program, or schedule a call</li>
      </ol>
      <p><strong>Bulk check-ins:</strong> View all pending check-ins in the <strong>Dashboard</strong> and process them in batch.</p>
      <p><strong>AI assistance:</strong> AI can draft initial responses based on client data (you review and edit before sending).</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['check-in', 'weekly', 'client', 'review', 'feedback'],
  },
  {
    id: 'clients-008',
    question: 'Can I transfer a client to another trainer?',
    answer: `
      <p>Yes! To transfer a client:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → select client</li>
        <li>Tap <strong>Settings</strong> (gear icon)</li>
        <li>Select <strong>Transfer Client</strong></li>
        <li>Enter the new trainer's email (they must be a FitOS trainer)</li>
        <li>Add a handoff note with important context</li>
        <li>Tap <strong>Transfer</strong></li>
      </ol>
      <p>The new trainer will receive an invitation. Once they accept, all client data (workout history, nutrition logs, etc.) transfers with them.</p>
      <p><strong>Note:</strong> You retain view-only access to the client's historical data from your time coaching them.</p>
    `,
    category: 'managing-clients',
    roles: ['trainer', 'gym_owner'],
    tags: ['transfer', 'client', 'handoff', 'trainer', 'reassign'],
  },

  // ============================================================================
  // CRM & MARKETING (7 FAQs - Trainer/Owner only)
  // ============================================================================
  {
    id: 'crm-001',
    question: 'How does the lead pipeline work?',
    answer: `
      <p>FitOS includes a built-in CRM to manage your sales pipeline:</p>
      <p><strong>Lead stages:</strong></p>
      <ol>
        <li><strong>New:</strong> Just added, no contact yet</li>
        <li><strong>Contacted:</strong> Initial outreach sent</li>
        <li><strong>Qualified:</strong> Expressed interest, fit for your services</li>
        <li><strong>Consultation:</strong> Sales call scheduled or completed</li>
        <li><strong>Won:</strong> Became a paying client 🎉</li>
        <li><strong>Lost:</strong> Not interested or didn't convert</li>
      </ol>
      <p>Access the pipeline from <strong>Clients</strong> → <strong>Leads</strong> tab.</p>
      <p><strong>Drag and drop:</strong> Move leads between stages with a swipe.</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['CRM', 'leads', 'pipeline', 'sales', 'funnel'],
  },
  {
    id: 'crm-002',
    question: 'How do I add a lead?',
    answer: `
      <p>To add a new lead:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → <strong>Leads</strong></li>
        <li>Tap <strong>Add Lead</strong></li>
        <li>Enter their information:
          <ul>
            <li>Name</li>
            <li>Email</li>
            <li>Phone (optional)</li>
            <li>Source (e.g., Instagram, referral, website)</li>
            <li>Notes</li>
          </ul>
        </li>
        <li>Tap <strong>Save</strong></li>
      </ol>
      <p>Leads start in the <strong>New</strong> stage. You can then add tasks (e.g., "Send intro email") and set reminders.</p>
      <p><strong>Import leads:</strong> Tap <strong>Import CSV</strong> to bulk-upload leads from a spreadsheet.</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['add', 'lead', 'CRM', 'prospect', 'contact'],
  },
  {
    id: 'crm-003',
    question: 'How do email campaigns work?',
    answer: `
      <p>FitOS includes email marketing (no Mailchimp needed!):</p>
      <ol>
        <li>Go to <strong>Clients</strong> → <strong>Marketing</strong> → <strong>Email Campaigns</strong></li>
        <li>Tap <strong>Create Campaign</strong></li>
        <li>Choose a template or start from scratch</li>
        <li>Write your email (rich text editor with drag-and-drop)</li>
        <li>Select recipients (all clients, leads only, specific tags)</li>
        <li>Schedule or send immediately</li>
      </ol>
      <p><strong>Tracking:</strong> See open rates, click rates, and replies in the campaign dashboard.</p>
      <p><strong>Templates:</strong> Save common emails (welcome sequence, check-in reminders) as templates.</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['email', 'campaign', 'marketing', 'newsletter', 'automation'],
  },
  {
    id: 'crm-004',
    question: 'Can I automate email sequences?',
    answer: `
      <p>Yes! Create automated drip campaigns:</p>
      <ol>
        <li>Go to <strong>Marketing</strong> → <strong>Automations</strong></li>
        <li>Tap <strong>Create Sequence</strong></li>
        <li>Name your sequence (e.g., "New Lead Nurture")</li>
        <li>Add emails to the sequence:
          <ul>
            <li>Day 0: Welcome email</li>
            <li>Day 2: Free workout guide</li>
            <li>Day 5: Success story</li>
            <li>Day 7: Book consultation</li>
          </ul>
        </li>
        <li>Set triggers (e.g., "When lead is added")</li>
        <li>Activate sequence</li>
      </ol>
      <p>Leads automatically receive emails based on your schedule. They're removed from the sequence if they become clients or unsubscribe.</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['automation', 'email', 'sequence', 'drip', 'nurture'],
  },
  {
    id: 'crm-005',
    question: 'How do I track lead sources?',
    answer: `
      <p>Lead sources help you understand which marketing channels work best:</p>
      <p><strong>Default sources:</strong></p>
      <ul>
        <li>Instagram</li>
        <li>Facebook</li>
        <li>Google</li>
        <li>Referral</li>
        <li>Website</li>
        <li>Other</li>
      </ul>
      <p><strong>Custom sources:</strong> Add your own (e.g., "YouTube", "Podcast", "Local Gym")</p>
      <p><strong>Analytics:</strong> View lead source breakdown in <strong>Marketing</strong> → <strong>Analytics</strong> to see which channels convert best.</p>
      <p>This helps you double down on what works and cut what doesn't!</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['lead source', 'tracking', 'analytics', 'marketing', 'attribution'],
  },
  {
    id: 'crm-006',
    question: 'How do I create a landing page?',
    answer: `
      <p>FitOS includes a simple landing page builder:</p>
      <ol>
        <li>Go to <strong>Marketing</strong> → <strong>Landing Pages</strong></li>
        <li>Tap <strong>Create Landing Page</strong></li>
        <li>Choose a template (Consultation, Free Guide, Bootcamp)</li>
        <li>Customize:
          <ul>
            <li>Headline and description</li>
            <li>Call-to-action button</li>
            <li>Images and testimonials</li>
            <li>Form fields to collect</li>
          </ul>
        </li>
        <li>Tap <strong>Publish</strong></li>
      </ol>
      <p>You'll get a custom URL (e.g., fitos.app/yourname/consultation) to share on social media, ads, or email.</p>
      <p><strong>Leads are automatically added to your CRM when they submit the form.</strong></p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['landing page', 'website', 'form', 'lead generation', 'funnel'],
  },
  {
    id: 'crm-007',
    question: 'Can I segment my email list?',
    answer: `
      <p>Yes! Use tags to segment contacts:</p>
      <ol>
        <li>Create tags like "Weight Loss", "Muscle Gain", "Beginners", etc.</li>
        <li>Tag leads and clients based on their goals or interests</li>
        <li>When sending campaigns, filter by tags</li>
      </ol>
      <p><strong>Example:</strong> Send a "Bulk Program Launch" email only to contacts tagged "Muscle Gain".</p>
      <p><strong>Smart segments:</strong> Create dynamic segments like:
        <ul>
          <li>"Active clients who haven't checked in this week"</li>
          <li>"Leads who haven't replied in 7 days"</li>
          <li>"Clients with birthdays this month"</li>
        </ul>
      </p>
      <p>Manage tags in <strong>Marketing</strong> → <strong>Tags</strong>.</p>
    `,
    category: 'crm-marketing',
    roles: ['trainer', 'gym_owner'],
    tags: ['segmentation', 'tags', 'email', 'targeting', 'list'],
  },

  // ============================================================================
  // PAYMENTS & PRICING (6 FAQs)
  // ============================================================================
  {
    id: 'payment-001',
    question: 'How do I set up Stripe for payments?',
    answer: `
      <p><strong>Trainers:</strong> To receive payments, you must connect Stripe:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Payments</strong></li>
        <li>Tap <strong>Connect Stripe Account</strong></li>
        <li>Follow Stripe's onboarding (provide business details, bank account, tax info)</li>
        <li>Complete verification (may take 1-2 days)</li>
        <li>Once approved, you can accept payments</li>
      </ol>
      <p><strong>Note:</strong> You must have a Stripe account to accept client payments. FitOS uses Stripe Connect for secure, compliant processing.</p>
    `,
    category: 'payments',
    roles: ['trainer', 'gym_owner'],
    tags: ['stripe', 'payments', 'setup', 'onboarding', 'payout'],
  },
  {
    id: 'payment-002',
    question: 'How do I set my pricing?',
    answer: `
      <p>To configure your pricing tiers:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Pricing</strong></li>
        <li>Tap <strong>Add Pricing Tier</strong></li>
        <li>Enter:
          <ul>
            <li>Tier name (e.g., "1-on-1 Coaching")</li>
            <li>Monthly price</li>
            <li>Description of what's included</li>
          </ul>
        </li>
        <li>Save tier</li>
      </ol>
      <p>Create multiple tiers for different service levels (e.g., Basic, Premium, Elite).</p>
      <p>When adding clients, select which tier they're on. You can also set custom pricing for individual clients.</p>
    `,
    category: 'payments',
    roles: ['trainer', 'gym_owner'],
    tags: ['pricing', 'tiers', 'rates', 'packages', 'services'],
  },
  {
    id: 'payment-003',
    question: 'When do I get paid?',
    answer: `
      <p>Payout schedule (via Stripe):</p>
      <ul>
        <li><strong>Standard:</strong> Funds transferred to your bank account 2 business days after client is charged</li>
        <li><strong>Instant:</strong> Available for an additional fee (varies by country)</li>
      </ul>
      <p><strong>Fees:</strong> Stripe charges 2.9% + $0.30 per transaction. FitOS takes a 10% platform fee on trainer earnings.</p>
      <p><strong>Example:</strong> Client pays $200/month
        <ul>
          <li>Stripe fee: $6.10</li>
          <li>FitOS fee: $20</li>
          <li>You receive: $173.90</li>
        </ul>
      </p>
      <p>View payout history in <strong>Settings</strong> → <strong>Payments</strong> → <strong>Payouts</strong>.</p>
    `,
    category: 'payments',
    roles: ['trainer', 'gym_owner'],
    tags: ['payout', 'earnings', 'fees', 'stripe', 'deposit'],
  },
  {
    id: 'payment-004',
    question: 'How do refunds work?',
    answer: `
      <p>To issue a refund:</p>
      <ol>
        <li>Go to <strong>Clients</strong> → select client</li>
        <li>Tap <strong>Payments</strong> tab</li>
        <li>Find the payment to refund</li>
        <li>Tap <strong>Issue Refund</strong></li>
        <li>Select full or partial refund</li>
        <li>Add a reason (optional, for your records)</li>
        <li>Confirm refund</li>
      </ol>
      <p>The refund is processed immediately through Stripe. It typically appears in the client's account within 5-10 business days.</p>
      <p><strong>Note:</strong> Stripe fees are not refunded, and the FitOS platform fee is refunded only for full refunds within 48 hours.</p>
    `,
    category: 'payments',
    roles: ['trainer', 'gym_owner'],
    tags: ['refund', 'payment', 'stripe', 'chargeback'],
  },
  {
    id: 'payment-005',
    question: 'What payment methods do you accept?',
    answer: `
      <p><strong>For clients paying trainers:</strong></p>
      <ul>
        <li>Credit cards (Visa, Mastercard, Amex, Discover)</li>
        <li>Debit cards</li>
        <li>Apple Pay</li>
        <li>Google Pay</li>
      </ul>
      <p><strong>For FitOS subscriptions:</strong></p>
      <ul>
        <li>Same as above</li>
      </ul>
      <p>All payments are processed securely through Stripe. FitOS never stores your full card details.</p>
      <p><strong>Note:</strong> We do not accept PayPal, Venmo, or cryptocurrency at this time.</p>
    `,
    category: 'payments',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['payment methods', 'credit card', 'stripe', 'apple pay'],
  },
  {
    id: 'payment-006',
    question: 'How do I handle failed payments from clients?',
    answer: `
      <p>When a client's payment fails:</p>
      <ol>
        <li>You're notified via email and in-app</li>
        <li>The client is notified and prompted to update their payment method</li>
        <li>Stripe automatically retries 3 times over 7 days</li>
        <li>If all retries fail, the client's subscription is canceled</li>
      </ol>
      <p><strong>Your action:</strong> Reach out to the client via the <strong>Messages</strong> tab to resolve the issue.</p>
      <p><strong>Grace period:</strong> You can optionally give clients grace period access while they resolve payment issues (configure in <strong>Settings</strong> → <strong>Billing Preferences</strong>).</p>
    `,
    category: 'payments',
    roles: ['trainer', 'gym_owner'],
    tags: ['failed payment', 'dunning', 'retry', 'client', 'billing'],
  },

  // ============================================================================
  // WEARABLES & DEVICES (5 FAQs)
  // ============================================================================
  {
    id: 'wearable-001',
    question: 'What wearables are supported?',
    answer: `
      <p>FitOS connects with popular fitness wearables via Terra API:</p>
      <ul>
        <li><strong>Apple:</strong> Apple Watch, Apple Health</li>
        <li><strong>Garmin:</strong> All Garmin fitness devices</li>
        <li><strong>Fitbit:</strong> All Fitbit devices</li>
        <li><strong>Whoop:</strong> Whoop 4.0 and Whoop Strap</li>
        <li><strong>Oura:</strong> Oura Ring (Gen 2 and 3)</li>
        <li><strong>Polar:</strong> Polar fitness watches</li>
        <li><strong>Suunto:</strong> Suunto sports watches</li>
        <li><strong>Google Fit:</strong> Android Health data</li>
      </ul>
      <p>Connect in <strong>Settings</strong> → <strong>Wearable Devices</strong>.</p>
    `,
    category: 'wearables-devices',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['wearables', 'devices', 'apple watch', 'fitbit', 'oura'],
  },
  {
    id: 'wearable-002',
    question: 'How do I connect my wearable device?',
    answer: `
      <p>To connect a wearable:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Wearable Devices</strong></li>
        <li>Tap <strong>Connect Device</strong></li>
        <li>Select your device brand (e.g., Apple Health, Fitbit)</li>
        <li>Log in to your wearable account (if prompted)</li>
        <li>Grant FitOS permission to read health data</li>
        <li>Tap <strong>Authorize</strong></li>
      </ol>
      <p>Your wearable data will sync automatically from now on. Initial sync may take a few minutes.</p>
      <p><strong>Note:</strong> Ensure your wearable app is installed and synced on your phone.</p>
    `,
    category: 'wearables-devices',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['connect', 'wearable', 'sync', 'integration', 'setup'],
  },
  {
    id: 'wearable-003',
    question: 'What data does FitOS sync from wearables?',
    answer: `
      <p>FitOS syncs the following metrics (when available):</p>
      <ul>
        <li><strong>Sleep:</strong> Duration, quality, sleep stages</li>
        <li><strong>Heart Rate:</strong> Resting HR, HRV, workout HR</li>
        <li><strong>Steps:</strong> Daily step count</li>
        <li><strong>Readiness/Recovery:</strong> Device-specific recovery scores</li>
        <li><strong>Workouts:</strong> Auto-detected workout sessions</li>
      </ul>
      <p><strong>We do NOT sync:</strong> Calorie burn estimates (research shows they're highly inaccurate).</p>
      <p>You can customize which data syncs in <strong>Settings</strong> → <strong>Wearable Devices</strong> → <strong>Data Preferences</strong>.</p>
    `,
    category: 'wearables-devices',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['data', 'sync', 'metrics', 'wearable', 'health'],
  },
  {
    id: 'wearable-004',
    question: `Why isn't my wearable syncing?`,
    answer: `
      <p>If your wearable isn't syncing, try these troubleshooting steps:</p>
      <ol>
        <li><strong>Check connection:</strong> Go to <strong>Settings</strong> → <strong>Wearable Devices</strong> and verify status shows "Connected"</li>
        <li><strong>Re-sync manually:</strong> Tap <strong>Sync Now</strong> to force an update</li>
        <li><strong>Check permissions:</strong> Ensure FitOS has permission to read health data in your device settings</li>
        <li><strong>Reconnect:</strong> Tap <strong>Disconnect</strong>, then <strong>Connect</strong> again</li>
        <li><strong>Update apps:</strong> Ensure both FitOS and your wearable app are updated to latest versions</li>
      </ol>
      <p>If issues persist, contact support with your device model and error messages.</p>
    `,
    category: 'wearables-devices',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['troubleshooting', 'sync', 'wearable', 'not working', 'connection'],
  },
  {
    id: 'wearable-005',
    question: 'Can my trainer see my wearable data?',
    answer: `
      <p>Yes, if you grant permission:</p>
      <ul>
        <li>By default, trainers can see <strong>sleep duration</strong> and <strong>resting heart rate</strong></li>
        <li>You can enable sharing of <strong>HRV</strong> and <strong>readiness scores</strong> in <strong>Settings</strong> → <strong>Privacy</strong> → <strong>Trainer Visibility</strong></li>
        <li>Trainers CANNOT see your step-by-step location or workout routes</li>
      </ul>
      <p><strong>Why share?</strong> Your trainer uses this data to adjust your training based on recovery status. For example, if HRV drops significantly, they might recommend a deload week.</p>
      <p>You have full control and can change sharing preferences anytime.</p>
    `,
    category: 'wearables-devices',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['privacy', 'trainer', 'wearable', 'data', 'sharing'],
  },

  // ============================================================================
  // TECHNICAL ISSUES (4 FAQs)
  // ============================================================================
  {
    id: 'tech-001',
    question: 'The app is running slow or freezing',
    answer: `
      <p>If the app is slow or unresponsive:</p>
      <ol>
        <li><strong>Force quit and restart:</strong> Close the app completely and reopen it</li>
        <li><strong>Check for updates:</strong> Ensure you're on the latest app version in the App Store/Play Store</li>
        <li><strong>Free up storage:</strong> Delete unused apps or photos if your phone is low on space</li>
        <li><strong>Restart your phone:</strong> A simple reboot often resolves performance issues</li>
        <li><strong>Clear app cache:</strong> Go to <strong>Settings</strong> → <strong>Privacy</strong> → <strong>Clear Cache</strong></li>
      </ol>
      <p>If issues persist, contact support with your device model, OS version, and a description of when the slowness occurs.</p>
    `,
    category: 'technical-issues',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['slow', 'performance', 'freezing', 'lag', 'troubleshooting'],
  },
  {
    id: 'tech-002',
    question: `My data isn't syncing across devices`,
    answer: `
      <p>To fix sync issues:</p>
      <ol>
        <li><strong>Check internet connection:</strong> Ensure you have a stable Wi-Fi or cellular connection</li>
        <li><strong>Manual sync:</strong> Pull down on any screen to refresh data</li>
        <li><strong>Log out and back in:</strong> Go to <strong>Settings</strong> → <strong>Log Out</strong>, then log back in</li>
        <li><strong>Check device date/time:</strong> Ensure your device clock is set to automatic</li>
      </ol>
      <p>FitOS syncs in real-time when you have internet. Offline changes are queued and sync automatically when you reconnect.</p>
      <p><strong>Note:</strong> Large workout logs may take a few seconds to sync across devices.</p>
    `,
    category: 'technical-issues',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['sync', 'data', 'devices', 'offline', 'troubleshooting'],
  },
  {
    id: 'tech-003',
    question: 'I forgot my password',
    answer: `
      <p>To reset your password:</p>
      <ol>
        <li>On the login screen, tap <strong>Forgot Password?</strong></li>
        <li>Enter the email address associated with your account</li>
        <li>Tap <strong>Send Reset Email</strong></li>
        <li>Check your email for a password reset link (check spam folder if not in inbox)</li>
        <li>Click the link and create a new password</li>
        <li>Return to the app and log in with your new password</li>
      </ol>
      <p><strong>Didn't receive the email?</strong> Check that you entered the correct email, or contact support for help.</p>
    `,
    category: 'technical-issues',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['password', 'reset', 'forgot', 'login', 'access'],
  },
  {
    id: 'tech-004',
    question: 'How do I report a bug?',
    answer: `
      <p>To report a bug:</p>
      <ol>
        <li>Go to <strong>Settings</strong> → <strong>Help & Support</strong> → <strong>Contact Support</strong></li>
        <li>Select <strong>Bug Report</strong> as the category</li>
        <li>Describe:
          <ul>
            <li>What you were trying to do</li>
            <li>What happened instead</li>
            <li>Steps to reproduce the issue</li>
          </ul>
        </li>
        <li>Optionally attach a screenshot</li>
        <li>Tap <strong>Submit</strong></li>
      </ol>
      <p>Our team investigates all bug reports. You'll receive a ticket ID and we'll update you on the fix status.</p>
      <p><strong>Thank you for helping us improve FitOS!</strong></p>
    `,
    category: 'technical-issues',
    roles: ['client', 'trainer', 'gym_owner'],
    tags: ['bug', 'report', 'issue', 'error', 'support'],
  },
];
