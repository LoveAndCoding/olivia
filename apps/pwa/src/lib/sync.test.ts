// @vitest-environment jsdom

import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createReminder } from '@olivia/domain';
import { type Reminder } from '@olivia/contracts';
import { cacheReminder, clientDb, listOutbox } from './client-db';
import { ApiError } from './api';
import {
  completeReminderCommand,
  confirmCreateReminderCommand,
  confirmUpdateReminderCommand,
  flushOutbox,
  loadReminderView,
  previewCreateReminderCommand,
  snoozeReminderCommand
} from './sync';

function setNavigatorOnline(online: boolean) {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online
  });
}

function buildSeedReminder(overrides?: Partial<Reminder>): Reminder {
  return createReminder(
    {
      id: crypto.randomUUID(),
      title: 'Seed reminder',
      note: null,
      owner: 'stakeholder',
      scheduledAt: new Date('2026-03-14T08:00:00.000Z').toISOString(),
      recurrenceCadence: 'none',
      linkedInboxItemId: null,
      ...overrides
    },
    new Date('2026-03-14T07:00:00.000Z')
  ).reminder;
}

beforeEach(async () => {
  vi.restoreAllMocks();
  setNavigatorOnline(false);
  await clientDb.delete();
  await clientDb.open();
});

describe('reminder sync behavior', () => {
  it('queues offline reminder creation and serves the cached reminder view', async () => {
    const preview = await previewCreateReminderCommand('stakeholder', undefined, {
      title: 'Offline creation reminder',
      owner: 'stakeholder',
      scheduledAt: new Date('2026-03-15T09:00:00.000Z').toISOString(),
      recurrenceCadence: 'none'
    });

    await confirmCreateReminderCommand('stakeholder', preview.parsedReminder, preview.draftId);

    const view = await loadReminderView('stakeholder');
    expect(view.source).toBe('cache');
    expect(view.remindersByState.upcoming.some((reminder) => reminder.title === 'Offline creation reminder' && reminder.pendingSync)).toBe(true);

    const outbox = await listOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.kind).toBe('reminder_create');
  });

  it('supports offline snooze and recurring completion commands', async () => {
    const recurringPreview = await previewCreateReminderCommand('stakeholder', undefined, {
      title: 'Recurring reminder to complete',
      owner: 'stakeholder',
      scheduledAt: new Date('2026-03-14T06:00:00.000Z').toISOString(),
      recurrenceCadence: 'weekly'
    });
    const recurringReminder = await confirmCreateReminderCommand('stakeholder', recurringPreview.parsedReminder, recurringPreview.draftId);
    const completedReminder = await completeReminderCommand('stakeholder', recurringReminder.id, recurringReminder.version);

    expect(completedReminder.state).toBe('upcoming');
    expect(completedReminder.scheduledAt).not.toBe(recurringReminder.scheduledAt);

    const oneTimePreview = await previewCreateReminderCommand('stakeholder', undefined, {
      title: 'Reminder to snooze',
      owner: 'stakeholder',
      scheduledAt: new Date('2026-03-14T05:00:00.000Z').toISOString(),
      recurrenceCadence: 'none'
    });
    const oneTimeReminder = await confirmCreateReminderCommand('stakeholder', oneTimePreview.parsedReminder, oneTimePreview.draftId);
    const snoozedReminder = await snoozeReminderCommand(
      'stakeholder',
      oneTimeReminder.id,
      oneTimeReminder.version,
      new Date('2026-03-14T12:00:00.000Z').toISOString()
    );

    expect(snoozedReminder.state).toBe('snoozed');

    const view = await loadReminderView('stakeholder');
    expect(view.remindersByState.snoozed.some((reminder) => reminder.title === 'Reminder to snooze')).toBe(true);
  });

  it('marks reminder outbox commands as conflicts on version mismatch', async () => {
    const reminder = buildSeedReminder();
    await cacheReminder(reminder);

    await confirmUpdateReminderCommand('stakeholder', reminder.id, reminder.version, {
      title: 'Conflicted title'
    });

    setNavigatorOnline(true);
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Version conflict.' })
      })
    );

    await expect(flushOutbox()).rejects.toBeInstanceOf(ApiError);

    const outbox = await listOutbox();
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.state).toBe('conflict');
    expect(outbox[0]?.lastError).toContain('refresh this reminder');
  });

  it('falls back to cached reminder data when online fetch fails', async () => {
    const cachedReminder = buildSeedReminder({
      title: 'Cached reminder view',
      scheduledAt: new Date('2026-03-15T09:00:00.000Z').toISOString()
    });
    await cacheReminder(cachedReminder);

    setNavigatorOnline(true);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unreachable')));

    const view = await loadReminderView('stakeholder');
    expect(view.source).toBe('cache');
    expect(view.remindersByState.upcoming.some((reminder) => reminder.title === 'Cached reminder view')).toBe(true);
  });
});
