import { Injectable, inject } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { AuthService } from './auth.service';

/**
 * SocialLoginService
 * Sprint 53: Progressive Onboarding & Auth Enhancement
 *
 * Provides native-app social sign-in via @capgo/capacitor-social-login:
 * - iOS / Android: ID-token flow via Google SDK / Sign in with Apple
 * - Web (PWA): Falls back to Supabase OAuth redirect flow
 *
 * Usage:
 *   const { error } = await socialLoginService.signInWithGoogle();
 */

interface SocialLoginPlugin {
  initialize: (opts: {
    google?: { webClientId: string };
    apple?: Record<string, unknown>;
  }) => Promise<void>;
  login: (opts: {
    provider: 'google' | 'apple';
    options?: {
      scopes?: string[];
      nonce?: string;
    };
  }) => Promise<{
    provider: string;
    result: {
      idToken?: string;
      accessToken?: string;
      serverAuthCode?: string;
      profile?: {
        email?: string;
        name?: string;
        givenName?: string;
        familyName?: string;
        picture?: string;
      };
      // Apple-specific
      identityToken?: string;
      authorizationCode?: string;
      user?: string;
      givenName?: string | null;
      familyName?: string | null;
    };
  }>;
  logout: (opts: { provider: 'google' | 'apple' }) => Promise<void>;
}

@Injectable({
  providedIn: 'root',
})
export class SocialLoginService {
  private auth = inject(AuthService);

  private _plugin: SocialLoginPlugin | null = null;
  private _initialized = false;

  // Google Web Client ID — used for native token exchange
  // Must match the OAuth 2.0 client registered in Google Cloud Console
  private readonly GOOGLE_WEB_CLIENT_ID = ''; // Set via environment in production

  // ── Lazy-load plugin ──────────────────────────────────────────────────────
  private async getPlugin(): Promise<SocialLoginPlugin | null> {
    if (this._plugin) return this._plugin;
    try {
      const mod = await (import('@capgo/capacitor-social-login' as string) as Promise<{
        SocialLogin: SocialLoginPlugin;
      }>);
      this._plugin = mod.SocialLogin;
      return this._plugin;
    } catch {
      return null;
    }
  }

  // ── Initialize (call once at app startup) ─────────────────────────────────
  async initialize(): Promise<void> {
    if (this._initialized) return;

    const plugin = await this.getPlugin();
    if (!plugin) return;

    try {
      await plugin.initialize({
        google: {
          webClientId: this.GOOGLE_WEB_CLIENT_ID,
        },
        apple: {},
      });
      this._initialized = true;
    } catch (err) {
      console.error('[SocialLoginService] initialize error:', err);
    }
  }

  // ── Sign in with Google ───────────────────────────────────────────────────
  /**
   * Native flow on iOS/Android: retrieves idToken → passes to Supabase signInWithIdToken().
   * Web fallback: uses Supabase OAuth redirect.
   */
  async signInWithGoogle(): Promise<{ error: Error | null }> {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback: standard Supabase OAuth redirect
      return this.auth.signInWithProvider('google');
    }

    const plugin = await this.getPlugin();
    if (!plugin) {
      return this.auth.signInWithProvider('google');
    }

    try {
      await this.initialize();

      const result = await plugin.login({
        provider: 'google',
        options: { scopes: ['profile', 'email'] },
      });

      const idToken = result.result.idToken;
      if (!idToken) {
        return { error: new Error('Google sign-in did not return an ID token') };
      }

      return this.auth.signInWithIdToken('google', idToken);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      // User cancelled the sign-in dialog — not really an error
      if (error.message.includes('cancelled') || error.message.includes('canceled') || error.message.includes('12501')) {
        return { error: null };
      }
      console.error('[SocialLoginService] signInWithGoogle error:', err);
      return { error };
    }
  }

  // ── Sign in with Apple ────────────────────────────────────────────────────
  /**
   * Native flow on iOS: retrieves identityToken + nonce → passes to Supabase.
   * Web fallback: uses Supabase OAuth redirect.
   * Not available on Android.
   */
  async signInWithApple(): Promise<{ error: Error | null }> {
    if (!Capacitor.isNativePlatform()) {
      return this.auth.signInWithProvider('apple');
    }

    // Apple sign-in is only available on iOS
    if (Capacitor.getPlatform() !== 'ios') {
      return { error: new Error('Sign in with Apple is only available on iOS') };
    }

    const plugin = await this.getPlugin();
    if (!plugin) {
      return this.auth.signInWithProvider('apple');
    }

    try {
      await this.initialize();

      // Generate a random nonce for Apple sign-in security
      const nonce = this.generateNonce();

      const result = await plugin.login({
        provider: 'apple',
        options: { nonce },
      });

      const identityToken = result.result.identityToken;
      if (!identityToken) {
        return { error: new Error('Apple sign-in did not return an identity token') };
      }

      return this.auth.signInWithIdToken('apple', identityToken, nonce);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message.includes('cancelled') || error.message.includes('canceled') || error.message.includes('1001')) {
        return { error: null };
      }
      console.error('[SocialLoginService] signInWithApple error:', err);
      return { error };
    }
  }

  // ── Sign out ──────────────────────────────────────────────────────────────
  async signOut(provider: 'google' | 'apple'): Promise<void> {
    if (!Capacitor.isNativePlatform()) return;

    const plugin = await this.getPlugin();
    if (!plugin) return;

    try {
      await plugin.logout({ provider });
    } catch (err) {
      console.error('[SocialLoginService] signOut error:', err);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private generateNonce(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
  }
}
