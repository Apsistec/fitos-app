/**
 * FitOS Shared Constants
 * Design tokens and configuration values
 */

/**
 * Adherence-Neutral Nutrition Colors
 * NEVER use red for "over target" - promotes shame-free tracking
 */
export const NUTRITION_COLORS = {
  CALORIES: '#6366F1',  // Indigo
  PROTEIN: '#10B981',   // Teal/Green
  CARBS: '#F59E0B',     // Amber
  FAT: '#EC4899',       // Pink
  OVER: '#8B5CF6',      // Purple (NOT red!)
  NEUTRAL: '#6B7280',   // Gray
} as const;

/**
 * Adherence-Neutral Messages
 * Encouraging, non-judgmental language for nutrition tracking
 */
export const NUTRITION_MESSAGES = {
  UNDER_50: 'Still tracking for the day',
  UNDER_90: 'Making progress',
  ON_TARGET: 'Right on track',
  OVER: 'Data logged',  // Neutral acknowledgment, no judgment
} as const;

/**
 * Wearable Data Fields
 * Only display reliable metrics (NOT calorie burn)
 */
export const WEARABLE_DISPLAY_FIELDS = [
  'restingHeartRate',
  'hrv',
  'sleepDuration',
  'sleepEfficiency',
  'steps',
  'activeMinutes',
] as const;

/**
 * Animation Durations (ms)
 */
export const ANIMATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350,
  SLOWER: 500,
} as const;

/**
 * API Timeouts (ms)
 */
export const TIMEOUTS = {
  API_DEFAULT: 10000,
  API_LONG: 30000,
  DEBOUNCE: 300,
  TOAST: 3000,
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  EXERCISE_PAGE_SIZE: 20,
  CLIENT_PAGE_SIZE: 20,
} as const;

export type NutritionColorKey = keyof typeof NUTRITION_COLORS;
