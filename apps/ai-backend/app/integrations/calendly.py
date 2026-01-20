"""
Calendly Webhook Integration

Enables automatic booking sync from Calendly to FitOS.

Features:
- Webhook receiver for Calendly API v2 events
- Signature verification for security
- 3 event types: invitee.created, invitee.canceled, routing_form_submission
- Auto-create FitOS appointments from Calendly bookings
- Client matching by email

Event Types:
- invitee.created: New appointment booked
- invitee.canceled: Appointment canceled (by host or invitee)
- routing_form_submission: Routing form submitted

Requirements:
- Calendly paid premium subscription or above
- Personal access token or OAuth application

Sprint 39: Integration Marketplace v2
"""

from typing import Dict, Any, Optional
from datetime import datetime
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)


class CalendlyWebhook:
    """
    Calendly webhook processor for API v2.

    API v2 is the standard as of 2026 (v1 deprecated May 2025).

    Security: Webhooks are signed with webhook signing key.
    Real-time: Payloads sent immediately to server endpoint.
    """

    @staticmethod
    def verify_signature(
        payload: bytes,
        signature: str,
        signing_key: str
    ) -> bool:
        """
        Verify webhook signature from Calendly.

        Args:
            payload: Raw request body
            signature: Signature from Calendly-Webhook-Signature header
            signing_key: Webhook signing key from Calendly

        Returns:
            True if signature is valid
        """
        try:
            expected_signature = hmac.new(
                signing_key.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()

            is_valid = hmac.compare_digest(signature, expected_signature)

            if not is_valid:
                logger.warning("Calendly webhook signature verification failed")

            return is_valid

        except Exception as e:
            logger.error(f"Error verifying Calendly signature: {str(e)}")
            return False

    @staticmethod
    async def process_webhook(
        event_type: str,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Process Calendly webhook event.

        Args:
            event_type: Event type (invitee.created, invitee.canceled, routing_form_submission)
            payload: Event payload

        Returns:
            Processing result
        """
        try:
            logger.info(f"Processing Calendly webhook: {event_type}")

            if event_type == "invitee.created":
                return await CalendlyWebhook.handle_invitee_created(payload)
            elif event_type == "invitee.canceled":
                return await CalendlyWebhook.handle_invitee_canceled(payload)
            elif event_type == "routing_form_submission":
                return await CalendlyWebhook.handle_routing_form(payload)
            else:
                logger.warning(f"Unknown Calendly event type: {event_type}")
                return {"status": "ignored", "reason": "unknown_event_type"}

        except Exception as e:
            logger.error(f"Error processing Calendly webhook: {str(e)}")
            raise

    @staticmethod
    async def handle_invitee_created(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle invitee.created event (new appointment booked).

        Payload structure:
        - event: Event URI
        - invitee: Invitee details (name, email, timezone)
        - questions_and_answers: Form responses
        - tracking: UTM parameters

        Returns:
            Created appointment details
        """
        event = payload.get("event", {})
        invitee = payload.get("invitee", {})

        # Extract appointment details
        appointment_data = {
            "external_booking_id": invitee.get("uri", "").split("/")[-1],
            "external_event_type_id": event.get("event_type", {}).get("uri", "").split("/")[-1],
            "title": event.get("name", "Calendly Appointment"),
            "start_time": event.get("start_time"),
            "end_time": event.get("end_time"),
            "timezone": invitee.get("timezone"),
            "client_name": invitee.get("name"),
            "client_email": invitee.get("email"),
            "status": "scheduled"
        }

        # Extract custom questions/answers
        qa_responses = {}
        for qa in payload.get("questions_and_answers", []):
            qa_responses[qa.get("question")] = qa.get("answer")

        appointment_data["custom_responses"] = qa_responses

        logger.info(
            f"Calendly appointment created: {appointment_data['client_email']} "
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
    async def handle_invitee_canceled(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle invitee.canceled event (appointment canceled).

        Cancellation can be initiated by host or invitee.

        Returns:
            Cancellation result
        """
        invitee = payload.get("invitee", {})
        event = payload.get("event", {})

        external_booking_id = invitee.get("uri", "").split("/")[-1]

        logger.info(f"Calendly appointment canceled: {external_booking_id}")

        # TODO: Update appointment status in database
        # TODO: Send cancellation notification to trainer

        return {
            "status": "canceled",
            "external_booking_id": external_booking_id,
            "canceled_at": datetime.utcnow().isoformat()
        }

    @staticmethod
    async def handle_routing_form(payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle routing_form_submission event.

        Routing forms can be submitted regardless of whether an appointment was booked.

        Returns:
            Routing form submission result
        """
        submission = payload.get("submission", {})
        result = payload.get("result", {})

        # Extract form responses
        form_data = {
            "submitter_email": submission.get("email"),
            "submitter_name": submission.get("name"),
            "routing_result": result.get("type"),  # 'booking' or 'custom'
            "responses": submission.get("questions_and_answers", [])
        }

        logger.info(
            f"Calendly routing form submitted: {form_data['submitter_email']}"
        )

        # TODO: Process routing form submission
        # TODO: Create lead if no booking was made

        return {
            "status": "processed",
            "form_data": form_data
        }

    @staticmethod
    def parse_calendly_time(time_str: str) -> datetime:
        """
        Parse Calendly ISO 8601 timestamp.

        Args:
            time_str: ISO 8601 timestamp (e.g., "2026-01-20T15:30:00Z")

        Returns:
            datetime object
        """
        return datetime.fromisoformat(time_str.replace("Z", "+00:00"))

    @staticmethod
    async def fetch_event_details(
        event_uri: str,
        access_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch full event details from Calendly API.

        Useful for getting additional details not included in webhook payload.

        Args:
            event_uri: Event URI from webhook payload
            access_token: Calendly personal access token or OAuth token

        Returns:
            Event details or None if error
        """
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    event_uri,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )

                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"Error fetching Calendly event details: {str(e)}")
            return None

    @staticmethod
    async def fetch_invitee_details(
        invitee_uri: str,
        access_token: str
    ) -> Optional[Dict[str, Any]]:
        """
        Fetch full invitee details from Calendly API.

        Args:
            invitee_uri: Invitee URI from webhook payload
            access_token: Calendly personal access token or OAuth token

        Returns:
            Invitee details or None if error
        """
        import httpx

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    invitee_uri,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json"
                    }
                )

                response.raise_for_status()
                return response.json()

        except Exception as e:
            logger.error(f"Error fetching Calendly invitee details: {str(e)}")
            return None


# Export class
__all__ = ["CalendlyWebhook"]
