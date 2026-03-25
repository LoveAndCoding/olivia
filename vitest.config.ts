import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      '@olivia/contracts': resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@olivia/domain': resolve(__dirname, 'packages/domain/src/index.ts')
    }
  },
  test: {
    environment: 'node',
    globals: true,
    exclude: ['apps/pwa/e2e/**', 'node_modules/**'],
    coverage: {
      reporter: ['text', 'html']
    }
  }
});
