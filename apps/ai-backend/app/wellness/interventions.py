"""
Mood-Boosting Workout Recommendations

Exercise interventions for depression and anxiety based on BMJ 2024 research.

Research:
- Dance: Large effect size (Hedges' g=-0.96)
- Walking/Jogging: Medium-large effect (g=-0.62)
- Yoga: Medium effect (g=-0.55)
- Strength training: Medium effect (g=-0.49)
- Mixed aerobic: Medium effect (g=-0.43)
- Dose: Higher intensity > lower intensity

Sprint 37: Mental Health Integration
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from enum import Enum

from app.wellness.screening import ScreeningSeverity, ScreeningType


class WorkoutIntensity(str, Enum):
    """Workout intensity levels"""

    LOW = "low"  # Gentle, restorative
    MODERATE = "moderate"  # Moderate exertion
    HIGH = "high"  # Vigorous, challenging


class MoodWorkoutType(str, Enum):
    """Workout types optimized for mood"""

    DANCE = "dance"  # Highest effect size
    WALKING = "walking"  # Accessible, low barrier
    JOGGING = "jogging"  # Moderate cardio
    YOGA = "yoga"  # Mind-body connection
    STRENGTH = "strength"  # Empowerment, mastery
    GROUP_FITNESS = "group_fitness"  # Social connection
    HIIT = "hiit"  # High intensity bursts
    CYCLING = "cycling"  # Rhythmic cardio
    SWIMMING = "swimming"  # Low impact, meditative


@dataclass
class WorkoutRecommendation:
    """Single workout recommendation with reasoning"""

    workout_type: MoodWorkoutType
    intensity: WorkoutIntensity
    duration_minutes: int
    frequency_per_week: int

    # Details
    title: str
    description: str
    effect_size: str  # "Large", "Medium-Large", "Medium"
    research_notes: str

    # Practical guidance
    how_to_start: list[str] = field(default_factory=list)
    progression: list[str] = field(default_factory=list)
    barriers_solutions: dict[str, str] = field(default_factory=dict)

    # Why it works
    mechanisms: list[str] = field(default_factory=list)

    # Safety
    contraindications: list[str] = field(default_factory=list)
    modifications: list[str] = field(default_factory=list)


@dataclass
class MoodBoostingPlan:
    """Complete mood-boosting workout plan"""

    primary_recommendation: WorkoutRecommendation
    alternative_options: list[WorkoutRecommendation] = field(default_factory=list)

    # Adherence strategies
    adherence_tips: list[str] = field(default_factory=list)
    social_strategies: list[str] = field(default_factory=list)

    # Safety notes
    notes: list[str] = field(default_factory=list)


class MoodBoostingWorkouts:
    """
    Generate mood-boosting workout recommendations based on screening severity.

    Research-backed interventions with effect sizes from BMJ 2024 meta-analysis.
    """

    def __init__(self):
        pass

    def recommend_workouts(
        self,
        severity: ScreeningSeverity,
        screening_type: ScreeningType,
        current_activity_level: str = "sedentary",  # sedentary, light, moderate, active
        preferences: Optional[list[str]] = None,
    ) -> MoodBoostingPlan:
        """
        Recommend mood-boosting workouts based on screening results.

        Args:
            severity: Screening severity (minimal, mild, moderate, severe)
            screening_type: PHQ2, GAD2, or combined
            current_activity_level: Current exercise frequency
            preferences: User workout preferences (e.g., ["outdoor", "solo", "music"])

        Returns:
            MoodBoostingPlan with primary and alternative recommendations
        """
        # Get primary recommendation based on severity and activity level
        primary = self._get_primary_recommendation(
            severity, screening_type, current_activity_level
        )

        # Get alternative options
        alternatives = self._get_alternative_options(
            severity, screening_type, current_activity_level, preferences
        )

        # Adherence strategies
        adherence_tips = self._get_adherence_strategies(severity)
        social_strategies = self._get_social_strategies(screening_type)

        # Safety notes
        notes = self._generate_notes(severity)

        return MoodBoostingPlan(
            primary_recommendation=primary,
            alternative_options=alternatives,
            adherence_tips=adherence_tips,
            social_strategies=social_strategies,
            notes=notes,
        )

    def _get_primary_recommendation(
        self, severity: ScreeningSeverity, screening_type: ScreeningType, activity: str
    ) -> WorkoutRecommendation:
        """Get primary workout recommendation"""

        # For minimal/mild: Dance (highest effect size)
        if severity in [ScreeningSeverity.MINIMAL, ScreeningSeverity.MILD]:
            return self._create_dance_recommendation(activity)

        # For moderate/severe: Start gentler (walking/yoga), but still evidence-based
        elif severity == ScreeningSeverity.MODERATE:
            if activity in ["sedentary", "light"]:
                return self._create_walking_recommendation(activity)
            else:
                return self._create_group_fitness_recommendation(activity)

        else:  # SEVERE
            # Gentle start, supervised if possible
            return self._create_gentle_yoga_recommendation()

    def _get_alternative_options(
        self,
        severity: ScreeningSeverity,
        screening_type: ScreeningType,
        activity: str,
        preferences: Optional[list[str]],
    ) -> list[WorkoutRecommendation]:
        """Get alternative workout options"""
        alternatives = []

        # Always offer walking (accessible, proven)
        if activity in ["sedentary", "light"]:
            alternatives.append(self._create_walking_recommendation(activity))

        # Yoga for anxiety (mind-body connection)
        if screening_type in [ScreeningType.GAD2, ScreeningType.COMBINED]:
            alternatives.append(self._create_yoga_recommendation(activity))

        # Strength training for empowerment
        if severity in [ScreeningSeverity.MINIMAL, ScreeningSeverity.MILD]:
            alternatives.append(self._create_strength_recommendation(activity))

        # Group fitness for social connection
        if severity != ScreeningSeverity.SEVERE:
            alternatives.append(self._create_group_fitness_recommendation(activity))

        return alternatives[:3]  # Limit to 3 alternatives

    def _create_dance_recommendation(self, activity: str) -> WorkoutRecommendation:
        """Create dance workout recommendation (highest effect size)"""
        duration = 30 if activity in ["sedentary", "light"] else 45
        frequency = 2 if activity == "sedentary" else 3

        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.DANCE,
            intensity=WorkoutIntensity.MODERATE,
            duration_minutes=duration,
            frequency_per_week=frequency,
            title="Dance or Group Fitness Classes",
            description="Rhythmic movement with music in a social setting. Highest research-backed effect for improving mood.",
            effect_size="Large (Hedges' g=-0.96)",
            research_notes="BMJ 2024 meta-analysis found dance interventions had the largest effect size for depression, significantly outperforming other modalities.",
            how_to_start=[
                "Find beginner-friendly classes (Zumba, dance cardio, hip-hop)",
                "Start with online videos at home to build confidence",
                "Try 15-20 minutes initially, build to full session",
                "Choose music you genuinely enjoy",
            ],
            progression=[
                "Week 1-2: 2x/week, 20-30 min sessions",
                "Week 3-4: 3x/week, 30-40 min sessions",
                "Week 5+: 3-4x/week, 45-60 min sessions",
                "Increase intensity by choosing faster-paced classes",
            ],
            barriers_solutions={
                "Self-conscious": "Start with online classes at home, then transition to in-person",
                "Coordination concerns": "Everyone starts somewhere - focus on movement, not perfection",
                "Cost": "Free YouTube dance workouts, community center classes",
                "Time": "10-minute dance sessions still beneficial",
            },
            mechanisms=[
                "Rhythmic movement syncs with neural circuits",
                "Music activates reward pathways (dopamine release)",
                "Social connection reduces isolation",
                "Creative expression provides emotional outlet",
                "Achievable mastery builds self-efficacy",
            ],
            contraindications=[
                "Severe joint pain (modify to low-impact)",
                "Recent injury (consult healthcare provider)",
                "Uncontrolled cardiovascular conditions",
            ],
            modifications=[
                "Chair dancing for mobility limitations",
                "Solo dancing if social anxiety is high",
                "Slower-paced styles (ballroom, slow flow)",
            ],
        )

    def _create_walking_recommendation(self, activity: str) -> WorkoutRecommendation:
        """Create walking recommendation (accessible, proven)"""
        duration = 20 if activity == "sedentary" else 30
        frequency = 3 if activity == "sedentary" else 4

        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.WALKING,
            intensity=WorkoutIntensity.MODERATE,
            duration_minutes=duration,
            frequency_per_week=frequency,
            title="Brisk Walking (Outdoor Preferred)",
            description="Simple, accessible aerobic exercise. Green space exposure amplifies mood benefits.",
            effect_size="Medium-Large (Hedges' g=-0.62)",
            research_notes="Walking interventions show consistent mood improvements, especially in natural environments (nature exposure +15% effect).",
            how_to_start=[
                "Start with 10-minute walks around your neighborhood",
                "Aim for conversational pace (can talk but slightly breathless)",
                "Walk outdoors in green spaces when possible",
                "Use podcasts or music to enhance enjoyment",
            ],
            progression=[
                "Week 1-2: 3x/week, 15-20 min walks",
                "Week 3-4: 4x/week, 25-30 min walks",
                "Week 5+: 5x/week, 30-45 min walks",
                "Add hills or intervals for variety",
            ],
            barriers_solutions={
                "Weather": "Mall walking, indoor track, or treadmill with nature videos",
                "Safety concerns": "Walk during daylight, bring friend or dog",
                "Motivation": "Walking buddy, audiobooks, step-count goals",
                "Time": "Break into 10-min chunks (3x10min = same benefit)",
            },
            mechanisms=[
                "Rhythmic movement calms nervous system",
                "Natural light regulates circadian rhythm",
                "Green space reduces rumination",
                "Low barrier to entry improves adherence",
            ],
            contraindications=[
                "Severe mobility limitations (consider chair exercises)",
            ],
            modifications=[
                "Start with 5-minute walks",
                "Use walking poles for stability",
                "Indoor walking if agoraphobia present",
            ],
        )

    def _create_yoga_recommendation(self, activity: str) -> WorkoutRecommendation:
        """Create yoga recommendation (mind-body, especially for anxiety)"""
        duration = 30 if activity in ["sedentary", "light"] else 45
        frequency = 3

        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.YOGA,
            intensity=WorkoutIntensity.LOW,
            duration_minutes=duration,
            frequency_per_week=frequency,
            title="Yoga (Hatha or Vinyasa)",
            description="Mind-body practice combining movement, breath, and mindfulness. Particularly effective for anxiety.",
            effect_size="Medium (Hedges' g=-0.55)",
            research_notes="Yoga shows consistent benefits for both depression and anxiety, with breathwork and mindfulness components enhancing effects.",
            how_to_start=[
                "Try beginner yoga videos (Yoga with Adriene, Down Dog app)",
                "Focus on breath awareness, not perfect poses",
                "Start with gentle/restorative styles",
                "Consider studio classes for guidance and community",
            ],
            progression=[
                "Week 1-2: 2x/week, 20-30 min gentle yoga",
                "Week 3-4: 3x/week, 30-40 min sessions",
                "Week 5+: 3-4x/week, 45-60 min sessions",
                "Explore different styles (vinyasa, yin, power)",
            ],
            barriers_solutions={
                "Flexibility concerns": "Yoga improves flexibility - use props (blocks, straps)",
                "Cost": "Free YouTube classes, library apps",
                "Intimidation": "Home practice first, then studio",
                "Religious concerns": "Secular yoga focuses on movement/breath",
            },
            mechanisms=[
                "Parasympathetic activation (rest-and-digest)",
                "Mindfulness interrupts rumination",
                "Breath regulation calms anxiety",
                "Body awareness improves interoception",
                "Community reduces isolation",
            ],
            contraindications=[
                "Severe injury (modify poses)",
                "Pregnancy (use prenatal yoga)",
            ],
            modifications=[
                "Chair yoga for limited mobility",
                "Restorative/yin for low energy",
                "Avoid hot yoga if heat-sensitive",
            ],
        )

    def _create_strength_recommendation(self, activity: str) -> WorkoutRecommendation:
        """Create strength training recommendation"""
        duration = 30 if activity in ["sedentary", "light"] else 45
        frequency = 2 if activity in ["sedentary", "light"] else 3

        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.STRENGTH,
            intensity=WorkoutIntensity.MODERATE,
            duration_minutes=duration,
            frequency_per_week=frequency,
            title="Resistance Training",
            description="Build strength and self-efficacy through progressive overload. Empowering and mood-boosting.",
            effect_size="Medium (Hedges' g=-0.49)",
            research_notes="Strength training shows medium effects on depression, with mastery and self-efficacy as key mechanisms.",
            how_to_start=[
                "Start with bodyweight exercises (squats, push-ups, planks)",
                "Learn proper form from certified trainer or videos",
                "2-3 sessions per week, full-body workouts",
                "Progress to dumbbells or resistance bands",
            ],
            progression=[
                "Week 1-2: 2x/week, bodyweight exercises, 2 sets",
                "Week 3-4: 2x/week, add light weights, 3 sets",
                "Week 5+: 3x/week, progressive overload, varied exercises",
            ],
            barriers_solutions={
                "Gym intimidation": "Home workouts with dumbbells or bands",
                "Equipment cost": "Bodyweight exercises are free and effective",
                "Knowledge gap": "Hire trainer for 2-3 sessions to learn basics",
                "Time": "30-min full-body sessions sufficient",
            },
            mechanisms=[
                "Mastery experience builds self-efficacy",
                "Progressive overload creates tangible progress",
                "Physical strength correlates with mental resilience",
                "Endorphin release during exercise",
            ],
            contraindications=[
                "Uncontrolled hypertension (get medical clearance)",
                "Recent injury (modify exercises)",
            ],
            modifications=[
                "Seated exercises for mobility issues",
                "Resistance bands instead of weights",
                "Start with very light weights",
            ],
        )

    def _create_group_fitness_recommendation(
        self, activity: str
    ) -> WorkoutRecommendation:
        """Create group fitness recommendation"""
        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.GROUP_FITNESS,
            intensity=WorkoutIntensity.MODERATE,
            duration_minutes=45,
            frequency_per_week=3,
            title="Group Fitness Classes",
            description="Structured classes with social connection (spin, bootcamp, HIIT, dance cardio). Combines exercise benefits with community.",
            effect_size="Large (similar to dance when social)",
            research_notes="Group exercise amplifies mood benefits through social connection and structured environment.",
            how_to_start=[
                "Try various class types to find what you enjoy",
                "Arrive early to introduce yourself to instructor",
                "Bring a friend for accountability",
                "Start with beginner or mixed-level classes",
            ],
            progression=[
                "Week 1-2: 2x/week, try different class types",
                "Week 3-4: 3x/week, commit to favorite classes",
                "Week 5+: 3-4x/week, build class community",
            ],
            barriers_solutions={
                "Cost": "Gym membership, ClassPass trial, community center",
                "Intimidation": "Arrive early, tell instructor you're new",
                "Schedule": "Find studios with flexible drop-in options",
            },
            mechanisms=[
                "Social connection reduces isolation",
                "Group energy enhances motivation",
                "Instructor guidance ensures consistency",
                "Scheduled commitment improves adherence",
            ],
            contraindications=[
                "Severe social anxiety (start with smaller classes)",
            ],
            modifications=[
                "Position near back of class if self-conscious",
                "Virtual classes if in-person too intimidating",
            ],
        )

    def _create_gentle_yoga_recommendation(self) -> WorkoutRecommendation:
        """Create gentle yoga for severe symptoms"""
        return WorkoutRecommendation(
            workout_type=MoodWorkoutType.YOGA,
            intensity=WorkoutIntensity.LOW,
            duration_minutes=20,
            frequency_per_week=3,
            title="Gentle Yoga or Restorative Movement",
            description="Low-intensity mind-body practice for severe symptoms. Focus on breath and gentle movement.",
            effect_size="Medium (gentler approach for severe symptoms)",
            research_notes="For severe symptoms, gentle movement with professional support shows benefits without overwhelming.",
            how_to_start=[
                "Start with 10-minute restorative yoga videos",
                "Focus on breathing and gentle stretching",
                "Consider working with therapist who integrates movement",
                "IMPORTANT: Use as ADJUNCT to professional treatment",
            ],
            progression=[
                "Week 1-2: 2-3x/week, 10-15 min gentle stretching",
                "Week 3-4: 3x/week, 20-25 min restorative yoga",
                "Week 5+: Build slowly based on energy and symptoms",
            ],
            barriers_solutions={
                "Low energy": "Even 5 minutes beneficial",
                "Motivation": "Frame as self-care, not exercise",
                "Access": "Free home videos require no travel",
            },
            mechanisms=[
                "Gentle movement without overwhelming",
                "Breath regulation calms nervous system",
                "Small wins build self-efficacy",
                "Mind-body connection improves awareness",
            ],
            contraindications=[],
            modifications=[
                "All movements can be done seated or in bed",
                "Focus on breath if movement too difficult",
            ],
        )

    def _get_adherence_strategies(
        self, severity: ScreeningSeverity
    ) -> list[str]:
        """Get adherence strategies based on severity"""
        strategies = [
            "Start small: 10-15 minutes counts as success",
            "Schedule workouts like appointments",
            "Track mood before and after (notice improvements)",
            "Find accountability partner or join group",
        ]

        if severity in [ScreeningSeverity.MODERATE, ScreeningSeverity.SEVERE]:
            strategies.extend([
                "Work with mental health professional who supports exercise",
                "Celebrate showing up, not just completing workout",
                "Have backup 'minimum viable workout' for low-energy days",
            ])

        return strategies

    def _get_social_strategies(self, screening_type: ScreeningType) -> list[str]:
        """Get social connection strategies"""
        return [
            "Join group classes or walking clubs",
            "Exercise with friend or family member",
            "Share progress with supportive people",
            "Use social fitness apps (Strava, Nike Run Club)",
            "Consider trainer or coach for accountability",
        ]

    def _generate_notes(self, severity: ScreeningSeverity) -> list[str]:
        """Generate safety and context notes"""
        notes = [
            "Exercise is EFFECTIVE but not a REPLACEMENT for professional treatment",
            "Higher intensity generally > lower intensity (within tolerance)",
            "Consistency matters more than perfection",
            "Benefits typically emerge after 2-4 weeks of regular activity",
        ]

        if severity in [ScreeningSeverity.MODERATE, ScreeningSeverity.SEVERE]:
            notes.extend([
                "⚠️ Use exercise as ADJUNCT to professional mental health care",
                "⚠️ If symptoms worsen or crisis occurs, contact mental health professional immediately",
                "Start gently and build gradually under professional guidance",
            ])

        notes.append("BMJ 2024 meta-analysis: Exercise shows medium effect (d=-0.43) comparable to psychotherapy")

        return notes


# Global instance
_workouts: Optional[MoodBoostingWorkouts] = None


def get_mood_boosting_workouts() -> MoodBoostingWorkouts:
    """Get or create global mood-boosting workouts instance"""
    global _workouts
    if _workouts is None:
        _workouts = MoodBoostingWorkouts()
    return _workouts
