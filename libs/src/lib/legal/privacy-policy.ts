export interface LegalSection {
  title: string;
  content: string;
}

export interface LegalDocument {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export const PRIVACY_POLICY: LegalDocument = {
  title: 'Privacy Policy',
  lastUpdated: '2026-01-13',
  sections: [
    {
      title: 'Introduction',
      content: `
        <p>FitOS ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our fitness coaching platform, including our mobile application and website.</p>
        <p>Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application or website.</p>
      `,
    },
    {
      title: 'Information We Collect',
      content: `
        <h3>Personal Information</h3>
        <p>We collect information that you provide directly to us when you:</p>
        <ul>
          <li>Create an account (name, email address, password)</li>
          <li>Complete your profile (age, gender, fitness goals, measurements)</li>
          <li>Use our services (workout logs, nutrition entries, progress photos)</li>
          <li>Communicate with us or your trainer</li>
          <li>Make payments (processed securely through Stripe)</li>
        </ul>

        <h3>Health and Fitness Data</h3>
        <p>With your consent, we collect health and fitness data including:</p>
        <ul>
          <li>Workout performance (exercises, sets, reps, weight lifted)</li>
          <li>Nutrition logs (food intake, macronutrients, calories)</li>
          <li>Body measurements and progress photos</li>
          <li>Wearable device data (heart rate, sleep, steps, HRV) via Terra API</li>
        </ul>

        <h3>Voice and Photo Data</h3>
        <p>When you use our AI-powered features, we collect:</p>
        <ul>
          <li>Voice recordings (temporarily processed for workout and nutrition logging, not permanently stored)</li>
          <li>Photos of meals (processed for food recognition, stored until you delete them)</li>
          <li>AI chat conversations with your trainer's AI assistant</li>
        </ul>

        <h3>Automatically Collected Information</h3>
        <p>When you use FitOS, we automatically collect certain information including:</p>
        <ul>
          <li>Device information (device type, operating system, unique identifiers)</li>
          <li>Usage data (features accessed, time spent, interactions)</li>
          <li>Location data (if you grant permission)</li>
          <li>Log data (IP address, browser type, access times)</li>
        </ul>
      `,
    },
    {
      title: 'How We Use Your Information',
      content: `
        <p>We use the information we collect to:</p>
        <ul>
          <li><strong>Provide Services:</strong> Deliver our fitness coaching platform, process transactions, and send service-related communications</li>
          <li><strong>AI Features:</strong> Process voice commands, recognize food in photos, generate personalized coaching responses, and provide proactive interventions at optimal times (JITAI)</li>
          <li><strong>Personalization:</strong> Customize your experience, recommend workouts, and track your progress</li>
          <li><strong>Trainer-Client Relationships:</strong> Enable communication and data sharing between trainers and their clients</li>
          <li><strong>Improve Platform:</strong> Analyze usage patterns, identify bugs, and develop new features. AI models may be trained on anonymized, aggregated data to improve accuracy</li>
          <li><strong>Safety & Security:</strong> Protect against fraud, unauthorized access, and other security threats</li>
          <li><strong>Legal Compliance:</strong> Comply with applicable laws, regulations, and legal processes</li>
          <li><strong>Marketing:</strong> Send promotional emails through our CRM system (you can opt out at any time)</li>
        </ul>
      `,
    },
    {
      title: 'Information Sharing and Disclosure',
      content: `
        <p>We do not sell your personal information. We may share your information in the following circumstances:</p>

        <h3>With Your Trainer</h3>
        <p>If you are a client, your trainer can access your workout logs, nutrition data, measurements, progress photos, and other information you choose to share.</p>

        <h3>With Service Providers</h3>
        <p>We share information with third-party service providers who perform services on our behalf:</p>
        <ul>
          <li><strong>Supabase:</strong> Database and authentication services</li>
          <li><strong>Stripe:</strong> Payment processing (we do not store your full credit card information)</li>
          <li><strong>Terra API:</strong> Wearable device integration</li>
          <li><strong>Google Cloud Platform:</strong> AI backend hosting (LangGraph) and data processing</li>
          <li><strong>Anthropic (Claude AI):</strong> AI language model for coaching chat and text processing</li>
          <li><strong>Deepgram:</strong> Voice transcription for workout and nutrition logging</li>
          <li><strong>Passio AI:</strong> Food recognition from photos</li>
          <li><strong>Resend:</strong> Email delivery for CRM campaigns</li>
          <li><strong>Sentry:</strong> Error tracking and monitoring</li>
        </ul>

        <h3>For Legal Reasons</h3>
        <p>We may disclose your information if required by law, court order, or governmental authority, or to protect our rights, property, or safety.</p>

        <h3>Business Transfers</h3>
        <p>In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.</p>
      `,
    },
    {
      title: 'Data Security',
      content: `
        <p>We implement appropriate technical and organizational security measures to protect your personal information, including:</p>
        <ul>
          <li>Encryption of data in transit (HTTPS/TLS) and at rest</li>
          <li>Row-level security policies in our database</li>
          <li>Regular security audits and penetration testing</li>
          <li>Access controls and authentication requirements</li>
          <li>Secure storage of progress photos with signed URLs</li>
        </ul>
        <p>However, no method of transmission over the internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee its absolute security.</p>
      `,
    },
    {
      title: 'Your Rights and Choices',
      content: `
        <p>Depending on your location, you may have the following rights:</p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal information</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your personal information</li>
          <li><strong>Data Portability:</strong> Request your data in a machine-readable format</li>
          <li><strong>Opt-Out:</strong> Unsubscribe from marketing emails</li>
          <li><strong>Withdraw Consent:</strong> Revoke consent for wearable data collection</li>
        </ul>
        <p>To exercise these rights, please contact us at <a href="mailto:privacy@nutrifitos.com">privacy@nutrifitos.com</a>. We will respond within 30 days.</p>
      `,
    },
    {
      title: 'Data Retention',
      content: `
        <p>We retain your personal information for as long as your account is active or as needed to provide services. If you delete your account:</p>
        <ul>
          <li>Your profile and personal information will be deleted within 30 days</li>
          <li>Workout and nutrition logs may be retained in anonymized form for analytics</li>
          <li>Financial records will be retained as required by law (typically 7 years)</li>
          <li>Backups containing your data will be deleted within 90 days</li>
        </ul>
      `,
    },
    {
      title: 'Children\'s Privacy',
      content: `
        <p>FitOS is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us at <a href="mailto:privacy@nutrifitos.com">privacy@nutrifitos.com</a>.</p>
      `,
    },
    {
      title: 'International Data Transfers',
      content: `
        <p>Your information may be transferred to and processed in countries other than your country of residence. These countries may have data protection laws that differ from those in your country. By using FitOS, you consent to the transfer of your information to the United States and other countries where we operate.</p>
      `,
    },
    {
      title: 'Changes to This Privacy Policy',
      content: `
        <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. Your continued use of FitOS after changes are posted constitutes acceptance of the updated Privacy Policy.</p>
      `,
    },
    {
      title: 'Contact Us',
      content: `
        <p>If you have questions or concerns about this Privacy Policy, please contact us:</p>
        <ul>
          <li>Email: <a href="mailto:privacy@nutrifitos.com">privacy@nutrifitos.com</a></li>
          <li>Website: <a href="https://fitos.app/contact">https://fitos.app/contact</a></li>
        </ul>
      `,
    },
  ],
};
