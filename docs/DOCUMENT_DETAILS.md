# FitOS User Journeys & Role Architecture - Complete Document Details

## Document Generated Successfully ✓

**File Path:** `/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/FitOS_User_Journeys_and_Role_Architecture.docx`  
**File Size:** 23 KB  
**Format:** Microsoft Word 2007+ (.docx)  
**Generation Date:** February 7, 2026  
**Script:** `generate-user-journeys.js` (636 lines)

---

## Document Contents Overview

### SECTION 1: EXECUTIVE SUMMARY
Provides a high-level overview of the FitOS platform, its three user types, and critical current-state issues:
- Overview of Client, Trainer, and Gym Owner roles
- 9 identified architectural and security issues
- Recommended approach for implementation

**Key Issues Documented:**
- Cross-role authentication bypass
- Single shared dashboard fragility
- Missing role-based access control
- Insufficient permission enforcement
- Empty dashboard data
- Incomplete tab filtering
- Minimal role differentiation in settings
- Lack of role-specific onboarding

### SECTION 2: CURRENT STATE ANALYSIS

**Critical Security Issues:**
- Authentication System: Users can login as any role regardless of registration
- Dashboard Architecture: Conditional rendering instead of role-specific dashboards
- Feature Access Control: Tab-based visibility instead of API-level enforcement
- Permission Model: No RLS at database layer, no middleware validation
- Data Isolation: No enforcement of trainer/owner boundaries

**Recommended Solutions:**
1. Implement role-based route guards
2. Enforce RLS policies in Supabase
3. Add middleware validation in Edge Functions
4. Create role-specific dashboards
5. Define clear feature matrices
6. Implement role-specific onboarding

### SECTION 3: CLIENT USER JOURNEYS (28 Journeys)

**Onboarding Category (4 journeys):**
- J-C01: Register as Client
- J-C02: Complete Onboarding
- J-C03: Accept Trainer Invitation
- J-C04: Connect Wearable Device

**Workouts Category (5 journeys):**
- J-C05: View Today's Workout
- J-C06: Execute Workout
- J-C07: Log Workout via Voice
- J-C08: View Workout History
- J-C09: View Progress & PRs

**Nutrition Category (5 journeys):**
- J-C10: Log Food via Search
- J-C11: Log Food via Voice
- J-C12: Log Food via Photo
- J-C13: View Daily Nutrition Summary
- J-C14: View Nutrition History & Trends

**Communication Category (3 journeys):**
- J-C15: Message Trainer
- J-C16: Submit Form Check Video
- J-C17: View AI Coach

**Recovery & Wellness Category (3 journeys):**
- J-C18: View Recovery Score
- J-C19: Complete Wellness Check-in
- J-C20: View Chronotype Assessment

**Gamification & Social Category (3 journeys):**
- J-C21: View Streaks & Badges
- J-C22: View Leaderboard
- J-C23: Celebrate Milestones

**Account & Settings Category (5 journeys):**
- J-C24: Edit Profile
- J-C25: Manage Subscription
- J-C26: Access Help Center
- J-C27: Set Notification Preferences
- J-C28: Manage Privacy Settings

---

### SECTION 4: TRAINER USER JOURNEYS (36 Journeys)

**Onboarding Category (4 journeys):**
- J-T01: Register as Trainer
- J-T02: Complete Business Setup
- J-T03: Connect Stripe Account
- J-T04: Setup Coach Brain AI

**Client Management Category (6 journeys):**
- J-T05: Invite New Client
- J-T06: View Client List
- J-T07: View Client Detail
- J-T08: Set Client Nutrition Targets
- J-T09: Assess Client Autonomy
- J-T10: Graduate Client

**Workout Management Category (5 journeys):**
- J-T11: Create Exercise
- J-T12: Browse Exercise Library
- J-T13: Build Workout Template
- J-T14: Assign Workout to Client
- J-T15: Review Client Workout History

**Video & Form Review Category (2 journeys):**
- J-T16: Review Form Check Video
- J-T17: Send Video Feedback

**Communication Category (3 journeys):**
- J-T18: Message Client
- J-T19: Review AI Coach Responses
- J-T20: Manage Coach Brain Settings

**CRM & Business Category (5 journeys):**
- J-T21: View CRM Pipeline
- J-T22: Manage Lead
- J-T23: Create Email Template
- J-T24: Setup Email Sequence
- J-T25: View CRM Analytics

**Analytics & Revenue Category (4 journeys):**
- J-T26: View Client Analytics
- J-T27: View Revenue Dashboard
- J-T28: Set Pricing Tiers
- J-T29: View Payment History

**Time & Session Management Category (3 journeys):**
- J-T30: Clock In/Out for Sessions
- J-T31: View Session Schedule
- J-T32: Log Session Notes

**Account & Settings Category (4 journeys):**
- J-T33: Edit Business Profile
- J-T34: Manage Integrations
- J-T35: Access Help Center
- J-T36: Set Notification Preferences

---

### SECTION 5: GYM OWNER USER JOURNEYS (26 Journeys)

**Onboarding Category (4 journeys):**
- J-O01: Register as Gym Owner
- J-O02: Complete Business Setup
- J-O03: Connect Stripe Account
- J-O04: Add Facility/Location

**Trainer Management Category (4 journeys):**
- J-O05: Invite Trainer
- J-O06: View Trainer List
- J-O07: View Trainer Performance
- J-O08: Manage Trainer Permissions

**Client/Member Oversight Category (3 journeys):**
- J-O09: View All Members
- J-O10: View Member Detail
- J-O11: View Member Retention

**Business & Revenue Category (5 journeys):**
- J-O12: View Revenue Dashboard
- J-O13: View Financial Reports
- J-O14: Manage Pricing
- J-O15: View Payment History
- J-O16: Setup Stripe & Payouts

**Analytics & Reporting Category (3 journeys):**
- J-O17: View Facility Analytics
- J-O18: View Client Outcomes
- J-O19: Export Reports

**CRM & Marketing Category (3 journeys):**
- J-O20: View Facility CRM Pipeline
- J-O21: Manage Marketing Campaigns
- J-O22: View Acquisition Analytics

**Settings & Administration Category (4 journeys):**
- J-O23: Manage Facility Settings
- J-O24: Manage Staff Accounts
- J-O25: Access Help Center
- J-O26: View Audit Logs

---

### SECTION 6: TAB NAVIGATION ARCHITECTURE

**CLIENT TAB STRUCTURE (5 tabs):**
1. **Home (Dashboard)** - Today's overview, workouts, nutrition, metrics, quick actions
2. **Workouts** - Exercise library, workout execution, history, PRs, progress
3. **Nutrition** - Food logging (search/voice/photo), macro tracking, trends
4. **AI Coach** - Personalized AI assistant based on trainer methodology
5. **More** - Messages, Settings, Help, Leaderboard, Streaks, Account

**TRAINER TAB STRUCTURE (5 tabs):**
1. **Home (Dashboard)** - Client overview, alerts, revenue, form checks, messages
2. **Clients** - Client list, detail profiles, progress tracking, notes
3. **Workouts** - Exercise library, template builder, assignment, history review
4. **Business** - CRM pipeline, leads, email templates, sequences, analytics, revenue
5. **More** - Messages, Session schedule, Settings, Coach Brain, Email templates, Help

**OWNER TAB STRUCTURE (5 tabs):**
1. **Home (Dashboard)** - Facility overview, KPIs, trainer performance, alerts
2. **Trainers** - Trainer list, performance metrics, permissions, management
3. **Members** - All members, detail profiles, retention analysis, at-risk identification
4. **Business** - Revenue dashboard, financial reports, pricing, payments, CRM, marketing
5. **More** - Facility Settings, Staff Management, Audit Logs, Help, Integrations, Account

---

### SECTION 7: FEATURE MATRIX

Professional table with 21 features and access control:

| Feature | Client | Trainer | Owner |
|---------|--------|---------|-------|
| Register / Onboarding | ✓ | ✓ | ✓ |
| View Dashboard | ✓ | ✓ | ✓ |
| Manage Profile | ✓ | ✓ | ✓ |
| View Workouts | ✓ | ✓ | ✓ |
| Execute Workouts | ✓ | | |
| Create Workouts | | ✓ | |
| Log Nutrition | ✓ | | |
| Set Nutrition Targets | | ✓ | |
| Message Users | ✓ | ✓ | |
| Invite Users | | ✓ | ✓ |
| View Client List | | ✓ | ✓ |
| View Analytics | ✓ | ✓ | ✓ |
| Manage Payments | | ✓ | ✓ |
| View Revenue | | ✓ | ✓ |
| Manage Trainers | | | ✓ |
| View All Members | | | ✓ |
| Access Help Center | ✓ | ✓ | ✓ |
| Manage Settings | ✓ | ✓ | ✓ |
| Set Permissions | | | ✓ |
| View Audit Logs | | | ✓ |

**Table Formatting:**
- Color-coded header row (dark blue background, white text)
- Light gray shading on feature column
- Professional borders (light gray, 6pt)
- Proper cell margins and spacing
- Dual width specification (DXA units)

---

### SECTION 8: PERMISSION ENFORCEMENT STRATEGY

Comprehensive 8-layer enforcement approach:

#### 1. Route Guards (Application Level)
- Role-based middleware protection
- Client, Trainer, and Owner route lists
- Redirect unauthorized access to appropriate role dashboard

#### 2. Tab Visibility (UI Level)
- JWT token-based role checking
- Conditional tab rendering per role
- Hide entire sections from navigation if inaccessible

#### 3. Feature Flags (Component Level)
- Dashboard widgets filtered by role
- Settings sections per role
- Message context varies by role relationship

#### 4. API-Level RLS (Database Level)
- Supabase Row Level Security policies
- Client can only see own data
- Trainer can only see owned clients
- Owner can only see facility data
- Example: `SELECT * FROM clients WHERE user_id = auth.uid()`

#### 5. Middleware Validation (Edge Functions)
- Check user role on every request
- Verify resource ownership before processing
- Log access for GDPR/HIPAA compliance
- Return 403 Forbidden on permission violation

#### 6. Token-Based Authorization
- JWT structure: `{ sub, email, role, gym_id, trainer_id }`
- Token signature validation
- 24-hour expiration with refresh tokens
- Token revocation on logout/role change

#### 7. Data Isolation Strategy
- Clients: Per-user isolation
- Workouts: Trainer/owner/client relationship enforcement
- Messages: Sender/recipient filtering
- Financial: No cross-facility visibility

#### 8. Audit & Compliance
- HIPAA-compliant access logging
- Who, what, when, where tracking
- Data export/deletion workflows
- GDPR compliance reports

---

## Document Specifications

### Technical Details
- **Page Size:** US Letter (8.5" × 11") - 12240 × 15840 DXA
- **Margins:** 1.0 inch on all sides (1440 DXA)
- **Font:** Arial throughout (no mixed fonts)
- **Encoding:** UTF-8

### Color Scheme
- **Primary Blue:** #1F4788 (Headers, accents)
- **Accent Blue:** #0066CC (Links, highlights)
- **Light Gray:** #F5F5F5 (Table backgrounds)
- **Dark Gray:** #333333 (Body text)
- **White:** #FFFFFF (Table headers)

### Typography
- **H1:** 32pt, Bold, Dark Blue, Double border
- **H2:** 28pt, Bold, Dark Blue, Single border
- **H3:** 24pt, Bold, Dark Blue, Single border
- **Body:** 22pt, Regular, Dark Gray
- **Small:** 20pt, Regular, Dark Gray

### Spacing
- **Paragraph spacing:** 240pt line height, 100-120pt after
- **Bullet spacing:** 200-220pt line height, 80pt after
- **Section breaks:** Page breaks between major sections
- **Header/Footer:** 0.5" margins (720 DXA)

---

## Content Statistics

**Total Journeys:** 90 user journeys
- Client journeys: 28
- Trainer journeys: 36
- Gym Owner journeys: 26

**Total Features Documented:** 20+ in feature matrix

**Total Sections:** 10 main sections
1. Title Page
2. Table of Contents
3. Executive Summary
4. Current State Analysis
5. Client User Journeys
6. Trainer User Journeys
7. Gym Owner User Journeys
8. Tab Navigation Architecture
9. Feature Matrix
10. Permission Enforcement Strategy

**Estimated Word Count:** 8,000-10,000 words

---

## Generation Script Details

**File:** `generate-user-journeys.js`  
**Size:** 636 lines of JavaScript  
**Dependencies:** docx v9.5.1  
**Node.js Version:** 20.0.0+  
**Runtime:** ~2 seconds

### Script Modules
1. **Color Management** - Centralized color scheme
2. **Utility Functions** - Header, body, bullet creation
3. **TOC Generation** - Automatic table of contents
4. **Feature Matrix** - Professional table generation
5. **Journey Sections** - Categorized journey organization
6. **Data Structures** - Journey objects with metadata
7. **Document Assembly** - Complete document structure
8. **File Export** - Packer and file writing

### Extensibility
To modify or extend the document:
1. Edit journey arrays (clientJourneys, trainerJourneys, ownerJourneys)
2. Add/remove journeys in format: `{ code, category, title, description }`
3. Modify color scheme in color constants
4. Adjust typography in utility functions
5. Re-run script: `node generate-user-journeys.js`

---

## Document Compliance

✓ **US Letter Format** - Correct page size  
✓ **Arial Font** - Consistent throughout  
✓ **Numbering Config** - docx-js bullet formatting  
✓ **HeadingLevel** - Proper heading hierarchy  
✓ **ShadingType.CLEAR** - Table backgrounds  
✓ **WidthType.DXA** - Correct width units  
✓ **Dual Widths** - Column and cell specifications  
✓ **Headers/Footers** - Professional layout  
✓ **Page Numbers** - Automatic footer numbering  
✓ **Professional Styling** - Consistent formatting

---

## Usage Instructions

### Viewing the Document
1. Navigate to: `/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/`
2. Open: `FitOS_User_Journeys_and_Role_Architecture.docx`
3. Any Word-compatible application (Word, Google Docs, LibreOffice)

### Regenerating the Document
```bash
cd /sessions/pensive-clever-heisenberg/mnt/fitos-app/docs
node generate-user-journeys.js
```

### Modifying Content
1. Edit `/sessions/pensive-clever-heisenberg/mnt/fitos-app/docs/generate-user-journeys.js`
2. Update journey arrays or other content
3. Re-run script to regenerate

---

## Implementation Roadmap

This document establishes the foundation for:
1. **Frontend Development** - Role-specific page implementations
2. **Backend Development** - RLS policy implementation
3. **Authentication** - Proper role assignment and validation
4. **Testing** - Role-based test scenarios
5. **Documentation** - User guides per role
6. **Training** - Role-specific onboarding flows

---

Generated: February 7, 2026  
Document Version: 1.0  
Status: Complete and Ready for Use
