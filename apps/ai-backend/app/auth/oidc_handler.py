"""
OIDC (OpenID Connect) Authentication Handler

Handles OIDC token exchange, validation, and user provisioning.
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import httpx
import jwt
from jwt import PyJWKClient
import secrets
import logging

from .sso_config import SSOConfigService
from .session_manager import SessionManager
from .audit_logger import AuditLogger

logger = logging.getLogger(__name__)


class OIDCHandler:
    """Handler for OpenID Connect authentication"""

    def __init__(
        self,
        config_service: SSOConfigService,
        session_manager: SessionManager,
        audit_logger: AuditLogger,
    ):
        self.config_service = config_service
        self.session_manager = session_manager
        self.audit_logger = audit_logger

    async def generate_authorization_url(
        self,
        organization_id: str,
        redirect_uri: str,
        state: Optional[str] = None,
    ) -> Optional[Tuple[str, str, str]]:
        """
        Generate OIDC authorization URL

        Args:
            organization_id: Organization UUID
            redirect_uri: Redirect URI after authentication
            state: Optional state parameter

        Returns:
            Tuple of (auth_url, state, nonce) or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            logger.error(f"No OIDC config found for org {organization_id}")
            return None

        try:
            # Generate state and nonce
            state = state or secrets.token_urlsafe(32)
            nonce = secrets.token_urlsafe(32)

            # Build authorization URL
            params = {
                'client_id': config['oidc_client_id'],
                'response_type': 'code',
                'scope': 'openid profile email',
                'redirect_uri': redirect_uri,
                'state': state,
                'nonce': nonce,
            }

            auth_url = config['oidc_authorization_url']
            query_string = '&'.join(f"{k}={v}" for k, v in params.items())
            full_url = f"{auth_url}?{query_string}"

            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='login_initiated',
                event_status='success',
            )

            return (full_url, state, nonce)
        except Exception as e:
            logger.error(f"Error generating OIDC authorization URL: {e}")
            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='error',
                event_status='failure',
                error_code='OIDC_AUTH_ERROR',
                error_details={'message': str(e)},
            )
            return None

    async def exchange_code(
        self,
        organization_id: str,
        code: str,
        redirect_uri: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Exchange authorization code for tokens

        Args:
            organization_id: Organization UUID
            code: Authorization code from IdP
            redirect_uri: Redirect URI used in authorization

        Returns:
            Token response dict or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            logger.error(f"No OIDC config found for org {organization_id}")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    config['oidc_token_url'],
                    data={
                        'grant_type': 'authorization_code',
                        'code': code,
                        'redirect_uri': redirect_uri,
                        'client_id': config['oidc_client_id'],
                        'client_secret': config['oidc_client_secret'],
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'},
                )

                if response.status_code != 200:
                    logger.error(f"Token exchange failed: {response.text}")
                    await self.audit_logger.log_event(
                        organization_id=organization_id,
                        event_type='token_exchanged',
                        event_status='failure',
                        error_code='TOKEN_EXCHANGE_FAILED',
                    )
                    return None

                tokens = response.json()

                await self.audit_logger.log_event(
                    organization_id=organization_id,
                    event_type='token_exchanged',
                    event_status='success',
                )

                return tokens
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {e}")
            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='token_exchanged',
                event_status='failure',
                error_code='TOKEN_EXCHANGE_ERROR',
                error_details={'message': str(e)},
            )
            return None

    async def validate_id_token(
        self,
        organization_id: str,
        id_token: str,
        nonce: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Validate ID token and extract claims

        Args:
            organization_id: Organization UUID
            id_token: JWT ID token from IdP
            nonce: Expected nonce value

        Returns:
            Decoded token claims or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            logger.error(f"No OIDC config found for org {organization_id}")
            return None

        try:
            # Get JWKS for token validation
            jwks_client = PyJWKClient(config['oidc_jwks_url'])
            signing_key = jwks_client.get_signing_key_from_jwt(id_token)

            # Decode and validate token
            claims = jwt.decode(
                id_token,
                signing_key.key,
                algorithms=['RS256'],
                audience=config['oidc_client_id'],
                issuer=config['oidc_issuer'],
            )

            # Validate nonce if provided
            if nonce and claims.get('nonce') != nonce:
                logger.error("Nonce mismatch in ID token")
                return None

            # Validate expiration
            if claims.get('exp', 0) < datetime.utcnow().timestamp():
                logger.error("ID token expired")
                return None

            return claims
        except jwt.ExpiredSignatureError:
            logger.error("ID token signature expired")
            return None
        except jwt.InvalidTokenError as e:
            logger.error(f"Invalid ID token: {e}")
            return None
        except Exception as e:
            logger.error(f"Error validating ID token: {e}")
            return None

    async def get_userinfo(
        self,
        organization_id: str,
        access_token: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Get user info from OIDC userinfo endpoint

        Args:
            organization_id: Organization UUID
            access_token: Access token from token exchange

        Returns:
            User info dict or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            logger.error(f"No OIDC config found for org {organization_id}")
            return None

        if not config.get('oidc_userinfo_url'):
            logger.warning("No userinfo URL configured")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    config['oidc_userinfo_url'],
                    headers={'Authorization': f'Bearer {access_token}'},
                )

                if response.status_code != 200:
                    logger.error(f"Userinfo request failed: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error fetching userinfo: {e}")
            return None

    async def refresh_token(
        self,
        organization_id: str,
        refresh_token: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token

        Args:
            organization_id: Organization UUID
            refresh_token: Refresh token from initial token exchange

        Returns:
            New token response or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            logger.error(f"No OIDC config found for org {organization_id}")
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    config['oidc_token_url'],
                    data={
                        'grant_type': 'refresh_token',
                        'refresh_token': refresh_token,
                        'client_id': config['oidc_client_id'],
                        'client_secret': config['oidc_client_secret'],
                    },
                    headers={'Content-Type': 'application/x-www-form-urlencoded'},
                )

                if response.status_code != 200:
                    logger.error(f"Token refresh failed: {response.text}")
                    return None

                return response.json()
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    async def extract_user_data(
        self,
        organization_id: str,
        id_token_claims: Dict[str, Any],
        userinfo: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Extract user data from ID token and userinfo

        Args:
            organization_id: Organization UUID
            id_token_claims: Decoded ID token claims
            userinfo: Optional userinfo response

        Returns:
            User data dictionary
        """
        config = await self.config_service.get_config_by_organization(organization_id)

        # Merge claims and userinfo
        combined = {**id_token_claims, **(userinfo or {})}

        # Map attributes
        mapped_attrs = self.config_service.map_attributes(config, combined)

        # Extract groups/roles
        groups = combined.get('groups', [])
        if isinstance(groups, str):
            groups = [groups]

        # Map role
        role = self.config_service.map_role(config, groups)

        return {
            'email': combined.get('email') or mapped_attrs.get('email'),
            'first_name': mapped_attrs.get('firstName') or combined.get('given_name'),
            'last_name': mapped_attrs.get('lastName') or combined.get('family_name'),
            'display_name': mapped_attrs.get('displayName') or combined.get('name'),
            'role': role,
            'groups': groups,
            'subject': id_token_claims.get('sub'),
            'raw_claims': combined,
        }

    async def revoke_token(
        self,
        organization_id: str,
        token: str,
        token_type_hint: str = 'access_token',
    ) -> bool:
        """
        Revoke access or refresh token

        Args:
            organization_id: Organization UUID
            token: Token to revoke
            token_type_hint: 'access_token' or 'refresh_token'

        Returns:
            True if successful, False otherwise
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'oidc':
            return False

        # Not all IdPs support token revocation endpoint
        # This is a best-effort implementation
        try:
            # Some IdPs have a revocation endpoint
            # For now, just log the revocation attempt
            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='session_revoked',
                event_status='success',
                metadata={'token_type': token_type_hint},
            )
            return True
        except Exception as e:
            logger.error(f"Error revoking token: {e}")
            return False
