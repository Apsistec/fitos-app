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
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  gym_owner_id?: string; // All users connected to a gym (owner's profile id)
  facility_id?: string; // Alternative: direct facility reference
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
  bio?: string;
  fitnessGoals?: string;
  dietaryPreferences?: string[];
  activityLevel?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very-active';
  stripeCustomerId?: string;
  onboardingCompleted: boolean;
}

export interface GymOwnerProfile extends Profile {
  businessName: string;
  bio?: string;
  facilityCount: number;
  staffCount: number;
  stripeAccountId?: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionEndsAt?: Date;
}

export interface GymStaffProfile extends Profile {
  gym_owner_id: string; // Required for staff
  position?: string;
  permissions: string[];
  hireDate?: Date;
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

// ============================================================================
// CRM & Lead Management Types
// ============================================================================

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'consultation' | 'won' | 'lost';
export type LeadSource = 'referral' | 'social' | 'website' | 'gym' | 'event' | 'other';
export type ContactMethod = 'email' | 'phone' | 'text' | 'none';

export interface Lead {
  id: string;
  trainer_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  status: LeadStatus;
  source?: LeadSource;
  source_details?: string;
  lead_score: number;
  converted_to_client_id?: string;
  converted_at?: string;
  lost_reason?: string;
  preferred_contact_method: ContactMethod;
  do_not_contact: boolean;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_contacted_at?: string;
}

export interface LeadWithExtras extends Lead {
  full_name: string;
  activities?: LeadActivity[];
  tasks?: LeadTask[];
}

export interface CreateLeadInput {
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  source?: LeadSource;
  source_details?: string;
  preferred_contact_method?: ContactMethod;
  notes?: string;
  tags?: string[];
}

export interface UpdateLeadInput {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  status?: LeadStatus;
  source?: LeadSource;
  source_details?: string;
  lead_score?: number;
  lost_reason?: string;
  preferred_contact_method?: ContactMethod;
  do_not_contact?: boolean;
  notes?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}

export type ActivityType =
  | 'email_sent'
  | 'email_opened'
  | 'email_clicked'
  | 'phone_call'
  | 'text_message'
  | 'meeting'
  | 'note'
  | 'status_change'
  | 'task_completed';

export interface LeadActivity {
  id: string;
  lead_id: string;
  trainer_id: string;
  activity_type: ActivityType;
  subject?: string;
  description?: string;
  email_template_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface LeadTask {
  id: string;
  trainer_id: string;
  lead_id: string;
  title: string;
  description?: string;
  task_type?: 'call' | 'email' | 'meeting' | 'follow_up' | 'other';
  due_date?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Email Marketing Types
// ============================================================================

export interface EmailTemplate {
  id: string;
  trainer_id: string;
  name: string;
  subject: string;
  body_html: string;
  body?: string; // Alias for body_html for convenience
  body_text?: string;
  variables: string[];
  category?: string;
  is_system: boolean;
  is_active?: boolean;
  usage_count?: number;
  created_at: string;
  updated_at: string;
}

export interface EmailSequence {
  id: string;
  trainer_id: string;
  name: string;
  description?: string;
  trigger_event: TriggerEvent;
  trigger_status?: string; // Used when trigger_event is 'status_change'
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SequenceWithDetails extends EmailSequence {
  steps?: SequenceStep[];
  usage_count?: number;
  enrolledCount?: number;
  activeEnrollments?: number;
}

export interface SequenceStep {
  id: string;
  sequence_id: string;
  template_id: string;
  email_template_id?: string;
  delay_days: number;
  delay_hours: number;
  condition_type: 'always' | 'if_not_opened' | 'if_not_clicked';
  step_order: number;
  created_at: string;
}

export interface CreateSequenceInput {
  name: string;
  description?: string;
  trigger_event: TriggerEvent;
  trigger_status?: string; // Used when trigger_event is 'status_change'
  is_active?: boolean;
}

/**
 * Consolidated trigger event types for email sequences
 * Combines what was previously split between TriggerEvent and trigger_on
 */
export type TriggerEvent =
  | 'lead_created'
  | 'client_onboarded'
  | 'workout_missed'
  | 'subscription_expiring'
  | 'status_change'
  | 'date'
  | 'manual';

export interface EmailSend {
  id: string;
  template_id?: string;
  sequence_id?: string;
  step_id?: string;
  recipient_email: string;
  recipient_type: 'lead' | 'client';
  recipient_id?: string;
  subject: string;
  sent_at: string;
  opened_at?: string;
  clicked_at?: string;
  bounced_at?: string;
  unsubscribed_at?: string;
  provider_message_id?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// NFC / QR Touchpoints (Sprint 46)
// ============================================================================

export type NfcTagType = 'check_in' | 'equipment' | 'workout_start';
export type NfcPlatform = 'ios' | 'android' | 'web';

export type DeepLinkType = 'checkin' | 'workout' | 'equipment';

export interface DeepLinkParams {
  type: DeepLinkType;
  facilityId?: string;
  workoutTemplateId?: string;
  equipmentId?: string;
}

export interface NfcTouchpoint {
  id: string;
  trainer_id: string;
  facility_id?: string;
  tag_type: NfcTagType;
  deep_link_uri: string;
  label: string;
  equipment_id?: string;
  workout_template_id?: string;
  scan_count: number;
  created_at: string;
  updated_at: string;
}

export interface NfcScanLog {
  id: string;
  touchpoint_id: string;
  user_id: string;
  scanned_at: string;
  platform?: NfcPlatform;
}
