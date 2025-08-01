import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.clarafi.mobile',
  appName: 'Clarafi Mobile',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;