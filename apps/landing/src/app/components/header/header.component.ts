import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent, IconComponent],
  template: `
    <header class="header">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a routerLink="/" class="logo">
            <div class="logo-icon">
              <app-icon name="lightning" size="sm" class="text-white" />
            </div>
            <span class="logo-text">FitOS</span>
          </a>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-8">
            <a routerLink="/features" routerLinkActive="nav-link-active"
               class="nav-link">
              Features
            </a>
            <a routerLink="/pricing" routerLinkActive="nav-link-active"
               class="nav-link">
              Pricing
            </a>
            <a routerLink="/docs" routerLinkActive="nav-link-active"
               class="nav-link">
              Docs
            </a>
          </div>

          <!-- CTA Buttons + Theme Toggle -->
          <div class="hidden md:flex items-center gap-4">
            <app-theme-toggle />
            <a href="https://app.fitos.app/auth/login" class="btn-ghost">
              Sign In
            </a>
            <a href="https://app.fitos.app/auth/register" class="btn-primary">
              Get Started Free
            </a>
          </div>

          <!-- Mobile Menu Button + Theme Toggle -->
          <div class="md:hidden flex items-center gap-2">
            <app-theme-toggle />
            <button
              (click)="toggleMobileMenu()"
              class="mobile-menu-button"
            >
              @if (!mobileMenuOpen()) {
                <app-icon name="menu" size="md" />
              } @else {
                <app-icon name="close" size="md" />
              }
            </button>
          </div>
        </div>

        <!-- Mobile Menu -->
        @if (mobileMenuOpen()) {
          <div class="mobile-menu">
            <div class="flex flex-col gap-4">
              <a routerLink="/features" (click)="closeMobileMenu()"
                 class="mobile-nav-link">
                Features
              </a>
              <a routerLink="/pricing" (click)="closeMobileMenu()"
                 class="mobile-nav-link">
                Pricing
              </a>
              <a routerLink="/docs" (click)="closeMobileMenu()"
                 class="mobile-nav-link">
                Docs
              </a>
              <hr class="mobile-divider" />
              <a href="https://app.fitos.app/auth/login"
                 class="mobile-nav-link">
                Sign In
              </a>
              <a href="https://app.fitos.app/auth/register" class="btn-primary text-center">
                Get Started Free
              </a>
            </div>
          </div>
        }
      </nav>
    </header>
    <!-- Spacer for fixed header -->
    <div class="h-16"></div>
  `,
  styles: [`
    .header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background-color: var(--fitos-bg-primary);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--fitos-border-subtle);
    }

    .logo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .logo-icon {
      width: 2rem;
      height: 2rem;
      background: linear-gradient(135deg, #10B981, #8B5CF6);
      border-radius: 0.5rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .logo-text {
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--fitos-text-primary);
    }

    .nav-link {
      color: var(--fitos-text-secondary);
      font-weight: 500;
      transition: color 0.25s ease;
    }

    .nav-link:hover {
      color: var(--fitos-accent-primary);
    }

    .nav-link-active {
      color: var(--fitos-accent-primary);
    }

    .mobile-menu-button {
      padding: 0.5rem;
      border-radius: 0.5rem;
      color: var(--fitos-text-secondary);
      transition: background-color 0.25s ease;
    }

    .mobile-menu-button:hover {
      background-color: var(--fitos-bg-secondary);
    }

    .mobile-menu {
      padding: 1rem 0;
      border-top: 1px solid var(--fitos-border-subtle);
    }

    .mobile-nav-link {
      color: var(--fitos-text-secondary);
      font-weight: 500;
      padding: 0.5rem 0;
      transition: color 0.25s ease;
    }

    .mobile-nav-link:hover {
      color: var(--fitos-accent-primary);
    }

    .mobile-divider {
      border-color: var(--fitos-border-subtle);
    }

    @media (max-width: 768px) {
      .header {
        backdrop-filter: blur(8px);
      }
    }
  `],
})
export class HeaderComponent {
  mobileMenuOpen = signal(false);

  toggleMobileMenu(): void {
    this.mobileMenuOpen.update(open => !open);
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }
}
