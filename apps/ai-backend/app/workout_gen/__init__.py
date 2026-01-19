"""
Workout Generation Module

AI-powered workout program generation with:
- Natural language → Structured programs
- Auto-periodization
- Auto-regulating load management
- Block programming

Sprint 33: AI Workout Generation
"""

from app.workout_gen.generator import WorkoutGenerator, GenerationConfig
from app.workout_gen.periodization import Periodizer, PeriodizationBlock
from app.workout_gen.autoregulation import LoadManager, ReadinessScore

__all__ = [
    "WorkoutGenerator",
    "GenerationConfig",
    "Periodizer",
    "PeriodizationBlock",
    "LoadManager",
    "ReadinessScore",
]
