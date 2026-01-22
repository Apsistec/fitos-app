"""
WHOOP Integration - A2A Protocol

Implements A2A protocol communication with WHOOP recovery platform.
Syncs recovery score, HRV, sleep, and strain data.

WHOOP provides:
- Recovery score (0-100)
- Heart Rate Variability (HRV)
- Sleep performance
- Strain score (0-21)
- Resting heart rate

Reference: https://developer.whoop.com/api
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AActionRequest,
    A2AActionResponse,
    FitOSRecoveryData,
)
from app.agents.a2a_communication import a2a_communication


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class WHOOPIntegration:
    """
    WHOOP A2A Integration

    Connects to WHOOP platform via A2A protocol to retrieve
    recovery and performance data.
    """

    AGENT_ID = "whoop-recovery"
    API_BASE_URL = "https://api.whoop.com/developer/v1"

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def authenticate_user(
        self,
        user_id: str,
        authorization_code: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow for WHOOP authentication

        Args:
            user_id: FitOS user ID
            authorization_code: OAuth authorization code from WHOOP

        Returns:
            Authentication result with tokens
        """
        try:
            # Exchange code for access token
            response = await self.http_client.post(
                "https://api.whoop.com/oauth/token",
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "client_id": os.getenv("WHOOP_CLIENT_ID"),
                    "client_secret": os.getenv("WHOOP_CLIENT_SECRET"),
                    "redirect_uri": os.getenv("WHOOP_REDIRECT_URI"),
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"WHOOP authentication failed: {response.text}"
                }

            tokens = response.json()

            # Calculate expiration
            expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

            # Create A2A integration
            from app.agents.a2a_registry import a2a_integration_manager

            result = await a2a_integration_manager.create_integration(
                user_id=user_id,
                agent_id=self.AGENT_ID,
                data_types=["recovery", "sleep", "strain"],
                sync_frequency_hours=24,
                authentication_token=tokens["access_token"],
                authentication_expires_at=expires_at
            )

            return result

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def sync_recovery_data(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Sync recovery data from WHOOP

        Args:
            user_id: FitOS user ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Sync result with number of records imported
        """
        try:
            # Get user's WHOOP integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return {
                    "success": False,
                    "error": "WHOOP integration not found. Please connect WHOOP first."
                }

            # Set date range (default: last 7 days)
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=7)

            # Get recovery data from WHOOP API
            recovery_data = await self._fetch_whoop_recovery(
                integration["authentication_token"],
                start_date,
                end_date
            )

            if not recovery_data:
                return {
                    "success": True,
                    "records_synced": 0,
                    "message": "No new recovery data available"
                }

            # Import each recovery record via A2A protocol
            imported_count = 0

            for record in recovery_data:
                # Convert WHOOP data to FitOS format
                fitos_data = self._convert_whoop_to_fitos(record)

                # Send via A2A protocol to FitOS agent
                action_response = await a2a_communication.send_action_request(
                    target_agent_id="fitos-ai-coach",
                    capability_name="receive_recovery_data",
                    parameters={
                        "user_id": user_id,
                        "recovery_data": fitos_data.model_dump()
                    },
                    user_id=user_id,
                    authentication_token=integration["authentication_token"]
                )

                if action_response.success:
                    imported_count += 1

            # Record sync
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.record_sync(
                integration_id=integration["integration_id"],
                success=True,
                error_message=None
            )

            return {
                "success": True,
                "records_synced": imported_count,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "records_synced": 0
            }

    async def _get_user_integration(
        self,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get user's WHOOP integration"""
        try:
            result = supabase.table('a2a_user_integrations') \
                .select('*') \
                .eq('user_id', user_id) \
                .eq('agent_id', self.AGENT_ID) \
                .eq('enabled', True) \
                .single() \
                .execute()

            return result.data if result.data else None

        except Exception as e:
            print(f"Error getting WHOOP integration: {e}")
            return None

    async def _fetch_whoop_recovery(
        self,
        access_token: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch recovery data from WHOOP API"""
        try:
            # Get recovery cycles from WHOOP
            response = await self.http_client.get(
                f"{self.API_BASE_URL}/cycle",
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                params={
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            )

            if response.status_code != 200:
                print(f"WHOOP API error: {response.status_code} - {response.text}")
                return []

            return response.json().get("records", [])

        except Exception as e:
            print(f"Error fetching WHOOP data: {e}")
            return []

    def _convert_whoop_to_fitos(
        self,
        whoop_record: Dict[str, Any]
    ) -> FitOSRecoveryData:
        """Convert WHOOP record to FitOS recovery data format"""
        # Extract recovery data
        recovery = whoop_record.get("recovery", {})
        sleep = whoop_record.get("sleep", {})
        strain = whoop_record.get("strain", {})

        # Parse date from cycle
        cycle_date = whoop_record.get("days", [None])[0]
        if not cycle_date:
            cycle_date = datetime.utcnow().date().isoformat()

        return FitOSRecoveryData(
            date=cycle_date,
            recovery_score=recovery.get("score", 0),
            resting_hr=recovery.get("resting_heart_rate"),
            hrv_ms=recovery.get("hrv_rmssd_milli"),
            sleep_hours=sleep.get("total_in_bed_time_milli", 0) / 3600000,  # Convert ms to hours
            sleep_quality=sleep.get("quality_duration", 0) / sleep.get("total_in_bed_time_milli", 1) * 100 if sleep.get("total_in_bed_time_milli") else None,
            strain_score=strain.get("score"),
            source="whoop"
        )

    async def disconnect_user(
        self,
        user_id: str
    ) -> bool:
        """Disconnect WHOOP integration for a user"""
        try:
            # Get integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return False

            # Revoke WHOOP token
            await self.http_client.post(
                "https://api.whoop.com/oauth/revoke",
                data={
                    "token": integration["authentication_token"],
                    "client_id": os.getenv("WHOOP_CLIENT_ID"),
                    "client_secret": os.getenv("WHOOP_CLIENT_SECRET"),
                }
            )

            # Disable integration
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.disable_integration(
                integration_id=integration["integration_id"]
            )

            return True

        except Exception as e:
            print(f"Error disconnecting WHOOP: {e}")
            return False


# Singleton instance
whoop_integration = WHOOPIntegration()
