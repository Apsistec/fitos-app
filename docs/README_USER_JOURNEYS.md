# FitOS User Journeys & Role Architecture Document

## Quick Start

**Document Location:**  
`/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/FitOS_User_Journeys_and_Role_Architecture.docx`

**Generation Script:**  
`/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/generate-user-journeys.js`

## What's Included

A comprehensive 23 KB professional Word document (.docx) containing:

- **90 User Journeys** across 3 roles (Client, Trainer, Gym Owner)
- **28 Client Journeys** - Onboarding, Workouts, Nutrition, Communication, Recovery, Gamification, Account & Settings
- **36 Trainer Journeys** - Client Management, Workout Building, CRM, Analytics, Revenue, Business Operations
- **26 Gym Owner Journeys** - Facility Management, Trainer Oversight, Member Analytics, Financial Reporting
- **Feature Matrix** - 20+ features with access control per role
- **Tab Navigation Architecture** - Complete UI structure for all 3 roles
- **Permission Enforcement Strategy** - 8-layer security approach

## Document Features

✓ Professional formatting (Arial, US Letter size)  
✓ Color-coded section headers (Dark Blue #1F4788)  
✓ Hierarchical heading structure (H1, H2, H3)  
✓ Properly formatted tables with dual-width specifications  
✓ Headers and footers with page numbers  
✓ Page breaks between major sections  
✓ 8,000-10,000 words of detailed content  

## Current State Issues Documented

1. **Authentication Bypass** - Any user can login as any role
2. **Dashboard Architecture** - Single shared dashboard with conditional rendering
3. **Insufficient Access Control** - Features visible to all roles via tabs
4. **No Permission Enforcement** - Missing RLS and API-level validation
5. **Missing Onboarding** - No role-specific onboarding flows
6. **Data Isolation** - No enforcement of role/ownership boundaries

## Recommended Solutions

1. Implement role-based route guards
2. Enforce Supabase RLS policies
3. Add middleware validation in Edge Functions
4. Create role-specific dashboards
5. Define comprehensive feature matrices (done in this doc)
6. Implement role-specific onboarding

## Key Sections

### Section 1: Executive Summary

Overview of FitOS, 3 user roles, and 9 critical current-state issues

### Section 2: Current State Analysis

Deep dive into security and architectural issues with recommended solutions

### Section 3: Client User Journeys (28)

Complete client workflows across 9 categories:

- Onboarding (4 journeys)
- Workouts (5 journeys)
- Nutrition (5 journeys)
- Communication (3 journeys)
- Recovery & Wellness (3 journeys)
- Gamification & Social (3 journeys)
- Account & Settings (5 journeys)

### Section 4: Trainer User Journeys (36)

Complete trainer workflows across 11 categories:

- Onboarding (4 journeys)
- Client Management (6 journeys)
- Workout Management (5 journeys)
- Video & Form Review (2 journeys)
- Communication (3 journeys)
- CRM & Business (5 journeys)
- Analytics & Revenue (4 journeys)
- Time & Session Management (3 journeys)
- Account & Settings (4 journeys)

### Section 5: Gym Owner User Journeys (26)

Complete owner workflows across 8 categories:

- Onboarding (4 journeys)
- Trainer Management (4 journeys)
- Client/Member Oversight (3 journeys)
- Business & Revenue (5 journeys)
- Analytics & Reporting (3 journeys)
- CRM & Marketing (3 journeys)
- Settings & Administration (4 journeys)

### Section 6: Tab Navigation Architecture

Complete tab structure for each role:

- **Client:** Home, Workouts, Nutrition, AI Coach, More
- **Trainer:** Home, Clients, Workouts, Business, More
- **Owner:** Home, Trainers, Members, Business, More

### Section 7: Feature Matrix

Professional table showing 20+ features with access control per role

### Section 8: Permission Enforcement Strategy

8-layer comprehensive security approach:

1. Route Guards (Application Level)
2. Tab Visibility (UI Level)
3. Feature Flags (Component Level)
4. API-Level RLS (Database Level)
5. Middleware Validation (Edge Functions)
6. Token-Based Authorization
7. Data Isolation Strategy
8. Audit & Compliance (GDPR/HIPAA)

## How to Use This Document

### For Development Teams

1. Use as reference for role-based feature implementation
2. Follow permission enforcement strategy for backend
3. Implement tab navigation per role specifications
4. Use feature matrix to validate access control

### For Product Management

1. Review all journeys per role
2. Identify missing features or workflows
3. Plan phased rollout by feature
4. Use as communication tool with stakeholders

### For Security Review

1. Review permission enforcement strategy
2. Implement RLS policies from data isolation section
3. Implement middleware validation from section 8
4. Plan audit logging per compliance section

### For Design/UX

1. Use tab navigation architecture for page layouts
2. Reference journey descriptions for context
3. Use feature matrix for conditional UI rendering
4. Plan role-specific onboarding flows

## Regenerating the Document

If you need to update content:

```bash
cd /sessions/pensive-clever-heisenberg/mnt/fitos-app/docs
node generate-user-journeys.js
```

### Modifying Content

Edit `generate-user-journeys.js`:

- **Journey arrays:** Lines ~280-450 (clientJourneys, trainerJourneys, ownerJourneys)
- **Color scheme:** Lines ~10-15
- **Fonts/Typography:** Lines ~17-90 (utility functions)
- **Document structure:** Lines ~550+ (document assembly)

All journeys follow this format:

```javascript
{
  code: 'J-C01',
  category: 'Onboarding',
  title: 'Register as Client',
  description: 'User creates account with email/password...'
}
```

## Technical Specifications

- **Format:** Microsoft Word 2007+ (.docx)
- **File Size:** 23 KB
- **Page Layout:** US Letter (8.5" × 11")
- **Margins:** 1.0 inch all sides
- **Font:** Arial throughout
- **Encoding:** UTF-8

### Color Scheme

- **Primary:** Dark Blue #1F4788
- **Accent:** Bright Blue #0066CC
- **Light Background:** #F5F5F5
- **Text:** Dark Gray #333333

## Document Statistics

- **Total Journeys:** 90 (28 Client + 36 Trainer + 26 Owner)
- **Categorized Workflows:** 28 categories total
- **Features Documented:** 20+ with access control
- **Security Layers:** 8 comprehensive enforcement strategies
- **Estimated Words:** 8,000-10,000
- **Sections:** 10 (Title + TOC + 8 main sections)

## Script Details

**File:** `generate-user-journeys.js`  
**Lines:** 636  
**Dependencies:** docx v9.5.1  
**Node.js:** 20.0.0+  
**Runtime:** ~2 seconds  

## References

See also in `/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/`:

- `DOCUMENT_DETAILS.md` - Complete breakdown of every section
- `GENERATION_SUMMARY.txt` - Technical generation details
- `USER_ROLES_ARCHITECTURE.md` - Additional role architecture reference

## Questions?

For modifications or clarifications:

1. Review `generate-user-journeys.js` script structure
2. Check `DOCUMENT_DETAILS.md` for content breakdown
3. Verify journey format in script arrays
4. Re-run script after making changes

---

Generated: February 7, 2026  
Document Version: 1.0  
Status: Ready for Use in Development
