"""
Local SEO Automation

Sprint 42: Automate local search optimization for trainers
"""

from .gbp_service import GoogleBusinessProfileService
from .schema_org_service import SchemaOrgService
from .nap_consistency import NAPConsistencyService
from .keyword_service import KeywordService

__all__ = [
    'GoogleBusinessProfileService',
    'SchemaOrgService',
    'NAPConsistencyService',
    'KeywordService',
]
