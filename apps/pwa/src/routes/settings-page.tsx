import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import {
  loadNotificationState,
  loadPushDiagnostics,
  loadReminderSettingsState,
  registerPushSubscription,
  saveReminderSettingsState,
  unsubscribePushSubscription
} from '../lib/sync';
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
  const reminderSettingsQuery = useQuery({ queryKey: ['reminder-settings', role], queryFn: () => loadReminderSettingsState(role) });
  const pushDiagnosticsQuery = useQuery({ queryKey: ['push-diagnostics', role], queryFn: () => loadPushDiagnostics() });
  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);
  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);
  const [notificationPrefs, setNotificationPrefs] = useState({
    enabled: false,
    dueRemindersEnabled: false,
    dailySummaryEnabled: false
  });
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsBusy, setSettingsBusy] = useState(false);

  useEffect(() => {
    if (!reminderSettingsQuery.data) {
      return;
    }

    setNotificationPrefs({
      enabled: reminderSettingsQuery.data.preferences.enabled,
      dueRemindersEnabled: reminderSettingsQuery.data.preferences.dueRemindersEnabled,
      dailySummaryEnabled: reminderSettingsQuery.data.preferences.dailySummaryEnabled
    });
  }, [reminderSettingsQuery.data]);

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
              <h3 className="card-title">Reminder notifications</h3>
              <span className="section-note">Minimal first-slice controls</span>
            </div>
            {role === 'stakeholder' ? (
              <>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span>Enable reminder notifications</span>
                  <input
                    type="checkbox"
                    aria-label="Enable reminder notifications"
                    checked={notificationPrefs.enabled}
                    onChange={(event) => setNotificationPrefs((current) => ({ ...current, enabled: event.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span>Due reminders</span>
                  <input
                    type="checkbox"
                    aria-label="Due reminders"
                    checked={notificationPrefs.dueRemindersEnabled}
                    onChange={(event) => setNotificationPrefs((current) => ({ ...current, dueRemindersEnabled: event.target.checked }))}
                  />
                </label>
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span>Daily summary</span>
                  <input
                    type="checkbox"
                    aria-label="Daily summary"
                    checked={notificationPrefs.dailySummaryEnabled}
                    onChange={(event) => setNotificationPrefs((current) => ({ ...current, dailySummaryEnabled: event.target.checked }))}
                  />
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="primary-button"
                    disabled={settingsBusy}
                    onClick={async () => {
                      setSettingsBusy(true);
                      setSettingsError(null);
                      try {
                        await saveReminderSettingsState(role, notificationPrefs);
                        await queryClient.invalidateQueries({ queryKey: ['reminder-settings', role] });
                      } catch (caughtError) {
                        setSettingsError((caughtError as Error).message);
                      } finally {
                        setSettingsBusy(false);
                      }
                    }}
                  >
                    {settingsBusy ? 'Saving…' : 'Save reminder settings'}
                  </button>
                </div>
              </>
            ) : (
              <p className="muted">Alexander can review notification posture here, but only Lexi can change reminder delivery settings in this first slice.</p>
            )}
            {settingsError ? <p className="error-text">{settingsError}</p> : null}
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Installability and push readiness</h3>
            </div>
            <p className="muted">Installed as app: <strong>{installed ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Notification permission: <strong>{pushDiagnosticsQuery.data?.notificationPermission ?? Notification.permission}</strong></p>
            <p className="muted">Service worker support: <strong>{pushDiagnosticsQuery.data?.serviceWorkerSupported ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Push support: <strong>{pushDiagnosticsQuery.data?.pushSupported ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Server notifications enabled: <strong>{pushDiagnosticsQuery.data?.notificationsEnabled ? 'Yes' : 'No'}</strong></p>
            <p className="muted">VAPID key configured: <strong>{pushDiagnosticsQuery.data?.vapidPublicKeyConfigured ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Browser subscription: <strong>{pushDiagnosticsQuery.data?.browserSubscriptionEndpoint ? 'Ready' : 'Not subscribed'}</strong></p>
            <p className="muted" style={{ fontSize: 12 }}>Stored subscriptions on server: {notificationQuery.data?.length ?? 0}</p>
            {role === 'stakeholder' ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={async () => {
                    setSettingsBusy(true);
                    setSettingsError(null);
                    try {
                      await registerPushSubscription(role);
                      await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
                      await queryClient.invalidateQueries({ queryKey: ['push-diagnostics', role] });
                    } catch (caughtError) {
                      setSettingsError((caughtError as Error).message);
                    } finally {
                      setSettingsBusy(false);
                    }
                  }}
                >
                  Register this browser for push
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={async () => {
                    setSettingsBusy(true);
                    setSettingsError(null);
                    try {
                      await unsubscribePushSubscription(role);
                      await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
                      await queryClient.invalidateQueries({ queryKey: ['push-diagnostics', role] });
                    } catch (caughtError) {
                      setSettingsError((caughtError as Error).message);
                    } finally {
                      setSettingsBusy(false);
                    }
                  }}
                >
                  Unsubscribe this browser
                </button>
              </div>
            ) : null}
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
