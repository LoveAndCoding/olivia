import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { flushOutbox } from '../lib/sync';
import { abortActiveOperations, resetActiveOperations } from '../lib/app-lifecycle';
import { checkConnectivityNow } from '../lib/connectivity';
import { OfflineIndicator } from './OfflineIndicator';

export function AppLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

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
      {children}
    </div>
  );
}
