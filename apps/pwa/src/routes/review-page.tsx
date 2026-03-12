import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { computeFlags } from '@olivia/domain';
import type { InboxItem, Owner } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { loadInboxView } from '../lib/sync';

const ownerOptions: Array<Owner | 'all'> = ['all', 'stakeholder', 'spouse', 'unassigned'];

export function ReviewPage() {
  const { role } = useRole();
  const [view, setView] = useState<'active' | 'all'>('active');
  const [ownerFilter, setOwnerFilter] = useState<Owner | 'all'>('all');

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, view],
    queryFn: () => loadInboxView(role, view)
  });

  const groups = useMemo(() => {
    const response = inboxQuery.data;
    if (!response) {
      return null;
    }
    const filterItems = (items: InboxItem[]) => (ownerFilter === 'all' ? items : items.filter((item) => item.owner === ownerFilter));
    return {
      open: filterItems(response.itemsByStatus.open),
      inProgress: filterItems(response.itemsByStatus.in_progress),
      deferred: filterItems(response.itemsByStatus.deferred),
      done: filterItems(response.itemsByStatus.done)
    };
  }, [inboxQuery.data, ownerFilter]);

  const overview = useMemo(() => {
    if (!groups || !inboxQuery.data) {
      return null;
    }

    const visibleItems = [...groups.open, ...groups.inProgress, ...(view === 'all' ? [...groups.deferred, ...groups.done] : [])];
    const attentionCount = visibleItems.filter((item) => {
      const flags = computeFlags(item);
      return flags.overdue || flags.dueSoon || flags.stale || flags.unassigned;
    }).length;

    return [
      { label: 'Active items', value: groups.open.length + groups.inProgress.length, tone: 'neutral' },
      { label: 'Need attention', value: attentionCount, tone: 'warning' },
      { label: 'Suggestions', value: inboxQuery.data.suggestions.length, tone: 'info' },
      { label: 'Viewing as', value: role === 'stakeholder' ? 'Stakeholder' : 'Spouse', tone: 'success' }
    ];
  }, [groups, inboxQuery.data, role, view]);

  return (
    <div className="stack-lg">
      <section className="card hero-card accent-review stack-md">
        <div className="section-header">
          <div className="stack-sm">
            <p className="eyebrow">Review</p>
            <h2>Household state at a glance</h2>
            <p className="muted">
              Grouped active items, calm suggestions, and spouse-safe visibility in a softer mobile-first layout.
            </p>
          </div>
          <span className="section-note">{view === 'active' ? 'Focused on active work' : 'Showing the full household record'}</span>
        </div>

        {overview ? (
          <div className="metrics-grid">
            {overview.map((metric) => (
              <div key={metric.label} className={`metric-card tone-${metric.tone}`}>
                <span className="metric-label">{metric.label}</span>
                <strong className="metric-value">{metric.value}</strong>
              </div>
            ))}
          </div>
        ) : null}

        <div className="quick-actions">
          {role === 'stakeholder' ? <Link to="/add" className="primary-button quick-action-primary">Quick capture</Link> : null}
          <button type="button" className="secondary-button quick-action-secondary" onClick={() => setView((current) => current === 'active' ? 'all' : 'active')}>
            {view === 'active' ? 'Show all items' : 'Return to active'}
          </button>
        </div>

        <div className="toolbar-row">
          <label className="stack-sm">
            <span className="field-label">View</span>
            <select value={view} onChange={(event) => setView(event.target.value as 'active' | 'all')}>
              <option value="active">Active</option>
              <option value="all">All items</option>
            </select>
          </label>
          <label className="stack-sm">
            <span className="field-label">Owner filter</span>
            <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value as Owner | 'all')}>
              {ownerOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </label>
        </div>
      </section>

      {inboxQuery.isLoading ? <section className="card">Loading inbox…</section> : null}
      {inboxQuery.isError ? <section className="card error-card">{(inboxQuery.error as Error).message}</section> : null}

      {inboxQuery.data ? (
        <>
          {inboxQuery.data.source === 'cache' ? <section className="card warning-card">Showing last-known cached state while the API is unreachable.</section> : null}

          <section className="card accent-suggestions stack-md">
            <div className="section-header">
              <div className="stack-sm">
                <p className="eyebrow">Suggestions</p>
                <h2>Priority nudges</h2>
              </div>
              <span className="section-note">At most two prioritized nudges</span>
            </div>
            {inboxQuery.data.suggestions.length === 0 ? <p className="muted">No urgent suggestions right now.</p> : null}
            <div className="suggestion-grid">
              {inboxQuery.data.suggestions.map((suggestion) => (
                <Link key={suggestion.itemId} to="/items/$itemId" params={{ itemId: suggestion.itemId }} className="suggestion-card">
                  <span className="chip info">Suggested next step</span>
                  <strong>{suggestion.title}</strong>
                  <span>{suggestion.message}</span>
                </Link>
              ))}
            </div>
          </section>

          <StatusGroup title="Open" items={groups?.open ?? []} tone="accent-open" />
          <StatusGroup title="In progress" items={groups?.inProgress ?? []} tone="accent-progress" />
          {view === 'all' ? <StatusGroup title="Deferred" items={groups?.deferred ?? []} tone="accent-deferred" /> : null}
          {view === 'all' ? <StatusGroup title="Done" items={groups?.done ?? []} tone="accent-done" /> : null}
        </>
      ) : null}
    </div>
  );
}

function StatusGroup({ title, items, tone }: { title: string; items: InboxItem[]; tone: string }) {
  return (
    <section className={`card stack-md ${tone}`}>
      <div className="section-header">
        <div className="stack-sm">
          <p className="eyebrow">Status</p>
          <h2>{title}</h2>
        </div>
        <span className="section-note">{items.length} items</span>
      </div>
      {items.length === 0 ? <p className="muted">Nothing here.</p> : null}
      <div className="item-grid">
        {items.map((item) => {
          const flags = computeFlags(item);
          return (
            <Link key={item.id} to="/items/$itemId" params={{ itemId: item.id }} className="item-card">
              <div className="item-card-header">
                <div className="stack-sm">
                  <span className="eyebrow">Inbox item</span>
                  <strong>{item.title}</strong>
                </div>
                {item.pendingSync ? <span className="chip pending">Pending sync</span> : null}
              </div>
              <p className="muted">Owner: {item.owner} · Status: {item.status.replace('_', ' ')}</p>
              {item.dueText ? <p className="muted">Due: {item.dueText}</p> : null}
              <div className="chip-row">
                {flags.overdue ? <span className="chip danger">Overdue</span> : null}
                {flags.dueSoon ? <span className="chip info">Due soon</span> : null}
                {flags.stale ? <span className="chip warning">Stale</span> : null}
                {flags.unassigned ? <span className="chip neutral">Unassigned</span> : null}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
