/**
 * Google Business Profile Management Page
 * Sprint 42: Local SEO Automation
 */

import { Component, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonicModule,
  ToastController,
  AlertController,
} from '@ionic/angular';
import { SeoService } from '../../services/seo.service';

interface BusinessProfile {
  name: string;
  description: string;
  phone: string;
  website: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  categories: string[];
  attributes: string[];
}

interface BusinessInsights {
  views: number;
  searches: number;
  actions: {
    website: number;
    phone: number;
    directions: number;
  };
  photos: number;
  reviews: {
    count: number;
    rating: number;
  };
}

@Component({
  selector: 'app-google-business',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './google-business.page.html',
  styleUrls: ['./google-business.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoogleBusinessPage implements OnInit {
  loading = signal(true);
  connected = signal(false);
  profile = signal<BusinessProfile | null>(null);
  insights = signal<BusinessInsights | null>(null);

  profileForm!: FormGroup;
  hoursForm!: FormGroup;
  selectedTab = signal<'info' | 'hours' | 'insights'>('info');

  daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  constructor(
    private fb: FormBuilder,
    private toastController: ToastController,
    private alertController: AlertController,
    private seoService: SeoService
  ) {
    this.initializeForms();
  }

  async ngOnInit() {
    await this.loadProfile();
  }

  initializeForms() {
    this.profileForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', [Validators.required, Validators.maxLength(750)]],
      phone: ['', Validators.required],
      website: ['', Validators.required],
      street: ['', Validators.required],
      city: ['', Validators.required],
      state: ['', Validators.required],
      zip: ['', Validators.required],
    });

    this.hoursForm = this.fb.group({});
    this.daysOfWeek.forEach(day => {
      this.hoursForm.addControl(`${day}_closed`, this.fb.control(false));
      this.hoursForm.addControl(`${day}_open`, this.fb.control('09:00'));
      this.hoursForm.addControl(`${day}_close`, this.fb.control('17:00'));
    });
  }

  async loadProfile() {
    try {
      this.loading.set(true);
      const data = await this.seoService.getGoogleBusinessProfile();

      if (data.connected) {
        this.connected.set(true);
        this.profile.set(data.profile);
        this.insights.set(data.insights);
        this.populateForms(data.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      this.connected.set(false);
    } finally {
      this.loading.set(false);
    }
  }

  populateForms(profile: BusinessProfile) {
    this.profileForm.patchValue({
      name: profile.name,
      description: profile.description,
      phone: profile.phone,
      website: profile.website,
      street: profile.address.street,
      city: profile.address.city,
      state: profile.address.state,
      zip: profile.address.zip,
    });

    if (profile.hours) {
      Object.entries(profile.hours).forEach(([day, hours]) => {
        this.hoursForm.patchValue({
          [`${day}_closed`]: hours.closed,
          [`${day}_open`]: hours.open,
          [`${day}_close`]: hours.close,
        });
      });
    }
  }

  async connectGoogle() {
    try {
      await this.seoService.initiateGoogleOAuth();
      await this.showToast('Opening Google authorization...', 'primary');
    } catch (error) {
      console.error('Error connecting Google:', error);
      await this.showToast('Failed to connect Google Business', 'danger');
    }
  }

  async saveProfile() {
    if (this.profileForm.invalid) {
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    try {
      const formValue = this.profileForm.value;
      const profileData = {
        name: formValue.name,
        description: formValue.description,
        phone: formValue.phone,
        website: formValue.website,
        address: {
          street: formValue.street,
          city: formValue.city,
          state: formValue.state,
          zip: formValue.zip,
        },
      };

      await this.seoService.updateGoogleBusinessProfile(profileData);
      await this.showToast('Profile updated successfully', 'success');
      await this.loadProfile();
    } catch (error) {
      console.error('Error saving profile:', error);
      await this.showToast('Failed to update profile', 'danger');
    }
  }

  async saveHours() {
    try {
      const hoursData: any = {};

      this.daysOfWeek.forEach(day => {
        hoursData[day] = {
          closed: this.hoursForm.get(`${day}_closed`)?.value || false,
          open: this.hoursForm.get(`${day}_open`)?.value || '09:00',
          close: this.hoursForm.get(`${day}_close`)?.value || '17:00',
        };
      });

      await this.seoService.updateGoogleBusinessProfile({ hours: hoursData });
      await this.showToast('Business hours updated successfully', 'success');
      await this.loadProfile();
    } catch (error) {
      console.error('Error saving hours:', error);
      await this.showToast('Failed to update hours', 'danger');
    }
  }

  async copyAllHours() {
    const alert = await this.alertController.create({
      header: 'Copy Hours',
      message: 'Copy Monday hours to all other days?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Copy',
          handler: () => {
            const mondayOpen = this.hoursForm.get('monday_open')?.value;
            const mondayClose = this.hoursForm.get('monday_close')?.value;
            const mondayClosed = this.hoursForm.get('monday_closed')?.value;

            this.daysOfWeek.slice(1).forEach(day => {
              this.hoursForm.patchValue({
                [`${day}_open`]: mondayOpen,
                [`${day}_close`]: mondayClose,
                [`${day}_closed`]: mondayClosed,
              });
            });
          },
        },
      ],
    });

    await alert.present();
  }

  getDayLabel(day: string): string {
    return day.charAt(0).toUpperCase() + day.slice(1);
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  async refresh(event: any) {
    await this.loadProfile();
    event.target.complete();
  }

  async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      position: 'bottom',
      color,
    });
    await toast.present();
  }
}
