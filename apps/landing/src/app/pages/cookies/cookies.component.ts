import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, COOKIE_POLICY } from '@fitos/libs';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  template: `
    <fitos-legal-page [document]="cookiePolicy" />
  `,
})
export class CookiesComponent {
  cookiePolicy = COOKIE_POLICY;
}
