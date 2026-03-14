import {
  applyUpdate,
  cancelReminder,
  completeReminderOccurrence,
  createDraft,
  createInboxItem,
  createReminder,
  createReminderDraft,
  snoozeReminder,
  updateReminder
} from '@olivia/domain';
import type {
  ActorRole,
  DraftItem,
  DraftReminder,
  InboxItem,
  InboxViewResponse,
  ItemDetailResponse,
  OutboxCommand,
  PreviewCreateReminderResponse,
  PreviewCreateResponse,
  PreviewUpdateReminderResponse,
  PreviewUpdateResponse,
  Reminder,
  ReminderDetailResponse,
  ReminderNotificationPreferencesInput,
  ReminderSettingsResponse,
  ReminderUpdateChange,
  ReminderViewResponse,
  StructuredInput,
  StructuredReminderInput,
  UpdateChange
} from '@olivia/contracts';
import {
  appendCachedReminderTimelineEntries,
  buildCachedReminderView,
  buildCachedView,
  cacheInboxView,
  cacheItem,
  cacheItemDetail,
  cacheReminder,
  cacheReminderDetail,
  cacheReminderSettings,
  cacheReminderView,
  clientDb,
  enqueueCommand,
  getCachedItemDetail,
  getCachedReminder,
  getCachedReminderDetail,
  getCachedReminderSettings,
  getCachedReminderTimeline,
  listOutbox,
  markOutboxConflict,
  removeOutboxCommand,
  setMeta
} from './client-db';
import {
  ApiError,
  cancelReminder as cancelReminderApi,
  completeReminder as completeReminderApi,
  confirmCreate,
  confirmCreateReminder,
  confirmUpdate,
  confirmUpdateReminder,
  fetchInboxView,
  fetchItemDetail,
  fetchReminderDetail,
  fetchReminderSettings,
  fetchReminderView,
  listNotificationSubscriptions,
  previewCreate,
  previewCreateReminder,
  previewUpdate,
  previewUpdateReminder,
  saveNotificationSubscription,
  saveReminderSettings,
  snoozeReminder as snoozeReminderApi
} from './api';

const isOffline = () => !window.navigator.onLine;
let inFlightFlush: Promise<void> | null = null;

function defaultReminderSettings(role: ActorRole): ReminderSettingsResponse {
  return {
    preferences: {
      actorRole: role,
      enabled: false,
      dueRemindersEnabled: false,
      dailySummaryEnabled: false,
      updatedAt: new Date(0).toISOString()
    }
  };
}

async function cacheReminderMutation(reminder: Reminder, timelineEntry?: ReminderDetailResponse['timeline'][number]) {
  await cacheReminder({ ...reminder, pendingSync: false });
  if (timelineEntry) {
    await appendCachedReminderTimelineEntries(reminder.id, [timelineEntry]);
  }
  await setMeta('last-reminder-sync-at', new Date().toISOString());
}

async function persistAndReturnView(role: ActorRole, view: 'active' | 'all'): Promise<InboxViewResponse> {
  const response = await fetchInboxView(role);
  await cacheInboxView(response);
  if (view === 'all') {
    return response;
  }

  return {
    ...response,
    itemsByStatus: {
      ...response.itemsByStatus,
      deferred: [],
      done: []
    },
    source: 'server'
  };
}

export async function loadInboxView(role: ActorRole, view: 'active' | 'all'): Promise<InboxViewResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      return await persistAndReturnView(role, view);
    } catch {
      return buildCachedView(view);
    }
  }
  return buildCachedView(view);
}

export async function loadItemDetail(role: ActorRole, itemId: string): Promise<ItemDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchItemDetail(role, itemId);
      await cacheItemDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedItemDetail(itemId);
      if (cached) return cached;
      throw new Error('Item not available offline yet.');
    }
  }
  const cached = await getCachedItemDetail(itemId);
  if (cached) return cached;
  throw new Error('Item not available offline yet.');
}

async function persistAndReturnReminderView(role: ActorRole): Promise<ReminderViewResponse> {
  const response = await fetchReminderView(role);
  await cacheReminderView(response);
  return response;
}

export async function loadReminderView(role: ActorRole): Promise<ReminderViewResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      return await persistAndReturnReminderView(role);
    } catch {
      return buildCachedReminderView();
    }
  }

  return buildCachedReminderView();
}

export async function loadReminderDetail(role: ActorRole, reminderId: string): Promise<ReminderDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchReminderDetail(role, reminderId);
      await cacheReminderDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedReminderDetail(reminderId);
      if (cached) return cached;
      throw new Error('Reminder not available offline yet.');
    }
  }

  const cached = await getCachedReminderDetail(reminderId);
  if (cached) return cached;
  throw new Error('Reminder not available offline yet.');
}

export async function previewCreateCommand(role: ActorRole, inputText?: string, structuredInput?: Partial<StructuredInput>): Promise<PreviewCreateResponse> {
  if (!isOffline()) return previewCreate(role, inputText, structuredInput);
  const parsed = createDraft({ inputText, structuredInput });
  return { draftId: crypto.randomUUID(), parsedItem: parsed.draft, parseConfidence: parsed.parseConfidence, ambiguities: parsed.ambiguities, parserSource: parsed.parserSource, requiresConfirmation: true };
}

export async function confirmCreateCommand(role: ActorRole, finalItem: DraftItem, draftId?: string): Promise<InboxItem> {
  if (!isOffline()) {
    const response = await confirmCreate(role, finalItem, draftId);
    await cacheItem(response.savedItem);
    await setMeta('last-sync-at', new Date().toISOString());
    return response.savedItem;
  }
  const { item } = createInboxItem(finalItem);
  const pendingItem = { ...item, pendingSync: true };
  const command: OutboxCommand = { kind: 'create', commandId: crypto.randomUUID(), actorRole: role, approved: true, finalItem };
  await cacheItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function previewUpdateCommand(role: ActorRole, itemId: string, expectedVersion: number, proposedChange: UpdateChange): Promise<PreviewUpdateResponse> {
  if (!isOffline()) return previewUpdate(role, itemId, expectedVersion, proposedChange);
  const item = await clientDb.items.get(itemId);
  if (!item) throw new Error('Item is not available offline.');
  const { updatedItem } = applyUpdate(item, proposedChange);
  return { draftId: crypto.randomUUID(), currentItem: item, proposedItem: updatedItem, requiresConfirmation: true };
}

export async function confirmUpdateCommand(role: ActorRole, itemId: string, expectedVersion: number, proposedChange?: UpdateChange, draftId?: string): Promise<InboxItem> {
  if (!isOffline()) {
    const response = await confirmUpdate(role, itemId, expectedVersion, proposedChange, draftId);
    await cacheItem(response.savedItem);
    await setMeta('last-sync-at', new Date().toISOString());
    return response.savedItem;
  }
  if (!proposedChange) throw new Error('Offline updates must include the proposed change.');
  const item = await clientDb.items.get(itemId);
  if (!item) throw new Error('Item is not available offline.');
  const { updatedItem } = applyUpdate(item, proposedChange);
  const pendingItem = { ...updatedItem, pendingSync: true };
  const command: OutboxCommand = { kind: 'update', commandId: crypto.randomUUID(), actorRole: role, approved: true, itemId, expectedVersion, proposedChange };
  await cacheItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function previewCreateReminderCommand(
  role: ActorRole,
  inputText?: string,
  structuredInput?: Partial<StructuredReminderInput>
): Promise<PreviewCreateReminderResponse> {
  if (!isOffline()) {
    return previewCreateReminder(role, inputText, structuredInput);
  }

  const parsed = createReminderDraft({ inputText, structuredInput });
  return {
    draftId: crypto.randomUUID(),
    parsedReminder: parsed.draft,
    parseConfidence: parsed.parseConfidence,
    ambiguities: parsed.ambiguities,
    parserSource: parsed.parserSource,
    requiresConfirmation: true
  };
}

export async function confirmCreateReminderCommand(role: ActorRole, finalReminder: DraftReminder, draftId?: string): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmCreateReminder(role, finalReminder, draftId);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const mutation = createReminder(finalReminder);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_create',
    commandId: crypto.randomUUID(),
    actorRole: role,
    approved: true,
    finalReminder
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(pendingReminder.id, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

export async function previewUpdateReminderCommand(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<PreviewUpdateReminderResponse> {
  if (!isOffline()) {
    return previewUpdateReminder(role, reminderId, expectedVersion, proposedChange);
  }

  const reminder = await getCachedReminder(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const { reminder: proposedReminder } = updateReminder(reminder, proposedChange, new Date(), timeline);
  return {
    draftId: crypto.randomUUID(),
    currentReminder: reminder,
    proposedReminder,
    requiresConfirmation: true
  };
}

export async function confirmUpdateReminderCommand(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmUpdateReminder(role, reminderId, expectedVersion, proposedChange);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const reminder = await getCachedReminder(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = updateReminder(reminder, proposedChange, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_update',
    commandId: crypto.randomUUID(),
    actorRole: role,
    reminderId,
    expectedVersion,
    approved: true,
    proposedChange
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(reminderId, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

export async function completeReminderCommand(role: ActorRole, reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await completeReminderApi(role, reminderId, expectedVersion);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const reminder = await getCachedReminder(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = completeReminderOccurrence(reminder, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_complete',
    commandId: crypto.randomUUID(),
    actorRole: role,
    reminderId,
    expectedVersion,
    approved: true
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(reminderId, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

export async function snoozeReminderCommand(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  snoozedUntil: string
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await snoozeReminderApi(role, reminderId, expectedVersion, snoozedUntil);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const reminder = await getCachedReminder(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = snoozeReminder(reminder, snoozedUntil, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_snooze',
    commandId: crypto.randomUUID(),
    actorRole: role,
    reminderId,
    expectedVersion,
    approved: true,
    snoozedUntil
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(reminderId, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

export async function cancelReminderCommand(role: ActorRole, reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await cancelReminderApi(role, reminderId, expectedVersion);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const reminder = await getCachedReminder(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = cancelReminder(reminder, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_cancel',
    commandId: crypto.randomUUID(),
    actorRole: role,
    reminderId,
    expectedVersion,
    approved: true
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(reminderId, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

async function flushOutboxOnce() {
  const commands = await listOutbox();
  for (const command of commands) {
    try {
      if (command.kind === 'create') {
        const response = await confirmCreate(command.actorRole, command.finalItem);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'update') {
        const response = await confirmUpdate(command.actorRole, command.itemId, command.expectedVersion, command.proposedChange);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'reminder_create') {
        const response = await confirmCreateReminder(command.actorRole, command.finalReminder);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_update') {
        const response = await confirmUpdateReminder(command.actorRole, command.reminderId, command.expectedVersion, command.proposedChange);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_complete') {
        const response = await completeReminderApi(command.actorRole, command.reminderId, command.expectedVersion);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_snooze') {
        const response = await snoozeReminderApi(command.actorRole, command.reminderId, command.expectedVersion, command.snoozedUntil);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_cancel') {
        const response = await cancelReminderApi(command.actorRole, command.reminderId, command.expectedVersion);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else {
        throw new Error('Unsupported outbox command kind.');
      }
      await removeOutboxCommand(command.commandId);
      await setMeta('last-sync-at', new Date().toISOString());
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const entityName = command.kind.startsWith('reminder_') ? 'reminder' : 'item';
        await markOutboxConflict(command.commandId, `Version conflict: refresh this ${entityName} and retry.`);
      }
      throw error;
    }
  }
}

export async function flushOutbox() {
  if (isOffline()) return;
  if (!inFlightFlush) {
    // React StrictMode and route reloads can trigger multiple sync attempts at once.
    inFlightFlush = flushOutboxOnce().finally(() => {
      inFlightFlush = null;
    });
  }
  return inFlightFlush;
}

export async function loadNotificationState(role: ActorRole) {
  const response = await listNotificationSubscriptions(role);
  return response.subscriptions;
}

export async function saveDemoNotificationSubscription(role: ActorRole) {
  await saveNotificationSubscription(role);
  return loadNotificationState(role);
}

export async function loadReminderSettings(role: ActorRole): Promise<ReminderSettingsResponse> {
  if (!isOffline()) {
    try {
      const response = await fetchReminderSettings(role);
      await cacheReminderSettings(response);
      return response;
    } catch {
      const cached = await getCachedReminderSettings(role);
      return cached ? { preferences: cached } : defaultReminderSettings(role);
    }
  }

  const cached = await getCachedReminderSettings(role);
  return cached ? { preferences: cached } : defaultReminderSettings(role);
}

export async function saveReminderSettingsCommand(
  role: ActorRole,
  preferences: ReminderNotificationPreferencesInput
): Promise<ReminderSettingsResponse> {
  if (isOffline()) {
    throw new Error('Reminder notification settings require a connection.');
  }

  const response = await saveReminderSettings(role, preferences);
  await cacheReminderSettings(response);
  return response;
}
