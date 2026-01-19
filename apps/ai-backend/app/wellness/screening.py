"""
Mental Health Screening (PHQ-2/GAD-2)

Validated ultra-brief screening tools for depression and anxiety.

⚠️ CRITICAL LEGAL DISCLAIMER:
This screening is for INFORMATIONAL PURPOSES ONLY and does NOT constitute
medical advice, diagnosis, or treatment. It is NOT a substitute for
professional mental health care. Users experiencing crisis should be
directed to emergency resources immediately.

Research:
- PHQ-2: Sensitivity 86%, Specificity 83% (cutoff ≥3)
- GAD-2: Sensitivity 86%, Specificity 83% (cutoff ≥3)
- Validated in multiple populations (2024 Frontiers in Psychology)

Sprint 37: Mental Health Integration
"""

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional, Literal
from enum import Enum


class ScreeningType(str, Enum):
    """Screening type"""

    PHQ2 = "phq2"  # Depression screening
    GAD2 = "gad2"  # Anxiety screening
    COMBINED = "combined"  # Both


class ScreeningSeverity(str, Enum):
    """Screening severity levels"""

    MINIMAL = "minimal"  # Score 0-2
    MILD = "mild"  # Score 3-4
    MODERATE = "moderate"  # Score 5
    SEVERE = "severe"  # Score 6


@dataclass
class ScreeningQuestion:
    """Single screening question"""

    id: str
    text: str
    type: ScreeningType
    options: list[dict] = field(
        default_factory=lambda: [
            {"text": "Not at all", "value": 0},
            {"text": "Several days", "value": 1},
            {"text": "More than half the days", "value": 2},
            {"text": "Nearly every day", "value": 3},
        ]
    )


@dataclass
class ScreeningResult:
    """Screening result with recommendations"""

    type: ScreeningType
    score: int  # 0-6
    severity: ScreeningSeverity
    description: str

    # Flags
    needs_followup: bool  # Score ≥3
    needs_professional_referral: bool  # Score ≥5
    crisis_concern: bool  # Based on specific responses

    # Recommendations
    recommendations: list[str] = field(default_factory=list)
    exercise_interventions: list[str] = field(default_factory=list)
    professional_resources: list[str] = field(default_factory=list)

    # Metadata
    screened_at: datetime = field(default_factory=datetime.now)
    notes: list[str] = field(default_factory=list)


class WellnessScreening:
    """
    Mental health screening using validated PHQ-2 and GAD-2 tools.

    PHQ-2: 2-question depression screening
    GAD-2: 2-question anxiety screening

    Scoring:
    - 0-2: Minimal symptoms
    - 3-4: Mild symptoms (follow-up recommended)
    - 5: Moderate symptoms (professional evaluation recommended)
    - 6: Severe symptoms (professional evaluation strongly recommended)
    """

    # PHQ-2 Questions (Depression)
    PHQ2_QUESTIONS = [
        ScreeningQuestion(
            id="phq2_q1",
            text="Over the last 2 weeks, how often have you been bothered by "
            "little interest or pleasure in doing things?",
            type=ScreeningType.PHQ2,
        ),
        ScreeningQuestion(
            id="phq2_q2",
            text="Over the last 2 weeks, how often have you been bothered by "
            "feeling down, depressed, or hopeless?",
            type=ScreeningType.PHQ2,
        ),
    ]

    # GAD-2 Questions (Anxiety)
    GAD2_QUESTIONS = [
        ScreeningQuestion(
            id="gad2_q1",
            text="Over the last 2 weeks, how often have you been bothered by "
            "feeling nervous, anxious, or on edge?",
            type=ScreeningType.GAD2,
        ),
        ScreeningQuestion(
            id="gad2_q2",
            text="Over the last 2 weeks, how often have you been bothered by "
            "not being able to stop or control worrying?",
            type=ScreeningType.GAD2,
        ),
    ]

    def __init__(self):
        pass

    def get_questions(self, screening_type: ScreeningType) -> list[ScreeningQuestion]:
        """Get screening questions"""
        if screening_type == ScreeningType.PHQ2:
            return self.PHQ2_QUESTIONS
        elif screening_type == ScreeningType.GAD2:
            return self.GAD2_QUESTIONS
        else:  # COMBINED
            return self.PHQ2_QUESTIONS + self.GAD2_QUESTIONS

    def calculate_score(
        self,
        responses: dict[str, int],
        screening_type: ScreeningType,
    ) -> ScreeningResult:
        """
        Calculate screening score and generate recommendations.

        Args:
            responses: Dict mapping question ID to response value (0-3)
            screening_type: Type of screening (PHQ2, GAD2, or COMBINED)

        Returns:
            ScreeningResult with score, severity, and recommendations
        """
        # Calculate total score
        total_score = sum(responses.values())

        # Determine severity
        severity = self._determine_severity(total_score)

        # Flags
        needs_followup = total_score >= 3
        needs_professional = total_score >= 5
        crisis_concern = self._check_crisis_concern(responses, total_score)

        # Generate description
        description = self._get_description(screening_type, severity)

        # Generate recommendations
        recommendations = self._generate_recommendations(severity, screening_type)

        # Exercise interventions (BMJ 2024 research)
        exercise_interventions = self._get_exercise_interventions(severity)

        # Professional resources
        professional_resources = []
        if needs_followup:
            professional_resources = self._get_professional_resources(
                severity, crisis_concern
            )

        # Notes
        notes = self._generate_notes(severity, needs_followup, crisis_concern)

        return ScreeningResult(
            type=screening_type,
            score=total_score,
            severity=severity,
            description=description,
            needs_followup=needs_followup,
            needs_professional_referral=needs_professional,
            crisis_concern=crisis_concern,
            recommendations=recommendations,
            exercise_interventions=exercise_interventions,
            professional_resources=professional_resources,
            notes=notes,
        )

    def _determine_severity(self, score: int) -> ScreeningSeverity:
        """Determine severity level from score"""
        if score <= 2:
            return ScreeningSeverity.MINIMAL
        elif score <= 4:
            return ScreeningSeverity.MILD
        elif score == 5:
            return ScreeningSeverity.MODERATE
        else:  # score == 6
            return ScreeningSeverity.SEVERE

    def _check_crisis_concern(self, responses: dict, total_score: int) -> bool:
        """
        Check for crisis concerns.

        In production, this would check for specific high-risk responses
        (e.g., PHQ-9 question 9 about suicidality, which we don't include here).
        """
        # For PHQ-2/GAD-2, severe score (6) suggests crisis concern
        return total_score == 6

    def _get_description(
        self, screening_type: ScreeningType, severity: ScreeningSeverity
    ) -> str:
        """Get description of screening result"""
        type_str = (
            "depression"
            if screening_type == ScreeningType.PHQ2
            else "anxiety"
            if screening_type == ScreeningType.GAD2
            else "depression/anxiety"
        )

        severity_descriptions = {
            ScreeningSeverity.MINIMAL: f"Minimal {type_str} symptoms detected.",
            ScreeningSeverity.MILD: f"Mild {type_str} symptoms detected. Follow-up recommended.",
            ScreeningSeverity.MODERATE: f"Moderate {type_str} symptoms. Professional evaluation recommended.",
            ScreeningSeverity.SEVERE: f"Severe {type_str} symptoms. Professional evaluation strongly recommended.",
        }

        return severity_descriptions[severity]

    def _generate_recommendations(
        self, severity: ScreeningSeverity, screening_type: ScreeningType
    ) -> list[str]:
        """Generate context-aware recommendations"""
        recommendations = []

        if severity == ScreeningSeverity.MINIMAL:
            recommendations.append("Continue regular physical activity for mental health")
            recommendations.append("Maintain consistent sleep schedule")
            recommendations.append("Stay connected with social support")
        elif severity == ScreeningSeverity.MILD:
            recommendations.append("Increase physical activity to 150+ min/week")
            recommendations.append("Consider mood-boosting workouts (dance, group classes)")
            recommendations.append("Monitor symptoms - rescreen in 2 weeks")
            recommendations.append("Reach out to trusted friends/family")
        elif severity == ScreeningSeverity.MODERATE:
            recommendations.append("Consult with a mental health professional")
            recommendations.append("Start structured exercise program (proven effective)")
            recommendations.append("Consider professional therapy or counseling")
            recommendations.append("Inform primary care provider")
        else:  # SEVERE
            recommendations.append("STRONGLY RECOMMENDED: Consult mental health professional")
            recommendations.append("Contact your primary care provider this week")
            recommendations.append("Consider immediate professional support if symptoms worsen")
            recommendations.append("Do NOT rely on self-care alone at this severity")

        return recommendations

    def _get_exercise_interventions(self, severity: ScreeningSeverity) -> list[str]:
        """Get exercise-based interventions (BMJ 2024 research)"""
        interventions = []

        if severity in [ScreeningSeverity.MINIMAL, ScreeningSeverity.MILD]:
            interventions.append(
                "Dance or group fitness classes (large effect: d=-0.96)"
            )
            interventions.append("Moderate-intensity aerobic exercise (3-5x/week)")
            interventions.append("Resistance training (2-3x/week)")
            interventions.append("Yoga or mind-body practices")
        elif severity == ScreeningSeverity.MODERATE:
            interventions.append(
                "Structured exercise program WITH professional guidance"
            )
            interventions.append("Higher-intensity exercise (if medically cleared)")
            interventions.append("Group classes for social support")
            interventions.append("Combine with professional treatment")
        else:  # SEVERE
            interventions.append(
                "Exercise as ADJUNCT to professional treatment (not replacement)"
            )
            interventions.append("Start gently with guidance from healthcare provider")
            interventions.append("Supervised exercise may be beneficial")

        return interventions

    def _get_professional_resources(
        self, severity: ScreeningSeverity, crisis: bool
    ) -> list[str]:
        """Get professional mental health resources"""
        resources = []

        if crisis or severity == ScreeningSeverity.SEVERE:
            resources.append(
                "🆘 CRISIS: National Suicide Prevention Lifeline: 988 (24/7)"
            )
            resources.append("🆘 Crisis Text Line: Text HOME to 741741")
            resources.append("🆘 Emergency: Call 911 or go to nearest ER")

        resources.append("Psychology Today Therapist Finder: psychologytoday.com")
        resources.append("SAMHSA Treatment Locator: 1-800-662-4357")
        resources.append("Your health insurance provider directory")
        resources.append("Primary care physician for referrals")

        return resources

    def _generate_notes(
        self, severity: ScreeningSeverity, followup: bool, crisis: bool
    ) -> list[str]:
        """Generate screening notes"""
        notes = []

        notes.append(
            "⚠️ This screening is for INFORMATIONAL PURPOSES ONLY - not a diagnosis"
        )
        notes.append("Professional evaluation recommended if symptoms persist")

        if followup:
            notes.append("Score ≥3 indicates need for follow-up screening")

        if severity in [ScreeningSeverity.MODERATE, ScreeningSeverity.SEVERE]:
            notes.append("⚠️ Professional mental health evaluation strongly recommended")

        if crisis:
            notes.append(
                "🆘 URGENT: Please contact crisis resources immediately if in distress"
            )

        notes.append("Exercise is effective but not a replacement for treatment")
        notes.append("Rescreen every 2-4 weeks to monitor progress")

        return notes


# Global screening instance
_screening: Optional[WellnessScreening] = None


def get_wellness_screening() -> WellnessScreening:
    """Get or create global wellness screening"""
    global _screening
    if _screening is None:
        _screening = WellnessScreening()
    return _screening
