import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { loadNotificationState, saveDemoNotificationSubscription } from '../lib/sync';
import { applyThemeMode, getStoredThemeMode, type ThemeMode } from '../lib/theme';

export function SettingsPage() {
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredThemeMode());
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', role], queryFn: () => loadNotificationState(role) });
  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);
  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);

  useEffect(() => {
    applyThemeMode(themeMode);
  }, [themeMode]);

  return (
    <div className="screen stack-lg">
      <section className="stack-sm">
        <h1 className="screen-title">Settings</h1>
        <p className="screen-subtitle">Prototype controls and early validation info.</p>
      </section>

      <section className="panel-card stack-md">
        <div className="section-header-row">
          <h2 className="section-title">Installability and role</h2>
          <span className="section-link disabled-link">Local controls</span>
        </div>
        <label className="stack-sm">
          <span className="field-label">Active role</span>
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)} aria-label="Active role">
            <option value="stakeholder">Stakeholder</option>
            <option value="spouse">Spouse</option>
          </select>
        </label>
        <label className="stack-sm">
          <span className="field-label">Theme</span>
          <select value={themeMode} onChange={(event) => setThemeMode(event.target.value as ThemeMode)} aria-label="Theme mode">
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <p className="screen-subtitle">Installed as app: <strong>{installed ? 'Yes' : 'No'}</strong></p>
        <p className="screen-subtitle">Notification permission: <strong>{Notification.permission}</strong></p>
      </section>

      <section className="panel-card stack-md">
        <div className="section-header-row">
          <h2 className="section-title">Notification plumbing</h2>
          <span className="section-link disabled-link">Replaceable browser target</span>
        </div>
        <button type="button" className="btn-primary" onClick={async () => {
          if (Notification.permission === 'default') await Notification.requestPermission();
          await saveDemoNotificationSubscription(role);
          await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
        }}>Save demo notification target</button>
        <p className="screen-subtitle">Stored subscriptions: {notificationQuery.data?.length ?? 0}</p>
      </section>

      <section className="panel-card stack-md">
        <div className="section-header-row">
          <h2 className="section-title">Sync diagnostics</h2>
          <span className="section-link disabled-link">Early validation support</span>
        </div>
        <p className="screen-subtitle">Pending commands: {diagnostics?.pending ?? 0}</p>
        <p className="screen-subtitle">Conflicts: {diagnostics?.conflicts ?? 0}</p>
        <a className="btn-secondary inline-link" href="/re-entry?reason=due-soon-review">Open notification re-entry route</a>
      </section>
    </div>
  );
}
