"""
Outcome-Based Pricing API Routes

Endpoints for managing outcome-based pricing tiers, goals, and verifications.
"""

from fastapi import APIRouter, HTTPException, Depends, Body
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date
from decimal import Decimal

from app.core.auth import get_current_user, require_trainer
from app.core.database import get_supabase_client
from app.outcome_verification import OutcomeVerifier

router = APIRouter(prefix="/outcome-pricing", tags=["outcome-pricing"])


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class CreatePricingTierRequest(BaseModel):
    """Request to create an outcome-based pricing tier"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    base_price_cents: int = Field(..., ge=0)
    outcome_bonus_cents: Optional[int] = Field(None, ge=0)
    verification_method: str = Field(..., regex="^(weight_loss|strength_gain|body_comp|consistency|custom)$")
    tier_config: Optional[dict] = None


class CreateClientGoalRequest(BaseModel):
    """Request to create a client goal"""
    client_id: str
    pricing_tier_id: Optional[str] = None
    goal_type: str = Field(..., regex="^(weight_loss|strength_gain|body_comp|consistency|custom)$")
    target_value: Decimal
    start_value: Decimal
    unit: str
    target_date: date
    verification_frequency: str = Field(default="weekly", regex="^(daily|weekly|biweekly|monthly)$")
    notes: Optional[str] = None
    metadata: Optional[dict] = None


class VerifyGoalRequest(BaseModel):
    """Request to verify goal progress"""
    manual_value: Optional[Decimal] = None
    photo_urls: Optional[List[str]] = None


class GoalProgressResponse(BaseModel):
    """Response with goal progress details"""
    goal_id: str
    goal_type: str
    start_value: Decimal
    current_value: Decimal
    target_value: Decimal
    progress_percent: Decimal
    milestones_achieved: List[int]
    next_milestone: Optional[int]
    last_verified_at: Optional[datetime]
    status: str


class VerificationResponse(BaseModel):
    """Response after verification"""
    verification_id: str
    goal_id: str
    measured_value: Decimal
    unit: str
    confidence_score: Decimal
    verification_method: str
    requires_manual_review: bool
    anomaly_detected: bool
    verified_at: datetime


class TrainerAnalyticsResponse(BaseModel):
    """Analytics for trainer's outcome pricing"""
    total_outcome_clients: int
    active_goals: int
    achieved_goals: int
    avg_completion_rate: Decimal
    total_bonus_revenue_cents: int
    pending_verifications: int


# =============================================================================
# PRICING TIER ENDPOINTS
# =============================================================================

@router.post("/tiers", status_code=201)
async def create_pricing_tier(
    request: CreatePricingTierRequest,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    Create a new outcome-based pricing tier.

    Requires: Trainer role
    """
    data = {
        'trainer_id': current_user['id'],
        'name': request.name,
        'description': request.description,
        'base_price_cents': request.base_price_cents,
        'outcome_bonus_cents': request.outcome_bonus_cents,
        'verification_method': request.verification_method,
        'tier_config': request.tier_config or {},
        'is_active': True
    }

    result = supabase.table('outcome_pricing_tiers').insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create pricing tier")

    return result.data[0]


@router.get("/tiers")
async def list_pricing_tiers(
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    List all pricing tiers for the current trainer.

    Requires: Trainer role
    """
    result = (supabase.table('outcome_pricing_tiers')
              .select('*')
              .eq('trainer_id', current_user['id'])
              .eq('is_active', True)
              .order('created_at', desc=True)
              .execute())

    return result.data


@router.get("/tiers/{tier_id}")
async def get_pricing_tier(
    tier_id: str,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """Get details of a specific pricing tier"""
    result = (supabase.table('outcome_pricing_tiers')
              .select('*')
              .eq('id', tier_id)
              .eq('trainer_id', current_user['id'])
              .single()
              .execute())

    if not result.data:
        raise HTTPException(status_code=404, detail="Pricing tier not found")

    return result.data


@router.put("/tiers/{tier_id}")
async def update_pricing_tier(
    tier_id: str,
    updates: dict,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """Update a pricing tier"""
    # Verify ownership
    tier = (supabase.table('outcome_pricing_tiers')
            .select('trainer_id')
            .eq('id', tier_id)
            .single()
            .execute())

    if not tier.data or tier.data['trainer_id'] != current_user['id']:
        raise HTTPException(status_code=404, detail="Pricing tier not found")

    # Update
    result = (supabase.table('outcome_pricing_tiers')
              .update(updates)
              .eq('id', tier_id)
              .execute())

    return result.data[0]


@router.delete("/tiers/{tier_id}")
async def deactivate_pricing_tier(
    tier_id: str,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """Deactivate a pricing tier (soft delete)"""
    result = (supabase.table('outcome_pricing_tiers')
              .update({'is_active': False})
              .eq('id', tier_id)
              .eq('trainer_id', current_user['id'])
              .execute())

    if not result.data:
        raise HTTPException(status_code=404, detail="Pricing tier not found")

    return {"message": "Pricing tier deactivated"}


# =============================================================================
# CLIENT GOAL ENDPOINTS
# =============================================================================

@router.post("/goals", status_code=201)
async def create_client_goal(
    request: CreateClientGoalRequest,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    Create an outcome goal for a client.

    Requires: Trainer role
    """
    # Calculate next verification due date
    next_verification = datetime.now()
    if request.verification_frequency == 'daily':
        next_verification += timedelta(days=1)
    elif request.verification_frequency == 'weekly':
        next_verification += timedelta(weeks=1)
    elif request.verification_frequency == 'biweekly':
        next_verification += timedelta(weeks=2)
    elif request.verification_frequency == 'monthly':
        next_verification += timedelta(days=30)

    data = {
        'client_id': request.client_id,
        'trainer_id': current_user['id'],
        'pricing_tier_id': request.pricing_tier_id,
        'goal_type': request.goal_type,
        'target_value': float(request.target_value),
        'start_value': float(request.start_value),
        'current_value': float(request.start_value),
        'unit': request.unit,
        'target_date': request.target_date.isoformat(),
        'verification_frequency': request.verification_frequency,
        'next_verification_due': next_verification.isoformat(),
        'notes': request.notes,
        'metadata': request.metadata or {},
        'status': 'active'
    }

    result = supabase.table('client_outcome_goals').insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create goal")

    return result.data[0]


@router.get("/goals")
async def list_client_goals(
    client_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    List goals for a client or trainer.

    Trainers can view their clients' goals.
    Clients can view their own goals.
    """
    query = supabase.table('client_outcome_goals').select('*')

    # Filter based on user role
    if current_user.get('role') == 'trainer':
        if client_id:
            query = query.eq('client_id', client_id).eq('trainer_id', current_user['id'])
        else:
            query = query.eq('trainer_id', current_user['id'])
    else:
        # Client can only see their own goals
        query = query.eq('client_id', current_user['id'])

    if status:
        query = query.eq('status', status)

    result = query.order('created_at', desc=True).execute()
    return result.data


@router.get("/goals/{goal_id}")
async def get_goal_details(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get details of a specific goal"""
    result = (supabase.table('client_outcome_goals')
              .select('*')
              .eq('id', goal_id)
              .single()
              .execute())

    if not result.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    goal = result.data

    # Verify access
    if current_user['id'] not in (goal['client_id'], goal['trainer_id']):
        raise HTTPException(status_code=403, detail="Access denied")

    return goal


@router.get("/goals/{goal_id}/progress")
async def get_goal_progress(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """Get detailed progress for a goal"""
    # Verify access
    goal = (supabase.table('client_outcome_goals')
            .select('*')
            .eq('id', goal_id)
            .single()
            .execute())

    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    if current_user['id'] not in (goal.data['client_id'], goal.data['trainer_id']):
        raise HTTPException(status_code=403, detail="Access denied")

    # Calculate progress using database function
    progress = supabase.rpc('calculate_goal_progress', {'goal_id_param': goal_id}).execute()

    # Get milestones
    milestones = (supabase.table('outcome_milestones')
                  .select('*')
                  .eq('goal_id', goal_id)
                  .order('milestone_percent')
                  .execute())

    return {
        'goal': goal.data,
        'progress_percent': progress.data,
        'milestones': milestones.data
    }


# =============================================================================
# VERIFICATION ENDPOINTS
# =============================================================================

@router.post("/goals/{goal_id}/verify")
async def verify_goal_progress(
    goal_id: str,
    request: VerifyGoalRequest,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Verify progress for a goal.

    Can be called by trainer or client.
    Uses automated verification when possible.
    """
    # Verify access
    goal = (supabase.table('client_outcome_goals')
            .select('*')
            .eq('id', goal_id)
            .single()
            .execute())

    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    if current_user['id'] not in (goal.data['client_id'], goal.data['trainer_id']):
        raise HTTPException(status_code=403, detail="Access denied")

    # Run verification
    verifier = OutcomeVerifier(supabase)
    try:
        result = await verifier.verify_goal_progress(
            goal_id=goal_id,
            manual_value=request.manual_value,
            photo_urls=request.photo_urls
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

    return VerificationResponse(
        verification_id=result.goal_id,  # Will be updated after save
        goal_id=result.goal_id,
        measured_value=result.measured_value,
        unit=result.unit,
        confidence_score=result.confidence_score,
        verification_method=result.verification_method,
        requires_manual_review=result.requires_manual_review,
        anomaly_detected=result.anomaly_detected,
        verified_at=result.verified_at
    )


@router.get("/goals/{goal_id}/verifications")
async def list_verifications(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """List all verifications for a goal"""
    # Verify access
    goal = (supabase.table('client_outcome_goals')
            .select('client_id, trainer_id')
            .eq('id', goal_id)
            .single()
            .execute())

    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    if current_user['id'] not in (goal.data['client_id'], goal.data['trainer_id']):
        raise HTTPException(status_code=403, detail="Access denied")

    # Fetch verifications
    result = (supabase.table('outcome_verifications')
              .select('*')
              .eq('goal_id', goal_id)
              .order('verified_at', desc=True)
              .execute())

    return result.data


# =============================================================================
# ANALYTICS ENDPOINTS
# =============================================================================

@router.get("/analytics/trainer")
async def get_trainer_analytics(
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    Get outcome pricing analytics for trainer.

    Returns summary of all outcome-based clients and performance.
    """
    result = supabase.rpc('get_trainer_outcome_analytics', {
        'trainer_id_param': current_user['id']
    }).execute()

    if not result.data or len(result.data) == 0:
        return TrainerAnalyticsResponse(
            total_outcome_clients=0,
            active_goals=0,
            achieved_goals=0,
            avg_completion_rate=Decimal('0'),
            total_bonus_revenue_cents=0,
            pending_verifications=0
        )

    data = result.data[0]
    return TrainerAnalyticsResponse(**data)


@router.get("/analytics/client/{client_id}")
async def get_client_analytics(
    client_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get outcome analytics for a specific client.

    Shows goal history, achievement rate, bonuses earned.
    """
    # Verify access
    if current_user.get('role') != 'trainer' and current_user['id'] != client_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get all goals for client
    goals = (supabase.table('client_outcome_goals')
             .select('*')
             .eq('client_id', client_id)
             .execute())

    # Get pricing adjustments (bonuses)
    adjustments = (supabase.table('pricing_adjustments')
                   .select('*')
                   .eq('client_id', client_id)
                   .execute())

    total_bonuses = sum([adj['amount_cents'] for adj in adjustments.data if 'bonus' in adj['adjustment_type']])

    return {
        'client_id': client_id,
        'total_goals': len(goals.data),
        'active_goals': len([g for g in goals.data if g['status'] == 'active']),
        'achieved_goals': len([g for g in goals.data if g['status'] == 'achieved']),
        'total_bonuses_earned_cents': total_bonuses,
        'goals': goals.data,
        'recent_adjustments': adjustments.data[:10]
    }


# =============================================================================
# MILESTONE ENDPOINTS
# =============================================================================

@router.get("/milestones/pending-celebration")
async def get_pending_celebrations(
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    Get milestones that need celebration notifications.

    Used for background job to send celebration push notifications.
    """
    result = (supabase.table('outcome_milestones')
              .select('*, client_outcome_goals!inner(client_id, trainer_id)')
              .eq('client_outcome_goals.trainer_id', current_user['id'])
              .eq('celebration_sent', False)
              .not_.is_('achieved_at', 'null')
              .execute())

    return result.data


# =============================================================================
# STRIPE BILLING ENDPOINTS
# =============================================================================

class CreateBonusInvoiceRequest(BaseModel):
    """Request to bill a milestone bonus"""
    milestone_id: str
    client_id: str
    amount_cents: int = Field(..., gt=0)
    description: str
    apply_immediately: bool = False


class BonusInvoiceResponse(BaseModel):
    """Response from billing a milestone bonus"""
    success: bool
    invoice_item_id: Optional[str] = None
    invoice_id: Optional[str] = None
    amount_cents: int
    status: str
    message: Optional[str] = None


@router.post("/milestones/{milestone_id}/bill")
async def bill_milestone_bonus(
    milestone_id: str,
    request: CreateBonusInvoiceRequest,
    current_user: dict = Depends(require_trainer),
    supabase = Depends(get_supabase_client)
):
    """
    Create a Stripe invoice item for a milestone bonus.

    Uses existing Stripe Connect infrastructure from Sprints 27-29.
    Adds bonus to client's next billing cycle.

    Requires: Trainer role
    """
    # Verify milestone ownership
    milestone = (supabase.table('outcome_milestones')
                .select('*, client_outcome_goals!inner(goal_id, trainer_id, client_id)')
                .eq('id', milestone_id)
                .single()
                .execute())

    if not milestone.data:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = milestone.data['client_outcome_goals']
    if goal['trainer_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Access denied")

    if goal['client_id'] != request.client_id:
        raise HTTPException(status_code=400, detail="Client ID mismatch")

    # Check if already billed
    existing = (supabase.table('pricing_adjustments')
               .select('stripe_invoice_item_id')
               .eq('milestone_id', milestone_id)
               .eq('adjustment_type', 'milestone_bonus')
               .execute())

    if existing.data and existing.data[0].get('stripe_invoice_item_id'):
        return BonusInvoiceResponse(
            success=False,
            amount_cents=request.amount_cents,
            status='already_billed',
            message='Milestone bonus already billed'
        )

    # Get client's Stripe customer ID
    client_profile = (supabase.table('profiles')
                     .select('stripe_customer_id')
                     .eq('id', request.client_id)
                     .single()
                     .execute())

    if not client_profile.data or not client_profile.data.get('stripe_customer_id'):
        raise HTTPException(status_code=400, detail="Client does not have Stripe customer ID")

    stripe_customer_id = client_profile.data['stripe_customer_id']

    # Call Supabase Edge Function to create Stripe invoice item
    # This leverages existing Stripe Connect infrastructure
    try:
        stripe_result = supabase.functions.invoke('create-bonus-invoice-item', {
            'customer_id': stripe_customer_id,
            'amount_cents': request.amount_cents,
            'description': request.description,
            'metadata': {
                'milestone_id': milestone_id,
                'goal_id': goal['goal_id'],
                'client_id': request.client_id,
                'trainer_id': current_user['id']
            }
        })

        if not stripe_result.get('data'):
            raise HTTPException(status_code=500, detail="Failed to create invoice item")

        invoice_item_id = stripe_result['data']['invoice_item_id']
        invoice_id = stripe_result['data'].get('invoice_id')

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Stripe API error: {str(e)}")

    # Create pricing adjustment record
    adjustment_data = {
        'client_id': request.client_id,
        'trainer_id': current_user['id'],
        'milestone_id': milestone_id,
        'adjustment_type': 'milestone_bonus',
        'amount_cents': request.amount_cents,
        'description': request.description,
        'stripe_invoice_item_id': invoice_item_id,
        'stripe_invoice_id': invoice_id,
        'applied_at': datetime.now().isoformat() if request.apply_immediately else None,
        'metadata': {
            'milestone_percent': milestone.data['milestone_percent'],
            'goal_type': goal.get('goal_type')
        }
    }

    adjustment_result = supabase.table('pricing_adjustments').insert(adjustment_data).execute()

    if not adjustment_result.data:
        raise HTTPException(status_code=500, detail="Failed to record pricing adjustment")

    # Update milestone as billed
    supabase.table('outcome_milestones').update({
        'bonus_paid': True,
        'bonus_paid_at': datetime.now().isoformat()
    }).eq('id', milestone_id).execute()

    return BonusInvoiceResponse(
        success=True,
        invoice_item_id=invoice_item_id,
        invoice_id=invoice_id,
        amount_cents=request.amount_cents,
        status='invoiced' if invoice_id else 'pending',
        message='Bonus invoice item created successfully'
    )


@router.get("/milestones/{milestone_id}/billing-status")
async def get_milestone_billing_status(
    milestone_id: str,
    current_user: dict = Depends(get_current_user),
    supabase = Depends(get_supabase_client)
):
    """
    Get billing status for a milestone bonus.

    Returns information about whether the bonus has been billed,
    the Stripe invoice item ID, and payment status.
    """
    # Verify access
    milestone = (supabase.table('outcome_milestones')
                .select('*, client_outcome_goals!inner(trainer_id, client_id)')
                .eq('id', milestone_id)
                .single()
                .execute())

    if not milestone.data:
        raise HTTPException(status_code=404, detail="Milestone not found")

    goal = milestone.data['client_outcome_goals']
    if current_user['id'] not in (goal['trainer_id'], goal['client_id']):
        raise HTTPException(status_code=403, detail="Access denied")

    # Get pricing adjustment
    adjustment = (supabase.table('pricing_adjustments')
                 .select('*')
                 .eq('milestone_id', milestone_id)
                 .eq('adjustment_type', 'milestone_bonus')
                 .single()
                 .execute())

    if not adjustment.data:
        return BonusInvoiceResponse(
            success=True,
            amount_cents=0,
            status='not_billed',
            message='Milestone bonus not yet billed'
        )

    adj = adjustment.data

    # Determine status
    status = 'pending'
    if adj.get('stripe_invoice_id'):
        if adj.get('applied_at'):
            status = 'paid'
        else:
            status = 'invoiced'

    return BonusInvoiceResponse(
        success=True,
        invoice_item_id=adj.get('stripe_invoice_item_id'),
        invoice_id=adj.get('stripe_invoice_id'),
        amount_cents=adj['amount_cents'],
        status=status,
        message=adj.get('description')
    )
