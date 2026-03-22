import { useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { effectiveApiBaseUrl, resolveApiUrl } from '../lib/api';
import { getLastPingDiagnostic } from '../lib/connectivity';
import { loadNotificationState, saveDemoNotificationSubscription, saveNativeNotificationSubscription, loadReminderSettings, saveReminderSettingsCommand } from '../lib/sync';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import type { ActorRole, ReminderNotificationPreferencesInput } from '@olivia/contracts';

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

function PingDiagnosticDisplay() {
  const [diag, setDiag] = useState(getLastPingDiagnostic);
  useEffect(() => {
    const id = setInterval(() => setDiag(getLastPingDiagnostic()), 2000);
    return () => clearInterval(id);
  }, []);
  if (diag.status === 'pending') return <p className="muted">Last ping: waiting for first check…</p>;
  if (diag.status === 'ok') return <p className="muted">Last ping: <strong style={{ color: 'var(--color-success, green)' }}>OK ({diag.httpStatus})</strong></p>;
  if (diag.status === 'http-error') return <p className="muted">Last ping: <strong style={{ color: 'var(--color-error, red)' }}>HTTP {diag.httpStatus}</strong></p>;
  return <p className="muted">Last ping: <strong style={{ color: 'var(--color-error, red)' }}>Network error</strong> — {diag.error}</p>;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { role, setRole } = useRole();
  const queryClient = useQueryClient();
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(readSavedTheme);
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', role], queryFn: () => loadNotificationState(role) });
  const reminderSettingsQuery = useQuery({ queryKey: ['reminder-settings', role], queryFn: () => loadReminderSettings(role) });

  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);

  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);
  const isIOS = useMemo(() => /iPad|iPhone|iPod/.test(navigator.userAgent), []);
  const isNative = useMemo(() => Capacitor.isNativePlatform(), []);

  const handleTheme = (mode: ThemeMode) => {
    applyTheme(mode);
    setActiveTheme(mode);
  };

  // Unified permission state: 'granted' | 'denied' | 'default' | 'unavailable'
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission | 'unavailable'>('unavailable');

  useEffect(() => {
    if (isNative) {
      // Check Capacitor push notification permission
      void PushNotifications.checkPermissions().then((result) => {
        if (result.receive === 'prompt' || result.receive === 'prompt-with-rationale') {
          setBrowserPermission('default');
        } else {
          setBrowserPermission(result.receive as NotificationPermission);
        }
      });
      return;
    }
    // Web fallback
    if (typeof Notification === 'undefined') return;
    setBrowserPermission(Notification.permission);
    const interval = setInterval(() => {
      setBrowserPermission(Notification.permission);
    }, 2000);
    return () => clearInterval(interval);
  }, [isNative]);

  // Listen for Capacitor push registration events to capture APNs token
  useEffect(() => {
    if (!isNative) return;
    const registrationListener = PushNotifications.addListener('registration', (token) => {
      void saveNativeNotificationSubscription(role, token.value);
    });
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });
    return () => {
      void registrationListener.then((h) => h.remove());
      void errorListener.then((h) => h.remove());
    };
  }, [isNative, role]);

  const prefs = reminderSettingsQuery.data?.preferences;
  const masterEnabled = prefs?.enabled ?? false;
  const dueEnabled = prefs?.dueRemindersEnabled ?? false;
  const summaryEnabled = prefs?.dailySummaryEnabled ?? false;

  const savePrefs = useCallback(async (update: Partial<ReminderNotificationPreferencesInput>) => {
    const current: ReminderNotificationPreferencesInput = {
      enabled: masterEnabled,
      dueRemindersEnabled: dueEnabled,
      dailySummaryEnabled: summaryEnabled,
      ...update,
    };
    try {
      await saveReminderSettingsCommand(role, current);
      await queryClient.invalidateQueries({ queryKey: ['reminder-settings', role] });
    } catch {
      // Offline or error — silently fail and let the UI reflect cached state
    }
  }, [masterEnabled, dueEnabled, summaryEnabled, role, queryClient]);

  const oliviaNotifMessage = useMemo(() => {
    if (browserPermission === 'denied') {
      return isNative
        ? 'Notifications are blocked in your device settings. I can\'t send you alerts until you re-enable them in Settings → Olivia → Notifications.'
        : isIOS
        ? 'Notifications are blocked in your device settings. I can\'t send you alerts until you re-enable them in Settings → Safari.'
        : 'Notifications are blocked in your browser. I can\'t send you alerts until you re-enable them in your browser settings.';
    }
    if (!masterEnabled) {
      return 'Reminders always surface in-app even with push off. I\'ll never notify you without your permission.';
    }
    const parts: string[] = [];
    if (dueEnabled) parts.push('I\'ll notify you when reminders come due');
    if (summaryEnabled) parts.push('Daily summary is on');
    else parts.push('Daily summary is off — turn it on for a morning briefing');
    if (!dueEnabled && !summaryEnabled) {
      return 'Push notifications are on, but all notification types are off. Enable one to start receiving alerts.';
    }
    return parts.join('. ') + '.';
  }, [browserPermission, masterEnabled, dueEnabled, summaryEnabled, isIOS, isNative]);

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <button
            type="button"
            className="rem-detail-back"
            onClick={() => void navigate({ to: '/' })}
            aria-label="Back to Home"
          >
            ← Home
          </button>
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
                  {r === 'stakeholder' ? 'Lexi' : 'Christian'}
                </button>
              ))}
            </div>
            <p className="muted" style={{ fontSize: 12 }}>Current: {role === 'stakeholder' ? 'Lexi (stakeholder)' : 'Christian (spouse)'}</p>
          </div>

          {/* Notification Settings */}
          <div className="card stack-md">
            <div className="screen-title" style={{ fontSize: 22 }}>Notifications</div>
            <div className="screen-sub" style={{ marginBottom: 16 }}>
              {masterEnabled ? 'Push notifications are on.' : 'Reminders always surface in-app. Push is optional.'}
            </div>

            <div className="notif-card">
              <div className="rem-toggle-row">
                <div>
                  <div className="notif-type-title">Enable push notifications</div>
                  <div className="notif-type-sub">Allow Olivia to notify your device</div>
                </div>
                <button
                  type="button"
                  className={`rem-toggle${masterEnabled ? ' on' : ''}`}
                  disabled={browserPermission === 'denied'}
                  onClick={() => {
                    const next = !masterEnabled;
                    void (async () => {
                      // Request permission + register if enabling
                      if (next && browserPermission === 'default') {
                        if (isNative) {
                          const permResult = await PushNotifications.requestPermissions();
                          const granted = permResult.receive === 'granted';
                          setBrowserPermission(granted ? 'granted' : 'denied');
                          if (!granted) return;
                          // Register will fire the 'registration' event handled below
                          await PushNotifications.register();
                        } else if (typeof Notification !== 'undefined') {
                          const perm = await Notification.requestPermission();
                          setBrowserPermission(perm);
                          if (perm !== 'granted') return;
                        }
                      }
                      await savePrefs({
                        enabled: next,
                        dueRemindersEnabled: next ? dueEnabled : false,
                        dailySummaryEnabled: next ? summaryEnabled : false,
                      });
                    })();
                  }}
                  aria-label="Toggle push notifications"
                />
              </div>
            </div>

            {browserPermission === 'denied' && (
              <div className="notif-denied-banner" role="alert">
                <div className="notif-denied-title">Notifications blocked by {isNative ? 'device settings' : isIOS ? 'device settings' : 'browser'}</div>
                <div className="notif-denied-body">
                  {isNative ? (
                    <>
                      Your device is blocking notifications for Olivia. To re-enable:
                      <ol className="notif-denied-steps">
                        <li>Open your device <strong>Settings</strong> app</li>
                        <li>Scroll to <strong>Olivia</strong></li>
                        <li>Tap <strong>Notifications</strong> and enable <strong>Allow Notifications</strong></li>
                        <li>Return here</li>
                      </ol>
                    </>
                  ) : isIOS ? (
                    <>
                      Your device is blocking notifications. To re-enable:
                      <ol className="notif-denied-steps">
                        <li>Open your device <strong>Settings</strong> app</li>
                        <li>Scroll to <strong>Safari</strong> → <strong>Settings for Websites</strong> → <strong>Notifications</strong></li>
                        <li>Find this site and set it to <strong>Allow</strong></li>
                        <li>Return here and reload the page</li>
                      </ol>
                      <p className="notif-ios-homescreen-hint">On iOS, Olivia must be added to your Home Screen for push notifications to work.</p>
                    </>
                  ) : (
                    <>
                      Your browser is blocking notifications. To re-enable:
                      <ol className="notif-denied-steps">
                        <li>Click the lock or info icon in your browser's address bar</li>
                        <li>Find <strong>Notifications</strong> and change it to <strong>Allow</strong></li>
                        <li>Reload this page</li>
                      </ol>
                    </>
                  )}
                </div>
              </div>
            )}

            {isIOS && !installed && !isNative && (
              <div className="notif-ios-note" role="note">
                On iOS, Olivia must be added to your Home Screen for push notifications to work.
              </div>
            )}

            <div className="rem-group-header" style={{ marginTop: 8 }}>Notification types</div>

            <div className={`notif-type-row${!masterEnabled ? ' disabled' : ''}`}>
              <div>
                <div className="notif-type-title">Due reminders</div>
                <div className="notif-type-sub">When a reminder is due or overdue</div>
              </div>
              <button
                type="button"
                className={`rem-toggle${dueEnabled ? ' on' : ''}`}
                disabled={!masterEnabled}
                onClick={() => void savePrefs({ dueRemindersEnabled: !dueEnabled })}
                aria-label="Toggle due reminders"
              />
            </div>

            <div className={`notif-type-row${!masterEnabled ? ' disabled' : ''}`}>
              <div>
                <div className="notif-type-title">Daily summary</div>
                <div className="notif-type-sub">Morning digest of upcoming reminders</div>
              </div>
              <button
                type="button"
                className={`rem-toggle${summaryEnabled ? ' on' : ''}`}
                disabled={!masterEnabled}
                onClick={() => void savePrefs({ dailySummaryEnabled: !summaryEnabled })}
                aria-label="Toggle daily summary"
              />
            </div>

            <OliviaMessage text={oliviaNotifMessage} />
          </div>

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Installability</h3>
            </div>
            <p className="muted">Installed as app: <strong>{isNative ? 'Native (Capacitor)' : installed ? 'Yes' : 'No'}</strong></p>
            <p className="muted">Notification permission: <strong>{browserPermission}</strong></p>
            <button
              type="button"
              className="secondary-button"
              onClick={async () => {
                if (isNative) {
                  const permResult = await PushNotifications.requestPermissions();
                  setBrowserPermission(permResult.receive === 'granted' ? 'granted' : permResult.receive === 'denied' ? 'denied' : 'default');
                  if (permResult.receive === 'granted') {
                    await PushNotifications.register();
                  }
                } else {
                  if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission();
                  await saveDemoNotificationSubscription(role);
                }
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

          <div className="card stack-md">
            <div className="section-header">
              <h3 className="card-title">Connectivity diagnostics</h3>
            </div>
            <p className="muted">Platform: <strong>{isNative ? 'Native (Capacitor)' : installed ? 'PWA' : 'Browser'}</strong></p>
            <p className="muted">API base URL: <strong style={{ wordBreak: 'break-all' }}>{effectiveApiBaseUrl}</strong></p>
            <p className="muted">Health check URL: <strong style={{ wordBreak: 'break-all' }}>{resolveApiUrl('/api/health')}</strong></p>
            <PingDiagnosticDisplay />
          </div>
        </div>
      </div>
    </div>
  );
}
