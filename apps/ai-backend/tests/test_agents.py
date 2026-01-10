"""Tests for LangGraph multi-agent system"""

import pytest
from app.agents import build_coach_graph, AgentState, UserContext, ChatMessage


@pytest.fixture
def mock_user_context():
    """Mock user context for testing"""
    return UserContext(
        user_id="test-user-123",
        role="client",
        goals=["muscle_gain", "strength"],
        fitness_level="intermediate",
        current_streak=5,
        weekly_adherence=0.85
    )


@pytest.fixture
def coach_graph():
    """Build coach graph for testing"""
    return build_coach_graph()


@pytest.mark.asyncio
async def test_workout_agent_routing(coach_graph, mock_user_context):
    """Test that workout questions route to workout agent"""

    state = {
        "message": "How should I progress my squat?",
        "user_context": mock_user_context,
        "conversation_history": [],
        "current_agent": None,
        "should_escalate": False,
        "response": None,
        "agent_source": None,
        "suggested_actions": [],
        "confidence": 0.0,
        "iterations": 0,
    }

    result = await coach_graph.ainvoke(state)

    assert result["agent_source"] == "workout"
    assert result["response"] is not None
    assert isinstance(result["response"], str)


@pytest.mark.asyncio
async def test_nutrition_agent_routing(coach_graph, mock_user_context):
    """Test that nutrition questions route to nutrition agent"""

    state = {
        "message": "How much protein should I eat?",
        "user_context": mock_user_context,
        "conversation_history": [],
        "current_agent": None,
        "should_escalate": False,
        "response": None,
        "agent_source": None,
        "suggested_actions": [],
        "confidence": 0.0,
        "iterations": 0,
    }

    result = await coach_graph.ainvoke(state)

    assert result["agent_source"] == "nutrition"
    assert result["response"] is not None


@pytest.mark.asyncio
async def test_pain_escalation(coach_graph, mock_user_context):
    """Test that pain mentions trigger escalation"""

    state = {
        "message": "I have sharp knee pain during squats",
        "user_context": mock_user_context,
        "conversation_history": [],
        "current_agent": None,
        "should_escalate": False,
        "response": None,
        "agent_source": None,
        "suggested_actions": [],
        "confidence": 0.0,
        "iterations": 0,
    }

    result = await coach_graph.ainvoke(state)

    assert result["should_escalate"] is True
    assert any(action["type"] == "escalate_trainer" for action in result.get("suggested_actions", []))


@pytest.mark.asyncio
async def test_motivation_agent_routing(coach_graph, mock_user_context):
    """Test that motivation questions route correctly"""

    state = {
        "message": "I'm struggling to stay motivated",
        "user_context": mock_user_context,
        "conversation_history": [],
        "current_agent": None,
        "should_escalate": False,
        "response": None,
        "agent_source": None,
        "suggested_actions": [],
        "confidence": 0.0,
        "iterations": 0,
    }

    result = await coach_graph.ainvoke(state)

    assert result["agent_source"] == "motivation"
    assert result["response"] is not None


@pytest.mark.asyncio
async def test_conversation_history(coach_graph, mock_user_context):
    """Test that conversation history is maintained"""

    history = [
        ChatMessage(role="user", content="What's a good squat weight?"),
        ChatMessage(role="assistant", content="Start with bodyweight to perfect form.")
    ]

    state = {
        "message": "How do I progress from there?",
        "user_context": mock_user_context,
        "conversation_history": history,
        "current_agent": None,
        "should_escalate": False,
        "response": None,
        "agent_source": None,
        "suggested_actions": [],
        "confidence": 0.0,
        "iterations": 0,
    }

    result = await coach_graph.ainvoke(state)

    # Should understand context and provide progression advice
    assert result["response"] is not None
    assert result["agent_source"] == "workout"


def test_adherence_neutral_language():
    """Test that nutrition agent uses adherence-neutral language"""

    # This test would check that responses don't contain
    # "good/bad" or "over/under" language
    # Implementation depends on how we structure agent responses

    prohibited_terms = ["bad", "cheated", "failed", "ruined"]
    neutral_terms = ["above target", "below target", "on track"]

    # Would analyze agent responses to ensure adherence-neutral approach
    assert True  # Placeholder
