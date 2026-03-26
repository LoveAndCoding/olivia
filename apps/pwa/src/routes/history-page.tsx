import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from '@tanstack/react-router';
import { ArrowsClockwise, Bell, ForkKnife, Tray, Check } from '@phosphor-icons/react';
import { BottomNav } from '../components/bottom-nav';
import { loadActivityHistory } from '../lib/sync';
import type { ActivityHistoryDay, ActivityHistoryItem } from '@olivia/contracts';

function formatDayHeader(dateStr: string): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  if (dateStr === todayStr) return 'Today';
  if (dateStr === yesterdayStr) return 'Yesterday';

  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function itemDeepLinkPath(item: ActivityHistoryItem): string {
  switch (item.type) {
    case 'routine':
      // Ritual completions navigate to the review record detail
      if (item.reviewRecordId) return `/review-records/${item.reviewRecordId}`;
      return `/routines/${item.routineId}`;
    case 'reminder': return `/reminders/${item.reminderId}`;
    case 'meal': return `/meals/${item.planId}`;
    case 'inbox': return `/items/${item.itemId}`;
    case 'listItem': return `/lists/${item.listId}`;
  }
}

function itemIcon(type: ActivityHistoryItem['type']): ReactNode {
  switch (type) {
    case 'routine': return <ArrowsClockwise size={18} />;
    case 'reminder': return <Bell size={18} />;
    case 'meal': return <ForkKnife size={18} />;
    case 'inbox': return <Tray size={18} />;
    case 'listItem': return <Check size={18} />;
  }
}

function itemColorClass(type: ActivityHistoryItem['type']): string {
  switch (type) {
    case 'routine': return 'history-item--routine';
    case 'reminder': return 'history-item--reminder';
    case 'meal': return 'history-item--meal';
    case 'inbox': return 'history-item--inbox';
    case 'listItem': return 'history-item--list';
  }
}

function itemTitle(item: ActivityHistoryItem): string {
  switch (item.type) {
    case 'routine': return item.routineTitle;
    case 'reminder': return item.title;
    case 'meal': return item.name;
    case 'inbox': return item.title;
    case 'listItem': return item.body;
  }
}

function itemSubtitle(item: ActivityHistoryItem): string | null {
  switch (item.type) {
    case 'meal': return item.planTitle;
    case 'listItem': return item.listName;
    default: return null;
  }
}

function HistoryItemRow({ item }: { item: ActivityHistoryItem }) {
  const navigate = useNavigate();
  const icon = itemIcon(item.type);
  const colorClass = itemColorClass(item.type);
  const title = itemTitle(item);
  const subtitle = itemSubtitle(item);
  const path = itemDeepLinkPath(item);
  const isRitualCompletion = item.type === 'routine' && !!item.reviewRecordId;

  if (isRitualCompletion) {
    return (
      <button
        type="button"
        className={`history-item ${colorClass}`}
        style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer', padding: 0 }}
        onClick={() => void navigate({ to: '/review-records/$reviewRecordId', params: { reviewRecordId: item.reviewRecordId! } })}
      >
        <span className="history-item__icon" aria-hidden="true">{icon}</span>
        <span className="history-item__text">
          <span className="history-item__title">{title}</span>
          <span className="history-item__subtitle" style={{ fontSize: 11, fontWeight: 500, color: 'var(--ink-3)' }}>
            Review
          </span>
        </span>
      </button>
    );
  }

  return (
    <Link to={path} className={`history-item ${colorClass}`}>
      <span className="history-item__icon" aria-hidden="true">{icon}</span>
      <span className="history-item__text">
        <span className="history-item__title">{title}</span>
        {subtitle && <span className="history-item__subtitle">{subtitle}</span>}
      </span>
    </Link>
  );
}

function DaySection({ day }: { day: ActivityHistoryDay }) {
  return (
    <section className="history-day">
      <h2 className="history-day__header">{formatDayHeader(day.date)}</h2>
      <ul className="history-day__items" role="list">
        {day.items.map((item, i) => (
          <li key={i}>
            <HistoryItemRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HistoryPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['activityHistory'],
    queryFn: () => loadActivityHistory(),
    staleTime: 60_000
  });

  return (
    <div className="screen">
      <div className="screen-scroll">
        <div style={{ padding: '22px 16px 0' }}>
          <button type="button" className="rem-detail-back" onClick={() => void navigate({ to: '/more' })}>← More</button>
        </div>
        <div className="screen-header">
          <div className="screen-title">History</div>
        </div>


        {isLoading && (
          <div className="history-loading" role="status" aria-live="polite">
            Loading…
          </div>
        )}

        {isError && (
          <div className="history-error" role="alert">
            Could not load activity history.
          </div>
        )}

        {data && data.days.length === 0 && (
          <div className="history-empty">
            <p className="history-empty__message">No activity in the last 30 days.</p>
          </div>
        )}

        {data && data.days.length > 0 && (
          <div className="history-days">
            {data.days.map((day) => (
              <DaySection key={day.date} day={day} />
            ))}
            <p className="history-end-label">Showing the last 30 days</p>
          </div>
        )}

        <div className="spacer-bottom" />
      </div>

      <BottomNav activeTab="more" />
    </div>
  );
}
