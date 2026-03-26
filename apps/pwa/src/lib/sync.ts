import { isEffectivelyOnline } from './connectivity';
import {
  addListItem,
  addMealEntry as addMealEntryDomain,
  applyUpdate,
  archiveList as archiveListDomain,
  archiveMealPlan as archiveMealPlanDomain,
  archiveRoutine as archiveRoutineDomain,
  cancelReminder,
  checkItem,
  completeReminderOccurrence,
  completeRoutineOccurrence as completeRoutineOccurrenceDomain,
  skipRoutineOccurrence as skipRoutineOccurrenceDomain,
  createDraft,
  createInboxItem,
  createMealPlan as createMealPlanDomain,
  createReminder,
  createReminderDraft,
  createRoutine as createRoutineDomain,
  createSharedList,
  pauseRoutine as pauseRoutineDomain,
  restoreList as restoreListDomain,
  restoreMealPlan as restoreMealPlanDomain,
  restoreRoutine as restoreRoutineDomain,
  resumeRoutine as resumeRoutineDomain,
  snoozeReminder,
  uncheckItem,
  updateItemBody,
  updateListTitle as updateListTitleDomain,
  updateMealEntryItems as updateMealEntryItemsDomain,
  updateMealEntryName as updateMealEntryNameDomain,
  updateMealPlanTitle as updateMealPlanTitleDomain,
  updateReminder,
  updateRoutine as updateRoutineDomain,
  getReviewWindowsForOccurrence,
  formatReviewWindowAsDateStrings
} from '@olivia/domain';
import type {
  ActiveListIndexResponse,
  ActiveRoutineIndexResponse,
  ArchivedListIndexResponse,
  ArchivedRoutineIndexResponse,
  DraftItem,
  DraftReminder,
  GenerateGroceryListResponse,
  InboxItem,
  InboxViewResponse,
  ItemDetailResponse,
  ListDetailResponse,
  ListItem,
  MealEntry,
  MealPlan,
  MealPlanDetailResponse,
  MealPlanIndexResponse,
  OutboxCommand,
  AssigneeUserId,
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
  ReviewRecord,
  Routine,
  RoutineDetailResponse,
  RoutineOccurrence,
  RoutineRecurrenceRule,
  SharedList,
  StructuredInput,
  StructuredReminderInput,
  UpdateChange,
  ActivityHistoryResponse,
  CompleteRitualResponse,
  WeeklyViewResponse,
  RitualSummaryResponse,
  Nudge
} from '@olivia/contracts';
import {
  appendCachedReminderTimelineEntries,
  buildCachedReminderView,
  buildCachedView,
  cacheInboxView,
  cacheItem,
  cacheItemDetail,
  cacheListDetail,
  cacheListIndex,
  cacheListItem,
  cacheMealEntry,
  cacheMealPlan,
  cacheMealPlanDetail,
  cacheMealPlanIndex,
  cacheReminder,
  cacheReminderDetail,
  cacheReminderSettings,
  cacheReminderView,
  cacheRoutine,
  cacheRoutineDetail,
  cacheRoutineIndex,
  cacheRoutineOccurrence,
  cacheReviewRecord,
  getCachedReviewRecord,
  cacheSharedList,
  clientDb,
  enqueueCommand,
  getCachedActiveListIndex,
  getCachedActiveRoutineIndex,
  getCachedActiveMealPlanIndex,
  getCachedArchivedListIndex,
  getCachedArchivedRoutineIndex,
  getCachedArchivedMealPlanIndex,
  getCachedItemDetail,
  getCachedListDetail,
  getCachedMealPlanDetail,
  getCachedRoutineDetail,
  getCachedReminder,
  getCachedReminderDetail,
  getFirstCachedReminderSettings,
  getCachedReminderTimeline,
  listOutbox,
  markOutboxConflict,
  removeListFromCache,
  removeListItemFromCache,
  removeMealEntryFromCache,
  removeMealPlanFromCache,
  removeOutboxCommand,
  removeRoutineFromCache,
  setMeta,
  assembleWeeklyViewFromCache,
  assembleActivityHistoryFromCache
} from './client-db';
import {
  ApiError,
  addListItem as addListItemApi,
  addMealEntry as addMealEntryApi,
  archiveList as archiveListApi,
  archiveMealPlan as archiveMealPlanApi,
  archiveRoutine as archiveRoutineApi,
  cancelReminder as cancelReminderApi,
  checkListItem as checkListItemApi,
  completeReminder as completeReminderApi,
  completeRoutineOccurrence as completeRoutineOccurrenceApi,
  confirmCreate,
  confirmCreateReminder,
  confirmUpdate,
  confirmUpdateReminder,
  createList as createListApi,
  createMealPlan as createMealPlanApi,
  createRoutine as createRoutineApi,
  deleteMealEntry as deleteMealEntryApi,
  deleteMealPlan as deleteMealPlanApi,
  deleteList as deleteListApi,
  deleteRoutine as deleteRoutineApi,
  fetchActiveListIndex,
  fetchActiveMealPlanIndex,
  fetchActiveRoutineIndex,
  fetchArchivedListIndex,
  fetchArchivedMealPlanIndex,
  fetchArchivedRoutineIndex,
  fetchInboxView,
  fetchItemDetail,
  fetchListDetail,
  fetchMealPlanDetail,
  fetchReminderDetail,
  fetchReminderSettings,
  fetchReminderView,
  fetchRoutineDetail,
  generateGroceryList as generateGroceryListApi,
  listNotificationSubscriptions,
  pauseRoutine as pauseRoutineApi,
  previewCreate,
  previewCreateReminder,
  previewUpdate,
  previewUpdateReminder,
  clearCompletedItems as clearCompletedItemsApi,
  removeListItem as removeListItemApi,
  uncheckAllItems as uncheckAllItemsApi,
  restoreList as restoreListApi,
  restoreMealPlan as restoreMealPlanApi,
  restoreRoutine as restoreRoutineApi,
  resumeRoutine as resumeRoutineApi,
  saveNotificationSubscription,
  saveNativeNotificationSubscriptionApi,
  saveReminderSettings,
  snoozeReminder as snoozeReminderApi,
  uncheckListItem as uncheckListItemApi,
  updateListItemBody as updateListItemBodyApi,
  updateListTitle as updateListTitleApi,
  updateMealEntry as updateMealEntryApi,
  updateMealPlanTitle as updateMealPlanTitleApi,
  updateRoutine as updateRoutineApi,
  fetchWeeklyView,
  fetchActivityHistory,
  completeRitual as completeRitualApi,
  fetchReviewRecord as fetchReviewRecordApi,
  generateRitualSummary,
  fetchNudgesApi,
  skipRoutineOccurrenceApi
} from './api';
import { showErrorToast } from './error-toast';

const isOffline = () => !window.navigator.onLine || !isEffectivelyOnline();
let inFlightFlush: Promise<void> | null = null;

function defaultReminderSettings():ReminderSettingsResponse {
  return {
    preferences: {
      userId: '',
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

async function persistAndReturnView(view: 'active' | 'all'): Promise<InboxViewResponse> {
  const response = await fetchInboxView();
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

export async function loadInboxView(view: 'active' | 'all'): Promise<InboxViewResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      return await persistAndReturnView(view);
    } catch {
      return buildCachedView(view);
    }
  }
  return buildCachedView(view);
}

export async function loadItemDetail(itemId: string): Promise<ItemDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchItemDetail(itemId);
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

async function persistAndReturnReminderView():Promise<ReminderViewResponse> {
  const response = await fetchReminderView();
  await cacheReminderView(response);
  return response;
}

export async function loadReminderView():Promise<ReminderViewResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      return await persistAndReturnReminderView();
    } catch {
      return buildCachedReminderView();
    }
  }

  return buildCachedReminderView();
}

export async function loadReminderDetail(reminderId: string): Promise<ReminderDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchReminderDetail(reminderId);
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

export async function previewCreateCommand(inputText?: string, structuredInput?: Partial<StructuredInput>): Promise<PreviewCreateResponse> {
  if (!isOffline()) return previewCreate(inputText, structuredInput);
  const parsed = createDraft({ inputText, structuredInput });
  return { draftId: crypto.randomUUID(), parsedItem: parsed.draft, parseConfidence: parsed.parseConfidence, ambiguities: parsed.ambiguities, parserSource: parsed.parserSource, requiresConfirmation: true };
}

export async function confirmCreateCommand(finalItem: DraftItem, draftId?: string): Promise<InboxItem> {
  if (!isOffline()) {
    const response = await confirmCreate(finalItem, draftId);
    await cacheItem(response.savedItem);
    await setMeta('last-sync-at', new Date().toISOString());
    return response.savedItem;
  }
  const { item } = createInboxItem(finalItem);
  const pendingItem = { ...item, pendingSync: true };
  const command: OutboxCommand = { kind: 'create', commandId: crypto.randomUUID(), approved: true, finalItem };
  await cacheItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function previewUpdateCommand(itemId: string, expectedVersion: number, proposedChange: UpdateChange): Promise<PreviewUpdateResponse> {
  if (!isOffline()) return previewUpdate(itemId, expectedVersion, proposedChange);
  const item = await clientDb.items.get(itemId);
  if (!item) throw new Error('Item is not available offline.');
  const { updatedItem } = applyUpdate(item, proposedChange);
  return { draftId: crypto.randomUUID(), currentItem: item, proposedItem: updatedItem, requiresConfirmation: true };
}

export async function confirmUpdateCommand(itemId: string, expectedVersion: number, proposedChange?: UpdateChange, draftId?: string): Promise<InboxItem> {
  if (!isOffline()) {
    const response = await confirmUpdate(itemId, expectedVersion, proposedChange, draftId);
    await cacheItem(response.savedItem);
    await setMeta('last-sync-at', new Date().toISOString());
    return response.savedItem;
  }
  if (!proposedChange) throw new Error('Offline updates must include the proposed change.');
  const item = await clientDb.items.get(itemId);
  if (!item) throw new Error('Item is not available offline.');
  const { updatedItem } = applyUpdate(item, proposedChange);
  const pendingItem = { ...updatedItem, pendingSync: true };
  const command: OutboxCommand = { kind: 'update', commandId: crypto.randomUUID(), approved: true, itemId, expectedVersion, proposedChange };
  await cacheItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function previewCreateReminderCommand(

  inputText?: string,
  structuredInput?: Partial<StructuredReminderInput>
): Promise<PreviewCreateReminderResponse> {
  if (!isOffline()) {
    return previewCreateReminder(inputText, structuredInput);
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

export async function confirmCreateReminderCommand(finalReminder: DraftReminder, draftId?: string): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmCreateReminder(finalReminder, draftId);
    await cacheReminderMutation(response.savedReminder, response.timelineEntry);
    return response.savedReminder;
  }

  const mutation = createReminder(finalReminder);
  const pendingReminder = { ...mutation.reminder, pendingSync: true };
  const command: OutboxCommand = {
    kind: 'reminder_create',
    commandId: crypto.randomUUID(),

    approved: true,
    finalReminder
  };

  await cacheReminder(pendingReminder);
  await appendCachedReminderTimelineEntries(pendingReminder.id, mutation.timelineEntries);
  await enqueueCommand(command);
  return pendingReminder;
}

export async function previewUpdateReminderCommand(

  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<PreviewUpdateReminderResponse> {
  if (!isOffline()) {
    return previewUpdateReminder(reminderId, expectedVersion, proposedChange);
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

  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await confirmUpdateReminder(reminderId, expectedVersion, proposedChange);
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

export async function completeReminderCommand(reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await completeReminderApi(reminderId, expectedVersion);
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

  reminderId: string,
  expectedVersion: number,
  snoozedUntil: string
): Promise<Reminder> {
  if (!isOffline()) {
    const response = await snoozeReminderApi(reminderId, expectedVersion, snoozedUntil);
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

export async function cancelReminderCommand(reminderId: string, expectedVersion: number): Promise<Reminder> {
  if (!isOffline()) {
    const response = await cancelReminderApi(reminderId, expectedVersion);
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
        const response = await confirmCreate(command.finalItem);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'update') {
        const response = await confirmUpdate(command.itemId, command.expectedVersion, command.proposedChange);
        await cacheItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'reminder_create') {
        const response = await confirmCreateReminder(command.finalReminder);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_update') {
        const response = await confirmUpdateReminder(command.reminderId, command.expectedVersion, command.proposedChange);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_complete') {
        const response = await completeReminderApi(command.reminderId, command.expectedVersion);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_snooze') {
        const response = await snoozeReminderApi(command.reminderId, command.expectedVersion, command.snoozedUntil);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'reminder_cancel') {
        const response = await cancelReminderApi(command.reminderId, command.expectedVersion);
        await cacheReminderMutation(response.savedReminder, response.timelineEntry);
      } else if (command.kind === 'list_create') {
        const response = await createListApi(command.title);
        await cacheSharedList({ ...response.savedList, pendingSync: false });
      } else if (command.kind === 'list_title_update') {
        const updateResponse = await updateListTitleApi(command.listId, command.expectedVersion, command.title);
        await cacheSharedList({ ...updateResponse.savedList, pendingSync: false });
      } else if (command.kind === 'list_archive') {
        const response = await archiveListApi(command.listId, command.expectedVersion);
        await cacheSharedList({ ...response.savedList, pendingSync: false });
      } else if (command.kind === 'list_restore') {
        const response = await restoreListApi(command.listId, command.expectedVersion);
        await cacheSharedList({ ...response.savedList, pendingSync: false });
      } else if (command.kind === 'list_delete') {
        await deleteListApi(command.listId);
        await removeListFromCache(command.listId);
      } else if (command.kind === 'item_add') {
        const response = await addListItemApi(command.listId, command.body);
        await cacheListItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'item_body_update') {
        const response = await updateListItemBodyApi(command.listId, command.itemId, command.expectedVersion, command.body);
        await cacheListItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'item_check') {
        const response = await checkListItemApi(command.listId, command.itemId, command.expectedVersion);
        await cacheListItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'item_uncheck') {
        const response = await uncheckListItemApi(command.listId, command.itemId, command.expectedVersion);
        await cacheListItem({ ...response.savedItem, pendingSync: false });
      } else if (command.kind === 'item_remove') {
        await removeListItemApi(command.listId, command.itemId);
        await removeListItemFromCache(command.itemId);
      } else if (command.kind === 'items_clear_completed') {
        await clearCompletedItemsApi(command.listId);
      } else if (command.kind === 'items_uncheck_all') {
        await uncheckAllItemsApi(command.listId);
      } else if (command.kind === 'routine_create') {
        const response = await createRoutineApi(command.title, command.assigneeUserId, command.recurrenceRule, command.firstDueDate, command.intervalDays, command.weekdays, command.intervalWeeks);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_update') {
        const { title, assigneeUserId, recurrenceRule, intervalDays, intervalWeeks, weekdays } = command;
        const response = await updateRoutineApi(command.routineId, command.expectedVersion, { title, assigneeUserId, recurrenceRule, intervalDays, intervalWeeks, weekdays });
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_complete') {
        const response = await completeRoutineOccurrenceApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
        await cacheRoutineOccurrence(response.occurrence);
      } else if (command.kind === 'routine_skip') {
        const response = await skipRoutineOccurrenceApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
        await cacheRoutineOccurrence(response.occurrence);
      } else if (command.kind === 'routine_pause') {
        const response = await pauseRoutineApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_resume') {
        const response = await resumeRoutineApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_archive') {
        const response = await archiveRoutineApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_restore') {
        const response = await restoreRoutineApi(command.routineId, command.expectedVersion);
        await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
      } else if (command.kind === 'routine_delete') {
        await deleteRoutineApi(command.routineId);
        await removeRoutineFromCache(command.routineId);
      } else if (command.kind === 'meal_plan_create') {
        const response = await createMealPlanApi(command.title, command.weekStartDate);
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_plan_title_update') {
        const response = await updateMealPlanTitleApi(command.planId, command.expectedVersion, command.title);
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_plan_archive') {
        const response = await archiveMealPlanApi(command.planId, command.expectedVersion);
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_plan_restore') {
        const response = await restoreMealPlanApi(command.planId, command.expectedVersion);
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_plan_delete') {
        await deleteMealPlanApi(command.planId);
        await removeMealPlanFromCache(command.planId);
      } else if (command.kind === 'meal_entry_add') {
        const response = await addMealEntryApi(command.planId, command.dayOfWeek, command.name);
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_entry_name_update') {
        const response = await updateMealEntryApi(command.planId, command.entryId, command.expectedVersion, { name: command.name });
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_entry_items_update') {
        const response = await updateMealEntryApi(command.planId, command.entryId, command.expectedVersion, { shoppingItems: command.shoppingItems });
        await cacheMealPlanDetail({ ...response, plan: { ...response.plan, pendingSync: false } });
      } else if (command.kind === 'meal_entry_delete') {
        await deleteMealEntryApi(command.planId, command.entryId);
        await removeMealEntryFromCache(command.entryId);
      } else if (command.kind === 'ritual_complete') {
        const response = await completeRitualApi(command.routineId, command.occurrenceId, command.carryForwardNotes, command.recapNarrative, command.overviewNarrative);
        // Fetch canonical review record from server and replace provisional local record
        const canonicalRecord = await fetchReviewRecordApi(response.reviewRecordId);
        // Delete provisional record if it had a different ID (should match but handle edge case)
        if (command.provisionalReviewRecordId !== response.reviewRecordId) {
          await clientDb.reviewRecords.delete(command.provisionalReviewRecordId);
        }
        await cacheReviewRecord({ ...canonicalRecord, pendingSync: false });
        // Refresh routine in cache
        const routineDetail = await fetchRoutineDetail(command.routineId);
        await cacheRoutineDetail(routineDetail);
      } else {
        throw new Error('Unsupported outbox command kind.');
      }
      await removeOutboxCommand(command.commandId);
      await setMeta('last-sync-at', new Date().toISOString());
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 409) {
        const entityName = command.kind.startsWith('reminder_') ? 'reminder' : command.kind.startsWith('list_') || command.kind.startsWith('item_') ? 'list' : command.kind.startsWith('routine_') ? 'routine' : command.kind.startsWith('meal_') ? 'meal plan' : 'item';
        await markOutboxConflict(command.commandId, `Version conflict: refresh this ${entityName} and retry.`);
        showErrorToast(`Sync conflict: this ${entityName} was changed elsewhere. Refresh and retry.`);
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

export async function loadNotificationState() {
  const response = await listNotificationSubscriptions();
  return response.subscriptions;
}

export async function saveDemoNotificationSubscription() {
  await saveNotificationSubscription();
  return loadNotificationState();
}

export async function saveNativeNotificationSubscription(apnsToken: string) {
  await saveNativeNotificationSubscriptionApi(apnsToken);
  return loadNotificationState();
}

export async function loadReminderSettings():Promise<ReminderSettingsResponse> {
  if (!isOffline()) {
    try {
      const response = await fetchReminderSettings();
      await cacheReminderSettings(response);
      return response;
    } catch {
      const cached = await getFirstCachedReminderSettings();
      return cached ? { preferences: cached } : defaultReminderSettings();
    }
  }

  const cached = await getFirstCachedReminderSettings();
  return cached ? { preferences: cached } : defaultReminderSettings();
}

export async function saveReminderSettingsCommand(

  preferences: ReminderNotificationPreferencesInput
): Promise<ReminderSettingsResponse> {
  if (isOffline()) {
    throw new Error('Reminder notification settings require a connection.');
  }

  const response = await saveReminderSettings(preferences);
  await cacheReminderSettings(response);
  return response;
}

// ─── Nudge sync commands ───────────────────────────────────────────────────────

export async function loadNudges():Promise<Nudge[]> {
  if (isOffline()) return [];
  try {
    const response = await fetchNudgesApi();
    return response.nudges;
  } catch {
    return [];
  }
}

export async function submitRoutineSkip(

  routineId: string,
  expectedVersion: number
): Promise<void> {
  if (!isOffline()) {
    const response = await skipRoutineOccurrenceApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    await cacheRoutineOccurrence(response.occurrence);
    return;
  }
  // Offline: optimistic local update + enqueue
  const cached = await getCachedRoutineDetail(routineId);
  if (cached) {
    const { updatedRoutine, occurrence } = skipRoutineOccurrenceDomain(cached.routine, null);
    await cacheRoutine({ ...updatedRoutine, pendingSync: true });
    await cacheRoutineOccurrence(occurrence);
  }
  await enqueueCommand({
    kind: 'routine_skip',
    commandId: crypto.randomUUID(),

    routineId,
    expectedVersion
  });
}

// ─── Shared List sync commands ────────────────────────────────────────────────

export async function loadActiveListIndex():Promise<ActiveListIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchActiveListIndex();
      await cacheListIndex(response);
      return response;
    } catch {
      return getCachedActiveListIndex();
    }
  }
  return getCachedActiveListIndex();
}

export async function loadArchivedListIndex():Promise<ArchivedListIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchArchivedListIndex();
      await cacheListIndex(response);
      return response;
    } catch {
      return getCachedArchivedListIndex();
    }
  }
  return getCachedArchivedListIndex();
}

export async function loadListDetail(listId: string): Promise<ListDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchListDetail(listId);
      await cacheListDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedListDetail(listId);
      if (cached) return cached;
      throw new Error('List not available offline yet.');
    }
  }
  const cached = await getCachedListDetail(listId);
  if (cached) return cached;
  throw new Error('List not available offline yet.');
}

export async function createListCommand(title: string): Promise<SharedList> {
  if (!isOffline()) {
    const response = await createListApi(title);
    await cacheSharedList({ ...response.savedList, pendingSync: false });
    return response.savedList;
  }
  const list = createSharedList(title, null);
  const pendingList = { ...list, pendingSync: true };
  const command: OutboxCommand = { kind: 'list_create', commandId: crypto.randomUUID(), title };
  await cacheSharedList(pendingList);
  await enqueueCommand(command);
  return pendingList;
}

export async function updateListTitleCommand(listId: string, expectedVersion: number, title: string): Promise<SharedList> {
  if (!isOffline()) {
    const response = await updateListTitleApi(listId, expectedVersion, title);
    await cacheSharedList({ ...response.savedList, pendingSync: false });
    return response.savedList;
  }
  const cached = await clientDb.sharedLists.get(listId);
  if (!cached) throw new Error('List not available offline.');
  const updated = updateListTitleDomain(cached, title);
  const pendingList = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'list_title_update', commandId: crypto.randomUUID(), listId, expectedVersion, title };
  await cacheSharedList(pendingList);
  await enqueueCommand(command);
  return pendingList;
}

export async function archiveListCommand(listId: string, expectedVersion: number): Promise<SharedList> {
  if (!isOffline()) {
    const response = await archiveListApi(listId, expectedVersion);
    await cacheSharedList({ ...response.savedList, pendingSync: false });
    return response.savedList;
  }
  const cached = await clientDb.sharedLists.get(listId);
  if (!cached) throw new Error('List not available offline.');
  const archived = archiveListDomain(cached);
  const pendingList = { ...archived, pendingSync: true };
  const command: OutboxCommand = { kind: 'list_archive', commandId: crypto.randomUUID(), listId, expectedVersion, confirmed: true };
  await cacheSharedList(pendingList);
  await enqueueCommand(command);
  return pendingList;
}

export async function restoreListCommand(listId: string, expectedVersion: number): Promise<SharedList> {
  if (!isOffline()) {
    const response = await restoreListApi(listId, expectedVersion);
    await cacheSharedList({ ...response.savedList, pendingSync: false });
    return response.savedList;
  }
  const cached = await clientDb.sharedLists.get(listId);
  if (!cached) throw new Error('List not available offline.');
  const restored = restoreListDomain(cached);
  const pendingList = { ...restored, pendingSync: true };
  const command: OutboxCommand = { kind: 'list_restore', commandId: crypto.randomUUID(), listId, expectedVersion };
  await cacheSharedList(pendingList);
  await enqueueCommand(command);
  return pendingList;
}

export async function deleteListCommand(listId: string): Promise<void> {
  if (!isOffline()) {
    await deleteListApi(listId);
    await removeListFromCache(listId);
    return;
  }
  const command: OutboxCommand = { kind: 'list_delete', commandId: crypto.randomUUID(), listId, confirmed: true };
  await enqueueCommand(command);
  await removeListFromCache(listId);
}

export async function addListItemCommand(listId: string, body: string): Promise<ListItem> {
  if (!isOffline()) {
    const response = await addListItemApi(listId, body);
    await cacheListItem({ ...response.savedItem, pendingSync: false });
    return response.savedItem;
  }
  const existing = await clientDb.listItems.where('listId').equals(listId).toArray();
  const nextPosition = existing.length > 0 ? Math.max(...existing.map((i) => i.position)) + 1 : 1;
  const itemId = crypto.randomUUID();
  const item = addListItem(listId, body, nextPosition);
  const pendingItem = { ...item, id: itemId, pendingSync: true };
  const command: OutboxCommand = { kind: 'item_add', commandId: crypto.randomUUID(), listId, itemId, body };
  await cacheListItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function updateListItemBodyCommand(listId: string, itemId: string, expectedVersion: number, body: string): Promise<ListItem> {
  if (!isOffline()) {
    const response = await updateListItemBodyApi(listId, itemId, expectedVersion, body);
    await cacheListItem({ ...response.savedItem, pendingSync: false });
    return response.savedItem;
  }
  const cached = await clientDb.listItems.get(itemId);
  if (!cached) throw new Error('Item not available offline.');
  const updated = updateItemBody(cached, body);
  const pendingItem = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'item_body_update', commandId: crypto.randomUUID(), listId, itemId, expectedVersion, body };
  await cacheListItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function checkListItemCommand(listId: string, itemId: string, expectedVersion: number): Promise<ListItem> {
  if (!isOffline()) {
    const response = await checkListItemApi(listId, itemId, expectedVersion);
    await cacheListItem({ ...response.savedItem, pendingSync: false });
    return response.savedItem;
  }
  const cached = await clientDb.listItems.get(itemId);
  if (!cached) throw new Error('Item not available offline.');
  const updated = checkItem(cached);
  const pendingItem = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'item_check', commandId: crypto.randomUUID(), listId, itemId, expectedVersion };
  await cacheListItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function uncheckListItemCommand(listId: string, itemId: string, expectedVersion: number): Promise<ListItem> {
  if (!isOffline()) {
    const response = await uncheckListItemApi(listId, itemId, expectedVersion);
    await cacheListItem({ ...response.savedItem, pendingSync: false });
    return response.savedItem;
  }
  const cached = await clientDb.listItems.get(itemId);
  if (!cached) throw new Error('Item not available offline.');
  const updated = uncheckItem(cached);
  const pendingItem = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'item_uncheck', commandId: crypto.randomUUID(), listId, itemId, expectedVersion };
  await cacheListItem(pendingItem);
  await enqueueCommand(command);
  return pendingItem;
}

export async function removeListItemCommand(listId: string, itemId: string): Promise<void> {
  if (!isOffline()) {
    await removeListItemApi(listId, itemId);
    await removeListItemFromCache(itemId);
    return;
  }
  const command: OutboxCommand = { kind: 'item_remove', commandId: crypto.randomUUID(), listId, itemId, confirmed: true };
  await enqueueCommand(command);
  await removeListItemFromCache(itemId);
}

export async function clearCompletedItemsCommand(listId: string): Promise<void> {
  if (!isOffline()) {
    await clearCompletedItemsApi(listId);
    // Remove checked items from local cache
    const cached = await clientDb.listItems.where('listId').equals(listId).toArray();
    const checkedIds = cached.filter((i) => i.checked).map((i) => i.id);
    if (checkedIds.length > 0) await clientDb.listItems.bulkDelete(checkedIds);
    return;
  }
  const command: OutboxCommand = { kind: 'items_clear_completed', commandId: crypto.randomUUID(), listId, confirmed: true };
  await enqueueCommand(command);
  // Optimistic: remove checked items from cache
  const cached = await clientDb.listItems.where('listId').equals(listId).toArray();
  const checkedIds = cached.filter((i) => i.checked).map((i) => i.id);
  if (checkedIds.length > 0) await clientDb.listItems.bulkDelete(checkedIds);
}

export async function uncheckAllItemsCommand(listId: string): Promise<void> {
  if (!isOffline()) {
    await uncheckAllItemsApi(listId);
    // Update checked items in cache to unchecked
    const cached = await clientDb.listItems.where('listId').equals(listId).toArray();
    const checked = cached.filter((i) => i.checked);
    if (checked.length > 0) {
      await clientDb.listItems.bulkPut(checked.map((i) => ({ ...i, checked: false, checkedAt: null })));
    }
    return;
  }
  const command: OutboxCommand = { kind: 'items_uncheck_all', commandId: crypto.randomUUID(), listId, confirmed: true };
  await enqueueCommand(command);
  // Optimistic: uncheck all items in cache
  const cached = await clientDb.listItems.where('listId').equals(listId).toArray();
  const checked = cached.filter((i) => i.checked);
  if (checked.length > 0) {
    await clientDb.listItems.bulkPut(checked.map((i) => ({ ...i, checked: false, checkedAt: null })));
  }
}

// ─── Routine sync commands ────────────────────────────────────────────────────

export async function loadActiveRoutineIndex():Promise<ActiveRoutineIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchActiveRoutineIndex();
      await cacheRoutineIndex(response);
      return response;
    } catch {
      return getCachedActiveRoutineIndex();
    }
  }
  return getCachedActiveRoutineIndex();
}

export async function loadArchivedRoutineIndex():Promise<ArchivedRoutineIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchArchivedRoutineIndex();
      await cacheRoutineIndex(response);
      return response;
    } catch {
      return getCachedArchivedRoutineIndex();
    }
  }
  return getCachedArchivedRoutineIndex();
}

export async function loadRoutineDetail(routineId: string): Promise<RoutineDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchRoutineDetail(routineId);
      await cacheRoutineDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedRoutineDetail(routineId);
      if (cached) return cached;
      throw new Error('Routine not available offline yet.');
    }
  }
  const cached = await getCachedRoutineDetail(routineId);
  if (cached) return cached;
  throw new Error('Routine not available offline yet.');
}

export async function createRoutineCommand(

  title: string,
  assigneeUserId: AssigneeUserId,
  recurrenceRule: RoutineRecurrenceRule,
  firstDueDate: string | null,
  intervalDays?: number | null,
  weekdays?: number[] | null,
  intervalWeeks?: number | null
): Promise<Routine> {
  if (!isOffline()) {
    const response = await createRoutineApi(title, assigneeUserId, recurrenceRule, firstDueDate, intervalDays, weekdays, intervalWeeks);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const routine = createRoutineDomain(title, assigneeUserId, recurrenceRule, firstDueDate, intervalDays, undefined, weekdays, intervalWeeks);
  const pendingRoutine = { ...routine, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_create', commandId: crypto.randomUUID(), title, assigneeUserId, recurrenceRule, firstDueDate, intervalDays, weekdays, intervalWeeks };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function updateRoutineCommand(

  routineId: string,
  expectedVersion: number,
  changes: { title?: string; assigneeUserId?: AssigneeUserId; recurrenceRule?: RoutineRecurrenceRule; intervalDays?: number | null; intervalWeeks?: number | null; weekdays?: number[] | null }
): Promise<Routine> {
  if (!isOffline()) {
    const response = await updateRoutineApi(routineId, expectedVersion, changes);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const updated = updateRoutineDomain(cached, changes);
  const pendingRoutine = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_update', commandId: crypto.randomUUID(), routineId, expectedVersion, ...changes };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function completeRoutineOccurrenceCommand(routineId: string, expectedVersion: number): Promise<{ routine: Routine; occurrence: RoutineOccurrence }> {
  if (!isOffline()) {
    const response = await completeRoutineOccurrenceApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    await cacheRoutineOccurrence(response.occurrence);
    return { routine: response.savedRoutine, occurrence: response.occurrence };
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const { updatedRoutine, occurrence } = completeRoutineOccurrenceDomain(cached, null);
  const pendingRoutine = { ...updatedRoutine, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_complete', commandId: crypto.randomUUID(), routineId, expectedVersion };
  await cacheRoutine(pendingRoutine);
  await cacheRoutineOccurrence(occurrence);
  await enqueueCommand(command);
  return { routine: pendingRoutine, occurrence };
}

export async function pauseRoutineCommand(routineId: string, expectedVersion: number): Promise<Routine> {
  if (!isOffline()) {
    const response = await pauseRoutineApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const paused = pauseRoutineDomain(cached);
  const pendingRoutine = { ...paused, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_pause', commandId: crypto.randomUUID(), routineId, expectedVersion, confirmed: true };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function resumeRoutineCommand(routineId: string, expectedVersion: number): Promise<Routine> {
  if (!isOffline()) {
    const response = await resumeRoutineApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const resumed = resumeRoutineDomain(cached);
  const pendingRoutine = { ...resumed, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_resume', commandId: crypto.randomUUID(), routineId, expectedVersion };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function archiveRoutineCommand(routineId: string, expectedVersion: number): Promise<Routine> {
  if (!isOffline()) {
    const response = await archiveRoutineApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const archived = archiveRoutineDomain(cached);
  const pendingRoutine = { ...archived, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_archive', commandId: crypto.randomUUID(), routineId, expectedVersion, confirmed: true };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function restoreRoutineCommand(routineId: string, expectedVersion: number): Promise<Routine> {
  if (!isOffline()) {
    const response = await restoreRoutineApi(routineId, expectedVersion);
    await cacheRoutine({ ...response.savedRoutine, pendingSync: false });
    return response.savedRoutine;
  }
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');
  const restored = restoreRoutineDomain(cached);
  const pendingRoutine = { ...restored, pendingSync: true };
  const command: OutboxCommand = { kind: 'routine_restore', commandId: crypto.randomUUID(), routineId, expectedVersion };
  await cacheRoutine(pendingRoutine);
  await enqueueCommand(command);
  return pendingRoutine;
}

export async function deleteRoutineCommand(routineId: string): Promise<void> {
  if (!isOffline()) {
    await deleteRoutineApi(routineId);
    await removeRoutineFromCache(routineId);
    return;
  }
  const command: OutboxCommand = { kind: 'routine_delete', commandId: crypto.randomUUID(), routineId, confirmed: true };
  await enqueueCommand(command);
  await removeRoutineFromCache(routineId);
}

// ─── Meal Plan sync commands ──────────────────────────────────────────────────

export async function loadActiveMealPlanIndex():Promise<MealPlanIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchActiveMealPlanIndex();
      await cacheMealPlanIndex(response);
      return response;
    } catch {
      return getCachedActiveMealPlanIndex();
    }
  }
  return getCachedActiveMealPlanIndex();
}

export async function loadArchivedMealPlanIndex():Promise<MealPlanIndexResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const response = await fetchArchivedMealPlanIndex();
      await cacheMealPlanIndex(response);
      return response;
    } catch {
      return getCachedArchivedMealPlanIndex();
    }
  }
  return getCachedArchivedMealPlanIndex();
}

export async function loadMealPlanDetail(planId: string): Promise<MealPlanDetailResponse> {
  if (!isOffline()) {
    try {
      await flushOutbox();
      const detail = await fetchMealPlanDetail(planId);
      await cacheMealPlanDetail(detail);
      return detail;
    } catch {
      const cached = await getCachedMealPlanDetail(planId);
      if (cached) return cached;
      throw new Error('Meal plan not available offline yet.');
    }
  }
  const cached = await getCachedMealPlanDetail(planId);
  if (cached) return cached;
  throw new Error('Meal plan not available offline yet.');
}

export async function createMealPlanCommand(title: string, weekStartDate: string): Promise<MealPlan> {
  if (!isOffline()) {
    const response = await createMealPlanApi(title, weekStartDate);
    await cacheMealPlanDetail(response);
    return response.plan;
  }
  const planId = crypto.randomUUID();
  const plan = createMealPlanDomain(title, weekStartDate);
  const pendingPlan = { ...plan, id: planId, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_plan_create', commandId: crypto.randomUUID(), planId, title, weekStartDate };
  await cacheMealPlan(pendingPlan);
  await enqueueCommand(command);
  return pendingPlan;
}

export async function updateMealPlanTitleCommand(planId: string, expectedVersion: number, title: string): Promise<MealPlan> {
  if (!isOffline()) {
    const response = await updateMealPlanTitleApi(planId, expectedVersion, title);
    await cacheMealPlanDetail(response);
    return response.plan;
  }
  const cached = await clientDb.mealPlans.get(planId);
  if (!cached) throw new Error('Meal plan not available offline.');
  const updated = updateMealPlanTitleDomain(cached, title);
  const pendingPlan = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_plan_title_update', commandId: crypto.randomUUID(), planId, expectedVersion, title };
  await cacheMealPlan(pendingPlan);
  await enqueueCommand(command);
  return pendingPlan;
}

export async function archiveMealPlanCommand(planId: string, expectedVersion: number): Promise<MealPlan> {
  if (!isOffline()) {
    const response = await archiveMealPlanApi(planId, expectedVersion);
    await cacheMealPlanDetail(response);
    return response.plan;
  }
  const cached = await clientDb.mealPlans.get(planId);
  if (!cached) throw new Error('Meal plan not available offline.');
  const archived = archiveMealPlanDomain(cached);
  const pendingPlan = { ...archived, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_plan_archive', commandId: crypto.randomUUID(), planId, expectedVersion, confirmed: true };
  await cacheMealPlan(pendingPlan);
  await enqueueCommand(command);
  return pendingPlan;
}

export async function restoreMealPlanCommand(planId: string, expectedVersion: number): Promise<MealPlan> {
  if (!isOffline()) {
    const response = await restoreMealPlanApi(planId, expectedVersion);
    await cacheMealPlanDetail(response);
    return response.plan;
  }
  const cached = await clientDb.mealPlans.get(planId);
  if (!cached) throw new Error('Meal plan not available offline.');
  const restored = restoreMealPlanDomain(cached);
  const pendingPlan = { ...restored, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_plan_restore', commandId: crypto.randomUUID(), planId, expectedVersion };
  await cacheMealPlan(pendingPlan);
  await enqueueCommand(command);
  return pendingPlan;
}

export async function deleteMealPlanCommand(planId: string): Promise<void> {
  if (!isOffline()) {
    await deleteMealPlanApi(planId);
    await removeMealPlanFromCache(planId);
    return;
  }
  const command: OutboxCommand = { kind: 'meal_plan_delete', commandId: crypto.randomUUID(), planId, confirmed: true };
  await enqueueCommand(command);
  await removeMealPlanFromCache(planId);
}

export async function addMealEntryCommand(planId: string, dayOfWeek: number, name: string): Promise<MealEntry> {
  if (!isOffline()) {
    const response = await addMealEntryApi(planId, dayOfWeek, name);
    await cacheMealPlanDetail(response);
    const entry = response.entries.find((e) => e.name === name && e.dayOfWeek === dayOfWeek);
    return entry ?? response.entries[response.entries.length - 1];
  }
  const existingEntries = await clientDb.mealEntries.where('planId').equals(planId).toArray();
  const sameDay = existingEntries.filter((e) => e.dayOfWeek === dayOfWeek);
  const position = sameDay.length > 0 ? Math.max(...sameDay.map((e) => e.position)) + 1 : 0;
  const entryId = crypto.randomUUID();
  const entry = addMealEntryDomain(planId, dayOfWeek, name, position);
  const pendingEntry = { ...entry, id: entryId, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_entry_add', commandId: crypto.randomUUID(), planId, entryId, dayOfWeek, name };
  await cacheMealEntry(pendingEntry);
  await enqueueCommand(command);
  return pendingEntry;
}

export async function updateMealEntryNameCommand(planId: string, entryId: string, expectedVersion: number, name: string): Promise<MealEntry> {
  if (!isOffline()) {
    const response = await updateMealEntryApi(planId, entryId, expectedVersion, { name });
    await cacheMealPlanDetail(response);
    const entry = response.entries.find((e) => e.id === entryId);
    return entry ?? response.entries[0];
  }
  const cached = await clientDb.mealEntries.get(entryId);
  if (!cached) throw new Error('Meal entry not available offline.');
  const updated = updateMealEntryNameDomain(cached, name);
  const pendingEntry = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_entry_name_update', commandId: crypto.randomUUID(), planId, entryId, expectedVersion, name };
  await cacheMealEntry(pendingEntry);
  await enqueueCommand(command);
  return pendingEntry;
}

export async function updateMealEntryItemsCommand(planId: string, entryId: string, expectedVersion: number, shoppingItems: string[]): Promise<MealEntry> {
  if (!isOffline()) {
    const response = await updateMealEntryApi(planId, entryId, expectedVersion, { shoppingItems });
    await cacheMealPlanDetail(response);
    const entry = response.entries.find((e) => e.id === entryId);
    return entry ?? response.entries[0];
  }
  const cached = await clientDb.mealEntries.get(entryId);
  if (!cached) throw new Error('Meal entry not available offline.');
  const updated = updateMealEntryItemsDomain(cached, shoppingItems);
  const pendingEntry = { ...updated, pendingSync: true };
  const command: OutboxCommand = { kind: 'meal_entry_items_update', commandId: crypto.randomUUID(), planId, entryId, expectedVersion, shoppingItems };
  await cacheMealEntry(pendingEntry);
  await enqueueCommand(command);
  return pendingEntry;
}

export async function deleteMealEntryCommand(planId: string, entryId: string): Promise<void> {
  if (!isOffline()) {
    await deleteMealEntryApi(planId, entryId);
    await removeMealEntryFromCache(entryId);
    return;
  }
  const command: OutboxCommand = { kind: 'meal_entry_delete', commandId: crypto.randomUUID(), planId, entryId, confirmed: true };
  await enqueueCommand(command);
  await removeMealEntryFromCache(entryId);
}

export async function generateGroceryListCommand(planId: string): Promise<GenerateGroceryListResponse> {
  if (isOffline()) {
    throw new Error('Generating a grocery list requires a connection.');
  }
  const response = await generateGroceryListApi(planId);
  await cacheSharedList({ ...response.list, pendingSync: false });
  return response;
}

// ─── Weekly View ──────────────────────────────────────────────────────────────

export async function loadWeeklyView(weekStart: string): Promise<WeeklyViewResponse> {
  if (!isOffline()) {
    try {
      return await fetchWeeklyView(weekStart);
    } catch {
      return assembleWeeklyViewFromCache(weekStart);
    }
  }
  return assembleWeeklyViewFromCache(weekStart);
}

// ─── Activity History ─────────────────────────────────────────────────────────

export async function loadActivityHistory(): Promise<ActivityHistoryResponse> {
  if (!isOffline()) {
    try {
      return await fetchActivityHistory();
    } catch {
      return assembleActivityHistoryFromCache();
    }
  }
  return assembleActivityHistoryFromCache();
}

// ─── Planning Ritual Support ──────────────────────────────────────────────────

/**
 * Loads AI-generated ritual summary drafts.
 * Online-only: AI drafts are transient session state, never cached.
 * Offline or error: returns null drafts (graceful degradation).
 */
export async function loadRitualSummaries(
  routineId: string,
  occurrenceId: string
): Promise<RitualSummaryResponse> {
  if (isOffline()) {
    return { recapDraft: null, overviewDraft: null };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const result = await generateRitualSummary(routineId, occurrenceId, controller.signal);
    clearTimeout(timeout);
    return result;
  } catch {
    clearTimeout(timeout);
    return { recapDraft: null, overviewDraft: null };
  }
}

/**
 * Completes a planning ritual occurrence and saves the review record.
 * Online: calls the server and caches the result.
 * Offline: creates a provisional review record locally, updates the routine,
 *          and enqueues a 'ritual_complete' outbox command.
 */
export async function submitRitualCompletion(

  routineId: string,
  occurrenceId: string,
  expectedVersion: number,
  carryForwardNotes: string | null,
  recapNarrative: string | null = null,
  overviewNarrative: string | null = null
): Promise<CompleteRitualResponse> {
  if (!isOffline()) {
    const response = await completeRitualApi(routineId, occurrenceId, carryForwardNotes, recapNarrative, overviewNarrative);
    // Refresh routine and occurrence in cache
    const routineDetail = await fetchRoutineDetail(routineId);
    await cacheRoutineDetail(routineDetail);
    // Build and cache a provisional review record (server is source of truth, but cache for offline read)
    const now = new Date().toISOString();
    const provisionalRecord: ReviewRecord = {
      id: response.reviewRecordId,
      ritualOccurrenceId: occurrenceId,
      reviewDate: response.reviewDate,
      lastWeekWindowStart: '',  // will be fetched from server on detail view
      lastWeekWindowEnd: '',
      currentWeekWindowStart: '',
      currentWeekWindowEnd: '',
      carryForwardNotes,
      recapNarrative,
      overviewNarrative,
      aiGenerationUsed: !!(recapNarrative || overviewNarrative),
      completedAt: now,
      completedByUserId: null,
      createdAt: now,
      updatedAt: now,
      version: 1,
      pendingSync: false
    };
    await cacheReviewRecord(provisionalRecord);
    return response;
  }

  // Offline: generate provisional IDs and build local state
  const provisionalReviewRecordId = crypto.randomUUID();
  const now = new Date();
  const nowIso = now.toISOString();
  const cached = await clientDb.routines.get(routineId);
  if (!cached) throw new Error('Routine not available offline.');

  // Compute windows from the routine's current due date anchor
  const anchorDate = new Date(cached.currentDueDate!);
  const windows = getReviewWindowsForOccurrence(anchorDate);
  const lastWeek = formatReviewWindowAsDateStrings({ start: windows.lastWeekStart, end: windows.lastWeekEnd });
  const currentWeek = formatReviewWindowAsDateStrings({ start: windows.currentWeekStart, end: windows.currentWeekEnd });
  const reviewDate = now.toISOString().split('T')[0];

  const provisionalRecord: ReviewRecord = {
    id: provisionalReviewRecordId,
    ritualOccurrenceId: occurrenceId,
    reviewDate,
    lastWeekWindowStart: lastWeek.start,
    lastWeekWindowEnd: lastWeek.end,
    currentWeekWindowStart: currentWeek.start,
    currentWeekWindowEnd: currentWeek.end,
    carryForwardNotes,
    recapNarrative,
    overviewNarrative,
    aiGenerationUsed: !!(recapNarrative || overviewNarrative),
    completedAt: nowIso,
    completedByUserId: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    version: 1,
    pendingSync: true
  };

  const { updatedRoutine, occurrence } = completeRoutineOccurrenceDomain(cached, null, now);
  const occurrenceWithReview = { ...occurrence, id: occurrenceId, reviewRecordId: provisionalReviewRecordId };

  await clientDb.transaction('rw', clientDb.routines, clientDb.routineOccurrences, clientDb.reviewRecords, async () => {
    await cacheRoutine({ ...updatedRoutine, pendingSync: true });
    await cacheRoutineOccurrence(occurrenceWithReview);
    await cacheReviewRecord(provisionalRecord);
  });

  const command: OutboxCommand = {
    kind: 'ritual_complete',
    commandId: crypto.randomUUID(),

    routineId,
    occurrenceId,
    provisionalReviewRecordId,
    carryForwardNotes,
    recapNarrative,
    overviewNarrative,
    expectedVersion
  };
  await enqueueCommand(command);

  return {
    reviewRecordId: provisionalReviewRecordId,
    reviewDate,
    nextOccurrenceDueDate: updatedRoutine.currentDueDate!
  };
}

/**
 * Loads a review record by ID.
 * Online: fetches from server, caches locally.
 * Offline: returns from local Dexie cache (may be provisional).
 */
export async function loadReviewRecord(reviewRecordId: string): Promise<ReviewRecord> {
  if (!isOffline()) {
    try {
      const record = await fetchReviewRecordApi(reviewRecordId);
      await cacheReviewRecord({ ...record, pendingSync: false });
      return record;
    } catch {
      // Fall through to cache
    }
  }
  const cached = await getCachedReviewRecord(reviewRecordId);
  if (!cached) throw new Error('Review record not available offline.');
  return cached;
}
