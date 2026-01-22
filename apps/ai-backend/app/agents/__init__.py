"""LangGraph agent modules and A2A protocol"""

# LangGraph agents (existing)
from app.agents.state import AgentState, ChatMessage, UserContext, ChatAction
from app.agents.coach_graph import build_coach_graph

# A2A Protocol (Sprint 44)
from app.agents.a2a_models import (
    A2AMessage,
    A2ACapability,
    A2AActionRequest,
    A2AActionResponse,
    FitOSRecoveryData,
    FitOSNutritionEntry,
    FitOSCalendarEvent,
    FitOSHealthRecord,
)
from app.agents.a2a_agent import fitos_agent
from app.agents.a2a_registry import a2a_registry, a2a_integration_manager
from app.agents.a2a_communication import a2a_communication, a2a_sync_scheduler

__all__ = [
    # LangGraph agents
    "AgentState",
    "ChatMessage",
    "UserContext",
    "ChatAction",
    "build_coach_graph",
    # A2A Protocol
    "A2AMessage",
    "A2ACapability",
    "A2AActionRequest",
    "A2AActionResponse",
    "FitOSRecoveryData",
    "FitOSNutritionEntry",
    "FitOSCalendarEvent",
    "FitOSHealthRecord",
    "fitos_agent",
    "a2a_registry",
    "a2a_integration_manager",
    "a2a_communication",
    "a2a_sync_scheduler",
]
