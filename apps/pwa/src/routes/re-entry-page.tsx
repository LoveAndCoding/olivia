import { useSearch, useNavigate } from '@tanstack/react-router';
import { BottomNav } from '../components/bottom-nav';

export function ReEntryPage() {
  const search = useSearch({ from: '/re-entry' });
  const navigate = useNavigate();
  const isReminderEntry = Boolean(search.reminderId) || search.reason.includes('reminder');
  const primaryLabel = search.reminderId ? 'Open reminder' : isReminderEntry ? 'View reminders' : search.itemId ? 'Open item' : 'View tasks';
  const primaryAction = () => {
    if (search.reminderId) {
      return navigate({ to: '/reminders/$reminderId', params: { reminderId: search.reminderId } });
    }
    if (isReminderEntry) {
      return navigate({ to: '/reminders' });
    }
    if (search.itemId) {
      return navigate({ to: '/items/$itemId', params: { itemId: search.itemId } });
    }
    return navigate({ to: '/tasks' });
  };

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <div className="card stack-md">
            <span className="eyebrow">Notification re-entry</span>
            <h2 className="card-title">Coming from: {search.reason.replace(/-/g, ' ')}</h2>
            <p className="muted">
              This is the notification landing point that brings you back into Olivia's review flow.
              {search.reminderId ? ' The reminder detail is ready to review.' : null}
            </p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void primaryAction()}
            >
              {primaryLabel}
            </button>
            {isReminderEntry ? (
              <button type="button" className="secondary-button" onClick={() => void navigate({ to: '/reminders' })}>
                See all reminders
              </button>
            ) : null}
            {search.itemId ? (
              <button type="button" className="secondary-button" onClick={() => void navigate({ to: '/tasks' })}>
                Back to inbox
              </button>
            ) : null}
            {search.reminderId ? (
              <p className="muted" style={{ fontSize: 12 }}>Reminder id: {search.reminderId}</p>
            ) : null}
            {search.itemId ? (
              <p className="muted" style={{ fontSize: 12 }}>Item id: {search.itemId}</p>
            ) : null}
            <button type="button" className="secondary-button" onClick={() => void navigate({ to: '/' })}>
              Home
            </button>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
