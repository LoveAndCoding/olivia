import { format, isSameDay, isWithinInterval, startOfDay } from 'date-fns';
import { computeFlags } from '@olivia/domain';
import type { ActorRole, InboxItem, InboxViewResponse, Suggestion } from '@olivia/contracts';

export type TaskFilter = 'all' | 'mine' | 'shared' | 'overdue' | 'snoozed';

export type UpcomingEvent = {
  id: string;
  day: string;
  month: string;
  title: string;
  detail: string;
  sortAt: string;
};

export type MemoryEntry = {
  id: string;
  category: 'decisions' | 'maintenance' | 'contacts' | 'notes';
  title: string;
  detail: string;
  age: string;
  icon: 'palette' | 'home' | 'wrench' | 'snowflake' | 'key' | 'note';
};

export const PERSON_LABELS: Record<ActorRole | 'unassigned', string> = {
  stakeholder: 'Jamie',
  spouse: 'Alex',
  unassigned: 'Unassigned'
};

export const MEMORY_SECTIONS: Array<{ key: MemoryEntry['category']; label: string }> = [
  { key: 'decisions', label: 'Decisions made' },
  { key: 'maintenance', label: 'Home maintenance' },
  { key: 'contacts', label: 'Contacts & services' },
  { key: 'notes', label: 'Notes' }
];

export const DEFAULT_MEMORY: MemoryEntry[] = [
  {
    id: 'paint-color',
    category: 'decisions',
    title: 'Living room paint color',
    detail: 'Benjamin Moore "Pale Oak" — agreed Feb 28',
    age: '2w',
    icon: 'palette'
  },
  {
    id: 'bathroom-budget',
    category: 'decisions',
    title: 'Bathroom reno budget',
    detail: 'Max $8,500 including labor and fixtures',
    age: '1w',
    icon: 'home'
  },
  {
    id: 'furnace-filter',
    category: 'maintenance',
    title: 'Furnace filter last changed',
    detail: 'Feb 4, 2025 · 3M 1500 MPR filter · next due ~Apr 4',
    age: '5w',
    icon: 'wrench'
  },
  {
    id: 'ac-service',
    category: 'maintenance',
    title: 'AC last serviced',
    detail: 'May 2024 · Johnson HVAC · annual service booked Mar 14',
    age: '10m',
    icon: 'snowflake'
  },
  {
    id: 'plumbing-contact',
    category: 'contacts',
    title: "Mike's Plumbing",
    detail: '(312) 555-0182 · awaiting bathroom quote',
    age: '3d',
    icon: 'key'
  }
];

export const DEFAULT_UPCOMING_EVENTS: UpcomingEvent[] = [
  {
    id: 'hvac-service',
    day: '14',
    month: 'MAR',
    title: 'HVAC service visit',
    detail: '10:00 - 12:00',
    sortAt: '2026-03-14T10:00:00.000Z'
  },
  {
    id: 'jordans-birthday',
    day: '15',
    month: 'MAR',
    title: "Jordan's birthday dinner",
    detail: '7:00 PM · River North',
    sortAt: '2026-03-15T19:00:00.000Z'
  },
  {
    id: 'luna-vet',
    day: '18',
    month: 'MAR',
    title: 'Vet - Luna annual',
    detail: '2:30 PM · Dr. Patel',
    sortAt: '2026-03-18T14:30:00.000Z'
  }
];

export function getGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function getTimeLabel(now = new Date()) {
  return format(now, 'h:mm');
}

export function getHomeSubtitle(items: InboxItem[], now = new Date()) {
  const today = startOfDay(now);
  const count = items.filter((item) => {
    const flags = computeFlags(item, now);
    if (flags.overdue) return true;
    if (!item.dueAt) return false;
    return isSameDay(new Date(item.dueAt), today);
  }).length;
  if (count === 0) {
    return `${format(now, 'EEEE, MMMM d')} · everything looks calm today`;
  }
  return `${format(now, 'EEEE, MMMM d')} · ${count} ${count === 1 ? 'thing needs' : 'things need'} you today`;
}

export function flattenItems(view: InboxViewResponse | undefined) {
  if (!view) return [];
  return [
    ...view.itemsByStatus.open,
    ...view.itemsByStatus.in_progress,
    ...view.itemsByStatus.deferred,
    ...view.itemsByStatus.done
  ];
}

export function getActiveItems(view: InboxViewResponse | undefined) {
  if (!view) return [];
  return sortTasks([...view.itemsByStatus.open, ...view.itemsByStatus.in_progress]);
}

export function getCompletedItems(view: InboxViewResponse | undefined) {
  if (!view) return [];
  return [...view.itemsByStatus.done].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function countCompletedThisWeek(items: InboxItem[], now = new Date()) {
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return items.filter((item) => {
    return item.status === 'done' && isWithinInterval(new Date(item.updatedAt), { start: weekAgo, end: now });
  }).length;
}

export function isSharedTask(item: InboxItem, role: ActorRole) {
  return item.owner !== 'unassigned' && item.owner !== role;
}

export function filterTasks(items: InboxItem[], filter: TaskFilter, role: ActorRole, now = new Date()) {
  switch (filter) {
    case 'mine':
      return items.filter((item) => item.owner === role);
    case 'shared':
      return items.filter((item) => isSharedTask(item, role));
    case 'overdue':
      return items.filter((item) => computeFlags(item, now).overdue);
    case 'snoozed':
      return [];
    case 'all':
    default:
      return items;
  }
}

export function sortTasks(items: InboxItem[], now = new Date()) {
  return [...items].sort((left, right) => {
    const leftFlags = computeFlags(left, now);
    const rightFlags = computeFlags(right, now);
    const leftPriority = getPriorityRank(left, leftFlags);
    const rightPriority = getPriorityRank(right, rightFlags);
    if (leftPriority !== rightPriority) return leftPriority - rightPriority;

    const leftDue = left.dueAt ? new Date(left.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDue = right.dueAt ? new Date(right.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDue !== rightDue) return leftDue - rightDue;

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function getPriorityRank(item: InboxItem, flags = computeFlags(item)) {
  if (flags.overdue) return 0;
  if (flags.dueSoon) return 1;
  if (item.status === 'in_progress') return 2;
  if (flags.unassigned) return 3;
  return 4;
}

export function getTaskVariant(item: InboxItem, role: ActorRole, now = new Date()) {
  const flags = computeFlags(item, now);
  if (flags.overdue) return 'rose';
  if (flags.dueSoon) return 'peach';
  if (isSharedTask(item, role)) return 'mint';
  return 'default';
}

export function getTaskBadge(item: InboxItem, role: ActorRole, now = new Date()) {
  const flags = computeFlags(item, now);
  if (flags.overdue) return { label: 'Overdue', tone: 'rose' as const };
  if (flags.dueSoon) return { label: 'Soon', tone: 'peach' as const };
  if (isSharedTask(item, role)) return { label: 'Shared', tone: 'violet' as const };
  return null;
}

export function getTaskMeta(item: InboxItem, now = new Date()) {
  const duePrefix = item.status === 'done' ? 'Completed' : item.status === 'in_progress' ? 'In progress' : 'Due';
  const ownerLabel = item.owner === 'unassigned' ? '' : ` · ${PERSON_LABELS[item.owner]}`;
  if (item.dueAt) {
    return `${duePrefix} ${format(new Date(item.dueAt), 'MMM d')}${ownerLabel}`;
  }
  if (item.dueText) {
    return `${duePrefix} ${item.dueText}${ownerLabel}`;
  }
  const daysAgo = Math.max(0, Math.floor((now.getTime() - new Date(item.createdAt).getTime()) / 86_400_000));
  const createdLabel = daysAgo === 0 ? 'today' : `${daysAgo} day${daysAgo === 1 ? '' : 's'} ago`;
  return `Added ${createdLabel}${ownerLabel}`;
}

export function getNudgeSuggestion(view: InboxViewResponse | undefined) {
  return view?.suggestions[0] ?? null;
}

export function getNudgeCopy(suggestion: Suggestion | null) {
  if (!suggestion) return null;
  switch (suggestion.type) {
    case 'overdue':
      return `“${suggestion.title} is overdue. Want me to help with the next step?”`;
    case 'stale':
      return `“${suggestion.title} hasn't moved in a while. Want me to draft a follow-up?”`;
    case 'unassigned':
      return `“${suggestion.title} still needs an owner. Want help sorting it?”`;
    case 'due_soon':
      return `“${suggestion.title} is coming up soon. Want a quick plan?”`;
    default:
      return `“${suggestion.message}”`;
  }
}

export function buildFollowUpDraft(itemTitle: string) {
  const cleaned = itemTitle.charAt(0).toUpperCase() + itemTitle.slice(1);
  return `Hi — just checking in on ${cleaned.toLowerCase()} from earlier this week. We're keeping things moving on our side and would love to know timing when you have a moment. Thanks!`;
}
