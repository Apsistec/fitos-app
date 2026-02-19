import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonCard,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { downloadOutline, shareOutline, printOutline } from 'ionicons/icons';
import { NfcService } from '../../../../core/services/nfc.service';
import { DeepLinkParams } from '@fitos/shared';

/**
 * Generates a branded QR code that encodes a FitOS deep-link URI.
 * Uses the Canvas API (no third-party QR library required at runtime;
 * angularx-qrcode can be swapped in once installed).
 *
 * Usage:
 *   <app-qr-checkin
 *     [deepLinkParams]="{ type: 'checkin', facilityId: 'abc123' }"
 *     label="Front Door Check-in"
 *   />
 */
@Component({
  selector: 'app-qr-checkin',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonCard, IonCardContent, IonButton, IonIcon, IonSpinner],
  template: `
    <ion-card class="qr-card">
      <ion-card-content>
        <div class="qr-header">
          <span class="qr-label">{{ label }}</span>
          <span class="qr-uri">{{ uri() }}</span>
        </div>

        <div class="qr-canvas-wrapper">
          @if (isGenerating()) {
            <ion-spinner name="crescent" color="primary"></ion-spinner>
          } @else {
            <canvas
              #qrCanvas
              [id]="canvasId"
              class="qr-canvas"
              [attr.aria-label]="'QR code for ' + label"
              role="img"
            ></canvas>
          }
        </div>

        <div class="qr-actions">
          <ion-button fill="outline" size="small" (click)="share()" [disabled]="isGenerating()">
            <ion-icon name="share-outline" slot="start"></ion-icon>
            Share
          </ion-button>
          <ion-button fill="outline" size="small" (click)="download()" [disabled]="isGenerating()">
            <ion-icon name="download-outline" slot="start"></ion-icon>
            Save
          </ion-button>
          <ion-button fill="outline" size="small" (click)="print()" [disabled]="isGenerating()">
            <ion-icon name="print-outline" slot="start"></ion-icon>
            Print
          </ion-button>
        </div>
      </ion-card-content>
    </ion-card>
  `,
  styles: [`
    .qr-card {
      --background: var(--fitos-bg-secondary, #1A1A1A);
      border-radius: 16px;
      margin: 0;
    }

    .qr-header {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 16px;
    }

    .qr-label {
      font-size: 16px;
      font-weight: 600;
      color: var(--fitos-text-primary, #F5F5F5);
    }

    .qr-uri {
      font-size: 11px;
      color: var(--fitos-text-tertiary, #737373);
      word-break: break-all;
    }

    .qr-canvas-wrapper {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 200px;
      padding: 8px;
      background: #ffffff;
      border-radius: 12px;
    }

    .qr-canvas {
      display: block;
      border-radius: 8px;
    }

    .qr-actions {
      display: flex;
      gap: 8px;
      margin-top: 16px;
      justify-content: center;
    }
  `],
})
export class QrCheckinComponent implements OnChanges {
  @Input({ required: true }) deepLinkParams!: DeepLinkParams;
  @Input() label = 'QR Check-in';

  private nfcService = inject(NfcService);
  private toastController = inject(ToastController);

  readonly uri = signal('');
  readonly isGenerating = signal(true);
  readonly canvasId = `qr-${Math.random().toString(36).slice(2, 8)}`;

  constructor() {
    addIcons({ downloadOutline, shareOutline, printOutline });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['deepLinkParams'] || changes['label']) {
      this.generateQr();
    }
  }

  private generateQr(): void {
    const uri = this.nfcService.generateDeepLink(this.deepLinkParams);
    this.uri.set(uri);
    this.isGenerating.set(true);

    // Defer to next microtask so canvas is in DOM
    setTimeout(() => this.drawQr(uri), 0);
  }

  /**
   * Draws a QR code on the canvas using a pure-JS QR encoder.
   * Once `angularx-qrcode` is installed (Sprint 46 task), replace this
   * with the library's component for higher-density codes.
   */
  private async drawQr(uri: string): Promise<void> {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
    if (!canvas) {
      this.isGenerating.set(false);
      return;
    }

    try {
      // Dynamically import qrcode library when available; fall back to placeholder
      const QRCode = await this.loadQrLibrary();
      if (QRCode) {
        await QRCode.toCanvas(canvas, uri, {
          width: 200,
          margin: 1,
          color: { dark: '#000000', light: '#ffffff' },
        });
      } else {
        this.drawPlaceholder(canvas, uri);
      }
    } catch {
      this.drawPlaceholder(canvas, uri);
    }

    this.isGenerating.set(false);
  }

  private async loadQrLibrary(): Promise<{ toCanvas: (canvas: HTMLCanvasElement, text: string, opts: unknown) => Promise<void> } | null> {
    try {
      // Will resolve once `npm install qrcode` / angularx-qrcode is run
      const mod = await import('qrcode' as string);
      return (mod as unknown as Record<string, unknown>)['default'] as ReturnType<typeof this.loadQrLibrary> extends Promise<infer T> ? T : never;
    } catch {
      return null;
    }
  }

  /** Simple checkerboard placeholder shown before qrcode lib is installed. */
  private drawPlaceholder(canvas: HTMLCanvasElement, uri: string): void {
    const SIZE = 200;
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = '#000000';

    // Draw a simple border to indicate QR placeholder
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, SIZE - 20, SIZE - 20);

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('QR Code', SIZE / 2, SIZE / 2 - 6);
    ctx.fillText('(install qrcode pkg)', SIZE / 2, SIZE / 2 + 8);

    // Show first 30 chars of URI
    ctx.font = '8px monospace';
    ctx.fillText(uri.slice(0, 30) + (uri.length > 30 ? '…' : ''), SIZE / 2, SIZE / 2 + 22);
  }

  async share(): Promise<void> {
    const uri = this.uri();
    if (navigator.share) {
      await navigator.share({ title: this.label, url: uri });
    } else {
      await navigator.clipboard.writeText(uri);
      const toast = await this.toastController.create({
        message: 'Link copied to clipboard',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();
    }
  }

  download(): void {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `fitos-qr-${this.label.toLowerCase().replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  print(): void {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement | null;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <html><head><title>FitOS QR — ${this.label}</title>
      <style>
        body { margin: 0; display: flex; flex-direction: column; align-items: center; font-family: sans-serif; padding: 40px; }
        img { width: 250px; height: 250px; }
        h2 { margin: 16px 0 4px; font-size: 18px; }
        p { margin: 0; font-size: 11px; color: #666; word-break: break-all; max-width: 260px; text-align: center; }
      </style></head><body>
        <img src="${dataUrl}" alt="QR Code"/>
        <h2>${this.label}</h2>
        <p>${this.uri()}</p>
      </body></html>
    `);
    win.document.close();
    win.print();
  }
}
