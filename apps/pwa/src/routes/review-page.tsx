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

  return (
    <div className="stack-lg">
      <section className="card toolbar-card">
        <div>
          <h2>Review household state</h2>
          <p className="muted">Grouped active items, calm suggestions, and spouse-safe visibility.</p>
        </div>
        <div className="toolbar-row">
          <label>
            View
            <select value={view} onChange={(event) => setView(event.target.value as 'active' | 'all')}>
              <option value="active">Active</option>
              <option value="all">All items</option>
            </select>
          </label>
          <label>
            Owner filter
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

          <section className="card stack-md">
            <div className="section-header">
              <h2>Suggestions</h2>
              <span className="muted">At most two prioritized nudges</span>
            </div>
            {inboxQuery.data.suggestions.length === 0 ? <p className="muted">No urgent suggestions right now.</p> : null}
            {inboxQuery.data.suggestions.map((suggestion) => (
              <Link key={suggestion.itemId} to="/items/$itemId" params={{ itemId: suggestion.itemId }} className="suggestion-card">
                <strong>{suggestion.title}</strong>
                <span>{suggestion.message}</span>
              </Link>
            ))}
          </section>

          <StatusGroup title="Open" items={groups?.open ?? []} />
          <StatusGroup title="In progress" items={groups?.inProgress ?? []} />
          {view === 'all' ? <StatusGroup title="Deferred" items={groups?.deferred ?? []} /> : null}
          {view === 'all' ? <StatusGroup title="Done" items={groups?.done ?? []} /> : null}
        </>
      ) : null}
    </div>
  );
}

function StatusGroup({ title, items }: { title: string; items: InboxItem[] }) {
  return (
    <section className="card stack-md">
      <div className="section-header">
        <h2>{title}</h2>
        <span className="muted">{items.length} items</span>
      </div>
      {items.length === 0 ? <p className="muted">Nothing here.</p> : null}
      <div className="stack-md">
        {items.map((item) => {
          const flags = computeFlags(item);
          return (
            <Link key={item.id} to="/items/$itemId" params={{ itemId: item.id }} className="item-card">
              <div className="item-card-header">
                <strong>{item.title}</strong>
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
