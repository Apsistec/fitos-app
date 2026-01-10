import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LegalPageComponent, COOKIE_POLICY } from '../../../../../../libs/src/index';

@Component({
  selector: 'app-cookies',
  standalone: true,
  imports: [CommonModule, LegalPageComponent],
  template: `
    <lib-legal-page [document]="cookiePolicy" />
  `,
})
export class CookiesComponent {
  cookiePolicy = COOKIE_POLICY;
}
