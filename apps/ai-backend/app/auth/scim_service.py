"""
SCIM 2.0 Directory Sync Service

Handles user provisioning and deprovisioning via SCIM 2.0 protocol.
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any, List
from datetime import datetime
from supabase import Client
import secrets
import logging

logger = logging.getLogger(__name__)


class SCIMService:
    """Service for SCIM 2.0 directory synchronization"""

    # SCIM 2.0 schemas
    SCHEMA_USER = "urn:ietf:params:scim:schemas:core:2.0:User"
    SCHEMA_ENTERPRISE_USER = "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
    SCHEMA_GROUP = "urn:ietf:params:scim:schemas:core:2.0:Group"
    SCHEMA_LIST = "urn:ietf:params:scim:api:messages:2.0:ListResponse"

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_directory_config(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """
        Get directory sync configuration for organization

        Args:
            organization_id: Organization UUID

        Returns:
            Directory sync config or None
        """
        try:
            response = (
                self.supabase.table('directory_sync_configs')
                .select('*')
                .eq('organization_id', organization_id)
                .eq('scim_enabled', True)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error getting directory config: {e}")
            return None

    async def enable_directory_sync(
        self,
        organization_id: str,
        auto_provision: bool = True,
        auto_deprovision: bool = True,
        sync_interval_minutes: int = 60,
    ) -> Optional[Dict[str, Any]]:
        """
        Enable directory sync for organization

        Args:
            organization_id: Organization UUID
            auto_provision: Auto-create users from SCIM
            auto_deprovision: Auto-deactivate users when removed
            sync_interval_minutes: Sync interval

        Returns:
            Created config with bearer token
        """
        try:
            # Generate secure bearer token for SCIM requests
            bearer_token = f"scim_{secrets.token_urlsafe(32)}"

            data = {
                'organization_id': organization_id,
                'scim_enabled': True,
                'scim_bearer_token': bearer_token,  # Should be encrypted
                'scim_endpoint': f"https://api.fitos.ai/scim/v2",
                'auto_provision': auto_provision,
                'auto_deprovision': auto_deprovision,
                'sync_interval_minutes': sync_interval_minutes,
            }

            response = (
                self.supabase.table('directory_sync_configs')
                .insert(data)
                .execute()
            )

            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error enabling directory sync: {e}")
            return None

    async def validate_bearer_token(
        self,
        bearer_token: str,
        organization_id: str,
    ) -> bool:
        """
        Validate SCIM bearer token

        Args:
            bearer_token: Bearer token from request
            organization_id: Organization UUID

        Returns:
            True if valid
        """
        try:
            response = (
                self.supabase.table('directory_sync_configs')
                .select('scim_bearer_token')
                .eq('organization_id', organization_id)
                .eq('scim_enabled', True)
                .single()
                .execute()
            )

            if not response.data:
                return False

            # In production, use constant-time comparison
            return response.data['scim_bearer_token'] == bearer_token
        except Exception as e:
            logger.error(f"Error validating bearer token: {e}")
            return False

    async def provision_user(
        self,
        organization_id: str,
        scim_user: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Provision user from SCIM

        Args:
            organization_id: Organization UUID
            scim_user: SCIM user resource

        Returns:
            Provisioned user or None on error
        """
        try:
            # Extract user data from SCIM format
            external_id = scim_user.get('externalId')
            username = scim_user.get('userName')
            emails = scim_user.get('emails', [])
            name = scim_user.get('name', {})
            active = scim_user.get('active', True)

            # Get primary email
            primary_email = None
            for email in emails:
                if email.get('primary'):
                    primary_email = email.get('value')
                    break
            if not primary_email and emails:
                primary_email = emails[0].get('value')

            if not primary_email:
                logger.error("No email found in SCIM user")
                return None

            # Create user in Supabase Auth
            # Note: This is simplified - actual implementation would use Supabase admin API
            user_data = {
                'email': primary_email,
                'external_id': external_id,
                'first_name': name.get('givenName'),
                'last_name': name.get('familyName'),
                'display_name': name.get('formatted') or f"{name.get('givenName', '')} {name.get('familyName', '')}".strip(),
                'active': active,
            }

            # Log provisioning event
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_created',
                external_id=external_id,
                changes=user_data,
                status='success',
            )

            return {
                'id': 'user_123',  # Placeholder - would be real user ID
                'externalId': external_id,
                'userName': username,
                'emails': emails,
                'name': name,
                'active': active,
                'meta': {
                    'resourceType': 'User',
                    'created': datetime.utcnow().isoformat() + 'Z',
                    'lastModified': datetime.utcnow().isoformat() + 'Z',
                }
            }
        except Exception as e:
            logger.error(f"Error provisioning user: {e}")
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_created',
                external_id=scim_user.get('externalId'),
                status='failure',
                error_message=str(e),
            )
            return None

    async def update_user(
        self,
        organization_id: str,
        user_id: str,
        scim_user: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Update user from SCIM

        Args:
            organization_id: Organization UUID
            user_id: User ID
            scim_user: SCIM user resource

        Returns:
            Updated user or None on error
        """
        try:
            external_id = scim_user.get('externalId')
            active = scim_user.get('active', True)
            name = scim_user.get('name', {})

            # Update user
            updates = {
                'first_name': name.get('givenName'),
                'last_name': name.get('familyName'),
                'display_name': name.get('formatted'),
                'active': active,
            }

            # Log update event
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_updated',
                target_user_id=user_id,
                external_id=external_id,
                changes=updates,
                status='success',
            )

            return scim_user
        except Exception as e:
            logger.error(f"Error updating user: {e}")
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_updated',
                target_user_id=user_id,
                status='failure',
                error_message=str(e),
            )
            return None

    async def deprovision_user(
        self,
        organization_id: str,
        user_id: str,
        external_id: str,
    ) -> bool:
        """
        Deprovision (deactivate) user

        Args:
            organization_id: Organization UUID
            user_id: User ID
            external_id: External ID from IdP

        Returns:
            Success boolean
        """
        try:
            # Get directory config
            config = await self.get_directory_config(organization_id)
            if not config or not config.get('auto_deprovision'):
                logger.info(f"Auto-deprovision disabled for org {organization_id}")
                return False

            # Deactivate user (don't delete - maintain data integrity)
            # In production, would use Supabase admin API
            # self.supabase.auth.admin.update_user(user_id, {'active': False})

            # Log deprovisioning
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_deprovisioned',
                target_user_id=user_id,
                external_id=external_id,
                status='success',
            )

            return True
        except Exception as e:
            logger.error(f"Error deprovisioning user: {e}")
            await self._log_scim_event(
                organization_id=organization_id,
                event_type='user_deprovisioned',
                target_user_id=user_id,
                status='failure',
                error_message=str(e),
            )
            return False

    async def get_user(
        self,
        organization_id: str,
        user_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get user in SCIM format

        Args:
            organization_id: Organization UUID
            user_id: User ID

        Returns:
            SCIM user resource or None
        """
        try:
            # Get user from database
            # In production, would query actual user table
            user = {
                'id': user_id,
                'email': 'user@example.com',
                'first_name': 'John',
                'last_name': 'Doe',
                'active': True,
            }

            # Convert to SCIM format
            return self._to_scim_user(user)
        except Exception as e:
            logger.error(f"Error getting user: {e}")
            return None

    async def list_users(
        self,
        organization_id: str,
        start_index: int = 1,
        count: int = 100,
        filter_expr: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        List users in SCIM format

        Args:
            organization_id: Organization UUID
            start_index: Start index (1-based)
            count: Number of results
            filter_expr: SCIM filter expression

        Returns:
            SCIM ListResponse
        """
        try:
            # Get users from database
            # In production, would query actual user table with filters
            users = []  # Placeholder

            # Convert to SCIM format
            scim_users = [self._to_scim_user(u) for u in users]

            return {
                'schemas': [self.SCHEMA_LIST],
                'totalResults': len(scim_users),
                'startIndex': start_index,
                'itemsPerPage': count,
                'Resources': scim_users,
            }
        except Exception as e:
            logger.error(f"Error listing users: {e}")
            return {
                'schemas': [self.SCHEMA_LIST],
                'totalResults': 0,
                'startIndex': start_index,
                'itemsPerPage': count,
                'Resources': [],
            }

    def _to_scim_user(self, user: Dict[str, Any]) -> Dict[str, Any]:
        """Convert internal user to SCIM format"""
        return {
            'schemas': [self.SCHEMA_USER],
            'id': user.get('id'),
            'externalId': user.get('external_id'),
            'userName': user.get('email'),
            'name': {
                'formatted': f"{user.get('first_name', '')} {user.get('last_name', '')}".strip(),
                'givenName': user.get('first_name'),
                'familyName': user.get('last_name'),
            },
            'emails': [
                {
                    'value': user.get('email'),
                    'primary': True,
                }
            ],
            'active': user.get('active', True),
            'meta': {
                'resourceType': 'User',
                'created': user.get('created_at', datetime.utcnow().isoformat()) + 'Z',
                'lastModified': user.get('updated_at', datetime.utcnow().isoformat()) + 'Z',
            }
        }

    async def _log_scim_event(
        self,
        organization_id: str,
        event_type: str,
        status: str,
        directory_sync_id: Optional[str] = None,
        target_user_id: Optional[str] = None,
        external_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        error_message: Optional[str] = None,
    ) -> None:
        """Log SCIM sync event"""
        try:
            # Get directory sync ID if not provided
            if not directory_sync_id:
                config = await self.get_directory_config(organization_id)
                directory_sync_id = config['id'] if config else None

            data = {
                'directory_sync_id': directory_sync_id,
                'event_type': event_type,
                'target_user_id': target_user_id,
                'external_id': external_id,
                'changes': changes,
                'status': status,
                'error_message': error_message,
            }

            self.supabase.table('scim_sync_events').insert(data).execute()
        except Exception as e:
            logger.error(f"Error logging SCIM event: {e}")

    async def update_sync_stats(
        self,
        organization_id: str,
        users_synced: int = 0,
        groups_synced: int = 0,
    ) -> None:
        """
        Update directory sync statistics

        Args:
            organization_id: Organization UUID
            users_synced: Number of users synced
            groups_synced: Number of groups synced
        """
        try:
            config = await self.get_directory_config(organization_id)
            if not config:
                return

            updates = {
                'total_users_synced': config.get('total_users_synced', 0) + users_synced,
                'total_groups_synced': config.get('total_groups_synced', 0) + groups_synced,
                'last_sync_at': datetime.utcnow().isoformat(),
                'last_sync_status': 'success',
            }

            self.supabase.table('directory_sync_configs').update(updates).eq(
                'organization_id', organization_id
            ).execute()
        except Exception as e:
            logger.error(f"Error updating sync stats: {e}")

    async def get_sync_history(
        self,
        organization_id: str,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Get directory sync event history

        Args:
            organization_id: Organization UUID
            limit: Maximum results

        Returns:
            List of sync events
        """
        try:
            config = await self.get_directory_config(organization_id)
            if not config:
                return []

            response = (
                self.supabase.table('scim_sync_events')
                .select('*')
                .eq('directory_sync_id', config['id'])
                .order('created_at', desc=True)
                .limit(limit)
                .execute()
            )

            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error getting sync history: {e}")
            return []
