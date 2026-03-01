// Development environment configuration
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyBijnr_BnCtP7lbTpfAVFBvOlvt-DgjN4w",
    authDomain: "fitos-88fff.firebaseapp.com",
    projectId: "fitos-88fff",
    storageBucket: "fitos-88fff.firebasestorage.app",
    messagingSenderId: "953773965912",
    appId: "1:953773965912:web:5bc293de185508b2b8402d",
    measurementId: "G-QEYQNRXS7J"
  },
  supabaseUrl: 'http://127.0.0.1:54321',
  supabaseAnonKey: 'sb_publishable_WIoAVlkVGjK6XX2ucs1Wsw_zE6og68Y',
  stripePublishableKey: 'pk_test_51SaoYU8dyNFOBioE9PzoGWPwMCeM7yET0I2mRbkq2LjwLFU0ICxvkTzF3EjwgNYYS72PKvIxjVwTL4HALdeHXFZR00PFVjwXG8',
  sentryDsn: '', // Sentry disabled in development
};
