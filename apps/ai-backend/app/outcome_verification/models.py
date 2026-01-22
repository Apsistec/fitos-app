"""
Data models for outcome verification
"""

from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime
from decimal import Decimal


class VerificationMethod(str, Enum):
    """Method used for verification"""
    MANUAL = "manual"
    WORKOUT_DATA = "workout_data"
    NUTRITION_DATA = "nutrition_data"
    PHOTO = "photo"
    WEARABLE = "wearable"
    AI_ANALYZED = "ai_analyzed"


class VerificationSource(BaseModel):
    """Source of verification data"""
    source_type: str = Field(..., description="Type of source (workout_log, nutrition_log, wearable_data)")
    source_id: str = Field(..., description="UUID of source record")
    timestamp: datetime = Field(..., description="When data was recorded")
    value: Optional[Decimal] = Field(None, description="Measured value from this source")


class VerificationResult(BaseModel):
    """Result of an outcome verification"""
    goal_id: str = Field(..., description="UUID of the goal being verified")
    client_id: str
    trainer_id: str

    # Measurement
    verification_type: str = Field(..., description="Type of verification (e.g., 'weight_check', '1rm_test')")
    measured_value: Decimal = Field(..., description="The measured value")
    unit: str = Field(..., description="Unit of measurement (lbs, kg, reps, etc.)")

    # Method and confidence
    verification_method: VerificationMethod
    confidence_score: Decimal = Field(..., ge=0.0, le=1.0, description="Confidence in verification (0.0-1.0)")
    confidence_factors: dict = Field(default_factory=dict, description="Factors contributing to confidence score")

    # Sources
    sources: List[VerificationSource] = Field(default_factory=list)

    # Timing
    verified_at: datetime = Field(default_factory=datetime.now)

    # Additional context
    notes: Optional[str] = None
    photo_urls: List[str] = Field(default_factory=list)
    requires_manual_review: bool = Field(False, description="Flag if confidence too low")
    anomaly_detected: bool = Field(False, description="Flag if measurement seems anomalous")
    anomaly_reason: Optional[str] = None

    class Config:
        use_enum_values = True


class GoalProgress(BaseModel):
    """Progress calculation for a goal"""
    goal_id: str
    goal_type: str
    start_value: Decimal
    current_value: Decimal
    target_value: Decimal
    progress_percent: Decimal = Field(..., ge=0, le=100)
    milestones_achieved: List[Decimal] = Field(default_factory=list)
    next_milestone: Optional[Decimal] = None
    estimated_completion_date: Optional[datetime] = None


class ConfidenceFactors(BaseModel):
    """Factors contributing to confidence score"""
    data_completeness: Decimal = Field(..., ge=0.0, le=1.0, description="How complete is the data (0.0-1.0)")
    data_recency: Decimal = Field(..., ge=0.0, le=1.0, description="How recent is the data")
    consistency_score: Decimal = Field(..., ge=0.0, le=1.0, description="How consistent are multiple data points")
    source_reliability: Decimal = Field(..., ge=0.0, le=1.0, description="Reliability of data source")
    anomaly_penalty: Decimal = Field(0.0, ge=0.0, le=1.0, description="Penalty for detected anomalies")


class AnomalyDetection(BaseModel):
    """Anomaly detection result"""
    is_anomaly: bool
    anomaly_type: Optional[str] = None  # 'too_fast', 'too_slow', 'inconsistent', 'suspicious_pattern'
    reason: Optional[str] = None
    severity: Optional[str] = None  # 'low', 'medium', 'high', 'critical'
