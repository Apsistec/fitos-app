"""
Nutrition Intelligence API Routes

RESTful API endpoints for adaptive TDEE, metabolic adaptation detection,
chrono-nutrition, and workout nutrition.

Sprint 36: Nutrition Intelligence
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, time as time_type

from app.nutrition_intelligence.expenditure import (
    get_expenditure_calculator,
    WeightDataPoint,
    IntakeDataPoint,
    ExpenditureEstimate,
    ActivityLevel,
    Sex,
)
from app.nutrition_intelligence.adaptation import (
    get_adaptation_detector,
    AdaptationStatus,
    AdaptationSeverity,
)
from app.nutrition_intelligence.chrono_nutrition import (
    get_chrono_nutrition_optimizer,
    DailyMealPlan,
    MealType,
)
from app.nutrition_intelligence.workout_nutrition import (
    get_workout_nutrition_calculator,
    WorkoutNutrition,
    WorkoutType,
    WorkoutDuration,
    Goal,
)


router = APIRouter(prefix="/api/v1/nutrition-intelligence", tags=["nutrition-intelligence"])


# Request/Response Models


class InitialExpenditureRequest(BaseModel):
    """Request for initial TDEE estimate"""

    weight_kg: float = Field(..., gt=0, le=300)
    height_cm: float = Field(..., gt=0, le=300)
    age_years: int = Field(..., gt=0, le=120)
    sex: Sex
    activity_level: ActivityLevel
    body_fat_percent: Optional[float] = Field(None, ge=5, le=50)


class WeightDataInput(BaseModel):
    """Weight measurement input"""

    date: date
    weight_kg: float = Field(..., gt=0, le=300)
    source: str = "manual"


class IntakeDataInput(BaseModel):
    """Calorie intake input"""

    date: date
    calories: float = Field(..., gt=0, le=10000)
    protein_g: float = Field(..., ge=0, le=1000)
    carbs_g: float = Field(..., ge=0, le=2000)
    fat_g: float = Field(..., ge=0, le=500)
    confidence: float = Field(1.0, ge=0, le=1)


class AdaptiveExpenditureRequest(BaseModel):
    """Request for adaptive TDEE calculation"""

    weight_data: List[WeightDataInput] = Field(..., min_length=14)
    intake_data: List[IntakeDataInput] = Field(..., min_length=14)
    minimum_days: int = Field(14, ge=7, le=90)


class AdaptationRequest(BaseModel):
    """Request for metabolic adaptation detection"""

    current_weight_kg: float = Field(..., gt=0, le=300)
    starting_weight_kg: float = Field(..., gt=0, le=300)
    current_tdee: float = Field(..., gt=0, le=10000)
    weeks_in_deficit: int = Field(..., ge=0, le=104)
    activity_level: str = Field("moderate", pattern="^(sedentary|moderate|active)$")
    sex: str = Field("male", pattern="^(male|female)$")


class MealPlanRequest(BaseModel):
    """Request for chrono-nutrition meal plan"""

    total_calories: int = Field(..., gt=0, le=10000)
    protein_g: int = Field(..., gt=0, le=1000)
    carbs_g: int = Field(..., gt=0, le=2000)
    fat_g: int = Field(..., gt=0, le=500)
    meal_frequency: int = Field(4, ge=3, le=6)
    workout_time: Optional[str] = None  # ISO time format
    wake_time: str = Field("06:00:00")  # ISO time format
    sleep_time: str = Field("22:00:00")  # ISO time format
    intermittent_fasting: bool = False


class WorkoutNutritionRequest(BaseModel):
    """Request for workout nutrition calculation"""

    body_weight_kg: float = Field(..., gt=0, le=300)
    workout_type: WorkoutType
    duration: WorkoutDuration
    goal: Goal = Goal.PERFORMANCE
    fasted_training: bool = False


class WeightPredictionRequest(BaseModel):
    """Request for weight change prediction"""

    current_tdee: float = Field(..., gt=0, le=10000)
    target_calories: float = Field(..., gt=0, le=10000)
    weeks: int = Field(..., ge=1, le=52)


# API Endpoints


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "nutrition-intelligence",
        "version": "1.0.0",
    }


@router.post("/expenditure/initial", response_model=dict)
async def calculate_initial_expenditure(request: InitialExpenditureRequest):
    """
    Calculate initial TDEE estimate using Mifflin-St Jeor equation.

    Used when insufficient data exists for adaptive calculation.
    Requires only basic stats (weight, height, age, sex, activity level).

    Returns:
        ExpenditureEstimate with formula-based TDEE (±335 kcal typical error)
    """
    calculator = get_expenditure_calculator()

    try:
        estimate = calculator.calculate_initial_estimate(
            weight_kg=request.weight_kg,
            height_cm=request.height_cm,
            age_years=request.age_years,
            sex=request.sex,
            activity_level=request.activity_level,
            body_fat_percent=request.body_fat_percent,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating expenditure: {str(e)}",
        )

    return {
        "tdee_kcal": estimate.tdee_kcal,
        "bmr_kcal": estimate.bmr_kcal,
        "neat_kcal": estimate.neat_kcal,
        "tef_kcal": estimate.tef_kcal,
        "exercise_kcal": estimate.exercise_kcal,
        "confidence": estimate.confidence,
        "days_of_data": estimate.days_of_data,
        "weight_trend_7d": estimate.weight_trend_7d,
        "recommendation": estimate.recommendation,
        "notes": estimate.notes,
    }


@router.post("/expenditure/adaptive", response_model=dict)
async def calculate_adaptive_expenditure(request: AdaptiveExpenditureRequest):
    """
    Calculate adaptive TDEE based on weight trends and calorie intake.

    MacroFactor-inspired algorithm that improves accuracy over time:
    - Week 1: ~190 kcal error
    - Week 3+: ~135 kcal error (46% improvement)

    Requires:
    - Minimum 14 days of weight data
    - Minimum 14 days of calorie intake data

    Returns:
        ExpenditureEstimate with adaptive TDEE (±135 kcal typical error after 3+ weeks)
    """
    calculator = get_expenditure_calculator()

    # Convert input models to dataclasses
    weight_data = [
        WeightDataPoint(date=w.date, weight_kg=w.weight_kg, source=w.source)
        for w in request.weight_data
    ]

    intake_data = [
        IntakeDataPoint(
            date=i.date,
            calories=i.calories,
            protein_g=i.protein_g,
            carbs_g=i.carbs_g,
            fat_g=i.fat_g,
            confidence=i.confidence,
        )
        for i in request.intake_data
    ]

    try:
        estimate = calculator.calculate_adaptive_expenditure(
            weight_data=weight_data,
            intake_data=intake_data,
            minimum_days=request.minimum_days,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating adaptive expenditure: {str(e)}",
        )

    return {
        "tdee_kcal": estimate.tdee_kcal,
        "bmr_kcal": estimate.bmr_kcal,
        "neat_kcal": estimate.neat_kcal,
        "tef_kcal": estimate.tef_kcal,
        "exercise_kcal": estimate.exercise_kcal,
        "confidence": estimate.confidence,
        "days_of_data": estimate.days_of_data,
        "weight_trend_7d": estimate.weight_trend_7d,
        "recommendation": estimate.recommendation,
        "notes": estimate.notes,
    }


@router.post("/expenditure/predict", response_model=dict)
async def predict_weight_change(request: WeightPredictionRequest):
    """
    Predict weight change based on calorie intake vs TDEE.

    Accounts for:
    - Calorie deficit/surplus
    - Metabolic adaptation (~10% after 4+ weeks)
    - Body composition changes (80% fat, 20% muscle typical)

    Returns:
        Predicted weight change in kg and lb, weekly rate, and notes
    """
    calculator = get_expenditure_calculator()

    try:
        prediction = calculator.predict_weight_change(
            current_tdee=request.current_tdee,
            target_calories=request.target_calories,
            weeks=request.weeks,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error predicting weight change: {str(e)}",
        )

    return prediction


@router.post("/adaptation/detect", response_model=dict)
async def detect_metabolic_adaptation(request: AdaptationRequest):
    """
    Detect metabolic adaptation during weight loss.

    Compares actual TDEE to predicted TDEE based on current weight.
    Difference >150 kcal suggests metabolic adaptation.

    Recommendations:
    - Diet breaks (2-4 weeks at maintenance)
    - Based on 2025 research: 47% greater weight loss with breaks

    Returns:
        AdaptationStatus with severity and diet break recommendations
    """
    detector = get_adaptation_detector()

    try:
        status_result = detector.detect_adaptation(
            current_weight_kg=request.current_weight_kg,
            starting_weight_kg=request.starting_weight_kg,
            current_tdee=request.current_tdee,
            weeks_in_deficit=request.weeks_in_deficit,
            activity_level=request.activity_level,
            sex=request.sex,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error detecting adaptation: {str(e)}",
        )

    return {
        "severity": status_result.severity.value,
        "estimated_reduction_kcal": status_result.estimated_reduction_kcal,
        "weeks_in_deficit": status_result.weeks_in_deficit,
        "total_weight_lost_kg": status_result.total_weight_lost_kg,
        "weight_loss_rate_kg_per_week": status_result.weight_loss_rate_kg_per_week,
        "recommend_diet_break": status_result.recommend_diet_break,
        "diet_break_duration_days": status_result.diet_break_duration_days,
        "maintenance_calories": status_result.maintenance_calories,
        "predicted_tdee": status_result.predicted_tdee,
        "actual_tdee": status_result.actual_tdee,
        "adaptation_percent": status_result.adaptation_percent,
        "notes": status_result.notes,
    }


@router.post("/adaptation/diet-break-calories", response_model=dict)
async def calculate_diet_break_calories(
    predicted_tdee: float = Field(..., gt=0, le=10000),
    current_deficit_calories: float = Field(..., gt=0, le=5000),
):
    """
    Calculate calories for diet break at maintenance.

    Diet breaks help restore:
    - Leptin and thyroid hormones
    - Reduce cortisol
    - Improve adherence
    - Preserve lean mass

    Returns:
        Maintenance calories and practical guidance
    """
    detector = get_adaptation_detector()

    try:
        result = detector.calculate_diet_break_calories(
            predicted_tdee=predicted_tdee,
            current_deficit_calories=current_deficit_calories,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating diet break calories: {str(e)}",
        )

    return result


@router.post("/chrono-nutrition/meal-plan", response_model=dict)
async def create_meal_plan(request: MealPlanRequest):
    """
    Create chrono-nutrition optimized meal plan.

    Based on circadian rhythm research:
    - Front-load calories (insulin sensitivity peaks in morning)
    - Protein distributed evenly (0.4-0.5g/kg per meal)
    - More carbs early, more fat later
    - Workout-centered if training time provided

    Returns:
        DailyMealPlan with optimized meal timing and macros
    """
    optimizer = get_chrono_nutrition_optimizer()

    # Parse times
    try:
        workout_time = (
            time_type.fromisoformat(request.workout_time)
            if request.workout_time
            else None
        )
        wake_time = time_type.fromisoformat(request.wake_time)
        sleep_time = time_type.fromisoformat(request.sleep_time)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid time format: {str(e)}",
        )

    try:
        plan = optimizer.create_meal_plan(
            total_calories=request.total_calories,
            protein_g=request.protein_g,
            carbs_g=request.carbs_g,
            fat_g=request.fat_g,
            meal_frequency=request.meal_frequency,
            workout_time=workout_time,
            wake_time=wake_time,
            sleep_time=sleep_time,
            intermittent_fasting=request.intermittent_fasting,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating meal plan: {str(e)}",
        )

    # Format response
    meals_formatted = [
        {
            "meal_type": meal.meal_type.value,
            "optimal_time": meal.optimal_time.isoformat(),
            "time_window_start": meal.time_window_start.isoformat(),
            "time_window_end": meal.time_window_end.isoformat(),
            "calories": meal.calories,
            "protein_g": meal.protein_g,
            "carbs_g": meal.carbs_g,
            "fat_g": meal.fat_g,
            "reasoning": meal.reasoning,
            "priority": meal.priority,
            "considerations": meal.considerations,
        }
        for meal in plan.meals
    ]

    return {
        "total_calories": plan.total_calories,
        "total_protein_g": plan.total_protein_g,
        "total_carbs_g": plan.total_carbs_g,
        "total_fat_g": plan.total_fat_g,
        "meals": meals_formatted,
        "meal_frequency": plan.meal_frequency,
        "eating_window_hours": plan.eating_window_hours,
        "notes": plan.notes,
    }


@router.post("/workout-nutrition/calculate", response_model=dict)
async def calculate_workout_nutrition(request: WorkoutNutritionRequest):
    """
    Calculate pre/intra/post workout nutrition.

    Research-backed recommendations:
    - Pre-workout: 2-3 hours before, carbs + moderate protein
    - Intra-workout: 30-60g carbs/hour for >90min sessions
    - Post-workout: Within 0-2 hours, 0.4-0.5g/kg protein + carbs

    Returns:
        WorkoutNutrition with timing, amounts, and food examples
    """
    calculator = get_workout_nutrition_calculator()

    try:
        nutrition = calculator.calculate_workout_nutrition(
            body_weight_kg=request.body_weight_kg,
            workout_type=request.workout_type,
            duration=request.duration,
            goal=request.goal,
            fasted_training=request.fasted_training,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating workout nutrition: {str(e)}",
        )

    # Format response
    def format_timing(timing):
        return {
            "timing": timing.timing,
            "calories": timing.calories,
            "protein_g": timing.protein_g,
            "carbs_g": timing.carbs_g,
            "fat_g": timing.fat_g,
            "hydration_ml": timing.hydration_ml,
            "recommendations": timing.recommendations,
            "food_examples": timing.food_examples,
            "supplements": timing.supplements,
        }

    return {
        "pre_workout": format_timing(nutrition.pre_workout),
        "intra_workout": format_timing(nutrition.intra_workout) if nutrition.intra_workout else None,
        "post_workout": format_timing(nutrition.post_workout),
        "total_calories": nutrition.total_calories,
        "total_protein_g": nutrition.total_protein_g,
        "total_carbs_g": nutrition.total_carbs_g,
        "total_fat_g": nutrition.total_fat_g,
        "notes": nutrition.notes,
    }


# Export router
__all__ = ["router"]
