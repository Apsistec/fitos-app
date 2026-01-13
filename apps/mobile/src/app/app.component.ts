import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

@Component({
  standalone: true,
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ion-app>
      <a href="#main-content" class="skip-link">Skip to main content</a>
      <ion-router-outlet id="main-content"></ion-router-outlet>
    </ion-app>
  `,
  styles: [`
    .skip-link {
      position: absolute;
      top: -40px;
      left: 0;
      padding: 8px 16px;
      background: var(--ion-color-primary);
      color: var(--ion-color-primary-contrast);
      z-index: 100;
      text-decoration: none;
      border-radius: 0 0 4px 0;
      font-weight: 600;
    }

    .skip-link:focus {
      top: 0;
    }
  `],
})
export class AppComponent implements OnInit {
  private authService = inject(AuthService);
  private themeService = inject(ThemeService); // Initialize theme service

  constructor() {
    // Register all Ionicons
    addIcons(allIcons);
  }

  ngOnInit(): void {
    // Initialize auth state listener
    this.authService.initAuthListener();
  }
}
