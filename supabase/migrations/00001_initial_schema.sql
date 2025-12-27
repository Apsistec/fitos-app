-- FitOS Initial Schema Migration
-- Phase 1 MVP Database Structure

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";  -- pgvector for AI embeddings

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE user_role AS ENUM ('trainer', 'client', 'admin');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE workout_status AS ENUM ('scheduled', 'in_progress', 'completed', 'skipped');
CREATE TYPE measurement_type AS ENUM ('weight', 'body_fat', 'chest', 'waist', 'hips', 'thigh', 'arm', 'custom');
CREATE TYPE exercise_category AS ENUM ('strength', 'cardio', 'flexibility', 'balance', 'plyometric');
CREATE TYPE muscle_group AS ENUM ('chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms', 'core', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body');

-- ============================================================================
-- USERS & PROFILES
-- ============================================================================

-- Extends Supabase auth.users
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'client',
    timezone TEXT DEFAULT 'America/Chicago',
    units_system TEXT DEFAULT 'imperial' CHECK (units_system IN ('imperial', 'metric')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trainer-specific profile data
CREATE TABLE trainer_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    business_name TEXT,
    bio TEXT,
    specializations TEXT[],
    certifications TEXT[],
    stripe_account_id TEXT,
    stripe_onboarding_complete BOOLEAN DEFAULT FALSE,
    subscription_status subscription_status DEFAULT 'trialing',
    subscription_ends_at TIMESTAMPTZ,
    max_clients INTEGER DEFAULT 999,  -- Unlimited by default
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Client-specific profile data
CREATE TABLE client_profiles (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    date_of_birth DATE,
    gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
    height_inches DECIMAL(5,2),
    goals TEXT[],
    injuries_notes TEXT,
    fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced')),
    stripe_customer_id TEXT,
    subscription_status subscription_status,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- EXERCISES & WORKOUTS
-- ============================================================================

-- Master exercise library
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    instructions TEXT,
    category exercise_category NOT NULL,
    primary_muscle muscle_group NOT NULL,
    secondary_muscles muscle_group[],
    equipment TEXT[],
    video_url TEXT,
    thumbnail_url TEXT,
    is_system BOOLEAN DEFAULT FALSE,  -- System-provided vs trainer-created
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    embedding vector(1536),  -- For AI semantic search
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Workout templates (created by trainers)
CREATE TABLE workout_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    estimated_duration_minutes INTEGER,
    tags TEXT[],
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within a template
CREATE TABLE workout_template_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    sets INTEGER,
    reps_min INTEGER,
    reps_max INTEGER,
    weight_percentage DECIMAL(5,2),  -- % of 1RM if applicable
    duration_seconds INTEGER,  -- For timed exercises
    rest_seconds INTEGER DEFAULT 60,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Assigned workouts for clients
CREATE TABLE workouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trainer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    template_id UUID REFERENCES workout_templates(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    scheduled_date DATE,
    scheduled_time TIME,
    status workout_status DEFAULT 'scheduled',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    trainer_notes TEXT,  -- Private notes from trainer
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises within an assigned workout
CREATE TABLE workout_exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    order_index INTEGER NOT NULL,
    prescribed_sets INTEGER,
    prescribed_reps_min INTEGER,
    prescribed_reps_max INTEGER,
    prescribed_weight DECIMAL(8,2),
    prescribed_duration_seconds INTEGER,
    rest_seconds INTEGER DEFAULT 60,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logged sets (actual performance)
CREATE TABLE workout_sets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workout_exercise_id UUID NOT NULL REFERENCES workout_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL,
    reps_completed INTEGER,
    weight_used DECIMAL(8,2),
    duration_seconds INTEGER,
    rpe DECIMAL(3,1) CHECK (rpe >= 1 AND rpe <= 10),  -- Rate of Perceived Exertion
    notes TEXT,
    completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NUTRITION
-- ============================================================================

-- Food database cache (from USDA)
CREATE TABLE foods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fdc_id INTEGER UNIQUE,  -- USDA FoodData Central ID
    name TEXT NOT NULL,
    brand TEXT,
    serving_size DECIMAL(8,2),
    serving_unit TEXT,
    calories DECIMAL(8,2),
    protein_g DECIMAL(8,2),
    carbs_g DECIMAL(8,2),
    fat_g DECIMAL(8,2),
    fiber_g DECIMAL(8,2),
    sugar_g DECIMAL(8,2),
    sodium_mg DECIMAL(8,2),
    is_verified BOOLEAN DEFAULT FALSE,
    embedding vector(1536),  -- For AI semantic search
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily nutrition logs
CREATE TABLE nutrition_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    log_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, log_date)
);

-- Individual food entries
CREATE TABLE nutrition_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    log_id UUID NOT NULL REFERENCES nutrition_logs(id) ON DELETE CASCADE,
    food_id UUID REFERENCES foods(id) ON DELETE SET NULL,
    meal_type TEXT CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    custom_name TEXT,  -- If not from database
    servings DECIMAL(6,2) DEFAULT 1,
    calories DECIMAL(8,2),
    protein_g DECIMAL(8,2),
    carbs_g DECIMAL(8,2),
    fat_g DECIMAL(8,2),
    logged_at TIMESTAMPTZ DEFAULT NOW()
);

-- Nutrition targets (set by trainer or AI)
CREATE TABLE nutrition_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    calories_target INTEGER,
    protein_target_g INTEGER,
    carbs_target_g INTEGER,
    fat_target_g INTEGER,
    effective_from DATE NOT NULL,
    effective_to DATE,
    notes TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, effective_from)
);

-- ============================================================================
-- MEASUREMENTS & PROGRESS
-- ============================================================================

CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    measurement_type measurement_type NOT NULL,
    custom_label TEXT,  -- For 'custom' type
    value DECIMAL(10,2) NOT NULL,
    unit TEXT NOT NULL,
    measured_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

CREATE TABLE progress_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    storage_path TEXT NOT NULL,
    photo_type TEXT CHECK (photo_type IN ('front', 'side', 'back', 'other')),
    taken_at TIMESTAMPTZ DEFAULT NOW(),
    notes TEXT
);

-- ============================================================================
-- WEARABLES (Terra API)
-- ============================================================================

CREATE TABLE wearable_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,  -- 'garmin', 'fitbit', 'apple_health', 'oura', etc.
    terra_user_id TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, provider)
);

CREATE TABLE wearable_daily_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    data_date DATE NOT NULL,
    steps INTEGER,
    resting_heart_rate INTEGER,
    hrv_avg DECIMAL(6,2),
    sleep_duration_minutes INTEGER,
    sleep_efficiency DECIMAL(5,2),
    sleep_deep_minutes INTEGER,
    sleep_rem_minutes INTEGER,
    active_minutes INTEGER,
    -- Intentionally NOT storing calorie burn (research shows inaccuracy)
    raw_data JSONB,
    synced_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, data_date)
);

-- ============================================================================
-- PAYMENTS (Stripe)
-- ============================================================================

CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_subscription_id TEXT UNIQUE,
    stripe_price_id TEXT,
    status subscription_status NOT NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    interval TEXT CHECK (interval IN ('week', 'month', 'year')),
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    cancel_at_period_end BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    stripe_invoice_id TEXT UNIQUE,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT CHECK (status IN ('draft', 'open', 'paid', 'void', 'uncollectible')),
    due_date TIMESTAMPTZ,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- COMMUNICATION
-- ============================================================================

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_client_profiles_trainer ON client_profiles(trainer_id);

-- Exercises
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_muscle ON exercises(primary_muscle);
CREATE INDEX idx_exercises_embedding ON exercises USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Workouts
CREATE INDEX idx_workouts_client ON workouts(client_id);
CREATE INDEX idx_workouts_trainer ON workouts(trainer_id);
CREATE INDEX idx_workouts_date ON workouts(scheduled_date);
CREATE INDEX idx_workouts_status ON workouts(status);

-- Nutrition
CREATE INDEX idx_nutrition_logs_client_date ON nutrition_logs(client_id, log_date);
CREATE INDEX idx_foods_name ON foods USING gin(to_tsvector('english', name));
CREATE INDEX idx_foods_embedding ON foods USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Measurements
CREATE INDEX idx_measurements_client ON measurements(client_id);
CREATE INDEX idx_measurements_type ON measurements(measurement_type);

-- Wearables
CREATE INDEX idx_wearable_data_client_date ON wearable_daily_data(client_id, data_date);

-- Messages
CREATE INDEX idx_messages_recipient ON messages(recipient_id, read_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE wearable_daily_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own, trainers can read their clients
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Trainers can view their clients" ON profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM client_profiles 
            WHERE client_profiles.id = profiles.id 
            AND client_profiles.trainer_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Workouts: Clients see their own, trainers see their clients'
CREATE POLICY "Clients view own workouts" ON workouts
    FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Trainers view client workouts" ON workouts
    FOR SELECT USING (auth.uid() = trainer_id);

CREATE POLICY "Trainers manage client workouts" ON workouts
    FOR ALL USING (auth.uid() = trainer_id);

CREATE POLICY "Clients update own workouts" ON workouts
    FOR UPDATE USING (auth.uid() = client_id);

-- Exercises: System exercises readable by all, custom by creator
CREATE POLICY "System exercises readable by all" ON exercises
    FOR SELECT USING (is_system = TRUE);

CREATE POLICY "Custom exercises by creator" ON exercises
    FOR ALL USING (auth.uid() = created_by);

-- Messages: Sender and recipient can view
CREATE POLICY "View own messages" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Send messages" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_workouts_updated_at
    BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_trainer_profiles_updated_at
    BEFORE UPDATE ON trainer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_client_profiles_updated_at
    BEFORE UPDATE ON client_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Create profile on auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
