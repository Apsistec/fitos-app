"""
Weight Loss Verification Service

Verifies weight loss goals using nutrition log data with:
- 7-day moving average to smooth daily fluctuations
- Minimum data requirements for confidence
- Anomaly detection for suspicious changes
- Cross-verification with wearable data when available
"""

from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import statistics

from .models import (
    VerificationResult,
    VerificationMethod,
    VerificationSource,
    ConfidenceFactors,
    AnomalyDetection
)

logger = logging.getLogger(__name__)


class WeightVerificationService:
    """Service for verifying weight-related goals"""

    # Confidence thresholds
    MIN_DATA_POINTS = 3  # Minimum weight entries needed
    IDEAL_DATA_POINTS = 7  # Ideal for 7-day moving average
    MAX_HEALTHY_LOSS_PER_WEEK = 2.0  # lbs
    MAX_HEALTHY_GAIN_PER_WEEK = 0.5  # lbs (for weight gain goals)

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def verify(
        self,
        goal: dict,
        manual_value: Optional[Decimal] = None,
        photo_urls: Optional[list] = None
    ) -> VerificationResult:
        """
        Verify weight loss/gain progress.

        Args:
            goal: Goal dictionary from database
            manual_value: Manually entered weight (optional)
            photo_urls: Photos for evidence (optional)

        Returns:
            VerificationResult with confidence score
        """
        client_id = goal['client_id']
        trainer_id = goal['trainer_id']

        # Fetch recent weight data
        weight_data = await self._fetch_weight_history(
            client_id,
            days=30
        )

        if not weight_data and not manual_value:
            # No data available
            return self._create_low_confidence_result(
                goal=goal,
                reason="No weight data available",
                manual_value=manual_value,
                photo_urls=photo_urls
            )

        # Calculate moving average
        if weight_data:
            current_weight = self._calculate_moving_average(weight_data, days=7)
            sources = self._create_sources_from_data(weight_data[-7:])  # Last 7 days
        else:
            current_weight = manual_value
            sources = []

        # Override with manual value if provided (trainer/client entered)
        if manual_value:
            current_weight = manual_value

        # Calculate confidence factors
        confidence_factors = self._calculate_confidence(
            weight_data=weight_data,
            has_manual_value=manual_value is not None,
            has_photos=bool(photo_urls)
        )

        # Detect anomalies
        anomaly = self._detect_anomalies(
            goal=goal,
            weight_data=weight_data,
            current_weight=current_weight
        )

        # Calculate final confidence score
        confidence_score = self._compute_confidence_score(
            confidence_factors,
            anomaly
        )

        # Determine verification method
        if manual_value and weight_data:
            method = VerificationMethod.NUTRITION_DATA  # Has supporting data
        elif manual_value:
            method = VerificationMethod.MANUAL
        else:
            method = VerificationMethod.NUTRITION_DATA

        return VerificationResult(
            goal_id=goal['id'],
            client_id=client_id,
            trainer_id=trainer_id,
            verification_type='weight_check',
            measured_value=current_weight,
            unit=goal.get('unit', 'lbs'),
            verification_method=method,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors.dict(),
            sources=sources,
            photo_urls=photo_urls or [],
            requires_manual_review=confidence_score < Decimal('0.70') or anomaly.is_anomaly,
            anomaly_detected=anomaly.is_anomaly,
            anomaly_reason=anomaly.reason
        )

    async def _fetch_weight_history(self, client_id: str, days: int = 30) -> List[dict]:
        """
        Fetch weight entries from nutrition logs.

        Returns list of dicts with 'date', 'weight', 'id'
        """
        cutoff_date = datetime.now() - timedelta(days=days)

        # Query nutrition_logs or body_weight_logs (adjust based on schema)
        result = (self.supabase.table('nutrition_logs')
                  .select('id, logged_date, body_weight')
                  .eq('client_id', client_id)
                  .gte('logged_date', cutoff_date.date())
                  .not_.is_('body_weight', 'null')
                  .order('logged_date', desc=False)
                  .execute())

        if not result.data:
            return []

        return [
            {
                'id': row['id'],
                'date': row['logged_date'],
                'weight': Decimal(str(row['body_weight']))
            }
            for row in result.data
        ]

    def _calculate_moving_average(self, weight_data: List[dict], days: int = 7) -> Decimal:
        """
        Calculate N-day moving average to smooth fluctuations.

        Args:
            weight_data: List of weight entries (sorted by date)
            days: Number of days for moving average

        Returns:
            Moving average weight
        """
        if not weight_data:
            return Decimal('0')

        recent_weights = [entry['weight'] for entry in weight_data[-days:]]

        if not recent_weights:
            return Decimal('0')

        avg = statistics.mean(recent_weights)
        return Decimal(str(round(avg, 1)))

    def _create_sources_from_data(self, weight_data: List[dict]) -> List[VerificationSource]:
        """Convert weight data entries to VerificationSource objects"""
        return [
            VerificationSource(
                source_type='nutrition_log',
                source_id=entry['id'],
                timestamp=datetime.fromisoformat(str(entry['date'])),
                value=entry['weight']
            )
            for entry in weight_data
        ]

    def _calculate_confidence(
        self,
        weight_data: List[dict],
        has_manual_value: bool,
        has_photos: bool
    ) -> ConfidenceFactors:
        """
        Calculate confidence factors for verification.

        Returns:
            ConfidenceFactors with scores for each factor
        """
        # Data completeness (based on number of entries)
        data_points = len(weight_data) if weight_data else 0
        if data_points >= self.IDEAL_DATA_POINTS:
            data_completeness = Decimal('1.0')
        elif data_points >= self.MIN_DATA_POINTS:
            data_completeness = Decimal(str(data_points / self.IDEAL_DATA_POINTS))
        else:
            data_completeness = Decimal('0.3')

        # Data recency (when was last entry)
        if weight_data:
            last_entry_date = datetime.fromisoformat(str(weight_data[-1]['date']))
            days_since = (datetime.now().date() - last_entry_date.date()).days
            if days_since <= 2:
                data_recency = Decimal('1.0')
            elif days_since <= 7:
                data_recency = Decimal('0.8')
            elif days_since <= 14:
                data_recency = Decimal('0.6')
            else:
                data_recency = Decimal('0.4')
        else:
            data_recency = Decimal('0.3')

        # Consistency (variance in measurements)
        if weight_data and len(weight_data) >= 3:
            weights = [float(e['weight']) for e in weight_data[-14:]]  # Last 2 weeks
            std_dev = statistics.stdev(weights) if len(weights) > 1 else 0
            # Lower std dev = more consistent = higher score
            # Typical healthy fluctuation is 1-3 lbs
            if std_dev <= 2.0:
                consistency_score = Decimal('1.0')
            elif std_dev <= 5.0:
                consistency_score = Decimal('0.8')
            else:
                consistency_score = Decimal('0.6')
        else:
            consistency_score = Decimal('0.5')

        # Source reliability
        if has_photos:
            source_reliability = Decimal('0.95')
        elif weight_data and len(weight_data) >= self.IDEAL_DATA_POINTS:
            source_reliability = Decimal('0.90')
        elif has_manual_value:
            source_reliability = Decimal('0.75')
        else:
            source_reliability = Decimal('0.60')

        return ConfidenceFactors(
            data_completeness=data_completeness,
            data_recency=data_recency,
            consistency_score=consistency_score,
            source_reliability=source_reliability,
            anomaly_penalty=Decimal('0.0')  # Applied later
        )

    def _detect_anomalies(
        self,
        goal: dict,
        weight_data: List[dict],
        current_weight: Decimal
    ) -> AnomalyDetection:
        """
        Detect suspicious or unhealthy weight changes.

        Returns:
            AnomalyDetection with flags and reasons
        """
        if not weight_data or len(weight_data) < 2:
            return AnomalyDetection(is_anomaly=False)

        # Calculate weekly rate of change
        first_entry = weight_data[0]
        last_entry = weight_data[-1]

        first_weight = first_entry['weight']
        first_date = datetime.fromisoformat(str(first_entry['date']))
        last_date = datetime.fromisoformat(str(last_entry['date']))

        days_elapsed = (last_date.date() - first_date.date()).days
        if days_elapsed < 7:
            # Not enough time to assess rate
            return AnomalyDetection(is_anomaly=False)

        weeks_elapsed = Decimal(str(days_elapsed / 7))
        weight_change = current_weight - first_weight
        weekly_rate = abs(weight_change / weeks_elapsed)

        # Check if rate is too fast
        if goal['goal_type'] == 'weight_loss':
            if weekly_rate > Decimal(str(self.MAX_HEALTHY_LOSS_PER_WEEK)):
                return AnomalyDetection(
                    is_anomaly=True,
                    anomaly_type='too_fast',
                    reason=f"Weight loss rate of {weekly_rate:.1f} lbs/week exceeds healthy threshold",
                    severity='medium' if weekly_rate < 3.0 else 'high'
                )
        elif goal['goal_type'] == 'weight_gain':
            if weekly_rate > Decimal(str(self.MAX_HEALTHY_GAIN_PER_WEEK)):
                return AnomalyDetection(
                    is_anomaly=True,
                    anomaly_type='too_fast',
                    reason=f"Weight gain rate of {weekly_rate:.1f} lbs/week exceeds healthy threshold",
                    severity='low'  # Not as concerning as rapid loss
                )

        # Check for inconsistent pattern (large swings)
        if len(weight_data) >= 7:
            recent_weights = [float(e['weight']) for e in weight_data[-7:]]
            weight_range = max(recent_weights) - min(recent_weights)
            if weight_range > 10.0:  # 10+ lb fluctuation in a week
                return AnomalyDetection(
                    is_anomaly=True,
                    anomaly_type='inconsistent',
                    reason=f"Large weight fluctuation of {weight_range:.1f} lbs in recent week",
                    severity='low'
                )

        return AnomalyDetection(is_anomaly=False)

    def _compute_confidence_score(
        self,
        factors: ConfidenceFactors,
        anomaly: AnomalyDetection
    ) -> Decimal:
        """
        Compute final confidence score from all factors.

        Weighted average:
        - Data completeness: 25%
        - Data recency: 20%
        - Consistency: 20%
        - Source reliability: 35%
        - Anomaly penalty if detected

        Returns:
            Confidence score between 0.0 and 1.0
        """
        base_score = (
            factors.data_completeness * Decimal('0.25') +
            factors.data_recency * Decimal('0.20') +
            factors.consistency_score * Decimal('0.20') +
            factors.source_reliability * Decimal('0.35')
        )

        # Apply anomaly penalty
        if anomaly.is_anomaly:
            if anomaly.severity == 'critical':
                penalty = Decimal('0.50')
            elif anomaly.severity == 'high':
                penalty = Decimal('0.30')
            elif anomaly.severity == 'medium':
                penalty = Decimal('0.20')
            else:
                penalty = Decimal('0.10')

            base_score = base_score * (Decimal('1.0') - penalty)

        return max(Decimal('0.0'), min(Decimal('1.0'), base_score))

    def _create_low_confidence_result(
        self,
        goal: dict,
        reason: str,
        manual_value: Optional[Decimal] = None,
        photo_urls: Optional[list] = None
    ) -> VerificationResult:
        """Create a verification result with low confidence"""
        return VerificationResult(
            goal_id=goal['id'],
            client_id=goal['client_id'],
            trainer_id=goal['trainer_id'],
            verification_type='weight_check',
            measured_value=manual_value or goal['start_value'],
            unit=goal.get('unit', 'lbs'),
            verification_method=VerificationMethod.MANUAL if manual_value else VerificationMethod.NUTRITION_DATA,
            confidence_score=Decimal('0.30'),
            confidence_factors={
                'reason': reason,
                'data_completeness': 0.0,
                'data_recency': 0.0
            },
            sources=[],
            photo_urls=photo_urls or [],
            requires_manual_review=True,
            notes=reason
        )
