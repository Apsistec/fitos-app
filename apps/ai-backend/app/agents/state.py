"""Shared state definitions for LangGraph agents"""

from typing import TypedDict, List, Dict, Any, Literal
from pydantic import BaseModel


class ChatMessage(BaseModel):
    """Single chat message"""
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: str | None = None


class UserContext(BaseModel):
    """User context for personalization"""
    user_id: str
    role: Literal["client", "trainer"]
    trainer_id: str | None = None

    # Client-specific context
    goals: List[str] | None = None
    fitness_level: str | None = None
    injuries_notes: str | None = None

    # Recent activity
    last_workout_date: str | None = None
    current_streak: int = 0
    weekly_adherence: float = 0.0

    # Wearable data
    resting_hr: int | None = None
    hrv: int | None = None
    sleep_hours: float | None = None


class ChatAction(BaseModel):
    """Suggested action from AI"""
    type: Literal["log_workout", "adjust_program", "set_reminder", "escalate_trainer", "book_session"]
    label: str
    data: Dict[str, Any]
    executed: bool = False


class AgentState(TypedDict):
    """State shared across all agents in the graph"""

    # Input
    message: str
    user_context: UserContext
    conversation_history: List[ChatMessage]

    # Routing
    current_agent: str | None
    should_escalate: bool

    # Output
    response: str | None
    agent_source: str | None
    suggested_actions: List[ChatAction] | None
    confidence: float

    # Internal
    iterations: int
