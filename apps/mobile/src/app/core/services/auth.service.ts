import { Injectable, inject, signal, computed } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
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
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase = inject(SupabaseService);
  private router = inject(Router);

  private readonly RETURN_URL_KEY = 'fitos_return_url';

  // Signals for reactive state
  private _state = signal<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    initialized: false,
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

  /**
   * Wait for auth initialization to complete
   * Returns a promise that resolves when auth is initialized
   */
  async waitForInitialization(): Promise<void> {
    if (this._state().initialized) {
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this._state().initialized) {
          clearInterval(checkInterval);
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
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this._state.update((s) => ({
        ...s,
        session,
        user: session?.user ?? null,
        loading: !!session?.user, // Still loading if we have user (need profile)
        initialized: !session?.user, // Initialized if no user
      }));

      if (session?.user) {
        this.loadProfile(session.user.id);
      }
    });

    // Listen for auth changes
    this.supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: AuthSession | null) => {
        console.log('Auth state changed:', event);

        this._state.update((s) => ({
          ...s,
          session,
          user: session?.user ?? null,
        }));

        if (event === 'SIGNED_IN' && session?.user) {
          await this.loadProfile(session.user.id);
          this.handlePostLogin();
        } else if (event === 'SIGNED_OUT') {
          this._state.update((s) => ({
            ...s,
            profile: null,
            loading: false,
            initialized: true,
          }));
          this.router.navigate(['/auth/login']);
        }
      }
    );
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
      this._state.update((s) => ({
        ...s,
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
  ): Promise<{ error: Error | null }> {
    try {
      this._state.update((s) => ({ ...s, loading: true }));

      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });

      if (error) throw error;

      // Update role in profile (trigger creates profile, but we need to set role)
      if (data.user) {
        await this.supabase
          .from('profiles')
          .update({ role, full_name: fullName })
          .eq('id', data.user.id);

        // Create role-specific profile
        if (role === 'trainer') {
          await this.supabase.from('trainer_profiles').insert({ id: data.user.id });
        } else if (role === 'gym_owner') {
          // Gym owners use trainer_profiles (they can also train)
          // and will create a facility during onboarding
          await this.supabase.from('trainer_profiles').insert({ id: data.user.id });
        } else {
          // Clients
          await this.supabase.from('client_profiles').insert({ id: data.user.id });
        }
      }

      return { error: null };
    } catch (error) {
      this._state.update((s) => ({ ...s, loading: false }));
      return { error: error as Error };
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
    await this.supabase.auth.signOut();
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
}
