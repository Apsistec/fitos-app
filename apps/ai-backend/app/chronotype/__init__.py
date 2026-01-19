"""
Chronotype Optimization Module

Chronotype-based training optimization for performance improvement.

Research shows:
- 8.4% performance difference based on circadian alignment
- 70% of population experiences "social jetlag"
- Morning habits form 43% more reliably

Features:
- Chronotype assessment (MEQ-based)
- Optimal workout timing recommendations
- Chronotype-specific workout templates
- Performance prediction by time of day

Sprint 35: Chronotype Optimization
"""

from app.chronotype.assessment import ChronotypeAssessment, ChronotypeCategory
from app.chronotype.optimizer import ChronotypeOptimizer, OptimalWindow
from app.chronotype.templates import TemplateGenerator, ChronotypeTemplate

__all__ = [
    "ChronotypeAssessment",
    "ChronotypeCategory",
    "ChronotypeOptimizer",
    "OptimalWindow",
    "TemplateGenerator",
    "ChronotypeTemplate",
]
