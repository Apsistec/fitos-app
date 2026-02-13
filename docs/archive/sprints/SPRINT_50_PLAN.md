# Sprint 50: Barcode Scanning & Food Database Pipeline - Implementation Plan

**Sprint:** 50
**Feature:** On-Device Barcode Scanning + Multi-Source Nutrition Lookup
**Goal:** Enable instant nutrition logging by scanning food barcodes
**Priority:** P0 (Critical)
**Story Points:** 21
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 50 adds the single most-requested food logging feature: barcode scanning. On-device ML Kit scanning detects UPC/EAN barcodes in <500ms at zero cost. A multi-source pipeline resolves barcodes to nutrition data from Open Food Facts (2.5M+ products), USDA FoodData Central (380K+ foods), and FatSecret API (free tier) — achieving >95% barcode hit rate.

**Strategic Value:**
- Most-requested nutrition feature by users
- On-device ML Kit = $0/month, no cloud dependency for scanning
- Multi-database pipeline ensures high hit rate
- Cached lookups = instant repeated scans
- Complements existing Passio AI photo nutrition and manual search

---

## Goals

1. Implement on-device barcode scanning with ML Kit (UPC-A/E, EAN-8/13)
2. Build multi-source food database pipeline (cache → Open Food Facts → USDA → FatSecret)
3. Create barcode scan UI with viewfinder, results, and confirmation flow
4. Cache barcode lookups in Supabase for community benefit
5. Integrate with existing nutrition logging flow

---

## Technical Architecture

### Database Schema

```sql
-- Barcode-to-nutrition cache (shared across all users)
CREATE TABLE barcode_food_cache (
  barcode TEXT PRIMARY KEY,
  food_name TEXT NOT NULL,
  brand TEXT,
  serving_size NUMERIC(8,2),
  serving_unit TEXT DEFAULT 'g',
  calories NUMERIC(8,2),
  protein NUMERIC(8,2),
  carbs NUMERIC(8,2),
  fat NUMERIC(8,2),
  fiber NUMERIC(8,2),
  sugar NUMERIC(8,2),
  sodium NUMERIC(8,2),
  source TEXT NOT NULL CHECK (source IN ('openfoodfacts', 'usda', 'fatsecret', 'manual')),
  verified BOOLEAN DEFAULT false,
  last_fetched_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User scan history for quick re-logging
CREATE TABLE barcode_scan_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL REFERENCES barcode_food_cache(barcode),
  food_name TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_barcode_scan_history_user ON barcode_scan_history(user_id, scanned_at DESC);
ALTER TABLE barcode_scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own scan history" ON barcode_scan_history
  FOR ALL USING (user_id = auth.uid());

-- Cache is readable by all, writable by edge function (service role)
ALTER TABLE barcode_food_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read barcode cache" ON barcode_food_cache
  FOR SELECT USING (true);
```

### Lookup Pipeline

```
Barcode → (1) barcode_food_cache (Supabase)
        → (2) Open Food Facts API (free, 2.5M+ products, 180 countries)
        → (3) USDA FoodData Central (free, 380K+ foods, 1000 req/hr)
        → (4) FatSecret API (free Premier tier <$1M revenue, 5000/day)
        → (5) null → manual entry fallback
```

---

## Implementation Tasks

### Task 50.1: Install Plugin & Create Scanner Service

**Files to create:**
- `apps/mobile/src/app/core/services/barcode-scanner.service.ts`

**Deliverables:**
- Install `@capacitor-mlkit/barcode-scanning`
- Scanner service with signal state
- Camera permission handling
- On-device UPC-A/E, EAN-8/13 detection

**Technical Specifications:**
```typescript
@Injectable({ providedIn: 'root' })
export class BarcodeScannerService {
  private readonly isScanning = signal(false);
  private readonly lastBarcode = signal<string | null>(null);
  private readonly error = signal<string | null>(null);

  readonly scanning = this.isScanning.asReadonly();
  readonly barcode = this.lastBarcode.asReadonly();
  readonly scanError = this.error.asReadonly();

  async scan(): Promise<string | null>;
  async isSupported(): Promise<boolean>;
  async requestPermission(): Promise<boolean>;
}
```

### Task 50.2: Create Barcode Lookup Edge Function

**Files to create:**
- `supabase/functions/barcode-lookup/index.ts`

**Deliverables:**
- Multi-source lookup pipeline with caching
- Standardized Food response matching food.service.ts interface
- Rate limiting awareness for each API
- Cache successful lookups to `barcode_food_cache`

**Environment Variables:**
- `USDA_API_KEY` (already in .env)
- `FATSECRET_CLIENT_ID` / `FATSECRET_CLIENT_SECRET` (new)

### Task 50.3: Enhance Food Service

**Files to modify:**
- `apps/mobile/src/app/core/services/food.service.ts`

**Deliverables:**
- Add `lookupBarcode(barcode: string): Promise<Food | null>`
- Call `barcode-lookup` edge function
- Integrate with existing `searchResults` signal and food cache

### Task 50.4: Create Barcode Scan Page

**Files to create:**
- `apps/mobile/src/app/features/nutrition/pages/barcode-scan/barcode-scan.page.ts`

**Files to modify:**
- `apps/mobile/src/app/app.routes.ts` (add `tabs/nutrition/scan` route)

**Deliverables:**
- Full-screen scanner overlay with viewfinder frame
- Recent scans list below viewfinder
- Manual barcode entry input fallback
- Dark theme, smooth animations

### Task 50.5: Create Barcode Result Component

**Files to create:**
- `apps/mobile/src/app/features/nutrition/components/barcode-result/barcode-result.component.ts`

**Deliverables:**
- Display found food with full macro breakdown
- Editable serving size/quantity
- "Log Entry" confirmation button
- "Not found" state with manual entry CTA

### Task 50.6: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213020000_barcode_food_cache.sql`

### Task 50.7: Add Scan Button to Nutrition Pages

**Files to modify:**
- Add-food page (add "Scan Barcode" button alongside existing search)

---

## User Flows

### Flow 1: Scan Barcode → Log Food

```
1. Client → Opens nutrition, taps "Scan Barcode" (or navigates from shortcut)
2. App → Opens camera with viewfinder overlay
3. Client → Points camera at food barcode
4. ML Kit → Detects UPC/EAN on-device in <500ms
5. App → Calls barcode-lookup edge function
6. Edge Function → Checks cache, then Open Food Facts, USDA, FatSecret
7. App → Shows food with macros in barcode-result component
8. Client → Adjusts serving size if needed
9. Client → Taps "Log Entry"
10. App → Saves to nutrition_logs, saves to barcode_scan_history
```

### Flow 2: Re-Log from History

```
1. Client → Opens barcode scanner
2. App → Shows recent scans list below viewfinder
3. Client → Taps previously scanned item
4. App → Loads cached nutrition data
5. Client → Confirms or adjusts, logs entry
```

---

## Acceptance Criteria

- [ ] Camera opens barcode scanner with viewfinder overlay
- [ ] UPC/EAN barcode detected on-device in <500ms
- [ ] Nutrition data resolved from cache or APIs in <2 seconds
- [ ] Found food displays full macros, user can edit serving size
- [ ] Results cached in Supabase for future lookups
- [ ] "Not found" state offers manual entry fallback
- [ ] Recent scans shown for quick re-logging
- [ ] "Scan Barcode" button added to existing nutrition add-food page
- [ ] Dark theme applied, adherence-neutral colors

---

## Dependencies

- None (independent sprint)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 50.1 - Install Plugin & Create Scanner Service
