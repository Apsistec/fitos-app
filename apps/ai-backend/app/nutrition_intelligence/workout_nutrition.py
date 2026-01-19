"""
Workout Nutrition Calculator

Calculate pre/intra/post workout nutrition based on training type and goals.

Research:
- Protein: 0.4-0.5g/kg per meal, 0.25g/kg minimum post-workout
- Carbs pre-workout: 1-4g/kg (2-4 hours before)
- Carbs post-workout: 1-1.2g/kg for glycogen replenishment
- Intra-workout: 30-60g carbs/hour for >90min sessions
- Caffeine: 3-6mg/kg, 30-60min pre-workout

Sprint 36: Nutrition Intelligence
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from enum import Enum


class WorkoutType(str, Enum):
    """Workout type categories"""

    STRENGTH = "strength"  # Heavy lifting, low rep
    HYPERTROPHY = "hypertrophy"  # Muscle building, moderate volume
    ENDURANCE = "endurance"  # Cardio, long duration
    POWER = "power"  # Explosive, high intensity
    MIXED = "mixed"  # CrossFit, HIIT, circuit


class WorkoutDuration(str, Enum):
    """Workout duration categories"""

    SHORT = "short"  # <45 min
    MEDIUM = "medium"  # 45-90 min
    LONG = "long"  # >90 min


class Goal(str, Enum):
    """Training goal"""

    FAT_LOSS = "fat_loss"
    MUSCLE_GAIN = "muscle_gain"
    PERFORMANCE = "performance"
    MAINTENANCE = "maintenance"


@dataclass
class WorkoutNutritionTiming:
    """Nutrition timing for specific phase"""

    timing: str  # "2-3 hours before", "during", "within 1 hour after"
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    hydration_ml: int

    recommendations: list[str] = field(default_factory=list)
    food_examples: list[str] = field(default_factory=list)
    supplements: list[str] = field(default_factory=list)


@dataclass
class WorkoutNutrition:
    """Complete workout nutrition plan"""

    pre_workout: WorkoutNutritionTiming
    intra_workout: Optional[WorkoutNutritionTiming]
    post_workout: WorkoutNutritionTiming

    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int

    notes: list[str] = field(default_factory=list)


class WorkoutNutritionCalculator:
    """
    Calculate optimal workout nutrition timing and amounts.

    Based on research-backed guidelines for performance and recovery.
    """

    def __init__(self):
        pass

    def calculate_workout_nutrition(
        self,
        body_weight_kg: float,
        workout_type: WorkoutType,
        duration: WorkoutDuration,
        goal: Goal = Goal.PERFORMANCE,
        fasted_training: bool = False,
    ) -> WorkoutNutrition:
        """
        Calculate complete workout nutrition plan.

        Args:
            body_weight_kg: Body weight in kg
            workout_type: Type of workout
            duration: Workout duration category
            goal: Training goal
            fasted_training: Whether training fasted

        Returns:
            WorkoutNutrition with pre/intra/post recommendations
        """
        # Calculate pre-workout
        if fasted_training:
            pre = self._calculate_fasted_pre_workout(body_weight_kg)
        else:
            pre = self._calculate_pre_workout(
                body_weight_kg, workout_type, duration, goal
            )

        # Calculate intra-workout (only for long sessions)
        if duration == WorkoutDuration.LONG:
            intra = self._calculate_intra_workout(body_weight_kg, workout_type)
        else:
            intra = None

        # Calculate post-workout
        post = self._calculate_post_workout(
            body_weight_kg, workout_type, goal, fasted_training
        )

        # Total macros
        total_cals = pre.calories + post.calories
        total_protein = pre.protein_g + post.protein_g
        total_carbs = pre.carbs_g + post.carbs_g
        total_fat = pre.fat_g + post.fat_g

        if intra:
            total_cals += intra.calories
            total_protein += intra.protein_g
            total_carbs += intra.carbs_g
            total_fat += intra.fat_g

        # Generate notes
        notes = self._generate_notes(workout_type, duration, goal, fasted_training)

        return WorkoutNutrition(
            pre_workout=pre,
            intra_workout=intra,
            post_workout=post,
            total_calories=total_cals,
            total_protein_g=total_protein,
            total_carbs_g=total_carbs,
            total_fat_g=total_fat,
            notes=notes,
        )

    def _calculate_pre_workout(
        self,
        weight_kg: float,
        workout_type: WorkoutType,
        duration: WorkoutDuration,
        goal: Goal,
    ) -> WorkoutNutritionTiming:
        """Calculate pre-workout nutrition"""

        # Protein: 0.25-0.4g/kg
        if goal == Goal.MUSCLE_GAIN:
            protein = round(weight_kg * 0.4)
        else:
            protein = round(weight_kg * 0.3)

        # Carbs: varies by workout type and duration
        if workout_type in [WorkoutType.STRENGTH, WorkoutType.POWER]:
            # Lower carbs for strength (glycogen not limiting factor)
            carbs = round(weight_kg * 0.5)
        elif workout_type == WorkoutType.ENDURANCE:
            # Higher carbs for endurance
            if duration == WorkoutDuration.LONG:
                carbs = round(weight_kg * 2.0)
            else:
                carbs = round(weight_kg * 1.0)
        else:  # Hypertrophy, Mixed
            carbs = round(weight_kg * 1.0)

        # Fat: Keep low for faster digestion (except fat loss goal)
        if goal == Goal.FAT_LOSS:
            fat = 10
        else:
            fat = 5

        calories = protein * 4 + carbs * 4 + fat * 9

        # Recommendations
        recommendations = [
            "Consume 2-3 hours before workout",
            "Choose easily digestible foods",
            "Include moderate protein and carbs",
        ]

        # Food examples
        food_examples = [
            "Oatmeal with banana and protein powder",
            "Rice with chicken and vegetables",
            "Toast with peanut butter and Greek yogurt",
            "Pasta with lean ground turkey",
        ]

        # Supplements
        supplements = []
        if workout_type in [WorkoutType.STRENGTH, WorkoutType.POWER]:
            supplements.append("Caffeine (3-6mg/kg) 30-60min before")
            supplements.append("Creatine (5g) - timing flexible")
        if workout_type == WorkoutType.ENDURANCE:
            supplements.append("Sodium (300-600mg) if sweating heavily")

        return WorkoutNutritionTiming(
            timing="2-3 hours before workout",
            calories=calories,
            protein_g=protein,
            carbs_g=carbs,
            fat_g=fat,
            hydration_ml=500,
            recommendations=recommendations,
            food_examples=food_examples,
            supplements=supplements,
        )

    def _calculate_fasted_pre_workout(
        self, weight_kg: float
    ) -> WorkoutNutritionTiming:
        """Calculate minimal pre-workout for fasted training"""
        return WorkoutNutritionTiming(
            timing="15-30 minutes before workout",
            calories=0,
            protein_g=0,
            carbs_g=0,
            fat_g=0,
            hydration_ml=500,
            recommendations=[
                "Hydrate well before training",
                "Consider 5-10g BCAAs if training fasted",
                "Keep workout intensity moderate",
            ],
            food_examples=[],
            supplements=[
                "BCAAs (5-10g) - optional for muscle preservation",
                "Caffeine (3-6mg/kg) for performance",
                "Electrolytes if sweating heavily",
            ],
        )

    def _calculate_intra_workout(
        self, weight_kg: float, workout_type: WorkoutType
    ) -> WorkoutNutritionTiming:
        """Calculate intra-workout nutrition for long sessions"""

        # Carbs: 30-60g per hour for sessions >90min
        if workout_type == WorkoutType.ENDURANCE:
            carbs = 60  # Upper range for endurance
        else:
            carbs = 30  # Lower range for strength-based

        calories = carbs * 4

        return WorkoutNutritionTiming(
            timing="During workout (every 20-30 min)",
            calories=calories,
            protein_g=0,
            carbs_g=carbs,
            fat_g=0,
            hydration_ml=750,
            recommendations=[
                "Sip throughout workout",
                "Use fast-digesting carbs",
                "Combine with electrolytes",
            ],
            food_examples=[
                "Sports drink (6-8% carb)",
                "Energy gels",
                "Banana or dates",
                "Carb powder in water",
            ],
            supplements=[
                "Electrolytes (sodium, potassium)",
                "EAAs (optional for muscle preservation)",
            ],
        )

    def _calculate_post_workout(
        self,
        weight_kg: float,
        workout_type: WorkoutType,
        goal: Goal,
        fasted: bool,
    ) -> WorkoutNutritionTiming:
        """Calculate post-workout nutrition"""

        # Protein: 0.4-0.5g/kg (higher if fasted)
        if fasted or goal == Goal.MUSCLE_GAIN:
            protein = round(weight_kg * 0.5)
        else:
            protein = round(weight_kg * 0.4)

        # Carbs: 1-1.2g/kg for glycogen replenishment
        if workout_type == WorkoutType.ENDURANCE:
            carbs = round(weight_kg * 1.2)
        elif workout_type in [WorkoutType.HYPERTROPHY, WorkoutType.MIXED]:
            carbs = round(weight_kg * 1.0)
        else:  # Strength, Power
            carbs = round(weight_kg * 0.8)

        # Adjust for goal
        if goal == Goal.FAT_LOSS:
            carbs = int(carbs * 0.7)  # Reduce carbs for fat loss

        # Fat: Moderate (doesn't impair recovery)
        fat = 10

        calories = protein * 4 + carbs * 4 + fat * 9

        recommendations = [
            "Consume within 0-2 hours post-workout",
            "Prioritize fast-digesting protein",
            "Include carbs for glycogen replenishment",
        ]

        if workout_type in [WorkoutType.STRENGTH, WorkoutType.HYPERTROPHY]:
            recommendations.append("3:1 or 4:1 carb:protein ratio optimal for MPS")

        food_examples = [
            "Protein shake with banana and oats",
            "Chicken with rice and vegetables",
            "Greek yogurt with berries and granola",
            "Salmon with sweet potato",
        ]

        supplements = [
            "Whey protein (fast-digesting)",
            "Creatine (5g) - timing flexible",
        ]

        return WorkoutNutritionTiming(
            timing="Within 0-2 hours post-workout",
            calories=calories,
            protein_g=protein,
            carbs_g=carbs,
            fat_g=fat,
            hydration_ml=750,
            recommendations=recommendations,
            food_examples=food_examples,
            supplements=supplements,
        )

    def _generate_notes(
        self,
        workout_type: WorkoutType,
        duration: WorkoutDuration,
        goal: Goal,
        fasted: bool,
    ) -> list[str]:
        """Generate contextual notes"""
        notes = []

        # Workout-specific
        if workout_type == WorkoutType.STRENGTH:
            notes.append("Strength training: Protein > carbs pre-workout")
        elif workout_type == WorkoutType.ENDURANCE:
            notes.append("Endurance: Prioritize carbs for sustained energy")
        elif workout_type == WorkoutType.HYPERTROPHY:
            notes.append("Hypertrophy: High protein post-workout for MPS")

        # Duration-specific
        if duration == WorkoutDuration.LONG:
            notes.append("Long sessions: Intra-workout nutrition critical")
        else:
            notes.append("Short-medium sessions: Pre and post-workout sufficient")

        # Goal-specific
        if goal == Goal.FAT_LOSS:
            notes.append("Fat loss: Moderate carbs, prioritize protein")
        elif goal == Goal.MUSCLE_GAIN:
            notes.append("Muscle gain: High protein and carbs for recovery")

        # Fasted training
        if fasted:
            notes.append("Fasted training: Prioritize post-workout nutrition")

        # General
        notes.append("Hydration: 500-750ml per hour of training")
        notes.append("Individual needs vary - adjust based on response")

        return notes


# Global calculator instance
_calculator: Optional[WorkoutNutritionCalculator] = None


def get_workout_nutrition_calculator() -> WorkoutNutritionCalculator:
    """Get or create global workout nutrition calculator"""
    global _calculator
    if _calculator is None:
        _calculator = WorkoutNutritionCalculator()
    return _calculator
