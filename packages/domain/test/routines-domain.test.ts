import { describe, it, expect } from 'vitest';
import {
  createRoutine,
  updateRoutine,
  completeRoutineOccurrence,
  computeRoutineDueState,
  pauseRoutine,
  resumeRoutine,
  archiveRoutine,
  restoreRoutine,
  scheduleNextRoutineOccurrence,
  assertStakeholderWrite
} from '../src/index';
import type { Routine, RoutineOccurrence } from '@olivia/contracts';

const BASE_DATE = new Date('2026-03-15T12:00:00.000Z');

const ROUTINE_ID = 'a0a0a0a0-a0a0-4a0a-8a0a-a0a0a0a0a0a0';
const OCCURRENCE_ID = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1';

function makeRoutine(overrides: Partial<Routine> = {}): Routine {
  return {
    id: ROUTINE_ID,
    title: 'Test routine',
    owner: 'stakeholder',
    recurrenceRule: 'weekly',
    intervalDays: null,
    status: 'active',
    currentDueDate: '2026-03-15T12:00:00.000Z',
    createdAt: '2026-03-01T12:00:00.000Z',
    updatedAt: '2026-03-01T12:00:00.000Z',
    archivedAt: null,
    version: 1,
    ...overrides
  };
}

function makeOccurrence(overrides: Partial<RoutineOccurrence> = {}): RoutineOccurrence {
  return {
    id: OCCURRENCE_ID,
    routineId: ROUTINE_ID,
    dueDate: '2026-03-15T12:00:00.000Z',
    completedAt: '2026-03-15T14:00:00.000Z',
    completedBy: 'stakeholder',
    skipped: false,
    createdAt: '2026-03-15T14:00:00.000Z',
    ...overrides
  };
}

describe('scheduleNextRoutineOccurrence', () => {
  it('advances daily by one day', () => {
    const next = scheduleNextRoutineOccurrence('2026-03-15T12:00:00.000Z', 'daily');
    expect(next).toBe('2026-03-16T12:00:00.000Z');
  });

  it('advances weekly by one week', () => {
    const next = scheduleNextRoutineOccurrence('2026-03-15T12:00:00.000Z', 'weekly');
    expect(next).toBe('2026-03-22T12:00:00.000Z');
  });

  it('advances monthly by one month', () => {
    const next = scheduleNextRoutineOccurrence('2026-03-01T12:00:00.000Z', 'monthly');
    expect(next).toMatch(/^2026-04-01T/);
  });

  it('clamps monthly to last day when starting on the 31st', () => {
    const next = scheduleNextRoutineOccurrence('2026-01-31T12:00:00.000Z', 'monthly');
    // February has 28 days in 2026 — should clamp to Feb 28
    expect(next).toMatch(/^2026-02-28T/);
  });

  it('advances every_n_days by the given interval', () => {
    const next = scheduleNextRoutineOccurrence('2026-03-15T12:00:00.000Z', 'every_n_days', 14);
    expect(next).toBe('2026-03-29T12:00:00.000Z');
  });

  it('throws for every_n_days without intervalDays', () => {
    expect(() => scheduleNextRoutineOccurrence('2026-03-15T12:00:00.000Z', 'every_n_days')).toThrow();
  });

  it('advances every_n_days with intervalDays = 1', () => {
    const next = scheduleNextRoutineOccurrence('2026-03-15T12:00:00.000Z', 'every_n_days', 1);
    expect(next).toBe('2026-03-16T12:00:00.000Z');
  });

  it('advances every_n_days with intervalDays = 90', () => {
    const next = scheduleNextRoutineOccurrence('2026-01-01T12:00:00.000Z', 'every_n_days', 90);
    // 90 days from Jan 1 = April 1
    expect(next).toMatch(/^2026-04-01T/);
  });
});

describe('createRoutine', () => {
  it('creates a routine with correct fields', () => {
    const routine = createRoutine('Take out trash', 'stakeholder', 'weekly', '2026-03-16T09:00:00.000Z', null, BASE_DATE);
    expect(routine.title).toBe('Take out trash');
    expect(routine.owner).toBe('stakeholder');
    expect(routine.recurrenceRule).toBe('weekly');
    expect(routine.intervalDays).toBeNull();
    expect(routine.status).toBe('active');
    expect(routine.currentDueDate).toBe('2026-03-16T09:00:00.000Z');
    expect(routine.version).toBe(1);
    expect(routine.archivedAt).toBeNull();
  });

  it('creates a daily routine', () => {
    const routine = createRoutine('Morning walk', 'stakeholder', 'daily', '2026-03-16T07:00:00.000Z', null, BASE_DATE);
    expect(routine.recurrenceRule).toBe('daily');
  });

  it('creates a monthly routine', () => {
    const routine = createRoutine('Pay power bill', 'stakeholder', 'monthly', '2026-04-01T09:00:00.000Z', null, BASE_DATE);
    expect(routine.recurrenceRule).toBe('monthly');
  });

  it('creates an every_n_days routine with intervalDays', () => {
    const routine = createRoutine('Deep clean', 'stakeholder', 'every_n_days', '2026-03-29T09:00:00.000Z', 14, BASE_DATE);
    expect(routine.recurrenceRule).toBe('every_n_days');
    expect(routine.intervalDays).toBe(14);
  });

  it('throws if every_n_days without intervalDays', () => {
    expect(() => createRoutine('Deep clean', 'stakeholder', 'every_n_days', '2026-03-29T09:00:00.000Z', null, BASE_DATE)).toThrow();
  });
});

describe('computeRoutineDueState', () => {
  it('returns upcoming when due date is in the future', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-20T12:00:00.000Z' });
    const now = new Date('2026-03-15T12:00:00.000Z');
    expect(computeRoutineDueState(routine, null, now)).toBe('upcoming');
  });

  it('returns due when due date is now (within 24h window)', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z' });
    const now = new Date('2026-03-15T18:00:00.000Z');
    expect(computeRoutineDueState(routine, null, now)).toBe('due');
  });

  it('returns due when due date is exactly now', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z' });
    const now = new Date('2026-03-15T12:00:00.000Z');
    expect(computeRoutineDueState(routine, null, now)).toBe('due');
  });

  it('returns overdue when due date is more than 24h ago', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-10T12:00:00.000Z' });
    const now = new Date('2026-03-15T12:00:00.000Z');
    expect(computeRoutineDueState(routine, null, now)).toBe('overdue');
  });

  it('returns completed when current cycle occurrence has completedAt', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z' });
    const occurrence = makeOccurrence({ completedAt: '2026-03-15T14:00:00.000Z' });
    expect(computeRoutineDueState(routine, occurrence, BASE_DATE)).toBe('completed');
  });

  it('returns paused when routine status is paused', () => {
    const routine = makeRoutine({ status: 'paused' });
    expect(computeRoutineDueState(routine, null, BASE_DATE)).toBe('paused');
  });

  it('paused takes precedence over overdue', () => {
    const routine = makeRoutine({ status: 'paused', currentDueDate: '2026-03-01T12:00:00.000Z' });
    expect(computeRoutineDueState(routine, null, BASE_DATE)).toBe('paused');
  });

  it('completed takes precedence over overdue', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-10T12:00:00.000Z' });
    const occurrence = makeOccurrence({ completedAt: '2026-03-15T14:00:00.000Z', dueDate: '2026-03-10T12:00:00.000Z' });
    const now = new Date('2026-03-15T12:00:00.000Z');
    expect(computeRoutineDueState(routine, occurrence, now)).toBe('completed');
  });
});

describe('completeRoutineOccurrence', () => {
  it('creates an occurrence record for the current cycle', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z', recurrenceRule: 'weekly' });
    const { occurrence } = completeRoutineOccurrence(routine, 'stakeholder', BASE_DATE);
    expect(occurrence.dueDate).toBe('2026-03-15T12:00:00.000Z');
    expect(occurrence.completedAt).toBe(BASE_DATE.toISOString());
    expect(occurrence.completedBy).toBe('stakeholder');
    expect(occurrence.routineId).toBe(routine.id);
  });

  it('advances currentDueDate to next occurrence (schedule-anchored from original due date)', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z', recurrenceRule: 'weekly' });
    const { updatedRoutine } = completeRoutineOccurrence(routine, 'stakeholder', BASE_DATE);
    expect(updatedRoutine.currentDueDate).toBe('2026-03-22T12:00:00.000Z');
  });

  it('advances from original due date (not completion date) when overdue', () => {
    // Routine was due on the 1st, completing it on the 15th
    const routine = makeRoutine({ currentDueDate: '2026-03-01T12:00:00.000Z', recurrenceRule: 'monthly' });
    const completionDate = new Date('2026-03-15T12:00:00.000Z');
    const { updatedRoutine } = completeRoutineOccurrence(routine, 'stakeholder', completionDate);
    // Schedule-anchored: should advance from 2026-03-01 by 1 month (April 1), not from March 15
    expect(updatedRoutine.currentDueDate).toMatch(/^2026-04-01T/);
    // Confirm it's NOT anchored from the completion date (would be April 15)
    expect(updatedRoutine.currentDueDate).not.toMatch(/^2026-04-15T/);
  });

  it('increments routine version after completion', () => {
    const routine = makeRoutine({ version: 3 });
    const { updatedRoutine } = completeRoutineOccurrence(routine, 'stakeholder', BASE_DATE);
    expect(updatedRoutine.version).toBe(4);
  });

  it('throws when completing a paused routine', () => {
    const routine = makeRoutine({ status: 'paused' });
    expect(() => completeRoutineOccurrence(routine, 'stakeholder', BASE_DATE)).toThrow();
  });

  it('throws when completing an archived routine', () => {
    const routine = makeRoutine({ status: 'archived', archivedAt: '2026-03-01T00:00:00.000Z' });
    expect(() => completeRoutineOccurrence(routine, 'stakeholder', BASE_DATE)).toThrow();
  });
});

describe('updateRoutine - mid-cycle recurrence rule edit', () => {
  it('updates title without changing currentDueDate', () => {
    const routine = makeRoutine({ currentDueDate: '2026-03-15T12:00:00.000Z', recurrenceRule: 'weekly' });
    const updated = updateRoutine(routine, { title: 'New title' }, BASE_DATE);
    expect(updated.title).toBe('New title');
    expect(updated.currentDueDate).toBe('2026-03-15T12:00:00.000Z');
  });

  it('changing recurrence rule does not change currentDueDate (next completion will use new rule from same anchor)', () => {
    // Monthly routine due on the 1st — editing to bi-monthly
    const routine = makeRoutine({
      currentDueDate: '2026-04-01T12:00:00.000Z',
      recurrenceRule: 'monthly'
    });
    const updated = updateRoutine(routine, { recurrenceRule: 'every_n_days', intervalDays: 60 }, BASE_DATE);
    // currentDueDate stays the same; new rule applies to next advance after completion
    expect(updated.currentDueDate).toBe('2026-04-01T12:00:00.000Z');
    expect(updated.recurrenceRule).toBe('every_n_days');
    expect(updated.intervalDays).toBe(60);
  });

  it('after editing recurrence rule, completion advances from original due date using new rule', () => {
    const routine = makeRoutine({
      currentDueDate: '2026-04-01T12:00:00.000Z',
      recurrenceRule: 'monthly'
    });
    const updated = updateRoutine(routine, { recurrenceRule: 'every_n_days', intervalDays: 60 }, BASE_DATE);
    // Now complete it — should advance from 2026-04-01 by 60 days (= May 31), not by 1 month (May 1)
    const completionDate = new Date('2026-04-05T12:00:00.000Z');
    const { updatedRoutine } = completeRoutineOccurrence(updated, 'stakeholder', completionDate);
    expect(updatedRoutine.currentDueDate).toMatch(/^2026-05-31T/);
    // Confirm it's NOT advancing by 1 month (which would be May 1)
    expect(updatedRoutine.currentDueDate).not.toMatch(/^2026-05-01T/);
  });
});

describe('pauseRoutine and resumeRoutine', () => {
  it('pauses an active routine', () => {
    const routine = makeRoutine({ status: 'active' });
    const paused = pauseRoutine(routine, BASE_DATE);
    expect(paused.status).toBe('paused');
    expect(paused.version).toBe(2);
  });

  it('resumes a paused routine', () => {
    const routine = makeRoutine({ status: 'paused' });
    const resumed = resumeRoutine(routine, BASE_DATE);
    expect(resumed.status).toBe('active');
    expect(resumed.version).toBe(2);
  });

  it('throws when pausing an already paused routine', () => {
    const routine = makeRoutine({ status: 'paused' });
    expect(() => pauseRoutine(routine, BASE_DATE)).toThrow();
  });

  it('throws when resuming a non-paused routine', () => {
    const routine = makeRoutine({ status: 'active' });
    expect(() => resumeRoutine(routine, BASE_DATE)).toThrow();
  });

  it('throws when pausing an archived routine', () => {
    const routine = makeRoutine({ status: 'archived', archivedAt: '2026-03-01T00:00:00.000Z' });
    expect(() => pauseRoutine(routine, BASE_DATE)).toThrow();
  });
});

describe('archiveRoutine and restoreRoutine', () => {
  it('archives an active routine', () => {
    const routine = makeRoutine({ status: 'active' });
    const archived = archiveRoutine(routine, BASE_DATE);
    expect(archived.status).toBe('archived');
    expect(archived.archivedAt).toBe(BASE_DATE.toISOString());
    expect(archived.version).toBe(2);
  });

  it('archives a paused routine', () => {
    const routine = makeRoutine({ status: 'paused' });
    const archived = archiveRoutine(routine, BASE_DATE);
    expect(archived.status).toBe('archived');
  });

  it('restores an archived routine', () => {
    const routine = makeRoutine({ status: 'archived', archivedAt: '2026-03-01T00:00:00.000Z' });
    const restored = restoreRoutine(routine, BASE_DATE);
    expect(restored.status).toBe('active');
    expect(restored.archivedAt).toBeNull();
    expect(restored.version).toBe(2);
  });

  it('throws when archiving an already archived routine', () => {
    const routine = makeRoutine({ status: 'archived', archivedAt: '2026-03-01T00:00:00.000Z' });
    expect(() => archiveRoutine(routine, BASE_DATE)).toThrow();
  });

  it('throws when restoring a non-archived routine', () => {
    const routine = makeRoutine({ status: 'active' });
    expect(() => restoreRoutine(routine, BASE_DATE)).toThrow();
  });
});

describe('assertStakeholderWrite (role enforcement)', () => {
  it('does not throw for stakeholder', () => {
    expect(() => assertStakeholderWrite('stakeholder')).not.toThrow();
  });

  it('throws 403 ROLE_READ_ONLY for spouse', () => {
    expect(() => assertStakeholderWrite('spouse')).toThrow();
    try {
      assertStakeholderWrite('spouse');
    } catch (err) {
      const error = err as Error & { statusCode?: number; code?: string };
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('ROLE_READ_ONLY');
    }
  });
});
