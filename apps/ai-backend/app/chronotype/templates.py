"""
Chronotype-Specific Workout Templates

Pre-built workout templates optimized for different chronotypes.

Research:
- Knaier et al. (2021): Time-of-day effects on strength performance
- Vitale & Weydahl (2017): Chronotype and athletic performance
- Facer-Childs et al. (2018): 8.4% performance variance by timing

Sprint 35: Chronotype Optimization
"""

from dataclasses import dataclass, field
from datetime import time
from typing import Optional
from enum import Enum

from app.chronotype.assessment import ChronotypeCategory


class TemplateType(str, Enum):
    """Workout template types"""

    STRENGTH = "strength"  # Heavy compound movements
    HYPERTROPHY = "hypertrophy"  # Muscle building focus
    POWER = "power"  # Explosive movements
    ENDURANCE = "endurance"  # Cardio/conditioning
    FULL_BODY = "full_body"  # Complete body workout
    UPPER_LOWER = "upper_lower"  # Upper/lower split
    PUSH_PULL_LEGS = "push_pull_legs"  # PPL split


@dataclass
class ExerciseTemplate:
    """Single exercise template"""

    name: str
    sets: str  # "3-5" or "4"
    reps: str  # "6-8" or "10"
    rpe: str  # "7-8" or "8"
    rest_seconds: int
    notes: str = ""
    tempo: Optional[str] = None  # "3010" format


@dataclass
class ChronotypeTemplate:
    """Complete workout template optimized for chronotype"""

    name: str
    chronotype: ChronotypeCategory
    template_type: TemplateType
    description: str

    # Timing
    optimal_time_start: time
    optimal_time_end: time
    duration_minutes: int

    # Workout structure
    warmup_minutes: int
    cooldown_minutes: int
    exercises: list[ExerciseTemplate]

    # Chronotype-specific adjustments
    adjustments: list[str] = field(default_factory=list)
    considerations: list[str] = field(default_factory=list)


class TemplateGenerator:
    """
    Generate chronotype-optimized workout templates.

    Creates pre-built workout templates with timing and intensity
    adjustments based on chronotype research.
    """

    def __init__(self):
        pass

    def get_template(
        self,
        chronotype: ChronotypeCategory,
        template_type: TemplateType,
    ) -> ChronotypeTemplate:
        """
        Get workout template for chronotype.

        Args:
            chronotype: User's chronotype category
            template_type: Type of workout template

        Returns:
            ChronotypeTemplate optimized for chronotype
        """
        if template_type == TemplateType.STRENGTH:
            return self._create_strength_template(chronotype)
        elif template_type == TemplateType.HYPERTROPHY:
            return self._create_hypertrophy_template(chronotype)
        elif template_type == TemplateType.POWER:
            return self._create_power_template(chronotype)
        elif template_type == TemplateType.ENDURANCE:
            return self._create_endurance_template(chronotype)
        elif template_type == TemplateType.FULL_BODY:
            return self._create_full_body_template(chronotype)
        elif template_type == TemplateType.UPPER_LOWER:
            return self._create_upper_lower_template(chronotype)
        else:  # PUSH_PULL_LEGS
            return self._create_ppl_template(chronotype)

    def _create_strength_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create strength-focused template"""

        # Timing based on chronotype
        timing = self._get_optimal_timing(chronotype, "strength")

        # Exercise structure
        exercises = [
            ExerciseTemplate(
                name="Barbell Back Squat",
                sets="5",
                reps="3-5",
                rpe="8-9",
                rest_seconds=180,
                tempo="3010",
                notes="Main compound movement",
            ),
            ExerciseTemplate(
                name="Bench Press",
                sets="4",
                reps="4-6",
                rpe="8-9",
                rest_seconds=180,
                tempo="3010",
                notes="Upper body primary",
            ),
            ExerciseTemplate(
                name="Deadlift",
                sets="3",
                reps="3-5",
                rpe="8-9",
                rest_seconds=240,
                tempo="3010",
                notes="Posterior chain",
            ),
            ExerciseTemplate(
                name="Overhead Press",
                sets="3",
                reps="5-7",
                rpe="7-8",
                rest_seconds=120,
                notes="Shoulder strength",
            ),
            ExerciseTemplate(
                name="Pull-ups",
                sets="3",
                reps="6-8",
                rpe="7-8",
                rest_seconds=90,
                notes="Back development",
            ),
        ]

        # Chronotype-specific adjustments
        adjustments = self._get_strength_adjustments(chronotype)
        considerations = self._get_strength_considerations(chronotype)

        return ChronotypeTemplate(
            name="Strength Focus",
            chronotype=chronotype,
            template_type=TemplateType.STRENGTH,
            description="Heavy compound movements optimized for max strength gains. "
            "Timing aligned with peak CNS activation for your chronotype.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=75,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=adjustments,
            considerations=considerations,
        )

    def _create_hypertrophy_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create hypertrophy-focused template"""

        timing = self._get_optimal_timing(chronotype, "hypertrophy")

        exercises = [
            ExerciseTemplate(
                name="Barbell Squat",
                sets="4",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
                tempo="3110",
            ),
            ExerciseTemplate(
                name="Romanian Deadlift",
                sets="3",
                reps="10-12",
                rpe="7-8",
                rest_seconds=75,
                tempo="3110",
            ),
            ExerciseTemplate(
                name="Bench Press",
                sets="4",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
                tempo="3010",
            ),
            ExerciseTemplate(
                name="Bent-Over Row",
                sets="4",
                reps="10-12",
                rpe="7-8",
                rest_seconds=75,
            ),
            ExerciseTemplate(
                name="Dumbbell Shoulder Press",
                sets="3",
                reps="10-12",
                rpe="7-8",
                rest_seconds=60,
            ),
            ExerciseTemplate(
                name="Leg Curl",
                sets="3",
                reps="12-15",
                rpe="7-8",
                rest_seconds=60,
            ),
            ExerciseTemplate(
                name="Cable Flyes",
                sets="3",
                reps="12-15",
                rpe="7",
                rest_seconds=45,
            ),
        ]

        return ChronotypeTemplate(
            name="Hypertrophy Builder",
            chronotype=chronotype,
            template_type=TemplateType.HYPERTROPHY,
            description="Volume-focused training for muscle growth. "
            "Flexible timing - consistency matters more than precise scheduling.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=65,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=[
                "Can train outside peak window with minimal performance loss",
                "Focus on consistent training times for habit formation",
            ],
            considerations=[
                "Volume and frequency > timing for hypertrophy",
                "Ensure adequate recovery between sessions",
            ],
        )

    def _create_power_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create power-focused template"""

        timing = self._get_optimal_timing(chronotype, "power")

        exercises = [
            ExerciseTemplate(
                name="Power Clean",
                sets="5",
                reps="3",
                rpe="8",
                rest_seconds=180,
                notes="Explosive triple extension",
            ),
            ExerciseTemplate(
                name="Box Jump",
                sets="4",
                reps="5",
                rpe="7-8",
                rest_seconds=120,
                notes="Plyometric power",
            ),
            ExerciseTemplate(
                name="Medicine Ball Slam",
                sets="4",
                reps="6",
                rpe="8",
                rest_seconds=90,
                notes="Full body power",
            ),
            ExerciseTemplate(
                name="Broad Jump",
                sets="4",
                reps="4",
                rpe="7-8",
                rest_seconds=120,
                notes="Horizontal power",
            ),
            ExerciseTemplate(
                name="Kettlebell Swing",
                sets="3",
                reps="10",
                rpe="7",
                rest_seconds=90,
                notes="Hip power development",
            ),
        ]

        return ChronotypeTemplate(
            name="Power & Explosiveness",
            chronotype=chronotype,
            template_type=TemplateType.POWER,
            description="Explosive movements requiring full CNS activation. "
            "MUST be performed during peak performance window.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=50,
            warmup_minutes=timing["warmup"] + 5,  # Extra warmup for power
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=self._get_power_adjustments(chronotype),
            considerations=[
                "Requires full CNS activation - timing critical",
                "AVOID within 2 hours of waking",
                "Quality > quantity - stop at technique breakdown",
            ],
        )

    def _create_endurance_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create endurance-focused template"""

        # Endurance best in afternoon for all types
        timing = {
            "start": time(14, 0),
            "end": time(18, 0),
            "warmup": 10,
        }

        exercises = [
            ExerciseTemplate(
                name="Running Intervals",
                sets="6",
                reps="3 min @ 80% max HR",
                rpe="7-8",
                rest_seconds=90,
                notes="Cardio intervals",
            ),
            ExerciseTemplate(
                name="Assault Bike",
                sets="5",
                reps="2 min",
                rpe="8",
                rest_seconds=60,
                notes="Full body conditioning",
            ),
            ExerciseTemplate(
                name="Rowing Machine",
                sets="4",
                reps="500m",
                rpe="7-8",
                rest_seconds=90,
                notes="Power endurance",
            ),
            ExerciseTemplate(
                name="Jump Rope",
                sets="4",
                reps="2 min",
                rpe="7",
                rest_seconds=60,
                notes="Footwork conditioning",
            ),
        ]

        return ChronotypeTemplate(
            name="Conditioning & Endurance",
            chronotype=chronotype,
            template_type=TemplateType.ENDURANCE,
            description="Cardiovascular conditioning optimized for afternoon "
            "when core temperature peaks.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=60,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=15,
            exercises=exercises,
            adjustments=[
                "Afternoon training optimal for all chronotypes",
                "Morning endurance work acceptable for morning types",
            ],
            considerations=[
                "Hydration critical for afternoon sessions",
                "Core temperature elevated = better performance",
            ],
        )

    def _create_full_body_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create full body template"""

        timing = self._get_optimal_timing(chronotype, "strength")

        exercises = [
            ExerciseTemplate(
                name="Barbell Squat",
                sets="4",
                reps="6-8",
                rpe="7-8",
                rest_seconds=120,
            ),
            ExerciseTemplate(
                name="Bench Press",
                sets="4",
                reps="6-8",
                rpe="7-8",
                rest_seconds=120,
            ),
            ExerciseTemplate(
                name="Barbell Row",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Overhead Press",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Romanian Deadlift",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Pull-ups",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
        ]

        return ChronotypeTemplate(
            name="Full Body Strength",
            chronotype=chronotype,
            template_type=TemplateType.FULL_BODY,
            description="Complete full body workout hitting all major muscle groups.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=70,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=self._get_strength_adjustments(chronotype),
            considerations=["Suitable for 3x/week training frequency"],
        )

    def _create_upper_lower_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create upper body template (for upper/lower split)"""

        timing = self._get_optimal_timing(chronotype, "strength")

        exercises = [
            ExerciseTemplate(
                name="Bench Press",
                sets="4",
                reps="6-8",
                rpe="8",
                rest_seconds=120,
            ),
            ExerciseTemplate(
                name="Barbell Row",
                sets="4",
                reps="6-8",
                rpe="8",
                rest_seconds=120,
            ),
            ExerciseTemplate(
                name="Overhead Press",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Pull-ups",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Dumbbell Incline Press",
                sets="3",
                reps="10-12",
                rpe="7",
                rest_seconds=75,
            ),
            ExerciseTemplate(
                name="Face Pulls",
                sets="3",
                reps="15-20",
                rpe="6-7",
                rest_seconds=60,
            ),
        ]

        return ChronotypeTemplate(
            name="Upper Body Day",
            chronotype=chronotype,
            template_type=TemplateType.UPPER_LOWER,
            description="Upper body focus for upper/lower split programming.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=65,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=self._get_strength_adjustments(chronotype),
            considerations=["Pair with lower body day for 4x/week split"],
        )

    def _create_ppl_template(
        self,
        chronotype: ChronotypeCategory,
    ) -> ChronotypeTemplate:
        """Create push day template (for PPL split)"""

        timing = self._get_optimal_timing(chronotype, "hypertrophy")

        exercises = [
            ExerciseTemplate(
                name="Bench Press",
                sets="4",
                reps="6-8",
                rpe="8",
                rest_seconds=120,
            ),
            ExerciseTemplate(
                name="Overhead Press",
                sets="3",
                reps="8-10",
                rpe="7-8",
                rest_seconds=90,
            ),
            ExerciseTemplate(
                name="Incline Dumbbell Press",
                sets="3",
                reps="10-12",
                rpe="7-8",
                rest_seconds=75,
            ),
            ExerciseTemplate(
                name="Dumbbell Lateral Raise",
                sets="3",
                reps="12-15",
                rpe="7",
                rest_seconds=60,
            ),
            ExerciseTemplate(
                name="Tricep Dips",
                sets="3",
                reps="10-12",
                rpe="7-8",
                rest_seconds=60,
            ),
            ExerciseTemplate(
                name="Cable Flyes",
                sets="3",
                reps="12-15",
                rpe="7",
                rest_seconds=45,
            ),
        ]

        return ChronotypeTemplate(
            name="Push Day (PPL)",
            chronotype=chronotype,
            template_type=TemplateType.PUSH_PULL_LEGS,
            description="Push muscles (chest, shoulders, triceps) for PPL split.",
            optimal_time_start=timing["start"],
            optimal_time_end=timing["end"],
            duration_minutes=60,
            warmup_minutes=timing["warmup"],
            cooldown_minutes=10,
            exercises=exercises,
            adjustments=[
                "Flexible timing - focus on consistency",
                "Can adjust volume based on recovery",
            ],
            considerations=["Part of 6x/week PPL split routine"],
        )

    def _get_optimal_timing(
        self,
        chronotype: ChronotypeCategory,
        workout_focus: str,
    ) -> dict:
        """Get optimal timing for chronotype and workout type"""

        # Base timing by chronotype
        timing_map = {
            ChronotypeCategory.EXTREME_MORNING: {
                "start": time(6, 0),
                "end": time(10, 0),
                "warmup": 10,
            },
            ChronotypeCategory.MODERATE_MORNING: {
                "start": time(7, 0),
                "end": time(11, 0),
                "warmup": 10,
            },
            ChronotypeCategory.INTERMEDIATE: {
                "start": time(9, 0),
                "end": time(13, 0),
                "warmup": 10,
            },
            ChronotypeCategory.MODERATE_EVENING: {
                "start": time(16, 0),
                "end": time(20, 0),
                "warmup": 12,
            },
            ChronotypeCategory.EXTREME_EVENING: {
                "start": time(18, 0),
                "end": time(22, 0),
                "warmup": 15,
            },
        }

        base_timing = timing_map.get(
            chronotype,
            {"start": time(10, 0), "end": time(14, 0), "warmup": 10},
        )

        # Adjust warmup for evening types training early
        if chronotype in [
            ChronotypeCategory.MODERATE_EVENING,
            ChronotypeCategory.EXTREME_EVENING,
        ]:
            base_timing["warmup"] += 5

        return base_timing

    def _get_strength_adjustments(self, chronotype: ChronotypeCategory) -> list[str]:
        """Get strength workout adjustments for chronotype"""
        adjustments = {
            ChronotypeCategory.EXTREME_EVENING: [
                "If training early AM: Reduce load 15-20% from planned",
                "If training early AM: Extend warmup to 20 minutes",
                "Evening training (6-9 PM): Peak performance window",
            ],
            ChronotypeCategory.EXTREME_MORNING: [
                "Morning training (6-10 AM): Peak performance window",
                "If training PM: Reduce intensity 10-15%",
                "Avoid intense training after 7 PM",
            ],
        }
        return adjustments.get(
            chronotype,
            ["Train during recommended window for optimal results"],
        )

    def _get_strength_considerations(
        self, chronotype: ChronotypeCategory
    ) -> list[str]:
        """Get strength workout considerations"""
        return [
            "Allow 2-3 hours after waking for full CNS activation",
            "Core temperature peaks 2-4 hours into day",
            "Strength gains occur regardless of timing - optimize for adherence",
        ]

    def _get_power_adjustments(self, chronotype: ChronotypeCategory) -> list[str]:
        """Get power workout adjustments for chronotype"""
        if chronotype in [
            ChronotypeCategory.EXTREME_EVENING,
            ChronotypeCategory.MODERATE_EVENING,
        ]:
            return [
                "CRITICAL: Do NOT train power movements in early morning",
                "If forced to train early: Switch to strength or hypertrophy work",
                "Evening training: Peak power output window",
            ]
        else:
            return [
                "Morning training: Peak power output for your type",
                "Ensure thorough warmup including activation drills",
            ]


# Global template generator instance
_generator: Optional[TemplateGenerator] = None


def get_template_generator() -> TemplateGenerator:
    """Get or create global template generator"""
    global _generator
    if _generator is None:
        _generator = TemplateGenerator()
    return _generator
