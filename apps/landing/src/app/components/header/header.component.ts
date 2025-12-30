import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <header class="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <!-- Logo -->
          <a routerLink="/" class="flex items-center gap-2">
            <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-violet-600 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span class="text-xl font-bold text-gray-900">FitOS</span>
          </a>

          <!-- Desktop Navigation -->
          <div class="hidden md:flex items-center gap-8">
            <a routerLink="/features" routerLinkActive="text-primary-600" 
               class="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Features
            </a>
            <a routerLink="/pricing" routerLinkActive="text-primary-600"
               class="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Pricing
            </a>
            <a href="https://docs.fitos.app" target="_blank"
               class="text-gray-600 hover:text-primary-600 font-medium transition-colors">
              Docs
            </a>
          </div>

          <!-- CTA Buttons -->
          <div class="hidden md:flex items-center gap-4">
            <a href="https://app.fitos.app/auth/login" class="btn-ghost">
              Sign In
            </a>
            <a href="https://app.fitos.app/auth/register" class="btn-primary">
              Get Started Free
            </a>
          </div>

          <!-- Mobile Menu Button -->
          <button 
            (click)="toggleMobileMenu()"
            class="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              @if (!mobileMenuOpen()) {
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M4 6h16M4 12h16M4 18h16" />
              } @else {
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M6 18L18 6M6 6l12 12" />
              }
            </svg>
          </button>
        </div>

        <!-- Mobile Menu -->
        @if (mobileMenuOpen()) {
          <div class="md:hidden py-4 border-t border-gray-100">
            <div class="flex flex-col gap-4">
              <a routerLink="/features" (click)="closeMobileMenu()"
                 class="text-gray-600 hover:text-primary-600 font-medium py-2">
                Features
              </a>
              <a routerLink="/pricing" (click)="closeMobileMenu()"
                 class="text-gray-600 hover:text-primary-600 font-medium py-2">
                Pricing
              </a>
              <a href="https://docs.fitos.app" target="_blank"
                 class="text-gray-600 hover:text-primary-600 font-medium py-2">
                Docs
              </a>
              <hr class="border-gray-100" />
              <a href="https://app.fitos.app/auth/login" 
                 class="text-gray-600 hover:text-primary-600 font-medium py-2">
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
