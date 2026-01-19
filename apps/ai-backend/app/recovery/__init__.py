"""
HRV Recovery System

Continuous HRV monitoring and auto-adjustment of training intensity based on
recovery state.

Features:
- HRV trend analysis with baseline calculation
- Recovery score visualization
- Auto-intensity adjustment workflows
- Integration with workout delivery

Sprint 34: HRV Recovery System
"""

from app.recovery.hrv_analyzer import HRVAnalyzer, HRVTrend, RecoveryState
from app.recovery.recovery_score import RecoveryScoreCalculator, RecoveryScore
from app.recovery.intensity_adjuster import IntensityAdjuster, IntensityRecommendation

__all__ = [
    "HRVAnalyzer",
    "HRVTrend",
    "RecoveryState",
    "RecoveryScoreCalculator",
    "RecoveryScore",
    "IntensityAdjuster",
    "IntensityRecommendation",
]
