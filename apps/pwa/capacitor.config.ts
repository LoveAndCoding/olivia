import type { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.loveandcoding.olivia',
  appName: 'Olivia',
  webDir: 'dist',
  server: {
    // In development, proxy to the Vite dev server so live reload works.
    // Comment out for production builds that use the bundled dist/ assets.
    // url: 'http://localhost:4173',
  },
  plugins: {
    Keyboard: {
      resize: KeyboardResize.None,
    },
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
