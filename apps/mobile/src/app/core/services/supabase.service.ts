import { Injectable, isDevMode } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    // Build auth config — NavigatorLock is only disabled in development.
    // In production, NavigatorLock prevents concurrent tab token refresh races.
    const authConfig: Record<string, unknown> = {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: 'fitos-auth',
    };

    // Dev-only: bypass NavigatorLock which may error in HMR / SSR contexts
    if (!environment.production) {
      authConfig['lock'] = async (_name: string, _acquireTimeout: number, fn: () => Promise<unknown>) => {
        return await fn();
      };
      if (isDevMode()) console.log('[SupabaseService] NavigatorLock bypassed (dev mode)');
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: authConfig,
    } as any);
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get auth() {
    return this.supabase.auth;
  }

  get storage() {
    return this.supabase.storage;
  }

  get functions() {
    return this.supabase.functions;
  }

  // Typed query helpers
  from<T extends string>(table: T) {
    return this.supabase.from(table);
  }

  // RPC calls
  rpc(fn: string, params?: object) {
    return this.supabase.rpc(fn, params);
  }
}
