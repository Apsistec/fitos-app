/**
 * Enterprise SSO Service
 *
 * Handles SAML 2.0 and OIDC authentication flows.
 * Sprint 41: Enterprise Single Sign-On
 */

import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, from } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { Browser } from '@capacitor/browser';
import { App } from '@capacitor/app';

export interface SSOInitiateRequest {
  organizationId: string;
  providerType: 'saml' | 'oidc';
  relayState?: string;
}

export interface SSOInitiateResponse {
  redirectUrl: string;
  state?: string;
  nonce?: string;
}

export interface SSOSession {
  sessionId: string;
  userId: string;
  organizationId: string;
  expiresAt: string;
  providerType: 'saml' | 'oidc';
}

export interface SSOConfig {
  id: string;
  organizationId: string;
  providerType: 'saml' | 'oidc';
  providerName: string;
  enabled: boolean;
  enforceSso: boolean;
  allowJitProvisioning: boolean;
  defaultRole: string;
}

@Injectable({
  providedIn: 'root',
})
export class SSOService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/sso`;

  private currentSessionSubject = new BehaviorSubject<SSOSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.loadStoredSession();
    this.setupDeepLinkListener();
  }

  /**
   * Initiate SSO login flow
   */
  initiateSSOLogin(request: SSOInitiateRequest): Observable<void> {
    return this.http.post<SSOInitiateResponse>(`${this.baseUrl}/initiate`, request).pipe(
      tap(async (response) => {
        // Store state/nonce for validation
        if (response.state) {
          localStorage.setItem('sso_state', response.state);
        }
        if (response.nonce) {
          localStorage.setItem('sso_nonce', response.nonce);
        }

        // Open IdP login page
        await Browser.open({
          url: response.redirectUrl,
          windowName: '_self',
        });
      }),
      map(() => void 0)
    );
  }

  /**
   * Handle SSO callback (after IdP authentication)
   */
  handleCallback(sessionId: string): Observable<SSOSession> {
    return this.getSession(sessionId).pipe(
      tap((session) => {
        this.setSession(session);
        this.clearStoredState();
      })
    );
  }

  /**
   * Get SSO session
   */
  getSession(sessionId: string): Observable<SSOSession> {
    return this.http.get<SSOSession>(`${this.baseUrl}/session/${sessionId}`);
  }

  /**
   * Refresh OIDC session
   */
  refreshSession(sessionId: string): Observable<void> {
    return this.http.post<{ success: boolean }>(`${this.baseUrl}/session/${sessionId}/refresh`, {}).pipe(
      map(() => void 0)
    );
  }

  /**
   * Logout from SSO session
   */
  logout(): Observable<{ success: boolean; logoutUrl?: string }> {
    const session = this.currentSessionSubject.value;
    if (!session) {
      return from(Promise.resolve({ success: false }));
    }

    return this.http.post<{ success: boolean; logoutUrl?: string }>(
      `${this.baseUrl}/logout`,
      { session_id: session.sessionId }
    ).pipe(
      tap(async (response) => {
        this.clearSession();

        // If IdP logout URL provided, open it
        if (response.logoutUrl) {
          await Browser.open({
            url: response.logoutUrl,
            windowName: '_self',
          });
        }
      })
    );
  }

  /**
   * Check if SSO is enforced for organization
   */
  isSSOEnforced(organizationId: string): Observable<boolean> {
    return this.http.get<SSOConfig>(`${this.baseUrl}/config/${organizationId}`).pipe(
      map((config) => config.enforceSso),
      catchError(() => from(Promise.resolve(false)))
    );
  }

  /**
   * Get SSO configuration for organization
   */
  getSSOConfig(organizationId: string): Observable<SSOConfig | null> {
    return this.http.get<SSOConfig>(`${this.baseUrl}/config/${organizationId}`).pipe(
      catchError(() => from(Promise.resolve(null)))
    );
  }

  /**
   * Set current SSO session
   */
  private setSession(session: SSOSession): void {
    this.currentSessionSubject.next(session);
    localStorage.setItem('sso_session', JSON.stringify(session));
  }

  /**
   * Clear current SSO session
   */
  private clearSession(): void {
    this.currentSessionSubject.next(null);
    localStorage.removeItem('sso_session');
  }

  /**
   * Load stored session from localStorage
   */
  private loadStoredSession(): void {
    const stored = localStorage.getItem('sso_session');
    if (stored) {
      try {
        const session = JSON.parse(stored) as SSOSession;

        // Check if session is expired
        const expiresAt = new Date(session.expiresAt);
        if (expiresAt > new Date()) {
          this.currentSessionSubject.next(session);
        } else {
          this.clearSession();
        }
      } catch (e) {
        console.error('Error loading stored SSO session:', e);
        this.clearSession();
      }
    }
  }

  /**
   * Clear stored state/nonce
   */
  private clearStoredState(): void {
    localStorage.removeItem('sso_state');
    localStorage.removeItem('sso_nonce');
  }

  /**
   * Setup deep link listener for SSO callback
   */
  private setupDeepLinkListener(): void {
    App.addListener('appUrlOpen', (data) => {
      const url = new URL(data.url);

      // Check if this is an SSO callback
      if (url.pathname.includes('/auth/callback')) {
        const sessionId = url.searchParams.get('session');
        if (sessionId) {
          this.handleCallback(sessionId).subscribe({
            next: () => {
              console.log('SSO login successful');
            },
            error: (error) => {
              console.error('SSO callback error:', error);
            },
          });
        }
      }
    });
  }

  /**
   * Get current session
   */
  getCurrentSession(): SSOSession | null {
    return this.currentSessionSubject.value;
  }

  /**
   * Check if user is authenticated via SSO
   */
  isAuthenticated(): boolean {
    const session = this.currentSessionSubject.value;
    if (!session) return false;

    // Check expiration
    const expiresAt = new Date(session.expiresAt);
    return expiresAt > new Date();
  }

  /**
   * Auto-refresh OIDC session before expiration
   */
  setupAutoRefresh(): void {
    const session = this.currentSessionSubject.value;
    if (!session || session.providerType !== 'oidc') return;

    const expiresAt = new Date(session.expiresAt);
    const now = new Date();
    const msUntilExpiry = expiresAt.getTime() - now.getTime();

    // Refresh 5 minutes before expiration
    const refreshIn = msUntilExpiry - 5 * 60 * 1000;

    if (refreshIn > 0) {
      setTimeout(() => {
        this.refreshSession(session.sessionId).subscribe({
          next: () => {
            console.log('SSO session refreshed');
            this.setupAutoRefresh(); // Setup next refresh
          },
          error: (error) => {
            console.error('Failed to refresh SSO session:', error);
          },
        });
      }, refreshIn);
    }
  }
}
