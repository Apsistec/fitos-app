"""
Workout Generation API Endpoints

REST API for AI-powered workout program generation.

Sprint 33: AI Workout Generation
"""

from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from app.workout_gen.generator import (
    WorkoutGenerator,
    GenerationConfig,
    ProgramGoal,
    ExperienceLevel,
    get_workout_generator,
)
from app.workout_gen.periodization import (
    Periodizer,
    PeriodizationModel,
    get_periodizer,
)
from app.workout_gen.autoregulation import (
    LoadManager,
    ReadinessScore,
    get_load_manager,
)


router = APIRouter(prefix="/workout-gen", tags=["workout-generation"])


# Request/Response Models


class GenerateFromTextRequest(BaseModel):
    """Request to generate program from natural language"""

    prompt: str = Field(
        ...,
        description="Natural language description of desired program",
        examples=[
            "Create a 12-week powerlifting program for intermediate lifters",
            "Build a 4-day upper/lower hypertrophy split",
        ],
    )
    trainer_id: Optional[str] = None


class GenerateFromConfigRequest(BaseModel):
    """Request to generate program from structured config"""

    goal: ProgramGoal
    experience_level: ExperienceLevel
    days_per_week: int = Field(..., ge=2, le=7)
    duration_weeks: int = Field(..., ge=4, le=52)
    equipment_available: list[str] = Field(default_factory=list)
    injuries_limitations: list[str] = Field(default_factory=list)
    session_duration_minutes: int = Field(default=60, ge=30, le=120)
    include_deload: bool = True
    deload_frequency_weeks: int = Field(default=4, ge=3, le=6)
    specific_sport: Optional[str] = None
    focus_muscle_groups: list[str] = Field(default_factory=list)
    avoid_exercises: list[str] = Field(default_factory=list)
    trainer_id: Optional[str] = None


class PeriodizationRequest(BaseModel):
    """Request to create periodization blocks"""

    model: PeriodizationModel
    total_weeks: int = Field(..., ge=4, le=52)
    goal: Optional[Literal["strength", "hypertrophy", "power"]] = "strength"
    deload_frequency: int = Field(default=4, ge=3, le=6)


class ReadinessRequest(BaseModel):
    """Request to calculate readiness score"""

    hrv_score: Optional[float] = Field(None, ge=0, le=100)
    sleep_quality: Optional[float] = Field(None, ge=0, le=10)
    sleep_duration_hours: Optional[float] = Field(None, ge=0, le=24)
    resting_heart_rate: Optional[int] = Field(None, ge=30, le=200)
    subjective_readiness: Optional[float] = Field(None, ge=1, le=10)
    muscle_soreness: Optional[float] = Field(None, ge=0, le=10)
    baseline_rhr: Optional[int] = Field(None, ge=30, le=200)


class AdjustWorkoutRequest(BaseModel):
    """Request to adjust workout based on readiness"""

    planned_sets: int = Field(..., ge=1, le=10)
    planned_reps: str = Field(..., examples=["8-10", "5", "AMRAP"])
    planned_rpe: float = Field(..., ge=1, le=10)
    readiness_score: float = Field(..., ge=0, le=100)


class RPELoadRequest(BaseModel):
    """Request to calculate RPE-based load adjustment"""

    target_rpe: float = Field(..., ge=1, le=10)
    actual_rpe: float = Field(..., ge=1, le=10)
    current_load_kg: float = Field(..., ge=0)


# Endpoints


@router.post("/generate/text")
async def generate_from_text(request: GenerateFromTextRequest):
    """
    Generate workout program from natural language prompt.

    Example prompts:
    - "Create a 12-week powerlifting program for intermediate lifters"
    - "Build a 4-day upper/lower hypertrophy split with deloads every 4 weeks"
    - "Make me a beginner full-body program, 3 days per week, limited to dumbbells and bodyweight"

    Returns:
        Complete workout program with periodization
    """
    try:
        generator = get_workout_generator()
        program = await generator.generate_from_text(
            prompt=request.prompt,
            trainer_id=request.trainer_id,
        )

        return {
            "success": True,
            "program": program.to_dict(),
            "message": f"Generated {program.duration_weeks}-week {program.goal.value} program",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/generate/config")
async def generate_from_config(request: GenerateFromConfigRequest):
    """
    Generate workout program from structured configuration.

    More control than text generation, with explicit parameters.

    Returns:
        Complete workout program
    """
    try:
        config = GenerationConfig(
            goal=request.goal,
            experience_level=request.experience_level,
            days_per_week=request.days_per_week,
            duration_weeks=request.duration_weeks,
            equipment_available=request.equipment_available,
            injuries_limitations=request.injuries_limitations,
            session_duration_minutes=request.session_duration_minutes,
            include_deload=request.include_deload,
            deload_frequency_weeks=request.deload_frequency_weeks,
            specific_sport=request.specific_sport,
            focus_muscle_groups=request.focus_muscle_groups,
            avoid_exercises=request.avoid_exercises,
        )

        generator = get_workout_generator()
        program = await generator.generate_from_config(
            config=config,
            trainer_id=request.trainer_id,
        )

        return {
            "success": True,
            "program": program.to_dict(),
            "message": f"Generated {program.duration_weeks}-week program",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")


@router.post("/periodization")
async def create_periodization(request: PeriodizationRequest):
    """
    Create periodization blocks for a program.

    Returns block-by-block volume/intensity targets.

    Models:
    - linear: Progressive volume → intensity
    - undulating: Daily/weekly variation (DUP)
    - block: Accumulation → Intensification → Realization
    - conjugate: Concurrent max effort + dynamic effort

    Returns:
        List of periodization blocks with targets
    """
    try:
        periodizer = get_periodizer()

        if request.model == PeriodizationModel.LINEAR:
            blocks = periodizer.create_linear_periodization(
                total_weeks=request.total_weeks,
                deload_frequency=request.deload_frequency,
            )
        elif request.model == PeriodizationModel.BLOCK:
            blocks = periodizer.create_block_periodization(
                total_weeks=request.total_weeks,
                goal=request.goal or "strength",
            )
        elif request.model == PeriodizationModel.UNDULATING:
            blocks = periodizer.create_undulating_periodization(
                total_weeks=request.total_weeks,
                variation_frequency="weekly",
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Periodization model {request.model} not yet implemented",
            )

        return {
            "success": True,
            "model": request.model,
            "total_weeks": request.total_weeks,
            "blocks": [
                {
                    "block_number": b.block_number,
                    "block_type": b.block_type.value,
                    "start_week": b.start_week,
                    "duration_weeks": b.duration_weeks,
                    "focus": b.focus,
                    "volume_intensity": {
                        "sets_per_exercise": b.volume_intensity.sets_per_exercise,
                        "reps_per_set": b.volume_intensity.reps_per_set,
                        "intensity_percent_1rm": b.volume_intensity.intensity_percent_1rm,
                        "rpe_target": b.volume_intensity.rpe_target,
                    },
                    "notes": b.notes,
                }
                for b in blocks
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Periodization failed: {str(e)}")


@router.post("/readiness")
async def calculate_readiness(request: ReadinessRequest):
    """
    Calculate training readiness score from recovery metrics.

    Composite score from:
    - HRV (40% weight)
    - Sleep quality (25%)
    - Sleep duration (15%)
    - Resting HR (10%)
    - Subjective readiness (10%)

    Returns:
        Readiness score, level, and recommended load adjustment
    """
    try:
        load_manager = get_load_manager()

        readiness = await load_manager.calculate_readiness(
            hrv_score=request.hrv_score,
            sleep_quality=request.sleep_quality,
            sleep_duration_hours=request.sleep_duration_hours,
            resting_heart_rate=request.resting_heart_rate,
            subjective_readiness=request.subjective_readiness,
            muscle_soreness=request.muscle_soreness,
            baseline_rhr=request.baseline_rhr,
        )

        return {
            "success": True,
            "composite_score": readiness.composite_score,
            "readiness_level": readiness.readiness_level.value,
            "recommended_adjustment": readiness.recommended_adjustment,
            "notes": readiness.notes,
            "warnings": readiness.warnings,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Readiness calculation failed: {str(e)}"
        )


@router.post("/adjust-workout")
async def adjust_workout(request: AdjustWorkoutRequest):
    """
    Adjust planned workout based on readiness score.

    Auto-regulates sets, reps, and RPE based on recovery status.

    Returns:
        Adjusted workout parameters
    """
    try:
        load_manager = get_load_manager()

        # Create readiness object from score
        readiness = ReadinessScore(composite_score=request.readiness_score)

        # Determine readiness level from score
        if request.readiness_score >= 90:
            readiness.readiness_level = "very_high"
            readiness.recommended_adjustment = 1.10
        elif request.readiness_score >= 75:
            readiness.readiness_level = "high"
            readiness.recommended_adjustment = 1.0
        elif request.readiness_score >= 60:
            readiness.readiness_level = "moderate"
            readiness.recommended_adjustment = 0.90
        elif request.readiness_score >= 40:
            readiness.readiness_level = "low"
            readiness.recommended_adjustment = 0.70
        else:
            readiness.readiness_level = "very_low"
            readiness.recommended_adjustment = 0.50

        adjusted_sets, adjusted_reps, adjusted_rpe = load_manager.adjust_workout_load(
            planned_sets=request.planned_sets,
            planned_reps=request.planned_reps,
            planned_rpe=request.planned_rpe,
            readiness=readiness,
        )

        return {
            "success": True,
            "planned": {
                "sets": request.planned_sets,
                "reps": request.planned_reps,
                "rpe": request.planned_rpe,
            },
            "adjusted": {
                "sets": adjusted_sets,
                "reps": adjusted_reps,
                "rpe": adjusted_rpe,
            },
            "adjustment_factor": readiness.recommended_adjustment,
            "readiness_level": readiness.readiness_level,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Workout adjustment failed: {str(e)}"
        )


@router.post("/rpe-load")
async def calculate_rpe_load(request: RPELoadRequest):
    """
    Calculate load adjustment based on RPE feedback.

    Uses RPE to estimate 1RM and adjust load for next session.

    Returns:
        Recommended load for next session
    """
    try:
        load_manager = get_load_manager()

        recommended_load = load_manager.calculate_rpe_based_load(
            target_rpe=request.target_rpe,
            actual_rpe=request.actual_rpe,
            current_load_kg=request.current_load_kg,
        )

        rpe_diff = request.actual_rpe - request.target_rpe
        load_change = recommended_load - request.current_load_kg
        load_change_percent = (load_change / request.current_load_kg) * 100

        return {
            "success": True,
            "current_load_kg": request.current_load_kg,
            "recommended_load_kg": recommended_load,
            "load_change_kg": round(load_change, 1),
            "load_change_percent": round(load_change_percent, 1),
            "rpe_difference": rpe_diff,
            "interpretation": (
                "Increase load - session was easier than planned"
                if rpe_diff < 0
                else "Decrease load - session was harder than planned"
                if rpe_diff > 0
                else "Maintain load - RPE on target"
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"RPE load calculation failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for workout generation service"""
    return {
        "status": "healthy",
        "service": "Workout Generation",
        "features": {
            "natural_language": True,
            "structured_config": True,
            "periodization": ["linear", "block", "undulating"],
            "autoregulation": ["rpe", "hrv", "readiness"],
        },
        "models": {
            "llm": "Claude Sonnet 4.5",
            "temperature": 0.3,
        },
    }
