import Dexie, { type Table } from 'dexie';
import { addDays, format, isSameDay, isToday, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { buildSuggestions, groupItems, groupReminders, getRoutineOccurrenceDatesForWeek, getRoutineOccurrenceStatusForDate, getActivityHistoryWindow, groupActivityHistoryByDay } from '@olivia/domain';
import type {
  ActiveListIndexResponse,
  ActiveRoutineIndexResponse,
  ActorRole,
  ArchivedListIndexResponse,
  ArchivedRoutineIndexResponse,
  HistoryEntry,
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
  Reminder,
  ReminderDetailResponse,
  ReminderNotificationPreferences,
  ReminderSettingsResponse,
  ReminderTimelineEntry,
  ReminderViewResponse,
  ReviewRecord,
  Routine,
  RoutineDetailResponse,
  RoutineOccurrence,
  ActivityHistoryItem,
  ActivityHistoryResponse,
  SharedList,
  WeeklyViewResponse
} from '@olivia/contracts';

type MetaRecord = { key: string; value: string };

type NudgeDismissal = {
  entityId: string;
  dismissedAt: string; // ISO date string — used for daily reset
};

type StoredOutboxCommand = OutboxCommand & {
  createdAt: string;
  state: 'pending' | 'conflict';
  lastError?: string;
};

type FreshnessThrottle = {
  date: string; // YYYY-MM-DD
  shownEntityIds: string[];
};

type HealthCheckProgress = {
  id: string; // 'current'
  reviewedItemIds: string[];
  startedAt: string;
  totalItems?: number;
};

class OliviaClientDb extends Dexie {
  items!: Table<InboxItem, string>;
  historyCache!: Table<{ itemId: string; history: HistoryEntry[] }, string>;
  reminders!: Table<Reminder, string>;
  reminderTimelineCache!: Table<{ reminderId: string; timeline: ReminderTimelineEntry[] }, string>;
  reminderSettingsCache!: Table<{ actorRole: ActorRole; preferences: ReminderNotificationPreferences }, ActorRole>;
  sharedLists!: Table<SharedList, string>;
  listItems!: Table<ListItem, string>;
  routines!: Table<Routine, string>;
  routineOccurrences!: Table<RoutineOccurrence, string>;
  mealPlans!: Table<MealPlan, string>;
  mealEntries!: Table<MealEntry, string>;
  reviewRecords!: Table<ReviewRecord, string>;
  nudgeDismissals!: Table<NudgeDismissal, string>;
  freshnessThrottle!: Table<FreshnessThrottle, string>;
  healthCheckProgress!: Table<HealthCheckProgress, string>;
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
    this.version(3).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(4).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      routines: 'id, status, owner, currentDueDate, updatedAt, pendingSync',
      routineOccurrences: 'id, routineId, dueDate',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(5).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      routines: 'id, status, owner, currentDueDate, updatedAt, pendingSync',
      routineOccurrences: 'id, routineId, dueDate',
      mealPlans: 'id, status, weekStartDate, updatedAt, pendingSync',
      mealEntries: 'id, planId, dayOfWeek, position',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(6).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      routines: 'id, status, owner, currentDueDate, updatedAt, pendingSync',
      routineOccurrences: 'id, routineId, dueDate',
      mealPlans: 'id, status, weekStartDate, updatedAt, pendingSync',
      mealEntries: 'id, planId, dayOfWeek, position',
      reviewRecords: 'id, ritualOccurrenceId, reviewDate, completedAt, pendingSync',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(7).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      routines: 'id, status, owner, currentDueDate, updatedAt, pendingSync',
      routineOccurrences: 'id, routineId, dueDate',
      mealPlans: 'id, status, weekStartDate, updatedAt, pendingSync',
      mealEntries: 'id, planId, dayOfWeek, position',
      reviewRecords: 'id, ritualOccurrenceId, reviewDate, completedAt, pendingSync',
      nudgeDismissals: 'entityId, dismissedAt',
      outbox: 'commandId, kind, state, createdAt',
      meta: 'key'
    });
    this.version(8).stores({
      items: 'id, status, owner, updatedAt, pendingSync',
      historyCache: 'itemId',
      reminders: 'id, state, owner, scheduledAt, updatedAt, pendingSync',
      reminderTimelineCache: 'reminderId',
      reminderSettingsCache: 'actorRole',
      sharedLists: 'id, status, updatedAt, pendingSync',
      listItems: 'id, listId, position, pendingSync',
      routines: 'id, status, owner, currentDueDate, updatedAt, pendingSync',
      routineOccurrences: 'id, routineId, dueDate',
      mealPlans: 'id, status, weekStartDate, updatedAt, pendingSync',
      mealEntries: 'id, planId, dayOfWeek, position',
      reviewRecords: 'id, ritualOccurrenceId, reviewDate, completedAt, pendingSync',
      nudgeDismissals: 'entityId, dismissedAt',
      freshnessThrottle: 'date',
      healthCheckProgress: 'id',
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

// ─── Shared List cache helpers ────────────────────────────────────────────────

export async function cacheListIndex(response: ActiveListIndexResponse | ArchivedListIndexResponse) {
  await clientDb.sharedLists.bulkPut(response.lists);
}

export async function cacheListDetail(response: ListDetailResponse) {
  await clientDb.transaction('rw', clientDb.sharedLists, clientDb.listItems, async () => {
    await clientDb.sharedLists.put(response.list);
    await clientDb.listItems.bulkPut(response.items);
  });
}

export async function getCachedActiveListIndex(): Promise<ActiveListIndexResponse> {
  const lists = await clientDb.sharedLists.where('status').equals('active').sortBy('updatedAt');
  return { lists: lists.reverse(), source: 'cache' };
}

export async function getCachedArchivedListIndex(): Promise<ArchivedListIndexResponse> {
  const lists = await clientDb.sharedLists.where('status').equals('archived').sortBy('updatedAt');
  return { lists: lists.reverse(), source: 'cache' };
}

export async function getCachedListDetail(listId: string): Promise<ListDetailResponse | null> {
  const list = await clientDb.sharedLists.get(listId);
  if (!list) {
    return null;
  }
  const items = await clientDb.listItems.where('listId').equals(listId).sortBy('position');
  return { list, items, source: 'cache' };
}

export async function cacheListItem(item: ListItem) {
  await clientDb.listItems.put(item);
}

export async function cacheSharedList(list: SharedList) {
  await clientDb.sharedLists.put(list);
}

export async function removeListFromCache(listId: string) {
  await clientDb.transaction('rw', clientDb.sharedLists, clientDb.listItems, async () => {
    await clientDb.sharedLists.delete(listId);
    await clientDb.listItems.where('listId').equals(listId).delete();
  });
}

export async function removeListItemFromCache(itemId: string) {
  await clientDb.listItems.delete(itemId);
}

// ─── Routine cache helpers ────────────────────────────────────────────────────

export async function cacheRoutineIndex(response: ActiveRoutineIndexResponse | ArchivedRoutineIndexResponse) {
  await clientDb.routines.bulkPut(response.routines);
}

export async function cacheRoutineDetail(response: RoutineDetailResponse) {
  await clientDb.transaction('rw', clientDb.routines, clientDb.routineOccurrences, async () => {
    await clientDb.routines.put(response.routine);
    await clientDb.routineOccurrences.bulkPut(response.occurrences);
  });
}

export async function getCachedActiveRoutineIndex(): Promise<ActiveRoutineIndexResponse> {
  const routines = await clientDb.routines.where('status').anyOf(['active', 'paused']).sortBy('currentDueDate');
  return { routines, source: 'cache' };
}

export async function getCachedArchivedRoutineIndex(): Promise<ArchivedRoutineIndexResponse> {
  const routines = await clientDb.routines.where('status').equals('archived').sortBy('updatedAt');
  return { routines: routines.reverse(), source: 'cache' };
}

export async function getCachedRoutineDetail(routineId: string): Promise<RoutineDetailResponse | null> {
  const routine = await clientDb.routines.get(routineId);
  if (!routine) {
    return null;
  }
  const occurrences = await clientDb.routineOccurrences.where('routineId').equals(routineId).sortBy('dueDate');
  return { routine, occurrences, source: 'cache' };
}

export async function cacheRoutine(routine: Routine) {
  await clientDb.routines.put(routine);
}

export async function cacheRoutineOccurrence(occurrence: RoutineOccurrence) {
  await clientDb.routineOccurrences.put(occurrence);
}

export async function removeRoutineFromCache(routineId: string) {
  await clientDb.transaction('rw', clientDb.routines, clientDb.routineOccurrences, async () => {
    await clientDb.routines.delete(routineId);
    await clientDb.routineOccurrences.where('routineId').equals(routineId).delete();
  });
}

// ─── Meal Plan cache helpers ──────────────────────────────────────────────────

export async function cacheMealPlanIndex(response: MealPlanIndexResponse) {
  await clientDb.mealPlans.bulkPut(response.plans);
}

export async function cacheMealPlanDetail(response: MealPlanDetailResponse) {
  await clientDb.transaction('rw', clientDb.mealPlans, clientDb.mealEntries, async () => {
    await clientDb.mealPlans.put(response.plan);
    await clientDb.mealEntries.where('planId').equals(response.plan.id).delete();
    await clientDb.mealEntries.bulkPut(response.entries);
  });
}

export async function getCachedActiveMealPlanIndex(): Promise<MealPlanIndexResponse> {
  const plans = await clientDb.mealPlans.where('status').equals('active').sortBy('updatedAt');
  const reversed = plans.reverse();
  return { plans: reversed, totalCount: reversed.length };
}

export async function getCachedArchivedMealPlanIndex(): Promise<MealPlanIndexResponse> {
  const plans = await clientDb.mealPlans.where('status').equals('archived').sortBy('updatedAt');
  const reversed = plans.reverse();
  return { plans: reversed, totalCount: reversed.length };
}

export async function getCachedMealPlanDetail(planId: string): Promise<MealPlanDetailResponse | null> {
  const plan = await clientDb.mealPlans.get(planId);
  if (!plan) return null;
  const entries = await clientDb.mealEntries.where('planId').equals(planId).sortBy('dayOfWeek');
  return { plan, entries };
}

export async function cacheMealPlan(plan: MealPlan) {
  await clientDb.mealPlans.put(plan);
}

export async function cacheMealEntry(entry: MealEntry) {
  await clientDb.mealEntries.put(entry);
}

export async function removeMealPlanFromCache(planId: string) {
  await clientDb.transaction('rw', clientDb.mealPlans, clientDb.mealEntries, async () => {
    await clientDb.mealPlans.delete(planId);
    await clientDb.mealEntries.where('planId').equals(planId).delete();
  });
}

export async function removeMealEntryFromCache(entryId: string) {
  await clientDb.mealEntries.delete(entryId);
}

// ─── Weekly View offline assembly ─────────────────────────────────────────────

export async function assembleWeeklyViewFromCache(weekStartStr: string): Promise<WeeklyViewResponse> {
  const weekStart = startOfWeek(parseISO(weekStartStr), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekStartDate = format(weekStart, 'yyyy-MM-dd');
  const weekEndDate = format(weekEnd, 'yyyy-MM-dd');

  const [reminders, routines, routineOccurrences, mealPlans, mealEntries, inboxItems] = await Promise.all([
    clientDb.reminders.toArray(),
    clientDb.routines.toArray(),
    clientDb.routineOccurrences.toArray(),
    clientDb.mealPlans.toArray(),
    clientDb.mealEntries.toArray(),
    clientDb.items.toArray()
  ]);

  const weekReminders = reminders.filter((r) => {
    const d = r.scheduledAt;
    return d >= weekStartDate && d <= weekEnd.toISOString();
  });

  const activePlan = mealPlans.find((p) => p.status === 'active' && p.weekStartDate === weekStartDate) ?? null;
  const weekMealEntries = activePlan ? mealEntries.filter((e) => e.planId === activePlan.id) : [];

  const weekInboxItems = inboxItems.filter((item) => {
    if (!item.dueAt) return false;
    return item.dueAt >= weekStart.toISOString() && item.dueAt <= weekEnd.toISOString();
  });

  const now = new Date();
  const activeRoutines = routines.filter((r) => r.status === 'active');

  const days = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const dayDate = format(day, 'yyyy-MM-dd');

    const dayReminders = weekReminders
      .filter((r) => isSameDay(parseISO(r.scheduledAt), day))
      .map((r) => ({
        reminderId: r.id,
        title: r.title,
        owner: r.owner,
        scheduledAt: r.scheduledAt,
        dueState: r.state
      }));

    const dayRoutines = activeRoutines.flatMap((routine) => {
      const occurrenceDates = getRoutineOccurrenceDatesForWeek(routine, weekStart, weekEnd);
      const matchDate = occurrenceDates.find((d) => isSameDay(d, day));
      if (!matchDate) return [];
      const relevantOccurrences = routineOccurrences.filter((o) => o.routineId === routine.id);
      const dueState = getRoutineOccurrenceStatusForDate(routine, relevantOccurrences, matchDate, now);
      return [{
        routineId: routine.id,
        routineTitle: routine.title,
        owner: routine.owner,
        recurrenceRule: routine.recurrenceRule,
        intervalDays: routine.intervalDays,
        intervalWeeks: routine.intervalWeeks ?? null,
        weekdays: routine.weekdays ?? null,
        dueDate: dayDate,
        dueState,
        completed: dueState === 'completed'
      }];
    });

    const dayMeals = weekMealEntries
      .filter((e) => e.dayOfWeek === i)
      .map((e) => ({
        entryId: e.id,
        planId: e.planId,
        planTitle: activePlan?.title ?? '',
        name: e.name,
        dayOfWeek: e.dayOfWeek,
        weekStartDate: weekStartDate
      }));

    const dayInboxItems = weekInboxItems
      .filter((item) => item.dueAt && isSameDay(parseISO(item.dueAt), day))
      .map((item) => ({
        itemId: item.id,
        title: item.title,
        owner: item.owner,
        dueAt: item.dueAt!,
        status: item.status
      }));

    return {
      date: dayDate,
      dayOfWeek: i,
      routines: dayRoutines,
      reminders: dayReminders,
      meals: dayMeals,
      inboxItems: dayInboxItems
    };
  });

  return { weekStart: weekStartDate, weekEnd: weekEndDate, days };
}

// ─── Activity History offline assembly ────────────────────────────────────────

export async function assembleActivityHistoryFromCache(): Promise<ActivityHistoryResponse> {
  const now = new Date();
  const { windowStart, windowEnd } = getActivityHistoryWindow(now);
  const windowStartStr = format(windowStart, 'yyyy-MM-dd');
  const windowEndStr = format(windowEnd, 'yyyy-MM-dd');

  const [routineOccurrences, routines, reminders, mealPlans, mealEntries, inboxItems, listItems, sharedLists] =
    await Promise.all([
      clientDb.routineOccurrences.toArray(),
      clientDb.routines.toArray(),
      clientDb.reminders.toArray(),
      clientDb.mealPlans.toArray(),
      clientDb.mealEntries.toArray(),
      clientDb.items.toArray(),
      clientDb.listItems.toArray(),
      clientDb.sharedLists.toArray()
    ]);

  const items: ActivityHistoryItem[] = [];

  // Completed routine occurrences
  const routineMap = new Map(routines.map((r) => [r.id, r]));
  for (const occ of routineOccurrences) {
    if (!occ.completedAt) continue;
    const dateStr = occ.dueDate;
    if (dateStr < windowStartStr || dateStr > windowEndStr) continue;
    const routine = routineMap.get(occ.routineId);
    if (!routine || routine.status === 'archived') continue;
    items.push({
      type: 'routine',
      routineId: routine.id,
      routineTitle: routine.title,
      owner: routine.owner,
      dueDate: occ.dueDate,
      completedAt: occ.completedAt
    });
  }

  // Resolved reminders (completed or cancelled)
  for (const r of reminders) {
    if (r.state === 'completed' && r.completedAt) {
      const dateStr = r.completedAt.split('T')[0];
      if (dateStr >= windowStartStr && dateStr <= windowEndStr) {
        items.push({
          type: 'reminder',
          reminderId: r.id,
          title: r.title,
          owner: r.owner,
          resolvedAt: r.completedAt,
          resolution: 'completed'
        });
      }
    } else if (r.state === 'cancelled' && r.cancelledAt) {
      const dateStr = r.cancelledAt.split('T')[0];
      if (dateStr >= windowStartStr && dateStr <= windowEndStr) {
        items.push({
          type: 'reminder',
          reminderId: r.id,
          title: r.title,
          owner: r.owner,
          resolvedAt: r.cancelledAt,
          resolution: 'dismissed'
        });
      }
    }
  }

  // Past meal plan entries
  const currentMonday = startOfWeek(now, { weekStartsOn: 1 });
  const currentMondayStr = format(currentMonday, 'yyyy-MM-dd');
  const pastPlans = mealPlans.filter((p) => p.status !== 'archived' && p.weekStartDate < currentMondayStr);
  for (const plan of pastPlans) {
    const planEntries = mealEntries.filter((e) => e.planId === plan.id);
    for (const entry of planEntries) {
      const entryDate = addDays(parseISO(plan.weekStartDate), entry.dayOfWeek);
      const entryDateStr = format(entryDate, 'yyyy-MM-dd');
      if (entryDateStr < windowStartStr || entryDateStr > windowEndStr) continue;
      items.push({
        type: 'meal',
        entryId: entry.id,
        planId: plan.id,
        planTitle: plan.title,
        name: entry.name,
        dayOfWeek: entry.dayOfWeek,
        date: entryDateStr
      });
    }
  }

  // Done inbox items
  for (const item of inboxItems) {
    if (item.status !== 'done' || !item.lastStatusChangedAt) continue;
    const dateStr = item.lastStatusChangedAt.split('T')[0];
    if (dateStr < windowStartStr || dateStr > windowEndStr) continue;
    items.push({
      type: 'inbox',
      itemId: item.id,
      title: item.title,
      owner: item.owner,
      completedAt: item.lastStatusChangedAt
    });
  }

  // Checked list items
  const listMap = new Map(sharedLists.map((l) => [l.id, l]));
  for (const li of listItems) {
    if (!li.checked || !li.checkedAt) continue;
    const dateStr = li.checkedAt.split('T')[0];
    if (dateStr < windowStartStr || dateStr > windowEndStr) continue;
    const list = listMap.get(li.listId);
    if (!list) continue;
    items.push({
      type: 'listItem',
      itemId: li.id,
      body: li.body,
      listId: li.listId,
      listName: list.title,
      checkedAt: li.checkedAt
    });
  }

  const days = groupActivityHistoryByDay(items);
  return { windowStart: windowStartStr, windowEnd: windowEndStr, days };
}

// ─── Review Record cache helpers ──────────────────────────────────────────────

export async function cacheReviewRecord(record: ReviewRecord): Promise<void> {
  await clientDb.reviewRecords.put(record);
}

export async function getCachedReviewRecord(reviewRecordId: string): Promise<ReviewRecord | null> {
  const record = await clientDb.reviewRecords.get(reviewRecordId);
  return record ?? null;
}

// ─── Nudge Dismissal helpers ──────────────────────────────────────────────────

export async function dismissNudge(entityId: string): Promise<void> {
  await clientDb.nudgeDismissals.put({ entityId, dismissedAt: new Date().toISOString() });
}

export async function isDismissedToday(entityId: string): Promise<boolean> {
  const record = await clientDb.nudgeDismissals.get(entityId);
  if (!record) return false;
  return isToday(parseISO(record.dismissedAt));
}

export async function filterDismissed<T extends { entityId: string }>(nudges: T[]): Promise<T[]> {
  const results: T[] = [];
  for (const nudge of nudges) {
    if (!(await isDismissedToday(nudge.entityId))) {
      results.push(nudge);
    }
  }
  return results;
}

export async function pruneStaleNudgeDismissals(): Promise<void> {
  const all = await clientDb.nudgeDismissals.toArray();
  const stale = all.filter((r) => !isToday(parseISO(r.dismissedAt)));
  await clientDb.nudgeDismissals.bulkDelete(stale.map((r) => r.entityId));
}

// ─── Freshness Nudge Throttle helpers ─────────────────────────────────────────

export async function getFreshnessThrottleToday(): Promise<FreshnessThrottle | null> {
  const today = format(new Date(), 'yyyy-MM-dd');
  return (await clientDb.freshnessThrottle.get(today)) ?? null;
}

export async function recordFreshnessNudgeShown(entityId: string): Promise<void> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const existing = await clientDb.freshnessThrottle.get(today);
  if (existing) {
    if (!existing.shownEntityIds.includes(entityId)) {
      await clientDb.freshnessThrottle.put({ ...existing, shownEntityIds: [...existing.shownEntityIds, entityId] });
    }
  } else {
    await clientDb.freshnessThrottle.put({ date: today, shownEntityIds: [entityId] });
  }
}

export async function filterFreshnessNudgesByThrottle<T extends { entityId: string }>(nudges: T[], maxPerDay: number): Promise<T[]> {
  const throttle = await getFreshnessThrottleToday();
  const alreadyShown = throttle?.shownEntityIds ?? [];
  const result: T[] = [];
  let shownCount = alreadyShown.length;

  for (const nudge of nudges) {
    if (alreadyShown.includes(nudge.entityId)) {
      result.push(nudge); // Already shown today, keep showing
    } else if (shownCount < maxPerDay) {
      result.push(nudge);
      shownCount++;
      void recordFreshnessNudgeShown(nudge.entityId);
    }
  }

  return result;
}

// ─── Health Check Progress helpers ────────────────────────────────────────────

export async function getHealthCheckProgress(): Promise<HealthCheckProgress | null> {
  return (await clientDb.healthCheckProgress.get('current')) ?? null;
}

export async function saveHealthCheckProgress(reviewedItemId: string, totalItems?: number): Promise<void> {
  const existing = await clientDb.healthCheckProgress.get('current');
  if (existing) {
    const updated = { ...existing };
    if (!existing.reviewedItemIds.includes(reviewedItemId)) {
      updated.reviewedItemIds = [...existing.reviewedItemIds, reviewedItemId];
    }
    if (totalItems !== undefined) updated.totalItems = totalItems;
    await clientDb.healthCheckProgress.put(updated);
  } else {
    await clientDb.healthCheckProgress.put({ id: 'current', reviewedItemIds: [reviewedItemId], startedAt: new Date().toISOString(), totalItems });
  }
}

export async function saveHealthCheckTotalItems(totalItems: number): Promise<void> {
  const existing = await clientDb.healthCheckProgress.get('current');
  if (existing) {
    await clientDb.healthCheckProgress.put({ ...existing, totalItems });
  } else {
    await clientDb.healthCheckProgress.put({ id: 'current', reviewedItemIds: [], startedAt: new Date().toISOString(), totalItems });
  }
}

export async function clearHealthCheckProgress(): Promise<void> {
  await clientDb.healthCheckProgress.delete('current');
}
