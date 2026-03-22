import { format, isToday, isTomorrow, addHours, setHours, setMinutes, setSeconds, addDays } from 'date-fns';
import type { Reminder, ReminderState, RecurrenceCadence } from '@olivia/contracts';
import { computeReminderState } from '@olivia/domain';

export type ReminderDueDisplay = {
  borderClass: string;
  dotClass: string;
  badgeText: string;
  badgeClass: string;
  opacityClass: string;
};

export function getReminderDueDisplay(reminder: Reminder, referenceDate: Date = new Date()): ReminderDueDisplay {
  const state = computeReminderState(reminder, referenceDate);
  return getDueDisplayForState(state, reminder.scheduledAt, referenceDate);
}

export function getDueDisplayForState(
  state: ReminderState,
  scheduledAt: string,
  _now: Date = new Date()
): ReminderDueDisplay {
  switch (state) {
    case 'overdue':
      return {
        borderClass: 'border-rose',
        dotClass: 'dot-rose',
        badgeText: 'Needs attention',
        badgeClass: 'rem-badge-rose',
        opacityClass: '',
      };
    case 'due':
      return {
        borderClass: 'border-violet',
        dotClass: 'dot-violet',
        badgeText: 'Due',
        badgeClass: 'rem-badge-violet',
        opacityClass: '',
      };
    case 'snoozed':
      return {
        borderClass: 'border-sky',
        dotClass: 'dot-sky',
        badgeText: 'Snoozed',
        badgeClass: 'rem-badge-sky',
        opacityClass: 'opacity-snoozed',
      };
    case 'completed':
      return {
        borderClass: 'border-mint',
        dotClass: 'dot-mint',
        badgeText: 'Done',
        badgeClass: 'rem-badge-mint',
        opacityClass: 'opacity-done',
      };
    case 'cancelled':
      return {
        borderClass: 'border-neutral',
        dotClass: 'dot-neutral',
        badgeText: 'Cancelled',
        badgeClass: 'rem-badge-neutral',
        opacityClass: 'opacity-done',
      };
    case 'upcoming': {
      const scheduled = new Date(scheduledAt);
      if (isTomorrow(scheduled)) {
        return {
          borderClass: 'border-peach',
          dotClass: 'dot-peach',
          badgeText: 'Tomorrow',
          badgeClass: 'rem-badge-peach',
          opacityClass: '',
        };
      }
      return {
        borderClass: 'border-neutral',
        dotClass: 'dot-neutral',
        badgeText: formatDateShort(scheduledAt),
        badgeClass: 'rem-badge-neutral',
        opacityClass: '',
      };
    }
    default:
      return {
        borderClass: 'border-neutral',
        dotClass: 'dot-neutral',
        badgeText: '',
        badgeClass: 'rem-badge-neutral',
        opacityClass: '',
      };
  }
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return format(d, 'MMM d');
}

export function formatReminderMeta(reminder: Reminder, userRole: string): string {
  const scheduled = new Date(reminder.scheduledAt);
  const parts: string[] = [];

  if (isToday(scheduled)) {
    parts.push(`Today · ${format(scheduled, 'h:mm a')}`);
  } else if (isTomorrow(scheduled)) {
    parts.push(`Tomorrow · ${format(scheduled, 'h:mm a')}`);
  } else {
    parts.push(`${format(scheduled, 'MMM d')} · ${format(scheduled, 'h:mm a')}`);
  }

  if (reminder.owner !== userRole && reminder.owner !== 'unassigned') {
    parts.push(ownerLabel(reminder.owner));
  }

  return parts.join(' · ');
}

export function formatScheduledLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (isToday(d)) return `Today · ${format(d, 'h:mm a')}`;
  if (isTomorrow(d)) return `Tomorrow · ${format(d, 'h:mm a')}`;
  return `${format(d, 'MMM d')} · ${format(d, 'h:mm a')}`;
}

export function formatRecurrenceLabel(cadence: RecurrenceCadence): string {
  switch (cadence) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    case 'monthly': return 'Monthly';
    default: return 'One-time';
  }
}

export function ownerLabel(owner: string): string {
  if (owner === 'stakeholder') return 'Lexi';
  if (owner === 'spouse') return 'Christian';
  return 'Unassigned';
}

export type SnoozeOption = {
  label: string;
  timeLabel: string;
  value: Date;
};

export function getSnoozeOptions(now: Date = new Date()): SnoozeOption[] {
  const options: SnoozeOption[] = [];
  const hour = now.getHours();

  options.push({
    label: 'In 1 hour',
    timeLabel: format(addHours(now, 1), 'h:mm a'),
    value: addHours(now, 1),
  });

  if (hour < 14) {
    const afternoon = setSeconds(setMinutes(setHours(now, 15), 0), 0);
    options.push({
      label: 'This afternoon',
      timeLabel: format(afternoon, 'h:mm a'),
      value: afternoon,
    });
  } else {
    options.push({
      label: 'In 3 hours',
      timeLabel: format(addHours(now, 3), 'h:mm a'),
      value: addHours(now, 3),
    });
  }

  if (hour < 18) {
    const tonight = setSeconds(setMinutes(setHours(now, 19), 0), 0);
    options.push({
      label: 'Tonight',
      timeLabel: format(tonight, 'h:mm a'),
      value: tonight,
    });
  }

  const tomorrowMorning = setSeconds(setMinutes(setHours(addDays(now, 1), 9), 0), 0);
  options.push({
    label: 'Tomorrow morning',
    timeLabel: `${format(tomorrowMorning, 'EEE')} · ${format(tomorrowMorning, 'h:mm a')}`,
    value: tomorrowMorning,
  });

  return options;
}

export function getDateChipOptions(now: Date = new Date()) {
  return [
    {
      label: 'Today',
      value: setSeconds(setMinutes(setHours(now, now.getHours() + 1), 0), 0),
    },
    {
      label: 'Tonight',
      value: setSeconds(setMinutes(setHours(now, 19), 0), 0),
    },
    {
      label: 'Tomorrow',
      value: setSeconds(setMinutes(setHours(addDays(now, 1), 9), 0), 0),
    },
  ];
}

export function formatSnoozeUntil(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const tomorrow = addDays(now, 1);
  if (d.toDateString() === tomorrow.toDateString()) {
    return `tomorrow at ${format(d, 'h:mm a')}`;
  }
  if (d.toDateString() === now.toDateString()) {
    return format(d, 'h:mm a');
  }
  return `${format(d, 'MMM d')}, ${format(d, 'h:mm a')}`;
}

export function homeSubtitleForReminders(
  reminderCount: number,
  _snoozedCount: number,
  dueCount: number,
  overdueCount: number,
): string {
  const total = dueCount + overdueCount;
  if (total > 0) {
    const things = total === 1 ? '1 reminder needs you' : `${total} reminders need you`;
    return things;
  }
  if (reminderCount > 0) {
    const s = reminderCount === 1 ? '1 reminder coming up' : `${reminderCount} reminders coming up`;
    return s;
  }
  return '';
}
