"""
Acuity Scheduling Webhook Integration

Enables automatic booking sync from Acuity Scheduling to FitOS.

Features:
- Webhook receiver for Acuity Scheduling events
- Signature verification using API key
- Event types: scheduled, canceled, rescheduled, order.completed
- Retry logic with exponential backoff (24 hours)
- Auto-disable after 5 days of failures

Event Types:
- appointment.scheduled: New appointment booked
- appointment.canceled: Appointment canceled
- appointment.rescheduled: Appointment time changed
- order.completed: Package/gift certificate/subscription purchased

Webhook Configuration:
- Static webhooks: Set in Acuity account settings
- Dynamic webhooks: Create via API
- Port requirements: HTTPS (443) or HTTP (80)
- Limit: 25 webhooks per account

Sprint 39: Integration Marketplace v2
"""

from typing import Dict, Any, Optional
from datetime import datetime
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


class AcuityWebhook:
    """
    Acuity Scheduling webhook processor.

    Security: Webhooks signed with admin API key
    Retry: Exponential backoff over 24 hours
    Auto-disable: After 5 days of 500 errors
    """

    @staticmethod
    def verify_signature(
        payload: bytes,
        signature: str,
        api_key: str
    ) -> bool:
        """
        Verify webhook signature from Acuity Scheduling.

        Acuity signs webhooks using the admin API key.

        Args:
            payload: Raw request body
            signature: Signature from request
            api_key: Admin API key from Acuity

        Returns:
            True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                api_key.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()

            is_valid = hmac.compare_digest(signature, expected_signature)

            if not is_valid:
                logger.warning("Acuity webhook signature verification failed")

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying Acuity signature: {str(e)}")
            return False

    @staticmethod
    async def process_webhook(
        action: str,
        appointment: Optional[Dict[str, Any]] = None,
        order: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process Acuity webhook event.

        Args:
            action: Action type (scheduled, canceled, rescheduled, order.completed)
            appointment: Appointment data (for appointment events)
            order: Order data (for order.completed events)

        Returns:
            Processing result
        """
        try:
            logger.info(f"Processing Acuity webhook: {action}")

            if action == "scheduled":
                return await AcuityWebhook.handle_scheduled(appointment)
            elif action == "canceled":
                return await AcuityWebhook.handle_canceled(appointment)
            elif action == "rescheduled":
                return await AcuityWebhook.handle_rescheduled(appointment)
            elif action == "order.completed":
                return await AcuityWebhook.handle_order_completed(order)
            else:
                logger.warning(f"Unknown Acuity action: {action}")
                return {"status": "ignored", "reason": "unknown_action"}

        except Exception as e:
            logger.error(f"Error processing Acuity webhook: {str(e)}")
            raise

    @staticmethod
    async def handle_scheduled(appointment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle appointment.scheduled event (new appointment booked).

        Appointment structure:
        - id: Appointment ID
        - firstName, lastName: Client name
        - email, phone: Contact info
        - datetime: Appointment time (ISO 8601)
        - appointmentType: Service type
        - calendar: Assigned calendar/staff

        Returns:
            Created appointment details
        """
        appointment_data = {
            "external_booking_id": str(appointment.get("id")),
            "title": appointment.get("type", "Acuity Appointment"),
            "start_time": appointment.get("datetime"),
            "end_time": appointment.get("endTime"),
            "timezone": appointment.get("timezone"),
            "client_name": f"{appointment.get('firstName', '')} {appointment.get('lastName', '')}".strip(),
            "client_email": appointment.get("email"),
            "client_phone": appointment.get("phone"),
            "status": "scheduled"
        }

        # Extract custom form fields
        forms = appointment.get("forms", [])
        custom_fields = {}
        for form in forms:
            for field in form.get("values", []):
                custom_fields[field.get("name")] = field.get("value")

        appointment_data["custom_fields"] = custom_fields

        logger.info(
            f"Acuity appointment scheduled: {appointment_data['client_email']} "
            f"on {appointment_data['start_time']}"
        )

        # TODO: Save to database (appointment_bookings table)
        # TODO: Match client by email or create new lead
        # TODO: Send notification to trainer

        return {
            "status": "created",
            "appointment": appointment_data
        }

    @staticmethod
    async def handle_canceled(appointment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle appointment.canceled event.

        Returns:
            Cancellation result
        """
        external_booking_id = str(appointment.get("id"))

        logger.info(f"Acuity appointment canceled: {external_booking_id}")

        # TODO: Update appointment status in database
        # TODO: Send cancellation notification to trainer

        return {
            "status": "canceled",
            "external_booking_id": external_booking_id,
            "canceled_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    async def handle_rescheduled(appointment: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle appointment.rescheduled event (time changed).

        Returns:
            Rescheduled appointment details
        """
        external_booking_id = str(appointment.get("id"))
        new_time = appointment.get("datetime")

        logger.info(
            f"Acuity appointment rescheduled: {external_booking_id} "
            f"to {new_time}"
        )

        # TODO: Update appointment time in database
        # TODO: Send reschedule notification to trainer

        return {
            "status": "rescheduled",
            "external_booking_id": external_booking_id,
            "new_start_time": new_time,
            "new_end_time": appointment.get("endTime"),
            "rescheduled_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    async def handle_order_completed(order: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle order.completed event.

        Order types:
        - Package
        - Gift certificate
        - Subscription

        Returns:
            Order details
        """
        order_data = {
            "order_id": order.get("id"),
            "order_type": order.get("type"),
            "amount": order.get("amount"),
            "client_email": order.get("email"),
            "client_name": order.get("name")
        }

        logger.info(
            f"Acuity order completed: {order_data['order_type']} "
            f"for {order_data['client_email']}"
        )

        # TODO: Process order (create package credits, etc.)
        # TODO: Send confirmation to trainer

        return {
            "status": "processed",
            "order": order_data
        }

    @staticmethod
    def parse_acuity_time(time_str: str) -> datetime:
        """
        Parse Acuity ISO 8601 timestamp.

        Args:
            time_str: ISO 8601 timestamp

        Returns:
            datetime object
        """
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))

    @staticmethod
    async def fetch_appointment_details(
        appointment_id: int,
        user_id: str,
        api_key: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch full appointment details from Acuity API.

        Args:
            appointment_id: Acuity appointment ID
            user_id: Acuity user ID
            api_key: Acuity API key

        Returns:
            Appointment details or None if error
        """
        import httpx
        import base64

        try:
            # Acuity uses Basic Auth
            auth = base64.b64encode(f"{user_id}:{api_key}".encode()).decode()

            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://acuityscheduling.com/api/v1/appointments/{appointment_id}",
                    headers={
                        "Authorization": f"Basic {auth}",
                        "Content-Type": "application/json"
                    }
                )

                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"Error fetching Acuity appointment details: {str(e)}")
            return None

    @staticmethod
    async def create_webhook_subscription(
        user_id: str,
        api_key: str,
        target_url: str,
        event: str = "appointment.scheduled"
    ) -> Optional[Dict[str, Any]]:
        """
        Create dynamic webhook subscription via Acuity API.

        Args:
            user_id: Acuity user ID
            api_key: Acuity API key
            target_url: FitOS webhook endpoint URL
            event: Event type to subscribe to

        Returns:
            Webhook details or None if error
        """
        import httpx
        import base64

        try:
            auth = base64.b64encode(f"{user_id}:{api_key}".encode()).decode()

            async with httpx.AsyncClient() as client:
                response = await client.post(
                    "https://acuityscheduling.com/api/v1/webhooks",
                    headers={
                        "Authorization": f"Basic {auth}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "event": event,
                        "target": target_url
                    }
                )

                response.raise_for_status()
                webhook = response.json()

                logger.info(
                    f"Acuity webhook created: {webhook.get('id')} "
                    f"for event {event}"
                )

                return webhook

        except Exception as e:
            logger.error(f"Error creating Acuity webhook: {str(e)}")
            return None

    @staticmethod
    async def delete_webhook_subscription(
        user_id: str,
        api_key: str,
        webhook_id: int
    ) -> bool:
        """
        Delete webhook subscription via Acuity API.

        Args:
            user_id: Acuity user ID
            api_key: Acuity API key
            webhook_id: Webhook ID to delete

        Returns:
            True if successful
        """
        import httpx
        import base64

        try:
            auth = base64.b64encode(f"{user_id}:{api_key}".encode()).decode()

            async with httpx.AsyncClient() as client:
                response = await client.delete(
                    f"https://acuityscheduling.com/api/v1/webhooks/{webhook_id}",
                    headers={
                        "Authorization": f"Basic {auth}"
                    }
                )

                response.raise_for_status()

                logger.info(f"Acuity webhook deleted: {webhook_id}")
                return True

        except Exception as e:
            logger.error(f"Error deleting Acuity webhook: {str(e)}")
            return False


# Export class
__all__ = ["AcuityWebhook"]
