"""
Nutrition Intelligence Module

MacroFactor-inspired adaptive TDEE, metabolic adaptation detection,
and chrono-nutrition timing optimization.

Sprint 36: Nutrition Intelligence
"""

from app.nutrition_intelligence.expenditure import (
    ExpenditureCalculator,
    ExpenditureEstimate,
    get_expenditure_calculator,
)
from app.nutrition_intelligence.adaptation import (
    AdaptationDetector,
    AdaptationStatus,
    get_adaptation_detector,
)
from app.nutrition_intelligence.chrono_nutrition import (
    ChronoNutritionOptimizer,
    MealTimingRecommendation,
    get_chrono_nutrition_optimizer,
)
from app.nutrition_intelligence.workout_nutrition import (
    WorkoutNutritionCalculator,
    WorkoutNutrition,
    get_workout_nutrition_calculator,
)

__all__ = [
    "ExpenditureCalculator",
    "ExpenditureEstimate",
    "get_expenditure_calculator",
    "AdaptationDetector",
    "AdaptationStatus",
    "get_adaptation_detector",
    "ChronoNutritionOptimizer",
    "MealTimingRecommendation",
    "get_chrono_nutrition_optimizer",
    "WorkoutNutritionCalculator",
    "WorkoutNutrition",
    "get_workout_nutrition_calculator",
]
