import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: 'fitos-auth',
        // Use a no-op lock function to avoid NavigatorLock errors in development
        lock: async (name, acquireTimeout, fn) => {
          // Simply execute the function without locking
          return await fn();
        },
      },
    });
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
  rpc<T>(fn: string, params?: object) {
    return this.supabase.rpc(fn, params);
  }
}
