"""
A2A Agent Registry and Discovery Service

Manages registration and discovery of external A2A-compatible agents.
Enables FitOS to discover and connect with wearables, nutrition trackers,
calendars, and EHR systems that implement the A2A protocol.
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AAgentInfo,
    A2ACapabilityRequest,
    A2ACapabilityResponse,
    A2AIntegrationConfig,
    A2AMessage,
)


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class A2ARegistry:
    """
    A2A Agent Registry

    Maintains a registry of all A2A-compatible agents that FitOS can
    communicate with, including their capabilities and connection details.
    """

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def register_agent(
        self,
        agent_info: A2AAgentInfo
    ) -> Dict[str, Any]:
        """
        Register a new A2A agent in the registry

        Args:
            agent_info: Agent information and capabilities

        Returns:
            Registration confirmation with agent ID
        """
        try:
            # Store in database
            result = supabase.table('a2a_agent_registry').insert({
                'agent_id': agent_info.agent_id,
                'agent_name': agent_info.agent_name,
                'agent_type': agent_info.agent_type,
                'base_url': str(agent_info.base_url),
                'version': agent_info.version,
                'status': agent_info.status,
                'capabilities': agent_info.capabilities,
                'authentication_config': agent_info.authentication_config,
                'created_at': agent_info.created_at.isoformat(),
                'updated_at': agent_info.updated_at.isoformat(),
            }).execute()

            return {
                "success": True,
                "agent_id": agent_info.agent_id,
                "registered_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def discover_agent_capabilities(
        self,
        agent_id: str
    ) -> Optional[A2ACapabilityResponse]:
        """
        Discover capabilities of a registered agent

        Makes a capability request to the agent's endpoint and caches the response.

        Args:
            agent_id: Agent identifier

        Returns:
            Agent capabilities or None if discovery fails
        """
        try:
            # Get agent info from registry
            agent = supabase.table('a2a_agent_registry') \
                .select('*') \
                .eq('agent_id', agent_id) \
                .single() \
                .execute()

            if not agent.data:
                return None

            # Make capability request
            base_url = agent.data['base_url']
            response = await self.http_client.post(
                f"{base_url}/a2a/capabilities",
                json={
                    "agent_id": "fitos-ai-coach",
                    "include_schemas": True
                }
            )

            if response.status_code != 200:
                return None

            capabilities = A2ACapabilityResponse(**response.json())

            # Update registry with capabilities
            supabase.table('a2a_agent_registry') \
                .update({
                    'capabilities': [cap.name for cap in capabilities.capabilities],
                    'updated_at': datetime.utcnow().isoformat(),
                }) \
                .eq('agent_id', agent_id) \
                .execute()

            return capabilities

        except Exception as e:
            print(f"Error discovering agent capabilities: {e}")
            return None

    async def find_agents_by_capability(
        self,
        capability_name: str
    ) -> List[A2AAgentInfo]:
        """
        Find all agents that support a specific capability

        Args:
            capability_name: Capability to search for

        Returns:
            List of agents with the capability
        """
        try:
            # Query agents with capability
            result = supabase.table('a2a_agent_registry') \
                .select('*') \
                .contains('capabilities', [capability_name]) \
                .eq('status', 'active') \
                .execute()

            return [A2AAgentInfo(**agent) for agent in result.data]

        except Exception as e:
            print(f"Error finding agents: {e}")
            return []

    async def find_agents_by_type(
        self,
        agent_type: str
    ) -> List[A2AAgentInfo]:
        """
        Find all agents of a specific type

        Args:
            agent_type: Type of agent (e.g., "wearable", "nutrition_tracker")

        Returns:
            List of agents of that type
        """
        try:
            result = supabase.table('a2a_agent_registry') \
                .select('*') \
                .eq('agent_type', agent_type) \
                .eq('status', 'active') \
                .execute()

            return [A2AAgentInfo(**agent) for agent in result.data]

        except Exception as e:
            print(f"Error finding agents: {e}")
            return []

    async def get_agent(
        self,
        agent_id: str
    ) -> Optional[A2AAgentInfo]:
        """Get agent information by ID"""
        try:
            result = supabase.table('a2a_agent_registry') \
                .select('*') \
                .eq('agent_id', agent_id) \
                .single() \
                .execute()

            if not result.data:
                return None

            return A2AAgentInfo(**result.data)

        except Exception as e:
            print(f"Error getting agent: {e}")
            return None

    async def update_agent_status(
        self,
        agent_id: str,
        status: str
    ) -> bool:
        """
        Update agent status

        Args:
            agent_id: Agent identifier
            status: New status ("active", "inactive", "degraded")

        Returns:
            Success status
        """
        try:
            supabase.table('a2a_agent_registry') \
                .update({
                    'status': status,
                    'updated_at': datetime.utcnow().isoformat(),
                }) \
                .eq('agent_id', agent_id) \
                .execute()

            return True

        except Exception as e:
            print(f"Error updating agent status: {e}")
            return False

    async def remove_agent(
        self,
        agent_id: str
    ) -> bool:
        """
        Remove agent from registry

        Args:
            agent_id: Agent identifier

        Returns:
            Success status
        """
        try:
            supabase.table('a2a_agent_registry') \
                .delete() \
                .eq('agent_id', agent_id) \
                .execute()

            return True

        except Exception as e:
            print(f"Error removing agent: {e}")
            return False


class A2AIntegrationManager:
    """
    A2A Integration Manager

    Manages user-specific integrations with external A2A agents.
    Handles authentication, sync scheduling, and data flow.
    """

    def __init__(self):
        self.registry = A2ARegistry()

    async def create_integration(
        self,
        user_id: str,
        agent_id: str,
        data_types: List[str],
        sync_frequency_hours: int = 24,
        authentication_token: Optional[str] = None,
        authentication_expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Create a new user integration with an A2A agent

        Args:
            user_id: FitOS user ID
            agent_id: External agent ID
            data_types: List of data types to sync
            sync_frequency_hours: How often to sync (hours)
            authentication_token: OAuth token or API key
            authentication_expires_at: Token expiration time

        Returns:
            Integration configuration
        """
        try:
            # Verify agent exists
            agent = await self.registry.get_agent(agent_id)
            if not agent:
                return {
                    "success": False,
                    "error": f"Agent not found: {agent_id}"
                }

            # Create integration
            integration_id = f"{user_id}:{agent_id}"

            result = supabase.table('a2a_user_integrations').insert({
                'integration_id': integration_id,
                'user_id': user_id,
                'agent_id': agent_id,
                'enabled': True,
                'sync_frequency_hours': sync_frequency_hours,
                'data_types': data_types,
                'authentication_token': authentication_token,
                'authentication_expires_at': authentication_expires_at.isoformat() if authentication_expires_at else None,
                'created_at': datetime.utcnow().isoformat(),
            }).execute()

            return {
                "success": True,
                "integration_id": integration_id,
                "config": A2AIntegrationConfig(**result.data[0])
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def get_user_integrations(
        self,
        user_id: str
    ) -> List[A2AIntegrationConfig]:
        """Get all integrations for a user"""
        try:
            result = supabase.table('a2a_user_integrations') \
                .select('*') \
                .eq('user_id', user_id) \
                .execute()

            return [A2AIntegrationConfig(**config) for config in result.data]

        except Exception as e:
            print(f"Error getting user integrations: {e}")
            return []

    async def disable_integration(
        self,
        integration_id: str
    ) -> bool:
        """Disable an integration"""
        try:
            supabase.table('a2a_user_integrations') \
                .update({'enabled': False}) \
                .eq('integration_id', integration_id) \
                .execute()

            return True

        except Exception as e:
            print(f"Error disabling integration: {e}")
            return False

    async def update_authentication(
        self,
        integration_id: str,
        authentication_token: str,
        expires_at: Optional[datetime] = None
    ) -> bool:
        """Update integration authentication token"""
        try:
            supabase.table('a2a_user_integrations') \
                .update({
                    'authentication_token': authentication_token,
                    'authentication_expires_at': expires_at.isoformat() if expires_at else None,
                }) \
                .eq('integration_id', integration_id) \
                .execute()

            return True

        except Exception as e:
            print(f"Error updating authentication: {e}")
            return False

    async def record_sync(
        self,
        integration_id: str,
        success: bool,
        error_message: Optional[str] = None
    ) -> bool:
        """Record sync attempt"""
        try:
            # Get current config
            config = supabase.table('a2a_user_integrations') \
                .select('sync_errors') \
                .eq('integration_id', integration_id) \
                .single() \
                .execute()

            sync_errors = config.data['sync_errors'] if config.data else 0

            # Update sync status
            update_data = {
                'last_sync_at': datetime.utcnow().isoformat(),
            }

            if success:
                update_data['sync_errors'] = 0
            else:
                update_data['sync_errors'] = sync_errors + 1

            supabase.table('a2a_user_integrations') \
                .update(update_data) \
                .eq('integration_id', integration_id) \
                .execute()

            # Log error if failed
            if not success and error_message:
                supabase.table('a2a_sync_logs').insert({
                    'integration_id': integration_id,
                    'sync_time': datetime.utcnow().isoformat(),
                    'success': False,
                    'error_message': error_message,
                }).execute()

            return True

        except Exception as e:
            print(f"Error recording sync: {e}")
            return False

    async def get_integrations_due_for_sync(self) -> List[A2AIntegrationConfig]:
        """Get integrations that are due for syncing"""
        try:
            # Calculate cutoff time
            cutoff = datetime.utcnow() - timedelta(hours=1)  # At least 1 hour old

            result = supabase.table('a2a_user_integrations') \
                .select('*') \
                .eq('enabled', True) \
                .or_(
                    f"last_sync_at.is.null,last_sync_at.lt.{cutoff.isoformat()}"
                ) \
                .execute()

            integrations = []
            for config_data in result.data:
                config = A2AIntegrationConfig(**config_data)

                # Check if due based on frequency
                if config.last_sync_at:
                    hours_since_sync = (datetime.utcnow() - config.last_sync_at).total_seconds() / 3600
                    if hours_since_sync < config.sync_frequency_hours:
                        continue

                integrations.append(config)

            return integrations

        except Exception as e:
            print(f"Error getting integrations due for sync: {e}")
            return []


# Singleton instances
a2a_registry = A2ARegistry()
a2a_integration_manager = A2AIntegrationManager()
