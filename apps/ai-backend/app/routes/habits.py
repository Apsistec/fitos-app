"""
Habit Formation & Tracking API Routes

RESTful API endpoints for 66-day habit formation system with context-aware
notifications and habit stacking suggestions.

Research:
- 66 days median for habit formation (not 21 days)
- Morning habits 43% more reliable
- Habit stacking increases success by 2.3x
- Context-aware notifications 2.8x more effective

Sprint 38: 66-Day Habit Tracking
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, time

from app.habits.habit_formation import (
    get_habit_formation,
    HabitType,
    HabitFrequency,
    HabitTimePreference,
    HabitDifficulty,
)
from app.habits.habit_stacking import get_habit_stacking_engine, AnchorType
from app.habits.context_notifications import (
    get_notification_engine,
    NotificationContext,
    NotificationTiming,
)


router = APIRouter(prefix="/api/v1/habits", tags=["habits"])


# Request/Response Models


class HabitProgressRequest(BaseModel):
    """Request for habit progress calculation"""

    habit_id: str
    habit_name: str
    habit_type: HabitType
    difficulty: HabitDifficulty
    time_preference: HabitTimePreference
    start_date: date
    completion_log: List[date] = Field(..., description="Dates when habit was completed")
    current_date: Optional[date] = None


class HabitStackingRequest(BaseModel):
    """Request for habit stacking suggestions"""

    new_habit_name: str = Field(..., description="Name of habit to form")
    habit_type: HabitType
    habit_difficulty: HabitDifficulty
    time_preference: Optional[HabitTimePreference] = None
    existing_anchors: Optional[List[AnchorType]] = None


class NotificationStrategyRequest(BaseModel):
    """Request for notification strategy"""

    habit_id: str
    habit_name: str
    habit_type: HabitType
    habit_difficulty: HabitDifficulty
    time_preference: HabitTimePreference
    current_streak: int = 0
    days_completed: int = 0
    completion_rate: float = Field(..., ge=0.0, le=1.0)
    typical_completion_time: Optional[str] = None  # ISO time format


class OptimalTimeRequest(BaseModel):
    """Request for optimal time suggestion"""

    habit_type: HabitType


class DifficultyRequest(BaseModel):
    """Request for difficulty suggestion"""

    habit_description: str


# API Endpoints


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "habits",
        "version": "1.0.0",
        "research": "66-day habit formation (University of South Australia 2024)",
    }


@router.post("/progress/calculate", response_model=dict)
async def calculate_habit_progress(request: HabitProgressRequest):
    """
    Calculate comprehensive habit formation progress.

    Based on 66-day formation timeline with:
    - Automaticity scoring (asymptotic curve)
    - Formation stage (initiation, learning, stability, mastery)
    - Risk assessment (low, medium, high)
    - Actionable insights

    Returns:
        Habit progress with metrics and recommendations
    """
    habit_formation = get_habit_formation()

    try:
        progress = habit_formation.calculate_progress(
            habit_id=request.habit_id,
            habit_name=request.habit_name,
            habit_type=request.habit_type,
            difficulty=request.difficulty,
            time_preference=request.time_preference,
            start_date=request.start_date,
            completion_log=request.completion_log,
            current_date=request.current_date,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating progress: {str(e)}",
        )

    return {
        "habit_id": progress.habit_id,
        "habit_name": progress.habit_name,
        "habit_type": progress.habit_type.value,
        "difficulty": progress.difficulty.value,
        "time_preference": progress.time_preference.value,
        "start_date": progress.start_date.isoformat(),
        "target_days": progress.target_days,
        "current_streak": progress.current_streak,
        "longest_streak": progress.longest_streak,
        "days_completed": progress.days_completed,
        "days_missed": progress.days_missed,
        "completion_rate": progress.completion_rate,
        "automaticity_score": progress.automaticity_score,
        "formation_progress": progress.formation_progress,
        "formation_stage": progress.formation_stage,
        "estimated_days_remaining": progress.estimated_days_remaining,
        "on_track": progress.on_track,
        "risk_level": progress.risk_level,
        "last_completed": (
            progress.last_completed.isoformat() if progress.last_completed else None
        ),
        "notes": progress.notes,
    }


@router.post("/stacking/suggest", response_model=dict)
async def suggest_habit_stacks(request: HabitStackingRequest):
    """
    Get habit stacking suggestions.

    Habit stacking increases formation probability by 2.3x by anchoring
    new habits to existing automatic behaviors.

    Formula: "After [EXISTING HABIT], I will [NEW HABIT]"

    Returns:
        List of stacking suggestions ranked by success probability
    """
    stacking_engine = get_habit_stacking_engine()

    try:
        suggestions = stacking_engine.suggest_stacks(
            new_habit_name=request.new_habit_name,
            habit_type=request.habit_type,
            habit_difficulty=request.habit_difficulty,
            time_preference=request.time_preference,
            existing_anchors=request.existing_anchors,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating stacking suggestions: {str(e)}",
        )

    suggestions_formatted = [
        {
            "anchor_type": s.anchor_type.value,
            "anchor_description": s.anchor_description,
            "new_habit_description": s.new_habit_description,
            "stack_formula": s.stack_formula,
            "reasoning": s.reasoning,
            "success_probability": s.success_probability,
            "tips": s.tips,
            "obstacles": s.obstacles,
            "solutions": s.solutions,
        }
        for s in suggestions
    ]

    return {
        "new_habit_name": request.new_habit_name,
        "habit_type": request.habit_type.value,
        "suggestions": suggestions_formatted,
        "research_note": "Habit stacking increases formation probability by 2.3x (Clear, Atomic Habits)",
    }


@router.post("/notifications/strategy", response_model=dict)
async def create_notification_strategy(request: NotificationStrategyRequest):
    """
    Create context-aware notification strategy (JITAI-style).

    Generates smart notifications based on:
    - Time of day (typical completion time)
    - Location (gym arrival, home)
    - User state (streak risk, milestones)
    - Behavioral patterns (miss patterns, optimal windows)

    Research: Context-aware notifications are 2.8x more effective than
    scheduled reminders.

    Returns:
        Notification strategy with context-aware triggers
    """
    notification_engine = get_notification_engine()

    # Parse typical completion time if provided
    typical_time = None
    if request.typical_completion_time:
        try:
            typical_time = time.fromisoformat(request.typical_completion_time)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid time format. Use ISO format (HH:MM:SS)",
            )

    try:
        strategy = notification_engine.create_notification_strategy(
            habit_id=request.habit_id,
            habit_name=request.habit_name,
            habit_type=request.habit_type,
            habit_difficulty=request.habit_difficulty,
            time_preference=request.time_preference,
            current_streak=request.current_streak,
            days_completed=request.days_completed,
            completion_rate=request.completion_rate,
            typical_completion_time=typical_time,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating notification strategy: {str(e)}",
        )

    # Format triggers
    triggers_formatted = [
        {
            "context": t.context.value,
            "timing": t.timing.value,
            "priority": t.priority,
            "title": t.title,
            "message": t.message,
            "action_text": t.action_text,
            "trigger_conditions": t.trigger_conditions,
            "reasoning": t.reasoning,
            "expected_engagement": t.expected_engagement,
        }
        for t in strategy.triggers
    ]

    return {
        "habit_id": strategy.habit_id,
        "habit_name": strategy.habit_name,
        "triggers": triggers_formatted,
        "max_daily_notifications": strategy.max_daily_notifications,
        "quiet_hours": {
            "start": strategy.quiet_hours[0].isoformat(),
            "end": strategy.quiet_hours[1].isoformat(),
        },
        "research_note": "Context-aware interventions are 2.8x more effective than scheduled reminders",
    }


@router.post("/suggestions/optimal-time", response_model=dict)
async def suggest_optimal_time(request: OptimalTimeRequest):
    """
    Suggest optimal time for habit based on type.

    Research: Morning habits form 43% more reliably than evening habits.

    Returns:
        Recommended time preference with reasoning
    """
    habit_formation = get_habit_formation()

    try:
        optimal_time = habit_formation.suggest_optimal_time(request.habit_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error suggesting optimal time: {str(e)}",
        )

    reasoning_map = {
        HabitTimePreference.MORNING: "Morning habits form 43% more reliably and benefit from high willpower",
        HabitTimePreference.WITH_MEAL: "Meal-based habits leverage existing routines and timing",
        HabitTimePreference.AFTER_WORKOUT: "Post-workout stacking ensures consistency and logical connection",
        HabitTimePreference.EVENING: "Evening habits work for wind-down routines",
    }

    return {
        "habit_type": request.habit_type.value,
        "recommended_time": optimal_time.value,
        "reasoning": reasoning_map.get(
            optimal_time, "This timing aligns with your habit type"
        ),
        "research_note": "Morning habits form 43% more reliably (University of South Australia 2024)",
    }


@router.post("/suggestions/difficulty", response_model=dict)
async def suggest_difficulty(request: DifficultyRequest):
    """
    Suggest difficulty level based on habit description.

    Difficulty affects formation timeline:
    - Simple: ~21 days (single action, <5 min, minimal prep)
    - Moderate: ~66 days (multiple steps, 5-20 min, some prep)
    - Complex: 4-7 months (many steps, >20 min, significant skill)

    Returns:
        Recommended difficulty with timeline
    """
    habit_formation = get_habit_formation()

    try:
        difficulty = habit_formation.suggest_difficulty(request.habit_description)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error suggesting difficulty: {str(e)}",
        )

    timeline_days = {
        HabitDifficulty.SIMPLE: 21,
        HabitDifficulty.MODERATE: 66,
        HabitDifficulty.COMPLEX: 120,
    }

    descriptions = {
        HabitDifficulty.SIMPLE: "Single action, minimal preparation (<5 minutes)",
        HabitDifficulty.MODERATE: "Multiple steps, some preparation (5-20 minutes)",
        HabitDifficulty.COMPLEX: "Many steps, significant preparation or skill (>20 minutes)",
    }

    return {
        "habit_description": request.habit_description,
        "recommended_difficulty": difficulty.value,
        "description": descriptions[difficulty],
        "estimated_formation_days": timeline_days[difficulty],
        "research_note": "Median habit formation is 59-66 days, but varies widely by complexity (18-254 days)",
    }


# Export router
__all__ = ["router"]
