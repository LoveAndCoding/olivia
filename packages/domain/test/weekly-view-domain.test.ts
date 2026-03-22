import { describe, it, expect } from 'vitest';
import {
  getWeekBounds,
  formatWeekLabel,
  formatDayLabel,
  getRoutineOccurrenceDatesForWeek,
  getRoutineOccurrenceStatusForDate
} from '../src/index';
import type { Routine, RoutineOccurrence } from '@olivia/contracts';

const ROUTINE_ID = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0';
const OCCURRENCE_ID = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';

// Use local-time date construction throughout to be timezone-independent.
// Test week: the week containing 2026-03-18 (Wednesday) → Mon 2026-03-16 – Sun 2026-03-22
const WED_MID_WEEK = new Date(2026, 2, 18, 12, 0, 0);  // Wed Mar 18 2026 noon local
const MON_START    = new Date(2026, 2, 16, 0, 0, 0);   // Mon Mar 16 2026 00:00 local
const SUN_END      = new Date(2026, 2, 22, 23, 0, 0);  // Sun Mar 22 2026 23:00 local

// Derive correct local-time week bounds from getWeekBounds for use in routine tests
const { weekStart: WEEK_MON, weekEnd: WEEK_SUN } = getWeekBounds(WED_MID_WEEK);

// Helper: produce an ISO datetime string for a local calendar day (noon) to avoid timezone flips
function localNoon(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: ROUTINE_ID,
    title: 'Test routine',
    owner: 'stakeholder',
    recurrenceRule: 'weekly',
    intervalDays: null,
    intervalWeeks: null,
    weekdays: null,
    status: 'active',
    currentDueDate: localNoon(2026, 3, 19), // Thu Mar 19 noon local
    createdAt: localNoon(2026, 3, 1),
    updatedAt: localNoon(2026, 3, 1),
    version: 1,
    archivedAt: null,
    freshnessCheckedAt: null,
    ...overrides
  };
}

function makeOccurrence(overrides: Partial<RoutineOccurrence> = {}): RoutineOccurrence {
  return {
    id: OCCURRENCE_ID,
    routineId: ROUTINE_ID,
    dueDate: localNoon(2026, 3, 19),
    completedAt: null,
    completedBy: null,
    skipped: false,
    createdAt: localNoon(2026, 3, 19),
    ...overrides
  };
}

describe('getWeekBounds', () => {
  it('returns Monday–Sunday for a Wednesday input', () => {
    const { weekStart, weekEnd } = getWeekBounds(WED_MID_WEEK);
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekEnd.getDay()).toBe(0);   // Sunday
  });

  it('returns same week when input is Monday', () => {
    const { weekStart, weekEnd } = getWeekBounds(MON_START);
    expect(weekStart.getDay()).toBe(1);
    expect(weekEnd.getDay()).toBe(0);
    expect(weekStart.getDate()).toBe(16);
    expect(weekEnd.getDate()).toBe(22);
  });

  it('returns same week when input is Sunday', () => {
    const { weekStart, weekEnd } = getWeekBounds(SUN_END);
    expect(weekStart.getDay()).toBe(1);
    expect(weekEnd.getDay()).toBe(0);
    expect(weekStart.getDate()).toBe(16);
    expect(weekEnd.getDate()).toBe(22);
  });

  it('week start is always Monday (not Sunday)', () => {
    for (const d of [MON_START, WED_MID_WEEK, SUN_END]) {
      const { weekStart } = getWeekBounds(d);
      expect(weekStart.getDay()).not.toBe(0);
      expect(weekStart.getDay()).toBe(1);
    }
  });
});

describe('formatWeekLabel', () => {
  it('returns a label containing Mon and Sun', () => {
    const label = formatWeekLabel(WEEK_MON, WEEK_SUN);
    expect(label).toContain('Mon');
    expect(label).toContain('Sun');
  });
});

describe('formatDayLabel', () => {
  it('returns plain label for non-today', () => {
    const label = formatDayLabel(WEEK_MON, false);
    expect(label).not.toContain('TODAY');
    expect(label).toContain('Mon');
  });

  it('includes TODAY prefix when isToday=true', () => {
    const label = formatDayLabel(WEEK_MON, true);
    expect(label).toMatch(/^TODAY/);
    expect(label).toContain('Mon');
  });
});

describe('getRoutineOccurrenceDatesForWeek', () => {
  it('returns 7 dates for a daily routine whose currentDueDate is Wednesday of the week', () => {
    const routine = makeRoutine({
      recurrenceRule: 'daily',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 18) // Wed
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(7);
  });

  it('returns 7 dates for a daily routine whose currentDueDate is the following Wednesday', () => {
    const routine = makeRoutine({
      recurrenceRule: 'daily',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 25) // following Wed
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(7);
  });

  it('returns 7 dates for a daily routine whose currentDueDate is the prior Wednesday', () => {
    const routine = makeRoutine({
      recurrenceRule: 'daily',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 11) // prior Wed
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(7);
  });

  it('returns 1 date for a weekly routine due on Thursday of the current week', () => {
    const routine = makeRoutine({
      recurrenceRule: 'weekly',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 19) // Thu
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(1);
    expect(dates[0].getDay()).toBe(4); // Thursday
  });

  it('returns 1 date (this Thursday) for a weekly routine whose currentDueDate is next Thursday', () => {
    // currentDueDate = next Thu Mar 26 means the prior cycle was this Thu Mar 19.
    // The algorithm projects Mar 19 as an occurrence (completed or overdue) within the window.
    const routine = makeRoutine({
      recurrenceRule: 'weekly',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 26) // next Thu
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(1);
    expect(dates[0].getDay()).toBe(4); // Thursday
  });

  it('returns 1 date for a monthly routine due on Wednesday of the current week', () => {
    const routine = makeRoutine({
      recurrenceRule: 'monthly',
      intervalDays: null,
      currentDueDate: localNoon(2026, 3, 18) // Wed this week
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(1);
  });

  it('returns 1 date (Wed this week) for a monthly routine whose currentDueDate is next month', () => {
    // currentDueDate = Apr 18 means the prior monthly cycle was Mar 18 (within test week).
    // The algorithm projects Mar 18 as an occurrence (completed or overdue) within the window.
    const routine = makeRoutine({
      recurrenceRule: 'monthly',
      intervalDays: null,
      currentDueDate: localNoon(2026, 4, 18) // next month
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(1);
  });

  it('returns correct every_n_days dates for interval=3', () => {
    // interval=3 from Mon 16: Mon 16, Thu 19, Sun 22 → expect 2-3 dates in the week
    const routine = makeRoutine({
      recurrenceRule: 'every_n_days',
      intervalDays: 3,
      currentDueDate: localNoon(2026, 3, 16)
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates.length).toBeGreaterThanOrEqual(2);
    expect(dates.length).toBeLessThanOrEqual(3);
  });

  it('returns 0 dates for a paused routine', () => {
    const routine = makeRoutine({ status: 'paused' });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(0);
  });

  it('returns 0 dates for an archived routine', () => {
    const routine = makeRoutine({
      status: 'archived',
      archivedAt: localNoon(2026, 3, 1)
    });
    const dates = getRoutineOccurrenceDatesForWeek(routine, WEEK_MON, WEEK_SUN);
    expect(dates).toHaveLength(0);
  });
});

describe('getRoutineOccurrenceStatusForDate', () => {
  // Use local noon times to avoid midnight timezone edge cases
  const targetThursday = new Date(2026, 2, 19, 12, 0, 0); // Thu Mar 19 noon local
  const now            = new Date(2026, 2, 19, 14, 0, 0); // Thu Mar 19 14:00 local (same day, after noon)

  it('returns completed when a matching occurrence with completedAt exists', () => {
    const routine = makeRoutine();
    const occ = makeOccurrence({ completedAt: new Date(2026, 2, 19, 8, 0, 0).toISOString() });
    const state = getRoutineOccurrenceStatusForDate(routine, [occ], targetThursday, now);
    expect(state).toBe('completed');
  });

  it('returns due when targetDate is today (same day) and no completion', () => {
    const routine = makeRoutine();
    const state = getRoutineOccurrenceStatusForDate(routine, [], targetThursday, now);
    expect(state).toBe('due');
  });

  it('returns overdue when targetDate was yesterday and no completion', () => {
    const routine = makeRoutine();
    const yesterday = new Date(2026, 2, 18, 12, 0, 0); // Wed Mar 18 noon
    const nowThursday = new Date(2026, 2, 19, 25, 0, 0); // well past yesterday
    const state = getRoutineOccurrenceStatusForDate(routine, [], yesterday, nowThursday);
    expect(state).toBe('overdue');
  });

  it('returns upcoming when targetDate is tomorrow and no completion', () => {
    const routine = makeRoutine();
    const tomorrow = new Date(2026, 2, 20, 12, 0, 0); // Fri Mar 20 noon
    const state = getRoutineOccurrenceStatusForDate(routine, [], tomorrow, now);
    expect(state).toBe('upcoming');
  });

  it('returns paused when routine.status is paused', () => {
    const routine = makeRoutine({ status: 'paused' });
    const state = getRoutineOccurrenceStatusForDate(routine, [], targetThursday, now);
    expect(state).toBe('paused');
  });
});
