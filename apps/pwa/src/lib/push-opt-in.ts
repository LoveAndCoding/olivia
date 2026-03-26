import { useState, useEffect, useCallback } from 'react';
import { getStoredSessionToken } from './auth';
import { resolveApiUrl } from './api';

const DISMISSED_KEY = 'olivia-push-opt-in-dismissed';

// ─── SW auth token storage ───────────────────────────────────────────────────
// Store the session token in the Service Worker's IndexedDB so it can
// authenticate push action requests without an app foreground.

const SW_DB_NAME = 'olivia-sw';
const SW_DB_VERSION = 1;
const AUTH_STORE = 'authToken';

async function storeAuthTokenForSW(token: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
      if (!db.objectStoreNames.contains('actionOutbox')) {
        db.createObjectStore('actionOutbox', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(AUTH_STORE, 'readwrite');
      const store = tx.objectStore(AUTH_STORE);
      store.put(token, 'token');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Creates a real Web Push subscription via the browser's Push API and registers
 * it with the server. This is the only correct way to enable push delivery on web.
 * Returns true if the subscription was successfully created and registered.
 */
export async function registerWebPushSubscription(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false;
  try {
    const vapidRes = await fetch(resolveApiUrl('/api/push-subscriptions/vapid-public-key'));
    const { vapidPublicKey } = await vapidRes.json() as { vapidPublicKey: string | null };
    if (!vapidPublicKey) return false;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey).buffer as ArrayBuffer,
    });
    const subJson = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    await fetch(resolveApiUrl('/api/push-subscriptions'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subJson.endpoint, keys: subJson.keys }),
    });

    // Store auth token in SW's IndexedDB for push action button requests
    const sessionToken = getStoredSessionToken();
    if (sessionToken) {
      await storeAuthTokenForSW(sessionToken).catch((err) =>
        console.warn('failed to store auth token for SW', err)
      );
    }
    return true;
  } catch (err) {
    console.warn('push subscription failed', err);
    return false;
  }
}

export type PushOptInState = 'prompt' | 'granted' | 'denied' | 'unsupported' | 'dismissed';

export function usePushOptIn() {
  const [state, setState] = useState<PushOptInState>('unsupported');

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      setState('unsupported');
      return;
    }
    const perm = Notification.permission;
    if (perm === 'granted') { setState('granted'); return; }
    if (perm === 'denied') { setState('denied'); return; }
    if (localStorage.getItem(DISMISSED_KEY)) { setState('dismissed'); return; }
    setState('prompt');
  }, []);

  const requestPermission = useCallback(async (): Promise<void> => {
    if (!('serviceWorker' in navigator)) return;
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      setState(perm === 'denied' ? 'denied' : 'dismissed');
      return;
    }
    setState('granted');
    await registerWebPushSubscription();
  }, []);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setState('dismissed');
  }, []);

  return { state, requestPermission, dismiss };
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}
