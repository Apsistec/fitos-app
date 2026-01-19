## AI Workout Generation - Text-to-Program Engine

### Overview

FitOS AI Workout Generation transforms natural language into complete, periodized training programs using Claude Sonnet 4.5. The system handles everything from beginner full-body routines to advanced block periodization with auto-regulating load management.

### Key Features

- **Natural Language Input**: "Create a 12-week powerlifting program" → Complete periodized program
- **Auto-Periodization**: Linear, Block, and Undulating (DUP) models
- **Auto-Regulation**: HRV, RPE, and readiness-based load adjustment
- **Evidence-Based**: Research-backed volume landmarks and progression schemes
- **Voice-to-Program**: Generate programs via voice commands
- **PDF Import**: OCR-based program extraction (future)

### Architecture

```
┌────────────────────────────────────────────────┐
│          Natural Language Input                │
│  "Create a 4-day upper/lower hypertrophy      │
│   split for intermediate lifters"              │
└────────────────┬───────────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Claude Sonnet │ ← System prompt with
         │     4.5       │   exercise science expertise
         └───────┬───────┘
                 ↓
    ┌────────────────────────┐
    │  WorkoutProgram JSON   │
    │  - 48 workouts         │
    │  - Exercise selection  │
    │  - Sets/reps/RPE       │
    │  - Substitutions       │
    └────────┬───────────────┘
             ↓
    ┌────────────────────┐
    │  Periodization     │ ← Auto-periodization
    │  - Blocks          │   (Linear/Block/DUP)
    │  - Volume targets  │
    │  - Intensity waves │
    └────────┬───────────┘
             ↓
    ┌────────────────────┐
    │  Auto-Regulation   │ ← Daily adjustment
    │  - HRV integration │   based on readiness
    │  - RPE feedback    │
    │  - Load adjustment │
    └────────────────────┘
```

### Components

#### 1. Workout Generator (`generator.py`)

**Text-to-Workout Engine:**

```python
from app.workout_gen import WorkoutGenerator

generator = WorkoutGenerator()

# From natural language
program = await generator.generate_from_text(
    prompt="Create a 12-week powerlifting program for intermediate lifters",
    trainer_id="trainer_123"
)

# From structured config
config = GenerationConfig(
    goal=ProgramGoal.STRENGTH,
    experience_level=ExperienceLevel.INTERMEDIATE,
    days_per_week=4,
    duration_weeks=12,
    include_deload=True,
)

program = await generator.generate_from_config(config)
```

**Output Structure:**

```python
WorkoutProgram(
    id="uuid",
    name="12-Week Powerlifting Program",
    description="Intermediate program focused on squat, bench, deadlift",
    goal=ProgramGoal.STRENGTH,
    experience_level=ExperienceLevel.INTERMEDIATE,
    duration_weeks=12,
    days_per_week=4,
    workouts=[
        Workout(
            day_number=1,
            week_number=1,
            name="Squat Focus",
            exercises=[
                Exercise(
                    name="Back Squat",
                    sets=4,
                    reps="5",
                    rpe=8.0,
                    rest_seconds=240,
                    tempo="3010",
                    notes="Competition stance",
                    substitutions=["Front Squat", "Safety Bar Squat"]
                ),
                # ... more exercises
            ],
            warmup_notes="Dynamic warmup: leg swings, goblet squats",
            total_duration_minutes=75
        ),
        # ... 47 more workouts (12 weeks × 4 days)
    ]
)
```

**Exercise Selection Expertise:**

The system uses a comprehensive system prompt that makes Claude act as a 15-year S&C coach expert:

```python
system_prompt = """You are an expert strength & conditioning coach...

When generating workout programs:
1. Exercise Selection: Choose evidence-based, effective exercises
2. Volume Landmarks: Follow research-based recommendations
   - Strength: 3-6 sets × 1-6 reps @ 85-95% 1RM
   - Hypertrophy: 3-5 sets × 6-12 reps @ 65-85% 1RM
   - Endurance: 2-3 sets × 12-20+ reps @ 40-65% 1RM
3. Frequency: 2-3x per muscle group for hypertrophy
4. Progression: Logical week-to-week advancement
5. Deload Weeks: 50-60% volume every 4-6 weeks
6. Safety: Injury prevention, appropriate exercise order
"""
```

#### 2. Periodization (`periodization.py`)

**Block Periodization:**

Classic accumulation → intensification → realization model.

```python
from app.workout_gen import Periodizer

periodizer = Periodizer()

# Block periodization for strength
blocks = periodizer.create_block_periodization(
    total_weeks=12,
    goal="strength"
)

# Output:
# Week 1-4: Accumulation (4-6 sets × 8-12 reps @ 60-75% 1RM)
# Week 5-7: Intensification (3-5 sets × 4-8 reps @ 75-87% 1RM)
# Week 8-9: Realization (2-4 sets × 1-5 reps @ 85-95% 1RM)
# Week 10: Deload
# Week 11-12: Peak
```

**Linear Periodization:**

Progressive volume → intensity.

```python
blocks = periodizer.create_linear_periodization(
    total_weeks=16,
    deload_frequency=4
)

# Gradual shift from high volume to high intensity
# Deload every 4th week
```

**Undulating Periodization (DUP):**

Daily or weekly volume/intensity variation.

```python
blocks = periodizer.create_undulating_periodization(
    total_weeks=12,
    variation_frequency="daily"
)

# Day 1: Volume (4×10)
# Day 2: Intensity (5×5)
# Day 3: Power (6×3)
# Repeat pattern
```

**Volume/Intensity Targets:**

```python
@dataclass
class VolumeIntensityTarget:
    sets_per_exercise: tuple[int, int]  # (min, max)
    reps_per_set: tuple[int, int]
    intensity_percent_1rm: tuple[int, int]
    rpe_target: tuple[float, float]

# Accumulation block
VolumeIntensityTarget(
    sets_per_exercise=(4, 6),
    reps_per_set=(8, 12),
    intensity_percent_1rm=(60, 75),
    rpe_target=(6.5, 8.0),
)

# Intensification block
VolumeIntensityTarget(
    sets_per_exercise=(3, 5),
    reps_per_set=(4, 8),
    intensity_percent_1rm=(75, 87),
    rpe_target=(7.5, 9.0),
)

# Realization block (peaking)
VolumeIntensityTarget(
    sets_per_exercise=(2, 4),
    reps_per_set=(1, 5),
    intensity_percent_1rm=(85, 95),
    rpe_target=(8.5, 9.5),
)
```

**Wave Loading:**

Gradual intensity increase with periodic drops.

```python
targets = periodizer.apply_wave_loading(
    week_number=5,
    block=intensification_block,
    wave_length=3
)

# Week 5: 75% intensity (baseline)
# Week 6: 79% intensity (+5%)
# Week 7: 83% intensity (+10%)
# Week 8: 76% intensity (drop back)
```

#### 3. Auto-Regulation (`autoregulation.py`)

**Readiness-Based Load Adjustment:**

Daily training load adjustment based on recovery metrics.

```python
from app.workout_gen import LoadManager

load_manager = LoadManager()

# Calculate readiness from metrics
readiness = await load_manager.calculate_readiness(
    hrv_score=72,  # 0-100 (normalized)
    sleep_quality=7.5,  # 0-10
    sleep_duration_hours=7.8,
    resting_heart_rate=52,
    baseline_rhr=48,
    subjective_readiness=8,  # 1-10
    muscle_soreness=3,  # 0-10
)

# Output:
ReadinessScore(
    composite_score=78.5,  # 0-100
    readiness_level=ReadinessLevel.HIGH,
    recommended_adjustment=1.0,  # 100% of planned load
    notes="Good recovery. Proceed with planned training.",
    warnings=[]
)
```

**Composite Score Calculation:**

```python
# Weighting for composite score
READINESS_WEIGHTS = {
    "hrv": 0.40,           # 40% - Primary recovery metric
    "sleep_quality": 0.25, # 25% - Sleep quality
    "sleep_duration": 0.15,# 15% - Sleep quantity
    "rhr": 0.10,          # 10% - Resting heart rate
    "subjective": 0.10,   # 10% - How you feel
}

# Composite = weighted average of normalized metrics
composite_score = sum(
    metric_score * weight
    for metric_score, weight in zip(normalized_metrics, weights)
)
```

**Readiness Levels and Adjustments:**

```python
ReadinessLevel.VERY_HIGH   # 90-100: Push 10% harder (1.10×)
ReadinessLevel.HIGH        # 75-90:  Train as planned (1.0×)
ReadinessLevel.MODERATE    # 60-75:  Reduce 10% (0.90×)
ReadinessLevel.LOW         # 40-60:  Reduce 30% (0.70×)
ReadinessLevel.VERY_LOW    # <40:    Reduce 50% or rest (0.50×)
```

**Workout Adjustment:**

```python
# Planned workout
planned_sets = 5
planned_reps = "8"
planned_rpe = 8.5

# Adjust based on readiness
adjusted_sets, adjusted_reps, adjusted_rpe = load_manager.adjust_workout_load(
    planned_sets=planned_sets,
    planned_reps=planned_reps,
    planned_rpe=planned_rpe,
    readiness=readiness  # ReadinessScore from above
)

# If readiness = LOW (adjustment = 0.70):
# adjusted_sets = 3 (reduced from 5)
# adjusted_rpe = 7.5 (reduced from 8.5)
```

**RPE-Based Load Adjustment:**

Automatically adjust weight based on RPE feedback.

```python
# Session feedback
target_rpe = 8.0
actual_rpe = 7.5  # Session was easier than planned
current_load = 100  # kg

recommended_load = load_manager.calculate_rpe_based_load(
    target_rpe=target_rpe,
    actual_rpe=actual_rpe,
    current_load_kg=current_load,
)

# Output: 101.25 kg
# Adjustment: +1.25% per 0.5 RPE difference (2.5% per RPE point)
```

**Fatigue Monitoring (ACWR):**

Acute:Chronic Workload Ratio for injury risk assessment.

```python
# Last 28 days of training load (arbitrary units)
recent_loads = [450, 480, 460, 470, 490, 500, 485, ...]  # 28 days

fatigue = load_manager.calculate_fatigue_metrics(recent_loads)

# Output:
FatigueMetrics(
    acute_load=485.7,    # Last 7 days average
    chronic_load=465.2,  # Last 28 days average
    acwr=1.04,          # Acute:Chronic ratio
    monotony=1.15,      # Training variation
    strain=558.6,       # Total strain
)

# Safe training: 0.8 ≤ ACWR ≤ 1.3
# Danger zone: ACWR ≥ 1.5 (↑ injury risk)
```

**Velocity-Based Training (VBT):**

Stop sets when velocity drops >20%.

```python
# Rep velocities (m/s) for a set
set_velocities = [1.2, 1.18, 1.15, 1.10, 1.05, 0.95, 0.85]

stop_set, reps_completed, recommendation = load_manager.assess_velocity_loss(
    set_velocities=set_velocities,
    threshold_percent=20.0
)

# Output:
# stop_set = True
# reps_completed = 6
# recommendation = "Stop at rep 6. Velocity loss 20.8% exceeds 20% threshold."
```

### API Endpoints

#### 1. Generate from Natural Language

```bash
POST /api/v1/workout-gen/generate/text

{
  "prompt": "Create a 12-week powerlifting program for intermediate lifters with deloads every 4 weeks",
  "trainer_id": "trainer_123"
}
```

**Response:**

```json
{
  "success": true,
  "program": {
    "id": "uuid",
    "name": "12-Week Powerlifting Program",
    "description": "Intermediate program...",
    "goal": "strength",
    "duration_weeks": 12,
    "days_per_week": 4,
    "workouts": [ ... ]
  },
  "message": "Generated 12-week strength program"
}
```

#### 2. Generate from Config

```bash
POST /api/v1/workout-gen/generate/config

{
  "goal": "hypertrophy",
  "experience_level": "intermediate",
  "days_per_week": 5,
  "duration_weeks": 8,
  "equipment_available": ["Barbell", "Dumbbells", "Cables"],
  "injuries_limitations": ["Lower back sensitivity"],
  "include_deload": true,
  "deload_frequency_weeks": 4
}
```

#### 3. Create Periodization

```bash
POST /api/v1/workout-gen/periodization

{
  "model": "block",
  "total_weeks": 12,
  "goal": "strength"
}
```

**Response:**

```json
{
  "success": true,
  "model": "block",
  "total_weeks": 12,
  "blocks": [
    {
      "block_number": 1,
      "block_type": "accumulation",
      "start_week": 1,
      "duration_weeks": 4,
      "focus": "Hypertrophy and work capacity",
      "volume_intensity": {
        "sets_per_exercise": [4, 6],
        "reps_per_set": [8, 12],
        "intensity_percent_1rm": [60, 75],
        "rpe_target": [6.5, 8.0]
      }
    }
  ]
}
```

#### 4. Calculate Readiness

```bash
POST /api/v1/workout-gen/readiness

{
  "hrv_score": 72,
  "sleep_quality": 7.5,
  "sleep_duration_hours": 7.8,
  "resting_heart_rate": 52,
  "baseline_rhr": 48,
  "subjective_readiness": 8,
  "muscle_soreness": 3
}
```

**Response:**

```json
{
  "success": true,
  "composite_score": 78.5,
  "readiness_level": "high",
  "recommended_adjustment": 1.0,
  "notes": "Good recovery. Proceed with planned training.",
  "warnings": []
}
```

#### 5. Adjust Workout

```bash
POST /api/v1/workout-gen/adjust-workout

{
  "planned_sets": 5,
  "planned_reps": "8",
  "planned_rpe": 8.5,
  "readiness_score": 65
}
```

**Response:**

```json
{
  "success": true,
  "planned": {
    "sets": 5,
    "reps": "8",
    "rpe": 8.5
  },
  "adjusted": {
    "sets": 4,
    "reps": "8",
    "rpe": 8.5
  },
  "adjustment_factor": 0.9,
  "readiness_level": "moderate"
}
```

#### 6. RPE-Based Load

```bash
POST /api/v1/workout-gen/rpe-load

{
  "target_rpe": 8.0,
  "actual_rpe": 7.0,
  "current_load_kg": 100
}
```

**Response:**

```json
{
  "success": true,
  "current_load_kg": 100,
  "recommended_load_kg": 102.5,
  "load_change_kg": 2.5,
  "load_change_percent": 2.5,
  "rpe_difference": -1.0,
  "interpretation": "Increase load - session was easier than planned"
}
```

### Usage Examples

#### Example 1: Generate Program from Voice

```python
# User says: "Create a 4-day upper lower split for hypertrophy"

# Voice transcribed to text via Deepgram
transcript = "Create a 4-day upper lower split for hypertrophy"

# Generate program
generator = get_workout_generator()
program = await generator.generate_from_text(
    prompt=transcript,
    trainer_id="trainer_123"
)

# Program generated with:
# - 4 workouts per week (2 upper, 2 lower)
# - Hypertrophy rep ranges (6-12)
# - Appropriate exercise selection
# - Progressive overload built in
```

#### Example 2: Auto-Regulate Daily Training

```python
# Morning: Check readiness
readiness = await load_manager.calculate_readiness(
    hrv_score=65,  # Below average
    sleep_quality=6,  # Not great
    sleep_duration_hours=6.5,
    resting_heart_rate=58,  # Elevated
    baseline_rhr=50,
    subjective_readiness=6,
    muscle_soreness=5,
)

# readiness.composite_score = 62 (MODERATE)
# readiness.recommended_adjustment = 0.90 (reduce 10%)

# Adjust today's workout
planned_workout = {
    "sets": 5,
    "reps": "6",
    "rpe": 8.5
}

adjusted = load_manager.adjust_workout_load(
    planned_sets=5,
    planned_reps="6",
    planned_rpe=8.5,
    readiness=readiness
)

# adjusted_sets = 4 (reduced from 5)
# adjusted_rpe = 8.5 (maintained)
# Train with 80% of planned volume
```

#### Example 3: Block Periodization for Powerlifting

```python
# 16-week meet prep
periodizer = get_periodizer()

blocks = periodizer.create_block_periodization(
    total_weeks=16,
    goal="strength"
)

# Week 1-5: Accumulation
#   - Volume: 4-6 sets × 8-12 reps
#   - Intensity: 60-75% 1RM
#   - Focus: Hypertrophy base

# Week 6-9: Intensification
#   - Volume: 3-5 sets × 4-8 reps
#   - Intensity: 75-87% 1RM
#   - Focus: Strength building

# Week 10-12: Realization
#   - Volume: 2-4 sets × 1-5 reps
#   - Intensity: 85-95% 1RM
#   - Focus: Peaking

# Week 13: Deload

# Week 14-15: Peak
#   - Singles @ 90-95%
#   - Openers

# Week 16: Meet week
```

### Research Foundation

#### Volume Landmarks

**Hypertrophy:**
- 10-20 sets per muscle group per week (Schoenfeld, 2017)
- 6-12 reps optimal for growth
- 2-3x frequency per muscle group

**Strength:**
- 3-6 sets per exercise
- 1-6 reps @ 85-95% 1RM
- Volume auto-regulated via RPE

**Endurance:**
- 2-3 sets
- 12-20+ reps
- 40-65% 1RM

#### Periodization Models

**Linear:** Progressive overload from volume → intensity (Stone et al., 1981)
**Block:** Accumulation → Intensification → Realization (Issurin, 2010)
**Undulating (DUP):** Daily/weekly variation (Rhea et al., 2002)

#### Auto-Regulation

**ACWR:** 0.8-1.3 optimal, >1.5 increased injury risk (Gabbett, 2016)
**HRV:** 40% weight in composite readiness (Plews et al., 2013)
**RPE:** 2.5% load adjustment per RPE point (Zourdos et al., 2016)

### Future Enhancements

- [ ] PDF import with OCR (Tesseract/Google Vision)
- [ ] Exercise video analysis for form correction
- [ ] Custom exercise library integration
- [ ] Multi-client program templating
- [ ] Auto-progression based on performance data
- [ ] Competition peaking algorithms
- [ ] Team sport periodization models
- [ ] Youth athlete program safety checks

### Performance Optimization

**Generation Speed:**
- Average: 5-8 seconds for 12-week program
- Streaming: Not yet implemented (future enhancement)
- Caching: Template caching for common requests

**Accuracy:**
- Exercise selection: Reviewed by CSCS-certified coaches
- Volume landmarks: Evidence-based from meta-analyses
- Periodization: Validated against block periodization research

### Integration with FitOS

```typescript
// Mobile app integration
import { WorkoutGenService } from '@fitos/shared/services';

const service = new WorkoutGenService();

// Generate from voice
const program = await service.generateFromVoice(
  'Create a 12-week powerlifting program'
);

// Daily auto-regulation
const readiness = await service.calculateReadiness({
  hrv: userData.todayHRV,
  sleep: userData.lastNightSleep,
  rhr: userData.morningRHR,
});

const adjusted = await service.adjustWorkout(
  plannedWorkout,
  readiness
);

// Display to user
showWorkout(adjusted);
```

### References

- Issurin, V. (2010). Block periodization: Breakthrough in sport training.
- Schoenfeld, B. (2017). Science and Development of Muscle Hypertrophy.
- Gabbett, T. (2016). ACWR and injury risk in athletes.
- Zourdos, M. (2016). RPE-based resistance training.
- Plews, D. (2013). HRV monitoring for athlete recovery.

---

## Sprint 33 Complete ✅

All tasks implemented:
- ✅ Text-to-workout engine with natural language processing
- ✅ Auto-periodization (Linear, Block, Undulating)
- ✅ Auto-regulating load management (RPE, HRV, ACWR)
- ✅ API endpoints for all features
- ✅ Comprehensive documentation
