"""
Workout Agent - Specialized in exercise programming and training

Tools:
- Exercise library search
- Program generation
- Form cue generation
- Periodization recommendations
- RPE/load calculations

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from typing import Annotated
from langchain_core.messages import AIMessage, SystemMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent

from app.core.config import settings


# =====================================================
# Workout Agent Tools
# =====================================================

@tool
def search_exercises(query: str, muscle_group: str | None = None) -> list[dict]:
    """
    Search exercise library for matching exercises.

    Args:
        query: Search term (e.g., "squat", "chest press")
        muscle_group: Optional filter by muscle group

    Returns:
        List of matching exercises with details
    """
    # TODO: Integrate with Supabase exercise library
    # For now, return mock data
    exercises = [
        {
            "name": "Barbell Back Squat",
            "muscle_group": "Legs",
            "equipment": "Barbell",
            "difficulty": "Intermediate",
            "description": "Compound lower body exercise targeting quads, glutes, and hamstrings",
        },
        {
            "name": "Romanian Deadlift",
            "muscle_group": "Hamstrings",
            "equipment": "Barbell",
            "difficulty": "Intermediate",
            "description": "Hip hinge movement targeting posterior chain",
        }
    ]

    return exercises


@tool
def calculate_training_load(
    exercise: str,
    weight_lbs: float,
    reps: int,
    rpe: float
) -> dict:
    """
    Calculate training load and provide recommendations.

    Args:
        exercise: Exercise name
        weight_lbs: Weight used in pounds
        reps: Repetitions performed
        rpe: Rate of Perceived Exertion (1-10)

    Returns:
        Load analysis with recommendations
    """
    # Calculate volume (sets × reps × weight)
    volume = weight_lbs * reps

    # Estimate 1RM using Epley formula
    if reps == 1:
        estimated_1rm = weight_lbs
    else:
        estimated_1rm = weight_lbs * (1 + reps / 30)

    # Adjust for RPE (RPE 10 = max effort)
    rpe_multiplier = 1.0 + ((10 - rpe) * 0.025)
    adjusted_1rm = estimated_1rm * rpe_multiplier

    # Calculate intensity (% of 1RM)
    intensity = (weight_lbs / adjusted_1rm) * 100

    # Provide recommendations
    if intensity > 90:
        recommendation = "High intensity - ensure adequate rest between sets (3-5 min)"
    elif intensity > 75:
        recommendation = "Moderate-high intensity - good for strength building"
    elif intensity > 60:
        recommendation = "Moderate intensity - ideal for hypertrophy"
    else:
        recommendation = "Lower intensity - good for technique work or high-volume training"

    return {
        "volume": round(volume, 2),
        "estimated_1rm": round(adjusted_1rm, 2),
        "intensity_percent": round(intensity, 2),
        "recommendation": recommendation,
        "rpe_adjusted": True,
    }


@tool
def generate_form_cues(exercise: str, common_errors: list[str] | None = None) -> dict:
    """
    Generate form cues and coaching points for an exercise.

    Args:
        exercise: Exercise name
        common_errors: Optional list of common errors to address

    Returns:
        Form cues and coaching points
    """
    # TODO: Integrate with exercise library for specific cues
    # For now, return structured guidance

    cues = {
        "setup": [
            "Start with feet shoulder-width apart",
            "Engage core before initiating movement",
            "Maintain neutral spine position",
        ],
        "execution": [
            "Control the eccentric (lowering) phase",
            "Drive through the full foot",
            "Maintain consistent bar path",
        ],
        "breathing": "Inhale at the top, brace core, exhale through the sticking point",
        "safety": [
            "Use spotter for heavy sets",
            "Don't bounce at the bottom",
            "Stop if you feel sharp pain",
        ],
    }

    if common_errors:
        cues["common_errors"] = {
            error: f"Correction for: {error}" for error in common_errors
        }

    return cues


@tool
def suggest_progression(
    current_exercise: str,
    current_weight: float,
    current_reps: int,
    goal: str
) -> dict:
    """
    Suggest progression strategy based on current performance and goals.

    Args:
        current_exercise: Current exercise being performed
        current_weight: Current working weight
        current_reps: Current rep range
        goal: Training goal (strength, hypertrophy, endurance)

    Returns:
        Progression recommendations
    """
    progressions = {
        "strength": {
            "weight_increase": round(current_weight * 1.025, 2),  # 2.5% increase
            "rep_range": "1-5 reps",
            "sets": "4-6 sets",
            "rest": "3-5 minutes",
            "frequency": "2-3x per week",
        },
        "hypertrophy": {
            "weight_increase": round(current_weight * 1.05, 2),  # 5% increase when hitting top of range
            "rep_range": "6-12 reps",
            "sets": "3-4 sets",
            "rest": "60-90 seconds",
            "frequency": "2x per week",
        },
        "endurance": {
            "weight_increase": round(current_weight * 1.05, 2),
            "rep_range": "12-20 reps",
            "sets": "2-3 sets",
            "rest": "30-60 seconds",
            "frequency": "3-4x per week",
        },
    }

    return progressions.get(goal.lower(), progressions["hypertrophy"])


# =====================================================
# Workout Agent Node
# =====================================================

def workout_node(state: dict) -> dict:
    """
    Workout agent node that handles training-related queries.

    Uses React agent pattern with specialized workout tools.
    """
    messages = state["messages"]
    user_context = state.get("user_context", {})

    # System prompt for workout agent
    system_prompt = """You are an expert strength and conditioning coach AI assistant.

Your expertise includes:
- Exercise selection and programming
- Form technique and cuing
- Periodization and progression
- Load management and RPE
- Injury prevention
- Evidence-based training methods

Guidelines:
1. **Safety First**: Always prioritize proper form and injury prevention
2. **Individualization**: Consider the user's experience level and context
3. **Progressive Overload**: Recommend systematic progression
4. **Evidence-Based**: Base recommendations on exercise science
5. **Escalate When Needed**: Defer to human trainer for:
   - Injury/pain concerns
   - Complex programming questions
   - Form checks requiring video analysis

User Context:
- Experience Level: {experience_level}
- Current Program: {program}
- Recent Workouts: {recent_workouts}

Use your tools to:
- Search for exercises
- Calculate training loads
- Generate form cues
- Suggest progressions

Always be specific, actionable, and safe.""".format(
        experience_level=user_context.get("experience_level", "Unknown"),
        program=user_context.get("current_program", "None"),
        recent_workouts=user_context.get("recent_workouts", "None"),
    )

    # Create React agent with tools
    llm = ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.3,  # Slightly higher for creative programming
    )

    # Import MCP tools for health-performance correlation
    from app.mcp.tools import query_health_data, correlate_health_and_performance

    tools = [
        search_exercises,
        calculate_training_load,
        generate_form_cues,
        suggest_progression,
        query_health_data,  # Access recovery data to inform programming
        correlate_health_and_performance,  # Correlate recovery with performance
    ]

    agent = create_react_agent(
        llm,
        tools,
        state_modifier=SystemMessage(content=system_prompt)
    )

    # Run agent
    result = agent.invoke({"messages": messages})

    # Extract response and add metadata
    response_message = result["messages"][-1]
    response_message.name = "workout"

    # Update state
    state["messages"].append(response_message)
    state["current_agent"] = "workout"
    state["available_tools"] = [tool.name for tool in tools]

    # Set confidence based on tool usage
    used_tools = any(
        msg.type == "tool" for msg in result.get("messages", [])
    )
    state["confidence"] = 0.85 if used_tools else 0.70

    return state
