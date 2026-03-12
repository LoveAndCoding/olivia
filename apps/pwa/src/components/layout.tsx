import { useEffect, useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { HomeIcon, MemoryIcon, OliviaIcon, TasksIcon } from './icons';
import { flushOutbox } from '../lib/sync';
import { getTimeLabel } from '../lib/view-models';

export function AppLayout({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [timeLabel, setTimeLabel] = useState(() => getTimeLabel());

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

  useEffect(() => {
    const intervalId = window.setInterval(() => setTimeLabel(getTimeLabel()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="app-shell">
      <div className="ambient ambient-1" />
      <div className="ambient ambient-2" />
      <div className="ambient ambient-3" />

      <div className="app-frame">
        <header className="status-strip">
          <span className="status-time">{timeLabel}</span>
          <Link to="/settings" className="status-action" aria-label="Open settings">
            <span />
            <span />
            <span />
          </Link>
        </header>

        <main className="page-shell">{children}</main>

        <nav className="bottom-nav" aria-label="Primary">
          <Link to="/" activeProps={{ className: 'nav-btn active' }} activeOptions={{ exact: true }} className="nav-btn">
            <HomeIcon className="nav-icon" />
            <span className="nav-label">Home</span>
          </Link>
          <Link to="/tasks" activeProps={{ className: 'nav-btn active' }} className="nav-btn">
            <TasksIcon className="nav-icon" />
            <span className="nav-label">Tasks</span>
          </Link>
          <Link to="/olivia" search={{ intent: 'default' }} activeProps={{ className: 'nav-btn active' }} className="nav-btn">
            <OliviaIcon className="nav-icon" />
            <span className="nav-label">Olivia</span>
          </Link>
          <Link to="/memory" activeProps={{ className: 'nav-btn active' }} className="nav-btn">
            <MemoryIcon className="nav-icon" />
            <span className="nav-label">Memory</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
