import { useState, useEffect } from 'react';
import type { User } from '@olivia/contracts';
import type { EventItem, NudgeData, SummaryTask } from '../../types/display';
import { useAuth } from '../../lib/auth';
import { getHouseholdMembers } from '../../lib/auth-api';

export type HomeViewProps = {
  greeting: string;
  displayName: string;
  subtitle: string;
  nudge: NudgeData | null;
  tasks: SummaryTask[];
  events: EventItem[];
  isLoading?: boolean;
  error?: string | null;
  onNudgePrimary?: () => void;
  onAllTasksClick?: () => void;
};

export function HomeView({
  greeting,
  displayName,
  subtitle,
  nudge,
  tasks,
  events,
  isLoading,
  error,
  onNudgePrimary,
  onAllTasksClick,
}: HomeViewProps) {
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const { user: currentUser, getSessionToken } = useAuth();
  const [members, setMembers] = useState<User[]>(currentUser ? [currentUser] : []);
  useEffect(() => {
    const token = getSessionToken();
    if (!token) return;
    getHouseholdMembers(token).then(res => setMembers(res.members)).catch(() => {});
  }, [getSessionToken]);

  return (
    <div className="screen-scroll">
      {/* Header */}
      <div className="home-header">
        <div className="home-header-row">
          <div className="wordmark">olivia</div>
          <div className="avatar-stack" aria-label="Household members">
            {members.map((m, idx) => (
              <div key={m.id} className={`av${idx === 0 ? ' av-l' : ' av-a'}`} title={m.name}>{m.name.charAt(0).toUpperCase()}</div>
            ))}
          </div>
        </div>
        <div className="greeting">
          {greeting}
          <br />
          <em>{displayName}.</em>
        </div>
        <div className="greeting-sub">{subtitle}</div>
      </div>

      {/* Olivia nudge card */}
      {nudge && !nudgeDismissed && (
        <div
          className="nudge"
          role="region"
          aria-label="Olivia's suggestion"
          onClick={onNudgePrimary}
        >
          <div className="nudge-deco nudge-deco-1" aria-hidden="true" />
          <div className="nudge-deco nudge-deco-2" aria-hidden="true" />
          <div className="nudge-deco nudge-deco-3" aria-hidden="true" />
          <div className="nudge-eyebrow">
            <div className="nudge-dot" aria-hidden="true" />
            Olivia noticed
          </div>
          <div className="nudge-msg">{nudge.message}</div>
          <div className="nudge-actions">
            <button
              type="button"
              className="nudge-btn nudge-btn-primary"
              onClick={(e) => { e.stopPropagation(); onNudgePrimary?.(); }}
            >
              {nudge.primaryCta}
            </button>
            <button
              type="button"
              className="nudge-btn nudge-btn-secondary"
              onClick={(e) => { e.stopPropagation(); setNudgeDismissed(true); }}
            >
              {nudge.secondaryCta}
            </button>
          </div>
        </div>
      )}

      {/* Needs doing */}
      <div className="section-head">
        <div className="section-title">Needs doing</div>
        <button type="button" className="section-link" onClick={onAllTasksClick}>
          All tasks →
        </button>
      </div>

      {isLoading && (
        <div style={{ padding: '16px 22px', color: 'var(--ink-3)', fontSize: 13 }}>
          Loading…
        </div>
      )}

      {error && !isLoading && (
        <div style={{ padding: '16px 22px', color: 'var(--rose)', fontSize: 13 }}>
          {error}
        </div>
      )}

      {!isLoading && !error && tasks.length === 0 && (
        <div className="empty-state">
          <p>Nothing needs doing right now — nice work.</p>
        </div>
      )}

      {tasks.length > 0 && (
        <div className="tasks-summary">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task${task.accent ? ` ${task.accent}` : ''}`}
              onClick={onAllTasksClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onAllTasksClick?.()}
            >
              <div
                className="task-checkbox"
                role="checkbox"
                aria-checked="false"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                tabIndex={-1}
                aria-label={`Mark "${task.title}" complete`}
              />
              <div className="task-info">
                <div className="task-name">{task.title}</div>
                <div className="task-meta">{task.meta}</div>
              </div>
              {task.badge && (
                <div className={`badge ${task.badgeClass}`}>{task.badge}</div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="divider" />

      {/* Coming up */}
      <div className="section-head">
        <div className="section-title">Coming up</div>
      </div>

      {events.length === 0 ? (
        <div className="empty-state">
          <p>Nothing coming up yet.</p>
        </div>
      ) : (
        <div className="upcoming-strip" role="list" aria-label="Upcoming events">
          {events.map((event) => (
            <div key={`${event.dateNum}-${event.name}`} className="event-tile" role="listitem">
              <div className="event-date-pill">
                <div className="event-date-num">{event.dateNum}</div>
                <div className="event-date-mo">{event.dateMon}</div>
              </div>
              <div className="event-name">{event.name}</div>
              <div className="event-time">{event.time}</div>
            </div>
          ))}
        </div>
      )}

      <div className="spacer-bottom" />
    </div>
  );
}
