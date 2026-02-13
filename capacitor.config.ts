import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fitos.app',
  appName: 'FitOS',
  webDir: 'dist/apps/mobile/browser',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0D0D0D',
      showSpinner: false,
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    Camera: {
      // iOS permissions
      ios: {
        cameraUsageDescription: 'FitOS needs camera access to log meals with photos',
        photoLibraryUsageDescription: 'FitOS needs photo library access to select meal photos',
      },
      // Android permissions
      android: {
        permissions: [
          'camera',
          'read_external_storage',
          'write_external_storage',
        ],
      },
    },
  }
};

export default config;
