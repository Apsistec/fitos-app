import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, PRIVACY_POLICY } from '../../../../../../libs/src/index';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  template: `
    <lib-legal-page [document]="privacyPolicy" />
  `,
})
export class PrivacyComponent {
  privacyPolicy = PRIVACY_POLICY;
}
