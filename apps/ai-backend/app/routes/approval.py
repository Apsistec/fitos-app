"""
API routes for human-in-the-loop approval workflow

Endpoints:
- GET /approvals - List pending approvals for trainer
- GET /approvals/{id} - Get specific approval request
- POST /approvals/{id}/respond - Approve or reject
- GET /approvals/stats - Approval statistics

Sprint 30: LangGraph 1.0 Multi-Agent
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List
from datetime import datetime

from app.agents.approval import (
    ApprovalRequest,
    ApprovalResponse,
    process_approval_response,
    pending_approvals,
)


router = APIRouter(prefix="/approvals", tags=["approvals"])


# Mock auth dependency (replace with real JWT validation)
async def get_current_trainer_id(token: str = Query(...)) -> str:
    """Get trainer ID from auth token"""
    # TODO: Implement real JWT validation
    return "trainer_123"


@router.get("/", response_model=List[ApprovalRequest])
async def list_pending_approvals(
    trainer_id: str = Depends(get_current_trainer_id),
    status: str | None = None,
    limit: int = 50,
):
    """
    List approval requests for authenticated trainer.

    Args:
        trainer_id: Authenticated trainer ID
        status: Optional filter by status (pending, approved, rejected, expired)
        limit: Maximum results to return

    Returns:
        List of approval requests
    """
    # Filter by trainer
    trainer_approvals = [
        req for req in pending_approvals.values()
        if req.trainer_id == trainer_id
    ]

    # Filter by status if provided
    if status:
        trainer_approvals = [
            req for req in trainer_approvals
            if req.status == status
        ]

    # Sort by created_at (newest first)
    trainer_approvals.sort(key=lambda x: x.created_at, reverse=True)

    return trainer_approvals[:limit]


@router.get("/{request_id}", response_model=ApprovalRequest)
async def get_approval_request(
    request_id: str,
    trainer_id: str = Depends(get_current_trainer_id),
):
    """
    Get specific approval request details.

    Args:
        request_id: Approval request ID
        trainer_id: Authenticated trainer ID

    Returns:
        Approval request details
    """
    request = pending_approvals.get(request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")

    # Verify trainer is authorized
    if request.trainer_id != trainer_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return request


@router.post("/{request_id}/respond", response_model=ApprovalRequest)
async def respond_to_approval(
    request_id: str,
    response: ApprovalResponse,
    trainer_id: str = Depends(get_current_trainer_id),
):
    """
    Approve or reject an approval request.

    Args:
        request_id: Approval request ID
        response: Trainer's decision (approve/reject + optional notes/modifications)
        trainer_id: Authenticated trainer ID

    Returns:
        Updated approval request
    """
    try:
        updated_request = await process_approval_response(
            request_id,
            response,
            trainer_id,
        )

        return updated_request

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/stats/summary")
async def get_approval_stats(
    trainer_id: str = Depends(get_current_trainer_id),
):
    """
    Get approval statistics for trainer.

    Args:
        trainer_id: Authenticated trainer ID

    Returns:
        Approval statistics
    """
    # Filter by trainer
    trainer_approvals = [
        req for req in pending_approvals.values()
        if req.trainer_id == trainer_id
    ]

    # Calculate stats
    total = len(trainer_approvals)
    pending = sum(1 for req in trainer_approvals if req.status == "pending")
    approved = sum(1 for req in trainer_approvals if req.status == "approved")
    rejected = sum(1 for req in trainer_approvals if req.status == "rejected")
    expired = sum(1 for req in trainer_approvals if req.status == "expired")

    # Average response time for decided requests
    decided = [req for req in trainer_approvals if req.decided_at]
    if decided:
        response_times = [
            (req.decided_at - req.created_at).total_seconds() / 3600  # hours
            for req in decided
        ]
        avg_response_hours = sum(response_times) / len(response_times)
    else:
        avg_response_hours = None

    # Breakdown by agent type
    by_agent = {}
    for req in trainer_approvals:
        agent = req.agent_type
        if agent not in by_agent:
            by_agent[agent] = {"total": 0, "pending": 0, "approved": 0, "rejected": 0}

        by_agent[agent]["total"] += 1
        if req.status == "pending":
            by_agent[agent]["pending"] += 1
        elif req.status == "approved":
            by_agent[agent]["approved"] += 1
        elif req.status == "rejected":
            by_agent[agent]["rejected"] += 1

    return {
        "total_requests": total,
        "pending": pending,
        "approved": approved,
        "rejected": rejected,
        "expired": expired,
        "avg_response_hours": round(avg_response_hours, 1) if avg_response_hours else None,
        "by_agent_type": by_agent,
        "oldest_pending": min(
            [req.created_at for req in trainer_approvals if req.status == "pending"],
            default=None,
        ),
    }


@router.delete("/{request_id}")
async def delete_approval_request(
    request_id: str,
    trainer_id: str = Depends(get_current_trainer_id),
):
    """
    Delete/archive an approval request.

    Args:
        request_id: Approval request ID
        trainer_id: Authenticated trainer ID

    Returns:
        Success message
    """
    request = pending_approvals.get(request_id)

    if not request:
        raise HTTPException(status_code=404, detail="Approval request not found")

    # Verify trainer is authorized
    if request.trainer_id != trainer_id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Delete from memory (in production, soft-delete in DB)
    del pending_approvals[request_id]

    return {"message": "Approval request deleted", "id": request_id}
