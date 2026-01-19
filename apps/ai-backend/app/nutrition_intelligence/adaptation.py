"""
Metabolic Adaptation Detector

Detects metabolic adaptation during dieting and recommends diet breaks.

Research:
- 2025 Systematic Review: Diet breaks reduce metabolic adaptation by ~209 kJ/d
- MATADOR study: 2-week breaks → 47% greater weight loss vs continuous dieting
- Adaptive thermogenesis: -46 ± 113 kcal/d typical after weight loss

Sprint 36: Nutrition Intelligence
"""

from dataclasses import dataclass, field
from datetime import date, timedelta
from typing import Optional, Literal
from enum import Enum
import statistics

from app.nutrition_intelligence.expenditure import WeightDataPoint, IntakeDataPoint


class AdaptationSeverity(str, Enum):
    """Metabolic adaptation severity levels"""

    NONE = "none"  # <50 kcal reduction
    MILD = "mild"  # 50-150 kcal reduction
    MODERATE = "moderate"  # 150-250 kcal reduction
    SEVERE = "severe"  # >250 kcal reduction


@dataclass
class AdaptationStatus:
    """Metabolic adaptation status"""

    severity: AdaptationSeverity
    estimated_reduction_kcal: float  # How much TDEE has dropped beyond expected
    weeks_in_deficit: int
    total_weight_lost_kg: float
    weight_loss_rate_kg_per_week: float

    # Recommendations
    recommend_diet_break: bool
    diet_break_duration_days: int
    maintenance_calories: float

    # Context
    predicted_tdee: float  # What TDEE should be based on weight
    actual_tdee: float  # What TDEE actually is
    adaptation_percent: float  # Percent reduction

    notes: list[str] = field(default_factory=list)


class AdaptationDetector:
    """
    Detect metabolic adaptation during weight loss.

    Metabolic adaptation is when your metabolism slows beyond what would
    be expected from weight loss alone. Common during extended dieting.

    Detection Method:
    - Compare actual TDEE to predicted TDEE based on weight
    - >150 kcal difference suggests adaptation
    - Recommend diet breaks for recovery
    """

    # Typical TDEE per kg of body weight (rough estimate)
    TDEE_PER_KG_SEDENTARY = 28
    TDEE_PER_KG_MODERATE = 33
    TDEE_PER_KG_ACTIVE = 38

    def __init__(self):
        pass

    def detect_adaptation(
        self,
        current_weight_kg: float,
        starting_weight_kg: float,
        current_tdee: float,
        weeks_in_deficit: int,
        activity_level: Literal["sedentary", "moderate", "active"] = "moderate",
        sex: Literal["male", "female"] = "male",
    ) -> AdaptationStatus:
        """
        Detect metabolic adaptation.

        Args:
            current_weight_kg: Current body weight
            starting_weight_kg: Starting weight at beginning of diet
            current_tdee: Current measured TDEE
            weeks_in_deficit: Number of weeks in calorie deficit
            activity_level: Activity level category
            sex: Biological sex

        Returns:
            AdaptationStatus with severity and recommendations
        """
        # Calculate expected TDEE for current weight
        if activity_level == "sedentary":
            tdee_per_kg = self.TDEE_PER_KG_SEDENTARY
        elif activity_level == "active":
            tdee_per_kg = self.TDEE_PER_KG_ACTIVE
        else:
            tdee_per_kg = self.TDEE_PER_KG_MODERATE

        # Adjust for sex (women ~5% lower on average)
        if sex == "female":
            tdee_per_kg *= 0.95

        predicted_tdee = current_weight_kg * tdee_per_kg

        # Calculate adaptation
        adaptation_kcal = predicted_tdee - current_tdee
        adaptation_percent = (adaptation_kcal / predicted_tdee) * 100

        # Determine severity
        if adaptation_kcal < 50:
            severity = AdaptationSeverity.NONE
        elif adaptation_kcal < 150:
            severity = AdaptationSeverity.MILD
        elif adaptation_kcal < 250:
            severity = AdaptationSeverity.MODERATE
        else:
            severity = AdaptationSeverity.SEVERE

        # Calculate weight loss stats
        weight_lost_kg = starting_weight_kg - current_weight_kg
        weight_loss_rate = weight_lost_kg / max(weeks_in_deficit, 1)

        # Recommendations
        recommend_break = self._should_recommend_diet_break(
            severity, weeks_in_deficit, weight_loss_rate
        )

        if recommend_break:
            break_duration = self._calculate_diet_break_duration(severity, weeks_in_deficit)
        else:
            break_duration = 0

        # Maintenance calories (for diet break)
        maintenance_calories = round(predicted_tdee)

        # Generate notes
        notes = self._generate_notes(
            severity,
            adaptation_kcal,
            weeks_in_deficit,
            weight_lost_kg,
            recommend_break,
        )

        return AdaptationStatus(
            severity=severity,
            estimated_reduction_kcal=round(adaptation_kcal),
            weeks_in_deficit=weeks_in_deficit,
            total_weight_lost_kg=round(weight_lost_kg, 1),
            weight_loss_rate_kg_per_week=round(weight_loss_rate, 2),
            recommend_diet_break=recommend_break,
            diet_break_duration_days=break_duration,
            maintenance_calories=maintenance_calories,
            predicted_tdee=round(predicted_tdee),
            actual_tdee=round(current_tdee),
            adaptation_percent=round(adaptation_percent, 1),
            notes=notes,
        )

    def _should_recommend_diet_break(
        self,
        severity: AdaptationSeverity,
        weeks_in_deficit: int,
        weight_loss_rate: float,
    ) -> bool:
        """
        Determine if diet break is recommended.

        Criteria:
        - Moderate/severe adaptation
        - 6+ weeks in deficit
        - Reasonable weight loss rate (<1.5 kg/week)
        """
        if severity in [AdaptationSeverity.MODERATE, AdaptationSeverity.SEVERE]:
            if weeks_in_deficit >= 6:
                return True

        # Also recommend for extended dieting (12+ weeks) even if mild
        if weeks_in_deficit >= 12 and severity != AdaptationSeverity.NONE:
            return True

        # Or if weight loss has stalled despite deficit
        if weeks_in_deficit >= 4 and weight_loss_rate < 0.2:
            return True

        return False

    def _calculate_diet_break_duration(
        self,
        severity: AdaptationSeverity,
        weeks_in_deficit: int,
    ) -> int:
        """
        Calculate recommended diet break duration.

        Research suggests:
        - 1-2 weeks for mild/moderate
        - 2-4 weeks for severe
        - Longer breaks after extended dieting
        """
        if severity == AdaptationSeverity.SEVERE:
            # Severe: 2-4 weeks
            if weeks_in_deficit > 16:
                return 28  # 4 weeks
            else:
                return 21  # 3 weeks
        elif severity == AdaptationSeverity.MODERATE:
            # Moderate: 2-3 weeks
            if weeks_in_deficit > 12:
                return 21  # 3 weeks
            else:
                return 14  # 2 weeks
        else:
            # Mild: 1-2 weeks
            return 14  # 2 weeks

    def _generate_notes(
        self,
        severity: AdaptationSeverity,
        adaptation_kcal: float,
        weeks: int,
        weight_lost: float,
        recommend_break: bool,
    ) -> list[str]:
        """Generate contextual notes"""
        notes = []

        # Severity interpretation
        if severity == AdaptationSeverity.NONE:
            notes.append("No significant metabolic adaptation detected")
        elif severity == AdaptationSeverity.MILD:
            notes.append(
                f"Mild adaptation: TDEE reduced by ~{int(adaptation_kcal)} kcal beyond weight loss"
            )
        elif severity == AdaptationSeverity.MODERATE:
            notes.append(
                f"Moderate adaptation: TDEE reduced by ~{int(adaptation_kcal)} kcal. Consider diet break."
            )
        else:
            notes.append(
                f"Severe adaptation: TDEE reduced by ~{int(adaptation_kcal)} kcal. Diet break strongly recommended."
            )

        # Progress context
        notes.append(
            f"Lost {weight_lost:.1f} kg over {weeks} weeks ({weight_lost / max(weeks, 1):.2f} kg/week)"
        )

        # Diet break rationale
        if recommend_break:
            notes.append(
                "Diet break at maintenance calories helps restore hormones and metabolism"
            )
            notes.append(
                "Research shows 2-week breaks result in 47% greater total weight loss"
            )
        else:
            notes.append("Continue current approach - adaptation minimal")

        # General advice
        if weeks >= 12:
            notes.append("Extended dieting (12+ weeks) - periodic breaks beneficial regardless")

        return notes

    def calculate_diet_break_calories(
        self,
        predicted_tdee: float,
        current_deficit_calories: float,
    ) -> dict:
        """
        Calculate calories for diet break.

        Diet break = eat at maintenance (predicted TDEE).
        """
        current_intake = predicted_tdee - current_deficit_calories
        maintenance = predicted_tdee

        increase_needed = maintenance - current_intake

        return {
            "maintenance_calories": round(maintenance),
            "current_intake": round(current_intake),
            "increase_needed": round(increase_needed),
            "duration_recommendation": "14-21 days",
            "benefits": [
                "Restore leptin and thyroid hormones",
                "Reduce cortisol and stress",
                "Improve adherence and motivation",
                "Preserve lean mass",
                "Set up for continued progress",
            ],
            "notes": [
                "Focus on protein (same as deficit phase)",
                "Increase carbs and fats to reach maintenance",
                "Continue training as normal",
                "Don't worry about small weight fluctuations (water/glycogen)",
            ],
        }


# Global detector instance
_detector: Optional[AdaptationDetector] = None


def get_adaptation_detector() -> AdaptationDetector:
    """Get or create global adaptation detector"""
    global _detector
    if _detector is None:
        _detector = AdaptationDetector()
    return _detector
