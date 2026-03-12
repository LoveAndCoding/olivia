import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { loadInboxView } from '../lib/sync';
import { useRole } from '../lib/role';
import {
  DEFAULT_UPCOMING_EVENTS,
  PERSON_LABELS,
  getActiveItems,
  getGreeting,
  getHomeSubtitle,
  getNudgeCopy,
  getNudgeSuggestion,
  getTaskBadge,
  getTaskMeta,
  getTaskVariant
} from '../lib/view-models';

export function HomePage() {
  const navigate = useNavigate();
  const { role } = useRole();
  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'home'],
    queryFn: () => loadInboxView(role, 'all')
  });

  const activeItems = useMemo(() => getActiveItems(inboxQuery.data).slice(0, 3), [inboxQuery.data]);
  const nudge = useMemo(() => getNudgeSuggestion(inboxQuery.data), [inboxQuery.data]);
  const nudgeCopy = useMemo(() => getNudgeCopy(nudge), [nudge]);

  const openOlivia = () => {
    void navigate({
      to: '/olivia',
      search: nudge ? { intent: 'follow-up', itemId: nudge.itemId } : { intent: 'default' }
    });
  };

  return (
    <div className="screen stack-lg">
      <section className="home-hero stack-md">
        <div className="home-hero-top">
          <div className="wordmark">olivia</div>
          <div className="avatar-stack" aria-hidden="true">
            <span className="avatar avatar-j">J</span>
            <span className="avatar avatar-a">A</span>
          </div>
        </div>

        <div className="stack-sm">
          <h1 className="greeting-title">
            {getGreeting()},
            <br />
            <em>{PERSON_LABELS.stakeholder}.</em>
          </h1>
          <p className="screen-subtitle">{getHomeSubtitle(getActiveItems(inboxQuery.data), new Date())}</p>
        </div>

        {nudge && nudgeCopy ? (
          <section className="nudge-card" role="button" tabIndex={0} onClick={openOlivia} onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openOlivia();
            }
          }}>
            <div className="nudge-bubbles" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="stack-md nudge-content">
              <div className="nudge-eyebrow">
                <span className="nudge-dot" />
                <span>Olivia noticed</span>
              </div>
              <p className="nudge-message">{nudgeCopy}</p>
              <div className="nudge-actions">
                <button
                  type="button"
                  className="nudge-btn-primary"
                  onClick={(event) => {
                    event.stopPropagation();
                    openOlivia();
                  }}
                >
                  Help with it
                </button>
                <button
                  type="button"
                  className="nudge-btn-secondary"
                  onClick={(event) => {
                    event.stopPropagation();
                    void navigate({ to: '/tasks' });
                  }}
                >
                  Later
                </button>
              </div>
            </div>
          </section>
        ) : null}
      </section>

      <section className="stack-md">
        <div className="section-header-row">
          <h2 className="section-title">Needs doing</h2>
          <Link to="/tasks" className="section-link">All tasks</Link>
        </div>
        {inboxQuery.isLoading ? <div className="panel-card">Loading tasks...</div> : null}
        {inboxQuery.isError ? <div className="panel-card">{(inboxQuery.error as Error).message}</div> : null}
        {activeItems.length === 0 && !inboxQuery.isLoading ? (
          <div className="panel-card celebration-note">Nothing left to do today - nice work.</div>
        ) : null}
        <div className="stack-md">
          {activeItems.map((item) => (
            <Link key={item.id} to="/items/$itemId" params={{ itemId: item.id }} className={`task-card compact task-${getTaskVariant(item, role)}`}>
              <span className="task-checkbox" aria-hidden="true" />
              <div className="task-main">
                <div className="task-topline">
                  <strong className="task-title">{item.title}</strong>
                  {item.pendingSync ? (
                    <span className="task-badge badge-mint">Pending sync</span>
                  ) : getTaskBadge(item, role) ? (
                    <span className={`task-badge badge-${getTaskBadge(item, role)?.tone}`}>{getTaskBadge(item, role)?.label}</span>
                  ) : null}
                </div>
                <p className="task-meta">{getTaskMeta(item)}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="divider" />

      <section className="stack-md">
        <div className="section-header-row">
          <h2 className="section-title">Coming up</h2>
        </div>
        <div className="events-row">
          {DEFAULT_UPCOMING_EVENTS.map((event) => (
            <article key={event.id} className="event-tile">
              <div className="event-date-pill">
                <span className="event-date-day">{event.day}</span>
                <span className="event-date-month">{event.month}</span>
              </div>
              <strong className="event-title">{event.title}</strong>
              <span className="event-detail">{event.detail}</span>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
