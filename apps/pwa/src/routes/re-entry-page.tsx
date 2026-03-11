import { Link, useSearch } from '@tanstack/react-router';

export function ReEntryPage() {
  const search = useSearch({ from: '/re-entry' });
  return (
    <section className="card stack-md">
      <p className="eyebrow">Notification re-entry</p>
      <h2>Reason: {search.reason.replace(/-/g, ' ')}</h2>
      <p>This route is the notification landing point that brings the user back into Olivia's structured review flow.</p>
      <Link to="/" className="primary-button link-button">Return to inbox review</Link>
    </section>
  );
}
