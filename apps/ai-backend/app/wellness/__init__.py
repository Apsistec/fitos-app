"""
Wellness & Mental Health Integration Module

Validated mental health screening (PHQ-2/GAD-2) with safety guardrails
and exercise-based interventions for depression and anxiety.

⚠️ LEGAL DISCLAIMER:
This module provides screening tools for INFORMATIONAL PURPOSES ONLY.
It is NOT a diagnostic tool and does NOT replace professional medical advice.
Legal review REQUIRED before production deployment.

Research:
- BMJ 2024: Exercise comparable to psychotherapy for depression (medium effect: d=-0.43)
- PHQ-2/GAD-2: Validated ultra-brief screening tools (sensitivity 86%, specificity 83%)
- Dance interventions show large effects (Hedges' g=-0.96)

Sprint 37: Mental Health Integration
"""

from app.wellness.screening import (
    WellnessScreening,
    ScreeningResult,
    ScreeningSeverity,
    get_wellness_screening,
)
from app.wellness.interventions import (
    MoodBoostingWorkouts,
    WorkoutRecommendation,
    get_mood_boosting_workouts,
)
from app.wellness.crisis_resources import (
    CrisisResources,
    CrisisResource,
    get_crisis_resources,
)

__all__ = [
    "WellnessScreening",
    "ScreeningResult",
    "ScreeningSeverity",
    "get_wellness_screening",
    "MoodBoostingWorkouts",
    "WorkoutRecommendation",
    "get_mood_boosting_workouts",
    "CrisisResources",
    "CrisisResource",
    "get_crisis_resources",
]
