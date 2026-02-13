# Sprint 46: NFC/QR Check-In & Deep Links - Implementation Plan

**Sprint:** 46
**Feature:** Physical Touchpoints - NFC Tags, QR Codes, Universal Deep Links
**Goal:** Enable instant gym check-in and workout start via NFC tags and QR codes
**Priority:** P0 (Critical)
**Story Points:** 21
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 46 introduces physical touchpoints that allow clients to tap an NFC tag or scan a QR code at their trainer's studio and land on a personalized workout screen in under 3 seconds. The entire stack costs $0/month in software plus a one-time hardware investment of $25-400 for NFC tags.

**Strategic Value:**
- Reduces workout start time from ~30 seconds to ~3 seconds
- Creates tangible brand presence in gyms via physical tags
- Zero recurring software cost (all on-device or free APIs)
- Enables trainer scan analytics for engagement tracking

---

## Goals

1. Implement NFC NDEF URI read/write for gym check-in and workout quick-start
2. Generate branded QR codes in the trainer dashboard for printing
3. Create a central deep-link router consolidating all URL-based app entry points
4. Configure Universal Links (iOS) and App Links (Android) via Firebase Hosting

---

## Technical Architecture

### Database Schema

```sql
-- NFC touchpoint management for trainers
CREATE TABLE nfc_touchpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_id UUID REFERENCES franchise_locations(id),
  tag_type TEXT NOT NULL CHECK (tag_type IN ('check_in', 'equipment', 'workout_start')),
  deep_link_uri TEXT NOT NULL,
  label TEXT NOT NULL,
  equipment_id UUID,
  workout_template_id UUID,
  scan_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Scan event tracking for analytics
CREATE TABLE nfc_scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  touchpoint_id UUID NOT NULL REFERENCES nfc_touchpoints(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  scanned_at TIMESTAMPTZ DEFAULT now(),
  platform TEXT CHECK (platform IN ('ios', 'android', 'web'))
);

-- Indexes
CREATE INDEX idx_nfc_touchpoints_trainer ON nfc_touchpoints(trainer_id);
CREATE INDEX idx_nfc_scan_logs_touchpoint ON nfc_scan_logs(touchpoint_id);
CREATE INDEX idx_nfc_scan_logs_user ON nfc_scan_logs(user_id);

-- RLS
ALTER TABLE nfc_touchpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_scan_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers manage own touchpoints" ON nfc_touchpoints
  FOR ALL USING (trainer_id = auth.uid());

CREATE POLICY "Authenticated users can log scans" ON nfc_scan_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Trainers view own scan logs" ON nfc_scan_logs
  FOR SELECT USING (
    touchpoint_id IN (SELECT id FROM nfc_touchpoints WHERE trainer_id = auth.uid())
  );

-- Auto-increment scan count
CREATE OR REPLACE FUNCTION increment_scan_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE nfc_touchpoints SET scan_count = scan_count + 1, updated_at = now()
  WHERE id = NEW.touchpoint_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_scan_count
  AFTER INSERT ON nfc_scan_logs
  FOR EACH ROW EXECUTE FUNCTION increment_scan_count();
```

### Deep Link URI Format

```
https://www.nutrifitos.app/action/checkin/{facilityId}
https://www.nutrifitos.app/action/workout/{templateId}
https://www.nutrifitos.app/action/equipment/{equipmentId}
```

### NFC Tag Specification

- **Tag Type:** NTAG213 (144 bytes user memory, cheapest option)
- **Record Type:** NDEF URI Record (simple `https://` URI)
- **Max URI Length:** ~42 bytes (well within 144-byte limit)
- **iOS Compatibility:** Background reading on iPhone XS+ (iOS 12+), NDEF URI records only
- **Android Compatibility:** All NFC-enabled devices, ACTION_NDEF_DISCOVERED intent

---

## Implementation Tasks

### Task 46.1: Install NFC Plugin & Create NFC Service

**Files to create:**
- `apps/mobile/src/app/core/services/nfc.service.ts`

**Deliverables:**
- Install `@capgo/capacitor-nfc` v8.0.10
- NFC service with scan, write, and deep-link generation
- Signal-based state management

**Technical Specifications:**
```typescript
@Injectable({ providedIn: 'root' })
export class NfcService {
  private readonly isScanning = signal(false);
  private readonly lastScan = signal<NfcScanResult | null>(null);
  private readonly error = signal<string | null>(null);

  readonly scanning = this.isScanning.asReadonly();
  readonly scan = this.lastScan.asReadonly();
  readonly scanError = this.error.asReadonly();

  async scanTag(): Promise<NfcScanResult>;
  async writeTag(uri: string): Promise<void>;
  async isSupported(): Promise<boolean>;
  generateDeepLink(type: 'checkin' | 'workout' | 'equipment', id: string): string;
}
```

**Acceptance Criteria:**
- [ ] NFC scan reads NDEF URI record from NTAG213 tag
- [ ] NFC write creates NDEF URI record on tag (trainer-only)
- [ ] `isSupported()` correctly detects NFC hardware
- [ ] Signal state updates reactively during scan

### Task 46.2: Create Deep-Link Router Service

**Files to create:**
- `apps/mobile/src/app/core/services/deep-link.service.ts`

**Files to modify:**
- `apps/mobile/src/app/core/services/auth.service.ts` (remove fragmented App listeners)
- `apps/mobile/src/app/core/services/sso.service.ts` (remove fragmented App listeners)
- `apps/mobile/src/app/app.component.ts` (register deep-link service)

**Deliverables:**
- Central deep-link router for all URL-based app entry
- Handles NFC, QR, push notification, and OAuth deep links
- Auth-aware: redirects to login if unauthenticated, then to target

**Technical Specifications:**
```typescript
@Injectable({ providedIn: 'root' })
export class DeepLinkService {
  initialize(): void; // Call in app.component.ts
  handleUrl(url: string): Promise<void>;
  registerHandler(pattern: string, handler: (params: Record<string, string>) => void): void;
}
```

**Route mappings:**
- `/action/checkin/:facilityId` → log check-in, navigate to dashboard
- `/action/workout/:templateId` → navigate to `/tabs/workouts/active/:templateId`
- `/action/equipment/:equipmentId` → navigate to equipment detail
- `/auth/callback` → existing OAuth flow (migrated from sso.service.ts)

### Task 46.3: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213000000_nfc_touchpoints.sql`

**Deliverables:**
- `nfc_touchpoints` and `nfc_scan_logs` tables with RLS
- Auto-increment trigger for scan_count

### Task 46.4: Create NFC Tag Management Page

**Files to create:**
- `apps/mobile/src/app/features/settings/pages/nfc-tags/nfc-tags.page.ts`

**Files to modify:**
- `apps/mobile/src/app/app.routes.ts` (add `tabs/settings/nfc-tags` route)

**Deliverables:**
- List of trainer's NFC touchpoints with scan counts
- Write NFC tag button (opens scan session)
- Delete touchpoint functionality
- Standalone component with OnPush + signals

### Task 46.5: Create QR Code Components

**Files to create:**
- `apps/mobile/src/app/features/clients/components/qr-checkin/qr-checkin.component.ts`

**Deliverables:**
- Install `angularx-qrcode` v21.0.4
- QR code generator with FitOS branding (dark theme colors)
- Print-friendly output
- Same deep-link URI as NFC tags

### Task 46.6: Create NFC Scanner Button Component

**Files to create:**
- `apps/mobile/src/app/features/dashboard/components/nfc-scanner/nfc-scanner.component.ts`

**Deliverables:**
- Floating action button on dashboard
- Shows on NFC-supported devices only
- Triggers NFC scan → processes deep link

### Task 46.7: Configure Universal Links & App Links

**Files to create/modify:**
- `apps/mobile/src/.well-known/apple-app-site-association`
- `apps/mobile/src/.well-known/assetlinks.json`
- `firebase.json` (add `.well-known` path rewrites)

**Deliverables:**
- iOS Universal Links configuration for `nutrifitos.app` domain
- Android App Links configuration
- Firebase Hosting serves both files at correct `.well-known` paths

---

## User Flows

### Flow 1: Client Taps NFC Tag at Gym

```
1. Client → Taps phone on NTAG213 tag at gym entrance
2. OS → Reads NDEF URI: https://www.nutrifitos.app/action/checkin/abc123
3. OS → Opens app via Universal Link / App Link
4. DeepLinkService → Parses /action/checkin/abc123
5. DeepLinkService → Checks auth (redirects to login if needed)
6. App → Logs check-in to nfc_scan_logs
7. App → Navigates to dashboard with "Welcome back" toast
```

### Flow 2: Trainer Writes NFC Tag

```
1. Trainer → Opens Settings > NFC Tags
2. Trainer → Taps "Create New Tag"
3. Trainer → Selects type (check-in, workout, equipment)
4. Trainer → Selects target (facility, workout template, or equipment)
5. App → Generates deep-link URI
6. Trainer → Places phone on blank NTAG213 tag
7. NfcService → Writes NDEF URI record to tag
8. App → Saves touchpoint to nfc_touchpoints table
9. Trainer → Labels tag and places at gym location
```

### Flow 3: QR Code Check-In

```
1. Trainer → Opens client management, taps "QR Code"
2. App → Generates QR code with deep-link URI
3. Trainer → Prints or displays QR code
4. Client → Scans QR with phone camera
5. OS → Opens app via deep link
6. Flow continues same as NFC from step 4
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time from tag tap to workout screen | <3 seconds |
| NFC tag write success rate | >98% |
| QR code scan success rate | >99% |
| Deep-link routing accuracy | 100% |
| Tag-based daily active check-ins | Track for baseline |

---

## Risk Mitigation

### Risk 1: iOS Background NFC Reading
**Mitigation:**
- Use NDEF URI records only (Smart Poster records silently ignored on iOS)
- Test on iPhone XS+ for background reading
- Provide QR code fallback for iPhone 7/8/X users

### Risk 2: Deep-Link Token Consumption Race
**Mitigation:**
- DeepLinkService processes URL before web page loads
- Store pending deep link in sessionStorage during auth redirect
- Clear stored deep link after successful navigation

---

## Testing Strategy

### Unit Tests
- NFC service: scan, write, deep-link generation
- Deep-link service: URL parsing, route mapping, auth check

### Integration Tests
- NFC read → deep-link → navigation chain
- QR code generation → scan → deep-link chain

### Manual Testing
- Test NFC read on iPhone XS+, various Android devices
- Test NFC write to NTAG213 tags
- Test QR scan with built-in camera apps
- Test Universal Links and App Links validation

---

## Definition of Done

- [ ] Database migration created and tested
- [ ] NFC service with scan/write/generate
- [ ] Deep-link service with central routing
- [ ] NFC tag management page (trainer)
- [ ] QR code generation component
- [ ] NFC scanner floating button on dashboard
- [ ] Universal Links and App Links configured
- [ ] Unit tests >80% coverage
- [ ] Manual testing on iOS and Android
- [ ] Dark theme applied to all new UI
- [ ] Documentation updated

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 46.1 - Install NFC Plugin & Create NFC Service
