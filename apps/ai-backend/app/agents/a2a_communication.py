"""
A2A Communication Service

Handles communication between FitOS and external A2A-compatible agents.
Provides message routing, request handling, and response processing.
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime
from uuid import uuid4

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AMessage,
    A2AActionRequest,
    A2AActionResponse,
    A2ASyncRequest,
    A2ASyncResponse,
    A2AError,
)
from app.agents.a2a_registry import a2a_registry


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class A2ACommunicationService:
    """
    A2A Communication Service

    Manages message exchange between FitOS and external agents.
    Handles request routing, authentication, retries, and error handling.
    """

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)
        self.agent_id = "fitos-ai-coach"

    async def send_action_request(
        self,
        target_agent_id: str,
        capability_name: str,
        parameters: Dict[str, Any],
        user_id: str,
        authentication_token: Optional[str] = None
    ) -> A2AActionResponse:
        """
        Send action request to external agent

        Args:
            target_agent_id: Target agent identifier
            capability_name: Capability to invoke
            parameters: Action parameters
            user_id: User ID for context
            authentication_token: OAuth token or API key

        Returns:
            Action response from target agent
        """
        try:
            # Get agent info
            agent = await a2a_registry.get_agent(target_agent_id)
            if not agent:
                return A2AActionResponse(
                    success=False,
                    error=f"Agent not found: {target_agent_id}",
                    execution_time_ms=0
                )

            # Build request
            action_request = A2AActionRequest(
                capability_name=capability_name,
                parameters=parameters,
                timeout_seconds=30,
                idempotency_key=str(uuid4())
            )

            # Build A2A message
            message = A2AMessage(
                sender=self.agent_id,
                receiver=target_agent_id,
                message_type="action_request",
                payload=action_request.model_dump(),
                metadata={
                    "user_id": user_id,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )

            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-A2A-Version": "1.0",
                "X-A2A-Sender": self.agent_id,
            }

            if authentication_token:
                headers["Authorization"] = f"Bearer {authentication_token}"

            # Send request
            response = await self.http_client.post(
                f"{agent.base_url}/a2a/action",
                json=message.model_dump(),
                headers=headers
            )

            # Parse response
            if response.status_code == 200:
                response_data = response.json()
                return A2AActionResponse(**response_data.get("payload", {}))
            else:
                return A2AActionResponse(
                    success=False,
                    error=f"HTTP {response.status_code}: {response.text}",
                    execution_time_ms=0
                )

        except httpx.TimeoutException:
            return A2AActionResponse(
                success=False,
                error="Request timeout",
                execution_time_ms=30000
            )
        except Exception as e:
            return A2AActionResponse(
                success=False,
                error=str(e),
                execution_time_ms=0
            )

    async def request_data_sync(
        self,
        target_agent_id: str,
        user_id: str,
        data_types: List[str],
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        authentication_token: Optional[str] = None
    ) -> A2ASyncResponse:
        """
        Request data sync from external agent

        Args:
            target_agent_id: Agent to sync from
            user_id: User ID
            data_types: Types of data to sync
            start_date: Start of date range
            end_date: End of date range
            authentication_token: Auth token

        Returns:
            Sync response with data
        """
        try:
            # Get agent info
            agent = await a2a_registry.get_agent(target_agent_id)
            if not agent:
                return A2ASyncResponse(
                    user_id=user_id,
                    agent_id=target_agent_id,
                    data_type="",
                    records_synced=0,
                    data=[]
                )

            # Build sync request
            sync_request = A2ASyncRequest(
                user_id=user_id,
                agent_id=target_agent_id,
                data_types=data_types,
                start_date=start_date,
                end_date=end_date
            )

            # Build A2A message
            message = A2AMessage(
                sender=self.agent_id,
                receiver=target_agent_id,
                message_type="action_request",
                payload={
                    "capability_name": "sync_data",
                    "parameters": sync_request.model_dump()
                },
                metadata={
                    "user_id": user_id,
                    "sync_types": data_types
                }
            )

            # Prepare headers
            headers = {
                "Content-Type": "application/json",
                "X-A2A-Version": "1.0",
                "X-A2A-Sender": self.agent_id,
            }

            if authentication_token:
                headers["Authorization"] = f"Bearer {authentication_token}"

            # Send request
            response = await self.http_client.post(
                f"{agent.base_url}/a2a/sync",
                json=message.model_dump(),
                headers=headers
            )

            # Parse response
            if response.status_code == 200:
                response_data = response.json()
                return A2ASyncResponse(**response_data.get("payload", {}))
            else:
                return A2ASyncResponse(
                    user_id=user_id,
                    agent_id=target_agent_id,
                    data_type="",
                    records_synced=0,
                    data=[]
                )

        except Exception as e:
            print(f"Error requesting data sync: {e}")
            return A2ASyncResponse(
                user_id=user_id,
                agent_id=target_agent_id,
                data_type="",
                records_synced=0,
                data=[]
            )

    async def send_event_notification(
        self,
        event_type: str,
        event_data: Dict[str, Any],
        subscriber_agent_ids: List[str]
    ) -> Dict[str, bool]:
        """
        Send event notification to subscribed agents

        Args:
            event_type: Type of event
            event_data: Event data
            subscriber_agent_ids: List of agents to notify

        Returns:
            Dict of agent_id -> success status
        """
        results = {}

        for agent_id in subscriber_agent_ids:
            try:
                # Get agent info
                agent = await a2a_registry.get_agent(agent_id)
                if not agent:
                    results[agent_id] = False
                    continue

                # Build notification message
                message = A2AMessage(
                    sender=self.agent_id,
                    receiver=agent_id,
                    message_type="event_notification",
                    payload={
                        "event_type": event_type,
                        "event_data": event_data,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                )

                # Send notification
                response = await self.http_client.post(
                    f"{agent.base_url}/a2a/events",
                    json=message.model_dump(),
                    headers={
                        "Content-Type": "application/json",
                        "X-A2A-Version": "1.0",
                        "X-A2A-Sender": self.agent_id,
                    }
                )

                results[agent_id] = response.status_code == 200

            except Exception as e:
                print(f"Error sending event to {agent_id}: {e}")
                results[agent_id] = False

        return results

    async def log_communication(
        self,
        target_agent_id: str,
        message_type: str,
        request_payload: Dict[str, Any],
        response_payload: Optional[Dict[str, Any]],
        success: bool,
        user_id: Optional[str] = None
    ) -> None:
        """Log A2A communication for debugging and auditing"""
        try:
            supabase.table('a2a_communication_logs').insert({
                'timestamp': datetime.utcnow().isoformat(),
                'sender': self.agent_id,
                'receiver': target_agent_id,
                'message_type': message_type,
                'request_payload': request_payload,
                'response_payload': response_payload,
                'success': success,
                'user_id': user_id,
            }).execute()

        except Exception as e:
            print(f"Error logging communication: {e}")


class A2ASyncScheduler:
    """
    A2A Sync Scheduler

    Background task scheduler for periodic data synchronization
    with external agents.
    """

    def __init__(self):
        self.communication_service = A2ACommunicationService()

    async def run_scheduled_sync(
        self,
        integration_id: str,
        user_id: str,
        agent_id: str,
        data_types: List[str],
        authentication_token: str
    ) -> Dict[str, Any]:
        """
        Run a scheduled sync for an integration

        Args:
            integration_id: Integration identifier
            user_id: User ID
            agent_id: External agent ID
            data_types: Data types to sync
            authentication_token: Auth token

        Returns:
            Sync result summary
        """
        try:
            # Determine date range (last 7 days)
            end_date = datetime.utcnow()
            start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            start_date = start_date.replace(day=start_date.day - 7)

            total_records = 0
            sync_results = []

            # Sync each data type
            for data_type in data_types:
                response = await self.communication_service.request_data_sync(
                    target_agent_id=agent_id,
                    user_id=user_id,
                    data_types=[data_type],
                    start_date=start_date,
                    end_date=end_date,
                    authentication_token=authentication_token
                )

                total_records += response.records_synced

                sync_results.append({
                    "data_type": data_type,
                    "records_synced": response.records_synced,
                    "success": response.records_synced >= 0
                })

            # Record sync in database
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.record_sync(
                integration_id=integration_id,
                success=True,
                error_message=None
            )

            return {
                "success": True,
                "total_records": total_records,
                "results": sync_results
            }

        except Exception as e:
            # Record sync failure
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.record_sync(
                integration_id=integration_id,
                success=False,
                error_message=str(e)
            )

            return {
                "success": False,
                "error": str(e),
                "total_records": 0
            }

    async def process_pending_syncs(self) -> Dict[str, Any]:
        """
        Process all integrations that are due for syncing

        This should be called by a background worker/cron job.

        Returns:
            Summary of sync operations
        """
        from app.agents.a2a_registry import a2a_integration_manager

        # Get integrations due for sync
        integrations = await a2a_integration_manager.get_integrations_due_for_sync()

        processed = 0
        succeeded = 0
        failed = 0

        for integration in integrations:
            try:
                result = await self.run_scheduled_sync(
                    integration_id=integration.integration_id,
                    user_id=integration.user_id,
                    agent_id=integration.agent_id,
                    data_types=integration.data_types,
                    authentication_token=integration.authentication_token or ""
                )

                processed += 1
                if result["success"]:
                    succeeded += 1
                else:
                    failed += 1

            except Exception as e:
                print(f"Error processing sync for {integration.integration_id}: {e}")
                failed += 1
                processed += 1

        return {
            "total_integrations": len(integrations),
            "processed": processed,
            "succeeded": succeeded,
            "failed": failed
        }


# Singleton instances
a2a_communication = A2ACommunicationService()
a2a_sync_scheduler = A2ASyncScheduler()
