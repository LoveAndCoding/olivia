import { useEffect, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { flushOutbox } from '../lib/sync';
import { AvatarGroup } from './avatar-group';

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflict = await clientDb.outbox.where('state').equals('conflict').count();
    const syncRecord = await clientDb.meta.get('last-sync-at');
    return { pending, conflict, lastSyncAt: syncRecord ? (JSON.parse(syncRecord.value) as string) : null };
  }, [role]);

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
  }, [queryClient, role]);

  const statusItems = [
    { label: 'Connection', value: navigator.onLine ? 'Online' : 'Offline' },
    { label: 'Pending sync', value: String(diagnostics?.pending ?? 0) },
    { label: 'Conflicts', value: String(diagnostics?.conflict ?? 0) },
    {
      label: 'Last sync',
      value: diagnostics?.lastSyncAt ? new Date(diagnostics.lastSyncAt).toLocaleString() : 'Never'
    }
  ];

  return (
    <div className="app-shell">
      <header className="app-header accent-header">
        <span className="olivia-brand">olivia</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AvatarGroup avatars={[{ initial: 'J', colorIndex: 0 }, { initial: 'A', colorIndex: 1 }]} />
          <label className="role-switcher stack-sm">
            <span className="field-label">Role</span>
            <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} aria-label="Active role">
              <option value="stakeholder">Stakeholder</option>
              <option value="spouse">Spouse</option>
            </select>
          </label>
        </div>
      </header>

      <nav className="app-nav accent-nav">
        <Link to="/home" activeProps={{ className: 'active' }} aria-label="Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
            <path d="M9 21V12h6v9" />
          </svg>
          <span>Home</span>
        </Link>
        {role === 'stakeholder' ? (
          <Link to="/add" activeProps={{ className: 'active' }} aria-label="Tasks">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            <span>Tasks</span>
          </Link>
        ) : null}
        <Link to="/" activeProps={{ className: 'active' }} aria-label="Olivia" title="Review inbox">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2l1.5 4.5L18 8l-4.5 1.5L12 14l-1.5-4.5L6 8l4.5-1.5L12 2z" />
            <path d="M5 16l.75 2.25L8 19l-2.25.75L5 22l-.75-2.25L2 19l2.25-.75L5 16z" />
          </svg>
          <span>Olivia</span>
        </Link>
        <Link to="/settings" activeProps={{ className: 'active' }} aria-label="Memory">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            <line x1="12" y1="12" x2="12" y2="16" />
            <line x1="10" y1="14" x2="14" y2="14" />
          </svg>
          <span>Memory</span>
        </Link>
      </nav>

      <section className="status-bar accent-status">
        {statusItems.map((item) => (
          <div key={item.label} className="status-pill">
            <span className="status-label">{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <main className="page-shell">{children}</main>
    </div>
  );
}
