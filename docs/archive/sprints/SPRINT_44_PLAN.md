# Sprint 44: A2A Protocol Compatibility - Implementation Plan

**Sprint:** 44
**Feature:** Agent-to-Agent (A2A) Protocol Compatibility
**Goal:** Enable FitOS to communicate with external AI agents in the multi-agent ecosystem
**Priority:** P1 (High - vital for product mission)
**Story Points:** 5
**Duration:** 1 week
**Started:** January 21, 2026

---

## Executive Summary

Sprint 44 implements Google's Agent-to-Agent (A2A) protocol to enable FitOS to communicate with external AI agents, creating an open, interoperable fitness ecosystem.

**Vision:** FitOS becomes the central fitness hub that orchestrates data and actions across wearables, nutrition apps, calendars, and healthcare systems - all through standardized AI agent communication.

**Key Deliverables:**
1. A2A-compliant agent architecture
2. Capability registry and discovery system
3. Agent communication service (send/receive)
4. 3+ integration examples (WHOOP, MyFitnessPal, Google Calendar)
5. Authentication and security layer
6. Developer documentation for external agents

---

## What is A2A Protocol?

**Agent-to-Agent (A2A) Protocol** is an open standard (Linux Foundation) for AI agents to communicate, similar to how HTTP enables web services to communicate.

**Announced:** April 2025 by Google
**Status:** Industry standard, supported by major tech companies
**Governance:** Linux Foundation (open source)

### Core Concepts

1. **Agent:** An AI system that can perform tasks and communicate
2. **Capability:** A specific function an agent can perform
3. **Discovery:** How agents find each other and learn capabilities
4. **Request/Response:** Standard message format for inter-agent communication
5. **Authentication:** OAuth 2.0, API keys, or mutual TLS

### A2A Message Format

```json
{
  "protocol_version": "1.0",
  "message_id": "uuid-v4",
  "timestamp": "2026-01-21T10:30:00Z",
  "sender": {
    "agent_id": "whoop-agent-prod",
    "agent_type": "wearable_tracker",
    "version": "2.1.0"
  },
  "recipient": {
    "agent_id": "fitos-agent-prod",
    "capabilities_required": ["workout_planning"]
  },
  "action": "request_workout_adjustment",
  "payload": {
    "user_id": "user-123",
    "reason": "low_recovery",
    "recovery_score": 45,
    "hrv_deviation": -20,
    "recommendation": "active_recovery"
  },
  "authentication": {
    "method": "oauth2",
    "token": "bearer-token-here"
  }
}
```

---

## Part 1: A2A Agent Base Architecture (2 points)

### Goal
Create the foundational A2A agent that wraps FitOS AI capabilities.

### File Structure

```
apps/ai-backend/app/agents/
├── __init__.py
├── a2a_agent.py          # Base A2A agent implementation
├── capabilities.py       # Capability registry
├── communication.py      # Inter-agent communication
├── models.py            # Pydantic models for A2A messages
├── security.py          # Authentication and authorization
└── integrations/        # External agent integrations
    ├── __init__.py
    ├── whoop_agent.py
    ├── myfitnesspal_agent.py
    └── calendar_agent.py
```

### Implementation: Base A2A Agent

**File:** `apps/ai-backend/app/agents/a2a_agent.py`

```python
from typing import Dict, List, Optional, Any
from datetime import datetime
import uuid
from pydantic import BaseModel

from app.agents.capabilities import CapabilityRegistry
from app.agents.models import A2ARequest, A2AResponse
from app.agents.security import authenticate_agent


class FitOSAgent:
    """
    FitOS A2A-compliant AI agent.

    Implements the Agent-to-Agent protocol for interoperability
    with external AI agents (wearables, nutrition apps, calendars, healthcare).

    Capabilities:
    - workout_planning: Plan and adjust workouts
    - nutrition_tracking: Track and analyze nutrition
    - progress_monitoring: Monitor client progress
    - coach_messaging: AI coach interactions
    - exercise_library_access: Access exercise database
    - body_composition_tracking: Track body metrics
    """

    def __init__(self):
        self.agent_id = "fitos-agent-prod"
        self.agent_type = "fitness_coaching"
        self.version = "1.0.0"
        self.capabilities = CapabilityRegistry()

    def get_agent_info(self) -> Dict[str, Any]:
        """Get agent identification and capabilities"""
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "version": self.version,
            "protocol_version": "1.0",
            "capabilities": self.capabilities.list_all(),
            "supported_auth": ["oauth2", "api_key"],
            "endpoints": {
                "discovery": "/a2a/discover",
                "request": "/a2a/request",
                "callback": "/a2a/callback"
            }
        }

    async def handle_request(self, request: A2ARequest) -> A2AResponse:
        """
        Handle incoming A2A request from external agent.

        Routes request to appropriate capability handler.
        """
        # Authenticate sender
        if not await authenticate_agent(request):
            return A2AResponse(
                status="error",
                message="Authentication failed",
                error_code="AUTH_FAILED"
            )

        # Check if we have the required capability
        if not self.capabilities.has_capability(request.action):
            return A2AResponse(
                status="error",
                message=f"Capability not supported: {request.action}",
                error_code="CAPABILITY_NOT_FOUND"
            )

        # Route to capability handler
        handler = self.capabilities.get_handler(request.action)
        try:
            result = await handler.execute(request)
            return A2AResponse(
                status="success",
                message_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                data=result
            )
        except Exception as e:
            return A2AResponse(
                status="error",
                message=str(e),
                error_code="EXECUTION_FAILED"
            )

    async def send_request(
        self,
        recipient_agent_id: str,
        action: str,
        payload: Dict[str, Any],
        auth_token: Optional[str] = None
    ) -> A2AResponse:
        """
        Send A2A request to external agent.

        Used when FitOS needs to request action from external agent
        (e.g., ask WHOOP for latest recovery score).
        """
        request = A2ARequest(
            message_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            sender_agent_id=self.agent_id,
            recipient_agent_id=recipient_agent_id,
            action=action,
            payload=payload,
            auth_token=auth_token
        )

        # Send via communication service
        from app.agents.communication import send_to_agent
        return await send_to_agent(request)

    def discover_agents(self, agent_type: Optional[str] = None) -> List[Dict]:
        """
        Discover available agents in ecosystem.

        Queries A2A registry for agents that can integrate with FitOS.
        """
        from app.agents.communication import discover_agents
        return discover_agents(agent_type=agent_type)
```

### Implementation: Pydantic Models

**File:** `apps/ai-backend/app/agents/models.py`

```python
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import datetime


class AgentIdentifier(BaseModel):
    """Identifies an agent in A2A communication"""
    agent_id: str
    agent_type: str
    version: str


class A2ARequest(BaseModel):
    """Standard A2A request message"""
    protocol_version: str = "1.0"
    message_id: str
    timestamp: datetime

    sender: AgentIdentifier
    recipient: AgentIdentifier

    action: str
    payload: Dict[str, Any]

    # Authentication
    auth_method: str = Field(default="oauth2", regex="^(oauth2|api_key|mtls)$")
    auth_token: Optional[str] = None

    # Metadata
    user_id: Optional[str] = None
    correlation_id: Optional[str] = None
    callback_url: Optional[str] = None


class A2AResponse(BaseModel):
    """Standard A2A response message"""
    protocol_version: str = "1.0"
    message_id: str
    timestamp: datetime

    status: str = Field(..., regex="^(success|error|pending)$")
    message: Optional[str] = None
    error_code: Optional[str] = None

    data: Optional[Dict[str, Any]] = None

    # For async operations
    callback_url: Optional[str] = None
    estimated_completion: Optional[datetime] = None


class CapabilityDefinition(BaseModel):
    """Defines a capability an agent can perform"""
    name: str
    description: str
    version: str

    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]

    # Performance
    avg_latency_ms: Optional[int] = None
    success_rate: Optional[float] = None

    # Constraints
    rate_limit: Optional[str] = None  # e.g., "100/hour"
    requires_auth: bool = True


class AgentDiscoveryResponse(BaseModel):
    """Response to agent discovery query"""
    agents: List[Dict[str, Any]]
    total_count: int
    query_timestamp: datetime
```

---

## Part 2: Capability Registry (1 point)

### Goal
Define and expose FitOS capabilities to external agents.

### Implementation

**File:** `apps/ai-backend/app/agents/capabilities.py`

```python
from typing import Dict, List, Optional, Callable
from app.agents.models import CapabilityDefinition


class CapabilityHandler:
    """Base handler for A2A capability"""

    def __init__(self, name: str, description: str):
        self.name = name
        self.description = description

    async def execute(self, request) -> Dict:
        """Execute the capability"""
        raise NotImplementedError


class WorkoutPlanningCapability(CapabilityHandler):
    """Adjust workout based on external input (e.g., recovery data)"""

    def __init__(self):
        super().__init__(
            name="workout_planning",
            description="Plan and adjust workouts based on client state"
        )

    async def execute(self, request) -> Dict:
        payload = request.payload

        # Extract data
        user_id = payload.get("user_id")
        reason = payload.get("reason")  # e.g., "low_recovery"
        recommendation = payload.get("recommendation")  # e.g., "active_recovery"

        # Adjust workout in FitOS
        from app.services.workout_service import adjust_workout
        result = await adjust_workout(
            user_id=user_id,
            adjustment_reason=reason,
            recommended_intensity=recommendation
        )

        return {
            "adjustment_made": True,
            "original_workout": result.get("original"),
            "adjusted_workout": result.get("adjusted"),
            "reason": reason
        }


class NutritionTrackingCapability(CapabilityHandler):
    """Sync nutrition data from external apps"""

    def __init__(self):
        super().__init__(
            name="nutrition_tracking",
            description="Track and analyze nutrition data"
        )

    async def execute(self, request) -> Dict:
        payload = request.payload

        # Extract nutrition data
        user_id = payload.get("user_id")
        meals = payload.get("meals", [])

        # Sync to FitOS
        from app.services.nutrition_service import sync_external_meals
        result = await sync_external_meals(
            user_id=user_id,
            meals=meals,
            source=request.sender.agent_id
        )

        return {
            "meals_synced": len(meals),
            "total_calories": result.get("total_calories"),
            "macros": result.get("macros"),
            "feedback": result.get("feedback")
        }


class ProgressMonitoringCapability(CapabilityHandler):
    """Share progress data with external agents"""

    def __init__(self):
        super().__init__(
            name="progress_monitoring",
            description="Monitor and share client progress"
        )

    async def execute(self, request) -> Dict:
        payload = request.payload

        user_id = payload.get("user_id")
        metrics = payload.get("metrics", ["weight", "workouts", "consistency"])
        start_date = payload.get("start_date")
        end_date = payload.get("end_date")

        # Fetch progress data
        from app.services.progress_service import get_progress_report
        report = await get_progress_report(
            user_id=user_id,
            metrics=metrics,
            start_date=start_date,
            end_date=end_date
        )

        return report


class CapabilityRegistry:
    """Registry of all FitOS A2A capabilities"""

    def __init__(self):
        self._capabilities: Dict[str, CapabilityHandler] = {}
        self._register_default_capabilities()

    def _register_default_capabilities(self):
        """Register default FitOS capabilities"""
        self.register(WorkoutPlanningCapability())
        self.register(NutritionTrackingCapability())
        self.register(ProgressMonitoringCapability())

    def register(self, capability: CapabilityHandler):
        """Register a new capability"""
        self._capabilities[capability.name] = capability

    def has_capability(self, name: str) -> bool:
        """Check if capability exists"""
        return name in self._capabilities

    def get_handler(self, name: str) -> Optional[CapabilityHandler]:
        """Get capability handler"""
        return self._capabilities.get(name)

    def list_all(self) -> List[str]:
        """List all capability names"""
        return list(self._capabilities.keys())

    def get_definitions(self) -> List[CapabilityDefinition]:
        """Get full capability definitions for discovery"""
        return [
            CapabilityDefinition(
                name=cap.name,
                description=cap.description,
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        # Additional schema per capability
                    }
                },
                output_schema={
                    "type": "object"
                },
                requires_auth=True
            )
            for cap in self._capabilities.values()
        ]
```

---

## Part 3: Agent Communication Service (1 point)

### Goal
Enable sending/receiving A2A messages to/from external agents.

### Implementation

**File:** `apps/ai-backend/app/agents/communication.py`

```python
import httpx
from typing import Dict, List, Optional
from datetime import datetime

from app.agents.models import A2ARequest, A2AResponse
from app.core.config import settings


# A2A Registry (simulated - in production would be centralized service)
AGENT_REGISTRY = {
    "whoop-agent-prod": {
        "endpoint": "https://api.whoop.com/a2a",
        "agent_type": "wearable_tracker",
        "capabilities": ["recovery_data", "sleep_analysis", "strain_tracking"]
    },
    "myfitnesspal-agent-prod": {
        "endpoint": "https://api.myfitnesspal.com/a2a",
        "agent_type": "nutrition_tracker",
        "capabilities": ["meal_logging", "macro_analysis", "food_database"]
    },
    "google-calendar-agent": {
        "endpoint": "https://www.googleapis.com/calendar/a2a",
        "agent_type": "scheduling",
        "capabilities": ["event_creation", "availability_check", "reminder_setting"]
    }
}


async def send_to_agent(request: A2ARequest) -> A2AResponse:
    """
    Send A2A request to external agent.

    Looks up agent endpoint from registry and sends HTTP request.
    """
    # Look up agent endpoint
    agent_info = AGENT_REGISTRY.get(request.recipient.agent_id)
    if not agent_info:
        return A2AResponse(
            message_id=request.message_id,
            timestamp=datetime.utcnow(),
            status="error",
            message=f"Agent not found: {request.recipient.agent_id}",
            error_code="AGENT_NOT_FOUND"
        )

    endpoint = agent_info["endpoint"]

    # Send HTTP request
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                endpoint,
                json=request.dict(),
                headers={
                    "Content-Type": "application/json",
                    "X-A2A-Protocol-Version": "1.0",
                    "Authorization": f"Bearer {request.auth_token}"
                },
                timeout=30.0
            )

            response.raise_for_status()
            data = response.json()

            return A2AResponse(**data)

        except httpx.HTTPError as e:
            return A2AResponse(
                message_id=request.message_id,
                timestamp=datetime.utcnow(),
                status="error",
                message=f"Communication error: {str(e)}",
                error_code="COMMUNICATION_FAILED"
            )


def discover_agents(agent_type: Optional[str] = None) -> List[Dict]:
    """
    Discover available agents in ecosystem.

    In production, this would query a centralized A2A registry.
    For now, returns local registry.
    """
    agents = []

    for agent_id, info in AGENT_REGISTRY.items():
        if agent_type is None or info["agent_type"] == agent_type:
            agents.append({
                "agent_id": agent_id,
                "agent_type": info["agent_type"],
                "endpoint": info["endpoint"],
                "capabilities": info["capabilities"]
            })

    return agents


async def request_recovery_data(user_id: str, whoop_user_id: str) -> Dict:
    """
    Request recovery data from WHOOP agent.

    Example of outbound A2A request.
    """
    request = A2ARequest(
        protocol_version="1.0",
        message_id=str(uuid.uuid4()),
        timestamp=datetime.utcnow(),
        sender=AgentIdentifier(
            agent_id="fitos-agent-prod",
            agent_type="fitness_coaching",
            version="1.0.0"
        ),
        recipient=AgentIdentifier(
            agent_id="whoop-agent-prod",
            agent_type="wearable_tracker",
            version="2.1.0"
        ),
        action="get_recovery_data",
        payload={
            "user_id": whoop_user_id,
            "fitos_user_id": user_id,
            "metrics": ["recovery_score", "hrv", "sleep_performance"]
        },
        auth_method="oauth2",
        auth_token=get_whoop_token(user_id)
    )

    response = await send_to_agent(request)

    if response.status == "success":
        return response.data
    else:
        raise Exception(f"Failed to get recovery data: {response.message}")
```

---

## Part 4: Integration Examples (1 point)

### WHOOP Integration

**File:** `apps/ai-backend/app/agents/integrations/whoop_agent.py`

**Use Case:** WHOOP detects low recovery → FitOS adjusts workout intensity

```python
async def handle_whoop_recovery_update(whoop_data: Dict) -> Dict:
    """
    Handle recovery update from WHOOP agent.

    WHOOP sends daily recovery score → FitOS adjusts workout.
    """
    user_id = whoop_data.get("fitos_user_id")
    recovery_score = whoop_data.get("recovery_score")  # 0-100
    hrv_deviation = whoop_data.get("hrv_deviation")  # % change from baseline

    # Determine workout adjustment
    if recovery_score < 33:
        intensity = "rest"
        recommendation = "Complete rest or light mobility work"
    elif recovery_score < 66:
        intensity = "active_recovery"
        recommendation = "Zone 2 cardio or yoga, avoid high intensity"
    else:
        intensity = "normal"
        recommendation = "Proceed with planned workout"

    # Adjust today's workout
    from app.services.workout_service import adjust_workout
    result = await adjust_workout(
        user_id=user_id,
        adjustment_reason="whoop_recovery",
        recommended_intensity=intensity,
        notes=f"WHOOP recovery score: {recovery_score}%, HRV: {hrv_deviation:+}%"
    )

    return {
        "adjustment_made": True,
        "new_intensity": intensity,
        "recommendation": recommendation
    }
```

### MyFitnessPal Integration

**File:** `apps/ai-backend/app/agents/integrations/myfitnesspal_agent.py`

**Use Case:** MyFitnessPal logs meal → FitOS analyzes macros and provides feedback

```python
async def handle_myfitnesspal_meal_sync(meal_data: Dict) -> Dict:
    """
    Handle meal sync from MyFitnessPal agent.

    MyFitnessPal logs meal → FitOS stores and analyzes.
    """
    user_id = meal_data.get("fitos_user_id")
    meals = meal_data.get("meals", [])

    # Sync meals to FitOS
    from app.services.nutrition_service import sync_external_meals
    result = await sync_external_meals(
        user_id=user_id,
        meals=meals,
        source="myfitnesspal"
    )

    # Check if user is short on macros
    daily_totals = result.get("daily_totals")
    targets = result.get("targets")

    feedback = []
    if daily_totals["protein"] < targets["protein"] * 0.8:
        shortfall = targets["protein"] - daily_totals["protein"]
        feedback.append(f"Protein: {shortfall}g short of target")

    # Send feedback back to MyFitnessPal (optional)
    if feedback:
        await send_feedback_to_myfitnesspal(user_id, feedback)

    return {
        "meals_synced": len(meals),
        "daily_totals": daily_totals,
        "feedback": feedback
    }
```

### Google Calendar Integration

**File:** `apps/ai-backend/app/agents/integrations/calendar_agent.py`

**Use Case:** FitOS finds optimal workout time → Creates calendar event

```python
async def schedule_workout_event(user_id: str, workout: Dict) -> Dict:
    """
    Schedule workout in user's Google Calendar.

    FitOS → Google Calendar: Create event at optimal time.
    """
    # Find optimal time based on user schedule
    from app.services.scheduling_service import find_optimal_time
    optimal_time = await find_optimal_time(user_id, workout["duration_minutes"])

    # Create A2A request to Google Calendar
    request = A2ARequest(
        sender=AgentIdentifier(
            agent_id="fitos-agent-prod",
            agent_type="fitness_coaching",
            version="1.0.0"
        ),
        recipient=AgentIdentifier(
            agent_id="google-calendar-agent",
            agent_type="scheduling",
            version="1.0"
        ),
        action="create_event",
        payload={
            "title": f"Workout: {workout['name']}",
            "start_time": optimal_time.isoformat(),
            "duration_minutes": workout["duration_minutes"],
            "description": workout.get("description"),
            "reminders": [15]  # 15 min before
        },
        auth_token=get_google_token(user_id)
    )

    response = await send_to_agent(request)

    return {
        "event_created": response.status == "success",
        "event_id": response.data.get("event_id"),
        "scheduled_time": optimal_time
    }
```

---

## Success Metrics

- ✅ A2A protocol compliance: 100%
- ✅ Integration with 3+ external agents (WHOOP, MyFitnessPal, Calendar)
- ✅ <500ms inter-agent communication latency
- ✅ 95%+ message delivery success rate
- ✅ Developer documentation complete

---

## Timeline

**Day 1-2:** Base A2A architecture and models
**Day 3:** Capability registry and discovery
**Day 4:** Communication service
**Day 5:** Integration examples
**Day 6-7:** Testing and documentation

---

## Strategic Value

1. **Future-Proofing**: Early adoption of industry standard
2. **Ecosystem Partnerships**: Easy integration for partners
3. **Open Platform**: Positions FitOS as interoperable, not walled garden
4. **Network Effects**: More integrations = more value
5. **Enterprise Appeal**: Interoperability is key for enterprise sales

---

**Last Updated:** 2026-01-21
**Status:** 📋 Planning Complete - Ready for Implementation
