import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo, useState, useCallback, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { clientDb } from '../lib/client-db';
import { useAuth } from '../lib/auth';
import { effectiveApiBaseUrl, resolveApiUrl, fetchAutomationRules } from '../lib/api';
import { HouseholdSection } from '../components/auth/HouseholdSection';
import { runDiagnosticProbe, type ConnectivityDiagnostic } from '../lib/connectivity';
import { loadNotificationState, saveNativeNotificationSubscription, loadReminderSettings, saveReminderSettingsCommand } from '../lib/sync';
import { registerWebPushSubscription } from '../lib/push-opt-in';
import { OliviaMessage } from '../components/reminders/OliviaMessage';
import type { ReminderNotificationPreferencesInput } from '@olivia/contracts';

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

function ConnectivityProbe() {
  const [result, setResult] = useState<ConnectivityDiagnostic | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    try { setResult(await runDiagnosticProbe()); } finally { setRunning(false); }
  }, []);

  useEffect(() => { void run(); }, [run]);

  return (
    <>
      <p className="muted">API base URL: <strong style={{ wordBreak: 'break-all' }}>{effectiveApiBaseUrl}</strong></p>
      <p className="muted">Health check URL: <strong style={{ wordBreak: 'break-all' }}>{resolveApiUrl('/api/health')}</strong></p>
      {result && (
        <>
          <p className="muted">Normal fetch: <strong style={{ color: result.cors === 'ok' ? 'var(--color-success, green)' : 'var(--color-error, red)' }}>{result.corsDetail}</strong></p>
          <p className="muted">No-CORS fetch: <strong style={{ color: result.noCors === 'ok' ? 'var(--color-success, green)' : 'var(--color-error, red)' }}>{result.noCorsDetail}</strong></p>
          {result.noCors === 'ok' && result.cors === 'error' && (
            <p className="muted" style={{ fontStyle: 'italic' }}>Network works but CORS is blocking. Server needs to allow this app's origin.</p>
          )}
          {result.noCors === 'error' && result.cors === 'error' && (
            <p className="muted" style={{ fontStyle: 'italic' }}>Network unreachable — not a CORS issue.</p>
          )}
        </>
      )}
      <button type="button" className="secondary-button" disabled={running} onClick={() => void run()}>
        {running ? 'Testing…' : 'Re-run probe'}
      </button>
    </>
  );
}

type UpcomingNotificationItem = {
  entityType: string;
  entityId: string;
  entityName: string;
  triggerReason: string;
  status: 'pending' | 'held' | 'recently_sent';
  lastSentAt: string | null;
};

function TestNotificationButton() {
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const sendTest = useCallback(async () => {
    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch(resolveApiUrl('/api/push-subscriptions/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.status === 429) {
        setFeedback({ type: 'error', message: 'Please wait a moment before sending another test.' });
        return;
      }
      const data = await res.json() as { success: boolean; deviceCount: number; error?: string };
      if (data.success) {
        setFeedback({ type: 'success', message: 'Test notification sent!' });
      } else {
        setFeedback({ type: 'error', message: data.error ?? 'Failed to send — check your notification settings.' });
      }
    } catch {
      setFeedback({ type: 'error', message: 'Failed to send — check your connection.' });
    } finally {
      setSending(false);
    }
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 5000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className="test-notification-section" style={{ marginTop: 12 }}>
      <div className="rem-group-header">Test</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          className="secondary-button"
          disabled={sending}
          onClick={() => void sendTest()}
          style={{ flex: '0 0 auto' }}
        >
          {sending ? 'Sending…' : 'Send Test Notification'}
        </button>
        {feedback && (
          <span
            className="test-notification-feedback"
            style={{
              fontSize: 13,
              color: feedback.type === 'success' ? 'var(--color-success, green)' : 'var(--color-error, red)',
            }}
          >
            {feedback.message}
          </span>
        )}
      </div>
    </div>
  );
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function ScheduledNotifications() {
  const [items, setItems] = useState<UpcomingNotificationItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(resolveApiUrl('/api/push-notifications/upcoming'));
      const data = await res.json() as { items: UpcomingNotificationItem[] };
      setItems(data.items);
    } catch {
      setItems(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <div className="scheduled-notifications-section" style={{ marginTop: 12 }}>
      <button
        type="button"
        className="rem-group-header"
        onClick={() => setExpanded(!expanded)}
        style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, width: '100%', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span>Scheduled Notifications</span>
        <span style={{ fontSize: 12, opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="scheduled-notifications-list" style={{ marginTop: 8 }}>
          {loading && <p className="muted" style={{ fontSize: 13 }}>Loading…</p>}
          {!loading && (!items || items.length === 0) && (
            <p className="muted" style={{ fontSize: 13 }}>
              No upcoming notifications. Notifications fire when routines are overdue or reminders are due.
            </p>
          )}
          {!loading && items && items.length > 0 && items.map((item) => (
            <div key={item.entityId} className="scheduled-notification-item" style={{ padding: '6px 0', borderBottom: '1px solid var(--border-light, #eee)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500 }}>{item.entityName}</div>
                  <div className="muted" style={{ fontSize: 12 }}>{item.triggerReason}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 12 }}>
                  {item.status === 'recently_sent' && (
                    <span style={{ color: 'var(--color-success, green)' }}>
                      Sent {item.lastSentAt ? formatRelativeTime(item.lastSentAt) : ''}
                    </span>
                  )}
                  {item.status === 'held' && (
                    <span style={{ color: 'var(--color-warning, orange)' }}>Held</span>
                  )}
                  {item.status === 'pending' && (
                    <span className="muted">Pending</span>
                  )}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="secondary-button"
            onClick={() => void load()}
            disabled={loading}
            style={{ marginTop: 8, fontSize: 12 }}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}

function FeedbackToast() {
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('olivia-feedback-toast')) {
      sessionStorage.removeItem('olivia-feedback-toast');
      setVisible(true);
      const timer = setTimeout(() => {
        setDismissing(true);
        setTimeout(() => setVisible(false), 200);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!visible) return null;
  return (
    <div className={`feedback-toast${dismissing ? ' dismissing' : ''}`}>
      <span className="feedback-toast__icon">✓</span>
      <span className="feedback-toast__text">Thanks — your feedback helps us improve Olivia.</span>
    </div>
  );
}

export function SettingsPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTheme, setActiveTheme] = useState<ThemeMode>(readSavedTheme);
  const autoRulesQuery = useQuery({ queryKey: ['automation-rules'], queryFn: fetchAutomationRules });
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', currentUser?.id], queryFn: () => loadNotificationState() });
  const reminderSettingsQuery = useQuery({ queryKey: ['reminder-settings', currentUser?.id], queryFn: () => loadReminderSettings() });

  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [currentUser?.id]);

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
      void saveNativeNotificationSubscription(token.value);
    });
    const errorListener = PushNotifications.addListener('registrationError', (error) => {
      console.error('Push registration error:', error);
    });
    return () => {
      void registrationListener.then((h) => h.remove());
      void errorListener.then((h) => h.remove());
    };
  }, [isNative, currentUser?.id]);

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
      await saveReminderSettingsCommand(current);
      await queryClient.invalidateQueries({ queryKey: ['reminder-settings', currentUser?.id] });
    } catch {
      // Offline or error — silently fail and let the UI reflect cached state
    }
  }, [masterEnabled, dueEnabled, summaryEnabled, currentUser?.id, queryClient]);

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
            onClick={() => window.history.back()}
            aria-label="Go back"
          >
            ← Back
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

          <HouseholdSection />

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
                      if (next) {
                        if (isNative) {
                          if (browserPermission === 'default') {
                            const permResult = await PushNotifications.requestPermissions();
                            const granted = permResult.receive === 'granted';
                            setBrowserPermission(granted ? 'granted' : 'denied');
                            if (!granted) return;
                          }
                          // Always register on native when enabling — ensures APNs token is saved
                          // even if permission was already granted via iOS settings
                          await PushNotifications.register();
                        } else if (typeof Notification !== 'undefined') {
                          if (browserPermission === 'default') {
                            const perm = await Notification.requestPermission();
                            setBrowserPermission(perm);
                            if (perm !== 'granted') return;
                          }
                          // Create a real Web Push subscription and register it with the server
                          await registerWebPushSubscription();
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

            {masterEnabled && browserPermission === 'granted' && (
              <TestNotificationButton />
            )}

            {masterEnabled && browserPermission === 'granted' && (
              <ScheduledNotifications />
            )}
          </div>

          {/* Send Feedback row */}
          <button
            type="button"
            className="feedback-row"
            onClick={() => void navigate({ to: '/more/settings/feedback' })}
          >
            <span className="feedback-row__icon">💬</span>
            <span className="feedback-row__label">Send Feedback</span>
            <span className="feedback-row__chevron">›</span>
          </button>

          {/* Automation Rules row */}
          <button
            type="button"
            className="auto-row"
            onClick={() => void navigate({ to: '/more/settings/automation' })}
          >
            <div className="auto-row__icon">⚡</div>
            <div className="auto-row__content">
              <div className="auto-row__label">Automation Rules</div>
              <div className="auto-row__count">
                {autoRulesQuery.data
                  ? autoRulesQuery.data.rules.length === 0
                    ? 'No rules yet'
                    : `${autoRulesQuery.data.rules.filter((r) => r.enabled).length} active`
                  : ''}
              </div>
            </div>
            <div className="auto-row__chevron">›</div>
          </button>

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
                  await registerWebPushSubscription();
                }
                await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', currentUser?.id] });
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
            <ConnectivityProbe />
          </div>
        </div>
      </div>
      <FeedbackToast />
    </div>
  );
}
