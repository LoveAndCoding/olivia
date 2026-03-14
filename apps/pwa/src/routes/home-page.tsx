import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { computeFlags } from '@olivia/domain';
import type { InboxItem } from '@olivia/contracts';
import { useRole } from '../lib/role';
import { flattenReminderGroups, reminderToEventItem } from '../lib/reminders';
import { loadInboxView, loadReminderView } from '../lib/sync';
import { getDisplayName, ownerToDisplay } from '../lib/demo-data';
import { BottomNav } from '../components/bottom-nav';
import { HomeView } from '../components/screens/HomeView';
import type { EventItem, SummaryTask } from '../types/display';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function getDateSubtitle(count: number): string {
  const now = new Date();
  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const day = now.getDate();
  const things = count === 1 ? '1 thing needs you today' : `${count} things need you today`;
  return `${dayName}, ${month} ${day} · ${things}`;
}

function inboxItemToSummary(item: InboxItem, userRole: string): SummaryTask {
  const flags = computeFlags(item);
  const isShared = item.owner === 'spouse' && userRole === 'stakeholder';
  const isStakeholderItem = item.owner === 'stakeholder' && userRole === 'spouse';

  let badge = '';
  let badgeClass = '';
  let accent: SummaryTask['accent'] = null;

  if (flags.overdue) {
    badge = 'Overdue'; badgeClass = 'badge-rose'; accent = 'rose';
  } else if (flags.dueSoon) {
    badge = 'Soon'; badgeClass = 'badge-peach'; accent = 'peach';
  } else if (isShared || isStakeholderItem) {
    badge = 'Shared'; badgeClass = 'badge-violet'; accent = 'mint';
  }

  let meta = '';
  if (item.dueText) {
    const ownerName = item.owner !== userRole ? ` · ${ownerToDisplay(item.owner)}` : '';
    meta = `${item.dueText}${ownerName}`;
  } else if (flags.stale) {
    meta = 'Added a while ago · no reply';
  } else {
    meta = item.owner !== 'unassigned' ? ownerToDisplay(item.owner) : 'Open';
  }

  return { id: item.id, title: item.title, meta, badge, badgeClass, accent };
}

export function HomePage() {
  const navigate = useNavigate();
  const { role } = useRole();

  const inboxQuery = useQuery({
    queryKey: ['inbox-view', role, 'active'],
    queryFn: () => loadInboxView(role, 'active'),
  });
  const reminderQuery = useQuery({
    queryKey: ['reminders-view', role],
    queryFn: () => loadReminderView(role),
  });

  const { summaryTasks, needsCount } = useMemo(() => {
    const allOpen = inboxQuery.data
      ? [...inboxQuery.data.itemsByStatus.open, ...inboxQuery.data.itemsByStatus.in_progress]
      : [];

    if (allOpen.length === 0) {
      return { summaryTasks: [], needsCount: 0 };
    }

    const sorted = [...allOpen].sort((a, b) => {
      const fa = computeFlags(a);
      const fb = computeFlags(b);
      if (fa.overdue && !fb.overdue) return -1;
      if (!fa.overdue && fb.overdue) return 1;
      if (fa.dueSoon && !fb.dueSoon) return -1;
      if (!fa.dueSoon && fb.dueSoon) return 1;
      return 0;
    });

    const top3 = sorted.slice(0, 3).map((item) => inboxItemToSummary(item, role));
    const count = allOpen.filter((item) => {
      const f = computeFlags(item);
      return f.overdue || f.dueSoon;
    }).length;

    return { summaryTasks: top3, needsCount: count };
  }, [inboxQuery.data, role]);

  const events = useMemo<EventItem[]>(() => {
    if (!reminderQuery.data) {
      return [];
    }

    return flattenReminderGroups(reminderQuery.data)
      .filter((reminder) => reminder.state !== 'completed' && reminder.state !== 'cancelled')
      .slice(0, 4)
      .map(reminderToEventItem);
  }, [reminderQuery.data]);

  return (
    <div className="screen">
      <HomeView
        greeting={getGreeting()}
        displayName={getDisplayName(role)}
        subtitle={getDateSubtitle(needsCount)}
        nudge={null}
        tasks={summaryTasks}
        events={events}
        isLoading={inboxQuery.isLoading || reminderQuery.isLoading}
        error={inboxQuery.isError ? (inboxQuery.error as Error).message : reminderQuery.isError ? (reminderQuery.error as Error).message : null}
        onNudgePrimary={() => void navigate({ to: '/olivia' })}
        onAllTasksClick={() => void navigate({ to: '/tasks' })}
        onAllEventsClick={() => void navigate({ to: '/reminders' })}
      />
      <BottomNav activeTab="home" />
    </div>
  );
}
