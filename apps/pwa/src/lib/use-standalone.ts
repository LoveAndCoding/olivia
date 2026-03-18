import { useEffect, useState } from 'react';

/** Returns true when the PWA is running in installed/standalone mode. */
export function useStandalone(): boolean {
  const [standalone, setStandalone] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true
  );

  useEffect(() => {
    const mql = window.matchMedia('(display-mode: standalone)');
    const onChange = (e: MediaQueryListEvent) => setStandalone(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return standalone;
}
