"""
SSO Audit Logger

Comprehensive audit logging for SSO events (compliance requirement).
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any
from datetime import datetime
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class AuditLogger:
    """Service for SSO audit logging"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def log_event(
        self,
        organization_id: Optional[str],
        event_type: str,
        event_status: str,
        user_id: Optional[str] = None,
        sso_config_id: Optional[str] = None,
        event_message: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_code: Optional[str] = None,
        error_details: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """
        Log an SSO audit event

        Args:
            organization_id: Organization UUID
            event_type: Type of event (login_success, login_failure, etc.)
            event_status: Event status (success, failure, pending)
            user_id: User UUID (if applicable)
            sso_config_id: SSO configuration UUID (if applicable)
            event_message: Human-readable event message
            ip_address: Client IP address
            user_agent: Client user agent
            error_code: Error code (if failure)
            error_details: Error details JSON
            metadata: Additional metadata

        Returns:
            Log entry ID or None on error
        """
        try:
            data = {
                'organization_id': organization_id,
                'user_id': user_id,
                'sso_config_id': sso_config_id,
                'event_type': event_type,
                'event_status': event_status,
                'event_message': event_message,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'error_code': error_code,
                'error_details': error_details,
                'metadata': metadata,
            }

            response = (
                self.supabase.table('sso_audit_log')
                .insert(data)
                .execute()
            )

            log_id = response.data[0]['id'] if response.data else None

            # Also log to application logger for real-time monitoring
            log_level = logging.INFO if event_status == 'success' else logging.WARNING
            logger.log(
                log_level,
                f"SSO Event: {event_type} - {event_status} - Org: {organization_id} - User: {user_id}",
            )

            return log_id
        except Exception as e:
            logger.error(f"Error logging SSO audit event: {e}")
            return None

    async def log_login_initiated(
        self,
        organization_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Log SSO login initiated"""
        return await self.log_event(
            organization_id=organization_id,
            event_type='login_initiated',
            event_status='pending',
            event_message='SSO login initiated',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata,
        )

    async def log_login_success(
        self,
        organization_id: str,
        user_id: str,
        sso_config_id: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Log successful SSO login"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=sso_config_id,
            event_type='login_success',
            event_status='success',
            event_message='SSO login successful',
            ip_address=ip_address,
            user_agent=user_agent,
            metadata=metadata,
        )

    async def log_login_failure(
        self,
        organization_id: str,
        error_code: str,
        error_message: str,
        user_id: Optional[str] = None,
        sso_config_id: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_details: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Log failed SSO login"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=sso_config_id,
            event_type='login_failure',
            event_status='failure',
            event_message=f'SSO login failed: {error_message}',
            ip_address=ip_address,
            user_agent=user_agent,
            error_code=error_code,
            error_details=error_details,
        )

    async def log_logout(
        self,
        organization_id: str,
        user_id: str,
        sso_config_id: str,
        ip_address: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[str]:
        """Log SSO logout"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=sso_config_id,
            event_type='logout',
            event_status='success',
            event_message='SSO logout',
            ip_address=ip_address,
            metadata=metadata,
        )

    async def log_jit_provision(
        self,
        organization_id: str,
        user_id: str,
        sso_config_id: str,
        user_email: str,
        role: str,
        ip_address: Optional[str] = None,
    ) -> Optional[str]:
        """Log just-in-time user provisioning"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=sso_config_id,
            event_type='jit_provision',
            event_status='success',
            event_message=f'User provisioned: {user_email} as {role}',
            ip_address=ip_address,
            metadata={'email': user_email, 'role': role},
        )

    async def log_role_mapped(
        self,
        organization_id: str,
        user_id: str,
        sso_config_id: str,
        idp_groups: list[str],
        mapped_role: str,
    ) -> Optional[str]:
        """Log role mapping"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=sso_config_id,
            event_type='role_mapped',
            event_status='success',
            event_message=f'Mapped groups to role: {mapped_role}',
            metadata={'idp_groups': idp_groups, 'mapped_role': mapped_role},
        )

    async def log_session_expired(
        self,
        organization_id: str,
        user_id: str,
        session_id: str,
        reason: str,
    ) -> Optional[str]:
        """Log session expiration"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type='session_expired',
            event_status='success',
            event_message=f'Session expired: {reason}',
            metadata={'session_id': session_id, 'reason': reason},
        )

    async def log_session_revoked(
        self,
        organization_id: str,
        user_id: str,
        session_id: str,
        revoked_by: Optional[str] = None,
    ) -> Optional[str]:
        """Log session revocation"""
        return await self.log_event(
            organization_id=organization_id,
            user_id=user_id,
            event_type='session_revoked',
            event_status='success',
            event_message='Session revoked',
            metadata={'session_id': session_id, 'revoked_by': revoked_by},
        )

    async def log_config_created(
        self,
        organization_id: str,
        sso_config_id: str,
        provider_type: str,
        provider_name: str,
        created_by: str,
    ) -> Optional[str]:
        """Log SSO configuration creation"""
        return await self.log_event(
            organization_id=organization_id,
            sso_config_id=sso_config_id,
            event_type='config_created',
            event_status='success',
            event_message=f'SSO config created: {provider_name} ({provider_type})',
            metadata={
                'provider_type': provider_type,
                'provider_name': provider_name,
                'created_by': created_by,
            },
        )

    async def log_config_updated(
        self,
        organization_id: str,
        sso_config_id: str,
        updated_by: str,
        changes: Dict[str, Any],
    ) -> Optional[str]:
        """Log SSO configuration update"""
        return await self.log_event(
            organization_id=organization_id,
            sso_config_id=sso_config_id,
            event_type='config_updated',
            event_status='success',
            event_message='SSO config updated',
            metadata={'updated_by': updated_by, 'changes': changes},
        )

    async def log_config_deleted(
        self,
        organization_id: str,
        sso_config_id: str,
        deleted_by: str,
    ) -> Optional[str]:
        """Log SSO configuration deletion"""
        return await self.log_event(
            organization_id=organization_id,
            sso_config_id=sso_config_id,
            event_type='config_deleted',
            event_status='success',
            event_message='SSO config deleted',
            metadata={'deleted_by': deleted_by},
        )

    async def get_audit_log(
        self,
        organization_id: Optional[str] = None,
        user_id: Optional[str] = None,
        event_type: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 100,
    ) -> list[Dict[str, Any]]:
        """
        Query audit log

        Args:
            organization_id: Filter by organization
            user_id: Filter by user
            event_type: Filter by event type
            start_date: Filter by start date
            end_date: Filter by end date
            limit: Maximum number of results

        Returns:
            List of audit log entries
        """
        try:
            query = self.supabase.table('sso_audit_log').select('*')

            if organization_id:
                query = query.eq('organization_id', organization_id)
            if user_id:
                query = query.eq('user_id', user_id)
            if event_type:
                query = query.eq('event_type', event_type)
            if start_date:
                query = query.gte('created_at', start_date.isoformat())
            if end_date:
                query = query.lte('created_at', end_date.isoformat())

            query = query.order('created_at', desc=True).limit(limit)

            response = query.execute()
            return response.data if response.data else []
        except Exception as e:
            logger.error(f"Error querying audit log: {e}")
            return []

    async def get_failed_login_attempts(
        self,
        organization_id: str,
        hours: int = 24,
    ) -> int:
        """
        Get count of failed login attempts in recent hours

        Args:
            organization_id: Organization UUID
            hours: Number of hours to look back

        Returns:
            Count of failed login attempts
        """
        try:
            cutoff = datetime.utcnow() - timedelta(hours=hours)

            response = (
                self.supabase.table('sso_audit_log')
                .select('id', count='exact')
                .eq('organization_id', organization_id)
                .eq('event_type', 'login_failure')
                .gte('created_at', cutoff.isoformat())
                .execute()
            )

            return response.count if hasattr(response, 'count') else 0
        except Exception as e:
            logger.error(f"Error counting failed login attempts: {e}")
            return 0
