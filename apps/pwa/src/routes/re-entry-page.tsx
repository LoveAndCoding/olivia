import { useSearch, useNavigate } from '@tanstack/react-router';
import { BottomNav } from '../components/bottom-nav';

export function ReEntryPage() {
  const search = useSearch({ from: '/re-entry' });
  const navigate = useNavigate();

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div className="support-page">
          <div className="card stack-md">
            <span className="eyebrow">Notification re-entry</span>
            <h2 className="card-title">Coming from: {search.reason.replace(/-/g, ' ')}</h2>
            <p className="muted">This is the notification landing point that brings you back into Olivia.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => void navigate({ to: '/tasks' })}
            >
              View tasks
            </button>
          </div>
        </div>
      </div>
      <BottomNav activeTab="home" />
    </div>
  );
}
