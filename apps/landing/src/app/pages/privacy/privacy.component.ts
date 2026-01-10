import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, PRIVACY_POLICY } from '@fitos/libs';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  template: `
    <fitos-legal-page [document]="privacyPolicy" />
  `,
})
export class PrivacyComponent {
  privacyPolicy = PRIVACY_POLICY;
}
