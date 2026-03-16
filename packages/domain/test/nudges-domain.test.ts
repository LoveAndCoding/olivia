import { describe, it, expect } from 'vitest';
import { skipRoutineOccurrence, sortNudgesByPriority } from '../src/index';
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
    status: 'active',
    currentDueDate: '2026-03-08T12:00:00.000Z',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    archivedAt: null,
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
