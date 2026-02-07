# Sprint 39: Integration Marketplace v2

**Duration:** 2 weeks
**Phase:** 3E - Scale & Enterprise
**Strategic Value:** Enable trainers to connect existing tools, reducing onboarding friction by 60%

---

## Overview

Implement integration marketplace with Zapier webhooks, Google Calendar 2-way sync, Calendly, and Acuity Scheduling. This reduces platform switching and enables trainers to continue using their existing scheduling/CRM tools while leveraging FitOS's AI capabilities.

**Market Context:**
- 46% of trainers use 5-10 different tools daily (Gap Analysis)
- Calendar sync is the #1 requested integration feature
- Zapier webhooks enable 5,000+ app integrations without custom development

---

## Research Summary

### Zapier Webhooks
**Sources:**
- [Zapier API Best Practices](https://zapier.com/engineering/api-best-practices/)
- [Webhooks by Zapier Integration](https://zapier.com/apps/webhook/integrations)
- [How to get started with Webhooks by Zapier](https://help.zapier.com/hc/en-us/articles/8496083355661-How-to-get-started-with-Webhooks-by-Zapier)

**Key Findings:**
- **Security:** Use HTTPS + API keys/OAuth, verify payloads, secure endpoints with SSL/TLS
- **Payload Formats:** Support Form (URL-encoded), JSON, and XML
- **Rate Limits:** Zapier polls every 5-15 minutes for triggers; webhooks push real-time
- **Best Practice:** Webhooks preferred over polling for time-sensitive automation
- **Line Items:** Send arrays of objects for batch processing

### Google Calendar API
**Sources:**
- [Synchronize resources efficiently - Google Calendar](https://developers.google.com/workspace/calendar/api/guides/sync)
- [How to Integrate Google Calendar API Into Your App](https://www.onecal.io/blog/how-to-integrate-google-calendar-api-into-your-app)
- [Periodic synchronizations - Google Calendar integration](https://lorisleiva.com/google-calendar-integration/periodic-synchronizations)

**Key Findings:**
- **Incremental Sync:** 2-stage process (initial full sync + incremental updates)
- **Sync Tokens:** Prevent re-syncing entire calendar; only fetch latest changes
- **Webhook Support:** Push notifications expire in ~24 hours; requires renewal before expiry
- **Limitation:** Sync tokens incompatible with date bounds (can't filter by date range)
- **Standard:** API updated December 2025, stable for 2026

### Calendly API v2
**Sources:**
- [Webhooks overview - Calendly Help Center](https://help.calendly.com/hc/en-us/articles/223195488-Webhooks-overview)
- [Calendly Webhooks: The Complete Guide for 2026](https://zeeg.me/en/blog/post/calendly-webhooks)
- [Receive data from scheduled events in real time](https://developer.calendly.com/receive-data-from-scheduled-events-in-real-time-with-webhook-subscriptions)

**Key Findings:**
- **API Version:** v2 is now the standard (v1 deprecated May 2025)
- **Event Types:**
  - `invitee.created` - New appointment booked
  - `invitee.canceled` - Appointment canceled
  - `routing_form_submission` - Routing form submitted
- **Authentication:** Personal access token or OAuth application
- **Access:** Webhooks require paid premium subscription or above
- **Real-Time:** Payloads sent immediately to server endpoint

### Acuity Scheduling API
**Sources:**
- [Webhooks - Acuity Scheduling Developers](https://developers.acuityscheduling.com/docs/webhooks)
- [Quick guide to implementing webhooks in Acuity Scheduling](https://rollout.com/integration-guides/acuity-scheduling/quick-guide-to-implementing-webhooks-in-acuity-scheduling)

**Key Findings:**
- **Event Types:** Appointment scheduled, canceled, rescheduled, packages/gift certificates/subscriptions ordered
- **Setup:** Static webhooks (account settings) or dynamic webhooks (API)
- **Security:** Signed with admin API key; verify signatures to confirm origin
- **Retry Logic:** Exponential backoff over 24 hours; auto-disable after 5 days of 500 errors
- **Port Requirements:** HTTPS (443) or HTTP (80)
- **Limits:** 25 webhooks per account max

---

## Technical Architecture

### 1. Webhook Infrastructure (All Integrations)

**Database Schema:**
```sql
-- apps/supabase/migrations/00027_integration_marketplace.sql

CREATE TABLE integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Integration details
    integration_type TEXT NOT NULL CHECK (integration_type IN ('zapier', 'google_calendar', 'calendly', 'acuity')),
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disconnected', 'error')),

    -- Authentication
    auth_type TEXT NOT NULL CHECK (auth_type IN ('api_key', 'oauth', 'webhook_signature')),
    encrypted_credentials JSONB NOT NULL, -- API keys, OAuth tokens, etc.

    -- Configuration
    config JSONB DEFAULT '{}',
    sync_direction TEXT CHECK (sync_direction IN ('one_way_to_fitos', 'one_way_from_fitos', 'two_way')),

    -- Sync state (for Google Calendar)
    last_sync_at TIMESTAMPTZ,
    sync_token TEXT,
    next_sync_at TIMESTAMPTZ,

    -- Webhook details (for Zapier, Calendly, Acuity)
    webhook_url TEXT,
    webhook_secret TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, integration_type, name)
);

CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

    -- Event details
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    signature TEXT,

    -- Processing
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,

    -- Metadata
    received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    INDEX (integration_id, status),
    INDEX (received_at DESC)
);

CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    integration_id UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,

    -- Subscription details
    external_subscription_id TEXT, -- Calendly/Acuity subscription ID
    event_types TEXT[] NOT NULL,
    target_url TEXT NOT NULL,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired', 'failed')),
    expires_at TIMESTAMPTZ, -- For Google Calendar push notifications

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Webhook Handler (FastAPI):**
```python
# apps/ai-backend/app/routes/integrations.py

from fastapi import APIRouter, Request, HTTPException, Header, status
from typing import Optional
import hashlib
import hmac

router = APIRouter(prefix="/api/v1/integrations", tags=["integrations"])

@router.post("/webhooks/zapier")
async def zapier_webhook(
    request: Request,
    x_zapier_signature: Optional[str] = Header(None)
):
    """
    Receive webhook from Zapier.

    Security: Verify signature if provided
    Payload: JSON format (recommended)
    """
    body = await request.json()

    # Verify signature if present
    if x_zapier_signature:
        # Implement signature verification
        pass

    # Process webhook
    event_type = body.get("event_type")

    # Route to appropriate handler
    handlers = {
        "client.created": handle_client_created,
        "workout.completed": handle_workout_completed,
        "nutrition.logged": handle_nutrition_logged,
    }

    handler = handlers.get(event_type)
    if handler:
        await handler(body)

    return {"status": "received"}

@router.post("/webhooks/calendly")
async def calendly_webhook(
    request: Request,
    calendly_webhook_signature: Optional[str] = Header(None)
):
    """
    Receive webhook from Calendly API v2.

    Events:
    - invitee.created
    - invitee.canceled
    - routing_form_submission
    """
    body = await request.json()

    # Verify signature
    if calendly_webhook_signature:
        # Verify using webhook signing key
        pass

    event_type = body.get("event")
    payload = body.get("payload")

    if event_type == "invitee.created":
        await handle_calendly_booking(payload)
    elif event_type == "invitee.canceled":
        await handle_calendly_cancellation(payload)

    return {"status": "received"}

@router.post("/webhooks/acuity")
async def acuity_webhook(
    request: Request
):
    """
    Receive webhook from Acuity Scheduling.

    Events:
    - appointment.scheduled
    - appointment.canceled
    - appointment.rescheduled
    - order.completed
    """
    body = await request.json()

    # Verify signature using API key
    signature = body.get("signature")
    if signature:
        # Verify with admin API key
        pass

    action = body.get("action")
    appointment = body.get("appointment")

    if action == "scheduled":
        await handle_acuity_booking(appointment)
    elif action in ["canceled", "rescheduled"]:
        await handle_acuity_update(appointment, action)

    return {"status": "received"}
```

### 2. Google Calendar 2-Way Sync

**Implementation Strategy:**
- **Initial Setup:** OAuth 2.0 flow for user authorization
- **Full Sync:** Fetch all events on first connection
- **Incremental Sync:** Use sync tokens for subsequent updates
- **Push Notifications:** Register webhook channel (renew every 24 hours)
- **Conflict Resolution:** Last-write-wins with user notification

**Sync Service:**
```python
# apps/ai-backend/app/integrations/google_calendar.py

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from datetime import datetime, timedelta

class GoogleCalendarSync:
    def __init__(self, user_id: str, credentials: dict):
        self.user_id = user_id
        self.creds = Credentials(**credentials)
        self.service = build('calendar', 'v3', credentials=self.creds)

    async def initial_sync(self, calendar_id: str = 'primary'):
        """
        Perform initial full sync.
        Returns sync token for incremental updates.
        """
        events_result = self.service.events().list(
            calendarId=calendar_id,
            maxResults=2500,
            singleEvents=True,
            orderBy='startTime'
        ).execute()

        events = events_result.get('items', [])
        sync_token = events_result.get('nextSyncToken')

        # Store events in FitOS database
        await self.store_events(events)

        return sync_token

    async def incremental_sync(self, calendar_id: str, sync_token: str):
        """
        Perform incremental sync using sync token.
        """
        events_result = self.service.events().list(
            calendarId=calendar_id,
            syncToken=sync_token
        ).execute()

        events = events_result.get('items', [])
        new_sync_token = events_result.get('nextSyncToken')

        # Update events in FitOS database
        await self.update_events(events)

        return new_sync_token

    async def setup_push_notifications(self, webhook_url: str):
        """
        Setup push notifications (expire in ~24 hours).
        """
        channel_id = f"fitos_{self.user_id}_{datetime.now().timestamp()}"

        body = {
            'id': channel_id,
            'type': 'web_hook',
            'address': webhook_url,
            'expiration': int((datetime.now() + timedelta(hours=23)).timestamp() * 1000)
        }

        watch_result = self.service.events().watch(
            calendarId='primary',
            body=body
        ).execute()

        return watch_result

    async def create_event(self, event_data: dict):
        """
        Create event in Google Calendar (FitOS → Google).
        """
        event = self.service.events().insert(
            calendarId='primary',
            body=event_data
        ).execute()

        return event

    async def update_event(self, event_id: str, event_data: dict):
        """
        Update event in Google Calendar.
        """
        event = self.service.events().update(
            calendarId='primary',
            eventId=event_id,
            body=event_data
        ).execute()

        return event
```

### 3. Zapier Webhook Triggers

**Outbound Webhooks (FitOS → Zapier):**

```python
# apps/ai-backend/app/integrations/zapier.py

import httpx
from typing import Dict, Any, List

class ZapierWebhooks:
    @staticmethod
    async def send_trigger(webhook_url: str, data: Dict[str, Any]):
        """
        Send webhook to Zapier.

        Payload format: JSON (recommended)
        Line items: Use array of objects for batch processing
        """
        async with httpx.AsyncClient() as client:
            response = await client.post(
                webhook_url,
                json=data,
                timeout=10.0
            )

            if response.status_code != 200:
                raise Exception(f"Zapier webhook failed: {response.status_code}")

            return response.json()

    @staticmethod
    async def send_batch_trigger(webhook_url: str, items: List[Dict[str, Any]]):
        """
        Send batch of items to Zapier.
        Each item will be processed as a separate Zap run.
        """
        return await ZapierWebhooks.send_trigger(webhook_url, items)

# Event handlers
async def on_workout_completed(user_id: str, workout_data: dict):
    """
    Trigger Zapier when workout is completed.
    """
    # Get user's Zapier integrations
    integrations = await get_user_integrations(user_id, "zapier")

    for integration in integrations:
        if "workout.completed" in integration.config.get("events", []):
            await ZapierWebhooks.send_trigger(
                integration.webhook_url,
                {
                    "event_type": "workout.completed",
                    "user_id": user_id,
                    "workout_id": workout_data["id"],
                    "workout_name": workout_data["name"],
                    "duration_minutes": workout_data["duration"],
                    "exercises_completed": workout_data["exercises_count"],
                    "completed_at": workout_data["completed_at"]
                }
            )
```

**Available Triggers:**
- `client.created` - New client added
- `workout.completed` - Workout logged
- `nutrition.logged` - Meal/food logged
- `message.received` - New message from client
- `payment.received` - Payment processed
- `goal.achieved` - Client reaches goal milestone
- `check_in.submitted` - Weekly check-in completed

---

## Implementation Plan

### Week 1: Webhook Infrastructure + Google Calendar

**Day 1-2: Database & Core Webhook Handler**
- [ ] Create migration `00027_integration_marketplace.sql`
- [ ] Build FastAPI webhook endpoints
- [ ] Implement signature verification for all platforms
- [ ] Add retry logic with exponential backoff

**Day 3-4: Google Calendar OAuth + Sync**
- [ ] Implement OAuth 2.0 flow (using Supabase Auth)
- [ ] Build initial sync functionality
- [ ] Implement incremental sync with sync tokens
- [ ] Setup push notification renewal cron job

**Day 5: Google Calendar 2-Way Sync**
- [ ] FitOS → Google: Create/update events when workouts scheduled
- [ ] Google → FitOS: Update FitOS when calendar events change
- [ ] Implement conflict resolution
- [ ] Add sync status dashboard

### Week 2: Calendly + Acuity + Zapier + UI

**Day 6-7: Calendly & Acuity Integration**
- [ ] Build Calendly webhook handler (v2 API)
- [ ] Build Acuity webhook handler
- [ ] Map appointment data to FitOS client sessions
- [ ] Add webhook subscription management

**Day 8-9: Zapier Triggers**
- [ ] Implement 7 outbound webhook triggers
- [ ] Add webhook URL configuration per integration
- [ ] Build event filtering (allow users to select which events to send)
- [ ] Create Zapier integration documentation

**Day 10: Integration Management UI**
- [ ] Build integration marketplace page (Angular)
- [ ] Add "Connect" buttons for each integration
- [ ] Show sync status and last sync time
- [ ] Add webhook event log viewer
- [ ] Allow users to pause/disconnect integrations

---

## Success Metrics

### Technical Metrics
- [ ] Webhook delivery success rate: >99%
- [ ] Google Calendar sync latency: <30 seconds
- [ ] Calendly/Acuity event processing: <5 seconds
- [ ] Zapier webhook delivery: <2 seconds
- [ ] Push notification renewal uptime: 100%

### User Metrics
- [ ] Integration adoption: >50% of trainers connect at least one integration
- [ ] Calendar sync usage: >70% of users with Google Calendar
- [ ] Zapier automation creation: >30% of power users
- [ ] Support tickets for sync issues: <5% of users

---

## Security Considerations

1. **Credentials Storage:**
   - Encrypt OAuth tokens and API keys using Supabase Vault
   - Rotate credentials every 90 days
   - Use separate encryption keys per user

2. **Webhook Verification:**
   - Always verify signatures for Calendly, Acuity
   - Rate limit webhook endpoints (100 req/min per integration)
   - Log all webhook attempts for audit trail

3. **OAuth Scopes:**
   - Google Calendar: `calendar.events` (read/write events only)
   - Minimal permissions principle

4. **Data Retention:**
   - Webhook events: Keep for 30 days
   - Sync tokens: Keep until integration disconnected
   - Error logs: Keep for 90 days

---

## Testing Plan

### Unit Tests
- [ ] Webhook signature verification (all platforms)
- [ ] Google Calendar sync token logic
- [ ] Event conflict resolution
- [ ] Retry logic with exponential backoff

### Integration Tests
- [ ] End-to-end Google Calendar OAuth flow
- [ ] Calendly webhook → FitOS appointment creation
- [ ] Acuity webhook → FitOS appointment creation
- [ ] Zapier trigger → External action (use Zapier test webhook)

### Load Tests
- [ ] 1000 concurrent webhook deliveries
- [ ] 100 Google Calendar syncs per minute
- [ ] Webhook retry queue performance

---

## Documentation

### User-Facing
- Integration marketplace landing page
- Setup guides for each integration:
  - "How to connect Google Calendar"
  - "How to sync Calendly appointments"
  - "How to automate with Zapier"
- Troubleshooting guide

### Developer-Facing
- Webhook payload schemas
- Zapier trigger event types
- API rate limits and best practices
- Error codes and retry behavior

---

## Future Enhancements (Post-Sprint 39)

- **Additional Integrations:**
  - Zoom (auto-create meeting links for virtual sessions)
  - Stripe (payment reconciliation)
  - Mailchimp (email list sync)
  - QuickBooks (accounting integration)

- **Zapier App:**
  - Publish official Zapier app (not just webhooks)
  - Pre-built Zap templates for common workflows

- **Integration Analytics:**
  - Track which integrations drive highest engagement
  - A/B test integration prompts to increase adoption

---

## References

### Zapier
- [Zapier API Best Practices](https://zapier.com/engineering/api-best-practices/)
- [Webhooks by Zapier Integration](https://zapier.com/apps/webhook/integrations)
- [How to get started with Webhooks by Zapier](https://help.zapier.com/hc/en-us/articles/8496083355661-How-to-get-started-with-Webhooks-by-Zapier)
- [Send webhooks in Zaps](https://help.zapier.com/hc/en-us/articles/8496326446989-Send-webhooks-in-Zaps)
- [Trigger Zaps from webhooks](https://help.zapier.com/hc/en-us/articles/8496288690317-Trigger-Zaps-from-webhooks)

### Google Calendar
- [Synchronize resources efficiently - Google Calendar](https://developers.google.com/workspace/calendar/api/guides/sync)
- [How to Integrate Google Calendar API Into Your App](https://www.onecal.io/blog/how-to-integrate-google-calendar-api-into-your-app)
- [Periodic synchronizations - Google Calendar integration](https://lorisleiva.com/google-calendar-integration/periodic-synchronizations)
- [Guide to Google Calendar API Integration](https://www.unipile.com/guide-to-google-calendar-api-integration/)

### Calendly
- [Webhooks overview - Calendly Help Center](https://help.calendly.com/hc/en-us/articles/223195488-Webhooks-overview)
- [Calendly Webhooks: The Complete Guide for 2026](https://zeeg.me/en/blog/post/calendly-webhooks)
- [Receive data from scheduled events in real time](https://developer.calendly.com/receive-data-from-scheduled-events-in-real-time-with-webhook-subscriptions)
- [Getting Started with Calendly API](https://developer.calendly.com/getting-started)

### Acuity Scheduling
- [Webhooks - Acuity Scheduling Developers](https://developers.acuityscheduling.com/docs/webhooks)
- [Quick guide to implementing webhooks in Acuity Scheduling](https://rollout.com/integration-guides/acuity-scheduling/quick-guide-to-implementing-webhooks-in-acuity-scheduling)
- [Acuity Scheduling API Essentials](https://rollout.com/integration-guides/acuity-scheduling/api-essentials)

---

## Sprint 39 Summary

**Backend Components:**
- Webhook infrastructure (Zapier, Calendly, Acuity)
- Google Calendar 2-way sync
- Integration management API
- Webhook event processing queue

**Frontend Components:**
- Integration marketplace page
- OAuth connection flows
- Sync status dashboard
- Webhook event log viewer

**Database:**
- `integrations` table
- `webhook_events` table
- `webhook_subscriptions` table

**Story Points:** 21 points (2-week sprint)
- Webhook infrastructure: 5 points
- Google Calendar sync: 8 points
- Calendly/Acuity: 4 points
- Zapier triggers: 2 points
- UI: 2 points
