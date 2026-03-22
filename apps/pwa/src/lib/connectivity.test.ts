/**
 * Regression tests for OLI-207: Connectivity probe failures.
 *
 * Bug: Connectivity probes failed due to CORS and network detection issues,
 * causing the app to incorrectly report offline status or crash on failed
 * health checks.
 *
 * Regression guard: verify that the connectivity module correctly transitions
 * between online/offline states, handles health check failures gracefully,
 * and distinguishes CORS failures from network failures in the diagnostic probe.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock import.meta.env before importing the module
vi.stubEnv('VITE_API_BASE_URL', '');

// We need to mock the api module's resolveApiUrl
vi.mock('./api', () => ({
  resolveApiUrl: (path: string) => `http://localhost:3001${path}`,
  effectiveApiBaseUrl: ''
}));

// Re-import after mocks are set up
const connectivityModule = await import('./connectivity');

describe('OLI-207: connectivity monitor state transitions', () => {
  let originalNavigator: PropertyDescriptor | undefined;
  let originalWindow: PropertyDescriptor | undefined;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalNavigator = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
    originalFetch = globalThis.fetch;

    // Default: browser reports online
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true
    });

    // Provide a minimal window stub for addEventListener/removeEventListener
    if (typeof globalThis.window === 'undefined') {
      Object.defineProperty(globalThis, 'window', {
        value: {
          addEventListener: vi.fn(),
          removeEventListener: vi.fn()
        },
        configurable: true,
        writable: true
      });
    }

    // Stop any running monitor from previous test
    connectivityModule.stopConnectivityMonitor();
  });

  afterEach(() => {
    connectivityModule.stopConnectivityMonitor();

    // Restore navigator
    if (originalNavigator) {
      Object.defineProperty(globalThis, 'navigator', originalNavigator);
    } else {
      delete (globalThis as Record<string, unknown>).navigator;
    }

    // Restore window
    if (originalWindow) {
      Object.defineProperty(globalThis, 'window', originalWindow);
    } else {
      delete (globalThis as Record<string, unknown>).window;
    }

    // Restore fetch
    globalThis.fetch = originalFetch;

    vi.restoreAllMocks();
  });

  it('reports effectively online when health check succeeds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      type: 'basic'
    });

    // Manually trigger a connectivity check
    connectivityModule.checkConnectivityNow();

    // Wait for the async ping to complete
    await vi.waitFor(() => {
      const diag = connectivityModule.getLastPingDiagnostic();
      expect(diag.status).toBe('ok');
    });

    expect(connectivityModule.isEffectivelyOnline()).toBe(true);

    const snapshot = connectivityModule.getConnectivitySnapshot();
    expect(snapshot.browserOnline).toBe(true);
    expect(snapshot.apiReachable).toBe(true);
  });

  it('reports API unreachable when health check returns non-ok response', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      type: 'basic'
    });

    connectivityModule.checkConnectivityNow();

    await vi.waitFor(() => {
      const diag = connectivityModule.getLastPingDiagnostic();
      expect(diag.status).toBe('http-error');
    });

    expect(connectivityModule.isEffectivelyOnline()).toBe(false);

    const snapshot = connectivityModule.getConnectivitySnapshot();
    expect(snapshot.browserOnline).toBe(true);
    expect(snapshot.apiReachable).toBe(false);
  });

  it('handles network errors without crashing', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    connectivityModule.checkConnectivityNow();

    await vi.waitFor(() => {
      const diag = connectivityModule.getLastPingDiagnostic();
      expect(diag.status).toBe('network-error');
    });

    // Should not throw — the monitor must gracefully handle network errors
    expect(connectivityModule.isEffectivelyOnline()).toBe(false);

    const diag = connectivityModule.getLastPingDiagnostic();
    expect(diag.error).toBe('Failed to fetch');
  });

  it('skips ping when navigator.onLine is false', async () => {
    const fetchSpy = vi.fn();
    globalThis.fetch = fetchSpy;

    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true
    });

    connectivityModule.checkConnectivityNow();

    // Give the async operation time to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Fetch should not have been called — no point pinging when browser says offline
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(connectivityModule.isEffectivelyOnline()).toBe(false);
  });

  it('pings health check URL with cache: no-store to avoid stale responses', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true, status: 200, type: 'basic' });
    globalThis.fetch = fetchSpy;

    connectivityModule.checkConnectivityNow();

    await vi.waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://localhost:3001/api/health');
    expect(opts.cache).toBe('no-store');
  });

  it('notifies subscribers when state changes', async () => {
    const callback = vi.fn();
    const unsubscribe = connectivityModule.subscribeConnectivity(callback);

    // Simulate a failed health check to trigger a state change
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
    connectivityModule.checkConnectivityNow();

    await vi.waitFor(() => {
      expect(callback).toHaveBeenCalled();
    });

    unsubscribe();
  });
});

describe('OLI-207: diagnostic probe distinguishes CORS from network failures', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('reports cors=ok and noCors=ok when both fetches succeed', async () => {
    globalThis.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, status: 200, type: 'basic' })  // cors fetch
      .mockResolvedValueOnce({ ok: false, type: 'opaque', status: 0 }); // no-cors fetch

    const result = await connectivityModule.runDiagnosticProbe();

    expect(result.cors).toBe('ok');
    expect(result.noCors).toBe('ok');
    expect(result.healthUrl).toBe('http://localhost:3001/api/health');
  });

  it('reports cors=error, noCors=ok when CORS blocks the request (OLI-207 root cause)', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))          // cors blocked
      .mockResolvedValueOnce({ ok: false, type: 'opaque', status: 0 }); // no-cors succeeds

    const result = await connectivityModule.runDiagnosticProbe();

    // This is the key OLI-207 scenario: network works but CORS is blocking
    expect(result.cors).toBe('error');
    expect(result.corsDetail).toBe('Failed to fetch');
    expect(result.noCors).toBe('ok');
    expect(result.noCorsDetail).toContain('opaque');
  });

  it('reports both error when network is truly unreachable', async () => {
    globalThis.fetch = vi.fn()
      .mockRejectedValueOnce(new TypeError('Network unreachable'))
      .mockRejectedValueOnce(new TypeError('Network unreachable'));

    const result = await connectivityModule.runDiagnosticProbe();

    expect(result.cors).toBe('error');
    expect(result.noCors).toBe('error');
  });
});
