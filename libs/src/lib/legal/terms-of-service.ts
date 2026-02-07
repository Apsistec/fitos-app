import { LegalDocument } from './privacy-policy';

export const TERMS_OF_SERVICE: LegalDocument = {
  title: 'Terms of Service',
  lastUpdated: '2026-01-10',
  sections: [
    {
      title: 'Agreement to Terms',
      content: `
        <p>By accessing or using FitOS ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.</p>
        <p>These Terms apply to all users of the Service, including trainers, clients, and gym owners.</p>
      `,
    },
    {
      title: 'User Accounts',
      content: `
        <h3>Account Creation</h3>
        <p>To use certain features of the Service, you must register for an account. You agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete information</li>
          <li>Maintain and promptly update your account information</li>
          <li>Maintain the security of your password</li>
          <li>Accept responsibility for all activities under your account</li>
          <li>Notify us immediately of any unauthorized use</li>
        </ul>

        <h3>Account Types</h3>
        <p>FitOS offers different account types:</p>
        <ul>
          <li><strong>Trainer:</strong> Create workouts, track clients, process payments</li>
          <li><strong>Client:</strong> Log workouts, track nutrition, communicate with trainer</li>
          <li><strong>Gym Owner:</strong> Manage facilities and trainers</li>
        </ul>
      `,
    },
    {
      title: 'Subscription and Payments',
      content: `
        <h3>Trainer Subscriptions</h3>
        <p>Trainers pay a monthly subscription fee of $49/month for unlimited clients. Your subscription:</p>
        <ul>
          <li>Automatically renews monthly unless cancelled</li>
          <li>Can be cancelled at any time (no refunds for partial months)</li>
          <li>Includes access to all platform features</li>
          <li>Includes payment processing via Stripe (platform fee applies)</li>
        </ul>

        <h3>Client Payments</h3>
        <p>Clients pay their trainers directly through the platform. Trainers set their own pricing. FitOS charges a 10% platform fee on all client payments.</p>

        <h3>Payment Processing</h3>
        <p>Payments are processed securely through Stripe. You agree to Stripe's <a href="https://stripe.com/legal" target="_blank">Terms of Service</a>.</p>

        <h3>Refunds</h3>
        <p>Subscription fees are non-refundable except as required by law. Trainer-client payment disputes should be resolved between the parties.</p>
      `,
    },
    {
      title: 'User Content',
      content: `
        <h3>Your Content</h3>
        <p>You retain ownership of all content you submit to FitOS, including workout logs, nutrition data, photos, and messages. By submitting content, you grant us a license to:</p>
        <ul>
          <li>Store, process, and display your content to provide the Service</li>
          <li>Share your content with your trainer or clients as applicable</li>
          <li>Use anonymized, aggregated data for analytics and improvement</li>
        </ul>

        <h3>Prohibited Content</h3>
        <p>You agree not to upload or share content that:</p>
        <ul>
          <li>Violates any law or regulation</li>
          <li>Infringes on intellectual property rights</li>
          <li>Contains malware or viruses</li>
          <li>Is harassing, abusive, or threatening</li>
          <li>Contains explicit sexual content</li>
          <li>Promotes dangerous health practices</li>
        </ul>
      `,
    },
    {
      title: 'Trainer Responsibilities',
      content: `
        <p>If you are a trainer using FitOS, you agree to:</p>
        <ul>
          <li>Maintain appropriate certifications and insurance</li>
          <li>Provide services in accordance with professional standards</li>
          <li>Screen clients for health conditions and obtain necessary waivers</li>
          <li>Not provide medical advice (refer clients to physicians when appropriate)</li>
          <li>Maintain client confidentiality</li>
          <li>Comply with all applicable laws and regulations</li>
          <li>Respond to client inquiries in a timely manner</li>
        </ul>

        <h3>Independent Contractors</h3>
        <p>Trainers are independent contractors, not employees of FitOS. You are responsible for your own taxes, insurance, and legal compliance.</p>
      `,
    },
    {
      title: 'Client Responsibilities',
      content: `
        <p>If you are a client using FitOS, you agree to:</p>
        <ul>
          <li>Consult with a physician before beginning any exercise program</li>
          <li>Inform your trainer of any health conditions, injuries, or limitations</li>
          <li>Follow proper exercise form and safety guidelines</li>
          <li>Use equipment appropriately and safely</li>
          <li>Not hold FitOS liable for injuries sustained during training</li>
        </ul>

        <h3>Health Disclaimer</h3>
        <p><strong>Important:</strong> FitOS is a software platform, not a medical service. Always consult with a qualified healthcare professional before starting any fitness or nutrition program. Stop exercising immediately if you experience pain, dizziness, or shortness of breath.</p>
      `,
    },
    {
      title: 'Intellectual Property',
      content: `
        <p>The Service and its original content, features, and functionality are owned by FitOS and are protected by copyright, trademark, and other intellectual property laws.</p>
        <p>You may not:</p>
        <ul>
          <li>Copy, modify, or create derivative works of the Service</li>
          <li>Reverse engineer or decompile the software</li>
          <li>Remove or alter any copyright or proprietary notices</li>
          <li>Use the FitOS name or logo without permission</li>
        </ul>
      `,
    },
    {
      title: 'Termination',
      content: `
        <p>We may terminate or suspend your account immediately, without notice, for:</p>
        <ul>
          <li>Violation of these Terms</li>
          <li>Fraudulent or illegal activity</li>
          <li>Non-payment of fees</li>
          <li>At our sole discretion</li>
        </ul>

        <p>Upon termination:</p>
        <ul>
          <li>Your right to use the Service will cease immediately</li>
          <li>You will lose access to your account and data</li>
          <li>We may delete your data in accordance with our Privacy Policy</li>
          <li>You remain responsible for any outstanding fees</li>
        </ul>

        <p>You may cancel your account at any time from the Settings page.</p>
      `,
    },
    {
      title: 'Disclaimers and Limitation of Liability',
      content: `
        <h3>Disclaimer of Warranties</h3>
        <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DISCLAIM ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO:</p>
        <ul>
          <li>Warranties of merchantability and fitness for a particular purpose</li>
          <li>Warranties that the Service will be uninterrupted or error-free</li>
          <li>Warranties regarding the accuracy or reliability of information</li>
        </ul>

        <h3>Limitation of Liability</h3>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, FITOS SHALL NOT BE LIABLE FOR:</p>
        <ul>
          <li>Indirect, incidental, special, or consequential damages</li>
          <li>Loss of profits, data, or goodwill</li>
          <li>Injuries sustained during exercise or training</li>
          <li>Disputes between trainers and clients</li>
        </ul>

        <p>OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PAST 12 MONTHS, OR $100, WHICHEVER IS GREATER.</p>
      `,
    },
    {
      title: 'Indemnification',
      content: `
        <p>You agree to indemnify and hold FitOS harmless from any claims, damages, losses, liabilities, and expenses (including attorney fees) arising from:</p>
        <ul>
          <li>Your use of the Service</li>
          <li>Your violation of these Terms</li>
          <li>Your violation of any rights of another party</li>
          <li>Injuries or damages resulting from your training services (trainers)</li>
        </ul>
      `,
    },
    {
      title: 'Dispute Resolution',
      content: `
        <h3>Governing Law</h3>
        <p>These Terms shall be governed by the laws of the State of California, without regard to conflict of law provisions.</p>

        <h3>Arbitration</h3>
        <p>Any disputes arising from these Terms shall be resolved through binding arbitration in accordance with the American Arbitration Association rules, except that you may assert claims in small claims court if they qualify.</p>

        <h3>Class Action Waiver</h3>
        <p>You agree to resolve disputes individually and waive the right to participate in class actions or class arbitrations.</p>
      `,
    },
    {
      title: 'Changes to Terms',
      content: `
        <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by email or in-app notification at least 30 days before they take effect.</p>
        <p>Your continued use of the Service after changes take effect constitutes acceptance of the new Terms. If you do not agree to the new Terms, you must stop using the Service and cancel your account.</p>
      `,
    },
    {
      title: 'Contact Us',
      content: `
        <p>If you have questions about these Terms, please contact us:</p>
        <ul>
          <li>Email: <a href="mailto:legal@nutrifitos.com">legal@nutrifitos.com</a></li>
          <li>Website: <a href="https://www.nutrifitos.com/help">https://www.nutrifitos.com/help</a></li>
        </ul>
      `,
    },
  ],
};
