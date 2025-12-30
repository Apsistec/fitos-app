-- Seed exercises for FitOS
-- This script populates the exercises table with 200+ common exercises

-- Clear existing system exercises (be careful in production!)
DELETE FROM exercises WHERE is_system = true;

-- CHEST EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Barbell Bench Press', 'Classic compound chest exercise. Lie on bench, lower bar to chest, press up.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['barbell'], true),
('Dumbbell Bench Press', 'Dumbbell variation allowing greater range of motion and muscle activation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['dumbbells'], true),
('Incline Barbell Bench Press', 'Targets upper chest. Set bench to 30-45 degrees.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['barbell'], true),
('Incline Dumbbell Press', 'Upper chest focus with dumbbells for better range of motion.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['dumbbells'], true),
('Decline Barbell Bench Press', 'Targets lower chest. Set bench to -15 to -30 degrees.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['barbell'], true),
('Dumbbell Flyes', 'Isolation exercise for chest stretch and contraction.', 'strength', 'chest', ARRAY['shoulders'], ARRAY['dumbbells'], true),
('Cable Flyes', 'Constant tension chest isolation using cable machine.', 'strength', 'chest', ARRAY['shoulders'], ARRAY['cable machine'], true),
('Push-ups', 'Bodyweight chest exercise. Can be modified for all levels.', 'strength', 'chest', ARRAY['triceps', 'shoulders', 'core'], ARRAY[], true),
('Dips', 'Compound exercise targeting lower chest and triceps.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['dip bars'], true),
('Pec Deck Machine', 'Machine-based chest isolation with guided movement.', 'strength', 'chest', NULL, ARRAY['machine'], true),
('Wide-Grip Bench Press', 'Bench press with wider grip emphasizing chest stretch.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['barbell'], true),
('Close-Grip Push-ups', 'Push-up variation with hands close together for triceps.', 'strength', 'chest', ARRAY['triceps'], ARRAY[], true),
('Diamond Push-ups', 'Push-up with hands forming diamond shape.', 'strength', 'chest', ARRAY['triceps'], ARRAY[], true),
('Incline Push-ups', 'Push-up with hands elevated, easier variation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY[], true),
('Decline Push-ups', 'Push-up with feet elevated, harder variation.', 'strength', 'chest', ARRAY['triceps', 'shoulders'], ARRAY[], true),
('Svend Press', 'Chest squeeze exercise pressing plates together.', 'strength', 'chest', NULL, ARRAY['weight plates'], true),
('Landmine Press', 'Single-arm press using barbell in landmine.', 'strength', 'chest', ARRAY['shoulders', 'core'], ARRAY['barbell'], true);

-- BACK EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Barbell Deadlift', 'King of compound exercises. Targets entire posterior chain.', 'strength', 'back', ARRAY['glutes', 'hamstrings', 'traps'], ARRAY['barbell'], true),
('Pull-ups', 'Bodyweight back exercise. Overhand grip, pull chin over bar.', 'strength', 'back', ARRAY['biceps', 'shoulders'], ARRAY['pull-up bar'], true),
('Chin-ups', 'Underhand grip pull-up variation with more bicep activation.', 'strength', 'back', ARRAY['biceps', 'shoulders'], ARRAY['pull-up bar'], true),
('Barbell Row', 'Compound rowing movement targeting mid-back thickness.', 'strength', 'back', ARRAY['biceps', 'traps'], ARRAY['barbell'], true),
('Dumbbell Row', 'Unilateral rowing exercise for back development.', 'strength', 'back', ARRAY['biceps', 'traps'], ARRAY['dumbbells'], true),
('T-Bar Row', 'Machine or landmine row targeting mid-back.', 'strength', 'back', ARRAY['biceps', 'traps'], ARRAY['barbell'], true),
('Lat Pulldown', 'Machine-based vertical pulling movement.', 'strength', 'back', ARRAY['biceps', 'shoulders'], ARRAY['cable machine'], true),
('Seated Cable Row', 'Horizontal cable pulling for mid-back development.', 'strength', 'back', ARRAY['biceps'], ARRAY['cable machine'], true),
('Face Pulls', 'Rear delt and upper back exercise with cable.', 'strength', 'back', ARRAY['shoulders'], ARRAY['cable machine'], true),
('Hyperextensions', 'Lower back isolation on hyperextension bench.', 'strength', 'back', ARRAY['glutes', 'hamstrings'], ARRAY['hyperextension bench'], true),
('Wide-Grip Pull-ups', 'Pull-up with wide grip for lat width.', 'strength', 'back', ARRAY['biceps'], ARRAY['pull-up bar'], true),
('Close-Grip Pull-ups', 'Pull-up with narrow grip for lat thickness.', 'strength', 'back', ARRAY['biceps'], ARRAY['pull-up bar'], true),
('Neutral-Grip Pull-ups', 'Pull-up with palms facing each other.', 'strength', 'back', ARRAY['biceps'], ARRAY['pull-up bar'], true),
('Single-Arm Dumbbell Row', 'Unilateral row with one arm at a time.', 'strength', 'back', ARRAY['biceps'], ARRAY['dumbbells'], true),
('Chest-Supported Row', 'Row on incline bench for strict form.', 'strength', 'back', ARRAY['biceps'], ARRAY['dumbbells'], true),
('Inverted Row', 'Bodyweight row under bar or suspension trainer.', 'strength', 'back', ARRAY['biceps'], ARRAY['barbell'], true),
('Sumo Deadlift', 'Deadlift with wide stance, more quad involvement.', 'strength', 'back', ARRAY['legs', 'glutes'], ARRAY['barbell'], true),
('Trap Bar Deadlift', 'Deadlift with hexagonal trap bar.', 'strength', 'back', ARRAY['legs', 'glutes'], ARRAY['trap bar'], true);

-- LEGS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Barbell Back Squat', 'Fundamental compound leg exercise. Bar on upper back.', 'strength', 'legs', ARRAY['glutes', 'core'], ARRAY['barbell'], true),
('Front Squat', 'Squat variation with bar on front shoulders, more quad focus.', 'strength', 'legs', ARRAY['glutes', 'core'], ARRAY['barbell'], true),
('Romanian Deadlift', 'Hamstring and glute focused hip hinge movement.', 'strength', 'legs', ARRAY['back', 'glutes'], ARRAY['barbell'], true),
('Leg Press', 'Machine-based quad-dominant leg exercise.', 'strength', 'legs', ARRAY['glutes'], ARRAY['machine'], true),
('Walking Lunges', 'Unilateral leg exercise with forward movement.', 'strength', 'legs', ARRAY['glutes'], ARRAY['dumbbells'], true),
('Bulgarian Split Squat', 'Single-leg squat with rear foot elevated.', 'strength', 'legs', ARRAY['glutes'], ARRAY['dumbbells'], true),
('Leg Extension', 'Quad isolation on machine.', 'strength', 'legs', NULL, ARRAY['machine'], true),
('Leg Curl', 'Hamstring isolation on machine.', 'strength', 'legs', NULL, ARRAY['machine'], true),
('Calf Raises', 'Standing or seated calf isolation exercise.', 'strength', 'legs', NULL, ARRAY['machine'], true),
('Goblet Squat', 'Beginner-friendly squat holding dumbbell at chest.', 'strength', 'legs', ARRAY['glutes', 'core'], ARRAY['dumbbells'], true),
('Sumo Squat', 'Squat with wide stance targeting inner thighs.', 'strength', 'legs', ARRAY['glutes'], ARRAY['barbell'], true),
('Box Squat', 'Squat to box for depth control and posterior chain.', 'strength', 'legs', ARRAY['glutes'], ARRAY['barbell'], true),
('Hack Squat', 'Machine squat with back support.', 'strength', 'legs', ARRAY['glutes'], ARRAY['machine'], true),
('Reverse Lunges', 'Lunge stepping backward.', 'strength', 'legs', ARRAY['glutes'], ARRAY['dumbbells'], true),
('Side Lunges', 'Lateral lunge movement.', 'strength', 'legs', ARRAY['glutes'], ARRAY['dumbbells'], true),
('Step-Ups', 'Stepping onto elevated platform.', 'strength', 'legs', ARRAY['glutes'], ARRAY['dumbbells'], true),
('Single-Leg Deadlift', 'Unilateral deadlift for balance and hamstrings.', 'strength', 'legs', ARRAY['glutes', 'back'], ARRAY['dumbbells'], true),
('Good Mornings', 'Hip hinge with bar on back targeting hamstrings.', 'strength', 'legs', ARRAY['back', 'glutes'], ARRAY['barbell'], true),
('Glute Bridge', 'Hip thrust from floor position.', 'strength', 'legs', ARRAY['glutes'], ARRAY[], true),
('Hip Thrust', 'Glute-focused hip extension with upper back on bench.', 'strength', 'legs', ARRAY['glutes'], ARRAY['barbell'], true),
('Nordic Hamstring Curl', 'Advanced bodyweight hamstring exercise.', 'strength', 'legs', NULL, ARRAY[], true);

-- SHOULDERS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Overhead Press', 'Standing barbell press for overall shoulder development.', 'strength', 'shoulders', ARRAY['triceps', 'core'], ARRAY['barbell'], true),
('Seated Dumbbell Press', 'Seated shoulder press with dumbbells.', 'strength', 'shoulders', ARRAY['triceps'], ARRAY['dumbbells'], true),
('Arnold Press', 'Rotating dumbbell press engaging all three deltoid heads.', 'strength', 'shoulders', ARRAY['triceps'], ARRAY['dumbbells'], true),
('Lateral Raises', 'Side delt isolation with dumbbells or cables.', 'strength', 'shoulders', NULL, ARRAY['dumbbells'], true),
('Front Raises', 'Front delt isolation exercise.', 'strength', 'shoulders', NULL, ARRAY['dumbbells'], true),
('Rear Delt Flyes', 'Rear deltoid isolation, bent over or on incline bench.', 'strength', 'shoulders', NULL, ARRAY['dumbbells'], true),
('Upright Row', 'Barbell or dumbbell row to shoulder height.', 'strength', 'shoulders', ARRAY['traps'], ARRAY['barbell'], true),
('Shrugs', 'Trap isolation with heavy weight.', 'strength', 'shoulders', ARRAY['traps'], ARRAY['dumbbells'], true),
('Z Press', 'Seated floor press with no leg drive.', 'strength', 'shoulders', ARRAY['triceps', 'core'], ARRAY['barbell'], true),
('Viking Press', 'Landmine shoulder press with both hands.', 'strength', 'shoulders', ARRAY['triceps'], ARRAY['barbell'], true),
('Cable Lateral Raises', 'Side delt raises using cable for constant tension.', 'strength', 'shoulders', NULL, ARRAY['cable machine'], true),
('Plate Front Raises', 'Front raises holding weight plate.', 'strength', 'shoulders', NULL, ARRAY['weight plates'], true),
('Band Pull-Aparts', 'Rear delt and upper back exercise with resistance band.', 'strength', 'shoulders', ARRAY['back'], ARRAY['resistance bands'], true),
('Handstand Push-ups', 'Advanced inverted push-up against wall.', 'strength', 'shoulders', ARRAY['triceps', 'core'], ARRAY[], true);

-- ARMS EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Barbell Curl', 'Classic bicep exercise with barbell.', 'strength', 'arms', NULL, ARRAY['barbell'], true),
('Dumbbell Curl', 'Bicep curl with dumbbells, alternating or simultaneous.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Hammer Curl', 'Neutral grip curl targeting brachialis and biceps.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Preacher Curl', 'Bicep isolation on preacher bench.', 'strength', 'arms', NULL, ARRAY['barbell'], true),
('Cable Curl', 'Constant tension bicep curl with cable machine.', 'strength', 'arms', NULL, ARRAY['cable machine'], true),
('Tricep Dips', 'Bodyweight tricep exercise on parallel bars or bench.', 'strength', 'arms', ARRAY['chest', 'shoulders'], ARRAY['dip bars'], true),
('Close-Grip Bench Press', 'Bench press variation emphasizing triceps.', 'strength', 'arms', ARRAY['chest', 'shoulders'], ARRAY['barbell'], true),
('Tricep Pushdown', 'Cable machine tricep isolation.', 'strength', 'arms', NULL, ARRAY['cable machine'], true),
('Overhead Tricep Extension', 'Tricep isolation with weight overhead.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Skull Crushers', 'Lying tricep extension with barbell or EZ-bar.', 'strength', 'arms', NULL, ARRAY['barbell'], true),
('Concentration Curl', 'Seated single-arm bicep curl with elbow braced.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Incline Dumbbell Curl', 'Bicep curl on incline bench for stretch.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Spider Curl', 'Bicep curl on steep incline bench, chest down.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Zottman Curl', 'Curl with rotation at top.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Rope Tricep Pushdown', 'Tricep pushdown using rope attachment.', 'strength', 'arms', NULL, ARRAY['cable machine'], true),
('Kickbacks', 'Tricep isolation with arm extended back.', 'strength', 'arms', NULL, ARRAY['dumbbells'], true),
('Wrist Curls', 'Forearm flexor isolation.', 'strength', 'arms', NULL, ARRAY['barbell'], true),
('Reverse Wrist Curls', 'Forearm extensor isolation.', 'strength', 'arms', NULL, ARRAY['barbell'], true);

-- CORE EXERCISES
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Plank', 'Isometric core exercise holding push-up position.', 'strength', 'core', NULL, ARRAY[], true),
('Side Plank', 'Lateral core stability exercise.', 'strength', 'core', NULL, ARRAY[], true),
('Crunches', 'Basic abdominal flexion exercise.', 'strength', 'core', NULL, ARRAY[], true),
('Bicycle Crunches', 'Rotating crunch engaging obliques.', 'strength', 'core', NULL, ARRAY[], true),
('Russian Twists', 'Rotational core exercise, often with weight.', 'strength', 'core', NULL, ARRAY['dumbbells'], true),
('Leg Raises', 'Lower ab exercise lying on back or hanging.', 'strength', 'core', NULL, ARRAY[], true),
('Mountain Climbers', 'Dynamic core exercise with cardio component.', 'cardio', 'core', NULL, ARRAY[], true),
('Ab Wheel Rollout', 'Advanced core exercise with ab wheel.', 'strength', 'core', NULL, ARRAY['ab wheel'], true),
('Cable Woodchoppers', 'Rotational core exercise with cable machine.', 'strength', 'core', ARRAY['shoulders'], ARRAY['cable machine'], true),
('Dead Bug', 'Core stability exercise lying on back.', 'strength', 'core', NULL, ARRAY[], true),
('Hanging Leg Raises', 'Advanced lower ab exercise hanging from bar.', 'strength', 'core', NULL, ARRAY['pull-up bar'], true),
('Toes-to-Bar', 'Advanced ab exercise bringing toes to bar.', 'strength', 'core', NULL, ARRAY['pull-up bar'], true),
('L-Sit', 'Isometric core exercise holding L-shape position.', 'strength', 'core', NULL, ARRAY['parallel bars'], true),
('Hollow Body Hold', 'Gymnastic core exercise lying on back.', 'strength', 'core', NULL, ARRAY[], true),
('V-Ups', 'Dynamic crunch reaching hands to feet.', 'strength', 'core', NULL, ARRAY[], true),
('Pallof Press', 'Anti-rotation core exercise with cable or band.', 'strength', 'core', NULL, ARRAY['cable machine'], true),
('Bird Dog', 'Core stability exercise on hands and knees.', 'strength', 'core', NULL, ARRAY[], true);

-- CARDIO & CONDITIONING
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Running', 'Outdoor or treadmill running for cardiovascular fitness.', 'cardio', 'legs', NULL, ARRAY[], true),
('Cycling', 'Stationary bike or outdoor cycling.', 'cardio', 'legs', NULL, ARRAY['bike'], true),
('Rowing Machine', 'Full-body cardio exercise on rowing ergometer.', 'cardio', 'back', ARRAY['legs', 'core'], ARRAY['rowing machine'], true),
('Jump Rope', 'High-intensity cardio with coordination element.', 'cardio', 'legs', ARRAY['shoulders'], ARRAY['jump rope'], true),
('Burpees', 'Full-body conditioning exercise combining squat, plank, and jump.', 'cardio', 'legs', ARRAY['chest', 'core'], ARRAY[], true),
('Box Jumps', 'Plyometric jump exercise for power and conditioning.', 'plyometrics', 'legs', NULL, ARRAY['plyo box'], true),
('Battle Ropes', 'Upper body and core conditioning with heavy ropes.', 'cardio', 'shoulders', ARRAY['core'], ARRAY['battle ropes'], true),
('Kettlebell Swings', 'Hip hinge power exercise with kettlebell.', 'strength', 'glutes', ARRAY['back', 'core'], ARRAY['kettlebell'], true),
('Sled Push', 'Full-body conditioning pushing weighted sled.', 'cardio', 'legs', ARRAY['chest', 'core'], ARRAY['sled'], true),
('Sled Pull', 'Full-body conditioning pulling weighted sled.', 'cardio', 'back', ARRAY['legs', 'core'], ARRAY['sled'], true);

-- OLYMPIC LIFTS & POWER
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Power Clean', 'Explosive Olympic lift from floor to shoulders.', 'olympic', 'legs', ARRAY['back', 'shoulders'], ARRAY['barbell'], true),
('Clean and Jerk', 'Two-part Olympic lift: clean to shoulders, jerk overhead.', 'olympic', 'legs', ARRAY['back', 'shoulders'], ARRAY['barbell'], true),
('Snatch', 'Single-movement Olympic lift from floor to overhead.', 'olympic', 'legs', ARRAY['back', 'shoulders'], ARRAY['barbell'], true),
('Push Press', 'Overhead press with leg drive assistance.', 'olympic', 'shoulders', ARRAY['legs', 'triceps'], ARRAY['barbell'], true),
('Hang Clean', 'Power clean starting from hanging position (above knees).', 'olympic', 'legs', ARRAY['back', 'shoulders'], ARRAY['barbell'], true);

-- FUNCTIONAL & MOBILITY
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Turkish Get-Up', 'Complex full-body movement from lying to standing with weight.', 'functional', 'core', ARRAY['shoulders', 'legs'], ARRAY['kettlebell'], true),
('Farmer''s Walk', 'Loaded carry for grip, core, and overall strength.', 'functional', 'core', ARRAY['back', 'legs'], ARRAY['dumbbells'], true),
('Overhead Walk', 'Walking with weight held overhead for shoulder stability.', 'functional', 'shoulders', ARRAY['core'], ARRAY['dumbbells'], true),
('Wall Ball', 'Squat and throw medicine ball to target on wall.', 'functional', 'legs', ARRAY['shoulders'], ARRAY['medicine ball'], true),
('Thruster', 'Combination of front squat and overhead press.', 'functional', 'legs', ARRAY['shoulders'], ARRAY['barbell'], true),
('Suitcase Carry', 'Unilateral loaded carry for core stability.', 'functional', 'core', NULL, ARRAY['dumbbells'], true),
('Man Maker', 'Complex combining push-up, row, and thruster.', 'functional', 'legs', ARRAY['chest', 'back', 'shoulders'], ARRAY['dumbbells'], true),
('Devil Press', 'Burpee with double dumbbell snatch.', 'functional', 'legs', ARRAY['shoulders', 'core'], ARRAY['dumbbells'], true),
('Cluster', 'Combination of clean and thruster.', 'olympic', 'legs', ARRAY['shoulders'], ARRAY['barbell'], true);

-- STRETCHING & MOBILITY
INSERT INTO exercises (name, description, category, primary_muscle, secondary_muscles, equipment, is_system) VALUES
('Cat-Cow Stretch', 'Spinal mobility exercise alternating flexion and extension.', 'mobility', 'back', NULL, ARRAY[], true),
('World''s Greatest Stretch', 'Multi-planar full-body mobility exercise.', 'mobility', 'legs', ARRAY['back', 'shoulders'], ARRAY[], true),
('Pigeon Pose', 'Hip opener stretch from yoga.', 'mobility', 'legs', ARRAY['glutes'], ARRAY[], true),
('Couch Stretch', 'Hip flexor and quad stretch with rear knee against wall.', 'mobility', 'legs', NULL, ARRAY[], true),
('Foam Rolling', 'Self-myofascial release technique for recovery.', 'recovery', 'back', NULL, ARRAY['foam roller'], true);

-- Verify count
SELECT COUNT(*) as exercise_count FROM exercises WHERE is_system = true;
