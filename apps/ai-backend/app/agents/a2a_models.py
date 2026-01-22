"""
A2A (Agent-to-Agent) Protocol Data Models

Implements the Agent-to-Agent Communication Protocol for AI interoperability.
Based on Linux Foundation A2A standard for cross-platform agent communication.

Reference: https://github.com/a2a-protocol/a2a-spec
"""

from typing import Any, Dict, List, Literal, Optional
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl
from uuid import UUID, uuid4


# =============================================================================
# A2A MESSAGE TYPES
# =============================================================================

class A2AMessage(BaseModel):
    """Base A2A protocol message"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    version: str = "1.0"
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    sender: str  # Agent identifier
    receiver: str  # Target agent identifier
    message_type: Literal[
        "capability_request",
        "capability_response",
        "action_request",
        "action_response",
        "event_notification",
        "error"
    ]
    payload: Dict[str, Any]
    metadata: Optional[Dict[str, Any]] = None


class A2ACapability(BaseModel):
    """Agent capability definition"""
    name: str
    description: str
    version: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    authentication_required: bool = True
    rate_limit: Optional[int] = None  # Requests per hour


class A2ACapabilityRequest(BaseModel):
    """Request for agent capabilities"""
    agent_id: str
    include_schemas: bool = True


class A2ACapabilityResponse(BaseModel):
    """Response with agent capabilities"""
    agent_id: str
    agent_name: str
    agent_version: str
    capabilities: List[A2ACapability]
    supported_protocols: List[str] = ["http", "websocket"]
    authentication_methods: List[str] = ["oauth2", "api_key"]


class A2AActionRequest(BaseModel):
    """Request for agent to perform an action"""
    capability_name: str
    parameters: Dict[str, Any]
    callback_url: Optional[HttpUrl] = None
    timeout_seconds: int = 30
    idempotency_key: Optional[str] = None


class A2AActionResponse(BaseModel):
    """Response from action execution"""
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    execution_time_ms: int


class A2AEventNotification(BaseModel):
    """Event notification to other agents"""
    event_type: str
    event_data: Dict[str, Any]
    subscribers: List[str]  # Agent IDs to notify


class A2AError(BaseModel):
    """Error response"""
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


# =============================================================================
# FITOS-SPECIFIC A2A MODELS
# =============================================================================

class FitOSRecoveryData(BaseModel):
    """Recovery data from wearables (WHOOP, Oura, etc.)"""
    date: str
    recovery_score: float  # 0-100
    resting_hr: Optional[int] = None
    hrv_ms: Optional[int] = None
    sleep_hours: Optional[float] = None
    sleep_quality: Optional[float] = None  # 0-100
    strain_score: Optional[float] = None  # 0-21 for WHOOP
    source: str  # "whoop", "oura", "fitbit", etc.


class FitOSNutritionEntry(BaseModel):
    """Nutrition data from tracking apps"""
    timestamp: datetime
    meal_type: Optional[Literal["breakfast", "lunch", "dinner", "snack"]] = None
    foods: List[Dict[str, Any]]  # List of food items with macros
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    source: str  # "myfitnesspal", "macrofactor", "cronometer", etc.


class FitOSCalendarEvent(BaseModel):
    """Calendar event for scheduling"""
    event_id: str
    title: str
    start_time: datetime
    end_time: datetime
    description: Optional[str] = None
    location: Optional[str] = None
    attendees: List[str] = []
    recurrence: Optional[str] = None  # "daily", "weekly", etc.
    source: str  # "google_calendar", "outlook", etc.


class FitOSHealthRecord(BaseModel):
    """Health record from EHR systems"""
    record_id: str
    record_type: Literal["vital_signs", "lab_results", "diagnosis", "medication", "allergy"]
    date: datetime
    data: Dict[str, Any]
    provider: str
    source: str  # "epic", "cerner", "fhir_api", etc.


# =============================================================================
# A2A AGENT REGISTRY
# =============================================================================

class A2AAgentInfo(BaseModel):
    """Agent registration information"""
    agent_id: str
    agent_name: str
    agent_type: Literal["fitness_platform", "wearable", "nutrition_tracker", "calendar", "ehr", "other"]
    base_url: HttpUrl
    version: str
    status: Literal["active", "inactive", "degraded"] = "active"
    capabilities: List[str]  # Capability names
    authentication_config: Dict[str, Any]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class A2AIntegrationConfig(BaseModel):
    """Configuration for A2A integration"""
    integration_id: str
    user_id: str  # FitOS user ID
    agent_id: str  # External agent ID
    enabled: bool = True
    sync_frequency_hours: int = 24
    data_types: List[str]  # What data to sync
    authentication_token: Optional[str] = None
    authentication_expires_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    sync_errors: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)


# =============================================================================
# A2A COMMUNICATION TYPES
# =============================================================================

class A2ASyncRequest(BaseModel):
    """Request to sync data from external agent"""
    user_id: str
    agent_id: str
    data_types: List[str]
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class A2ASyncResponse(BaseModel):
    """Response with synced data"""
    user_id: str
    agent_id: str
    data_type: str
    records_synced: int
    data: List[Dict[str, Any]]
    next_cursor: Optional[str] = None  # For pagination
    sync_timestamp: datetime = Field(default_factory=datetime.utcnow)


class A2AWebhookEvent(BaseModel):
    """Webhook event from external agent"""
    event_id: str
    agent_id: str
    event_type: str
    user_id: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)
