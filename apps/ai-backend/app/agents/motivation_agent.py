"""
Motivation Agent - Specialized in adherence and psychological support

Tools:
- Habit formation guidance
- Adherence strategies
- Goal-setting frameworks
- Motivational interviewing techniques

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from langchain_core.messages import AIMessage, SystemMessage
from langchain_core.tools import tool
from langchain_anthropic import ChatAnthropic
from langgraph.prebuilt import create_react_agent

from app.core.config import settings


# =====================================================
# Motivation Agent Tools
# =====================================================

@tool
def analyze_habit_formation(
    target_behavior: str,
    current_streak: int,
    missed_days: int,
    total_days: int
) -> dict:
    """
    Analyze habit formation progress using 66-day framework.

    Args:
        target_behavior: The habit being formed (e.g., "workout 4x/week")
        current_streak: Current consecutive days
        missed_days: Days missed in habit period
        total_days: Total days in habit formation period

    Returns:
        Habit analysis with encouragement and strategies
    """
    # 66-day framework (Sprint 38 research)
    consistency_rate = ((total_days - missed_days) / total_days) * 100 if total_days > 0 else 0

    if total_days < 21:
        phase = "Initiation"
        phase_description = "Building neural pathways - expect high effort"
    elif total_days < 42:
        phase = "Learning"
        phase_description = "Behavior becoming more automatic"
    elif total_days < 66:
        phase = "Stabilizing"
        phase_description = "Habit solidifying - maintain consistency"
    else:
        phase = "Maintained"
        phase_description = "Habit established - now focus on refinement"

    # Consistency assessment
    if consistency_rate >= 85:
        consistency_status = "Excellent"
        encouragement = "Outstanding consistency! You're well on track to make this automatic."
    elif consistency_rate >= 70:
        consistency_status = "Good"
        encouragement = "Solid progress! Small misses are normal - what matters is getting back on track."
    elif consistency_rate >= 50:
        consistency_status = "Building"
        encouragement = "You're making progress. Focus on small wins and reducing barriers to the behavior."
    else:
        consistency_status = "Struggling"
        encouragement = "Let's identify barriers and make this easier. Sometimes we need to adjust the goal or approach."

    return {
        "target_behavior": target_behavior,
        "days_completed": total_days - missed_days,
        "total_days": total_days,
        "current_streak": current_streak,
        "consistency_rate": round(consistency_rate, 1),
        "consistency_status": consistency_status,
        "phase": phase,
        "phase_description": phase_description,
        "days_to_66": max(0, 66 - total_days),
        "encouragement": encouragement,
        "next_milestone": 21 if total_days < 21 else 42 if total_days < 42 else 66,
    }


@tool
def suggest_adherence_strategy(
    barrier: str,
    behavior_type: str = "exercise"
) -> dict:
    """
    Suggest evidence-based adherence strategies for common barriers.

    Args:
        barrier: The obstacle to adherence (time, motivation, fatigue, etc.)
        behavior_type: Type of behavior (exercise, nutrition, sleep)

    Returns:
        Targeted strategies to overcome the barrier
    """
    strategies = {
        "time": {
            "primary": "Time blocking - Schedule workouts like appointments",
            "tactics": [
                "Morning workouts eliminate scheduling conflicts",
                "Prepare gym bag night before (reduce friction)",
                "10-minute minimum - something beats nothing",
                "Combine activities (walk meetings, lunch workouts)",
            ],
            "research": "Morning exercisers have 43% better adherence (U of South Australia 2024)",
        },
        "motivation": {
            "primary": "Remove reliance on motivation - build systems instead",
            "tactics": [
                "Implementation intentions: 'When X happens, I will Y'",
                "Visual progress tracking (don't break the chain)",
                "Social accountability (training partner or check-ins)",
                "Reward small wins, not just outcomes",
            ],
            "research": "Self-selected habits have 37% higher success rate",
        },
        "fatigue": {
            "primary": "Auto-regulate volume and intensity",
            "tactics": [
                "Use RPE/RIR to adjust daily training",
                "Active recovery on low-energy days",
                "Prioritize sleep (7-9 hours non-negotiable)",
                "Assess HRV if available for readiness",
            ],
            "research": "Training through fatigue increases injury risk 2.7x",
        },
        "boredom": {
            "primary": "Introduce structured variety",
            "tactics": [
                "Block periodization (4-week focus areas)",
                "New exercise variations every 6-8 weeks",
                "Cross-training for mental refresh",
                "Training challenges or new goals",
            ],
            "research": "Variety within structure maintains adherence + progress",
        },
    }

    barrier_key = barrier.lower()
    strategy = strategies.get(barrier_key, strategies["motivation"])

    return {
        "barrier": barrier,
        "behavior_type": behavior_type,
        "primary_strategy": strategy["primary"],
        "tactics": strategy["tactics"],
        "research_note": strategy["research"],
        "implementation": f"Start with: {strategy['tactics'][0]}",
    }


@tool
def create_smart_goal(
    vague_goal: str,
    timeline_weeks: int | None = None
) -> dict:
    """
    Convert vague goal into SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound).

    Args:
        vague_goal: User's initial goal statement
        timeline_weeks: Optional timeline in weeks

    Returns:
        SMART goal with process and outcome metrics
    """
    # This would use LLM to parse and restructure
    # For now, provide template guidance

    return {
        "original_goal": vague_goal,
        "smart_framework": {
            "specific": "Define exactly what success looks like",
            "measurable": "Attach numbers (weight, reps, consistency %)",
            "achievable": "Realistic given current baseline",
            "relevant": "Aligns with bigger values/aspirations",
            "time_bound": f"{timeline_weeks} weeks" if timeline_weeks else "Add specific deadline",
        },
        "example_conversion": {
            "before": "Get in better shape",
            "after": "Squat 225lbs for 3 reps and workout 4x/week for 12 consecutive weeks",
        },
        "process_vs_outcome": {
            "outcome_goal": "The end result (e.g., lose 20lbs)",
            "process_goal": "The behaviors (e.g., track food 6 days/week, workout 4x/week)",
            "recommendation": "Track process goals daily - outcomes follow",
        },
    }


# =====================================================
# Motivation Agent Node
# =====================================================

def motivation_node(state: dict) -> dict:
    """
    Motivation agent node that handles adherence and psychological support.

    Uses React agent pattern with specialized motivation tools.
    """
    messages = state["messages"]
    user_context = state.get("user_context", {})

    # System prompt for motivation agent
    system_prompt = """You are an expert behavior change and adherence coach AI assistant.

Your expertise includes:
- Habit formation (66-day framework)
- Motivational interviewing
- Barrier identification and problem-solving
- SMART goal setting
- Adherence psychology
- Self-compassion and growth mindset

**Core Principles:**
1. **Compassionate**: No judgment, no shame. Setbacks are data, not failure.
2. **Action-Oriented**: Focus on next small step, not perfection
3. **Autonomy-Supportive**: Help clients find their own motivation (not external pressure)
4. **Evidence-Based**: Use behavior change research (66-day habits, morning preference, etc.)
5. **Sustainable**: Long-term lifestyle change > short-term compliance

User Context:
- Current Streak: {streak} days
- Adherence Rate: {adherence}%
- Primary Goal: {goal}

Use your tools to:
- Analyze habit formation progress
- Suggest adherence strategies
- Create SMART goals
- Provide motivational support

Always be encouraging, specific, and focused on sustainable behavior change.""".format(
        streak=user_context.get("current_streak", "Unknown"),
        adherence=user_context.get("adherence_rate", "Unknown"),
        goal=user_context.get("primary_goal", "Unknown"),
    )

    # Create React agent with tools
    llm = ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.5,  # Higher temp for more empathetic, varied responses
    )

    tools = [
        analyze_habit_formation,
        suggest_adherence_strategy,
        create_smart_goal,
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
    response_message.name = "motivation"

    # Update state
    state["messages"].append(response_message)
    state["current_agent"] = "motivation"
    state["available_tools"] = [tool.name for tool in tools]

    # Motivation agent always has high confidence - it's supportive by nature
    state["confidence"] = 0.90

    return state
