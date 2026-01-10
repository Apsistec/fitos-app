import { LegalDocument } from './privacy-policy';

export const COOKIE_POLICY: LegalDocument = {
  title: 'Cookie Policy',
  lastUpdated: '2026-01-10',
  sections: [
    {
      title: 'What Are Cookies',
      content: `
        <p>Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.</p>
        <p>FitOS uses cookies and similar technologies (such as local storage and session storage) to enhance your experience, analyze usage, and provide personalized features.</p>
      `,
    },
    {
      title: 'Types of Cookies We Use',
      content: `
        <h3>Essential Cookies</h3>
        <p>These cookies are necessary for the website to function and cannot be switched off. They include:</p>
        <ul>
          <li><strong>Authentication:</strong> Keep you logged in and remember your session</li>
          <li><strong>Security:</strong> Protect against fraud and abuse</li>
          <li><strong>Preferences:</strong> Remember your language and region settings</li>
        </ul>

        <h3>Analytics Cookies</h3>
        <p>We use analytics cookies to understand how visitors use our website:</p>
        <ul>
          <li><strong>Google Analytics 4:</strong> Track page views, user interactions, and conversion events</li>
          <li><strong>Performance Monitoring:</strong> Identify errors and performance issues</li>
        </ul>

        <h3>Functional Cookies</h3>
        <p>These cookies enhance functionality and personalization:</p>
        <ul>
          <li><strong>Theme Preference:</strong> Remember your dark/light mode choice</li>
          <li><strong>Recent Searches:</strong> Save your recent workout or food searches</li>
          <li><strong>Form Data:</strong> Temporarily store form inputs to prevent data loss</li>
        </ul>

        <h3>Marketing Cookies</h3>
        <p>With your consent, we use marketing cookies to:</p>
        <ul>
          <li><strong>Google Ads:</strong> Track conversions from paid advertising</li>
          <li><strong>Facebook Pixel:</strong> Measure ad effectiveness and retarget visitors</li>
          <li><strong>Email Tracking:</strong> Track email opens and clicks (for trainers using email marketing)</li>
        </ul>
      `,
    },
    {
      title: 'Third-Party Cookies',
      content: `
        <p>Some cookies are placed by third-party services that appear on our pages:</p>
        <ul>
          <li><strong>Stripe:</strong> Payment processing and fraud detection</li>
          <li><strong>Google:</strong> Analytics, advertising, and reCAPTCHA</li>
          <li><strong>Facebook:</strong> Social media integration and advertising</li>
        </ul>
        <p>These third parties have their own privacy policies. We encourage you to review them:</p>
        <ul>
          <li><a href="https://stripe.com/privacy" target="_blank">Stripe Privacy Policy</a></li>
          <li><a href="https://policies.google.com/privacy" target="_blank">Google Privacy Policy</a></li>
          <li><a href="https://www.facebook.com/privacy/policy" target="_blank">Facebook Privacy Policy</a></li>
        </ul>
      `,
    },
    {
      title: 'Local Storage and Session Storage',
      content: `
        <p>In addition to cookies, we use browser storage mechanisms:</p>
        <ul>
          <li><strong>Local Storage:</strong> Persist data across browser sessions (theme preference, recent workouts)</li>
          <li><strong>Session Storage:</strong> Temporary storage cleared when you close the browser (draft forms, navigation state)</li>
          <li><strong>IndexedDB:</strong> Offline data storage for mobile app functionality</li>
        </ul>
      `,
    },
    {
      title: 'Managing Cookies',
      content: `
        <h3>Browser Controls</h3>
        <p>Most web browsers allow you to control cookies through settings. You can:</p>
        <ul>
          <li>Block all cookies</li>
          <li>Delete existing cookies</li>
          <li>Allow cookies from specific websites only</li>
          <li>Set cookies to be deleted when you close the browser</li>
        </ul>

        <p>Here's how to manage cookies in popular browsers:</p>
        <ul>
          <li><a href="https://support.google.com/chrome/answer/95647" target="_blank">Google Chrome</a></li>
          <li><a href="https://support.mozilla.org/en-US/kb/enhanced-tracking-protection-firefox-desktop" target="_blank">Mozilla Firefox</a></li>
          <li><a href="https://support.apple.com/guide/safari/manage-cookies-sfri11471/mac" target="_blank">Safari</a></li>
          <li><a href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09" target="_blank">Microsoft Edge</a></li>
        </ul>

        <h3>FitOS Cookie Preferences</h3>
        <p>When you first visit our website, we'll ask for your consent to use optional cookies. You can change your preferences at any time by:</p>
        <ul>
          <li>Clicking the "Cookie Preferences" link in the footer</li>
          <li>Adjusting settings in your account preferences (if logged in)</li>
        </ul>

        <h3>Impact of Disabling Cookies</h3>
        <p><strong>Please note:</strong> If you disable essential cookies, some parts of our website may not function correctly. For example:</p>
        <ul>
          <li>You will not be able to stay logged in</li>
          <li>Your preferences will not be saved</li>
          <li>Form submissions may fail</li>
        </ul>
      `,
    },
    {
      title: 'Cookie Lifespan',
      content: `
        <p>Cookies have different lifespans:</p>
        <ul>
          <li><strong>Session Cookies:</strong> Deleted when you close your browser</li>
          <li><strong>Persistent Cookies:</strong> Remain for a set period (e.g., 30 days, 1 year, 2 years)</li>
        </ul>

        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Cookie Name</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Type</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #e5e7eb;">Lifespan</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">sb-auth-token</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Essential</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">7 days</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">fitos-theme</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Functional</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">1 year</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">_ga</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Analytics</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">2 years</td>
            </tr>
            <tr>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">_gcl_au</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">Marketing</td>
              <td style="padding: 12px; border: 1px solid #e5e7eb;">90 days</td>
            </tr>
          </tbody>
        </table>
      `,
    },
    {
      title: 'Updates to This Policy',
      content: `
        <p>We may update this Cookie Policy from time to time to reflect changes in technology, law, or our business practices. We will notify you of significant changes by posting the updated policy on this page with a new "Last Updated" date.</p>
      `,
    },
    {
      title: 'Contact Us',
      content: `
        <p>If you have questions about our use of cookies, please contact us:</p>
        <ul>
          <li>Email: <a href="mailto:privacy@fitos.app">privacy@fitos.app</a></li>
          <li>Website: <a href="https://fitos.app/contact">https://fitos.app/contact</a></li>
        </ul>
      `,
    },
  ],
};
