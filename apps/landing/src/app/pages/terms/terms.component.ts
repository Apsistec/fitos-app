import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, TERMS_OF_SERVICE } from '../../../../../../libs/src/index';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <lib-legal-page [document]="termsOfService" />
  `,
})
export class TermsComponent {
  termsOfService = TERMS_OF_SERVICE;
}
