"""
NAP Consistency Service

Validates Name, Address, Phone consistency across platforms.
Sprint 42: Local SEO Automation
"""

from typing import Dict, Any, List, Optional, Tuple
from supabase import Client
from difflib import SequenceMatcher
import re
import logging

logger = logging.getLogger(__name__)


class NAPConsistencyService:
    """Service for NAP (Name, Address, Phone) consistency validation"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def check_consistency(
        self,
        trainer_id: str
    ) -> Tuple[bool, List[Dict[str, Any]]]:
        """
        Check NAP consistency across all platforms

        Args:
            trainer_id: Trainer UUID

        Returns:
            Tuple of (is_consistent, list of inconsistencies)
        """
        try:
            # Get canonical NAP from Google Business Profile
            canonical = await self._get_canonical_nap(trainer_id)
            if not canonical:
                return False, [{'error': 'No canonical profile found'}]

            # Get NAP from all platforms
            platforms = await self._get_all_platform_nap(trainer_id)

            # Compare each platform to canonical
            inconsistencies = []
            for platform_data in platforms:
                issues = self._compare_nap(canonical, platform_data)
                if issues:
                    inconsistencies.extend(issues)

            return len(inconsistencies) == 0, inconsistencies

        except Exception as e:
            logger.error(f"Error checking NAP consistency: {e}")
            return False, [{'error': str(e)}]

    async def _get_canonical_nap(self, trainer_id: str) -> Optional[Dict[str, str]]:
        """Get canonical NAP from Google Business Profile"""
        try:
            response = (
                self.supabase.table('google_business_profiles')
                .select('business_name, address_line1, city, state, postal_code, phone, email, website_url')
                .eq('trainer_id', trainer_id)
                .eq('profile_status', 'published')
                .single()
                .execute()
            )

            if response.data:
                return {
                    'platform': 'google_business',
                    'business_name': response.data.get('business_name'),
                    'address': self._format_address(response.data),
                    'phone': self._normalize_phone(response.data.get('phone')),
                    'email': response.data.get('email'),
                    'website': response.data.get('website_url'),
                }
            return None
        except Exception as e:
            logger.error(f"Error getting canonical NAP: {e}")
            return None

    async def _get_all_platform_nap(self, trainer_id: str) -> List[Dict[str, str]]:
        """Get NAP from all tracked platforms"""
        try:
            response = (
                self.supabase.table('nap_consistency')
                .select('*')
                .eq('trainer_id', trainer_id)
                .execute()
            )

            platforms = []
            for record in response.data:
                platforms.append({
                    'platform': record.get('platform'),
                    'business_name': record.get('business_name'),
                    'address': self._format_address(record),
                    'phone': self._normalize_phone(record.get('phone')),
                    'email': record.get('email'),
                    'website': record.get('website'),
                })

            return platforms
        except Exception as e:
            logger.error(f"Error getting platform NAP: {e}")
            return []

    def _compare_nap(
        self,
        canonical: Dict[str, str],
        platform: Dict[str, str]
    ) -> List[Dict[str, Any]]:
        """Compare platform NAP to canonical"""
        issues = []

        # Check business name
        if not self._names_match(canonical.get('business_name', ''), platform.get('business_name', '')):
            issues.append({
                'platform': platform['platform'],
                'field': 'business_name',
                'canonical': canonical.get('business_name'),
                'found': platform.get('business_name'),
                'severity': 'high',
            })

        # Check address
        if not self._addresses_match(canonical.get('address', ''), platform.get('address', '')):
            issues.append({
                'platform': platform['platform'],
                'field': 'address',
                'canonical': canonical.get('address'),
                'found': platform.get('address'),
                'severity': 'high',
            })

        # Check phone
        if canonical.get('phone') != platform.get('phone'):
            issues.append({
                'platform': platform['platform'],
                'field': 'phone',
                'canonical': canonical.get('phone'),
                'found': platform.get('phone'),
                'severity': 'critical',
            })

        # Check email
        if canonical.get('email') and platform.get('email'):
            if canonical['email'].lower() != platform['email'].lower():
                issues.append({
                    'platform': platform['platform'],
                    'field': 'email',
                    'canonical': canonical.get('email'),
                    'found': platform.get('email'),
                    'severity': 'medium',
                })

        # Check website
        if canonical.get('website') and platform.get('website'):
            if not self._urls_match(canonical['website'], platform['website']):
                issues.append({
                    'platform': platform['platform'],
                    'field': 'website',
                    'canonical': canonical.get('website'),
                    'found': platform.get('website'),
                    'severity': 'low',
                })

        return issues

    def _names_match(self, name1: str, name2: str, threshold: float = 0.9) -> bool:
        """Check if business names match (allowing for minor variations)"""
        if not name1 or not name2:
            return False

        # Normalize
        n1 = self._normalize_name(name1)
        n2 = self._normalize_name(name2)

        # Exact match
        if n1 == n2:
            return True

        # Fuzzy match
        similarity = SequenceMatcher(None, n1, n2).ratio()
        return similarity >= threshold

    def _addresses_match(self, addr1: str, addr2: str, threshold: float = 0.85) -> bool:
        """Check if addresses match (allowing for abbreviations)"""
        if not addr1 or not addr2:
            return False

        # Normalize
        a1 = self._normalize_address(addr1)
        a2 = self._normalize_address(addr2)

        # Exact match
        if a1 == a2:
            return True

        # Fuzzy match
        similarity = SequenceMatcher(None, a1, a2).ratio()
        return similarity >= threshold

    def _urls_match(self, url1: str, url2: str) -> bool:
        """Check if URLs match (ignoring protocol and trailing slash)"""
        u1 = url1.lower().replace('https://', '').replace('http://', '').rstrip('/')
        u2 = url2.lower().replace('https://', '').replace('http://', '').rstrip('/')
        return u1 == u2

    def _normalize_name(self, name: str) -> str:
        """Normalize business name for comparison"""
        # Remove common business suffixes
        normalized = name.lower()
        normalized = re.sub(r'\b(llc|inc|corp|ltd|co)\b', '', normalized)
        normalized = re.sub(r'[^\w\s]', '', normalized)  # Remove punctuation
        normalized = re.sub(r'\s+', ' ', normalized).strip()  # Normalize whitespace
        return normalized

    def _normalize_address(self, address: str) -> str:
        """Normalize address for comparison"""
        normalized = address.lower()

        # Common abbreviations
        abbreviations = {
            'street': 'st',
            'avenue': 'ave',
            'boulevard': 'blvd',
            'drive': 'dr',
            'road': 'rd',
            'lane': 'ln',
            'court': 'ct',
            'circle': 'cir',
            'suite': 'ste',
            'apartment': 'apt',
            'building': 'bldg',
            'north': 'n',
            'south': 's',
            'east': 'e',
            'west': 'w',
        }

        for full, abbr in abbreviations.items():
            normalized = re.sub(rf'\b{full}\b', abbr, normalized)

        # Remove punctuation
        normalized = re.sub(r'[^\w\s]', '', normalized)
        normalized = re.sub(r'\s+', ' ', normalized).strip()

        return normalized

    def _normalize_phone(self, phone: Optional[str]) -> Optional[str]:
        """Normalize phone number to digits only"""
        if not phone:
            return None

        # Extract digits only
        digits = re.sub(r'\D', '', phone)

        # Remove country code if present (assume US)
        if digits.startswith('1') and len(digits) == 11:
            digits = digits[1:]

        return digits if len(digits) == 10 else phone

    def _format_address(self, record: Dict[str, Any]) -> str:
        """Format address from record"""
        parts = [
            record.get('address_line1', ''),
            record.get('city', ''),
            record.get('state', ''),
            record.get('postal_code', ''),
        ]
        return ', '.join(filter(None, parts))

    async def update_platform_nap(
        self,
        trainer_id: str,
        platform: str,
        nap_data: Dict[str, str]
    ) -> bool:
        """
        Update NAP data for a platform

        Args:
            trainer_id: Trainer UUID
            platform: Platform name
            nap_data: NAP data to update

        Returns:
            Success boolean
        """
        try:
            data = {
                'trainer_id': trainer_id,
                'platform': platform,
                'business_name': nap_data.get('business_name'),
                'address_line1': nap_data.get('address_line1'),
                'address_line2': nap_data.get('address_line2'),
                'city': nap_data.get('city'),
                'state': nap_data.get('state'),
                'postal_code': nap_data.get('postal_code'),
                'phone': nap_data.get('phone'),
                'email': nap_data.get('email'),
                'website': nap_data.get('website'),
                'last_checked_at': 'NOW()',
            }

            # Upsert
            self.supabase.table('nap_consistency').upsert(data).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating platform NAP: {e}")
            return False

    async def get_inconsistency_report(
        self,
        trainer_id: str
    ) -> Dict[str, Any]:
        """
        Generate detailed NAP inconsistency report

        Args:
            trainer_id: Trainer UUID

        Returns:
            Inconsistency report
        """
        is_consistent, issues = await self.check_consistency(trainer_id)

        # Group by severity
        critical = [i for i in issues if i.get('severity') == 'critical']
        high = [i for i in issues if i.get('severity') == 'high']
        medium = [i for i in issues if i.get('severity') == 'medium']
        low = [i for i in issues if i.get('severity') == 'low']

        return {
            'is_consistent': is_consistent,
            'total_issues': len(issues),
            'issues_by_severity': {
                'critical': critical,
                'high': high,
                'medium': medium,
                'low': low,
            },
            'recommendations': self._generate_recommendations(issues),
        }

    def _generate_recommendations(
        self,
        issues: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on issues"""
        recommendations = []

        # Group by platform
        by_platform = {}
        for issue in issues:
            platform = issue.get('platform')
            if platform not in by_platform:
                by_platform[platform] = []
            by_platform[platform].append(issue)

        for platform, platform_issues in by_platform.items():
            if len(platform_issues) > 1:
                recommendations.append(
                    f"Update all NAP information on {platform} to match your Google Business Profile"
                )
            else:
                issue = platform_issues[0]
                recommendations.append(
                    f"Update {issue['field']} on {platform} to: {issue['canonical']}"
                )

        return recommendations
