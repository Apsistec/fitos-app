# Required External APIs for FitOS Landing Page

**Created:** January 23, 2026
**Purpose:** Quick reference for setting up all external services required for landing page marketing optimization

---

## Priority 1: Essential for Launch

### 1. Google Analytics 4 (GA4)
**Purpose:** Core website analytics, user behavior tracking, conversion tracking

**Setup URL:** https://analytics.google.com/analytics/web/

**What You Need:**
- Measurement ID (starts with G-XXXXXXXXXX)
- Google tag code snippet

**Implementation:**
- Add GA4 script to `apps/landing/src/index.html` `<head>` section
- Create custom events for key conversions (trial signups, pricing page views, help requests)

**Cost:** Free (up to 10M events/month)

**Priority:** CRITICAL - Must have for launch

---

### 2. Google Tag Manager (GTM)
**Purpose:** Manage all marketing tags without code deployments, A/B testing setup

**Setup URL:** https://tagmanager.google.com/

**What You Need:**
- Container ID (starts with GTM-XXXXXXX)
- GTM script snippets (head and body)

**Implementation:**
- Add GTM container code to `apps/landing/src/index.html`
- Create tags for GA4, conversion tracking, and future marketing pixels

**Cost:** Free

**Priority:** HIGH - Enables rapid marketing iteration

---

### 3. Google Search Console
**Purpose:** SEO monitoring, search performance, indexing status

**Setup URL:** https://search.google.com/search-console

**What You Need:**
- Domain verification (DNS TXT record or meta tag)
- Sitemap URL submission

**Implementation:**
- Verify domain ownership
- Submit sitemap (generate at `/sitemap.xml`)
- Monitor search queries, impressions, clicks

**Cost:** Free

**Priority:** HIGH - Essential for SEO

---

## Priority 2: Marketing Optimization

### 4. Hotjar (Heatmaps & Session Recording)
**Purpose:** Visual analytics, user behavior insights, identify UX friction

**Setup URL:** https://www.hotjar.com/

**What You Need:**
- Site ID
- Hotjar tracking code

**Recommended Plan:** Business ($80/month) - 500 daily sessions

**Implementation:**
- Add Hotjar script via GTM
- Set up heatmaps for key pages (home, features, pricing)
- Enable session recordings with privacy filters (mask sensitive data)

**Cost:** Free tier available (35 daily sessions), Business: $80/mo

**Priority:** MEDIUM - Very valuable for conversion optimization

---

### 5. Google Optimize (A/B Testing) - DEPRECATED
**Note:** Google Optimize was shut down September 2023

**Replacement:** Use one of these alternatives:

#### Option A: Optimizely
**Setup URL:** https://www.optimizely.com/

**Cost:** Custom pricing (typically $50K+/year)
**Best for:** Enterprise-level testing

#### Option B: VWO (Visual Website Optimizer)
**Setup URL:** https://vwo.com/

**Cost:** Starting at $361/month
**Best for:** Mid-market businesses

#### Option C: AB Tasty
**Setup URL:** https://www.abtasty.com/

**Cost:** Custom pricing
**Best for:** Comprehensive optimization platform

#### Option D: Split (Recommended for Startups)
**Setup URL:** https://www.split.io/

**Cost:** Free tier available, Growth: $33/month
**Best for:** Developer-friendly feature flagging + A/B testing

**Recommendation:** Start with **Split** (free tier) or implement simple A/B testing using GTM + custom JavaScript until revenue justifies premium tools.

**Priority:** MEDIUM - Can start with manual tests, add later

---

### 6. Clarity by Microsoft (Alternative to Hotjar)
**Purpose:** Free session recording and heatmaps

**Setup URL:** https://clarity.microsoft.com/

**What You Need:**
- Project ID
- Clarity tracking code

**Implementation:**
- Add via GTM or direct script
- Set up for all landing pages
- Review session recordings weekly

**Cost:** FREE (unlimited sessions)

**Priority:** HIGH - Free alternative to Hotjar, use both if budget allows

---

## Priority 3: SEO & Content

### 7. Structured Data / Schema.org
**Purpose:** Rich snippets in Google search results, better SERP visibility

**Setup URL:** https://schema.org/docs/gs.html
**Testing Tool:** https://search.google.com/test/rich-results

**What You Need:**
- JSON-LD markup for Organization, Product, FAQPage, Article

**Implementation:**
```typescript
// Add to apps/landing/src/index.html or component metadata
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "FitOS",
  "description": "AI-powered fitness coaching platform for solo trainers",
  "offers": {
    "@type": "Offer",
    "price": "59",
    "priceCurrency": "USD"
  }
}
```

**Cost:** Free (just implementation time)

**Priority:** HIGH - Improves search visibility

---

### 8. Open Graph & Twitter Cards
**Purpose:** Social media sharing optimization, preview images

**Setup URL:** https://ogp.me/ (Open Graph)
**Testing:** https://www.opengraph.xyz/

**What You Need:**
- Open Graph meta tags
- Twitter Card meta tags
- Social preview images (1200x630px)

**Implementation:**
```html
<!-- Add to each page's <head> -->
<meta property="og:title" content="FitOS - AI-Powered Training Platform">
<meta property="og:description" content="Unlimited clients, built-in CRM, AI features">
<meta property="og:image" content="https://fitos.app/og-image.jpg">
<meta property="og:url" content="https://fitos.app">
<meta name="twitter:card" content="summary_large_image">
```

**Cost:** Free

**Priority:** MEDIUM - Important for social sharing

---

## Priority 4: Conversion Tracking

### 9. Facebook Pixel (Meta Pixel)
**Purpose:** Facebook/Instagram ad tracking, retargeting audiences

**Setup URL:** https://business.facebook.com/events_manager

**What You Need:**
- Pixel ID
- Meta Pixel base code

**Implementation:**
- Add via GTM
- Track key events: PageView, ViewContent, Lead, CompleteRegistration

**Cost:** Free (ads separately)

**Priority:** LOW initially, HIGH when running Meta ads

---

### 10. LinkedIn Insight Tag
**Purpose:** LinkedIn ad conversion tracking, B2B audience building

**Setup URL:** https://www.linkedin.com/help/lms/answer/a423304

**What You Need:**
- Partner ID
- Insight Tag code

**Implementation:**
- Add via GTM
- Track conversions for B2B trainer signups

**Cost:** Free (ads separately)

**Priority:** MEDIUM - FitOS targets B2B (trainers), LinkedIn ads may be valuable

---

### 11. Google Ads Conversion Tracking
**Purpose:** Track Google Ads performance, optimize campaigns

**Setup URL:** https://ads.google.com/

**What You Need:**
- Conversion ID
- Conversion label
- Global site tag (if not using GTM)

**Implementation:**
- Set up conversion actions in Google Ads
- Add conversion tracking via GTM
- Track: trial signups, contact form submissions, pricing page visits

**Cost:** Free (ads separately)

**Priority:** HIGH when running Google Ads (likely day 1)

---

## Priority 5: Customer Journey & Attribution

### 12. Customer.io (Marketing Automation)
**Purpose:** Email marketing, customer journey tracking, behavioral triggers

**Setup URL:** https://customer.io/

**Cost:** Starting at $100/month (5K profiles)

**What You Need:**
- Site ID
- JavaScript snippet
- API key for backend integration

**Implementation:**
- Track user behavior on landing page
- Create email drip campaigns for trial users
- Automate onboarding sequences

**Alternative:** Use Supabase + Resend for simpler email automation initially

**Priority:** LOW initially - Implement after first 100 users

---

### 13. Segment (Customer Data Platform)
**Purpose:** Unified customer data, send to multiple destinations

**Setup URL:** https://segment.com/

**Cost:** Free (up to 1K visitors/month), Growth: $120/month

**What You Need:**
- Write key
- Segment SDK

**Implementation:**
- Single SDK to send data to GA4, Hotjar, Facebook Pixel, etc.
- Simplifies adding new tools later
- Track user journey across landing and app

**Alternative:** Implement direct integrations initially, add Segment at scale

**Priority:** LOW initially, MEDIUM at scale (1K+ monthly users)

---

## Priority 6: Performance Monitoring

### 14. Sentry (Error Tracking)
**Purpose:** Frontend error monitoring, performance tracking

**Setup URL:** https://sentry.io/

**Cost:** Free (5K errors/month), Team: $26/month

**What You Need:**
- DSN (Data Source Name)
- Sentry SDK

**Implementation:**
```typescript
// apps/landing/src/main.ts
import * as Sentry from "@sentry/angular";

Sentry.init({
  dsn: "YOUR_DSN_HERE",
  environment: "production",
});
```

**Priority:** MEDIUM - Catch JS errors affecting conversions

---

### 15. Google PageSpeed Insights API
**Purpose:** Monitor landing page performance, Core Web Vitals

**Setup URL:** https://developers.google.com/speed/docs/insights/v5/get-started

**Cost:** Free (API quota: 25K requests/day)

**Implementation:**
- Automated performance monitoring
- Alert on Core Web Vitals degradation
- Track LCP, FID, CLS over time

**Priority:** LOW - Manual checks sufficient initially

---

## Implementation Priority Order

### Week 1 (Pre-Launch)
1. ✅ Google Analytics 4 - CRITICAL
2. ✅ Google Tag Manager - CRITICAL
3. ✅ Google Search Console - HIGH
4. ✅ Structured Data (Schema.org) - HIGH
5. ✅ Open Graph / Twitter Cards - MEDIUM

### Week 2-4 (Launch)
6. ✅ Microsoft Clarity - HIGH (free alternative to Hotjar)
7. ✅ Google Ads Conversion Tracking - HIGH (if running ads)
8. ⏳ Hotjar - MEDIUM (if budget allows $80/mo)
9. ⏳ Sentry - MEDIUM

### Month 2-3 (Optimization)
10. ⏳ A/B Testing Platform (Split or VWO) - MEDIUM
11. ⏳ LinkedIn Insight Tag - MEDIUM (B2B focus)
12. ⏳ Facebook Pixel - LOW initially, HIGH when running Meta ads

### Month 4+ (Scale)
13. ⏳ Customer.io or similar - after 100+ users
14. ⏳ Segment - after 1K+ monthly visitors
15. ⏳ PageSpeed Insights API - automated monitoring

---

## Current Backend APIs (Already Configured)

These are already set up in the mobile/backend:

- ✅ **Supabase** - Database, auth, realtime
- ✅ **Stripe** - Payments (will need landing page pricing)
- ✅ **Deepgram** - Voice AI (Nova-3)
- ✅ **Anthropic Claude** - AI coaching (Haiku/Sonnet)
- ✅ **Terra API** - Wearable integrations
- ⏳ **Resend** - Transactional emails (needs setup for support tickets)

---

## Recommended Minimal Stack (Budget-Conscious)

If budget is tight, start with this free stack:

1. **Google Analytics 4** - Analytics (FREE)
2. **Google Tag Manager** - Tag management (FREE)
3. **Google Search Console** - SEO (FREE)
4. **Microsoft Clarity** - Session recording & heatmaps (FREE)
5. **Schema.org markup** - Rich snippets (FREE)
6. **Open Graph tags** - Social sharing (FREE)
7. **Sentry** (free tier) - Error tracking (FREE up to 5K errors/mo)

**Total Cost:** $0/month
**Covers:** Analytics, user behavior, SEO, error tracking

Add paid tools as revenue grows:
- **Hotjar** at $500+/mo revenue ($80/mo)
- **VWO or Split** at $2K+/mo revenue ($361+/mo)
- **Customer.io** at $5K+/mo revenue ($100/mo)

---

## Implementation Checklist

### Step 1: Create Accounts
- [ ] Google Analytics 4 account
- [ ] Google Tag Manager account
- [ ] Google Search Console account
- [ ] Microsoft Clarity account
- [ ] Sentry account

### Step 2: Get Tracking IDs
- [ ] GA4 Measurement ID (G-XXXXXXXXXX)
- [ ] GTM Container ID (GTM-XXXXXXX)
- [ ] Clarity Project ID
- [ ] Sentry DSN

### Step 3: Implementation
- [ ] Add GTM to `apps/landing/src/index.html`
- [ ] Configure GA4 in GTM
- [ ] Add Clarity script via GTM
- [ ] Add Sentry SDK to Angular app
- [ ] Add Schema.org JSON-LD to pages
- [ ] Add Open Graph meta tags
- [ ] Verify Google Search Console
- [ ] Submit sitemap

### Step 4: Testing
- [ ] Test GA4 events in debug mode
- [ ] Verify Clarity recordings work
- [ ] Test rich results with Google tool
- [ ] Check social previews with opengraph.xyz
- [ ] Verify Search Console ownership

### Step 5: Monitoring
- [ ] Set up GA4 custom reports
- [ ] Create GTM event tracking
- [ ] Review Clarity heatmaps weekly
- [ ] Monitor Sentry errors daily
- [ ] Check Search Console weekly

---

## Cost Summary

| Tool | Free Tier | Recommended Paid | Annual Cost |
|------|-----------|------------------|-------------|
| Google Analytics 4 | ✓ Unlimited | N/A | $0 |
| Google Tag Manager | ✓ Unlimited | N/A | $0 |
| Google Search Console | ✓ Unlimited | N/A | $0 |
| Microsoft Clarity | ✓ Unlimited | N/A | $0 |
| Schema.org / OG tags | ✓ Free | N/A | $0 |
| Sentry | 5K errors/mo | Team: $26/mo | $312 |
| Hotjar | 35 sessions/day | Business: $80/mo | $960 |
| VWO (A/B Testing) | ❌ | Starter: $361/mo | $4,332 |
| Split (Alternative) | 10K units | Growth: $33/mo | $396 |
| Customer.io | ❌ | Essentials: $100/mo | $1,200 |
| Segment | 1K visitors | Growth: $120/mo | $1,440 |

**Minimal Stack (Year 1):** $0-1,200/year
**Recommended Stack (Growth):** $2,500-5,000/year
**Full Stack (Scale):** $8,000-15,000/year

---

## Next Steps

1. **Immediate:** Set up free tools (GA4, GTM, Clarity, Search Console)
2. **Week 2:** Add paid monitoring if budget allows (Sentry, Hotjar)
3. **Month 2:** Implement A/B testing (Split free tier or VWO if budget)
4. **Month 3+:** Add advanced tools based on traction (Customer.io, Segment)

**Questions?** Contact Doug for API key management and implementation support.
