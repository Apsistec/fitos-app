# Sprint 41: Enterprise SSO Implementation Plan

**Duration:** 2 weeks
**Phase:** 3E - Scale & Enterprise
**Priority:** P2 (High for B2B market entry)
**Story Points:** 8 points (+ 2 points deferred from Sprint 40)

---

## Overview

Implement enterprise Single Sign-On (SSO) to enable corporate wellness program integration and B2B customer acquisition. This sprint positions FitOS for enterprise sales by supporting industry-standard identity providers.

**Strategic Value:**
- Opens enterprise market segment (higher LTV)
- Enables B2B sales to corporate wellness programs
- Reduces onboarding friction for large organizations
- Meets enterprise security requirements
- Supports compliance requirements (SOC 2, ISO 27001)

---

## Research Summary

### Enterprise SSO Requirements (2026 Standards)

**Supported Protocols:**
- **SAML 2.0** - Most common for enterprise (Microsoft, Okta, OneLogin)
- **OIDC (OpenID Connect)** - Modern OAuth 2.0-based (Google, Auth0)
- **SCIM 2.0** - User provisioning and directory sync

**Identity Providers to Support:**
1. **Microsoft Entra ID (Azure AD)** - 60% enterprise market share
2. **Okta** - 25% market share, popular with tech companies
3. **Google Workspace** - 15% market share, SMB focus
4. **OneLogin** - 5% market share
5. **Auth0** - Modern alternative

**Key Features:**
- Just-in-Time (JIT) user provisioning
- Automatic role mapping from IdP groups
- Multi-tenant support (one IdP per organization)
- Fallback to email/password login
- Session management and timeout
- Audit logging for compliance

---

## Technical Architecture

### 1. Authentication Flow

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Browser   │         │   FitOS     │         │     IdP     │
│             │         │   (SP)      │         │  (Okta/AD)  │
└──────┬──────┘         └──────┬──────┘         └──────┬──────┘
       │                       │                       │
       │  1. Login Request     │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │  2. Redirect to IdP   │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │  3. SSO Login         │                       │
       ├───────────────────────┼──────────────────────>│
       │                       │                       │
       │  4. SAML Assertion    │                       │
       │<──────────────────────┼───────────────────────┤
       │                       │                       │
       │  5. Post Assertion    │                       │
       ├──────────────────────>│                       │
       │                       │                       │
       │  6. Validate & Create │                       │
       │     Session           │                       │
       │<──────────────────────┤                       │
       │                       │                       │
       │  7. Redirect to App   │                       │
       │<──────────────────────┤                       │
```

### 2. Database Schema

**Core Tables:**

```sql
-- SSO Configuration per organization
CREATE TABLE sso_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Provider details
  provider_type TEXT NOT NULL CHECK (provider_type IN ('saml', 'oidc')),
  provider_name TEXT NOT NULL, -- 'azure_ad', 'okta', 'google_workspace', 'onelogin'

  -- SAML Configuration
  saml_entity_id TEXT,
  saml_sso_url TEXT,
  saml_certificate TEXT, -- X.509 certificate from IdP
  saml_logout_url TEXT,

  -- OIDC Configuration
  oidc_issuer TEXT,
  oidc_client_id TEXT,
  oidc_client_secret TEXT, -- Encrypted
  oidc_authorization_url TEXT,
  oidc_token_url TEXT,
  oidc_userinfo_url TEXT,

  -- Settings
  enabled BOOLEAN NOT NULL DEFAULT false,
  enforce_sso BOOLEAN NOT NULL DEFAULT false, -- Disable email/password login
  allow_jit_provisioning BOOLEAN NOT NULL DEFAULT true,
  default_role TEXT DEFAULT 'client',

  -- Role mapping
  role_mapping JSONB DEFAULT '{}', -- Map IdP groups to FitOS roles

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- SSO Sessions
CREATE TABLE sso_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sso_config_id UUID NOT NULL REFERENCES sso_configurations(id) ON DELETE CASCADE,

  -- Session details
  session_index TEXT, -- SAML SessionIndex
  name_id TEXT, -- SAML NameID or OIDC subject

  -- Expiration
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SSO Audit Log
CREATE TABLE sso_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sso_config_id UUID REFERENCES sso_configurations(id) ON DELETE SET NULL,

  -- Event details
  event_type TEXT NOT NULL, -- 'login', 'logout', 'jit_provision', 'role_map', 'error'
  event_status TEXT NOT NULL, -- 'success', 'failure'
  event_message TEXT,

  -- Context
  ip_address TEXT,
  user_agent TEXT,
  error_details JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Directory Sync (SCIM 2.0)
CREATE TABLE directory_sync_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- SCIM Configuration
  scim_enabled BOOLEAN NOT NULL DEFAULT false,
  scim_bearer_token TEXT, -- Encrypted
  scim_endpoint TEXT,

  -- Sync settings
  auto_deprovision BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INT DEFAULT 60,
  last_sync_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(organization_id)
);

-- Indexes
CREATE INDEX idx_sso_sessions_user_id ON sso_sessions(user_id);
CREATE INDEX idx_sso_sessions_expires_at ON sso_sessions(expires_at);
CREATE INDEX idx_sso_audit_log_org_id ON sso_audit_log(organization_id);
CREATE INDEX idx_sso_audit_log_created_at ON sso_audit_log(created_at);
```

---

## Implementation Plan

### Week 1: Backend Foundation

#### Day 1-2: Database & Core Services
**Tasks:**
- [ ] Create migration `00029_enterprise_sso.sql`
- [ ] Create SSO configuration service (Python)
- [ ] Create SAML handler service
- [ ] Create OIDC handler service
- [ ] Implement session management

**Files:**
```
apps/ai-backend/app/auth/
├── sso_config.py          # SSO configuration management
├── saml_handler.py        # SAML 2.0 authentication
├── oidc_handler.py        # OIDC authentication
├── session_manager.py     # Session lifecycle
└── audit_logger.py        # Compliance logging
```

#### Day 3-4: SAML 2.0 Implementation
**Tasks:**
- [ ] Install python3-saml library
- [ ] Implement SAML assertion validation
- [ ] Implement attribute mapping
- [ ] Implement JIT user provisioning
- [ ] Add role mapping logic
- [ ] Test with Okta sandbox

**SAML Flow:**
```python
# SAML Authentication Handler
class SAMLHandler:
    def initiate_login(self, organization_id: str):
        # Generate SAML AuthnRequest
        # Redirect to IdP SSO URL
        pass

    def process_assertion(self, saml_response: str):
        # Validate signature
        # Extract attributes (email, name, groups)
        # Map roles from groups
        # Provision user (JIT)
        # Create session
        pass

    def initiate_logout(self, session_id: str):
        # Generate SAML LogoutRequest
        # Invalidate session
        pass
```

#### Day 5: OIDC Implementation
**Tasks:**
- [ ] Install authlib library
- [ ] Implement OIDC authorization flow
- [ ] Implement token validation
- [ ] Implement userinfo retrieval
- [ ] Test with Google Workspace

**OIDC Flow:**
```python
# OIDC Authentication Handler
class OIDCHandler:
    def initiate_login(self, organization_id: str):
        # Generate authorization URL with PKCE
        # Redirect to IdP
        pass

    def handle_callback(self, code: str, state: str):
        # Exchange code for tokens
        # Validate ID token
        # Get userinfo
        # Provision user (JIT)
        # Create session
        pass
```

---

### Week 2: Frontend & Integration

#### Day 6-7: Frontend SSO Service
**Tasks:**
- [ ] Create SSO service (Angular)
- [ ] Implement SSO login flow
- [ ] Implement session management
- [ ] Handle SSO errors gracefully
- [ ] Add loading states

**Files:**
```
apps/mobile/src/app/features/auth/
├── services/
│   └── sso.service.ts              # SSO orchestration
├── pages/
│   ├── sso-login/                  # SSO login page
│   ├── sso-callback/               # SAML/OIDC callback handler
│   └── sso-error/                  # Error handling page
└── guards/
    └── sso-required.guard.ts       # Enforce SSO for org
```

**Service Implementation:**
```typescript
@Injectable({ providedIn: 'root' })
export class SSOService {
  // Initiate SSO login
  initiateLogin(organizationDomain: string): Observable<void>

  // Handle SSO callback
  handleCallback(params: URLSearchParams): Observable<User>

  // Check if org requires SSO
  requiresSSO(organizationDomain: string): Observable<boolean>

  // Get SSO session status
  getSSOSession(): Observable<SSOSession | null>

  // Logout (with SLO if supported)
  logout(): Observable<void>
}
```

#### Day 8: Admin Configuration UI
**Tasks:**
- [ ] Create SSO configuration page
- [ ] SAML metadata upload
- [ ] OIDC credentials input
- [ ] Role mapping UI
- [ ] Test connection functionality

**Files:**
```
apps/mobile/src/app/features/settings/
└── pages/
    ├── sso-config/
    │   ├── sso-config.page.ts
    │   ├── sso-config.page.html
    │   └── sso-config.page.scss
    └── sso-role-mapping/
        └── ...
```

#### Day 9: Directory Sync (SCIM 2.0)
**Tasks:**
- [ ] Implement SCIM endpoints
- [ ] User provisioning endpoint
- [ ] User deprovisioning endpoint
- [ ] Group sync endpoint
- [ ] Webhook notifications

**SCIM Endpoints:**
```python
# SCIM 2.0 API
POST   /scim/v2/Users              # Create user
GET    /scim/v2/Users              # List users
GET    /scim/v2/Users/{id}         # Get user
PUT    /scim/v2/Users/{id}         # Update user
PATCH  /scim/v2/Users/{id}         # Partial update
DELETE /scim/v2/Users/{id}         # Deprovision user

POST   /scim/v2/Groups             # Create group
GET    /scim/v2/Groups             # List groups
```

#### Day 10: Cross-Location Membership UI (Sprint 40 Deferred)
**Tasks:**
- [ ] Create membership tier page
- [ ] Location selection UI
- [ ] Pricing configuration
- [ ] Member assignment interface

---

## Security Considerations

### 1. Certificate Management
```typescript
// Store X.509 certificates securely
- SAML certificates in encrypted database field
- Regular rotation reminders (90 days)
- Certificate validation on every assertion
```

### 2. Session Security
```typescript
// Secure session management
- 15-minute idle timeout (enterprise standard)
- Sliding window for activity
- Automatic logout on session expiry
- Single logout (SLO) support
```

### 3. Audit Logging
```typescript
// Log all SSO events
- Login attempts (success/failure)
- Logout events
- JIT provisioning
- Role mapping changes
- Configuration changes
```

### 4. Encryption
```typescript
// Encrypt sensitive data
- OIDC client secrets: AES-256
- SCIM bearer tokens: AES-256
- Certificates: Secure storage
- Sessions: Encrypted cookies
```

---

## Testing Strategy

### Unit Tests
```typescript
// Backend
- SAML assertion validation
- OIDC token validation
- Role mapping logic
- JIT provisioning

// Frontend
- SSO service flows
- Error handling
- Session management
```

### Integration Tests
```typescript
// End-to-end flows
- Complete SAML login flow
- Complete OIDC login flow
- JIT user creation
- Role assignment
- Session expiry
- Single logout
```

### Provider Testing
```typescript
// Test with each IdP
- Okta sandbox account
- Azure AD test tenant
- Google Workspace test account
```

---

## Success Metrics

### Technical
- [ ] SSO login latency: <2 seconds
- [ ] SAML/OIDC compliance: 100%
- [ ] Support 3+ IdP providers (Azure AD, Okta, Google)
- [ ] Session timeout: 15 minutes idle
- [ ] Audit log coverage: 100% of SSO events

### Business
- [ ] Enable 5+ enterprise pilot customers
- [ ] Zero SSO-related security incidents
- [ ] 90%+ user satisfaction with SSO experience
- [ ] Reduce enterprise onboarding time by 50%

---

## Dependencies

### External Libraries
**Python:**
- `python3-saml>=1.15.0` - SAML 2.0 support
- `authlib>=1.3.0` - OIDC support
- `cryptography>=41.0.0` - Encryption

**TypeScript:**
- Native HTTP client (no additional libs needed)

### Infrastructure
- Supabase Auth SSO configuration
- SSL certificates for SAML endpoints
- SCIM webhook endpoint

---

## Rollout Plan

### Phase 1: Pilot (Week 1-2)
- Deploy to staging
- Test with internal accounts
- Okta sandbox testing

### Phase 2: Beta (Week 3-4)
- Invite 3-5 enterprise pilot customers
- Azure AD + Okta support only
- Gather feedback

### Phase 3: GA (Week 5+)
- Add Google Workspace support
- Full documentation
- Enterprise sales enablement

---

## Documentation Deliverables

- [ ] SSO Admin Setup Guide
- [ ] IdP Configuration Instructions (Azure AD, Okta, Google)
- [ ] SCIM Integration Guide
- [ ] Security Best Practices
- [ ] Troubleshooting Guide
- [ ] API Documentation

---

## Risk Mitigation

### High Risk Items
**Risk:** SAML implementation complexity
**Mitigation:** Use proven library (python3-saml), test with sandbox accounts

**Risk:** IdP-specific quirks
**Mitigation:** Test with all 3 major providers, document workarounds

**Risk:** Session security vulnerabilities
**Mitigation:** Follow OWASP guidelines, security audit before GA

### Medium Risk Items
**Risk:** User confusion with SSO login
**Mitigation:** Clear UX, fallback to email/password, help documentation

---

## Next Steps After Sprint 41

1. **Security Audit** - Third-party review of SSO implementation
2. **SOC 2 Type II** - Use SSO audit logs for compliance
3. **Enterprise Sales** - Enable B2B sales team with SSO capability
4. **Advanced Features** - SCIM group sync, automated role mapping

---

## Summary

Sprint 41 delivers enterprise-grade SSO authentication to position FitOS for B2B market entry. With support for SAML 2.0, OIDC, and SCIM 2.0, the platform will meet enterprise security requirements and enable corporate wellness program sales.

**Key Deliverables:**
- Complete SSO backend (SAML + OIDC)
- SSO frontend flows
- Admin configuration UI
- Directory sync (SCIM)
- Cross-location membership UI (bonus)

**Estimated Completion:** 2 weeks from start date
