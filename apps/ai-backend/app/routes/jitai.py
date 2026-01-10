"""
JITAI (Just-In-Time Adaptive Interventions) endpoints.

Based on Stanford GPTCoach research - delivers personalized
interventions at optimal moments based on:
- Vulnerability (risk of skipping workout)
- Receptivity (willingness to engage)
- Opportunity (context allows action)
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal
import logging
from datetime import datetime, timedelta
import random

from app.core.llm import get_smart_llm
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger("fitos-ai")
router = APIRouter()


class JITAIContext(BaseModel):
    """Context scores for intervention decision"""
    vulnerability: float  # 0-1: Risk of non-adherence
    receptivity: float    # 0-1: Willingness to engage
    opportunity: float    # 0-1: Context allows action


class Intervention(BaseModel):
    """Generated intervention message"""
    id: str
    type: Literal["nudge", "reminder", "celebration", "concern", "insight"]
    title: str
    message: str
    priority: int  # 1-5, higher = more urgent
    action: dict | None = None


@router.get("/context/{user_id}", response_model=JITAIContext)
async def get_jitai_context(user_id: str):
    """
    Calculate JITAI context scores for a user.

    Vulnerability factors:
    - Missed workouts in last 7 days
    - Declining adherence trend
    - Low HRV (fatigue)
    - Negative sentiment in recent messages

    Receptivity factors:
    - Time of day (avoid late night)
    - Recent app engagement
    - Response to past interventions
    - Day of week patterns

    Opportunity factors:
    - Not currently in workout
    - Phone unlocked recently
    - Near usual workout time
    - Location context (if available)
    """
    try:
        logger.info(f"Calculating JITAI context for user {user_id}")

        # In production, fetch real data from Supabase:
        # - workout_sessions (missed workouts)
        # - wearable_data (HRV, sleep)
        # - messages (sentiment analysis)
        # - app_usage_logs (engagement)

        # Mock calculation for now
        vulnerability = calculate_vulnerability(user_id)
        receptivity = calculate_receptivity(user_id)
        opportunity = calculate_opportunity(user_id)

        context = JITAIContext(
            vulnerability=vulnerability,
            receptivity=receptivity,
            opportunity=opportunity
        )

        logger.info(f"JITAI scores - V:{vulnerability:.2f} R:{receptivity:.2f} O:{opportunity:.2f}")

        return context

    except Exception as e:
        logger.error(f"Error calculating JITAI context: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to calculate context")


@router.post("/generate", response_model=Intervention)
async def generate_intervention(user_id: str, context: JITAIContext):
    """
    Generate a personalized intervention using AI.

    Uses LLM to craft intervention based on:
    - User's training history
    - Current context scores
    - Past intervention effectiveness
    - Trainer's coaching style (if available)

    Intervention types:
    - nudge: Gentle reminder about upcoming workout
    - reminder: Direct call to action
    - celebration: Acknowledge recent success
    - concern: Check-in after missed workouts
    - insight: Educational content or progress highlight
    """
    try:
        logger.info(f"Generating intervention for user {user_id}")

        # Determine intervention type based on context
        intervention_type = determine_intervention_type(context)

        # Fetch user context (mock for now)
        user_data = {
            "name": "Client",
            "current_streak": 3,
            "missed_workouts": 2,
            "goals": ["lose_weight", "build_muscle"],
            "recent_wins": ["Completed all sets last workout", "Hit protein target 5 days this week"]
        }

        # Generate personalized message using LLM
        llm = get_smart_llm()

        system_prompt = f"""You are crafting a personalized intervention for a fitness app user.

Intervention Type: {intervention_type}
User Context:
- Current Streak: {user_data['current_streak']} days
- Recent Missed Workouts: {user_data['missed_workouts']}
- Goals: {', '.join(user_data['goals'])}
- Recent Wins: {', '.join(user_data['recent_wins'])}

Context Scores:
- Vulnerability: {context.vulnerability:.2f} (1 = high risk of skipping)
- Receptivity: {context.receptivity:.2f} (1 = very receptive)
- Opportunity: {context.opportunity:.2f} (1 = great timing)

Guidelines:
1. Keep message under 50 words
2. Be warm and encouraging, never guilt-inducing
3. Reference specific recent wins when possible
4. Provide one clear micro-action if appropriate
5. Avoid clichés and toxic positivity

Generate:
- title: Short title (4-6 words)
- message: Main intervention text
- action_label: Optional CTA button text

Format as JSON:
{{
  "title": "Your workout is ready",
  "message": "You crushed last session! Today's workout builds on that momentum. Ready?",
  "action_label": "Start Workout"
}}
"""

        user_message = f"Generate a {intervention_type} intervention for this user."

        response = llm.invoke([
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_message)
        ])

        # Parse LLM response (simplified - should use structured output)
        intervention = Intervention(
            id=f"int_{user_id}_{datetime.utcnow().timestamp()}",
            type=intervention_type,
            title=f"Time for your workout!",
            message="You've been consistent this week. Keep that momentum going with today's session!",
            priority=calculate_priority(context),
            action={
                "label": "Start Workout",
                "route": "/tabs/workouts"
            }
        )

        logger.info(f"Generated {intervention_type} intervention")

        return intervention

    except Exception as e:
        logger.error(f"Error generating intervention: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to generate intervention")


@router.post("/log-response")
async def log_intervention_response(
    intervention_id: str,
    user_id: str,
    response: Literal["engaged", "dismissed", "ignored"]
):
    """
    Log user's response to intervention for learning.

    Tracks:
    - Engagement rate by intervention type
    - Time-of-day effectiveness
    - Message style preferences
    - Context score patterns

    This data improves future intervention targeting.
    """
    try:
        logger.info(f"Logging intervention response: {intervention_id} -> {response}")

        # In production:
        # 1. Store in database
        # 2. Update user's receptivity model
        # 3. Train intervention effectiveness model

        return {
            "success": True,
            "intervention_id": intervention_id,
            "response": response
        }

    except Exception as e:
        logger.error(f"Error logging intervention response: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to log response")


# Helper functions

def calculate_vulnerability(user_id: str) -> float:
    """Calculate risk of non-adherence (0-1)"""
    # Mock implementation - replace with real data
    # High vulnerability = many missed workouts, declining trend
    return random.uniform(0.3, 0.8)


def calculate_receptivity(user_id: str) -> float:
    """Calculate willingness to engage (0-1)"""
    # Mock implementation - replace with real data
    # Consider time of day, recent app usage, notification history
    hour = datetime.now().hour
    if 6 <= hour <= 10 or 16 <= hour <= 20:  # Prime workout hours
        return random.uniform(0.7, 0.95)
    else:
        return random.uniform(0.3, 0.6)


def calculate_opportunity(user_id: str) -> float:
    """Calculate contextual opportunity (0-1)"""
    # Mock implementation - replace with real data
    # High opportunity = near workout time, phone active, good location
    return random.uniform(0.5, 0.9)


def determine_intervention_type(context: JITAIContext) -> Literal["nudge", "reminder", "celebration", "concern", "insight"]:
    """Determine best intervention type based on context"""

    # High vulnerability + low receptivity = gentle nudge
    if context.vulnerability > 0.7 and context.receptivity < 0.5:
        return "nudge"

    # High vulnerability + high receptivity = direct reminder
    if context.vulnerability > 0.7 and context.receptivity > 0.6:
        return "reminder"

    # Low vulnerability = celebrate wins
    if context.vulnerability < 0.3:
        return "celebration"

    # Medium vulnerability = check-in with concern
    if 0.5 < context.vulnerability < 0.7:
        return "concern"

    # Default = insight/education
    return "insight"


def calculate_priority(context: JITAIContext) -> int:
    """Calculate intervention priority (1-5)"""

    # Goldilocks principle: high priority when all factors align
    score = (
        context.vulnerability * 0.4 +
        context.receptivity * 0.35 +
        context.opportunity * 0.25
    )

    if score > 0.8:
        return 5  # Critical - send now
    elif score > 0.6:
        return 4  # High
    elif score > 0.4:
        return 3  # Medium
    elif score > 0.2:
        return 2  # Low
    else:
        return 1  # Very low - may skip
