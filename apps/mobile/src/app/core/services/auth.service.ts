import { Injectable, inject, signal, computed, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { ToastController } from '@ionic/angular/standalone';
import { SupabaseService } from './supabase.service';
import {
  AuthChangeEvent,
  AuthSession,
  Provider,
  User
} from '@supabase/supabase-js';
import type { Profile, UserRole } from '@fitos/shared';

export interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: AuthSession | null;
  loading: boolean;
  initialized: boolean;
  /** Indicates if there's a pending MFA challenge */
  mfaPending: boolean;
  /** Indicates if user is in password recovery flow */
  passwordRecoveryPending: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private toastController = inject(ToastController);
  private ngZone = inject(NgZone);

  private readonly RETURN_URL_KEY = 'fitos_return_url';
  private readonly TOKEN_REFRESH_MARGIN_SECONDS = 60; // Refresh 60s before expiry
  private readonly MAX_RETRY_ATTEMPTS = 3;
  private readonly RETRY_DELAY_MS = 1000;

  // Token refresh timer
  private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Track if we're currently refreshing to prevent duplicate calls
  private isRefreshing = false;

  // Signals for reactive state
  private _state = signal<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    initialized: false,
    mfaPending: false,
    passwordRecoveryPending: false,
  });

  // Public computed signals
  readonly state = this._state.asReadonly();
  readonly user = computed(() => this._state().user);
  readonly profile = computed(() => this._state().profile);
  readonly session = computed(() => this._state().session);
  readonly loading = computed(() => this._state().loading);
  readonly isAuthenticated = computed(() => !!this._state().user);
  readonly isTrainer = computed(() => this._state().profile?.role === 'trainer');
  readonly isClient = computed(() => this._state().profile?.role === 'client');
  readonly isOwner = computed(() => this._state().profile?.role === 'gym_owner');
  readonly accessToken = computed(() => this._state().session?.access_token ?? null);
  readonly mfaPending = computed(() => this._state().mfaPending);
  readonly passwordRecoveryPending = computed(() => this._state().passwordRecoveryPending);

  // Get role directly from JWT claims (faster than DB query)
  readonly roleFromToken = computed(() => {
    const session = this._state().session;
    if (!session?.access_token) return null;
    try {
      const payload = JSON.parse(atob(session.access_token.split('.')[1]));
      return payload.user_role as UserRole | null;
    } catch {
      return null;
    }
  });

  /**
   * Wait for auth initialization to complete
   * Returns a promise that resolves when auth is initialized
   * Times out after 10 seconds to prevent infinite waiting
   */
  async waitForInitialization(): Promise<void> {
    if (this._state().initialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        console.error('Auth initialization timed out after 10 seconds');
        // Force initialized state to prevent app lockout
        this._state.update((s) => ({
          ...s,
          loading: false,
          initialized: true,
        }));
        resolve();
      }, 10000);

      const checkInterval = setInterval(() => {
        if (this._state().initialized) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Initialize auth state listener
   * Call this once in AppComponent
   */
  initAuthListener(): void {
    // Get initial session
    this.initializeSession();

    // Listen for auth changes - handle ALL possible events
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: AuthSession | null) => {
        // Run inside Angular zone to ensure change detection
        this.ngZone.run(async () => {
          console.log('Auth state changed:', event, session ? 'with session' : 'no session');

          switch (event) {
            case 'SIGNED_IN':
              await this.handleSignedIn(session);
              break;

            case 'SIGNED_OUT':
              this.handleSignedOut();
              break;

            case 'TOKEN_REFRESHED':
              this.handleTokenRefreshed(session);
              break;

            case 'USER_UPDATED':
              await this.handleUserUpdated(session);
              break;

            case 'PASSWORD_RECOVERY':
              this.handlePasswordRecovery(session);
              break;

            case 'MFA_CHALLENGE_VERIFIED':
              await this.handleMfaChallengeVerified(session);
              break;

            case 'INITIAL_SESSION':
              // This fires on page load/refresh - getSession() already handles it
              // But we still setup token refresh if there's a session
              if (session) {
                this.scheduleTokenRefresh(session);
              }
              console.log('INITIAL_SESSION event - session handled by getSession()');
              break;

            default:
              console.log('Unhandled auth event:', event);
          }
        });
      }
    );

    // Listen for visibility changes (app resume on iOS/Android)
    this.initVisibilityListener();

    // Listen for storage events (multi-tab session sync)
    this.initStorageListener();

    // Listen for online/offline events
    this.initNetworkListener();
  }

  /**
   * Handle SIGNED_IN event
   */
  private async handleSignedIn(session: AuthSession | null): Promise<void> {
    if (!session?.user) return;

    console.log('User signed in:', session.user.id);

    this._state.update((s) => ({
      ...s,
      session,
      user: session.user,
      loading: true,
      mfaPending: false,
      passwordRecoveryPending: false,
    }));

    // Schedule proactive token refresh
    this.scheduleTokenRefresh(session);

    await this.loadProfile(session.user.id);
    this.handlePostLogin();
  }

  /**
   * Handle SIGNED_OUT event
   */
  private handleSignedOut(): void {
    console.log('User signed out');

    // Clear token refresh timer
    this.clearTokenRefreshTimer();

    this._state.update((s) => ({
      ...s,
      session: null,
      user: null,
      profile: null,
      loading: false,
      initialized: true,
      mfaPending: false,
      passwordRecoveryPending: false,
    }));

    // Only navigate to login if not already on an auth page
    const currentUrl = this.router.url;
    if (!currentUrl.startsWith('/auth')) {
      this.router.navigate(['/auth/login']);
    }
  }

  /**
   * Handle TOKEN_REFRESHED event
   */
  private handleTokenRefreshed(session: AuthSession | null): void {
    if (!session?.user) return;

    console.log('Token refreshed for user:', session.user.id);

    this._state.update((s) => ({
      ...s,
      session,
      user: session.user,
    }));

    // Reschedule the next token refresh
    this.scheduleTokenRefresh(session);
  }

  /**
   * Handle USER_UPDATED event (profile changes, email changes, etc.)
   */
  private async handleUserUpdated(session: AuthSession | null): Promise<void> {
    if (!session?.user) return;

    console.log('User updated:', session.user.id);

    this._state.update((s) => ({
      ...s,
      session,
      user: session.user,
    }));

    // Reload profile to get any changes
    await this.loadProfile(session.user.id);
  }

  /**
   * Handle PASSWORD_RECOVERY event (user clicked password reset link)
   */
  private handlePasswordRecovery(session: AuthSession | null): void {
    console.log('Password recovery flow initiated');

    this._state.update((s) => ({
      ...s,
      session,
      user: session?.user ?? null,
      passwordRecoveryPending: true,
      loading: false,
      initialized: true,
    }));

    // Navigate to password reset page
    this.router.navigate(['/auth/reset-password']);
  }

  /**
   * Handle MFA_CHALLENGE_VERIFIED event
   */
  private async handleMfaChallengeVerified(session: AuthSession | null): Promise<void> {
    if (!session?.user) return;

    console.log('MFA challenge verified for user:', session.user.id);

    this._state.update((s) => ({
      ...s,
      session,
      user: session.user,
      mfaPending: false,
    }));

    // Schedule token refresh and load profile
    this.scheduleTokenRefresh(session);
    await this.loadProfile(session.user.id);
    this.handlePostLogin();
  }

  /**
   * Schedule proactive token refresh before expiration
   */
  private scheduleTokenRefresh(session: AuthSession): void {
    this.clearTokenRefreshTimer();

    if (!session.expires_at) return;

    const expiresAt = session.expires_at * 1000; // Convert to milliseconds
    const now = Date.now();
    const refreshAt = expiresAt - (this.TOKEN_REFRESH_MARGIN_SECONDS * 1000);
    const delay = Math.max(0, refreshAt - now);

    if (delay <= 0) {
      // Token is about to expire or already expired, refresh immediately
      console.log('Token expiring soon, refreshing immediately...');
      this.refreshToken();
      return;
    }

    console.log(`Scheduling token refresh in ${Math.round(delay / 1000)}s (expires at ${new Date(expiresAt).toISOString()})`);

    this.tokenRefreshTimer = setTimeout(() => {
      this.ngZone.run(() => {
        this.refreshToken();
      });
    }, delay);
  }

  /**
   * Clear the token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Proactively refresh the token
   */
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      console.log('Token refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;

    try {
      console.log('Proactively refreshing token...');
      const { data: { session }, error } = await this.supabase.auth.refreshSession();

      if (error) {
        console.error('Error refreshing token:', error);
        // If refresh fails with invalid token, sign out
        if (error.message?.includes('invalid') || error.message?.includes('expired')) {
          await this.handleSessionExpired();
        }
        return;
      }

      if (session) {
        console.log('Token refreshed successfully');
        this._state.update((s) => ({
          ...s,
          session,
          user: session.user,
        }));
        this.scheduleTokenRefresh(session);
      }
    } catch (error) {
      console.error('Error in refreshToken:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    console.log('Session expired, signing out...');

    const toast = await this.toastController.create({
      message: 'Your session has expired. Please sign in again.',
      duration: 4000,
      position: 'top',
      color: 'warning',
    });
    await toast.present();

    this.clearTokenRefreshTimer();

    this._state.update((s) => ({
      ...s,
      session: null,
      user: null,
      profile: null,
      loading: false,
      initialized: true,
      mfaPending: false,
      passwordRecoveryPending: false,
    }));

    this.router.navigate(['/auth/login']);
  }

  /**
   * Initialize session on app start with retry logic
   */
  private async initializeSession(): Promise<void> {
    let attempt = 0;

    while (attempt < this.MAX_RETRY_ATTEMPTS) {
      try {
        const { data: { session }, error } = await this.supabase.auth.getSession();

        if (error) {
          throw error;
        }

        console.log('getSession result:', session ? 'Session exists' : 'No session');

        if (session?.user) {
          // Check if token is expired or about to expire
          if (this.isTokenExpired(session)) {
            console.log('Session token expired, attempting refresh...');
            const refreshResult = await this.supabase.auth.refreshSession();

            if (refreshResult.error || !refreshResult.data.session) {
              console.error('Failed to refresh expired session:', refreshResult.error);
              await this.handleSessionExpired();
              return;
            }

            // Use the refreshed session
            const refreshedSession = refreshResult.data.session;
            console.log('Session refreshed successfully');

            this._state.update((s) => ({
              ...s,
              session: refreshedSession,
              user: refreshedSession.user,
              loading: true,
              initialized: false,
            }));

            this.scheduleTokenRefresh(refreshedSession);
            await this.loadProfile(refreshedSession.user.id);
          } else {
            console.log('Loading profile for user:', session.user.id);

            this._state.update((s) => ({
              ...s,
              session,
              user: session.user,
              loading: true,
              initialized: false,
            }));

            // Schedule proactive token refresh
            this.scheduleTokenRefresh(session);

            // Load profile and wait for it to complete
            await this.loadProfile(session.user.id);
          }

          console.log('Profile loaded, initialized:', this._state().initialized);
        } else {
          // No session - mark as initialized
          this._state.update((s) => ({
            ...s,
            session: null,
            user: null,
            loading: false,
            initialized: true,
          }));

          // Redirect to login if not already on auth page
          const currentUrl = this.router.url;
          console.log('No session, current URL:', currentUrl);
          if (!currentUrl.startsWith('/auth')) {
            this.router.navigate(['/auth/login']);
          }
        }

        // Success - exit retry loop
        return;
      } catch (error) {
        attempt++;
        console.error(`Error getting session (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS}):`, error);

        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          // Wait before retrying
          await this.delay(this.RETRY_DELAY_MS * attempt);
        } else {
          // All retries exhausted - mark as initialized so app doesn't hang
          console.error('All session initialization attempts failed');
          this._state.update((s) => ({
            ...s,
            loading: false,
            initialized: true,
          }));
        }
      }
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  private isTokenExpired(session: AuthSession): boolean {
    if (!session.expires_at) return false;

    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const margin = this.TOKEN_REFRESH_MARGIN_SECONDS * 1000;

    return now >= (expiresAt - margin);
  }

  /**
   * Helper to delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Listen for page visibility changes to handle app resume on mobile
   * On iOS Safari, when user switches apps and comes back, we need to re-verify auth
   */
  private initVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible') {
        console.log('App became visible, re-checking auth state...');
        // Run inside Angular zone
        this.ngZone.run(async () => {
          await this.refreshAuthState();
        });
      }
    });

    // Handle page focus (catches some cases visibility change misses)
    window.addEventListener('focus', async () => {
      console.log('Window focused, checking auth state...');
      this.ngZone.run(async () => {
        await this.refreshAuthState();
      });
    });

    // Handle page show (bfcache restoration on iOS Safari)
    window.addEventListener('pageshow', async (event) => {
      if (event.persisted) {
        console.log('Page restored from bfcache, refreshing auth state...');
        this.ngZone.run(async () => {
          await this.refreshAuthState();
        });
      }
    });

    // Also handle iOS-specific resume events via Capacitor if available
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      import('@capacitor/app').then(({ App }) => {
        App.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            console.log('Capacitor app became active, re-checking auth state...');
            this.ngZone.run(async () => {
              await this.refreshAuthState();
            });
          }
        });

        // Handle URL open events (deep links, OAuth callbacks)
        App.addListener('appUrlOpen', async () => {
          console.log('App URL opened, checking auth state...');
          this.ngZone.run(async () => {
            await this.refreshAuthState();
          });
        });
      }).catch(() => {
        // Capacitor not available (running in browser)
      });
    }
  }

  /**
   * Listen for storage events to sync auth state across tabs
   */
  private initStorageListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('storage', (event) => {
      // Supabase stores session in localStorage with key containing 'supabase'
      if (event.key?.includes('supabase') && event.key?.includes('auth')) {
        console.log('Auth storage changed in another tab, syncing...');
        this.ngZone.run(async () => {
          await this.refreshAuthState();
        });
      }
    });
  }

  /**
   * Listen for network online/offline events
   */
  private initNetworkListener(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', async () => {
      console.log('Network came online, refreshing auth state...');
      this.ngZone.run(async () => {
        // When coming back online, verify session is still valid
        const currentState = this._state();
        if (currentState.user) {
          await this.refreshAuthState();
        }
      });
    });

    window.addEventListener('offline', () => {
      console.log('Network went offline');
      // Could show a toast here if needed
    });
  }

  /**
   * Refresh auth state when app resumes from background
   * This handles iOS Safari's tendency to lose auth state
   */
  private async refreshAuthState(): Promise<void> {
    // Prevent multiple simultaneous refreshes
    if (this.isRefreshing) {
      console.log('Auth state refresh already in progress, skipping...');
      return;
    }

    this.isRefreshing = true;

    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Error refreshing session:', error);
        // Check if it's an auth error that requires re-login
        if (error.message?.includes('invalid') || error.message?.includes('expired') || error.message?.includes('refresh_token')) {
          await this.handleSessionExpired();
        }
        return;
      }

      const currentState = this._state();

      if (session?.user) {
        // Check if token needs refresh
        if (this.isTokenExpired(session)) {
          console.log('Token expired during app resume, refreshing...');
          const refreshResult = await this.supabase.auth.refreshSession();

          if (refreshResult.error || !refreshResult.data.session) {
            console.error('Failed to refresh session:', refreshResult.error);
            await this.handleSessionExpired();
            return;
          }

          const refreshedSession = refreshResult.data.session;
          this._state.update((s) => ({
            ...s,
            session: refreshedSession,
            user: refreshedSession.user,
          }));
          this.scheduleTokenRefresh(refreshedSession);

          // Reload profile if user wasn't set
          if (!currentState.user) {
            await this.loadProfile(refreshedSession.user.id);
          }
        } else if (!currentState.user || currentState.user.id !== session.user.id) {
          // User changed or wasn't set - reload profile
          console.log('Session restored, reloading profile...');
          this._state.update((s) => ({
            ...s,
            session,
            user: session.user,
            loading: true,
          }));
          this.scheduleTokenRefresh(session);
          await this.loadProfile(session.user.id);
        } else {
          // Same user, just update session (might have been refreshed)
          this._state.update((s) => ({
            ...s,
            session,
            user: session.user,
          }));
          // Reschedule token refresh in case timer was lost
          this.scheduleTokenRefresh(session);
        }
      } else if (currentState.user) {
        // Had a user but now no session - handle session loss
        console.log('Session lost during app resume');
        await this.handleSessionExpired();
      }
    } catch (error) {
      console.error('Error in refreshAuthState:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Load user profile from database
   */
  private async loadProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      // Map snake_case to camelCase
      const profile: Profile = {
        id: data.id,
        email: data.email,
        fullName: data.full_name,
        avatarUrl: data.avatar_url,
        role: data.role as UserRole,
        timezone: data.timezone,
        unitsSystem: data.units_system,
        streetAddress: data.street_address,
        city: data.city,
        state: data.state,
        zipCode: data.zip_code,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };

      this._state.update((s) => ({
        ...s,
        profile,
        loading: false,
        initialized: true,
      }));
    } catch (error) {
      console.error('Error loading profile:', error);
      // If profile load fails, sign out to clear bad session
      await this.signOut();
      this._state.update((s) => ({
        ...s,
        user: null,
        session: null,
        profile: null,
        loading: false,
        initialized: true,
      }));
    }
  }

  /**
   * Handle navigation after successful login
   */
  private handlePostLogin(): void {
    const profile = this._state().profile;

    // Check if onboarding is needed
    if (profile && !profile.fullName) {
      this.router.navigate(['/onboarding']);
      return;
    }

    // Check for returnUrl in sessionStorage (set by auth guard)
    const returnUrl = sessionStorage.getItem(this.RETURN_URL_KEY);

    if (returnUrl) {
      sessionStorage.removeItem(this.RETURN_URL_KEY);
      this.router.navigateByUrl(returnUrl);
    } else {
      this.router.navigate(['/tabs/dashboard']);
    }
  }

  /**
   * Store return URL for post-login redirect
   * Called by auth guard when redirecting to login
   */
  setReturnUrl(url: string): void {
    sessionStorage.setItem(this.RETURN_URL_KEY, url);
  }

  /**
   * Sign up with email and password
   */
  async signUp(
    email: string,
    password: string,
    role: UserRole,
    fullName?: string
  ): Promise<{ error: Error | null; rateLimited?: boolean }> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      console.log('[AuthService] Starting signUp:', { email, role, fullName });
      console.log('[AuthService] Supabase client initialized:', !!this.supabase);
      console.log('[AuthService] Environment origin:', window.location.origin);

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      console.log('[AuthService] SignUp response:', { data, error });
      console.log('[AuthService] Session exists?:', !!data?.session);
      console.log('[AuthService] User exists?:', !!data?.user);
      console.log('[AuthService] User ID:', data?.user?.id);
      console.log('[AuthService] User email:', data?.user?.email);
      console.log('[AuthService] User confirmed?:', data?.user?.confirmed_at);

      // First, check if there was an error from Supabase
      if (error) {
        console.error('[AuthService] SignUp error:', error);
        console.error('[AuthService] Error message:', error.message);
        console.error('[AuthService] Error status:', (error as any).status);
        console.error('[AuthService] Full error:', JSON.stringify(error, null, 2));
        throw error;
      }

      // Verify user was actually created - must have both user object and valid ID
      const userCreatedSuccessfully = data?.user && data.user.id && data.user.email;

      if (!userCreatedSuccessfully) {
        // No error but also no user - this can happen during maintenance or connectivity issues
        console.error('[AuthService] SignUp failed: No user returned from API');
        console.error('[AuthService] Data received:', JSON.stringify(data, null, 2));
        throw new Error('Failed to create account. Please try again.');
      }

      console.log('[AuthService] User created successfully with ID:', data.user!.id);

      // Track if we hit rate limiting (for future use if needed)
      const wasRateLimited = false;

      // Check if user was auto-confirmed (should NOT happen in production)
      const session = data.session;
      if (session) {
        console.warn('[AuthService] ⚠️ User was auto-confirmed! Session detected.');
        console.warn('[AuthService] This should NOT happen if email confirmation is enabled in Supabase.');
        console.warn('[AuthService] Signing out to force email verification...');
        // Sign out immediately to prevent auto-login without email verification
        await this.supabase.auth.signOut();
        console.log('[AuthService] User signed out successfully.');

        // Clear any auth state
        this._state.update((s) => ({
          ...s,
          user: null,
          session: null,
          profile: null,
          loading: false,
        }));
      }

      // Note: The database trigger (handle_new_user) automatically creates:
      // 1. A profile in the profiles table with the role
      // 2. A role-specific profile (trainer_profiles or client_profiles)
      // This only happens AFTER email verification in production

      this._state.update((s) => ({ ...s, loading: false }));

      return { error: null, rateLimited: wasRateLimited };
    } catch (error) {
      console.error('[AuthService] SignUp catch block:', error);
      this._state.update((s) => ({ ...s, loading: false }));
      return { error: error as Error, rateLimited: false };
    }
  }

  /**
   * Sign in with email and password
   */
  async signIn(email: string, password: string): Promise<{ error: Error | null }> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const { error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false }));
      return { error: error as Error };
    }
  }

  /**
   * Sign in with OAuth provider
   */
  async signInWithProvider(provider: Provider): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Sign out
   */
  async signOut(): Promise<void> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      await this.supabase.auth.signOut();

      // Clear state
      this._state.set({
        user: null,
        profile: null,
        session: null,
        loading: false,
        initialized: true,
      });

      // Show success toast
      const toast = await this.toastController.create({
        message: 'Signed out successfully',
        duration: 2000,
        position: 'bottom',
        color: 'success',
      });
      await toast.present();

      // Navigate to login
      await this.router.navigate(['/auth/login']);
    } catch (error) {
      console.error('Sign out error:', error);

      // Show error toast
      const toast = await this.toastController.create({
        message: 'Error signing out. Please try again.',
        duration: 3000,
        position: 'bottom',
        color: 'danger',
      });
      await toast.present();

      this._state.update((s) => ({ ...s, loading: false }));
    }
  }

  /**
   * Send password reset email
   */
  async resetPassword(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/verify-email`,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<{ error: Error | null }> {
    try {
      const { error } = await this.supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<Profile>): Promise<{ error: Error | null }> {
    try {
      const userId = this._state().user?.id;
      if (!userId) throw new Error('No user logged in');

      // Map camelCase to snake_case
      const dbUpdates: Record<string, unknown> = {};
      if (updates.fullName !== undefined) dbUpdates['full_name'] = updates.fullName;
      if (updates.avatarUrl !== undefined) dbUpdates['avatar_url'] = updates.avatarUrl;
      if (updates.timezone !== undefined) dbUpdates['timezone'] = updates.timezone;
      if (updates.unitsSystem !== undefined) dbUpdates['units_system'] = updates.unitsSystem;

      const { error } = await this.supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', userId);

      if (error) throw error;

      // Update local state
      this._state.update((s) => ({
        ...s,
        profile: s.profile ? { ...s.profile, ...updates } : null,
      }));

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  }

  /**
   * Manually check and refresh the session if needed
   * Useful for calling before critical operations
   */
  async ensureValidSession(): Promise<{ valid: boolean; error?: Error }> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (!session) {
        return { valid: false, error: new Error('No session') };
      }

      // Check if token is expired or about to expire
      if (this.isTokenExpired(session)) {
        console.log('Token expired, refreshing before operation...');
        const refreshResult = await this.supabase.auth.refreshSession();

        if (refreshResult.error || !refreshResult.data.session) {
          await this.handleSessionExpired();
          return { valid: false, error: refreshResult.error ?? new Error('Failed to refresh session') };
        }

        const refreshedSession = refreshResult.data.session;
        this._state.update((s) => ({
          ...s,
          session: refreshedSession,
          user: refreshedSession.user,
        }));
        this.scheduleTokenRefresh(refreshedSession);
      }

      return { valid: true };
    } catch (error) {
      console.error('Error ensuring valid session:', error);
      return { valid: false, error: error as Error };
    }
  }

  /**
   * Set MFA pending state (called when MFA challenge is required)
   */
  setMfaPending(pending: boolean): void {
    this._state.update((s) => ({
      ...s,
      mfaPending: pending,
    }));
  }

  /**
   * Clear password recovery state after password is reset
   */
  clearPasswordRecoveryState(): void {
    this._state.update((s) => ({
      ...s,
      passwordRecoveryPending: false,
    }));
  }

  /**
   * Get time until token expires (in seconds)
   * Returns null if no session or no expiry info
   */
  getTokenExpiryTime(): number | null {
    const session = this._state().session;
    if (!session?.expires_at) return null;

    const expiresAt = session.expires_at * 1000;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((expiresAt - now) / 1000));

    return remaining;
  }

  /**
   * Force a session refresh (useful for testing or recovery)
   */
  async forceRefreshSession(): Promise<{ error: Error | null }> {
    try {
      const { data: { session }, error } = await this.supabase.auth.refreshSession();

      if (error) throw error;

      if (session) {
        this._state.update((s) => ({
          ...s,
          session,
          user: session.user,
        }));
        this.scheduleTokenRefresh(session);
      }

      return { error: null };
    } catch (error) {
      console.error('Error forcing session refresh:', error);
      return { error: error as Error };
    }
  }
}
