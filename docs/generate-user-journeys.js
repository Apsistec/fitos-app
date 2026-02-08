const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType, PageBreak, UnderlineType, TabStopType, TabStopPosition } = require('docx');
const fs = require('fs');
const path = require('path');

// Color scheme
const primaryColor = '1F4788';   // Dark blue
const accentColor = '0066CC';   // Bright blue
const lightGray = 'F5F5F5';     // Light gray for tables
const darkGray = '333333';      // Dark text

// Utility functions
function createHeader(text, level = 1) {
  let size = 28;
  let color = primaryColor;
  let spacing = 240;

  if (level === 1) size = 32;
  if (level === 2) size = 28;
  if (level === 3) size = 24;

  return new Paragraph({
    text: text,
    heading: HeadingLevel[`HEADING_${level}`],
    thematicBreak: false,
    spacing: { line: spacing, lineRule: 'auto', before: level === 1 ? 240 : 120, after: 120 },
    style: 'Heading' + level,
    border: {
      bottom: {
        color: color,
        space: 1,
        style: level === 1 ? BorderStyle.DOUBLE : BorderStyle.SINGLE,
        size: level === 1 ? 12 : 6,
      },
    },
    run: {
      bold: true,
      size: size * 2,
      color: color,
      font: 'Arial',
    },
  });
}

function createBodyText(text, bold = false, italic = false, size = 22) {
  return new Paragraph({
    text: text,
    spacing: { line: 240, lineRule: 'auto', after: 100 },
    alignment: AlignmentType.LEFT,
    run: {
      bold: bold,
      italic: italic,
      size: size * 2,
      color: darkGray,
      font: 'Arial',
    },
  });
}

function createBulletPoint(text, level = 0) {
  return new Paragraph({
    text: text,
    spacing: { line: 200, lineRule: 'auto', after: 80 },
    alignment: AlignmentType.LEFT,
    level: level,
    bullet: {
      level: level,
    },
    run: {
      size: 22 * 2,
      color: darkGray,
      font: 'Arial',
    },
  });
}

function createTableOfContents() {
  const toc = [
    createHeader('Table of Contents', 1),
  ];

  const contents = [
    '1. Executive Summary',
    '2. Current State Analysis - Issues Found',
    '3. Client User Journeys (15+ journeys)',
    '4. Trainer User Journeys (25+ journeys)',
    '5. Gym Owner User Journeys (20+ journeys)',
    '6. Tab Navigation Architecture per Role',
    '7. Feature Matrix',
    '8. Permission Enforcement Strategy',
  ];

  contents.forEach(item => {
    toc.push(new Paragraph({
      text: item,
      spacing: { line: 200, lineRule: 'auto', after: 100 },
      level: item.startsWith('  ') ? 1 : 0,
      run: {
        size: 22 * 2,
        color: accentColor,
        font: 'Arial',
      },
    }));
  });

  return toc;
}

function createFeatureMatrix() {
  const features = [
    ['Feature', 'Client', 'Trainer', 'Owner'],
    ['Register / Onboarding', '✓', '✓', '✓'],
    ['View Dashboard', '✓', '✓', '✓'],
    ['Manage Profile', '✓', '✓', '✓'],
    ['View Workouts', '✓', '✓', '✓'],
    ['Execute Workouts', '✓', '', ''],
    ['Create Workouts', '', '✓', ''],
    ['Log Nutrition', '✓', '', ''],
    ['Set Nutrition Targets', '', '✓', ''],
    ['Message Users', '✓', '✓', ''],
    ['Invite Users', '', '✓', '✓'],
    ['View Client List', '', '✓', '✓'],
    ['View Analytics', '✓', '✓', '✓'],
    ['Manage Payments', '', '✓', '✓'],
    ['View Revenue', '', '✓', '✓'],
    ['Manage Trainers', '', '', '✓'],
    ['View All Members', '', '', '✓'],
    ['Access Help Center', '✓', '✓', '✓'],
    ['Manage Settings', '✓', '✓', '✓'],
    ['Set Permissions', '', '', '✓'],
    ['View Audit Logs', '', '', '✓'],
  ];

  const rows = features.map((row, rowIndex) => {
    const isHeader = rowIndex === 0;

    const cells = row.map((cell, cellIndex) => {
      const isFeatureCol = cellIndex === 0;

      return new TableCell({
        children: [
          new Paragraph({
            text: cell,
            alignment: AlignmentType.CENTER,
            run: {
              bold: isHeader,
              size: 20 * 2,
              color: isHeader ? '#FFFFFF' : darkGray,
              font: 'Arial',
            },
          }),
        ],
        shading: {
          type: ShadingType.CLEAR,
          color: isHeader ? primaryColor : (isFeatureCol ? lightGray : '#FFFFFF'),
        },
        width: {
          size: cellIndex === 0 ? 3000 : 2000,
          type: WidthType.DXA,
        },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
          left: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
          right: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
        },
        margins: { top: 100, bottom: 100, left: 100, right: 100 },
      });
    });

    return new TableRow({
      height: { value: isHeader ? 400 : 300, rule: 'atLeast' },
      children: cells,
    });
  });

  return new Table({
    rows: rows,
    width: {
      size: 100,
      type: WidthType.PERCENTAGE,
    },
  });
}

function createJourneySection(title, journeys) {
  const elements = [createHeader(title, 2)];

  const grouped = {};
  journeys.forEach(journey => {
    if (!grouped[journey.category]) {
      grouped[journey.category] = [];
    }
    grouped[journey.category].push(journey);
  });

  Object.entries(grouped).forEach(([category, items]) => {
    elements.push(createHeader(category, 3));

    items.forEach(journey => {
      elements.push(new Paragraph({
        text: journey.code + ': ' + journey.title,
        spacing: { line: 200, lineRule: 'auto', after: 40 },
        level: 0,
        bullet: {
          level: 0,
        },
        run: {
          bold: true,
          size: 22 * 2,
          color: accentColor,
          font: 'Arial',
        },
      }));

      elements.push(createBodyText(journey.description, false, false, 20));
    });
  });

  return elements;
}

// Define all journeys
const clientJourneys = [
  // Onboarding
  { code: 'J-C01', category: 'Onboarding', title: 'Register as Client', description: 'User creates account with email/password, enters name, profile photo, and basic fitness goals (lose weight, build muscle, improve endurance, general fitness). Also captures dietary preferences for personalized nutrition guidance.' },
  { code: 'J-C02', category: 'Onboarding', title: 'Complete Onboarding', description: 'Complete fitness assessment: height, weight, body composition, current fitness level (beginner/intermediate/advanced), training experience. Option to connect wearable device (Apple Watch, Fitbit, Garmin) via HealthKit or Terra API.' },
  { code: 'J-C03', category: 'Onboarding', title: 'Accept Trainer Invitation', description: 'Receive email invitation from trainer. Can create new account or link to existing account. Upon acceptance, automatically connected with trainer and can access assigned workouts and nutrition plans.' },
  { code: 'J-C04', category: 'Onboarding', title: 'Connect Wearable Device', description: 'Link health tracking device (Apple Watch via HealthKit, Fitbit/Garmin via Terra API). Grants automatic syncing of steps, heart rate, sleep quality, and HRV data for recovery metrics.' },

  // Workouts
  { code: 'J-C05', category: 'Workouts', title: 'View Today\'s Workout', description: 'Home screen displays today\'s assigned workout with exercise order, target sets/reps/weight, rest periods, and difficulty level. Shows thumbnail videos of proper form for each exercise.' },
  { code: 'J-C06', category: 'Workouts', title: 'Execute Workout', description: 'Start workout timer, perform exercise, log each set (reps, weight, RPE). Built-in rest timer between sets. Audio/visual cues for form reminders. Complete workout with optional notes about how the session felt.' },
  { code: 'J-C07', category: 'Workouts', title: 'Log Workout via Voice', description: 'Voice input: "I did 3 sets of bench press at 185 pounds for 8, 7, and 6 reps." AI parses natural language, cross-references exercise library, and logs to history. Fallback to manual entry if parsing fails.' },
  { code: 'J-C08', category: 'Workouts', title: 'View Workout History', description: 'Calendar view of past 90 days of workouts. Details: exercises performed, sets/reps/weight for each, workout duration, notes. Volume trends (total weight moved per muscle group per week).' },
  { code: 'J-C09', category: 'Workouts', title: 'View Progress & PRs', description: 'Personal record tracking per exercise (highest weight × reps combination). Progress charts: strength progress over time, body weight trends, progress photos with date overlay. Breakdown by muscle group.' },

  // Nutrition
  { code: 'J-C10', category: 'Nutrition', title: 'Log Food via Search', description: 'Search USDA FoodData Central database for foods. Select portion size and add to meal. Auto-calculates macros and calories. Quick-add favorites. Batch add common meals (breakfast, lunch, dinner presets).' },
  { code: 'J-C11', category: 'Nutrition', title: 'Log Food via Voice', description: 'Voice input: "I had a chicken breast with rice and broccoli." AI parses ingredients, estimates portions, looks up macros from database. User can adjust portions if estimate seems off.' },
  { code: 'J-C12', category: 'Nutrition', title: 'Log Food via Photo', description: 'Take or upload photo of meal. Vision API identifies food items and estimates portion sizes. Auto-fetches macros from USDA database. User confirms or adjusts quantities.' },
  { code: 'J-C13', category: 'Nutrition', title: 'View Daily Nutrition Summary', description: 'Real-time macro breakdown: calories, protein, carbs, fat vs daily targets set by trainer. Visual bars showing adherence. No judgment/gamification - purely informational for awareness.' },
  { code: 'J-C14', category: 'Nutrition', title: 'View Nutrition History & Trends', description: 'Weekly/monthly macro adherence heatmap. Average daily intake by macronutrient. Trend lines for consistency. Identify patterns (high days, low days, weekly cycles). Export options for sharing with trainer.' },

  // Communication
  { code: 'J-C15', category: 'Communication', title: 'Message Trainer', description: 'Real-time chat with assigned trainer. Share photos, exercise videos. Ask form/programming questions. Receive notifications for trainer responses. Message history searchable.' },
  { code: 'J-C16', category: 'Communication', title: 'Submit Form Check Video', description: 'Record exercise video from phone camera, select exercise type. Submit with any notes about concerns. Trainer reviews and provides timestamped feedback with corrections.' },
  { code: 'J-C17', category: 'Communication', title: 'View AI Coach', description: 'Chat interface with AI trained on trainer\'s methodology and cues. Ask form questions ("How do I feel the glutes in this movement?"), get personalized tips based on trainer\'s documented approach.' },

  // Recovery & Wellness
  { code: 'J-C18', category: 'Recovery & Wellness', title: 'View Recovery Score', description: 'Aggregate readiness score from wearable data: HRV (heart rate variability), sleep quality, resting heart rate. Visual gauge: green/yellow/red. Historical trends. Recommendations when score dips.' },
  { code: 'J-C19', category: 'Recovery & Wellness', title: 'Complete Wellness Check-in', description: 'Daily mood/energy/soreness self-report (1-10 scales). Takes 30 seconds. Correlate user-reported soreness with workout volume. Identify patterns (e.g., legs always sore 48 hours post-leg-day).' },
  { code: 'J-C20', category: 'Recovery & Wellness', title: 'View Chronotype Assessment', description: 'Optional quiz: sleep patterns, natural energy peaks, preferences. AI recommends optimal training windows (e.g., "you\'re a morning person, peak strength at 8 AM").' },

  // Gamification & Social
  { code: 'J-C21', category: 'Gamification & Social', title: 'View Streaks & Badges', description: 'Weekly workout streak counter (forgiving: allows 1 miss per month). Achievement badges: "Logged 10 workouts," "PRed a lift," "Hit protein goal 7 days straight." Visual celebration when earned.' },
  { code: 'J-C22', category: 'Gamification & Social', title: 'View Leaderboard', description: 'Opt-in leaderboard: compare workout consistency, total volume, PRs with other clients (anonymized or display name only). Facility-wide or trainer-specific. Weekly/monthly rankings.' },
  { code: 'J-C23', category: 'Gamification & Social', title: 'Celebrate Milestones', description: 'PR celebrations: confetti effect, big number display, option to share. Streak milestones. Macro adherence milestones. Social sharing options to messaging/social platforms.' },

  // Account & Settings
  { code: 'J-C24', category: 'Account & Settings', title: 'Edit Profile', description: 'Update name, profile photo, units (lbs/kg, inches/cm), timezone, language preferences. Modify initial fitness goals and dietary restrictions without re-onboarding.' },
  { code: 'J-C25', category: 'Account & Settings', title: 'Manage Subscription', description: 'View current plan, payment method, billing date. See plan features (free vs paid tiers). Payment history. Cancel subscription with exit survey. Option to pause instead of cancel.' },
  { code: 'J-C26', category: 'Account & Settings', title: 'Access Help Center', description: 'Searchable FAQ, getting started guide, video tutorials for each feature (logging workouts, food, connecting wearables). Contact support form with category (bug, feature, billing, general).' },
  { code: 'J-C27', category: 'Account & Settings', title: 'Set Notification Preferences', description: 'Control push notifications: workout reminders, form check feedback received, trainer messages, motivational messages. Quiet hours (do not disturb scheduling). Per-notification-type toggles.' },
  { code: 'J-C28', category: 'Account & Settings', title: 'Manage Privacy Settings', description: 'Control data sharing: allow/disallow wearable data sync, progress photo visibility to trainer, nutrition data sharing. GDPR/CCPA compliance: export data, request deletion.' },
];

const trainerJourneys = [
  // Onboarding
  { code: 'J-T01', category: 'Onboarding', title: 'Register as Trainer', description: 'Create account with business name, specializations (strength, hypertrophy, fat loss, sports performance), certifications (NASM, ISSA, ISSN), years of experience, trainer bio. Verify certification credentials.' },
  { code: 'J-T02', category: 'Onboarding', title: 'Complete Business Setup', description: 'Upload business logo, write compelling bio (500 chars), describe service offerings, set pricing tiers (1-on-1, group, programming, nutrition coaching). Service descriptions with features per tier.' },
  { code: 'J-T03', category: 'Onboarding', title: 'Connect Stripe Account', description: 'Stripe Connect onboarding: bank account verification, tax ID, address. Enables payment processing for client memberships and services. Configure payout frequency (daily/weekly/monthly).' },
  { code: 'J-T04', category: 'Onboarding', title: 'Setup Coach Brain AI', description: 'Upload training methodology document, favorite cues library (e.g., "squeeze at top", "feel the stretch"), philosophy on periodization, approach to progressive overload. AI learns personalized training style.' },

  // Client Management
  { code: 'J-T05', category: 'Client Management', title: 'Invite New Client', description: 'Send email invitation with custom message. Recipient creates account or links existing. Automatically added to trainer\'s client list upon acceptance. Bulk invite via CSV.' },
  { code: 'J-T06', category: 'Client Management', title: 'View Client List', description: 'Table: all clients with status (active/trial/onboarding), last activity (workout/food log/message date), attention flags (low activity, form check submitted, message waiting). Sort by name, status, last activity.' },
  { code: 'J-T07', category: 'Client Management', title: 'View Client Detail', description: 'Comprehensive client profile: contact info, fitness goals, current strength levels, body metrics, progress photos, recent workouts (vs prescribed), nutrition adherence, notes from trainer.' },
  { code: 'J-T08', category: 'Client Management', title: 'Set Client Nutrition Targets', description: 'Specify daily macros (protein, carbs, fat) and calories. Meal timing guidance (breakfast, lunch, dinner, snacks). Dietary restrictions. Save as template or customize per client.' },
  { code: 'J-T09', category: 'Client Management', title: 'Assess Client Autonomy', description: 'Scorer to assess client readiness for independent training: adherence to workouts, form quality, program understanding. Generate "autonomy score." Recommend for self-programming vs continued coaching.' },
  { code: 'J-T10', category: 'Client Management', title: 'Graduate Client', description: 'Move client to maintenance/independent mode: archive from active list, optionally send congratulations message, suggest self-programming plan or transition to email-check-ins.' },

  // Workout Management
  { code: 'J-T11', category: 'Workout Management', title: 'Create Exercise', description: 'Add custom exercise: name, description (cue library), muscle groups targeted (primary/secondary), equipment needed, difficulty, video link. Can reference system exercise library and customize.' },
  { code: 'J-T12', category: 'Workout Management', title: 'Browse Exercise Library', description: 'Searchable database: filter by muscle group, equipment, difficulty, modality (free weight, machine, calisthenics, cardio). Include system exercises + trainer\'s custom exercises. Bulk export to spreadsheet.' },
  { code: 'J-T13', category: 'Workout Management', title: 'Build Workout Template', description: 'Drag-and-drop exercise selection. Set for each: target sets, reps, weight range, rest period, notes/cues. Repeat sets can be scaled (e.g., 3x8 with 85%, 90%, 95% max). Add warm-up and cool-down blocks.' },
  { code: 'J-T14', category: 'Workout Management', title: 'Assign Workout to Client', description: 'Select client, select template, customize if needed, schedule (immediate, date range, recurring weekly). Client receives notification. Can assign different templates to different clients from same template.' },
  { code: 'J-T15', category: 'Workout Management', title: 'Review Client Workout History', description: 'See prescribed vs actual: prescribed template vs what client actually logged. Compare sets/reps/weight. Adherence percentage. Note deviations and discuss with client.' },

  // Video & Form Review
  { code: 'J-T16', category: 'Video & Form Review', title: 'Review Form Check Video', description: 'Watch client form check video. Scrub timeline, add annotations/markers. Identify specific frames with form breakdown. Draft feedback with corrections.' },
  { code: 'J-T17', category: 'Video & Form Review', title: 'Send Video Feedback', description: 'Record/type feedback. Add timeline markers with specific corrections: "at 0:15, elbows flare out." Send with encouragement. Client receives notification and can re-watch with feedback overlaid.' },

  // Communication
  { code: 'J-T18', category: 'Communication', title: 'Message Client', description: 'Real-time chat with individual clients or groups. Share workout updates, motivational messages, ask questions about workouts/nutrition. Message read receipts. Archive old conversations.' },
  { code: 'J-T19', category: 'Communication', title: 'Review AI Coach Responses', description: 'View responses AI Coach gave to client questions. Approve (no changes needed), modify (adjust tone/content), or delete (don\'t send). Feedback shapes AI model for future responses.' },
  { code: 'J-T20', category: 'Communication', title: 'Manage Coach Brain Settings', description: 'Update AI training cues, methodology document, adjust AI personality (formal/casual, detailed/concise). Test AI responses with sample questions before deploying to all clients.' },

  // CRM & Business
  { code: 'J-T21', category: 'CRM & Business', title: 'View CRM Pipeline', description: 'Leads organized by stage: inquiry (contact form submission), trial (trial session scheduled), trial completed, active (paying), churned. Visual pipeline with count per stage. Value estimates per lead.' },
  { code: 'J-T22', category: 'CRM & Business', title: 'Manage Lead', description: 'Create/edit lead record: name, email, phone, source (referral, website, social, cold outreach). Update status, add notes. Schedule follow-up reminder. Integration with email/calendar.' },
  { code: 'J-T23', category: 'CRM & Business', title: 'Create Email Template', description: 'Design email templates for onboarding, first trial reminder, follow-up after missed session, re-engagement for inactive clients. Preview before save. Variable placeholders ({{client_name}}, {{trial_date}}).' },
  { code: 'J-T24', category: 'CRM & Business', title: 'Setup Email Sequence', description: 'Build automated drip campaigns: welcome series (3 emails over 7 days), post-trial nurture (5 emails), re-engagement for churned clients. Trigger-based and time-based sequences.' },
  { code: 'J-T25', category: 'CRM & Business', title: 'View CRM Analytics', description: 'Conversion rates (inquiry to trial, trial to active). Pipeline value by stage. Lead source ROI. Follow-up response times. Churn reasons from exit surveys.' },

  // Analytics & Revenue
  { code: 'J-T26', category: 'Analytics & Revenue', title: 'View Client Analytics', description: 'Aggregate progress: average strength improvements, macro adherence rates, workout completion rates. Retention metrics: churn rate, average client lifetime. Engagement: DAU/MAU, feature usage.' },
  { code: 'J-T27', category: 'Analytics & Revenue', title: 'View Revenue Dashboard', description: 'Monthly recurring revenue (MRR), one-time payments, total revenue. By service (1-on-1, programming, nutrition). Outstanding invoices. Payment failure reasons. Projected MRR.' },
  { code: 'J-T28', category: 'Analytics & Revenue', title: 'Set Pricing Tiers', description: 'Create pricing tiers: "Starter" ($99/mo), "Pro" ($199/mo), "Elite" ($299/mo). Define features per tier. Discount codes / promotions. Grandfathering for price changes.' },
  { code: 'J-T29', category: 'Analytics & Revenue', title: 'View Payment History', description: 'Transaction log: date, client name, amount, service, payment method. Refunds/chargebacks. Stripe fee breakdown. Monthly P&L statement. Tax-ready reports.' },

  // Time & Session Management
  { code: 'J-T30', category: 'Time & Session Management', title: 'Clock In/Out for Sessions', description: 'Start/stop session timer for 1-on-1 in-person sessions. Log to time-tracking system. Separate by session type (personal training, nutrition consultation, form review). Feed into payroll/billing.' },
  { code: 'J-T31', category: 'Time & Session Management', title: 'View Session Schedule', description: 'Calendar view: today\'s sessions, upcoming week, past sessions. Session type, duration, client name, location. Sync with Google/Outlook calendar.' },
  { code: 'J-T32', category: 'Time & Session Management', title: 'Log Session Notes', description: 'Post-session notes: what was done, how client responded, any issues/form corrections given, follow-up action items. Accessible in client detail view.' },

  // Account & Settings
  { code: 'J-T33', category: 'Account & Settings', title: 'Edit Business Profile', description: 'Update business name, photo/logo, bio, certifications, specializations, contact info. Add/remove service offerings. Update payment processing details (Stripe account).' },
  { code: 'J-T34', category: 'Account & Settings', title: 'Manage Integrations', description: 'Connect third-party tools: Google Calendar, Stripe, Typeform (for surveys), Zapier, email providers. API keys securely stored. Test connections.' },
  { code: 'J-T35', category: 'Account & Settings', title: 'Access Help Center', description: 'Trainer-specific guides: building workout templates, best practices for programming, form cue libraries, CRM best practices, email marketing tips, payment processing help.' },
  { code: 'J-T36', category: 'Account & Settings', title: 'Set Notification Preferences', description: 'Alerts for: new client signups, form check videos received, client messages waiting, payment received/failed, client low engagement. Time-zone aware delivery. Digest vs real-time options.' },
];

const ownerJourneys = [
  // Onboarding
  { code: 'J-O01', category: 'Onboarding', title: 'Register as Gym Owner', description: 'Create account with business name, facility details, city/state/zip, staff count estimate, types of services (personal training, group classes, nutrition coaching). Tax ID for payment processing.' },
  { code: 'J-O02', category: 'Onboarding', title: 'Complete Business Setup', description: 'Facility information: full address, phone, hours of operation, amenities list (free weights, machines, cardio, studio, sauna). Upload logo/photos. Set up branding (colors, messaging).' },
  { code: 'J-O03', category: 'Onboarding', title: 'Connect Stripe Account', description: 'Stripe Connect for facility payment processing: business bank account, tax verification. Configure commission structure for trainers (% of revenue). Payout schedule.' },
  { code: 'J-O04', category: 'Onboarding', title: 'Add Facility/Location', description: 'Multi-location support: add additional gym locations, set pricing per location, assign trainers to locations, manage separately or consolidated reporting.' },

  // Trainer Management
  { code: 'J-O05', category: 'Trainer Management', title: 'Invite Trainer', description: 'Send email invitation to join facility. Trainer creates account or links existing. Upon acceptance, assigned to facility with configurable permissions and commission rate.' },
  { code: 'J-O06', category: 'Trainer Management', title: 'View Trainer List', description: 'Table: all trainers, client counts (active/total), monthly revenue, average client rating. Status (active/inactive/on-leave). Sort by name, revenue, client count.' },
  { code: 'J-O07', category: 'Trainer Management', title: 'View Trainer Performance', description: 'Individual trainer metrics: client retention rate, average client strength progress, revenue per client, client satisfaction rating, hourly rate vs industry average.' },
  { code: 'J-O08', category: 'Trainer Management', title: 'Manage Trainer Permissions', description: 'Set what trainers can access: client list visibility (all vs own only), reporting (can view facility-wide analytics), CRM pipeline (personal vs facility-wide). Commission structure.' },

  // Client/Member Oversight
  { code: 'J-O09', category: 'Client/Member Oversight', title: 'View All Members', description: 'Master list of all clients across all trainers: name, assigned trainer, membership status, join date, last activity. Search/filter by name, trainer, status. Export to CSV.' },
  { code: 'J-O10', category: 'Client/Member Oversight', title: 'View Member Detail', description: 'Individual member profile: assigned trainer, membership status, contact info, join date, engagement (workouts/month, nutrition logs), progress (strength gains, body composition). Trainer notes.' },
  { code: 'J-O11', category: 'Client/Member Oversight', title: 'View Member Retention', description: 'Churn risk scoring: identify members at risk of canceling (low engagement, missing consecutive sessions). Engagement heatmap by member. Outreach list: suggested members for re-engagement campaigns.' },

  // Business & Revenue
  { code: 'J-O12', category: 'Business & Revenue', title: 'View Revenue Dashboard', description: 'Total facility revenue (MRR), breakdown by service type, by trainer. Month-over-month growth. Projections. Outstanding invoices. Payment failure rate.' },
  { code: 'J-O13', category: 'Business & Revenue', title: 'View Financial Reports', description: 'Monthly/quarterly P&L statement, revenue trends, expense breakdown (trainer payroll, software, overhead). Year-over-year comparisons. Export for accounting.' },
  { code: 'J-O14', category: 'Business & Revenue', title: 'Manage Pricing', description: 'Set facility-wide membership pricing, trainer service rates, package pricing (e.g., 10-session package). Trainer commission structure (% of revenue, flat fee per client). Bulk discounts.' },
  { code: 'J-O15', category: 'Business & Revenue', title: 'View Payment History', description: 'Transaction log: date, member/payer, amount, service, trainer, payment method. Refunds/chargebacks/disputes. Trainer payouts. Tax-ready reports.' },
  { code: 'J-O16', category: 'Business & Revenue', title: 'Setup Stripe & Payouts', description: 'Configure Stripe Connect: payment processing, payout frequency, trainer commission calculations, tax documentation. Handle disputes and chargebacks.' },

  // Analytics & Reporting
  { code: 'J-O17', category: 'Analytics & Reporting', title: 'View Facility Analytics', description: 'Facility-wide metrics: utilization rate, peak hours, capacity trends, member growth rate, average lifetime value per member. Breakdown by service type (1-on-1 vs group).' },
  { code: 'J-O18', category: 'Analytics & Reporting', title: 'View Client Outcomes', description: 'Aggregate member results: average strength improvements, body composition changes, member satisfaction scores. Success stories: members who achieved goals. Case studies for marketing.' },
  { code: 'J-O19', category: 'Analytics & Reporting', title: 'Export Reports', description: 'Generate PDF/CSV reports for stakeholders (owners, investors, board): financial performance, member outcomes, trainer performance, operational metrics.' },

  // CRM & Marketing
  { code: 'J-O20', category: 'CRM & Marketing', title: 'View Facility CRM Pipeline', description: 'Master lead pipeline across all trainers. Leads by stage: inquiry, trial, active, churned. Aggregate conversion metrics. Lead source attribution.' },
  { code: 'J-O21', category: 'CRM & Marketing', title: 'Manage Marketing Campaigns', description: 'Facility-level email campaigns: new member welcome series, seasonal promotions, re-engagement for lapsed members. Email list management. A/B testing.' },
  { code: 'J-O22', category: 'CRM & Marketing', title: 'View Acquisition Analytics', description: 'Lead sources (organic, referral, paid ads, walk-ins), conversion funnels, cost per acquisition. Attribution by trainer or facility-wide. CAC and LTV trends.' },

  // Settings & Administration
  { code: 'J-O23', category: 'Settings & Administration', title: 'Manage Facility Settings', description: 'Update hours, address, phone, amenities. Branding (logo, colors). Staff contact info. Class schedule (if applicable). Holiday closures.' },
  { code: 'J-O24', category: 'Settings & Administration', title: 'Manage Staff Accounts', description: 'Add/remove staff, set permissions (admin, trainer, front-desk, manager). Two-factor authentication. Activity logs for security audits.' },
  { code: 'J-O25', category: 'Settings & Administration', title: 'Access Help Center', description: 'Owner-specific guides: facility setup, trainer management, revenue optimization, marketing strategies, compliance (GDPR, CCPA), data security.' },
  { code: 'J-O26', category: 'Settings & Administration', title: 'View Audit Logs', description: 'HIPAA-compliant logs: who accessed what member data, when, from what IP. Trainer access logs, member data downloads. Compliance reports for audits.' },
];

// Build document
async function generateDocument() {
  const doc = new Document({
    sections: [
      {
        margins: {
          top: 1440,
          right: 1440,
          bottom: 1440,
          left: 1440,
        },
        headerReference: {
          default: new Paragraph({
            text: 'FitOS User Journeys & Role Architecture',
            alignment: AlignmentType.RIGHT,
            run: {
              size: 18 * 2,
              color: primaryColor,
              font: 'Arial',
            },
          }),
        },
        footerReference: {
          default: new Paragraph({
            text: 'Page #',
            alignment: AlignmentType.CENTER,
            run: {
              size: 18 * 2,
              color: darkGray,
              font: 'Arial',
            },
          }),
        },
        children: [
          // Title Page
          new Paragraph({
            text: '',
            spacing: { before: 1440 },
          }),
          new Paragraph({
            text: 'FitOS',
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 100 },
            run: {
              bold: true,
              size: 48 * 2,
              color: primaryColor,
              font: 'Arial',
            },
          }),
          new Paragraph({
            text: 'User Journeys & Role Architecture',
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 600 },
            run: {
              bold: true,
              size: 36 * 2,
              color: accentColor,
              font: 'Arial',
            },
          }),
          new Paragraph({
            text: 'AI-Native Fitness Coaching Platform',
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 200 },
            run: {
              italic: true,
              size: 26 * 2,
              color: darkGray,
              font: 'Arial',
            },
          }),
          new Paragraph({
            text: 'Comprehensive Role Definition & User Flow Documentation',
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 1440 },
            run: {
              size: 22 * 2,
              color: darkGray,
              font: 'Arial',
            },
          }),
          new Paragraph({
            text: 'Document Version: 1.0',
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 100 },
            run: {
              size: 22 * 2,
              color: darkGray,
              font: 'Arial',
            },
          }),
          new Paragraph({
            text: `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            alignment: AlignmentType.CENTER,
            spacing: { line: 360, after: 1440 },
            run: {
              size: 22 * 2,
              color: darkGray,
              font: 'Arial',
            },
          }),

          new PageBreak(),

          // Table of Contents
          ...createTableOfContents(),

          new PageBreak(),

          // Executive Summary
          createHeader('1. Executive Summary', 1),
          createBodyText('FitOS is an AI-native fitness coaching platform designed to serve three distinct user types: Clients (fitness enthusiasts), Trainers (fitness professionals), and Gym Owners (facility operators). Each role has fundamentally different needs, workflows, and access patterns.', false, false, 22),
          createBodyText('Current State Issues:', true, false, 22),
          createBulletPoint('Authentication allows cross-role login (register as client, login as trainer) - major security concern'),
          createBulletPoint('Single shared dashboard with conditional rendering - fragile and difficult to maintain'),
          createBulletPoint('Many features accessible to all roles via tabs - insufficient role-based access control'),
          createBulletPoint('No comprehensive permission enforcement beyond route guards'),
          createBulletPoint('Dashboard data is stubbed or empty'),
          createBulletPoint('Tab visibility shows some role filtering but incomplete implementation'),
          createBulletPoint('Settings page has minimal role differentiation'),
          createBulletPoint('No onboarding flow differentiated by role'),
          createBodyText('This document defines every user journey per role, establishing the foundation for proper role-based architecture, authentication, and feature development.', false, false, 22),

          new PageBreak(),

          // Current State Analysis
          createHeader('2. Current State Analysis - Issues Found', 1),
          createBodyText('Critical Security & Architecture Issues:', true, false, 22),
          createBulletPoint('Authentication System: Any registered user can login as any role regardless of registration type. This completely bypasses intended role-based access.'),
          createBulletPoint('Dashboard Architecture: Single shared dashboard with conditional rendering using role checks. This approach is fragile and makes testing/maintenance difficult.'),
          createBulletPoint('Feature Access Control: Features are conditionally shown via tabs and component logic rather than enforced at API/database level.'),
          createBulletPoint('Permission Model: Lacks RLS (Row Level Security) at database layer and role-based middleware at API layer.'),
          createBulletPoint('Data Isolation: No enforcement that trainers only see their own clients or that gym owners see their facility members.'),
          createBodyText('Recommended Approach:', true, false, 22),
          createBulletPoint('Implement role-based route guards at application level'),
          createBulletPoint('Enforce RLS policies in Supabase for all data tables'),
          createBulletPoint('Add middleware validation in Edge Functions for API calls'),
          createBulletPoint('Create role-specific dashboards instead of shared conditional rendering'),
          createBulletPoint('Define clear feature matrices per role'),
          createBulletPoint('Implement onboarding flows per role'),

          new PageBreak(),

          // Client Journeys
          ...createJourneySection('3. Client User Journeys (28 Journeys)', clientJourneys),

          new PageBreak(),

          // Trainer Journeys
          ...createJourneySection('4. Trainer User Journeys (36 Journeys)', trainerJourneys),

          new PageBreak(),

          // Owner Journeys
          ...createJourneySection('5. Gym Owner User Journeys (26 Journeys)', ownerJourneys),

          new PageBreak(),

          // Tab Navigation
          createHeader('6. Tab Navigation Architecture per Role', 1),

          createHeader('Client Tabs (5 Primary Tabs)', 2),
          createBulletPoint('Home (Dashboard): Today\'s overview - assigned workouts, nutrition summary, wearable metrics, messages from trainer, quick actions'),
          createBulletPoint('Workouts: Exercise library, today\'s workout, execute workout, workout history, PRs and progress tracking'),
          createBulletPoint('Nutrition: Food logging (search, voice, photo), daily macro tracking, weekly trends, nutrition plan from trainer'),
          createBulletPoint('AI Coach: Chat interface with AI trained on trainer\'s methodology and cues'),
          createBulletPoint('More: Messages, Settings, Help Center, Leaderboard, Streaks, Account Management'),

          createHeader('Trainer Tabs (5 Primary Tabs)', 2),
          createBulletPoint('Home (Dashboard): Client overview, low-engagement alerts, revenue summary, incoming form checks, pending messages'),
          createBulletPoint('Clients: Client list with status/activity, client detail with full profile, progress tracking, client notes'),
          createBulletPoint('Workouts: Exercise library with custom exercises, workout template builder, assign workouts to clients, review client workout history'),
          createBulletPoint('Business: CRM pipeline, lead management, email sequences, analytics dashboard, revenue tracking, pricing management'),
          createBulletPoint('More: Messages, Session schedule, Settings, Coach Brain configuration, Email templates, Help Center'),

          createHeader('Owner Tabs (5 Primary Tabs)', 2),
          createBulletPoint('Home (Dashboard): Facility overview, KPIs (revenue, member growth, utilization), trainer performance summary, alerts (low engagement members, payment issues)'),
          createBulletPoint('Trainers: Trainer list, trainer performance details, manage permissions and commission, invite new trainers'),
          createBulletPoint('Members: All members across all trainers, member detail, retention dashboard, at-risk member identification'),
          createBulletPoint('Business: Revenue dashboard, financial reports, pricing management, payment history, CRM pipeline, marketing campaigns, acquisition analytics'),
          createBulletPoint('More: Facility Settings, Staff Management, Audit Logs, Help Center, Integrations, Account Management'),

          new PageBreak(),

          // Feature Matrix
          createHeader('7. Feature Matrix', 1),
          createBodyText('The following table shows which features each user role can access:', false, false, 22),
          new Paragraph({ text: '' }),
          createFeatureMatrix(),
          new Paragraph({ text: '' }),

          new PageBreak(),

          // Permission Enforcement
          createHeader('8. Permission Enforcement Strategy', 1),

          createHeader('1. Route Guards (Application Level)', 2),
          createBodyText('Implement middleware that checks user role before allowing access to role-specific pages:', false, false, 22),
          createBulletPoint('Client routes: /app/home, /app/workouts, /app/nutrition, /app/coach, /app/profile'),
          createBulletPoint('Trainer routes: /app/clients, /app/templates, /app/business, /app/crmm, /app/analytics'),
          createBulletPoint('Owner routes: /app/trainers, /app/members, /app/facility, /app/reporting'),
          createBulletPoint('Shared routes: /app/settings, /app/help, /app/messages'),

          createHeader('2. Tab Visibility (UI Level)', 2),
          createBodyText('Control which tabs are visible based on user role:', false, false, 22),
          createBulletPoint('Use role from JWT token stored in browser'),
          createBulletPoint('Conditionally render tab navigation per role'),
          createBulletPoint('Hide entire sections from navigation if role cannot access'),

          createHeader('3. Feature Flags (Component Level)', 2),
          createBodyText('Within shared components, conditionally render features per role:', false, false, 22),
          createBulletPoint('Dashboard shows different widgets per role'),
          createBulletPoint('Settings page shows different sections per role'),
          createBulletPoint('Messages show different context (client with trainer vs trainer with clients)'),

          createHeader('4. API-Level RLS (Database Level)', 2),
          createBodyText('Enforce Row Level Security in Supabase for all data access:', false, false, 22),
          createBulletPoint('Clients: Can only see their own data (workouts, nutrition logs, messages with trainer)'),
          createBulletPoint('Trainers: Can only see clients they own, cannot see other trainers\' clients or gym-wide analytics'),
          createBulletPoint('Owners: Can see all data within their facility, but not other facilities'),
          createBulletPoint('Example: SELECT * FROM clients WHERE user_id = auth.uid()'),

          createHeader('5. Middleware Validation (Edge Functions)', 2),
          createBodyText('Validate role and permissions in Supabase Edge Functions before processing requests:', false, false, 22),
          createBulletPoint('Check user role matches endpoint requirements'),
          createBulletPoint('Verify user owns/manages the resource being accessed'),
          createBulletPoint('Log access for audit compliance (GDPR, HIPAA)'),
          createBulletPoint('Return 403 Forbidden if permission check fails'),

          createHeader('6. Token-Based Authorization', 2),
          createBodyText('Use JWT tokens to communicate role and permissions:', false, false, 22),
          createBulletPoint('Include role in JWT: { sub, email, role, gym_id, trainer_id }'),
          createBulletPoint('Validate token signature on every request'),
          createBulletPoint('Refresh tokens on schedule (24 hour expiration)'),
          createBulletPoint('Revoke tokens on logout and role change'),

          createHeader('7. Data Isolation Strategy', 2),
          createBodyText('Ensure data is properly partitioned by role:', false, false, 22),
          createBulletPoint('Clients table: Each record belongs to one user, no cross-user visibility'),
          createBulletPoint('Workouts table: Trainer can see client\'s workouts; owner can see all trainers\' workouts'),
          createBulletPoint('Messages table: Filtered by sender/recipient IDs; only relevant parties can access'),
          createBulletPoint('Financial records: Trainer sees only own revenue; owner sees facility-wide; never cross-facility'),

          createHeader('8. Audit & Compliance', 2),
          createBodyText('Maintain detailed logs for regulatory compliance:', false, false, 22),
          createBulletPoint('Log all data access (HIPAA): who, what, when, from where'),
          createBulletPoint('Log sensitive operations (delete, export, share data)'),
          createBulletPoint('Implement GDPR data export/deletion workflows'),
          createBulletPoint('Generate audit reports for facility compliance'),

          new Paragraph({
            text: '',
            spacing: { after: 600 },
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const outputPath = '/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/FitOS_User_Journeys_and_Role_Architecture.docx';

  fs.writeFileSync(outputPath, buffer);
  console.log(`✓ Document generated successfully: ${outputPath}`);
  console.log(`✓ File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
}

generateDocument().catch(err => {
  console.error('Error generating document:', err);
  process.exit(1);
});
