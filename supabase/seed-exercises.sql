-- Seed exercises for FitOS
-- Based on common compound and isolation movements
-- Categories: Barbell, Dumbbell, Bodyweight, Cable, Machine, Cardio

-- Clear existing exercises (only system ones)
DELETE FROM exercises WHERE is_system = true;

-- Chest Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Barbell Bench Press', 'Lie on bench, lower bar to chest, press up', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['barbell', 'bench'], 'intermediate', true, 'https://youtube.com/watch?v=rT7DgCr-3pg'),
('Incline Barbell Bench Press', 'Bench press on 30-45 degree incline', 'chest', ARRAY['shoulders', 'triceps'], ARRAY['barbell', 'bench'], 'intermediate', true, null),
('Decline Barbell Bench Press', 'Bench press on decline angle', 'chest', ARRAY['triceps'], ARRAY['barbell', 'bench'], 'intermediate', true, null),
('Dumbbell Bench Press', 'Bench press with dumbbells', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['dumbbells', 'bench'], 'beginner', true, null),
('Incline Dumbbell Press', 'Dumbbell press on incline', 'chest', ARRAY['shoulders', 'triceps'], ARRAY['dumbbells', 'bench'], 'beginner', true, null),
('Dumbbell Flyes', 'Lying flye motion with dumbbells', 'chest', ARRAY[]::text[], ARRAY['dumbbells', 'bench'], 'beginner', true, null),
('Incline Dumbbell Flyes', 'Flyes on incline bench', 'chest', ARRAY[]::text[], ARRAY['dumbbells', 'bench'], 'beginner', true, null),
('Push-Ups', 'Standard push-up position', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['bodyweight'], 'beginner', true, null),
('Wide-Grip Push-Ups', 'Push-ups with hands wider than shoulders', 'chest', ARRAY['triceps'], ARRAY['bodyweight'], 'beginner', true, null),
('Diamond Push-Ups', 'Push-ups with hands forming diamond', 'chest', ARRAY['triceps'], ARRAY['bodyweight'], 'intermediate', true, null),
('Cable Chest Flyes', 'Standing cable flye', 'chest', ARRAY[]::text[], ARRAY['cable'], 'beginner', true, null),
('Cable Crossover', 'High-to-low cable crossover', 'chest', ARRAY[]::text[], ARRAY['cable'], 'intermediate', true, null),
('Chest Dips', 'Dips with forward lean', 'chest', ARRAY['triceps'], ARRAY['bodyweight', 'dip bars'], 'intermediate', true, null),
('Machine Chest Press', 'Seated chest press machine', 'chest', ARRAY['triceps', 'shoulders'], ARRAY['machine'], 'beginner', true, null),
('Pec Deck Machine', 'Machine chest flye', 'chest', ARRAY[]::text[], ARRAY['machine'], 'beginner', true, null);

-- Back Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Barbell Deadlift', 'Hip hinge to lift bar from floor', 'back', ARRAY['hamstrings', 'glutes'], ARRAY['barbell'], 'advanced', true, 'https://youtube.com/watch?v=op9kVnSso6Q'),
('Romanian Deadlift', 'Stiff-leg deadlift variation', 'back', ARRAY['hamstrings', 'glutes'], ARRAY['barbell'], 'intermediate', true, null),
('Sumo Deadlift', 'Wide stance deadlift', 'back', ARRAY['glutes', 'quads'], ARRAY['barbell'], 'advanced', true, null),
('Barbell Row', 'Bent-over barbell row', 'back', ARRAY['biceps'], ARRAY['barbell'], 'intermediate', true, null),
('Pendlay Row', 'Dead-stop barbell row', 'back', ARRAY['biceps'], ARRAY['barbell'], 'advanced', true, null),
('T-Bar Row', 'Landmine or machine T-bar row', 'back', ARRAY['biceps'], ARRAY['barbell', 'landmine'], 'intermediate', true, null),
('Dumbbell Row', 'Single-arm dumbbell row', 'back', ARRAY['biceps'], ARRAY['dumbbells', 'bench'], 'beginner', true, null),
('Pull-Ups', 'Overhand grip pull-up', 'back', ARRAY['biceps'], ARRAY['pull-up bar'], 'intermediate', true, null),
('Chin-Ups', 'Underhand grip pull-up', 'back', ARRAY['biceps'], ARRAY['pull-up bar'], 'intermediate', true, null),
('Lat Pulldown', 'Cable lat pulldown', 'back', ARRAY['biceps'], ARRAY['cable'], 'beginner', true, null),
('Wide-Grip Lat Pulldown', 'Lat pulldown with wide grip', 'back', ARRAY['biceps'], ARRAY['cable'], 'beginner', true, null),
('Seated Cable Row', 'Horizontal cable row', 'back', ARRAY['biceps'], ARRAY['cable'], 'beginner', true, null),
('Face Pulls', 'Cable face pull for rear delts', 'back', ARRAY['shoulders'], ARRAY['cable'], 'beginner', true, null),
('Inverted Row', 'Bodyweight row under bar', 'back', ARRAY['biceps'], ARRAY['bodyweight', 'barbell'], 'beginner', true, null),
('Hyperextensions', 'Back extension on bench', 'back', ARRAY['glutes', 'hamstrings'], ARRAY['bodyweight', 'bench'], 'beginner', true, null);

-- Shoulder Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Barbell Overhead Press', 'Standing military press', 'shoulders', ARRAY['triceps'], ARRAY['barbell'], 'intermediate', true, 'https://youtube.com/watch?v=2yjwXTZQDDI'),
('Seated Barbell Press', 'Seated overhead press', 'shoulders', ARRAY['triceps'], ARRAY['barbell', 'bench'], 'intermediate', true, null),
('Push Press', 'Overhead press with leg drive', 'shoulders', ARRAY['triceps', 'legs'], ARRAY['barbell'], 'advanced', true, null),
('Dumbbell Overhead Press', 'Standing or seated DB press', 'shoulders', ARRAY['triceps'], ARRAY['dumbbells'], 'beginner', true, null),
('Arnold Press', 'Rotating dumbbell press', 'shoulders', ARRAY['triceps'], ARRAY['dumbbells'], 'intermediate', true, null),
('Lateral Raises', 'Side dumbbell raise', 'shoulders', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null),
('Front Raises', 'Front dumbbell raise', 'shoulders', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null),
('Bent-Over Rear Delt Flyes', 'Rear delt fly', 'shoulders', ARRAY['back'], ARRAY['dumbbells'], 'beginner', true, null),
('Cable Lateral Raises', 'Cable side raise', 'shoulders', ARRAY[]::text[], ARRAY['cable'], 'beginner', true, null),
('Upright Row', 'Pull bar to chin', 'shoulders', ARRAY['traps'], ARRAY['barbell'], 'intermediate', true, null),
('Machine Shoulder Press', 'Seated shoulder press machine', 'shoulders', ARRAY['triceps'], ARRAY['machine'], 'beginner', true, null);

-- Leg Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Barbell Back Squat', 'Bar on back, squat to depth', 'quads', ARRAY['glutes', 'hamstrings'], ARRAY['barbell', 'squat rack'], 'intermediate', true, 'https://youtube.com/watch?v=ultWZbUMPL8'),
('Front Squat', 'Bar on front delts', 'quads', ARRAY['glutes'], ARRAY['barbell', 'squat rack'], 'advanced', true, null),
('Goblet Squat', 'Hold dumbbell at chest', 'quads', ARRAY['glutes'], ARRAY['dumbbells'], 'beginner', true, null),
('Bulgarian Split Squat', 'Rear foot elevated split squat', 'quads', ARRAY['glutes'], ARRAY['dumbbells', 'bench'], 'intermediate', true, null),
('Walking Lunges', 'Forward walking lunges', 'quads', ARRAY['glutes'], ARRAY['dumbbells'], 'beginner', true, null),
('Reverse Lunges', 'Step back lunges', 'quads', ARRAY['glutes'], ARRAY['dumbbells'], 'beginner', true, null),
('Leg Press', 'Machine leg press', 'quads', ARRAY['glutes'], ARRAY['machine'], 'beginner', true, null),
('Hack Squat', 'Machine hack squat', 'quads', ARRAY['glutes'], ARRAY['machine'], 'intermediate', true, null),
('Leg Extension', 'Seated leg extension', 'quads', ARRAY[]::text[], ARRAY['machine'], 'beginner', true, null),
('Leg Curl', 'Lying or seated leg curl', 'hamstrings', ARRAY[]::text[], ARRAY['machine'], 'beginner', true, null),
('Romanian Deadlift (Dumbbells)', 'Dumbbell RDL', 'hamstrings', ARRAY['glutes', 'back'], ARRAY['dumbbells'], 'intermediate', true, null),
('Good Mornings', 'Hip hinge with bar on back', 'hamstrings', ARRAY['glutes', 'back'], ARRAY['barbell'], 'intermediate', true, null),
('Hip Thrusts', 'Barbell hip thrust', 'glutes', ARRAY['hamstrings'], ARRAY['barbell', 'bench'], 'beginner', true, null),
('Glute Bridge', 'Bodyweight or weighted bridge', 'glutes', ARRAY['hamstrings'], ARRAY['bodyweight'], 'beginner', true, null),
('Step-Ups', 'Step onto box with weight', 'quads', ARRAY['glutes'], ARRAY['dumbbells', 'box'], 'beginner', true, null),
('Calf Raises', 'Standing calf raise', 'calves', ARRAY[]::text[], ARRAY['machine'], 'beginner', true, null),
('Seated Calf Raises', 'Seated calf raise', 'calves', ARRAY[]::text[], ARRAY['machine'], 'beginner', true, null);

-- Arm Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Barbell Curl', 'Standing barbell bicep curl', 'biceps', ARRAY[]::text[], ARRAY['barbell'], 'beginner', true, null),
('EZ-Bar Curl', 'Curl with EZ curl bar', 'biceps', ARRAY[]::text[], ARRAY['barbell'], 'beginner', true, null),
('Dumbbell Curl', 'Alternating or simultaneous DB curls', 'biceps', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null),
('Hammer Curl', 'Neutral grip dumbbell curl', 'biceps', ARRAY['forearms'], ARRAY['dumbbells'], 'beginner', true, null),
('Concentration Curl', 'Seated single-arm curl', 'biceps', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null),
('Preacher Curl', 'Curl on preacher bench', 'biceps', ARRAY[]::text[], ARRAY['barbell', 'bench'], 'beginner', true, null),
('Cable Curl', 'Standing cable curl', 'biceps', ARRAY[]::text[], ARRAY['cable'], 'beginner', true, null),
('Close-Grip Bench Press', 'Bench press with narrow grip', 'triceps', ARRAY['chest'], ARRAY['barbell', 'bench'], 'intermediate', true, null),
('Dips', 'Parallel bar dips', 'triceps', ARRAY['chest'], ARRAY['dip bars'], 'intermediate', true, null),
('Tricep Pushdown', 'Cable tricep extension', 'triceps', ARRAY[]::text[], ARRAY['cable'], 'beginner', true, null),
('Overhead Tricep Extension', 'Dumbbell overhead extension', 'triceps', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null),
('Skull Crushers', 'Lying tricep extension', 'triceps', ARRAY[]::text[], ARRAY['barbell', 'bench'], 'intermediate', true, null),
('Tricep Kickbacks', 'Bent-over tricep kickback', 'triceps', ARRAY[]::text[], ARRAY['dumbbells'], 'beginner', true, null);

-- Core/Abs Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Plank', 'Front plank hold', 'abs', ARRAY[]::text[], ARRAY['bodyweight'], 'beginner', true, null),
('Side Plank', 'Side plank hold', 'abs', ARRAY['obliques'], ARRAY['bodyweight'], 'beginner', true, null),
('Crunches', 'Standard abdominal crunch', 'abs', ARRAY[]::text[], ARRAY['bodyweight'], 'beginner', true, null),
('Bicycle Crunches', 'Alternating elbow-to-knee crunches', 'abs', ARRAY['obliques'], ARRAY['bodyweight'], 'beginner', true, null),
('Russian Twists', 'Seated torso rotation', 'abs', ARRAY['obliques'], ARRAY['bodyweight'], 'beginner', true, null),
('Hanging Leg Raises', 'Hang from bar, raise legs', 'abs', ARRAY[]::text[], ARRAY['pull-up bar'], 'advanced', true, null),
('Cable Crunches', 'Kneeling cable crunch', 'abs', ARRAY[]::text[], ARRAY['cable'], 'beginner', true, null),
('Ab Wheel Rollouts', 'Roll ab wheel forward', 'abs', ARRAY[]::text[], ARRAY['ab wheel'], 'intermediate', true, null),
('Mountain Climbers', 'Plank position knee drives', 'abs', ARRAY['cardio'], ARRAY['bodyweight'], 'beginner', true, null),
('Dead Bug', 'Lying alternating arm/leg extension', 'abs', ARRAY[]::text[], ARRAY['bodyweight'], 'beginner', true, null);

-- Cardio Exercises
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Running', 'Outdoor or treadmill running', 'cardio', ARRAY[]::text[], ARRAY['treadmill'], 'beginner', true, null),
('Cycling', 'Stationary or outdoor cycling', 'cardio', ARRAY['quads'], ARRAY['bike'], 'beginner', true, null),
('Rowing', 'Rowing machine', 'cardio', ARRAY['back'], ARRAY['rowing machine'], 'beginner', true, null),
('Jump Rope', 'Skipping rope', 'cardio', ARRAY['calves'], ARRAY['jump rope'], 'beginner', true, null),
('Burpees', 'Full body burpee', 'cardio', ARRAY['full body'], ARRAY['bodyweight'], 'intermediate', true, null),
('Box Jumps', 'Jump onto box', 'cardio', ARRAY['quads'], ARRAY['box'], 'intermediate', true, null),
('Battle Ropes', 'Alternating wave battle ropes', 'cardio', ARRAY['shoulders'], ARRAY['battle ropes'], 'beginner', true, null),
('Stair Climbing', 'Stair climber machine', 'cardio', ARRAY['quads', 'glutes'], ARRAY['machine'], 'beginner', true, null);

-- Olympic Lifts (Advanced)
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Power Clean', 'Clean bar to shoulders', 'full body', ARRAY['legs', 'back'], ARRAY['barbell'], 'advanced', true, null),
('Hang Clean', 'Clean from hang position', 'full body', ARRAY['legs', 'back'], ARRAY['barbell'], 'advanced', true, null),
('Snatch', 'Barbell snatch', 'full body', ARRAY['shoulders', 'legs'], ARRAY['barbell'], 'advanced', true, null),
('Clean and Jerk', 'Full clean and jerk', 'full body', ARRAY['legs', 'shoulders'], ARRAY['barbell'], 'advanced', true, null);

-- Compound/Full Body
INSERT INTO exercises (name, description, primary_muscle_group, secondary_muscle_groups, equipment_needed, difficulty_level, is_system, video_url) VALUES
('Thrusters', 'Front squat to press', 'full body', ARRAY['quads', 'shoulders'], ARRAY['barbell'], 'intermediate', true, null),
('Turkish Get-Up', 'Get up from lying with weight overhead', 'full body', ARRAY['shoulders', 'abs'], ARRAY['kettlebell'], 'advanced', true, null),
('Kettlebell Swings', 'Hip hinge kettlebell swing', 'full body', ARRAY['glutes', 'hamstrings'], ARRAY['kettlebell'], 'intermediate', true, null),
('Farmer''s Walk', 'Walk with heavy weights', 'full body', ARRAY['forearms', 'traps'], ARRAY['dumbbells'], 'beginner', true, null),
('Sled Push', 'Push weighted sled', 'full body', ARRAY['quads', 'calves'], ARRAY['sled'], 'intermediate', true, null),
('Sled Pull', 'Pull weighted sled', 'full body', ARRAY['back', 'hamstrings'], ARRAY['sled'], 'intermediate', true, null);

-- Update statistics
SELECT COUNT(*) AS total_exercises FROM exercises WHERE is_system = true;
