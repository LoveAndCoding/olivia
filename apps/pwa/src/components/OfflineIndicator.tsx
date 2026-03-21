import { useConnectivityStatus } from '../lib/use-online-status';

/**
 * Renders a banner when the device is offline or the API server is unreachable.
 * Distinguishes between true offline (navigator.onLine = false) and the
 * WKWebView case where the browser thinks it's online but the API can't
 * be reached (e.g. Tailscale tunnel down).
 */
export function OfflineIndicator() {
  const status = useConnectivityStatus();

  if (status === 'online') return null;

  const isUnreachable = status === 'server-unreachable';

  return (
    <div className="connectivity-banner" role="status">
      <span className={`connectivity-banner-dot ${isUnreachable ? 'connectivity-banner-dot--warn' : ''}`} aria-hidden="true" />
      <span>
        {isUnreachable
          ? 'Can\u2019t reach server \u2014 changes saved locally'
          : 'Offline \u2014 will sync when connected'}
      </span>
    </div>
  );
}
