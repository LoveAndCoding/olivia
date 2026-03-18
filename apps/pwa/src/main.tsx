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
