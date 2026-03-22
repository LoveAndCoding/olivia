import { resolveApiUrl } from './api';

/**
 * Connectivity service that supplements `navigator.onLine` with an
 * active health-check ping to the API server.
 *
 * WKWebView (and some desktop browsers) report `navigator.onLine = true`
 * even when the device cannot actually reach the API (e.g. Tailscale
 * tunnel down). This module periodically pings `GET /api/health` and
 * exposes the combined reachability state via a tiny pub/sub store
 * compatible with `useSyncExternalStore`.
 */

const PING_INTERVAL_MS = 30_000; // 30 s when tab/app is active
const PING_TIMEOUT_MS = 5_000;   // give up after 5 s

type ConnectivityState = {
  /** `navigator.onLine` value. */
  browserOnline: boolean;
  /** Last health-check ping succeeded. */
  apiReachable: boolean;
};

/** Diagnostic info from the last health-check ping (for Settings display). */
export type PingDiagnostic = {
  url: string;
  status: 'ok' | 'http-error' | 'network-error' | 'pending';
  httpStatus?: number;
  error?: string;
  timestamp: string;
};

let lastPingDiagnostic: PingDiagnostic = {
  url: '',
  status: 'pending',
  timestamp: new Date().toISOString(),
};

export function getLastPingDiagnostic(): PingDiagnostic {
  return lastPingDiagnostic;
}

let state: ConnectivityState = {
  browserOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  apiReachable: true, // optimistic until first check
};

const listeners = new Set<() => void>();

function emit() {
  for (const cb of listeners) cb();
}

function setState(next: Partial<ConnectivityState>) {
  const prev = state;
  state = { ...state, ...next };
  if (prev.browserOnline !== state.browserOnline || prev.apiReachable !== state.apiReachable) {
    emit();
  }
}

// ── Health-check ping ───────────────────────────────────

let pingTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

async function ping(): Promise<void> {
  // Skip ping when browser says offline — no point hitting the network.
  if (!navigator.onLine) {
    setState({ browserOnline: false, apiReachable: false });
    return;
  }

  const url = resolveApiUrl('/api/health');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);

    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      // Avoid cache so we always hit the server
      cache: 'no-store',
    });

    clearTimeout(timeout);
    lastPingDiagnostic = res.ok
      ? { url, status: 'ok', httpStatus: res.status, timestamp: new Date().toISOString() }
      : { url, status: 'http-error', httpStatus: res.status, timestamp: new Date().toISOString() };
    setState({ browserOnline: true, apiReachable: res.ok });
  } catch (err) {
    lastPingDiagnostic = {
      url,
      status: 'network-error',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    };
    setState({ browserOnline: navigator.onLine, apiReachable: false });
  }
}

// ── Browser online/offline events ───────────────────────

function handleOnline() {
  setState({ browserOnline: true });
  // Immediately check if API is actually reachable
  void ping();
}

function handleOffline() {
  setState({ browserOnline: false, apiReachable: false });
}

// ── Public API ──────────────────────────────────────────

/** Start the periodic health-check loop. Idempotent. */
export function startConnectivityMonitor(): void {
  if (started) return;
  started = true;

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Run first ping immediately
  void ping();
  pingTimer = setInterval(() => void ping(), PING_INTERVAL_MS);
}

/** Stop the monitor and clean up. */
export function stopConnectivityMonitor(): void {
  if (!started) return;
  started = false;

  window.removeEventListener('online', handleOnline);
  window.removeEventListener('offline', handleOffline);

  if (pingTimer) {
    clearInterval(pingTimer);
    pingTimer = null;
  }
}

/** Force an immediate health-check ping. */
export function checkConnectivityNow(): void {
  void ping();
}

// ── useSyncExternalStore-compatible API ─────────────────

export function subscribeConnectivity(callback: () => void): () => void {
  listeners.add(callback);
  // Ensure the monitor is running when at least one subscriber exists
  startConnectivityMonitor();
  return () => {
    listeners.delete(callback);
  };
}

export function getConnectivitySnapshot(): ConnectivityState {
  return state;
}

/**
 * Convenience: returns `true` when the app can actually reach the API.
 * This is the value most consumers care about.
 */
export function isEffectivelyOnline(): boolean {
  return state.browserOnline && state.apiReachable;
}

// ── Diagnostic probe (for Settings page) ────────────────

export type ConnectivityDiagnostic = {
  healthUrl: string;
  /** Normal fetch result */
  cors: 'ok' | 'error';
  corsDetail: string;
  /** no-cors fetch result — if this succeeds but cors fails, the issue is CORS */
  noCors: 'ok' | 'error';
  noCorsDetail: string;
  timestamp: string;
};

/**
 * Run a one-shot diagnostic probe that tests both normal and no-cors
 * fetches to the health endpoint. Helps distinguish CORS failures from
 * network-level failures.
 */
export async function runDiagnosticProbe(): Promise<ConnectivityDiagnostic> {
  const url = resolveApiUrl('/api/health');
  const result: ConnectivityDiagnostic = {
    healthUrl: url,
    cors: 'error',
    corsDetail: 'pending',
    noCors: 'error',
    noCorsDetail: 'pending',
    timestamp: new Date().toISOString(),
  };

  // Test 1: normal (cors) fetch
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store' });
    clearTimeout(timeout);
    result.cors = res.ok ? 'ok' : 'error';
    result.corsDetail = res.ok ? `${res.status} OK` : `HTTP ${res.status}`;
  } catch (err) {
    result.corsDetail = err instanceof Error ? err.message : String(err);
  }

  // Test 2: no-cors fetch (bypasses CORS — opaque response but proves network path works)
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    const res = await fetch(url, { method: 'GET', signal: controller.signal, cache: 'no-store', mode: 'no-cors' });
    clearTimeout(timeout);
    // no-cors returns opaque response (type: 'opaque', status: 0) on success
    result.noCors = (res.type === 'opaque' || res.ok) ? 'ok' : 'error';
    result.noCorsDetail = res.type === 'opaque' ? 'opaque (network reachable)' : `${res.status}`;
  } catch (err) {
    result.noCorsDetail = err instanceof Error ? err.message : String(err);
  }

  return result;
}
