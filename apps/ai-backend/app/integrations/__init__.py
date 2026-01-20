"""
Integration Marketplace - Sprint 39

Third-party integrations for FitOS:
- Zapier webhooks (inbound/outbound)
- Google Calendar 2-way sync
- Calendly appointment booking
- Acuity Scheduling appointment booking

Research:
- 46% of trainers use 5-10 different tools daily
- Calendar sync is #1 requested integration feature
- Zapier enables 5,000+ app integrations without custom development
"""

from app.integrations.zapier import ZapierWebhooks
from app.integrations.google_calendar import GoogleCalendarSync
from app.integrations.calendly import CalendlyWebhook
from app.integrations.acuity import AcuityWebhook

__all__ = [
    "ZapierWebhooks",
    "GoogleCalendarSync",
    "CalendlyWebhook",
    "AcuityWebhook",
]
