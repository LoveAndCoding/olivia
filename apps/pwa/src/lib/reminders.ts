import { format } from 'date-fns';
import type { Reminder, ReminderState, ReminderViewResponse } from '@olivia/contracts';
import type { EventItem } from '../types/display';

const ACTIVE_STATE_ORDER: ReminderState[] = ['overdue', 'due', 'upcoming', 'snoozed', 'completed', 'cancelled'];

export function formatReminderOwner(owner: Reminder['owner']): string {
  if (owner === 'stakeholder') {
    return 'Lexi';
  }
  if (owner === 'spouse') {
    return 'Alexander';
  }
  return 'Unassigned';
}

export function reminderStateLabel(state: ReminderState): string {
  switch (state) {
    case 'due':
      return 'Due now';
    case 'overdue':
      return 'Overdue';
    case 'snoozed':
      return 'Snoozed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Upcoming';
  }
}

export function flattenReminderGroups(view: ReminderViewResponse): Reminder[] {
  return ACTIVE_STATE_ORDER.flatMap((state) => view.remindersByState[state]);
}

export function reminderToEventItem(reminder: Reminder): EventItem {
  const effectiveAt = reminder.snoozedUntil ?? reminder.scheduledAt;
  const date = new Date(effectiveAt);
  const secondary = reminder.linkedInboxItem ? ` · ${reminder.linkedInboxItem.title}` : '';
  return {
    dateNum: format(date, 'd'),
    dateMon: format(date, 'MMM'),
    name: reminder.title,
    time: `${reminderStateLabel(reminder.state)} · ${format(date, 'p')}${secondary}`
  };
}

export function reminderToDateTimeLocal(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

export function dateTimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

export function describeReminderWhen(reminder: Reminder): string {
  const effectiveAt = reminder.snoozedUntil ?? reminder.scheduledAt;
  const prefix = reminder.state === 'snoozed' ? 'Snoozed until' : reminderStateLabel(reminder.state);
  return `${prefix} ${format(new Date(effectiveAt), "EEE, MMM d 'at' p")}`;
}
