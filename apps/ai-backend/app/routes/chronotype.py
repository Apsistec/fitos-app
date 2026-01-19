"""
Chronotype API Routes

RESTful API endpoints for chronotype assessment and optimization.

Sprint 35: Chronotype Optimization
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional
from datetime import time as time_type

from app.chronotype.assessment import (
    get_chronotype_assessment,
    ChronotypeCategory,
    ChronotypeResult,
    Question,
)
from app.chronotype.optimizer import (
    get_chronotype_optimizer,
    WorkoutType,
    OptimalWindow,
    DailySchedule,
)
from app.chronotype.templates import (
    get_template_generator,
    TemplateType,
    ChronotypeTemplate,
)


router = APIRouter(prefix="/api/v1/chronotype", tags=["chronotype"])


# Request/Response Models


class AssessmentQuestionsResponse(BaseModel):
    """Response containing assessment questions"""

    questions: list[dict]

    class Config:
        json_schema_extra = {
            "example": {
                "questions": [
                    {
                        "id": "wake_preference",
                        "text": "If you were entirely free to plan your day, at what time would you prefer to wake up?",
                        "options": [
                            {"text": "5:00 AM - 6:30 AM", "value": 5},
                            {"text": "6:30 AM - 7:45 AM", "value": 4},
                        ],
                        "category": "wake",
                    }
                ]
            }
        }


class AssessmentRequest(BaseModel):
    """Request to calculate chronotype from responses"""

    responses: dict[str, int] = Field(
        ...,
        description="Question ID to selected value mapping",
        examples=[{"wake_preference": 4, "sleep_preference": 3}],
    )


class AssessmentResponse(BaseModel):
    """Chronotype assessment result"""

    category: str
    score: int
    confidence: float
    natural_wake_time: str
    natural_sleep_time: str
    peak_performance_window: dict[str, str]
    worst_performance_window: dict[str, str]
    description: str
    strengths: list[str]
    challenges: list[str]
    recommendations: list[str]

    class Config:
        json_schema_extra = {
            "example": {
                "category": "moderate_morning",
                "score": 65,
                "confidence": 0.85,
                "natural_wake_time": "06:30:00",
                "natural_sleep_time": "22:00:00",
                "peak_performance_window": {"start": "07:00:00", "end": "11:00:00"},
                "worst_performance_window": {"start": "19:00:00", "end": "23:00:00"},
                "description": "You have a morning preference...",
                "strengths": ["Good morning performance"],
                "challenges": ["Slightly reduced evening performance"],
                "recommendations": ["Schedule main lifts 7-11 AM when possible"],
            }
        }


class OptimalWindowRequest(BaseModel):
    """Request for optimal workout window"""

    chronotype_score: int = Field(
        ..., ge=16, le=86, description="MEQ chronotype score (16-86)"
    )
    workout_type: WorkoutType
    constraints: Optional[dict] = Field(
        None,
        description="Optional scheduling constraints",
        examples=[
            {
                "earliest_time": "06:00:00",
                "latest_time": "20:00:00",
                "excluded_windows": [["12:00:00", "13:00:00"]],
            }
        ],
    )


class OptimalWindowResponse(BaseModel):
    """Optimal training window response"""

    start_time: str
    end_time: str
    performance_multiplier: float
    confidence: float
    reasoning: str
    considerations: list[str]

    class Config:
        json_schema_extra = {
            "example": {
                "start_time": "07:00:00",
                "end_time": "11:00:00",
                "performance_multiplier": 1.08,
                "confidence": 0.9,
                "reasoning": "Strength training optimal during natural performance peak",
                "considerations": [
                    "Allow 2-3 hours after waking for full CNS activation"
                ],
            }
        }


class DailyScheduleRequest(BaseModel):
    """Request for complete daily schedule"""

    chronotype_score: int = Field(..., ge=16, le=86)


class DailyScheduleResponse(BaseModel):
    """Complete daily training schedule"""

    chronotype: str
    strength_window: dict
    power_window: dict
    hypertrophy_window: dict
    endurance_window: dict
    best_overall_time: str
    acceptable_times: list[dict]
    avoid_times: list[dict]
    warm_up_adjustments: dict
    notes: list[str]


class TemplateRequest(BaseModel):
    """Request for workout template"""

    chronotype_score: int = Field(..., ge=16, le=86)
    template_type: TemplateType


class TemplateResponse(BaseModel):
    """Workout template response"""

    name: str
    chronotype: str
    template_type: str
    description: str
    optimal_time_start: str
    optimal_time_end: str
    duration_minutes: int
    warmup_minutes: int
    cooldown_minutes: int
    exercises: list[dict]
    adjustments: list[str]
    considerations: list[str]


# API Endpoints


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "chronotype",
        "version": "1.0.0",
    }


@router.get("/questions", response_model=AssessmentQuestionsResponse)
async def get_assessment_questions():
    """
    Get chronotype assessment questions.

    Returns 5 MEQ-based questions for quick chronotype assessment.
    Based on Randler (2008) reduced MEQ validation.

    Returns:
        List of assessment questions with options
    """
    assessment = get_chronotype_assessment()
    questions = assessment.get_questions()

    # Convert to dict format
    questions_dict = [
        {
            "id": q.id,
            "text": q.text,
            "options": q.options,
            "category": q.category,
        }
        for q in questions
    ]

    return AssessmentQuestionsResponse(questions=questions_dict)


@router.post("/assess", response_model=AssessmentResponse)
async def calculate_chronotype(request: AssessmentRequest):
    """
    Calculate chronotype from assessment responses.

    Takes user responses to MEQ questions and returns complete
    chronotype assessment with category, timing recommendations,
    and personalized insights.

    Args:
        request: Assessment responses

    Returns:
        ChronotypeResult with category and recommendations

    Raises:
        HTTPException: If responses are invalid or incomplete
    """
    assessment = get_chronotype_assessment()

    # Validate responses
    if not request.responses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No responses provided",
        )

    # Get all question IDs
    question_ids = {q.id for q in assessment.get_questions()}

    # Validate all questions answered
    missing = question_ids - set(request.responses.keys())
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Missing responses for questions: {missing}",
        )

    # Calculate chronotype
    try:
        result = assessment.calculate_score(request.responses)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating chronotype: {str(e)}",
        )

    # Format response
    return AssessmentResponse(
        category=result.category.value,
        score=result.score,
        confidence=result.confidence,
        natural_wake_time=result.natural_wake_time.isoformat(),
        natural_sleep_time=result.natural_sleep_time.isoformat(),
        peak_performance_window={
            "start": result.peak_performance_window[0].isoformat(),
            "end": result.peak_performance_window[1].isoformat(),
        },
        worst_performance_window={
            "start": result.worst_performance_window[0].isoformat(),
            "end": result.worst_performance_window[1].isoformat(),
        },
        description=result.description,
        strengths=result.strengths,
        challenges=result.challenges,
        recommendations=result.recommendations,
    )


@router.post("/optimal-window", response_model=OptimalWindowResponse)
async def get_optimal_training_window(request: OptimalWindowRequest):
    """
    Get optimal training window for workout type.

    Based on chronotype and workout type (strength, power, etc.),
    returns the optimal time window for peak performance.

    Research-backed performance multipliers from:
    - Facer-Childs et al. (2018): 8.4% performance difference
    - Knaier et al. (2021): Time-of-day effects on strength

    Args:
        request: Chronotype score, workout type, optional constraints

    Returns:
        Optimal training window with timing and reasoning
    """
    assessment = get_chronotype_assessment()
    optimizer = get_chronotype_optimizer()

    # Create minimal chronotype result for optimizer
    # (In production, this would fetch from user profile)
    category = assessment._determine_category(request.chronotype_score)

    result = assessment.calculate_score(
        {"wake_preference": 3, "sleep_preference": 3, "morning_alertness": 3, "peak_time": 3, "evening_tiredness": 3}
    )

    # Override with actual category
    result.category = category
    result.score = request.chronotype_score

    # Get optimal window
    try:
        window = optimizer.get_optimal_window(
            chronotype_result=result,
            workout_type=request.workout_type,
            constraints=request.constraints,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating optimal window: {str(e)}",
        )

    return OptimalWindowResponse(
        start_time=window.start_time.isoformat(),
        end_time=window.end_time.isoformat(),
        performance_multiplier=window.performance_multiplier,
        confidence=window.confidence,
        reasoning=window.reasoning,
        considerations=window.considerations,
    )


@router.post("/daily-schedule", response_model=DailyScheduleResponse)
async def get_daily_training_schedule(request: DailyScheduleRequest):
    """
    Get complete daily training schedule.

    Returns optimal windows for all workout types (strength, power,
    hypertrophy, endurance) plus timing recommendations and
    warm-up adjustments.

    Args:
        request: Chronotype score

    Returns:
        Complete daily schedule with all workout type windows
    """
    assessment = get_chronotype_assessment()
    optimizer = get_chronotype_optimizer()

    # Create chronotype result
    category = assessment._determine_category(request.chronotype_score)
    result = assessment.calculate_score(
        {"wake_preference": 3, "sleep_preference": 3, "morning_alertness": 3, "peak_time": 3, "evening_tiredness": 3}
    )
    result.category = category
    result.score = request.chronotype_score

    # Generate schedule
    try:
        schedule = optimizer.create_daily_schedule(result)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating schedule: {str(e)}",
        )

    # Format response
    def format_window(window):
        return {
            "start_time": window.start_time.isoformat(),
            "end_time": window.end_time.isoformat(),
            "performance_multiplier": window.performance_multiplier,
            "confidence": window.confidence,
            "reasoning": window.reasoning,
            "considerations": window.considerations,
        }

    return DailyScheduleResponse(
        chronotype=schedule.chronotype.value,
        strength_window=format_window(schedule.strength_window),
        power_window=format_window(schedule.power_window),
        hypertrophy_window=format_window(schedule.hypertrophy_window),
        endurance_window=format_window(schedule.endurance_window),
        best_overall_time=schedule.best_overall_time.isoformat(),
        acceptable_times=[
            {"start": start.isoformat(), "end": end.isoformat()}
            for start, end in schedule.acceptable_times
        ],
        avoid_times=[
            {"start": start.isoformat(), "end": end.isoformat()}
            for start, end in schedule.avoid_times
        ],
        warm_up_adjustments=schedule.warm_up_adjustments,
        notes=schedule.notes,
    )


@router.post("/template", response_model=TemplateResponse)
async def get_workout_template(request: TemplateRequest):
    """
    Get chronotype-optimized workout template.

    Returns pre-built workout template with exercises, sets, reps,
    and timing optimized for the user's chronotype.

    Args:
        request: Chronotype score and template type

    Returns:
        Complete workout template
    """
    assessment = get_chronotype_assessment()
    generator = get_template_generator()

    # Get chronotype category
    category = assessment._determine_category(request.chronotype_score)

    # Get template
    try:
        template = generator.get_template(
            chronotype=category,
            template_type=request.template_type,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating template: {str(e)}",
        )

    # Format exercises
    exercises = [
        {
            "name": ex.name,
            "sets": ex.sets,
            "reps": ex.reps,
            "rpe": ex.rpe,
            "rest_seconds": ex.rest_seconds,
            "tempo": ex.tempo,
            "notes": ex.notes,
        }
        for ex in template.exercises
    ]

    return TemplateResponse(
        name=template.name,
        chronotype=template.chronotype.value,
        template_type=template.template_type.value,
        description=template.description,
        optimal_time_start=template.optimal_time_start.isoformat(),
        optimal_time_end=template.optimal_time_end.isoformat(),
        duration_minutes=template.duration_minutes,
        warmup_minutes=template.warmup_minutes,
        cooldown_minutes=template.cooldown_minutes,
        exercises=exercises,
        adjustments=template.adjustments,
        considerations=template.considerations,
    )


# Export router
__all__ = ["router"]
