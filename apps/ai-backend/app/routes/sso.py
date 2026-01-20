"""
Enterprise SSO API Routes

FastAPI routes for SAML 2.0 and OIDC authentication.
Sprint 41: Enterprise Single Sign-On
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Query
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from supabase import create_client, Client
import os
import logging

from ..auth import (
    SSOConfigService,
    SAMLHandler,
    OIDCHandler,
    SessionManager,
    AuditLogger,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/sso', tags=['sso'])


# Dependency injection
def get_supabase() -> Client:
    """Get Supabase client"""
    return create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY'),
    )


def get_config_service(supabase: Client = Depends(get_supabase)) -> SSOConfigService:
    """Get SSO config service"""
    return SSOConfigService(supabase)


def get_session_manager(supabase: Client = Depends(get_supabase)) -> SessionManager:
    """Get session manager"""
    return SessionManager(supabase)


def get_audit_logger(supabase: Client = Depends(get_supabase)) -> AuditLogger:
    """Get audit logger"""
    return AuditLogger(supabase)


def get_saml_handler(
    config_service: SSOConfigService = Depends(get_config_service),
    session_manager: SessionManager = Depends(get_session_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> SAMLHandler:
    """Get SAML handler"""
    return SAMLHandler(config_service, session_manager, audit_logger)


def get_oidc_handler(
    config_service: SSOConfigService = Depends(get_config_service),
    session_manager: SessionManager = Depends(get_session_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger),
) -> OIDCHandler:
    """Get OIDC handler"""
    return OIDCHandler(config_service, session_manager, audit_logger)


# Request/Response Models
class SSOInitiateRequest(BaseModel):
    """Request to initiate SSO login"""
    organization_id: str = Field(..., description='Organization UUID')
    provider_type: str = Field(..., description='saml or oidc')
    relay_state: Optional[str] = Field(None, description='State to preserve')


class SSOInitiateResponse(BaseModel):
    """Response for SSO login initiation"""
    redirect_url: str = Field(..., description='URL to redirect user to IdP')
    state: Optional[str] = Field(None, description='State parameter')
    nonce: Optional[str] = Field(None, description='Nonce for OIDC')


class SSOCallbackRequest(BaseModel):
    """SAML or OIDC callback data"""
    organization_id: str
    code: Optional[str] = None  # OIDC authorization code
    saml_response: Optional[str] = None  # SAML response
    state: Optional[str] = None
    relay_state: Optional[str] = None


class SSOSessionResponse(BaseModel):
    """SSO session information"""
    session_id: str
    user_id: str
    organization_id: str
    expires_at: str
    provider_type: str


# Routes

@router.post('/initiate', response_model=SSOInitiateResponse)
async def initiate_sso(
    request: SSOInitiateRequest,
    saml_handler: SAMLHandler = Depends(get_saml_handler),
    oidc_handler: OIDCHandler = Depends(get_oidc_handler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Initiate SSO login flow

    Returns redirect URL to IdP for authentication.
    """
    try:
        if request.provider_type == 'saml':
            result = await saml_handler.generate_authn_request(
                organization_id=request.organization_id,
                relay_state=request.relay_state,
            )
            if not result:
                raise HTTPException(status_code=400, detail='Failed to generate SAML request')

            redirect_url, request_id = result
            return SSOInitiateResponse(redirect_url=redirect_url)

        elif request.provider_type == 'oidc':
            redirect_uri = f"{os.getenv('APP_URL', 'https://app.fitos.ai')}/auth/oidc/callback"
            result = await oidc_handler.generate_authorization_url(
                organization_id=request.organization_id,
                redirect_uri=redirect_uri,
                state=request.relay_state,
            )
            if not result:
                raise HTTPException(status_code=400, detail='Failed to generate OIDC request')

            auth_url, state, nonce = result
            return SSOInitiateResponse(
                redirect_url=auth_url,
                state=state,
                nonce=nonce,
            )

        else:
            raise HTTPException(status_code=400, detail='Invalid provider type')

    except Exception as e:
        logger.error(f"Error initiating SSO: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/saml/acs')
async def saml_acs(
    request: Request,
    saml_handler: SAMLHandler = Depends(get_saml_handler),
    session_manager: SessionManager = Depends(get_session_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    config_service: SSOConfigService = Depends(get_config_service),
):
    """
    SAML Assertion Consumer Service (ACS)

    Receives SAML response from IdP and creates user session.
    """
    try:
        # Parse form data
        form = await request.form()
        saml_response = form.get('SAMLResponse')
        relay_state = form.get('RelayState')

        if not saml_response:
            raise HTTPException(status_code=400, detail='Missing SAML response')

        # TODO: Get organization_id from relay_state or domain mapping
        # For now, extract from relay_state
        organization_id = relay_state.split(':')[0] if relay_state else None
        if not organization_id:
            raise HTTPException(status_code=400, detail='Missing organization ID')

        # Validate SAML assertion
        user_data = await saml_handler.validate_assertion(
            saml_response=saml_response,
            organization_id=organization_id,
        )

        if not user_data:
            raise HTTPException(status_code=401, detail='SAML validation failed')

        # Get SSO config for session duration
        config = await config_service.get_config_by_organization(organization_id)
        if not config:
            raise HTTPException(status_code=404, detail='SSO config not found')

        # JIT provision or get existing user
        # TODO: Implement user provisioning logic
        user_id = 'user_123'  # Placeholder

        # Create SSO session
        session = await session_manager.create_session(
            user_id=user_id,
            organization_id=organization_id,
            sso_config_id=config['id'],
            provider_type='saml',
            session_data={
                'session_index': user_data.get('session_index'),
                'name_id': user_data.get('name_id'),
            },
            session_duration_minutes=config['session_duration_minutes'],
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
        )

        # Log successful login
        await audit_logger.log_login_success(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=config['id'],
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
        )

        # Redirect to app with session
        app_url = f"{os.getenv('APP_URL', 'https://app.fitos.ai')}/auth/callback"
        return RedirectResponse(url=f"{app_url}?session={session['id']}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in SAML ACS: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/oidc/callback')
async def oidc_callback(
    code: str = Query(..., description='Authorization code'),
    state: str = Query(..., description='State parameter'),
    request: Request = None,
    oidc_handler: OIDCHandler = Depends(get_oidc_handler),
    session_manager: SessionManager = Depends(get_session_manager),
    audit_logger: AuditLogger = Depends(get_audit_logger),
    config_service: SSOConfigService = Depends(get_config_service),
):
    """
    OIDC callback endpoint

    Receives authorization code from IdP and exchanges for tokens.
    """
    try:
        # TODO: Get organization_id from state parameter or session
        organization_id = state.split(':')[0] if state else None
        if not organization_id:
            raise HTTPException(status_code=400, detail='Missing organization ID')

        # Exchange code for tokens
        redirect_uri = f"{os.getenv('APP_URL', 'https://app.fitos.ai')}/auth/oidc/callback"
        tokens = await oidc_handler.exchange_code(
            organization_id=organization_id,
            code=code,
            redirect_uri=redirect_uri,
        )

        if not tokens:
            raise HTTPException(status_code=401, detail='Token exchange failed')

        # Validate ID token
        # TODO: Extract nonce from session/state
        nonce = None
        id_token_claims = await oidc_handler.validate_id_token(
            organization_id=organization_id,
            id_token=tokens['id_token'],
            nonce=nonce,
        )

        if not id_token_claims:
            raise HTTPException(status_code=401, detail='ID token validation failed')

        # Get user info
        userinfo = await oidc_handler.get_userinfo(
            organization_id=organization_id,
            access_token=tokens['access_token'],
        )

        # Extract user data
        user_data = await oidc_handler.extract_user_data(
            organization_id=organization_id,
            id_token_claims=id_token_claims,
            userinfo=userinfo,
        )

        # Get SSO config
        config = await config_service.get_config_by_organization(organization_id)
        if not config:
            raise HTTPException(status_code=404, detail='SSO config not found')

        # JIT provision or get existing user
        # TODO: Implement user provisioning logic
        user_id = 'user_123'  # Placeholder

        # Create SSO session
        session = await session_manager.create_session(
            user_id=user_id,
            organization_id=organization_id,
            sso_config_id=config['id'],
            provider_type='oidc',
            session_data={
                'access_token': tokens['access_token'],
                'refresh_token': tokens.get('refresh_token'),
                'id_token': tokens['id_token'],
                'subject': user_data.get('subject'),
            },
            session_duration_minutes=config['session_duration_minutes'],
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
        )

        # Log successful login
        await audit_logger.log_login_success(
            organization_id=organization_id,
            user_id=user_id,
            sso_config_id=config['id'],
            ip_address=request.client.host,
            user_agent=request.headers.get('user-agent'),
        )

        # Redirect to app with session
        app_url = f"{os.getenv('APP_URL', 'https://app.fitos.ai')}/auth/callback"
        return RedirectResponse(url=f"{app_url}?session={session['id']}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in OIDC callback: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/logout')
async def sso_logout(
    session_id: str,
    session_manager: SessionManager = Depends(get_session_manager),
    saml_handler: SAMLHandler = Depends(get_saml_handler),
    oidc_handler: OIDCHandler = Depends(get_oidc_handler),
    audit_logger: AuditLogger = Depends(get_audit_logger),
):
    """
    Logout from SSO session

    Supports Single Logout (SLO) for SAML.
    """
    try:
        # Get session
        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail='Session not found')

        # Revoke session
        await session_manager.revoke_session(session_id)

        # Log logout
        await audit_logger.log_logout(
            organization_id=session['organization_id'],
            user_id=session['user_id'],
            sso_config_id=session['sso_config_id'],
        )

        # Generate logout request for IdP
        logout_url = None
        if session['provider_type'] == 'saml' and session.get('session_index'):
            logout_url = await saml_handler.generate_logout_request(
                organization_id=session['organization_id'],
                name_id=session['name_id'],
                session_index=session['session_index'],
            )
        elif session['provider_type'] == 'oidc':
            # Revoke tokens
            if session.get('access_token'):
                await oidc_handler.revoke_token(
                    organization_id=session['organization_id'],
                    token=session['access_token'],
                    token_type_hint='access_token',
                )

        return {
            'success': True,
            'logout_url': logout_url,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error during SSO logout: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/session/{session_id}', response_model=SSOSessionResponse)
async def get_session(
    session_id: str,
    session_manager: SessionManager = Depends(get_session_manager),
):
    """Get SSO session information"""
    try:
        session = await session_manager.validate_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail='Session not found or expired')

        return SSOSessionResponse(
            session_id=session['id'],
            user_id=session['user_id'],
            organization_id=session['organization_id'],
            expires_at=session['expires_at'],
            provider_type=session['provider_type'],
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/session/{session_id}/refresh')
async def refresh_session(
    session_id: str,
    session_manager: SessionManager = Depends(get_session_manager),
    oidc_handler: OIDCHandler = Depends(get_oidc_handler),
):
    """Refresh OIDC session using refresh token"""
    try:
        # Get session
        session = await session_manager.get_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail='Session not found')

        if session['provider_type'] != 'oidc':
            raise HTTPException(status_code=400, detail='Only OIDC sessions can be refreshed')

        if not session.get('refresh_token'):
            raise HTTPException(status_code=400, detail='No refresh token available')

        # Refresh tokens
        new_tokens = await oidc_handler.refresh_token(
            organization_id=session['organization_id'],
            refresh_token=session['refresh_token'],
        )

        if not new_tokens:
            raise HTTPException(status_code=401, detail='Token refresh failed')

        # Update session
        await session_manager.refresh_oidc_session(session_id, new_tokens)

        return {'success': True}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error refreshing session: {e}")
        raise HTTPException(status_code=500, detail=str(e))
