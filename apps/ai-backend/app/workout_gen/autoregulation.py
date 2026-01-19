"""
Auto-Regulating Load Management

Dynamically adjusts training load based on:
- RPE (Rate of Perceived Exertion)
- HRV (Heart Rate Variability)
- Velocity loss (VBT - Velocity Based Training)
- Subjective readiness
- Fatigue accumulation

Sprint 33: AI Workout Generation
"""

from dataclasses import dataclass
from typing import Optional, Literal
from datetime import datetime, timedelta
from enum import Enum


class ReadinessLevel(str, Enum):
    """Overall readiness to train"""

    VERY_HIGH = "very_high"  # 90-100% - Push hard
    HIGH = "high"  # 75-90% - Train as planned
    MODERATE = "moderate"  # 60-75% - Slight reduction
    LOW = "low"  # 40-60% - Significant reduction
    VERY_LOW = "very_low"  # <40% - Active recovery only


@dataclass
class ReadinessScore:
    """Composite readiness score from multiple sources"""

    # Input metrics
    hrv_score: Optional[float] = None  # 0-100 (normalized)
    sleep_quality: Optional[float] = None  # 0-10
    sleep_duration_hours: Optional[float] = None  # Hours
    resting_heart_rate: Optional[int] = None  # BPM
    subjective_readiness: Optional[float] = None  # 1-10 scale
    muscle_soreness: Optional[float] = None  # 0-10 (0=none, 10=extreme)

    # Calculated outputs
    composite_score: float = 0.0  # 0-100
    readiness_level: ReadinessLevel = ReadinessLevel.MODERATE
    recommended_adjustment: float = 1.0  # Multiplier for planned load (0.5-1.2)

    # Recommendations
    notes: str = ""
    warnings: list[str] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


@dataclass
class FatigueMetrics:
    """Fatigue accumulation tracking"""

    acute_load: float = 0.0  # Last 7 days
    chronic_load: float = 0.0  # Last 28 days
    acwr: float = 1.0  # Acute:Chronic Workload Ratio
    monotony: float = 1.0  # Training monotony index
    strain: float = 0.0  # Total strain (load × monotony)

    # Safe training zones
    acwr_optimal_range: tuple[float, float] = (0.8, 1.3)
    acwr_danger_zone: tuple[float, float] = (1.5, float("inf"))

    def is_safe_to_train(self) -> bool:
        """Check if ACWR is in safe range"""
        return self.acwr_optimal_range[0] <= self.acwr <= self.acwr_optimal_range[1]

    def is_in_danger_zone(self) -> bool:
        """Check if ACWR indicates injury risk"""
        return self.acwr >= self.acwr_danger_zone[0]


class LoadManager:
    """
    Auto-regulating load management system.

    Adjusts training load based on real-time readiness and fatigue data.
    """

    # Weighting for composite score
    READINESS_WEIGHTS = {
        "hrv": 0.40,
        "sleep_quality": 0.25,
        "sleep_duration": 0.15,
        "rhr": 0.10,
        "subjective": 0.10,
    }

    # HRV baseline recommendations
    HRV_BASELINE_RANGES = {
        "excellent": (80, 100),
        "good": (60, 80),
        "average": (40, 60),
        "below_average": (20, 40),
        "poor": (0, 20),
    }

    def __init__(self):
        pass

    async def calculate_readiness(
        self,
        hrv_score: Optional[float] = None,
        sleep_quality: Optional[float] = None,
        sleep_duration_hours: Optional[float] = None,
        resting_heart_rate: Optional[int] = None,
        subjective_readiness: Optional[float] = None,
        muscle_soreness: Optional[float] = None,
        baseline_rhr: Optional[int] = None,
    ) -> ReadinessScore:
        """
        Calculate composite readiness score.

        Args:
            hrv_score: HRV normalized 0-100 (higher is better)
            sleep_quality: 0-10 scale
            sleep_duration_hours: Hours of sleep
            resting_heart_rate: Morning RHR in BPM
            subjective_readiness: 1-10 self-reported readiness
            muscle_soreness: 0-10 soreness level
            baseline_rhr: User's baseline RHR for comparison

        Returns:
            ReadinessScore with recommendations
        """
        score = ReadinessScore(
            hrv_score=hrv_score,
            sleep_quality=sleep_quality,
            sleep_duration_hours=sleep_duration_hours,
            resting_heart_rate=resting_heart_rate,
            subjective_readiness=subjective_readiness,
            muscle_soreness=muscle_soreness,
        )

        # Calculate individual component scores (0-100)
        components = {}

        if hrv_score is not None:
            components["hrv"] = hrv_score  # Already 0-100

        if sleep_quality is not None:
            components["sleep_quality"] = (sleep_quality / 10) * 100

        if sleep_duration_hours is not None:
            # Optimal: 7-9 hours
            if 7 <= sleep_duration_hours <= 9:
                sleep_score = 100
            elif sleep_duration_hours < 7:
                sleep_score = max(0, (sleep_duration_hours / 7) * 100)
            else:
                sleep_score = max(0, 100 - ((sleep_duration_hours - 9) * 10))
            components["sleep_duration"] = sleep_score

        if resting_heart_rate is not None and baseline_rhr is not None:
            # Lower RHR is better (more recovered)
            rhr_diff = resting_heart_rate - baseline_rhr
            if rhr_diff <= 0:
                # RHR at or below baseline: excellent
                rhr_score = 100
            else:
                # Elevated RHR: reduce score
                rhr_score = max(0, 100 - (rhr_diff * 5))
            components["rhr"] = rhr_score

        if subjective_readiness is not None:
            components["subjective"] = (subjective_readiness / 10) * 100

        # Calculate weighted composite score
        if components:
            total_weight = sum(
                self.READINESS_WEIGHTS[key] for key in components.keys()
            )
            score.composite_score = sum(
                components[key] * self.READINESS_WEIGHTS[key]
                for key in components.keys()
            ) / total_weight
        else:
            score.composite_score = 75.0  # Default moderate readiness

        # Determine readiness level
        if score.composite_score >= 90:
            score.readiness_level = ReadinessLevel.VERY_HIGH
            score.recommended_adjustment = 1.10  # Can push 10% harder
            score.notes = "Excellent recovery. Consider pushing intensity or volume."
        elif score.composite_score >= 75:
            score.readiness_level = ReadinessLevel.HIGH
            score.recommended_adjustment = 1.0  # Train as planned
            score.notes = "Good recovery. Proceed with planned training."
        elif score.composite_score >= 60:
            score.readiness_level = ReadinessLevel.MODERATE
            score.recommended_adjustment = 0.90  # Reduce 10%
            score.notes = "Moderate recovery. Slight reduction in volume or intensity recommended."
        elif score.composite_score >= 40:
            score.readiness_level = ReadinessLevel.LOW
            score.recommended_adjustment = 0.70  # Reduce 30%
            score.notes = "Low recovery. Significant reduction recommended. Focus on technique and lower intensity."
        else:
            score.readiness_level = ReadinessLevel.VERY_LOW
            score.recommended_adjustment = 0.50  # Reduce 50% or skip
            score.notes = "Very low recovery. Consider active recovery or rest day."

        # Add warnings based on specific metrics
        if hrv_score is not None and hrv_score < 40:
            score.warnings.append("HRV below average. Body may be stressed.")

        if sleep_duration_hours is not None and sleep_duration_hours < 6:
            score.warnings.append("Insufficient sleep. Recovery will be compromised.")

        if muscle_soreness is not None and muscle_soreness >= 7:
            score.warnings.append("High muscle soreness. Consider lighter training or rest.")

        if resting_heart_rate is not None and baseline_rhr is not None:
            if resting_heart_rate > baseline_rhr + 10:
                score.warnings.append("Elevated RHR suggests incomplete recovery or illness.")

        return score

    def calculate_fatigue_metrics(
        self,
        recent_loads: list[float],  # Last 28 days of training load
    ) -> FatigueMetrics:
        """
        Calculate fatigue and injury risk metrics.

        Uses Acute:Chronic Workload Ratio (ACWR) to assess injury risk.
        Research shows ACWR >1.5 correlates with increased injury risk.

        Args:
            recent_loads: Daily training loads for last 28 days (most recent last)

        Returns:
            FatigueMetrics with ACWR and recommendations
        """
        if len(recent_loads) < 7:
            # Not enough data
            return FatigueMetrics()

        # Calculate acute load (last 7 days average)
        acute_loads = recent_loads[-7:]
        acute_load = sum(acute_loads) / len(acute_loads)

        # Calculate chronic load (last 28 days average)
        chronic_loads = recent_loads[-28:] if len(recent_loads) >= 28 else recent_loads
        chronic_load = sum(chronic_loads) / len(chronic_loads)

        # Calculate ACWR
        acwr = acute_load / chronic_load if chronic_load > 0 else 1.0

        # Calculate monotony (std dev of daily loads)
        mean_load = sum(recent_loads[-7:]) / len(recent_loads[-7:])
        if len(recent_loads[-7:]) > 1:
            variance = sum((x - mean_load) ** 2 for x in recent_loads[-7:]) / len(recent_loads[-7:])
            std_dev = variance ** 0.5
            monotony = mean_load / std_dev if std_dev > 0 else 1.0
        else:
            monotony = 1.0

        # Calculate strain
        strain = sum(recent_loads[-7:]) * monotony

        return FatigueMetrics(
            acute_load=acute_load,
            chronic_load=chronic_load,
            acwr=acwr,
            monotony=monotony,
            strain=strain,
        )

    def adjust_workout_load(
        self,
        planned_sets: int,
        planned_reps: str,
        planned_rpe: float,
        readiness: ReadinessScore,
    ) -> tuple[int, str, float]:
        """
        Adjust planned workout based on readiness.

        Args:
            planned_sets: Planned number of sets
            planned_reps: Planned reps (e.g., "8-10")
            planned_rpe: Planned RPE
            readiness: Current readiness score

        Returns:
            Tuple of (adjusted_sets, adjusted_reps, adjusted_rpe)
        """
        adjustment = readiness.recommended_adjustment

        # Adjust sets
        adjusted_sets = max(1, int(planned_sets * adjustment))

        # Adjust RPE
        if adjustment >= 1.0:
            # Can push harder
            adjusted_rpe = min(10.0, planned_rpe + 0.5)
        elif adjustment >= 0.9:
            # Minor reduction
            adjusted_rpe = planned_rpe
        else:
            # Significant reduction
            adjusted_rpe = max(5.0, planned_rpe - 1.0)

        # Reps typically stay the same (quality over quantity)
        adjusted_reps = planned_reps

        return adjusted_sets, adjusted_reps, adjusted_rpe

    def calculate_rpe_based_load(
        self,
        target_rpe: float,
        actual_rpe: float,
        current_load_kg: float,
    ) -> float:
        """
        Calculate load adjustment based on RPE feedback.

        Uses RPE to estimate 1RM and adjust load accordingly.

        Args:
            target_rpe: Desired RPE (e.g., 8.0)
            actual_rpe: Actual RPE achieved
            current_load_kg: Current load in kg

        Returns:
            Recommended load for next session
        """
        # RPE to RIR (Reps In Reserve) conversion
        # RPE 10 = 0 RIR, RPE 9 = 1 RIR, RPE 8 = 2 RIR, etc.
        target_rir = 10 - target_rpe
        actual_rir = 10 - actual_rpe

        # If actual RPE was lower than target, increase load
        # If actual RPE was higher, decrease load
        rpe_diff = actual_rpe - target_rpe

        # Adjustment: ~2.5% per RPE point difference
        adjustment_percent = rpe_diff * 2.5

        recommended_load = current_load_kg * (1 + adjustment_percent / 100)

        return round(recommended_load, 1)

    def assess_velocity_loss(
        self,
        set_velocities: list[float],  # Velocity (m/s) for each rep in set
        threshold_percent: float = 20.0,
    ) -> tuple[bool, int, str]:
        """
        Assess velocity loss within a set (VBT - Velocity Based Training).

        Research shows >20% velocity loss correlates with excessive fatigue.

        Args:
            set_velocities: Velocity for each rep (fastest to slowest)
            threshold_percent: Velocity loss threshold (default 20%)

        Returns:
            Tuple of (stop_set, reps_completed, recommendation)
        """
        if len(set_velocities) < 2:
            return False, len(set_velocities), "Insufficient data"

        # First rep is typically fastest (best velocity)
        best_velocity = set_velocities[0]

        # Calculate velocity loss for each rep
        velocity_losses = [
            ((best_velocity - v) / best_velocity) * 100 for v in set_velocities
        ]

        # Find first rep that exceeds threshold
        for i, loss in enumerate(velocity_losses):
            if loss > threshold_percent:
                return (
                    True,
                    i,
                    f"Stop at rep {i}. Velocity loss {loss:.1f}% exceeds {threshold_percent}% threshold.",
                )

        return (
            False,
            len(set_velocities),
            f"Set completed. Max velocity loss {max(velocity_losses):.1f}%.",
        )


# Global load manager instance
_load_manager: Optional[LoadManager] = None


def get_load_manager() -> LoadManager:
    """Get or create global load manager"""
    global _load_manager
    if _load_manager is None:
        _load_manager = LoadManager()
    return _load_manager
