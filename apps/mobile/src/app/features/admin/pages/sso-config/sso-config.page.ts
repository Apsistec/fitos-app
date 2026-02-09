/**
 * SSO Configuration Management Page
 *
 * Admin interface for Enterprise SSO setup and configuration.
 * Sprint 41: Enterprise Single Sign-On
 */

import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

interface SSOConfig {
  id: string;
  organizationId: string;
  providerType: 'saml' | 'oidc';
  providerName: string;
  enabled: boolean;
  enforceSso: boolean;
  allowJitProvisioning: boolean;
  defaultRole: string;
  roleMapping: Record<string, string>;
  attributeMapping: Record<string, string>;
  sessionDurationMinutes: number;
  idleTimeoutMinutes: number;
  // SAML fields
  samlEntityId?: string;
  samlSsoUrl?: string;
  samlCertificate?: string;
  samlLogoutUrl?: string;
  // OIDC fields
  oidcIssuer?: string;
  oidcClientId?: string;
  oidcClientSecret?: string;
  oidcAuthorizationUrl?: string;
  oidcTokenUrl?: string;
  oidcUserinfoUrl?: string;
}

interface DirectorySyncConfig {
  id: string;
  organizationId: string;
  scimEnabled: boolean;
  scimEndpoint: string;
  scimBearerToken: string;
  autoProvision: boolean;
  autoDeprovision: boolean;
  syncIntervalMinutes: number;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  totalUsersSynced: number;
  totalGroupsSynced: number;
}

@Component({
  selector: 'app-sso-config',
  templateUrl: './sso-config.page.html',
  styleUrls: ['./sso-config.page.scss'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, IonicModule],
})
export class SSOConfigPage implements OnInit {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private alertController = inject(AlertController);
  private toastController = inject(ToastController);

  // State
  organizationId = signal<string>('org_123'); // TODO: Get from auth service
  ssoConfig = signal<SSOConfig | null>(null);
  directorySyncConfig = signal<DirectorySyncConfig | null>(null);
  loading = signal(false);
  saving = signal(false);
  selectedTab = signal<'basic' | 'saml' | 'oidc' | 'scim' | 'audit'>('basic');

  // Forms
  basicForm!: FormGroup;
  samlForm!: FormGroup;
  oidcForm!: FormGroup;
  scimForm!: FormGroup;

  // Computed
  hasConfig = computed(() => !!this.ssoConfig());
  isEnabled = computed(() => this.ssoConfig()?.enabled ?? false);

  ngOnInit() {
    this.initializeForms();
    this.loadConfig();
  }

  /**
   * Initialize all forms
   */
  initializeForms() {
    // Basic configuration
    this.basicForm = this.fb.group({
      providerType: ['saml', Validators.required],
      providerName: ['', Validators.required],
      enabled: [false],
      enforceSso: [false],
      allowJitProvisioning: [true],
      defaultRole: ['client', Validators.required],
      sessionDurationMinutes: [480, [Validators.required, Validators.min(30)]],
      idleTimeoutMinutes: [15, [Validators.required, Validators.min(5)]],
    });

    // SAML configuration
    this.samlForm = this.fb.group({
      samlEntityId: ['', Validators.required],
      samlSsoUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      samlCertificate: ['', Validators.required],
      samlLogoutUrl: ['', Validators.pattern(/^https?:\/\/.+/)],
      samlSignRequests: [false],
    });

    // OIDC configuration
    this.oidcForm = this.fb.group({
      oidcIssuer: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      oidcClientId: ['', Validators.required],
      oidcClientSecret: ['', Validators.required],
      oidcAuthorizationUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      oidcTokenUrl: ['', [Validators.required, Validators.pattern(/^https?:\/\/.+/)]],
      oidcUserinfoUrl: ['', Validators.pattern(/^https?:\/\/.+/)],
      oidcJwksUrl: ['', Validators.pattern(/^https?:\/\/.+/)],
    });

    // SCIM configuration
    this.scimForm = this.fb.group({
      scimEnabled: [false],
      autoProvision: [true],
      autoDeprovision: [true],
      syncIntervalMinutes: [60, [Validators.required, Validators.min(15)]],
    });

    // Watch provider type changes
    this.basicForm.get('providerType')?.valueChanges.subscribe((type) => {
      this.updateFormValidators(type);
    });
  }

  /**
   * Update form validators based on provider type
   */
  updateFormValidators(providerType: 'saml' | 'oidc') {
    if (providerType === 'saml') {
      this.selectedTab.set('saml');
    } else {
      this.selectedTab.set('oidc');
    }
  }

  /**
   * Load SSO configuration
   */
  async loadConfig() {
    this.loading.set(true);
    try {
      const orgId = this.organizationId();

      // Load SSO config
      const ssoConfig = await this.http
        .get<SSOConfig>(`${environment.apiUrl}/sso/config/${orgId}`)
        .toPromise();

      if (ssoConfig) {
        this.ssoConfig.set(ssoConfig);
        this.populateForms(ssoConfig);
      }

      // Load directory sync config
      const syncConfig = await this.http
        .get<DirectorySyncConfig>(`${environment.apiUrl}/scim/config/${orgId}`)
        .toPromise();

      if (syncConfig) {
        this.directorySyncConfig.set(syncConfig);
        this.scimForm.patchValue(syncConfig);
      }
    } catch (error) {
      console.error('Error loading SSO config:', error);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Populate forms with existing config
   */
  populateForms(config: SSOConfig) {
    this.basicForm.patchValue({
      providerType: config.providerType,
      providerName: config.providerName,
      enabled: config.enabled,
      enforceSso: config.enforceSso,
      allowJitProvisioning: config.allowJitProvisioning,
      defaultRole: config.defaultRole,
      sessionDurationMinutes: config.sessionDurationMinutes,
      idleTimeoutMinutes: config.idleTimeoutMinutes,
    });

    if (config.providerType === 'saml') {
      this.samlForm.patchValue({
        samlEntityId: config.samlEntityId,
        samlSsoUrl: config.samlSsoUrl,
        samlCertificate: config.samlCertificate,
        samlLogoutUrl: config.samlLogoutUrl,
      });
    } else {
      this.oidcForm.patchValue({
        oidcIssuer: config.oidcIssuer,
        oidcClientId: config.oidcClientId,
        oidcClientSecret: config.oidcClientSecret,
        oidcAuthorizationUrl: config.oidcAuthorizationUrl,
        oidcTokenUrl: config.oidcTokenUrl,
        oidcUserinfoUrl: config.oidcUserinfoUrl,
      });
    }
  }

  /**
   * Save SSO configuration
   */
  async saveConfig() {
    const providerType = this.basicForm.get('providerType')?.value;

    // Validate appropriate form
    if (providerType === 'saml' && !this.samlForm.valid) {
      await this.showToast('Please fill in all required SAML fields', 'warning');
      return;
    }
    if (providerType === 'oidc' && !this.oidcForm.valid) {
      await this.showToast('Please fill in all required OIDC fields', 'warning');
      return;
    }
    if (!this.basicForm.valid) {
      await this.showToast('Please fill in all required fields', 'warning');
      return;
    }

    this.saving.set(true);
    try {
      const payload = {
        ...this.basicForm.value,
        ...(providerType === 'saml' ? this.samlForm.value : this.oidcForm.value),
      };

      const method = this.hasConfig() ? 'put' : 'post';
      const url = this.hasConfig()
        ? `${environment.apiUrl}/sso/config/${this.ssoConfig()?.id}`
        : `${environment.apiUrl}/sso/config`;

      const result = await this.http[method]<SSOConfig>(url, payload).toPromise();

      if (result) {
        this.ssoConfig.set(result);
        await this.showToast('SSO configuration saved successfully', 'success');
      }
    } catch (error) {
      console.error('Error saving SSO config:', error);
      await this.showToast('Failed to save SSO configuration', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Enable directory sync
   */
  async enableDirectorySync() {
    if (!this.scimForm.valid) {
      await this.showToast('Please fill in all required SCIM fields', 'warning');
      return;
    }

    this.saving.set(true);
    try {
      const payload = {
        organizationId: this.organizationId(),
        ...this.scimForm.value,
      };

      const result = await this.http
        .post<DirectorySyncConfig>(`${environment.apiUrl}/scim/enable`, payload)
        .toPromise();

      if (result) {
        this.directorySyncConfig.set(result);
        await this.showToast('Directory sync enabled successfully', 'success');
        await this.showScimInstructions(result);
      }
    } catch (error) {
      console.error('Error enabling directory sync:', error);
      await this.showToast('Failed to enable directory sync', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Show SCIM setup instructions
   */
  async showScimInstructions(config: DirectorySyncConfig) {
    const alert = await this.alertController.create({
      header: 'SCIM Endpoint Configuration',
      message: `
        <p>Configure your identity provider with the following details:</p>
        <br>
        <p><strong>SCIM Endpoint:</strong><br>${config.scimEndpoint}</p>
        <br>
        <p><strong>Bearer Token:</strong><br>${config.scimBearerToken}</p>
        <br>
        <p class="ion-text-wrap" style="font-size: 0.875rem; color: var(--ion-color-medium);">
          Copy these values to your IdP's SCIM configuration. The bearer token will only be shown once.
        </p>
      `,
      buttons: [
        {
          text: 'Copy Endpoint',
          handler: () => {
            navigator.clipboard.writeText(config.scimEndpoint);
          },
        },
        {
          text: 'Copy Token',
          handler: () => {
            navigator.clipboard.writeText(config.scimBearerToken);
          },
        },
        {
          text: 'Done',
          role: 'cancel',
        },
      ],
    });

    await alert.present();
  }

  /**
   * Test SSO connection
   */
  async testConnection() {
    this.saving.set(true);
    try {
      await this.http
        .post(`${environment.apiUrl}/sso/test`, {
          organizationId: this.organizationId(),
        })
        .toPromise();

      await this.showToast('SSO connection test successful', 'success');
    } catch (error) {
      console.error('Error testing SSO connection:', error);
      await this.showToast('SSO connection test failed', 'danger');
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Download SAML metadata
   */
  async downloadSamlMetadata() {
    try {
      const metadata = await this.http
        .get(`${environment.apiUrl}/sso/metadata/${this.organizationId()}`, {
          responseType: 'text',
        })
        .toPromise();

      const blob = new Blob([metadata || ''], { type: 'text/xml' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'saml-metadata.xml';
      a.click();
      window.URL.revokeObjectURL(url);

      await this.showToast('SAML metadata downloaded', 'success');
    } catch (error) {
      console.error('Error downloading SAML metadata:', error);
      await this.showToast('Failed to download metadata', 'danger');
    }
  }

  /**
   * Navigate to audit log
   */
  viewAuditLog() {
    this.router.navigate(['/admin/sso/audit']);
  }

  /**
   * Show toast message
   */
  private async showToast(message: string, color: string) {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top',
    });
    await toast.present();
  }
}
