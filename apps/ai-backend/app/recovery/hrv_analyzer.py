"""
HRV Trend Analysis

Analyzes Heart Rate Variability trends over time to assess recovery state.

Research:
- Plews et al. (2013): HRV-guided training outperforms pre-planned training
- Buchheit (2014): 7-day rolling average baseline
- Flatt & Esco (2015): Coefficient of variation for stability assessment

Sprint 34: HRV Recovery System
"""

import statistics
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, Literal
from enum import Enum


class RecoveryState(str, Enum):
    """Recovery state based on HRV trends"""

    EXCELLENT = "excellent"  # Well above baseline, ready to push
    GOOD = "good"  # Above baseline, normal training
    NORMAL = "normal"  # At baseline, proceed as planned
    FATIGUED = "fatigued"  # Below baseline, reduce intensity
    VERY_FATIGUED = "very_fatigued"  # Well below baseline, active recovery only


@dataclass
class HRVDataPoint:
    """Single HRV measurement"""

    timestamp: datetime
    rmssd_ms: float  # Root Mean Square of Successive Differences (gold standard)
    sdnn_ms: Optional[float] = None  # Standard Deviation of NN intervals
    ln_rmssd: Optional[float] = None  # Natural log of RMSSD (normalizes distribution)
    quality_score: float = 1.0  # 0-1, data quality indicator


@dataclass
class HRVBaseline:
    """User's HRV baseline and variation"""

    mean_rmssd: float  # 7-day rolling average
    std_rmssd: float  # Standard deviation
    coefficient_of_variation: float  # CV = std / mean
    sample_size: int  # Number of measurements
    last_updated: datetime

    # Thresholds (based on research)
    normal_range: tuple[float, float] = field(init=False)  # mean ± 0.5 std
    elevated_threshold: float = field(init=False)  # mean + 0.75 std
    reduced_threshold: float = field(init=False)  # mean - 0.75 std
    very_reduced_threshold: float = field(init=False)  # mean - 1.5 std

    def __post_init__(self):
        """Calculate thresholds"""
        self.normal_range = (
            self.mean_rmssd - 0.5 * self.std_rmssd,
            self.mean_rmssd + 0.5 * self.std_rmssd,
        )
        self.elevated_threshold = self.mean_rmssd + 0.75 * self.std_rmssd
        self.reduced_threshold = self.mean_rmssd - 0.75 * self.std_rmssd
        self.very_reduced_threshold = self.mean_rmssd - 1.5 * self.std_rmssd


@dataclass
class HRVTrend:
    """HRV trend analysis result"""

    current_value: float  # Today's HRV RMSSD
    baseline: HRVBaseline
    percent_from_baseline: float  # % deviation from baseline
    recovery_state: RecoveryState
    confidence: float  # 0-1, confidence in assessment
    trend_direction: Literal["increasing", "stable", "decreasing"]
    days_in_state: int  # Consecutive days in current state

    # Visualization data
    last_7_days: list[HRVDataPoint]
    last_30_days: list[HRVDataPoint]

    # Recommendations
    training_recommendation: str
    notes: list[str] = field(default_factory=list)


class HRVAnalyzer:
    """
    HRV Trend Analyzer.

    Analyzes HRV trends over time and provides recovery state assessment.

    Based on research:
    - 7-day rolling average for baseline (Buchheit, 2014)
    - CV <10% indicates stable baseline (Flatt & Esco, 2015)
    - ±0.75 SD thresholds for state changes (Plews et al., 2013)
    """

    # Minimum data requirements
    MIN_BASELINE_DAYS = 7
    MIN_STABLE_BASELINE_DAYS = 14  # For high confidence
    MAX_CV_FOR_STABILITY = 0.10  # 10% coefficient of variation

    def __init__(self):
        pass

    def calculate_baseline(
        self,
        hrv_data: list[HRVDataPoint],
        lookback_days: int = 7,
    ) -> Optional[HRVBaseline]:
        """
        Calculate HRV baseline from recent data.

        Uses 7-day rolling average as recommended by Buchheit (2014).

        Args:
            hrv_data: List of HRV measurements (sorted by time, newest last)
            lookback_days: Days to use for baseline (default 7)

        Returns:
            HRVBaseline or None if insufficient data
        """
        if len(hrv_data) < self.MIN_BASELINE_DAYS:
            return None

        # Get last N days
        cutoff_date = datetime.now() - timedelta(days=lookback_days)
        recent_data = [d for d in hrv_data if d.timestamp >= cutoff_date]

        if len(recent_data) < self.MIN_BASELINE_DAYS:
            return None

        # Extract RMSSD values
        rmssd_values = [d.rmssd_ms for d in recent_data]

        # Calculate statistics
        mean_rmssd = statistics.mean(rmssd_values)
        std_rmssd = statistics.stdev(rmssd_values) if len(rmssd_values) > 1 else 0
        cv = (std_rmssd / mean_rmssd) if mean_rmssd > 0 else 0

        return HRVBaseline(
            mean_rmssd=mean_rmssd,
            std_rmssd=std_rmssd,
            coefficient_of_variation=cv,
            sample_size=len(recent_data),
            last_updated=datetime.now(),
        )

    def analyze_trend(
        self,
        current_hrv: HRVDataPoint,
        historical_data: list[HRVDataPoint],
    ) -> HRVTrend:
        """
        Analyze HRV trend and determine recovery state.

        Args:
            current_hrv: Today's HRV measurement
            historical_data: Historical HRV data (sorted, newest last)

        Returns:
            HRVTrend with recovery state and recommendations
        """
        # Calculate baseline
        baseline = self.calculate_baseline(historical_data, lookback_days=7)

        if not baseline:
            # Insufficient data - return default
            return self._default_trend(current_hrv, historical_data)

        # Calculate deviation from baseline
        deviation = current_hrv.rmssd_ms - baseline.mean_rmssd
        percent_from_baseline = (deviation / baseline.mean_rmssd) * 100

        # Determine recovery state
        recovery_state = self._determine_recovery_state(
            current_hrv.rmssd_ms, baseline
        )

        # Calculate confidence
        confidence = self._calculate_confidence(baseline, historical_data)

        # Determine trend direction
        trend_direction = self._determine_trend_direction(historical_data)

        # Count consecutive days in state
        days_in_state = self._count_days_in_state(
            recovery_state, historical_data, baseline
        )

        # Get training recommendation
        training_recommendation = self._get_training_recommendation(
            recovery_state, days_in_state, baseline
        )

        # Generate notes
        notes = self._generate_notes(
            recovery_state, percent_from_baseline, baseline, confidence
        )

        # Get visualization data
        last_7_days = historical_data[-7:] if len(historical_data) >= 7 else historical_data
        last_30_days = historical_data[-30:] if len(historical_data) >= 30 else historical_data

        return HRVTrend(
            current_value=current_hrv.rmssd_ms,
            baseline=baseline,
            percent_from_baseline=round(percent_from_baseline, 1),
            recovery_state=recovery_state,
            confidence=confidence,
            trend_direction=trend_direction,
            days_in_state=days_in_state,
            training_recommendation=training_recommendation,
            notes=notes,
            last_7_days=last_7_days,
            last_30_days=last_30_days,
        )

    def _determine_recovery_state(
        self,
        current_rmssd: float,
        baseline: HRVBaseline,
    ) -> RecoveryState:
        """
        Determine recovery state from HRV value.

        Thresholds based on Plews et al. (2013).
        """
        if current_rmssd >= baseline.elevated_threshold:
            return RecoveryState.EXCELLENT

        if current_rmssd >= baseline.normal_range[1]:
            return RecoveryState.GOOD

        if current_rmssd >= baseline.normal_range[0]:
            return RecoveryState.NORMAL

        if current_rmssd >= baseline.very_reduced_threshold:
            return RecoveryState.FATIGUED

        return RecoveryState.VERY_FATIGUED

    def _calculate_confidence(
        self,
        baseline: HRVBaseline,
        historical_data: list[HRVDataPoint],
    ) -> float:
        """
        Calculate confidence in the assessment.

        High confidence when:
        - Large sample size (14+ days)
        - Low coefficient of variation (<10%)
        - Recent measurements are high quality
        """
        confidence = 0.0

        # Sample size component (0-0.4)
        if baseline.sample_size >= self.MIN_STABLE_BASELINE_DAYS:
            sample_confidence = 0.4
        else:
            sample_confidence = (baseline.sample_size / self.MIN_STABLE_BASELINE_DAYS) * 0.4

        # CV component (0-0.4)
        if baseline.coefficient_of_variation <= self.MAX_CV_FOR_STABILITY:
            cv_confidence = 0.4
        else:
            cv_confidence = max(0, 0.4 * (1 - baseline.coefficient_of_variation))

        # Data quality component (0-0.2)
        recent_quality = statistics.mean([d.quality_score for d in historical_data[-7:]])
        quality_confidence = recent_quality * 0.2

        confidence = sample_confidence + cv_confidence + quality_confidence

        return round(min(confidence, 1.0), 2)

    def _determine_trend_direction(
        self,
        historical_data: list[HRVDataPoint],
    ) -> Literal["increasing", "stable", "decreasing"]:
        """
        Determine if HRV is trending up, down, or stable.

        Compares last 3 days to previous 4 days.
        """
        if len(historical_data) < 7:
            return "stable"

        last_3_days = [d.rmssd_ms for d in historical_data[-3:]]
        previous_4_days = [d.rmssd_ms for d in historical_data[-7:-3]]

        avg_recent = statistics.mean(last_3_days)
        avg_previous = statistics.mean(previous_4_days)

        change_percent = ((avg_recent - avg_previous) / avg_previous) * 100

        if change_percent > 5:
            return "increasing"
        elif change_percent < -5:
            return "decreasing"
        else:
            return "stable"

    def _count_days_in_state(
        self,
        current_state: RecoveryState,
        historical_data: list[HRVDataPoint],
        baseline: HRVBaseline,
    ) -> int:
        """Count consecutive days in current recovery state"""
        days = 1  # Include today

        # Walk backwards through history
        for i in range(len(historical_data) - 1, -1, -1):
            data_point = historical_data[i]
            state = self._determine_recovery_state(data_point.rmssd_ms, baseline)

            if state == current_state:
                days += 1
            else:
                break

        return days

    def _get_training_recommendation(
        self,
        state: RecoveryState,
        days_in_state: int,
        baseline: HRVBaseline,
    ) -> str:
        """Get training recommendation based on recovery state"""
        if state == RecoveryState.EXCELLENT:
            if days_in_state >= 3:
                return "Excellent recovery. Consider pushing intensity or volume for adaptation."
            return "Well recovered. Train as planned or slightly increase intensity."

        if state == RecoveryState.GOOD:
            return "Good recovery. Proceed with planned training."

        if state == RecoveryState.NORMAL:
            return "Normal recovery. Train as planned."

        if state == RecoveryState.FATIGUED:
            if days_in_state >= 3:
                return "Persistent fatigue detected. Consider reducing volume 30-40% and monitoring closely."
            return "Mild fatigue detected. Reduce intensity 15-20% or focus on technique work."

        # VERY_FATIGUED
        if days_in_state >= 2:
            return "Significant fatigue. Active recovery or rest day recommended. Assess for illness/overtraining."
        return "Very low HRV. Consider active recovery or technique-only session today."

    def _generate_notes(
        self,
        state: RecoveryState,
        percent_from_baseline: float,
        baseline: HRVBaseline,
        confidence: float,
    ) -> list[str]:
        """Generate contextual notes"""
        notes = []

        # Baseline stability
        if baseline.coefficient_of_variation > self.MAX_CV_FOR_STABILITY:
            notes.append(
                f"HRV baseline is unstable (CV: {baseline.coefficient_of_variation:.1%}). "
                "Recommendations may be less reliable."
            )

        # Confidence warning
        if confidence < 0.6:
            notes.append(
                f"Low confidence in assessment ({confidence:.0%}). "
                "More baseline data needed for accurate recommendations."
            )

        # Extreme values
        if abs(percent_from_baseline) > 25:
            notes.append(
                f"HRV is {abs(percent_from_baseline):.0f}% from baseline. "
                "This is unusual - consider external stressors (illness, travel, stress)."
            )

        # Sample size
        if baseline.sample_size < self.MIN_STABLE_BASELINE_DAYS:
            notes.append(
                f"Baseline calculated from {baseline.sample_size} days. "
                f"Accuracy will improve with {self.MIN_STABLE_BASELINE_DAYS}+ days of data."
            )

        return notes

    def _default_trend(
        self,
        current_hrv: HRVDataPoint,
        historical_data: list[HRVDataPoint],
    ) -> HRVTrend:
        """Return default trend when insufficient baseline data"""
        # Create minimal baseline
        if historical_data:
            rmssd_values = [d.rmssd_ms for d in historical_data]
            baseline = HRVBaseline(
                mean_rmssd=statistics.mean(rmssd_values),
                std_rmssd=statistics.stdev(rmssd_values) if len(rmssd_values) > 1 else 10,
                coefficient_of_variation=1.0,
                sample_size=len(historical_data),
                last_updated=datetime.now(),
            )
        else:
            # Complete fallback
            baseline = HRVBaseline(
                mean_rmssd=current_hrv.rmssd_ms,
                std_rmssd=10,
                coefficient_of_variation=1.0,
                sample_size=1,
                last_updated=datetime.now(),
            )

        return HRVTrend(
            current_value=current_hrv.rmssd_ms,
            baseline=baseline,
            percent_from_baseline=0.0,
            recovery_state=RecoveryState.NORMAL,
            confidence=0.3,
            trend_direction="stable",
            days_in_state=1,
            training_recommendation="Insufficient baseline data. Train conservatively and continue monitoring HRV.",
            notes=[
                f"Only {len(historical_data)} days of HRV data. Need {self.MIN_BASELINE_DAYS}+ for accurate baseline.",
                "Proceeding with default recommendations until baseline is established.",
            ],
            last_7_days=historical_data[-7:] if historical_data else [current_hrv],
            last_30_days=historical_data[-30:] if historical_data else [current_hrv],
        )

    def detect_overtraining_markers(
        self,
        hrv_data: list[HRVDataPoint],
    ) -> dict:
        """
        Detect potential overtraining markers.

        Markers (based on research):
        - Sustained HRV decline >10% for 5+ days
        - HRV CV >15% (high variability)
        - Chronic elevation in resting HR
        - Lack of HRV response to training (blunted adaptation)

        Returns:
            Dictionary with markers and risk level
        """
        if len(hrv_data) < 14:
            return {
                "risk_level": "unknown",
                "markers": [],
                "note": "Insufficient data for overtraining assessment (need 14+ days)",
            }

        markers = []
        risk_level = "low"

        baseline = self.calculate_baseline(hrv_data[-14:-7])  # Week 2
        recent = self.calculate_baseline(hrv_data[-7:])  # Week 1

        if not baseline or not recent:
            return {
                "risk_level": "unknown",
                "markers": [],
                "note": "Insufficient data for overtraining assessment",
            }

        # Marker 1: Sustained decline
        decline_percent = ((recent.mean_rmssd - baseline.mean_rmssd) / baseline.mean_rmssd) * 100
        if decline_percent < -10:
            markers.append(f"HRV declined {abs(decline_percent):.1f}% over past week")
            risk_level = "moderate"

        # Marker 2: High variability
        if recent.coefficient_of_variation > 0.15:
            markers.append(f"High HRV variability (CV: {recent.coefficient_of_variation:.1%})")
            if risk_level == "low":
                risk_level = "moderate"

        # Marker 3: Very low absolute HRV (check last 3 days)
        recent_3_days = hrv_data[-3:]
        avg_recent_3 = statistics.mean([d.rmssd_ms for d in recent_3_days])
        if avg_recent_3 < baseline.very_reduced_threshold:
            markers.append("HRV below critical threshold for 3+ days")
            risk_level = "high"

        if not markers:
            return {
                "risk_level": "low",
                "markers": [],
                "note": "No overtraining markers detected",
            }

        return {
            "risk_level": risk_level,
            "markers": markers,
            "note": (
                "Elevated overtraining risk. Consider rest/deload week."
                if risk_level == "high"
                else "Monitor closely and adjust training load as needed."
            ),
        }


# Global analyzer instance
_hrv_analyzer: Optional[HRVAnalyzer] = None


def get_hrv_analyzer() -> HRVAnalyzer:
    """Get or create global HRV analyzer"""
    global _hrv_analyzer
    if _hrv_analyzer is None:
        _hrv_analyzer = HRVAnalyzer()
    return _hrv_analyzer
