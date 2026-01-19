"""
Human-in-the-Loop Approval Workflow

Handles interrupts for sensitive actions requiring trainer approval:
- Significant program changes
- Injury/pain-related modifications
- Nutritional changes for medical conditions
- High-risk exercise recommendations

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from typing import Literal
from datetime import datetime, timedelta
from pydantic import BaseModel, Field


class ApprovalRequest(BaseModel):
    """Request for human approval of AI action"""

    id: str
    user_id: str
    trainer_id: str
    agent_type: Literal["workout", "nutrition", "recovery", "motivation"]
    action_type: str
    action_description: str
    reason_for_approval: str
    ai_recommendation: dict
    user_context: dict
    created_at: datetime = Field(default_factory=datetime.now)
    expires_at: datetime = Field(default_factory=lambda: datetime.now() + timedelta(hours=24))
    status: Literal["pending", "approved", "rejected", "expired"] = "pending"
    trainer_notes: str | None = None
    decided_at: datetime | None = None


class ApprovalResponse(BaseModel):
    """Trainer's response to approval request"""

    approved: bool
    trainer_notes: str | None = None
    modifications: dict | None = None  # Modified recommendations if approved with changes


# Approval triggers based on action type
APPROVAL_TRIGGERS = {
    "program_modification": {
        "severity": "medium",
        "reason": "Significant changes to training program require trainer review",
        "auto_approve_after_hours": 24,
    },
    "injury_accommodation": {
        "severity": "high",
        "reason": "Injury-related modifications require medical/trainer expertise",
        "auto_approve_after_hours": None,  # Never auto-approve
    },
    "nutrition_medical": {
        "severity": "high",
        "reason": "Nutritional changes for medical conditions require professional oversight",
        "auto_approve_after_hours": None,
    },
    "high_risk_exercise": {
        "severity": "medium",
        "reason": "Complex or high-risk exercises benefit from form verification",
        "auto_approve_after_hours": 12,
    },
    "recovery_concern": {
        "severity": "high",
        "reason": "Recovery issues may indicate overtraining or health concerns",
        "auto_approve_after_hours": 12,
    },
}


def requires_approval(
    action_type: str,
    confidence: float,
    user_context: dict
) -> tuple[bool, str | None]:
    """
    Determine if action requires human approval.

    Args:
        action_type: Type of action being taken
        confidence: AI confidence in recommendation (0-1)
        user_context: User's training/health context

    Returns:
        Tuple of (requires_approval, reason)
    """
    # High-severity actions always require approval
    if action_type in ["injury_accommodation", "nutrition_medical"]:
        trigger = APPROVAL_TRIGGERS[action_type]
        return True, trigger["reason"]

    # Low confidence requires approval
    if confidence < 0.6:
        return True, "AI confidence below threshold - trainer review recommended"

    # Beginner users get more oversight
    experience = user_context.get("experience_level", "").lower()
    if experience == "beginner" and action_type in ["program_modification", "high_risk_exercise"]:
        return True, "New user - trainer approval for safety"

    # Medium-severity actions may require approval
    if action_type in APPROVAL_TRIGGERS:
        # Could add more logic here (e.g., time-based, user preferences)
        return False, None

    return False, None


def create_approval_notification(request: ApprovalRequest) -> dict:
    """
    Create notification payload for trainer.

    This gets sent via Supabase realtime or push notification.
    """
    severity = APPROVAL_TRIGGERS.get(request.action_type, {}).get("severity", "medium")

    return {
        "type": "approval_request",
        "severity": severity,
        "title": f"{request.agent_type.title()} Agent Needs Approval",
        "message": request.action_description,
        "reason": request.reason_for_approval,
        "client_id": request.user_id,
        "request_id": request.id,
        "expires_at": request.expires_at.isoformat(),
        "action_url": f"/approvals/{request.id}",
        "ai_recommendation": request.ai_recommendation,
    }


# In-memory storage for demo (replace with Supabase in production)
pending_approvals: dict[str, ApprovalRequest] = {}


async def request_approval(
    user_id: str,
    trainer_id: str,
    agent_type: str,
    action_type: str,
    action_description: str,
    ai_recommendation: dict,
    user_context: dict,
) -> ApprovalRequest:
    """
    Create approval request and notify trainer.

    Args:
        user_id: Client user ID
        trainer_id: Trainer user ID
        agent_type: Which agent is requesting approval
        action_type: Type of action (from APPROVAL_TRIGGERS)
        action_description: Human-readable description
        ai_recommendation: The AI's recommendation payload
        user_context: User context for trainer reference

    Returns:
        ApprovalRequest object
    """
    import uuid

    # Check if approval is actually needed
    needs_approval, reason = requires_approval(
        action_type,
        ai_recommendation.get("confidence", 1.0),
        user_context
    )

    if not needs_approval:
        # Auto-approve
        request = ApprovalRequest(
            id=str(uuid.uuid4()),
            user_id=user_id,
            trainer_id=trainer_id,
            agent_type=agent_type,
            action_type=action_type,
            action_description=action_description,
            reason_for_approval="Auto-approved - high confidence",
            ai_recommendation=ai_recommendation,
            user_context=user_context,
            status="approved",
            decided_at=datetime.now(),
        )
        return request

    # Create approval request
    request = ApprovalRequest(
        id=str(uuid.uuid4()),
        user_id=user_id,
        trainer_id=trainer_id,
        agent_type=agent_type,
        action_type=action_type,
        action_description=action_description,
        reason_for_approval=reason or APPROVAL_TRIGGERS.get(action_type, {}).get("reason", "Requires review"),
        ai_recommendation=ai_recommendation,
        user_context=user_context,
    )

    # Store request (in production, save to Supabase)
    pending_approvals[request.id] = request

    # Send notification to trainer
    notification = create_approval_notification(request)
    # TODO: Send via Supabase Functions or push notification
    # await supabase.functions.invoke('send-trainer-notification', notification)
    print(f"📬 Approval notification sent to trainer {trainer_id}: {notification}")

    return request


async def process_approval_response(
    request_id: str,
    response: ApprovalResponse,
    trainer_id: str,
) -> ApprovalRequest:
    """
    Process trainer's approval/rejection response.

    Args:
        request_id: ID of approval request
        response: Trainer's decision
        trainer_id: Trainer making the decision

    Returns:
        Updated ApprovalRequest
    """
    request = pending_approvals.get(request_id)
    if not request:
        raise ValueError(f"Approval request {request_id} not found")

    # Verify trainer is authorized
    if request.trainer_id != trainer_id:
        raise ValueError("Unauthorized: Only assigned trainer can approve/reject")

    # Check if expired
    if datetime.now() > request.expires_at:
        request.status = "expired"
        raise ValueError("Approval request has expired")

    # Update request
    request.status = "approved" if response.approved else "rejected"
    request.trainer_notes = response.trainer_notes
    request.decided_at = datetime.now()

    # Apply modifications if provided
    if response.modifications:
        request.ai_recommendation.update(response.modifications)

    # TODO: Save to Supabase, trigger agent to continue
    # await continue_agent_execution(request)

    return request


async def check_expired_approvals():
    """
    Background task to check for expired approvals and auto-approve if configured.

    Should be run as cron job or periodic task.
    """
    now = datetime.now()

    for request_id, request in list(pending_approvals.items()):
        if request.status != "pending":
            continue

        if now > request.expires_at:
            trigger = APPROVAL_TRIGGERS.get(request.action_type, {})
            auto_approve_hours = trigger.get("auto_approve_after_hours")

            if auto_approve_hours is not None:
                # Auto-approve after timeout
                request.status = "approved"
                request.trainer_notes = f"Auto-approved after {auto_approve_hours}h timeout"
                request.decided_at = now
                print(f"✅ Auto-approved request {request_id} after timeout")
            else:
                # Mark as expired (requires manual review)
                request.status = "expired"
                print(f"⏰ Request {request_id} expired - manual review required")
