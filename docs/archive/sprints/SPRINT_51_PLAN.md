# Sprint 51: Equipment OCR + Enhanced Voice Logging - Implementation Plan

**Sprint:** 51
**Feature:** Gym Equipment Display OCR & Deepgram Nova-3 Voice Enhancement
**Goal:** OCR treadmill/cardio displays and boost voice recognition with 100+ fitness keywords
**Priority:** P1 (High)
**Story Points:** 21
**Duration:** 2 weeks
**Status:** 📋 Planning Complete

---

## Executive Summary

Sprint 51 enhances two existing AI data entry capabilities. Equipment OCR uses free, on-device Google ML Kit Text Recognition v2 to read treadmill/elliptical/bike displays and auto-log cardio data. Voice logging gets a major accuracy boost by upgrading to Deepgram Nova-3, expanding fitness keywords from ~20 to 100+, and adding keyterm prompting for up to 6x recognition improvement.

**Strategic Value:**
- Equipment OCR captures cardio data that's currently manually transcribed
- Deepgram keyterm prompting provides documented ~6x improvement for domain terms
- Nova-3 upgrade improves baseline accuracy across all voice commands
- Context-switching between workout and nutrition modes reduces errors
- ML Kit OCR is free on-device; voice cost increase is minimal (~$5/month)

---

## Goals

1. Capture and parse gym equipment display readouts via on-device OCR
2. Upgrade Deepgram from nova-2 to nova-3 with keyterm prompting
3. Expand fitness keyword dictionary from ~20 to 100+ terms
4. Add context switching for workout vs nutrition voice modes

---

## Implementation Tasks

### Task 51.1: Create Equipment OCR Service

**Files to create:**
- `apps/mobile/src/app/core/services/equipment-ocr.service.ts`

**Deliverables:**
- Install ML Kit Text Recognition v2 Capacitor plugin
- Photo capture + on-device text recognition
- Equipment-specific regex parsers per type (treadmill, elliptical, bike, rower, stairclimber)
- Extract: distance, duration, speed, incline, resistance, level
- Signal state: `isProcessing`, `lastResult`, `error`

**Technical Specifications:**
```typescript
interface EquipmentOcrResult {
  equipmentType: EquipmentType;
  rawText: string;
  parsed: {
    distance?: number;      // miles or km
    duration?: number;       // minutes
    speed?: number;          // mph or km/h
    incline?: number;        // percentage
    resistance?: number;     // level
    calories?: number;       // captured but NOT displayed per project rules
  };
  confidence: number;        // 0-1
}

type EquipmentType = 'treadmill' | 'elliptical' | 'bike' | 'rower' | 'stairclimber';
```

### Task 51.2: Create Equipment OCR Component

**Files to create:**
- `apps/mobile/src/app/features/workouts/components/equipment-ocr/equipment-ocr.component.ts`

**Files to modify:**
- Active workout page (add "Scan Equipment" button for cardio exercises)

**Deliverables:**
- Camera overlay optimized for equipment displays
- Landscape guide frame for typical display aspect ratio
- Flash toggle for dim gym lighting
- Parsed results display for user confirmation
- "Accept & Log" button to save to workout session

### Task 51.3: Create Database Migration

**Files to create:**
- `supabase/migrations/20260213030000_equipment_ocr_logs.sql`

**Schema:**
```sql
CREATE TABLE equipment_ocr_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  equipment_type TEXT NOT NULL CHECK (equipment_type IN ('treadmill', 'elliptical', 'bike', 'rower', 'stairclimber')),
  recognized_text TEXT NOT NULL,
  parsed_data JSONB NOT NULL,
  confidence NUMERIC(3,2),
  photo_url TEXT,
  session_id UUID REFERENCES workout_sessions(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_equipment_ocr_user ON equipment_ocr_logs(user_id);
ALTER TABLE equipment_ocr_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own OCR logs" ON equipment_ocr_logs
  FOR ALL USING (user_id = auth.uid());
```

### Task 51.4: Enhance Voice Service with Nova-3 & Keyterm Prompting

**Files to modify:**
- `apps/mobile/src/app/core/services/voice.service.ts`

**Deliverables:**
- Upgrade Deepgram model from `nova-2` to `nova-3`
- Switch from `keywords` param to `keyterm` prompting format (higher accuracy)
- Expand FITNESS_KEYWORDS to 100+ terms organized by category:
  - **Exercises (50+):** deadlift, squat, bench press, overhead press, lat pulldown, cable fly, Romanian deadlift, hip thrust, lunges, pull-up, dip, row, curl, tricep extension, leg press, leg curl, leg extension, calf raise, shrug, face pull, lateral raise, front raise, plank, crunch, Russian twist, etc.
  - **Equipment (15+):** barbell, dumbbell, cable, Smith machine, kettlebell, resistance band, EZ bar, trap bar, pull-up bar, dip station, hack squat, leg press machine, etc.
  - **Nutrition (20+):** protein, carbs, calories, chicken breast, rice, oatmeal, eggs, whey, Greek yogurt, banana, avocado, salmon, sweet potato, broccoli, almond, peanut butter, etc.
  - **Units (10+):** quarter, half, one-fifty, two-twenty-five, three-fifteen, four-oh-five, body weight, etc.
  - **Commands (15+):** superset, drop set, rest-pause, AMRAP, RPE, RIR, to failure, forced reps, negative, tempo, pause rep, cluster set, giant set, tri-set, etc.
- Add `setContext(context: 'workout' | 'nutrition')`: Load context-specific keyword set
- Auto-switch context when navigating between workout and nutrition features

### Task 51.5: Voice Context Indicator

**Files to modify:**
- Active workout page (add voice context badge)
- Nutrition logging pages (add voice context badge)

**Deliverables:**
- Visual indicator showing current voice mode (workout / nutrition)
- Auto-switches based on active page
- User can manually toggle if needed

---

## Acceptance Criteria

- [ ] Equipment OCR captures treadmill/elliptical/bike displays with >85% accuracy
- [ ] OCR works in typical gym lighting conditions
- [ ] Parsed data (duration, distance, speed, incline) shown for confirmation before logging
- [ ] Voice recognition accuracy improves for fitness terms (test with 20 common commands)
- [ ] Deepgram model upgraded from nova-2 to nova-3
- [ ] Keyterm prompting format used instead of basic keywords
- [ ] 100+ fitness keywords organized by category
- [ ] Context switches automatically between workout and nutrition modes
- [ ] Equipment OCR works offline (ML Kit on-device)
- [ ] Calories from equipment OCR captured but NEVER displayed per project rules

---

## Dependencies

- None (independent sprint, enhances existing voice.service.ts)

---

**Status:** 📋 Planning Complete - Ready for Implementation
**Next Step:** Task 51.1 - Create Equipment OCR Service
