import { describe, it, expect } from 'vitest';
import { computeCompletionWindow, getCurrentLocalHour, localDateToUtcNoon, skipRoutineOccurrence, sortNudgesByPriority } from '../src/index';
import type { Nudge, Routine } from '@olivia/contracts';

const ROUTINE_ID = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0';
const NUDGE_ID_1 = 'c1c1c1c1-c1c1-4c1c-8c1c-c1c1c1c1c1c1';
const NUDGE_ID_2 = 'd2d2d2d2-d2d2-4d2d-8d2d-d2d2d2d2d2d2';
const NUDGE_ID_3 = 'e3e3e3e3-e3e3-4e3e-8e3e-e3e3e3e3e3e3';

function makeWeeklyRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: ROUTINE_ID,
    title: 'Test routine',
    owner: 'stakeholder',
    recurrenceRule: 'weekly',
    intervalDays: null,
    intervalWeeks: null,
    weekdays: null,
    status: 'active',
    currentDueDate: '2026-03-08T12:00:00.000Z',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    archivedAt: null,
    freshnessCheckedAt: null,
    version: 1,
    ...overrides
  };
}

function makeNudge(overrides: Partial<Nudge> & { entityType: Nudge['entityType'] }): Nudge {
  return {
    entityId: NUDGE_ID_1,
    entityName: 'Test item',
    triggerReason: 'Overdue since Monday',
    overdueSince: null,
    dueAt: null,
    ...overrides
  };
}

describe('skipRoutineOccurrence', () => {
  it('advances currentDueDate schedule-anchored, sets skipped: true', () => {
    const routine = makeWeeklyRoutine({ currentDueDate: '2026-03-08T12:00:00.000Z' });
    const { updatedRoutine, occurrence } = skipRoutineOccurrence(routine, 'stakeholder');
    expect(occurrence.skipped).toBe(true);
    expect(occurrence.dueDate).toBe('2026-03-08T12:00:00.000Z');
    // next weekly due date is 7 days later (noon UTC avoids DST issues)
    expect(updatedRoutine.currentDueDate).toBe('2026-03-15T12:00:00.000Z');
    expect(updatedRoutine.version).toBe(routine.version + 1);
  });

  it('records skippedBy as completedBy on the occurrence', () => {
    const routine = makeWeeklyRoutine();
    const { occurrence } = skipRoutineOccurrence(routine, 'spouse');
    expect(occurrence.completedBy).toBe('spouse');
    expect(occurrence.skipped).toBe(true);
  });

  it('throws on paused routine', () => {
    const routine = makeWeeklyRoutine({ status: 'paused' });
    expect(() => skipRoutineOccurrence(routine, 'stakeholder')).toThrow('Cannot skip a paused routine.');
  });

  it('throws on archived routine', () => {
    const routine = makeWeeklyRoutine({ status: 'archived' });
    expect(() => skipRoutineOccurrence(routine, 'stakeholder')).toThrow('Cannot skip an archived routine.');
  });
});

describe('sortNudgesByPriority', () => {
  it('sorts planning ritual before reminder before routine', () => {
    const nudges: Nudge[] = [
      makeNudge({ entityType: 'routine', entityId: NUDGE_ID_1, overdueSince: '2026-03-08' }),
      makeNudge({ entityType: 'planningRitual', entityId: NUDGE_ID_2, overdueSince: '2026-03-10' }),
      makeNudge({ entityType: 'reminder', entityId: NUDGE_ID_3, dueAt: '2026-03-15T10:00:00Z' })
    ];
    const sorted = sortNudgesByPriority(nudges);
    expect(sorted[0].entityType).toBe('planningRitual');
    expect(sorted[1].entityType).toBe('reminder');
    expect(sorted[2].entityType).toBe('routine');
  });

  it('sorts oldest first within the same tier', () => {
    const nudges: Nudge[] = [
      makeNudge({ entityType: 'routine', entityId: NUDGE_ID_1, overdueSince: '2026-03-10' }),
      makeNudge({ entityType: 'routine', entityId: NUDGE_ID_2, overdueSince: '2026-03-07' }),
      makeNudge({ entityType: 'routine', entityId: NUDGE_ID_3, overdueSince: '2026-03-09' })
    ];
    const sorted = sortNudgesByPriority(nudges);
    expect(sorted.map(n => n.overdueSince)).toEqual(['2026-03-07', '2026-03-09', '2026-03-10']);
  });

  it('returns empty array for no nudges', () => {
    expect(sortNudgesByPriority([])).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const nudges: Nudge[] = [
      makeNudge({ entityType: 'routine', entityId: NUDGE_ID_1, overdueSince: '2026-03-10' }),
      makeNudge({ entityType: 'planningRitual', entityId: NUDGE_ID_2, overdueSince: '2026-03-08' })
    ];
    const copy = [...nudges];
    sortNudgesByPriority(nudges);
    expect(nudges[0].entityType).toBe(copy[0].entityType);
  });
});

describe('computeCompletionWindow', () => {
  // Spec example: completions at [19:00, 19:30, 20:00, 20:15, 20:30, 21:00, 21:00, 22:00]
  const specTimestamps = [
    '2026-03-10T19:00:00Z', '2026-03-11T19:30:00Z',
    '2026-03-12T20:00:00Z', '2026-03-13T20:15:00Z',
    '2026-03-14T20:30:00Z', '2026-03-15T21:00:00Z',
    '2026-03-08T21:00:00Z', '2026-03-09T22:00:00Z',
  ];

  it('holds when current time is before completion window (spec example)', () => {
    const result = computeCompletionWindow(specTimestamps, 'UTC', 18.0);
    expect(result.decision).toBe('hold');
    if (result.decision === 'hold') {
      // Window start should be approximately Q1 - 1h ≈ 18.625
      expect(result.windowStartHour).toBeGreaterThan(18.0);
      expect(result.windowStartHour).toBeLessThan(19.0);
    }
  });

  it('delivers when current time is within completion window (spec example)', () => {
    const result = computeCompletionWindow(specTimestamps, 'UTC', 19.0);
    expect(result.decision).toBe('deliver');
  });

  it('returns no_window when fewer than 4 completions', () => {
    const timestamps = [
      '2026-03-10T19:00:00Z', '2026-03-11T20:00:00Z', '2026-03-12T21:00:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 18.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'insufficient_data' });
  });

  it('returns no_window when completion times span > 6 hour IQR', () => {
    const timestamps = [
      '2026-03-10T02:00:00Z', '2026-03-11T06:00:00Z',
      '2026-03-12T14:00:00Z', '2026-03-13T16:00:00Z',
      '2026-03-14T20:00:00Z', '2026-03-15T22:00:00Z',
      '2026-03-08T08:00:00Z', '2026-03-09T23:00:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 12.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'high_variance' });
  });

  it('computes window with exactly 4 completions (minimum threshold)', () => {
    const timestamps = [
      '2026-03-10T08:00:00Z', '2026-03-11T08:30:00Z',
      '2026-03-12T09:00:00Z', '2026-03-13T09:30:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 6.0);
    expect(result.decision).toBe('hold');
  });

  it('delivers when current time is after window end', () => {
    const timestamps = [
      '2026-03-10T08:00:00Z', '2026-03-11T08:30:00Z',
      '2026-03-12T09:00:00Z', '2026-03-13T09:30:00Z',
      '2026-03-14T08:15:00Z', '2026-03-15T09:15:00Z',
    ];
    const result = computeCompletionWindow(timestamps, 'UTC', 12.0);
    expect(result.decision).toBe('deliver');
  });

  it('respects timezone for hour extraction', () => {
    // 19:00 UTC = 14:00 America/New_York (EST, -5)
    const timestamps = [
      '2026-03-10T19:00:00Z', '2026-03-11T19:30:00Z',
      '2026-03-12T20:00:00Z', '2026-03-13T20:30:00Z',
    ];
    // In NY time, hours are [14:00, 14:30, 15:00, 15:30]
    // Q1 ≈ 14.25, window start ≈ 13.25
    // At 12.0 NY time → before window → hold
    const result = computeCompletionWindow(timestamps, 'America/New_York', 12.0);
    expect(result.decision).toBe('hold');
  });

  it('returns no_window for empty timestamps', () => {
    const result = computeCompletionWindow([], 'UTC', 12.0);
    expect(result).toEqual({ decision: 'no_window', reason: 'insufficient_data' });
  });
});

describe('getCurrentLocalHour', () => {
  it('returns fractional hour in the given timezone', () => {
    const date = new Date('2026-03-15T18:30:00Z');
    const hour = getCurrentLocalHour(date, 'UTC');
    expect(hour).toBeCloseTo(18.5, 1);
  });

  it('converts timezone correctly', () => {
    // 18:30 UTC = 13:30 EST (America/New_York, -5 in winter... but March 15 is DST so -4)
    const date = new Date('2026-03-15T18:30:00Z');
    const hour = getCurrentLocalHour(date, 'America/New_York');
    expect(hour).toBeCloseTo(14.5, 1); // EDT (UTC-4) in March
  });
});

describe('localDateToUtcNoon', () => {
  it('returns noon UTC for UTC timezone', () => {
    const result = localDateToUtcNoon('2026-03-18', 'UTC');
    expect(result).toBe('2026-03-18T12:00:00.000Z');
  });

  it('preserves the correct calendar day for America/New_York (EDT, UTC-4)', () => {
    // March 18 2026 is EDT (DST already started March 8)
    // noon ET = 16:00 UTC
    const result = localDateToUtcNoon('2026-03-18', 'America/New_York');
    expect(result).toBe('2026-03-18T16:00:00.000Z');
    // Verify the result is still Wednesday in New York
    const d = new Date(result);
    expect(d.getUTCDay()).toBe(3); // Wednesday in UTC too (noon ET → 4pm UTC, same day)
  });

  it('preserves the correct calendar day for America/New_York (EST, UTC-5)', () => {
    // January 7 2026 is EST (no DST)
    // noon ET = 17:00 UTC
    const result = localDateToUtcNoon('2026-01-07', 'America/New_York');
    expect(result).toBe('2026-01-07T17:00:00.000Z');
    // Wednesday in both UTC and local
    const d = new Date(result);
    expect(d.getUTCDay()).toBe(3);
  });

  it('preserves the correct calendar day for Asia/Tokyo (UTC+9)', () => {
    // Noon in Tokyo = 03:00 UTC (same day)
    const result = localDateToUtcNoon('2026-03-18', 'Asia/Tokyo');
    expect(result).toBe('2026-03-18T03:00:00.000Z');
  });

  it('preserves the correct calendar day for Pacific/Auckland (NZDT, UTC+13)', () => {
    // Noon in Auckland (NZDT) = 23:00 UTC previous day
    const result = localDateToUtcNoon('2026-03-18', 'Pacific/Auckland');
    // noon NZDT = 2026-03-17T23:00:00Z
    expect(result).toBe('2026-03-17T23:00:00.000Z');
    // But when formatted in Auckland timezone, it should show March 18
    const d = new Date(result);
    const nzDay = new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Auckland', day: 'numeric' }).format(d);
    expect(Number(nzDay)).toBe(18);
  });

  it('handles DST spring-forward boundary correctly', () => {
    // March 8 2026 is the DST transition day for America/New_York
    // Clocks spring forward at 2am, so noon ET on March 8 = noon EDT = 16:00 UTC
    const result = localDateToUtcNoon('2026-03-08', 'America/New_York');
    expect(result).toBe('2026-03-08T16:00:00.000Z');
    const d = new Date(result);
    expect(d.getUTCDate()).toBe(8); // Still March 8 in UTC
  });

  it('handles DST fall-back boundary correctly', () => {
    // November 1 2026 is the DST transition day for America/New_York
    // Clocks fall back at 2am, so noon ET on Nov 1 = noon EST = 17:00 UTC
    const result = localDateToUtcNoon('2026-11-01', 'America/New_York');
    expect(result).toBe('2026-11-01T17:00:00.000Z');
    const d = new Date(result);
    expect(d.getUTCDate()).toBe(1);
  });
});
