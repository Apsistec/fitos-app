import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.ionic.starter',
  appName: 'mobile',
  webDir: 'www',
  plugins: {
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
  },
};

export default config;
