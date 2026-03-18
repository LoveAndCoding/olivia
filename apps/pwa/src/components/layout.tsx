import { useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { flushOutbox } from '../lib/sync';
import { useStandalone } from '../lib/use-standalone';

export function AppLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const isStandalone = useStandalone();

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

  return (
    <div className={`app-frame${isStandalone ? ' standalone' : ''}`}>
      <div className="ambient ambient-1" aria-hidden="true" />
      <div className="ambient ambient-2" aria-hidden="true" />
      <div className="ambient ambient-3" aria-hidden="true" />
      {children}
    </div>
  );
}
