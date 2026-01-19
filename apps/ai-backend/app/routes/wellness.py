"""
Wellness & Mental Health API Routes

RESTful API endpoints for mental health screening, mood-boosting workouts,
and crisis resources.

⚠️ CRITICAL LEGAL DISCLAIMER:
All screening tools are for INFORMATIONAL PURPOSES ONLY and do NOT constitute
medical advice, diagnosis, or treatment. Users in crisis must be directed to
emergency resources immediately.

Sprint 37: Mental Health Integration
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from app.wellness.screening import (
    get_wellness_screening,
    ScreeningType,
    ScreeningSeverity,
    ScreeningResult,
)
from app.wellness.interventions import (
    get_mood_boosting_workouts,
    WorkoutIntensity,
    MoodWorkoutType,
)
from app.wellness.crisis_resources import (
    get_crisis_resources,
    UrgencyLevel,
    ResourceType,
)


router = APIRouter(prefix="/api/v1/wellness", tags=["wellness"])


# Request/Response Models


class ScreeningQuestionsRequest(BaseModel):
    """Request for screening questions"""

    screening_type: ScreeningType = Field(
        ScreeningType.COMBINED, description="Type of screening to get questions for"
    )


class ScreeningAssessmentRequest(BaseModel):
    """Request for screening assessment"""

    screening_type: ScreeningType = Field(
        ..., description="Type of screening (phq2, gad2, or combined)"
    )
    responses: dict[str, int] = Field(
        ...,
        description="Map of question ID to response value (0-3)",
        example={"phq2_q1": 2, "phq2_q2": 1, "gad2_q1": 3, "gad2_q2": 2},
    )


class WorkoutRecommendationRequest(BaseModel):
    """Request for mood-boosting workout recommendations"""

    screening_severity: ScreeningSeverity = Field(
        ..., description="Severity from screening result"
    )
    screening_type: ScreeningType = Field(
        ..., description="Type of screening completed"
    )
    current_activity_level: str = Field(
        "sedentary",
        description="Current exercise frequency",
        pattern="^(sedentary|light|moderate|active)$",
    )
    preferences: Optional[List[str]] = Field(
        None, description="User workout preferences (e.g., ['outdoor', 'solo', 'music'])"
    )


class CrisisResourcesRequest(BaseModel):
    """Request for crisis resources"""

    urgency_level: UrgencyLevel = Field(
        ..., description="Urgency level based on screening"
    )
    population: Optional[str] = Field(
        None, description="Specific population (e.g., 'veterans', 'LGBTQ+')"
    )


# API Endpoints


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "wellness",
        "version": "1.0.0",
        "disclaimer": "FOR INFORMATIONAL PURPOSES ONLY - NOT MEDICAL ADVICE",
    }


@router.post("/screening/questions", response_model=dict)
async def get_screening_questions(request: ScreeningQuestionsRequest):
    """
    Get screening questions for PHQ-2, GAD-2, or combined assessment.

    Returns:
        List of screening questions with response options (0-3 scale)
    """
    screening = get_wellness_screening()

    try:
        questions = screening.get_questions(request.screening_type)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving questions: {str(e)}",
        )

    # Format questions for response
    questions_formatted = [
        {
            "id": q.id,
            "text": q.text,
            "type": q.type.value,
            "options": q.options,
        }
        for q in questions
    ]

    return {
        "screening_type": request.screening_type.value,
        "questions": questions_formatted,
        "disclaimer": "⚠️ This screening is for INFORMATIONAL PURPOSES ONLY - not a diagnosis. "
        "Professional evaluation recommended if symptoms persist.",
    }


@router.post("/screening/assess", response_model=dict)
async def assess_screening(request: ScreeningAssessmentRequest):
    """
    Calculate screening score and generate recommendations.

    Validated PHQ-2/GAD-2 screening with:
    - Score calculation (0-6 scale)
    - Severity classification (minimal, mild, moderate, severe)
    - Follow-up and professional referral flags
    - Exercise interventions (BMJ 2024 research)
    - Crisis resources if needed

    ⚠️ DISCLAIMER: For informational purposes only. Not a diagnosis.

    Returns:
        ScreeningResult with score, severity, recommendations, and resources
    """
    screening = get_wellness_screening()

    try:
        result = screening.calculate_score(
            responses=request.responses, screening_type=request.screening_type
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating screening: {str(e)}",
        )

    # Check for crisis concern and add crisis resources
    crisis_resources_list = []
    if result.crisis_concern or result.severity == ScreeningSeverity.SEVERE:
        crisis = get_crisis_resources()
        crisis_resources_formatted = crisis.get_all_crisis_resources()
        crisis_resources_list = [
            crisis.format_resource_for_display(r) for r in crisis_resources_formatted
        ]

    return {
        "screening_type": result.type.value,
        "score": result.score,
        "severity": result.severity.value,
        "description": result.description,
        "needs_followup": result.needs_followup,
        "needs_professional_referral": result.needs_professional_referral,
        "crisis_concern": result.crisis_concern,
        "recommendations": result.recommendations,
        "exercise_interventions": result.exercise_interventions,
        "professional_resources": result.professional_resources,
        "crisis_resources": crisis_resources_list if crisis_resources_list else None,
        "screened_at": result.screened_at.isoformat(),
        "notes": result.notes,
    }


@router.post("/workouts/recommend", response_model=dict)
async def recommend_workouts(request: WorkoutRecommendationRequest):
    """
    Get mood-boosting workout recommendations based on screening results.

    Research-backed exercise interventions from BMJ 2024 meta-analysis:
    - Dance: Large effect (Hedges' g=-0.96)
    - Walking/Jogging: Medium-large effect (g=-0.62)
    - Yoga: Medium effect (g=-0.55)
    - Strength training: Medium effect (g=-0.49)

    Returns:
        Primary recommendation + alternatives with practical guidance
    """
    workouts = get_mood_boosting_workouts()

    try:
        plan = workouts.recommend_workouts(
            severity=request.screening_severity,
            screening_type=request.screening_type,
            current_activity_level=request.current_activity_level,
            preferences=request.preferences,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating workout recommendations: {str(e)}",
        )

    # Format primary recommendation
    def format_workout(workout):
        return {
            "workout_type": workout.workout_type.value,
            "intensity": workout.intensity.value,
            "duration_minutes": workout.duration_minutes,
            "frequency_per_week": workout.frequency_per_week,
            "title": workout.title,
            "description": workout.description,
            "effect_size": workout.effect_size,
            "research_notes": workout.research_notes,
            "how_to_start": workout.how_to_start,
            "progression": workout.progression,
            "barriers_solutions": workout.barriers_solutions,
            "mechanisms": workout.mechanisms,
            "contraindications": workout.contraindications,
            "modifications": workout.modifications,
        }

    return {
        "primary_recommendation": format_workout(plan.primary_recommendation),
        "alternative_options": [format_workout(w) for w in plan.alternative_options],
        "adherence_tips": plan.adherence_tips,
        "social_strategies": plan.social_strategies,
        "notes": plan.notes,
    }


@router.post("/resources/crisis", response_model=dict)
async def get_crisis_resources_endpoint(request: CrisisResourcesRequest):
    """
    Get crisis resources and professional mental health support.

    Returns 24/7 crisis hotlines, emergency services, therapist finders,
    telehealth platforms, and support groups based on urgency level.

    🆘 IMMEDIATE CRISIS: Call 988 (Suicide & Crisis Lifeline) or 911

    Returns:
        Categorized resources with contact info and availability
    """
    crisis = get_crisis_resources()

    try:
        # Get resources by severity
        recommendations = crisis.get_resources_by_severity(request.urgency_level)

        # Add population-specific resources if requested
        population_resources = []
        if request.population:
            population_resources = crisis.get_population_specific_resources(
                request.population
            )

        # Format resources
        def format_resources(resources):
            return [crisis.format_resource_for_display(r) for r in resources]

        return {
            "urgency_level": request.urgency_level.value,
            "immediate_resources": format_resources(
                recommendations.immediate_resources
            ),
            "professional_resources": format_resources(
                recommendations.professional_resources
            ),
            "support_resources": format_resources(recommendations.support_resources),
            "population_specific": (
                format_resources(population_resources) if population_resources else None
            ),
            "notes": recommendations.notes,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving crisis resources: {str(e)}",
        )


@router.get("/resources/all-crisis", response_model=dict)
async def get_all_crisis_resources_endpoint():
    """
    Get all crisis hotlines and emergency resources.

    Returns complete list of 24/7 crisis support including:
    - 988 Suicide & Crisis Lifeline
    - Crisis Text Line
    - Veterans Crisis Line
    - Trevor Project (LGBTQ+ youth)
    - 911 / Emergency Room

    Returns:
        List of all crisis resources with full details
    """
    crisis = get_crisis_resources()

    try:
        all_crisis = crisis.get_all_crisis_resources()
        return {
            "resources": [
                crisis.format_resource_for_display(r) for r in all_crisis
            ],
            "count": len(all_crisis),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving crisis resources: {str(e)}",
        )


@router.get("/resources/professional", response_model=dict)
async def get_professional_resources_endpoint():
    """
    Get all professional mental health resources.

    Includes therapist finders and telehealth platforms:
    - Psychology Today
    - NAMI Helpline
    - Insurance provider directories
    - BetterHelp, Talkspace
    - Open Path Collective (low-cost)

    Returns:
        List of professional resources with contact info and costs
    """
    crisis = get_crisis_resources()

    try:
        all_professional = crisis.get_all_professional_resources()
        return {
            "resources": [
                crisis.format_resource_for_display(r) for r in all_professional
            ],
            "count": len(all_professional),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving professional resources: {str(e)}",
        )


@router.get("/resources/support-groups", response_model=dict)
async def get_support_groups_endpoint():
    """
    Get all peer support group resources.

    Includes free support groups:
    - NAMI Support Groups
    - DBSA (Depression and Bipolar Support Alliance)

    Returns:
        List of support group resources
    """
    crisis = get_crisis_resources()

    try:
        all_support = crisis.get_all_support_resources()
        return {
            "resources": [crisis.format_resource_for_display(r) for r in all_support],
            "count": len(all_support),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving support group resources: {str(e)}",
        )


# Export router
__all__ = ["router"]
