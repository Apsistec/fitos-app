// ============================================================================
// User Types
// ============================================================================

export type UserRole = 'trainer' | 'client' | 'gym_owner' | 'gym_staff' | 'admin';
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing';

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  role: UserRole;
  timezone: string;
  unitsSystem: 'imperial' | 'metric';
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainerProfile extends Profile {
  businessName?: string;
  bio?: string;
  specializations: string[];
  certifications: string[];
  stripeAccountId?: string;
  stripeOnboardingComplete: boolean;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt?: Date;
  maxClients: number;
}

export interface ClientProfile extends Profile {
  trainerId?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  heightInches?: number;
  goals: string[];
  injuriesNotes?: string;
  fitnessLevel?: 'beginner' | 'intermediate' | 'advanced';
  stripeCustomerId?: string;
  onboardingCompleted: boolean;
}

// ============================================================================
// Exercise Types
// ============================================================================

export type ExerciseCategory = 'strength' | 'cardio' | 'flexibility' | 'balance' | 'plyometric';
export type MuscleGroup = 
  | 'chest' | 'back' | 'shoulders' | 'biceps' | 'triceps' | 'forearms'
  | 'core' | 'quads' | 'hamstrings' | 'glutes' | 'calves' | 'full_body';

export interface Exercise {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category: ExerciseCategory;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  isSystem: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Workout Types
// ============================================================================

export type WorkoutStatus = 'scheduled' | 'in_progress' | 'completed' | 'skipped';

export interface WorkoutTemplate {
  id: string;
  trainerId: string;
  name: string;
  description?: string;
  estimatedDurationMinutes?: number;
  tags: string[];
  isPublic: boolean;
  exercises: WorkoutTemplateExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutTemplateExercise {
  id: string;
  templateId: string;
  exerciseId: string;
  exercise?: Exercise;
  orderIndex: number;
  sets?: number;
  repsMin?: number;
  repsMax?: number;
  weightPercentage?: number;
  durationSeconds?: number;
  restSeconds: number;
  notes?: string;
}

export interface Workout {
  id: string;
  clientId: string;
  trainerId?: string;
  templateId?: string;
  name: string;
  scheduledDate?: Date;
  scheduledTime?: string;
  status: WorkoutStatus;
  startedAt?: Date;
  completedAt?: Date;
  notes?: string;
  trainerNotes?: string;
  rating?: number;
  exercises: WorkoutExercise[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  exercise?: Exercise;
  orderIndex: number;
  prescribedSets?: number;
  prescribedRepsMin?: number;
  prescribedRepsMax?: number;
  prescribedWeight?: number;
  prescribedDurationSeconds?: number;
  restSeconds: number;
  notes?: string;
  sets: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  workoutExerciseId: string;
  setNumber: number;
  repsCompleted?: number;
  weightUsed?: number;
  durationSeconds?: number;
  rpe?: number; // Rate of Perceived Exertion (1-10)
  notes?: string;
  completedAt: Date;
}

// ============================================================================
// Nutrition Types
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Food {
  id: string;
  fdcId?: number; // USDA FoodData Central ID
  name: string;
  brand?: string;
  servingSize: number;
  servingUnit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG?: number;
  sugarG?: number;
  sodiumMg?: number;
  isVerified: boolean;
}

export interface NutritionLog {
  id: string;
  clientId: string;
  logDate: Date;
  entries: NutritionEntry[];
  notes?: string;
  totals: NutritionTotals;
}

export interface NutritionEntry {
  id: string;
  logId: string;
  foodId?: string;
  food?: Food;
  mealType: MealType;
  customName?: string;
  servings: number;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  loggedAt: Date;
}

export interface NutritionTotals {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
}

export interface NutritionTarget {
  id: string;
  clientId: string;
  caloriesTarget?: number;
  proteinTargetG?: number;
  carbsTargetG?: number;
  fatTargetG?: number;
  effectiveFrom: Date;
  effectiveTo?: Date;
  notes?: string;
  createdBy?: string;
}

// ============================================================================
// Measurement Types
// ============================================================================

export type MeasurementType = 
  | 'weight' | 'body_fat' | 'chest' | 'waist' 
  | 'hips' | 'thigh' | 'arm' | 'custom';

export interface Measurement {
  id: string;
  clientId: string;
  measurementType: MeasurementType;
  customLabel?: string;
  value: number;
  unit: string;
  measuredAt: Date;
  notes?: string;
}

export interface ProgressPhoto {
  id: string;
  clientId: string;
  storagePath: string;
  photoType: 'front' | 'side' | 'back' | 'other';
  takenAt: Date;
  notes?: string;
}

// ============================================================================
// Wearable Types
// ============================================================================

export type WearableProvider = 
  | 'garmin' | 'fitbit' | 'apple_health' | 'oura' 
  | 'whoop' | 'polar' | 'samsung' | 'other';

export interface WearableConnection {
  id: string;
  clientId: string;
  provider: WearableProvider;
  terraUserId: string;
  isActive: boolean;
  lastSyncAt?: Date;
  createdAt: Date;
}

export interface WearableDailyData {
  id: string;
  clientId: string;
  dataDate: Date;
  steps?: number;
  restingHeartRate?: number;
  hrvAvg?: number;
  sleepDurationMinutes?: number;
  sleepEfficiency?: number;
  sleepDeepMinutes?: number;
  sleepRemMinutes?: number;
  activeMinutes?: number;
  // Note: We intentionally do NOT track calorie burn (research shows inaccuracy)
  syncedAt: Date;
}

// ============================================================================
// Payment Types
// ============================================================================

export interface Subscription {
  id: string;
  clientId: string;
  trainerId: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  status: SubscriptionStatus;
  amountCents: number;
  currency: string;
  interval: 'week' | 'month' | 'year';
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  subscriptionId?: string;
  clientId: string;
  trainerId: string;
  stripeInvoiceId?: string;
  amountCents: number;
  currency: string;
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';
  dueDate?: Date;
  paidAt?: Date;
  createdAt: Date;
}

// ============================================================================
// Communication Types
// ============================================================================

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt?: Date;
  createdAt: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
