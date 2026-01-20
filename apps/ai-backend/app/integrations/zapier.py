"""
Zapier Webhooks Integration

Enables trainers to connect FitOS with 5,000+ apps through Zapier webhooks.

Features:
- Outbound webhook triggers (FitOS → Zapier)
- Inbound webhook actions (Zapier → FitOS)
- Batch processing with line items
- Signature verification for security

Available Triggers:
- client.created - New client added
- workout.completed - Workout logged
- nutrition.logged - Meal/food logged
- message.received - New message from client
- payment.received - Payment processed
- goal.achieved - Client reaches goal milestone
- check_in.submitted - Weekly check-in completed

Sprint 39: Integration Marketplace v2
"""

import httpx
import hmac
import hashlib
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class ZapierWebhooks:
    """
    Zapier webhook integration for outbound triggers.

    Best Practices (Zapier Engineering Blog):
    - Use HTTPS for all webhook URLs
    - Send JSON payloads (recommended over form-encoded)
    - Use arrays of objects for batch processing
    - Implement retry logic with exponential backoff
    - Rate limit: Zapier polls every 5-15 minutes for triggers
    """

    @staticmethod
    async def send_trigger(
        webhook_url: str,
        data: Dict[str, Any],
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """
        Send webhook trigger to Zapier.

        Args:
            webhook_url: Zapier webhook URL
            data: Event payload (JSON format recommended)
            timeout: Request timeout in seconds

        Returns:
            Response from Zapier

        Raises:
            httpx.HTTPError: If webhook delivery fails
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    webhook_url,
                    json=data,
                    timeout=timeout,
                    headers={
                        "Content-Type": "application/json",
                        "User-Agent": "FitOS/1.0"
                    }
                )

                response.raise_for_status()

                logger.info(
                    f"Zapier webhook sent successfully: {data.get('event_type')} "
                    f"to {webhook_url[:50]}..."
                )

                return response.json() if response.text else {"status": "success"}

        except httpx.HTTPError as e:
            logger.error(f"Zapier webhook failed: {str(e)}")
            raise

    @staticmethod
    async def send_batch_trigger(
        webhook_url: str,
        items: List[Dict[str, Any]],
        timeout: float = 10.0
    ) -> Dict[str, Any]:
        """
        Send batch of items to Zapier (line items).

        Each item in the array will be processed as a separate Zap run.

        Args:
            webhook_url: Zapier webhook URL
            items: Array of event payloads
            timeout: Request timeout in seconds

        Returns:
            Response from Zapier
        """
        return await ZapierWebhooks.send_trigger(webhook_url, items, timeout)

    @staticmethod
    def verify_signature(
        payload: bytes,
        signature: str,
        secret: str
    ) -> bool:
        """
        Verify webhook signature from Zapier (if configured).

        Args:
            payload: Raw request body
            signature: Signature from X-Zapier-Signature header
            secret: Webhook secret key

        Returns:
            True if signature is valid
        """
        expected_signature = hmac.new(
            secret.encode(),
            payload,
            hashlib.sha256
        ).hexdigest()

        return hmac.compare_digest(signature, expected_signature)


class ZapierEventHandlers:
    """
    Event handlers that trigger Zapier webhooks.

    These methods are called from various parts of the FitOS application
    when events occur (e.g., workout completed, client created).
    """

    @staticmethod
    async def on_client_created(
        user_id: str,
        trainer_id: str,
        client_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a new client is created.

        Payload:
        - event_type: client.created
        - client_id, client_name, client_email
        - trainer_id, trainer_name
        - created_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "client.created",
                "client_id": user_id,
                "client_name": client_data.get("name"),
                "client_email": client_data.get("email"),
                "client_phone": client_data.get("phone"),
                "trainer_id": trainer_id,
                "trainer_name": client_data.get("trainer_name"),
                "created_at": datetime.utcnow().isoformat(),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_workout_completed(
        user_id: str,
        workout_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a workout is completed.

        Payload:
        - event_type: workout.completed
        - workout_id, workout_name, duration_minutes
        - exercises_completed, total_volume_lbs
        - completed_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "workout.completed",
                "user_id": user_id,
                "workout_id": workout_data["id"],
                "workout_name": workout_data["name"],
                "duration_minutes": workout_data.get("duration_minutes"),
                "exercises_completed": workout_data.get("exercises_count", 0),
                "total_volume_lbs": workout_data.get("total_volume", 0),
                "completed_at": workout_data.get("completed_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_nutrition_logged(
        user_id: str,
        nutrition_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when nutrition is logged.

        Payload:
        - event_type: nutrition.logged
        - meal_type (breakfast, lunch, dinner, snack)
        - calories, protein_g, carbs_g, fat_g
        - logged_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "nutrition.logged",
                "user_id": user_id,
                "meal_type": nutrition_data.get("meal_type"),
                "food_items": nutrition_data.get("food_items", []),
                "calories": nutrition_data.get("calories", 0),
                "protein_g": nutrition_data.get("protein_g", 0),
                "carbs_g": nutrition_data.get("carbs_g", 0),
                "fat_g": nutrition_data.get("fat_g", 0),
                "logged_at": nutrition_data.get("logged_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_message_received(
        user_id: str,
        trainer_id: str,
        message_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a new message is received.

        Payload:
        - event_type: message.received
        - message_id, message_text, sender_id
        - conversation_id
        - received_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "message.received",
                "message_id": message_data["id"],
                "conversation_id": message_data.get("conversation_id"),
                "sender_id": user_id,
                "sender_name": message_data.get("sender_name"),
                "recipient_id": trainer_id,
                "message_text": message_data.get("text"),
                "has_attachment": message_data.get("has_attachment", False),
                "received_at": message_data.get("created_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_payment_received(
        user_id: str,
        payment_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a payment is received.

        Payload:
        - event_type: payment.received
        - payment_id, amount, currency
        - client_id, trainer_id
        - payment_method
        - received_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "payment.received",
                "payment_id": payment_data["id"],
                "amount": payment_data["amount"],
                "currency": payment_data.get("currency", "usd"),
                "client_id": user_id,
                "client_name": payment_data.get("client_name"),
                "trainer_id": payment_data.get("trainer_id"),
                "payment_method": payment_data.get("payment_method"),
                "description": payment_data.get("description"),
                "received_at": payment_data.get("created_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_goal_achieved(
        user_id: str,
        goal_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a client achieves a goal.

        Payload:
        - event_type: goal.achieved
        - goal_id, goal_name, goal_type
        - target_value, achieved_value
        - achieved_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "goal.achieved",
                "user_id": user_id,
                "goal_id": goal_data["id"],
                "goal_name": goal_data["name"],
                "goal_type": goal_data.get("type"),
                "target_value": goal_data.get("target_value"),
                "achieved_value": goal_data.get("achieved_value"),
                "unit": goal_data.get("unit"),
                "achieved_at": goal_data.get("achieved_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )

    @staticmethod
    async def on_check_in_submitted(
        user_id: str,
        check_in_data: Dict[str, Any],
        zapier_webhook_url: str
    ):
        """
        Trigger Zapier when a weekly check-in is submitted.

        Payload:
        - event_type: check_in.submitted
        - check_in_id, week_number
        - weight, body_fat_percentage
        - progress_photos_count
        - submitted_at
        """
        await ZapierWebhooks.send_trigger(
            zapier_webhook_url,
            {
                "event_type": "check_in.submitted",
                "user_id": user_id,
                "check_in_id": check_in_data["id"],
                "week_number": check_in_data.get("week_number"),
                "weight_lbs": check_in_data.get("weight"),
                "body_fat_percentage": check_in_data.get("body_fat"),
                "progress_photos_count": check_in_data.get("photos_count", 0),
                "notes": check_in_data.get("notes"),
                "submitted_at": check_in_data.get("submitted_at", datetime.utcnow().isoformat()),
                "metadata": {
                    "source": "fitos",
                    "version": "1.0"
                }
            }
        )


# Export classes
__all__ = ["ZapierWebhooks", "ZapierEventHandlers"]
