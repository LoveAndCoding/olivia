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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { registerSW } from 'virtual:pwa-register';
import { RoleProvider } from './lib/role';
import { UpdateToast } from './components/UpdateToast';
import { router } from './router';
import './styles.css';

// Register service worker — onNeedRefresh fires when a new SW is waiting.
// updateSW() activates the waiting worker and reloads.
const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new CustomEvent('sw-update-available'));
  },
});

// Expose updateSW globally so the toast component can trigger the reload.
(window as unknown as { __olivia_updateSW: typeof updateSW }).__olivia_updateSW = updateSW;

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RoleProvider>
        <RouterProvider router={router} />
        <UpdateToast />
      </RoleProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
