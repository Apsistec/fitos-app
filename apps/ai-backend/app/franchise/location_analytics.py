"""
Location Analytics Aggregation

Provides centralized analytics across multi-location operations:
- Location-level KPIs (membership, revenue, engagement)
- Organization-wide aggregate reporting
- Cross-location comparisons
- Trend analysis

Based on industry best practices (2026):
- Real-time dashboards for franchisors
- Global, regional, and individual location KPIs
- Performance monitoring per location
- Network-wide aggregate reporting

Sprint 40: Multi-Location Management
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class PeriodType(str, Enum):
    """Analytics period types"""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class LocationAnalytics:
    """
    Analytics aggregation for multi-location operations.

    Key Metrics (from market research):
    - Client management: 96% rated as most important
    - Online booking: 89% importance
    - Class management: 87% importance
    - Membership management: 85% importance
    """

    def aggregate_location_metrics(
        self,
        location_id: str,
        period_type: PeriodType,
        period_start: date,
        period_end: date,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Aggregate metrics for a single location.

        Args:
            location_id: Location UUID
            period_type: Type of period (daily, weekly, monthly, etc.)
            period_start: Start date of period
            period_end: End date of period
            data: Raw data to aggregate

        Returns:
            Aggregated analytics for the location
        """
        # Extract membership metrics
        total_members = data.get("total_members", 0)
        new_members = data.get("new_members", 0)
        canceled_members = data.get("canceled_members", 0)
        active_members = data.get("active_members", 0)

        # Calculate retention rate
        retention_rate = 0.0
        if total_members > 0:
            retention_rate = ((total_members - canceled_members) / total_members) * 100

        # Extract revenue metrics
        membership_revenue = Decimal(str(data.get("membership_revenue", 0)))
        training_revenue = Decimal(str(data.get("training_revenue", 0)))
        retail_revenue = Decimal(str(data.get("retail_revenue", 0)))
        other_revenue = Decimal(str(data.get("other_revenue", 0)))
        gross_revenue = membership_revenue + training_revenue + retail_revenue + other_revenue

        # Extract activity metrics
        total_workouts = data.get("total_workouts", 0)
        total_classes_booked = data.get("total_classes_booked", 0)
        average_attendance_rate = data.get("average_attendance_rate", 0.0)
        unique_active_clients = data.get("unique_active_clients", 0)

        # Extract engagement metrics
        messages_sent = data.get("messages_sent", 0)
        check_ins_completed = data.get("check_ins_completed", 0)
        nutrition_logs = data.get("nutrition_logs", 0)

        # Extract staff metrics
        total_staff = data.get("total_staff", 0)
        total_trainers = data.get("total_trainers", 0)

        logger.info(
            f"Aggregated metrics for location {location_id}: "
            f"{active_members} active members, ${float(gross_revenue):.2f} revenue"
        )

        return {
            "location_id": location_id,
            "period_type": period_type.value,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            # Membership metrics
            "total_members": total_members,
            "new_members": new_members,
            "canceled_members": canceled_members,
            "active_members": active_members,
            "member_retention_rate": round(retention_rate, 2),
            # Revenue metrics
            "gross_revenue": float(gross_revenue),
            "membership_revenue": float(membership_revenue),
            "training_revenue": float(training_revenue),
            "retail_revenue": float(retail_revenue),
            "other_revenue": float(other_revenue),
            # Activity metrics
            "total_workouts": total_workouts,
            "total_classes_booked": total_classes_booked,
            "average_attendance_rate": average_attendance_rate,
            "unique_active_clients": unique_active_clients,
            # Engagement metrics
            "messages_sent": messages_sent,
            "check_ins_completed": check_ins_completed,
            "nutrition_logs": nutrition_logs,
            # Staff metrics
            "total_staff": total_staff,
            "total_trainers": total_trainers
        }

    def aggregate_organization_metrics(
        self,
        organization_id: str,
        period_type: PeriodType,
        period_start: date,
        period_end: date,
        locations_data: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Aggregate metrics across all locations in an organization.

        Provides network-wide reporting for franchisors.

        Args:
            organization_id: Organization UUID
            period_type: Type of period
            period_start: Start date of period
            period_end: End date of period
            locations_data: List of location analytics data

        Returns:
            Organization-wide aggregated metrics
        """
        # Initialize totals
        total_members = 0
        total_new_members = 0
        total_canceled_members = 0
        total_active_members = 0
        total_gross_revenue = Decimal("0")
        total_membership_revenue = Decimal("0")
        total_training_revenue = Decimal("0")
        total_retail_revenue = Decimal("0")
        total_other_revenue = Decimal("0")
        total_workouts = 0
        total_classes_booked = 0
        total_unique_active_clients = 0
        total_messages_sent = 0
        total_check_ins = 0
        total_nutrition_logs = 0
        total_staff = 0
        total_trainers = 0

        # Aggregate across all locations
        for location in locations_data:
            total_members += location.get("total_members", 0)
            total_new_members += location.get("new_members", 0)
            total_canceled_members += location.get("canceled_members", 0)
            total_active_members += location.get("active_members", 0)
            total_gross_revenue += Decimal(str(location.get("gross_revenue", 0)))
            total_membership_revenue += Decimal(str(location.get("membership_revenue", 0)))
            total_training_revenue += Decimal(str(location.get("training_revenue", 0)))
            total_retail_revenue += Decimal(str(location.get("retail_revenue", 0)))
            total_other_revenue += Decimal(str(location.get("other_revenue", 0)))
            total_workouts += location.get("total_workouts", 0)
            total_classes_booked += location.get("total_classes_booked", 0)
            total_unique_active_clients += location.get("unique_active_clients", 0)
            total_messages_sent += location.get("messages_sent", 0)
            total_check_ins += location.get("check_ins_completed", 0)
            total_nutrition_logs += location.get("nutrition_logs", 0)
            total_staff += location.get("total_staff", 0)
            total_trainers += location.get("total_trainers", 0)

        # Calculate network-wide retention rate
        network_retention_rate = 0.0
        if total_members > 0:
            network_retention_rate = ((total_members - total_canceled_members) / total_members) * 100

        # Calculate average attendance rate
        attendance_rates = [loc.get("average_attendance_rate", 0) for loc in locations_data]
        avg_attendance = sum(attendance_rates) / len(attendance_rates) if attendance_rates else 0

        logger.info(
            f"Aggregated organization metrics: {len(locations_data)} locations, "
            f"{total_active_members} active members, ${float(total_gross_revenue):.2f} revenue"
        )

        return {
            "organization_id": organization_id,
            "period_type": period_type.value,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_locations": len(locations_data),
            # Network-wide membership metrics
            "total_members": total_members,
            "total_new_members": total_new_members,
            "total_canceled_members": total_canceled_members,
            "total_active_members": total_active_members,
            "network_retention_rate": round(network_retention_rate, 2),
            # Network-wide revenue metrics
            "total_gross_revenue": float(total_gross_revenue),
            "total_membership_revenue": float(total_membership_revenue),
            "total_training_revenue": float(total_training_revenue),
            "total_retail_revenue": float(total_retail_revenue),
            "total_other_revenue": float(total_other_revenue),
            # Network-wide activity metrics
            "total_workouts": total_workouts,
            "total_classes_booked": total_classes_booked,
            "average_attendance_rate": round(avg_attendance, 2),
            "total_unique_active_clients": total_unique_active_clients,
            # Network-wide engagement metrics
            "total_messages_sent": total_messages_sent,
            "total_check_ins": total_check_ins,
            "total_nutrition_logs": total_nutrition_logs,
            # Network-wide staff metrics
            "total_staff": total_staff,
            "total_trainers": total_trainers,
            # Per-location metrics
            "locations": locations_data
        }

    def compare_locations(
        self,
        locations_data: List[Dict[str, Any]],
        metric: str = "gross_revenue"
    ) -> List[Dict[str, Any]]:
        """
        Compare locations by a specific metric.

        Useful for franchise performance benchmarking.

        Args:
            locations_data: List of location analytics data
            metric: Metric to compare by (default: gross_revenue)

        Returns:
            Locations sorted by metric (highest first)
        """
        # Sort locations by the specified metric
        sorted_locations = sorted(
            locations_data,
            key=lambda x: x.get(metric, 0),
            reverse=True
        )

        # Add ranking
        for i, location in enumerate(sorted_locations, 1):
            location["rank"] = i

        logger.info(
            f"Compared {len(sorted_locations)} locations by {metric}"
        )

        return sorted_locations

    def calculate_growth_rate(
        self,
        current_period: Dict[str, Any],
        previous_period: Dict[str, Any],
        metric: str = "gross_revenue"
    ) -> Dict[str, Any]:
        """
        Calculate growth rate between two periods.

        Args:
            current_period: Current period data
            previous_period: Previous period data
            metric: Metric to calculate growth for

        Returns:
            Growth rate analysis
        """
        current_value = current_period.get(metric, 0)
        previous_value = previous_period.get(metric, 0)

        # Calculate growth
        growth_amount = current_value - previous_value
        growth_rate = 0.0
        if previous_value > 0:
            growth_rate = (growth_amount / previous_value) * 100

        return {
            "metric": metric,
            "current_value": current_value,
            "previous_value": previous_value,
            "growth_amount": growth_amount,
            "growth_rate": round(growth_rate, 2),
            "period_type": current_period.get("period_type"),
            "current_period_start": current_period.get("period_start"),
            "previous_period_start": previous_period.get("period_start")
        }

    def get_top_performers(
        self,
        locations_data: List[Dict[str, Any]],
        metric: str = "gross_revenue",
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get top performing locations by metric.

        Args:
            locations_data: List of location analytics data
            metric: Metric to rank by
            limit: Number of top performers to return

        Returns:
            Top performing locations
        """
        sorted_locations = self.compare_locations(locations_data, metric)
        return sorted_locations[:limit]

    def get_bottom_performers(
        self,
        locations_data: List[Dict[str, Any]],
        metric: str = "gross_revenue",
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Get bottom performing locations by metric.

        Useful for identifying locations that need support.

        Args:
            locations_data: List of location analytics data
            metric: Metric to rank by
            limit: Number of bottom performers to return

        Returns:
            Bottom performing locations
        """
        sorted_locations = self.compare_locations(locations_data, metric)
        return sorted_locations[-limit:]


# Singleton instance
_location_analytics = None


def get_location_analytics() -> LocationAnalytics:
    """Get singleton LocationAnalytics instance"""
    global _location_analytics
    if _location_analytics is None:
        _location_analytics = LocationAnalytics()
    return _location_analytics


# Export
__all__ = ["LocationAnalytics", "PeriodType", "get_location_analytics"]
