import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kegama.attendance',
  appName: 'Kegama Attendance & Payroll',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;

