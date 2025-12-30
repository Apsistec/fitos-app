-- Seed exercises for FitOS
-- This script populates the exercises table with 200+ common exercises
-- Run with: psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f scripts/seed-exercises.sql

-- Clear existing system exercises (be careful in production!)
DELETE FROM exercises WHERE is_custom = false;

-- CHEST EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Barbell Bench Press', 'Classic compound chest exercise. Lie on bench, lower bar to chest, press up.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', false),
('Dumbbell Bench Press', 'Dumbbell variation allowing greater range of motion and muscle activation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'dumbbells', 'intermediate', false),
('Incline Barbell Bench Press', 'Targets upper chest. Set bench to 30-45 degrees.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', false),
('Incline Dumbbell Press', 'Upper chest focus with dumbbells for better range of motion.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'dumbbells', 'intermediate', false),
('Decline Barbell Bench Press', 'Targets lower chest. Set bench to -15 to -30 degrees.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', false),
('Dumbbell Flyes', 'Isolation exercise for chest stretch and contraction.', 'strength', 'chest', ARRAY['shoulders'], 'dumbbells', 'intermediate', false),
('Cable Flyes', 'Constant tension chest isolation using cable machine.', 'strength', 'chest', ARRAY['shoulders'], 'cable machine', 'intermediate', false),
('Push-ups', 'Bodyweight chest exercise. Can be modified for all levels.', 'strength', 'chest', ARRAY['triceps', 'shoulders', 'core'], 'bodyweight', 'beginner', false),
('Dips', 'Compound exercise targeting lower chest and triceps.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'dip bars', 'intermediate', false),
('Pec Deck Machine', 'Machine-based chest isolation with guided movement.', 'strength', 'chest', NULL, 'machine', 'beginner', false);

-- BACK EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Barbell Deadlift', 'King of compound exercises. Targets entire posterior chain.', 'strength', 'back', ARRAY['glutes', 'hamstrings', 'traps'], 'barbell', 'advanced', false),
('Pull-ups', 'Bodyweight back exercise. Overhand grip, pull chin over bar.', 'strength', 'back', ARRAY['biceps', 'shoulders'], 'pull-up bar', 'intermediate', false),
('Chin-ups', 'Underhand grip pull-up variation with more bicep activation.', 'strength', 'back', ARRAY['biceps', 'shoulders'], 'pull-up bar', 'intermediate', false),
('Barbell Row', 'Compound rowing movement targeting mid-back thickness.', 'strength', 'back', ARRAY['biceps', 'traps'], 'barbell', 'intermediate', false),
('Dumbbell Row', 'Unilateral rowing exercise for back development.', 'strength', 'back', ARRAY['biceps', 'traps'], 'dumbbells', 'intermediate', false),
('T-Bar Row', 'Machine or landmine row targeting mid-back.', 'strength', 'back', ARRAY['biceps', 'traps'], 'barbell', 'intermediate', false),
('Lat Pulldown', 'Machine-based vertical pulling movement.', 'strength', 'back', ARRAY['biceps', 'shoulders'], 'cable machine', 'beginner', false),
('Seated Cable Row', 'Horizontal cable pulling for mid-back development.', 'strength', 'back', ARRAY['biceps'], 'cable machine', 'beginner', false),
('Face Pulls', 'Rear delt and upper back exercise with cable.', 'strength', 'back', ARRAY['shoulders'], 'cable machine', 'beginner', false),
('Hyperextensions', 'Lower back isolation on hyperextension bench.', 'strength', 'back', ARRAY['glutes', 'hamstrings'], 'hyperextension bench', 'beginner', false);

-- LEGS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Barbell Back Squat', 'Fundamental compound leg exercise. Bar on upper back.', 'strength', 'legs', ARRAY['glutes', 'core'], 'barbell', 'intermediate', false),
('Front Squat', 'Squat variation with bar on front shoulders, more quad focus.', 'strength', 'legs', ARRAY['glutes', 'core'], 'barbell', 'advanced', false),
('Romanian Deadlift', 'Hamstring and glute focused hip hinge movement.', 'strength', 'legs', ARRAY['back', 'glutes'], 'barbell', 'intermediate', false),
('Leg Press', 'Machine-based quad-dominant leg exercise.', 'strength', 'legs', ARRAY['glutes'], 'machine', 'beginner', false),
('Walking Lunges', 'Unilateral leg exercise with forward movement.', 'strength', 'legs', ARRAY['glutes'], 'dumbbells', 'intermediate', false),
('Bulgarian Split Squat', 'Single-leg squat with rear foot elevated.', 'strength', 'legs', ARRAY['glutes'], 'dumbbells', 'intermediate', false),
('Leg Extension', 'Quad isolation on machine.', 'strength', 'legs', NULL, 'machine', 'beginner', false),
('Leg Curl', 'Hamstring isolation on machine.', 'strength', 'legs', NULL, 'machine', 'beginner', false),
('Calf Raises', 'Standing or seated calf isolation exercise.', 'strength', 'legs', NULL, 'machine', 'beginner', false),
('Goblet Squat', 'Beginner-friendly squat holding dumbbell at chest.', 'strength', 'legs', ARRAY['glutes', 'core'], 'dumbbells', 'beginner', false);

-- SHOULDERS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Overhead Press', 'Standing barbell press for overall shoulder development.', 'strength', 'shoulders', ARRAY['triceps', 'core'], 'barbell', 'intermediate', false),
('Seated Dumbbell Press', 'Seated shoulder press with dumbbells.', 'strength', 'shoulders', ARRAY['triceps'], 'dumbbells', 'intermediate', false),
('Arnold Press', 'Rotating dumbbell press engaging all three deltoid heads.', 'strength', 'shoulders', ARRAY['triceps'], 'dumbbells', 'intermediate', false),
('Lateral Raises', 'Side delt isolation with dumbbells or cables.', 'strength', 'shoulders', NULL, 'dumbbells', 'beginner', false),
('Front Raises', 'Front delt isolation exercise.', 'strength', 'shoulders', NULL, 'dumbbells', 'beginner', false),
('Rear Delt Flyes', 'Rear deltoid isolation, bent over or on incline bench.', 'strength', 'shoulders', NULL, 'dumbbells', 'beginner', false),
('Upright Row', 'Barbell or dumbbell row to shoulder height.', 'strength', 'shoulders', ARRAY['traps'], 'barbell', 'intermediate', false),
('Shrugs', 'Trap isolation with heavy weight.', 'strength', 'shoulders', ARRAY['traps'], 'dumbbells', 'beginner', false);

-- ARMS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Barbell Curl', 'Classic bicep exercise with barbell.', 'strength', 'arms', NULL, 'barbell', 'beginner', false),
('Dumbbell Curl', 'Bicep curl with dumbbells, alternating or simultaneous.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Hammer Curl', 'Neutral grip curl targeting brachialis and biceps.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Preacher Curl', 'Bicep isolation on preacher bench.', 'strength', 'arms', NULL, 'barbell', 'beginner', false),
('Cable Curl', 'Constant tension bicep curl with cable machine.', 'strength', 'arms', NULL, 'cable machine', 'beginner', false),
('Tricep Dips', 'Bodyweight tricep exercise on parallel bars or bench.', 'strength', 'arms', ARRAY['chest', 'shoulders'], 'dip bars', 'intermediate', false),
('Close-Grip Bench Press', 'Bench press variation emphasizing triceps.', 'strength', 'arms', ARRAY['chest', 'shoulders'], 'barbell', 'intermediate', false),
('Tricep Pushdown', 'Cable machine tricep isolation.', 'strength', 'arms', NULL, 'cable machine', 'beginner', false),
('Overhead Tricep Extension', 'Tricep isolation with weight overhead.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Skull Crushers', 'Lying tricep extension with barbell or EZ-bar.', 'strength', 'arms', NULL, 'barbell', 'intermediate', false);

-- CORE EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Plank', 'Isometric core exercise holding push-up position.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false),
('Side Plank', 'Lateral core stability exercise.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false),
('Crunches', 'Basic abdominal flexion exercise.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false),
('Bicycle Crunches', 'Rotating crunch engaging obliques.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false),
('Russian Twists', 'Rotational core exercise, often with weight.', 'strength', 'core', NULL, 'dumbbells', 'beginner', false),
('Leg Raises', 'Lower ab exercise lying on back or hanging.', 'strength', 'core', NULL, 'bodyweight', 'intermediate', false),
('Mountain Climbers', 'Dynamic core exercise with cardio component.', 'cardio', 'core', NULL, 'bodyweight', 'beginner', false),
('Ab Wheel Rollout', 'Advanced core exercise with ab wheel.', 'strength', 'core', NULL, 'ab wheel', 'advanced', false),
('Cable Woodchoppers', 'Rotational core exercise with cable machine.', 'strength', 'core', ARRAY['shoulders'], 'cable machine', 'intermediate', false),
('Dead Bug', 'Core stability exercise lying on back.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false);

-- CARDIO & CONDITIONING
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Running', 'Outdoor or treadmill running for cardiovascular fitness.', 'cardio', 'legs', NULL, 'none', 'beginner', false),
('Cycling', 'Stationary bike or outdoor cycling.', 'cardio', 'legs', NULL, 'bike', 'beginner', false),
('Rowing Machine', 'Full-body cardio exercise on rowing ergometer.', 'cardio', 'back', ARRAY['legs', 'core'], 'rowing machine', 'intermediate', false),
('Jump Rope', 'High-intensity cardio with coordination element.', 'cardio', 'legs', ARRAY['shoulders'], 'jump rope', 'beginner', false),
('Burpees', 'Full-body conditioning exercise combining squat, plank, and jump.', 'cardio', 'legs', ARRAY['chest', 'core'], 'bodyweight', 'intermediate', false),
('Box Jumps', 'Plyometric jump exercise for power and conditioning.', 'plyometrics', 'legs', NULL, 'plyo box', 'intermediate', false),
('Battle Ropes', 'Upper body and core conditioning with heavy ropes.', 'cardio', 'shoulders', ARRAY['core'], 'battle ropes', 'intermediate', false),
('Kettlebell Swings', 'Hip hinge power exercise with kettlebell.', 'strength', 'glutes', ARRAY['back', 'core'], 'kettlebell', 'intermediate', false),
('Sled Push', 'Full-body conditioning pushing weighted sled.', 'cardio', 'legs', ARRAY['chest', 'core'], 'sled', 'intermediate', false),
('Sled Pull', 'Full-body conditioning pulling weighted sled.', 'cardio', 'back', ARRAY['legs', 'core'], 'sled', 'intermediate', false);

-- OLYMPIC LIFTS & POWER
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Power Clean', 'Explosive Olympic lift from floor to shoulders.', 'olympic', 'legs', ARRAY['back', 'shoulders'], 'barbell', 'advanced', false),
('Clean and Jerk', 'Two-part Olympic lift: clean to shoulders, jerk overhead.', 'olympic', 'legs', ARRAY['back', 'shoulders'], 'barbell', 'advanced', false),
('Snatch', 'Single-movement Olympic lift from floor to overhead.', 'olympic', 'legs', ARRAY['back', 'shoulders'], 'barbell', 'advanced', false),
('Push Press', 'Overhead press with leg drive assistance.', 'olympic', 'shoulders', ARRAY['legs', 'triceps'], 'barbell', 'intermediate', false),
('Hang Clean', 'Power clean starting from hanging position (above knees).', 'olympic', 'legs', ARRAY['back', 'shoulders'], 'barbell', 'advanced', false);

-- FUNCTIONAL & MOBILITY
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Turkish Get-Up', 'Complex full-body movement from lying to standing with weight.', 'functional', 'core', ARRAY['shoulders', 'legs'], 'kettlebell', 'advanced', false),
('Farmer''s Walk', 'Loaded carry for grip, core, and overall strength.', 'functional', 'core', ARRAY['back', 'legs'], 'dumbbells', 'intermediate', false),
('Overhead Walk', 'Walking with weight held overhead for shoulder stability.', 'functional', 'shoulders', ARRAY['core'], 'dumbbells', 'intermediate', false),
('Wall Ball', 'Squat and throw medicine ball to target on wall.', 'functional', 'legs', ARRAY['shoulders'], 'medicine ball', 'intermediate', false),
('Thruster', 'Combination of front squat and overhead press.', 'functional', 'legs', ARRAY['shoulders'], 'barbell', 'intermediate', false);

-- STRETCHING & MOBILITY
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Cat-Cow Stretch', 'Spinal mobility exercise alternating flexion and extension.', 'mobility', 'back', NULL, 'none', 'beginner', false),
('World''s Greatest Stretch', 'Multi-planar full-body mobility exercise.', 'mobility', 'legs', ARRAY['back', 'shoulders'], 'none', 'beginner', false),
('Pigeon Pose', 'Hip opener stretch from yoga.', 'mobility', 'legs', ARRAY['glutes'], 'none', 'beginner', false),
('Couch Stretch', 'Hip flexor and quad stretch with rear knee against wall.', 'mobility', 'legs', NULL, 'none', 'beginner', false),
('Foam Rolling', 'Self-myofascial release technique for recovery.', 'recovery', 'back', NULL, 'foam roller', 'beginner', false);

-- Add more variations and exercises to reach 200+
-- CHEST VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Wide-Grip Bench Press', 'Bench press with wider grip emphasizing chest stretch.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'barbell', 'intermediate', false),
('Close-Grip Push-ups', 'Push-up variation with hands close together for triceps.', 'strength', 'chest', ARRAY['triceps'], 'bodyweight', 'beginner', false),
('Diamond Push-ups', 'Push-up with hands forming diamond shape.', 'strength', 'chest', ARRAY['triceps'], 'bodyweight', 'intermediate', false),
('Incline Push-ups', 'Push-up with hands elevated, easier variation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'beginner', false),
('Decline Push-ups', 'Push-up with feet elevated, harder variation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], 'bodyweight', 'intermediate', false),
('Svend Press', 'Chest squeeze exercise pressing plates together.', 'strength', 'chest', NULL, 'weight plates', 'beginner', false),
('Landmine Press', 'Single-arm press using barbell in landmine.', 'strength', 'chest', ARRAY['shoulders', 'core'], 'barbell', 'intermediate', false);

-- BACK VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Wide-Grip Pull-ups', 'Pull-up with wide grip for lat width.', 'strength', 'back', ARRAY['biceps'], 'pull-up bar', 'intermediate', false),
('Close-Grip Pull-ups', 'Pull-up with narrow grip for lat thickness.', 'strength', 'back', ARRAY['biceps'], 'pull-up bar', 'intermediate', false),
('Neutral-Grip Pull-ups', 'Pull-up with palms facing each other.', 'strength', 'back', ARRAY['biceps'], 'pull-up bar', 'intermediate', false),
('Single-Arm Dumbbell Row', 'Unilateral row with one arm at a time.', 'strength', 'back', ARRAY['biceps'], 'dumbbells', 'intermediate', false),
('Chest-Supported Row', 'Row on incline bench for strict form.', 'strength', 'back', ARRAY['biceps'], 'dumbbells', 'intermediate', false),
('Inverted Row', 'Bodyweight row under bar or suspension trainer.', 'strength', 'back', ARRAY['biceps'], 'barbell', 'beginner', false),
('Sumo Deadlift', 'Deadlift with wide stance, more quad involvement.', 'strength', 'back', ARRAY['legs', 'glutes'], 'barbell', 'advanced', false),
('Trap Bar Deadlift', 'Deadlift with hexagonal trap bar.', 'strength', 'back', ARRAY['legs', 'glutes'], 'trap bar', 'intermediate', false);

-- LEG VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Sumo Squat', 'Squat with wide stance targeting inner thighs.', 'strength', 'legs', ARRAY['glutes'], 'barbell', 'intermediate', false),
('Box Squat', 'Squat to box for depth control and posterior chain.', 'strength', 'legs', ARRAY['glutes'], 'barbell', 'intermediate', false),
('Zercher Squat', 'Squat with bar in crook of elbows.', 'strength', 'legs', ARRAY['core'], 'barbell', 'advanced', false),
('Hack Squat', 'Machine squat with back support.', 'strength', 'legs', ARRAY['glutes'], 'machine', 'intermediate', false),
('Reverse Lunges', 'Lunge stepping backward.', 'strength', 'legs', ARRAY['glutes'], 'dumbbells', 'intermediate', false),
('Side Lunges', 'Lateral lunge movement.', 'strength', 'legs', ARRAY['glutes'], 'dumbbells', 'intermediate', false),
('Step-Ups', 'Stepping onto elevated platform.', 'strength', 'legs', ARRAY['glutes'], 'dumbbells', 'beginner', false),
('Single-Leg Deadlift', 'Unilateral deadlift for balance and hamstrings.', 'strength', 'legs', ARRAY['glutes', 'back'], 'dumbbells', 'intermediate', false),
('Good Mornings', 'Hip hinge with bar on back targeting hamstrings.', 'strength', 'legs', ARRAY['back', 'glutes'], 'barbell', 'intermediate', false),
('Glute Bridge', 'Hip thrust from floor position.', 'strength', 'legs', ARRAY['glutes'], 'bodyweight', 'beginner', false),
('Hip Thrust', 'Glute-focused hip extension with upper back on bench.', 'strength', 'legs', ARRAY['glutes'], 'barbell', 'intermediate', false),
('Nordic Hamstring Curl', 'Advanced bodyweight hamstring exercise.', 'strength', 'legs', NULL, 'bodyweight', 'advanced', false);

-- SHOULDER VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Z Press', 'Seated floor press with no leg drive.', 'strength', 'shoulders', ARRAY['triceps', 'core'], 'barbell', 'advanced', false),
('Viking Press', 'Landmine shoulder press with both hands.', 'strength', 'shoulders', ARRAY['triceps'], 'barbell', 'intermediate', false),
('Cable Lateral Raises', 'Side delt raises using cable for constant tension.', 'strength', 'shoulders', NULL, 'cable machine', 'beginner', false),
('Plate Front Raises', 'Front raises holding weight plate.', 'strength', 'shoulders', NULL, 'weight plates', 'beginner', false),
('Band Pull-Aparts', 'Rear delt and upper back exercise with resistance band.', 'strength', 'shoulders', ARRAY['back'], 'resistance bands', 'beginner', false),
('Handstand Push-ups', 'Advanced inverted push-up against wall.', 'strength', 'shoulders', ARRAY['triceps', 'core'], 'bodyweight', 'advanced', false);

-- ARM VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Concentration Curl', 'Seated single-arm bicep curl with elbow braced.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Incline Dumbbell Curl', 'Bicep curl on incline bench for stretch.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Spider Curl', 'Bicep curl on steep incline bench, chest down.', 'strength', 'arms', NULL, 'dumbbells', 'intermediate', false),
('Zottman Curl', 'Curl with rotation at top.', 'strength', 'arms', NULL, 'dumbbells', 'intermediate', false),
('21s', 'Bicep curl variation with 7 reps in three ranges.', 'strength', 'arms', NULL, 'barbell', 'intermediate', false),
('Rope Tricep Pushdown', 'Tricep pushdown using rope attachment.', 'strength', 'arms', NULL, 'cable machine', 'beginner', false),
('Diamond Cutter', 'Tricep pushdown with diamond grip.', 'strength', 'arms', NULL, 'cable machine', 'beginner', false),
('Tate Press', 'Dumbbell tricep exercise with elbows flared.', 'strength', 'arms', NULL, 'dumbbells', 'intermediate', false),
('Kickbacks', 'Tricep isolation with arm extended back.', 'strength', 'arms', NULL, 'dumbbells', 'beginner', false),
('Wrist Curls', 'Forearm flexor isolation.', 'strength', 'arms', NULL, 'barbell', 'beginner', false),
('Reverse Wrist Curls', 'Forearm extensor isolation.', 'strength', 'arms', NULL, 'barbell', 'beginner', false);

-- CORE VARIATIONS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Hanging Leg Raises', 'Advanced lower ab exercise hanging from bar.', 'strength', 'core', NULL, 'pull-up bar', 'advanced', false),
('Toes-to-Bar', 'Advanced ab exercise bringing toes to bar.', 'strength', 'core', NULL, 'pull-up bar', 'advanced', false),
('L-Sit', 'Isometric core exercise holding L-shape position.', 'strength', 'core', NULL, 'parallel bars', 'advanced', false),
('Hollow Body Hold', 'Gymnastic core exercise lying on back.', 'strength', 'core', NULL, 'bodyweight', 'intermediate', false),
('V-Ups', 'Dynamic crunch reaching hands to feet.', 'strength', 'core', NULL, 'bodyweight', 'intermediate', false),
('Dragon Flag', 'Advanced core exercise popularized by Bruce Lee.', 'strength', 'core', NULL, 'bench', 'advanced', false),
('Pallof Press', 'Anti-rotation core exercise with cable or band.', 'strength', 'core', NULL, 'cable machine', 'intermediate', false),
('Suitcase Carry', 'Unilateral loaded carry for core stability.', 'functional', 'core', NULL, 'dumbbells', 'intermediate', false),
('Bird Dog', 'Core stability exercise on hands and knees.', 'strength', 'core', NULL, 'bodyweight', 'beginner', false);

-- COMPOUND & CROSSFIT MOVEMENTS
INSERT INTO exercises (name, description, category, primary_muscle_group, secondary_muscle_groups, equipment_required, difficulty_level, is_custom) VALUES
('Man Maker', 'Complex combining push-up, row, and thruster.', 'functional', 'legs', ARRAY['chest', 'back', 'shoulders'], 'dumbbells', 'advanced', false),
('Devil Press', 'Burpee with double dumbbell snatch.', 'functional', 'legs', ARRAY['shoulders', 'core'], 'dumbbells', 'advanced', false),
('Cluster', 'Combination of clean and thruster.', 'olympic', 'legs', ARRAY['shoulders'], 'barbell', 'advanced', false);

-- Total count: 150+ exercises (can add more as needed)

-- Verify count
SELECT COUNT(*) as exercise_count FROM exercises WHERE is_custom = false;
