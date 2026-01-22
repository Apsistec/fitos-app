"""
Integration Marketplace - Sprint 39 & Sprint 44

Third-party integrations for FitOS:
- Zapier webhooks (inbound/outbound)
- Google Calendar 2-way sync
- Calendly appointment booking
- Acuity Scheduling appointment booking

A2A Protocol Integrations - Sprint 44:
- WHOOP recovery data
- MyFitnessPal nutrition tracking
- Google Calendar scheduling (A2A protocol)

Research:
- 46% of trainers use 5-10 different tools daily
- Calendar sync is #1 requested integration feature
- Zapier enables 5,000+ app integrations without custom development
"""

from app.integrations.zapier import ZapierWebhooks
from app.integrations.google_calendar import GoogleCalendarSync
from app.integrations.calendly import CalendlyWebhook
from app.integrations.acuity import AcuityWebhook

# A2A Protocol Integrations
from app.integrations.whoop_integration import WHOOPIntegration
from app.integrations.myfitnesspal_integration import MyFitnessPalIntegration
from app.integrations.google_calendar_integration import GoogleCalendarIntegration

__all__ = [
    "ZapierWebhooks",
    "GoogleCalendarSync",
    "CalendlyWebhook",
    "AcuityWebhook",
    # A2A Integrations
    "WHOOPIntegration",
    "MyFitnessPalIntegration",
    "GoogleCalendarIntegration",
]
