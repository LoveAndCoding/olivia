import { useOnlineStatus } from '../lib/use-online-status';

/**
 * Renders a brief inline indicator when the device is offline.
 * Place after mutation triggers so the user knows their write was saved locally.
 */
export function OfflineIndicator() {
  const online = useOnlineStatus();

  if (online) return null;

  return (
    <span className="offline-indicator" role="status">
      <span className="offline-indicator-dot" aria-hidden="true" />
      Saved offline &mdash; will sync when connected
    </span>
  );
}
