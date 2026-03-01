// Production environment configuration
export const environment = {
  production: true,
  firebase: {
    apiKey: "AIzaSyBijnr_BnCtP7lbTpfAVFBvOlvt-DgjN4w",
    authDomain: "fitos-88fff.firebaseapp.com",
    projectId: "fitos-88fff",
    storageBucket: "fitos-88fff.firebasestorage.app",
    messagingSenderId: "953773965912",
    appId: "1:953773965912:web:5bc293de185508b2b8402d",
    measurementId: "G-QEYQNRXS7J"
  },
  supabaseUrl: 'https://dmcogmopboebqiimzoej.supabase.co',
  supabaseAnonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRtY29nbW9wYm9lYnFpaW16b2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNDYwMjgsImV4cCI6MjA4MjkyMjAyOH0.PfhMh-erVyqlkkTDFFwkt0g8IzAUuddngIoFReJTYPA',
  stripePublishableKey: 'pk_test_51SaoYU8dyNFOBioE9PzoGWPwMCeM7yET0I2mRbkq2LjwLFU0ICxvkTzF3EjwgNYYS72PKvIxjVwTL4HALdeHXFZR00PFVjwXG8', // Using test key for alpha
  sentryDsn: 'https://eb265628f974fedf8f99730a231d69c4@o239736.ingest.us.sentry.io/4510933185069056',
};
