"""
Support Ticket API Endpoint

Handles submission of user support requests from the mobile app.
Stores tickets in Supabase and sends email notifications.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field, validator
from typing import Optional, Literal
from datetime import datetime
import logging
from uuid import UUID, uuid4

# TODO: Import actual Supabase client when available
# from app.core.database import get_supabase_client
# from app.core.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/support", tags=["support"])


# Pydantic Models
class DeviceInfo(BaseModel):
    """Device information for debugging purposes"""
    app_version: str = Field(..., description="App version number")
    platform: Literal["ios", "android", "web"] = Field(..., description="Platform type")
    os_version: str = Field(..., description="Operating system version")
    device_model: str = Field(..., description="Device model name")


class SupportTicketRequest(BaseModel):
    """Support ticket submission request"""
    category: Literal["bug", "feature_request", "billing", "other"] = Field(
        ..., description="Ticket category"
    )
    subject: str = Field(..., min_length=5, max_length=200, description="Ticket subject")
    description: str = Field(
        ..., min_length=20, max_length=2000, description="Detailed description"
    )
    device_info: DeviceInfo = Field(..., description="Device information")
    screenshot_url: Optional[str] = Field(None, description="Optional screenshot data URL")

    @validator("subject")
    def validate_subject(cls, v):
        """Ensure subject is not just whitespace"""
        if not v.strip():
            raise ValueError("Subject cannot be empty")
        return v.strip()

    @validator("description")
    def validate_description(cls, v):
        """Ensure description is not just whitespace"""
        if not v.strip():
            raise ValueError("Description cannot be empty")
        return v.strip()


class SupportTicketResponse(BaseModel):
    """Support ticket submission response"""
    success: bool
    ticket_id: str
    message: str


# API Endpoints
@router.post("/ticket", response_model=SupportTicketResponse)
async def create_support_ticket(
    ticket: SupportTicketRequest,
    # user_id: UUID = Depends(get_current_user)  # TODO: Uncomment when auth is ready
):
    """
    Create a new support ticket.

    This endpoint:
    1. Validates the ticket data
    2. Stores the ticket in the database
    3. Sends an email notification to support@fitos.app
    4. Returns the ticket ID

    Args:
        ticket: Support ticket data
        user_id: ID of the authenticated user (from auth token)

    Returns:
        SupportTicketResponse with ticket ID and confirmation message

    Raises:
        HTTPException: If ticket creation fails
    """
    try:
        # TODO: Replace with actual user_id from authentication
        user_id = uuid4()  # Placeholder

        # Generate ticket ID
        ticket_id = str(uuid4())

        # TODO: Store ticket in Supabase
        # ticket_data = {
        #     "id": ticket_id,
        #     "user_id": str(user_id),
        #     "category": ticket.category,
        #     "subject": ticket.subject,
        #     "description": ticket.description,
        #     "device_info": ticket.device_info.dict(),
        #     "screenshot_url": ticket.screenshot_url,
        #     "status": "open",
        #     "created_at": datetime.utcnow().isoformat(),
        # }
        #
        # supabase = get_supabase_client()
        # result = supabase.table("support_tickets").insert(ticket_data).execute()

        # TODO: Send email notification
        # await send_support_ticket_email(ticket_data)

        logger.info(
            f"Support ticket created: {ticket_id} | Category: {ticket.category} | User: {user_id}"
        )

        return SupportTicketResponse(
            success=True,
            ticket_id=ticket_id,
            message="Support ticket created successfully. We'll respond within 24 hours.",
        )

    except Exception as e:
        logger.error(f"Failed to create support ticket: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Failed to create support ticket. Please try again or email support@fitos.app.",
        )


@router.get("/ticket/{ticket_id}")
async def get_support_ticket(
    ticket_id: str,
    # user_id: UUID = Depends(get_current_user)  # TODO: Uncomment when auth is ready
):
    """
    Get a specific support ticket by ID.

    Args:
        ticket_id: UUID of the ticket
        user_id: ID of the authenticated user (must own the ticket)

    Returns:
        Support ticket data

    Raises:
        HTTPException: If ticket not found or user doesn't have access
    """
    try:
        # TODO: Fetch from Supabase
        # supabase = get_supabase_client()
        # result = supabase.table("support_tickets").select("*").eq("id", ticket_id).eq("user_id", str(user_id)).execute()
        #
        # if not result.data:
        #     raise HTTPException(status_code=404, detail="Support ticket not found")
        #
        # return result.data[0]

        # Placeholder response
        return {
            "id": ticket_id,
            "status": "open",
            "category": "bug",
            "subject": "Placeholder ticket",
            "created_at": datetime.utcnow().isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch support ticket {ticket_id}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch support ticket")


@router.get("/tickets")
async def list_user_support_tickets(
    status: Optional[Literal["open", "in_progress", "resolved", "closed"]] = None,
    limit: int = 20,
    offset: int = 0,
    # user_id: UUID = Depends(get_current_user)  # TODO: Uncomment when auth is ready
):
    """
    List all support tickets for the authenticated user.

    Args:
        status: Optional filter by ticket status
        limit: Maximum number of tickets to return
        offset: Number of tickets to skip
        user_id: ID of the authenticated user

    Returns:
        List of support tickets
    """
    try:
        # TODO: Fetch from Supabase with filters
        # supabase = get_supabase_client()
        # query = supabase.table("support_tickets").select("*").eq("user_id", str(user_id))
        #
        # if status:
        #     query = query.eq("status", status)
        #
        # result = query.order("created_at", desc=True).range(offset, offset + limit - 1).execute()
        #
        # return {
        #     "tickets": result.data,
        #     "total": len(result.data),
        #     "limit": limit,
        #     "offset": offset,
        # }

        # Placeholder response
        return {
            "tickets": [],
            "total": 0,
            "limit": limit,
            "offset": offset,
        }

    except Exception as e:
        logger.error(f"Failed to list support tickets: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to list support tickets")


# TODO: Email notification function
# async def send_support_ticket_email(ticket_data: dict):
#     """
#     Send email notification to support team about new ticket.
#
#     Args:
#         ticket_data: Support ticket information
#     """
#     from app.core.email import send_email
#
#     email_body = f"""
#     New Support Ticket: {ticket_data['subject']}
#
#     Ticket ID: {ticket_data['id']}
#     User ID: {ticket_data['user_id']}
#     Category: {ticket_data['category']}
#
#     Description:
#     {ticket_data['description']}
#
#     Device Information:
#     - App Version: {ticket_data['device_info']['app_version']}
#     - Platform: {ticket_data['device_info']['platform']}
#     - OS Version: {ticket_data['device_info']['os_version']}
#     - Device: {ticket_data['device_info']['device_model']}
#
#     {f"Screenshot: {ticket_data['screenshot_url']}" if ticket_data.get('screenshot_url') else "No screenshot attached"}
#
#     Created: {ticket_data['created_at']}
#     """
#
#     await send_email(
#         to="support@fitos.app",
#         subject=f"[FitOS Support] {ticket_data['category'].upper()}: {ticket_data['subject']}",
#         body=email_body,
#     )
