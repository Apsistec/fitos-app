import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonBackButton,
  IonButtons,
  IonButton,
  IonIcon,
  IonSpinner,
  IonNote,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonSearchbar,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  barcodeOutline,
  scanOutline,
  timeOutline,
  flameOutline,
  closeCircleOutline,
  createOutline,
} from 'ionicons/icons';

import { BarcodeScannerService, BarcodeFoodResult } from '../../../../core/services/barcode-scanner.service';
import { FoodService } from '../../../../core/services/food.service';
import { NutritionService } from '../../../../core/services/nutrition.service';
import { AuthService } from '../../../../core/services/auth.service';
import { HapticService } from '../../../../core/services/haptic.service';
import { BarcodeResultComponent, BarcodeLogRequest } from '../../components/barcode-result/barcode-result.component';

@Component({
  selector: 'app-barcode-scan',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonBackButton,
    IonButtons,
    IonButton,
    IonIcon,
    IonSpinner,
    IonNote,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonSearchbar,
    BarcodeResultComponent,
  ],
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/nutrition/add"></ion-back-button>
        </ion-buttons>
        <ion-title>Barcode Scanner</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- Found food: show confirmation card -->
      @if (foundFood()) {
        <app-barcode-result
          [food]="foundFood()!"
          (log)="onConfirmLog($event)"
          (cancel)="onCancelResult()"
        />
      } @else {
        <!-- Scan / lookup in progress -->
        @if (isWorking()) {
          <div class="working-state">
            <ion-spinner name="crescent"></ion-spinner>
            <p>{{ workingLabel() }}</p>
          </div>
        } @else {
          <!-- Scan button -->
          <div class="scan-hero">
            <div class="scan-icon-ring">
              <ion-icon name="barcode-outline" class="scan-hero-icon"></ion-icon>
            </div>
            <h2 class="scan-title">Scan a Barcode</h2>
            <p class="scan-subtitle">
              Point your camera at a food product barcode to instantly log nutrition info
            </p>

            <ion-button
              expand="block"
              size="large"
              (click)="startScan()"
              [disabled]="!supported()"
              class="scan-btn"
            >
              <ion-icon slot="start" name="scan-outline"></ion-icon>
              Scan Barcode
            </ion-button>

            @if (!supported()) {
              <ion-note class="unsupported-note">
                Barcode scanning requires a native iOS or Android device
              </ion-note>
            }

            <!-- Manual barcode entry -->
            <div class="manual-entry">
              <p class="manual-label">Enter barcode manually</p>
              <div class="manual-row">
                <ion-searchbar
                  [(ngModel)]="manualBarcode"
                  placeholder="e.g. 012345678912"
                  type="number"
                  inputmode="numeric"
                  [debounce]="0"
                  showClearButton="focus"
                  class="manual-searchbar"
                ></ion-searchbar>
                <ion-button
                  (click)="lookupManual()"
                  [disabled]="!manualBarcode || isWorking()"
                  fill="outline"
                  class="manual-go-btn"
                >
                  <ion-icon name="barcode-outline"></ion-icon>
                </ion-button>
              </div>
            </div>
          </div>

          <!-- Error state -->
          @if (scanner.error()) {
            <div class="error-banner">
              <ion-icon name="close-circle-outline"></ion-icon>
              <span>{{ scanner.error() }}</span>
            </div>
          }

          <!-- Recent scans -->
          @if (recentScans().length > 0) {
            <div class="recent-section">
              <div class="section-header">
                <ion-icon name="time-outline"></ion-icon>
                <span>Recent Scans</span>
              </div>
              <ion-list lines="none">
                @for (scan of recentScans(); track scan.id) {
                  <ion-item
                    button
                    detail="false"
                    (click)="reScan(scan.barcode)"
                    class="recent-item"
                  >
                    <ion-label>
                      <h3>{{ scan.food_name }}</h3>
                      @if (scan.brand) {
                        <p class="brand-text">{{ scan.brand }}</p>
                      }
                    </ion-label>
                    @if (scan.calories) {
                      <ion-badge slot="end" color="primary" class="cal-badge">
                        <ion-icon name="flame-outline"></ion-icon>
                        {{ scan.calories }}
                      </ion-badge>
                    }
                  </ion-item>
                }
              </ion-list>
            </div>
          }

          <!-- Not found state -->
          @if (notFound()) {
            <div class="not-found-state">
              <ion-icon name="barcode-outline" class="not-found-icon"></ion-icon>
              <p>Product not found in any database.</p>
              <p class="not-found-sub">Try searching by name instead.</p>
              <ion-button
                fill="outline"
                (click)="goToSearch()"
                class="search-fallback-btn"
              >
                <ion-icon slot="start" name="create-outline"></ion-icon>
                Search by Name
              </ion-button>
            </div>
          }
        }
      }
    </ion-content>
  `,
  styles: [`
    ion-toolbar {
      --background: transparent;
      --border-width: 0;
    }

    ion-title {
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.3px;
    }

    /* ── Working state ─────────────────────────────────────── */
    .working-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 50vh;
      gap: 20px;
    }

    .working-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
    }

    ion-spinner {
      --color: var(--fitos-accent-primary, #10B981);
      width: 40px;
      height: 40px;
    }

    /* ── Scan hero ─────────────────────────────────────────── */
    .scan-hero {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 24px 24px;
      gap: 16px;
      max-width: 480px;
      margin: 0 auto;
    }

    .scan-icon-ring {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      background: rgba(16, 185, 129, 0.1);
      border: 2px solid rgba(16, 185, 129, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }

    .scan-hero-icon {
      font-size: 48px;
      color: var(--fitos-accent-primary, #10B981);
    }

    .scan-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--fitos-text-primary, #F5F5F5);
      margin: 0;
      letter-spacing: -0.5px;
    }

    .scan-subtitle {
      font-size: 14px;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-align: center;
      margin: 0;
      line-height: 1.5;
    }

    .scan-btn {
      width: 100%;
      height: 56px;
      font-size: 16px;
      font-weight: 700;
      --border-radius: 12px;
      --box-shadow: 0 4px 16px rgba(16, 185, 129, 0.25);
      margin-top: 8px;
    }

    .unsupported-note {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;
    }

    /* ── Manual entry ──────────────────────────────────────── */
    .manual-entry {
      width: 100%;
      margin-top: 8px;
    }

    .manual-label {
      font-size: 13px;
      color: var(--fitos-text-tertiary, #737373);
      text-align: center;
      margin: 0 0 8px;
    }

    .manual-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .manual-searchbar {
      flex: 1;
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --border-radius: 10px;
      --box-shadow: none;
    }

    .manual-go-btn {
      flex-shrink: 0;
      --border-radius: 10px;
      height: 48px;
    }

    /* ── Error banner ──────────────────────────────────────── */
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 16px;
      padding: 12px 16px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.2);
      border-radius: 10px;
      color: #FCA5A5;
      font-size: 14px;
    }

    .error-banner ion-icon {
      font-size: 18px;
      flex-shrink: 0;
    }

    /* ── Recent scans ──────────────────────────────────────── */
    .recent-section {
      margin: 8px 0 0;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px 8px;
      font-size: 13px;
      font-weight: 600;
      color: var(--fitos-text-secondary, #A3A3A3);
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .section-header ion-icon {
      font-size: 16px;
    }

    .recent-item {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      --border-radius: 10px;
      margin: 4px 12px;
      border-radius: 10px;
      --padding-start: 14px;
      --inner-padding-end: 12px;
    }

    .recent-item h3 {
      font-size: 14px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .brand-text {
      font-size: 12px;
      color: var(--fitos-text-tertiary, #737373);
      margin-top: 2px;
    }

    .cal-badge {
      display: flex;
      align-items: center;
      gap: 3px;
      font-family: 'Space Mono', monospace;
      font-size: 12px;
    }

    /* ── Not found ─────────────────────────────────────────── */
    .not-found-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px 24px;
      gap: 8px;
      text-align: center;
    }

    .not-found-icon {
      font-size: 52px;
      color: var(--fitos-text-tertiary, #737373);
      margin-bottom: 8px;
    }

    .not-found-state p {
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
      margin: 0;
    }

    .not-found-sub {
      font-size: 13px !important;
      color: var(--fitos-text-tertiary, #737373) !important;
    }

    .search-fallback-btn {
      margin-top: 12px;
      --border-radius: 10px;
    }
  `],
})
export class BarcodeScanPage implements OnInit {
  // ─── Services ────────────────────────────────────────────────────────────
  scanner          = inject(BarcodeScannerService);
  private food     = inject(FoodService);
  private nutrition = inject(NutritionService);
  private auth     = inject(AuthService);
  private haptic   = inject(HapticService);
  private router   = inject(Router);
  private toastCtrl = inject(ToastController);

  // ─── State ───────────────────────────────────────────────────────────────
  readonly foundFood  = signal<BarcodeFoodResult | null>(null);
  readonly notFound   = signal(false);
  readonly supported  = signal(false);
  readonly isLogging  = signal(false);
  manualBarcode = '';

  // ─── Computed ─────────────────────────────────────────────────────────────
  readonly isWorking  = computed(() => this.scanner.isScanning() || this.scanner.isLooking() || this.isLogging());
  readonly workingLabel = computed(() => {
    if (this.scanner.isScanning())  return 'Opening camera…';
    if (this.scanner.isLooking())   return 'Looking up barcode…';
    if (this.isLogging())           return 'Logging food…';
    return '';
  });
  readonly recentScans = this.scanner.recentScans;

  // ─── Lifecycle ───────────────────────────────────────────────────────────
  async ngOnInit(): Promise<void> {
    addIcons({ barcodeOutline, scanOutline, timeOutline, flameOutline, closeCircleOutline, createOutline });

    // Check native support
    this.supported.set(await this.scanner.isSupported());

    // Load recent scans for the current user
    const userId = this.auth.user()?.id;
    if (userId) {
      await this.scanner.loadRecentScans(userId);
    }
  }

  // ─── Actions ─────────────────────────────────────────────────────────────

  /** Open the ML Kit scanner and look up the scanned barcode */
  async startScan(): Promise<void> {
    this.notFound.set(false);
    this.foundFood.set(null);
    this.scanner.clearError();
    this.haptic.light();

    const barcode = await this.scanner.scan();
    if (!barcode) return; // cancelled or error — scanner.error() signal already set

    await this.performLookup(barcode);
  }

  /** Look up a barcode that was typed manually */
  async lookupManual(): Promise<void> {
    const barcode = this.manualBarcode?.trim();
    if (!barcode) return;

    this.notFound.set(false);
    this.foundFood.set(null);
    this.scanner.clearError();
    this.haptic.light();

    await this.performLookup(barcode);
  }

  /** Re-look up a previously scanned barcode from history */
  async reScan(barcode: string): Promise<void> {
    this.notFound.set(false);
    this.foundFood.set(null);
    this.scanner.clearError();
    this.haptic.light();

    await this.performLookup(barcode);
  }

  /** User confirmed logging from the BarcodeResultComponent */
  async onConfirmLog(request: BarcodeLogRequest): Promise<void> {
    const userId = this.auth.user()?.id;
    if (!userId) {
      await this.showToast('Please log in to add foods', 'warning');
      return;
    }

    this.isLogging.set(true);
    this.haptic.light();

    try {
      const today = new Date().toISOString().split('T')[0];
      const log = await this.nutrition.loadNutritionLog(userId, today);
      if (!log) throw new Error('Failed to load nutrition log');

      const { food, servings, mealType } = request;

      const entry = await this.nutrition.addEntry(log.log.id, {
        custom_name: food.food_name,
        servings,
        calories:  Math.round(food.calories * servings),
        protein_g: Math.round(food.protein  * servings * 10) / 10,
        carbs_g:   Math.round(food.carbs    * servings * 10) / 10,
        fat_g:     Math.round(food.fat      * servings * 10) / 10,
        meal_type: mealType,
      });

      if (!entry) throw new Error('Failed to log food');

      // Record scan in history
      await this.scanner.logScan(userId, {
        barcode:   food.barcode,
        food_name: food.food_name,
        brand:     food.brand,
        calories:  food.calories,
      });

      await this.haptic.success();
      await this.showToast('Food logged!', 'success');
      this.router.navigate(['/tabs/nutrition']);
    } catch (err) {
      console.error('[BarcodeScanPage] logFood error:', err);
      await this.haptic.error();
      await this.showToast('Failed to log food. Please try again.', 'danger');
    } finally {
      this.isLogging.set(false);
    }
  }

  onCancelResult(): void {
    this.haptic.light();
    this.foundFood.set(null);
  }

  goToSearch(): void {
    this.router.navigate(['/tabs/nutrition/add']);
  }

  // ─── Private helpers ─────────────────────────────────────────────────────

  private async performLookup(barcode: string): Promise<void> {
    const result = await this.scanner.lookupBarcode(barcode);

    if (result) {
      this.haptic.success();
      this.foundFood.set(result);
      this.notFound.set(false);
    } else if (!this.scanner.error()) {
      // No error, but no result → product not found
      this.haptic.warning();
      this.notFound.set(true);
    }
  }

  private async showToast(message: string, color = 'primary'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
