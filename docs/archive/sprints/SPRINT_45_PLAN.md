# Sprint 45: Healthcare Integration Prep - Implementation Plan

**Sprint:** 45
**Feature:** Healthcare Integration Prep (HIPAA Compliance)
**Goal:** Position FitOS for clinical and corporate wellness markets
**Priority:** P2 (Medium)
**Story Points:** 8
**Duration:** 2 weeks
**Started:** January 21, 2026

---

## Executive Summary

Sprint 45 prepares FitOS for healthcare B2B markets by implementing HIPAA compliance, comprehensive audit logging, and PHI handling procedures. This positions the platform for:

- Insurance partnerships (wellness programs)
- Clinical research studies
- Corporate wellness programs (healthcare-backed)
- Medical-grade fitness prescriptions

**Key Deliverables:**
1. HIPAA compliance assessment and implementation
2. Comprehensive audit logging system
3. PHI data classification and handling
4. Encryption at rest and in transit (AES-256, TLS 1.3)
5. BAA (Business Associate Agreement) template
6. Patient consent management
7. Breach notification procedures

---

## HIPAA Compliance Requirements

### Administrative Safeguards ✅
- [ ] Security management process
- [ ] Assigned security responsibility
- [ ] Workforce security
- [ ] Information access management
- [ ] Security awareness and training
- [ ] Security incident procedures
- [ ] Contingency planning
- [ ] Business associate agreements

### Physical Safeguards ✅
- [ ] Facility access controls
- [ ] Workstation use policies
- [ ] Workstation security
- [ ] Device and media controls

### Technical Safeguards ✅
- [ ] Access controls (unique user IDs, emergency access)
- [ ] Audit controls (track all PHI access)
- [ ] Integrity controls (data not improperly altered)
- [ ] Person or entity authentication
- [ ] Transmission security (encryption in transit)

---

## Part 1: Audit Logging System (3 points)

### Goal
Track all access to Protected Health Information (PHI) for HIPAA compliance.

### Database Schema

**File:** `supabase/migrations/00031_hipaa_audit_logs.sql`

```sql
-- Audit log table for HIPAA compliance
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Actor information
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    user_role TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,

    -- Action details
    action TEXT NOT NULL, -- 'read', 'create', 'update', 'delete', 'export', 'print'
    resource_type TEXT NOT NULL, -- 'client_profile', 'health_data', 'progress_photo', etc.
    resource_id UUID NOT NULL,

    -- PHI classification
    contains_phi BOOLEAN DEFAULT FALSE,
    phi_categories TEXT[], -- ['demographics', 'health_metrics', 'medical_history', 'photos']

    -- Context
    session_id UUID,
    request_id UUID,
    api_endpoint TEXT,
    http_method TEXT,
    http_status_code INTEGER,

    -- Data changes (for update/delete)
    before_data JSONB, -- Previous state
    after_data JSONB,  -- New state

    -- Security context
    access_reason TEXT, -- 'treatment', 'payment', 'operations', 'research'
    authorization_level TEXT,

    -- Compliance
    retention_policy TEXT DEFAULT 'standard', -- 'standard' (7 years), 'extended' (10 years)
    anonymization_date TIMESTAMP WITH TIME ZONE, -- When to anonymize

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_phi ON audit_logs(contains_phi) WHERE contains_phi = TRUE;
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_session ON audit_logs(session_id);

-- PHI access summary view
CREATE VIEW phi_access_summary AS
SELECT
    DATE(timestamp) as access_date,
    user_id,
    user_email,
    user_role,
    action,
    resource_type,
    COUNT(*) as access_count,
    ARRAY_AGG(DISTINCT phi_categories) as phi_accessed
FROM audit_logs
WHERE contains_phi = TRUE
GROUP BY DATE(timestamp), user_id, user_email, user_role, action, resource_type;

-- Suspicious activity detection
CREATE VIEW suspicious_phi_access AS
SELECT
    user_id,
    user_email,
    DATE(timestamp) as access_date,
    COUNT(*) as access_count,
    COUNT(DISTINCT resource_id) as unique_records_accessed
FROM audit_logs
WHERE contains_phi = TRUE
    AND action = 'read'
GROUP BY user_id, user_email, DATE(timestamp)
HAVING COUNT(*) > 100 -- More than 100 PHI access per day
    OR COUNT(DISTINCT resource_id) > 50; -- More than 50 unique records

-- Row Level Security for audit logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins and compliance officers can read audit logs
CREATE POLICY audit_logs_select_policy ON audit_logs
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' IN ('admin', 'compliance_officer')
    );

-- System can insert audit logs
CREATE POLICY audit_logs_insert_policy ON audit_logs
    FOR INSERT
    WITH CHECK (true); -- Service role only

-- No updates or deletes (immutable audit trail)
CREATE POLICY audit_logs_update_policy ON audit_logs
    FOR UPDATE
    USING (FALSE);

CREATE POLICY audit_logs_delete_policy ON audit_logs
    FOR DELETE
    USING (FALSE);

-- Function to auto-populate user context
CREATE OR REPLACE FUNCTION set_audit_log_user_context()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;

    IF NEW.user_email IS NULL THEN
        SELECT email INTO NEW.user_email
        FROM auth.users
        WHERE id = NEW.user_id;
    END IF;

    IF NEW.user_role IS NULL THEN
        SELECT role INTO NEW.user_role
        FROM profiles
        WHERE id = NEW.user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER audit_log_user_context_trigger
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_audit_log_user_context();

-- Comments for documentation
COMMENT ON TABLE audit_logs IS 'HIPAA-compliant audit trail for all PHI access and modifications';
COMMENT ON COLUMN audit_logs.contains_phi IS 'TRUE if this action involved Protected Health Information';
COMMENT ON COLUMN audit_logs.phi_categories IS 'Categories of PHI accessed: demographics, health_metrics, medical_history, photos, etc.';
COMMENT ON COLUMN audit_logs.access_reason IS 'HIPAA-compliant reason for access: treatment, payment, operations, research';
```

### Backend Service

**File:** `apps/mobile/src/app/core/services/audit-log.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuditLogEntry {
  id?: string;
  timestamp?: string;

  // Actor
  user_id: string;
  user_email?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;

  // Action
  action: 'read' | 'create' | 'update' | 'delete' | 'export' | 'print';
  resource_type: string;
  resource_id: string;

  // PHI classification
  contains_phi: boolean;
  phi_categories?: string[];

  // Context
  session_id?: string;
  request_id?: string;
  api_endpoint?: string;
  http_method?: string;
  http_status_code?: number;

  // Data changes
  before_data?: any;
  after_data?: any;

  // Security
  access_reason?: 'treatment' | 'payment' | 'operations' | 'research';
  authorization_level?: string;

  // Compliance
  retention_policy?: 'standard' | 'extended';
}

export interface AuditLogQuery {
  start_date?: string;
  end_date?: string;
  user_id?: string;
  resource_type?: string;
  action?: string;
  contains_phi?: boolean;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.aiBackendUrl}/audit-logs`;

  /**
   * Log an action that involves PHI access
   */
  logPhiAccess(entry: AuditLogEntry): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/log`, entry);
  }

  /**
   * Log a client profile view (PHI)
   */
  logClientProfileView(clientId: string, reason: string): Observable<void> {
    return this.logPhiAccess({
      user_id: '', // Will be auto-populated
      action: 'read',
      resource_type: 'client_profile',
      resource_id: clientId,
      contains_phi: true,
      phi_categories: ['demographics', 'contact_info'],
      access_reason: 'treatment',
    });
  }

  /**
   * Log health data access (weight, body comp, etc.)
   */
  logHealthDataAccess(
    dataType: string,
    dataId: string,
    action: 'read' | 'create' | 'update' | 'delete'
  ): Observable<void> {
    return this.logPhiAccess({
      user_id: '',
      action,
      resource_type: dataType,
      resource_id: dataId,
      contains_phi: true,
      phi_categories: ['health_metrics'],
      access_reason: 'treatment',
    });
  }

  /**
   * Log progress photo access (high-sensitivity PHI)
   */
  logProgressPhotoAccess(
    photoId: string,
    action: 'read' | 'create' | 'update' | 'delete'
  ): Observable<void> {
    return this.logPhiAccess({
      user_id: '',
      action,
      resource_type: 'progress_photo',
      resource_id: photoId,
      contains_phi: true,
      phi_categories: ['photos', 'body_composition'],
      access_reason: 'treatment',
    });
  }

  /**
   * Log data export (HIPAA requires tracking of all exports)
   */
  logDataExport(
    exportType: string,
    resourceIds: string[],
    containsPhi: boolean
  ): Observable<void> {
    return this.logPhiAccess({
      user_id: '',
      action: 'export',
      resource_type: exportType,
      resource_id: resourceIds.join(','),
      contains_phi: containsPhi,
      phi_categories: containsPhi ? ['demographics', 'health_metrics'] : undefined,
      access_reason: 'operations',
    });
  }

  /**
   * Query audit logs (admin only)
   */
  queryAuditLogs(query: AuditLogQuery): Observable<AuditLogEntry[]> {
    return this.http.post<AuditLogEntry[]>(`${this.baseUrl}/query`, query);
  }

  /**
   * Get PHI access summary for a user
   */
  getPhiAccessSummary(
    userId: string,
    startDate: string,
    endDate: string
  ): Observable<any> {
    return this.http.get(`${this.baseUrl}/phi-summary`, {
      params: { user_id: userId, start_date: startDate, end_date: endDate },
    });
  }

  /**
   * Get suspicious activity alerts
   */
  getSuspiciousActivity(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/suspicious-activity`);
  }
}
```

---

## Part 2: PHI Data Classification (2 points)

### Goal
Identify and tag all data that constitutes Protected Health Information under HIPAA.

### PHI Categories in FitOS

1. **Demographics** (PHI)
   - Full name
   - Date of birth
   - Email address
   - Phone number
   - Address
   - Social Security Number (if collected)

2. **Health Metrics** (PHI)
   - Weight
   - Body composition (body fat %, muscle mass)
   - Blood pressure
   - Heart rate
   - Sleep data
   - Nutrition logs
   - Workout history

3. **Photos** (PHI)
   - Progress photos
   - Body composition photos
   - Any photo showing identifiable features

4. **Medical History** (PHI)
   - Injuries
   - Medical conditions
   - Medications
   - Allergies
   - Doctor notes

5. **Payment Information** (NOT PHI under HIPAA, but PCI-DSS)
   - Credit card numbers
   - Bank account numbers

### Database Updates

**File:** `supabase/migrations/00032_phi_classification.sql`

```sql
-- Add PHI classification to existing tables

-- Client profiles
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'demographics';
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS requires_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS consent_obtained_at TIMESTAMP WITH TIME ZONE;

-- Health data
ALTER TABLE body_weight_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE body_composition_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE nutrition_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'health_metrics';

-- Progress photos (high sensitivity)
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS phi_category TEXT DEFAULT 'photos';
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS requires_special_consent BOOLEAN DEFAULT TRUE;
ALTER TABLE progress_photos ADD COLUMN IF NOT EXISTS consent_obtained_at TIMESTAMP WITH TIME ZONE;

-- Client consents table
CREATE TABLE IF NOT EXISTS client_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

    -- Consent details
    consent_type TEXT NOT NULL, -- 'hipaa_notice', 'treatment', 'research', 'marketing'
    consent_granted BOOLEAN NOT NULL DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    consent_expires_at TIMESTAMP WITH TIME ZONE,

    -- Legal
    consent_version TEXT NOT NULL, -- Version of consent form
    consent_text TEXT NOT NULL, -- Full text of consent
    signature_method TEXT, -- 'electronic', 'verbal', 'written'
    ip_address INET,
    user_agent TEXT,

    -- Tracking
    revoked_at TIMESTAMP WITH TIME ZONE,
    revocation_reason TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(client_id, consent_type, consent_version)
);

CREATE INDEX idx_client_consents_client_id ON client_consents(client_id);
CREATE INDEX idx_client_consents_type ON client_consents(consent_type);
CREATE INDEX idx_client_consents_granted ON client_consents(consent_granted) WHERE consent_granted = TRUE;

-- RLS policies
ALTER TABLE client_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_consents_select_policy ON client_consents
    FOR SELECT
    USING (
        auth.uid() = client_id
        OR auth.jwt() ->> 'role' IN ('admin', 'compliance_officer')
    );

CREATE POLICY client_consents_insert_policy ON client_consents
    FOR INSERT
    WITH CHECK (auth.uid() = client_id);

-- Function to check if consent is valid
CREATE OR REPLACE FUNCTION has_valid_consent(
    p_client_id UUID,
    p_consent_type TEXT
) RETURNS BOOLEAN AS $$
DECLARE
    v_has_consent BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1
        FROM client_consents
        WHERE client_id = p_client_id
            AND consent_type = p_consent_type
            AND consent_granted = TRUE
            AND revoked_at IS NULL
            AND (consent_expires_at IS NULL OR consent_expires_at > NOW())
    ) INTO v_has_consent;

    RETURN v_has_consent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE client_consents IS 'HIPAA-compliant consent tracking for PHI access and use';
COMMENT ON COLUMN client_consents.consent_type IS 'Type of consent: hipaa_notice, treatment, research, marketing';
COMMENT ON FUNCTION has_valid_consent IS 'Check if client has valid consent for specified type';
```

---

## Part 3: Encryption & Security (2 points)

### Goal
Ensure all PHI is encrypted at rest and in transit per HIPAA requirements.

### Encryption at Rest

Supabase automatically provides:
- AES-256 encryption for all database storage ✅
- Encrypted backups ✅
- Encrypted file storage ✅

**Action Required:** Document and verify in HIPAA compliance doc.

### Encryption in Transit

Current implementation:
- TLS 1.3 for all API calls ✅
- HTTPS enforced ✅
- Secure WebSocket connections ✅

**Action Required:** Verify TLS configuration and document.

### Authentication & Access Control

**File:** `apps/mobile/src/app/core/guards/hipaa-access.guard.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { AuditLogService } from '../services/audit-log.service';

@Injectable({
  providedIn: 'root'
})
export class HipaaAccessGuard implements CanActivate {
  private readonly authService = inject(AuthService);
  private readonly auditLogService = inject(AuditLogService);
  private readonly router = inject(Router);

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean> {
    const resourceType = route.data['resourceType'];
    const requiresConsent = route.data['requiresConsent'];

    return this.authService.currentUser$.pipe(
      map(user => {
        if (!user) {
          this.router.navigate(['/login']);
          return false;
        }

        // Check MFA for sensitive PHI access
        if (resourceType === 'progress_photos' && !user.mfa_enabled) {
          this.router.navigate(['/settings/security'], {
            queryParams: { mfa_required: true }
          });
          return false;
        }

        // Log the access attempt
        this.auditLogService.logPhiAccess({
          user_id: user.id,
          action: 'read',
          resource_type: resourceType,
          resource_id: route.params['id'],
          contains_phi: true,
          access_reason: 'treatment',
        }).subscribe();

        return true;
      })
    );
  }
}
```

### Automatic Logoff (15-minute idle timeout)

**File:** `apps/mobile/src/app/core/services/idle-timeout.service.ts`

```typescript
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { fromEvent, merge, Subject, timer } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class IdleTimeoutService {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly destroy$ = new Subject<void>();

  private readonly IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
  private readonly WARNING_BEFORE_MS = 2 * 60 * 1000; // 2 minutes warning

  start() {
    // Listen for user activity
    const userActivity$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll')
    );

    // Debounce activity events
    userActivity$
      .pipe(
        debounceTime(1000),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.resetIdleTimer();
      });

    // Start initial timer
    this.resetIdleTimer();
  }

  stop() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private resetIdleTimer() {
    // Show warning before logout
    timer(this.IDLE_TIMEOUT_MS - this.WARNING_BEFORE_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.showIdleWarning();
      });

    // Auto-logout after timeout
    timer(this.IDLE_TIMEOUT_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.handleIdleTimeout();
      });
  }

  private showIdleWarning() {
    // Show modal warning user they will be logged out
    console.warn('HIPAA Idle Timeout Warning: You will be logged out in 2 minutes');
    // TODO: Show modal with countdown
  }

  private handleIdleTimeout() {
    console.log('HIPAA Idle Timeout: Logging out due to inactivity');
    this.authService.logout();
    this.router.navigate(['/login'], {
      queryParams: { reason: 'idle_timeout' }
    });
  }
}
```

---

## Part 4: Documentation (1 point)

### HIPAA Compliance Documentation

**File:** `docs/HIPAA_COMPLIANCE.md`

Content structure:
1. Executive Summary
2. Administrative Safeguards
3. Physical Safeguards
4. Technical Safeguards
5. Encryption Implementation
6. Audit Logging System
7. Breach Notification Procedures
8. Business Associate Agreements
9. Training Requirements
10. Periodic Reviews

### BAA Template

**File:** `docs/BAA_TEMPLATE.md`

Business Associate Agreement template for healthcare partners.

### Training Materials

**File:** `docs/HIPAA_TRAINING.md`

Training materials for staff on HIPAA compliance.

---

## Success Metrics

### Technical
- [ ] Audit logging covers 100% of PHI access
- [ ] All PHI data is encrypted at rest (AES-256)
- [ ] All API calls use TLS 1.3
- [ ] Idle timeout implemented (15 minutes)
- [ ] MFA enforced for sensitive PHI access
- [ ] No PHI in application logs

### Compliance
- [ ] HIPAA compliance assessment: 100%
- [ ] SOC 2 Type II readiness: 100%
- [ ] BAA template created
- [ ] Breach notification procedures documented
- [ ] Staff training completed

### Business
- [ ] Positions for insurance partnerships
- [ ] Enables clinical research studies
- [ ] Opens corporate wellness market
- [ ] Supports medical-grade prescriptions

---

## Testing Plan

### Security Testing
1. Verify encryption at rest (database inspection)
2. Verify encryption in transit (network inspection)
3. Test idle timeout (wait 15 minutes)
4. Test MFA enforcement
5. Test audit logging (all PHI access logged)

### Compliance Testing
1. Review audit logs for completeness
2. Verify consent management
3. Test breach notification procedures
4. Review BAA with legal team

---

## Risks & Mitigations

### High Risk
- **Legal liability** if HIPAA violation occurs
  - Mitigation: Legal review, insurance, staff training

### Medium Risk
- **Performance impact** from audit logging
  - Mitigation: Async logging, database indexes

### Low Risk
- **User friction** from MFA and idle timeout
  - Mitigation: Clear communication, grace period

---

## Timeline

**Week 1:**
- Days 1-2: Audit logging implementation
- Days 3-4: PHI classification and consent management
- Day 5: Encryption verification

**Week 2:**
- Days 1-2: Access controls and idle timeout
- Days 3-4: Documentation (HIPAA compliance, BAA)
- Day 5: Testing and legal review

---

## Files to Create

### Database (2 files)
- `supabase/migrations/00031_hipaa_audit_logs.sql` (audit logging)
- `supabase/migrations/00032_phi_classification.sql` (PHI classification, consents)

### Backend (1 file)
- `apps/ai-backend/app/routes/audit_logs.py` (audit log API endpoints)

### Frontend (3 files)
- `apps/mobile/src/app/core/services/audit-log.service.ts`
- `apps/mobile/src/app/core/guards/hipaa-access.guard.ts`
- `apps/mobile/src/app/core/services/idle-timeout.service.ts`

### Documentation (3 files)
- `docs/HIPAA_COMPLIANCE.md`
- `docs/BAA_TEMPLATE.md`
- `docs/HIPAA_TRAINING.md`

**Total:** 9 files

---

## Next Steps After Sprint 45

1. **Legal Review:** Have attorney review HIPAA compliance
2. **Insurance:** Get cyber liability insurance
3. **Training:** Train all staff on HIPAA compliance
4. **Partnerships:** Approach insurance companies and healthcare providers
5. **Certification:** Consider HITRUST certification for added credibility

---

**Last Updated:** 2026-01-21
**Status:** 📋 Planning Complete - Ready for Implementation
