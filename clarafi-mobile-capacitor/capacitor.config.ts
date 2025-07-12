import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.clarafi',
  appName: 'Clarafi EMR',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;