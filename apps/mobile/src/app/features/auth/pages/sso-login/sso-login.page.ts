/**
 * SSO Login Page
 *
 * Enterprise Single Sign-On login interface.
 * Sprint 41: Enterprise SSO
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { SSOService } from '../../../../core/services/sso.service';

@Component({
  selector: 'app-sso-login',
  templateUrl: './sso-login.page.html',
  styleUrls: ['./sso-login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class SSOLoginPage implements OnInit {
  private ssoService = inject(SSOService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  organizationId = signal<string>('');
  loading = signal(false);
  error = signal<string | null>(null);
  ssoConfig = signal<Record<string, unknown> | null>(null);

  ngOnInit() {
    // Get organization ID from query params
    const orgId = this.route.snapshot.queryParamMap.get('org');
    if (orgId) {
      this.organizationId.set(orgId);
      this.loadSSOConfig(orgId);
    }
  }

  /**
   * Load SSO configuration
   */
  private loadSSOConfig(organizationId: string) {
    this.loading.set(true);
    this.ssoService.getSSOConfig(organizationId).subscribe({
      next: (config) => {
        this.ssoConfig.set(config);
        this.loading.set(false);

        if (!config || !config.enabled) {
          this.error.set('SSO is not configured for this organization');
        }
      },
      error: (err) => {
        console.error('Error loading SSO config:', err);
        this.error.set('Failed to load SSO configuration');
        this.loading.set(false);
      },
    });
  }

  /**
   * Initiate SSO login
   */
  loginWithSSO() {
    const config = this.ssoConfig();
    if (!config || !this.organizationId()) return;

    this.loading.set(true);
    this.error.set(null);

    this.ssoService
      .initiateSSOLogin({
        organizationId: this.organizationId(),
        providerType: config.providerType,
      })
      .subscribe({
        next: () => {
          // Browser will open IdP login page
          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error initiating SSO login:', err);
          this.error.set('Failed to initiate SSO login');
          this.loading.set(false);
        },
      });
  }

  /**
   * Navigate to standard login
   */
  useStandardLogin() {
    this.router.navigate(['/auth/login']);
  }

  /**
   * Get provider display name
   */
  getProviderName(): string {
    const config = this.ssoConfig();
    if (!config) return '';

    const providerNames: Record<string, string> = {
      okta: 'Okta',
      azure_ad: 'Microsoft Azure AD',
      google_workspace: 'Google Workspace',
      onelogin: 'OneLogin',
      auth0: 'Auth0',
    };

    return providerNames[config.providerName] || config.providerName;
  }

  /**
   * Get provider icon
   */
  getProviderIcon(): string {
    const config = this.ssoConfig();
    if (!config) return 'key-outline';

    const icons: Record<string, string> = {
      okta: 'shield-checkmark-outline',
      azure_ad: 'logo-microsoft',
      google_workspace: 'logo-google',
      onelogin: 'shield-outline',
      auth0: 'lock-closed-outline',
    };

    return icons[config.providerName] || 'key-outline';
  }
}
