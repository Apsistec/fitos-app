"""
Google Business Profile Service

Integrates with Google My Business API for local SEO automation.
Sprint 42: Local SEO Automation
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
import httpx
from supabase import Client
import logging
import os

logger = logging.getLogger(__name__)


class GoogleBusinessProfileService:
    """Service for Google Business Profile integration"""

    # Google My Business API endpoints
    OAUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    API_BASE = "https://mybusinessbusinessinformation.googleapis.com/v1"
    ACCOUNT_API = "https://mybusinessaccountmanagement.googleapis.com/v1"

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self.client_id = os.getenv('GOOGLE_CLIENT_ID')
        self.client_secret = os.getenv('GOOGLE_CLIENT_SECRET')
        self.redirect_uri = os.getenv('GOOGLE_REDIRECT_URI')

    async def get_authorization_url(self, state: str) -> str:
        """
        Generate OAuth authorization URL for Google Business Profile

        Args:
            state: State parameter for CSRF protection

        Returns:
            Authorization URL
        """
        params = {
            'client_id': self.client_id,
            'redirect_uri': self.redirect_uri,
            'response_type': 'code',
            'scope': 'https://www.googleapis.com/auth/business.manage',
            'access_type': 'offline',
            'prompt': 'consent',
            'state': state,
        }

        query_string = '&'.join(f"{k}={v}" for k, v in params.items())
        return f"{self.OAUTH_URL}?{query_string}"

    async def exchange_code_for_tokens(self, code: str) -> Optional[Dict[str, Any]]:
        """
        Exchange authorization code for access and refresh tokens

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Token response or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        'code': code,
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'redirect_uri': self.redirect_uri,
                        'grant_type': 'authorization_code',
                    }
                )

                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {e}")
            return None

    async def refresh_access_token(self, refresh_token: str) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token

        Args:
            refresh_token: Refresh token

        Returns:
            New token response or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.TOKEN_URL,
                    data={
                        'refresh_token': refresh_token,
                        'client_id': self.client_id,
                        'client_secret': self.client_secret,
                        'grant_type': 'refresh_token',
                    }
                )

                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    async def get_accounts(self, access_token: str) -> Optional[List[Dict[str, Any]]]:
        """
        Get list of Google Business accounts

        Args:
            access_token: OAuth access token

        Returns:
            List of accounts or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.ACCOUNT_API}/accounts",
                    headers={'Authorization': f'Bearer {access_token}'}
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get accounts: {response.text}")
                    return None

                data = response.json()
                return data.get('accounts', [])
        except Exception as e:
            logger.error(f"Error getting accounts: {e}")
            return None

    async def create_location(
        self,
        account_name: str,
        access_token: str,
        location_data: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new Google Business Profile location

        Args:
            account_name: Google Business account name (e.g., accounts/123)
            access_token: OAuth access token
            location_data: Location details

        Returns:
            Created location or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{self.API_BASE}/{account_name}/locations",
                    headers={'Authorization': f'Bearer {access_token}'},
                    json=location_data,
                )

                if response.status_code not in [200, 201]:
                    logger.error(f"Failed to create location: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error creating location: {e}")
            return None

    async def update_location(
        self,
        location_name: str,
        access_token: str,
        location_data: Dict[str, Any],
        update_mask: List[str],
    ) -> Optional[Dict[str, Any]]:
        """
        Update an existing Google Business Profile location

        Args:
            location_name: Location resource name (e.g., locations/123)
            access_token: OAuth access token
            location_data: Updated location details
            update_mask: Fields to update

        Returns:
            Updated location or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.patch(
                    f"{self.API_BASE}/{location_name}",
                    headers={'Authorization': f'Bearer {access_token}'},
                    params={'updateMask': ','.join(update_mask)},
                    json=location_data,
                )

                if response.status_code != 200:
                    logger.error(f"Failed to update location: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error updating location: {e}")
            return None

    async def get_location(
        self,
        location_name: str,
        access_token: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get Google Business Profile location details

        Args:
            location_name: Location resource name
            access_token: OAuth access token

        Returns:
            Location details or None on error
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"{self.API_BASE}/{location_name}",
                    headers={'Authorization': f'Bearer {access_token}'}
                )

                if response.status_code != 200:
                    logger.error(f"Failed to get location: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error getting location: {e}")
            return None

    def build_location_payload(
        self,
        business_name: str,
        category: str,
        phone: str,
        website_url: str,
        address: Dict[str, str],
        hours: Dict[str, Dict[str, str]],
        description: Optional[str] = None,
        service_areas: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Build Google Business Profile location payload

        Args:
            business_name: Business name
            category: Primary category (e.g., "Personal Trainer")
            phone: Phone number
            website_url: Website URL
            address: Address dict (line1, city, state, postalCode, country)
            hours: Business hours
            description: Business description
            service_areas: Cities/zip codes served

        Returns:
            Location payload for API
        """
        payload = {
            'title': business_name,
            'categories': {
                'primaryCategory': {
                    'displayName': category
                }
            },
            'phoneNumbers': {
                'primaryPhone': phone
            },
            'websiteUri': website_url,
            'address': {
                'addressLines': [address.get('line1', '')],
                'locality': address.get('city', ''),
                'administrativeArea': address.get('state', ''),
                'postalCode': address.get('postalCode', ''),
                'regionCode': address.get('country', 'US'),
            },
        }

        # Add optional address line 2
        if address.get('line2'):
            payload['address']['addressLines'].append(address['line2'])

        # Add business hours
        if hours:
            payload['regularHours'] = {
                'periods': self._convert_hours_to_periods(hours)
            }

        # Add description
        if description:
            payload['profile'] = {
                'description': description[:750]  # 750 char max
            }

        # Add service areas
        if service_areas:
            payload['serviceArea'] = {
                'places': [{'name': area} for area in service_areas]
            }

        return payload

    def _convert_hours_to_periods(
        self,
        hours: Dict[str, Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Convert hours dict to Google Business Profile periods format

        Args:
            hours: Dict of day -> {open, close}

        Returns:
            List of period objects
        """
        day_map = {
            'monday': 'MONDAY',
            'tuesday': 'TUESDAY',
            'wednesday': 'WEDNESDAY',
            'thursday': 'THURSDAY',
            'friday': 'FRIDAY',
            'saturday': 'SATURDAY',
            'sunday': 'SUNDAY',
        }

        periods = []
        for day_name, times in hours.items():
            if day_name.lower() in day_map and times.get('open') and times.get('close'):
                periods.append({
                    'openDay': day_map[day_name.lower()],
                    'openTime': times['open'],
                    'closeDay': day_map[day_name.lower()],
                    'closeTime': times['close'],
                })

        return periods

    async def store_profile(
        self,
        trainer_id: str,
        gbp_data: Dict[str, Any],
        tokens: Dict[str, Any],
        account_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Store Google Business Profile in database

        Args:
            trainer_id: Trainer UUID
            gbp_data: Google Business Profile data
            tokens: OAuth tokens
            account_id: Google Business account ID

        Returns:
            Stored profile or None on error
        """
        try:
            # Extract data from GBP response
            address = gbp_data.get('address', {})
            phone = gbp_data.get('phoneNumbers', {}).get('primaryPhone')

            data = {
                'trainer_id': trainer_id,
                'gbp_id': gbp_data.get('name'),
                'account_id': account_id,
                'business_name': gbp_data.get('title'),
                'category': gbp_data.get('categories', {}).get('primaryCategory', {}).get('displayName'),
                'phone': phone,
                'website_url': gbp_data.get('websiteUri'),
                'address_line1': address.get('addressLines', [''])[0],
                'address_line2': address.get('addressLines', ['', ''])[1] if len(address.get('addressLines', [])) > 1 else None,
                'city': address.get('locality'),
                'state': address.get('administrativeArea'),
                'postal_code': address.get('postalCode'),
                'country': address.get('regionCode', 'US'),
                'description': gbp_data.get('profile', {}).get('description'),
                'hours': self._convert_periods_to_hours(gbp_data.get('regularHours', {}).get('periods', [])),
                'access_token': tokens.get('access_token'),  # Should be encrypted
                'refresh_token': tokens.get('refresh_token'),  # Should be encrypted
                'token_expires_at': datetime.now().isoformat(),
                'profile_status': 'published',
                'sync_status': 'synced',
                'last_synced_at': datetime.now().isoformat(),
            }

            response = (
                self.supabase.table('google_business_profiles')
                .insert(data)
                .execute()
            )

            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error storing profile: {e}")
            return None

    def _convert_periods_to_hours(
        self,
        periods: List[Dict[str, Any]]
    ) -> Dict[str, Dict[str, str]]:
        """
        Convert GBP periods to hours dict

        Args:
            periods: List of period objects from GBP

        Returns:
            Dict of day -> {open, close}
        """
        day_map = {
            'MONDAY': 'monday',
            'TUESDAY': 'tuesday',
            'WEDNESDAY': 'wednesday',
            'THURSDAY': 'thursday',
            'FRIDAY': 'friday',
            'SATURDAY': 'saturday',
            'SUNDAY': 'sunday',
        }

        hours = {}
        for period in periods:
            day = day_map.get(period.get('openDay'))
            if day:
                hours[day] = {
                    'open': period.get('openTime'),
                    'close': period.get('closeTime'),
                }

        return hours

    async def sync_reviews(
        self,
        location_name: str,
        access_token: str,
        gbp_id: str,
    ) -> Optional[int]:
        """
        Sync reviews from Google Business Profile

        Args:
            location_name: Location resource name
            access_token: OAuth access token
            gbp_id: Google Business Profile ID in database

        Returns:
            Number of reviews synced or None on error
        """
        try:
            # Note: Google My Business API v4 is deprecated
            # This is a placeholder for the new API endpoint when available
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://mybusiness.googleapis.com/v4/{location_name}/reviews",
                    headers={'Authorization': f'Bearer {access_token}'}
                )

                if response.status_code != 200:
                    logger.error(f"Failed to sync reviews: {response.text}")
                    return None

                reviews_data = response.json()
                reviews = reviews_data.get('reviews', [])

                # Update profile with review stats
                if reviews:
                    total_reviews = len(reviews)
                    average_rating = sum(r.get('starRating', 0) for r in reviews) / total_reviews

                    self.supabase.table('google_business_profiles').update({
                        'total_reviews': total_reviews,
                        'average_rating': average_rating,
                    }).eq('id', gbp_id).execute()

                return len(reviews)
        except Exception as e:
            logger.error(f"Error syncing reviews: {e}")
            return None
