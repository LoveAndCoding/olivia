import { useSyncExternalStore } from 'react';
import {
  subscribeConnectivity,
  getConnectivitySnapshot,
  isEffectivelyOnline,
} from './connectivity';

export type ConnectivityStatus = 'online' | 'offline' | 'server-unreachable';

/**
 * Reactive hook that tracks whether the app can reach the API server.
 *
 * Combines `navigator.onLine` with an active health-check ping so that
 * WKWebView scenarios (device reports online but API is unreachable) are
 * handled correctly.
 */
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(
    subscribeConnectivity,
    isEffectivelyOnline,
    () => true,
  );
}

/**
 * Returns a three-state connectivity status for UI banners:
 * - `'online'` — browser online AND API reachable
 * - `'offline'` — browser reports offline
 * - `'server-unreachable'` — browser online but API health check failed
 */
export function useConnectivityStatus(): ConnectivityStatus {
  const snapshot = useSyncExternalStore(
    subscribeConnectivity,
    getConnectivitySnapshot,
    () => ({ browserOnline: true, apiReachable: true }),
  );

  if (!snapshot.browserOnline) return 'offline';
  if (!snapshot.apiReachable) return 'server-unreachable';
  return 'online';
}
