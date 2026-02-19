import {
  Component,
  OnInit,
  inject,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonBadge,
  IonSpinner,
  IonText,
  AlertController,
  ToastController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  addOutline,
  trashOutline,
  qrCodeOutline,
  wifiOutline,
  barbellOutline,
  locationOutline,
  copyOutline,
  pencilOutline,
  scanOutline,
} from 'ionicons/icons';
import { NfcService } from '../../../../core/services/nfc.service';
import { AuthService } from '../../../../core/services/auth.service';
import { QrCheckinComponent } from '../../../clients/components/qr-checkin/qr-checkin.component';
import { NfcTouchpoint, NfcTagType, DeepLinkParams } from '@fitos/shared';

interface TagTypeOption {
  type: NfcTagType;
  label: string;
  icon: string;
  description: string;
}

const TAG_TYPE_OPTIONS: TagTypeOption[] = [
  { type: 'check_in', label: 'Check-In', icon: 'location-outline', description: 'Client scans to check in at the gym' },
  { type: 'workout_start', label: 'Start Workout', icon: 'barbell-outline', description: 'Client scans to launch a specific workout template' },
  { type: 'equipment', label: 'Equipment', icon: 'wifi-outline', description: 'Placed on gym equipment for quick exercise logging' },
];

@Component({
  selector: 'app-nfc-tags',
  templateUrl: './nfc-tags.page.html',
  styleUrls: ['./nfc-tags.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    QrCheckinComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonSpinner,
    IonText,
  ],
})
export class NfcTagsPage implements OnInit {
  private nfcService = inject(NfcService);
  private authService = inject(AuthService);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);
  private router = inject(Router);

  // Expose service signals
  touchpoints = this.nfcService.touchpoints;
  isLoading = this.nfcService.isLoading;
  isScanning = this.nfcService.isScanning;
  nfcSupported = computed(() => this.nfcService.isSupported());
  isTrainer = computed(() => this.authService.isTrainer() || this.authService.isOwner());

  // Local UI state
  selectedTouchpointId = signal<string | null>(null);
  tagTypeOptions = TAG_TYPE_OPTIONS;

  constructor() {
    addIcons({
      addOutline,
      trashOutline,
      qrCodeOutline,
      wifiOutline,
      barbellOutline,
      locationOutline,
      copyOutline,
      pencilOutline,
      scanOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.nfcService.loadTouchpoints();
  }

  getTagTypeInfo(type: NfcTagType): TagTypeOption {
    return TAG_TYPE_OPTIONS.find((t) => t.type === type) ?? TAG_TYPE_OPTIONS[0];
  }

  getDeepLinkParams(touchpoint: NfcTouchpoint): DeepLinkParams {
    switch (touchpoint.tag_type) {
      case 'check_in':
        return { type: 'checkin', facilityId: touchpoint.facility_id };
      case 'workout_start':
        return { type: 'workout', workoutTemplateId: touchpoint.workout_template_id };
      case 'equipment':
        return { type: 'equipment', equipmentId: touchpoint.equipment_id };
    }
  }

  toggleQrCode(id: string): void {
    this.selectedTouchpointId.update((current) => (current === id ? null : id));
  }

  async copyUri(uri: string): Promise<void> {
    await navigator.clipboard.writeText(uri);
    const toast = await this.toastController.create({
      message: 'Link copied to clipboard',
      duration: 2000,
      position: 'bottom',
      color: 'success',
    });
    await toast.present();
  }

  async writeToNfcTag(touchpoint: NfcTouchpoint): Promise<void> {
    if (!this.nfcSupported()) {
      const toast = await this.toastController.create({
        message: 'NFC is not available on this device. Use the QR code instead.',
        duration: 3000,
        position: 'bottom',
        color: 'warning',
      });
      await toast.present();
      return;
    }

    const alert = await this.alertController.create({
      header: 'Write NFC Tag',
      message: `Hold your phone near an NTAG213 sticker to write the "${touchpoint.label}" deep link.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Write Tag',
          handler: async () => {
            const success = await this.nfcService.writeTag(touchpoint.deep_link_uri);
            const toast = await this.toastController.create({
              message: success ? 'NFC tag written successfully!' : 'Failed to write NFC tag.',
              duration: 3000,
              position: 'bottom',
              color: success ? 'success' : 'danger',
            });
            await toast.present();
          },
        },
      ],
    });
    await alert.present();
  }

  async createTouchpoint(): Promise<void> {
    const alert = await this.alertController.create({
      header: 'New NFC / QR Touchpoint',
      inputs: [
        {
          name: 'label',
          type: 'text',
          placeholder: 'Label (e.g. "Front Door Check-in")',
        },
        {
          name: 'tag_type',
          type: 'text',
          placeholder: 'Type: check_in | workout_start | equipment',
          value: 'check_in',
        },
      ],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Create',
          handler: async (data: { label: string; tag_type: string }) => {
            if (!data.label?.trim()) return false;

            const tag_type = (['check_in', 'workout_start', 'equipment'].includes(data.tag_type)
              ? data.tag_type
              : 'check_in') as NfcTagType;

            const deepLinkParams: DeepLinkParams = { type: 'checkin' };
            const deep_link_uri = this.nfcService.generateDeepLink(deepLinkParams);

            const touchpoint = await this.nfcService.createTouchpoint({
              label: data.label.trim(),
              tag_type,
              deep_link_uri,
            });

            const toast = await this.toastController.create({
              message: touchpoint ? 'Touchpoint created!' : 'Failed to create touchpoint.',
              duration: 2000,
              position: 'bottom',
              color: touchpoint ? 'success' : 'danger',
            });
            await toast.present();
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  async deleteTouchpoint(touchpoint: NfcTouchpoint): Promise<void> {
    const alert = await this.alertController.create({
      header: 'Delete Touchpoint',
      message: `Are you sure you want to delete "${touchpoint.label}"? This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            const success = await this.nfcService.deleteTouchpoint(touchpoint.id);
            if (this.selectedTouchpointId() === touchpoint.id) {
              this.selectedTouchpointId.set(null);
            }
            const toast = await this.toastController.create({
              message: success ? 'Touchpoint deleted.' : 'Failed to delete.',
              duration: 2000,
              position: 'bottom',
              color: success ? 'medium' : 'danger',
            });
            await toast.present();
          },
        },
      ],
    });
    await alert.present();
  }
}
