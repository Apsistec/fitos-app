import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
  IonBackButton,
  IonButtons,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fitnessOutline,
  peopleOutline,
  businessOutline,
  arrowForward,
} from 'ionicons/icons';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
    IonBackButton,
    IonButtons,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/auth/login"></ion-back-button>
        </ion-buttons>
        <ion-title>Create Account</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="register-selector-container">
        <!-- Header -->
        <div class="header">
          <h1>Join FitOS</h1>
          <p class="subtitle">Select your account type to get started</p>
        </div>

        <!-- Role Selection Cards -->
        <div class="role-cards">
          <!-- Trainer Card -->
          <ion-card routerLink="/auth/register/trainer" class="role-card trainer-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="fitness-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>I'm a Trainer</h2>
                <p>Create programs, manage clients, and grow your coaching business</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>

          <!-- Client Card -->
          <ion-card routerLink="/auth/register/client" class="role-card client-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="people-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>I'm a Client</h2>
                <p>Track workouts, log nutrition, and connect with your trainer</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>

          <!-- Gym Owner Card -->
          <ion-card routerLink="/auth/register/gym-owner" class="role-card gym-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="business-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>I'm a Gym Owner</h2>
                <p>Manage your facility, staff trainers, and member experience</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Sign In Link -->
        <div class="signin-section">
          <p>Already have an account?</p>
          <ion-button fill="outline" routerLink="/auth/login">
            Sign In
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .register-selector-container {
      max-width: 500px;
      margin: 0 auto;
      padding-top: 16px;
    }

    .header {
      text-align: center;
      margin-bottom: 32px;

      h1 {
        margin: 0 0 8px;
        font-size: 1.75rem;
        font-weight: 700;
      }

      .subtitle {
        margin: 0;
        color: var(--ion-color-medium);
      }
    }

    .role-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .role-card {
      margin: 0;
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      &:active {
        transform: translateY(0);
      }

      ion-card-content {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
      }

      .card-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;

        ion-icon {
          font-size: 28px;
          color: white;
        }
      }

      .card-content {
        flex: 1;

        h2 {
          margin: 0 0 4px;
          font-size: 1.1rem;
          font-weight: 600;
        }

        p {
          margin: 0;
          font-size: 0.85rem;
          color: var(--ion-color-medium);
        }
      }

      .arrow-icon {
        font-size: 20px;
        color: var(--ion-color-medium);
      }
    }

    .trainer-card .card-icon {
      background: linear-gradient(135deg, var(--ion-color-primary), var(--ion-color-primary-shade));
    }

    .client-card .card-icon {
      background: linear-gradient(135deg, #10B981, #059669);
    }

    .gym-card .card-icon {
      background: linear-gradient(135deg, #8B5CF6, #7C3AED);
    }

    .signin-section {
      text-align: center;
      margin-top: 40px;
      padding-top: 24px;
      border-top: 1px solid var(--ion-color-light-shade);

      p {
        margin: 0 0 16px;
        color: var(--ion-color-medium);
      }

      ion-button {
        min-width: 200px;
      }
    }
  `],
})
export class RegisterPage {
  constructor() {
    addIcons({
      fitnessOutline,
      peopleOutline,
      businessOutline,
      arrowForward,
    });
  }
}
