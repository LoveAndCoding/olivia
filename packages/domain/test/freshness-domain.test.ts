import { describe, it, expect } from 'vitest';
import {
  isInboxItemStale,
  isRoutineStale,
  isReminderStale,
  isSharedListStale,
  isMealPlanStale,
  computeLastActivityDescription,
  generateFreshnessNudgeCopy,
  shouldShowHealthCheck,
  sortNudgesByPriority,
} from '../src/index';
import type { InboxItem, Routine, Reminder, SharedList, Nudge } from '@olivia/contracts';

const NOW = new Date('2026-03-17T12:00:00.000Z');

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function makeInboxItem(overrides: Partial<InboxItem> = {}): InboxItem {
  return {
    id: 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0',
    title: 'Test item',
    description: null,
    owner: 'stakeholder',
    status: 'open',
    dueAt: null,
    dueText: null,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    version: 1,
    lastStatusChangedAt: daysAgo(30),
    lastNoteAt: null,
    archivedAt: null,
    freshnessCheckedAt: null,
    ...overrides
  };
}

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
    title: 'Test routine',
    owner: 'stakeholder',
    recurrenceRule: 'weekly',
    intervalDays: null,
    status: 'active',
    currentDueDate: daysAgo(7),
    createdAt: daysAgo(30),
    updatedAt: daysAgo(30),
    archivedAt: null,
    freshnessCheckedAt: null,
    version: 1,
    ...overrides
  };
}

function makeReminder(overrides: Partial<Reminder> = {}): Reminder {
  return {
    id: 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2',
    title: 'Test reminder',
    note: null,
    owner: 'stakeholder',
    scheduledAt: daysAgo(10),
    recurrenceCadence: 'none',
    linkedInboxItemId: null,
    state: 'overdue',
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
    freshnessCheckedAt: null,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(14),
    version: 1,
    ...overrides
  };
}

function makeSharedList(overrides: Partial<SharedList> = {}): SharedList {
  return {
    id: 'd3d3d3d3-d3d3-4d3d-8d3d-d3d3d3d3d3d3',
    title: 'Test list',
    owner: 'stakeholder',
    status: 'active',
    activeItemCount: 3,
    checkedItemCount: 1,
    allChecked: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(35),
    archivedAt: null,
    freshnessCheckedAt: null,
    version: 1,
    ...overrides
  };
}

// ─── isInboxItemStale ────────────────────────────────────────────────────────

describe('isInboxItemStale', () => {
  it('returns stale when lastStatusChangedAt is 14+ days ago', () => {
    const item = makeInboxItem({ lastStatusChangedAt: daysAgo(14) });
    expect(isInboxItemStale(item, NOW).stale).toBe(true);
  });

  it('returns not stale at 13 days', () => {
    const item = makeInboxItem({ lastStatusChangedAt: daysAgo(13) });
    expect(isInboxItemStale(item, NOW).stale).toBe(false);
  });

  it('returns not stale for done items', () => {
    const item = makeInboxItem({ status: 'done', lastStatusChangedAt: daysAgo(30) });
    expect(isInboxItemStale(item, NOW).stale).toBe(false);
  });

  it('uses freshnessCheckedAt when set', () => {
    const item = makeInboxItem({
      lastStatusChangedAt: daysAgo(30),
      freshnessCheckedAt: daysAgo(5)
    });
    expect(isInboxItemStale(item, NOW).stale).toBe(false);
  });

  it('uses freshnessCheckedAt and returns stale when it is also old', () => {
    const item = makeInboxItem({
      lastStatusChangedAt: daysAgo(30),
      freshnessCheckedAt: daysAgo(15)
    });
    expect(isInboxItemStale(item, NOW).stale).toBe(true);
  });

  it('returns lastActivityAt matching the reference date used', () => {
    const checked = daysAgo(5);
    const item = makeInboxItem({ freshnessCheckedAt: checked });
    expect(isInboxItemStale(item, NOW).lastActivityAt).toBe(checked);
  });
});

// ─── isRoutineStale ──────────────────────────────────────────────────────────

describe('isRoutineStale', () => {
  it('returns stale when last completed > 2× interval ago (weekly)', () => {
    const routine = makeRoutine(); // weekly, intervalDays: null → 7-day default
    const result = isRoutineStale(routine, daysAgo(15), NOW);
    expect(result.stale).toBe(true);
  });

  it('returns not stale when last completed within 2× interval', () => {
    const routine = makeRoutine();
    const result = isRoutineStale(routine, daysAgo(13), NOW);
    expect(result.stale).toBe(false);
  });

  it('returns stale at exactly 2× threshold', () => {
    const routine = makeRoutine();
    const result = isRoutineStale(routine, daysAgo(14), NOW);
    expect(result.stale).toBe(true);
  });

  it('uses intervalDays when set (every_n_days)', () => {
    const routine = makeRoutine({ recurrenceRule: 'every_n_days', intervalDays: 3 });
    // 2× 3 = 6 days threshold
    expect(isRoutineStale(routine, daysAgo(6), NOW).stale).toBe(true);
    expect(isRoutineStale(routine, daysAgo(5), NOW).stale).toBe(false);
  });

  it('uses freshnessCheckedAt when set, ignoring last completion', () => {
    const routine = makeRoutine({ freshnessCheckedAt: daysAgo(5) });
    const result = isRoutineStale(routine, daysAgo(30), NOW);
    expect(result.stale).toBe(false);
  });

  it('returns not stale for paused routines', () => {
    const routine = makeRoutine({ status: 'paused' });
    expect(isRoutineStale(routine, daysAgo(30), NOW).stale).toBe(false);
  });

  it('falls back to createdAt when no completions', () => {
    const routine = makeRoutine({ createdAt: daysAgo(20) });
    const result = isRoutineStale(routine, null, NOW);
    expect(result.stale).toBe(true);
  });
});

// ─── isReminderStale ─────────────────────────────────────────────────────────

describe('isReminderStale', () => {
  it('returns stale when scheduledAt is 7+ days past and still active', () => {
    const reminder = makeReminder({ scheduledAt: daysAgo(7) });
    expect(isReminderStale(reminder, NOW).stale).toBe(true);
  });

  it('returns not stale at 6 days past', () => {
    const reminder = makeReminder({ scheduledAt: daysAgo(6), state: 'overdue' });
    expect(isReminderStale(reminder, NOW).stale).toBe(false);
  });

  it('returns not stale for completed reminders', () => {
    const reminder = makeReminder({ state: 'completed', scheduledAt: daysAgo(30) });
    expect(isReminderStale(reminder, NOW).stale).toBe(false);
  });

  it('uses freshnessCheckedAt when set', () => {
    const reminder = makeReminder({ freshnessCheckedAt: daysAgo(3) });
    expect(isReminderStale(reminder, NOW).stale).toBe(false);
  });

  it('handles upcoming state with far-past scheduledAt', () => {
    const reminder = makeReminder({ state: 'upcoming', scheduledAt: daysAgo(10) });
    expect(isReminderStale(reminder, NOW).stale).toBe(true);
  });
});

// ─── isSharedListStale ───────────────────────────────────────────────────────

describe('isSharedListStale', () => {
  it('returns stale when updatedAt is 30+ days ago and has unchecked items', () => {
    const list = makeSharedList({ updatedAt: daysAgo(30) });
    expect(isSharedListStale(list, true, NOW).stale).toBe(true);
  });

  it('returns not stale at 29 days', () => {
    const list = makeSharedList({ updatedAt: daysAgo(29) });
    expect(isSharedListStale(list, true, NOW).stale).toBe(false);
  });

  it('returns not stale when all items checked', () => {
    const list = makeSharedList({ updatedAt: daysAgo(60) });
    expect(isSharedListStale(list, false, NOW).stale).toBe(false);
  });

  it('returns not stale for archived lists', () => {
    const list = makeSharedList({ status: 'archived', updatedAt: daysAgo(60) });
    expect(isSharedListStale(list, true, NOW).stale).toBe(false);
  });

  it('uses freshnessCheckedAt when set', () => {
    const list = makeSharedList({ updatedAt: daysAgo(60), freshnessCheckedAt: daysAgo(10) });
    expect(isSharedListStale(list, true, NOW).stale).toBe(false);
  });
});

// ─── isMealPlanStale ─────────────────────────────────────────────────────────

describe('isMealPlanStale', () => {
  it('returns stale when no current week entries and prior usage', () => {
    expect(isMealPlanStale(false, true)).toBe(true);
  });

  it('returns not stale when current week has entries', () => {
    expect(isMealPlanStale(true, true)).toBe(false);
  });

  it('returns not stale when no prior usage', () => {
    expect(isMealPlanStale(false, false)).toBe(false);
  });
});

// ─── computeLastActivityDescription ──────────────────────────────────────────

describe('computeLastActivityDescription', () => {
  it('inbox: "No status change X days ago"', () => {
    expect(computeLastActivityDescription('inbox', daysAgo(20), NOW)).toBe('No status change 2 weeks ago');
  });

  it('routine: "Last completed X ago"', () => {
    expect(computeLastActivityDescription('routine', daysAgo(3), NOW)).toBe('Last completed 3 days ago');
  });

  it('reminder: "Was due X ago"', () => {
    expect(computeLastActivityDescription('reminder', daysAgo(1), NOW)).toBe('Was due yesterday');
  });

  it('list: "Last updated X ago"', () => {
    expect(computeLastActivityDescription('list', daysAgo(45), NOW)).toBe('Last updated 1 month ago');
  });

  it('mealPlan: "No meal plan this week"', () => {
    expect(computeLastActivityDescription('mealPlan', NOW.toISOString(), NOW)).toBe('No meal plan this week');
  });
});

// ─── generateFreshnessNudgeCopy ──────────────────────────────────────────────

describe('generateFreshnessNudgeCopy', () => {
  it('generates routine nudge copy', () => {
    const copy = generateFreshnessNudgeCopy('routine', 'Morning cleanup', daysAgo(21), NOW);
    expect(copy).toBe("Morning cleanup hasn't been marked done in 3 weeks — still on track?");
  });

  it('generates reminder nudge copy', () => {
    const copy = generateFreshnessNudgeCopy('reminder', 'Pick up dry cleaning', daysAgo(10), NOW);
    expect(copy).toBe('Pick up dry cleaning was due 1 week ago — still need this?');
  });

  it('generates list nudge copy', () => {
    const copy = generateFreshnessNudgeCopy('list', 'Grocery list', daysAgo(35), NOW);
    expect(copy).toBe("Grocery list hasn't been updated in 1 month — still using it?");
  });

  it('generates inbox nudge copy', () => {
    const copy = generateFreshnessNudgeCopy('inbox', 'Research schools', daysAgo(20), NOW);
    expect(copy).toBe('Research schools has had no activity for 2 weeks — still relevant?');
  });
});

// ─── shouldShowHealthCheck ───────────────────────────────────────────────────

describe('shouldShowHealthCheck', () => {
  it('shows when never completed', () => {
    expect(shouldShowHealthCheck(null, null, NOW)).toBe(true);
  });

  it('shows when 30+ days since last completed', () => {
    expect(shouldShowHealthCheck(daysAgo(30), null, NOW)).toBe(true);
  });

  it('hides when completed less than 30 days ago', () => {
    expect(shouldShowHealthCheck(daysAgo(29), null, NOW)).toBe(false);
  });

  it('hides when dismissed today', () => {
    expect(shouldShowHealthCheck(null, NOW.toISOString(), NOW)).toBe(false);
  });

  it('shows when dismissed yesterday but 30+ days since completed', () => {
    expect(shouldShowHealthCheck(daysAgo(35), daysAgo(1), NOW)).toBe(true);
  });
});

// ─── sortNudgesByPriority (freshness tier) ───────────────────────────────────

describe('sortNudgesByPriority with freshness', () => {
  function makeNudge(entityType: Nudge['entityType'], id: string): Nudge {
    return {
      entityType,
      entityId: id,
      entityName: 'Test',
      triggerReason: 'test',
      overdueSince: null,
      dueAt: null
    };
  }

  it('freshness nudges sort after all other types', () => {
    const nudges: Nudge[] = [
      makeNudge('freshness', 'e4e4e4e4-e4e4-4e4e-8e4e-e4e4e4e4e4e4'),
      makeNudge('routine', 'c2c2c2c2-c2c2-4c2c-8c2c-c2c2c2c2c2c2'),
      makeNudge('reminder', 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'),
      makeNudge('planningRitual', 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0')
    ];

    const sorted = sortNudgesByPriority(nudges);
    expect(sorted.map(n => n.entityType)).toEqual(['planningRitual', 'reminder', 'routine', 'freshness']);
  });
});
