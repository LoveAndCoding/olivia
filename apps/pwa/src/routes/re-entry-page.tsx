import { Link, useSearch } from '@tanstack/react-router';

export function ReEntryPage() {
  const search = useSearch({ from: '/re-entry' });
  return (
    <section className="screen stack-lg">
      <div className="panel-card stack-md">
        <span className="caps-label">Notification re-entry</span>
        <h1 className="screen-title">Reason: {search.reason.replace(/-/g, ' ')}</h1>
        <p className="screen-subtitle">This route brings the user back into Olivia's structured review flow after a calm prompt.</p>
        <div className="button-row">
          <Link to="/tasks" className="btn-primary inline-link">Open tasks</Link>
          <Link to="/" className="btn-secondary inline-link">Back home</Link>
        </div>
      </div>
    </section>
  );
}
