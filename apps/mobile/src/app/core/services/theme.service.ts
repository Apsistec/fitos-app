import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Preferences } from '@capacitor/preferences';

const THEME_MODE_KEY = 'fitos_theme_mode';

export type ThemeMode = 'dark' | 'light' | 'system';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  // Theme mode: dark (default), light, or system
  mode = signal<ThemeMode>('dark');
  
  // Computed dark mode state
  isDarkMode = signal<boolean>(true);
  
  // System preference
  private systemPrefersDark = signal<boolean>(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.init();
    }
  }

  private async init(): Promise<void> {
    // Load saved preference (default: dark)
    const stored = await this.getStoredMode();
    this.mode.set(stored || 'dark');
    
    // Detect system preference
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      this.systemPrefersDark.set(mediaQuery.matches);
      
      mediaQuery.addEventListener('change', (e) => {
        this.systemPrefersDark.set(e.matches);
        if (this.mode() === 'system') {
          this.applyTheme();
        }
      });
    }

    // Apply initial theme
    this.applyTheme();

    // Watch for mode changes
    effect(() => {
      const currentMode = this.mode();
      this.applyTheme();
      this.saveMode(currentMode);
    });
  }

  private async getStoredMode(): Promise<ThemeMode | null> {
    try {
      // Try Capacitor Preferences first (works on native)
      if (Capacitor.isNativePlatform()) {
        const { value } = await Preferences.get({ key: THEME_MODE_KEY });
        return value as ThemeMode | null;
      }
      // Fall back to localStorage for web
      const stored = localStorage.getItem(THEME_MODE_KEY);
      return stored as ThemeMode | null;
    } catch {
      return null;
    }
  }

  private async saveMode(mode: ThemeMode): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        await Preferences.set({ key: THEME_MODE_KEY, value: mode });
      } else {
        localStorage.setItem(THEME_MODE_KEY, mode);
      }
    } catch {
      // Ignore storage errors
    }
  }

  private applyTheme(): void {
    const shouldBeDark = this.mode() === 'dark' || 
      (this.mode() === 'system' && this.systemPrefersDark());
    
    this.isDarkMode.set(shouldBeDark);
    
    // Apply classes to body
    document.body.classList.toggle('dark', shouldBeDark);
    document.body.classList.toggle('light', !shouldBeDark);
    
    // Update status bar on native
    this.updateStatusBar(shouldBeDark);
  }

  private async updateStatusBar(isDark: boolean): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await StatusBar.setStyle({ 
        style: isDark ? Style.Dark : Style.Light 
      });
      
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({
          color: isDark ? '#0D0D0D' : '#FFFFFF'
        });
      }
    } catch {
      // StatusBar plugin may not be available
    }
  }

  /**
   * Set theme mode
   */
  setMode(mode: ThemeMode): void {
    this.mode.set(mode);
  }

  /**
   * Toggle between dark and light (ignores system)
   */
  toggle(): void {
    this.mode.set(this.isDarkMode() ? 'light' : 'dark');
  }

  /**
   * Set dark mode explicitly
   */
  setDarkMode(enabled: boolean): void {
    this.mode.set(enabled ? 'dark' : 'light');
  }
}
