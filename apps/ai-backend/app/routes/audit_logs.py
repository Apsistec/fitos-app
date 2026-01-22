"""
HIPAA-Compliant Audit Logging API Routes

Endpoints for logging and querying audit logs for HIPAA compliance.
All PHI access must be logged for compliance with HIPAA Security Rule.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from decimal import Decimal

from app.core.auth import get_current_user, require_role
from app.core.database import get_supabase_client

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreateAuditLogRequest(BaseModel):
    """Request to create an audit log entry"""
    # Actor (user_id auto-populated from JWT)
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Action
    action: str = Field(..., regex="^(read|create|update|delete|export|print|share)$")
    resource_type: str
    resource_id: str

    # PHI classification
    contains_phi: bool
    phi_categories: Optional[List[str]] = None

    # Context
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    api_endpoint: Optional[str] = None
    http_method: Optional[str] = None
    http_status_code: Optional[int] = None

    # Data changes
    before_data: Optional[dict] = None
    after_data: Optional[dict] = None

    # Security
    access_reason: Optional[str] = Field(None, regex="^(treatment|payment|operations|research|emergency|other)$")
    authorization_level: Optional[str] = None


class AuditLogQuery(BaseModel):
    """Query parameters for audit logs"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[str] = None
    resource_type: Optional[str] = None
    action: Optional[str] = None
    contains_phi: Optional[bool] = None
    limit: int = Field(default=100, le=1000)
    offset: int = Field(default=0, ge=0)


class AuditLogResponse(BaseModel):
    """Audit log entry response"""
    id: str
    timestamp: datetime
    user_id: Optional[str]
    user_email: str
    user_role: str
    action: str
    resource_type: str
    resource_id: str
    contains_phi: bool
    phi_categories: Optional[List[str]]
    access_reason: Optional[str]


class PhiAccessSummaryResponse(BaseModel):
    """PHI access summary response"""
    access_date: str
    user_id: str
    user_email: str
    user_role: str
    action: str
    resource_type: str
    access_count: int
    phi_categories_accessed: List[List[str]]


class SuspiciousActivityResponse(BaseModel):
    """Suspicious activity response"""
    user_id: str
    user_email: str
    user_role: str
    access_date: str
    access_count: int
    unique_records_accessed: int
    resource_types_accessed: int
    actions_performed: List[str]
    risk_level: str


# =============================================================================
# AUDIT LOG ENDPOINTS
# =============================================================================

@router.post("/log", status_code=201)
async def create_audit_log(
    request: CreateAuditLogRequest,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Create an audit log entry.

    Logs all access to Protected Health Information (PHI) for HIPAA compliance.
    User context is automatically populated from JWT.
    """
    data = {
        'user_id': current_user['id'],
        'ip_address': request.ip_address,
        'user_agent': request.user_agent,
        'action': request.action,
        'resource_type': request.resource_type,
        'resource_id': request.resource_id,
        'contains_phi': request.contains_phi,
        'phi_categories': request.phi_categories,
        'session_id': request.session_id,
        'request_id': request.request_id,
        'api_endpoint': request.api_endpoint,
        'http_method': request.http_method,
        'http_status_code': request.http_status_code,
        'before_data': request.before_data,
        'after_data': request.after_data,
        'access_reason': request.access_reason,
        'authorization_level': request.authorization_level,
    }

    result = supabase.table('audit_logs').insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create audit log")

    return {"message": "Audit log created", "id": result.data[0]['id']}


@router.post("/query")
async def query_audit_logs(
    query: AuditLogQuery,
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Query audit logs.

    Requires: Admin or Compliance Officer role

    Allows filtering by date range, user, resource type, action, and PHI status.
    """
    # Build query
    db_query = supabase.table('audit_logs').select('*')

    if query.start_date:
        db_query = db_query.gte('timestamp', query.start_date.isoformat())

    if query.end_date:
        db_query = db_query.lte('timestamp', query.end_date.isoformat())

    if query.user_id:
        db_query = db_query.eq('user_id', query.user_id)

    if query.resource_type:
        db_query = db_query.eq('resource_type', query.resource_type)

    if query.action:
        db_query = db_query.eq('action', query.action)

    if query.contains_phi is not None:
        db_query = db_query.eq('contains_phi', query.contains_phi)

    # Apply pagination
    db_query = db_query.order('timestamp', desc=True).limit(query.limit).offset(query.offset)

    result = db_query.execute()
    return result.data


@router.get("/phi-summary")
async def get_phi_access_summary(
    user_id: str,
    start_date: datetime,
    end_date: datetime,
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Get PHI access summary for a user.

    Requires: Admin or Compliance Officer role

    Returns daily summary of PHI access grouped by action and resource type.
    """
    result = supabase.rpc('get_user_audit_summary', {
        'p_user_id': user_id,
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat()
    }).execute()

    return result.data


@router.get("/suspicious-activity")
async def get_suspicious_activity(
    days_back: int = 7,
    threshold_per_day: int = 100,
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Detect suspicious PHI access patterns.

    Requires: Admin or Compliance Officer role

    Returns users with unusual access patterns:
    - More than threshold_per_day PHI access per day
    - More than 50 unique records accessed in a day
    """
    result = supabase.rpc('detect_suspicious_activity', {
        'p_threshold_per_day': threshold_per_day,
        'p_days_back': days_back
    }).execute()

    return result.data


@router.get("/after-hours")
async def get_after_hours_access(
    start_date: datetime,
    end_date: datetime,
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Get PHI access outside normal business hours.

    Requires: Admin or Compliance Officer role

    Returns PHI access:
    - Before 6 AM or after 10 PM
    - On weekends (Saturday/Sunday)
    """
    result = (supabase.from_('after_hours_phi_access')
              .select('*')
              .gte('timestamp', start_date.isoformat())
              .lte('timestamp', end_date.isoformat())
              .execute())

    return result.data


@router.post("/export")
async def export_audit_logs(
    start_date: datetime = Body(...),
    end_date: datetime = Body(...),
    contains_phi: Optional[bool] = Body(None),
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Export audit logs for compliance audit.

    Requires: Admin or Compliance Officer role

    Returns audit logs in CSV format for the specified date range.
    """
    result = supabase.rpc('export_audit_logs', {
        'p_start_date': start_date.isoformat(),
        'p_end_date': end_date.isoformat(),
        'p_contains_phi': contains_phi
    }).execute()

    if not result.data:
        return {"message": "No audit logs found for the specified criteria"}

    # Convert to CSV format
    import csv
    import io

    output = io.StringIO()
    if result.data and len(result.data) > 0:
        writer = csv.DictWriter(output, fieldnames=result.data[0].keys())
        writer.writeheader()
        writer.writerows(result.data)

    csv_content = output.getvalue()

    # Return as downloadable file
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        iter([csv_content]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=audit_logs_{start_date.date()}_{end_date.date()}.csv"
        }
    )


@router.get("/my-activity")
async def get_my_audit_activity(
    days_back: int = 30,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get the current user's audit activity.

    Users can view their own audit logs (transparency).
    """
    start_date = datetime.now() - timedelta(days=days_back)

    result = supabase.rpc('get_user_audit_summary', {
        'p_user_id': current_user['id'],
        'p_start_date': start_date.isoformat(),
        'p_end_date': datetime.now().isoformat()
    }).execute()

    return result.data


# =============================================================================
# CONSENT MANAGEMENT ENDPOINTS
# =============================================================================

class CreateConsentRequest(BaseModel):
    """Request to create a consent"""
    client_id: str
    consent_type: str = Field(..., regex="^(hipaa_notice|treatment|research|marketing|photo_sharing|data_sharing|telehealth)$")
    consent_granted: bool
    consent_version: str
    consent_text: str
    consent_url: Optional[str] = None
    signature_method: str = Field(..., regex="^(electronic|verbal|written|click_through)$")
    signature_data: Optional[str] = None
    consent_expires_at: Optional[datetime] = None


@router.post("/consents", status_code=201)
async def create_consent(
    request: CreateConsentRequest,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Create a client consent record.

    Clients can create their own consents.
    Admins/Compliance Officers can create consents for any client.
    """
    # Verify authorization
    if current_user['id'] != request.client_id:
        if current_user.get('role') not in ['admin', 'compliance_officer']:
            raise HTTPException(status_code=403, detail="Not authorized to create consent for this client")

    data = {
        'client_id': request.client_id,
        'consent_type': request.consent_type,
        'consent_granted': request.consent_granted,
        'consent_version': request.consent_version,
        'consent_text': request.consent_text,
        'consent_url': request.consent_url,
        'signature_method': request.signature_method,
        'signature_data': request.signature_data,
        'consent_expires_at': request.consent_expires_at.isoformat() if request.consent_expires_at else None,
    }

    result = supabase.table('client_consents').insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create consent")

    return result.data[0]


@router.get("/consents/{client_id}")
async def get_client_consents(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get all consents for a client.

    Clients can view their own consents.
    Trainers/Admins can view consents for their clients.
    """
    # Check authorization
    if current_user['id'] != client_id:
        if current_user.get('role') not in ['admin', 'compliance_officer', 'trainer']:
            raise HTTPException(status_code=403, detail="Not authorized to view this client's consents")

    result = supabase.rpc('get_active_consents', {'p_client_id': client_id}).execute()
    return result.data


@router.post("/consents/revoke")
async def revoke_consent(
    client_id: str = Body(...),
    consent_type: str = Body(...),
    reason: str = Body(...),
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Revoke a client consent.

    Clients can revoke their own consents.
    """
    # Check authorization
    if current_user['id'] != client_id:
        raise HTTPException(status_code=403, detail="Not authorized to revoke this consent")

    result = supabase.rpc('revoke_consent', {
        'p_client_id': client_id,
        'p_consent_type': consent_type,
        'p_reason': reason
    }).execute()

    if not result.data:
        raise HTTPException(status_code=404, detail="Consent not found or already revoked")

    return {"message": "Consent revoked successfully"}


@router.get("/consents/expiring")
async def get_expiring_consents(
    days_threshold: int = 30,
    current_user: dict = Depends(require_role(['admin', 'compliance_officer'])),
    supabase = Depends(get_supabase_client)
):
    """
    Get consents expiring within threshold days.

    Requires: Admin or Compliance Officer role

    Used for sending renewal notifications to clients.
    """
    result = supabase.rpc('get_expiring_consents', {
        'p_days_threshold': days_threshold
    }).execute()

    return result.data
