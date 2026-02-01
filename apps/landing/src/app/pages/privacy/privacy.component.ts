import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, PRIVACY_POLICY } from '../../../../../../libs/src/index';

@Component({
  selector: 'app-privacy',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-legal-page [document]="privacyPolicy" />
  `,
})
export class PrivacyComponent {
  privacyPolicy = PRIVACY_POLICY;
}
