# A2A Protocol Integration Guide

**Sprint 44: Agent-to-Agent Protocol Compatibility**
**Version:** 1.0.0
**Last Updated:** January 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [What is A2A Protocol?](#what-is-a2a-protocol)
3. [Architecture](#architecture)
4. [Supported Integrations](#supported-integrations)
5. [Getting Started](#getting-started)
6. [API Reference](#api-reference)
7. [Developer Guide](#developer-guide)
8. [Security](#security)
9. [Troubleshooting](#troubleshooting)

---

## Overview

The A2A (Agent-to-Agent) protocol enables FitOS to communicate with external AI agents and platforms through a standardized interface. This creates an ecosystem where fitness platforms, wearables, nutrition trackers, calendars, and healthcare systems can seamlessly exchange data.

**Key Benefits:**
- **Interoperability**: Connect with any A2A-compatible platform
- **Standardization**: No custom API integrations for each platform
- **Scalability**: Add new integrations without backend changes
- **Real-time Sync**: Automatic data synchronization
- **Privacy-First**: User controls all data sharing

---

## What is A2A Protocol?

The Agent-to-Agent (A2A) protocol is an emerging standard (supported by the Linux Foundation) that enables AI agents to discover capabilities and communicate with each other in a standardized way.

**Core Concepts:**

### 1. **Agent**
An AI-powered service that can perform actions and exchange data. Examples:
- FitOS AI Coach (fitness platform)
- WHOOP Recovery (wearable)
- MyFitnessPal (nutrition tracker)
- Google Calendar (scheduling)

### 2. **Capability**
A specific action an agent can perform. Examples:
- `receive_recovery_data` - Accept HRV and sleep data
- `get_nutrition_logs` - Retrieve food diary entries
- `schedule_session` - Create calendar events

### 3. **Message**
Standardized communication format:
```json
{
  "id": "uuid",
  "version": "1.0",
  "sender": "fitos-ai-coach",
  "receiver": "whoop-recovery",
  "message_type": "action_request",
  "payload": { ... }
}
```

### 4. **Registry**
Central directory of available agents and their capabilities, enabling discovery.

---

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FitOS Platform                        │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           FitOS A2A Agent (fitos-ai-coach)            │  │
│  │                                                         │  │
│  │  Capabilities:                                          │  │
│  │  - receive_recovery_data                                │  │
│  │  - receive_nutrition_data                               │  │
│  │  - schedule_session                                     │  │
│  │  - get_workout_program                                  │  │
│  │  - receive_health_record                                │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                 │
│                             ▼                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              A2A Communication Service                 │  │
│  │  - Message routing                                      │  │
│  │  - Authentication                                       │  │
│  │  - Error handling                                       │  │
│  └───────────────────────────────────────────────────────┘  │
│                             │                                 │
└─────────────────────────────┼─────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           ▼                  ▼                  ▼
    ┌──────────┐      ┌──────────┐      ┌──────────┐
    │  WHOOP   │      │   MFP    │      │  Google  │
    │ Recovery │      │ Nutrition│      │ Calendar │
    │          │      │          │      │          │
    │ A2A Agent│      │ A2A Agent│      │ A2A Agent│
    └──────────┘      └──────────┘      └──────────┘
```

### Database Schema

**a2a_agent_registry:**
- Stores all registered A2A agents
- Tracks capabilities, status, and authentication config

**a2a_user_integrations:**
- User-specific integration configurations
- OAuth tokens, sync frequency, data types

**a2a_communication_logs:**
- Audit trail of all A2A messages
- Used for debugging and compliance

**a2a_sync_logs:**
- History of sync operations
- Success/failure tracking

---

## Supported Integrations

### 1. WHOOP Recovery Platform

**Agent ID:** `whoop-recovery`

**Data Synced:**
- Recovery score (0-100)
- Heart Rate Variability (HRV)
- Sleep duration and quality
- Strain score (0-21)
- Resting heart rate

**Sync Frequency:** Every 24 hours

**OAuth Scopes Required:**
- `read:recovery`
- `read:cycles`
- `read:sleep`

**Example Use Case:**
Coach uses WHOOP recovery score to adjust workout intensity automatically. If recovery < 33%, AI suggests active recovery day.

---

### 2. MyFitnessPal Nutrition Tracker

**Agent ID:** `myfitnesspal`

**Data Synced:**
- Food diary entries
- Macro breakdown (protein, carbs, fat)
- Calorie totals
- Meal timing

**Sync Frequency:** Every 8 hours (3x daily)

**OAuth Scopes Required:**
- `diary`

**Example Use Case:**
Trainer sees client's actual nutrition intake synced automatically. No more manual food logging in FitOS.

---

### 3. Google Calendar

**Agent ID:** `google-calendar`

**Data Synced:**
- Training session events
- 2-way sync (FitOS ↔ Google Calendar)
- Conflict detection

**Sync Frequency:** Every 1 hour

**OAuth Scopes Required:**
- `https://www.googleapis.com/auth/calendar.events`

**Example Use Case:**
Client books session in FitOS → automatically appears in their Google Calendar with reminders. If they reschedule in Google Calendar, FitOS updates.

---

## Getting Started

### For Users: Connecting an Integration

#### Step 1: Navigate to Integrations
1. Open FitOS mobile app
2. Go to **Settings** → **Integrations**
3. Tap **Connect** next to desired platform

#### Step 2: Authorize Access
1. Tap **Authorize with [Platform]**
2. Sign in to the external platform
3. Review permissions and approve

#### Step 3: Configure Sync
1. Select data types to sync
2. Choose sync frequency
3. Tap **Enable Sync**

#### Step 4: Verify Connection
- Green checkmark = Connected
- View last sync time
- Check sync errors (if any)

---

### For Developers: Adding a New Integration

#### Step 1: Register Agent in Database

```sql
INSERT INTO a2a_agent_registry (
    agent_id,
    agent_name,
    agent_type,
    base_url,
    version,
    capabilities,
    authentication_config
) VALUES (
    'oura-ring',
    'Oura Ring',
    'wearable',
    'https://api.ouraring.com/a2a',
    '1.0.0',
    ARRAY['get_sleep_data', 'get_readiness_score'],
    '{"methods": ["oauth2"], ...}'::JSONB
);
```

#### Step 2: Create Integration Class

```python
# apps/ai-backend/app/integrations/oura_integration.py

class OuraIntegration:
    AGENT_ID = "oura-ring"
    API_BASE_URL = "https://api.ouraring.com/v2"

    async def sync_sleep_data(self, user_id: str):
        # Implementation
        pass
```

#### Step 3: Implement OAuth Flow

```python
async def authenticate_user(
    self,
    user_id: str,
    authorization_code: str
) -> Dict[str, Any]:
    # Exchange code for tokens
    # Create A2A integration
    # Return success/error
    pass
```

#### Step 4: Implement Data Sync

```python
async def sync_sleep_data(
    self,
    user_id: str,
    start_date: datetime,
    end_date: datetime
) -> Dict[str, Any]:
    # Fetch data from Oura API
    # Convert to FitOS format
    # Send via A2A protocol
    # Return sync result
    pass
```

#### Step 5: Add to Registry

```python
# apps/ai-backend/app/integrations/__init__.py

from app.integrations.oura_integration import OuraIntegration

__all__ = [..., "OuraIntegration"]
```

---

## API Reference

### FitOS Agent Capabilities

#### 1. `receive_recovery_data`

**Description:** Accept recovery data from wearables

**Input Schema:**
```json
{
  "user_id": "uuid",
  "recovery_data": {
    "date": "2026-01-21",
    "recovery_score": 75.5,
    "resting_hr": 58,
    "hrv_ms": 65,
    "sleep_hours": 7.5,
    "sleep_quality": 85.0,
    "strain_score": 12.3,
    "source": "whoop"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "record_id": "uuid"
}
```

**Rate Limit:** 1000 requests/hour

---

#### 2. `receive_nutrition_data`

**Description:** Accept nutrition logs from tracking apps

**Input Schema:**
```json
{
  "user_id": "uuid",
  "nutrition_entry": {
    "timestamp": "2026-01-21T12:30:00Z",
    "meal_type": "lunch",
    "foods": [...],
    "total_calories": 650,
    "total_protein_g": 45,
    "total_carbs_g": 60,
    "total_fat_g": 20,
    "source": "myfitnesspal"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "entry_id": "uuid"
}
```

**Rate Limit:** 2000 requests/hour

---

#### 3. `schedule_session`

**Description:** Schedule training sessions via calendar integration

**Input Schema:**
```json
{
  "user_id": "uuid",
  "trainer_id": "uuid",
  "session_details": {
    "title": "Full Body Strength Training",
    "start_time": "2026-01-22T10:00:00Z",
    "end_time": "2026-01-22T11:00:00Z",
    "location": "Main Gym",
    "notes": "Focus on compound movements"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "session_id": "uuid",
  "calendar_event_id": "fitos-session-123"
}
```

**Rate Limit:** 500 requests/hour

---

#### 4. `get_workout_program`

**Description:** Retrieve current workout program for a user

**Input Schema:**
```json
{
  "user_id": "uuid",
  "week_number": 3
}
```

**Output Schema:**
```json
{
  "success": true,
  "program": {
    "program_id": "uuid",
    "program_name": "12-Week Hypertrophy",
    "current_week": 3,
    "workouts": [...]
  }
}
```

**Rate Limit:** 1000 requests/hour

---

#### 5. `receive_health_record`

**Description:** Accept health records from EHR systems (requires HIPAA BAA)

**Input Schema:**
```json
{
  "user_id": "uuid",
  "health_record": {
    "record_id": "external-123",
    "record_type": "vital_signs",
    "date": "2026-01-21T09:00:00Z",
    "data": {...},
    "provider": "Kaiser Permanente",
    "source": "epic"
  }
}
```

**Output Schema:**
```json
{
  "success": true,
  "record_id": "uuid",
  "hipaa_audit_id": "uuid"
}
```

**Rate Limit:** 100 requests/hour
**Special Requirements:** Business Associate Agreement (BAA) required

---

## Developer Guide

### Message Flow Example: WHOOP Sync

```python
# 1. User authorizes WHOOP integration
result = await whoop_integration.authenticate_user(
    user_id="user-123",
    authorization_code="auth-code-from-whoop"
)

# 2. Background job triggers sync (runs every 24 hours)
sync_result = await whoop_integration.sync_recovery_data(
    user_id="user-123",
    start_date=datetime.now() - timedelta(days=7),
    end_date=datetime.now()
)

# 3. WHOOP integration fetches data from WHOOP API
recovery_data = await whoop_integration._fetch_whoop_recovery(
    access_token="token",
    start_date=start,
    end_date=end
)

# 4. Convert WHOOP format to FitOS format
fitos_data = whoop_integration._convert_whoop_to_fitos(recovery_data[0])

# 5. Send via A2A protocol to FitOS agent
response = await a2a_communication.send_action_request(
    target_agent_id="fitos-ai-coach",
    capability_name="receive_recovery_data",
    parameters={
        "user_id": "user-123",
        "recovery_data": fitos_data.dict()
    },
    user_id="user-123"
)

# 6. FitOS agent receives and stores data
# (handled by fitos_agent._handle_recovery_data)
```

---

## Security

### Authentication Methods

**1. OAuth 2.0** (Recommended)
- User authorizes FitOS to access external platform
- Access tokens are encrypted at rest
- Refresh tokens stored separately
- Automatic token refresh before expiration

**2. API Keys**
- Platform-specific API keys
- Encrypted in database
- Rotated quarterly

### Data Privacy

**User Controls:**
- Users can disconnect integrations anytime
- Granular data type selection (choose what to sync)
- View all synced data
- Delete synced data

**HIPAA Compliance:**
- All health record integrations require BAA
- Automatic audit logging (Sprint 45)
- PHI classification
- Encrypted at rest (AES-256)
- Encrypted in transit (TLS 1.3)

### Rate Limiting

**Per-Integration Limits:**
- WHOOP: 1000 req/hour
- MyFitnessPal: 2000 req/hour
- Google Calendar: 500 req/hour

**Auto-Disable Policy:**
- After 5 consecutive sync errors, integration auto-disables
- User notified via email
- Must manually re-enable after fixing issue

---

## Troubleshooting

### Common Issues

#### 1. Sync Failing

**Symptoms:** Last sync shows error, no new data appearing

**Solutions:**
1. Check token expiration
   ```sql
   SELECT authentication_expires_at
   FROM a2a_user_integrations
   WHERE user_id = 'user-123' AND agent_id = 'whoop-recovery';
   ```

2. Re-authenticate if expired
   - Go to Settings → Integrations
   - Tap "Reconnect"

3. Check sync logs
   ```sql
   SELECT *
   FROM a2a_sync_logs
   WHERE integration_id = 'user-123:whoop-recovery'
   ORDER BY sync_time DESC
   LIMIT 10;
   ```

---

#### 2. Missing Data

**Symptoms:** Integration connected but no data syncing

**Solutions:**
1. Verify data types selected
   ```sql
   SELECT data_types
   FROM a2a_user_integrations
   WHERE integration_id = 'user-123:myfitnesspal';
   ```

2. Check date range
   - Default: Last 7 days
   - Older data may not be synced

3. Manually trigger sync
   ```python
   await myfitnesspal_integration.sync_nutrition_data(
       user_id="user-123",
       start_date=datetime(2026, 1, 1),
       end_date=datetime.now()
   )
   ```

---

#### 3. Duplicate Data

**Symptoms:** Same data appearing multiple times

**Solutions:**
1. Check for duplicate integrations
   ```sql
   SELECT COUNT(*)
   FROM a2a_user_integrations
   WHERE user_id = 'user-123'
   GROUP BY agent_id
   HAVING COUNT(*) > 1;
   ```

2. Use idempotency keys
   - All A2A messages include idempotency_key
   - Database should enforce uniqueness

---

### Debug Mode

Enable debug logging for A2A communication:

```python
import logging
logging.getLogger('app.agents.a2a_communication').setLevel(logging.DEBUG)
```

View communication logs:
```sql
SELECT *
FROM a2a_communication_logs
WHERE user_id = 'user-123'
  AND success = FALSE
ORDER BY timestamp DESC
LIMIT 20;
```

---

## Roadmap

### Planned Integrations

**Q1 2026:**
- ✅ WHOOP (completed)
- ✅ MyFitnessPal (completed)
- ✅ Google Calendar (completed)
- ⏳ Oura Ring (in progress)
- ⏳ Apple Health (in progress)

**Q2 2026:**
- Garmin Connect
- Fitbit
- Strava
- TrainingPeaks
- Cronometer

**Q3 2026:**
- Epic EHR (healthcare)
- Cerner EHR (healthcare)
- Athenahealth (healthcare)

**Q4 2026:**
- Outlook Calendar
- Apple Calendar
- Zoom (virtual sessions)
- Microsoft Teams

---

## Support

**Developer Documentation:** https://docs.fitos.com/a2a
**API Reference:** https://api.fitos.com/a2a/docs
**GitHub Issues:** https://github.com/fitos-app/a2a-integrations
**Email:** developers@fitos.com

---

## Changelog

### Version 1.0.0 (January 21, 2026)
- Initial A2A protocol implementation
- WHOOP integration
- MyFitnessPal integration
- Google Calendar integration
- Agent registry and discovery
- Communication service
- Database migrations
