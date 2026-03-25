import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { PushNotifications } from '@capacitor/push-notifications';
import { flushOutbox, saveNativeNotificationSubscription } from '../lib/sync';
import { abortActiveOperations, resetActiveOperations } from '../lib/app-lifecycle';
import { useAuth } from '../lib/auth';
import { checkConnectivityNow } from '../lib/connectivity';
import { router } from '../router';
import { OfflineIndicator } from './OfflineIndicator';
import { ErrorToastContainer } from './ErrorToastContainer';

export function AppLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  useEffect(() => {
    const syncNow = async () => {
      try {
        await flushOutbox();
      } catch {
        // Keep the stale state visible until the user retries online.
      } finally {
        void queryClient.invalidateQueries();
      }
    };
    void syncNow();
    const handleOnline = () => void syncNow();
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [queryClient]);

  // Handle Capacitor app lifecycle: flush outbox + invalidate on resume,
  // abort in-flight streams on background.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) {
        resetActiveOperations();
        checkConnectivityNow();
        void (async () => {
          try { await flushOutbox(); } catch { /* keep stale state visible */ }
          void queryClient.invalidateQueries();
        })();
      } else {
        abortActiveOperations();
      }
    });
    return () => { void listener.then((h) => h.remove()); };
  }, [queryClient]);

  // Navigate to the URL embedded in the push notification when the user taps it.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const url = action.notification.data?.url as string | undefined;
      if (!url) return;
      try {
        // The url field is a full URL (e.g. https://app.olivia.com/re-entry?reason=...).
        // Extract the pathname + search to navigate within the app.
        const parsed = new URL(url);
        void router.navigate({ to: parsed.pathname + parsed.search });
      } catch {
        // If url is already a relative path, use it directly.
        void router.navigate({ to: url });
      }
    });
    return () => { void listener.then((h) => h.remove()); };
  }, []);

  // On native launch, if push permission is already granted, re-register with APNs
  // to ensure the device token is current and stored server-side.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const registrationListener = PushNotifications.addListener('registration', (token) => {
      void saveNativeNotificationSubscription(token.value);
    });
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });
    // If permission is already granted, trigger register() to refresh the token.
    void PushNotifications.checkPermissions().then((result) => {
      if (result.receive === 'granted') {
        void PushNotifications.register();
      }
    });
    return () => {
      void registrationListener.then((h) => h.remove());
      void errorListener.then((h) => h.remove());
    };
  }, [currentUser?.id]);

  // Configure the native status bar so the web view extends behind it and
  // env(safe-area-inset-top) reports correct values on iOS.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void StatusBar.setOverlaysWebView({ overlay: true });
    void StatusBar.setStyle({ style: Style.Light });
  }, []);

  // Track keyboard height so bottom sheets and inputs stay above the keyboard.
  // On native Capacitor, use the Keyboard plugin for reliable events.
  // On web, fall back to visualViewport tracking.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Capacitor Keyboard plugin provides exact keyboard height
      const showListener = Keyboard.addListener('keyboardWillShow', (info) => {
        document.documentElement.style.setProperty('--keyboard-height', `${info.keyboardHeight}px`);
      });
      const hideListener = Keyboard.addListener('keyboardWillHide', () => {
        document.documentElement.style.setProperty('--keyboard-height', '0px');
      });
      // Initialize to 0 — keyboard is not open on mount
      document.documentElement.style.setProperty('--keyboard-height', '0px');
      return () => {
        void showListener.then((h) => h.remove());
        void hideListener.then((h) => h.remove());
      };
    }

    // Web fallback: use visualViewport
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const keyboardHeight = Math.max(0, window.innerHeight - (vv.height + vv.offsetTop));
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
      document.documentElement.style.setProperty('--keyboard-height', `${keyboardHeight}px`);
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
    };
  }, []);

  // Set --vvh on native too (used for layout sizing)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      document.documentElement.style.setProperty('--vvh', `${vv.height}px`);
    };
    update();
    vv.addEventListener('resize', update);
    return () => vv.removeEventListener('resize', update);
  }, []);

  return (
    <div className="app-frame">
      <div className="ambient ambient-1" aria-hidden="true" />
      <div className="ambient ambient-2" aria-hidden="true" />
      <div className="ambient ambient-3" aria-hidden="true" />
      <OfflineIndicator />
      <ErrorToastContainer />
      {children}
    </div>
  );
}
