/**
 * Feature Documentation Data
 *
 * Comprehensive guides for all major features in FitOS.
 * Content is written in HTML format with detailed step-by-step instructions.
 *
 * Total Guides: 8 comprehensive feature guides
 */

import type { FeatureGuide } from '../models/help.models';

/**
 * All Feature Guides
 */
export const FEATURE_GUIDES: FeatureGuide[] = [
  // ============================================================================
  // VOICE WORKOUT LOGGING
  // ============================================================================
  {
    id: 'voice-workout-logging',
    title: 'Voice Workout Logging',
    slug: 'voice-workout-logging',
    description: 'Log your workouts hands-free using voice commands powered by Deepgram AI',
    icon: 'mic-outline',
    roles: ['client', 'trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 5,
    sections: [
      {
        id: 'vwl-section-1',
        title: 'Getting Started',
        icon: 'play-circle-outline',
        content: `
          <p>Voice logging lets you log sets, skip exercises, and control your workout without touching your phone. Perfect for staying focused during training.</p>

          <h4>Initial Setup</h4>
          <ol>
            <li>During a workout, tap the <strong>microphone icon</strong> at the top of the screen</li>
            <li>Grant microphone permissions when prompted</li>
            <li>You'll see a <strong>"Listening..."</strong> indicator</li>
            <li>Start speaking your commands</li>
          </ol>

          <div class="tip-box">
            <strong>💡 Pro Tip:</strong> Voice logging works best in quiet environments. In noisy gyms, speak clearly and close to your phone.
          </div>
        `,
      },
      {
        id: 'vwl-section-2',
        title: 'Set Logging Commands',
        icon: 'barbell-outline',
        content: `
          <p>The most common use case is logging sets. Here are the commands:</p>

          <h4>Basic Set Logging</h4>
          <ul>
            <li><strong>"10 reps at 185"</strong> → Logs 10 reps at 185 lbs</li>
            <li><strong>"12 at 225"</strong> → Logs 12 reps at 225 lbs (omit "reps")</li>
            <li><strong>"8 reps"</strong> → Logs 8 reps at your last weight</li>
            <li><strong>"185 pounds"</strong> → Logs same reps as last set at 185 lbs</li>
          </ul>

          <h4>Special Commands</h4>
          <ul>
            <li><strong>"repeat"</strong> → Duplicates your last set exactly</li>
            <li><strong>"same"</strong> → Same as "repeat"</li>
            <li><strong>"bodyweight 15"</strong> → Logs 15 bodyweight reps</li>
            <li><strong>"failure at 8"</strong> → Logs 8 reps (training to failure)</li>
          </ul>

          <div class="tip-box">
            <strong>💡 Pro Tip:</strong> You don't need to say "set" or "add set". Just speak the numbers naturally.
          </div>
        `,
      },
      {
        id: 'vwl-section-3',
        title: 'Navigation Commands',
        icon: 'navigate-outline',
        content: `
          <p>Control your workout flow with voice:</p>

          <ul>
            <li><strong>"skip"</strong> → Skips the current exercise</li>
            <li><strong>"next"</strong> → Moves to the next exercise</li>
            <li><strong>"next exercise"</strong> → Same as "next"</li>
            <li><strong>"back"</strong> → Returns to the previous exercise</li>
            <li><strong>"start timer"</strong> → Starts your rest timer</li>
            <li><strong>"stop timer"</strong> → Stops the rest timer</li>
          </ul>

          <h4>Workout Control</h4>
          <ul>
            <li><strong>"finish workout"</strong> → Completes the entire workout</li>
            <li><strong>"pause workout"</strong> → Pauses logging (useful for breaks)</li>
            <li><strong>"resume"</strong> → Resumes a paused workout</li>
          </ul>
        `,
      },
      {
        id: 'vwl-section-4',
        title: 'Troubleshooting',
        icon: 'construct-outline',
        content: `
          <h4>Common Issues</h4>

          <p><strong>Voice commands not recognized:</strong></p>
          <ul>
            <li>Check that microphone permissions are enabled in Settings → FitOS</li>
            <li>Ensure you have a stable internet connection (voice processing uses cloud AI)</li>
            <li>Speak clearly and pause briefly after each command</li>
            <li>Try rephrasing: "10 at 185" instead of "ten reps at one eighty-five"</li>
          </ul>

          <p><strong>"Listening..." doesn't appear:</strong></p>
          <ul>
            <li>Force quit and restart the app</li>
            <li>Check that you're on the latest FitOS version</li>
            <li>Try toggling voice logging off and back on in Settings</li>
          </ul>

          <p><strong>Wrong set logged:</strong></p>
          <ul>
            <li>Tap the logged set to edit it manually</li>
            <li>Swipe left on the set and tap <strong>Delete</strong> to remove it</li>
            <li>Say the command again more clearly</li>
          </ul>
        `,
        tips: [
          'Use numbers (10, 185) instead of words (ten, one eighty-five) for better accuracy',
          'In loud gyms, cup your hand around the microphone when speaking',
          'You can mix voice and manual logging in the same workout',
        ],
      },
    ],
    relatedGuides: ['photo-nutrition', 'ai-coaching-chat'],
  },

  // ============================================================================
  // PHOTO NUTRITION TRACKING
  // ============================================================================
  {
    id: 'photo-nutrition',
    title: 'Photo Nutrition Tracking',
    slug: 'photo-nutrition',
    description: 'Take a photo of your meal and let AI identify foods and estimate macros',
    icon: 'camera-outline',
    roles: ['client', 'trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 6,
    sections: [
      {
        id: 'pnt-section-1',
        title: 'Taking Food Photos',
        icon: 'camera-outline',
        content: `
          <p>Photo nutrition uses computer vision AI to identify foods and estimate portion sizes. Follow these tips for best results.</p>

          <h4>How to Take the Perfect Food Photo</h4>
          <ol>
            <li><strong>Position:</strong> Take the photo from directly above your plate (bird's eye view)</li>
            <li><strong>Lighting:</strong> Ensure good, even lighting. Natural daylight is best.</li>
            <li><strong>Reference:</strong> Include your hand, phone, or a known object for scale</li>
            <li><strong>Frame:</strong> Capture the entire plate/meal in the frame</li>
            <li><strong>Focus:</strong> Make sure the image is clear and in focus</li>
          </ol>

          <div class="tip-box">
            <strong>💡 Pro Tip:</strong> For mixed dishes (burrito bowls, stir-fries), spread ingredients out slightly so the AI can see each component clearly.
          </div>
        `,
      },
      {
        id: 'pnt-section-2',
        title: 'Using Photo Nutrition',
        icon: 'add-circle-outline',
        content: `
          <h4>Step-by-Step Instructions</h4>
          <ol>
            <li>Go to the <strong>Nutrition</strong> tab</li>
            <li>Tap <strong>Add Food</strong></li>
            <li>Tap the <strong>Camera icon</strong></li>
            <li>Choose <strong>Take Photo</strong> or <strong>Choose from Library</strong></li>
            <li>Take or select your food photo</li>
            <li>Wait 3-5 seconds for AI analysis</li>
            <li>Review the identified foods and macros</li>
            <li>Edit any items if needed</li>
            <li>Tap <strong>Save to Log</strong></li>
          </ol>

          <h4>What the AI Shows You</h4>
          <p>Unlike other apps that give a single opaque entry, FitOS shows a <strong>transparent breakdown</strong>:</p>
          <ul>
            <li>Each identified food as a separate line item</li>
            <li>Estimated portion size for each food</li>
            <li>Macros (protein, carbs, fat) per food</li>
            <li>Total meal macros at the bottom</li>
            <li>Confidence score for each identification</li>
          </ul>
        `,
      },
      {
        id: 'pnt-section-3',
        title: 'Editing AI Results',
        icon: 'create-outline',
        content: `
          <p>AI is ~85-90% accurate for common foods, but you should always review and adjust:</p>

          <h4>How to Edit Identified Foods</h4>
          <ol>
            <li>Tap any food in the results list</li>
            <li>You can:
              <ul>
                <li><strong>Change the food:</strong> Search for the correct item</li>
                <li><strong>Adjust portion:</strong> Increase/decrease the serving size</li>
                <li><strong>Edit macros:</strong> Manually adjust protein/carbs/fat</li>
                <li><strong>Delete:</strong> Remove incorrect identifications</li>
              </ul>
            </li>
            <li>Tap <strong>Save</strong> to update the food</li>
          </ol>

          <h4>Adding Missing Foods</h4>
          <p>If the AI missed something:</p>
          <ol>
            <li>Tap <strong>Add Item</strong> at the bottom</li>
            <li>Search for the food manually</li>
            <li>Enter the portion size</li>
            <li>Tap <strong>Add</strong></li>
          </ol>

          <div class="tip-box">
            <strong>💡 Pro Tip:</strong> The AI learns from your corrections. If you consistently change "chicken" to "grilled chicken breast", it will start suggesting that instead.
          </div>
        `,
      },
      {
        id: 'pnt-section-4',
        title: 'Best Practices',
        icon: 'checkmark-done-outline',
        content: `
          <h4>Foods That Work Best</h4>
          <ul>
            <li><strong>Whole foods:</strong> Chicken breast, rice, vegetables, fruits</li>
            <li><strong>Common meals:</strong> Eggs, oatmeal, salads, sandwiches</li>
            <li><strong>Restaurant items:</strong> Burgers, pizza (specify toppings if possible)</li>
            <li><strong>Packaged items:</strong> Works well, but barcode scanning is faster</li>
          </ul>

          <h4>Challenging Foods</h4>
          <p>These require manual logging or voice description:</p>
          <ul>
            <li><strong>Soups/stews:</strong> Hard to see ingredients clearly</li>
            <li><strong>Smoothies:</strong> Can't identify blended ingredients</li>
            <li><strong>Sauces/oils:</strong> Invisible in photos (manually add these)</li>
            <li><strong>Highly processed:</strong> Uncommon dishes the AI hasn't seen</li>
          </ul>

          <h4>Macro Accuracy Tips</h4>
          <ul>
            <li>For protein sources, specify cooking method: "grilled chicken" not just "chicken"</li>
            <li>Include your hand in the photo for better portion estimation</li>
            <li>For restaurant food, mention the restaurant: "Chipotle chicken bowl"</li>
            <li>Weigh ingredients when possible for maximum accuracy</li>
          </ul>
        `,
        tips: [
          'Take photos before you start eating for best image quality',
          'For meal prep, photograph containers from above with labels visible',
          'If lighting is poor, use your phone flashlight held at an angle',
        ],
      },
    ],
    relatedGuides: ['voice-workout-logging', 'ai-coaching-chat'],
  },

  // ============================================================================
  // AI COACHING CHAT
  // ============================================================================
  {
    id: 'ai-coaching-chat',
    title: 'AI Coaching Chat',
    slug: 'ai-coaching-chat',
    description: 'Get instant answers about training, nutrition, and recovery from the AI coach',
    icon: 'chatbubble-ellipses-outline',
    roles: ['client', 'trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 5,
    sections: [
      {
        id: 'acc-section-1',
        title: 'What is AI Coaching?',
        icon: 'information-circle-outline',
        content: `
          <p>FitOS AI Coach is your 24/7 training assistant. It answers questions, provides form tips, suggests exercise substitutions, and helps with meal planning.</p>

          <h4>What AI Can Help With</h4>
          <ul>
            <li><strong>Exercise form:</strong> "How do I perform a Romanian deadlift?"</li>
            <li><strong>Substitutions:</strong> "I don't have a leg press, what can I do instead?"</li>
            <li><strong>Programming questions:</strong> "Why am I doing 3 sets of 12 instead of 5 sets of 5?"</li>
            <li><strong>Nutrition:</strong> "What are good high-protein vegetarian foods?"</li>
            <li><strong>Recovery:</strong> "My HRV dropped, should I train today?"</li>
            <li><strong>Progress:</strong> "How much should I increase weight each week?"</li>
          </ul>

          <h4>What AI Doesn't Replace</h4>
          <p>AI supplements your trainer but doesn't replace them:</p>
          <ul>
            <li>Your trainer creates your program and sets targets</li>
            <li>Your trainer makes strategic decisions about your training</li>
            <li>AI handles quick questions and real-time assistance</li>
            <li>AI applies your trainer's methodology consistently</li>
          </ul>
        `,
      },
      {
        id: 'acc-section-2',
        title: 'Using the AI Chat',
        icon: 'chatbubbles-outline',
        content: `
          <h4>Opening the Chat</h4>
          <ol>
            <li>Tap the <strong>Chat icon</strong> in the top navigation bar</li>
            <li>Or tap <strong>Ask AI</strong> from workout/nutrition screens</li>
            <li>Type your question in the text box</li>
            <li>Tap <strong>Send</strong> or press Enter</li>
          </ol>

          <h4>Getting Better Answers</h4>
          <p>Be specific for best results:</p>
          <ul>
            <li><strong>❌ Vague:</strong> "How do I build muscle?"</li>
            <li><strong>✅ Specific:</strong> "I'm stuck at 185 lbs bench press for 3 weeks. How should I progress?"</li>
          </ul>

          <ul>
            <li><strong>❌ Too broad:</strong> "What should I eat?"</li>
            <li><strong>✅ Targeted:</strong> "I need 180g protein daily. What are 3 easy high-protein meals?"</li>
          </ul>

          <h4>Context-Aware Responses</h4>
          <p>The AI knows:</p>
          <ul>
            <li>Your current program and recent workouts</li>
            <li>Your nutrition targets and recent intake</li>
            <li>Your trainer's coaching methodology</li>
            <li>Your wearable data (if connected)</li>
          </ul>
          <p>This means it can give personalized advice, not generic information.</p>
        `,
      },
      {
        id: 'acc-section-3',
        title: 'Common Use Cases',
        icon: 'bulb-outline',
        content: `
          <h4>During Workouts</h4>
          <p><strong>"This exercise doesn't feel right. Am I doing it wrong?"</strong></p>
          <p>→ AI provides form cues, common mistakes, and video references</p>

          <p><strong>"I'm too sore to do squats today. What should I sub?"</strong></p>
          <p>→ AI suggests alternatives that don't aggravate soreness</p>

          <p><strong>"My program says 'AMRAP'. What does that mean?"</strong></p>
          <p>→ AI explains training terminology</p>

          <h4>Nutrition Questions</h4>
          <p><strong>"I'm 50g short on protein. Quick ideas?"</strong></p>
          <p>→ AI suggests foods/snacks to hit your target</p>

          <p><strong>"Can I have a cheat meal?"</strong></p>
          <p>→ AI explains flexible dieting and weekly balance</p>

          <h4>Recovery & Progress</h4>
          <p><strong>"My Whoop says I'm 32% recovered. Should I lift heavy?"</strong></p>
          <p>→ AI interprets your readiness data and suggests adjustments</p>

          <p><strong>"I haven't hit a PR in 6 weeks. Is my program working?"</strong></p>
          <p>→ AI reviews your progress and explains training phases</p>
        `,
      },
      {
        id: 'acc-section-4',
        title: 'Privacy & Data',
        icon: 'shield-checkmark-outline',
        content: `
          <h4>How Your Data is Used</h4>
          <p><strong>Your personal data is NEVER used to train public AI models.</strong></p>

          <p>Here's what happens:</p>
          <ul>
            <li>AI responses are based on YOUR data only (workouts, nutrition, etc.)</li>
            <li>Your trainer's methodology is learned from their programming patterns</li>
            <li>General fitness knowledge comes from pre-trained models</li>
            <li>All processing uses encryption and follows HIPAA standards</li>
          </ul>

          <h4>Conversation History</h4>
          <ul>
            <li>Chat history is stored for 30 days</li>
            <li>You can delete individual messages or entire conversations</li>
            <li>Your trainer CANNOT see your AI chat conversations</li>
            <li>Conversations are private between you and the AI</li>
          </ul>

          <h4>Disabling AI Features</h4>
          <p>You can turn off AI coaching anytime:</p>
          <ol>
            <li>Go to <strong>Settings</strong> → <strong>AI Preferences</strong></li>
            <li>Toggle <strong>AI Coaching Chat</strong> off</li>
            <li>Save preferences</li>
          </ol>
        `,
        tips: [
          'AI responses typically take 2-3 seconds. For complex questions, it may take longer.',
          'If you get an error, check your internet connection and try again.',
          'The AI improves over time as it learns your preferences and your trainer\'s style.',
        ],
      },
    ],
    relatedGuides: ['voice-workout-logging', 'photo-nutrition'],
  },

  // ============================================================================
  // WORKOUT BUILDER (Trainer/Owner only)
  // ============================================================================
  {
    id: 'workout-builder',
    title: 'Workout Builder',
    slug: 'workout-builder',
    description: 'Create custom workout programs and assign them to clients',
    icon: 'construct-outline',
    roles: ['trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 8,
    sections: [
      {
        id: 'wb-section-1',
        title: 'Creating a Workout',
        icon: 'add-circle-outline',
        content: `
          <h4>Basic Workout Creation</h4>
          <ol>
            <li>Go to <strong>Workouts</strong> tab</li>
            <li>Tap <strong>Create Workout</strong></li>
            <li>Enter a workout name (e.g., "Upper Body Strength")</li>
            <li>Add optional notes for your client</li>
            <li>Tap <strong>Add Exercise</strong></li>
            <li>Search the exercise library (900+ exercises)</li>
            <li>Select an exercise</li>
            <li>Configure sets, reps, weight, rest time</li>
            <li>Repeat to add more exercises</li>
            <li>Tap <strong>Save Workout</strong></li>
          </ol>

          <h4>Exercise Configuration Options</h4>
          <p>For each exercise, you can set:</p>
          <ul>
            <li><strong>Sets:</strong> Number of sets (or leave flexible)</li>
            <li><strong>Reps:</strong> Target reps or rep range (e.g., "8-12")</li>
            <li><strong>Weight:</strong> Prescribed weight or % of 1RM</li>
            <li><strong>Rest:</strong> Rest time between sets (30s - 5min)</li>
            <li><strong>Tempo:</strong> Lifting tempo (e.g., "3-1-1-0")</li>
            <li><strong>RPE/RIR:</strong> Effort level (RPE 1-10 or RIR 0-4)</li>
            <li><strong>Notes:</strong> Form cues or special instructions</li>
          </ul>
        `,
      },
      {
        id: 'wb-section-2',
        title: 'Exercise Library',
        icon: 'library-outline',
        content: `
          <p>FitOS includes 900+ exercises across all categories:</p>

          <h4>Exercise Categories</h4>
          <ul>
            <li><strong>Compound:</strong> Multi-joint movements (squats, deadlifts, presses)</li>
            <li><strong>Accessory:</strong> Isolation exercises (curls, extensions, raises)</li>
            <li><strong>Cardio:</strong> Running, cycling, rowing, HIIT</li>
            <li><strong>Core:</strong> Planks, crunches, anti-rotation work</li>
            <li><strong>Mobility:</strong> Stretching, foam rolling, dynamic warm-ups</li>
          </ul>

          <h4>Finding Exercises</h4>
          <ul>
            <li><strong>Search:</strong> Type the exercise name (e.g., "goblet squat")</li>
            <li><strong>Filter by muscle:</strong> Chest, Back, Legs, Shoulders, Arms, Core</li>
            <li><strong>Filter by equipment:</strong> Barbell, Dumbbell, Machine, Bodyweight</li>
            <li><strong>Filter by type:</strong> Compound, Accessory, Cardio</li>
          </ul>

          <h4>Custom Exercises</h4>
          <p>Can't find an exercise? Create your own:</p>
          <ol>
            <li>When searching, tap <strong>Create Custom Exercise</strong></li>
            <li>Enter exercise name</li>
            <li>Select muscle group and category</li>
            <li>Add optional notes or video URL</li>
            <li>Save to your library</li>
          </ol>
          <p>Custom exercises sync across all your clients.</p>
        `,
      },
      {
        id: 'wb-section-3',
        title: 'Building Programs',
        icon: 'calendar-outline',
        content: `
          <p>Programs are multi-week training plans with progressive overload built in.</p>

          <h4>Creating a Program</h4>
          <ol>
            <li>Go to <strong>Workouts</strong> → <strong>Programs</strong></li>
            <li>Tap <strong>Create Program</strong></li>
            <li>Name your program (e.g., "12-Week Hypertrophy Block")</li>
            <li>Set program duration (weeks)</li>
            <li>Add phases (e.g., Accumulation, Intensification, Deload)</li>
            <li>Assign workouts to specific days</li>
            <li>Configure auto-progression rules</li>
            <li>Save and assign to clients</li>
          </ol>

          <h4>Auto-Progression Rules</h4>
          <p>FitOS can automatically progress your clients:</p>
          <ul>
            <li><strong>Linear:</strong> Add 5 lbs per week</li>
            <li><strong>Double progression:</strong> Increase reps, then weight</li>
            <li><strong>Wave loading:</strong> Vary intensity week-to-week</li>
            <li><strong>Custom:</strong> Define your own progression logic</li>
          </ul>

          <h4>Program Templates</h4>
          <p>Save programs as templates for reuse:</p>
          <ul>
            <li>After creating a program, tap <strong>Save as Template</strong></li>
            <li>Templates appear when assigning programs to new clients</li>
            <li>You can have multiple templates for different goals</li>
            <li>Templates can be edited without affecting existing client programs</li>
          </ul>
        `,
      },
      {
        id: 'wb-section-4',
        title: 'Assigning Workouts',
        icon: 'person-add-outline',
        content: `
          <h4>Assigning to Clients</h4>
          <p><strong>Single Workout:</strong></p>
          <ol>
            <li>Create or select a workout</li>
            <li>Tap <strong>Assign</strong></li>
            <li>Select client(s)</li>
            <li>Choose date to assign</li>
            <li>Add optional message</li>
            <li>Tap <strong>Send</strong></li>
          </ol>

          <p><strong>Full Program:</strong></p>
          <ol>
            <li>Go to client profile</li>
            <li>Tap <strong>Programs</strong> tab</li>
            <li>Tap <strong>Assign Program</strong></li>
            <li>Select program or template</li>
            <li>Set start date</li>
            <li>Tap <strong>Assign</strong></li>
          </ol>

          <h4>Mid-Program Adjustments</h4>
          <p>Need to modify an active program?</p>
          <ul>
            <li><strong>Individual workout:</strong> Edit directly, changes apply to future sessions</li>
            <li><strong>Entire program:</strong> Tap <strong>Edit Program</strong> from client's Programs tab</li>
            <li><strong>Swap exercises:</strong> Clients can request substitutions, you approve/modify</li>
            <li><strong>Deload week:</strong> Reduce volume/intensity for recovery</li>
          </ul>
        `,
        tips: [
          'Use program templates to save time onboarding new clients with similar goals',
          'Add form cues in exercise notes to reduce questions and improve technique',
          'Set realistic progression rates. 5-10 lbs per week on compound lifts is standard.',
        ],
      },
    ],
    relatedGuides: ['crm-pipeline', 'ai-coaching-chat'],
  },

  // ============================================================================
  // CRM PIPELINE (Trainer/Owner only)
  // ============================================================================
  {
    id: 'crm-pipeline',
    title: 'CRM Pipeline',
    slug: 'crm-pipeline',
    description: 'Manage leads, track your sales process, and convert prospects into clients',
    icon: 'funnel-outline',
    roles: ['trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 7,
    sections: [
      {
        id: 'crm-section-1',
        title: 'Understanding the Pipeline',
        icon: 'analytics-outline',
        content: `
          <p>The CRM pipeline helps you track leads from first contact to paying client.</p>

          <h4>Pipeline Stages</h4>
          <ol>
            <li><strong>New:</strong> Just added, no contact yet</li>
            <li><strong>Contacted:</strong> Initial outreach sent (email, DM, call)</li>
            <li><strong>Qualified:</strong> Expressed interest, fit for your services</li>
            <li><strong>Consultation:</strong> Sales call scheduled or completed</li>
            <li><strong>Won:</strong> Became a paying client 🎉</li>
            <li><strong>Lost:</strong> Not interested or didn't convert</li>
          </ol>

          <h4>Why Use a CRM?</h4>
          <ul>
            <li>Never lose track of a lead</li>
            <li>Follow up at the right time</li>
            <li>See your conversion rate at each stage</li>
            <li>Identify where leads drop off</li>
            <li>Track lead sources (Instagram, referrals, etc.)</li>
          </ul>
        `,
      },
      {
        id: 'crm-section-2',
        title: 'Adding & Managing Leads',
        icon: 'person-add-outline',
        content: `
          <h4>Adding a New Lead</h4>
          <ol>
            <li>Go to <strong>Clients</strong> → <strong>Leads</strong> tab</li>
            <li>Tap <strong>Add Lead</strong></li>
            <li>Enter their information:
              <ul>
                <li>Name</li>
                <li>Email and/or phone</li>
                <li>Lead source (Instagram, Google, Referral, etc.)</li>
                <li>Notes (goals, pain points, how they found you)</li>
              </ul>
            </li>
            <li>Tap <strong>Save</strong></li>
          </ol>

          <h4>Moving Leads Through Stages</h4>
          <p><strong>Option 1: Drag and drop</strong></p>
          <ul>
            <li>Tap and hold a lead card</li>
            <li>Drag to the next stage</li>
            <li>Release to drop</li>
          </ul>

          <p><strong>Option 2: Swipe</strong></p>
          <ul>
            <li>Swipe right on a lead</li>
            <li>Select <strong>Move to [Next Stage]</strong></li>
          </ul>

          <p><strong>Option 3: Lead detail page</strong></p>
          <ul>
            <li>Tap the lead to open details</li>
            <li>Tap <strong>Change Stage</strong></li>
            <li>Select the new stage</li>
          </ul>
        `,
      },
      {
        id: 'crm-section-3',
        title: 'Lead Sources & Analytics',
        icon: 'stats-chart-outline',
        content: `
          <h4>Tracking Lead Sources</h4>
          <p>Know which marketing channels work best:</p>

          <p><strong>Default Sources:</strong></p>
          <ul>
            <li>Instagram</li>
            <li>Facebook</li>
            <li>Google</li>
            <li>Referral</li>
            <li>Website</li>
            <li>Other</li>
          </ul>

          <p><strong>Custom Sources:</strong></p>
          <ul>
            <li>Go to <strong>Clients</strong> → <strong>Leads</strong> → <strong>Sources</strong></li>
            <li>Tap <strong>Add Source</strong></li>
            <li>Name it (e.g., "YouTube", "Podcast", "Local Gym")</li>
            <li>Save</li>
          </ul>

          <h4>Viewing Analytics</h4>
          <p>Go to <strong>Clients</strong> → <strong>Leads</strong> → <strong>Analytics</strong> to see:</p>
          <ul>
            <li><strong>Conversion rate:</strong> % of leads that become clients</li>
            <li><strong>Stage conversion:</strong> Where leads drop off</li>
            <li><strong>Lead source ROI:</strong> Which channels convert best</li>
            <li><strong>Average time to close:</strong> How long from lead to client</li>
            <li><strong>Pipeline value:</strong> Potential monthly revenue in your pipeline</li>
          </ul>
        `,
      },
      {
        id: 'crm-section-4',
        title: 'Follow-Up & Automation',
        icon: 'time-outline',
        content: `
          <h4>Setting Reminders</h4>
          <ol>
            <li>Open a lead</li>
            <li>Tap <strong>Add Reminder</strong></li>
            <li>Choose date/time (e.g., "Follow up in 3 days")</li>
            <li>Add note about what to do</li>
            <li>Save</li>
          </ol>
          <p>You'll get a push notification when it's time to follow up.</p>

          <h4>Email Automation</h4>
          <p>Set up automated email sequences for new leads:</p>
          <ol>
            <li>Go to <strong>Clients</strong> → <strong>Marketing</strong> → <strong>Automations</strong></li>
            <li>Tap <strong>Create Sequence</strong></li>
            <li>Name it "New Lead Nurture"</li>
            <li>Add emails:
              <ul>
                <li>Day 0: Welcome + intro</li>
                <li>Day 2: Free workout guide</li>
                <li>Day 5: Success story/testimonial</li>
                <li>Day 7: Book consultation</li>
              </ul>
            </li>
            <li>Set trigger: "When lead is added"</li>
            <li>Activate</li>
          </ol>

          <h4>Best Practices</h4>
          <ul>
            <li><strong>Follow up within 24 hours</strong> of a new lead</li>
            <li><strong>Add detailed notes</strong> after each conversation</li>
            <li><strong>Move leads forward</strong> don't let them sit in one stage for weeks</li>
            <li><strong>Mark "Lost" leads</strong> with a reason (too expensive, bad timing, etc.) to learn from them</li>
          </ul>
        `,
        tips: [
          'Review your pipeline every Monday morning to plan your week',
          'For "Lost" leads, set a follow-up reminder for 3-6 months later',
          'If a lead sits in "Qualified" for more than 7 days, reach out to re-engage',
        ],
      },
    ],
    relatedGuides: ['workout-builder', 'email-marketing'],
  },

  // ============================================================================
  // EMAIL MARKETING (Trainer/Owner only) - Abbreviated for space
  // ============================================================================
  {
    id: 'email-marketing',
    title: 'Email Marketing',
    slug: 'email-marketing',
    description: 'Create campaigns, build automation sequences, and grow your fitness business',
    icon: 'mail-outline',
    roles: ['trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 6,
    sections: [
      {
        id: 'em-section-1',
        title: 'Creating Campaigns',
        icon: 'create-outline',
        content: `
          <p>Send targeted email campaigns to your clients and leads without needing Mailchimp or ConvertKit.</p>

          <h4>Creating Your First Campaign</h4>
          <ol>
            <li>Go to <strong>Clients</strong> → <strong>Marketing</strong> → <strong>Campaigns</strong></li>
            <li>Tap <strong>Create Campaign</strong></li>
            <li>Choose a template or start from scratch</li>
            <li>Write your email content (rich text editor)</li>
            <li>Select recipients (all clients, leads only, or specific tags)</li>
            <li>Preview the email</li>
            <li>Schedule or send immediately</li>
          </ol>

          <h4>Email Templates</h4>
          <p>Pre-built templates for common emails:</p>
          <ul>
            <li>Welcome series</li>
            <li>Weekly check-in</li>
            <li>Program launch</li>
            <li>Holiday special</li>
            <li>Re-engagement</li>
          </ul>
          <p>Or create custom templates and save for reuse.</p>
        `,
      },
      {
        id: 'em-section-2',
        title: 'Email Automation',
        icon: 'git-branch-outline',
        content: `
          <p>Set up drip campaigns that run on autopilot.</p>

          <h4>Common Automation Sequences</h4>
          <ul>
            <li><strong>New Client Onboarding:</strong> Welcome, set expectations, first workout tips</li>
            <li><strong>Lead Nurture:</strong> Educate leads before they commit</li>
            <li><strong>Check-in Reminders:</strong> Auto-remind clients to submit weekly check-ins</li>
            <li><strong>Re-engagement:</strong> Win back clients who haven't logged in 14+ days</li>
            <li><strong>Birthday/Anniversary:</strong> Personalized messages on special dates</li>
          </ul>

          <p>Sequences run automatically when triggered. Leads are removed if they become clients or unsubscribe.</p>
        `,
      },
      {
        id: 'em-section-3',
        title: 'Tracking Performance',
        icon: 'bar-chart-outline',
        content: `
          <h4>Email Metrics</h4>
          <p>For each campaign, you can see:</p>
          <ul>
            <li><strong>Delivered:</strong> How many emails were successfully delivered</li>
            <li><strong>Open rate:</strong> % who opened your email</li>
            <li><strong>Click rate:</strong> % who clicked a link</li>
            <li><strong>Replies:</strong> Direct responses to your email</li>
            <li><strong>Unsubscribes:</strong> Who opted out</li>
          </ul>

          <h4>Improving Your Emails</h4>
          <ul>
            <li><strong>Subject lines:</strong> Test different approaches (question vs. benefit)</li>
            <li><strong>Send time:</strong> Tuesday-Thursday 10 AM performs best for fitness</li>
            <li><strong>Content length:</strong> Keep it under 200 words for better engagement</li>
            <li><strong>Clear CTA:</strong> One primary call-to-action per email</li>
          </ul>
        `,
      },
    ],
    relatedGuides: ['crm-pipeline'],
  },

  // ============================================================================
  // WEARABLE INTEGRATION
  // ============================================================================
  {
    id: 'wearable-integration',
    title: 'Wearable Integration',
    slug: 'wearable-integration',
    description: 'Connect your Apple Watch, Fitbit, Oura, or other device to track recovery',
    icon: 'watch-outline',
    roles: ['client', 'trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 4,
    sections: [
      {
        id: 'wi-section-1',
        title: 'Connecting Your Device',
        icon: 'link-outline',
        content: `
          <h4>Supported Devices</h4>
          <p>FitOS connects with all major fitness wearables:</p>
          <ul>
            <li>Apple Watch & Apple Health</li>
            <li>Garmin (all models)</li>
            <li>Fitbit</li>
            <li>Whoop</li>
            <li>Oura Ring</li>
            <li>Polar</li>
            <li>Suunto</li>
            <li>Google Fit</li>
          </ul>

          <h4>Connection Steps</h4>
          <ol>
            <li>Go to <strong>Settings</strong> → <strong>Wearable Devices</strong></li>
            <li>Tap <strong>Connect Device</strong></li>
            <li>Select your device brand</li>
            <li>Log in to your device account (if prompted)</li>
            <li>Grant FitOS permission to read health data</li>
            <li>Tap <strong>Authorize</strong></li>
          </ol>
          <p>Initial sync may take a few minutes. After that, data syncs automatically.</p>
        `,
      },
      {
        id: 'wi-section-2',
        title: 'What Data Syncs',
        icon: 'pulse-outline',
        content: `
          <h4>Metrics FitOS Tracks</h4>
          <ul>
            <li><strong>Sleep:</strong> Duration, quality, sleep stages (deep, REM, light)</li>
            <li><strong>Resting heart rate:</strong> Daily average</li>
            <li><strong>Heart rate variability (HRV):</strong> Recovery indicator</li>
            <li><strong>Steps:</strong> Daily step count</li>
            <li><strong>Readiness/recovery scores:</strong> Device-specific scores (Whoop, Oura, Garmin)</li>
            <li><strong>Workout heart rate:</strong> HR during training sessions</li>
          </ul>

          <h4>What We DON'T Sync</h4>
          <p><strong>Calorie burn estimates:</strong> Research shows wearable calorie estimates are highly inaccurate (off by 20-40%). We don't want to mislead you with bad data.</p>

          <p>For accurate calorie tracking, log your food intake instead.</p>
        `,
      },
      {
        id: 'wi-section-3',
        title: 'Using Recovery Data',
        icon: 'fitness-outline',
        content: `
          <h4>How to Interpret HRV</h4>
          <p><strong>HRV (Heart Rate Variability)</strong> measures your nervous system recovery:</p>
          <ul>
            <li><strong>Higher HRV:</strong> Better recovered, ready for hard training</li>
            <li><strong>Lower HRV:</strong> Still recovering, consider lighter training</li>
          </ul>

          <p><strong>What to do based on HRV:</strong></p>
          <ul>
            <li><strong>HRV within normal range:</strong> Train as planned</li>
            <li><strong>HRV down 10-20%:</strong> Reduce volume or intensity slightly</li>
            <li><strong>HRV down 20%+:</strong> Active recovery day or rest</li>
          </ul>

          <h4>Sharing Data with Your Trainer</h4>
          <p>Your trainer can use your wearable data to adjust your program:</p>
          <ol>
            <li>Go to <strong>Settings</strong> → <strong>Privacy</strong> → <strong>Trainer Visibility</strong></li>
            <li>Toggle what data your trainer can see:
              <ul>
                <li>Sleep duration (default: ON)</li>
                <li>Resting heart rate (default: ON)</li>
                <li>HRV (default: OFF - enable for better programming)</li>
                <li>Readiness scores (default: OFF)</li>
              </ul>
            </li>
            <li>Save preferences</li>
          </ol>
        `,
        tips: [
          'Wear your device to bed every night for consistent sleep tracking',
          'HRV is most accurate when measured first thing in the morning',
          'If HRV drops significantly, prioritize sleep and stress management',
        ],
      },
    ],
    relatedGuides: ['ai-coaching-chat'],
  },

  // ============================================================================
  // APPLE WATCH APP (Abbreviated placeholder)
  // ============================================================================
  {
    id: 'apple-watch-app',
    title: 'Apple Watch App',
    slug: 'apple-watch-app',
    description: 'Log workouts directly from your wrist with the FitOS Apple Watch companion app',
    icon: 'watch-outline',
    roles: ['client', 'trainer', 'gym_owner'],
    lastUpdated: new Date('2026-01-22'),
    estimatedReadTime: 4,
    sections: [
      {
        id: 'aw-section-1',
        title: 'Getting Started',
        icon: 'rocket-outline',
        content: `
          <p>The FitOS Apple Watch app lets you log workouts without pulling out your phone.</p>

          <h4>Installing the Watch App</h4>
          <ol>
            <li>Install FitOS on your iPhone</li>
            <li>Open the Watch app on iPhone</li>
            <li>Scroll to FitOS</li>
            <li>Tap <strong>Install</strong></li>
          </ol>

          <h4>Logging a Workout</h4>
          <ol>
            <li>Open FitOS on your Apple Watch</li>
            <li>Your today's workout appears automatically</li>
            <li>Tap an exercise to start logging</li>
            <li>Enter weight and reps using the dial or dictation</li>
            <li>Tap <strong>Done</strong> to log the set</li>
          </ol>

          <p>All data syncs automatically to your iPhone and your trainer's dashboard.</p>
        `,
      },
      {
        id: 'aw-section-2',
        title: 'Watch Features',
        icon: 'options-outline',
        content: `
          <h4>What You Can Do on Watch</h4>
          <ul>
            <li>Log sets with weight and reps</li>
            <li>Start rest timers</li>
            <li>Skip exercises</li>
            <li>View exercise history</li>
            <li>See workout summary</li>
          </ul>

          <h4>Limitations</h4>
          <p>Some features require your iPhone:</p>
          <ul>
            <li>Creating custom workouts</li>
            <li>Viewing video demos</li>
            <li>Detailed exercise substitutions</li>
          </ul>

          <p>Use the Watch for quick logging during workouts, and the iPhone for planning and analysis.</p>
        `,
      },
    ],
    relatedGuides: ['wearable-integration', 'voice-workout-logging'],
  },
];
