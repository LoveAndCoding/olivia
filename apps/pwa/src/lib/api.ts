import {
  activityHistoryResponseSchema,
  chatConversationResponseSchema,
  nudgesResponseSchema,
  skipRoutineOccurrenceResponseSchema,
  weeklyViewResponseSchema,
  completeRitualResponseSchema,
  reviewRecordSchema,
  ritualSummaryResponseSchema,
  type ActivityHistoryResponse,
  type ChatConversationResponse,
  type NudgesResponse,
  type SkipRoutineOccurrenceResponse,
  type WeeklyViewResponse,
  type CompleteRitualResponse,
  type ReviewRecord,
  type RitualSummaryResponse,
  bulkListActionResponseSchema,
  activeListIndexResponseSchema,
  activeRoutineIndexResponseSchema,
  archivedListIndexResponseSchema,
  archivedRoutineIndexResponseSchema,
  cancelReminderResponseSchema,
  completeReminderResponseSchema,
  completeRoutineOccurrenceResponseSchema,
  confirmCreateReminderResponseSchema,
  deleteRoutineResponseSchema,
  generateGroceryListResponseSchema,
  itemDetailResponseSchema,
  inboxViewResponseSchema,
  listDetailResponseSchema,
  listItemMutationResponseSchema,
  listMutationResponseSchema,
  mealPlanDetailResponseSchema,
  mealPlanIndexResponseSchema,
  previewCreateResponseSchema,
  previewCreateReminderResponseSchema,
  previewUpdateResponseSchema,
  previewUpdateReminderResponseSchema,
  reminderDetailResponseSchema,
  reminderSettingsResponseSchema,
  reminderViewResponseSchema,
  routineDetailResponseSchema,
  routineMutationResponseSchema,
  saveReminderNotificationPreferencesResponseSchema,
  snoozeReminderResponseSchema,
  type BulkListActionResponse,
  type ActiveListIndexResponse,
  type ActiveRoutineIndexResponse,
  type ActorRole,
  type ArchivedListIndexResponse,
  type ArchivedRoutineIndexResponse,
  type CancelReminderResponse,
  type CompleteReminderResponse,
  type CompleteRoutineOccurrenceResponse,
  type ConfirmCreateResponse,
  type ConfirmCreateReminderResponse,
  type ConfirmUpdateResponse,
  type ConfirmUpdateReminderResponse,
  type DeleteRoutineResponse,
  type DraftItem,
  type DraftReminder,
  type GenerateGroceryListResponse,
  type ItemDetailResponse,
  type InboxViewResponse,
  type ListDetailResponse,
  type ListItemMutationResponse,
  type ListMutationResponse,
  type MealPlanDetailResponse,
  type MealPlanIndexResponse,
  type Owner,
  type PreviewCreateResponse,
  type PreviewCreateReminderResponse,
  type PreviewUpdateResponse,
  type PreviewUpdateReminderResponse,
  type ReminderDetailResponse,
  type ReminderNotificationPreferencesInput,
  type ReminderSettingsResponse,
  type ReminderUpdateChange,
  type ReminderViewResponse,
  type RoutineDetailResponse,
  type RoutineMutationResponse,
  type RoutineRecurrenceRule,
  type SnoozeReminderResponse,
  type StructuredInput,
  type StructuredReminderInput,
  type UpdateChange
} from '@olivia/contracts';

const DEFAULT_API_BASE_URL = 'http://127.0.0.1:3001';

/** True when running inside a Capacitor native shell (iOS/Android). */
export const isNativePlatform = typeof window !== 'undefined'
  && window.Capacitor?.isNativePlatform?.() === true;

if (isNativePlatform && !import.meta.env.VITE_API_BASE_URL) {
  console.warn(
    '[Olivia] Running in Capacitor without VITE_API_BASE_URL. ' +
    'API calls will fall back to %s which is unreachable from a device. ' +
    'Set the IOS_API_BASE_URL secret in CI.',
    DEFAULT_API_BASE_URL,
  );
}

/** The API base URL baked into this build (for diagnostics). */
export const effectiveApiBaseUrl: string = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;

function normalizeBasePath(basePath: string): string {
  const trimmedBasePath = basePath.trim();
  if (!trimmedBasePath || trimmedBasePath === '/') {
    return '';
  }

  return `/${trimmedBasePath.replace(/^\/+|\/+$/g, '')}`;
}

function stripDuplicatePrefix(pathname: string, basePath: string): string {
  if (!basePath) {
    return pathname;
  }

  if (pathname === basePath) {
    return '';
  }

  if (pathname.startsWith(`${basePath}/`)) {
    return pathname.slice(basePath.length);
  }

  return pathname;
}

export function resolveApiUrl(path: string, baseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL): string {
  const requestUrl = new URL(path.startsWith('/') ? path : `/${path}`, 'http://olivia.local');

  if (/^https?:\/\//i.test(baseUrl)) {
    const resolvedBaseUrl = new URL(baseUrl);
    const basePath = normalizeBasePath(resolvedBaseUrl.pathname);
    resolvedBaseUrl.pathname = `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}` || '/';
    resolvedBaseUrl.search = requestUrl.search;
    resolvedBaseUrl.hash = requestUrl.hash;
    return resolvedBaseUrl.toString();
  }

  const basePath = normalizeBasePath(baseUrl);
  return `${basePath}${stripDuplicatePrefix(requestUrl.pathname, basePath)}${requestUrl.search}${requestUrl.hash}` || '/';
}

export class ApiError extends Error {
  constructor(message: string, public readonly statusCode: number, public readonly payload: unknown) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string> ?? {}) };
  if (init?.body) {
    headers['Content-Type'] ??= 'application/json';
  }
  const response = await fetch(resolveApiUrl(path), {
    ...init,
    headers
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError((payload as { message?: string } | null)?.message ?? 'Request failed.', response.status, payload);
  }
  return payload as T;
}

export async function fetchInboxView(role: ActorRole): Promise<InboxViewResponse> {
  return inboxViewResponseSchema.parse(await request<InboxViewResponse>(`/api/inbox/items?actorRole=${role}&view=all`));
}

export async function fetchItemDetail(role: ActorRole, itemId: string): Promise<ItemDetailResponse> {
  return itemDetailResponseSchema.parse(await request<ItemDetailResponse>(`/api/inbox/items/${itemId}?actorRole=${role}`));
}

export async function previewCreate(role: ActorRole, inputText?: string, structuredInput?: Partial<StructuredInput>): Promise<PreviewCreateResponse> {
  return previewCreateResponseSchema.parse(
    await request<PreviewCreateResponse>('/api/inbox/items/preview-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, inputText, structuredInput })
    })
  );
}

export async function confirmCreate(role: ActorRole, finalItem: DraftItem, draftId?: string): Promise<ConfirmCreateResponse> {
  return request<ConfirmCreateResponse>('/api/inbox/items/confirm-create', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, draftId, approved: true, finalItem })
  });
}

export async function previewUpdate(role: ActorRole, itemId: string, expectedVersion: number, proposedChange: UpdateChange): Promise<PreviewUpdateResponse> {
  return previewUpdateResponseSchema.parse(
    await request<PreviewUpdateResponse>('/api/inbox/items/preview-update', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, itemId, expectedVersion, proposedChange })
    })
  );
}

export async function confirmUpdate(role: ActorRole, itemId: string, expectedVersion: number, proposedChange?: UpdateChange, draftId?: string): Promise<ConfirmUpdateResponse> {
  return request<ConfirmUpdateResponse>('/api/inbox/items/confirm-update', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, itemId, expectedVersion, draftId, approved: true, proposedChange })
  });
}

export async function saveNotificationSubscription(role: ActorRole) {
  return request<{ subscription: unknown }>('/api/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      actorRole: role,
      endpoint: `${window.location.origin}/notifications/${role}`,
      payload: { permission: Notification.permission, userAgent: navigator.userAgent, storedAt: new Date().toISOString() }
    })
  });
}

export async function saveNativeNotificationSubscriptionApi(role: ActorRole, apnsToken: string) {
  return request<{ subscription: unknown }>('/api/notifications/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      actorRole: role,
      type: 'apns',
      token: apnsToken,
      payload: { platform: 'ios', userAgent: navigator.userAgent, storedAt: new Date().toISOString() }
    })
  });
}

export async function listNotificationSubscriptions(role: ActorRole) {
  return request<{ subscriptions: unknown[] }>(`/api/notifications/subscriptions?actorRole=${role}`);
}

export async function fetchReminderView(role: ActorRole): Promise<ReminderViewResponse> {
  return reminderViewResponseSchema.parse(await request<ReminderViewResponse>(`/api/reminders?actorRole=${role}`));
}

export async function fetchReminderDetail(role: ActorRole, reminderId: string): Promise<ReminderDetailResponse> {
  return reminderDetailResponseSchema.parse(await request<ReminderDetailResponse>(`/api/reminders/${reminderId}?actorRole=${role}`));
}

export async function previewCreateReminder(
  role: ActorRole,
  inputText?: string,
  structuredInput?: Partial<StructuredReminderInput>
): Promise<PreviewCreateReminderResponse> {
  return previewCreateReminderResponseSchema.parse(
    await request<PreviewCreateReminderResponse>('/api/reminders/preview-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, inputText, structuredInput })
    })
  );
}

export async function confirmCreateReminder(
  role: ActorRole,
  finalReminder: DraftReminder,
  draftId?: string
): Promise<ConfirmCreateReminderResponse> {
  return confirmCreateReminderResponseSchema.parse(
    await request<ConfirmCreateReminderResponse>('/api/reminders/confirm-create', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, draftId, approved: true, finalReminder })
    })
  );
}

export async function previewUpdateReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<PreviewUpdateReminderResponse> {
  return previewUpdateReminderResponseSchema.parse(
    await request<PreviewUpdateReminderResponse>('/api/reminders/preview-update', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, proposedChange })
    })
  );
}

export async function confirmUpdateReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  proposedChange: ReminderUpdateChange
): Promise<ConfirmUpdateReminderResponse> {
  return request<ConfirmUpdateReminderResponse>('/api/reminders/confirm-update', {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true, proposedChange })
  });
}

export async function completeReminder(role: ActorRole, reminderId: string, expectedVersion: number): Promise<CompleteReminderResponse> {
  return completeReminderResponseSchema.parse(
    await request<CompleteReminderResponse>('/api/reminders/complete', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true })
    })
  );
}

export async function snoozeReminder(
  role: ActorRole,
  reminderId: string,
  expectedVersion: number,
  snoozedUntil: string
): Promise<SnoozeReminderResponse> {
  return snoozeReminderResponseSchema.parse(
    await request<SnoozeReminderResponse>('/api/reminders/snooze', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true, snoozedUntil })
    })
  );
}

export async function cancelReminder(role: ActorRole, reminderId: string, expectedVersion: number): Promise<CancelReminderResponse> {
  return cancelReminderResponseSchema.parse(
    await request<CancelReminderResponse>('/api/reminders/cancel', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, reminderId, expectedVersion, approved: true })
    })
  );
}

export async function fetchReminderSettings(role: ActorRole): Promise<ReminderSettingsResponse> {
  return reminderSettingsResponseSchema.parse(await request<ReminderSettingsResponse>(`/api/reminders/settings?actorRole=${role}`));
}

export async function saveReminderSettings(
  role: ActorRole,
  preferences: ReminderNotificationPreferencesInput
): Promise<ReminderSettingsResponse> {
  return saveReminderNotificationPreferencesResponseSchema.parse(
    await request<ReminderSettingsResponse>('/api/reminders/settings', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, preferences })
    })
  );
}

// ─── Shared List API clients ──────────────────────────────────────────────────

export async function fetchActiveListIndex(role: ActorRole): Promise<ActiveListIndexResponse> {
  return activeListIndexResponseSchema.parse(await request<ActiveListIndexResponse>(`/api/lists?actorRole=${role}`));
}

export async function fetchArchivedListIndex(role: ActorRole): Promise<ArchivedListIndexResponse> {
  return archivedListIndexResponseSchema.parse(await request<ArchivedListIndexResponse>(`/api/lists/archived?actorRole=${role}`));
}

export async function fetchListDetail(role: ActorRole, listId: string): Promise<ListDetailResponse> {
  return listDetailResponseSchema.parse(await request<ListDetailResponse>(`/api/lists/${listId}?actorRole=${role}`));
}

export async function createList(role: ActorRole, title: string): Promise<ListMutationResponse> {
  return listMutationResponseSchema.parse(
    await request<ListMutationResponse>('/api/lists', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, title })
    })
  );
}

export async function updateListTitle(role: ActorRole, listId: string, expectedVersion: number, title: string): Promise<ListMutationResponse> {
  return listMutationResponseSchema.parse(
    await request<ListMutationResponse>(`/api/lists/${listId}/title`, {
      method: 'PATCH',
      body: JSON.stringify({ actorRole: role, expectedVersion, title })
    })
  );
}

export async function archiveList(role: ActorRole, listId: string, expectedVersion: number): Promise<ListMutationResponse> {
  return listMutationResponseSchema.parse(
    await request<ListMutationResponse>(`/api/lists/${listId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion, confirmed: true })
    })
  );
}

export async function restoreList(role: ActorRole, listId: string, expectedVersion: number): Promise<ListMutationResponse> {
  return listMutationResponseSchema.parse(
    await request<ListMutationResponse>(`/api/lists/${listId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion })
    })
  );
}

export async function deleteList(role: ActorRole, listId: string): Promise<void> {
  await request<void>(`/api/lists/${listId}`, {
    method: 'DELETE',
    body: JSON.stringify({ actorRole: role, confirmed: true })
  });
}

export async function addListItem(role: ActorRole, listId: string, body: string): Promise<ListItemMutationResponse> {
  return listItemMutationResponseSchema.parse(
    await request<ListItemMutationResponse>(`/api/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, body })
    })
  );
}

export async function updateListItemBody(role: ActorRole, listId: string, itemId: string, expectedVersion: number, body: string): Promise<ListItemMutationResponse> {
  return listItemMutationResponseSchema.parse(
    await request<ListItemMutationResponse>(`/api/lists/${listId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ actorRole: role, expectedVersion, body })
    })
  );
}

export async function checkListItem(role: ActorRole, listId: string, itemId: string, expectedVersion: number): Promise<ListItemMutationResponse> {
  return listItemMutationResponseSchema.parse(
    await request<ListItemMutationResponse>(`/api/lists/${listId}/items/${itemId}/check`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion })
    })
  );
}

export async function uncheckListItem(role: ActorRole, listId: string, itemId: string, expectedVersion: number): Promise<ListItemMutationResponse> {
  return listItemMutationResponseSchema.parse(
    await request<ListItemMutationResponse>(`/api/lists/${listId}/items/${itemId}/uncheck`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion })
    })
  );
}

export async function removeListItem(role: ActorRole, listId: string, itemId: string): Promise<void> {
  await request<void>(`/api/lists/${listId}/items/${itemId}`, {
    method: 'DELETE',
    body: JSON.stringify({ actorRole: role, confirmed: true })
  });
}

export async function clearCompletedItems(role: ActorRole, listId: string): Promise<BulkListActionResponse> {
  return bulkListActionResponseSchema.parse(
    await request<BulkListActionResponse>(`/api/lists/${listId}/clear-completed`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, confirmed: true })
    })
  );
}

export async function uncheckAllItems(role: ActorRole, listId: string): Promise<BulkListActionResponse> {
  return bulkListActionResponseSchema.parse(
    await request<BulkListActionResponse>(`/api/lists/${listId}/uncheck-all`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, confirmed: true })
    })
  );
}

// ─── Routine API clients ───────────────────────────────────────────────────────

export async function fetchActiveRoutineIndex(role: ActorRole): Promise<ActiveRoutineIndexResponse> {
  return activeRoutineIndexResponseSchema.parse(await request<ActiveRoutineIndexResponse>(`/api/routines?actorRole=${role}`));
}

export async function fetchArchivedRoutineIndex(role: ActorRole): Promise<ArchivedRoutineIndexResponse> {
  return archivedRoutineIndexResponseSchema.parse(await request<ArchivedRoutineIndexResponse>(`/api/routines/archived?actorRole=${role}`));
}

export async function fetchRoutineDetail(role: ActorRole, routineId: string): Promise<RoutineDetailResponse> {
  return routineDetailResponseSchema.parse(await request<RoutineDetailResponse>(`/api/routines/${routineId}?actorRole=${role}`));
}

export async function createRoutine(
  role: ActorRole,
  title: string,
  owner: Owner,
  recurrenceRule: RoutineRecurrenceRule,
  firstDueDate: string | null,
  intervalDays?: number | null,
  weekdays?: number[] | null,
  intervalWeeks?: number | null
): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>('/api/routines', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, title, owner, recurrenceRule, firstDueDate, intervalDays, weekdays, intervalWeeks })
    })
  );
}

export async function updateRoutine(
  role: ActorRole,
  routineId: string,
  expectedVersion: number,
  changes: { title?: string; owner?: Owner; recurrenceRule?: RoutineRecurrenceRule; intervalDays?: number | null; intervalWeeks?: number | null; weekdays?: number[] | null }
): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>(`/api/routines/${routineId}`, {
      method: 'PATCH',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion, ...changes })
    })
  );
}

export async function completeRoutineOccurrence(role: ActorRole, routineId: string, expectedVersion: number): Promise<CompleteRoutineOccurrenceResponse> {
  return completeRoutineOccurrenceResponseSchema.parse(
    await request<CompleteRoutineOccurrenceResponse>(`/api/routines/${routineId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion })
    })
  );
}

export async function pauseRoutine(role: ActorRole, routineId: string, expectedVersion: number): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>(`/api/routines/${routineId}/pause`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion, confirmed: true })
    })
  );
}

export async function resumeRoutine(role: ActorRole, routineId: string, expectedVersion: number): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>(`/api/routines/${routineId}/resume`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion })
    })
  );
}

export async function archiveRoutine(role: ActorRole, routineId: string, expectedVersion: number): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>(`/api/routines/${routineId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion, confirmed: true })
    })
  );
}

export async function restoreRoutine(role: ActorRole, routineId: string, expectedVersion: number): Promise<RoutineMutationResponse> {
  return routineMutationResponseSchema.parse(
    await request<RoutineMutationResponse>(`/api/routines/${routineId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, routineId, expectedVersion })
    })
  );
}

export async function deleteRoutine(role: ActorRole, routineId: string): Promise<DeleteRoutineResponse> {
  return deleteRoutineResponseSchema.parse(
    await request<DeleteRoutineResponse>(`/api/routines/${routineId}`, {
      method: 'DELETE',
      body: JSON.stringify({ actorRole: role, routineId, confirmed: true })
    })
  );
}

// ─── Meal Plan API clients ────────────────────────────────────────────────────

export async function fetchActiveMealPlanIndex(role: ActorRole): Promise<MealPlanIndexResponse> {
  return mealPlanIndexResponseSchema.parse(await request<MealPlanIndexResponse>(`/api/meal-plans?actorRole=${role}`));
}

export async function fetchArchivedMealPlanIndex(role: ActorRole): Promise<MealPlanIndexResponse> {
  return mealPlanIndexResponseSchema.parse(await request<MealPlanIndexResponse>(`/api/meal-plans/archived?actorRole=${role}`));
}

export async function fetchMealPlanDetail(role: ActorRole, planId: string): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}?actorRole=${role}`));
}

export async function createMealPlan(role: ActorRole, title: string, weekStartDate: string): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>('/api/meal-plans', {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, title, weekStartDate })
    })
  );
}

export async function updateMealPlanTitle(role: ActorRole, planId: string, expectedVersion: number, title: string): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}`, {
      method: 'PATCH',
      body: JSON.stringify({ actorRole: role, title, expectedVersion })
    })
  );
}

export async function archiveMealPlan(role: ActorRole, planId: string, expectedVersion: number): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}/archive`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion, confirmed: true })
    })
  );
}

export async function restoreMealPlan(role: ActorRole, planId: string, expectedVersion: number): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}/restore`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, expectedVersion })
    })
  );
}

export async function deleteMealPlan(role: ActorRole, planId: string): Promise<void> {
  await request<void>(`/api/meal-plans/${planId}`, {
    method: 'DELETE',
    body: JSON.stringify({ actorRole: role, confirmed: true })
  });
}

export async function addMealEntry(role: ActorRole, planId: string, dayOfWeek: number, name: string): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}/entries`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role, dayOfWeek, name })
    })
  );
}

export async function updateMealEntry(role: ActorRole, planId: string, entryId: string, expectedVersion: number, changes: { name?: string; shoppingItems?: string[] }): Promise<MealPlanDetailResponse> {
  return mealPlanDetailResponseSchema.parse(
    await request<MealPlanDetailResponse>(`/api/meal-plans/${planId}/entries/${entryId}`, {
      method: 'PATCH',
      body: JSON.stringify({ actorRole: role, expectedVersion, ...changes })
    })
  );
}

export async function deleteMealEntry(role: ActorRole, planId: string, entryId: string): Promise<void> {
  await request<void>(`/api/meal-plans/${planId}/entries/${entryId}`, {
    method: 'DELETE',
    body: JSON.stringify({ actorRole: role, confirmed: true })
  });
}

export async function generateGroceryList(role: ActorRole, planId: string): Promise<GenerateGroceryListResponse> {
  return generateGroceryListResponseSchema.parse(
    await request<GenerateGroceryListResponse>(`/api/meal-plans/${planId}/generate-grocery-list`, {
      method: 'POST',
      body: JSON.stringify({ actorRole: role })
    })
  );
}

// ─── Weekly View API client ───────────────────────────────────────────────────

export async function fetchWeeklyView(weekStart: string): Promise<WeeklyViewResponse> {
  return weeklyViewResponseSchema.parse(
    await request<WeeklyViewResponse>(`/api/weekly-view?weekStart=${weekStart}`)
  );
}

// ─── Activity History API client ─────────────────────────────────────────────

export async function fetchActivityHistory(): Promise<ActivityHistoryResponse> {
  return activityHistoryResponseSchema.parse(
    await request<ActivityHistoryResponse>('/api/activity-history')
  );
}

// ─── Planning Ritual Support API client ──────────────────────────────────────

export async function completeRitual(
  routineId: string,
  occurrenceId: string,
  actorRole: ActorRole,
  carryForwardNotes: string | null,
  recapNarrative?: string | null,
  overviewNarrative?: string | null
): Promise<CompleteRitualResponse> {
  return completeRitualResponseSchema.parse(
    await request<CompleteRitualResponse>(`/api/routines/${routineId}/complete-ritual`, {
      method: 'POST',
      body: JSON.stringify({ actorRole, occurrenceId, carryForwardNotes, recapNarrative, overviewNarrative })
    })
  );
}

export async function generateRitualSummary(
  routineId: string,
  occurrenceId: string,
  signal?: AbortSignal
): Promise<RitualSummaryResponse> {
  const res = await request<RitualSummaryResponse>(`/api/routines/${routineId}/generate-ritual-summary`, {
    method: 'POST',
    body: JSON.stringify({ occurrenceId }),
    signal
  });
  return ritualSummaryResponseSchema.parse(res);
}

export async function fetchNudgesApi(role: ActorRole): Promise<NudgesResponse> {
  const res = await request<NudgesResponse>(`/api/nudges?actorRole=${role}`);
  return nudgesResponseSchema.parse(res);
}

export async function skipRoutineOccurrenceApi(
  routineId: string,
  role: ActorRole,
  expectedVersion: number
): Promise<SkipRoutineOccurrenceResponse> {
  const res = await request<SkipRoutineOccurrenceResponse>(`/api/routines/${routineId}/skip`, {
    method: 'POST',
    body: JSON.stringify({ actorRole: role, routineId, expectedVersion })
  });
  return skipRoutineOccurrenceResponseSchema.parse(res);
}

export async function fetchReviewRecord(reviewRecordId: string, role?: ActorRole): Promise<ReviewRecord> {
  const params = role ? `?role=${role}` : '';
  return reviewRecordSchema.parse(
    await request<ReviewRecord>(`/api/review-records/${reviewRecordId}${params}`)
  );
}

// ─── Chat API ─────────────────────────────────────────────────────────────────

export async function fetchChatConversation(limit = 50, before?: string): Promise<ChatConversationResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return chatConversationResponseSchema.parse(
    await request<ChatConversationResponse>(`/api/chat/conversation?${params}`)
  );
}

export type ChatStreamEvent =
  | { event: 'text'; data: { delta: string } }
  | { event: 'tool_call'; data: { toolCall: { id: string; type: string; data: Record<string, unknown>; status: string } } }
  | { event: 'done'; data: { messageId: string; conversationId: string } }
  | { event: 'error'; data: { message: string } };

/**
 * Parse an SSE response body into ChatStreamEvents.
 *
 * WKWebView can buffer SSE chunks differently from desktop browsers, so this
 * parser uses a read timeout to detect stalled streams and surface an error
 * rather than hanging indefinitely.
 */
async function* parseSSEStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ChatStreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  // 60s timeout per chunk — if WKWebView buffers beyond this, surface an error
  const STREAM_READ_TIMEOUT_MS = 60_000;

  try {
    while (true) {
      const readPromise = reader.read();

      // Race the read against a timeout to catch stalled WKWebView streams
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('SSE stream read timed out')), STREAM_READ_TIMEOUT_MS);
      });

      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await Promise.race([readPromise, timeoutPromise]);
      } catch {
        // Stream timed out — yield an error event instead of throwing
        yield { event: 'error', data: { message: 'The response took too long. Try sending your message again.' } } as ChatStreamEvent;
        return;
      } finally {
        clearTimeout(timeoutId);
      }

      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7);
        } else if (line.startsWith('data: ') && currentEvent) {
          try {
            const data = JSON.parse(line.slice(6));
            yield { event: currentEvent, data } as ChatStreamEvent;
          } catch {
            // skip unparseable data
          }
          currentEvent = '';
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Initiate an SSE streaming POST request and parse the response.
 * Handles non-ok responses with user-friendly error events.
 */
async function* streamSSE(
  url: string,
  content: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const response = await fetch(resolveApiUrl(url), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 503) {
      yield { event: 'error', data: { message: 'Olivia is unavailable right now. You can still use the app to manage your household.' } };
      return;
    }
    yield { event: 'error', data: { message: 'Something unexpected happened. Try sending your message again.' } };
    return;
  }

  if (!response.body) return;

  yield* parseSSEStream(response.body);
}

export async function* streamChatMessage(content: string, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  yield* streamSSE('/api/chat/messages', content, signal);
}

export async function clearChatConversation(): Promise<void> {
  await request<{ cleared: boolean }>('/api/chat/conversation/clear', { method: 'POST' });
}

export async function confirmChatAction(toolCallId: string): Promise<Record<string, unknown>> {
  const res = await request<{ result: Record<string, unknown> }>(`/api/chat/actions/${toolCallId}/confirm`, { method: 'POST' });
  return res.result;
}

export async function dismissChatAction(toolCallId: string): Promise<void> {
  await request<{ dismissed: boolean }>(`/api/chat/actions/${toolCallId}/dismiss`, { method: 'POST' });
}

export async function undoChatResponse(messageId: string): Promise<void> {
  await request<{ undone: boolean }>(`/api/chat/messages/${messageId}/undo`, { method: 'POST' });
}

// ─── Onboarding API (OLI-119) ──────────────────────────────────────────────

export type OnboardingState = {
  needsOnboarding: boolean;
  session: OnboardingSession | null;
  entityCount: number;
};

export type OnboardingSession = {
  id: string;
  conversationId: string;
  status: 'started' | 'finished';
  topicsCompleted: string[];
  currentTopic: string | null;
  entitiesCreated: number;
  createdAt: string;
  updatedAt: string;
};

export async function fetchOnboardingState(): Promise<OnboardingState> {
  return request<OnboardingState>('/api/onboarding/state');
}

export async function startOnboarding(): Promise<{ session: OnboardingSession }> {
  return request<{ session: OnboardingSession }>('/api/onboarding/start', { method: 'POST' });
}

export async function fetchOnboardingConversation(limit = 50, before?: string): Promise<ChatConversationResponse> {
  const params = new URLSearchParams({ limit: String(limit) });
  if (before) params.set('before', before);
  return request<ChatConversationResponse>(`/api/onboarding/conversation?${params.toString()}`);
}

export async function* streamOnboardingMessage(content: string, signal?: AbortSignal): AsyncGenerator<ChatStreamEvent> {
  yield* streamSSE('/api/onboarding/messages', content, signal);
}

export async function advanceOnboardingTopic(): Promise<{
  done: boolean;
  currentTopic?: string;
  topicPrompt?: string;
  topicsCompleted: string[];
}> {
  return request('/api/onboarding/next-topic', { method: 'POST' });
}

export async function finishOnboarding(): Promise<{ session: OnboardingSession }> {
  return request<{ session: OnboardingSession }>('/api/onboarding/finish', { method: 'POST' });
}

// ─── Data Freshness API (OLI-125) ──────────────────────────────────────────

export type StaleItem = {
  entityType: 'inbox' | 'routine' | 'reminder' | 'list' | 'mealPlan';
  entityId: string;
  entityName: string;
  lastActivityAt: string;
  lastActivityDescription: string;
};

export type StaleItemsResponse = {
  items: StaleItem[];
  totalStaleCount: number;
};

export type HealthCheckState = {
  lastCompletedAt: string | null;
  lastDismissedAt: string | null;
  shouldShow: boolean;
};

export async function fetchStaleItems(): Promise<StaleItemsResponse> {
  return request<StaleItemsResponse>('/api/freshness/stale-items');
}

export async function confirmFreshness(
  entityType: string,
  entityId: string,
  actorRole: ActorRole,
  expectedVersion: number
): Promise<{ newVersion: number }> {
  return request<{ newVersion: number }>('/api/freshness/confirm', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId, actorRole, expectedVersion })
  });
}

export async function archiveFreshnessEntity(
  entityType: string,
  entityId: string,
  actorRole: ActorRole,
  expectedVersion: number
): Promise<{ newVersion: number }> {
  return request<{ newVersion: number }>('/api/freshness/archive', {
    method: 'POST',
    body: JSON.stringify({ entityType, entityId, actorRole, expectedVersion })
  });
}

export async function fetchHealthCheckState(): Promise<HealthCheckState> {
  return request<HealthCheckState>('/api/freshness/health-check-state');
}

export async function completeHealthCheck(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/freshness/health-check-complete', { method: 'POST' });
}

export async function dismissHealthCheck(): Promise<{ success: boolean }> {
  return request<{ success: boolean }>('/api/freshness/health-check-dismiss', { method: 'POST' });
}
