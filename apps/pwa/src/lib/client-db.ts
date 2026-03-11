import Dexie, { type Table } from 'dexie';
import { buildSuggestions, groupItems } from '@olivia/domain';
import type { HistoryEntry, InboxItem, InboxViewResponse, ItemDetailResponse, OutboxCommand } from '@olivia/contracts';

type MetaRecord = { key: string; value: string };

type StoredOutboxCommand = OutboxCommand & {
  createdAt: string;
  state: 'pending' | 'conflict';
  lastError?: string;
};

class OliviaClientDb extends Dexie {
  items!: Table<InboxItem, string>;
  historyCache!: Table<{ itemId: string; history: HistoryEntry[] }, string>;
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
