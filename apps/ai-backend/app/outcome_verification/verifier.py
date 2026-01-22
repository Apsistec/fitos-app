"""
Main Outcome Verifier

Orchestrates verification across different goal types and methods.
"""

from typing import Optional
from datetime import datetime
from decimal import Decimal
import logging

from .models import VerificationResult, VerificationMethod, GoalProgress
from .weight_tracker import WeightVerificationService
from .strength_tracker import StrengthVerificationService
from .consistency_tracker import ConsistencyVerificationService

logger = logging.getLogger(__name__)


class OutcomeVerifier:
    """
    Main orchestrator for outcome verification.
    Routes to specialized services based on goal type.
    """

    def __init__(self, supabase_client):
        self.supabase = supabase_client
        self.weight_service = WeightVerificationService(supabase_client)
        self.strength_service = StrengthVerificationService(supabase_client)
        self.consistency_service = ConsistencyVerificationService(supabase_client)

    async def verify_goal_progress(
        self,
        goal_id: str,
        manual_value: Optional[Decimal] = None,
        photo_urls: Optional[list] = None
    ) -> VerificationResult:
        """
        Verify progress for a specific goal.

        Args:
            goal_id: UUID of the goal to verify
            manual_value: Manually entered value (if provided)
            photo_urls: URLs of supporting photos (if provided)

        Returns:
            VerificationResult with confidence score and sources
        """
        # Fetch goal details
        goal = await self._fetch_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal not found: {goal_id}")

        logger.info(f"Verifying goal {goal_id} of type {goal['goal_type']}")

        # Route to appropriate verification service
        if goal['goal_type'] == 'weight_loss':
            result = await self.weight_service.verify(goal, manual_value, photo_urls)

        elif goal['goal_type'] == 'strength_gain':
            result = await self.strength_service.verify(goal, manual_value, photo_urls)

        elif goal['goal_type'] == 'consistency':
            result = await self.consistency_service.verify(goal)

        elif goal['goal_type'] in ('body_comp', 'custom'):
            # These require manual verification with photo evidence
            result = await self._manual_verification(goal, manual_value, photo_urls)

        else:
            raise ValueError(f"Unknown goal type: {goal['goal_type']}")

        # Save verification to database
        await self._save_verification(result)

        # Check for milestone achievements
        await self._check_milestones(goal_id)

        return result

    async def calculate_goal_progress(self, goal_id: str) -> GoalProgress:
        """
        Calculate current progress for a goal.

        Returns:
            GoalProgress with current status and projections
        """
        goal = await self._fetch_goal(goal_id)
        if not goal:
            raise ValueError(f"Goal not found: {goal_id}")

        # Get most recent verification
        latest_verification = await self._fetch_latest_verification(goal_id)

        current_value = latest_verification['measured_value'] if latest_verification else goal['start_value']

        # Calculate progress percentage
        if goal['goal_type'] == 'weight_loss':
            # Progress = (start - current) / (start - target) * 100
            progress = ((goal['start_value'] - current_value) /
                       (goal['start_value'] - goal['target_value'])) * 100
        elif goal['goal_type'] == 'strength_gain':
            # Progress = (current - start) / (target - start) * 100
            progress = ((current_value - goal['start_value']) /
                       (goal['target_value'] - goal['start_value'])) * 100
        else:
            # Simple percentage
            progress = (current_value / goal['target_value']) * 100

        progress = max(0, min(100, progress))  # Cap between 0-100

        # Determine milestones achieved
        milestones_achieved = [m for m in [25, 50, 75, 100] if progress >= m]
        next_milestone = next((m for m in [25, 50, 75, 100] if progress < m), None)

        return GoalProgress(
            goal_id=goal_id,
            goal_type=goal['goal_type'],
            start_value=Decimal(str(goal['start_value'])),
            current_value=Decimal(str(current_value)),
            target_value=Decimal(str(goal['target_value'])),
            progress_percent=Decimal(str(round(progress, 2))),
            milestones_achieved=[Decimal(str(m)) for m in milestones_achieved],
            next_milestone=Decimal(str(next_milestone)) if next_milestone else None
        )

    async def _fetch_goal(self, goal_id: str) -> Optional[dict]:
        """Fetch goal details from database"""
        result = self.supabase.table('client_outcome_goals').select('*').eq('id', goal_id).single().execute()
        return result.data if result.data else None

    async def _fetch_latest_verification(self, goal_id: str) -> Optional[dict]:
        """Fetch most recent verification for a goal"""
        result = (self.supabase.table('outcome_verifications')
                  .select('*')
                  .eq('goal_id', goal_id)
                  .order('verified_at', desc=True)
                  .limit(1)
                  .execute())
        return result.data[0] if result.data else None

    async def _manual_verification(
        self,
        goal: dict,
        manual_value: Optional[Decimal],
        photo_urls: Optional[list]
    ) -> VerificationResult:
        """
        Handle manual verification (body comp, custom goals).
        Requires trainer/client input with photo evidence.
        """
        if not manual_value:
            raise ValueError("Manual value required for body_comp and custom goals")

        # Confidence based on photo evidence
        confidence = Decimal('0.90') if photo_urls and len(photo_urls) > 0 else Decimal('0.70')

        return VerificationResult(
            goal_id=goal['id'],
            client_id=goal['client_id'],
            trainer_id=goal['trainer_id'],
            verification_type=goal['goal_type'],
            measured_value=manual_value,
            unit=goal.get('unit', ''),
            verification_method=VerificationMethod.MANUAL,
            confidence_score=confidence,
            confidence_factors={
                'photo_evidence': len(photo_urls) if photo_urls else 0,
                'manual_entry': True
            },
            photo_urls=photo_urls or [],
            requires_manual_review=False
        )

    async def _save_verification(self, result: VerificationResult) -> str:
        """Save verification result to database"""
        data = {
            'goal_id': result.goal_id,
            'client_id': result.client_id,
            'trainer_id': result.trainer_id,
            'verification_type': result.verification_type,
            'measured_value': float(result.measured_value),
            'unit': result.unit,
            'verification_method': result.verification_method,
            'confidence_score': float(result.confidence_score),
            'verified_at': result.verified_at.isoformat(),
            'notes': result.notes,
            'photo_urls': result.photo_urls,
            'source_ids': [s.source_id for s in result.sources],
            'metadata': {
                'confidence_factors': result.confidence_factors,
                'requires_manual_review': result.requires_manual_review,
                'anomaly_detected': result.anomaly_detected,
                'anomaly_reason': result.anomaly_reason
            }
        }

        response = self.supabase.table('outcome_verifications').insert(data).execute()
        logger.info(f"Saved verification for goal {result.goal_id}")
        return response.data[0]['id']

    async def _check_milestones(self, goal_id: str):
        """
        Check if any new milestones have been achieved.
        This is handled by the database trigger, but we can call it explicitly.
        """
        # The database trigger `update_goal_from_verification` will handle this
        # via `check_and_create_milestones` function
        self.supabase.rpc('check_and_create_milestones', {'goal_id_param': goal_id}).execute()
        logger.info(f"Checked milestones for goal {goal_id}")
