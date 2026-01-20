"""
SSO Session Manager

Manages SSO session lifecycle, expiration, and idle timeout.
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any
from datetime import datetime, timedelta
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class SessionManager:
    """Service for managing SSO sessions"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def create_session(
        self,
        user_id: str,
        organization_id: str,
        sso_config_id: str,
        provider_type: str,
        session_data: Dict[str, Any],
        session_duration_minutes: int = 480,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new SSO session

        Args:
            user_id: User UUID
            organization_id: Organization UUID
            sso_config_id: SSO configuration UUID
            provider_type: 'saml' or 'oidc'
            session_data: Session-specific data (tokens, session_index, etc.)
            session_duration_minutes: Session duration in minutes
            ip_address: Client IP address
            user_agent: Client user agent

        Returns:
            Created session dict or None on error
        """
        try:
            expires_at = datetime.utcnow() + timedelta(minutes=session_duration_minutes)

            data = {
                'user_id': user_id,
                'organization_id': organization_id,
                'sso_config_id': sso_config_id,
                'provider_type': provider_type,
                'session_index': session_data.get('session_index'),
                'name_id': session_data.get('name_id') or session_data.get('subject'),
                'expires_at': expires_at.isoformat(),
                'ip_address': ip_address,
                'user_agent': user_agent,
                'status': 'active',
            }

            # Add OIDC tokens if present
            if provider_type == 'oidc':
                data.update({
                    'access_token': session_data.get('access_token'),
                    'refresh_token': session_data.get('refresh_token'),
                    'id_token': session_data.get('id_token'),
                })

            response = (
                self.supabase.table('sso_sessions')
                .insert(data)
                .execute()
            )

            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating SSO session: {e}")
            return None

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get SSO session by ID

        Args:
            session_id: Session UUID

        Returns:
            Session dict or None if not found
        """
        try:
            response = (
                self.supabase.table('sso_sessions')
                .select('*')
                .eq('id', session_id)
                .eq('status', 'active')
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching session {session_id}: {e}")
            return None

    async def get_user_sessions(
        self,
        user_id: str,
        active_only: bool = True,
    ) -> list[Dict[str, Any]]:
        """
        Get all sessions for a user

        Args:
            user_id: User UUID
            active_only: Only return active sessions

        Returns:
            List of session dicts
        """
        try:
            query = self.supabase.table('sso_sessions').select('*').eq('user_id', user_id)

            if active_only:
                query = query.eq('status', 'active')

            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error fetching user sessions: {e}")
            return []

    async def update_activity(self, session_id: str) -> bool:
        """
        Update session last activity timestamp

        Args:
            session_id: Session UUID

        Returns:
            True if successful, False otherwise
        """
        try:
            self.supabase.table('sso_sessions').update(
                {'last_activity_at': datetime.utcnow().isoformat()}
            ).eq('id', session_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error updating session activity: {e}")
            return False

    async def revoke_session(self, session_id: str) -> bool:
        """
        Revoke an SSO session

        Args:
            session_id: Session UUID

        Returns:
            True if successful, False otherwise
        """
        try:
            self.supabase.table('sso_sessions').update(
                {'status': 'revoked'}
            ).eq('id', session_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error revoking session: {e}")
            return False

    async def revoke_user_sessions(self, user_id: str) -> bool:
        """
        Revoke all active sessions for a user

        Args:
            user_id: User UUID

        Returns:
            True if successful, False otherwise
        """
        try:
            self.supabase.table('sso_sessions').update(
                {'status': 'revoked'}
            ).eq('user_id', user_id).eq('status', 'active').execute()
            return True
        except Exception as e:
            logger.error(f"Error revoking user sessions: {e}")
            return False

    async def expire_idle_sessions(self, idle_timeout_minutes: int = 15) -> int:
        """
        Expire sessions that have been idle too long

        Args:
            idle_timeout_minutes: Idle timeout in minutes

        Returns:
            Number of sessions expired
        """
        try:
            cutoff = datetime.utcnow() - timedelta(minutes=idle_timeout_minutes)

            response = (
                self.supabase.table('sso_sessions')
                .update({'status': 'expired'})
                .eq('status', 'active')
                .lt('last_activity_at', cutoff.isoformat())
                .execute()
            )

            count = len(response.data) if response.data else 0
            if count > 0:
                logger.info(f"Expired {count} idle SSO sessions")
            return count
        except Exception as e:
            logger.error(f"Error expiring idle sessions: {e}")
            return 0

    async def expire_all_expired_sessions(self) -> int:
        """
        Expire all sessions past their expiration time

        Returns:
            Number of sessions expired
        """
        try:
            now = datetime.utcnow()

            response = (
                self.supabase.table('sso_sessions')
                .update({'status': 'expired'})
                .eq('status', 'active')
                .lt('expires_at', now.isoformat())
                .execute()
            )

            count = len(response.data) if response.data else 0
            if count > 0:
                logger.info(f"Expired {count} SSO sessions")
            return count
        except Exception as e:
            logger.error(f"Error expiring sessions: {e}")
            return 0

    async def refresh_oidc_session(
        self,
        session_id: str,
        new_tokens: Dict[str, Any],
    ) -> bool:
        """
        Refresh OIDC session with new tokens

        Args:
            session_id: Session UUID
            new_tokens: New token response from IdP

        Returns:
            True if successful, False otherwise
        """
        try:
            updates = {
                'access_token': new_tokens.get('access_token'),
                'last_activity_at': datetime.utcnow().isoformat(),
            }

            # Update refresh token if provided
            if 'refresh_token' in new_tokens:
                updates['refresh_token'] = new_tokens['refresh_token']

            # Update ID token if provided
            if 'id_token' in new_tokens:
                updates['id_token'] = new_tokens['id_token']

            # Extend expiration if new expires_in provided
            if 'expires_in' in new_tokens:
                new_expires = datetime.utcnow() + timedelta(seconds=new_tokens['expires_in'])
                updates['expires_at'] = new_expires.isoformat()

            self.supabase.table('sso_sessions').update(updates).eq('id', session_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error refreshing OIDC session: {e}")
            return False

    async def validate_session(
        self,
        session_id: str,
        check_idle: bool = True,
        idle_timeout_minutes: int = 15,
    ) -> Optional[Dict[str, Any]]:
        """
        Validate session is still active and not expired

        Args:
            session_id: Session UUID
            check_idle: Check idle timeout
            idle_timeout_minutes: Idle timeout in minutes

        Returns:
            Valid session dict or None if invalid
        """
        session = await self.get_session(session_id)
        if not session:
            return None

        # Check expiration
        expires_at = datetime.fromisoformat(session['expires_at'].replace('Z', '+00:00'))
        if datetime.utcnow() >= expires_at:
            await self.revoke_session(session_id)
            return None

        # Check idle timeout
        if check_idle:
            last_activity = datetime.fromisoformat(
                session['last_activity_at'].replace('Z', '+00:00')
            )
            idle_cutoff = datetime.utcnow() - timedelta(minutes=idle_timeout_minutes)
            if last_activity < idle_cutoff:
                await self.revoke_session(session_id)
                return None

        # Update activity
        await self.update_activity(session_id)

        return session
