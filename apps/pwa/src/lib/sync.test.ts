import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  ActorRole,
  DraftReminder,
  OutboxCommand,
  Reminder,
  ReminderNotificationPreferences,
  ReminderSettingsResponse,
  ReminderTimelineEntry
} from '@olivia/contracts';

const stores = vi.hoisted(() => ({
  reminders: new Map<string, Reminder>(),
  timelines: new Map<string, ReminderTimelineEntry[]>(),
  settings: new Map<ActorRole, ReminderNotificationPreferences>(),
  outbox: [] as Array<OutboxCommand & { createdAt: string; state: 'pending' | 'conflict'; lastError?: string }>,
  meta: new Map<string, unknown>()
}));

const apiMocks = vi.hoisted(() => ({
  fetchReminderView: vi.fn(),
  fetchReminderDetail: vi.fn(),
  previewCreateReminder: vi.fn(),
  confirmCreateReminder: vi.fn(),
  previewUpdateReminder: vi.fn(),
  confirmUpdateReminder: vi.fn(),
  completeReminder: vi.fn(),
  snoozeReminder: vi.fn(),
  cancelReminder: vi.fn(),
  fetchReminderSettings: vi.fn(),
  saveReminderSettings: vi.fn(),
  confirmCreate: vi.fn(),
  confirmUpdate: vi.fn(),
  fetchInboxView: vi.fn(),
  fetchItemDetail: vi.fn(),
  listNotificationSubscriptions: vi.fn(),
  previewCreate: vi.fn(),
  previewUpdate: vi.fn(),
  saveNotificationSubscription: vi.fn()
}));

vi.mock('./client-db', async () => {
  const { groupReminders } = await import('@olivia/domain');

  const buildCachedReminderView = vi.fn(async () => ({
    remindersByState: groupReminders([...stores.reminders.values()]),
    generatedAt: (stores.meta.get('last-reminder-sync-at') as string) ?? new Date(0).toISOString(),
    source: 'cache' as const
  }));

  const cacheReminderView = vi.fn(async (response: { remindersByState: Record<string, Reminder[]>; generatedAt: string }) => {
    const reminders = Object.values(response.remindersByState).flat();
    for (const reminder of reminders) {
      stores.reminders.set(reminder.id, reminder);
    }
    stores.meta.set('last-reminder-sync-at', response.generatedAt);
  });

  return {
    clientDb: {
      items: {
        get: vi.fn(async () => undefined)
      },
      reminders: {
        get: vi.fn(async (reminderId: string) => stores.reminders.get(reminderId))
      }
    },
    appendCachedReminderTimelineEntries: vi.fn(async (reminderId: string, entries: ReminderTimelineEntry[]) => {
      const existing = stores.timelines.get(reminderId) ?? [];
      const merged = new Map(existing.map((entry) => [entry.id, entry]));
      for (const entry of entries) {
        merged.set(entry.id, entry);
      }
      stores.timelines.set(reminderId, [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt)));
    }),
    buildCachedReminderView,
    buildCachedView: vi.fn(async () => ({
      itemsByStatus: { open: [], in_progress: [], deferred: [], done: [] },
      suggestions: [],
      generatedAt: new Date(0).toISOString(),
      staleThresholdDays: 14,
      dueSoonDays: 7,
      source: 'cache' as const
    })),
    cacheInboxView: vi.fn(),
    cacheItem: vi.fn(),
    cacheItemDetail: vi.fn(),
    cacheReminder: vi.fn(async (reminder: Reminder) => {
      stores.reminders.set(reminder.id, reminder);
    }),
    cacheReminderDetail: vi.fn(async (detail: { reminder: Reminder; timeline: ReminderTimelineEntry[] }) => {
      stores.reminders.set(detail.reminder.id, detail.reminder);
      stores.timelines.set(detail.reminder.id, detail.timeline);
    }),
    cacheReminderSettings: vi.fn(async (response: ReminderSettingsResponse) => {
      stores.settings.set(response.preferences.actorRole, response.preferences);
    }),
    cacheReminderView,
    enqueueCommand: vi.fn(async (command: OutboxCommand, state: 'pending' | 'conflict' = 'pending', lastError?: string) => {
      stores.outbox.push({ ...command, createdAt: new Date().toISOString(), state, lastError });
    }),
    getCachedItemDetail: vi.fn(async () => null),
    getCachedReminder: vi.fn(async (reminderId: string) => stores.reminders.get(reminderId)),
    getCachedReminderDetail: vi.fn(async (reminderId: string) => {
      const reminder = stores.reminders.get(reminderId);
      return reminder ? { reminder, timeline: stores.timelines.get(reminderId) ?? [] } : null;
    }),
    getCachedReminderSettings: vi.fn(async (actorRole: ActorRole) => stores.settings.get(actorRole) ?? null),
    getCachedReminderTimeline: vi.fn(async (reminderId: string) => stores.timelines.get(reminderId) ?? []),
    listOutbox: vi.fn(async () => [...stores.outbox]),
    markOutboxConflict: vi.fn(async (commandId: string, errorMessage: string) => {
      const command = stores.outbox.find((entry) => entry.commandId === commandId);
      if (command) {
        command.state = 'conflict';
        command.lastError = errorMessage;
      }
    }),
    removeOutboxCommand: vi.fn(async (commandId: string) => {
      const index = stores.outbox.findIndex((entry) => entry.commandId === commandId);
      if (index >= 0) {
        stores.outbox.splice(index, 1);
      }
    }),
    setMeta: vi.fn(async (key: string, value: unknown) => {
      stores.meta.set(key, value);
    })
  };
});

vi.mock('./api', () => {
  class ApiError extends Error {
    constructor(message: string, public readonly statusCode: number, public readonly payload: unknown) {
      super(message);
    }
  }

  return {
    ApiError,
    ...apiMocks
  };
});

import {
  completeReminderCommand,
  confirmCreateReminderCommand,
  flushOutbox,
  loadReminderSettings,
  loadReminderView,
  saveReminderSettingsCommand,
  snoozeReminderCommand
} from './sync';
import { ApiError } from './api';

function setOnline(online: boolean) {
  Object.defineProperty(globalThis, 'window', {
    value: { navigator: { onLine: online } },
    configurable: true
  });
}

function createDraftReminder(overrides: Partial<DraftReminder> = {}): DraftReminder {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Bring the vet records',
    note: overrides.note ?? null,
    owner: overrides.owner ?? 'stakeholder',
    scheduledAt: overrides.scheduledAt ?? new Date('2026-03-20T12:00:00.000Z').toISOString(),
    recurrenceCadence: overrides.recurrenceCadence ?? 'none',
    linkedInboxItemId: overrides.linkedInboxItemId ?? null
  };
}

function createReminder(overrides: Partial<Reminder> = {}): Reminder {
  const scheduledAt = overrides.scheduledAt ?? new Date('2026-03-20T12:00:00.000Z').toISOString();
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? 'Bring the vet records',
    note: overrides.note ?? null,
    owner: overrides.owner ?? 'stakeholder',
    scheduledAt,
    recurrenceCadence: overrides.recurrenceCadence ?? 'none',
    linkedInboxItemId: overrides.linkedInboxItemId ?? null,
    linkedInboxItem: overrides.linkedInboxItem,
    state: overrides.state ?? 'upcoming',
    snoozedUntil: overrides.snoozedUntil ?? null,
    completedAt: overrides.completedAt ?? null,
    cancelledAt: overrides.cancelledAt ?? null,
    createdAt: overrides.createdAt ?? '2026-03-14T08:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2026-03-14T08:00:00.000Z',
    version: overrides.version ?? 1,
    pendingSync: overrides.pendingSync
  };
}

function createTimelineEntry(reminderId: string, eventType: ReminderTimelineEntry['eventType']): ReminderTimelineEntry {
  return {
    id: crypto.randomUUID(),
    reminderId,
    actorRole: eventType === 'recurrence_advanced' ? 'system_rule' : 'stakeholder',
    eventType,
    fromValue: null,
    toValue: null,
    metadata: null,
    createdAt: new Date('2026-03-14T08:00:00.000Z').toISOString()
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-03-14T08:00:00.000Z'));
  stores.reminders.clear();
  stores.timelines.clear();
  stores.settings.clear();
  stores.outbox.splice(0, stores.outbox.length);
  stores.meta.clear();
  setOnline(true);
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('reminder sync flows', () => {
  it('queues offline reminder creation and serves the cached reminder view', async () => {
    setOnline(false);
    const draft = createDraftReminder();

    const savedReminder = await confirmCreateReminderCommand('stakeholder', draft);
    const cachedView = await loadReminderView('stakeholder');

    expect(savedReminder.pendingSync).toBe(true);
    expect(stores.outbox).toHaveLength(1);
    expect(stores.outbox[0].kind).toBe('reminder_create');
    expect(cachedView.source).toBe('cache');
    expect(cachedView.remindersByState.upcoming).toHaveLength(1);
    expect(cachedView.remindersByState.upcoming[0].id).toBe(draft.id);
  });

  it('queues offline snooze and complete commands with optimistic reminder updates', async () => {
    setOnline(false);
    const reminder = createReminder({
      recurrenceCadence: 'daily',
      scheduledAt: new Date('2026-03-14T09:00:00.000Z').toISOString()
    });
    stores.reminders.set(reminder.id, reminder);
    stores.timelines.set(reminder.id, [createTimelineEntry(reminder.id, 'created')]);

    const snoozedUntil = new Date('2026-03-14T18:00:00.000Z').toISOString();
    const snoozed = await snoozeReminderCommand('stakeholder', reminder.id, reminder.version, snoozedUntil);
    const completed = await completeReminderCommand('stakeholder', reminder.id, snoozed.version);

    expect(snoozed.pendingSync).toBe(true);
    expect(snoozed.snoozedUntil).toBe(snoozedUntil);
    expect(completed.pendingSync).toBe(true);
    expect(completed.recurrenceCadence).toBe('daily');
    expect(new Date(completed.scheduledAt).getTime()).toBeGreaterThan(new Date(snoozedUntil).getTime());
    expect(stores.outbox.map((command) => command.kind)).toEqual(['reminder_snooze', 'reminder_complete']);
  });

  it('flushes queued reminder commands when the client reconnects', async () => {
    setOnline(true);
    const reminderId = crypto.randomUUID();
    const draft = createDraftReminder({ id: reminderId });
    const createdReminder = createReminder({ id: reminderId, version: 1 });
    const updatedReminder = createReminder({ id: reminderId, title: 'Bring the updated records folder', version: 2 });
    const createdTimeline = createTimelineEntry(reminderId, 'created');
    const updatedTimeline = createTimelineEntry(reminderId, 'rescheduled');

    stores.outbox.push(
      {
        kind: 'reminder_create',
        commandId: crypto.randomUUID(),
        actorRole: 'stakeholder',
        approved: true,
        finalReminder: draft,
        createdAt: new Date('2026-03-14T08:00:00.000Z').toISOString(),
        state: 'pending'
      },
      {
        kind: 'reminder_update',
        commandId: crypto.randomUUID(),
        actorRole: 'stakeholder',
        reminderId,
        expectedVersion: 1,
        approved: true,
        proposedChange: { title: updatedReminder.title },
        createdAt: new Date('2026-03-14T08:01:00.000Z').toISOString(),
        state: 'pending'
      }
    );

    apiMocks.confirmCreateReminder.mockResolvedValue({
      savedReminder: createdReminder,
      timelineEntry: createdTimeline,
      newVersion: createdReminder.version
    });
    apiMocks.confirmUpdateReminder.mockResolvedValue({
      savedReminder: updatedReminder,
      timelineEntry: updatedTimeline,
      newVersion: updatedReminder.version
    });

    await flushOutbox();

    expect(apiMocks.confirmCreateReminder).toHaveBeenCalledWith('stakeholder', draft);
    expect(apiMocks.confirmUpdateReminder).toHaveBeenCalledWith('stakeholder', reminderId, 1, { title: updatedReminder.title });
    expect(stores.outbox).toHaveLength(0);
    expect(stores.reminders.get(reminderId)).toMatchObject({
      id: reminderId,
      title: updatedReminder.title,
      version: 2,
      pendingSync: false
    });
    expect(stores.timelines.get(reminderId)).toEqual(expect.arrayContaining([createdTimeline, updatedTimeline]));
  });

  it('marks reminder outbox conflicts when the server reports a version conflict', async () => {
    setOnline(true);
    const reminderId = crypto.randomUUID();

    stores.outbox.push({
      kind: 'reminder_complete',
      commandId: crypto.randomUUID(),
      actorRole: 'stakeholder',
      reminderId,
      expectedVersion: 2,
      approved: true,
      createdAt: new Date('2026-03-14T08:00:00.000Z').toISOString(),
      state: 'pending'
    });

    apiMocks.completeReminder.mockRejectedValue(new ApiError('Conflict', 409, { code: 'VERSION_CONFLICT' }));

    await expect(flushOutbox()).rejects.toThrow('Conflict');

    expect(stores.outbox).toHaveLength(1);
    expect(stores.outbox[0].state).toBe('conflict');
    expect(stores.outbox[0].lastError).toBe('Version conflict: refresh this reminder and retry.');
  });

  it('loads reminder settings from the server, caches them, and falls back offline', async () => {
    const response: ReminderSettingsResponse = {
      preferences: {
        actorRole: 'stakeholder',
        enabled: true,
        dueRemindersEnabled: true,
        dailySummaryEnabled: false,
        updatedAt: new Date('2026-03-14T08:00:00.000Z').toISOString()
      }
    };

    apiMocks.fetchReminderSettings.mockResolvedValue(response);

    const online = await loadReminderSettings('stakeholder');
    setOnline(false);
    const offline = await loadReminderSettings('stakeholder');

    expect(online).toEqual(response);
    expect(offline).toEqual(response);
  });

  it('saves reminder settings online and rejects offline writes', async () => {
    const response: ReminderSettingsResponse = {
      preferences: {
        actorRole: 'stakeholder',
        enabled: true,
        dueRemindersEnabled: false,
        dailySummaryEnabled: true,
        updatedAt: new Date('2026-03-14T09:00:00.000Z').toISOString()
      }
    };

    apiMocks.saveReminderSettings.mockResolvedValue(response);

    const saved = await saveReminderSettingsCommand('stakeholder', {
      enabled: true,
      dueRemindersEnabled: false,
      dailySummaryEnabled: true
    });

    expect(saved).toEqual(response);

    setOnline(false);
    await expect(
      saveReminderSettingsCommand('stakeholder', {
        enabled: false,
        dueRemindersEnabled: false,
        dailySummaryEnabled: false
      })
    ).rejects.toThrow('Reminder notification settings require a connection.');
  });
});
