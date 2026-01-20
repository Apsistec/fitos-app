-- Multi-Location Management System
-- Sprint 40: Multi-Location Management
--
-- Enables franchise operations and multi-site gym chains with:
-- - Location hierarchy (organization → locations)
-- - Automated royalty calculation (6-8% of gross revenue)
-- - Cross-location analytics
-- - Multi-location memberships
-- - Centralized staff management
--
-- Market: Fitness franchises represent 30% of $96B gym industry
-- Research: Based on Xplor Mariana Tek 2025 franchise tools launch

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

    -- Contact
    primary_contact_email TEXT,
    primary_contact_phone TEXT,

    -- Billing
    stripe_account_id TEXT,
    billing_email TEXT,

    -- Settings
    settings JSONB DEFAULT '{}', -- Global settings for all locations

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_organizations_type ON organizations(organization_type);

-- Updated at trigger
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization owners can manage organizations"
    ON organizations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = organizations.id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
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

-- Indexes
CREATE INDEX idx_locations_organization_id ON locations(organization_id);
CREATE INDEX idx_locations_slug ON locations(slug);
CREATE INDEX idx_locations_status ON locations(status);
CREATE INDEX idx_locations_city_state ON locations(city, state);
CREATE INDEX idx_locations_geolocation ON locations USING GIST(ll_to_earth(latitude::float8, longitude::float8)) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Updated at trigger
CREATE TRIGGER update_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view locations in their organization"
    ON locations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff
            WHERE location_staff.user_id = auth.uid()
            AND location_staff.location_id = locations.id
        )
        OR
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = locations.organization_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
    );

CREATE POLICY "Organization owners can manage locations"
    ON locations FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = locations.organization_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
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

-- Indexes
CREATE INDEX idx_location_staff_location_id ON location_staff(location_id);
CREATE INDEX idx_location_staff_user_id ON location_staff(user_id);
CREATE INDEX idx_location_staff_role ON location_staff(role);
CREATE INDEX idx_location_staff_status ON location_staff(status);

-- Updated at trigger
CREATE TRIGGER update_location_staff_updated_at
    BEFORE UPDATE ON location_staff
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE location_staff ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view own assignments"
    ON location_staff FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Managers can view staff at their locations"
    ON location_staff FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff own
            WHERE own.location_id = location_staff.location_id
            AND own.user_id = auth.uid()
            AND own.role IN ('owner', 'manager')
            AND own.can_manage_staff = true
        )
    );

CREATE POLICY "Owners can manage staff"
    ON location_staff FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff own
            WHERE own.location_id = location_staff.location_id
            AND own.user_id = auth.uid()
            AND own.role = 'owner'
        )
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

    -- Revenue calculation
    revenue_calculation_method TEXT NOT NULL DEFAULT 'gross' CHECK (revenue_calculation_method IN ('gross', 'net')),

    -- Territory
    territory_description TEXT,
    exclusive_territory BOOLEAN NOT NULL DEFAULT true,
    territory_radius_miles INT,

    -- Document
    agreement_document_url TEXT,

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'terminated', 'expired')),
    termination_date DATE,
    termination_reason TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_franchise_agreements_organization_id ON franchise_agreements(organization_id);
CREATE INDEX idx_franchise_agreements_location_id ON franchise_agreements(location_id);
CREATE INDEX idx_franchise_agreements_franchisee_id ON franchise_agreements(franchisee_id);
CREATE INDEX idx_franchise_agreements_status ON franchise_agreements(status);
CREATE INDEX idx_franchise_agreements_number ON franchise_agreements(agreement_number);

-- Updated at trigger
CREATE TRIGGER update_franchise_agreements_updated_at
    BEFORE UPDATE ON franchise_agreements
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE franchise_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchisees can view own agreements"
    ON franchise_agreements FOR SELECT
    USING (auth.uid() = franchisee_id);

CREATE POLICY "Organization owners can manage agreements"
    ON franchise_agreements FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = franchise_agreements.organization_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
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
    other_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Fees
    royalty_rate DECIMAL(5, 4) NOT NULL,
    royalty_amount DECIMAL(10, 2) NOT NULL,
    marketing_fee_rate DECIMAL(5, 4) NOT NULL,
    marketing_fee_amount DECIMAL(10, 2) NOT NULL,
    technology_fee DECIMAL(10, 2) NOT NULL,
    total_fees DECIMAL(10, 2) NOT NULL,

    -- Payment
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'processing', 'paid', 'overdue', 'waived', 'disputed')),
    payment_due_date DATE NOT NULL,
    payment_date DATE,
    payment_method TEXT CHECK (payment_method IN ('ach', 'wire', 'check', 'stripe', 'manual')),
    stripe_payment_intent_id TEXT,
    transaction_reference TEXT,

    -- Notes
    notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(location_id, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_royalty_payments_organization_id ON royalty_payments(organization_id);
CREATE INDEX idx_royalty_payments_location_id ON royalty_payments(location_id);
CREATE INDEX idx_royalty_payments_status ON royalty_payments(payment_status);
CREATE INDEX idx_royalty_payments_due_date ON royalty_payments(payment_due_date);
CREATE INDEX idx_royalty_payments_period ON royalty_payments(period_start, period_end);

-- Updated at trigger
CREATE TRIGGER update_royalty_payments_updated_at
    BEFORE UPDATE ON royalty_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE royalty_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchisees can view own royalty payments"
    ON royalty_payments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff
            WHERE location_staff.location_id = royalty_payments.location_id
            AND location_staff.user_id = auth.uid()
        )
    );

CREATE POLICY "Organization owners can manage royalty payments"
    ON royalty_payments FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = royalty_payments.organization_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
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
    member_retention_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,

    -- Revenue metrics
    gross_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    membership_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    training_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    retail_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    other_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Activity metrics
    total_workouts INT NOT NULL DEFAULT 0,
    total_classes_booked INT NOT NULL DEFAULT 0,
    average_attendance_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    unique_active_clients INT NOT NULL DEFAULT 0,

    -- Client engagement
    messages_sent INT NOT NULL DEFAULT 0,
    check_ins_completed INT NOT NULL DEFAULT 0,
    nutrition_logs INT NOT NULL DEFAULT 0,

    -- Staff metrics
    total_staff INT NOT NULL DEFAULT 0,
    total_trainers INT NOT NULL DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(location_id, period_type, period_start)
);

-- Indexes
CREATE INDEX idx_location_analytics_location_id ON location_analytics(location_id);
CREATE INDEX idx_location_analytics_period ON location_analytics(period_type, period_start DESC);

-- Updated at trigger
CREATE TRIGGER update_location_analytics_updated_at
    BEFORE UPDATE ON location_analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE location_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view location analytics"
    ON location_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff
            WHERE location_staff.location_id = location_analytics.location_id
            AND location_staff.user_id = auth.uid()
            AND location_staff.can_view_reports = true
        )
    );

CREATE POLICY "Organization owners can view all location analytics"
    ON location_analytics FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            JOIN locations target ON target.organization_id = l.organization_id
            WHERE target.id = location_analytics.location_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
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
    setup_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,

    -- Benefits
    benefits JSONB DEFAULT '[]',

    -- Status
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cross_location_memberships_org_id ON cross_location_memberships(organization_id);
CREATE INDEX idx_cross_location_memberships_type ON cross_location_memberships(membership_type);
CREATE INDEX idx_cross_location_memberships_status ON cross_location_memberships(status);

-- Updated at trigger
CREATE TRIGGER update_cross_location_memberships_updated_at
    BEFORE UPDATE ON cross_location_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE cross_location_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organization owners can manage cross-location memberships"
    ON cross_location_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = cross_location_memberships.organization_id
            AND ls.user_id = auth.uid()
            AND ls.role = 'owner'
        )
    );

CREATE POLICY "Staff can view cross-location memberships"
    ON cross_location_memberships FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM location_staff ls
            JOIN locations l ON l.id = ls.location_id
            WHERE l.organization_id = cross_location_memberships.organization_id
            AND ls.user_id = auth.uid()
        )
    );

-- =====================================================================
-- HELPER FUNCTIONS
-- =====================================================================

-- Function to get all locations for an organization
CREATE OR REPLACE FUNCTION get_organization_locations(p_organization_id UUID)
RETURNS TABLE (
    location_id UUID,
    location_name TEXT,
    location_slug TEXT,
    location_type TEXT,
    city TEXT,
    state TEXT,
    status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        id,
        name,
        slug,
        location_type,
        city,
        state,
        status
    FROM locations
    WHERE organization_id = p_organization_id
    ORDER BY name;
END;
$$;

-- Function to calculate overdue royalty payments
CREATE OR REPLACE FUNCTION get_overdue_royalty_payments(p_organization_id UUID)
RETURNS TABLE (
    payment_id UUID,
    location_id UUID,
    location_name TEXT,
    period_start DATE,
    period_end DATE,
    total_fees DECIMAL(10, 2),
    payment_due_date DATE,
    days_overdue INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        rp.id,
        rp.location_id,
        l.name,
        rp.period_start,
        rp.period_end,
        rp.total_fees,
        rp.payment_due_date,
        (CURRENT_DATE - rp.payment_due_date)::INT
    FROM royalty_payments rp
    JOIN locations l ON l.id = rp.location_id
    WHERE rp.organization_id = p_organization_id
    AND rp.payment_status IN ('pending', 'overdue')
    AND rp.payment_due_date < CURRENT_DATE
    ORDER BY rp.payment_due_date ASC;
END;
$$;

-- =====================================================================
-- COMMENTS
-- =====================================================================

COMMENT ON TABLE organizations IS 'Franchise parent organizations or multi-location gym chains';
COMMENT ON TABLE locations IS 'Individual gym locations (headquarters, branches, franchises)';
COMMENT ON TABLE location_staff IS 'Staff assignments across locations with role-based permissions';
COMMENT ON TABLE franchise_agreements IS 'Franchise agreements with financial terms';
COMMENT ON TABLE royalty_payments IS 'Automated royalty payment tracking (7% default)';
COMMENT ON TABLE location_analytics IS 'Aggregated metrics per location by time period';
COMMENT ON TABLE cross_location_memberships IS 'Membership plans with multi-location access';
COMMENT ON FUNCTION get_organization_locations IS 'Get all locations for an organization';
COMMENT ON FUNCTION get_overdue_royalty_payments IS 'Get overdue royalty payments for an organization';
