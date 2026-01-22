"""
Strength Gain Verification Service

Verifies strength-related goals using workout log data with:
- 1RM calculations from workout logs
- Progress tracking on compound movements
- Minimum time window requirements
- Volume and intensity analysis
"""

from typing import Optional, List, Dict
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


class StrengthVerificationService:
    """Service for verifying strength gain goals"""

    MIN_WEEKS_FOR_VERIFICATION = 4  # Minimum training period
    MIN_WORKOUT_COUNT = 8  # Minimum workouts for confidence

    def __init__(self, supabase_client):
        self.supabase = supabase_client

    async def verify(
        self,
        goal: dict,
        manual_value: Optional[Decimal] = None,
        photo_urls: Optional[list] = None
    ) -> VerificationResult:
        """
        Verify strength gain progress.

        Args:
            goal: Goal dictionary from database
            manual_value: Manually entered 1RM (optional)
            photo_urls: Photos for evidence (optional)

        Returns:
            VerificationResult with confidence score
        """
        client_id = goal['client_id']
        trainer_id = goal['trainer_id']

        # Get exercise ID from metadata
        exercise_id = goal.get('metadata', {}).get('exercise_id')
        if not exercise_id:
            return self._create_low_confidence_result(
                goal=goal,
                reason="No exercise specified for strength goal",
                manual_value=manual_value
            )

        # Fetch workout logs for this exercise
        workout_logs = await self._fetch_strength_data(
            client_id=client_id,
            exercise_id=exercise_id,
            since_date=goal['start_date']
        )

        if not workout_logs and not manual_value:
            return self._create_low_confidence_result(
                goal=goal,
                reason="No workout data available",
                manual_value=manual_value
            )

        # Calculate current 1RM from recent workouts
        if workout_logs:
            current_1rm = self._calculate_estimated_1rm(workout_logs)
            sources = self._create_sources_from_logs(workout_logs[-10:])
        else:
            current_1rm = manual_value
            sources = []

        # Override with manual if provided
        if manual_value:
            current_1rm = manual_value

        # Calculate confidence factors
        confidence_factors = self._calculate_confidence(
            workout_logs=workout_logs,
            goal_start_date=goal['start_date'],
            has_manual_value=manual_value is not None
        )

        # Detect anomalies (unrealistic gains)
        anomaly = self._detect_anomalies(
            goal=goal,
            workout_logs=workout_logs,
            current_1rm=current_1rm
        )

        # Calculate final confidence
        confidence_score = self._compute_confidence_score(
            confidence_factors,
            anomaly
        )

        return VerificationResult(
            goal_id=goal['id'],
            client_id=client_id,
            trainer_id=trainer_id,
            verification_type='1rm_test',
            measured_value=current_1rm,
            unit=goal.get('unit', 'lbs'),
            verification_method=VerificationMethod.WORKOUT_DATA if workout_logs else VerificationMethod.MANUAL,
            confidence_score=confidence_score,
            confidence_factors=confidence_factors.dict(),
            sources=sources,
            photo_urls=photo_urls or [],
            requires_manual_review=confidence_score < Decimal('0.70') or anomaly.is_anomaly,
            anomaly_detected=anomaly.is_anomaly,
            anomaly_reason=anomaly.reason
        )

    async def _fetch_strength_data(
        self,
        client_id: str,
        exercise_id: str,
        since_date: str
    ) -> List[dict]:
        """
        Fetch workout sets for a specific exercise.

        Returns list of sets with weight, reps, date
        """
        result = (self.supabase.table('workout_sets')
                  .select('id, workout_log_id, exercise_id, weight, reps, completed_at')
                  .eq('client_id', client_id)
                  .eq('exercise_id', exercise_id)
                  .gte('completed_at', since_date)
                  .order('completed_at', desc=False)
                  .execute())

        if not result.data:
            return []

        return [
            {
                'id': row['id'],
                'weight': Decimal(str(row['weight'])),
                'reps': int(row['reps']),
                'date': row['completed_at']
            }
            for row in result.data
            if row['weight'] and row['reps']
        ]

    def _calculate_estimated_1rm(self, workout_logs: List[dict]) -> Decimal:
        """
        Calculate estimated 1RM using Epley formula.

        1RM = weight * (1 + reps/30)

        Takes the highest 1RM from recent workouts (last 2 weeks)
        """
        if not workout_logs:
            return Decimal('0')

        # Calculate 1RM for each set
        estimated_1rms = []
        for log in workout_logs[-20:]:  # Last 20 sets
            weight = log['weight']
            reps = log['reps']

            # Only use sets with 1-12 reps (most accurate range)
            if 1 <= reps <= 12:
                one_rm = weight * (Decimal('1') + Decimal(str(reps)) / Decimal('30'))
                estimated_1rms.append(one_rm)

        if not estimated_1rms:
            # Fallback: use max weight lifted
            return max([log['weight'] for log in workout_logs])

        # Return the highest estimated 1RM
        return max(estimated_1rms)

    def _create_sources_from_logs(self, workout_logs: List[dict]) -> List[VerificationSource]:
        """Convert workout logs to VerificationSource objects"""
        return [
            VerificationSource(
                source_type='workout_set',
                source_id=log['id'],
                timestamp=datetime.fromisoformat(str(log['date'])),
                value=log['weight']
            )
            for log in workout_logs
        ]

    def _calculate_confidence(
        self,
        workout_logs: List[dict],
        goal_start_date: str,
        has_manual_value: bool
    ) -> ConfidenceFactors:
        """
        Calculate confidence factors for strength verification.

        Returns:
            ConfidenceFactors with scores for each factor
        """
        # Data completeness (number of workouts)
        workout_count = len(workout_logs) if workout_logs else 0
        if workout_count >= self.MIN_WORKOUT_COUNT * 2:
            data_completeness = Decimal('1.0')
        elif workout_count >= self.MIN_WORKOUT_COUNT:
            data_completeness = Decimal(str(workout_count / (self.MIN_WORKOUT_COUNT * 2)))
        else:
            data_completeness = Decimal('0.4')

        # Data recency
        if workout_logs:
            last_workout = datetime.fromisoformat(str(workout_logs[-1]['date']))
            days_since = (datetime.now() - last_workout).days
            if days_since <= 7:
                data_recency = Decimal('1.0')
            elif days_since <= 14:
                data_recency = Decimal('0.8')
            elif days_since <= 30:
                data_recency = Decimal('0.6')
            else:
                data_recency = Decimal('0.4')
        else:
            data_recency = Decimal('0.3')

        # Consistency (regular training)
        if workout_logs and len(workout_logs) >= 4:
            # Check workout frequency
            start_date = datetime.fromisoformat(str(goal_start_date))
            weeks_elapsed = (datetime.now() - start_date).days / 7
            workouts_per_week = workout_count / max(weeks_elapsed, 1)

            if workouts_per_week >= 2.0:
                consistency_score = Decimal('1.0')
            elif workouts_per_week >= 1.0:
                consistency_score = Decimal('0.8')
            else:
                consistency_score = Decimal('0.6')
        else:
            consistency_score = Decimal('0.5')

        # Source reliability
        if workout_logs and len(workout_logs) >= self.MIN_WORKOUT_COUNT:
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
            anomaly_penalty=Decimal('0.0')
        )

    def _detect_anomalies(
        self,
        goal: dict,
        workout_logs: List[dict],
        current_1rm: Decimal
    ) -> AnomalyDetection:
        """
        Detect unrealistic strength gains.

        Typical strength gains for natural lifters:
        - Beginners: 5-15 lbs/month
        - Intermediate: 2-5 lbs/month
        - Advanced: 0-2 lbs/month

        Returns:
            AnomalyDetection with flags
        """
        if not workout_logs or len(workout_logs) < 4:
            return AnomalyDetection(is_anomaly=False)

        start_1rm = goal['start_value']
        gain = current_1rm - start_1rm

        # Calculate timeframe
        start_date = datetime.fromisoformat(str(goal['start_date']))
        days_elapsed = (datetime.now() - start_date).days
        months_elapsed = Decimal(str(days_elapsed / 30))

        if months_elapsed < 1:
            # Too early to assess
            return AnomalyDetection(is_anomaly=False)

        gain_per_month = gain / months_elapsed

        # Determine experience level from starting strength
        # (rough heuristic based on typical numbers)
        if start_1rm < 135:  # Beginner
            max_expected_gain = Decimal('15')
        elif start_1rm < 225:  # Intermediate
            max_expected_gain = Decimal('5')
        else:  # Advanced
            max_expected_gain = Decimal('2')

        if gain_per_month > max_expected_gain * Decimal('1.5'):
            return AnomalyDetection(
                is_anomaly=True,
                anomaly_type='too_fast',
                reason=f"Strength gain of {gain_per_month:.1f} lbs/month exceeds typical progression",
                severity='medium'
            )

        # Check for unrealistic single-session jumps
        if len(workout_logs) >= 2:
            recent_weights = [log['weight'] for log in workout_logs[-5:]]
            max_jump = max([
                abs(recent_weights[i] - recent_weights[i-1])
                for i in range(1, len(recent_weights))
            ])

            if max_jump > start_1rm * Decimal('0.20'):  # 20%+ jump
                return AnomalyDetection(
                    is_anomaly=True,
                    anomaly_type='suspicious_pattern',
                    reason=f"Single workout jump of {max_jump:.1f} lbs is unusually large",
                    severity='low'
                )

        return AnomalyDetection(is_anomaly=False)

    def _compute_confidence_score(
        self,
        factors: ConfidenceFactors,
        anomaly: AnomalyDetection
    ) -> Decimal:
        """Compute final confidence score"""
        base_score = (
            factors.data_completeness * Decimal('0.30') +
            factors.data_recency * Decimal('0.20') +
            factors.consistency_score * Decimal('0.25') +
            factors.source_reliability * Decimal('0.25')
        )

        # Apply anomaly penalty
        if anomaly.is_anomaly:
            if anomaly.severity == 'high':
                penalty = Decimal('0.40')
            elif anomaly.severity == 'medium':
                penalty = Decimal('0.25')
            else:
                penalty = Decimal('0.15')

            base_score = base_score * (Decimal('1.0') - penalty)

        return max(Decimal('0.0'), min(Decimal('1.0'), base_score))

    def _create_low_confidence_result(
        self,
        goal: dict,
        reason: str,
        manual_value: Optional[Decimal] = None
    ) -> VerificationResult:
        """Create a verification result with low confidence"""
        return VerificationResult(
            goal_id=goal['id'],
            client_id=goal['client_id'],
            trainer_id=goal['trainer_id'],
            verification_type='1rm_test',
            measured_value=manual_value or goal['start_value'],
            unit=goal.get('unit', 'lbs'),
            verification_method=VerificationMethod.MANUAL,
            confidence_score=Decimal('0.30'),
            confidence_factors={'reason': reason},
            sources=[],
            requires_manual_review=True,
            notes=reason
        )
