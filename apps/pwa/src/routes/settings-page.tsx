import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState } from 'react';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { loadNotificationState, saveDemoNotificationSubscription } from '../lib/sync';
import { BottomNav } from '../components/bottom-nav';
import type { ActorRole } from '@olivia/contracts';

type ThemeMode = 'light' | 'dark' | 'auto';

function applyTheme(mode: ThemeMode) {
  if (mode === 'auto') {
    document.documentElement.removeAttribute('data-theme');
    localStorage.removeItem('olivia-theme');
  } else {
    document.documentElement.setAttribute('data-theme', mode);
    localStorage.setItem('olivia-theme', mode);
  }
}

function readSavedTheme(): ThemeMode {
  const saved = localStorage.getItem('olivia-theme');
  if (saved === 'light' || saved === 'dark') return saved;
  return 'auto';
}

export function SettingsPage() {
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(readSavedTheme);
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', role], queryFn: () => loadNotificationState(role) });
  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);
  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);

  const handleTheme = (mode: ThemeMode) => {
    applyTheme(mode);
    setActiveTheme(mode);
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <div className="screen-header" style={{ paddingBottom: 8 }}>
            <div className="screen-title">Settings</div>
            <div className="screen-sub">App preferences and diagnostics</div>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Theme</h3>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(['light', 'dark', 'auto'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={activeTheme === mode ? 'primary-button' : 'secondary-button'}
                  style={{ flex: 1, minWidth: 80 }}
                  onClick={() => handleTheme(mode)}
                >
                  {mode === 'auto' ? 'Auto (OS)' : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Active role</h3>
              <span className="section-note">For development / testing</span>
            </div>
            <p className="muted">Switch which household member you're viewing as.</p>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['stakeholder', 'spouse'] as ActorRole[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  className={role === r ? 'primary-button' : 'secondary-button'}
                  style={{ flex: 1 }}
                  onClick={() => setRole(r)}
                >
                  {r === 'stakeholder' ? 'Lexi' : 'Alexander'}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Current: {role === 'stakeholder' ? 'Lexi (stakeholder)' : 'Alexander (spouse)'}</p>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Installability</h3>
            </div>
            <p className="muted">Installed as app: <strong>{installed ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Notification permission: <strong>{Notification.permission}</strong></p>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                if (Notification.permission === 'default') await Notification.requestPermission();
                await saveDemoNotificationSubscription(role);
                await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
              }}
            >
              Save demo notification target
            </button>
            <p className="muted" style={{ fontSize: 12 }}>Stored subscriptions: {notificationQuery.data?.length ?? 0}</p>
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Sync diagnostics</h3>
            </div>
            <p className="muted">Pending commands: {diagnostics?.pending ?? 0}</p>
            <p className="muted">Conflicts: {diagnostics?.conflicts ?? 0}</p>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
