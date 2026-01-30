import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonIcon,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  fitnessOutline,
  peopleOutline,
  businessOutline,
  chevronForward,
} from 'ionicons/icons';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    RouterLink,
    IonContent,
    IonIcon,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-content>
      <div class="login-container">
        <!-- Decorative background glows -->
        <div class="bg-glow bg-glow--top"></div>
        <div class="bg-glow bg-glow--bottom"></div>

        <!-- Header / Logo -->
        <header class="header">
          <h1 class="logo">
            Fit<span class="logo-accent">O</span>S
          </h1>
          <p class="tagline">AI-Powered Fitness Coaching</p>
        </header>

        <!-- Role Selection Cards -->
        <main class="role-cards">
          <!-- Trainer Card -->
          <button class="role-card" routerLink="/auth/login/trainer">
            <div class="role-card__icon">
              <ion-icon name="fitness-outline"></ion-icon>
            </div>
            <div class="role-card__content">
              <h2>I'm a Trainer</h2>
              <p>Manage clients, build programs, track progress</p>
            </div>
            <ion-icon name="chevron-forward" class="role-card__arrow"></ion-icon>
          </button>

          <!-- Client Card -->
          <button class="role-card" routerLink="/auth/login/client">
            <div class="role-card__icon role-card__icon--client">
              <ion-icon name="people-outline"></ion-icon>
            </div>
            <div class="role-card__content">
              <h2>I'm a Client</h2>
              <p>Get coached, log workouts, track nutrition</p>
            </div>
            <ion-icon name="chevron-forward" class="role-card__arrow"></ion-icon>
          </button>

          <!-- Gym Owner Card -->
          <button class="role-card" routerLink="/auth/login/gym-owner">
            <div class="role-card__icon role-card__icon--gym">
              <ion-icon name="business-outline"></ion-icon>
            </div>
            <div class="role-card__content">
              <h2>I'm a Gym Owner</h2>
              <p>Manage trainers, view analytics, grow business</p>
            </div>
            <ion-icon name="chevron-forward" class="role-card__arrow"></ion-icon>
          </button>
        </main>

        <!-- Footer -->
        <footer class="footer">
          <p>
            Don't have an account?
            <a routerLink="/auth/register" class="footer__link">Sign up</a>
          </p>
        </footer>
      </div>
    </ion-content>
  `,
  styles: [`
    .login-container {
      position: relative;
      display: flex;
      flex-direction: column;
      min-height: 100%;
      max-width: 500px;
      margin: 0 auto;
      padding: 0 20px;
      overflow: hidden;
    }

    /* Decorative background glows */
    .bg-glow {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
      background: rgba(16, 185, 129, 0.05);
      filter: blur(80px);
    }

    .bg-glow--top {
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 256px;
      height: 256px;
    }

    .bg-glow--bottom {
      bottom: 0;
      right: 0;
      width: 192px;
      height: 192px;
    }

    /* Header */
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 48px;
      padding-bottom: 32px;
      z-index: 1;
    }

    .logo {
      font-size: 40px;
      font-weight: 800;
      color: var(--fitos-text-primary, #F5F5F5);
      letter-spacing: -0.5px;
      margin: 0;
    }

    .logo-accent {
      color: var(--ion-color-primary, #10B981);
      text-shadow: 0 0 20px rgba(16, 185, 129, 0.5);
    }

    .tagline {
      color: var(--fitos-text-secondary, #A3A3A3);
      font-size: 14px;
      font-weight: 500;
      letter-spacing: 0.3px;
      margin: 8px 0 0;
    }

    /* Role Cards */
    .role-cards {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      justify-content: center;
      z-index: 1;
    }

    .role-card {
      position: relative;
      display: flex;
      align-items: center;
      gap: 16px;
      width: 100%;
      padding: 20px;
      border-radius: 12px;
      background: var(--fitos-bg-secondary, #1A1A1A);
      border: 1px solid rgba(255, 255, 255, 0.1);
      cursor: pointer;
      transition: transform 0.3s, border-color 0.3s, box-shadow 0.3s;
      text-align: left;
      outline: none;
      -webkit-appearance: none;
      appearance: none;

      &:hover, &:focus-visible {
        transform: scale(1.02);
        border-color: rgba(16, 185, 129, 0.5);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      }

      &:active {
        transform: scale(0.98);
      }
    }

    .role-card__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--fitos-bg-tertiary, #252525);
      flex-shrink: 0;
      transition: background 0.3s;

      ion-icon {
        font-size: 24px;
        color: var(--ion-color-primary, #10B981);
      }

      .role-card:hover &,
      .role-card:focus-visible & {
        background: rgba(16, 185, 129, 0.2);
      }
    }

    .role-card__icon--client {
      ion-icon {
        color: var(--ion-color-primary, #10B981);
      }
    }

    .role-card__icon--gym {
      ion-icon {
        color: var(--fitos-accent-secondary, #8B5CF6);
      }

      .role-card:hover &,
      .role-card:focus-visible & {
        background: rgba(139, 92, 246, 0.2);
      }
    }

    .role-card__content {
      flex: 1;
      min-width: 0;

      h2 {
        margin: 0 0 4px;
        font-size: 17px;
        font-weight: 600;
        color: var(--fitos-text-primary, #F5F5F5);
        transition: color 0.3s;
      }

      p {
        margin: 0;
        font-size: 13px;
        color: var(--fitos-text-secondary, #A3A3A3);
        line-height: 1.4;
      }

      .role-card:hover & h2,
      .role-card:focus-visible & h2 {
        color: var(--ion-color-primary, #10B981);
      }
    }

    .role-card__arrow {
      font-size: 20px;
      color: var(--ion-color-primary, #10B981);
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity 0.3s, transform 0.3s;

      .role-card:hover &,
      .role-card:focus-visible & {
        opacity: 1;
        transform: translateX(0);
      }
    }

    /* Footer */
    .footer {
      padding: 32px 0;
      text-align: center;
      z-index: 1;

      p {
        font-size: 14px;
        color: var(--fitos-text-secondary, #A3A3A3);
        margin: 0;
      }
    }

    .footer__link {
      color: var(--ion-color-primary, #10B981);
      font-weight: 500;
      text-decoration: none;
      margin-left: 4px;
      transition: color 0.2s;

      &:hover {
        color: var(--fitos-text-primary, #F5F5F5);
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
      chevronForward,
    });
  }
}
