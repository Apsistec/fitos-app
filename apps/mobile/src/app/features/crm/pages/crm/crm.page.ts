import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { funnelOutline, statsChartOutline } from 'ionicons/icons';
import { LeadPipelineComponent } from '../../components/lead-pipeline/lead-pipeline.component';

/**
 * CRMPage - Lead management and marketing dashboard
 *
 * Features:
 * - Pipeline Kanban view
 * - Analytics dashboard
 * - Lead source attribution
 * - Conversion tracking
 */
@Component({
  selector: 'app-crm',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    LeadPipelineComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>CRM & Marketing</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <app-lead-pipeline></app-lead-pipeline>
    </ion-content>
  `,
  styles: [`
    ion-content {
      --background: var(--fitos-bg-primary);
    }
  `],
})
export class CRMPage {
  constructor() {
    addIcons({ funnelOutline, statsChartOutline });
  }
}
