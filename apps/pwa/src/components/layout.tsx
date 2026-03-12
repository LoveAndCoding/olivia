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
        <div className="stack-sm">
          <p className="eyebrow">Olivia</p>
          <div className="stack-sm">
            <h1>Shared household inbox</h1>
            <p className="muted hero-supporting-text">
              Calm review, clear ownership, and advisory-only follow-through for household logistics.
            </p>
            <div className="hero-tag-row">
              <span className="hero-tag">Mobile-first review</span>
              <span className="hero-tag">Quick capture</span>
              <span className="hero-tag">Shared visibility</span>
            </div>
          </div>
        </div>
        <label className="role-switcher stack-sm">
          <span className="field-label">Active role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} aria-label="Active role">
            <option value="stakeholder">Stakeholder</option>
            <option value="spouse">Spouse</option>
          </select>
        </label>
      </header>

      <nav className="app-nav accent-nav">
        <Link to="/" activeProps={{ className: 'active' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="5" rx="1" />
            <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
            <path d="M10 13h4" />
          </svg>
          Review
        </Link>
        {role === 'stakeholder' ? (
          <Link to="/add" activeProps={{ className: 'active' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v8M8 12h8" />
            </svg>
            Add item
          </Link>
        ) : null}
        <Link to="/settings" activeProps={{ className: 'active' }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Settings
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
