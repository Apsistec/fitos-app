"""
Multi-Agent Supervisor Pattern using LangGraph 1.0

Architecture:
- Supervisor coordinates between specialized agents
- Each agent has domain-specific tools and knowledge
- State persistence via checkpointing
- Human-in-the-loop interrupts for sensitive actions
- LangSmith integration for monitoring

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from typing import Annotated, Literal, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI

from app.core.config import settings


class CoachState(TypedDict):
    """
    State for the coaching supervisor graph.

    Uses LangGraph 1.0's typed state with annotations for message reduction.
    """

    # Messages with automatic reduction (adds new messages to history)
    messages: Annotated[list[BaseMessage], add_messages]

    # User and context IDs
    user_id: str
    trainer_id: str | None
    client_id: str | None

    # Routing and agent tracking
    current_agent: str | None
    next_agent: str | None

    # Human-in-the-loop
    requires_approval: bool
    approval_reason: str | None
    pending_action: dict | None

    # Response metadata
    confidence: float
    should_escalate: bool
    suggested_actions: list[dict]

    # Tools and context
    available_tools: list[str]
    user_context: dict


class SupervisorAgent:
    """
    Supervisor agent that coordinates between specialist agents.

    Responsibilities:
    - Route queries to appropriate specialist
    - Handle multi-turn conversations
    - Manage escalation to human trainers
    - Coordinate complex multi-agent workflows
    """

    def __init__(self, llm: ChatAnthropic | ChatOpenAI):
        self.llm = llm
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a coaching supervisor coordinating a team of AI specialists.

Your team includes:
1. **Workout Agent**: Exercise programming, form cues, periodization
2. **Nutrition Agent**: Meal planning, macro tracking, nutritional guidance
3. **Recovery Agent**: Sleep, HRV, soreness, injury prevention
4. **Motivation Agent**: Adherence, habit formation, psychological support

Your job is to:
- Analyze the user's query
- Route to the most appropriate specialist (or multiple if needed)
- Synthesize responses from multiple agents if required
- Escalate to human trainer for complex/sensitive issues

Available agents: {available_agents}
User context: {user_context}

Analyze this query and determine the routing:"""),
            ("placeholder", "{messages}"),
        ])

    def route(self, state: CoachState) -> str:
        """
        Route to appropriate specialist agent.

        Returns the name of the agent to handle the query.
        """
        messages = state["messages"]
        user_context = state.get("user_context", {})

        # Get last user message
        last_message = messages[-1] if messages else None
        if not isinstance(last_message, HumanMessage):
            return "end"

        # Use LLM to classify intent
        chain = self.prompt | self.llm
        response = chain.invoke({
            "messages": messages,
            "available_agents": ["workout", "nutrition", "recovery", "motivation"],
            "user_context": user_context,
        })

        content = response.content.lower()

        # Parse routing decision
        if "workout" in content or "exercise" in content or "training" in content:
            return "workout"
        elif "nutrition" in content or "food" in content or "meal" in content:
            return "nutrition"
        elif "recovery" in content or "sleep" in content or "rest" in content:
            return "recovery"
        elif "motivation" in content or "adherence" in content:
            return "motivation"

        # Default to general response
        return "general"

    def synthesize(self, state: CoachState) -> CoachState:
        """
        Synthesize responses from multiple agents into coherent answer.

        Used when query spans multiple domains.
        """
        messages = state["messages"]

        # If we only have responses from one agent, no synthesis needed
        agent_responses = [
            msg for msg in messages
            if isinstance(msg, AIMessage) and msg.name in ["workout", "nutrition", "recovery", "motivation"]
        ]

        if len(agent_responses) <= 1:
            # Just add the single response as final
            if agent_responses:
                final_response = agent_responses[0].content
            else:
                final_response = "I'm not sure how to help with that. Let me connect you with your trainer."

            state["messages"].append(AIMessage(
                content=final_response,
                name="supervisor"
            ))
            return state

        # Multiple agent responses - synthesize them
        synthesis_prompt = f"""Synthesize these specialist responses into one coherent answer:

{chr(10).join(f"**{msg.name}**: {msg.content}" for msg in agent_responses)}

Create a unified response that:
1. Addresses all aspects of the user's question
2. Maintains consistency between different domains
3. Prioritizes safety and trainer expertise where needed
4. Is concise and actionable
"""

        response = self.llm.invoke([
            SystemMessage(content="You are a coaching supervisor synthesizing expert advice."),
            HumanMessage(content=synthesis_prompt)
        ])

        state["messages"].append(AIMessage(
            content=response.content,
            name="supervisor"
        ))

        return state


def should_escalate(state: CoachState) -> bool:
    """
    Determine if query should be escalated to human trainer.

    Escalation triggers:
    - Injury/pain mentions
    - Low confidence (<60%)
    - Explicit request for trainer
    - Sensitive health topics
    """
    messages = state["messages"]
    last_message = messages[-1] if messages else None

    if not last_message:
        return False

    content = last_message.content.lower() if hasattr(last_message, 'content') else ""

    # Injury/pain keywords
    injury_keywords = ["pain", "hurt", "injured", "injury", "doctor", "medical", "sharp pain"]
    if any(keyword in content for keyword in injury_keywords):
        state["should_escalate"] = True
        state["approval_reason"] = "Injury or pain mentioned"
        return True

    # Explicit trainer request
    if "talk to trainer" in content or "ask my trainer" in content:
        state["should_escalate"] = True
        state["approval_reason"] = "User requested trainer"
        return True

    # Low confidence
    if state.get("confidence", 1.0) < 0.6:
        state["should_escalate"] = True
        state["approval_reason"] = "Low confidence response"
        return True

    return False


def build_supervisor_graph() -> StateGraph:
    """
    Build the supervisor-coordinated multi-agent graph.

    LangGraph 1.0 features:
    - Stable API
    - State persistence via checkpointing
    - Human-in-the-loop interrupts
    - Message reduction with annotations

    Flow:
    1. User message → Supervisor routes
    2. Specialist agent processes
    3. Check for escalation/approval
    4. Synthesize if multiple agents involved
    5. Return to user or escalate to trainer
    """

    # Import specialist agents (to be created)
    from app.agents.workout_agent import workout_node
    from app.agents.nutrition_agent import nutrition_node
    from app.agents.recovery_agent import recovery_node
    from app.agents.motivation_agent import motivation_node

    # Initialize supervisor
    llm = ChatAnthropic(
        model=settings.ANTHROPIC_MODEL,
        api_key=settings.ANTHROPIC_API_KEY,
        temperature=0.1,
    )
    supervisor = SupervisorAgent(llm)

    # Create graph
    graph = StateGraph(CoachState)

    # Add nodes
    graph.add_node("supervisor", supervisor.route)
    graph.add_node("workout", workout_node)
    graph.add_node("nutrition", nutrition_node)
    graph.add_node("recovery", recovery_node)
    graph.add_node("motivation", motivation_node)
    graph.add_node("synthesize", supervisor.synthesize)
    graph.add_node("escalate", lambda state: {
        **state,
        "messages": state["messages"] + [
            AIMessage(
                content="I've notified your trainer about this. They'll reach out shortly.",
                name="supervisor"
            )
        ]
    })

    # Define edges
    graph.add_edge(START, "supervisor")

    # Supervisor routes to specialists
    graph.add_conditional_edges(
        "supervisor",
        lambda state: state.get("next_agent", "end"),
        {
            "workout": "workout",
            "nutrition": "nutrition",
            "recovery": "recovery",
            "motivation": "motivation",
            "end": END,
        }
    )

    # Each specialist goes to escalation check
    for agent in ["workout", "nutrition", "recovery", "motivation"]:
        graph.add_conditional_edges(
            agent,
            should_escalate,
            {
                True: "escalate",
                False: "synthesize",
            }
        )

    # Synthesize and escalate both end
    graph.add_edge("synthesize", END)
    graph.add_edge("escalate", END)

    # Compile with checkpointing for state persistence
    checkpointer = MemorySaver()
    return graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["escalate"],  # Human-in-the-loop for escalations
    )


# Global graph instance
coach_graph = None


def get_coach_graph():
    """Get or create the compiled coach graph"""
    global coach_graph
    if coach_graph is None:
        coach_graph = build_supervisor_graph()
    return coach_graph
