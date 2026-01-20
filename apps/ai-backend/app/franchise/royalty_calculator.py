"""
Automated Royalty Calculator for Franchise Operations

Based on Xplor Mariana Tek 2025 franchise management tools:
- Automatic tracking, calculation and disbursement of royalties
- Real-time reporting and financial tracking
- Eliminates manual processes and calculation errors
- Dashboard for assessing performance across entire network

Features:
- Automatic royalty calculation (default 7% of gross revenue)
- Marketing fee calculation (default 2% of gross revenue)
- Technology fee tracking (default $99/month)
- Revenue breakdown by source (membership, training, retail)
- Automated payment tracking and overdue detection

Sprint 40: Multi-Location Management
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class RoyaltyCalculator:
    """
    Automated royalty calculator for franchise operations.

    Industry standards (2026):
    - Royalty rate: 6-8% of gross revenue
    - Marketing fee: 2-3% of gross revenue
    - Technology fee: $99-$199/month
    - Payment terms: Net 10 days after period end
    """

    def __init__(self):
        # Default rates (can be overridden per franchise agreement)
        self.default_royalty_rate = Decimal("0.07")  # 7%
        self.default_marketing_fee = Decimal("0.02")  # 2%
        self.default_tech_fee = Decimal("99.00")

    def calculate_period_royalties(
        self,
        location_id: str,
        period_start: date,
        period_end: date,
        revenue_breakdown: Dict[str, Decimal],
        royalty_rate: Optional[Decimal] = None,
        marketing_fee_rate: Optional[Decimal] = None,
        technology_fee: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Calculate royalties for a location for a given period.

        Args:
            location_id: Location UUID
            period_start: Start date of period
            period_end: End date of period
            revenue_breakdown: Dict with keys: membership_revenue, training_revenue, retail_revenue, other_revenue
            royalty_rate: Override default royalty rate
            marketing_fee_rate: Override default marketing fee rate
            technology_fee: Override default technology fee

        Returns:
            Royalty breakdown with amounts
        """
        # Use defaults if not specified
        royalty_rate = royalty_rate or self.default_royalty_rate
        marketing_fee_rate = marketing_fee_rate or self.default_marketing_fee
        technology_fee = technology_fee or self.default_tech_fee

        # Calculate gross revenue
        gross_revenue = sum(revenue_breakdown.values())

        # Calculate fees
        royalty_amount = gross_revenue * royalty_rate
        marketing_fee = gross_revenue * marketing_fee_rate
        total_fees = royalty_amount + marketing_fee + technology_fee

        # Payment due date (10 days after period end)
        payment_due_date = period_end + timedelta(days=10)

        logger.info(
            f"Royalty calculated for location {location_id}: "
            f"${float(total_fees):.2f} total "
            f"(${float(gross_revenue):.2f} @ {float(royalty_rate)*100}%)"
        )

        return {
            "location_id": location_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "gross_revenue": float(gross_revenue),
            "membership_revenue": float(revenue_breakdown.get("membership_revenue", Decimal("0"))),
            "training_revenue": float(revenue_breakdown.get("training_revenue", Decimal("0"))),
            "retail_revenue": float(revenue_breakdown.get("retail_revenue", Decimal("0"))),
            "other_revenue": float(revenue_breakdown.get("other_revenue", Decimal("0"))),
            "royalty_rate": float(royalty_rate),
            "royalty_amount": float(royalty_amount),
            "marketing_fee_rate": float(marketing_fee_rate),
            "marketing_fee_amount": float(marketing_fee),
            "technology_fee": float(technology_fee),
            "total_fees": float(total_fees),
            "payment_due_date": payment_due_date.isoformat(),
            "payment_status": "pending"
        }

    def calculate_organization_royalties(
        self,
        organization_id: str,
        period_start: date,
        period_end: date,
        locations_revenue: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Calculate royalties for all locations in an organization.

        Returns aggregate data across all franchise locations.

        Args:
            organization_id: Organization UUID
            period_start: Start date of period
            period_end: End date of period
            locations_revenue: List of dicts with location_id and revenue_breakdown

        Returns:
            Aggregated royalty data across all locations
        """
        total_gross_revenue = Decimal("0")
        total_royalties = Decimal("0")
        total_marketing_fees = Decimal("0")
        total_tech_fees = Decimal("0")
        location_results = []

        for location_data in locations_revenue:
            location_id = location_data["location_id"]
            revenue_breakdown = location_data["revenue_breakdown"]

            # Get custom rates if provided
            royalty_rate = location_data.get("royalty_rate")
            marketing_fee_rate = location_data.get("marketing_fee_rate")
            technology_fee = location_data.get("technology_fee")

            # Calculate for this location
            result = self.calculate_period_royalties(
                location_id=location_id,
                period_start=period_start,
                period_end=period_end,
                revenue_breakdown=revenue_breakdown,
                royalty_rate=royalty_rate,
                marketing_fee_rate=marketing_fee_rate,
                technology_fee=technology_fee
            )

            location_results.append(result)

            # Aggregate totals
            total_gross_revenue += Decimal(str(result["gross_revenue"]))
            total_royalties += Decimal(str(result["royalty_amount"]))
            total_marketing_fees += Decimal(str(result["marketing_fee_amount"]))
            total_tech_fees += Decimal(str(result["technology_fee"]))

        total_fees = total_royalties + total_marketing_fees + total_tech_fees

        logger.info(
            f"Organization royalties calculated: {len(location_results)} locations, "
            f"${float(total_fees):.2f} total fees"
        )

        return {
            "organization_id": organization_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_locations": len(location_results),
            "total_gross_revenue": float(total_gross_revenue),
            "total_royalties": float(total_royalties),
            "total_marketing_fees": float(total_marketing_fees),
            "total_technology_fees": float(total_tech_fees),
            "total_fees": float(total_fees),
            "locations": location_results
        }

    def get_overdue_payments(
        self,
        payments: List[Dict[str, Any]],
        as_of_date: Optional[date] = None
    ) -> List[Dict[str, Any]]:
        """
        Filter payments to find overdue ones.

        Args:
            payments: List of royalty payment records
            as_of_date: Date to check against (default: today)

        Returns:
            List of overdue payments with days_overdue
        """
        as_of_date = as_of_date or date.today()
        overdue = []

        for payment in payments:
            if payment["payment_status"] in ["pending", "overdue"]:
                due_date = date.fromisoformat(payment["payment_due_date"])
                if due_date < as_of_date:
                    days_overdue = (as_of_date - due_date).days
                    payment_copy = payment.copy()
                    payment_copy["days_overdue"] = days_overdue
                    overdue.append(payment_copy)

        # Sort by most overdue first
        overdue.sort(key=lambda x: x["days_overdue"], reverse=True)

        logger.info(f"Found {len(overdue)} overdue payments")

        return overdue

    def calculate_annual_projection(
        self,
        location_id: str,
        monthly_average_revenue: Decimal,
        royalty_rate: Optional[Decimal] = None,
        marketing_fee_rate: Optional[Decimal] = None,
        technology_fee: Optional[Decimal] = None
    ) -> Dict[str, Any]:
        """
        Project annual royalties based on monthly average revenue.

        Useful for franchise feasibility analysis and forecasting.

        Args:
            location_id: Location UUID
            monthly_average_revenue: Average monthly gross revenue
            royalty_rate: Override default royalty rate
            marketing_fee_rate: Override default marketing fee rate
            technology_fee: Override default monthly technology fee

        Returns:
            Annual royalty projections
        """
        royalty_rate = royalty_rate or self.default_royalty_rate
        marketing_fee_rate = marketing_fee_rate or self.default_marketing_fee
        technology_fee = technology_fee or self.default_tech_fee

        # Annual calculations
        annual_revenue = monthly_average_revenue * 12
        annual_royalties = annual_revenue * royalty_rate
        annual_marketing_fees = annual_revenue * marketing_fee_rate
        annual_tech_fees = technology_fee * 12
        annual_total_fees = annual_royalties + annual_marketing_fees + annual_tech_fees

        # Calculate percentage of revenue
        fee_percentage = (annual_total_fees / annual_revenue) * 100 if annual_revenue > 0 else 0

        return {
            "location_id": location_id,
            "monthly_average_revenue": float(monthly_average_revenue),
            "annual_projected_revenue": float(annual_revenue),
            "royalty_rate": float(royalty_rate),
            "annual_royalties": float(annual_royalties),
            "marketing_fee_rate": float(marketing_fee_rate),
            "annual_marketing_fees": float(annual_marketing_fees),
            "monthly_technology_fee": float(technology_fee),
            "annual_technology_fees": float(annual_tech_fees),
            "annual_total_fees": float(annual_total_fees),
            "total_fee_percentage": float(fee_percentage)
        }


# Singleton instance
_royalty_calculator = None


def get_royalty_calculator() -> RoyaltyCalculator:
    """Get singleton RoyaltyCalculator instance"""
    global _royalty_calculator
    if _royalty_calculator is None:
        _royalty_calculator = RoyaltyCalculator()
    return _royalty_calculator


# Export
__all__ = ["RoyaltyCalculator", "get_royalty_calculator"]
