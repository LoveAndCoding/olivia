import { useEffect, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { flushOutbox } from '../lib/sync';

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

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Olivia</p>
          <h1>Shared household inbox</h1>
        </div>
        <label className="role-switcher">
          Active role
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} aria-label="Active role">
            <option value="stakeholder">Stakeholder</option>
            <option value="spouse">Spouse</option>
          </select>
        </label>
      </header>

      <nav className="app-nav">
        <Link to="/" activeProps={{ className: 'active' }}>Review</Link>
        {role === 'stakeholder' ? <Link to="/add" activeProps={{ className: 'active' }}>Add item</Link> : null}
        <Link to="/settings" activeProps={{ className: 'active' }}>Settings</Link>
      </nav>

      <section className="status-bar">
        <span>{navigator.onLine ? 'Online' : 'Offline'}</span>
        <span>Pending sync: {diagnostics?.pending ?? 0}</span>
        <span>Conflicts: {diagnostics?.conflict ?? 0}</span>
        <span>Last sync: {diagnostics?.lastSyncAt ? new Date(diagnostics.lastSyncAt).toLocaleString() : 'Never'}</span>
      </section>

      <main className="page-shell">{children}</main>
    </div>
  );
}
