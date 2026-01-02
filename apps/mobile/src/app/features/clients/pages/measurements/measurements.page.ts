import { Component, inject, signal, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonItem,
  IonInput,
  IonTextarea,
  IonList,
  IonModal,
  IonButtons,
  IonBackButton,
  IonNote,
  IonFab,
  IonFabButton,
  IonImg,
  IonGrid,
  IonRow,
  IonCol,
  AlertController,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  add,
  scaleOutline,
  cameraOutline,
  trashOutline,
  closeOutline,
  checkmarkOutline,
} from 'ionicons/icons';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { MeasurementService, type ProgressPhoto } from '@app/core/services/measurement.service';
import { AuthService } from '@app/core/services/auth.service';
import type { Tables } from '@fitos/shared';

Chart.register(...registerables);

@Component({
  selector: 'app-measurements',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonIcon,
    IonSpinner,
    IonRefresher,
    IonRefresherContent,
    IonItem,
    IonInput,
    IonTextarea,
    IonList,
    IonModal,
    IonButtons,
    IonBackButton,
    IonNote,
    IonFab,
    IonFabButton,
    IonImg,
    IonGrid,
    IonRow,
    IonCol,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Measurements & Photos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
        <ion-refresher-content></ion-refresher-content>
      </ion-refresher>

      <div class="measurements-container">
        <!-- View Toggle -->
        <ion-segment [value]="activeView()" (ionChange)="onViewChange($event)">
          <ion-segment-button value="measurements">
            <ion-icon name="scale-outline"></ion-icon>
            <ion-label>Measurements</ion-label>
          </ion-segment-button>
          <ion-segment-button value="photos">
            <ion-icon name="camera-outline"></ion-icon>
            <ion-label>Photos</ion-label>
          </ion-segment-button>
        </ion-segment>

        <!-- Measurements View -->
        @if (activeView() === 'measurements') {
          @if (loading()) {
            <ion-card>
              <ion-card-content class="loading-card">
                <ion-spinner></ion-spinner>
                <p>Loading measurements...</p>
              </ion-card-content>
            </ion-card>
          } @else {
            <!-- Weight Chart -->
            @if (measurements().length > 0) {
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Weight Progress</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="chart-container">
                    <canvas #weightChart></canvas>
                  </div>
                </ion-card-content>
              </ion-card>

              <!-- Latest Measurement Summary -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Latest Measurement</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <div class="stats-grid">
                    @if (latestMeasurement()?.value && latestMeasurement()?.measurement_type === 'weight') {
                      <div class="stat">
                        <div class="stat-label">Weight</div>
                        <div class="stat-value">{{ latestMeasurement()?.value }} {{ latestMeasurement()?.unit }}</div>
                      </div>
                    }
                    @if (latestMeasurement()?.value && latestMeasurement()?.measurement_type === 'body_fat') {
                      <div class="stat">
                        <div class="stat-label">Body Fat</div>
                        <div class="stat-value">{{ latestMeasurement()?.value }}%</div>
                      </div>
                    }
                    @if (latestMeasurement()?.value && latestMeasurement()?.measurement_type === 'waist') {
                      <div class="stat">
                        <div class="stat-label">Waist</div>
                        <div class="stat-value">{{ latestMeasurement()?.value }} {{ latestMeasurement()?.unit }}</div>
                      </div>
                    }
                  </div>
                  <p class="measurement-date">
                    {{ formatDate(latestMeasurement()?.measured_at) }}
                  </p>
                </ion-card-content>
              </ion-card>

              <!-- Measurement History -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>History</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <ion-list lines="none">
                    @for (measurement of measurements(); track measurement.id) {
                      <ion-item>
                        <div class="measurement-item">
                          <div class="measurement-main">
                            <span class="measurement-weight">{{ measurement.weight_kg }} kg</span>
                            <span class="measurement-date">{{ formatDate(measurement.measured_at) }}</span>
                          </div>
                          @if (measurement.notes) {
                            <p class="measurement-notes">{{ measurement.notes }}</p>
                          }
                        </div>
                      </ion-item>
                    }
                  </ion-list>
                </ion-card-content>
              </ion-card>
            } @else {
              <ion-card>
                <ion-card-content class="empty-state">
                  <ion-icon name="scale-outline"></ion-icon>
                  <h3>No Measurements Yet</h3>
                  <p>Start tracking your progress by logging your first measurement.</p>
                </ion-card-content>
              </ion-card>
            }
          }
        }

        <!-- Photos View -->
        @if (activeView() === 'photos') {
          @if (loading()) {
            <ion-card>
              <ion-card-content class="loading-card">
                <ion-spinner></ion-spinner>
                <p>Loading photos...</p>
              </ion-card-content>
            </ion-card>
          } @else if (photos().length > 0) {
            <ion-grid>
              <ion-row>
                @for (photo of photos(); track photo.id) {
                  <ion-col size="6" sizeMd="4" sizeLg="3">
                    <div class="photo-card" (click)="viewPhoto(photo)">
                      @if (photo.url) {
                        <ion-img [src]="photo.url" [alt]="'Progress photo from ' + formatDate(photo.taken_at)"></ion-img>
                      }
                      <div class="photo-date">{{ formatDate(photo.taken_at) }}</div>
                      <ion-button
                        fill="clear"
                        size="small"
                        color="danger"
                        class="delete-photo-btn"
                        (click)="confirmDeletePhoto(photo, $event)"
                      >
                        <ion-icon name="trash-outline" slot="icon-only"></ion-icon>
                      </ion-button>
                    </div>
                  </ion-col>
                }
              </ion-row>
            </ion-grid>
          } @else {
            <ion-card>
              <ion-card-content class="empty-state">
                <ion-icon name="camera-outline"></ion-icon>
                <h3>No Photos Yet</h3>
                <p>Document your progress with photos to track visual changes over time.</p>
              </ion-card-content>
            </ion-card>
          }
        }
      </div>

      <!-- FAB Buttons -->
      @if (activeView() === 'measurements') {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="openLogMeasurement()">
            <ion-icon name="add"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      } @else {
        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
          <ion-fab-button (click)="openUploadPhoto()">
            <ion-icon name="camera-outline"></ion-icon>
          </ion-fab-button>
        </ion-fab>
      }

      <!-- Log Measurement Modal -->
      <ion-modal [isOpen]="showMeasurementModal()" (didDismiss)="showMeasurementModal.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Log Measurement</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="showMeasurementModal.set(false)">
                  <ion-icon name="close-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="measurementForm" (ngSubmit)="onSubmitMeasurement()">
              <ion-list lines="none">
                <ion-item>
                  <ion-input
                    formControlName="weight"
                    type="number"
                    label="Weight (kg)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="70.5"
                    step="0.1"
                  />
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="bodyFat"
                    type="number"
                    label="Body Fat %"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="15.0"
                    step="0.1"
                  />
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="waist"
                    type="number"
                    label="Waist (cm)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="80"
                    step="0.1"
                  />
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="chest"
                    type="number"
                    label="Chest (cm)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="100"
                    step="0.1"
                  />
                </ion-item>

                <ion-item>
                  <ion-input
                    formControlName="hips"
                    type="number"
                    label="Hips (cm)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="95"
                    step="0.1"
                  />
                </ion-item>

                <ion-item>
                  <ion-textarea
                    formControlName="notes"
                    label="Notes (Optional)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="How you're feeling..."
                    [autoGrow]="true"
                    rows="3"
                  />
                </ion-item>
              </ion-list>

              <ion-button
                expand="block"
                type="submit"
                [disabled]="measurementForm.invalid || submitting()"
              >
                @if (submitting()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                  Save Measurement
                }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Upload Photo Modal -->
      <ion-modal [isOpen]="showPhotoModal()" (didDismiss)="showPhotoModal.set(false)">
        <ng-template>
          <ion-header>
            <ion-toolbar>
              <ion-title>Upload Progress Photo</ion-title>
              <ion-buttons slot="end">
                <ion-button (click)="showPhotoModal.set(false)">
                  <ion-icon name="close-outline" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>
          <ion-content class="ion-padding">
            <form [formGroup]="photoForm" (ngSubmit)="onSubmitPhoto()">
              <ion-list lines="none">
                <ion-item>
                  <input
                    type="file"
                    accept="image/*"
                    (change)="onFileSelected($event)"
                    #fileInput
                    style="display: none;"
                  />
                  <ion-button expand="block" (click)="fileInput.click()">
                    <ion-icon name="camera-outline" slot="start"></ion-icon>
                    {{ selectedFile() ? selectedFile()!.name : 'Select Photo' }}
                  </ion-button>
                </ion-item>

                <ion-item>
                  <ion-textarea
                    formControlName="notes"
                    label="Notes (Optional)"
                    labelPlacement="floating"
                    fill="outline"
                    placeholder="Notes about this photo..."
                    [autoGrow]="true"
                    rows="3"
                  />
                </ion-item>
              </ion-list>

              @if (errorMessage()) {
                <ion-note color="danger">{{ errorMessage() }}</ion-note>
              }

              <ion-button
                expand="block"
                type="submit"
                [disabled]="!selectedFile() || submitting()"
              >
                @if (submitting()) {
                  <ion-spinner name="crescent"></ion-spinner>
                } @else {
                  <ion-icon name="checkmark-outline" slot="start"></ion-icon>
                  Upload Photo
                }
              </ion-button>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    .measurements-container {
      max-width: 1000px;
      margin: 0 auto;
      padding-bottom: 80px;
    }

    ion-segment {
      margin-bottom: 16px;
    }

    .chart-container {
      position: relative;
      height: 250px;
      width: 100%;
    }

    .loading-card,
    .empty-state {
      text-align: center;
      padding: 48px 20px;

      ion-icon {
        font-size: 64px;
        color: var(--ion-color-medium);
        margin-bottom: 16px;
      }

      ion-spinner {
        margin-bottom: 16px;
      }

      h3 {
        margin: 0 0 8px;
        font-weight: 600;
      }

      p {
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .stat {
      text-align: center;

      .stat-label {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        margin-bottom: 4px;
      }

      .stat-value {
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--ion-color-primary);
      }
    }

    .measurement-date {
      text-align: center;
      color: var(--ion-color-medium);
      font-size: 0.875rem;
      margin: 0;
    }

    .measurement-item {
      width: 100%;

      .measurement-main {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 4px;

        .measurement-weight {
          font-weight: 600;
          font-size: 1.1rem;
        }

        .measurement-date {
          color: var(--ion-color-medium);
          font-size: 0.875rem;
        }
      }

      .measurement-notes {
        font-size: 0.875rem;
        color: var(--ion-color-medium);
        margin: 0;
      }
    }

    .photo-card {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      background: var(--ion-color-light);
      cursor: pointer;

      ion-img {
        width: 100%;
        aspect-ratio: 1;
        object-fit: cover;
      }

      .photo-date {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 8px;
        font-size: 0.75rem;
        text-align: center;
      }

      .delete-photo-btn {
        position: absolute;
        top: 4px;
        right: 4px;
        --background: rgba(255, 255, 255, 0.9);
      }
    }

    ion-list {
      background: transparent;

      ion-item {
        --background: transparent;
        --padding-start: 0;
        --inner-padding-end: 0;
        margin-bottom: 12px;
      }
    }
  `],
})
export class MeasurementsPage implements OnInit {
  @ViewChild('weightChart') weightChartCanvas?: ElementRef<HTMLCanvasElement>;

  private fb = inject(FormBuilder);
  private measurementService = inject(MeasurementService);
  private authService = inject(AuthService);
  private route = inject(ActivatedRoute);
  private alertController = inject(AlertController);
  private modalController = inject(ModalController);

  activeView = signal<'measurements' | 'photos'>('measurements');
  measurements = signal<Tables<'measurements'>[]>([]);
  photos = signal<ProgressPhoto[]>([]);
  loading = signal(false);
  submitting = signal(false);
  showMeasurementModal = signal(false);
  showPhotoModal = signal(false);
  selectedFile = signal<File | null>(null);
  errorMessage = signal<string | null>(null);
  clientId = signal<string>('');

  private chart: Chart | null = null;

  measurementForm: FormGroup = this.fb.group({
    weight: ['', [Validators.min(1), Validators.max(500)]],
    bodyFat: ['', [Validators.min(0), Validators.max(100)]],
    chest: ['', [Validators.min(1), Validators.max(500)]],
    waist: ['', [Validators.min(1), Validators.max(500)]],
    hips: ['', [Validators.min(1), Validators.max(500)]],
    notes: [''],
  });

  photoForm: FormGroup = this.fb.group({
    notes: [''],
  });

  latestMeasurement = () => this.measurements()[0] || null;

  constructor() {
    addIcons({
      add,
      scaleOutline,
      cameraOutline,
      trashOutline,
      closeOutline,
      checkmarkOutline,
    });
  }

  ngOnInit(): void {
    // Get client ID from route or use current user
    const id = this.route.snapshot.paramMap.get('id') || this.authService.user()?.id;
    if (id) {
      this.clientId.set(id);
      this.loadData();
    }
  }

  async loadData(): Promise<void> {
    this.loading.set(true);
    try {
      if (this.activeView() === 'measurements') {
        const data = await this.measurementService.getMeasurements(this.clientId());
        this.measurements.set(data);

        // Render chart after data loads
        setTimeout(() => {
          this.renderWeightChart();
        }, 100);
      } else {
        const photos = await this.measurementService.getProgressPhotos(this.clientId());
        this.photos.set(photos);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      this.loading.set(false);
    }
  }

  private renderWeightChart(): void {
    if (!this.weightChartCanvas?.nativeElement || this.measurements().length === 0) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.weightChartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const data = [...this.measurements()].reverse(); // oldest first
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: data.map(m => new Date(m.measured_at || new Date().toISOString()).toLocaleDateString()),
        datasets: [{
          label: 'Weight (kg)',
          data: data.map(m => m.value || 0),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.1,
          fill: true,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
        },
        scales: {
          y: {
            beginAtZero: false,
          },
        },
      },
    };

    this.chart = new Chart(ctx, config);
  }

  onViewChange(event: CustomEvent): void {
    this.activeView.set(event.detail.value);
    this.loadData();
  }

  openLogMeasurement(): void {
    this.measurementForm.reset();
    this.showMeasurementModal.set(true);
  }

  openUploadPhoto(): void {
    this.photoForm.reset();
    this.selectedFile.set(null);
    this.errorMessage.set(null);
    this.showPhotoModal.set(true);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage.set('File size must be less than 5MB');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage.set('Please select an image file');
        return;
      }

      this.selectedFile.set(file);
      this.errorMessage.set(null);
    }
  }

  async onSubmitMeasurement(): Promise<void> {
    if (this.measurementForm.invalid) return;

    this.submitting.set(true);
    try {
      const formValue = this.measurementForm.value;

      await this.measurementService.logMeasurement({
        client_id: this.clientId(),
        weight_kg: formValue.weight || null,
        body_fat_percent: formValue.bodyFat || null,
        chest_cm: formValue.chest || null,
        waist_cm: formValue.waist || null,
        hips_cm: formValue.hips || null,
        notes: formValue.notes || null,
      });

      this.showMeasurementModal.set(false);
      await this.loadData();
    } catch (error) {
      console.error('Error saving measurement:', error);
    } finally {
      this.submitting.set(false);
    }
  }

  async onSubmitPhoto(): Promise<void> {
    const file = this.selectedFile();
    if (!file) return;

    this.submitting.set(true);
    try {
      const notes = this.photoForm.value.notes;
      await this.measurementService.uploadProgressPhoto(this.clientId(), file, notes);

      this.showPhotoModal.set(false);
      await this.loadData();
    } catch (error) {
      console.error('Error uploading photo:', error);
      this.errorMessage.set('Failed to upload photo. Please try again.');
    } finally {
      this.submitting.set(false);
    }
  }

  async confirmDeletePhoto(photo: ProgressPhoto, event: Event): Promise<void> {
    event.stopPropagation();

    const alert = await this.alertController.create({
      header: 'Delete Photo',
      message: 'Are you sure you want to delete this progress photo?',
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'Delete',
          role: 'destructive',
          handler: async () => {
            if (photo.storage_path) {
              await this.measurementService.deleteProgressPhoto(photo.id, photo.storage_path);
              await this.loadData();
            }
          },
        },
      ],
    });

    await alert.present();
  }

  async viewPhoto(photo: ProgressPhoto): Promise<void> {
    // TODO: Implement photo viewer modal with comparison features
    console.log('View photo:', photo);
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString();
  }

  async handleRefresh(event: CustomEvent): Promise<void> {
    await this.loadData();
    (event.target as HTMLIonRefresherElement).complete();
  }
}
