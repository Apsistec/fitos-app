import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, TERMS_OF_SERVICE } from '@fitos/libs';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  template: `
    <fitos-legal-page [document]="termsOfService" />
  `,
})
export class TermsComponent {
  termsOfService = TERMS_OF_SERVICE;
}
