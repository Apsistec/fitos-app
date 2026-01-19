"""
Chronotype Assessment

MEQ-based (Morningness-Eveningness Questionnaire) chronotype assessment.

Based on:
- Horne & Östberg (1976): Original MEQ
- Randler (2008): Reduced MEQ validation
- Facer-Childs et al. (2018): Performance timing research

Sprint 35: Chronotype Optimization
"""

from dataclasses import dataclass, field
from typing import Literal, Optional
from enum import Enum
from datetime import time


class ChronotypeCategory(str, Enum):
    """Chronotype categories"""

    EXTREME_MORNING = "extreme_morning"  # Early birds (70-86 score)
    MODERATE_MORNING = "moderate_morning"  # Morning types (59-69)
    INTERMEDIATE = "intermediate"  # Neither type (42-58)
    MODERATE_EVENING = "moderate_evening"  # Evening types (31-41)
    EXTREME_EVENING = "extreme_evening"  # Night owls (16-30)


@dataclass
class Question:
    """Single chronotype assessment question"""

    id: str
    text: str
    options: list[dict]  # {"text": str, "value": int}
    category: str  # "sleep", "wake", "performance", "preference"


@dataclass
class ChronotypeResult:
    """Chronotype assessment result"""

    category: ChronotypeCategory
    score: int  # 16-86 (MEQ score)
    confidence: float  # 0-1

    # Characteristics
    natural_wake_time: time  # Preferred wake time
    natural_sleep_time: time  # Preferred sleep time
    peak_performance_window: tuple[time, time]  # (start, end)
    worst_performance_window: tuple[time, time]  # (start, end)

    # Insights
    description: str
    strengths: list[str] = field(default_factory=list)
    challenges: list[str] = field(default_factory=list)
    recommendations: list[str] = field(default_factory=list)


class ChronotypeAssessment:
    """
    Chronotype assessment based on MEQ (Morningness-Eveningness Questionnaire).

    Uses reduced 5-question version validated by Randler (2008) for quick assessment.
    """

    # MEQ-based questions (reduced version)
    QUESTIONS = [
        Question(
            id="wake_preference",
            text="If you were entirely free to plan your day, at what time would you prefer to wake up?",
            options=[
                {"text": "5:00 AM - 6:30 AM", "value": 5},
                {"text": "6:30 AM - 7:45 AM", "value": 4},
                {"text": "7:45 AM - 9:45 AM", "value": 3},
                {"text": "9:45 AM - 11:00 AM", "value": 2},
                {"text": "11:00 AM - 12:00 PM", "value": 1},
            ],
            category="wake",
        ),
        Question(
            id="sleep_preference",
            text="If you were entirely free to plan your evening, at what time would you prefer to go to bed?",
            options=[
                {"text": "8:00 PM - 9:00 PM", "value": 5},
                {"text": "9:00 PM - 10:15 PM", "value": 4},
                {"text": "10:15 PM - 12:30 AM", "value": 3},
                {"text": "12:30 AM - 1:45 AM", "value": 2},
                {"text": "1:45 AM - 3:00 AM", "value": 1},
            ],
            category="sleep",
        ),
        Question(
            id="morning_alertness",
            text="How alert do you feel during the first half hour after waking?",
            options=[
                {"text": "Very alert", "value": 4},
                {"text": "Fairly alert", "value": 3},
                {"text": "Fairly tired", "value": 2},
                {"text": "Very tired", "value": 1},
            ],
            category="wake",
        ),
        Question(
            id="peak_time",
            text="At what time of day do you feel at your best for physically demanding tasks?",
            options=[
                {"text": "5:00 AM - 8:00 AM", "value": 5},
                {"text": "8:00 AM - 10:00 AM", "value": 4},
                {"text": "10:00 AM - 5:00 PM", "value": 3},
                {"text": "5:00 PM - 10:00 PM", "value": 2},
                {"text": "10:00 PM - 5:00 AM", "value": 1},
            ],
            category="performance",
        ),
        Question(
            id="evening_tiredness",
            text="At what time in the evening do you feel tired and need to sleep?",
            options=[
                {"text": "8:00 PM - 9:00 PM", "value": 5},
                {"text": "9:00 PM - 10:15 PM", "value": 4},
                {"text": "10:15 PM - 12:45 AM", "value": 3},
                {"text": "12:45 AM - 2:00 AM", "value": 2},
                {"text": "2:00 AM - 3:00 AM", "value": 1},
            ],
            category="sleep",
        ),
    ]

    def __init__(self):
        pass

    def get_questions(self) -> list[Question]:
        """Get assessment questions"""
        return self.QUESTIONS

    def calculate_score(self, responses: dict[str, int]) -> ChronotypeResult:
        """
        Calculate chronotype from responses.

        Args:
            responses: Dict mapping question ID to selected value

        Returns:
            ChronotypeResult with category and insights
        """
        # Calculate total score
        total_score = sum(responses.values())

        # Normalize to MEQ scale (5-25 → 16-86 approximately)
        # Linear transformation
        min_score, max_score = 5, 25
        normalized_score = int(
            16 + ((total_score - min_score) / (max_score - min_score)) * (86 - 16)
        )

        # Determine category
        category = self._determine_category(normalized_score)

        # Calculate confidence based on response consistency
        confidence = self._calculate_confidence(responses)

        # Get characteristics
        natural_wake = self._estimate_wake_time(category)
        natural_sleep = self._estimate_sleep_time(category)
        peak_window = self._estimate_peak_window(category)
        worst_window = self._estimate_worst_window(category)

        # Get insights
        description = self._get_description(category)
        strengths = self._get_strengths(category)
        challenges = self._get_challenges(category)
        recommendations = self._get_recommendations(category)

        return ChronotypeResult(
            category=category,
            score=normalized_score,
            confidence=confidence,
            natural_wake_time=natural_wake,
            natural_sleep_time=natural_sleep,
            peak_performance_window=peak_window,
            worst_performance_window=worst_window,
            description=description,
            strengths=strengths,
            challenges=challenges,
            recommendations=recommendations,
        )

    def _determine_category(self, score: int) -> ChronotypeCategory:
        """Determine chronotype category from MEQ score"""
        if score >= 70:
            return ChronotypeCategory.EXTREME_MORNING
        elif score >= 59:
            return ChronotypeCategory.MODERATE_MORNING
        elif score >= 42:
            return ChronotypeCategory.INTERMEDIATE
        elif score >= 31:
            return ChronotypeCategory.MODERATE_EVENING
        else:
            return ChronotypeCategory.EXTREME_EVENING

    def _calculate_confidence(self, responses: dict[str, int]) -> float:
        """
        Calculate confidence in assessment.

        Higher confidence when responses are consistent (all high or all low).
        Lower confidence when responses are mixed.
        """
        values = list(responses.values())
        if len(values) < 3:
            return 0.5

        # Calculate variance
        mean_val = sum(values) / len(values)
        variance = sum((v - mean_val) ** 2 for v in values) / len(values)

        # Low variance = high consistency = high confidence
        # High variance = low consistency = low confidence
        max_variance = 4.0  # Theoretical max for 1-5 scale
        consistency = 1.0 - (variance / max_variance)

        # Confidence between 0.6 and 1.0
        return round(0.6 + (consistency * 0.4), 2)

    def _estimate_wake_time(self, category: ChronotypeCategory) -> time:
        """Estimate natural wake time"""
        wake_times = {
            ChronotypeCategory.EXTREME_MORNING: time(5, 30),
            ChronotypeCategory.MODERATE_MORNING: time(6, 30),
            ChronotypeCategory.INTERMEDIATE: time(7, 30),
            ChronotypeCategory.MODERATE_EVENING: time(8, 30),
            ChronotypeCategory.EXTREME_EVENING: time(9, 30),
        }
        return wake_times[category]

    def _estimate_sleep_time(self, category: ChronotypeCategory) -> time:
        """Estimate natural sleep time"""
        sleep_times = {
            ChronotypeCategory.EXTREME_MORNING: time(21, 0),
            ChronotypeCategory.MODERATE_MORNING: time(22, 0),
            ChronotypeCategory.INTERMEDIATE: time(23, 0),
            ChronotypeCategory.MODERATE_EVENING: time(0, 0),
            ChronotypeCategory.EXTREME_EVENING: time(1, 0),
        }
        return sleep_times[category]

    def _estimate_peak_window(self, category: ChronotypeCategory) -> tuple[time, time]:
        """Estimate peak performance window"""
        peak_windows = {
            ChronotypeCategory.EXTREME_MORNING: (time(6, 0), time(10, 0)),
            ChronotypeCategory.MODERATE_MORNING: (time(7, 0), time(11, 0)),
            ChronotypeCategory.INTERMEDIATE: (time(9, 0), time(13, 0)),
            ChronotypeCategory.MODERATE_EVENING: (time(12, 0), time(16, 0)),
            ChronotypeCategory.EXTREME_EVENING: (time(16, 0), time(22, 0)),
        }
        return peak_windows[category]

    def _estimate_worst_window(self, category: ChronotypeCategory) -> tuple[time, time]:
        """Estimate worst performance window"""
        worst_windows = {
            ChronotypeCategory.EXTREME_MORNING: (time(18, 0), time(22, 0)),
            ChronotypeCategory.MODERATE_MORNING: (time(19, 0), time(23, 0)),
            ChronotypeCategory.INTERMEDIATE: (time(5, 0), time(7, 0)),
            ChronotypeCategory.MODERATE_EVENING: (time(5, 0), time(9, 0)),
            ChronotypeCategory.EXTREME_EVENING: (time(5, 0), time(11, 0)),
        }
        return worst_windows[category]

    def _get_description(self, category: ChronotypeCategory) -> str:
        """Get chronotype description"""
        descriptions = {
            ChronotypeCategory.EXTREME_MORNING: "You are a strong morning person (early bird). You naturally wake early, feel most alert in the morning, and prefer to sleep early.",
            ChronotypeCategory.MODERATE_MORNING: "You have a morning preference. You tend to wake relatively early and feel more productive in the morning hours.",
            ChronotypeCategory.INTERMEDIATE: "You are a neutral chronotype (neither morning nor evening preference). You have flexibility in your schedule and can adapt to various training times.",
            ChronotypeCategory.MODERATE_EVENING: "You have an evening preference. You tend to sleep later, wake later, and feel more productive in afternoon/evening.",
            ChronotypeCategory.EXTREME_EVENING: "You are a strong evening person (night owl). You naturally stay up late, struggle with early mornings, and peak in the evening.",
        }
        return descriptions[category]

    def _get_strengths(self, category: ChronotypeCategory) -> list[str]:
        """Get chronotype strengths"""
        strengths_map = {
            ChronotypeCategory.EXTREME_MORNING: [
                "Peak performance in morning workouts",
                "Natural early riser - no alarm needed",
                "Higher adherence to morning training routines (43% more reliable)",
                "Better recovery from evening training load",
            ],
            ChronotypeCategory.MODERATE_MORNING: [
                "Good morning performance",
                "Flexibility for mid-morning workouts",
                "Strong habit formation for AM routines",
            ],
            ChronotypeCategory.INTERMEDIATE: [
                "Flexibility - can train any time of day",
                "Adaptable to schedule changes",
                "No strong circadian disadvantages",
            ],
            ChronotypeCategory.MODERATE_EVENING: [
                "Strong afternoon/evening performance",
                "Flexibility for lunch or evening sessions",
                "Peak strength typically in afternoon",
            ],
            ChronotypeCategory.EXTREME_EVENING: [
                "Exceptional evening performance",
                "Peak power output in late afternoon/evening",
                "Better recovery when training aligns with natural rhythm",
            ],
        }
        return strengths_map[category]

    def _get_challenges(self, category: ChronotypeCategory) -> list[str]:
        """Get chronotype challenges"""
        challenges_map = {
            ChronotypeCategory.EXTREME_MORNING: [
                "Poor performance in evening workouts",
                "Social jetlag from late evening obligations",
                "May need to force early bedtime",
            ],
            ChronotypeCategory.MODERATE_MORNING: [
                "Slightly reduced evening performance",
                "May struggle with very early training (<6 AM)",
            ],
            ChronotypeCategory.INTERMEDIATE: [
                "Less pronounced peak performance window",
                "May need experimentation to find optimal timing",
            ],
            ChronotypeCategory.MODERATE_EVENING: [
                "Reduced morning performance",
                "Social jetlag from early morning obligations",
                "May struggle with early training sessions",
            ],
            ChronotypeCategory.EXTREME_EVENING: [
                "Severely impaired morning performance (up to 8.4% worse)",
                "High social jetlag from standard work schedules",
                "Difficulty with early morning training",
                "Sleep deprivation from forced early schedules",
            ],
        }
        return challenges_map[category]

    def _get_recommendations(self, category: ChronotypeCategory) -> list[str]:
        """Get personalized recommendations"""
        recommendations_map = {
            ChronotypeCategory.EXTREME_MORNING: [
                "Schedule strength training 6-10 AM for peak performance",
                "Avoid intense evening workouts (after 7 PM)",
                "Front-load weekly volume in early week (Monday-Tuesday)",
                "Use evening for mobility, recovery work only",
            ],
            ChronotypeCategory.MODERATE_MORNING: [
                "Schedule main lifts 7-11 AM when possible",
                "Evening workouts acceptable but may need longer warm-up",
                "Consider AM workouts on heavy training days",
            ],
            ChronotypeCategory.INTERMEDIATE: [
                "Experiment with different training times",
                "Optimize based on schedule convenience",
                "Consistency > specific timing for your type",
                "Use performance tracking to find personal sweet spot",
            ],
            ChronotypeCategory.MODERATE_EVENING: [
                "Schedule main training 12-4 PM or 5-8 PM",
                "If forced to train early, extend warm-up by 10+ minutes",
                "Consider caffeine pre-workout for AM sessions",
            ],
            ChronotypeCategory.EXTREME_EVENING: [
                "Schedule strength training 4-9 PM for peak performance",
                "Avoid early morning (<10 AM) intense training if possible",
                "If forced to train early, reduce intensity 15-20%",
                "Use light exposure therapy for early morning sessions",
                "Consider afternoon naps for recovery if training early",
            ],
        }
        return recommendations_map[category]


# Global assessment instance
_assessment: Optional[ChronotypeAssessment] = None


def get_chronotype_assessment() -> ChronotypeAssessment:
    """Get or create global chronotype assessment"""
    global _assessment
    if _assessment is None:
        _assessment = ChronotypeAssessment()
    return _assessment
