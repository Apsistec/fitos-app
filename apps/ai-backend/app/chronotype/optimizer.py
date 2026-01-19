"""
Chronotype Optimizer

Optimal workout timing based on chronotype and circadian rhythm research.

Research:
- Facer-Childs et al. (2018): 8.4% performance difference
- Knaier et al. (2021): Time-of-day effects on strength
- Vitale & Weydahl (2017): Chronotype and athletic performance

Sprint 35: Chronotype Optimization
"""

from dataclasses import dataclass, field
from datetime import time, datetime, timedelta
from typing import Optional, Literal
from enum import Enum

from app.chronotype.assessment import ChronotypeCategory, ChronotypeResult


class WorkoutType(str, Enum):
    """Workout type categories"""

    STRENGTH = "strength"  # Heavy lifting, max strength
    POWER = "power"  # Explosive movements, plyometrics
    HYPERTROPHY = "hypertrophy"  # Muscle building
    ENDURANCE = "endurance"  # Cardio, conditioning
    SKILL = "skill"  # Technique work, practice
    RECOVERY = "recovery"  # Active recovery, mobility


@dataclass
class OptimalWindow:
    """Optimal training window"""

    start_time: time
    end_time: time
    performance_multiplier: float  # 0.8-1.15 (relative to baseline)
    confidence: float  # 0-1
    reasoning: str
    considerations: list[str] = field(default_factory=list)


@dataclass
class DailySchedule:
    """Complete daily training schedule with circadian considerations"""

    chronotype: ChronotypeCategory

    # Optimal windows for different workout types
    strength_window: OptimalWindow
    power_window: OptimalWindow
    hypertrophy_window: OptimalWindow
    endurance_window: OptimalWindow

    # Time-based recommendations
    best_overall_time: time
    acceptable_times: list[tuple[time, time]]  # List of (start, end) windows
    avoid_times: list[tuple[time, time]]  # Times to avoid training

    # Practical considerations
    warm_up_adjustments: dict[str, str]  # time_window → adjustment recommendation
    notes: list[str] = field(default_factory=list)


class ChronotypeOptimizer:
    """
    Chronotype-based workout timing optimizer.

    Uses circadian rhythm research to recommend optimal training times
    for different workout types based on chronotype.
    """

    # Performance multipliers by time of day (research-based)
    # Facer-Childs et al. (2018): up to 8.4% difference
    PERFORMANCE_CURVES = {
        ChronotypeCategory.EXTREME_MORNING: {
            time(6, 0): 1.10,
            time(8, 0): 1.08,
            time(10, 0): 1.0,
            time(12, 0): 0.95,
            time(14, 0): 0.92,
            time(16, 0): 0.90,
            time(18, 0): 0.88,
            time(20, 0): 0.85,
        },
        ChronotypeCategory.MODERATE_MORNING: {
            time(7, 0): 1.06,
            time(9, 0): 1.05,
            time(11, 0): 1.0,
            time(13, 0): 0.98,
            time(15, 0): 0.95,
            time(17, 0): 0.93,
            time(19, 0): 0.90,
        },
        ChronotypeCategory.INTERMEDIATE: {
            time(8, 0): 1.0,
            time(10, 0): 1.02,
            time(12, 0): 1.03,
            time(14, 0): 1.02,
            time(16, 0): 1.0,
            time(18, 0): 0.98,
            time(20, 0): 0.95,
        },
        ChronotypeCategory.MODERATE_EVENING: {
            time(10, 0): 0.92,
            time(12, 0): 0.96,
            time(14, 0): 1.0,
            time(16, 0): 1.04,
            time(18, 0): 1.06,
            time(20, 0): 1.03,
        },
        ChronotypeCategory.EXTREME_EVENING: {
            time(12, 0): 0.88,
            time(14, 0): 0.93,
            time(16, 0): 1.0,
            time(18, 0): 1.06,
            time(20, 0): 1.08,
            time(22, 0): 1.05,
        },
    }

    def __init__(self):
        pass

    def get_optimal_window(
        self,
        chronotype_result: ChronotypeResult,
        workout_type: WorkoutType,
        constraints: Optional[dict] = None,
    ) -> OptimalWindow:
        """
        Get optimal training window for workout type.

        Args:
            chronotype_result: User's chronotype assessment
            workout_type: Type of workout to schedule
            constraints: Optional scheduling constraints
                - earliest_time: time
                - latest_time: time
                - excluded_windows: list[tuple[time, time]]

        Returns:
            OptimalWindow with timing and reasoning
        """
        category = chronotype_result.category

        # Get performance curve for chronotype
        perf_curve = self.PERFORMANCE_CURVES.get(category, {})

        # Workout type specific adjustments
        if workout_type == WorkoutType.STRENGTH:
            # Strength peaks 2-4 hours after peak window
            optimal = self._find_strength_window(chronotype_result, perf_curve)
        elif workout_type == WorkoutType.POWER:
            # Power peaks at same time as general performance
            optimal = self._find_power_window(chronotype_result, perf_curve)
        elif workout_type == WorkoutType.HYPERTROPHY:
            # Hypertrophy less time-sensitive, optimize for consistency
            optimal = self._find_hypertrophy_window(chronotype_result, perf_curve)
        elif workout_type == WorkoutType.ENDURANCE:
            # Endurance best when core temp elevated (afternoon)
            optimal = self._find_endurance_window(chronotype_result, perf_curve)
        elif workout_type == WorkoutType.SKILL:
            # Skill work best during peak alertness
            optimal = chronotype_result.peak_performance_window
        else:  # RECOVERY
            # Recovery work anytime, avoid peak windows
            optimal = self._find_recovery_window(chronotype_result)

        # Apply constraints if provided
        if constraints:
            optimal = self._apply_constraints(optimal, constraints)

        return optimal

    def create_daily_schedule(
        self,
        chronotype_result: ChronotypeResult,
    ) -> DailySchedule:
        """
        Create complete daily training schedule.

        Args:
            chronotype_result: User's chronotype assessment

        Returns:
            DailySchedule with all workout type windows
        """
        category = chronotype_result.category

        # Get windows for each workout type
        strength_window = self._create_window_from_peak(
            chronotype_result.peak_performance_window,
            offset_hours=0,
            multiplier=1.08,
            reasoning="Strength peaks during natural performance window",
        )

        power_window = self._create_window_from_peak(
            chronotype_result.peak_performance_window,
            offset_hours=0,
            multiplier=1.10,
            reasoning="Power and explosiveness peak during circadian high",
        )

        hypertrophy_window = self._create_window_from_peak(
            chronotype_result.peak_performance_window,
            offset_hours=2,
            multiplier=1.05,
            reasoning="Hypertrophy training flexible, optimize for consistency",
        )

        endurance_window = self._create_window_from_peak(
            chronotype_result.peak_performance_window,
            offset_hours=1,
            multiplier=1.03,
            reasoning="Endurance benefits from elevated core temperature",
        )

        # Determine best overall time
        best_time = chronotype_result.peak_performance_window[0]

        # Acceptable and avoid windows
        acceptable = self._get_acceptable_windows(category)
        avoid = [chronotype_result.worst_performance_window]

        # Warm-up adjustments
        warmup_adj = self._get_warmup_adjustments(category)

        # Notes
        notes = self._get_schedule_notes(category)

        return DailySchedule(
            chronotype=category,
            strength_window=strength_window,
            power_window=power_window,
            hypertrophy_window=hypertrophy_window,
            endurance_window=endurance_window,
            best_overall_time=best_time,
            acceptable_times=acceptable,
            avoid_times=avoid,
            warm_up_adjustments=warmup_adj,
            notes=notes,
        )

    def _find_strength_window(
        self,
        result: ChronotypeResult,
        perf_curve: dict,
    ) -> OptimalWindow:
        """Find optimal strength training window"""
        start, end = result.peak_performance_window

        return OptimalWindow(
            start_time=start,
            end_time=end,
            performance_multiplier=1.08,
            confidence=0.9,
            reasoning="Strength training optimal during natural performance peak. "
            "Research shows up to 8% strength advantage at optimal times.",
            considerations=[
                "Allow 2-3 hours after waking for full CNS activation",
                "Core temperature peaks 2-4 hours into day for most chronotypes",
            ],
        )

    def _find_power_window(
        self,
        result: ChronotypeResult,
        perf_curve: dict,
    ) -> OptimalWindow:
        """Find optimal power/explosive training window"""
        start, end = result.peak_performance_window

        return OptimalWindow(
            start_time=start,
            end_time=end,
            performance_multiplier=1.10,
            confidence=0.95,
            reasoning="Power output peaks during circadian high. "
            "Explosive movements require full CNS activation.",
            considerations=[
                "Requires thorough warm-up (15-20 min)",
                "Avoid within 2 hours of waking",
            ],
        )

    def _find_hypertrophy_window(
        self,
        result: ChronotypeResult,
        perf_curve: dict,
    ) -> OptimalWindow:
        """Find optimal hypertrophy training window"""
        # Hypertrophy more flexible - optimize for consistency
        start = self._add_hours(result.peak_performance_window[0], 1)
        end = self._add_hours(result.peak_performance_window[1], 1)

        return OptimalWindow(
            start_time=start,
            end_time=end,
            performance_multiplier=1.05,
            confidence=0.85,
            reasoning="Hypertrophy training less time-sensitive than strength/power. "
            "Optimize for schedule consistency and adherence.",
            considerations=[
                "Consistency matters more than precise timing",
                "Acceptable to train outside peak window",
            ],
        )

    def _find_endurance_window(
        self,
        result: ChronotypeResult,
        perf_curve: dict,
    ) -> OptimalWindow:
        """Find optimal endurance training window"""
        # Endurance best when core temp elevated (usually afternoon)
        start = time(14, 0)
        end = time(18, 0)

        return OptimalWindow(
            start_time=start,
            end_time=end,
            performance_multiplier=1.03,
            confidence=0.80,
            reasoning="Endurance performance benefits from elevated core temperature, "
            "typically highest in afternoon for all chronotypes.",
            considerations=[
                "Morning endurance work acceptable for early chronotypes",
                "Hydration especially important in afternoon",
            ],
        )

    def _find_recovery_window(self, result: ChronotypeResult) -> OptimalWindow:
        """Find optimal recovery work window"""
        # Recovery work best outside peak windows
        worst_start, worst_end = result.worst_performance_window

        return OptimalWindow(
            start_time=worst_start,
            end_time=worst_end,
            performance_multiplier=1.0,
            confidence=0.70,
            reasoning="Active recovery and mobility work can be done anytime. "
            "Consider scheduling during low-energy windows.",
            considerations=[
                "Light movement aids recovery any time",
                "Evening mobility may improve sleep",
            ],
        )

    def _create_window_from_peak(
        self,
        peak: tuple[time, time],
        offset_hours: int,
        multiplier: float,
        reasoning: str,
    ) -> OptimalWindow:
        """Create window offset from peak"""
        start = self._add_hours(peak[0], offset_hours)
        end = self._add_hours(peak[1], offset_hours)

        return OptimalWindow(
            start_time=start,
            end_time=end,
            performance_multiplier=multiplier,
            confidence=0.85,
            reasoning=reasoning,
        )

    def _get_acceptable_windows(
        self,
        category: ChronotypeCategory,
    ) -> list[tuple[time, time]]:
        """Get acceptable training windows for chronotype"""
        windows = {
            ChronotypeCategory.EXTREME_MORNING: [
                (time(6, 0), time(12, 0)),
                (time(14, 0), time(16, 0)),
            ],
            ChronotypeCategory.MODERATE_MORNING: [
                (time(7, 0), time(13, 0)),
                (time(15, 0), time(18, 0)),
            ],
            ChronotypeCategory.INTERMEDIATE: [
                (time(8, 0), time(20, 0)),  # Very flexible
            ],
            ChronotypeCategory.MODERATE_EVENING: [
                (time(10, 0), time(14, 0)),
                (time(16, 0), time(21, 0)),
            ],
            ChronotypeCategory.EXTREME_EVENING: [
                (time(14, 0), time(22, 0)),
            ],
        }
        return windows.get(category, [(time(9, 0), time(18, 0))])

    def _get_warmup_adjustments(
        self,
        category: ChronotypeCategory,
    ) -> dict[str, str]:
        """Get warm-up recommendations by time of day"""
        if category in [
            ChronotypeCategory.EXTREME_EVENING,
            ChronotypeCategory.MODERATE_EVENING,
        ]:
            return {
                "morning": "Add 10-15 min warm-up. Include dynamic stretching and gradual intensity ramp.",
                "afternoon": "Standard 10 min warm-up sufficient.",
                "evening": "Standard warm-up. Peak performance window.",
            }
        else:  # Morning types
            return {
                "morning": "Standard warm-up. Peak performance window.",
                "afternoon": "Standard 10 min warm-up sufficient.",
                "evening": "Add 5-10 min warm-up. Performance declining.",
            }

    def _get_schedule_notes(self, category: ChronotypeCategory) -> list[str]:
        """Get scheduling notes for chronotype"""
        notes_map = {
            ChronotypeCategory.EXTREME_MORNING: [
                "Front-load weekly volume early in week (Mon-Tue)",
                "Schedule heavy lifts AM, accessories PM if needed",
                "Avoid intense training after 7 PM",
            ],
            ChronotypeCategory.EXTREME_EVENING: [
                "If forced to train early (<10 AM), reduce intensity 15-20%",
                "Consider light exposure therapy for early sessions",
                "Schedule heavy lifts 4-9 PM when possible",
            ],
            ChronotypeCategory.INTERMEDIATE: [
                "High flexibility - optimize for consistency",
                "Track performance at different times to find personal sweet spot",
            ],
        }
        return notes_map.get(category, [])

    def _add_hours(self, t: time, hours: int) -> time:
        """Add hours to time (handles day rollover)"""
        dt = datetime.combine(datetime.today(), t)
        dt += timedelta(hours=hours)
        return dt.time()

    def _apply_constraints(
        self,
        window: tuple[time, time],
        constraints: dict,
    ) -> tuple[time, time]:
        """Apply scheduling constraints to window"""
        start, end = window

        # Apply earliest/latest constraints
        if "earliest_time" in constraints:
            start = max(start, constraints["earliest_time"])

        if "latest_time" in constraints:
            end = min(end, constraints["latest_time"])

        return (start, end)


# Global optimizer instance
_optimizer: Optional[ChronotypeOptimizer] = None


def get_chronotype_optimizer() -> ChronotypeOptimizer:
    """Get or create global chronotype optimizer"""
    global _optimizer
    if _optimizer is None:
        _optimizer = ChronotypeOptimizer()
    return _optimizer
