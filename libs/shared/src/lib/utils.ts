import { ACWR_SAFE_ZONE, HRV_DEVIATION_THRESHOLD, MIN_SLEEP_HOURS, SLEEP_INTENSITY_REDUCTION } from './constants';

// ============================================================================
// Date Utilities
// ============================================================================

export function formatDate(date: Date, format: 'short' | 'long' | 'iso' = 'short'): string {
  switch (format) {
    case 'iso':
      return date.toISOString().split('T')[0];
    case 'long':
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    case 'short':
    default:
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
  }
}

export function getDaysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay);
}

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// ============================================================================
// Unit Conversion
// ============================================================================

export function lbsToKg(lbs: number): number {
  return lbs * 0.453592;
}

export function kgToLbs(kg: number): number {
  return kg * 2.20462;
}

export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

export function cmToInches(cm: number): number {
  return cm / 2.54;
}

export function formatWeight(value: number, system: 'imperial' | 'metric'): string {
  if (system === 'metric') {
    return `${value.toFixed(1)} kg`;
  }
  return `${value.toFixed(1)} lbs`;
}

export function formatHeight(inches: number, system: 'imperial' | 'metric'): string {
  if (system === 'metric') {
    const cm = inchesToCm(inches);
    return `${cm.toFixed(0)} cm`;
  }
  const feet = Math.floor(inches / 12);
  const remainingInches = Math.round(inches % 12);
  return `${feet}'${remainingInches}"`;
}

// ============================================================================
// Workout Calculations
// ============================================================================

/**
 * Calculate 1RM using Epley formula
 */
export function calculateOneRepMax(weight: number, reps: number): number {
  if (reps === 1) return weight;
  if (reps > 10) return weight * (1 + reps / 30); // Less accurate for high reps
  return weight * (1 + reps / 30);
}

/**
 * Calculate weight for target percentage of 1RM
 */
export function calculatePercentage1RM(oneRepMax: number, percentage: number): number {
  return oneRepMax * (percentage / 100);
}

/**
 * Calculate training volume (sets × reps × weight)
 */
export function calculateVolume(sets: number, reps: number, weight: number): number {
  return sets * reps * weight;
}

/**
 * Calculate Acute:Chronic Workload Ratio
 * Uses exponentially weighted moving averages
 */
export function calculateACWR(
  dailyLoads: number[], // Last 28 days, most recent first
  acuteDays = 7,
  chronicDays = 28
): number {
  if (dailyLoads.length < chronicDays) {
    return 1.0; // Not enough data
  }

  const lambda = 2 / (chronicDays + 1);
  
  // Calculate EWMA for acute period
  let acuteEWMA = dailyLoads[0];
  for (let i = 1; i < acuteDays; i++) {
    acuteEWMA = lambda * dailyLoads[i] + (1 - lambda) * acuteEWMA;
  }

  // Calculate EWMA for chronic period
  let chronicEWMA = dailyLoads[0];
  for (let i = 1; i < chronicDays; i++) {
    chronicEWMA = lambda * dailyLoads[i] + (1 - lambda) * chronicEWMA;
  }

  return chronicEWMA > 0 ? acuteEWMA / chronicEWMA : 1.0;
}

/**
 * Get training recommendation based on ACWR
 */
export function getACWRRecommendation(acwr: number): {
  status: 'safe' | 'caution' | 'danger';
  message: string;
} {
  if (acwr < ACWR_SAFE_ZONE.MIN) {
    return {
      status: 'caution',
      message: 'Training load is decreasing. Consider gradually increasing volume.',
    };
  }
  if (acwr > ACWR_SAFE_ZONE.DANGER_THRESHOLD) {
    return {
      status: 'danger',
      message: 'Spike in training load detected. High injury risk. Consider reducing intensity.',
    };
  }
  if (acwr > ACWR_SAFE_ZONE.MAX) {
    return {
      status: 'caution',
      message: 'Training load increasing rapidly. Monitor for fatigue.',
    };
  }
  return {
    status: 'safe',
    message: 'Training load is in the optimal zone.',
  };
}

// ============================================================================
// Recovery Calculations
// ============================================================================

/**
 * Calculate HRV deviation from baseline
 */
export function calculateHRVDeviation(currentHRV: number, baselineHRV: number, stdDev: number): number {
  return (currentHRV - baselineHRV) / stdDev;
}

/**
 * Get recovery recommendation based on HRV and sleep
 */
export function getRecoveryRecommendation(
  hrvDeviation: number,
  sleepHours: number
): {
  readiness: 'good' | 'moderate' | 'low';
  intensityModifier: number;
  message: string;
} {
  let intensityModifier = 1.0;
  const messages: string[] = [];

  // Check HRV
  if (hrvDeviation < -HRV_DEVIATION_THRESHOLD) {
    intensityModifier *= 0.8;
    messages.push('HRV below baseline suggests incomplete recovery.');
  }

  // Check sleep
  if (sleepHours < MIN_SLEEP_HOURS) {
    intensityModifier *= (1 - SLEEP_INTENSITY_REDUCTION);
    messages.push(`Sleep under ${MIN_SLEEP_HOURS} hours may impact performance.`);
  }

  let readiness: 'good' | 'moderate' | 'low';
  if (intensityModifier >= 0.9) {
    readiness = 'good';
    if (messages.length === 0) {
      messages.push('Recovery looks good. Ready for planned training.');
    }
  } else if (intensityModifier >= 0.7) {
    readiness = 'moderate';
    messages.push('Consider reducing intensity by ' + Math.round((1 - intensityModifier) * 100) + '%.');
  } else {
    readiness = 'low';
    messages.push('Active recovery or rest day recommended.');
  }

  return {
    readiness,
    intensityModifier,
    message: messages.join(' '),
  };
}

// ============================================================================
// Nutrition Calculations
// ============================================================================

/**
 * Calculate TDEE using Mifflin-St Jeor equation
 */
export function calculateTDEE(
  weightLbs: number,
  heightInches: number,
  ageYears: number,
  gender: 'male' | 'female',
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
): number {
  const weightKg = lbsToKg(weightLbs);
  const heightCm = inchesToCm(heightInches);
  
  // Mifflin-St Jeor BMR
  let bmr: number;
  if (gender === 'male') {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
  }

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };

  return Math.round(bmr * activityMultipliers[activityLevel]);
}

/**
 * Calculate macro grams from calorie target and macro split
 */
export function calculateMacros(
  calorieTarget: number,
  proteinPct: number,
  carbsPct: number,
  fatPct: number
): { protein: number; carbs: number; fat: number } {
  return {
    protein: Math.round((calorieTarget * proteinPct) / 4), // 4 cal/g
    carbs: Math.round((calorieTarget * carbsPct) / 4), // 4 cal/g
    fat: Math.round((calorieTarget * fatPct) / 9), // 9 cal/g
  };
}

// ============================================================================
// Streak & Gamification
// ============================================================================

export function calculateStreak(
  completedDates: Date[],
  freezeDays = 0
): { current: number; longest: number } {
  if (completedDates.length === 0) {
    return { current: 0, longest: 0 };
  }

  // Sort dates descending
  const sorted = [...completedDates].sort((a, b) => b.getTime() - a.getTime());
  
  let current = 0;
  let longest = 0;
  let streak = 1;
  let gapsUsed = 0;

  for (let i = 0; i < sorted.length - 1; i++) {
    const daysBetween = getDaysBetween(sorted[i + 1], sorted[i]);
    
    if (daysBetween === 1) {
      streak++;
    } else if (daysBetween <= freezeDays + 1 && gapsUsed < freezeDays) {
      // Allow freeze days
      gapsUsed += daysBetween - 1;
      streak++;
    } else {
      longest = Math.max(longest, streak);
      if (i === 0) {
        current = streak;
      }
      streak = 1;
      gapsUsed = 0;
    }
  }

  longest = Math.max(longest, streak);
  if (sorted.length > 0 && isToday(sorted[0])) {
    current = streak;
  }

  return { current, longest };
}

// ============================================================================
// String Utilities
// ============================================================================

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function formatReps(min?: number, max?: number): string {
  if (!min && !max) return '-';
  if (min === max || !max) return `${min}`;
  return `${min}-${max}`;
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
