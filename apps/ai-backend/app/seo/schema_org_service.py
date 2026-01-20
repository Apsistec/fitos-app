"""
Schema.org Structured Data Service

Generates JSON-LD markup for search engine optimization.
Sprint 42: Local SEO Automation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


class SchemaOrgService:
    """Service for generating Schema.org structured data"""

    @staticmethod
    def generate_local_business(
        business_name: str,
        description: str,
        phone: str,
        email: str,
        address: Dict[str, str],
        geo: Dict[str, float],
        url: str,
        image_url: str,
        hours: Dict[str, Dict[str, str]],
        price_range: str = "$$",
        rating: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate LocalBusiness schema

        Args:
            business_name: Business name
            description: Business description
            phone: Phone number
            email: Email address
            address: Address dict
            geo: Geographic coordinates
            url: Business URL
            image_url: Business image URL
            hours: Operating hours
            price_range: Price range ($, $$, $$$, $$$$)
            rating: Optional aggregate rating

        Returns:
            LocalBusiness JSON-LD
        """
        schema = {
            "@context": "https://schema.org",
            "@type": "LocalBusiness",
            "@id": url,
            "name": business_name,
            "description": description,
            "image": image_url,
            "telephone": phone,
            "email": email,
            "url": url,
            "priceRange": price_range,
            "address": {
                "@type": "PostalAddress",
                "streetAddress": address.get('line1', ''),
                "addressLocality": address.get('city', ''),
                "addressRegion": address.get('state', ''),
                "postalCode": address.get('postalCode', ''),
                "addressCountry": address.get('country', 'US'),
            },
            "geo": {
                "@type": "GeoCoordinates",
                "latitude": geo.get('latitude'),
                "longitude": geo.get('longitude'),
            },
        }

        # Add opening hours
        if hours:
            schema["openingHoursSpecification"] = SchemaOrgService._convert_hours_to_schema(hours)

        # Add aggregate rating
        if rating:
            schema["aggregateRating"] = {
                "@type": "AggregateRating",
                "ratingValue": rating.get('value'),
                "reviewCount": rating.get('count'),
                "bestRating": "5",
                "worstRating": "1",
            }

        return schema

    @staticmethod
    def generate_person(
        name: str,
        job_title: str,
        description: str,
        image_url: str,
        url: str,
        email: str,
        social_links: List[str],
        specialties: List[str],
        credentials: List[Dict[str, str]],
    ) -> Dict[str, Any]:
        """
        Generate Person schema for trainer profiles

        Args:
            name: Trainer name
            job_title: Job title
            description: Bio/description
            image_url: Profile photo URL
            url: Profile URL
            email: Email address
            social_links: Social media profile URLs
            specialties: Areas of expertise
            credentials: Certifications/credentials

        Returns:
            Person JSON-LD
        """
        schema = {
            "@context": "https://schema.org",
            "@type": "Person",
            "name": name,
            "jobTitle": job_title,
            "description": description,
            "image": image_url,
            "url": url,
            "email": email,
        }

        # Add social media links
        if social_links:
            schema["sameAs"] = social_links

        # Add specialties
        if specialties:
            schema["knowsAbout"] = specialties

        # Add credentials
        if credentials:
            schema["hasCredential"] = [
                {
                    "@type": "EducationalOccupationalCredential",
                    "credentialCategory": "Professional Certification",
                    "name": cred.get('name'),
                    "issuedBy": {
                        "@type": "Organization",
                        "name": cred.get('issuer'),
                    } if cred.get('issuer') else None,
                }
                for cred in credentials
            ]

        return schema

    @staticmethod
    def generate_service(
        service_name: str,
        description: str,
        provider_name: str,
        provider_url: str,
        service_type: str,
        price: Optional[Dict[str, Any]] = None,
        area_served: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Generate Service schema

        Args:
            service_name: Service name
            description: Service description
            provider_name: Provider name
            provider_url: Provider URL
            service_type: Type of service
            price: Optional pricing info
            area_served: Cities/regions served

        Returns:
            Service JSON-LD
        """
        schema = {
            "@context": "https://schema.org",
            "@type": "Service",
            "name": service_name,
            "description": description,
            "serviceType": service_type,
            "provider": {
                "@type": "LocalBusiness",
                "name": provider_name,
                "url": provider_url,
            },
        }

        # Add pricing
        if price:
            schema["offers"] = {
                "@type": "Offer",
                "price": price.get('amount'),
                "priceCurrency": price.get('currency', 'USD'),
                "priceSpecification": {
                    "@type": "UnitPriceSpecification",
                    "price": price.get('amount'),
                    "priceCurrency": price.get('currency', 'USD'),
                    "referenceQuantity": {
                        "@type": "QuantitativeValue",
                        "value": price.get('quantity', 1),
                        "unitText": price.get('unit', 'session'),
                    }
                }
            }

        # Add service area
        if area_served:
            schema["areaServed"] = [
                {
                    "@type": "City",
                    "name": city
                }
                for city in area_served
            ]

        return schema

    @staticmethod
    def generate_aggregate_rating(
        rating_value: float,
        review_count: int,
        best_rating: int = 5,
        worst_rating: int = 1,
    ) -> Dict[str, Any]:
        """
        Generate AggregateRating schema

        Args:
            rating_value: Average rating
            review_count: Number of reviews
            best_rating: Best possible rating
            worst_rating: Worst possible rating

        Returns:
            AggregateRating JSON-LD
        """
        return {
            "@type": "AggregateRating",
            "ratingValue": str(rating_value),
            "reviewCount": str(review_count),
            "bestRating": str(best_rating),
            "worstRating": str(worst_rating),
        }

    @staticmethod
    def generate_review(
        author_name: str,
        rating: int,
        review_text: str,
        date_published: str,
        item_reviewed_name: str,
        item_reviewed_type: str = "LocalBusiness",
    ) -> Dict[str, Any]:
        """
        Generate Review schema

        Args:
            author_name: Reviewer name
            rating: Rating (1-5)
            review_text: Review text
            date_published: ISO date string
            item_reviewed_name: Name of business/service reviewed
            item_reviewed_type: Type of item reviewed

        Returns:
            Review JSON-LD
        """
        return {
            "@type": "Review",
            "author": {
                "@type": "Person",
                "name": author_name,
            },
            "reviewRating": {
                "@type": "Rating",
                "ratingValue": str(rating),
                "bestRating": "5",
                "worstRating": "1",
            },
            "reviewBody": review_text,
            "datePublished": date_published,
            "itemReviewed": {
                "@type": item_reviewed_type,
                "name": item_reviewed_name,
            }
        }

    @staticmethod
    def generate_fitness_program(
        program_name: str,
        description: str,
        duration: str,
        activity_frequency: str,
        provider_name: str,
        provider_url: str,
        price: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Generate ExercisePlan schema for fitness programs

        Args:
            program_name: Program name
            description: Program description
            duration: Program duration (ISO 8601 duration)
            activity_frequency: Frequency (e.g., "3 times per week")
            provider_name: Provider name
            provider_url: Provider URL
            price: Optional pricing

        Returns:
            ExercisePlan JSON-LD
        """
        schema = {
            "@context": "https://schema.org",
            "@type": "ExercisePlan",
            "name": program_name,
            "description": description,
            "duration": duration,
            "activityFrequency": activity_frequency,
            "provider": {
                "@type": "LocalBusiness",
                "name": provider_name,
                "url": provider_url,
            }
        }

        if price:
            schema["offers"] = {
                "@type": "Offer",
                "price": price.get('amount'),
                "priceCurrency": price.get('currency', 'USD'),
            }

        return schema

    @staticmethod
    def generate_breadcrumb(
        items: List[Dict[str, str]]
    ) -> Dict[str, Any]:
        """
        Generate BreadcrumbList schema

        Args:
            items: List of breadcrumb items with 'name' and 'url'

        Returns:
            BreadcrumbList JSON-LD
        """
        return {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
                {
                    "@type": "ListItem",
                    "position": idx + 1,
                    "name": item.get('name'),
                    "item": item.get('url'),
                }
                for idx, item in enumerate(items)
            ]
        }

    @staticmethod
    def _convert_hours_to_schema(
        hours: Dict[str, Dict[str, str]]
    ) -> List[Dict[str, Any]]:
        """
        Convert hours dict to Schema.org OpeningHoursSpecification

        Args:
            hours: Dict of day -> {open, close}

        Returns:
            List of OpeningHoursSpecification objects
        """
        day_map = {
            'monday': 'Monday',
            'tuesday': 'Tuesday',
            'wednesday': 'Wednesday',
            'thursday': 'Thursday',
            'friday': 'Friday',
            'saturday': 'Saturday',
            'sunday': 'Sunday',
        }

        # Group consecutive days with same hours
        specs = []
        current_spec = None

        for day_key in ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']:
            day_hours = hours.get(day_key)
            if not day_hours:
                if current_spec:
                    specs.append(current_spec)
                    current_spec = None
                continue

            day_name = day_map[day_key]
            open_time = day_hours.get('open')
            close_time = day_hours.get('close')

            if current_spec and current_spec['opens'] == open_time and current_spec['closes'] == close_time:
                # Add to existing spec
                if isinstance(current_spec['dayOfWeek'], list):
                    current_spec['dayOfWeek'].append(day_name)
                else:
                    current_spec['dayOfWeek'] = [current_spec['dayOfWeek'], day_name]
            else:
                # Start new spec
                if current_spec:
                    specs.append(current_spec)
                current_spec = {
                    "@type": "OpeningHoursSpecification",
                    "dayOfWeek": day_name,
                    "opens": open_time,
                    "closes": close_time,
                }

        if current_spec:
            specs.append(current_spec)

        return specs

    @staticmethod
    def combine_schemas(*schemas: Dict[str, Any]) -> Dict[str, Any]:
        """
        Combine multiple schemas into a single JSON-LD graph

        Args:
            *schemas: Variable number of schema dicts

        Returns:
            Combined JSON-LD with @graph
        """
        return {
            "@context": "https://schema.org",
            "@graph": list(schemas)
        }

    @staticmethod
    def to_json_ld(schema: Dict[str, Any]) -> str:
        """
        Convert schema dict to JSON-LD string for HTML injection

        Args:
            schema: Schema dict

        Returns:
            JSON-LD string wrapped in <script> tag
        """
        import json
        json_str = json.dumps(schema, indent=2)
        return f'<script type="application/ld+json">\n{json_str}\n</script>'
