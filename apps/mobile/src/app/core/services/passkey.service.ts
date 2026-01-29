import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
  platformAuthenticatorIsAvailable,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from '@simplewebauthn/browser';

export interface Passkey {
  id: string;
  name: string;
  deviceType: 'singleDevice' | 'multiDevice';
  backedUp: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
}

export interface PasskeySession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: {
    id: string;
    email: string;
    user_metadata: {
      full_name: string;
      role: string;
    };
  };
}

@Injectable({
  providedIn: 'root',
})
export class PasskeyService {
  private supabase = inject(SupabaseService);

  // State signals
  private _isSupported = signal<boolean | null>(null);
  private _isPlatformAvailable = signal<boolean | null>(null);
  private _passkeys = signal<Passkey[]>([]);
  private _loading = signal(false);

  // Public computed signals
  readonly isSupported = computed(() => this._isSupported());
  readonly isPlatformAvailable = computed(() => this._isPlatformAvailable());
  readonly passkeys = this._passkeys.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly hasPasskeys = computed(() => this._passkeys().length > 0);

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if WebAuthn is supported in the current browser
   */
  private async checkSupport(): Promise<void> {
    try {
      const supported = browserSupportsWebAuthn();
      this._isSupported.set(supported);

      if (supported) {
        const platformAvailable = await platformAuthenticatorIsAvailable();
        this._isPlatformAvailable.set(platformAvailable);
      } else {
        this._isPlatformAvailable.set(false);
      }
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      this._isSupported.set(false);
      this._isPlatformAvailable.set(false);
    }
  }

  /**
   * Load user's registered passkeys
   */
  async loadPasskeys(): Promise<void> {
    try {
      this._loading.set(true);

      const { data, error } = await this.supabase
        .from('passkeys')
        .select('id, name, device_type, backed_up, created_at, last_used_at')
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet - just log and continue
        console.warn('Error loading passkeys (table may not exist):', error.message);
        this._passkeys.set([]);
        return;
      }

      this._passkeys.set(
        (data || []).map((pk) => ({
          id: pk.id,
          name: pk.name,
          deviceType: pk.device_type as 'singleDevice' | 'multiDevice',
          backedUp: pk.backed_up,
          createdAt: new Date(pk.created_at),
          lastUsedAt: pk.last_used_at ? new Date(pk.last_used_at) : null,
        }))
      );
    } catch (error) {
      // Don't throw - just log and set empty array
      console.error('Error loading passkeys:', error);
      this._passkeys.set([]);
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Register a new passkey for the current user
   */
  async registerPasskey(name?: string): Promise<{ success: boolean; passkey?: Passkey; error?: string }> {
    try {
      this._loading.set(true);

      // Get the current session to ensure we have a valid token
      const { data: sessionData } = await this.supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No active session. Please sign in again.');
      }

      console.log('[Passkey] Session found, access token present:', !!sessionData.session.access_token);

      // Step 1: Get registration options from server
      console.log('[Passkey] Calling passkey-register-options edge function...');
      const { data: optionsData, error: optionsError } = await this.supabase.functions.invoke(
        'passkey-register-options',
        {
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      console.log('[Passkey] Response:', { optionsData, optionsError });

      if (optionsError || !optionsData) {
        console.error('[Passkey] Edge function error:', {
          message: optionsError?.message,
          name: optionsError?.name,
          context: optionsError?.context,
          status: (optionsError as any)?.status,
          details: optionsError,
        });
        throw new Error(optionsError?.message || 'Failed to get registration options');
      }

      const options = optionsData as PublicKeyCredentialCreationOptionsJSON;

      // Step 2: Start registration with authenticator
      let registrationResponse: RegistrationResponseJSON;
      try {
        registrationResponse = await startRegistration({ optionsJSON: options });
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'NotAllowedError') {
          return { success: false, error: 'Registration was cancelled or not allowed' };
        }
        if (err.name === 'InvalidStateError') {
          return { success: false, error: 'This passkey is already registered' };
        }
        throw error;
      }

      // Step 3: Verify registration with server
      const { data: verifyData, error: verifyError } = await this.supabase.functions.invoke(
        'passkey-register-verify',
        {
          body: {
            response: registrationResponse,
            name: name || this.getDefaultPasskeyName(),
          },
          headers: {
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
        }
      );

      if (verifyError || !verifyData?.verified) {
        throw new Error(verifyError?.message || verifyData?.error || 'Registration verification failed');
      }

      const newPasskey: Passkey = {
        id: verifyData.passkey.id,
        name: verifyData.passkey.name,
        deviceType: verifyData.passkey.deviceType,
        backedUp: verifyData.passkey.backedUp,
        createdAt: new Date(),
        lastUsedAt: null,
      };

      // Update local state
      this._passkeys.update((current) => [newPasskey, ...current]);

      return { success: true, passkey: newPasskey };
    } catch (error) {
      console.error('Error registering passkey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to register passkey',
      };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Authenticate using a passkey
   */
  async authenticateWithPasskey(email?: string): Promise<{ success: boolean; session?: PasskeySession; error?: string }> {
    try {
      this._loading.set(true);

      // Step 1: Get authentication options from server
      const { data: optionsData, error: optionsError } = await this.supabase.functions.invoke(
        'passkey-auth-options',
        {
          body: email ? { email } : {},
        }
      );

      if (optionsError || !optionsData) {
        throw new Error(optionsError?.message || 'Failed to get authentication options');
      }

      const options = optionsData as PublicKeyCredentialRequestOptionsJSON;

      // Step 2: Start authentication with authenticator
      let authenticationResponse: AuthenticationResponseJSON;
      try {
        authenticationResponse = await startAuthentication({ optionsJSON: options });
      } catch (error: unknown) {
        const err = error as { name?: string; message?: string };
        if (err.name === 'NotAllowedError') {
          return { success: false, error: 'Authentication was cancelled or not allowed' };
        }
        throw error;
      }

      // Step 3: Verify authentication with server
      const { data: verifyData, error: verifyError } = await this.supabase.functions.invoke(
        'passkey-auth-verify',
        {
          body: { response: authenticationResponse },
        }
      );

      if (verifyError || !verifyData?.verified) {
        throw new Error(verifyError?.message || verifyData?.error || 'Authentication verification failed');
      }

      return { success: true, session: verifyData.session };
    } catch (error) {
      console.error('Error authenticating with passkey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to authenticate with passkey',
      };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Delete a passkey
   */
  async deletePasskey(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      this._loading.set(true);

      const { error } = await this.supabase.from('passkeys').delete().eq('id', id);

      if (error) throw error;

      // Update local state
      this._passkeys.update((current) => current.filter((pk) => pk.id !== id));

      return { success: true };
    } catch (error) {
      console.error('Error deleting passkey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete passkey',
      };
    } finally {
      this._loading.set(false);
    }
  }

  /**
   * Rename a passkey
   */
  async renamePasskey(id: string, newName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase.from('passkeys').update({ name: newName }).eq('id', id);

      if (error) throw error;

      // Update local state
      this._passkeys.update((current) =>
        current.map((pk) => (pk.id === id ? { ...pk, name: newName } : pk))
      );

      return { success: true };
    } catch (error) {
      console.error('Error renaming passkey:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to rename passkey',
      };
    }
  }

  /**
   * Get a default name for the passkey based on platform
   */
  private getDefaultPasskeyName(): string {
    const ua = navigator.userAgent.toLowerCase();

    if (ua.includes('iphone') || ua.includes('ipad')) {
      return 'iPhone/iPad';
    }
    if (ua.includes('mac')) {
      return 'Mac';
    }
    if (ua.includes('android')) {
      return 'Android Device';
    }
    if (ua.includes('windows')) {
      return 'Windows PC';
    }
    if (ua.includes('linux')) {
      return 'Linux Device';
    }

    return 'Passkey';
  }
}
