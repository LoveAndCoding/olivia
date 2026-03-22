// Polyfill crypto.randomUUID for non-secure contexts (e.g. HTTP access via IP).
// crypto.getRandomValues is available in all modern browsers regardless of context.
if (typeof crypto !== 'undefined' && typeof crypto.randomUUID !== 'function') {
  crypto.randomUUID = function randomUUID(): `${string}-${string}-${string}-${string}-${string}` {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 10
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}` as `${string}-${string}-${string}-${string}-${string}`;
  };
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { RoleProvider } from './lib/role';
import { showErrorToast } from './lib/error-toast';
import { reportError, errorMessage, errorStack } from './lib/error-reporter';
import { router } from './router';
import './styles.css';

// ─── Global error handlers ──────────────────────────────────────────────────

window.addEventListener('error', (event) => {
  reportError({
    message: event.message || 'Uncaught error',
    stack: event.error instanceof Error ? event.error.stack : undefined,
    context: 'window.onerror',
  });
});

window.addEventListener('unhandledrejection', (event) => {
  reportError({
    message: errorMessage(event.reason),
    stack: errorStack(event.reason),
    context: 'unhandledrejection',
  });
});

// ─── TanStack Query caches ─────────────────────────────────────────────────

const queryCache = new QueryCache({
  onError(error) {
    reportError({
      message: errorMessage(error),
      stack: errorStack(error),
      context: 'QueryCache',
    });
  },
});

const mutationCache = new MutationCache({
  onError(error) {
    const message = errorMessage(error);
    showErrorToast(message);
    reportError({
      message,
      stack: errorStack(error),
      context: 'MutationCache',
    });
  },
});

const queryClient = new QueryClient({ queryCache, mutationCache });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <RouterProvider router={router} />
      </RoleProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
