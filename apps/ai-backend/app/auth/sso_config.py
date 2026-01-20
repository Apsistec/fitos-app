"""
SSO Configuration Service

Manages SSO configurations for organizations.
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any
from datetime import datetime
from supabase import Client
import logging

logger = logging.getLogger(__name__)


class SSOConfigService:
    """Service for managing SSO configurations"""

    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def get_config_by_organization(self, organization_id: str) -> Optional[Dict[str, Any]]:
        """
        Get SSO configuration for an organization

        Args:
            organization_id: Organization UUID

        Returns:
            SSO configuration dict or None if not found
        """
        try:
            response = (
                self.supabase.table('sso_configurations')
                .select('*')
                .eq('organization_id', organization_id)
                .eq('enabled', True)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching SSO config for org {organization_id}: {e}")
            return None

    async def get_config_by_id(self, config_id: str) -> Optional[Dict[str, Any]]:
        """
        Get SSO configuration by ID

        Args:
            config_id: SSO configuration UUID

        Returns:
            SSO configuration dict or None if not found
        """
        try:
            response = (
                self.supabase.table('sso_configurations')
                .select('*')
                .eq('id', config_id)
                .single()
                .execute()
            )
            return response.data if response.data else None
        except Exception as e:
            logger.error(f"Error fetching SSO config {config_id}: {e}")
            return None

    async def create_config(
        self,
        organization_id: str,
        provider_type: str,
        provider_name: str,
        config_data: Dict[str, Any],
        created_by: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Create a new SSO configuration

        Args:
            organization_id: Organization UUID
            provider_type: 'saml' or 'oidc'
            provider_name: Provider name (e.g., 'okta', 'azure_ad')
            config_data: Provider-specific configuration
            created_by: User ID creating the config

        Returns:
            Created SSO configuration or None on error
        """
        try:
            data = {
                'organization_id': organization_id,
                'provider_type': provider_type,
                'provider_name': provider_name,
                'created_by': created_by,
                'enabled': config_data.get('enabled', False),
                'enforce_sso': config_data.get('enforce_sso', False),
                'allow_jit_provisioning': config_data.get('allow_jit_provisioning', True),
                'default_role': config_data.get('default_role', 'client'),
                'role_mapping': config_data.get('role_mapping', {}),
                'attribute_mapping': config_data.get('attribute_mapping', {}),
                'session_duration_minutes': config_data.get('session_duration_minutes', 480),
                'idle_timeout_minutes': config_data.get('idle_timeout_minutes', 15),
            }

            # Add provider-specific fields
            if provider_type == 'saml':
                data.update({
                    'saml_entity_id': config_data.get('saml_entity_id'),
                    'saml_sso_url': config_data.get('saml_sso_url'),
                    'saml_certificate': config_data.get('saml_certificate'),
                    'saml_logout_url': config_data.get('saml_logout_url'),
                    'saml_sign_requests': config_data.get('saml_sign_requests', False),
                })
            elif provider_type == 'oidc':
                data.update({
                    'oidc_issuer': config_data.get('oidc_issuer'),
                    'oidc_client_id': config_data.get('oidc_client_id'),
                    'oidc_client_secret': config_data.get('oidc_client_secret'),
                    'oidc_authorization_url': config_data.get('oidc_authorization_url'),
                    'oidc_token_url': config_data.get('oidc_token_url'),
                    'oidc_userinfo_url': config_data.get('oidc_userinfo_url'),
                    'oidc_jwks_url': config_data.get('oidc_jwks_url'),
                })

            response = (
                self.supabase.table('sso_configurations')
                .insert(data)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error creating SSO config: {e}")
            return None

    async def update_config(
        self,
        config_id: str,
        updates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        """
        Update SSO configuration

        Args:
            config_id: SSO configuration UUID
            updates: Fields to update

        Returns:
            Updated SSO configuration or None on error
        """
        try:
            response = (
                self.supabase.table('sso_configurations')
                .update(updates)
                .eq('id', config_id)
                .execute()
            )
            return response.data[0] if response.data else None
        except Exception as e:
            logger.error(f"Error updating SSO config {config_id}: {e}")
            return None

    async def delete_config(self, config_id: str) -> bool:
        """
        Delete SSO configuration

        Args:
            config_id: SSO configuration UUID

        Returns:
            True if successful, False otherwise
        """
        try:
            self.supabase.table('sso_configurations').delete().eq('id', config_id).execute()
            return True
        except Exception as e:
            logger.error(f"Error deleting SSO config {config_id}: {e}")
            return False

    async def is_sso_enforced(self, organization_id: str) -> bool:
        """
        Check if SSO is enforced for an organization

        Args:
            organization_id: Organization UUID

        Returns:
            True if SSO is enforced, False otherwise
        """
        config = await self.get_config_by_organization(organization_id)
        return config.get('enforce_sso', False) if config else False

    def map_role(self, config: Dict[str, Any], idp_groups: list[str]) -> str:
        """
        Map IdP groups to FitOS role

        Args:
            config: SSO configuration
            idp_groups: List of group names from IdP

        Returns:
            Mapped role name
        """
        role_mapping = config.get('role_mapping', {})

        # Check each IdP group against the mapping
        for group in idp_groups:
            if group in role_mapping:
                return role_mapping[group]

        # Fall back to default role
        return config.get('default_role', 'client')

    def map_attributes(
        self,
        config: Dict[str, Any],
        idp_attributes: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Map IdP attributes to FitOS user fields

        Args:
            config: SSO configuration
            idp_attributes: Attributes from IdP

        Returns:
            Mapped user attributes
        """
        attribute_mapping = config.get('attribute_mapping', {
            'email': 'email',
            'firstName': 'given_name',
            'lastName': 'family_name',
            'displayName': 'name',
        })

        mapped = {}
        for fitos_field, idp_field in attribute_mapping.items():
            if idp_field in idp_attributes:
                mapped[fitos_field] = idp_attributes[idp_field]

        return mapped
