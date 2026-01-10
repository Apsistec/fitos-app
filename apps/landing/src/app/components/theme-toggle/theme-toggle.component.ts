import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      (click)="toggleTheme()"
      class="theme-toggle"
      [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
      type="button"
    >
      @if (isDark()) {
        <!-- Sun icon for light mode -->
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      } @else {
        <!-- Moon icon for dark mode -->
        <svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      }
    </button>
  `,
  styles: [`
    .theme-toggle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      background-color: var(--fitos-bg-secondary);
      border: 1px solid var(--fitos-border-default);
      color: var(--fitos-text-primary);
      cursor: pointer;
      transition: all 0.25s ease;
    }

    .theme-toggle:hover {
      background-color: var(--fitos-bg-tertiary);
      border-color: var(--fitos-border-strong);
      transform: scale(1.05);
    }

    .theme-toggle:active {
      transform: scale(0.95);
    }

    .icon {
      width: 20px;
      height: 20px;
    }

    @media (prefers-reduced-motion: reduce) {
      .theme-toggle {
        transition: none;
      }

      .theme-toggle:hover {
        transform: none;
      }

      .theme-toggle:active {
        transform: none;
      }
    }
  `],
})
export class ThemeToggleComponent implements OnInit {
  isDark = signal(true);

  ngOnInit(): void {
    // Check for saved theme preference or default to dark
    const savedTheme = localStorage.getItem('fitos-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'light') {
      this.setTheme('light');
    } else if (savedTheme === 'dark' || !savedTheme) {
      // Default to dark mode
      this.setTheme('dark');
    } else if (prefersDark) {
      this.setTheme('dark');
    } else {
      this.setTheme('light');
    }
  }

  toggleTheme(): void {
    const newTheme = this.isDark() ? 'light' : 'dark';
    this.setTheme(newTheme);
  }

  private setTheme(theme: 'dark' | 'light'): void {
    this.isDark.set(theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('fitos-theme', theme);
  }
}
