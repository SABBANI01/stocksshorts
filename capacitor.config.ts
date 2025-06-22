import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stocksshorts.app',
  appName: 'StocksShorts',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https'
  }
};

export default config;
