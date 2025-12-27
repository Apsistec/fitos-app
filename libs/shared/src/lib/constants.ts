// ============================================================================
// Application Constants
// ============================================================================

export const APP_NAME = 'FitOS';
export const APP_VERSION = '0.1.0';

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  VOICE_LOGGING: false, // Phase 2
  AI_COACHING: false, // Phase 2
  PHOTO_NUTRITION: false, // Phase 3
  CHURN_PREDICTION: false, // Phase 2
} as const;

// ============================================================================
// Behavior Change Science Constants
// ============================================================================

// Research shows habit formation takes 59-66 days median (not 21 days myth)
export const HABIT_FORMATION_DAYS = {
  MINIMUM: 18,
  MEDIAN: 66,
  MAXIMUM: 254,
} as const;

// Acute:Chronic Workload Ratio safe zone (injury prevention)
export const ACWR_SAFE_ZONE = {
  MIN: 0.8,
  MAX: 1.3,
  DANGER_THRESHOLD: 1.5,
} as const;

// HRV deviation threshold for recovery recommendations
export const HRV_DEVIATION_THRESHOLD = 0.5; // Standard deviations below baseline

// Minimum sleep for optimal training
export const MIN_SLEEP_HOURS = 6;
export const SLEEP_INTENSITY_REDUCTION = 0.25; // 25% reduction if under min sleep

// ============================================================================
// Gamification Limits
// ============================================================================

// Research shows max 2-3 proactive interventions per day prevent fatigue
export const MAX_DAILY_NUDGES = 3;

// Streak freeze to prevent punishment for legitimate rest/illness
export const STREAK_FREEZE_DAYS = 2;

// ============================================================================
// Nutrition Constants
// ============================================================================

// Days needed for nutrition algorithm calibration
export const NUTRITION_CALIBRATION_DAYS = {
  MINIMUM: 14,
  OPTIMAL: 30,
} as const;

// Macro targets (percentage of calories)
export const DEFAULT_MACRO_SPLITS = {
  BALANCED: { protein: 0.25, carbs: 0.45, fat: 0.30 },
  HIGH_PROTEIN: { protein: 0.35, carbs: 0.35, fat: 0.30 },
  LOW_CARB: { protein: 0.30, carbs: 0.20, fat: 0.50 },
  KETO: { protein: 0.25, carbs: 0.05, fat: 0.70 },
} as const;

// ============================================================================
// UI Constants
// ============================================================================

// Adherence-neutral colors (no red for "over target")
export const NUTRITION_COLORS = {
  CALORIES: '#6366F1', // Indigo
  PROTEIN: '#22C55E', // Green
  CARBS: '#F59E0B', // Amber
  FAT: '#EC4899', // Pink
  NEUTRAL: '#6B7280', // Gray
} as const;

// Rest timer defaults
export const DEFAULT_REST_SECONDS = 60;
export const REST_WARNING_SECONDS = 10;

// ============================================================================
// API Endpoints
// ============================================================================

export const API_ENDPOINTS = {
  // USDA FoodData Central
  USDA_FOOD_SEARCH: 'https://api.nal.usda.gov/fdc/v1/foods/search',
  USDA_FOOD_DETAILS: 'https://api.nal.usda.gov/fdc/v1/food',
  
  // Terra API
  TERRA_BASE: 'https://api.tryterra.co/v2',
  
  // Stripe
  STRIPE_BASE: 'https://api.stripe.com/v1',
} as const;

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'fitos_auth_token',
  USER_PREFERENCES: 'fitos_user_prefs',
  OFFLINE_WORKOUTS: 'fitos_offline_workouts',
  OFFLINE_NUTRITION: 'fitos_offline_nutrition',
  LAST_SYNC: 'fitos_last_sync',
} as const;

// ============================================================================
// Validation Constants
// ============================================================================

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 100,
  BIO_MAX_LENGTH: 500,
  NOTES_MAX_LENGTH: 1000,
  MAX_SETS_PER_EXERCISE: 20,
  MAX_REPS: 999,
  MAX_WEIGHT_LBS: 2000,
  MAX_DURATION_SECONDS: 7200, // 2 hours
  RPE_MIN: 1,
  RPE_MAX: 10,
} as const;

// ============================================================================
// Supported Equipment
// ============================================================================

export const EQUIPMENT_OPTIONS = [
  'barbell',
  'dumbbell',
  'kettlebell',
  'cable',
  'machine',
  'bodyweight',
  'resistance_band',
  'medicine_ball',
  'pull_up_bar',
  'dip_station',
  'bench',
  'squat_rack',
  'leg_press',
  'smith_machine',
  'battle_ropes',
  'trx',
  'foam_roller',
  'yoga_mat',
  'treadmill',
  'stationary_bike',
  'rowing_machine',
  'elliptical',
  'stair_climber',
] as const;

export type Equipment = typeof EQUIPMENT_OPTIONS[number];
