import Dexie, { type Table } from 'dexie';
import { buildSuggestions, groupItems, groupReminders } from '@olivia/domain';
import type {
  ActorRole,
  HistoryEntry,
  InboxItem,
  InboxViewResponse,
  ItemDetailResponse,
  OutboxCommand,
  Reminder,
  ReminderDetailResponse,
  ReminderNotificationPreferences,
  ReminderSettingsResponse,
  ReminderTimelineEntry,
  ReminderViewResponse
} from '@olivia/contracts';

type MetaRecord = { key: string; value: string };

type StoredOutboxCommand = OutboxCommand & {
  createdAt: string;
  state: 'pending' | 'conflict';
  lastError?: string;
};

class OliviaClientDb extends Dexie {
  items!: Table<InboxItem, string>;
  historyCache!: Table<{ itemId: string; history: HistoryEntry[] }, string>;
  reminders!: Table<Reminder, string>;
  reminderTimelineCache!: Table<{ reminderId: string; timeline: ReminderTimelineEntry[] }, string>;
  reminderSettingsCache!: Table<{ actorRole: ActorRole; preferences: ReminderNotificationPreferences }, ActorRole>;
  outbox!: Table<StoredOutboxCommand, string>;
  meta!: Table<MetaRecord, string>;

  constructor() {
    super('olivia-household-inbox');
    this.version(1).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(2).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
  }
}

export const clientDb = new OliviaClientDb();

export async function setMeta(key: string, value: unknown) {
  await clientDb.meta.put({ key, value: JSON.stringify(value) });
}

export async function getMeta<T>(key: string): Promise<T | null> {
  const record = await clientDb.meta.get(key);
  return record ? (JSON.parse(record.value) as T) : null;
}

export async function cacheInboxView(response: InboxViewResponse) {
  const items = [...response.itemsByStatus.open, ...response.itemsByStatus.in_progress, ...response.itemsByStatus.deferred, ...response.itemsByStatus.done];
  await clientDb.transaction('rw', clientDb.items, clientDb.meta, async () => {
    await clientDb.items.bulkPut(items);
    await setMeta('last-sync-at', response.generatedAt);
  });
}

export async function buildCachedView(view: 'active' | 'all'): Promise<InboxViewResponse> {
  const items = await clientDb.items.toArray();
  const itemsByStatus = groupItems(items);
  const lastSyncAt = (await getMeta<string>('last-sync-at')) ?? new Date(0).toISOString();
  return {
    itemsByStatus: {
      open: itemsByStatus.open,
      in_progress: itemsByStatus.in_progress,
      deferred: view === 'all' ? itemsByStatus.deferred : [],
      done: view === 'all' ? itemsByStatus.done : []
    },
    suggestions: buildSuggestions(items),
    generatedAt: lastSyncAt,
    staleThresholdDays: 14,
    dueSoonDays: 7,
    source: 'cache'
  };
}

export async function cacheItemDetail(detail: ItemDetailResponse) {
  await clientDb.transaction('rw', clientDb.items, clientDb.historyCache, async () => {
    await clientDb.items.put(detail.item);
    await clientDb.historyCache.put({ itemId: detail.item.id, history: detail.history });
  });
}

export async function getCachedItemDetail(itemId: string): Promise<ItemDetailResponse | null> {
  const item = await clientDb.items.get(itemId);
  if (!item) {
    return null;
  }
  const history = (await clientDb.historyCache.get(itemId))?.history ?? [];
  return {
    item,
    history,
    flags: { overdue: false, stale: false, dueSoon: false, unassigned: item.owner === 'unassigned' }
  };
}

export async function cacheItem(item: InboxItem) {
  await clientDb.items.put(item);
}

export async function cacheReminderView(response: ReminderViewResponse) {
  const reminders = [
    ...response.remindersByState.upcoming,
    ...response.remindersByState.due,
    ...response.remindersByState.overdue,
    ...response.remindersByState.snoozed,
    ...response.remindersByState.completed,
    ...response.remindersByState.cancelled
  ];

  await clientDb.transaction('rw', clientDb.reminders, clientDb.meta, async () => {
    await clientDb.reminders.bulkPut(reminders);
    await setMeta('last-reminder-sync-at', response.generatedAt);
  });
}

export async function buildCachedReminderView(): Promise<ReminderViewResponse> {
  const reminders = await clientDb.reminders.toArray();
  const remindersByState = groupReminders(reminders);
  const lastSyncAt = (await getMeta<string>('last-reminder-sync-at')) ?? new Date(0).toISOString();

  return {
    remindersByState,
    generatedAt: lastSyncAt,
    source: 'cache'
  };
}

export async function cacheReminderDetail(detail: ReminderDetailResponse) {
  await clientDb.transaction('rw', clientDb.reminders, clientDb.reminderTimelineCache, async () => {
    await clientDb.reminders.put(detail.reminder);
    await clientDb.reminderTimelineCache.put({ reminderId: detail.reminder.id, timeline: detail.timeline });
  });
}

export async function getCachedReminderDetail(reminderId: string): Promise<ReminderDetailResponse | null> {
  const reminder = await clientDb.reminders.get(reminderId);
  if (!reminder) {
    return null;
  }

  const timeline = (await clientDb.reminderTimelineCache.get(reminderId))?.timeline ?? [];
  return { reminder, timeline };
}

export async function cacheReminder(reminder: Reminder) {
  await clientDb.reminders.put(reminder);
}

export async function getCachedReminder(reminderId: string) {
  return clientDb.reminders.get(reminderId);
}

export async function getCachedReminderTimeline(reminderId: string): Promise<ReminderTimelineEntry[]> {
  return (await clientDb.reminderTimelineCache.get(reminderId))?.timeline ?? [];
}

export async function appendCachedReminderTimelineEntries(reminderId: string, entries: ReminderTimelineEntry[]) {
  if (entries.length === 0) {
    return;
  }

  const existing = await getCachedReminderTimeline(reminderId);
  const merged = new Map(existing.map((entry) => [entry.id, entry]));
  for (const entry of entries) {
    merged.set(entry.id, entry);
  }

  const timeline = [...merged.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  await clientDb.reminderTimelineCache.put({ reminderId, timeline });
}

export async function cacheReminderSettings(response: ReminderSettingsResponse) {
  await clientDb.reminderSettingsCache.put({
    actorRole: response.preferences.actorRole,
    preferences: response.preferences
  });
}

export async function getCachedReminderSettings(actorRole: ActorRole): Promise<ReminderNotificationPreferences | null> {
  return (await clientDb.reminderSettingsCache.get(actorRole))?.preferences ?? null;
}

export async function enqueueCommand(command: OutboxCommand, state: 'pending' | 'conflict' = 'pending', lastError?: string) {
  await clientDb.outbox.put({ ...command, createdAt: new Date().toISOString(), state, lastError });
}

export async function listOutbox() {
  return clientDb.outbox.orderBy('createdAt').toArray();
}

export async function removeOutboxCommand(commandId: string) {
  await clientDb.outbox.delete(commandId);
}

export async function markOutboxConflict(commandId: string, errorMessage: string) {
  const existing = await clientDb.outbox.get(commandId);
  if (!existing) {
    return;
  }
  await clientDb.outbox.put({ ...existing, state: 'conflict', lastError: errorMessage });
}
