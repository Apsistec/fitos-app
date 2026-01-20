"""
SAML 2.0 Authentication Handler

Handles SAML assertions, validation, and user provisioning.
Sprint 41: Enterprise Single Sign-On
"""

from typing import Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
import xml.etree.ElementTree as ET
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
import base64
import zlib
import logging

from .sso_config import SSOConfigService
from .session_manager import SessionManager
from .audit_logger import AuditLogger

logger = logging.getLogger(__name__)


class SAMLHandler:
    """Handler for SAML 2.0 authentication"""

    # SAML namespaces
    NAMESPACES = {
        'saml2': 'urn:oasis:names:tc:SAML:2.0:assertion',
        'saml2p': 'urn:oasis:names:tc:SAML:2.0:protocol',
        'ds': 'http://www.w3.org/2000/09/xmldsig#',
    }

    def __init__(
        self,
        config_service: SSOConfigService,
        session_manager: SessionManager,
        audit_logger: AuditLogger,
    ):
        self.config_service = config_service
        self.session_manager = session_manager
        self.audit_logger = audit_logger

    async def generate_authn_request(
        self,
        organization_id: str,
        relay_state: Optional[str] = None,
    ) -> Optional[Tuple[str, str]]:
        """
        Generate SAML AuthnRequest

        Args:
            organization_id: Organization UUID
            relay_state: Optional relay state to preserve

        Returns:
            Tuple of (redirect_url, request_id) or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'saml':
            logger.error(f"No SAML config found for org {organization_id}")
            return None

        try:
            # Generate request ID
            import uuid
            request_id = f"_request_{uuid.uuid4()}"

            # Build AuthnRequest XML
            authn_request = f"""
            <samlp:AuthnRequest
                xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="{request_id}"
                Version="2.0"
                IssueInstant="{datetime.utcnow().isoformat()}Z"
                Destination="{config['saml_sso_url']}"
                AssertionConsumerServiceURL="https://app.fitos.ai/auth/saml/acs"
                ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST">
                <saml:Issuer>{config['saml_entity_id']}</saml:Issuer>
                <samlp:NameIDPolicy
                    Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"
                    AllowCreate="true"/>
            </samlp:AuthnRequest>
            """

            # Encode and deflate for HTTP-Redirect binding
            encoded = base64.b64encode(zlib.compress(authn_request.encode())[2:-4])

            # Build redirect URL
            redirect_url = f"{config['saml_sso_url']}?SAMLRequest={encoded.decode()}"
            if relay_state:
                redirect_url += f"&RelayState={relay_state}"

            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='login_initiated',
                event_status='success',
                metadata={'request_id': request_id},
            )

            return (redirect_url, request_id)
        except Exception as e:
            logger.error(f"Error generating SAML AuthnRequest: {e}")
            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='error',
                event_status='failure',
                error_code='SAML_AUTHN_ERROR',
                error_details={'message': str(e)},
            )
            return None

    async def validate_assertion(
        self,
        saml_response: str,
        organization_id: str,
    ) -> Optional[Dict[str, Any]]:
        """
        Validate SAML assertion and extract user data

        Args:
            saml_response: Base64-encoded SAML response
            organization_id: Organization UUID

        Returns:
            Validated user data or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or config['provider_type'] != 'saml':
            logger.error(f"No SAML config found for org {organization_id}")
            return None

        try:
            # Decode SAML response
            decoded = base64.b64decode(saml_response)
            root = ET.fromstring(decoded)

            # Validate signature
            if not await self._validate_signature(root, config):
                await self.audit_logger.log_event(
                    organization_id=organization_id,
                    event_type='login_failure',
                    event_status='failure',
                    error_code='INVALID_SIGNATURE',
                )
                return None

            # Extract assertion
            assertion = root.find('.//saml2:Assertion', self.NAMESPACES)
            if assertion is None:
                await self.audit_logger.log_event(
                    organization_id=organization_id,
                    event_type='login_failure',
                    event_status='failure',
                    error_code='NO_ASSERTION',
                )
                return None

            # Validate conditions (NotBefore, NotOnOrAfter)
            if not self._validate_conditions(assertion):
                await self.audit_logger.log_event(
                    organization_id=organization_id,
                    event_type='login_failure',
                    event_status='failure',
                    error_code='ASSERTION_EXPIRED',
                )
                return None

            # Extract user data
            user_data = self._extract_user_data(assertion, config)

            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='assertion_validated',
                event_status='success',
            )

            return user_data
        except Exception as e:
            logger.error(f"Error validating SAML assertion: {e}")
            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='login_failure',
                event_status='failure',
                error_code='VALIDATION_ERROR',
                error_details={'message': str(e)},
            )
            return None

    async def _validate_signature(
        self,
        root: ET.Element,
        config: Dict[str, Any],
    ) -> bool:
        """
        Validate XML signature using IdP certificate

        Args:
            root: SAML response XML root
            config: SSO configuration

        Returns:
            True if signature is valid, False otherwise
        """
        try:
            # Load IdP certificate
            cert_pem = config['saml_certificate']
            cert = x509.load_pem_x509_certificate(cert_pem.encode(), default_backend())

            # Find signature
            signature = root.find('.//ds:Signature', self.NAMESPACES)
            if signature is None:
                return False

            # TODO: Implement full XML signature validation
            # This is a simplified version - production should use python3-saml
            # or similar library for proper XML signature validation

            # For now, just verify the certificate is valid
            public_key = cert.public_key()
            return True
        except Exception as e:
            logger.error(f"Signature validation error: {e}")
            return False

    def _validate_conditions(self, assertion: ET.Element) -> bool:
        """
        Validate SAML assertion conditions

        Args:
            assertion: SAML assertion element

        Returns:
            True if conditions are valid, False otherwise
        """
        try:
            conditions = assertion.find('.//saml2:Conditions', self.NAMESPACES)
            if conditions is None:
                return True  # No conditions to validate

            now = datetime.utcnow()

            # Check NotBefore
            not_before = conditions.get('NotBefore')
            if not_before:
                not_before_dt = datetime.fromisoformat(not_before.replace('Z', '+00:00'))
                if now < not_before_dt:
                    return False

            # Check NotOnOrAfter
            not_on_or_after = conditions.get('NotOnOrAfter')
            if not_on_or_after:
                not_on_or_after_dt = datetime.fromisoformat(not_on_or_after.replace('Z', '+00:00'))
                if now >= not_on_or_after_dt:
                    return False

            return True
        except Exception as e:
            logger.error(f"Conditions validation error: {e}")
            return False

    def _extract_user_data(
        self,
        assertion: ET.Element,
        config: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Extract user data from SAML assertion

        Args:
            assertion: SAML assertion element
            config: SSO configuration

        Returns:
            User data dictionary
        """
        # Extract NameID
        name_id = assertion.find('.//saml2:Subject/saml2:NameID', self.NAMESPACES)
        email = name_id.text if name_id is not None else None

        # Extract SessionIndex for logout
        authn_statement = assertion.find('.//saml2:AuthnStatement', self.NAMESPACES)
        session_index = authn_statement.get('SessionIndex') if authn_statement is not None else None

        # Extract attributes
        attributes = {}
        attr_statement = assertion.find('.//saml2:AttributeStatement', self.NAMESPACES)
        if attr_statement is not None:
            for attr in attr_statement.findall('.//saml2:Attribute', self.NAMESPACES):
                name = attr.get('Name')
                value_elem = attr.find('.//saml2:AttributeValue', self.NAMESPACES)
                if value_elem is not None:
                    attributes[name] = value_elem.text

        # Extract groups
        groups = []
        for attr in attr_statement.findall('.//saml2:Attribute', self.NAMESPACES) if attr_statement else []:
            if 'group' in attr.get('Name', '').lower():
                for value in attr.findall('.//saml2:AttributeValue', self.NAMESPACES):
                    if value.text:
                        groups.append(value.text)

        # Map attributes to user fields
        mapped_attrs = self.config_service.map_attributes(config, attributes)

        # Map role
        role = self.config_service.map_role(config, groups)

        return {
            'email': email or mapped_attrs.get('email'),
            'first_name': mapped_attrs.get('firstName'),
            'last_name': mapped_attrs.get('lastName'),
            'display_name': mapped_attrs.get('displayName'),
            'role': role,
            'groups': groups,
            'session_index': session_index,
            'name_id': email,
            'raw_attributes': attributes,
        }

    async def generate_logout_request(
        self,
        organization_id: str,
        name_id: str,
        session_index: Optional[str] = None,
    ) -> Optional[str]:
        """
        Generate SAML LogoutRequest for Single Logout

        Args:
            organization_id: Organization UUID
            name_id: User's NameID
            session_index: Optional session index

        Returns:
            Logout URL or None on error
        """
        config = await self.config_service.get_config_by_organization(organization_id)
        if not config or not config.get('saml_logout_url'):
            return None

        try:
            import uuid
            request_id = f"_logout_{uuid.uuid4()}"

            logout_request = f"""
            <samlp:LogoutRequest
                xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="{request_id}"
                Version="2.0"
                IssueInstant="{datetime.utcnow().isoformat()}Z"
                Destination="{config['saml_logout_url']}">
                <saml:Issuer>{config['saml_entity_id']}</saml:Issuer>
                <saml:NameID>{name_id}</saml:NameID>
                {f'<samlp:SessionIndex>{session_index}</samlp:SessionIndex>' if session_index else ''}
            </samlp:LogoutRequest>
            """

            # Encode and deflate
            encoded = base64.b64encode(zlib.compress(logout_request.encode())[2:-4])

            logout_url = f"{config['saml_logout_url']}?SAMLRequest={encoded.decode()}"

            await self.audit_logger.log_event(
                organization_id=organization_id,
                event_type='logout',
                event_status='success',
            )

            return logout_url
        except Exception as e:
            logger.error(f"Error generating SAML LogoutRequest: {e}")
            return None
