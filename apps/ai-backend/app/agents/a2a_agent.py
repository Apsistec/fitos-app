"""
FitOS A2A Agent

Implements the Agent-to-Agent protocol for FitOS, enabling communication
with external fitness platforms, wearables, nutrition trackers, and EHR systems.

This agent serves as FitOS's representative in the A2A ecosystem.
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime
from uuid import uuid4

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AMessage,
    A2ACapability,
    A2ACapabilityResponse,
    A2AActionRequest,
    A2AActionResponse,
    A2AAgentInfo,
    A2AError,
    FitOSRecoveryData,
    FitOSNutritionEntry,
    FitOSCalendarEvent,
    FitOSHealthRecord,
)


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class FitOSAgent:
    """
    FitOS A2A Agent

    This agent represents FitOS in the A2A protocol ecosystem, providing
    capabilities for other agents to interact with FitOS data and services.
    """

    AGENT_ID = "fitos-ai-coach"
    AGENT_NAME = "FitOS AI Fitness Coach"
    AGENT_VERSION = "1.0.0"

    def __init__(self):
        self.capabilities = self._define_capabilities()

    def _define_capabilities(self) -> List[A2ACapability]:
        """Define FitOS capabilities for external agents"""
        return [
            A2ACapability(
                name="receive_recovery_data",
                description="Accept recovery data from wearables (HRV, sleep, strain)",
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "recovery_data": {
                            "type": "object",
                            "properties": {
                                "date": {"type": "string", "format": "date"},
                                "recovery_score": {"type": "number", "minimum": 0, "maximum": 100},
                                "resting_hr": {"type": "integer"},
                                "hrv_ms": {"type": "integer"},
                                "sleep_hours": {"type": "number"},
                                "sleep_quality": {"type": "number"},
                                "strain_score": {"type": "number"},
                                "source": {"type": "string"}
                            },
                            "required": ["date", "recovery_score", "source"]
                        }
                    },
                    "required": ["user_id", "recovery_data"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "record_id": {"type": "string"}
                    }
                },
                authentication_required=True,
                rate_limit=1000  # per hour
            ),

            A2ACapability(
                name="receive_nutrition_data",
                description="Accept nutrition logs from tracking apps",
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "nutrition_entry": {
                            "type": "object",
                            "properties": {
                                "timestamp": {"type": "string", "format": "date-time"},
                                "meal_type": {"type": "string", "enum": ["breakfast", "lunch", "dinner", "snack"]},
                                "foods": {"type": "array"},
                                "total_calories": {"type": "number"},
                                "total_protein_g": {"type": "number"},
                                "total_carbs_g": {"type": "number"},
                                "total_fat_g": {"type": "number"},
                                "source": {"type": "string"}
                            },
                            "required": ["timestamp", "total_calories", "total_protein_g", "total_carbs_g", "total_fat_g", "source"]
                        }
                    },
                    "required": ["user_id", "nutrition_entry"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "entry_id": {"type": "string"}
                    }
                },
                authentication_required=True,
                rate_limit=2000
            ),

            A2ACapability(
                name="schedule_session",
                description="Schedule training sessions via calendar integration",
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "trainer_id": {"type": "string"},
                        "session_details": {
                            "type": "object",
                            "properties": {
                                "title": {"type": "string"},
                                "start_time": {"type": "string", "format": "date-time"},
                                "end_time": {"type": "string", "format": "date-time"},
                                "location": {"type": "string"},
                                "notes": {"type": "string"}
                            },
                            "required": ["title", "start_time", "end_time"]
                        }
                    },
                    "required": ["user_id", "trainer_id", "session_details"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "session_id": {"type": "string"},
                        "calendar_event_id": {"type": "string"}
                    }
                },
                authentication_required=True,
                rate_limit=500
            ),

            A2ACapability(
                name="get_workout_program",
                description="Retrieve current workout program for a user",
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "week_number": {"type": "integer", "minimum": 1}
                    },
                    "required": ["user_id"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "program": {
                            "type": "object",
                            "properties": {
                                "program_id": {"type": "string"},
                                "program_name": {"type": "string"},
                                "current_week": {"type": "integer"},
                                "workouts": {"type": "array"}
                            }
                        }
                    }
                },
                authentication_required=True,
                rate_limit=1000
            ),

            A2ACapability(
                name="receive_health_record",
                description="Accept health records from EHR systems (requires HIPAA BAA)",
                version="1.0",
                input_schema={
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string"},
                        "health_record": {
                            "type": "object",
                            "properties": {
                                "record_id": {"type": "string"},
                                "record_type": {"type": "string", "enum": ["vital_signs", "lab_results", "diagnosis", "medication", "allergy"]},
                                "date": {"type": "string", "format": "date-time"},
                                "data": {"type": "object"},
                                "provider": {"type": "string"},
                                "source": {"type": "string"}
                            },
                            "required": ["record_id", "record_type", "date", "data", "provider", "source"]
                        }
                    },
                    "required": ["user_id", "health_record"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "success": {"type": "boolean"},
                        "record_id": {"type": "string"},
                        "hipaa_audit_id": {"type": "string"}
                    }
                },
                authentication_required=True,
                rate_limit=100
            )
        ]

    def get_agent_info(self) -> A2AAgentInfo:
        """Get agent registration information"""
        return A2AAgentInfo(
            agent_id=self.AGENT_ID,
            agent_name=self.AGENT_NAME,
            agent_type="fitness_platform",
            base_url=os.getenv("FITOS_API_URL", "https://api.fitos.com"),
            version=self.AGENT_VERSION,
            status="active",
            capabilities=[cap.name for cap in self.capabilities],
            authentication_config={
                "methods": ["oauth2", "api_key"],
                "oauth2_url": f"{os.getenv('FITOS_API_URL')}/oauth/authorize",
                "token_url": f"{os.getenv('FITOS_API_URL')}/oauth/token",
                "scopes": ["recovery:write", "nutrition:write", "calendar:write", "workouts:read", "health:write"]
            }
        )

    def get_capabilities(self) -> A2ACapabilityResponse:
        """Return agent capabilities for discovery"""
        return A2ACapabilityResponse(
            agent_id=self.AGENT_ID,
            agent_name=self.AGENT_NAME,
            agent_version=self.AGENT_VERSION,
            capabilities=self.capabilities,
            supported_protocols=["http", "websocket"],
            authentication_methods=["oauth2", "api_key"]
        )

    async def handle_action(
        self,
        request: A2AActionRequest,
        user_id: str
    ) -> A2AActionResponse:
        """
        Handle action request from external agent

        Routes the request to the appropriate capability handler.
        """
        start_time = datetime.utcnow()

        try:
            # Find capability
            capability = next(
                (cap for cap in self.capabilities if cap.name == request.capability_name),
                None
            )

            if not capability:
                return A2AActionResponse(
                    success=False,
                    error=f"Unknown capability: {request.capability_name}",
                    execution_time_ms=0
                )

            # Route to handler
            handler_map = {
                "receive_recovery_data": self._handle_recovery_data,
                "receive_nutrition_data": self._handle_nutrition_data,
                "schedule_session": self._handle_schedule_session,
                "get_workout_program": self._handle_get_workout_program,
                "receive_health_record": self._handle_health_record,
            }

            handler = handler_map.get(request.capability_name)
            if not handler:
                return A2AActionResponse(
                    success=False,
                    error=f"Handler not implemented for: {request.capability_name}",
                    execution_time_ms=0
                )

            # Execute handler
            result = await handler(user_id, request.parameters)

            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)

            return A2AActionResponse(
                success=True,
                result=result,
                execution_time_ms=execution_time
            )

        except Exception as e:
            execution_time = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            return A2AActionResponse(
                success=False,
                error=str(e),
                execution_time_ms=execution_time
            )

    async def _handle_recovery_data(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle incoming recovery data from wearables"""
        recovery_data = FitOSRecoveryData(**params["recovery_data"])

        # Store in wearable_data table
        result = supabase.table('wearable_data').insert({
            'user_id': user_id,
            'date': recovery_data.date,
            'data_type': 'recovery',
            'source': recovery_data.source,
            'data': {
                'recovery_score': recovery_data.recovery_score,
                'resting_hr': recovery_data.resting_hr,
                'hrv_ms': recovery_data.hrv_ms,
                'sleep_hours': recovery_data.sleep_hours,
                'sleep_quality': recovery_data.sleep_quality,
                'strain_score': recovery_data.strain_score,
            },
            'synced_at': datetime.utcnow().isoformat()
        }).execute()

        return {
            "success": True,
            "record_id": result.data[0]['id']
        }

    async def _handle_nutrition_data(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle incoming nutrition data from tracking apps"""
        nutrition_entry = FitOSNutritionEntry(**params["nutrition_entry"])

        # Store in nutrition_logs table
        result = supabase.table('nutrition_logs').insert({
            'user_id': user_id,
            'logged_at': nutrition_entry.timestamp.isoformat(),
            'meal_type': nutrition_entry.meal_type,
            'foods': nutrition_entry.foods,
            'calories': nutrition_entry.total_calories,
            'protein_g': nutrition_entry.total_protein_g,
            'carbs_g': nutrition_entry.total_carbs_g,
            'fat_g': nutrition_entry.total_fat_g,
            'source': nutrition_entry.source,
            'is_synced': True,
        }).execute()

        return {
            "success": True,
            "entry_id": result.data[0]['id']
        }

    async def _handle_schedule_session(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle session scheduling from calendar integration"""
        trainer_id = params["trainer_id"]
        session_details = params["session_details"]

        # Create session in database
        result = supabase.table('training_sessions').insert({
            'client_id': user_id,
            'trainer_id': trainer_id,
            'session_type': 'training',
            'scheduled_start': session_details['start_time'],
            'scheduled_end': session_details['end_time'],
            'location': session_details.get('location'),
            'notes': session_details.get('notes'),
            'status': 'scheduled',
            'source': 'a2a_calendar_integration'
        }).execute()

        session_id = result.data[0]['id']

        return {
            "success": True,
            "session_id": session_id,
            "calendar_event_id": f"fitos-session-{session_id}"
        }

    async def _handle_get_workout_program(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get current workout program for user"""
        # Get active assignment
        assignment = supabase.table('program_assignments') \
            .select('*, workout_programs(*)') \
            .eq('client_id', user_id) \
            .eq('status', 'active') \
            .single() \
            .execute()

        if not assignment.data:
            return {
                "success": False,
                "error": "No active program found"
            }

        program = assignment.data['workout_programs']

        # Get workouts for current week
        week_number = params.get('week_number', assignment.data['current_week'])

        workouts = supabase.table('program_workouts') \
            .select('*, exercises:program_exercises(*)') \
            .eq('program_id', program['id']) \
            .eq('week_number', week_number) \
            .execute()

        return {
            "success": True,
            "program": {
                "program_id": program['id'],
                "program_name": program['name'],
                "current_week": week_number,
                "workouts": workouts.data
            }
        }

    async def _handle_health_record(
        self,
        user_id: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Handle health records from EHR systems (HIPAA-compliant)"""
        health_record = FitOSHealthRecord(**params["health_record"])

        # Store in health_records table (requires HIPAA consent)
        result = supabase.table('health_records').insert({
            'user_id': user_id,
            'external_record_id': health_record.record_id,
            'record_type': health_record.record_type,
            'record_date': health_record.date.isoformat(),
            'data': health_record.data,
            'provider': health_record.provider,
            'source': health_record.source,
            'synced_at': datetime.utcnow().isoformat()
        }).execute()

        record_id = result.data[0]['id']

        # Create HIPAA audit log
        audit_result = supabase.table('audit_logs').insert({
            'user_id': user_id,
            'action': 'create',
            'resource_type': 'health_record',
            'resource_id': record_id,
            'contains_phi': True,
            'phi_categories': ['medical_history'],
            'access_reason': 'treatment',
            'source': f'a2a_integration:{health_record.source}'
        }).execute()

        return {
            "success": True,
            "record_id": record_id,
            "hipaa_audit_id": audit_result.data[0]['id']
        }


# Singleton instance
fitos_agent = FitOSAgent()
