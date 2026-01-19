"""
Chrono-Nutrition Timing Optimizer

Meal timing recommendations based on circadian rhythm research.

Research:
- Insulin sensitivity peaks in morning (30-50% higher than evening)
- Protein timing: 0.4-0.5g/kg per meal, spread across day
- Carbs: Better tolerated earlier in day
- TEF varies by time: higher in morning
- Protein post-workout: 0-2 hour window optimal

Sprint 36: Nutrition Intelligence
"""

from dataclasses import dataclass, field
from datetime import time, datetime
from typing import Optional, Literal
from enum import Enum


class MealType(str, Enum):
    """Meal type categories"""

    BREAKFAST = "breakfast"
    MORNING_SNACK = "morning_snack"
    LUNCH = "lunch"
    AFTERNOON_SNACK = "afternoon_snack"
    PRE_WORKOUT = "pre_workout"
    INTRA_WORKOUT = "intra_workout"
    POST_WORKOUT = "post_workout"
    DINNER = "dinner"
    EVENING_SNACK = "evening_snack"


@dataclass
class MealTimingRecommendation:
    """Single meal timing recommendation"""

    meal_type: MealType
    optimal_time: time
    time_window_start: time
    time_window_end: time

    # Macros
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int

    # Context
    reasoning: str
    priority: int  # 1-5, higher = more important
    considerations: list[str] = field(default_factory=list)


@dataclass
class DailyMealPlan:
    """Complete daily meal timing plan"""

    total_calories: int
    total_protein_g: int
    total_carbs_g: int
    total_fat_g: int

    meals: list[MealTimingRecommendation]
    meal_frequency: int
    eating_window_hours: int

    notes: list[str] = field(default_factory=list)


class ChronoNutritionOptimizer:
    """
    Optimize meal timing based on circadian rhythm research.

    Key Principles:
    - Front-load calories (40% breakfast, 35% lunch, 25% dinner)
    - Prioritize protein early (better MPS)
    - Carbs when insulin sensitivity high (morning/post-workout)
    - Larger eating window = better adherence
    """

    def __init__(self):
        pass

    def create_meal_plan(
        self,
        total_calories: int,
        protein_g: int,
        carbs_g: int,
        fat_g: int,
        meal_frequency: int = 4,
        workout_time: Optional[time] = None,
        wake_time: time = time(6, 0),
        sleep_time: time = time(22, 0),
        intermittent_fasting: bool = False,
    ) -> DailyMealPlan:
        """
        Create optimized meal timing plan.

        Args:
            total_calories: Daily calorie target
            protein_g: Daily protein target
            carbs_g: Daily carb target
            fat_g: Daily fat target
            meal_frequency: Number of main meals (3-6)
            workout_time: Time of workout (if applicable)
            wake_time: Wake up time
            sleep_time: Bedtime
            intermittent_fasting: Whether using IF

        Returns:
            DailyMealPlan with optimized timing
        """
        meals = []
        notes = []

        # Calculate eating window
        if intermittent_fasting:
            # 16:8 IF - start eating 4 hours after wake
            eating_window_hours = 8
            first_meal_time = self._add_hours(wake_time, 4)
            notes.append("16:8 Intermittent Fasting protocol")
        else:
            # Regular eating - 1 hour after wake
            eating_window_hours = self._calculate_hours_between(wake_time, sleep_time) - 2
            first_meal_time = self._add_hours(wake_time, 1)

        last_meal_time = self._add_hours(sleep_time, -2)

        # Distribute calories based on circadian principles
        if workout_time:
            meals = self._create_workout_centered_plan(
                total_calories,
                protein_g,
                carbs_g,
                fat_g,
                workout_time,
                first_meal_time,
                last_meal_time,
                meal_frequency,
            )
            notes.append("Plan optimized around workout timing")
        else:
            meals = self._create_standard_plan(
                total_calories,
                protein_g,
                carbs_g,
                fat_g,
                first_meal_time,
                last_meal_time,
                meal_frequency,
            )
            notes.append("Standard chrono-nutrition protocol")

        # General notes
        notes.append("Front-loaded calories align with circadian insulin sensitivity")
        notes.append("Protein distributed evenly for optimal MPS")
        if not intermittent_fasting:
            notes.append("Early eating window supports better glucose control")

        return DailyMealPlan(
            total_calories=total_calories,
            total_protein_g=protein_g,
            total_carbs_g=carbs_g,
            total_fat_g=fat_g,
            meals=meals,
            meal_frequency=len(meals),
            eating_window_hours=eating_window_hours,
            notes=notes,
        )

    def _create_standard_plan(
        self,
        calories: int,
        protein: int,
        carbs: int,
        fat: int,
        first_meal: time,
        last_meal: time,
        frequency: int,
    ) -> list[MealTimingRecommendation]:
        """Create standard meal plan without workout consideration"""
        meals = []

        # Calorie distribution: front-loaded
        # 3 meals: 40/35/25
        # 4 meals: 35/25/20/20
        # 5+ meals: More evenly distributed

        if frequency == 3:
            distributions = [0.40, 0.35, 0.25]
        elif frequency == 4:
            distributions = [0.35, 0.25, 0.20, 0.20]
        elif frequency == 5:
            distributions = [0.30, 0.20, 0.25, 0.15, 0.10]
        else:  # 6+
            distributions = [0.25, 0.20, 0.20, 0.15, 0.10, 0.10]

        # Protein evenly distributed
        protein_per_meal = protein // frequency

        # Calculate meal times
        eating_hours = self._calculate_hours_between(first_meal, last_meal)
        interval_hours = eating_hours / (frequency - 1) if frequency > 1 else 0

        for i, cal_ratio in enumerate(distributions[:frequency]):
            meal_time = self._add_hours(first_meal, i * interval_hours)

            # Meal calories
            meal_cals = int(calories * cal_ratio)

            # Distribute macros
            meal_protein = protein_per_meal
            remaining_cals = meal_cals - (meal_protein * 4)

            # More carbs early, more fat later
            carb_ratio = 1.0 - (i / frequency) * 0.4  # 100% → 60%
            meal_carbs = int((remaining_cals * carb_ratio) / 4)
            meal_fat = int((remaining_cals - meal_carbs * 4) / 9)

            # Determine meal type
            if i == 0:
                meal_type = MealType.BREAKFAST
                reasoning = "Largest meal when insulin sensitivity peaks"
                priority = 5
            elif i == 1:
                meal_type = MealType.LUNCH
                reasoning = "Second largest meal, still high insulin sensitivity"
                priority = 4
            elif i == frequency - 1:
                meal_type = MealType.DINNER
                reasoning = "Smallest meal, lower carbs in evening"
                priority = 3
            else:
                meal_type = MealType.AFTERNOON_SNACK if i == 2 else MealType.EVENING_SNACK
                reasoning = "Smaller meal to maintain energy"
                priority = 2

            meals.append(
                MealTimingRecommendation(
                    meal_type=meal_type,
                    optimal_time=meal_time,
                    time_window_start=self._add_hours(meal_time, -0.5),
                    time_window_end=self._add_hours(meal_time, 0.5),
                    calories=meal_cals,
                    protein_g=meal_protein,
                    carbs_g=meal_carbs,
                    fat_g=meal_fat,
                    reasoning=reasoning,
                    priority=priority,
                    considerations=[
                        "Aim for 30-40g protein minimum" if i == 0 else "",
                        "Include fiber for satiety",
                    ],
                )
            )

        return meals

    def _create_workout_centered_plan(
        self,
        calories: int,
        protein: int,
        carbs: int,
        fat: int,
        workout_time: time,
        first_meal: time,
        last_meal: time,
        frequency: int,
    ) -> list[MealTimingRecommendation]:
        """Create meal plan centered around workout"""
        meals = []

        # Pre-workout meal (2-3 hours before)
        pre_workout_time = self._add_hours(workout_time, -2.5)
        pre_workout_cals = int(calories * 0.25)
        pre_protein = int(protein * 0.20)
        pre_carbs = int(carbs * 0.30)  # Fuel for workout
        pre_fat = int((pre_workout_cals - pre_protein * 4 - pre_carbs * 4) / 9)

        meals.append(
            MealTimingRecommendation(
                meal_type=MealType.PRE_WORKOUT,
                optimal_time=pre_workout_time,
                time_window_start=self._add_hours(pre_workout_time, -0.5),
                time_window_end=self._add_hours(pre_workout_time, 0.5),
                calories=pre_workout_cals,
                protein_g=pre_protein,
                carbs_g=pre_carbs,
                fat_g=pre_fat,
                reasoning="Fuel workout with carbs and moderate protein",
                priority=5,
                considerations=[
                    "2-3 hours before training",
                    "Easily digestible carbs",
                    "Moderate protein, low fat",
                ],
            )
        )

        # Post-workout meal (within 1 hour)
        post_workout_time = self._add_hours(workout_time, 1)
        post_workout_cals = int(calories * 0.30)
        post_protein = int(protein * 0.35)  # High protein for MPS
        post_carbs = int(carbs * 0.40)  # Replenish glycogen
        post_fat = int((post_workout_cals - post_protein * 4 - post_carbs * 4) / 9)

        meals.append(
            MealTimingRecommendation(
                meal_type=MealType.POST_WORKOUT,
                optimal_time=post_workout_time,
                time_window_start=workout_time,
                time_window_end=self._add_hours(workout_time, 2),
                calories=post_workout_cals,
                protein_g=post_protein,
                carbs_g=post_carbs,
                fat_g=post_fat,
                reasoning="Maximize muscle protein synthesis and glycogen replenishment",
                priority=5,
                considerations=[
                    "Within 0-2 hours post-workout",
                    "High protein (0.4-0.5g/kg)",
                    "Fast-digesting carbs",
                ],
            )
        )

        # Fill in remaining meals
        remaining_cals = calories - pre_workout_cals - post_workout_cals
        remaining_protein = protein - pre_protein - post_protein
        remaining_carbs = carbs - pre_carbs - post_carbs
        remaining_fat = fat - pre_fat - post_fat

        # Add 2-3 more meals depending on frequency
        other_meals_count = frequency - 2
        if other_meals_count > 0:
            other_meals = self._distribute_remaining_meals(
                remaining_cals,
                remaining_protein,
                remaining_carbs,
                remaining_fat,
                other_meals_count,
                first_meal,
                pre_workout_time,
                post_workout_time,
                last_meal,
            )
            meals.extend(other_meals)

        # Sort by time
        meals.sort(key=lambda m: m.optimal_time)

        return meals

    def _distribute_remaining_meals(
        self,
        calories: int,
        protein: int,
        carbs: int,
        fat: int,
        count: int,
        first_meal: time,
        pre_workout: time,
        post_workout: time,
        last_meal: time,
    ) -> list[MealTimingRecommendation]:
        """Distribute remaining meals around workout"""
        meals = []

        cals_per_meal = calories // count
        protein_per_meal = protein // count
        carbs_per_meal = carbs // count
        fat_per_meal = fat // count

        # Breakfast (if before pre-workout)
        if self._time_before(first_meal, pre_workout):
            meals.append(
                MealTimingRecommendation(
                    meal_type=MealType.BREAKFAST,
                    optimal_time=first_meal,
                    time_window_start=first_meal,
                    time_window_end=self._add_hours(first_meal, 1),
                    calories=cals_per_meal,
                    protein_g=protein_per_meal,
                    carbs_g=carbs_per_meal,
                    fat_g=fat_per_meal,
                    reasoning="Start day with protein and energy",
                    priority=4,
                    considerations=["High protein breakfast supports MPS"],
                )
            )
            count -= 1

        # Dinner (if after post-workout)
        if count > 0 and self._time_before(post_workout, last_meal):
            dinner_time = self._add_hours(post_workout, 3)
            if self._time_before(dinner_time, last_meal):
                meals.append(
                    MealTimingRecommendation(
                        meal_type=MealType.DINNER,
                        optimal_time=dinner_time,
                        time_window_start=self._add_hours(dinner_time, -0.5),
                        time_window_end=self._add_hours(dinner_time, 0.5),
                        calories=cals_per_meal,
                        protein_g=protein_per_meal,
                        carbs_g=int(carbs_per_meal * 0.7),  # Lower carbs at night
                        fat_g=int(fat_per_meal * 1.3),  # Higher fat at night
                        reasoning="Evening meal with moderate portions",
                        priority=3,
                        considerations=["Lower carbs, higher fat for evening"],
                    )
                )

        return meals

    def _add_hours(self, t: time, hours: float) -> time:
        """Add hours to time"""
        dt = datetime.combine(datetime.today(), t)
        dt += timedelta(hours=hours)
        return dt.time()

    def _calculate_hours_between(self, start: time, end: time) -> float:
        """Calculate hours between two times"""
        start_dt = datetime.combine(datetime.today(), start)
        end_dt = datetime.combine(datetime.today(), end)
        if end_dt < start_dt:
            end_dt += timedelta(days=1)
        return (end_dt - start_dt).total_seconds() / 3600

    def _time_before(self, t1: time, t2: time) -> bool:
        """Check if t1 is before t2"""
        dt1 = datetime.combine(datetime.today(), t1)
        dt2 = datetime.combine(datetime.today(), t2)
        return dt1 < dt2


# Import for type hints
from datetime import timedelta

# Global optimizer instance
_optimizer: Optional[ChronoNutritionOptimizer] = None


def get_chrono_nutrition_optimizer() -> ChronoNutritionOptimizer:
    """Get or create global chrono-nutrition optimizer"""
    global _optimizer
    if _optimizer is None:
        _optimizer = ChronoNutritionOptimizer()
    return _optimizer
