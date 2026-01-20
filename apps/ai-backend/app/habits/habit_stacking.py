"""
Habit Stacking Engine

Based on James Clear's "Atomic Habits" habit stacking methodology.
Research shows stacking increases formation probability by 2.3x.

Formula: "After [EXISTING HABIT], I will [NEW HABIT]"

Key Principles:
- Anchor new habit to existing automatic behavior
- New habit should take <2 minutes initially
- Stack should be logical and sequential
- Specificity increases success (when, where, how)

Sprint 38: 66-Day Habit Tracking
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from enum import Enum

from app.habits.habit_formation import HabitType, HabitTimePreference, HabitDifficulty


class AnchorType(str, Enum):
    """Types of anchor behaviors for stacking"""

    WAKE_UP = "wake_up"  # "After I wake up"
    MORNING_ROUTINE = "morning_routine"  # "After I brush teeth"
    COMMUTE = "commute"  # "On my way to work"
    WORK_START = "work_start"  # "When I start work"
    LUNCH = "lunch"  # "After I eat lunch"
    WORK_END = "work_end"  # "When I finish work"
    ARRIVE_GYM = "arrive_gym"  # "When I arrive at the gym"
    FINISH_WORKOUT = "finish_workout"  # "After I finish my workout"
    ARRIVE_HOME = "arrive_home"  # "When I get home"
    DINNER = "dinner"  # "After dinner"
    EVENING_ROUTINE = "evening_routine"  # "After I shower"
    BEDTIME_ROUTINE = "bedtime_routine"  # "Before bed"


@dataclass
class StackSuggestion:
    """Habit stacking suggestion with implementation formula"""

    anchor_type: AnchorType
    anchor_description: str  # "After I brush my teeth"
    new_habit_description: str  # "I will do 10 push-ups"

    # Stack formula
    stack_formula: str  # "After I brush my teeth, I will do 10 push-ups"

    # Why this stack works
    reasoning: str
    success_probability: float  # 0.0-1.0 (higher if anchor is strong and logical)

    # Implementation tips
    tips: list[str] = field(default_factory=list)

    # Potential obstacles
    obstacles: list[str] = field(default_factory=list)
    solutions: list[str] = field(default_factory=list)


class HabitStackingEngine:
    """
    Generate habit stacking suggestions to increase formation success by 2.3x.

    Based on research showing anchoring new habits to existing behaviors
    dramatically increases adherence.
    """

    # Anchor behaviors by type (existing automatic behaviors)
    ANCHORS = {
        AnchorType.WAKE_UP: [
            "After I wake up",
            "After my alarm goes off",
            "When I open my eyes",
        ],
        AnchorType.MORNING_ROUTINE: [
            "After I brush my teeth",
            "After I make coffee",
            "After I shower",
            "While I brew coffee",
        ],
        AnchorType.COMMUTE: [
            "On my drive to work",
            "On the train",
            "During my commute",
        ],
        AnchorType.WORK_START: [
            "When I sit at my desk",
            "After I log into my computer",
            "When I start work",
        ],
        AnchorType.LUNCH: [
            "After I eat lunch",
            "During my lunch break",
            "Before lunch",
        ],
        AnchorType.WORK_END: [
            "When I finish work",
            "After I log off",
            "On my way home from work",
        ],
        AnchorType.ARRIVE_GYM: [
            "When I arrive at the gym",
            "When I walk into the gym",
            "After I park at the gym",
        ],
        AnchorType.FINISH_WORKOUT: [
            "After I finish my workout",
            "When I leave the gym",
            "After my last set",
        ],
        AnchorType.ARRIVE_HOME: [
            "When I get home",
            "After I walk in the door",
            "When I take off my shoes",
        ],
        AnchorType.DINNER: [
            "After dinner",
            "Before dinner",
            "While I cook dinner",
        ],
        AnchorType.EVENING_ROUTINE: [
            "After I shower",
            "After I change clothes",
            "When I relax on the couch",
        ],
        AnchorType.BEDTIME_ROUTINE: [
            "Before bed",
            "After I set my alarm",
            "When I brush my teeth at night",
        ],
    }

    # Best anchors for each habit type
    OPTIMAL_ANCHORS = {
        HabitType.EXERCISE: [
            AnchorType.WAKE_UP,
            AnchorType.MORNING_ROUTINE,
            AnchorType.WORK_END,
        ],
        HabitType.NUTRITION: [
            AnchorType.MORNING_ROUTINE,
            AnchorType.LUNCH,
            AnchorType.DINNER,
        ],
        HabitType.SLEEP: [AnchorType.EVENING_ROUTINE, AnchorType.BEDTIME_ROUTINE],
        HabitType.RECOVERY: [
            AnchorType.FINISH_WORKOUT,
            AnchorType.EVENING_ROUTINE,
        ],
        HabitType.TRACKING: [
            AnchorType.FINISH_WORKOUT,
            AnchorType.EVENING_ROUTINE,
        ],
        HabitType.LEARNING: [
            AnchorType.MORNING_ROUTINE,
            AnchorType.COMMUTE,
            AnchorType.EVENING_ROUTINE,
        ],
        HabitType.SOCIAL: [AnchorType.WORK_END, AnchorType.EVENING_ROUTINE],
    }

    def __init__(self):
        pass

    def suggest_stacks(
        self,
        new_habit_name: str,
        habit_type: HabitType,
        habit_difficulty: HabitDifficulty,
        time_preference: Optional[HabitTimePreference] = None,
        existing_anchors: Optional[list[AnchorType]] = None,
    ) -> list[StackSuggestion]:
        """
        Generate habit stacking suggestions for a new habit.

        Args:
            new_habit_name: Name of the new habit to form
            habit_type: Category of habit
            habit_difficulty: Complexity level
            time_preference: Preferred time of day (optional)
            existing_anchors: Known existing strong anchors (optional)

        Returns:
            List of StackSuggestion ranked by success probability
        """
        suggestions = []

        # Get optimal anchors for this habit type
        optimal_anchors = self.OPTIMAL_ANCHORS.get(habit_type, [])

        # Filter by time preference if specified
        if time_preference:
            optimal_anchors = self._filter_anchors_by_time(
                optimal_anchors, time_preference
            )

        # Generate suggestions for each optimal anchor
        for anchor_type in optimal_anchors[:3]:  # Top 3 anchors
            # Get anchor descriptions
            anchor_descriptions = self.ANCHORS.get(anchor_type, [])

            for anchor_desc in anchor_descriptions[:1]:  # Primary anchor
                suggestion = self._create_stack_suggestion(
                    anchor_type,
                    anchor_desc,
                    new_habit_name,
                    habit_type,
                    habit_difficulty,
                )
                suggestions.append(suggestion)

        # Sort by success probability
        suggestions.sort(key=lambda x: x.success_probability, reverse=True)

        return suggestions

    def _filter_anchors_by_time(
        self, anchors: list[AnchorType], time_preference: HabitTimePreference
    ) -> list[AnchorType]:
        """Filter anchors that match time preference"""
        time_to_anchors = {
            HabitTimePreference.MORNING: [
                AnchorType.WAKE_UP,
                AnchorType.MORNING_ROUTINE,
                AnchorType.COMMUTE,
            ],
            HabitTimePreference.AFTERNOON: [
                AnchorType.LUNCH,
                AnchorType.WORK_END,
            ],
            HabitTimePreference.EVENING: [
                AnchorType.ARRIVE_HOME,
                AnchorType.DINNER,
                AnchorType.EVENING_ROUTINE,
            ],
            HabitTimePreference.NIGHT: [
                AnchorType.EVENING_ROUTINE,
                AnchorType.BEDTIME_ROUTINE,
            ],
            HabitTimePreference.AFTER_WORKOUT: [AnchorType.FINISH_WORKOUT],
            HabitTimePreference.BEFORE_WORKOUT: [AnchorType.ARRIVE_GYM],
        }

        matching_anchors = time_to_anchors.get(time_preference, [])
        return [a for a in anchors if a in matching_anchors]

    def _create_stack_suggestion(
        self,
        anchor_type: AnchorType,
        anchor_description: str,
        new_habit_name: str,
        habit_type: HabitType,
        habit_difficulty: HabitDifficulty,
    ) -> StackSuggestion:
        """Create a single stack suggestion with reasoning"""

        # Stack formula
        stack_formula = f"{anchor_description}, I will {new_habit_name}"

        # Success probability (based on anchor strength and logical connection)
        success_probability = self._calculate_success_probability(
            anchor_type, habit_type, habit_difficulty
        )

        # Reasoning
        reasoning = self._generate_reasoning(anchor_type, habit_type)

        # Tips
        tips = self._generate_tips(anchor_type, habit_type, habit_difficulty)

        # Obstacles & solutions
        obstacles, solutions = self._generate_obstacles_and_solutions(
            anchor_type, habit_type
        )

        return StackSuggestion(
            anchor_type=anchor_type,
            anchor_description=anchor_description,
            new_habit_description=new_habit_name,
            stack_formula=stack_formula,
            reasoning=reasoning,
            success_probability=success_probability,
            tips=tips,
            obstacles=obstacles,
            solutions=solutions,
        )

    def _calculate_success_probability(
        self,
        anchor_type: AnchorType,
        habit_type: HabitType,
        habit_difficulty: HabitDifficulty,
    ) -> float:
        """
        Calculate success probability for this stack.

        Factors:
        - Anchor strength (morning routines strongest)
        - Logical connection between anchor and new habit
        - Difficulty of new habit
        """
        # Base probability
        base_prob = 0.7  # 70% base for habit stacking vs 40% without

        # Anchor strength modifiers
        anchor_strength = {
            AnchorType.WAKE_UP: 0.95,
            AnchorType.MORNING_ROUTINE: 0.9,
            AnchorType.FINISH_WORKOUT: 0.85,
            AnchorType.ARRIVE_HOME: 0.8,
            AnchorType.BEDTIME_ROUTINE: 0.75,
            AnchorType.DINNER: 0.7,
            AnchorType.WORK_END: 0.65,
            AnchorType.EVENING_ROUTINE: 0.6,
        }
        strength = anchor_strength.get(anchor_type, 0.6)

        # Logical connection (does the stack make sense?)
        connection_bonus = self._assess_logical_connection(anchor_type, habit_type)

        # Difficulty penalty
        difficulty_penalty = {
            HabitDifficulty.SIMPLE: 0.0,
            HabitDifficulty.MODERATE: -0.05,
            HabitDifficulty.COMPLEX: -0.1,
        }
        penalty = difficulty_penalty.get(habit_difficulty, 0.0)

        # Calculate final probability
        probability = base_prob * strength + connection_bonus + penalty

        return min(max(probability, 0.0), 1.0)  # Clamp 0-1

    def _assess_logical_connection(
        self, anchor_type: AnchorType, habit_type: HabitType
    ) -> float:
        """
        Assess how logical the connection is between anchor and habit.

        Returns bonus: 0.0-0.2
        """
        # Strong logical connections
        strong_connections = {
            (AnchorType.FINISH_WORKOUT, HabitType.RECOVERY): 0.2,
            (AnchorType.FINISH_WORKOUT, HabitType.TRACKING): 0.2,
            (AnchorType.MORNING_ROUTINE, HabitType.EXERCISE): 0.15,
            (AnchorType.MORNING_ROUTINE, HabitType.NUTRITION): 0.15,
            (AnchorType.DINNER, HabitType.NUTRITION): 0.15,
            (AnchorType.BEDTIME_ROUTINE, HabitType.SLEEP): 0.2,
        }

        return strong_connections.get((anchor_type, habit_type), 0.05)

    def _generate_reasoning(
        self, anchor_type: AnchorType, habit_type: HabitType
    ) -> str:
        """Generate reasoning for why this stack works"""
        reasoning_map = {
            (AnchorType.WAKE_UP, HabitType.EXERCISE): "Morning exercise is tied to your wake routine, ensuring consistency before daily distractions arise.",
            (AnchorType.MORNING_ROUTINE, HabitType.EXERCISE): "Stacking with your morning routine makes exercise automatic and prevents procrastination.",
            (AnchorType.FINISH_WORKOUT, HabitType.RECOVERY): "Recovery immediately after training is both logical and timely—your body needs it most now.",
            (AnchorType.FINISH_WORKOUT, HabitType.TRACKING): "Logging right after your workout ensures accuracy and becomes part of your cooldown routine.",
            (AnchorType.MORNING_ROUTINE, HabitType.NUTRITION): "Morning is when willpower is highest, making nutrition habits easier to maintain.",
            (AnchorType.DINNER, HabitType.NUTRITION): "Meal-based stacking aligns with existing eating routines and timing.",
            (AnchorType.BEDTIME_ROUTINE, HabitType.SLEEP): "Evening routines signal your body it's time to wind down, improving sleep quality.",
        }

        specific_reasoning = reasoning_map.get((anchor_type, habit_type))
        if specific_reasoning:
            return specific_reasoning

        # Generic reasoning
        return f"This anchor is reliable and occurs at a consistent time, making it ideal for building a new {habit_type.value} habit."

    def _generate_tips(
        self,
        anchor_type: AnchorType,
        habit_type: HabitType,
        habit_difficulty: HabitDifficulty,
    ) -> list[str]:
        """Generate implementation tips"""
        tips = []

        # Universal tips
        tips.append("Start with a 2-minute version to build the habit first")
        tips.append("Place visual cues near your anchor (e.g., gym bag by door)")

        # Difficulty-specific tips
        if habit_difficulty == HabitDifficulty.COMPLEX:
            tips.append("Break into micro-habits: master one step at a time")
            tips.append("Prepare everything the night before")

        # Anchor-specific tips
        if anchor_type == AnchorType.MORNING_ROUTINE:
            tips.append("Lay out everything you need before bed")
        elif anchor_type == AnchorType.FINISH_WORKOUT:
            tips.append("Keep supplies in gym bag so they're always ready")
        elif anchor_type == AnchorType.BEDTIME_ROUTINE:
            tips.append("Set phone reminder 30 min before bedtime")

        return tips

    def _generate_obstacles_and_solutions(
        self, anchor_type: AnchorType, habit_type: HabitType
    ) -> tuple[list[str], list[str]]:
        """Generate potential obstacles and solutions"""
        obstacles = []
        solutions = []

        # Universal obstacles
        obstacles.append("Forgetting to do the new habit")
        solutions.append("Place visual reminder at anchor location")

        obstacles.append("Too tired or unmotivated")
        solutions.append("Do minimal version (2-minute rule)")

        # Anchor-specific
        if anchor_type == AnchorType.MORNING_ROUTINE:
            obstacles.append("Running late in the morning")
            solutions.append("Wake up 10 minutes earlier OR do habit first")

        elif anchor_type == AnchorType.FINISH_WORKOUT:
            obstacles.append("Rushing to leave gym")
            solutions.append("Set timer for 5 min cooldown before leaving")

        elif anchor_type == AnchorType.EVENING_ROUTINE:
            obstacles.append("Evening plans or events disrupt routine")
            solutions.append("Move to morning anchor for more consistency")

        return obstacles, solutions


# Global instance
_stacking_engine: Optional[HabitStackingEngine] = None


def get_habit_stacking_engine() -> HabitStackingEngine:
    """Get or create global habit stacking engine"""
    global _stacking_engine
    if _stacking_engine is None:
        _stacking_engine = HabitStackingEngine()
    return _stacking_engine
