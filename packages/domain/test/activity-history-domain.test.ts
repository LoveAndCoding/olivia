import { describe, it, expect } from 'vitest';
import { getActivityHistoryWindow, groupActivityHistoryByDay } from '../src/index';
import type { ActivityHistoryItem } from '@olivia/contracts';

// ─── getActivityHistoryWindow ─────────────────────────────────────────────────

describe('getActivityHistoryWindow', () => {
  it('returns windowStart 29 days before today at midnight and windowEnd at end of today', () => {
    const today = new Date(2026, 2, 15, 14, 30, 0); // Mar 15 2026 14:30 local
    const { windowStart, windowEnd } = getActivityHistoryWindow(today);

    expect(windowStart.getFullYear()).toBe(2026);
    expect(windowStart.getMonth()).toBe(1); // February
    expect(windowStart.getDate()).toBe(14);
    expect(windowStart.getHours()).toBe(0);
    expect(windowStart.getMinutes()).toBe(0);
    expect(windowStart.getSeconds()).toBe(0);

    expect(windowEnd.getFullYear()).toBe(2026);
    expect(windowEnd.getMonth()).toBe(2); // March
    expect(windowEnd.getDate()).toBe(15);
    expect(windowEnd.getHours()).toBe(23);
    expect(windowEnd.getMinutes()).toBe(59);
    expect(windowEnd.getSeconds()).toBe(59);
  });

  it('handles month boundary: today = 2026-03-01, windowStart = 2026-01-31', () => {
    const today = new Date(2026, 2, 1, 0, 0, 0); // Mar 1 2026
    const { windowStart } = getActivityHistoryWindow(today);

    expect(windowStart.getFullYear()).toBe(2026);
    expect(windowStart.getMonth()).toBe(0); // January
    expect(windowStart.getDate()).toBe(31);
  });

  it('handles year boundary: today = 2026-01-01, windowStart = 2025-12-03', () => {
    const today = new Date(2026, 0, 1, 0, 0, 0); // Jan 1 2026
    const { windowStart } = getActivityHistoryWindow(today);

    expect(windowStart.getFullYear()).toBe(2025);
    expect(windowStart.getMonth()).toBe(11); // December
    expect(windowStart.getDate()).toBe(3);
  });

  it('windowEnd is always the same calendar day as today', () => {
    const today = new Date(2026, 5, 20, 9, 0, 0); // Jun 20 2026
    const { windowEnd } = getActivityHistoryWindow(today);

    expect(windowEnd.getFullYear()).toBe(2026);
    expect(windowEnd.getMonth()).toBe(5);
    expect(windowEnd.getDate()).toBe(20);
  });
});

// ─── groupActivityHistoryByDay ────────────────────────────────────────────────

const makeRoutine = (completedAt: string, id = '00000000-0000-4000-8000-000000000001'): ActivityHistoryItem => ({
  type: 'routine',
  routineId: id,
  routineTitle: 'Morning walk',
  assigneeUserId: null,
  dueDate: completedAt.split('T')[0],
  completedAt
});

const makeReminder = (resolvedAt: string, id = '00000000-0000-4000-8000-000000000002'): ActivityHistoryItem => ({
  type: 'reminder',
  reminderId: id,
  title: 'Call doctor',
  assigneeUserId: null,
  resolvedAt,
  resolution: 'completed'
});

const makeMeal = (date: string, id = '00000000-0000-4000-8000-000000000003'): ActivityHistoryItem => ({
  type: 'meal',
  entryId: id,
  planId: '00000000-0000-4000-8000-000000000009',
  planTitle: 'Week plan',
  name: 'Pasta',
  dayOfWeek: 0,
  date
});

const makeInbox = (completedAt: string, id = '00000000-0000-4000-8000-000000000004'): ActivityHistoryItem => ({
  type: 'inbox',
  itemId: id,
  title: 'Pay bill',
  assigneeUserId: null,
  completedAt
});

const makeListItem = (checkedAt: string, id = '00000000-0000-4000-8000-000000000005'): ActivityHistoryItem => ({
  type: 'listItem',
  itemId: id,
  body: 'Milk',
  listId: '00000000-0000-4000-8000-000000000008',
  listName: 'Grocery List',
  checkedAt
});

describe('groupActivityHistoryByDay', () => {
  it('returns empty array for empty input', () => {
    expect(groupActivityHistoryByDay([])).toEqual([]);
  });

  it('two items on same day appear in the same day section sorted reverse-chronologically', () => {
    const earlier = makeRoutine('2026-03-15T08:00:00.000Z', '00000000-0000-4000-8000-000000000001');
    const later = makeReminder('2026-03-15T14:00:00.000Z', '00000000-0000-4000-8000-000000000002');
    const days = groupActivityHistoryByDay([earlier, later]);

    expect(days).toHaveLength(1);
    const day = days[0];
    expect(day.items).toHaveLength(2);
    // later item (14:00) should be first (reverse-chronological)
    expect(day.items[0].type).toBe('reminder');
    expect(day.items[1].type).toBe('routine');
  });

  it('items on three different days produce three day sections sorted most-recent-day-first', () => {
    const day1Item = makeRoutine('2026-03-15T08:00:00.000Z', '00000000-0000-4000-8000-000000000001');
    const day2Item = makeReminder('2026-03-14T10:00:00.000Z', '00000000-0000-4000-8000-000000000002');
    const day3Item = makeInbox('2026-03-13T09:00:00.000Z', '00000000-0000-4000-8000-000000000004');

    const days = groupActivityHistoryByDay([day1Item, day2Item, day3Item]);

    expect(days).toHaveLength(3);
    expect(days[0].date).toMatch(/2026-03-15/);
    expect(days[1].date).toMatch(/2026-03-14/);
    expect(days[2].date).toMatch(/2026-03-13/);
  });

  it('a day with zero items is not included in the result', () => {
    const item = makeRoutine('2026-03-15T08:00:00.000Z');
    const days = groupActivityHistoryByDay([item]);
    // Only one day section
    expect(days.every(d => d.items.length > 0)).toBe(true);
  });

  it('meal item (date-only) sorts to end of day relative to timed items on the same day', () => {
    // Meal has no time — uses T23:59:59, so it sorts LAST (reverse-chron puts it after timed items)
    const timedItem = makeRoutine('2026-03-15T10:00:00.000Z', '00000000-0000-4000-8000-000000000001');
    const mealItem = makeMeal('2026-03-15', '00000000-0000-4000-8000-000000000003');

    const days = groupActivityHistoryByDay([timedItem, mealItem]);
    expect(days).toHaveLength(1);
    // meal's timestamp is T23:59:59 → higher than T10:00:00 → meal sorts first in reverse-chron
    expect(days[0].items[0].type).toBe('meal');
    expect(days[0].items[1].type).toBe('routine');
  });

  it('all five item types are handled correctly', () => {
    const items: ActivityHistoryItem[] = [
      makeRoutine('2026-03-15T07:00:00.000Z', '00000000-0000-4000-8000-000000000001'),
      makeReminder('2026-03-15T08:00:00.000Z', '00000000-0000-4000-8000-000000000002'),
      makeMeal('2026-03-15', '00000000-0000-4000-8000-000000000003'),
      makeInbox('2026-03-15T09:00:00.000Z', '00000000-0000-4000-8000-000000000004'),
      makeListItem('2026-03-15T10:00:00.000Z', '00000000-0000-4000-8000-000000000005')
    ];

    const days = groupActivityHistoryByDay(items);
    expect(days).toHaveLength(1);
    expect(days[0].items).toHaveLength(5);
    // Verify all types present
    const types = new Set(days[0].items.map(i => i.type));
    expect(types.has('routine')).toBe(true);
    expect(types.has('reminder')).toBe(true);
    expect(types.has('meal')).toBe(true);
    expect(types.has('inbox')).toBe(true);
    expect(types.has('listItem')).toBe(true);
  });
});
