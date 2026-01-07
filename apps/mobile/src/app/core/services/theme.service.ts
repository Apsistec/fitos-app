import { Injectable, signal, effect } from '@angular/core';

const DARK_MODE_KEY = 'fitos_dark_mode';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  // Signal for dark mode state
  isDarkMode = signal<boolean>(this.getInitialDarkMode());

  constructor() {
    // Apply initial theme
    this.applyTheme(this.isDarkMode());

    // Watch for changes and apply theme
    effect(() => {
      this.applyTheme(this.isDarkMode());
      localStorage.setItem(DARK_MODE_KEY, JSON.stringify(this.isDarkMode()));
    });
  }

  /**
   * Get initial dark mode preference
   * Priority: localStorage > system preference
   */
  private getInitialDarkMode(): boolean {
    // Check localStorage first
    const stored = localStorage.getItem(DARK_MODE_KEY);
    if (stored !== null) {
      return JSON.parse(stored);
    }

    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  /**
   * Apply theme to document
   */
  private applyTheme(isDark: boolean): void {
    document.body.classList.toggle('dark', isDark);
  }

  /**
   * Toggle dark mode
   */
  toggle(): void {
    this.isDarkMode.set(!this.isDarkMode());
  }

  /**
   * Set dark mode explicitly
   */
  setDarkMode(enabled: boolean): void {
    this.isDarkMode.set(enabled);
  }
}
