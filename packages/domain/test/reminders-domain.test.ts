import { addDays, addMonths, addWeeks } from 'date-fns';
import { createInboxItem } from '../src/index';
import {
  cancelReminder,
  completeReminderOccurrence,
  computeReminderState,
  createReminder,
  createReminderDraft,
  groupReminders,
  rankRemindersForSurfacing,
  scheduleNextOccurrence,
  snoozeReminder,
  updateReminder
} from '../src/index';

const baseNow = new Date('2026-03-10T09:00:00.000Z');

function buildDraft(overrides: Record<string, unknown> = {}) {
  return {
    id: crypto.randomUUID(),
    title: 'Bring the vet records',
    note: null,
    owner: 'stakeholder',
    scheduledAt: '2026-03-12T09:00:00.000Z',
    recurrenceCadence: 'none',
    linkedInboxItemId: null,
    ...overrides
  } as const;
}

describe('reminder domain', () => {
  it('parses reminder drafts with chrono fallback and structured linkage', () => {
    const parsed = createReminderDraft({
      inputText: 'Remind me to bring the vet records next Thursday owner spouse every week',
      now: new Date('2026-03-10T09:00:00.000Z')
    });
    const structured = createReminderDraft({
      structuredInput: {
        title: 'Review camp forms',
        note: 'Check the signature line.',
        owner: 'stakeholder',
        scheduledAt: '2026-03-15T18:00:00.000Z',
        recurrenceCadence: 'monthly',
        linkedInboxItemId: '5ce568cf-6112-45fb-a745-09cc6257c57d'
      },
      now: baseNow
    });

    expect(parsed.draft.title).toBe('bring the vet records');
    expect(parsed.draft.owner).toBe('spouse');
    expect(parsed.draft.recurrenceCadence).toBe('weekly');
    expect(parsed.parseConfidence).toBe('high');
    expect(structured.draft.note).toBe('Check the signature line.');
    expect(structured.draft.linkedInboxItemId).toBe('5ce568cf-6112-45fb-a745-09cc6257c57d');
  });

  it('derives reminder state and snooze transitions deterministically', () => {
    const { reminder } = createReminder(buildDraft({ scheduledAt: '2026-03-12T09:00:00.000Z' }), baseNow);
    const now = new Date('2026-03-12T09:00:00.000Z');

    expect(computeReminderState(reminder, new Date('2026-03-11T09:00:00.000Z'))).toBe('upcoming');
    expect(computeReminderState(reminder, now)).toBe('due');
    expect(computeReminderState(reminder, new Date('2026-03-12T10:00:00.000Z'))).toBe('overdue');

    const snoozed = snoozeReminder(reminder, '2026-03-12T18:00:00.000Z', new Date('2026-03-12T10:00:00.000Z'));
    expect(snoozed.reminder.state).toBe('snoozed');
    expect(computeReminderState(snoozed.reminder, new Date('2026-03-12T19:00:00.000Z'))).toBe('overdue');
  });

  it('completes one-time reminders and cancels active reminders', () => {
    const { reminder } = createReminder(buildDraft(), baseNow);
    const completed = completeReminderOccurrence(reminder, new Date('2026-03-12T10:00:00.000Z'));
    const cancelled = cancelReminder(reminder, new Date('2026-03-11T10:00:00.000Z'));

    expect(completed.reminder.state).toBe('completed');
    expect(completed.timelineEntries.at(-1)?.eventType).toBe('completed');
    expect(cancelled.reminder.state).toBe('cancelled');
    expect(cancelled.timelineEntries.at(-1)?.eventType).toBe('cancelled');
  });

  it('schedules recurrence for daily, weekly, and monthly reminders', () => {
    expect(scheduleNextOccurrence('2026-03-12T09:00:00.000Z', 'daily')).toBe(addDays(new Date('2026-03-12T09:00:00.000Z'), 1).toISOString());
    expect(scheduleNextOccurrence('2026-03-12T09:00:00.000Z', 'weekly')).toBe(addWeeks(new Date('2026-03-12T09:00:00.000Z'), 1).toISOString());
    expect(scheduleNextOccurrence('2026-01-31T09:00:00.000Z', 'monthly')).toBe(addMonths(new Date('2026-01-31T09:00:00.000Z'), 1).toISOString());
  });

  it('records missed recurring history in the timeline and advances from the scheduled cadence', () => {
    const { reminder } = createReminder(buildDraft({
      scheduledAt: '2026-03-10T09:00:00.000Z',
      recurrenceCadence: 'daily'
    }), baseNow);
    const completed = completeReminderOccurrence(reminder, new Date('2026-03-13T12:00:00.000Z'));

    expect(completed.reminder.state).toBe('upcoming');
    expect(completed.reminder.scheduledAt).toBe('2026-03-14T09:00:00.000Z');
    expect(completed.timelineEntries.map((entry) => entry.eventType)).toEqual([
      'missed_occurrence_logged',
      'missed_occurrence_logged',
      'completed',
      'recurrence_advanced'
    ]);
    expect(completed.timelineEntries[0].metadata?.occurrenceAt).toBe('2026-03-11T09:00:00.000Z');
    expect(completed.timelineEntries[1].metadata?.occurrenceAt).toBe('2026-03-12T09:00:00.000Z');
  });

  it('logs only new missed recurring history before reminder edits or snoozes', () => {
    const { reminder } = createReminder(buildDraft({
      scheduledAt: '2026-03-10T09:00:00.000Z',
      recurrenceCadence: 'daily'
    }), baseNow);
    const existingTimeline = [
      {
        id: crypto.randomUUID(),
        reminderId: reminder.id,
        actorRole: 'system_rule' as const,
        eventType: 'missed_occurrence_logged' as const,
        fromValue: null,
        toValue: { occurrenceAt: '2026-03-11T09:00:00.000Z' },
        metadata: { occurrenceAt: '2026-03-11T09:00:00.000Z', cadence: 'daily' },
        createdAt: '2026-03-12T09:30:00.000Z'
      }
    ];

    const snoozed = snoozeReminder(reminder, '2026-03-13T18:00:00.000Z', new Date('2026-03-13T12:00:00.000Z'), existingTimeline);
    const updated = updateReminder(reminder, { title: 'Bring the vet records folder' }, new Date('2026-03-13T12:00:00.000Z'), existingTimeline);

    expect(snoozed.timelineEntries.map((entry) => entry.eventType)).toEqual([
      'missed_occurrence_logged',
      'snoozed'
    ]);
    expect(snoozed.timelineEntries[0].metadata?.occurrenceAt).toBe('2026-03-12T09:00:00.000Z');
    expect(updated.timelineEntries.map((entry) => entry.eventType)).toEqual([
      'missed_occurrence_logged',
      'rescheduled'
    ]);
  });

  it('groups and ranks reminders while preserving linked inbox state', () => {
    const inbox = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Prep for the vet visit',
      description: null,
      owner: 'stakeholder',
      status: 'open',
      dueText: 'Friday',
      dueAt: '2026-03-13T17:00:00.000Z'
    }, baseNow).item;

    const upcoming = createReminder(buildDraft({
      scheduledAt: '2026-03-15T09:00:00.000Z'
    }), baseNow).reminder;
    const due = createReminder(buildDraft({
      scheduledAt: '2026-03-12T12:00:00.000Z'
    }), baseNow).reminder;
    const overdue = createReminder(buildDraft({
      scheduledAt: '2026-03-11T09:00:00.000Z',
      title: 'Pay the water bill',
      linkedInboxItemId: inbox.id,
      linkedInboxItem: {
        id: inbox.id,
        title: inbox.title,
        status: inbox.status,
        owner: inbox.owner,
        dueAt: inbox.dueAt
      }
    }), baseNow).reminder;
    const snoozed = snoozeReminder(due, '2026-03-13T09:00:00.000Z', new Date('2026-03-12T13:00:00.000Z')).reminder;
    const completed = completeReminderOccurrence(upcoming, new Date('2026-03-10T10:00:00.000Z')).reminder;
    const cancelled = cancelReminder(createReminder(buildDraft({
      scheduledAt: '2026-03-16T09:00:00.000Z'
    }), baseNow).reminder, new Date('2026-03-10T10:00:00.000Z')).reminder;

    const grouped = groupReminders([overdue, due, upcoming, snoozed, completed, cancelled], new Date('2026-03-12T12:00:00.000Z'));
    const ranked = rankRemindersForSurfacing([overdue, due, upcoming, snoozed, completed, cancelled], new Date('2026-03-12T12:00:00.000Z'));

    expect(grouped.overdue).toHaveLength(1);
    expect(grouped.due).toHaveLength(1);
    expect(grouped.upcoming).toHaveLength(1);
    expect(grouped.snoozed).toHaveLength(1);
    expect(grouped.completed).toHaveLength(1);
    expect(grouped.cancelled).toHaveLength(1);
    expect(ranked.map((reminder) => reminder.title)).toEqual([
      'Pay the water bill',
      'Bring the vet records',
      'Bring the vet records'
    ]);
    expect(overdue.linkedInboxItem?.status).toBe('open');
    expect(inbox.status).toBe('open');
  });
});
