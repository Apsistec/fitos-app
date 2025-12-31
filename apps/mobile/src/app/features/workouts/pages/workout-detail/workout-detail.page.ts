import { Component } from '@angular/core';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons } from '@ionic/angular/standalone';

@Component({
  selector: 'app-workout-detail',
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, IonBackButton, IonButtons],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/workouts"></ion-back-button>
        </ion-buttons>
        <ion-title>Workout Details</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <p>Workout details coming soon...</p>
    </ion-content>
  `,
})
export class WorkoutDetailPage {}
