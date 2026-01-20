# Sprint 42: Local SEO Automation

**Sprint Goal:** Automate local search optimization to drive organic trainer discovery

**Duration:** 2 weeks
**Story Points:** 8
**Priority:** P2 (Medium)
**Status:** 🟢 In Progress

---

## 📊 Research & Context

**Key Insight:** 46% of all Google searches are local (industry data)

**Problem:**
- Solo trainers struggle with local marketing
- Manual SEO is time-consuming and expensive
- Review generation is inconsistent
- Local search visibility is poor

**Solution:**
Automate the entire local SEO workflow from trainer profile data, making organic discovery effortless.

---

## 🎯 Sprint Objectives

### Business Goals
1. Reduce trainer marketing costs by 70%
2. Increase organic discovery by 30%
3. Achieve 75% increase in local search visibility
4. Get 50% of trainers with Google Business Profile within 30 days

### Technical Goals
1. Google Business Profile API integration
2. Schema.org structured data automation
3. Review request automation
4. Location landing page generation
5. NAP (Name, Address, Phone) consistency enforcement

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Local SEO Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Trainer    │  │   Location   │  │   Business   │     │
│  │   Profile    │──▶│   Data       │──▶│   Profile    │     │
│  │              │  │   Extractor  │  │   Generator  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                              │              │
│                                              ▼              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Schema.org │  │   Review     │  │   Landing    │     │
│  │   Markup     │  │   Request    │  │   Page       │     │
│  │   Generator  │  │   Automation │  │   Builder    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                   │            │
│         └─────────────────┼───────────────────┘            │
│                           ▼                                │
│                  ┌──────────────────┐                      │
│                  │  Google Business │                      │
│                  │  Profile API     │                      │
│                  └──────────────────┘                      │
│                           │                                │
│                           ▼                                │
│                  ┌──────────────────┐                      │
│                  │  Google Search   │                      │
│                  │  / Maps          │                      │
│                  └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Implementation Plan

### Week 1: Foundation (Days 1-5)

#### Day 1-2: Database Schema & Google Business Profile Setup
**Tasks:**
- [ ] Create migration `00030_local_seo.sql`
  - `google_business_profiles` table
  - `seo_keywords` table
  - `review_requests` table
  - `landing_pages` table
  - `seo_analytics` table
  - Indexes and RLS policies

- [ ] Google Business Profile API setup
  - Create GCP project
  - Enable Google My Business API
  - Configure OAuth 2.0 credentials
  - Test API access

**Files:**
- `supabase/migrations/00030_local_seo.sql`
- `apps/ai-backend/app/seo/__init__.py`

#### Day 3-4: Core SEO Services (Backend)
**Tasks:**
- [ ] Create `GBPService` (Google Business Profile integration)
  - Profile creation from trainer data
  - Profile updates
  - Profile verification status
  - Photo uploads
  - Hours management

- [ ] Create `SchemaOrgService` (Structured data generation)
  - LocalBusiness schema
  - Person schema (trainer)
  - Service schema
  - AggregateRating schema
  - JSON-LD generation

- [ ] Create `SEOKeywordService`
  - Local keyword research
  - Keyword optimization
  - Competitor analysis

**Files:**
- `apps/ai-backend/app/seo/gbp_service.py`
- `apps/ai-backend/app/seo/schema_org_service.py`
- `apps/ai-backend/app/seo/keyword_service.py`

#### Day 5: NAP Consistency Service
**Tasks:**
- [ ] Create `NAPConsistencyService`
  - Extract NAP from trainer profile
  - Validate consistency across platforms
  - Auto-correct discrepancies
  - Alert on conflicts

**Files:**
- `apps/ai-backend/app/seo/nap_consistency.py`

---

### Week 2: Automation & UI (Days 6-10)

#### Day 6-7: Review Request Automation
**Tasks:**
- [ ] Create `ReviewRequestService`
  - Trigger detection (milestones, workouts completed)
  - SMS/email review requests
  - Review link generation (Google, Yelp, etc.)
  - Response tracking

- [ ] Create review request templates
  - Post-milestone (e.g., "10 lbs lost!")
  - Post-workout streak (e.g., "5 workouts in a row!")
  - Post-goal achievement

**Files:**
- `apps/ai-backend/app/seo/review_service.py`
- `apps/ai-backend/app/seo/review_templates.py`

#### Day 8-9: Landing Page Generator
**Tasks:**
- [ ] Create `LandingPageService`
  - Auto-generate trainer landing pages
  - Location-specific pages
  - Service pages
  - Before/after galleries
  - Testimonials section
  - Schema.org markup injection

- [ ] Create landing page templates
  - Trainer profile template
  - Location template
  - Service template

**Files:**
- `apps/landing/src/app/seo/trainer-profile/trainer-profile.component.ts`
- `apps/landing/src/app/seo/location/location.component.ts`

#### Day 10: SEO Dashboard (Frontend)
**Tasks:**
- [ ] Create SEO dashboard page
  - Google Business Profile status
  - Review request history
  - Local search ranking
  - NAP consistency report
  - Keyword performance

- [ ] Create GBP setup wizard
  - Step-by-step profile creation
  - Photo upload
  - Hours configuration
  - Verification request

**Files:**
- `apps/mobile/src/app/features/seo/pages/seo-dashboard/`
- `apps/mobile/src/app/features/seo/pages/gbp-setup/`

---

## 🗄️ Database Schema

### google_business_profiles
```sql
CREATE TABLE google_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id), -- Optional for franchise

  -- Google Business Profile Details
  gbp_id TEXT UNIQUE, -- Google's profile ID
  account_id TEXT, -- Google My Business account ID

  -- Business Information
  business_name TEXT NOT NULL,
  category TEXT NOT NULL, -- "Personal Trainer", "Fitness Center", etc.
  phone TEXT NOT NULL,
  email TEXT,
  website_url TEXT,

  -- Address
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'US',

  -- Coordinates
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Business Hours (JSONB)
  hours JSONB DEFAULT '{}', -- { "monday": { "open": "06:00", "close": "20:00" }, ... }

  -- Profile Status
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'pending', 'verified')),
  profile_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (profile_status IN ('draft', 'published', 'suspended')),

  -- SEO Data
  description TEXT, -- 750 char max
  service_areas TEXT[], -- Array of cities/zip codes served
  attributes JSONB DEFAULT '{}', -- { "wheelchair_accessible": true, "free_wifi": true }

  -- Photos
  logo_url TEXT,
  cover_photo_url TEXT,
  photos JSONB DEFAULT '[]', -- Array of photo URLs

  -- Statistics
  total_reviews INT DEFAULT 0,
  average_rating DECIMAL(3, 2) DEFAULT 0.0,
  view_count INT DEFAULT 0,
  search_appearances INT DEFAULT 0,

  -- Sync
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error TEXT,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, location_id)
);

-- Review Requests
CREATE TABLE review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Trigger
  trigger_type TEXT NOT NULL CHECK (trigger_type IN (
    'milestone_achieved',
    'workout_streak',
    'goal_completed',
    'manual'
  )),
  trigger_details JSONB, -- Milestone name, streak count, etc.

  -- Request
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_method TEXT NOT NULL CHECK (delivery_method IN ('sms', 'email', 'push')),
  message_template TEXT NOT NULL,

  -- Platform Links
  google_review_url TEXT,
  yelp_review_url TEXT,
  facebook_review_url TEXT,

  -- Response
  clicked_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  review_platform TEXT,
  review_rating INT CHECK (review_rating >= 1 AND review_rating <= 5),
  review_text TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN (
    'sent',
    'clicked',
    'reviewed',
    'expired'
  )),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SEO Keywords
CREATE TABLE seo_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- Keyword
  keyword TEXT NOT NULL,
  keyword_type TEXT NOT NULL CHECK (keyword_type IN (
    'primary',     -- "personal trainer austin"
    'secondary',   -- "strength training coach"
    'long_tail',   -- "bodybuilding coach near me"
    'local'        -- "austin fitness trainer"
  )),

  -- Metrics
  search_volume INT,
  competition TEXT CHECK (competition IN ('low', 'medium', 'high')),
  current_rank INT, -- Position in search results
  target_rank INT DEFAULT 10,

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'retired')),

  -- Tracking
  last_checked_at TIMESTAMPTZ,
  rank_history JSONB DEFAULT '[]', -- [{ "date": "2026-01-20", "rank": 15 }]

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, keyword)
);

-- Landing Pages
CREATE TABLE landing_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  location_id UUID REFERENCES locations(id),

  -- Page Details
  page_type TEXT NOT NULL CHECK (page_type IN (
    'trainer_profile',
    'location',
    'service',
    'specialty'
  )),
  slug TEXT NOT NULL, -- URL slug

  -- SEO
  title TEXT NOT NULL, -- <title> tag
  meta_description TEXT, -- <meta description>
  keywords TEXT[], -- Meta keywords
  canonical_url TEXT,

  -- Content
  hero_title TEXT NOT NULL,
  hero_subtitle TEXT,
  hero_image_url TEXT,
  content_sections JSONB DEFAULT '[]', -- Array of content blocks

  -- Schema.org
  schema_markup JSONB, -- JSON-LD structured data

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,

  -- Analytics
  page_views INT DEFAULT 0,
  unique_visitors INT DEFAULT 0,
  avg_time_on_page INT DEFAULT 0, -- seconds
  bounce_rate DECIMAL(5, 2) DEFAULT 0.0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(slug)
);

-- SEO Analytics
CREATE TABLE seo_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Search Metrics
  google_search_impressions INT DEFAULT 0,
  google_search_clicks INT DEFAULT 0,
  google_maps_views INT DEFAULT 0,
  google_maps_actions INT DEFAULT 0, -- Clicks on phone, directions, website

  -- Profile Metrics
  profile_views INT DEFAULT 0,
  discovery_searches INT DEFAULT 0, -- "personal trainer near me"
  direct_searches INT DEFAULT 0, -- Brand name searches

  -- Rankings
  average_position DECIMAL(5, 2),
  keywords_ranked INT DEFAULT 0,
  keywords_top_10 INT DEFAULT 0,

  -- Reviews
  new_reviews INT DEFAULT 0,
  average_rating DECIMAL(3, 2),
  total_reviews INT DEFAULT 0,

  -- Landing Pages
  landing_page_views INT DEFAULT 0,
  landing_page_conversions INT DEFAULT 0, -- Contact form submissions

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(trainer_id, date)
);
```

---

## 🔌 API Integration: Google Business Profile

### OAuth 2.0 Flow
```python
# Authorization URL
https://accounts.google.com/o/oauth2/v2/auth?
  client_id={CLIENT_ID}&
  redirect_uri={REDIRECT_URI}&
  response_type=code&
  scope=https://www.googleapis.com/auth/business.manage&
  access_type=offline

# Token Exchange
POST https://oauth2.googleapis.com/token
{
  "code": "{AUTH_CODE}",
  "client_id": "{CLIENT_ID}",
  "client_secret": "{CLIENT_SECRET}",
  "redirect_uri": "{REDIRECT_URI}",
  "grant_type": "authorization_code"
}
```

### GBP API Endpoints
```python
# List accounts
GET https://mybusinessaccountmanagement.googleapis.com/v1/accounts

# Create location
POST https://mybusinessbusinessinformation.googleapis.com/v1/{parent}/locations

# Update location
PATCH https://mybusinessbusinessinformation.googleapis.com/v1/{name}

# List reviews
GET https://mybusiness.googleapis.com/v4/{parent}/reviews

# Upload photo
POST https://mybusiness.googleapis.com/v4/{parent}/media
```

---

## 📄 Schema.org Structured Data

### LocalBusiness Schema
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "@id": "https://fitos.ai/trainers/john-doe",
  "name": "John Doe Personal Training",
  "image": "https://fitos.ai/images/trainers/john-doe.jpg",
  "telephone": "+1-512-555-1234",
  "email": "john@example.com",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "123 Main St",
    "addressLocality": "Austin",
    "addressRegion": "TX",
    "postalCode": "78701",
    "addressCountry": "US"
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": 30.2672,
    "longitude": -97.7431
  },
  "url": "https://fitos.ai/trainers/john-doe",
  "priceRange": "$$",
  "openingHoursSpecification": [
    {
      "@type": "OpeningHoursSpecification",
      "dayOfWeek": ["Monday", "Wednesday", "Friday"],
      "opens": "06:00",
      "closes": "20:00"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "127"
  }
}
```

### Person Schema (Trainer)
```json
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "John Doe",
  "jobTitle": "Certified Personal Trainer",
  "description": "NASM-CPT certified trainer specializing in strength training and body recomposition",
  "image": "https://fitos.ai/images/trainers/john-doe.jpg",
  "url": "https://fitos.ai/trainers/john-doe",
  "sameAs": [
    "https://www.instagram.com/johndoe",
    "https://www.facebook.com/johndoetraining"
  ],
  "knowsAbout": ["Strength Training", "Nutrition", "Body Recomposition"],
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Professional Certification",
      "name": "NASM Certified Personal Trainer"
    }
  ]
}
```

---

## 🔄 Review Request Automation

### Triggers
1. **Milestone Achieved** (e.g., "Lost 10 lbs!")
2. **Workout Streak** (e.g., "5 workouts in a row!")
3. **Goal Completed** (e.g., "Bench press 225 lbs!")
4. **Manual Request** (trainer initiates)

### Timing Rules
- Wait 24 hours after trigger
- Only send if client has completed 5+ workouts
- Limit to 1 request per client per 90 days
- Don't send if client already left a review

### Message Templates
```
Hi {CLIENT_NAME}! 🎉

Congrats on {MILESTONE}! Your hard work is paying off.

If you've enjoyed working with {TRAINER_NAME}, we'd love if you could share your experience:

👉 Leave a Google Review: {GOOGLE_REVIEW_URL}

It takes just 30 seconds and helps other people find the right trainer.

Thanks for being awesome!
- The FitOS Team
```

---

## 🎨 Landing Page Templates

### Trainer Profile Page
**URL:** `https://fitos.ai/trainers/{slug}`

**Sections:**
- Hero (photo, name, tagline, CTA)
- About (bio, credentials, specialties)
- Services (offered services with pricing)
- Client Success Stories (before/after, testimonials)
- Reviews (Google Business Profile reviews)
- FAQ
- Contact Form

### Location Page
**URL:** `https://fitos.ai/locations/{city}/{slug}`

**Sections:**
- Hero (location photo, name, address)
- Trainers at This Location
- Services Offered
- Hours & Contact
- Map (Google Maps embed)
- Reviews

---

## 📊 Success Metrics

### Primary KPIs
- **Google Business Profile Adoption:** 50% of trainers within 30 days
- **Local Search Visibility:** 75% increase in impressions
- **Review Generation:** 30% increase in review count
- **Organic Discovery:** 30% increase in profile views

### Secondary KPIs
- **NAP Consistency:** 95% accuracy across platforms
- **Average Rating:** Maintain 4.0+ stars
- **Landing Page Traffic:** 100+ unique visitors per trainer/month
- **Conversion Rate:** 5% of landing page visitors become clients

---

## 🔒 Compliance & Best Practices

### Google Business Profile Guidelines
- Accurate business information
- Real photos (no stock images)
- No keyword stuffing in business name
- Respond to all reviews within 48 hours
- Update hours for holidays

### Review Request Best Practices
- Never incentivize reviews
- Don't ask for positive reviews specifically
- Make it easy (direct link)
- Thank reviewers publicly

---

## 🧪 Testing Strategy

### Unit Tests
- Schema.org markup validation
- NAP consistency detection
- Review trigger logic
- Keyword ranking updates

### Integration Tests
- Google Business Profile API
- OAuth flow
- Photo uploads
- Review fetching

### E2E Tests
- Complete GBP setup wizard
- Review request flow
- Landing page generation
- SEO dashboard

---

## 🚀 Deployment Checklist

- [ ] Run migration `00030_local_seo.sql`
- [ ] Create Google Cloud Platform project
- [ ] Enable Google My Business API
- [ ] Configure OAuth 2.0 credentials
- [ ] Set up environment variables:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_REDIRECT_URI`
- [ ] Test GBP API access
- [ ] Deploy SEO dashboard
- [ ] Create review request templates
- [ ] Set up cron job for keyword rank tracking

---

**Last Updated:** 2026-01-20
**Next Review:** After Week 1 milestone
