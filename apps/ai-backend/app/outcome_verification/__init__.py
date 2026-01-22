"""
Outcome Verification System

Automated verification of client outcome goals using existing data sources:
- Weight tracking from nutrition logs
- Strength gains from workout logs
- Consistency metrics from activity data
- Wearable data for holistic assessment

Confidence scoring helps identify when manual review is needed.
"""

from .verifier import OutcomeVerifier
from .weight_tracker import WeightVerificationService
from .strength_tracker import StrengthVerificationService
from .consistency_tracker import ConsistencyVerificationService
from .models import VerificationResult, VerificationSource

__all__ = [
    'OutcomeVerifier',
    'WeightVerificationService',
    'StrengthVerificationService',
    'ConsistencyVerificationService',
    'VerificationResult',
    'VerificationSource',
]
