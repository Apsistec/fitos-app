import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonSelect,
  IonSelectOption,
  IonButton,
  IonIcon,
  IonText,
  IonNote,
  ToastController,
  LoadingController, IonCardSubtitle } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  mailOutline,
  sendOutline,
  cameraOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  helpCircleOutline,
  rocketOutline,
} from 'ionicons/icons';
import { Device } from '@capacitor/device';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { AuthService } from '../../../../core/services/auth.service';
import { SupportService } from '../../../../core/services/support.service';
import type { SupportTicketPayload, DeviceInfo } from '@fitos/libs';

@Component({
  selector: 'app-contact-support',
  templateUrl: './contact-support.page.html',
  styleUrls: ['./contact-support.page.scss'],
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IonCardSubtitle, 
    CommonModule,
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonButton,
    IonIcon,
    IonText,
    IonNote,
  ],
})
export class ContactSupportPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private loadingController = inject(LoadingController);
  private authService = inject(AuthService);
  private supportService = inject(SupportService);

  supportForm!: FormGroup;
  deviceInfo = signal<DeviceInfo | null>(null);
  screenshot = signal<string | null>(null);
  isSubmitting = signal(false);

  readonly supportCategories = [
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature_request', label: 'Feature Request' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'other', label: 'Other' },
  ];

  constructor() {
    addIcons({
      mailOutline,
      sendOutline,
      cameraOutline,
      closeCircleOutline,
      checkmarkCircleOutline,
      helpCircleOutline,
      rocketOutline,
    });
  }

  async ngOnInit() {
    this.initializeForm();
    await this.loadDeviceInfo();
  }

  private initializeForm() {
    this.supportForm = this.fb.group({
      category: ['', Validators.required],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(2000)]],
    });
  }

  private async loadDeviceInfo() {
    try {
      const info = await Device.getInfo();
      const deviceId = await Device.getId();

      this.deviceInfo.set({
        appVersion: '1.0.0', // TODO: Get from environment or package.json
        platform: info.platform as 'ios' | 'android' | 'web',
        osVersion: info.osVersion,
        deviceModel: info.model,
      });
    } catch (error) {
      console.error('Failed to load device info:', error);
      // Set fallback device info
      this.deviceInfo.set({
        appVersion: '1.0.0',
        platform: 'web',
        osVersion: 'unknown',
        deviceModel: 'unknown',
      });
    }
  }

  async takeScreenshot() {
    try {
      const image = await Camera.getPhoto({
        quality: 80,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Prompt,
        promptLabelHeader: 'Add Screenshot',
        promptLabelPhoto: 'Choose Photo',
        promptLabelPicture: 'Take Photo',
      });

      if (image.dataUrl) {
        this.screenshot.set(image.dataUrl);
      }
    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      const toast = await this.toastController.create({
        message: 'Failed to add screenshot. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top',
      });
      await toast.present();
    }
  }

  removeScreenshot() {
    this.screenshot.set(null);
  }

  getDescriptionCharCount(): number {
    return this.supportForm.get('description')?.value?.length || 0;
  }

  isFormValid(): boolean {
    return this.supportForm.valid;
  }

  async onSubmit() {
    if (!this.isFormValid() || this.isSubmitting()) {
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Submitting support request...',
    });
    await loading.present();

    this.isSubmitting.set(true);

    try {
      const formValue = this.supportForm.value;
      const profile = this.authService.profile();

      const payload: SupportTicketPayload = {
        category: formValue.category as 'bug' | 'feature_request' | 'billing' | 'other',
        subject: formValue.subject,
        description: formValue.description,
        deviceInfo: this.deviceInfo(),
        screenshotUrl: this.screenshot(),
      };

      // Submit ticket via SupportService
      const response = await this.supportService.submitTicket(payload);

      await loading.dismiss();

      const successToast = await this.toastController.create({
        message: 'Support request submitted successfully! We\'ll respond within 24 hours.',
        duration: 5000,
        color: 'success',
        position: 'top',
        icon: 'checkmark-circle-outline',
      });
      await successToast.present();

      // Navigate back to help center
      this.router.navigate(['/tabs/settings/help']);
    } catch (error) {
      await loading.dismiss();
      console.error('Failed to submit support request:', error);

      const errorToast = await this.toastController.create({
        message: 'Failed to submit support request. Please try again or email support@nutrifitos.com.',
        duration: 5000,
        color: 'danger',
        position: 'top',
        buttons: [
          {
            text: 'Retry',
            handler: () => this.onSubmit(),
          },
        ],
      });
      await errorToast.present();
    } finally {
      this.isSubmitting.set(false);
    }
  }

  navigateToFAQ() {
    this.router.navigate(['/tabs/settings/help/faq']);
  }

  navigateToGettingStarted() {
    this.router.navigate(['/tabs/settings/help/getting-started']);
  }

  openEmailClient() {
    window.location.href = 'mailto:support@nutrifitos.com?subject=FitOS Support Request';
  }
}
