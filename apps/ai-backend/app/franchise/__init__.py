"""
Multi-Location & Franchise Management - Sprint 40

Enables franchise operations and multi-site gym chains with:
- Location hierarchy (organization → locations)
- Automated royalty calculation and tracking
- Cross-location analytics
- Multi-location memberships

Market Context:
- Fitness franchises represent 30% of $96B gym industry
- Average franchise fee: 6-8% of gross revenue
- Based on Xplor Mariana Tek 2025 franchise tools launch
"""

from app.franchise.royalty_calculator import RoyaltyCalculator
from app.franchise.location_analytics import LocationAnalytics

__all__ = [
    "RoyaltyCalculator",
    "LocationAnalytics",
]
