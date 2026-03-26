/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window {
  Capacitor?: { isNativePlatform?: () => boolean };
}
