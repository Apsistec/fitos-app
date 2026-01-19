"""
Crisis Resources and Professional Mental Health Support

Centralized crisis resources with 24/7 hotlines and professional referrals.

⚠️ CRITICAL DISCLAIMER:
This is NOT emergency medical advice. If someone is in immediate danger,
call 911 or go to the nearest emergency room.

Sprint 37: Mental Health Integration
"""

from dataclasses import dataclass, field
from typing import Optional, Literal
from enum import Enum


class ResourceType(str, Enum):
    """Type of mental health resource"""

    CRISIS_HOTLINE = "crisis_hotline"  # 24/7 immediate support
    CRISIS_TEXT = "crisis_text"  # Text-based crisis support
    EMERGENCY = "emergency"  # 911, ER
    THERAPIST_FINDER = "therapist_finder"  # Directory services
    SUPPORT_GROUP = "support_group"  # Peer support
    TELEHEALTH = "telehealth"  # Online therapy platforms
    SPECIALIZED = "specialized"  # Specific populations (LGBTQ+, veterans, etc.)


class UrgencyLevel(str, Enum):
    """Urgency level for resource recommendation"""

    IMMEDIATE = "immediate"  # Life-threatening, use now
    URGENT = "urgent"  # Severe symptoms, use within 24 hours
    IMPORTANT = "important"  # Moderate symptoms, schedule soon
    ROUTINE = "routine"  # Minimal symptoms, general wellness


@dataclass
class CrisisResource:
    """Single crisis or mental health resource"""

    name: str
    resource_type: ResourceType
    urgency: UrgencyLevel

    # Contact info
    phone: Optional[str] = None
    text: Optional[str] = None
    website: Optional[str] = None

    # Details
    description: str = ""
    availability: str = ""  # "24/7", "Business hours", etc.
    cost: str = ""  # "Free", "Insurance accepted", etc.

    # Population-specific
    populations: list[str] = field(default_factory=list)  # ["veterans", "LGBTQ+", "youth"]
    languages: list[str] = field(default_factory=list)  # ["English", "Spanish"]

    # Notes
    notes: list[str] = field(default_factory=list)


@dataclass
class ResourceRecommendations:
    """Recommended resources based on situation"""

    immediate_resources: list[CrisisResource] = field(default_factory=list)
    professional_resources: list[CrisisResource] = field(default_factory=list)
    support_resources: list[CrisisResource] = field(default_factory=list)

    notes: list[str] = field(default_factory=list)


class CrisisResources:
    """
    Provide crisis resources and professional mental health support.

    Centralized source of validated, up-to-date mental health resources.
    """

    # Crisis Hotlines (24/7 immediate support)
    CRISIS_HOTLINES = [
        CrisisResource(
            name="988 Suicide and Crisis Lifeline",
            resource_type=ResourceType.CRISIS_HOTLINE,
            urgency=UrgencyLevel.IMMEDIATE,
            phone="988",
            website="https://988lifeline.org",
            description="Free, confidential support for people in distress. Prevention and crisis resources.",
            availability="24/7",
            cost="Free",
            languages=["English", "Spanish", "200+ languages via interpretation"],
            notes=[
                "Available nationwide in the United States",
                "Call, text, or chat online",
                "Trained crisis counselors",
                "For yourself or someone you care about",
            ],
        ),
        CrisisResource(
            name="Crisis Text Line",
            resource_type=ResourceType.CRISIS_TEXT,
            urgency=UrgencyLevel.IMMEDIATE,
            text="741741",
            website="https://www.crisistextline.org",
            description="Free, 24/7 support via text message for those in crisis.",
            availability="24/7",
            cost="Free",
            languages=["English", "Spanish (text 'HOLA' to 741741)"],
            notes=[
                "Text 'HELLO' to 741741",
                "Connects you with trained crisis counselor",
                "Preferred by some who find texting easier than calling",
            ],
        ),
        CrisisResource(
            name="Veterans Crisis Line",
            resource_type=ResourceType.CRISIS_HOTLINE,
            urgency=UrgencyLevel.IMMEDIATE,
            phone="988, then press 1",
            text="838255",
            website="https://www.veteranscrisisline.net",
            description="Crisis support specifically for veterans, service members, and their families.",
            availability="24/7",
            cost="Free",
            populations=["Veterans", "Active duty military", "National Guard", "Reserves", "Military families"],
            notes=[
                "Call 988, then press 1",
                "Text to 838255",
                "Confidential chat at veteranscrisisline.net",
                "Staffed by VA professionals",
            ],
        ),
        CrisisResource(
            name="The Trevor Project",
            resource_type=ResourceType.CRISIS_HOTLINE,
            urgency=UrgencyLevel.IMMEDIATE,
            phone="1-866-488-7386",
            text="START to 678678",
            website="https://www.thetrevorproject.org",
            description="Crisis intervention and suicide prevention for LGBTQ+ young people under 25.",
            availability="24/7",
            cost="Free",
            populations=["LGBTQ+ youth", "Ages 13-24"],
            notes=[
                "Call 1-866-488-7386",
                "Text 'START' to 678678",
                "Chat available on website",
            ],
        ),
        CrisisResource(
            name="SAMHSA National Helpline",
            resource_type=ResourceType.CRISIS_HOTLINE,
            urgency=UrgencyLevel.URGENT,
            phone="1-800-662-4357",
            website="https://www.samhsa.gov/find-help/national-helpline",
            description="Treatment referral and information service for mental health and substance use disorders.",
            availability="24/7",
            cost="Free",
            languages=["English", "Spanish"],
            notes=[
                "Information and referral service",
                "Connects to local treatment facilities and support groups",
                "Not a crisis line (use 988 for crisis)",
            ],
        ),
    ]

    # Emergency Services
    EMERGENCY_RESOURCES = [
        CrisisResource(
            name="911 Emergency Services",
            resource_type=ResourceType.EMERGENCY,
            urgency=UrgencyLevel.IMMEDIATE,
            phone="911",
            description="Immediate emergency response for life-threatening situations.",
            availability="24/7",
            cost="N/A",
            notes=[
                "USE FOR: Immediate danger to self or others",
                "USE FOR: Suicide attempt in progress",
                "USE FOR: Severe injury or medical emergency",
                "Emergency responders will provide immediate assistance",
            ],
        ),
        CrisisResource(
            name="Emergency Room",
            resource_type=ResourceType.EMERGENCY,
            urgency=UrgencyLevel.IMMEDIATE,
            description="Go to nearest hospital emergency room for immediate psychiatric evaluation.",
            availability="24/7",
            cost="Varies (insurance may cover)",
            notes=[
                "Use for acute mental health crisis",
                "Available at all hospitals",
                "Psychiatric evaluation and stabilization",
                "May result in voluntary or involuntary hospitalization if needed",
            ],
        ),
    ]

    # Therapist Finders
    THERAPIST_FINDERS = [
        CrisisResource(
            name="Psychology Today Therapist Finder",
            resource_type=ResourceType.THERAPIST_FINDER,
            urgency=UrgencyLevel.IMPORTANT,
            website="https://www.psychologytoday.com/us/therapists",
            description="Directory of therapists, psychiatrists, and treatment centers. Filter by location, insurance, specialty.",
            availability="N/A (directory service)",
            cost="Varies by provider",
            notes=[
                "Search by ZIP code",
                "Filter by insurance, specialty, treatment approach",
                "Read provider bios and credentials",
                "Contact providers directly to schedule",
            ],
        ),
        CrisisResource(
            name="NAMI Helpline",
            resource_type=ResourceType.THERAPIST_FINDER,
            urgency=UrgencyLevel.IMPORTANT,
            phone="1-800-950-6264",
            text="NAMI to 741741",
            website="https://www.nami.org/help",
            description="National Alliance on Mental Illness helpline for information and referrals.",
            availability="Monday-Friday 10am-10pm ET",
            cost="Free",
            notes=[
                "Information about mental health conditions",
                "Referrals to local NAMI affiliates",
                "Support group information",
                "Not a crisis line (use 988 for crisis)",
            ],
        ),
        CrisisResource(
            name="Your Health Insurance Provider",
            resource_type=ResourceType.THERAPIST_FINDER,
            urgency=UrgencyLevel.IMPORTANT,
            description="Contact your health insurance for in-network mental health providers.",
            availability="Varies",
            cost="Typically lowest cost option",
            notes=[
                "Check insurance card for behavioral health phone number",
                "Ask for in-network therapists and psychiatrists",
                "Verify coverage and copay amounts",
                "Some insurers offer telehealth options",
            ],
        ),
        CrisisResource(
            name="Open Path Collective",
            resource_type=ResourceType.THERAPIST_FINDER,
            urgency=UrgencyLevel.IMPORTANT,
            website="https://openpathcollective.org",
            description="Nationwide network of therapists offering reduced-fee sessions ($30-$80).",
            availability="N/A (directory service)",
            cost="$30-$80 per session (plus $65 lifetime membership)",
            notes=[
                "For individuals without insurance or with high deductibles",
                "In-person and telehealth options",
                "One-time $65 membership fee",
            ],
        ),
    ]

    # Telehealth Platforms
    TELEHEALTH_RESOURCES = [
        CrisisResource(
            name="BetterHelp",
            resource_type=ResourceType.TELEHEALTH,
            urgency=UrgencyLevel.IMPORTANT,
            website="https://www.betterhelp.com",
            description="Online therapy platform with licensed therapists. Text, phone, or video sessions.",
            availability="Varies by therapist",
            cost="$240-$360/month (weekly sessions)",
            notes=[
                "Matched with licensed therapist",
                "Message therapist anytime, respond daily",
                "Schedule live video or phone sessions",
                "Can switch therapists anytime",
            ],
        ),
        CrisisResource(
            name="Talkspace",
            resource_type=ResourceType.TELEHEALTH,
            urgency=UrgencyLevel.IMPORTANT,
            website="https://www.talkspace.com",
            description="Online therapy and psychiatry. Text, video, or audio messaging with licensed providers.",
            availability="Varies by provider",
            cost="$69-$109/week (plans vary)",
            notes=[
                "Therapy and psychiatry services",
                "Message your therapist daily",
                "Video sessions available",
                "Some insurance plans accepted",
            ],
        ),
    ]

    # Support Groups
    SUPPORT_GROUPS = [
        CrisisResource(
            name="NAMI Support Groups",
            resource_type=ResourceType.SUPPORT_GROUP,
            urgency=UrgencyLevel.ROUTINE,
            website="https://www.nami.org/Support-Education/Support-Groups",
            description="Free, peer-led support groups for individuals with mental health conditions and families.",
            availability="Varies by location",
            cost="Free",
            notes=[
                "In-person and virtual options",
                "NAMI Connection (for individuals)",
                "NAMI Family Support Group (for family members)",
                "Find local groups on website",
            ],
        ),
        CrisisResource(
            name="Depression and Bipolar Support Alliance (DBSA)",
            resource_type=ResourceType.SUPPORT_GROUP,
            urgency=UrgencyLevel.ROUTINE,
            website="https://www.dbsalliance.org/support/chapters-and-support-groups/",
            description="Peer-led support groups for mood disorders.",
            availability="Varies by location",
            cost="Free",
            notes=[
                "In-person and online groups",
                "Facilitator-led peer support",
                "Find groups by ZIP code",
            ],
        ),
    ]

    def __init__(self):
        pass

    def get_resources_by_severity(
        self, severity_level: UrgencyLevel
    ) -> ResourceRecommendations:
        """
        Get recommended resources based on severity level.

        Args:
            severity_level: UrgencyLevel (immediate, urgent, important, routine)

        Returns:
            ResourceRecommendations with prioritized resources
        """
        if severity_level == UrgencyLevel.IMMEDIATE:
            return ResourceRecommendations(
                immediate_resources=[
                    self.EMERGENCY_RESOURCES[0],  # 911
                    self.EMERGENCY_RESOURCES[1],  # ER
                    self.CRISIS_HOTLINES[0],  # 988
                    self.CRISIS_HOTLINES[1],  # Crisis Text Line
                ],
                notes=[
                    "🆘 IMMEDIATE CRISIS: If in immediate danger, call 911 or go to ER",
                    "These resources provide 24/7 immediate support",
                    "You are not alone - trained professionals are available now",
                ],
            )

        elif severity_level == UrgencyLevel.URGENT:
            return ResourceRecommendations(
                immediate_resources=[
                    self.CRISIS_HOTLINES[0],  # 988
                    self.CRISIS_HOTLINES[1],  # Crisis Text Line
                ],
                professional_resources=self.THERAPIST_FINDERS[:3],
                support_resources=self.TELEHEALTH_RESOURCES,
                notes=[
                    "Severe symptoms require professional evaluation",
                    "Contact a mental health professional within 24-48 hours",
                    "Crisis support available 24/7 while you arrange professional care",
                ],
            )

        elif severity_level == UrgencyLevel.IMPORTANT:
            return ResourceRecommendations(
                professional_resources=self.THERAPIST_FINDERS,
                support_resources=self.TELEHEALTH_RESOURCES + self.SUPPORT_GROUPS,
                notes=[
                    "Schedule professional evaluation within 1-2 weeks",
                    "Multiple options available: in-person, telehealth, support groups",
                    "Early intervention improves outcomes",
                ],
            )

        else:  # ROUTINE
            return ResourceRecommendations(
                professional_resources=self.THERAPIST_FINDERS[:2],
                support_resources=self.SUPPORT_GROUPS + self.TELEHEALTH_RESOURCES,
                notes=[
                    "Consider therapy or support groups for ongoing wellness",
                    "Preventive mental health care is valuable",
                    "Many options available at different price points",
                ],
            )

    def get_population_specific_resources(
        self, population: str
    ) -> list[CrisisResource]:
        """
        Get resources for specific populations.

        Args:
            population: Population identifier (e.g., "veterans", "LGBTQ+", "youth")

        Returns:
            List of resources tailored to that population
        """
        all_resources = (
            self.CRISIS_HOTLINES
            + self.EMERGENCY_RESOURCES
            + self.THERAPIST_FINDERS
            + self.TELEHEALTH_RESOURCES
            + self.SUPPORT_GROUPS
        )

        return [
            r
            for r in all_resources
            if population.lower() in [p.lower() for p in r.populations]
        ]

    def get_all_crisis_resources(self) -> list[CrisisResource]:
        """Get all crisis hotlines and emergency resources"""
        return self.CRISIS_HOTLINES + self.EMERGENCY_RESOURCES

    def get_all_professional_resources(self) -> list[CrisisResource]:
        """Get all professional mental health resources"""
        return self.THERAPIST_FINDERS + self.TELEHEALTH_RESOURCES

    def get_all_support_resources(self) -> list[CrisisResource]:
        """Get all support group resources"""
        return self.SUPPORT_GROUPS

    def format_resource_for_display(self, resource: CrisisResource) -> dict:
        """Format resource for API response or UI display"""
        return {
            "name": resource.name,
            "type": resource.resource_type.value,
            "urgency": resource.urgency.value,
            "phone": resource.phone,
            "text": resource.text,
            "website": resource.website,
            "description": resource.description,
            "availability": resource.availability,
            "cost": resource.cost,
            "populations": resource.populations,
            "languages": resource.languages,
            "notes": resource.notes,
        }


# Global instance
_crisis_resources: Optional[CrisisResources] = None


def get_crisis_resources() -> CrisisResources:
    """Get or create global crisis resources instance"""
    global _crisis_resources
    if _crisis_resources is None:
        _crisis_resources = CrisisResources()
    return _crisis_resources
