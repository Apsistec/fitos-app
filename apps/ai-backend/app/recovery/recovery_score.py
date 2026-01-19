"""
Recovery Score Calculator

Composite recovery score combining HRV, sleep, RHR, and subjective metrics.

Research-based weighting:
- HRV: 40% (Plews et al., 2013)
- Sleep Quality: 25% (Fullagar et al., 2015)
- Sleep Duration: 15% (Watson et al., 2015)
- Resting HR: 10% (Achten & Jeukendrup, 2003)
- Subjective: 10% (Saw et al., 2016)

Sprint 34: HRV Recovery System
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Literal
from enum import Enum

from app.recovery.hrv_analyzer import (
    HRVAnalyzer,
    HRVDataPoint,
    RecoveryState,
    get_hrv_analyzer,
)


class RecoveryCategory(str, Enum):
    """Overall recovery category"""

    EXCELLENT = "excellent"  # 85-100: Peak performance ready
    GOOD = "good"  # 70-85: Normal training
    MODERATE = "moderate"  # 55-70: Slight reduction
    POOR = "poor"  # 40-55: Significant reduction
    CRITICAL = "critical"  # <40: Active recovery only


@dataclass
class RecoveryScore:
    """Complete recovery assessment"""

    # Overall score
    composite_score: float  # 0-100
    category: RecoveryCategory
    timestamp: datetime = field(default_factory=datetime.now)

    # Component scores (0-100 each)
    hrv_score: Optional[float] = None
    sleep_quality_score: Optional[float] = None
    sleep_duration_score: Optional[float] = None
    rhr_score: Optional[float] = None
    subjective_score: Optional[float] = None

    # Raw inputs (for reference)
    hrv_rmssd: Optional[float] = None
    sleep_quality: Optional[float] = None
    sleep_duration_hours: Optional[float] = None
    resting_heart_rate: Optional[int] = None
    baseline_rhr: Optional[int] = None
    subjective_readiness: Optional[float] = None

    # HRV trend analysis
    hrv_state: Optional[RecoveryState] = None
    hrv_percent_from_baseline: Optional[float] = None

    # Recommendations
    training_adjustment: float = 1.0  # Multiplier for planned training (0.5-1.2)
    intensity_recommendation: str = ""
    volume_recommendation: str = ""
    notes: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    # Visualization
    trend_7_days: list[float] = field(default_factory=list)  # Last 7 days composite scores
    trend_30_days: list[float] = field(default_factory=list)  # Last 30 days composite scores


class RecoveryScoreCalculator:
    """
    Recovery Score Calculator.

    Combines multiple recovery metrics into a single composite score
    with research-based weighting.
    """

    # Component weights (sum to 1.0)
    WEIGHTS = {
        "hrv": 0.40,
        "sleep_quality": 0.25,
        "sleep_duration": 0.15,
        "rhr": 0.10,
        "subjective": 0.10,
    }

    # Sleep duration targets (hours)
    OPTIMAL_SLEEP_MIN = 7.0
    OPTIMAL_SLEEP_MAX = 9.0

    def __init__(self):
        self.hrv_analyzer = get_hrv_analyzer()

    async def calculate(
        self,
        # HRV data
        current_hrv: Optional[HRVDataPoint] = None,
        hrv_history: Optional[list[HRVDataPoint]] = None,
        # Sleep data
        sleep_quality: Optional[float] = None,  # 0-10
        sleep_duration_hours: Optional[float] = None,
        # Heart rate data
        resting_heart_rate: Optional[int] = None,
        baseline_rhr: Optional[int] = None,
        # Subjective
        subjective_readiness: Optional[float] = None,  # 1-10
        # Historical scores (for trending)
        historical_scores: Optional[list[float]] = None,
    ) -> RecoveryScore:
        """
        Calculate comprehensive recovery score.

        Args:
            current_hrv: Today's HRV measurement
            hrv_history: Historical HRV data for baseline
            sleep_quality: Sleep quality rating (0-10)
            sleep_duration_hours: Hours of sleep
            resting_heart_rate: Morning RHR (BPM)
            baseline_rhr: User's baseline RHR
            subjective_readiness: Self-reported readiness (1-10)
            historical_scores: Past recovery scores for trending

        Returns:
            RecoveryScore with composite assessment
        """
        score = RecoveryScore(
            composite_score=0.0,
            category=RecoveryCategory.MODERATE,
            hrv_rmssd=current_hrv.rmssd_ms if current_hrv else None,
            sleep_quality=sleep_quality,
            sleep_duration_hours=sleep_duration_hours,
            resting_heart_rate=resting_heart_rate,
            baseline_rhr=baseline_rhr,
            subjective_readiness=subjective_readiness,
        )

        # Calculate component scores
        component_scores = {}

        # 1. HRV Score (40%)
        if current_hrv and hrv_history:
            hrv_trend = self.hrv_analyzer.analyze_trend(current_hrv, hrv_history)
            score.hrv_score = self._calculate_hrv_score(hrv_trend)
            score.hrv_state = hrv_trend.recovery_state
            score.hrv_percent_from_baseline = hrv_trend.percent_from_baseline
            component_scores["hrv"] = score.hrv_score

            # Add HRV-specific notes
            if hrv_trend.notes:
                score.notes.extend(hrv_trend.notes)

        # 2. Sleep Quality Score (25%)
        if sleep_quality is not None:
            score.sleep_quality_score = (sleep_quality / 10) * 100
            component_scores["sleep_quality"] = score.sleep_quality_score

            if sleep_quality < 5:
                score.warnings.append(f"Poor sleep quality ({sleep_quality}/10). Recovery may be compromised.")

        # 3. Sleep Duration Score (15%)
        if sleep_duration_hours is not None:
            score.sleep_duration_score = self._calculate_sleep_duration_score(
                sleep_duration_hours
            )
            component_scores["sleep_duration"] = score.sleep_duration_score

            if sleep_duration_hours < 6:
                score.warnings.append(
                    f"Insufficient sleep ({sleep_duration_hours:.1f} hours). "
                    "Target 7-9 hours for optimal recovery."
                )

        # 4. Resting HR Score (10%)
        if resting_heart_rate and baseline_rhr:
            score.rhr_score = self._calculate_rhr_score(resting_heart_rate, baseline_rhr)
            component_scores["rhr"] = score.rhr_score

            rhr_diff = resting_heart_rate - baseline_rhr
            if rhr_diff > 10:
                score.warnings.append(
                    f"Elevated RHR (+{rhr_diff} BPM from baseline). "
                    "May indicate incomplete recovery or illness."
                )

        # 5. Subjective Score (10%)
        if subjective_readiness is not None:
            score.subjective_score = (subjective_readiness / 10) * 100
            component_scores["subjective"] = score.subjective_score

        # Calculate composite score
        if component_scores:
            total_weight = sum(self.WEIGHTS[key] for key in component_scores.keys())
            score.composite_score = sum(
                component_scores[key] * self.WEIGHTS[key]
                for key in component_scores.keys()
            ) / total_weight
        else:
            # No data - default to moderate
            score.composite_score = 65.0
            score.warnings.append("No recovery metrics provided. Using default moderate score.")

        # Determine category
        score.category = self._determine_category(score.composite_score)

        # Calculate training adjustment
        score.training_adjustment = self._calculate_training_adjustment(
            score.category, score.composite_score
        )

        # Generate recommendations
        score.intensity_recommendation = self._get_intensity_recommendation(score.category)
        score.volume_recommendation = self._get_volume_recommendation(score.category)

        # Add trending data
        if historical_scores:
            score.trend_7_days = historical_scores[-7:] if len(historical_scores) >= 7 else historical_scores
            score.trend_30_days = historical_scores[-30:] if len(historical_scores) >= 30 else historical_scores

        # Add contextual notes
        self._add_contextual_notes(score)

        return score

    def _calculate_hrv_score(self, hrv_trend) -> float:
        """
        Convert HRV trend to 0-100 score.

        Uses percent from baseline with diminishing returns beyond ±25%.
        """
        # Map recovery state to base score
        state_scores = {
            RecoveryState.EXCELLENT: 95,
            RecoveryState.GOOD: 80,
            RecoveryState.NORMAL: 65,
            RecoveryState.FATIGUED: 45,
            RecoveryState.VERY_FATIGUED: 25,
        }

        base_score = state_scores.get(hrv_trend.recovery_state, 65)

        # Adjust based on exact percent from baseline
        # ±5% from state midpoint
        adjustment = hrv_trend.percent_from_baseline * 0.5

        return max(0, min(100, base_score + adjustment))

    def _calculate_sleep_duration_score(self, hours: float) -> float:
        """
        Score sleep duration.

        Optimal: 7-9 hours = 100
        <6 hours: Linear decline
        >10 hours: Slight penalty (may indicate illness)
        """
        if self.OPTIMAL_SLEEP_MIN <= hours <= self.OPTIMAL_SLEEP_MAX:
            return 100

        if hours < self.OPTIMAL_SLEEP_MIN:
            # Linear decline: 6h=85, 5h=70, 4h=55, etc.
            return max(0, 100 - (self.OPTIMAL_SLEEP_MIN - hours) * 15)

        # >9 hours: slight penalty
        excess = hours - self.OPTIMAL_SLEEP_MAX
        return max(75, 100 - excess * 10)

    def _calculate_rhr_score(self, rhr: int, baseline: int) -> float:
        """
        Score resting heart rate.

        Lower than baseline = better recovery
        Higher = worse recovery
        """
        diff = rhr - baseline

        if diff <= 0:
            # At or below baseline: excellent
            return 100

        # Elevated: -5 points per BPM above baseline
        return max(0, 100 - (diff * 5))

    def _determine_category(self, composite_score: float) -> RecoveryCategory:
        """Determine recovery category from composite score"""
        if composite_score >= 85:
            return RecoveryCategory.EXCELLENT
        elif composite_score >= 70:
            return RecoveryCategory.GOOD
        elif composite_score >= 55:
            return RecoveryCategory.MODERATE
        elif composite_score >= 40:
            return RecoveryCategory.POOR
        else:
            return RecoveryCategory.CRITICAL

    def _calculate_training_adjustment(
        self,
        category: RecoveryCategory,
        score: float,
    ) -> float:
        """
        Calculate training load adjustment multiplier.

        Returns value between 0.5 and 1.2.
        """
        if category == RecoveryCategory.EXCELLENT:
            # Can push 10-20% harder
            return 1.0 + (score - 85) / 100  # 1.0-1.15 range

        if category == RecoveryCategory.GOOD:
            # Train as planned
            return 1.0

        if category == RecoveryCategory.MODERATE:
            # Reduce 5-15%
            return 0.85 + (score - 55) / 100  # 0.85-1.0 range

        if category == RecoveryCategory.POOR:
            # Reduce 25-35%
            return 0.65 + (score - 40) / 100  # 0.65-0.80 range

        # CRITICAL
        # Reduce 40-50%
        return 0.50 + score / 200  # 0.50-0.70 range

    def _get_intensity_recommendation(self, category: RecoveryCategory) -> str:
        """Get intensity recommendation text"""
        recommendations = {
            RecoveryCategory.EXCELLENT: "Push intensity. Consider testing 1RMs or going for PRs.",
            RecoveryCategory.GOOD: "Normal intensity. Proceed with planned RPE targets.",
            RecoveryCategory.MODERATE: "Reduce intensity 1-2 RPE points. Focus on movement quality.",
            RecoveryCategory.POOR: "Low intensity only. Keep RPE 5-6. Technique and activation work.",
            RecoveryCategory.CRITICAL: "Active recovery or rest. Light movement, mobility, or complete rest.",
        }
        return recommendations[category]

    def _get_volume_recommendation(self, category: RecoveryCategory) -> str:
        """Get volume recommendation text"""
        recommendations = {
            RecoveryCategory.EXCELLENT: "Normal or slightly increased volume (100-110%).",
            RecoveryCategory.GOOD: "Normal volume (100%).",
            RecoveryCategory.MODERATE: "Reduce volume 10-20%. Cut 1-2 sets per exercise.",
            RecoveryCategory.POOR: "Reduce volume 30-40%. Cut accessories, keep main lifts light.",
            RecoveryCategory.CRITICAL: "Minimal volume. 1-2 sets max, or skip training entirely.",
        }
        return recommendations[category]

    def _add_contextual_notes(self, score: RecoveryScore) -> None:
        """Add contextual notes based on component scores"""
        # Check for conflicting signals
        if score.hrv_score and score.subjective_score:
            hrv_cat = self._determine_category(score.hrv_score)
            subj_cat = self._determine_category(score.subjective_score)

            if abs(score.hrv_score - score.subjective_score) > 30:
                score.notes.append(
                    f"HRV ({hrv_cat.value}) and subjective feeling ({subj_cat.value}) don't align. "
                    "Trust objective metrics (HRV) over subjective feeling."
                )

        # Check for partial data
        missing = []
        if score.hrv_score is None:
            missing.append("HRV")
        if score.sleep_quality_score is None and score.sleep_duration_score is None:
            missing.append("sleep")
        if score.rhr_score is None:
            missing.append("resting HR")

        if missing:
            score.notes.append(
                f"Recovery score calculated without: {', '.join(missing)}. "
                "Accuracy will improve with complete data."
            )

        # Recommend data collection
        if score.hrv_score is None:
            score.notes.append(
                "Consider measuring HRV daily for more accurate recovery assessment. "
                "Best measured: morning, lying down, before getting out of bed."
            )


# Global calculator instance
_recovery_calculator: Optional[RecoveryScoreCalculator] = None


def get_recovery_calculator() -> RecoveryScoreCalculator:
    """Get or create global recovery calculator"""
    global _recovery_calculator
    if _recovery_calculator is None:
        _recovery_calculator = RecoveryScoreCalculator()
    return _recovery_calculator
