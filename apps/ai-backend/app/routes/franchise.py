"""
Multi-Location & Franchise Management API Routes

RESTful API endpoints for franchise operations:
- Organization & location management
- Franchise agreement tracking
- Automated royalty calculation
- Cross-location analytics
- Multi-location memberships

Sprint 40: Multi-Location Management
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import date, datetime
from decimal import Decimal
import logging

from app.franchise.royalty_calculator import get_royalty_calculator, RoyaltyCalculator
from app.franchise.location_analytics import get_location_analytics, LocationAnalytics, PeriodType

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/franchise", tags=["franchise"])


# =====================================================================
# REQUEST/RESPONSE MODELS
# =====================================================================


class OrganizationCreate(BaseModel):
    """Request to create organization"""
    name: str = Field(..., description="Organization name")
    legal_name: Optional[str] = None
    tax_id: Optional[str] = Field(None, description="Tax ID (EIN for US)")
    organization_type: str = Field(..., description="Organization type: franchise, multi_location, single_location")
    billing_email: Optional[str] = None


class LocationCreate(BaseModel):
    """Request to create location"""
    organization_id: str
    name: str
    slug: str = Field(..., description="URL-friendly identifier")
    location_type: str = Field(default="branch", description="Location type: headquarters, branch, franchise")
    address_line1: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    timezone: str = Field(default="America/New_York")


class RoyaltyCalculationRequest(BaseModel):
    """Request to calculate royalties"""
    location_id: str
    period_start: date
    period_end: date
    revenue_breakdown: Dict[str, float] = Field(
        ...,
        description="Revenue by source: membership_revenue, training_revenue, retail_revenue, other_revenue"
    )
    royalty_rate: Optional[float] = Field(None, description="Override default 7%")
    marketing_fee_rate: Optional[float] = Field(None, description="Override default 2%")
    technology_fee: Optional[float] = Field(None, description="Override default $99")


class OrganizationRoyaltyRequest(BaseModel):
    """Request to calculate organization-wide royalties"""
    organization_id: str
    period_start: date
    period_end: date
    locations_revenue: List[Dict[str, Any]] = Field(
        ...,
        description="List of location revenue data"
    )


class AnalyticsAggregationRequest(BaseModel):
    """Request to aggregate analytics"""
    location_id: str
    period_type: str = Field(..., description="Period type: daily, weekly, monthly, quarterly, yearly")
    period_start: date
    period_end: date
    data: Dict[str, Any] = Field(..., description="Raw analytics data to aggregate")


class OrganizationAnalyticsRequest(BaseModel):
    """Request for organization-wide analytics"""
    organization_id: str
    period_type: str
    period_start: date
    period_end: date
    locations_data: List[Dict[str, Any]]


# =====================================================================
# ORGANIZATION MANAGEMENT
# =====================================================================


@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "franchise",
        "version": "1.0.0",
        "features": ["organizations", "locations", "royalties", "analytics"]
    }


@router.post("/organizations", status_code=status.HTTP_201_CREATED)
async def create_organization(org: OrganizationCreate):
    """
    Create new organization (franchise parent or multi-location chain).
    """
    try:
        # TODO: Save to organizations table
        logger.info(f"Organization created: {org.name} ({org.organization_type})")

        return {
            "id": "placeholder_org_id",
            "name": org.name,
            "organization_type": org.organization_type,
            "status": "active"
        }

    except Exception as e:
        logger.error(f"Error creating organization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/organizations/{organization_id}", status_code=status.HTTP_200_OK)
async def get_organization(organization_id: str):
    """
    Get organization details.
    """
    try:
        # TODO: Fetch from organizations table
        return {
            "id": organization_id,
            "name": "Placeholder Organization",
            "organization_type": "franchise"
        }

    except Exception as e:
        logger.error(f"Error fetching organization: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =====================================================================
# LOCATION MANAGEMENT
# =====================================================================


@router.post("/locations", status_code=status.HTTP_201_CREATED)
async def create_location(location: LocationCreate):
    """
    Create new location (headquarters, branch, or franchise).
    """
    try:
        # TODO: Save to locations table
        logger.info(
            f"Location created: {location.name} ({location.location_type}) "
            f"in organization {location.organization_id}"
        )

        return {
            "id": "placeholder_location_id",
            "organization_id": location.organization_id,
            "name": location.name,
            "slug": location.slug,
            "location_type": location.location_type,
            "status": "active"
        }

    except Exception as e:
        logger.error(f"Error creating location: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/locations/{location_id}", status_code=status.HTTP_200_OK)
async def get_location(location_id: str):
    """
    Get location details.
    """
    try:
        # TODO: Fetch from locations table
        return {
            "id": location_id,
            "name": "Placeholder Location",
            "location_type": "branch"
        }

    except Exception as e:
        logger.error(f"Error fetching location: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/organizations/{organization_id}/locations", status_code=status.HTTP_200_OK)
async def list_organization_locations(organization_id: str):
    """
    List all locations for an organization.
    """
    try:
        # TODO: Query locations by organization_id
        return {
            "organization_id": organization_id,
            "locations": []
        }

    except Exception as e:
        logger.error(f"Error listing locations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =====================================================================
# ROYALTY CALCULATION
# =====================================================================


@router.post("/royalties/calculate", status_code=status.HTTP_200_OK)
async def calculate_royalties(request: RoyaltyCalculationRequest):
    """
    Calculate royalties for a location for a given period.

    Default rates:
    - Royalty: 7% of gross revenue
    - Marketing fee: 2% of gross revenue
    - Technology fee: $99/month
    """
    try:
        calculator = get_royalty_calculator()

        # Convert revenue breakdown to Decimal
        revenue_breakdown = {
            k: Decimal(str(v)) for k, v in request.revenue_breakdown.items()
        }

        # Convert optional rates to Decimal if provided
        royalty_rate = Decimal(str(request.royalty_rate)) if request.royalty_rate else None
        marketing_fee_rate = Decimal(str(request.marketing_fee_rate)) if request.marketing_fee_rate else None
        technology_fee = Decimal(str(request.technology_fee)) if request.technology_fee else None

        result = calculator.calculate_period_royalties(
            location_id=request.location_id,
            period_start=request.period_start,
            period_end=request.period_end,
            revenue_breakdown=revenue_breakdown,
            royalty_rate=royalty_rate,
            marketing_fee_rate=marketing_fee_rate,
            technology_fee=technology_fee
        )

        return result

    except Exception as e:
        logger.error(f"Error calculating royalties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/royalties/organization", status_code=status.HTTP_200_OK)
async def calculate_organization_royalties(request: OrganizationRoyaltyRequest):
    """
    Calculate royalties for all locations in an organization.

    Returns aggregate data across all franchise locations.
    """
    try:
        calculator = get_royalty_calculator()

        result = calculator.calculate_organization_royalties(
            organization_id=request.organization_id,
            period_start=request.period_start,
            period_end=request.period_end,
            locations_revenue=request.locations_revenue
        )

        return result

    except Exception as e:
        logger.error(f"Error calculating organization royalties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/royalties/overdue/{organization_id}", status_code=status.HTTP_200_OK)
async def get_overdue_royalties(organization_id: str):
    """
    Get overdue royalty payments for an organization.

    Returns list of payments past due date with days overdue.
    """
    try:
        # TODO: Query royalty_payments table for overdue payments
        # calculator = get_royalty_calculator()
        # overdue = calculator.get_overdue_payments(payments)

        return {
            "organization_id": organization_id,
            "overdue_payments": [],
            "total_overdue_amount": 0.00
        }

    except Exception as e:
        logger.error(f"Error fetching overdue royalties: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# =====================================================================
# ANALYTICS
# =====================================================================


@router.post("/analytics/location", status_code=status.HTTP_200_OK)
async def aggregate_location_analytics(request: AnalyticsAggregationRequest):
    """
    Aggregate analytics for a single location.

    Metrics include:
    - Membership (total, new, canceled, retention)
    - Revenue (gross, by source)
    - Activity (workouts, classes, attendance)
    - Engagement (messages, check-ins, nutrition logs)
    - Staff (total, trainers)
    """
    try:
        analytics = get_location_analytics()

        result = analytics.aggregate_location_metrics(
            location_id=request.location_id,
            period_type=PeriodType(request.period_type),
            period_start=request.period_start,
            period_end=request.period_end,
            data=request.data
        )

        return result

    except Exception as e:
        logger.error(f"Error aggregating location analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/analytics/organization", status_code=status.HTTP_200_OK)
async def aggregate_organization_analytics(request: OrganizationAnalyticsRequest):
    """
    Aggregate analytics across all locations in an organization.

    Provides network-wide reporting for franchisors.
    """
    try:
        analytics = get_location_analytics()

        result = analytics.aggregate_organization_metrics(
            organization_id=request.organization_id,
            period_type=PeriodType(request.period_type),
            period_start=request.period_start,
            period_end=request.period_end,
            locations_data=request.locations_data
        )

        return result

    except Exception as e:
        logger.error(f"Error aggregating organization analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/analytics/compare", status_code=status.HTTP_200_OK)
async def compare_locations(
    locations_data: List[Dict[str, Any]],
    metric: str = "gross_revenue"
):
    """
    Compare locations by a specific metric.

    Useful for franchise performance benchmarking.

    Available metrics:
    - gross_revenue
    - active_members
    - total_workouts
    - member_retention_rate
    """
    try:
        analytics = get_location_analytics()

        result = analytics.compare_locations(locations_data, metric)

        return {
            "metric": metric,
            "locations": result
        }

    except Exception as e:
        logger.error(f"Error comparing locations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/analytics/top-performers", status_code=status.HTTP_200_OK)
async def get_top_performers(
    locations_data: List[Dict[str, Any]],
    metric: str = "gross_revenue",
    limit: int = 5
):
    """
    Get top performing locations by metric.
    """
    try:
        analytics = get_location_analytics()

        result = analytics.get_top_performers(locations_data, metric, limit)

        return {
            "metric": metric,
            "top_performers": result
        }

    except Exception as e:
        logger.error(f"Error fetching top performers: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# Export router
__all__ = ["router"]
