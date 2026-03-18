import { useCallback, useEffect, useState } from 'react';

export function UpdateToast() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = () => setVisible(true);
    window.addEventListener('sw-update-available', show);
    return () => window.removeEventListener('sw-update-available', show);
  }, []);

  const handleUpdate = useCallback(() => {
    const updateSW = (window as unknown as { __olivia_updateSW?: (reloadPage?: boolean) => Promise<void> }).__olivia_updateSW;
    if (updateSW) {
      void updateSW(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div className="update-toast" role="status">
      <span className="update-toast-text">Update available</span>
      <button className="update-toast-action" onClick={handleUpdate}>
        Tap to refresh
      </button>
      <button className="update-toast-dismiss" onClick={handleDismiss} aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}
