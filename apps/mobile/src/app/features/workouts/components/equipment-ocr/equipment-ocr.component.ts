import {
  Component,
  Input,
  Output,
  EventEmitter,
  signal,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonCard,
  IonCardContent,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonItem,
  IonLabel,
  IonBadge,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  checkmarkCircleOutline,
  closeOutline,
  flashOutline,
  scanOutline,
} from 'ionicons/icons';

import {
  EquipmentOcrService,
  EquipmentType,
  ParsedEquipmentData,
  OcrResult,
} from '../../../../core/services/equipment-ocr.service';
import { HapticService } from '../../../../core/services/haptic.service';

export interface OcrLogRequest {
  equipmentType: EquipmentType;
  result: OcrResult;
}

@Component({
  selector: 'app-equipment-ocr',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonSpinner,
    IonCard,
    IonCardContent,
    IonNote,
    IonSelect,
    IonSelectOption,
    IonItem,
    IonLabel,
    IonBadge,
  ],
  template: `
    <div class="ocr-wrapper">
      @if (!result()) {
        <!-- Scanner trigger UI -->
        <div class="scan-prompt">
          <!-- Equipment type selector -->
          <ion-item class="equipment-select" lines="none">
            <ion-label>Equipment</ion-label>
            <ion-select
              [(ngModel)]="selectedEquipment"
              interface="action-sheet"
              placeholder="Select type"
            >
              <ion-select-option value="treadmill">Treadmill</ion-select-option>
              <ion-select-option value="elliptical">Elliptical</ion-select-option>
              <ion-select-option value="bike">Stationary Bike</ion-select-option>
              <ion-select-option value="rower">Rowing Machine</ion-select-option>
              <ion-select-option value="stairclimber">Stair Climber</ion-select-option>
              <ion-select-option value="other">Other</ion-select-option>
            </ion-select>
          </ion-item>

          <ion-button
            expand="block"
            (click)="startScan()"
            [disabled]="ocr.isProcessing()"
            class="scan-btn"
          >
            @if (ocr.isProcessing()) {
              <ion-spinner slot="start" name="crescent"></ion-spinner>
              Scanning…
            } @else {
              <ion-icon slot="start" name="camera-outline"></ion-icon>
              Scan Equipment Display
            }
          </ion-button>

          <p class="scan-hint">
            Point your camera at the equipment's display screen to auto-log your cardio data
          </p>

          @if (ocr.error()) {
            <div class="error-banner">
              <ion-icon name="close-outline"></ion-icon>
              {{ ocr.error() }}
            </div>
          }
        </div>
      } @else {
        <!-- Results confirmation UI -->
        <ion-card class="result-card">
          <ion-card-content>
            <div class="result-header">
              <span class="result-title">Detected Metrics</span>
              <ion-badge [color]="confidenceBadgeColor()" class="conf-badge">
                {{ confidenceLabel() }}
              </ion-badge>
            </div>

            <div class="metrics-grid">
              @if (result()!.parsed.duration_seconds != null) {
                <div class="metric-item">
                  <div class="metric-label">Duration</div>
                  <div class="metric-value">{{ formatDuration(result()!.parsed.duration_seconds!) }}</div>
                </div>
              }
              @if (result()!.parsed.distance_km != null) {
                <div class="metric-item">
                  <div class="metric-label">Distance</div>
                  <div class="metric-value">{{ result()!.parsed.distance_km }}km</div>
                </div>
              }
              @if (result()!.parsed.calories != null) {
                <div class="metric-item">
                  <div class="metric-label">Calories</div>
                  <div class="metric-value">{{ result()!.parsed.calories }}</div>
                </div>
              }
              @if (result()!.parsed.speed_mph != null) {
                <div class="metric-item">
                  <div class="metric-label">Speed</div>
                  <div class="metric-value">{{ result()!.parsed.speed_mph }} mph</div>
                </div>
              }
              @if (result()!.parsed.incline_pct != null) {
                <div class="metric-item">
                  <div class="metric-label">Incline</div>
                  <div class="metric-value">{{ result()!.parsed.incline_pct }}%</div>
                </div>
              }
              @if (result()!.parsed.watts != null) {
                <div class="metric-item">
                  <div class="metric-label">Watts</div>
                  <div class="metric-value">{{ result()!.parsed.watts }}W</div>
                </div>
              }
              @if (result()!.parsed.strokes_per_min != null) {
                <div class="metric-item">
                  <div class="metric-label">
                    {{ selectedEquipment === 'bike' ? 'RPM' : 'SPM' }}
                  </div>
                  <div class="metric-value">{{ result()!.parsed.strokes_per_min }}</div>
                </div>
              }
              @if (result()!.parsed.floors != null) {
                <div class="metric-item">
                  <div class="metric-label">Floors</div>
                  <div class="metric-value">{{ result()!.parsed.floors }}</div>
                </div>
              }
              @if (result()!.parsed.steps != null) {
                <div class="metric-item">
                  <div class="metric-label">Steps</div>
                  <div class="metric-value">{{ result()!.parsed.steps | number }}</div>
                </div>
              }
              @if (result()!.parsed.heart_rate != null) {
                <div class="metric-item metric-hr">
                  <div class="metric-label">Heart Rate</div>
                  <div class="metric-value">{{ result()!.parsed.heart_rate }} bpm</div>
                </div>
              }
            </div>

            @if (result()!.parsed.confidence < 0.4) {
              <ion-note class="low-conf-note">
                Low confidence — some data may be missing or inaccurate
              </ion-note>
            }

            <div class="action-buttons">
              <ion-button fill="outline" color="medium" (click)="retry()" class="retry-btn">
                <ion-icon slot="start" name="scan-outline"></ion-icon>
                Re-scan
              </ion-button>
              <ion-button (click)="confirm()" class="confirm-btn">
                <ion-icon slot="start" name="checkmark-circle-outline"></ion-icon>
                Log Cardio
              </ion-button>
            </div>
          </ion-card-content>
        </ion-card>
      }
    </div>
  `,
  styles: [`
    .ocr-wrapper {
      padding: 4px 0;
    }

    /* ── Scan prompt ───────────────────────────────────────── */
    .scan-prompt {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .equipment-select {
      --background: var(--fitos-bg-tertiary, #262626);
      --border-radius: 10px;
      border-radius: 10px;
    }

    .scan-btn {
      --border-radius: 10px;
      font-weight: 700;
      height: 52px;
    }

    .scan-hint {
      font-size: 13px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      margin: 0;
      line-height: 1.5;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 8px;
      color: #FCA5A5;
      font-size: 13px;
    }

    /* ── Result card ───────────────────────────────────────── */
    .result-card {
      margin: 0;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
    }

    .result-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }

    .result-title {
      font-size: 15px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .conf-badge {
      font-size: 11px;
      --border-radius: 20px;
    }

    /* ── Metrics grid ──────────────────────────────────────── */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }

    .metric-item {
      background: var(--fitos-bg-tertiary, #262626);
      border-radius: 10px;
      padding: 10px 8px;
      text-align: center;
    }

    .metric-label {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }

    .metric-value {
      font-size: 15px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      font-family: 'Space Mono', monospace;
    }

    .metric-hr .metric-value {
      color: #F87171;
    }

    .low-conf-note {
      display: block;
      font-size: 12px;
      color: #FBBF24;
      text-align: center;
      margin-bottom: 12px;
    }

    /* ── Action buttons ────────────────────────────────────── */
    .action-buttons {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 8px;
    }

    .retry-btn, .confirm-btn {
      --border-radius: 10px;
      font-weight: 700;
    }
  `],
})
export class EquipmentOcrComponent {
  @Input() sessionId?: string;
  @Output() logged = new EventEmitter<OcrLogRequest>();
  @Output() cancelled = new EventEmitter<void>();

  ocr     = inject(EquipmentOcrService);
  haptic  = inject(HapticService);

  selectedEquipment: EquipmentType = 'treadmill';
  readonly result = this.ocr.lastResult;

  constructor() {
    addIcons({ cameraOutline, checkmarkCircleOutline, closeOutline, flashOutline, scanOutline });
    // Clear any previous result when component initialises
    this.ocr.lastResult.set(null);
    this.ocr.clearError();
  }

  async startScan(): Promise<void> {
    this.haptic.light();
    await this.ocr.captureAndRecognize(this.selectedEquipment);
  }

  retry(): void {
    this.haptic.light();
    this.ocr.lastResult.set(null);
    this.ocr.clearError();
  }

  async confirm(): Promise<void> {
    const r = this.result();
    if (!r) return;
    this.haptic.success();
    // Log to audit table in background
    this.ocr.logCapture(this.selectedEquipment, r, this.sessionId);
    this.logged.emit({ equipmentType: this.selectedEquipment, result: r });
  }

  confidenceBadgeColor(): string {
    const c = this.result()?.parsed.confidence ?? 0;
    if (c >= 0.7) return 'success';
    if (c >= 0.4) return 'warning';
    return 'danger';
  }

  confidenceLabel(): string {
    const c = this.result()?.parsed.confidence ?? 0;
    if (c >= 0.7) return 'High';
    if (c >= 0.4) return 'Medium';
    return 'Low';
  }

  formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
  }
}
