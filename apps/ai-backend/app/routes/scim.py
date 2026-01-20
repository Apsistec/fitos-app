"""
SCIM 2.0 API Routes

Implements System for Cross-domain Identity Management 2.0.
Sprint 41: Enterprise Single Sign-On
"""

from fastapi import APIRouter, HTTPException, Request, Depends, Header, Query
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from supabase import create_client, Client
import os
import logging

from ..auth.scim_service import SCIMService

logger = logging.getLogger(__name__)
router = APIRouter(prefix='/scim/v2', tags=['scim'])


# Dependency injection
def get_supabase() -> Client:
    """Get Supabase client"""
    return create_client(
        os.getenv('SUPABASE_URL'),
        os.getenv('SUPABASE_SERVICE_KEY'),
    )


def get_scim_service(supabase: Client = Depends(get_supabase)) -> SCIMService:
    """Get SCIM service"""
    return SCIMService(supabase)


async def verify_bearer_token(
    authorization: str = Header(...),
    scim_service: SCIMService = Depends(get_scim_service),
) -> str:
    """
    Verify SCIM bearer token

    Returns organization_id if valid
    """
    if not authorization.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Invalid authorization header')

    token = authorization.replace('Bearer ', '')

    # Extract organization from token or request
    # In production, token would encode organization_id
    # For now, we'll need to look it up
    organization_id = 'org_123'  # Placeholder

    is_valid = await scim_service.validate_bearer_token(token, organization_id)
    if not is_valid:
        raise HTTPException(status_code=401, detail='Invalid bearer token')

    return organization_id


# Request/Response Models
class SCIMName(BaseModel):
    """SCIM name object"""
    formatted: Optional[str] = None
    givenName: Optional[str] = None
    familyName: Optional[str] = None


class SCIMEmail(BaseModel):
    """SCIM email object"""
    value: str
    primary: bool = False


class SCIMUser(BaseModel):
    """SCIM user resource"""
    schemas: List[str] = Field(default=['urn:ietf:params:scim:schemas:core:2.0:User'])
    id: Optional[str] = None
    externalId: Optional[str] = None
    userName: str
    name: Optional[SCIMName] = None
    emails: List[SCIMEmail]
    active: bool = True


class SCIMListResponse(BaseModel):
    """SCIM list response"""
    schemas: List[str] = Field(default=['urn:ietf:params:scim:api:messages:2.0:ListResponse'])
    totalResults: int
    startIndex: int = 1
    itemsPerPage: int = 100
    Resources: List[Dict[str, Any]]


class SCIMError(BaseModel):
    """SCIM error response"""
    schemas: List[str] = Field(default=['urn:ietf:params:scim:api:messages:2.0:Error'])
    detail: str
    status: int


# Routes

@router.get('/ServiceProviderConfig')
async def get_service_provider_config():
    """
    Get SCIM service provider configuration

    Required by SCIM 2.0 spec
    """
    return {
        'schemas': ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
        'documentationUri': 'https://docs.fitos.ai/scim',
        'patch': {
            'supported': True
        },
        'bulk': {
            'supported': False,
            'maxOperations': 0,
            'maxPayloadSize': 0
        },
        'filter': {
            'supported': True,
            'maxResults': 200
        },
        'changePassword': {
            'supported': False
        },
        'sort': {
            'supported': False
        },
        'etag': {
            'supported': False
        },
        'authenticationSchemes': [
            {
                'name': 'OAuth Bearer Token',
                'description': 'Authentication using OAuth Bearer Token',
                'specUri': 'https://tools.ietf.org/html/rfc6750',
                'type': 'oauthbearertoken',
                'primary': True
            }
        ]
    }


@router.get('/ResourceTypes')
async def get_resource_types():
    """
    Get supported SCIM resource types

    Required by SCIM 2.0 spec
    """
    return {
        'schemas': ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        'totalResults': 1,
        'Resources': [
            {
                'schemas': ['urn:ietf:params:scim:schemas:core:2.0:ResourceType'],
                'id': 'User',
                'name': 'User',
                'endpoint': '/scim/v2/Users',
                'description': 'User Account',
                'schema': 'urn:ietf:params:scim:schemas:core:2.0:User',
            }
        ]
    }


@router.get('/Schemas')
async def get_schemas():
    """
    Get supported SCIM schemas

    Required by SCIM 2.0 spec
    """
    return {
        'schemas': ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
        'totalResults': 1,
        'Resources': [
            {
                'id': 'urn:ietf:params:scim:schemas:core:2.0:User',
                'name': 'User',
                'description': 'User Account'
            }
        ]
    }


@router.post('/Users', status_code=201)
async def create_user(
    user: SCIMUser,
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    Create a new user via SCIM

    Called by IdP when a new user is added to the directory
    """
    try:
        result = await scim_service.provision_user(
            organization_id=organization_id,
            scim_user=user.dict(exclude_none=True),
        )

        if not result:
            raise HTTPException(status_code=500, detail='Failed to create user')

        return result
    except Exception as e:
        logger.error(f"Error creating SCIM user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/Users/{user_id}')
async def get_user(
    user_id: str,
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    Get user by ID

    Called by IdP to retrieve user information
    """
    try:
        user = await scim_service.get_user(organization_id, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting SCIM user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/Users', response_model=SCIMListResponse)
async def list_users(
    startIndex: int = Query(1, ge=1),
    count: int = Query(100, ge=1, le=200),
    filter: Optional[str] = Query(None),
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    List users with pagination and filtering

    Called by IdP to list all users in the directory
    """
    try:
        result = await scim_service.list_users(
            organization_id=organization_id,
            start_index=startIndex,
            count=count,
            filter_expr=filter,
        )

        return result
    except Exception as e:
        logger.error(f"Error listing SCIM users: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put('/Users/{user_id}')
async def update_user(
    user_id: str,
    user: SCIMUser,
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    Update user (full replace)

    Called by IdP when user attributes change
    """
    try:
        result = await scim_service.update_user(
            organization_id=organization_id,
            user_id=user_id,
            scim_user=user.dict(exclude_none=True),
        )

        if not result:
            raise HTTPException(status_code=404, detail='User not found')

        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating SCIM user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch('/Users/{user_id}')
async def patch_user(
    user_id: str,
    request: Request,
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    Patch user (partial update)

    Called by IdP for partial updates
    """
    try:
        body = await request.json()
        operations = body.get('Operations', [])

        # Get current user
        user = await scim_service.get_user(organization_id, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        # Apply operations
        for op in operations:
            op_type = op.get('op', '').lower()
            path = op.get('path', '')
            value = op.get('value')

            if op_type == 'replace':
                # Handle deactivation (common SCIM operation)
                if path == 'active' and value is False:
                    await scim_service.deprovision_user(
                        organization_id=organization_id,
                        user_id=user_id,
                        external_id=user.get('externalId'),
                    )
                    user['active'] = False

        return user
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error patching SCIM user: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete('/Users/{user_id}', status_code=204)
async def delete_user(
    user_id: str,
    organization_id: str = Depends(verify_bearer_token),
    scim_service: SCIMService = Depends(get_scim_service),
):
    """
    Delete (deprovision) user

    Called by IdP when user is removed from directory
    """
    try:
        # Get user to get external_id
        user = await scim_service.get_user(organization_id, user_id)
        if not user:
            raise HTTPException(status_code=404, detail='User not found')

        success = await scim_service.deprovision_user(
            organization_id=organization_id,
            user_id=user_id,
            external_id=user.get('externalId'),
        )

        if not success:
            raise HTTPException(status_code=500, detail='Failed to deprovision user')

        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting SCIM user: {e}")
        raise HTTPException(status_code=500, detail=str(e))
