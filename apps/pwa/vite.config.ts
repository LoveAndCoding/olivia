import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Storybook sets STORYBOOK=true; skip the PWA plugin there since service
// workers and precache manifests are not meaningful in a component catalogue.
const isStorybook = process.env.STORYBOOK === 'true';

export default defineConfig({
  plugins: [
    react(),
    ...(!isStorybook
      ? [
          VitePWA({
            registerType: 'autoUpdate',
            strategies: 'injectManifest',
            srcDir: 'src',
            filename: 'sw.ts',
            includeAssets: ['favicon.svg', 'favicon-dark.svg'],
            manifest: {
              name: 'Olivia Household Inbox',
              short_name: 'Olivia',
              theme_color: '#6C5CE7',
              background_color: '#FAF8FF',
              display: 'standalone',
              start_url: '/',
              icons: [
                {
                  src: '/icon-192.png',
                  sizes: '192x192',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'any',
                },
                {
                  src: '/icon-512.png',
                  sizes: '512x512',
                  type: 'image/png',
                  purpose: 'maskable',
                },
              ],
            },
            injectManifest: {
              globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
            },
          }),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@olivia/contracts': fileURLToPath(new URL('../../packages/contracts/src/index.ts', import.meta.url)),
      '@olivia/domain': fileURLToPath(new URL('../../packages/domain/src/index.ts', import.meta.url)),
    },
  },
  server: {
    port: 4173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
