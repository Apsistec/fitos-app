import { Injectable, inject, signal } from '@angular/core';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EquipmentType =
  | 'treadmill'
  | 'elliptical'
  | 'bike'
  | 'rower'
  | 'stairclimber'
  | 'other';

export interface ParsedEquipmentData {
  equipment_type: EquipmentType;
  distance_km?: number;
  distance_mi?: number;
  duration_seconds?: number;
  speed_kmh?: number;
  speed_mph?: number;
  incline_pct?: number;
  calories?: number;
  steps?: number;
  watts?: number;
  strokes_per_min?: number;
  floors?: number;
  heart_rate?: number;
  /** Confidence score 0–1 based on how many fields were extracted */
  confidence: number;
}

export interface OcrResult {
  rawText: string;
  parsed: ParsedEquipmentData;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class EquipmentOcrService {
  private supabase = inject(SupabaseService);
  private auth     = inject(AuthService);

  // ─── State ─────────────────────────────────────────────────────────────────
  readonly isProcessing = signal(false);
  readonly lastResult   = signal<OcrResult | null>(null);
  readonly error        = signal<string | null>(null);

  // ─── Public API ────────────────────────────────────────────────────────────

  /**
   * Capture a photo and run ML Kit text recognition on it.
   * Returns the raw OCR text + structured parsed data.
   * Works fully on-device — no server calls required.
   */
  async captureAndRecognize(equipmentType: EquipmentType): Promise<OcrResult | null> {
    this.error.set(null);
    this.isProcessing.set(true);

    try {
      // 1. Capture photo
      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64,
        source: CameraSource.Camera,
        correctOrientation: true,
      });

      if (!photo.base64String) {
        this.error.set('Failed to capture photo.');
        return null;
      }

      // 2. Run ML Kit OCR
      const plugin = await this.getPlugin();
      if (!plugin) {
        this.error.set('Text recognition is not available on this platform.');
        return null;
      }

      const ocr = await plugin.detectText({ base64Image: photo.base64String });
      const rawText = ocr.text ?? '';

      if (!rawText.trim()) {
        this.error.set('No text detected. Make sure the display is clearly visible.');
        return null;
      }

      // 3. Parse the OCR text
      const parsed = this.parseEquipmentDisplay(rawText, equipmentType);

      const result: OcrResult = { rawText, parsed };
      this.lastResult.set(result);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to scan equipment display';
      // User cancelled photo capture — not a real error
      if (msg.toLowerCase().includes('cancel') || msg.toLowerCase().includes('dismissed')) {
        return null;
      }
      this.error.set(msg);
      console.error('[EquipmentOcrService] captureAndRecognize error:', err);
      return null;
    } finally {
      this.isProcessing.set(false);
    }
  }

  /**
   * Parse raw OCR text from a cardio equipment display into structured metrics.
   * Uses equipment-specific regex patterns for maximum accuracy.
   */
  parseEquipmentDisplay(text: string, equipmentType: EquipmentType): ParsedEquipmentData {
    const t = text.replace(/\n/g, ' ').replace(/\s+/g, ' ');
    let fieldsFound = 0;
    const result: ParsedEquipmentData = { equipment_type: equipmentType, confidence: 0 };

    // ── Duration: "12:34" or "1:23:45" ────────────────────────────────────
    const durationMatch = t.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\b/);
    if (durationMatch) {
      const h = durationMatch[3] ? parseInt(durationMatch[1], 10) : 0;
      const m = durationMatch[3] ? parseInt(durationMatch[2], 10) : parseInt(durationMatch[1], 10);
      const s = durationMatch[3] ? parseInt(durationMatch[3], 10) : parseInt(durationMatch[2], 10);
      result.duration_seconds = h * 3600 + m * 60 + s;
      fieldsFound++;
    }

    // ── Calories: "320 CAL", "CAL 320", "KCAL 320" ────────────────────────
    const calMatch = t.match(/\b(?:CAL|KCAL|CALORIES?)\s*[:\-]?\s*(\d{2,4})\b|\b(\d{2,4})\s*(?:CAL|KCAL|CALORIES?)\b/i);
    if (calMatch) {
      result.calories = parseInt(calMatch[1] ?? calMatch[2], 10);
      fieldsFound++;
    }

    // ── Distance: "3.52 KM", "2.18 MI", "DIST 3.52" ──────────────────────
    const distKmMatch = t.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*KM\b/i);
    if (distKmMatch) {
      result.distance_km = parseFloat(distKmMatch[1].replace(',', '.'));
      result.distance_mi = Math.round(result.distance_km * 0.621371 * 100) / 100;
      fieldsFound++;
    } else {
      const distMiMatch = t.match(/\b(\d{1,3}(?:[.,]\d{1,2})?)\s*MI(?:LES?)?\b/i);
      if (distMiMatch) {
        result.distance_mi = parseFloat(distMiMatch[1].replace(',', '.'));
        result.distance_km = Math.round(result.distance_mi * 1.60934 * 100) / 100;
        fieldsFound++;
      }
    }

    // ── Heart Rate: "HR 142", "142 BPM", "HEART RATE 142" ─────────────────
    const hrMatch = t.match(/\b(?:HR|HEART\s*RATE|BPM)\s*[:\-]?\s*(\d{2,3})\b|\b(\d{2,3})\s*BPM\b/i);
    if (hrMatch) {
      const hr = parseInt(hrMatch[1] ?? hrMatch[2], 10);
      if (hr >= 40 && hr <= 220) {
        result.heart_rate = hr;
        fieldsFound++;
      }
    }

    // ── Equipment-specific fields ──────────────────────────────────────────
    switch (equipmentType) {
      case 'treadmill':
      case 'elliptical': {
        // Speed: "5.5 MPH", "8.8 KPH", "SPEED 5.5"
        const spdMph = t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*MPH\b|\bSPEED\s*[:\-]?\s*(\d{1,2}(?:[.,]\d)?)\b/i);
        if (spdMph) {
          result.speed_mph = parseFloat((spdMph[1] ?? spdMph[2]).replace(',', '.'));
          result.speed_kmh = Math.round(result.speed_mph * 1.60934 * 10) / 10;
          fieldsFound++;
        } else {
          const spdKph = t.match(/\b(\d{1,2}(?:[.,]\d)?)\s*KPH\b/i);
          if (spdKph) {
            result.speed_kmh = parseFloat(spdKph[1].replace(',', '.'));
            result.speed_mph = Math.round(result.speed_kmh * 0.621371 * 10) / 10;
            fieldsFound++;
          }
        }
        // Incline: "2.0 INCLINE", "INCLINE 2%", "GRADE 2%"
        const inclineMatch = t.match(/\b(?:INCLINE|GRADE|INCL)\s*[:\-]?\s*(\d{1,2}(?:[.,]\d)?)\s*%?\b|\b(\d{1,2}(?:[.,]\d)?)\s*(?:INCLINE|GRADE)\b/i);
        if (inclineMatch) {
          result.incline_pct = parseFloat((inclineMatch[1] ?? inclineMatch[2]).replace(',', '.'));
          fieldsFound++;
        }
        break;
      }

      case 'bike': {
        // Watts: "250 WATTS", "WATTS 250", "POWER 250W"
        const wattsMatch = t.match(/\b(\d{2,4})\s*W(?:ATTS?)?\b|\bW(?:ATTS?)?\s*[:\-]?\s*(\d{2,4})\b|\bPOWER\s*[:\-]?\s*(\d{2,4})\b/i);
        if (wattsMatch) {
          result.watts = parseInt(wattsMatch[1] ?? wattsMatch[2] ?? wattsMatch[3], 10);
          fieldsFound++;
        }
        // RPM: "80 RPM", "CADENCE 80", "CAD 80"
        const rpmMatch = t.match(/\b(\d{2,3})\s*RPM\b|\b(?:CADENCE|CAD)\s*[:\-]?\s*(\d{2,3})\b/i);
        if (rpmMatch) {
          result.strokes_per_min = parseInt(rpmMatch[1] ?? rpmMatch[2], 10);
          fieldsFound++;
        }
        // Level/Resistance as incline proxy
        const lvlMatch = t.match(/\bLEVEL\s*[:\-]?\s*(\d{1,2})\b|\b(\d{1,2})\s*LEVEL\b/i);
        if (lvlMatch) {
          result.incline_pct = parseInt(lvlMatch[1] ?? lvlMatch[2], 10);
          fieldsFound++;
        }
        break;
      }

      case 'rower': {
        // SPM/Stroke rate: "24 SPM", "STROKE RATE 24"
        const spmMatch = t.match(/\b(\d{1,2})\s*SPM\b|\bSTROKE\s*(?:RATE)?\s*[:\-]?\s*(\d{1,2})\b/i);
        if (spmMatch) {
          result.strokes_per_min = parseInt(spmMatch[1] ?? spmMatch[2], 10);
          fieldsFound++;
        }
        // Watts on rowers too
        const rowerWatts = t.match(/\b(\d{2,4})\s*W(?:ATTS?)?\b/i);
        if (rowerWatts) {
          result.watts = parseInt(rowerWatts[1], 10);
          fieldsFound++;
        }
        break;
      }

      case 'stairclimber': {
        // Floors: "18 FLOORS", "FLOORS 18"
        const floorsMatch = t.match(/\b(\d{1,4})\s*FLOORS?\b|\bFLOORS?\s*[:\-]?\s*(\d{1,4})\b/i);
        if (floorsMatch) {
          result.floors = parseInt(floorsMatch[1] ?? floorsMatch[2], 10);
          fieldsFound++;
        }
        // Steps: "4200 STEPS", "STEPS 4200"
        const stepsMatch = t.match(/\b(\d{3,6})\s*STEPS?\b|\bSTEPS?\s*[:\-]?\s*(\d{3,6})\b/i);
        if (stepsMatch) {
          result.steps = parseInt(stepsMatch[1] ?? stepsMatch[2], 10);
          fieldsFound++;
        }
        break;
      }

      default:
        // Steps fallback for unknown equipment
        const stepsMatch = t.match(/\b(\d{3,6})\s*STEPS?\b/i);
        if (stepsMatch) {
          result.steps = parseInt(stepsMatch[1], 10);
          fieldsFound++;
        }
    }

    // Confidence: ratio of extracted fields vs max expected per equipment type
    const maxFields: Record<EquipmentType, number> = {
      treadmill:    6, // duration, distance, speed, incline, calories, HR
      elliptical:   5,
      bike:         6, // duration, distance, watts, cadence, level, calories
      rower:        5, // duration, distance, spm, watts, calories
      stairclimber: 5, // duration, floors, steps, calories, HR
      other:        3,
    };
    result.confidence = Math.min(1, fieldsFound / maxFields[equipmentType]);

    return result;
  }

  /**
   * Map parsed equipment data to a cardio workout log payload.
   * Caller is responsible for saving to workout_sessions or the relevant table.
   */
  mapToWorkoutLog(parsed: ParsedEquipmentData): {
    exercise_name: string;
    duration_seconds?: number;
    distance_km?: number;
    calories?: number;
    heart_rate_avg?: number;
    notes: string;
  } {
    const nameMap: Record<EquipmentType, string> = {
      treadmill:    'Treadmill',
      elliptical:   'Elliptical',
      bike:         'Stationary Bike',
      rower:        'Rowing Machine',
      stairclimber: 'Stair Climber',
      other:        'Cardio Equipment',
    };

    const noteParts: string[] = [];
    if (parsed.speed_mph)       noteParts.push(`${parsed.speed_mph} mph`);
    if (parsed.speed_kmh)       noteParts.push(`${parsed.speed_kmh} km/h`);
    if (parsed.incline_pct)     noteParts.push(`${parsed.incline_pct}% incline`);
    if (parsed.watts)           noteParts.push(`${parsed.watts}W`);
    if (parsed.strokes_per_min) noteParts.push(`${parsed.strokes_per_min} SPM`);
    if (parsed.floors)          noteParts.push(`${parsed.floors} floors`);
    if (parsed.steps)           noteParts.push(`${parsed.steps} steps`);

    return {
      exercise_name:    nameMap[parsed.equipment_type],
      duration_seconds: parsed.duration_seconds,
      distance_km:      parsed.distance_km,
      calories:         parsed.calories,
      heart_rate_avg:   parsed.heart_rate,
      notes:            noteParts.join(' · '),
    };
  }

  /**
   * Save the OCR capture to the audit log table.
   */
  async logCapture(
    equipmentType: EquipmentType,
    result: OcrResult,
    sessionId?: string,
  ): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) return;

    try {
      await this.supabase.client.from('equipment_ocr_logs').insert({
        user_id:         userId,
        equipment_type:  equipmentType,
        recognized_text: result.rawText,
        parsed_data:     result.parsed,
        confidence:      result.parsed.confidence,
        session_id:      sessionId ?? null,
      });
    } catch (err) {
      console.error('[EquipmentOcrService] logCapture error:', err);
    }
  }

  clearError(): void {
    this.error.set(null);
  }

  // ─── Private ─────────────────────────────────────────────────────────────

  private async getPlugin() {
    try {
      const { CapacitorPluginMlKitTextRecognition } = await import(
        '@pantrist/capacitor-plugin-ml-kit-text-recognition' as string
      ) as { CapacitorPluginMlKitTextRecognition: import('@pantrist/capacitor-plugin-ml-kit-text-recognition').CapacitorPluginMlKitTextRecognitionPlugin };
      return CapacitorPluginMlKitTextRecognition;
    } catch {
      return null;
    }
  }
}
