"""
Consistency Verification Service

Verifies consistency-based goals such as:
- "Complete 4 workouts per week for 12 weeks"
- "Log nutrition 6 days per week for 8 weeks"
- "Maintain 90%+ adherence for 3 months"

High confidence since based on verifiable timestamps.
"""

from typing import List
from datetime import datetime, timedelta
from decimal import Decimal
import logging

from .models import (
    VerificationResult,
    VerificationMethod,
    VerificationSource,
    ConfidenceFactors,
    AnomalyDetection
)

logger = logging.getLogger(__name__)


class ConsistencyVerificationService:
    """Service for verifying consistency goals"""

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def verify(
        self,
        goal: dict,
        manual_value: Decimal = None,
        photo_urls: list = None
    ) -> VerificationResult:
        """
        Verify consistency goal progress.

        Consistency goals track adherence over time:
        - target_value: number of weeks to maintain consistency
        - metadata.target_per_week: required sessions per week
        - metadata.activity_type: 'workout' or 'nutrition'

        Args:
            goal: Goal dictionary from database
            manual_value: Not used for consistency (automated)
            photo_urls: Not used for consistency

        Returns:
            VerificationResult with high confidence
        """
        client_id = goal['client_id']
        trainer_id = goal['trainer_id']

        # Parse goal metadata
        metadata = goal.get('metadata', {})
        target_per_week = metadata.get('target_per_week', 3)
        activity_type = metadata.get('activity_type', 'workout')

        # Fetch activity data
        if activity_type == 'workout':
            activity_data = await self._fetch_workout_activity(
                client_id=client_id,
                since_date=goal['start_date']
            )
        elif activity_type == 'nutrition':
            activity_data = await self._fetch_nutrition_activity(
                client_id=client_id,
                since_date=goal['start_date']
            )
        else:
            return self._create_low_confidence_result(
                goal=goal,
                reason=f"Unknown activity type: {activity_type}"
            )

        if not activity_data:
            return self._create_low_confidence_result(
                goal=goal,
                reason="No activity data found"
            )

        # Calculate weeks of consistency achieved
        consistent_weeks = self._calculate_consistent_weeks(
            activity_data=activity_data,
            target_per_week=target_per_week,
            start_date=goal['start_date']
        )

        # Confidence is very high for consistency goals (based on timestamps)
        confidence_factors = ConfidenceFactors(
            data_completeness=Decimal('1.0'),  # All timestamps recorded
            data_recency=Decimal('1.0'),       # Real-time data
            consistency_score=Decimal('1.0'),  # Timestamp-based
            source_reliability=Decimal('0.95'), # System-generated timestamps
            anomaly_penalty=Decimal('0.0')
        )

        confidence_score = Decimal('0.95')  # Very high confidence

        sources = self._create_sources_from_data(activity_data[-30:])  # Last 30 activities

        return VerificationResult(
            goal_id=goal['id'],
            client_id=client_id,
            trainer_id=trainer_id,
            verification_type='consistency_check',
            measured_value=Decimal(str(consistent_weeks)),
            unit='weeks',
            verification_method=VerificationMethod.WORKOUT_DATA if activity_type == 'workout' else VerificationMethod.NUTRITION_DATA,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors.dict(),
            sources=sources,
            requires_manual_review=False,
            anomaly_detected=False
        )

    async def _fetch_workout_activity(
        self,
        client_id: str,
        since_date: str
    ) -> List[dict]:
        """
        Fetch workout logs since start date.

        Returns list of dicts with 'id', 'date'
        """
        result = (self.supabase.table('workout_logs')
                  .select('id, completed_at')
                  .eq('client_id', client_id)
                  .gte('completed_at', since_date)
                  .order('completed_at', desc=False)
                  .execute())

        if not result.data:
            return []

        return [
            {
                'id': row['id'],
                'date': datetime.fromisoformat(str(row['completed_at'])).date()
            }
            for row in result.data
        ]

    async def _fetch_nutrition_activity(
        self,
        client_id: str,
        since_date: str
    ) -> List[dict]:
        """
        Fetch nutrition log dates since start date.

        Returns list of dicts with 'id', 'date'
        """
        result = (self.supabase.table('nutrition_logs')
                  .select('id, logged_date')
                  .eq('client_id', client_id)
                  .gte('logged_date', since_date)
                  .order('logged_date', desc=False)
                  .execute())

        if not result.data:
            return []

        return [
            {
                'id': row['id'],
                'date': datetime.fromisoformat(str(row['logged_date'])).date()
            }
            for row in result.data
        ]

    def _calculate_consistent_weeks(
        self,
        activity_data: List[dict],
        target_per_week: int,
        start_date: str
    ) -> int:
        """
        Calculate number of weeks where target was met.

        Args:
            activity_data: List of activity records with dates
            target_per_week: Required activities per week
            start_date: Goal start date

        Returns:
            Number of consistent weeks achieved
        """
        if not activity_data:
            return 0

        # Group activities by week
        start = datetime.fromisoformat(str(start_date)).date()
        now = datetime.now().date()

        weeks_consistent = 0
        current_week_start = start

        while current_week_start <= now:
            week_end = current_week_start + timedelta(days=7)

            # Count activities in this week
            week_activities = [
                a for a in activity_data
                if current_week_start <= a['date'] < week_end
            ]

            if len(week_activities) >= target_per_week:
                weeks_consistent += 1

            current_week_start = week_end

        return weeks_consistent

    def _create_sources_from_data(self, activity_data: List[dict]) -> List[VerificationSource]:
        """Convert activity records to VerificationSource objects"""
        return [
            VerificationSource(
                source_type='activity_log',
                source_id=record['id'],
                timestamp=datetime.combine(record['date'], datetime.min.time())
            )
            for record in activity_data
        ]

    def _create_low_confidence_result(
        self,
        goal: dict,
        reason: str
    ) -> VerificationResult:
        """Create a verification result with low confidence"""
        return VerificationResult(
            goal_id=goal['id'],
            client_id=goal['client_id'],
            trainer_id=goal['trainer_id'],
            verification_type='consistency_check',
            measured_value=Decimal('0'),
            unit='weeks',
            verification_method=VerificationMethod.MANUAL,
            confidence_score=Decimal('0.30'),
            confidence_factors={'reason': reason},
            sources=[],
            requires_manual_review=True,
            notes=reason
        )
