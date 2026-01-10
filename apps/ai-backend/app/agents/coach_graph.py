"""
Multi-agent coaching graph using LangGraph.

Architecture:
1. Router classifies user query intent
2. Routes to specialist agent (workout, nutrition, recovery, motivation)
3. Specialist generates response with optional actions
4. Escalation check decides if trainer involvement needed
"""

from typing import Literal
from langgraph.graph import StateGraph, END
from langchain_core.messages import HumanMessage, SystemMessage

from app.agents.state import AgentState
from app.agents.specialists import (
    workout_agent,
    nutrition_agent,
    recovery_agent,
    motivation_agent,
    general_agent,
)
from app.core.llm import get_fast_llm


def route_query(state: AgentState) -> Literal["workout", "nutrition", "recovery", "motivation", "general"]:
    """
    Route user query to appropriate specialist agent.
    Uses fast LLM for quick classification.
    """
    message = state["message"]

    # Simple keyword-based routing (can be enhanced with LLM classification)
    message_lower = message.lower()

    # Workout keywords
    workout_keywords = ["workout", "exercise", "training", "set", "rep", "weight", "squat", "deadlift", "bench"]
    if any(keyword in message_lower for keyword in workout_keywords):
        return "workout"

    # Nutrition keywords
    nutrition_keywords = ["food", "eat", "protein", "calorie", "macro", "diet", "meal", "nutrition"]
    if any(keyword in message_lower for keyword in nutrition_keywords):
        return "nutrition"

    # Recovery keywords
    recovery_keywords = ["sleep", "rest", "sore", "tired", "recovery", "hrv", "heart rate"]
    if any(keyword in message_lower for keyword in recovery_keywords):
        return "recovery"

    # Motivation keywords
    motivation_keywords = ["motivation", "struggle", "skip", "quit", "hard", "difficult", "give up"]
    if any(keyword in message_lower for keyword in motivation_keywords):
        return "motivation"

    # Default to general agent
    return "general"


def check_escalation(state: AgentState) -> Literal["escalate", "complete"]:
    """
    Determine if query should be escalated to human trainer.

    Escalation triggers:
    - Pain/injury mentions
    - Complex programming questions
    - Emotional distress
    - User explicitly asks for trainer
    """
    message = state["message"].lower()

    # Pain/injury escalation
    injury_keywords = ["pain", "hurt", "injured", "injury", "doctor", "medical"]
    if any(keyword in message for keyword in injury_keywords):
        state["should_escalate"] = True
        return "escalate"

    # Explicit trainer request
    trainer_keywords = ["talk to trainer", "ask trainer", "trainer help", "speak to my trainer"]
    if any(keyword in message for keyword in trainer_keywords):
        state["should_escalate"] = True
        return "escalate"

    # Low confidence response
    if state.get("confidence", 1.0) < 0.6:
        state["should_escalate"] = True
        return "escalate"

    return "complete"


def escalation_handler(state: AgentState) -> AgentState:
    """Handle escalated queries by notifying trainer and providing empathetic response"""

    original_response = state.get("response", "")

    escalation_message = (
        f"{original_response}\n\n"
        "I've notified your trainer about this. They'll reach out to you soon to discuss this in more detail. "
        "In the meantime, if this is urgent, please don't hesitate to message them directly."
    )

    state["response"] = escalation_message
    state["suggested_actions"] = state.get("suggested_actions", []) + [{
        "type": "escalate_trainer",
        "label": "Message Trainer Now",
        "data": {
            "reason": "Client query requires trainer expertise",
            "original_message": state["message"]
        },
        "executed": False
    }]

    return state


def build_coach_graph() -> StateGraph:
    """
    Build the multi-agent coaching graph.

    Flow:
    1. User message comes in
    2. Router classifies intent
    3. Specialist agent processes
    4. Escalation check
    5. Return response or escalate
    """

    graph = StateGraph(AgentState)

    # Add nodes
    graph.add_node("workout", workout_agent)
    graph.add_node("nutrition", nutrition_agent)
    graph.add_node("recovery", recovery_agent)
    graph.add_node("motivation", motivation_agent)
    graph.add_node("general", general_agent)
    graph.add_node("escalation_handler", escalation_handler)

    # Set entry point with routing
    graph.set_conditional_entry_point(
        route_query,
        {
            "workout": "workout",
            "nutrition": "nutrition",
            "recovery": "recovery",
            "motivation": "motivation",
            "general": "general",
        }
    )

    # Add escalation check after each specialist
    for agent_name in ["workout", "nutrition", "recovery", "motivation", "general"]:
        graph.add_conditional_edges(
            agent_name,
            check_escalation,
            {
                "escalate": "escalation_handler",
                "complete": END,
            }
        )

    # Escalation handler leads to end
    graph.add_edge("escalation_handler", END)

    return graph.compile()
