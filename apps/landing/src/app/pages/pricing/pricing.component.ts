import { Component } from '@angular/core';

@Component({
  selector: 'app-pricing',
  standalone: true,
  template: `
    <div class="py-24">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 class="section-title text-center mb-4">Simple Pricing</h1>
        <p class="section-subtitle text-center mb-16">
          Unlimited clients. No per-client fees. No surprises.
        </p>
        <!-- Pricing details coming soon -->
      </div>
    </div>
  `,
})
export class PricingComponent {}
