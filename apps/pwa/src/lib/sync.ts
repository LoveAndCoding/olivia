import {
  applyUpdate,
  cancelReminder as cancelReminderLocal,
  completeReminderOccurrence,
  createDraft,
  createInboxItem,
  createReminder,
  createReminderDraft,
  snoozeReminder as snoozeReminderLocal,
  updateReminder as updateReminderLocal
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
  ReminderTimelineEntry,
  ReminderUpdateChange,
  ReminderViewResponse,
  StructuredInput,
  StructuredReminderInput,
  UpdateChange
} from '@olivia/contracts';
import {
  buildCachedReminderView,
  buildCachedView,
  cacheInboxView,
  cacheItem,
  cacheItemDetail,
  cacheReminder,
  cacheReminderDetail,
  cacheReminderSettings,
  cacheReminderView,
  clearCachedReminderTimeline,
  clientDb,
  enqueueCommand,
  getCachedItemDetail,
  getCachedReminderDetail,
  getCachedReminderSettings,
  getCachedReminderTimeline,
  listOutbox,
  markOutboxConflict,
  removeOutboxCommand,
  replaceCachedReminderTimeline,
  setMeta
} from './client-db';
import {
  ApiError,
  cancelReminder,
  completeReminder,
  confirmCreate,
  confirmCreateReminder,
  confirmUpdate,
  confirmUpdateReminder,
  ensureServiceWorkerRegistration,
  fetchInboxView,
  fetchItemDetail,
  fetchPushCapabilities,
  fetchReminderDetail,
  fetchReminderSettings,
  fetchReminderView,
  listNotificationSubscriptions,
  previewCreate,
  previewCreateReminder,
  previewUpdate,
  previewUpdateReminder,
  pushSubscriptionToPayload,
  removeNotificationSubscription,
  saveNotificationSubscription,
  saveReminderSettings,
  snoozeReminder,
  urlBase64ToUint8Array
} from './api';

const isOffline = () => !window.navigator.onLine;
let inFlightFlush: Promise<void> | null = null;

type PushDiagnostics = {
  serviceWorkerSupported: boolean;
  pushSupported: boolean;
  browserSubscriptionEndpoint: string | null;
  notificationPermission: NotificationPermission | 'unsupported';
  notificationsEnabled: boolean;
  vapidPublicKeyConfigured: boolean;
};

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
      if (cached) {
        return cached;
      }
      throw new Error('Reminder not available offline yet.');
    }
  }

  const cached = await getCachedReminderDetail(reminderId);
  if (cached) {
    return cached;
  }
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

export async function confirmCreateReminderCommand(
  role: ActorRole,
  finalReminder: DraftReminder,
  draftId?: string
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmCreateReminder(role, finalReminder, draftId);
    await cacheReminder(response.savedReminder);
    await clearCachedReminderTimeline(response.savedReminder.id);
    await setMeta('last-reminder-sync-at', new Date().toISOString());
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
  await replaceCachedReminderTimeline(pendingReminder.id, sortReminderTimelineDescending(mutation.timelineEntries));
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

  const reminder = await clientDb.reminders.get(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = updateReminderLocal(reminder, proposedChange, new Date(), timeline);
  return {
    draftId: crypto.randomUUID(),
    currentReminder: reminder,
    proposedReminder: mutation.reminder,
    requiresConfirmation: true
  };
}

export async function confirmUpdateReminderCommand(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange,
  draftId?: string
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmUpdateReminder(role, reminderId, expectedVersion, proposedChange, draftId);
    await cacheReminder(response.savedReminder);
    await clearCachedReminderTimeline(response.savedReminder.id);
    await setMeta('last-reminder-sync-at', new Date().toISOString());
    return response.savedReminder;
  }

  const reminder = await clientDb.reminders.get(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = updateReminderLocal(reminder, proposedChange, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_update',
    commandId: crypto.randomUUID(),
    actorRole: role,
    approved: true,
    reminderId,
    expectedVersion,
    proposedChange
  };
  await cacheReminder(pendingReminder);
  await replaceCachedReminderTimeline(reminderId, mergeReminderTimeline(timeline, mutation.timelineEntries));
  await enqueueCommand(command);
  return pendingReminder;
}

export async function completeReminderCommand(role: ActorRole, reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await completeReminder(role, reminderId, expectedVersion);
    await cacheReminder(response.savedReminder);
    await clearCachedReminderTimeline(response.savedReminder.id);
    await setMeta('last-reminder-sync-at', new Date().toISOString());
    return response.savedReminder;
  }

  const reminder = await clientDb.reminders.get(reminderId);
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
    approved: true,
    reminderId,
    expectedVersion
  };
  await cacheReminder(pendingReminder);
  await replaceCachedReminderTimeline(reminderId, mergeReminderTimeline(timeline, mutation.timelineEntries));
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
    const response = await snoozeReminder(role, reminderId, expectedVersion, snoozedUntil);
    await cacheReminder(response.savedReminder);
    await clearCachedReminderTimeline(response.savedReminder.id);
    await setMeta('last-reminder-sync-at', new Date().toISOString());
    return response.savedReminder;
  }

  const reminder = await clientDb.reminders.get(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = snoozeReminderLocal(reminder, snoozedUntil, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_snooze',
    commandId: crypto.randomUUID(),
    actorRole: role,
    approved: true,
    reminderId,
    expectedVersion,
    snoozedUntil
  };
  await cacheReminder(pendingReminder);
  await replaceCachedReminderTimeline(reminderId, mergeReminderTimeline(timeline, mutation.timelineEntries));
  await enqueueCommand(command);
  return pendingReminder;
}

export async function cancelReminderCommand(role: ActorRole, reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await cancelReminder(role, reminderId, expectedVersion);
    await cacheReminder(response.savedReminder);
    await clearCachedReminderTimeline(response.savedReminder.id);
    await setMeta('last-reminder-sync-at', new Date().toISOString());
    return response.savedReminder;
  }

  const reminder = await clientDb.reminders.get(reminderId);
  if (!reminder) {
    throw new Error('Reminder is not available offline.');
  }

  const timeline = await getCachedReminderTimeline(reminderId);
  const mutation = cancelReminderLocal(reminder, new Date(), timeline);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_cancel',
    commandId: crypto.randomUUID(),
    actorRole: role,
    approved: true,
    reminderId,
    expectedVersion
  };
  await cacheReminder(pendingReminder);
  await replaceCachedReminderTimeline(reminderId, mergeReminderTimeline(timeline, mutation.timelineEntries));
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
        await cacheReminder({ ...response.savedReminder, pendingSync: false });
        await clearCachedReminderTimeline(response.savedReminder.id);
      } else if (command.kind === 'reminder_update') {
        const response = await confirmUpdateReminder(command.actorRole, command.reminderId, command.expectedVersion, command.proposedChange);
        await cacheReminder({ ...response.savedReminder, pendingSync: false });
        await clearCachedReminderTimeline(response.savedReminder.id);
      } else if (command.kind === 'reminder_complete') {
        const response = await completeReminder(command.actorRole, command.reminderId, command.expectedVersion);
        await cacheReminder({ ...response.savedReminder, pendingSync: false });
        await clearCachedReminderTimeline(response.savedReminder.id);
      } else if (command.kind === 'reminder_snooze') {
        const response = await snoozeReminder(command.actorRole, command.reminderId, command.expectedVersion, command.snoozedUntil);
        await cacheReminder({ ...response.savedReminder, pendingSync: false });
        await clearCachedReminderTimeline(response.savedReminder.id);
      } else if (command.kind === 'reminder_cancel') {
        const response = await cancelReminder(command.actorRole, command.reminderId, command.expectedVersion);
        await cacheReminder({ ...response.savedReminder, pendingSync: false });
        await clearCachedReminderTimeline(response.savedReminder.id);
      } else {
        throw new Error('Unsupported outbox command kind.');
      }
      await removeOutboxCommand(command.commandId);
      await setMeta('last-sync-at', new Date().toISOString());
      if (command.kind.startsWith('reminder_')) {
        await setMeta('last-reminder-sync-at', new Date().toISOString());
      }
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const message = command.kind.startsWith('reminder_')
          ? 'Version conflict: refresh this reminder and retry.'
          : 'Version conflict: refresh this item and retry.';
        await markOutboxConflict(command.commandId, message);
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

export async function loadReminderSettingsState(role: ActorRole): Promise<ReminderSettingsResponse> {
  if (!isOffline()) {
    try {
      const response = await fetchReminderSettings(role);
      await cacheReminderSettings(response.preferences);
      return response;
    } catch {
      const cached = await getCachedReminderSettings(role);
      if (cached) {
        return { preferences: cached };
      }
      throw new Error('Reminder settings are not available offline yet.');
    }
  }

  const cached = await getCachedReminderSettings(role);
  if (cached) {
    return { preferences: cached };
  }

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

export async function saveReminderSettingsState(
  role: ActorRole,
  preferences: ReminderNotificationPreferencesInput
): Promise<ReminderSettingsResponse> {
  if (isOffline()) {
    throw new Error('Reminder notification settings need a connection before they can be saved.');
  }

  const response = await saveReminderSettings(role, preferences);
  await cacheReminderSettings(response.preferences);
  return response;
}

export async function loadPushDiagnostics(): Promise<PushDiagnostics> {
  const serviceWorkerSupported = 'serviceWorker' in navigator;
  const pushSupported = 'PushManager' in window;
  let browserSubscriptionEndpoint: string | null = null;

  if (serviceWorkerSupported && pushSupported) {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    browserSubscriptionEndpoint = subscription?.endpoint ?? null;
  }

  try {
    const capabilities = await fetchPushCapabilities();
    return {
      serviceWorkerSupported,
      pushSupported,
      browserSubscriptionEndpoint,
      notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
      notificationsEnabled: capabilities.notificationsEnabled,
      vapidPublicKeyConfigured: Boolean(capabilities.vapidPublicKey)
    };
  } catch {
    return {
      serviceWorkerSupported,
      pushSupported,
      browserSubscriptionEndpoint,
      notificationPermission: typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
      notificationsEnabled: false,
      vapidPublicKeyConfigured: false
    };
  }
}

export async function registerPushSubscription(role: ActorRole) {
  if (typeof Notification === 'undefined') {
    throw new Error('Notifications are not supported in this browser.');
  }
  if (!('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser.');
  }

  const capabilities = await fetchPushCapabilities();
  if (!capabilities.notificationsEnabled) {
    throw new Error('Server-side push notifications are disabled.');
  }
  if (!capabilities.vapidPublicKey) {
    throw new Error('The server is missing a VAPID public key.');
  }

  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;
  if (permission !== 'granted') {
    throw new Error('Browser notification permission is required.');
  }

  const registration = await ensureServiceWorkerRegistration();
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(capabilities.vapidPublicKey) as unknown as BufferSource
    });
  }

  await saveNotificationSubscription(role, pushSubscriptionToPayload(subscription));
  return loadNotificationState(role);
}

export async function unsubscribePushSubscription(role: ActorRole) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return loadNotificationState(role);
  }

  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) {
    return loadNotificationState(role);
  }

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  try {
    await removeNotificationSubscription(role, endpoint);
  } catch {
    // If the server delete path is unavailable, keep the browser unsubscribed and continue.
  }
  return loadNotificationState(role);
}

function sortReminderTimelineDescending(timeline: ReminderTimelineEntry[]) {
  return [...timeline].sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
}

function mergeReminderTimeline(existing: ReminderTimelineEntry[], additions: ReminderTimelineEntry[]) {
  const merged = new Map<string, ReminderTimelineEntry>();
  for (const entry of [...existing, ...additions]) {
    merged.set(entry.id, entry);
  }
  return sortReminderTimelineDescending(Array.from(merged.values()));
}
