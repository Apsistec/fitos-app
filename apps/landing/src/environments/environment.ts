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
  supabaseUrl: process.env['SUPABASE_URL'] || 'http://localhost:54321',
  supabaseAnonKey: process.env['SUPABASE_ANON_KEY'] || '',
  stripePublishableKey: process.env['STRIPE_PUBLISHABLE_KEY'] || '',
};
