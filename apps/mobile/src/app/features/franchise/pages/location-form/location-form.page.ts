/**
 * Location Form Page
 *
 * Form for creating or editing location details
 * - Create new location (branch, franchise)
 * - Edit existing location
 * - Address, contact information, operating hours
 *
 * Sprint 40: Multi-Location Management
 */

import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router, ActivatedRoute } from '@angular/router';
import { FranchiseService } from '../../services/franchise.service';
import { Location } from '../../models/franchise.models';

@Component({
  selector: 'app-location-form',
  templateUrl: './location-form.page.html',
  styleUrls: ['./location-form.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
})
export class LocationFormPage implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private franchiseService = inject(FranchiseService);

  locationForm!: FormGroup;
  loading = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);
  isEditMode = signal(false);
  locationId = signal<string | null>(null);

  // Form sections
  showAdvancedSettings = signal(false);

  ngOnInit() {
    this.initializeForm();

    // Check if editing existing location
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode.set(true);
      this.locationId.set(id);
      this.loadLocation(id);
    }
  }

  /**
   * Initialize form with validators
   */
  private initializeForm() {
    this.locationForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      locationType: ['branch', Validators.required],

      // Address
      addressLine1: [''],
      addressLine2: [''],
      city: [''],
      state: [''],
      postalCode: [''],
      country: ['US'],
      timezone: ['America/New_York', Validators.required],

      // Contact
      phone: [''],
      email: ['', Validators.email],
      website: [''],

      // Geolocation
      latitude: [null],
      longitude: [null],

      // Status
      status: ['active', Validators.required],
      openedDate: [''],
    });

    // Auto-generate slug from name
    this.locationForm.get('name')?.valueChanges.subscribe((name) => {
      if (!this.isEditMode() && name) {
        const slug = name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        this.locationForm.patchValue({ slug }, { emitEvent: false });
      }
    });
  }

  /**
   * Load existing location for editing
   */
  private loadLocation(id: string) {
    this.loading.set(true);
    this.franchiseService.getLocation(id).subscribe({
      next: (location) => {
        this.populateForm(location);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading location:', err);
        this.error.set('Failed to load location');
        this.loading.set(false);
      },
    });
  }

  /**
   * Populate form with location data
   */
  private populateForm(location: Location) {
    this.locationForm.patchValue({
      name: location.name,
      slug: location.slug,
      locationType: location.locationType,
      addressLine1: location.addressLine1,
      addressLine2: location.addressLine2,
      city: location.city,
      state: location.state,
      postalCode: location.postalCode,
      country: location.country,
      timezone: location.timezone,
      phone: location.phone,
      email: location.email,
      website: location.website,
      latitude: location.latitude,
      longitude: location.longitude,
      status: location.status,
      openedDate: location.openedDate,
    });
  }

  /**
   * Save location (create or update)
   */
  async saveLocation() {
    if (this.locationForm.invalid) {
      this.locationForm.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.error.set(null);

    const formData = this.locationForm.value;
    const organization = this.franchiseService.getCurrentOrganization();

    if (!organization) {
      this.error.set('No organization selected');
      this.saving.set(false);
      return;
    }

    const locationData = {
      ...formData,
      organizationId: organization.id,
    };

    if (this.isEditMode()) {
      // TODO: Implement update API
      console.log('Update location:', locationData);
      this.saving.set(false);
      this.router.navigate(['/franchise/dashboard']);
    } else {
      this.franchiseService.createLocation(locationData).subscribe({
        next: (location) => {
          console.log('Location created:', location);
          this.saving.set(false);
          this.router.navigate(['/franchise/dashboard']);
        },
        error: (err) => {
          console.error('Error creating location:', err);
          this.error.set('Failed to create location');
          this.saving.set(false);
        },
      });
    }
  }

  /**
   * Cancel and go back
   */
  cancel() {
    this.router.navigate(['/franchise/dashboard']);
  }

  /**
   * Toggle advanced settings
   */
  toggleAdvancedSettings() {
    this.showAdvancedSettings.set(!this.showAdvancedSettings());
  }

  /**
   * Get form control error message
   */
  getErrorMessage(fieldName: string): string {
    const control = this.locationForm.get(fieldName);
    if (!control || !control.touched || !control.errors) {
      return '';
    }

    if (control.errors['required']) {
      return `${fieldName} is required`;
    }
    if (control.errors['minlength']) {
      return `${fieldName} must be at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors['email']) {
      return 'Invalid email format';
    }
    if (control.errors['pattern']) {
      return 'Invalid format (use lowercase letters, numbers, and hyphens only)';
    }

    return 'Invalid value';
  }
}
