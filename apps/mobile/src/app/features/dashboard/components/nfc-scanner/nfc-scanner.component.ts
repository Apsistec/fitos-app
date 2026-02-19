import {
  Component,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { scanOutline, qrCodeOutline } from 'ionicons/icons';
import { NfcService } from '../../../../core/services/nfc.service';
import { DeepLinkService } from '../../../../core/services/deep-link.service';

/**
 * Floating action button for NFC scanning from the dashboard.
 * Visible only when NFC hardware is present; falls back to hidden
 * on devices without NFC (clients can still use QR codes via the camera app).
 *
 * Place inside the dashboard page template:
 *   <app-nfc-scanner></app-nfc-scanner>
 */
@Component({
  selector: 'app-nfc-scanner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, IonFab, IonFabButton, IonIcon, IonSpinner],
  template: `
    @if (nfcSupported()) {
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button
          (click)="startScan()"
          [disabled]="isScanning()"
          color="primary"
          aria-label="Scan NFC tag"
          class="nfc-fab"
        >
          @if (isScanning()) {
            <ion-spinner name="crescent"></ion-spinner>
          } @else {
            <ion-icon name="scan-outline"></ion-icon>
          }
        </ion-fab-button>
      </ion-fab>
    }
  `,
  styles: [`
    .nfc-fab {
      --box-shadow: 0 4px 16px rgba(16, 185, 129, 0.4);
    }
  `],
})
export class NfcScannerComponent {
  private nfcService = inject(NfcService);
  private deepLinkService = inject(DeepLinkService);
  private toastController = inject(ToastController);
  private router = inject(Router);

  readonly nfcSupported = signal(this.nfcService.isSupported());
  readonly isScanning = this.nfcService.isScanning;

  constructor() {
    addIcons({ scanOutline, qrCodeOutline });
  }

  async startScan(): Promise<void> {
    const uri = await this.nfcService.scanTag();

    if (!uri) {
      const err = this.nfcService.error();
      if (err) {
        const toast = await this.toastController.create({
          message: err,
          duration: 3000,
          position: 'bottom',
          color: 'warning',
        });
        await toast.present();
      }
      return;
    }

    // Route via DeepLinkService — same path as NFC tags placed by trainers
    this.deepLinkService.handleUrl(uri);
  }
}
