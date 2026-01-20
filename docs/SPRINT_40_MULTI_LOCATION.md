# Sprint 40: Multi-Location Management

**Duration:** 2 weeks
**Phase:** 3E - Scale & Enterprise
**Strategic Value:** Enable franchise operations and multi-site gym chains

---

## Overview

Implement multi-location management capabilities for franchise fitness businesses and multi-site gym chains. Enables centralized control, automated royalty management, and cross-location analytics.

**Market Context:**
- Fitness franchises represent 30% of the $96B gym industry
- Average franchise fee: 6-8% of gross revenue
- Multi-location operators need centralized billing, unified reporting
- Client management: 96% of operators rate as most important feature
- Online booking: 89% importance, Class management: 87%

---

## Research Summary

### Multi-Location Management Features (2026)

**Sources:**
- [Top 6 Gym Management Software in 2026](https://smarthealthclubs.com/blog/top-6-gym-management-software-in-2026/)
- [Multi-Location Features - FLiiP](https://myfliip.com/features/multi-location/)
- [Top 9 US-Based Gym Management Software Solutions](https://gymroute.com/blog/top-us-based-gym-management-software-solutions/)
- [Best Gym Management Software Comparison 2026](https://wellyx.com/blog/gym-management-software-comparison/)
- [Software for Multi-Location Gyms and Fitness Chains](https://www.exercise.com/platform/multi-location/)
- [Multi Location Fitness Software Features](https://www.marianatek.com/features/multi-location/)

**Key Findings:**
- **Centralized Billing:** Unified payment processing across all locations
- **Unified Reporting:** Financial and operational dashboards per location
- **Role-Based Permissions:** Different access levels for franchise owners, location managers, trainers
- **Shared Data:** Members can book and pay across locations
- **Custom Memberships:** Per-location or multi-location access
- **Staff Management:** View all schedules and client activity across locations
- **Mobile-First:** Push notifications, automated reminders, class capacity management

### Franchise Management Platforms (2026)

**Sources:**
- [ABC Glofox Multi-Location](https://www.glofox.com/multi-location/)
- [ABC Fitness Solutions](https://abcfitness.com/)
- [MyStudio Franchise Software](https://www.mystudio.io/franchise)
- [GymMaster Franchise Software](https://www.gymmaster.com/ultimate-gym-franchise-software/)

**Key Findings:**
- **Centralized Control:** Manage all locations from single dashboard
- **Business Intelligence:** Global, regional, and individual location KPIs
- **Automatic Royalty Payments:** Automated calculation and disbursement
- **Multi-Facility Analytics:** Performance monitoring per location
- **Scalability:** From single operator to hundreds of franchises
- **Brand Assigned Account Specialist:** Dedicated support for franchise brands

### Royalty Management & Automated Reporting (2026)

**Sources:**
- [Xplor Mariana Tek Franchise Tools (Jan 2025)](https://athletechnews.com/xplor-mariana-tek-launches-new-franchise-management-tools/)
- [Xplor Mariana Tek Launch Announcement](https://www.fittechglobal.com/fit-tech-news/Xplor-Mariana-Tek-launches-franchise-management-software-fitness/354893)
- [Franchise Royalty Reporting Software](https://franchisesoft.com/franchisee-finance-royalty/)
- [FranConnect Royalty Manager](https://www.franconnect.com/en/platform-overview/royalty-manager/)
- [Franchise Billing and Royalty Automation](https://www.recur360.com/franchise-billing-and-royalty-automation/)
- [Royalty Management Software](https://meetbrandwide.com/blog/2024/10/03/how-franchise-directors-can-streamline-revenue-with-royalty-management-software/)

**Key Findings (Xplor Mariana Tek - Jan 2025):**
- **Automatic Royalty Tracking:** Eliminate manual calculations
- **Real-Time Reporting:** Dashboard with immediate financial tracking
- **Automated Disbursements:** Timely and accurate payments
- **Master Franchise Support:** Tiered revenue collection across territories
- **Integration:** QuickBooks, ACH payment processing
- **Adopted by:** Sweat440 (20+ locations across U.S.)

**Industry Standard Features:**
- Automatic royalty calculations (6-8% of gross revenue)
- Real-time financial tracking dashboards
- Automated invoicing and payment collection
- Network-wide aggregate reporting
- ACH payment processing
- Multi-location performance analytics

---

## Technical Architecture

### 1. Location Hierarchy System

**Database Schema:**
```sql
-- apps/supabase/migrations/00028_multi_location.sql

-- =====================================================================
-- ORGANIZATIONS (Franchise Parent)
-- =====================================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Organization details
    name TEXT NOT NULL,
    legal_name TEXT,
    tax_id TEXT, -- EIN for US
    organization_type TEXT NOT NULL CHECK (organization_type IN ('franchise', 'multi_location', 'single_location')),

    -- Brand details
    logo_url TEXT,
    brand_colors JSONB DEFAULT '{}',

    -- Billing
    stripe_account_id TEXT,
    billing_email TEXT,

    -- Settings
    settings JSONB DEFAULT '{}',

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- LOCATIONS
-- =====================================================================

CREATE TABLE locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Location details
    name TEXT NOT NULL,
    slug TEXT NOT NULL, -- URL-friendly identifier
    location_type TEXT NOT NULL DEFAULT 'branch' CHECK (location_type IN ('headquarters', 'branch', 'franchise')),

    -- Address
    address_line1 TEXT,
    address_line2 TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT NOT NULL DEFAULT 'US',
    timezone TEXT NOT NULL DEFAULT 'America/New_York',

    -- Contact
    phone TEXT,
    email TEXT,
    website TEXT,

    -- Geolocation
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Operating hours
    operating_hours JSONB DEFAULT '{}', -- {"monday": {"open": "06:00", "close": "22:00"}, ...}

    -- Billing
    stripe_location_id TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
    opened_date DATE,
    closed_date DATE,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(organization_id, slug)
);

-- =====================================================================
-- LOCATION STAFF (Cross-location staff assignments)
-- =====================================================================

CREATE TABLE location_staff (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Role at this location
    role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'trainer', 'front_desk')),

    -- Permissions
    permissions JSONB DEFAULT '{}',
    can_manage_clients BOOLEAN NOT NULL DEFAULT true,
    can_view_reports BOOLEAN NOT NULL DEFAULT false,
    can_manage_staff BOOLEAN NOT NULL DEFAULT false,
    can_manage_billing BOOLEAN NOT NULL DEFAULT false,

    -- Employment
    employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
    hourly_rate DECIMAL(10, 2),
    start_date DATE,
    end_date DATE,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(location_id, user_id)
);

-- =====================================================================
-- FRANCHISE AGREEMENTS
-- =====================================================================

CREATE TABLE franchise_agreements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    franchisee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Agreement details
    agreement_number TEXT NOT NULL UNIQUE,
    signed_date DATE NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    term_years INT NOT NULL DEFAULT 10,

    -- Financial terms
    initial_franchise_fee DECIMAL(10, 2) NOT NULL,
    royalty_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0700, -- 7% default
    marketing_fee_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0200, -- 2% default
    technology_fee_monthly DECIMAL(10, 2) NOT NULL DEFAULT 99.00,

    -- Territory
    territory_description TEXT,
    exclusive_territory BOOLEAN NOT NULL DEFAULT true,
    territory_radius_miles INT,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'terminated', 'expired')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================================
-- ROYALTY PAYMENTS (Automated tracking)
-- =====================================================================

CREATE TABLE royalty_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    franchise_agreement_id UUID REFERENCES franchise_agreements(id),

    -- Payment period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Revenue breakdown
    gross_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    membership_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    training_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retail_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Fees
    royalty_rate DECIMAL(5, 4) NOT NULL,
    royalty_amount DECIMAL(10, 2) NOT NULL,
    marketing_fee_rate DECIMAL(5, 4) NOT NULL,
    marketing_fee_amount DECIMAL(10, 2) NOT NULL,
    technology_fee DECIMAL(10, 2) NOT NULL,
    total_fees DECIMAL(10, 2) NOT NULL,

    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'waived')),
    payment_due_date DATE NOT NULL,
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('ach', 'wire', 'check', 'stripe')),
    stripe_payment_intent_id TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(location_id, period_start, period_end)
);

-- =====================================================================
-- LOCATION ANALYTICS (Aggregated metrics)
-- =====================================================================

CREATE TABLE location_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    location_id UUID NOT NULL REFERENCES locations(id) ON DELETE CASCADE,

    -- Time period
    period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly')),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Membership metrics
    total_members INT NOT NULL DEFAULT 0,
    new_members INT NOT NULL DEFAULT 0,
    canceled_members INT NOT NULL DEFAULT 0,
    active_members INT NOT NULL DEFAULT 0,

    -- Revenue metrics
    gross_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    membership_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    training_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retail_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Activity metrics
    total_workouts INT NOT NULL DEFAULT 0,
    total_classes_booked INT NOT NULL DEFAULT 0,
    average_attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    -- Client engagement
    messages_sent INT NOT NULL DEFAULT 0,
    check_ins_completed INT NOT NULL DEFAULT 0,
    nutrition_logs INT NOT NULL DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(location_id, period_type, period_start)
);

-- =====================================================================
-- CROSS-LOCATION MEMBERSHIPS
-- =====================================================================

CREATE TABLE cross_location_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Membership details
    name TEXT NOT NULL,
    description TEXT,
    membership_type TEXT NOT NULL CHECK (membership_type IN ('single_location', 'multi_location', 'all_locations')),

    -- Location access
    allowed_locations UUID[] DEFAULT '{}', -- Array of location IDs (empty = all locations)
    home_location_required BOOLEAN NOT NULL DEFAULT true,

    -- Pricing
    monthly_price DECIMAL(10, 2) NOT NULL,
    annual_price DECIMAL(10, 2),

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2. Automated Royalty Calculation

**Service Implementation:**
```python
# apps/ai-backend/app/franchise/royalty_calculator.py

from typing import Dict, Any, List
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)


class RoyaltyCalculator:
    """
    Automated royalty calculator for franchise operations.

    Based on Xplor Mariana Tek 2025 features:
    - Automatic tracking and calculation
    - Real-time financial reporting
    - Automated disbursements
    """

    def calculate_period_royalties(
        self,
        location_id: str,
        period_start: date,
        period_end: date,
        royalty_rate: Decimal = Decimal("0.07"),  # 7% default
        marketing_fee_rate: Decimal = Decimal("0.02"),  # 2% default
        technology_fee: Decimal = Decimal("99.00")
    ) -> Dict[str, Any]:
        """
        Calculate royalties for a location for a given period.

        Args:
            location_id: Location UUID
            period_start: Start date of period
            period_end: End date of period
            royalty_rate: Percentage of gross revenue (default 7%)
            marketing_fee_rate: Percentage for marketing fund (default 2%)
            technology_fee: Fixed monthly technology fee (default $99)

        Returns:
            Royalty breakdown with amounts
        """
        # TODO: Query revenue from database
        # For now, placeholder values
        revenue_breakdown = {
            "membership_revenue": Decimal("15000.00"),
            "training_revenue": Decimal("8500.00"),
            "retail_revenue": Decimal("1200.00")
        }

        # Calculate gross revenue
        gross_revenue = sum(revenue_breakdown.values())

        # Calculate fees
        royalty_amount = gross_revenue * royalty_rate
        marketing_fee = gross_revenue * marketing_fee_rate
        total_fees = royalty_amount + marketing_fee + technology_fee

        logger.info(
            f"Royalty calculated for location {location_id}: "
            f"${total_fees:.2f} (${gross_revenue:.2f} @ {royalty_rate})"
        )

        return {
            "location_id": location_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "gross_revenue": float(gross_revenue),
            **{k: float(v) for k, v in revenue_breakdown.items()},
            "royalty_rate": float(royalty_rate),
            "royalty_amount": float(royalty_amount),
            "marketing_fee_rate": float(marketing_fee_rate),
            "marketing_fee_amount": float(marketing_fee),
            "technology_fee": float(technology_fee),
            "total_fees": float(total_fees),
            "payment_due_date": (period_end + timedelta(days=10)).isoformat()
        }

    def calculate_organization_royalties(
        self,
        organization_id: str,
        period_start: date,
        period_end: date
    ) -> Dict[str, Any]:
        """
        Calculate royalties for all locations in an organization.

        Returns aggregate data across all franchise locations.
        """
        # TODO: Query all locations for organization
        # TODO: Calculate royalties for each location
        # TODO: Aggregate results

        return {
            "organization_id": organization_id,
            "period_start": period_start.isoformat(),
            "period_end": period_end.isoformat(),
            "total_locations": 0,
            "total_gross_revenue": 0.00,
            "total_royalties": 0.00,
            "locations": []
        }
```

---

## Implementation Plan

### Week 1: Location Hierarchy + Staff Management

**Day 1-2: Database Schema**
- [ ] Create migration `00028_multi_location.sql`
- [ ] Organizations table (franchise parents)
- [ ] Locations table (branches/franchises)
- [ ] Location staff table (cross-location assignments)
- [ ] Franchise agreements table

**Day 3-4: Location Management API**
- [ ] CRUD endpoints for organizations
- [ ] CRUD endpoints for locations
- [ ] Staff assignment endpoints
- [ ] Location hierarchy queries

**Day 5: Role-Based Permissions**
- [ ] Organization owner permissions
- [ ] Location manager permissions
- [ ] Franchise-specific access controls
- [ ] Cross-location data sharing rules

### Week 2: Royalty Automation + Analytics

**Day 6-7: Royalty Calculation**
- [ ] Build RoyaltyCalculator service
- [ ] Automatic revenue aggregation
- [ ] Royalty payment tracking
- [ ] Automated invoicing

**Day 8-9: Analytics Dashboard**
- [ ] Location analytics aggregation
- [ ] Organization-wide reporting
- [ ] Real-time KPI tracking
- [ ] Cross-location comparison reports

**Day 10: Cross-Location Features**
- [ ] Multi-location memberships
- [ ] Client booking across locations
- [ ] Staff scheduling across locations
- [ ] Centralized billing

---

## Success Metrics

### Technical Metrics
- [ ] Location hierarchy query performance: <100ms
- [ ] Royalty calculation accuracy: 100%
- [ ] Cross-location data sync latency: <5 seconds
- [ ] Analytics dashboard load time: <2 seconds

### Business Metrics
- [ ] Support franchises with 2-100+ locations
- [ ] Automated royalty processing: 100% (eliminate manual calculations)
- [ ] Cross-location member access: Enable for 100% of multi-location memberships
- [ ] Revenue reconciliation accuracy: 100%

---

## Sprint 40 Summary

**Backend Components:**
- Location hierarchy system (organizations, locations, staff)
- Franchise agreement management
- Automated royalty calculation and tracking
- Cross-location analytics aggregation
- Multi-location membership management

**Database:**
- `organizations` table
- `locations` table
- `location_staff` table
- `franchise_agreements` table
- `royalty_payments` table
- `location_analytics` table
- `cross_location_memberships` table

**Story Points:** 21 points (2-week sprint)
- Location hierarchy: 5 points
- Staff management: 3 points
- Royalty automation: 8 points
- Analytics: 3 points
- Cross-location features: 2 points

---

## References

### Multi-Location Management
- [Top 6 Gym Management Software in 2026](https://smarthealthclubs.com/blog/top-6-gym-management-software-in-2026/)
- [Multi-Location Features - FLiiP](https://myfliip.com/features/multi-location/)
- [Top 9 US-Based Gym Management Software Solutions](https://gymroute.com/blog/top-us-based-gym-management-software-solutions/)
- [Software for Multi-Location Gyms](https://www.exercise.com/platform/multi-location/)
- [Multi Location Fitness Software Features](https://www.marianatek.com/features/multi-location/)

### Franchise Management
- [ABC Glofox Multi-Location](https://www.glofox.com/multi-location/)
- [ABC Fitness Solutions](https://abcfitness.com/)
- [MyStudio Franchise Software](https://www.mystudio.io/franchise)
- [GymMaster Franchise Software](https://www.gymmaster.com/ultimate-gym-franchise-software/)

### Royalty Management
- [Xplor Mariana Tek Franchise Tools](https://athletechnews.com/xplor-mariana-tek-launches-new-franchise-management-tools/)
- [Xplor Launch Announcement](https://www.fittechglobal.com/fit-tech-news/Xplor-Mariana-Tek-launches-franchise-management-software-fitness/354893)
- [FranConnect Royalty Manager](https://www.franconnect.com/en/platform-overview/royalty-manager/)
- [Franchise Billing Automation](https://www.recur360.com/franchise-billing-and-royalty-automation/)
- [Royalty Management Software Guide](https://meetbrandwide.com/blog/2024/10/03/how-franchise-directors-can-streamline-revenue-with-royalty-management-software/)
