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

// ============================================================================
// Scheduling — Phase 5 (Sprints 54-61)
// ============================================================================

export type AppointmentStatus =
  | 'requested'
  | 'booked'
  | 'confirmed'
  | 'arrived'
  | 'completed'
  | 'no_show'
  | 'early_cancel'
  | 'late_cancel';

/** Terminal states — no further transitions possible */
export const APPOINTMENT_TERMINAL_STATES: AppointmentStatus[] = [
  'completed', 'no_show', 'early_cancel', 'late_cancel',
];

/** Valid FSM transitions map */
export const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  requested:     ['booked'],
  booked:        ['confirmed', 'arrived', 'early_cancel', 'late_cancel'],
  confirmed:     ['arrived', 'early_cancel', 'late_cancel'],
  arrived:       ['completed', 'no_show'],
  completed:     [],
  no_show:       [],
  early_cancel:  [],
  late_cancel:   [],
};

export interface ServiceType {
  id: string;
  trainer_id: string;
  facility_id?: string;
  name: string;
  description?: string;
  duration_minutes: number;
  base_price: number;
  cancel_window_minutes: number;
  num_sessions_deducted: number;
  buffer_after_minutes: number;
  travel_buffer_minutes: number;
  sell_online: boolean;
  color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AppointmentResource {
  id: string;
  facility_id?: string;
  trainer_id: string;
  name: string;
  resource_type: 'room' | 'equipment' | 'other';
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export interface StaffAvailability {
  id: string;
  trainer_id: string;
  day_of_week: number;  // 0=Sun, 6=Sat
  start_time: string;   // HH:MM
  end_time: string;     // HH:MM
  facility_id?: string;
  effective_from?: string;
  effective_until?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StaffServiceRate {
  id: string;
  trainer_id: string;
  service_type_id: string;
  price_override: number;
  created_at: string;
}

export interface Appointment {
  id: string;
  trainer_id: string;
  client_id: string;
  service_type_id: string;
  facility_id?: string;
  resource_id?: string;
  status: AppointmentStatus;
  start_at: string;        // ISO timestamp
  end_at: string;          // ISO timestamp
  duration_minutes: number;
  notes?: string;
  client_service_id?: string;
  is_first_appointment: boolean;
  staff_requested: boolean;
  gender_preference: 'none' | 'female' | 'male';
  is_recurring: boolean;
  recurring_group_id?: string;
  auto_noshow_minutes?: number;
  created_at: string;
  updated_at: string;
  cancelled_at?: string;
  cancel_reason?: string;
  arrived_at?: string;
  completed_at?: string;
  // Joined fields (present when fetched with select)
  service_type?: ServiceType;
  trainer?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
  client?: Pick<Profile, 'id' | 'full_name' | 'avatar_url'>;
}

export interface Visit {
  id: string;
  appointment_id: string;
  client_id: string;
  trainer_id: string;
  service_type_id: string;
  visit_status: AppointmentStatus;
  sessions_deducted: number;
  service_price: number;
  trainer_pay_amount?: number;
  client_service_id?: string;
  payroll_processed: boolean;
  payroll_period_id?: string;
  created_at: string;
}

/** Slot returned by get-bookable-slots Edge Function */
export interface BookableSlot {
  time: string;       // ISO timestamp
  available: boolean;
  blocked_reason?: 'outside_availability' | 'existing_appointment' | 'buffer' | 'travel_buffer';
}

/** DTO for creating a new appointment */
export interface CreateAppointmentDto {
  trainer_id: string;
  client_id: string;
  service_type_id: string;
  start_at: string;
  facility_id?: string;
  resource_id?: string;
  notes?: string;
  client_service_id?: string;
  is_recurring?: boolean;
  recurring_group_id?: string;
  gender_preference?: 'none' | 'female' | 'male';
}

/** DTO for availability engine input */
export interface AvailabilityQueryDto {
  trainer_id: string;
  service_type_id: string;
  date: string;  // YYYY-MM-DD
}

// ── Cancellation Policies & Billing — Phase 5B (Sprint 57) ───────────────────

/**
 * Trainer-defined rule for late-cancel/no-show windows and fees.
 * service_type_id = null → global policy (fallback for all service types).
 * Service-type-specific policy takes precedence over global.
 */
export interface CancellationPolicy {
  id: string;
  trainer_id: string;
  service_type_id?: string;          // null = global policy
  late_cancel_window_minutes: number; // default 1440 (24h)
  late_cancel_fee_amount: number;
  no_show_fee_amount: number;
  forfeit_session: boolean;           // deduct session from pack on late-cancel
  applies_to_memberships: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Penalty calculation result from CancellationPolicyService.calculatePenalty().
 * Drives both the Stripe charge and session-deduction logic.
 */
export interface CancellationPenalty {
  forfeitSession: boolean;
  feeAmount: number;        // 0 = no charge needed
  policy: CancellationPolicy | null;
}

/**
 * Double-entry ledger row for tracking client financial obligations.
 * debit  = client owes trainer (failed fee charge, accumulates as debt)
 * credit = trainer owes client (overpayment, refund)
 */
export interface ClientLedgerEntry {
  id: string;
  client_id: string;
  trainer_id: string;
  entry_type: 'credit' | 'debit';
  amount: number;
  reason: 'no_show_fee' | 'late_cancel_fee' | 'overpayment' | 'adjustment' | 'refund' | 'session_credit';
  appointment_id?: string;
  sale_transaction_id?: string;
  stripe_payment_intent_id?: string;
  notes?: string;
  created_at: string;
}

/** Stripe card-on-file summary (stored on profiles, no raw card data) */
export interface SavedPaymentMethod {
  stripe_payment_method_id: string;
  last4: string;
  brand: string;
  exp_month: number;
  exp_year: number;
}

/** DTO for charge-cancellation-fee Edge Function */
export interface ChargeCancellationFeeDto {
  appointment_id: string;
  fee_type: 'late_cancel' | 'no_show';
}

// ── Pricing Options — Phase 5C (Sprint 58) ───────────────────────────────────

export type PricingOptionType = 'session_pack' | 'time_pass' | 'drop_in' | 'contract';

export type AutopayInterval = 'weekly' | 'biweekly' | 'monthly';

/**
 * Trainer-defined pricing package (pack, pass, drop-in, or contract).
 * session_count = null for time_pass/contract unlimited modes.
 */
export interface PricingOption {
  id: string;
  trainer_id: string;
  name: string;
  option_type: PricingOptionType;
  price: number;
  session_count?: number;           // null for time_pass
  expiration_days?: number;         // null = no expiry
  service_type_ids: string[];       // which service types this covers
  autopay_interval?: AutopayInterval;
  autopay_session_count?: number;   // sessions refreshed per autopay cycle
  revenue_category: string;
  sell_online: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Purchased pricing option owned by a specific client.
 * sessions_remaining = null for time_pass (unlimited).
 */
export interface ClientService {
  id: string;
  client_id: string;
  trainer_id: string;
  pricing_option_id: string;
  stripe_subscription_id?: string;
  stripe_payment_intent_id?: string;
  sessions_remaining?: number;      // null = unlimited (time_pass)
  sessions_total?: number;
  purchased_at: string;
  activated_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined fields
  pricing_option?: PricingOption;
}

/** Payment method types supported at checkout POS */
export type CheckoutPaymentMethod =
  | 'session_pack'
  | 'card'
  | 'cash'
  | 'account_balance'
  | 'split'
  | 'comp';

/** POS checkout record created for every completed appointment */
export interface SaleTransaction {
  id: string;
  trainer_id: string;
  client_id: string;
  appointment_id?: string;
  client_service_id?: string;
  stripe_payment_intent_id?: string;
  payment_method: CheckoutPaymentMethod;
  subtotal: number;
  tip_amount: number;
  discount_amount: number;
  total: number;
  status: 'pending' | 'completed' | 'refunded' | 'failed';
  notes?: string;
  created_at: string;
}

/** DTO sent to process-checkout Edge Function */
export interface ProcessCheckoutDto {
  appointment_id: string;
  payment_method: CheckoutPaymentMethod;
  client_service_id?: string;      // which package to deduct from
  tip_amount?: number;
  discount_amount?: number;
  notes?: string;
}

/** Response from process-checkout Edge Function */
export interface CheckoutResult {
  success: boolean;
  sale_transaction_id: string;
  sessions_remaining?: number;
  stripe_payment_intent_id?: string;
  error?: string;
}
