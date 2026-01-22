"""
MyFitnessPal Integration - A2A Protocol

Implements A2A protocol communication with MyFitnessPal nutrition tracker.
Syncs food diary, nutrition logs, and meal data.

MyFitnessPal provides:
- Daily food diary
- Macro and micronutrient tracking
- Meal-by-meal breakdown
- Exercise calories
- Water intake

Reference: https://www.myfitnesspal.com/api
"""

import os
from typing import Any, Dict, List, Optional
from datetime import datetime, timedelta

import httpx
from supabase import create_client, Client

from app.agents.a2a_models import (
    A2AActionRequest,
    A2AActionResponse,
    FitOSNutritionEntry,
)
from app.agents.a2a_communication import a2a_communication


# Initialize Supabase client
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class MyFitnessPalIntegration:
    """
    MyFitnessPal A2A Integration

    Connects to MyFitnessPal via A2A protocol to retrieve
    nutrition and food diary data.
    """

    AGENT_ID = "myfitnesspal"
    API_BASE_URL = "https://api.myfitnesspal.com/v2"

    def __init__(self):
        self.http_client = httpx.AsyncClient(timeout=30.0)

    async def authenticate_user(
        self,
        user_id: str,
        authorization_code: str
    ) -> Dict[str, Any]:
        """
        Complete OAuth flow for MyFitnessPal authentication

        Args:
            user_id: FitOS user ID
            authorization_code: OAuth authorization code from MyFitnessPal

        Returns:
            Authentication result with tokens
        """
        try:
            # Exchange code for access token
            response = await self.http_client.post(
                "https://api.myfitnesspal.com/oauth2/token",
                data={
                    "grant_type": "authorization_code",
                    "code": authorization_code,
                    "client_id": os.getenv("MFP_CLIENT_ID"),
                    "client_secret": os.getenv("MFP_CLIENT_SECRET"),
                    "redirect_uri": os.getenv("MFP_REDIRECT_URI"),
                }
            )

            if response.status_code != 200:
                return {
                    "success": False,
                    "error": f"MyFitnessPal authentication failed: {response.text}"
                }

            tokens = response.json()

            # Calculate expiration
            expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))

            # Create A2A integration
            from app.agents.a2a_registry import a2a_integration_manager

            result = await a2a_integration_manager.create_integration(
                user_id=user_id,
                agent_id=self.AGENT_ID,
                data_types=["nutrition", "food_diary"],
                sync_frequency_hours=8,  # Sync 3x daily
                authentication_token=tokens["access_token"],
                authentication_expires_at=expires_at
            )

            return result

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    async def sync_nutrition_data(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Sync nutrition data from MyFitnessPal

        Args:
            user_id: FitOS user ID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Sync result with number of records imported
        """
        try:
            # Get user's MyFitnessPal integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return {
                    "success": False,
                    "error": "MyFitnessPal integration not found. Please connect MyFitnessPal first."
                }

            # Set date range (default: last 7 days)
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=7)

            # Get food diary from MyFitnessPal API
            diary_entries = await self._fetch_mfp_diary(
                integration["authentication_token"],
                start_date,
                end_date
            )

            if not diary_entries:
                return {
                    "success": True,
                    "records_synced": 0,
                    "message": "No new nutrition data available"
                }

            # Import each diary entry via A2A protocol
            imported_count = 0

            for entry in diary_entries:
                # Convert MyFitnessPal data to FitOS format
                fitos_entries = self._convert_mfp_to_fitos(entry)

                # Import each meal separately
                for fitos_entry in fitos_entries:
                    # Send via A2A protocol to FitOS agent
                    action_response = await a2a_communication.send_action_request(
                        target_agent_id="fitos-ai-coach",
                        capability_name="receive_nutrition_data",
                        parameters={
                            "user_id": user_id,
                            "nutrition_entry": fitos_entry.model_dump()
                        },
                        user_id=user_id,
                        authentication_token=integration["authentication_token"]
                    )

                    if action_response.success:
                        imported_count += 1

            # Record sync
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.record_sync(
                integration_id=integration["integration_id"],
                success=True,
                error_message=None
            )

            return {
                "success": True,
                "records_synced": imported_count,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                }
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "records_synced": 0
            }

    async def _get_user_integration(
        self,
        user_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get user's MyFitnessPal integration"""
        try:
            result = supabase.table('a2a_user_integrations') \
                .select('*') \
                .eq('user_id', user_id) \
                .eq('agent_id', self.AGENT_ID) \
                .eq('enabled', True) \
                .single() \
                .execute()

            return result.data if result.data else None

        except Exception as e:
            print(f"Error getting MyFitnessPal integration: {e}")
            return None

    async def _fetch_mfp_diary(
        self,
        access_token: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Fetch food diary from MyFitnessPal API"""
        try:
            diary_entries = []

            # MFP requires per-day requests
            current_date = start_date.date()
            while current_date <= end_date.date():
                response = await self.http_client.get(
                    f"{self.API_BASE_URL}/diary",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "mfp-client-id": os.getenv("MFP_CLIENT_ID"),
                    },
                    params={
                        "date": current_date.isoformat()
                    }
                )

                if response.status_code == 200:
                    diary_data = response.json()
                    diary_entries.append({
                        "date": current_date.isoformat(),
                        "meals": diary_data.get("items", []),
                        "totals": diary_data.get("totals", {})
                    })

                current_date += timedelta(days=1)

            return diary_entries

        except Exception as e:
            print(f"Error fetching MyFitnessPal data: {e}")
            return []

    def _convert_mfp_to_fitos(
        self,
        mfp_diary: Dict[str, Any]
    ) -> List[FitOSNutritionEntry]:
        """Convert MyFitnessPal diary to FitOS nutrition entries"""
        entries = []
        date_str = mfp_diary.get("date")

        # Group by meal type
        meals_by_type = {}
        for item in mfp_diary.get("meals", []):
            meal_type = item.get("meal_name", "snack").lower()

            # Normalize meal type
            if "breakfast" in meal_type:
                meal_type = "breakfast"
            elif "lunch" in meal_type:
                meal_type = "lunch"
            elif "dinner" in meal_type:
                meal_type = "dinner"
            else:
                meal_type = "snack"

            if meal_type not in meals_by_type:
                meals_by_type[meal_type] = []

            meals_by_type[meal_type].append(item)

        # Create entry for each meal
        for meal_type, items in meals_by_type.items():
            # Calculate totals for this meal
            total_calories = 0
            total_protein = 0
            total_carbs = 0
            total_fat = 0

            foods = []

            for item in items:
                nutritional_contents = item.get("nutritional_contents", {})

                calories = nutritional_contents.get("energy", {}).get("value", 0)
                protein = nutritional_contents.get("protein", 0)
                carbs = nutritional_contents.get("carbohydrates", 0)
                fat = nutritional_contents.get("fat", 0)

                total_calories += calories
                total_protein += protein
                total_carbs += carbs
                total_fat += fat

                foods.append({
                    "name": item.get("description", "Unknown food"),
                    "brand": item.get("brand_name"),
                    "quantity": item.get("serving_size", {}).get("value", 1),
                    "unit": item.get("serving_size", {}).get("unit", "serving"),
                    "calories": calories,
                    "protein_g": protein,
                    "carbs_g": carbs,
                    "fat_g": fat,
                })

            # Estimate timestamp based on meal type
            base_date = datetime.fromisoformat(date_str)
            meal_hour_map = {
                "breakfast": 8,
                "lunch": 12,
                "dinner": 18,
                "snack": 15
            }
            meal_hour = meal_hour_map.get(meal_type, 12)
            timestamp = base_date.replace(hour=meal_hour, minute=0, second=0)

            entry = FitOSNutritionEntry(
                timestamp=timestamp,
                meal_type=meal_type,
                foods=foods,
                total_calories=total_calories,
                total_protein_g=total_protein,
                total_carbs_g=total_carbs,
                total_fat_g=total_fat,
                source="myfitnesspal"
            )

            entries.append(entry)

        return entries

    async def disconnect_user(
        self,
        user_id: str
    ) -> bool:
        """Disconnect MyFitnessPal integration for a user"""
        try:
            # Get integration
            integration = await self._get_user_integration(user_id)
            if not integration:
                return False

            # Revoke MyFitnessPal token
            await self.http_client.post(
                "https://api.myfitnesspal.com/oauth2/revoke",
                data={
                    "token": integration["authentication_token"],
                    "client_id": os.getenv("MFP_CLIENT_ID"),
                    "client_secret": os.getenv("MFP_CLIENT_SECRET"),
                }
            )

            # Disable integration
            from app.agents.a2a_registry import a2a_integration_manager

            await a2a_integration_manager.disable_integration(
                integration_id=integration["integration_id"]
            )

            return True

        except Exception as e:
            print(f"Error disconnecting MyFitnessPal: {e}")
            return False


# Singleton instance
myfitnesspal_integration = MyFitnessPalIntegration()
