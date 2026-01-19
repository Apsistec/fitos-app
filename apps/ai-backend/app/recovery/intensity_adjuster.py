"""
Intensity Adjuster

Auto-adjusts workout intensity based on recovery state.

Integrates with:
- Workout generation system
- Daily workout delivery
- Real-time training adjustments

Sprint 34: HRV Recovery System
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from datetime import datetime

from app.recovery.recovery_score import RecoveryScore, RecoveryCategory
from app.workout_gen.generator import Workout, Exercise


@dataclass
class IntensityRecommendation:
    """Recommended intensity adjustments for a workout"""

    # Original workout
    original_workout: Workout

    # Adjusted workout
    adjusted_workout: Workout

    # Recovery context
    recovery_score: float  # 0-100
    recovery_category: RecoveryCategory
    adjustment_factor: float  # 0.5-1.2 multiplier

    # Specific adjustments made
    sets_reduced: int = 0
    exercises_removed: int = 0
    rpe_reduced: float = 0.0
    rest_increased: int = 0  # seconds

    # Explanation
    reasoning: str = ""
    warnings: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


class IntensityAdjuster:
    """
    Auto-adjusts workout intensity based on recovery state.

    Strategies:
    - EXCELLENT: Increase load 5-10%, add 1 set, or increase RPE
    - GOOD: No adjustment
    - MODERATE: Reduce volume 10-20%, maintain intensity
    - POOR: Reduce volume 30-40%, reduce intensity 1-2 RPE
    - CRITICAL: Active recovery only or rest
    """

    def __init__(self):
        pass

    def adjust_workout(
        self,
        workout: Workout,
        recovery_score: RecoveryScore,
    ) -> IntensityRecommendation:
        """
        Adjust workout based on recovery state.

        Args:
            workout: Planned workout
            recovery_score: Current recovery assessment

        Returns:
            IntensityRecommendation with adjusted workout
        """
        # Create copy of workout for adjustment
        adjusted = self._copy_workout(workout)

        sets_reduced = 0
        exercises_removed = 0
        rpe_reduced = 0.0
        rest_increased = 0

        # Apply adjustments based on category
        if recovery_score.category == RecoveryCategory.EXCELLENT:
            # Push harder
            reasoning = "Excellent recovery. Increasing training stimulus for adaptation."

            for exercise in adjusted.exercises:
                # Option 1: Add 1 set to main lifts (first 3 exercises)
                if adjusted.exercises.index(exercise) < 3:
                    exercise.sets += 1

                # Option 2: Increase RPE by 0.5-1.0
                if exercise.rpe:
                    exercise.rpe = min(10.0, exercise.rpe + 0.5)
                    rpe_reduced = -0.5  # Negative because we increased

        elif recovery_score.category == RecoveryCategory.GOOD:
            # No adjustment needed
            reasoning = "Good recovery. Proceeding with planned training."

        elif recovery_score.category == RecoveryCategory.MODERATE:
            # Slight reduction in volume
            reasoning = "Moderate recovery. Reducing volume 10-20% while maintaining intensity."

            for exercise in adjusted.exercises:
                if exercise.sets > 2:
                    reduction = 1
                    exercise.sets -= reduction
                    sets_reduced += reduction

        elif recovery_score.category == RecoveryCategory.POOR:
            # Significant reduction
            reasoning = "Poor recovery. Reducing volume 30-40% and intensity 1-2 RPE."

            # Remove accessory exercises (keep first 4)
            if len(adjusted.exercises) > 4:
                exercises_removed = len(adjusted.exercises) - 4
                adjusted.exercises = adjusted.exercises[:4]

            for exercise in adjusted.exercises:
                # Reduce sets
                if exercise.sets > 2:
                    reduction = max(1, exercise.sets // 3)  # Reduce by ~33%
                    exercise.sets -= reduction
                    sets_reduced += reduction

                # Reduce RPE
                if exercise.rpe:
                    reduction = 1.5
                    exercise.rpe = max(5.0, exercise.rpe - reduction)
                    rpe_reduced = max(rpe_reduced, reduction)

                # Increase rest
                if exercise.rest_seconds < 180:
                    increase = 30
                    exercise.rest_seconds += increase
                    rest_increased = max(rest_increased, increase)

        else:  # CRITICAL
            # Active recovery only
            reasoning = "Critical recovery state. Active recovery or rest recommended."

            # Replace entire workout with active recovery
            adjusted.exercises = [
                Exercise(
                    name="Light Movement / Mobility Work",
                    sets=2,
                    reps="10-15 minutes",
                    rpe=3.0,
                    rest_seconds=60,
                    notes="Very light activity: walking, cycling, stretching, foam rolling",
                ),
            ]
            exercises_removed = len(workout.exercises) - 1
            adjusted.name = "Active Recovery"
            adjusted.warmup_notes = "5-10 min very light cardio"
            adjusted.cooldown_notes = "15-20 min stretching and mobility"

        # Add recovery-specific notes
        notes = []
        warnings = []

        if recovery_score.category == RecoveryCategory.CRITICAL:
            warnings.append(
                "Critical recovery state detected. Consider complete rest instead of training."
            )
            warnings.append(
                "If this persists for 3+ days, consult with healthcare provider."
            )

        if recovery_score.hrv_state:
            notes.append(f"HRV state: {recovery_score.hrv_state.value}")

        if recovery_score.hrv_percent_from_baseline:
            notes.append(
                f"HRV {recovery_score.hrv_percent_from_baseline:+.1f}% from baseline"
            )

        # Add warnings from recovery score
        if recovery_score.warnings:
            warnings.extend(recovery_score.warnings)

        return IntensityRecommendation(
            original_workout=workout,
            adjusted_workout=adjusted,
            recovery_score=recovery_score.composite_score,
            recovery_category=recovery_score.category,
            adjustment_factor=recovery_score.training_adjustment,
            sets_reduced=sets_reduced,
            exercises_removed=exercises_removed,
            rpe_reduced=rpe_reduced,
            rest_increased=rest_increased,
            reasoning=reasoning,
            warnings=warnings,
            notes=notes,
        )

    def _copy_workout(self, workout: Workout) -> Workout:
        """Create deep copy of workout for modification"""
        return Workout(
            day_number=workout.day_number,
            week_number=workout.week_number,
            name=workout.name,
            exercises=[
                Exercise(
                    name=e.name,
                    sets=e.sets,
                    reps=e.reps,
                    rpe=e.rpe,
                    rest_seconds=e.rest_seconds,
                    tempo=e.tempo,
                    notes=e.notes,
                    substitutions=e.substitutions.copy() if e.substitutions else [],
                )
                for e in workout.exercises
            ],
            warmup_notes=workout.warmup_notes,
            cooldown_notes=workout.cooldown_notes,
            total_duration_minutes=workout.total_duration_minutes,
        )

    def should_skip_workout(
        self,
        recovery_score: RecoveryScore,
        days_in_critical: int = 0,
    ) -> tuple[bool, str]:
        """
        Determine if workout should be skipped entirely.

        Args:
            recovery_score: Current recovery assessment
            days_in_critical: Consecutive days in CRITICAL state

        Returns:
            Tuple of (should_skip, reason)
        """
        # Skip if CRITICAL for 2+ days
        if recovery_score.category == RecoveryCategory.CRITICAL and days_in_critical >= 2:
            return (
                True,
                "Multiple days of critical recovery. Complete rest recommended.",
            )

        # Skip if CRITICAL with severe warnings
        critical_warnings = [
            w for w in recovery_score.warnings
            if "illness" in w.lower() or "elevated RHR" in w
        ]
        if recovery_score.category == RecoveryCategory.CRITICAL and critical_warnings:
            return (
                True,
                "Critical recovery with warning signs. Rest and monitor for illness.",
            )

        # Don't skip
        return False, ""

    def adjust_program_week(
        self,
        week_workouts: list[Workout],
        recovery_scores: list[RecoveryScore],
    ) -> list[IntensityRecommendation]:
        """
        Adjust entire week of workouts based on recovery trend.

        Args:
            week_workouts: Planned workouts for the week
            recovery_scores: Recovery scores for each day

        Returns:
            List of adjusted workouts
        """
        if len(week_workouts) != len(recovery_scores):
            raise ValueError("Must provide recovery score for each workout")

        recommendations = []

        for workout, recovery in zip(week_workouts, recovery_scores):
            rec = self.adjust_workout(workout, recovery)
            recommendations.append(rec)

        # Check for patterns requiring additional adjustment
        self._check_weekly_patterns(recommendations)

        return recommendations

    def _check_weekly_patterns(
        self,
        recommendations: list[IntensityRecommendation],
    ) -> None:
        """
        Check for weekly patterns that require additional notes.

        Adds warnings for:
        - Consistent poor recovery
        - Declining trend
        - High variability
        """
        # Count poor/critical days
        poor_days = sum(
            1 for r in recommendations
            if r.recovery_category in [RecoveryCategory.POOR, RecoveryCategory.CRITICAL]
        )

        if poor_days >= 4:
            for rec in recommendations:
                rec.warnings.append(
                    f"{poor_days} days of poor recovery this week. "
                    "Consider deload week or rest."
                )

        # Check for declining trend
        scores = [r.recovery_score for r in recommendations]
        if len(scores) >= 3:
            recent_trend = scores[-3:]
            if all(recent_trend[i] > recent_trend[i + 1] for i in range(len(recent_trend) - 1)):
                for rec in recommendations[-2:]:
                    rec.notes.append(
                        "Declining recovery trend detected. Monitor closely."
                    )


# Global adjuster instance
_intensity_adjuster: Optional[IntensityAdjuster] = None


def get_intensity_adjuster() -> IntensityAdjuster:
    """Get or create global intensity adjuster"""
    global _intensity_adjuster
    if _intensity_adjuster is None:
        _intensity_adjuster = IntensityAdjuster()
    return _intensity_adjuster
