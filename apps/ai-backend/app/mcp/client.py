"""
MCP Client for connecting to MCP servers

Provides unified interface for querying multiple MCP servers:
- Health data (Apple Health, wearables)
- Payment data (Stripe)
- User data (Supabase)

Sprint 31: Apple Health MCP Integration
"""

import asyncio
import json
from typing import Any, Dict, List, Optional
from dataclasses import dataclass
from enum import Enum

import httpx
from pydantic import BaseModel


class MCPServerType(str, Enum):
    """Available MCP server types"""

    HEALTH = "health"
    STRIPE = "stripe"
    SUPABASE = "supabase"


@dataclass
class MCPServerConfig:
    """Configuration for an MCP server"""

    name: str
    type: MCPServerType
    url: str
    api_key: Optional[str] = None
    enabled: bool = True


class MCPQuery(BaseModel):
    """Natural language query to MCP server"""

    query: str
    user_id: str
    context: Dict[str, Any] = {}
    max_results: int = 100


class MCPResponse(BaseModel):
    """Response from MCP server"""

    success: bool
    data: Any
    metadata: Dict[str, Any] = {}
    error: Optional[str] = None


class MCPClient:
    """
    Client for interacting with MCP servers.

    Handles:
    - Server discovery and connection
    - Query execution with natural language
    - Response parsing and normalization
    - Error handling and retries
    """

    def __init__(self, servers: List[MCPServerConfig]):
        self.servers = {server.name: server for server in servers}
        self.client = httpx.AsyncClient(timeout=30.0)

    async def query(
        self,
        server_name: str,
        query: MCPQuery,
    ) -> MCPResponse:
        """
        Execute natural language query against MCP server.

        Args:
            server_name: Name of MCP server to query
            query: Query object with NL query and context

        Returns:
            MCPResponse with data or error
        """
        server = self.servers.get(server_name)
        if not server:
            return MCPResponse(
                success=False,
                data=None,
                error=f"Server '{server_name}' not found",
            )

        if not server.enabled:
            return MCPResponse(
                success=False,
                data=None,
                error=f"Server '{server_name}' is disabled",
            )

        try:
            # Call MCP server endpoint
            headers = {"Content-Type": "application/json"}
            if server.api_key:
                headers["Authorization"] = f"Bearer {server.api_key}"

            response = await self.client.post(
                f"{server.url}/query",
                json=query.model_dump(),
                headers=headers,
            )

            response.raise_for_status()
            data = response.json()

            return MCPResponse(
                success=True,
                data=data.get("results"),
                metadata=data.get("metadata", {}),
            )

        except httpx.HTTPError as e:
            return MCPResponse(
                success=False,
                data=None,
                error=f"HTTP error: {str(e)}",
            )
        except Exception as e:
            return MCPResponse(
                success=False,
                data=None,
                error=f"Unexpected error: {str(e)}",
            )

    async def multi_query(
        self,
        queries: Dict[str, MCPQuery],
    ) -> Dict[str, MCPResponse]:
        """
        Execute multiple queries across different servers in parallel.

        Args:
            queries: Dict mapping server_name to MCPQuery

        Returns:
            Dict mapping server_name to MCPResponse
        """
        tasks = {
            server_name: self.query(server_name, query)
            for server_name, query in queries.items()
        }

        results = await asyncio.gather(*tasks.values(), return_exceptions=True)

        return {
            server_name: result if isinstance(result, MCPResponse) else MCPResponse(
                success=False,
                data=None,
                error=str(result),
            )
            for server_name, result in zip(tasks.keys(), results)
        }

    async def get_server_capabilities(self, server_name: str) -> Dict[str, Any]:
        """
        Get capabilities and schema of an MCP server.

        Args:
            server_name: Name of MCP server

        Returns:
            Server capabilities
        """
        server = self.servers.get(server_name)
        if not server:
            return {"error": f"Server '{server_name}' not found"}

        try:
            response = await self.client.get(
                f"{server.url}/capabilities",
                headers={"Authorization": f"Bearer {server.api_key}"} if server.api_key else {},
            )
            response.raise_for_status()
            return response.json()

        except Exception as e:
            return {"error": str(e)}

    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()


# Global MCP client instance
_mcp_client: Optional[MCPClient] = None


def get_mcp_client() -> MCPClient:
    """
    Get or create global MCP client.

    Servers are configured from environment variables.
    """
    global _mcp_client

    if _mcp_client is None:
        # TODO: Load from environment/config
        servers = [
            MCPServerConfig(
                name="health",
                type=MCPServerType.HEALTH,
                url="http://localhost:8001",  # Local MCP server for health data
                enabled=True,
            ),
            MCPServerConfig(
                name="stripe",
                type=MCPServerType.STRIPE,
                url="http://localhost:8002",  # Local MCP server for Stripe
                enabled=True,
            ),
        ]

        _mcp_client = MCPClient(servers)

    return _mcp_client
