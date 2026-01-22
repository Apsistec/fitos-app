"""
Google Calendar Integration - A2A Protocol

Implements A2A protocol communication with Google Calendar.
Enables 2-way sync for training session scheduling.

Google Calendar provides:
- Event creation and modification
- 2-way sync (FitOS <-> Google Calendar)
- Conflict detection
- Reminders and notifications
- Calendar sharing

Reference: https://developers.google.com/calendar/api
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AActionRequest,
    A2AActionResponse,
    FitOSCalendarEvent,
)
from app.agents.a2a_communication import a2a_communication


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class GoogleCalendarIntegration:
    """
    Google Calendar A2A Integration

    Connects to Google Calendar via A2A protocol for
    training session scheduling and 2-way sync.
    """

    AGENT_ID = "google-calendar"
    API_BASE_URL = "https://www.googleapis.com/calendar/v3"

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def authenticate_user(
        self,
        user_id: str,
        authorization_code: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow for Google Calendar authentication

        Args:
            user_id: FitOS user ID
            authorization_code: OAuth authorization code from Google

        Returns:
            Authentication result with tokens
        """
        try:
            # Exchange code for access token
            response = await self.http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                    "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI"),
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Google authentication failed: {response.text}"
                }

            tokens = response.json()

            # Calculate expiration
            expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

            # Store refresh token for long-term access
            refresh_token = tokens.get("refresh_token")

            # Create A2A integration
            from app.agents.a2a_registry import a2a_integration_manager

            result = await a2a_integration_manager.create_integration(
                user_id=user_id,
                agent_id=self.AGENT_ID,
                data_types=["calendar_events"],
                sync_frequency_hours=1,  # Sync hourly
                authentication_token=tokens["access_token"],
                authentication_expires_at=expires_at
            )

            # Store refresh token separately (more secure)
            if refresh_token:
                supabase.table('a2a_user_integrations') \
                    .update({
                        'authentication_config': {
                            'refresh_token': refresh_token
                        }
                    }) \
                    .eq('integration_id', result["integration_id"]) \
                    .execute()

            return result

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def create_session_event(
        self,
        user_id: str,
        session_id: str,
        title: str,
        start_time: datetime,
        end_time: datetime,
        location: Optional[str] = None,
        notes: Optional[str] = None,
        attendees: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a Google Calendar event for a training session

        Args:
            user_id: FitOS user ID
            session_id: Training session ID
            title: Event title
            start_time: Event start time
            end_time: Event end time
            location: Event location
            notes: Event description
            attendees: List of attendee emails

        Returns:
            Created event details
        """
        try:
            # Get user's Google Calendar integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return {
                    "success": False,
                    "error": "Google Calendar integration not found. Please connect Google Calendar first."
                }

            # Refresh access token if expired
            access_token = await self._ensure_valid_token(integration)

            # Build event data
            event_data = {
                "summary": title,
                "start": {
                    "dateTime": start_time.isoformat(),
                    "timeZone": "UTC"
                },
                "end": {
                    "dateTime": end_time.isoformat(),
                    "timeZone": "UTC"
                },
                "description": notes or "",
                "location": location or "",
                "extendedProperties": {
                    "private": {
                        "fitos_session_id": session_id,
                        "source": "fitos"
                    }
                }
            }

            if attendees:
                event_data["attendees"] = [{"email": email} for email in attendees]

            # Create event via Google Calendar API
            response = await self.http_client.post(
                f"{self.API_BASE_URL}/calendars/primary/events",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json"
                },
                json=event_data
            )

            if response.status_code not in [200, 201]:
                return {
                    "success": False,
                    "error": f"Failed to create calendar event: {response.text}"
                }

            event = response.json()

            # Store event mapping in database
            supabase.table('calendar_event_mappings').insert({
                'user_id': user_id,
                'session_id': session_id,
                'google_event_id': event['id'],
                'calendar_link': event.get('htmlLink'),
                'synced_at': datetime.utcnow().isoformat()
            }).execute()

            return {
                "success": True,
                "event_id": event['id'],
                "calendar_link": event.get('htmlLink')
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def sync_calendar_events(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Sync events between Google Calendar and FitOS

        Args:
            user_id: FitOS user ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Sync result with number of events synced
        """
        try:
            # Get user's Google Calendar integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return {
                    "success": False,
                    "error": "Google Calendar integration not found"
                }

            # Set date range (default: next 30 days)
            if not start_date:
                start_date = datetime.utcnow()
            if not end_date:
                end_date = start_date + timedelta(days=30)

            # Refresh access token if expired
            access_token = await self._ensure_valid_token(integration)

            # Get events from Google Calendar
            response = await self.http_client.get(
                f"{self.API_BASE_URL}/calendars/primary/events",
                headers={
                    "Authorization": f"Bearer {access_token}"
                },
                params={
                    "timeMin": start_date.isoformat() + "Z",
                    "timeMax": end_date.isoformat() + "Z",
                    "singleEvents": True,
                    "orderBy": "startTime"
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"Failed to fetch calendar events: {response.text}"
                }

            events = response.json().get("items", [])

            # Filter for FitOS-created events and external events
            synced_count = 0

            for event in events:
                # Check if this is a FitOS-created event
                ext_props = event.get("extendedProperties", {}).get("private", {})
                is_fitos_event = ext_props.get("source") == "fitos"

                if not is_fitos_event:
                    # This is an external event - check for conflicts with training sessions
                    await self._check_event_conflicts(user_id, event)
                else:
                    # This is a FitOS event - sync any changes
                    session_id = ext_props.get("fitos_session_id")
                    if session_id:
                        await self._sync_fitos_event(user_id, session_id, event)

                synced_count += 1

            # Record sync
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.record_sync(
                integration_id=integration["integration_id"],
                success=True,
                error_message=None
            )

            return {
                "success": True,
                "events_synced": synced_count,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def _get_user_integration(
        self,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get user's Google Calendar integration"""
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
            print(f"Error getting Google Calendar integration: {e}")
            return None

    async def _ensure_valid_token(
        self,
        integration: Dict[str, Any]
    ) -> str:
        """Ensure access token is valid, refresh if needed"""
        # Check if token is expired
        if integration.get("authentication_expires_at"):
            expires_at = datetime.fromisoformat(integration["authentication_expires_at"])
            if datetime.utcnow() >= expires_at:
                # Token expired, refresh it
                return await self._refresh_access_token(integration)

        return integration["authentication_token"]

    async def _refresh_access_token(
        self,
        integration: Dict[str, Any]
    ) -> str:
        """Refresh Google access token using refresh token"""
        try:
            auth_config = integration.get("authentication_config", {})
            refresh_token = auth_config.get("refresh_token")

            if not refresh_token:
                raise Exception("No refresh token available")

            # Request new access token
            response = await self.http_client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": refresh_token,
                    "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                    "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                }
            )

            if response.status_code != 200:
                raise Exception(f"Token refresh failed: {response.text}")

            tokens = response.json()
            new_access_token = tokens["access_token"]
            expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

            # Update integration
            supabase.table('a2a_user_integrations') \
                .update({
                    'authentication_token': new_access_token,
                    'authentication_expires_at': expires_at.isoformat()
                }) \
                .eq('integration_id', integration["integration_id"]) \
                .execute()

            return new_access_token

        except Exception as e:
            print(f"Error refreshing Google token: {e}")
            raise

    async def _check_event_conflicts(
        self,
        user_id: str,
        google_event: Dict[str, Any]
    ) -> None:
        """Check for conflicts between Google Calendar event and training sessions"""
        # Extract event times
        start = google_event.get("start", {}).get("dateTime")
        end = google_event.get("end", {}).get("dateTime")

        if not start or not end:
            return

        start_time = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_time = datetime.fromisoformat(end.replace("Z", "+00:00"))

        # Check for conflicting training sessions
        conflicts = supabase.table('training_sessions') \
            .select('id, scheduled_start, scheduled_end') \
            .eq('client_id', user_id) \
            .eq('status', 'scheduled') \
            .gte('scheduled_end', start_time.isoformat()) \
            .lte('scheduled_start', end_time.isoformat()) \
            .execute()

        if conflicts.data:
            # Log conflict warning
            print(f"Calendar conflict detected for user {user_id}: {len(conflicts.data)} sessions")

            # Could send notification to user/trainer here

    async def _sync_fitos_event(
        self,
        user_id: str,
        session_id: str,
        google_event: Dict[str, Any]
    ) -> None:
        """Sync changes from Google Calendar back to FitOS session"""
        # Extract event times
        start = google_event.get("start", {}).get("dateTime")
        end = google_event.get("end", {}).get("dateTime")

        if not start or not end:
            return

        start_time = datetime.fromisoformat(start.replace("Z", "+00:00"))
        end_time = datetime.fromisoformat(end.replace("Z", "+00:00"))

        # Update training session if times changed
        supabase.table('training_sessions') \
            .update({
                'scheduled_start': start_time.isoformat(),
                'scheduled_end': end_time.isoformat(),
                'updated_at': datetime.utcnow().isoformat()
            }) \
            .eq('id', session_id) \
            .execute()

    async def disconnect_user(
        self,
        user_id: str
    ) -> bool:
        """Disconnect Google Calendar integration for a user"""
        try:
            # Get integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return False

            # Revoke Google token
            await self.http_client.post(
                "https://oauth2.googleapis.com/revoke",
                params={
                    "token": integration["authentication_token"]
                }
            )

            # Disable integration
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.disable_integration(
                integration_id=integration["integration_id"]
            )

            return True

        except Exception as e:
            print(f"Error disconnecting Google Calendar: {e}")
            return False


# Singleton instance
google_calendar_integration = GoogleCalendarIntegration()
