"""
HRV Recovery System API Endpoints

REST API for HRV trend analysis, recovery scoring, and auto-intensity adjustment.

Sprint 34: HRV Recovery System
"""

from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Query, Depends, Request
from pydantic import BaseModel, Field

from app.core.auth import get_current_user_id
from app.core.rate_limit import limiter

from app.recovery.hrv_analyzer import (
    HRVAnalyzer,
    HRVDataPoint,
    HRVTrend,
    get_hrv_analyzer,
)
from app.recovery.recovery_score import (
    RecoveryScoreCalculator,
    RecoveryScore,
    get_recovery_calculator,
)
from app.recovery.intensity_adjuster import (
    IntensityAdjuster,
    IntensityRecommendation,
    get_intensity_adjuster,
)
from app.workout_gen.generator import Workout, Exercise


router = APIRouter(prefix="/recovery", tags=["recovery"])


# Request/Response Models


class HRVDataRequest(BaseModel):
    """Single HRV measurement"""

    timestamp: datetime
    rmssd_ms: float = Field(..., ge=0, description="RMSSD in milliseconds")
    sdnn_ms: Optional[float] = Field(None, ge=0)
    quality_score: float = Field(default=1.0, ge=0, le=1.0)


class HRVTrendRequest(BaseModel):
    """Request for HRV trend analysis"""

    current_hrv: HRVDataRequest
    historical_data: list[HRVDataRequest] = Field(
        ..., min_length=7, description="At least 7 days of historical data"
    )


class RecoveryScoreRequest(BaseModel):
    """Request for composite recovery score"""

    # HRV data
    current_hrv_rmssd: Optional[float] = Field(None, ge=0)
    hrv_history: Optional[list[HRVDataRequest]] = None

    # Sleep data
    sleep_quality: Optional[float] = Field(None, ge=0, le=10)
    sleep_duration_hours: Optional[float] = Field(None, ge=0, le=24)

    # Heart rate data
    resting_heart_rate: Optional[int] = Field(None, ge=30, le=200)
    baseline_rhr: Optional[int] = Field(None, ge=30, le=200)

    # Subjective
    subjective_readiness: Optional[float] = Field(None, ge=1, le=10)

    # Historical scores for trending
    historical_scores: Optional[list[float]] = None


class WorkoutAdjustmentRequest(BaseModel):
    """Request to adjust workout based on recovery"""

    # Workout to adjust
    workout: dict  # Workout object as dict

    # Recovery score
    recovery_score: float = Field(..., ge=0, le=100)
    recovery_category: str

    # Optional: Full recovery context
    hrv_rmssd: Optional[float] = None
    hrv_percent_from_baseline: Optional[float] = None


class OvertTrainingCheckRequest(BaseModel):
    """Request to check for overtraining markers"""

    hrv_history: list[HRVDataRequest] = Field(
        ..., min_length=14, description="At least 14 days of HRV data"
    )


# Endpoints


@router.post("/hrv/analyze")
@limiter.limit("30/minute")
async def analyze_hrv_trend(request: Request, body: HRVTrendRequest, user_id: str = Depends(get_current_user_id)):
    """
    Analyze HRV trend and determine recovery state.

    Requires at least 7 days of historical data for baseline calculation.

    Returns:
        HRV trend analysis with recovery state and recommendations
    """
    try:
        analyzer = get_hrv_analyzer()

        # Convert request data to HRVDataPoint objects
        current = HRVDataPoint(
            timestamp=body.current_hrv.timestamp,
            rmssd_ms=body.current_hrv.rmssd_ms,
            sdnn_ms=body.current_hrv.sdnn_ms,
            quality_score=body.current_hrv.quality_score,
        )

        historical = [
            HRVDataPoint(
                timestamp=h.timestamp,
                rmssd_ms=h.rmssd_ms,
                sdnn_ms=h.sdnn_ms,
                quality_score=h.quality_score,
            )
            for h in body.historical_data
        ]

        # Analyze trend
        trend = analyzer.analyze_trend(current, historical)

        return {
            "success": True,
            "current_value": trend.current_value,
            "baseline": {
                "mean_rmssd": trend.baseline.mean_rmssd,
                "std_rmssd": trend.baseline.std_rmssd,
                "coefficient_of_variation": trend.baseline.coefficient_of_variation,
                "sample_size": trend.baseline.sample_size,
                "normal_range": trend.baseline.normal_range,
            },
            "percent_from_baseline": trend.percent_from_baseline,
            "recovery_state": trend.recovery_state.value,
            "confidence": trend.confidence,
            "trend_direction": trend.trend_direction,
            "days_in_state": trend.days_in_state,
            "training_recommendation": trend.training_recommendation,
            "notes": trend.notes,
            "visualization": {
                "last_7_days": [
                    {"timestamp": d.timestamp.isoformat(), "rmssd": d.rmssd_ms}
                    for d in trend.last_7_days
                ],
                "last_30_days": [
                    {"timestamp": d.timestamp.isoformat(), "rmssd": d.rmssd_ms}
                    for d in trend.last_30_days
                ],
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"HRV analysis failed: {str(e)}")


@router.post("/score")
@limiter.limit("30/minute")
async def calculate_recovery_score(request: Request, body: RecoveryScoreRequest, user_id: str = Depends(get_current_user_id)):
    """
    Calculate comprehensive recovery score from multiple metrics.

    Composite score based on:
    - HRV (40%)
    - Sleep quality (25%)
    - Sleep duration (15%)
    - Resting HR (10%)
    - Subjective readiness (10%)

    Returns:
        Recovery score with category and training recommendations
    """
    try:
        calculator = get_recovery_calculator()

        # Prepare HRV data if provided
        current_hrv = None
        hrv_history = None

        if body.current_hrv_rmssd and body.hrv_history:
            current_hrv = HRVDataPoint(
                timestamp=datetime.now(),
                rmssd_ms=body.current_hrv_rmssd,
            )
            hrv_history = [
                HRVDataPoint(
                    timestamp=h.timestamp,
                    rmssd_ms=h.rmssd_ms,
                    sdnn_ms=h.sdnn_ms,
                    quality_score=h.quality_score,
                )
                for h in body.hrv_history
            ]

        # Calculate score
        score = await calculator.calculate(
            current_hrv=current_hrv,
            hrv_history=hrv_history,
            sleep_quality=body.sleep_quality,
            sleep_duration_hours=body.sleep_duration_hours,
            resting_heart_rate=body.resting_heart_rate,
            baseline_rhr=body.baseline_rhr,
            subjective_readiness=body.subjective_readiness,
            historical_scores=body.historical_scores,
        )

        return {
            "success": True,
            "composite_score": score.composite_score,
            "category": score.category.value,
            "component_scores": {
                "hrv": score.hrv_score,
                "sleep_quality": score.sleep_quality_score,
                "sleep_duration": score.sleep_duration_score,
                "rhr": score.rhr_score,
                "subjective": score.subjective_score,
            },
            "hrv_analysis": {
                "state": score.hrv_state.value if score.hrv_state else None,
                "percent_from_baseline": score.hrv_percent_from_baseline,
            },
            "training_adjustment": score.training_adjustment,
            "recommendations": {
                "intensity": score.intensity_recommendation,
                "volume": score.volume_recommendation,
            },
            "notes": score.notes,
            "warnings": score.warnings,
            "trends": {
                "last_7_days": score.trend_7_days,
                "last_30_days": score.trend_30_days,
            },
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Recovery score calculation failed: {str(e)}"
        )


@router.post("/adjust-workout")
@limiter.limit("30/minute")
async def adjust_workout(request: Request, body: WorkoutAdjustmentRequest, user_id: str = Depends(get_current_user_id)):
    """
    Auto-adjust workout based on recovery state.

    Applies recovery-based modifications:
    - EXCELLENT: Increase load/volume
    - GOOD: No adjustment
    - MODERATE: Reduce volume 10-20%
    - POOR: Reduce volume 30-40%, reduce RPE
    - CRITICAL: Active recovery only

    Returns:
        Original and adjusted workout with explanation
    """
    try:
        adjuster = get_intensity_adjuster()

        # Parse workout from dict
        workout_dict = body.workout
        workout = Workout(
            day_number=workout_dict.get("day_number", 1),
            week_number=workout_dict.get("week_number", 1),
            name=workout_dict.get("name", "Workout"),
            exercises=[
                Exercise(
                    name=e.get("name", ""),
                    sets=e.get("sets", 3),
                    reps=e.get("reps", "10"),
                    rpe=e.get("rpe"),
                    rest_seconds=e.get("rest_seconds", 90),
                    tempo=e.get("tempo"),
                    notes=e.get("notes"),
                    substitutions=e.get("substitutions", []),
                )
                for e in workout_dict.get("exercises", [])
            ],
            warmup_notes=workout_dict.get("warmup_notes"),
            cooldown_notes=workout_dict.get("cooldown_notes"),
            total_duration_minutes=workout_dict.get("total_duration_minutes", 60),
        )

        # Create recovery score object for adjustment
        from app.recovery.recovery_score import RecoveryScore, RecoveryCategory

        recovery_score = RecoveryScore(
            composite_score=body.recovery_score,
            category=RecoveryCategory(body.recovery_category),
            hrv_rmssd=body.hrv_rmssd,
            hrv_percent_from_baseline=body.hrv_percent_from_baseline,
        )

        # Adjust workout
        recommendation = adjuster.adjust_workout(workout, recovery_score)

        return {
            "success": True,
            "recovery_context": {
                "score": recommendation.recovery_score,
                "category": recommendation.recovery_category.value,
                "adjustment_factor": recommendation.adjustment_factor,
            },
            "original_workout": {
                "name": recommendation.original_workout.name,
                "exercises": [
                    {
                        "name": e.name,
                        "sets": e.sets,
                        "reps": e.reps,
                        "rpe": e.rpe,
                    }
                    for e in recommendation.original_workout.exercises
                ],
            },
            "adjusted_workout": {
                "name": recommendation.adjusted_workout.name,
                "exercises": [
                    {
                        "name": e.name,
                        "sets": e.sets,
                        "reps": e.reps,
                        "rpe": e.rpe,
                        "rest_seconds": e.rest_seconds,
                    }
                    for e in recommendation.adjusted_workout.exercises
                ],
            },
            "changes": {
                "sets_reduced": recommendation.sets_reduced,
                "exercises_removed": recommendation.exercises_removed,
                "rpe_reduced": recommendation.rpe_reduced,
                "rest_increased": recommendation.rest_increased,
            },
            "reasoning": recommendation.reasoning,
            "warnings": recommendation.warnings,
            "notes": recommendation.notes,
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Workout adjustment failed: {str(e)}"
        )


@router.post("/overtraining/check")
@limiter.limit("30/minute")
async def check_overtraining(request: Request, body: OvertTrainingCheckRequest, user_id: str = Depends(get_current_user_id)):
    """
    Check for overtraining markers.

    Analyzes HRV trends for signs of:
    - Sustained HRV decline (>10% for 5+ days)
    - High variability (CV >15%)
    - Chronic suppression

    Requires at least 14 days of HRV data.

    Returns:
        Risk level and detected markers
    """
    try:
        analyzer = get_hrv_analyzer()

        # Convert to HRVDataPoint objects
        hrv_data = [
            HRVDataPoint(
                timestamp=h.timestamp,
                rmssd_ms=h.rmssd_ms,
                sdnn_ms=h.sdnn_ms,
                quality_score=h.quality_score,
            )
            for h in body.hrv_history
        ]

        # Check for markers
        result = analyzer.detect_overtraining_markers(hrv_data)

        return {
            "success": True,
            "risk_level": result["risk_level"],
            "markers": result["markers"],
            "note": result["note"],
        }

    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Overtraining check failed: {str(e)}"
        )


@router.get("/health")
async def health_check():
    """Health check for recovery system"""
    return {
        "status": "healthy",
        "service": "HRV Recovery System",
        "features": {
            "hrv_trend_analysis": True,
            "recovery_score": True,
            "auto_adjustment": True,
            "overtraining_detection": True,
        },
        "research_based": {
            "hrv_weighting": "Plews et al., 2013",
            "acwr": "Gabbett, 2016",
            "baseline_method": "Buchheit, 2014",
        },
    }
