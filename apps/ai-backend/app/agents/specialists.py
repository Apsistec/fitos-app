"""Specialist agent implementations for different coaching domains"""

from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.state import AgentState, ChatAction
from app.core.llm import get_smart_llm


def workout_agent(state: AgentState) -> AgentState:
    """
    Workout programming specialist.
    Handles exercise selection, form advice, progression strategies.
    """

    llm = get_smart_llm()

    # Build context-aware system prompt
    user_context = state["user_context"]
    system_prompt = f"""You are a knowledgeable workout programming coach within the FitOS app.

User Context:
- Fitness Level: {user_context.fitness_level or 'Unknown'}
- Goals: {', '.join(user_context.goals or ['General fitness'])}
- Injuries/Notes: {user_context.injuries_notes or 'None reported'}
- Current Streak: {user_context.current_streak} days

Guidelines:
1. Provide evidence-based exercise advice
2. Consider the user's fitness level and injuries
3. Suggest specific exercises with proper form cues
4. Offer progression/regression options
5. NEVER diagnose injuries - escalate pain concerns to trainer
6. Keep responses concise and actionable (<150 words)

If the user asks about pain or injury, respond empathetically but clearly state you need to escalate to their trainer.
"""

    # Get conversation history
    history = state.get("conversation_history", [])
    messages = [SystemMessage(content=system_prompt)]

    # Add last 5 messages for context
    for msg in history[-5:]:
        messages.append(HumanMessage(content=msg.content) if msg.role == "user" else SystemMessage(content=msg.content))

    # Add current message
    messages.append(HumanMessage(content=state["message"]))

    # Generate response
    response = llm.invoke(messages)

    state["response"] = response.content
    state["agent_source"] = "workout"
    state["confidence"] = 0.85
    state["suggested_actions"] = []

    # Check if we should suggest logging a workout
    message_lower = state["message"].lower()
    if any(keyword in message_lower for keyword in ["log", "track", "record", "completed"]):
        state["suggested_actions"].append(ChatAction(
            type="log_workout",
            label="Log This Workout",
            data={"source": "ai_suggestion"},
            executed=False
        ))

    return state


def nutrition_agent(state: AgentState) -> AgentState:
    """
    Nutrition coaching specialist.
    Handles macro tracking, meal planning, adherence-neutral guidance.
    """

    llm = get_smart_llm()

    user_context = state["user_context"]
    system_prompt = f"""You are a supportive nutrition coach within the FitOS app.

User Context:
- Goals: {', '.join(user_context.goals or ['General fitness'])}
- Weekly Adherence: {user_context.weekly_adherence * 100:.0f}%

Critical Guidelines (ADHERENCE-NEUTRAL APPROACH):
1. NEVER use "good/bad" or "over/under" language for food choices
2. Use neutral terms: "on target", "above target", "below target"
3. Purple (#8B5CF6) is used for "above target", NOT red
4. Focus on what TO eat, not what to avoid
5. Celebrate all logging efforts, not just "perfect" days
6. Acknowledge challenges without judgment

Coaching Style:
- Provide specific, actionable macro guidance
- Suggest meal ideas based on targets
- Help with food substitutions
- Keep responses concise (<150 words)
- Be encouraging about logging consistency

NEVER provide medical nutrition therapy - escalate medical concerns to trainer.
"""

    history = state.get("conversation_history", [])
    messages = [SystemMessage(content=system_prompt)]

    for msg in history[-5:]:
        messages.append(HumanMessage(content=msg.content) if msg.role == "user" else SystemMessage(content=msg.content))

    messages.append(HumanMessage(content=state["message"]))

    response = llm.invoke(messages)

    state["response"] = response.content
    state["agent_source"] = "nutrition"
    state["confidence"] = 0.85
    state["suggested_actions"] = []

    return state


def recovery_agent(state: AgentState) -> AgentState:
    """
    Recovery and wellness specialist.
    Handles sleep, HRV, rest days, deload strategies.
    """

    llm = get_smart_llm()

    user_context = state["user_context"]

    # Build wearable context
    wearable_context = []
    if user_context.resting_hr:
        wearable_context.append(f"Resting HR: {user_context.resting_hr} bpm")
    if user_context.hrv:
        wearable_context.append(f"HRV: {user_context.hrv} ms")
    if user_context.sleep_hours:
        wearable_context.append(f"Sleep: {user_context.sleep_hours:.1f} hours")

    wearable_str = "\n- ".join(wearable_context) if wearable_context else "No recent data"

    system_prompt = f"""You are a recovery and wellness coach within the FitOS app.

User Context:
- Current Streak: {user_context.current_streak} days
- Recent Wearable Data:
  {wearable_str}

Guidelines:
1. Interpret HRV, sleep, and resting HR trends
2. Recommend rest vs. active recovery vs. normal training
3. Suggest deload protocols when needed
4. Emphasize recovery as productive, not lazy
5. NEVER diagnose medical conditions - escalate concerns

Keep responses practical and encouraging (<150 words).
"""

    history = state.get("conversation_history", [])
    messages = [SystemMessage(content=system_prompt)]

    for msg in history[-5:]:
        messages.append(HumanMessage(content=msg.content) if msg.role == "user" else SystemMessage(content=msg.content))

    messages.append(HumanMessage(content=state["message"]))

    response = llm.invoke(messages)

    state["response"] = response.content
    state["agent_source"] = "recovery"
    state["confidence"] = 0.80
    state["suggested_actions"] = []

    return state


def motivation_agent(state: AgentState) -> AgentState:
    """
    Motivation and accountability specialist.
    Handles struggles, setbacks, mindset coaching.
    """

    llm = get_smart_llm()

    user_context = state["user_context"]
    system_prompt = f"""You are an empathetic and motivating coach within the FitOS app.

User Context:
- Current Streak: {user_context.current_streak} days
- Weekly Adherence: {user_context.weekly_adherence * 100:.0f}%
- Goals: {', '.join(user_context.goals or ['General fitness'])}

Guidelines:
1. Validate feelings and struggles authentically
2. Reframe setbacks as learning opportunities
3. Use specific past successes as evidence of capability
4. Avoid toxic positivity - acknowledge real challenges
5. Suggest concrete micro-actions to rebuild momentum
6. For serious mental health concerns, escalate to trainer

Be warm, genuine, and action-oriented (<150 words).
"""

    history = state.get("conversation_history", [])
    messages = [SystemMessage(content=system_prompt)]

    for msg in history[-5:]:
        messages.append(HumanMessage(content=msg.content) if msg.role == "user" else SystemMessage(content=msg.content))

    messages.append(HumanMessage(content=state["message"]))

    response = llm.invoke(messages)

    state["response"] = response.content
    state["agent_source"] = "motivation"
    state["confidence"] = 0.90  # High confidence for motivation
    state["suggested_actions"] = []

    # Check for severe distress keywords
    distress_keywords = ["depressed", "hopeless", "want to die", "suicide", "self-harm"]
    if any(keyword in state["message"].lower() for keyword in distress_keywords):
        state["confidence"] = 0.3  # Force escalation
        state["should_escalate"] = True

    return state


def general_agent(state: AgentState) -> AgentState:
    """
    General assistant for questions that don't fit specialist categories.
    Handles app navigation, features, scheduling, etc.
    """

    llm = get_smart_llm()

    system_prompt = """You are a helpful general assistant for the FitOS fitness app.

You can help with:
- App features and navigation
- Scheduling and reminders
- General fitness questions
- Connecting users to the right resources

Guidelines:
1. Be concise and helpful
2. Direct complex questions to appropriate specialist or trainer
3. Don't make up app features - be honest about limitations
4. Keep responses <100 words

If unsure, suggest the user contact their trainer directly.
"""

    history = state.get("conversation_history", [])
    messages = [SystemMessage(content=system_prompt)]

    for msg in history[-5:]:
        messages.append(HumanMessage(content=msg.content) if msg.role == "user" else SystemMessage(content=msg.content))

    messages.append(HumanMessage(content=state["message"]))

    response = llm.invoke(messages)

    state["response"] = response.content
    state["agent_source"] = "general"
    state["confidence"] = 0.75
    state["suggested_actions"] = []

    return state
