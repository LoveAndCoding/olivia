import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMemo } from 'react';
import { clientDb } from '../lib/client-db';
import { useRole } from '../lib/role';
import { loadNotificationState, saveDemoNotificationSubscription } from '../lib/sync';

export function SettingsPage() {
  const { role } = useRole();
  const queryClient = useQueryClient();
  const notificationQuery = useQuery({ queryKey: ['notification-subscriptions', role], queryFn: () => loadNotificationState(role) });
  const diagnostics = useLiveQuery(async () => {
    const pending = await clientDb.outbox.where('state').equals('pending').count();
    const conflicts = await clientDb.outbox.where('state').equals('conflict').count();
    return { pending, conflicts };
  }, [role]);
  const installed = useMemo(() => window.matchMedia('(display-mode: standalone)').matches, []);

  return (
    <div className="stack-lg">
      <section className="card stack-md">
        <div className="section-header"><h2>Installability and role</h2><span className="muted">Minimal settings and early validation info</span></div>
        <p>Current role: <strong>{role}</strong></p>
        <p>Installed as app: <strong>{installed ? 'Yes' : 'No'}</strong></p>
        <p>Notification permission: <strong>{Notification.permission}</strong></p>
      </section>

      <section className="card stack-md">
        <div className="section-header"><h2>Notification plumbing</h2><span className="muted">Stores a replaceable browser notification target</span></div>
        <button type="button" className="primary-button" onClick={async () => {
          if (Notification.permission === 'default') await Notification.requestPermission();
          await saveDemoNotificationSubscription(role);
          await queryClient.invalidateQueries({ queryKey: ['notification-subscriptions', role] });
        }}>Save demo notification target</button>
        <p className="muted">Stored subscriptions: {notificationQuery.data?.length ?? 0}</p>
      </section>

      <section className="card stack-md">
        <div className="section-header"><h2>Sync diagnostics</h2><span className="muted">Early validation support</span></div>
        <p>Pending commands: {diagnostics?.pending ?? 0}</p>
        <p>Conflicts: {diagnostics?.conflicts ?? 0}</p>
        <a className="link-button secondary-link" href="/re-entry?reason=due-soon-review">Open notification re-entry route</a>
      </section>
    </div>
  );
}
