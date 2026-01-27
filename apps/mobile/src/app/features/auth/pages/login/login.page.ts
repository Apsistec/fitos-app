import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardContent,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fitnessOutline,
  peopleOutline,
  businessOutline,
  arrowForward,
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardContent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content class="ion-padding">
      <div class="login-selector-container">
        <!-- Logo and Title -->
        <div class="header">
          <div class="logo">
            <ion-icon name="fitness-outline" color="primary"></ion-icon>
          </div>
          <h1>Welcome to FitOS</h1>
          <p class="subtitle">Select your account type to sign in</p>
        </div>

        <!-- Role Selection Cards -->
        <div class="role-cards">
          <!-- Trainer Card -->
          <ion-card routerLink="/auth/login/trainer" class="role-card trainer-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="fitness-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>Trainer</h2>
                <p>Manage clients, create programs, and grow your business</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>

          <!-- Client Card -->
          <ion-card routerLink="/auth/login/client" class="role-card client-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="people-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>Client</h2>
                <p>Track workouts, log nutrition, and work with your trainer</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>

          <!-- Gym Owner Card -->
          <ion-card routerLink="/auth/login/gym-owner" class="role-card gym-card">
            <ion-card-content>
              <div class="card-icon">
                <ion-icon name="business-outline"></ion-icon>
              </div>
              <div class="card-content">
                <h2>Gym Owner</h2>
                <p>Manage your facility, staff, and member experience</p>
              </div>
              <ion-icon name="arrow-forward" class="arrow-icon"></ion-icon>
            </ion-card-content>
          </ion-card>
        </div>

        <!-- Sign Up Link -->
        <div class="signup-section">
          <p>Don't have an account?</p>
          <ion-button fill="outline" routerLink="/auth/register">
            Create Account
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-selector-container {
      max-width: 500px;
      margin: 0 auto;
      padding-top: 32px;
    }

    .header {
      text-align: center;
      margin-bottom: 40px;

      .logo {
        ion-icon {
          font-size: 72px;
        }
      }

      h1 {
        margin: 16px 0 8px;
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

    .signup-section {
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
export class LoginPage {
  constructor() {
    addIcons({
      fitnessOutline,
      peopleOutline,
      businessOutline,
      arrowForward,
    });
  }
}
