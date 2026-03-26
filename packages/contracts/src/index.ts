import { z } from 'zod';

export const assigneeUserIdSchema = z.string().uuid().nullable();
export const itemStatusSchema = z.enum(['open', 'in_progress', 'done', 'deferred']);
export const parseConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const parserSourceSchema = z.enum(['ai', 'rules']);
export const querySourceSchema = z.enum(['server', 'cache']);
export const suggestionTypeSchema = z.enum(['overdue', 'stale', 'unassigned', 'due_soon']);
export const eventTypeSchema = z.enum([
  'created',
  'status_changed',
  'assignee_changed',
  'due_changed',
  'description_changed',
  'note_added'
]);

export const structuredInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().default(null),
  status: itemStatusSchema.default('open'),
  dueText: z.string().trim().min(1).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional()
});

export const draftItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  assigneeUserId: z.string().uuid().nullable(),
  status: itemStatusSchema,
  dueText: z.string().trim().min(1).nullable(),
  dueAt: z.string().datetime().nullable()
});

// Optional userId field — null for system-initiated actions, present for user-initiated
const optionalUserId = z.string().uuid().nullish();

export const inboxItemSchema = draftItemSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  lastStatusChangedAt: z.string().datetime(),
  lastNoteAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  freshnessCheckedAt: z.string().datetime().nullable().default(null),
  createdByUserId: optionalUserId,
  pendingSync: z.boolean().optional()
});

export const historyEntrySchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  eventType: eventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
  userId: optionalUserId,
  createdAt: z.string().datetime()
});

export const itemFlagsSchema = z.object({
  overdue: z.boolean(),
  stale: z.boolean(),
  dueSoon: z.boolean(),
  unassigned: z.boolean()
});

export const suggestionSchema = z.object({
  type: suggestionTypeSchema,
  itemId: z.string().uuid(),
  title: z.string(),
  message: z.string()
});

export const itemsByStatusSchema = z.object({
  open: z.array(inboxItemSchema),
  in_progress: z.array(inboxItemSchema),
  deferred: z.array(inboxItemSchema),
  done: z.array(inboxItemSchema)
});

export const inboxViewResponseSchema = z.object({
  itemsByStatus: itemsByStatusSchema,
  suggestions: z.array(suggestionSchema),
  generatedAt: z.string().datetime(),
  staleThresholdDays: z.number().int().positive(),
  dueSoonDays: z.number().int().positive(),
  source: querySourceSchema
});

export const previewCreateRequestSchema = z.object({

  inputText: z.string().trim().min(1).optional(),
  structuredInput: structuredInputSchema.partial().optional()
}).refine((value) => value.inputText || value.structuredInput, {
  message: 'either inputText or structuredInput is required'
});

export const previewCreateResponseSchema = z.object({
  draftId: z.string().uuid(),
  parsedItem: draftItemSchema,
  parseConfidence: parseConfidenceSchema,
  ambiguities: z.array(z.string()),
  parserSource: parserSourceSchema,
  requiresConfirmation: z.literal(true)
});

export const confirmCreateRequestSchema = z.object({

  draftId: z.string().uuid().optional(),
  approved: z.literal(true),
  finalItem: draftItemSchema
});

export const confirmCreateResponseSchema = z.object({
  savedItem: inboxItemSchema,
  historyEntry: historyEntrySchema,
  newVersion: z.number().int().positive()
});

export const updateChangeSchema = z.object({
  status: itemStatusSchema.optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  dueText: z.string().trim().min(1).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().min(1).optional()
});

export const previewUpdateRequestSchema = z.object({

  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  proposedChange: updateChangeSchema
});

export const previewUpdateResponseSchema = z.object({
  draftId: z.string().uuid(),
  currentItem: inboxItemSchema,
  proposedItem: inboxItemSchema,
  requiresConfirmation: z.literal(true)
});

export const confirmUpdateRequestSchema = z.object({

  draftId: z.string().uuid().optional(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true),
  proposedChange: updateChangeSchema.optional()
});

export const confirmUpdateResponseSchema = z.object({
  savedItem: inboxItemSchema,
  historyEntry: historyEntrySchema,
  newVersion: z.number().int().positive()
});

export const itemDetailResponseSchema = z.object({
  item: inboxItemSchema,
  history: z.array(historyEntrySchema),
  flags: itemFlagsSchema
});

export const reminderStateSchema = z.enum([
  'upcoming',
  'due',
  'overdue',
  'snoozed',
  'completed',
  'cancelled'
]);

export const recurrenceCadenceSchema = z.enum(['none', 'daily', 'weekly', 'monthly']);

export const reminderEventTypeSchema = z.enum([
  'created',
  'rescheduled',
  'snoozed',
  'completed',
  'cancelled',
  'recurrence_advanced',
  'missed_occurrence_logged'
]);

export const structuredReminderInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  note: z.string().trim().min(1).nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().default(null),
  scheduledAt: z.string().datetime(),
  recurrenceCadence: recurrenceCadenceSchema.default('none'),
  linkedInboxItemId: z.string().uuid().nullable().optional()
});

export const draftReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  note: z.string().trim().min(1).nullable(),
  assigneeUserId: z.string().uuid().nullable(),
  scheduledAt: z.string().datetime(),
  recurrenceCadence: recurrenceCadenceSchema,
  linkedInboxItemId: z.string().uuid().nullable()
});

export const linkedInboxSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  status: itemStatusSchema,
  assigneeUserId: z.string().uuid().nullable(),
  dueAt: z.string().datetime().nullable()
});

export const reminderSchema = draftReminderSchema.extend({
  state: reminderStateSchema,
  linkedInboxItem: linkedInboxSummarySchema.nullable().optional(),
  snoozedUntil: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  cancelledAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  freshnessCheckedAt: z.string().datetime().nullable().default(null),
  createdByUserId: optionalUserId,
  pendingSync: z.boolean().optional()
});

export const reminderTimelineEntrySchema = z.object({
  id: z.string().uuid(),
  reminderId: z.string().uuid(),
  eventType: reminderEventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  userId: optionalUserId,
  createdAt: z.string().datetime()
});

export const reminderNotificationPreferencesInputSchema = z.object({
  enabled: z.boolean(),
  dueRemindersEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean()
});

export const reminderNotificationPreferencesSchema = reminderNotificationPreferencesInputSchema.extend({
  userId: z.string().uuid(),
  updatedAt: z.string().datetime()
});

export const remindersByStateSchema = z.object({
  upcoming: z.array(reminderSchema),
  due: z.array(reminderSchema),
  overdue: z.array(reminderSchema),
  snoozed: z.array(reminderSchema),
  completed: z.array(reminderSchema),
  cancelled: z.array(reminderSchema)
});

export const reminderViewResponseSchema = z.object({
  remindersByState: remindersByStateSchema,
  generatedAt: z.string().datetime(),
  source: querySourceSchema
});

export const reminderDetailResponseSchema = z.object({
  reminder: reminderSchema,
  timeline: z.array(reminderTimelineEntrySchema)
});

export const reminderSettingsResponseSchema = z.object({
  preferences: reminderNotificationPreferencesSchema
});

export const previewCreateReminderRequestSchema = z.object({

  inputText: z.string().trim().min(1).optional(),
  structuredInput: structuredReminderInputSchema.partial().optional()
}).refine((value) => value.inputText || value.structuredInput, {
  message: 'either inputText or structuredInput is required'
});

export const previewCreateReminderResponseSchema = z.object({
  draftId: z.string().uuid(),
  parsedReminder: draftReminderSchema,
  parseConfidence: parseConfidenceSchema,
  ambiguities: z.array(z.string()),
  parserSource: parserSourceSchema,
  requiresConfirmation: z.literal(true)
});

export const confirmCreateReminderRequestSchema = z.object({

  draftId: z.string().uuid().optional(),
  approved: z.literal(true),
  finalReminder: draftReminderSchema
});

export const reminderUpdateChangeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).nullable().optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  scheduledAt: z.string().datetime().optional(),
  recurrenceCadence: recurrenceCadenceSchema.optional()
});

export const previewUpdateReminderRequestSchema = z.object({

  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  proposedChange: reminderUpdateChangeSchema
});

export const previewUpdateReminderResponseSchema = z.object({
  draftId: z.string().uuid(),
  currentReminder: reminderSchema,
  proposedReminder: reminderSchema,
  requiresConfirmation: z.literal(true)
});

export const confirmUpdateReminderRequestSchema = z.object({

  draftId: z.string().uuid().optional(),
  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true),
  proposedChange: reminderUpdateChangeSchema
});

export const reminderMutationResponseSchema = z.object({
  savedReminder: reminderSchema,
  timelineEntry: reminderTimelineEntrySchema,
  newVersion: z.number().int().positive()
});

export const confirmCreateReminderResponseSchema = reminderMutationResponseSchema;
export const confirmUpdateReminderResponseSchema = reminderMutationResponseSchema;
export const completeReminderResponseSchema = reminderMutationResponseSchema;
export const snoozeReminderResponseSchema = reminderMutationResponseSchema;
export const cancelReminderResponseSchema = reminderMutationResponseSchema;

export const completeReminderRequestSchema = z.object({

  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true)
});

export const snoozeReminderRequestSchema = z.object({

  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true),
  snoozedUntil: z.string().datetime()
});

export const cancelReminderRequestSchema = z.object({

  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true)
});

export const saveReminderNotificationPreferencesRequestSchema = z.object({

  preferences: reminderNotificationPreferencesInputSchema
});

export const saveReminderNotificationPreferencesResponseSchema = reminderSettingsResponseSchema;

export const notificationSubscriptionSchema = z.object({
  id: z.string().uuid(),
  endpoint: z.string(),
  payload: z.record(z.string(), z.unknown()),
  userId: z.string().uuid(),
  createdAt: z.string().datetime()
});

export const saveNotificationSubscriptionRequestSchema = z.union([
  z.object({
    type: z.literal('apns'),
    token: z.string().min(1),
    payload: z.record(z.string(), z.unknown())
  }),
  z.object({
    endpoint: z.string().url(),
    payload: z.record(z.string(), z.unknown())
  })
]);

export const saveNotificationSubscriptionResponseSchema = z.object({
  subscription: notificationSubscriptionSchema
});

// ─── Shared Lists ────────────────────────────────────────────────────────────

export const listStatusSchema = z.enum(['active', 'archived']);

export const listEventTypeSchema = z.enum([
  'list_created',
  'list_title_updated',
  'list_archived',
  'list_restored',
  'list_deleted',
  'item_added',
  'item_body_updated',
  'item_checked',
  'item_unchecked',
  'item_removed',
  'items_cleared',
  'items_unchecked_all'
]);

export const sharedListSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  assigneeUserId: z.string().uuid().nullable(),
  status: listStatusSchema,
  activeItemCount: z.number().int().nonnegative(),
  checkedItemCount: z.number().int().nonnegative(),
  allChecked: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
  freshnessCheckedAt: z.string().datetime().nullable().default(null),
  createdByUserId: optionalUserId,
  pendingSync: z.boolean().optional()
});

export const listItemSchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  body: z.string().trim().min(1),
  checked: z.boolean(),
  checkedAt: z.string().datetime().nullable(),
  position: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  pendingSync: z.boolean().optional()
});

export const listItemHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  listId: z.string().uuid(),
  itemId: z.string().uuid().nullable(),
  eventType: listEventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
  userId: optionalUserId,
  createdAt: z.string().datetime()
});

// Query response schemas
export const activeListIndexResponseSchema = z.object({
  lists: z.array(sharedListSchema),
  source: querySourceSchema
});

export const archivedListIndexResponseSchema = z.object({
  lists: z.array(sharedListSchema),
  source: querySourceSchema
});

export const listDetailResponseSchema = z.object({
  list: sharedListSchema,
  items: z.array(listItemSchema),
  source: querySourceSchema
});

// Command/request schemas
export const createListRequestSchema = z.object({

  title: z.string().trim().min(1)
});

export const updateListTitleRequestSchema = z.object({

  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1)
});

export const archiveListRequestSchema = z.object({

  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const restoreListRequestSchema = z.object({

  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const deleteListRequestSchema = z.object({

  listId: z.string().uuid(),
  confirmed: z.literal(true)
});

export const addListItemRequestSchema = z.object({

  listId: z.string().uuid(),
  body: z.string().trim().min(1)
});

export const updateListItemBodyRequestSchema = z.object({

  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  body: z.string().trim().min(1)
});

export const checkListItemRequestSchema = z.object({

  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const uncheckListItemRequestSchema = z.object({

  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const removeListItemRequestSchema = z.object({

  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  confirmed: z.literal(true)
});

export const clearCompletedItemsRequestSchema = z.object({

  listId: z.string().uuid(),
  confirmed: z.literal(true)
});

export const uncheckAllItemsRequestSchema = z.object({

  listId: z.string().uuid(),
  confirmed: z.literal(true)
});

export const bulkListActionResponseSchema = z.object({
  affectedCount: z.number().int().nonnegative()
});

// Mutation response schemas
export const listMutationResponseSchema = z.object({
  savedList: sharedListSchema,
  historyEntry: listItemHistoryEntrySchema,
  newVersion: z.number().int().positive()
});

export const listItemMutationResponseSchema = z.object({
  savedItem: listItemSchema,
  historyEntry: listItemHistoryEntrySchema,
  newVersion: z.number().int().positive()
});

// ─── Recurring Routines ───────────────────────────────────────────────────────

export const routineStatusSchema = z.enum(['active', 'paused', 'archived']);
export const routineDueStateSchema = z.enum(['upcoming', 'due', 'overdue', 'completed', 'paused']);
export const routineRecurrenceRuleSchema = z.enum(['daily', 'weekly', 'monthly', 'every_n_days', 'weekly_on_days', 'every_n_weeks', 'ad_hoc']);

export const routineEventTypeSchema = z.enum([
  'routine_created',
  'routine_updated',
  'routine_completed',
  'routine_paused',
  'routine_resumed',
  'routine_archived',
  'routine_restored',
  'routine_deleted'
]);

export const ritualTypeSchema = z.enum(['weekly_review']);

export const routineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  assigneeUserId: z.string().uuid().nullable(),
  recurrenceRule: routineRecurrenceRuleSchema,
  intervalDays: z.number().int().positive().nullable(),
  intervalWeeks: z.number().int().min(2).max(12).nullable().default(null),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().default(null),
  status: routineStatusSchema,
  currentDueDate: z.string().datetime().nullable(),
  dueState: routineDueStateSchema.nullable().optional(),
  ritualType: ritualTypeSchema.nullable().optional(),
  lastCompletedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
  freshnessCheckedAt: z.string().datetime().nullable().default(null),
  createdByUserId: optionalUserId,
  pendingSync: z.boolean().optional()
}).refine(
  (r) => r.recurrenceRule !== 'every_n_days' || (r.intervalDays !== null && r.intervalDays > 0),
  { message: 'intervalDays must be a positive integer when recurrenceRule is every_n_days' }
).refine(
  (r) => r.recurrenceRule !== 'weekly_on_days' || (r.weekdays !== null && r.weekdays.length > 0),
  { message: 'weekdays must be a non-empty array when recurrenceRule is weekly_on_days' }
).refine(
  (r) => r.recurrenceRule !== 'every_n_weeks' || (r.intervalWeeks !== null && r.intervalWeeks >= 2 && r.weekdays !== null && r.weekdays.length === 1),
  { message: 'intervalWeeks (2-12) and exactly one weekday are required when recurrenceRule is every_n_weeks' }
).refine(
  (r) => r.recurrenceRule !== 'ad_hoc' || r.currentDueDate === null,
  { message: 'currentDueDate must be null for ad_hoc routines' }
);

export const routineOccurrenceSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  dueDate: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  completedByUserId: optionalUserId,
  skipped: z.boolean(),
  reviewRecordId: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime()
});

// Query response schemas
export const activeRoutineIndexResponseSchema = z.object({
  routines: z.array(routineSchema),
  source: querySourceSchema
});

export const archivedRoutineIndexResponseSchema = z.object({
  routines: z.array(routineSchema),
  source: querySourceSchema
});

export const routineDetailResponseSchema = z.object({
  routine: routineSchema,
  occurrences: z.array(routineOccurrenceSchema),
  source: querySourceSchema
});

// Command/request schemas
export const createRoutineRequestSchema = z.object({

  title: z.string().trim().min(1),
  assigneeUserId: z.string().uuid().nullable(),
  recurrenceRule: routineRecurrenceRuleSchema,
  intervalDays: z.number().int().positive().nullable().optional(),
  intervalWeeks: z.number().int().min(2).max(12).nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  firstDueDate: z.string().datetime().nullable()
}).refine(
  (r) => r.recurrenceRule !== 'every_n_days' || (r.intervalDays !== null && r.intervalDays !== undefined && r.intervalDays > 0),
  { message: 'intervalDays must be a positive integer when recurrenceRule is every_n_days' }
).refine(
  (r) => r.recurrenceRule !== 'weekly_on_days' || (r.weekdays !== null && r.weekdays !== undefined && r.weekdays.length > 0),
  { message: 'weekdays must be a non-empty array when recurrenceRule is weekly_on_days' }
).refine(
  (r) => r.recurrenceRule !== 'every_n_weeks' || (r.intervalWeeks !== null && r.intervalWeeks !== undefined && r.intervalWeeks >= 2 && r.weekdays !== null && r.weekdays !== undefined && r.weekdays.length === 1),
  { message: 'intervalWeeks (2-12) and exactly one weekday are required when recurrenceRule is every_n_weeks' }
).refine(
  (r) => r.recurrenceRule !== 'ad_hoc' || r.firstDueDate === null,
  { message: 'firstDueDate must be null for ad_hoc routines' }
);

export const updateRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  assigneeUserId: z.string().uuid().nullable().optional(),
  recurrenceRule: routineRecurrenceRuleSchema.optional(),
  intervalDays: z.number().int().positive().nullable().optional(),
  intervalWeeks: z.number().int().min(2).max(12).nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional()
});

export const completeRoutineOccurrenceRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const pauseRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const resumeRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const archiveRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const restoreRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const deleteRoutineRequestSchema = z.object({

  routineId: z.string().uuid(),
  confirmed: z.literal(true)
});

// Mutation response schemas
export const routineMutationResponseSchema = z.object({
  savedRoutine: routineSchema,
  newVersion: z.number().int().positive()
});

export const completeRoutineOccurrenceResponseSchema = z.object({
  savedRoutine: routineSchema,
  occurrence: routineOccurrenceSchema,
  newVersion: z.number().int().positive()
});

export const deleteRoutineResponseSchema = z.object({
  deleted: z.literal(true)
});

// ─── Outbox commands ─────────────────────────────────────────────────────────

// ─── Meal Planning ────────────────────────────────────────────────────────────

export const mealPlanStatusSchema = z.enum(['active', 'archived']);
export const dayOfWeekSchema = z.number().int().min(0).max(6); // 0=Monday, 6=Sunday

export const mealPlanEventTypeSchema = z.enum([
  'meal_plan_created', 'meal_plan_title_updated', 'meal_plan_archived',
  'meal_plan_restored', 'meal_plan_deleted', 'meal_entry_added',
  'meal_entry_name_updated', 'meal_entry_items_updated', 'meal_entry_deleted',
  'grocery_list_generated'
]);

export const generatedListRefSchema = z.object({
  listId: z.string().uuid(),
  generatedAt: z.string().datetime()
});

export const mealPlanSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  weekStartDate: z.string(),
  status: mealPlanStatusSchema,
  generatedListRefs: z.array(generatedListRefSchema),
  mealCount: z.number().int().nonnegative(),
  shoppingItemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
  freshnessCheckedAt: z.string().datetime().nullable().default(null),
  pendingSync: z.boolean().optional()
});

export const mealEntrySchema = z.object({
  id: z.string().uuid(),
  planId: z.string().uuid(),
  dayOfWeek: dayOfWeekSchema,
  name: z.string().trim().min(1),
  shoppingItems: z.array(z.string()),
  position: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  pendingSync: z.boolean().optional()
});

export const mealPlanIndexResponseSchema = z.object({
  plans: z.array(mealPlanSchema),
  totalCount: z.number().int().nonnegative()
});

export const mealPlanDetailResponseSchema = z.object({
  plan: mealPlanSchema,
  entries: z.array(mealEntrySchema)
});

export const createMealPlanRequestSchema = z.object({

  title: z.string().trim().min(1),
  weekStartDate: z.string()
});

export const updateMealPlanTitleRequestSchema = z.object({

  title: z.string().trim().min(1),
  expectedVersion: z.number().int().positive()
});

export const archiveMealPlanRequestSchema = z.object({

  confirmed: z.literal(true),
  expectedVersion: z.number().int().positive()
});

export const restoreMealPlanRequestSchema = z.object({

  expectedVersion: z.number().int().positive()
});

export const deleteMealPlanRequestSchema = z.object({

  confirmed: z.literal(true)
});

export const addMealEntryRequestSchema = z.object({

  dayOfWeek: dayOfWeekSchema,
  name: z.string().trim().min(1)
});

export const updateMealEntryRequestSchema = z.object({

  name: z.string().trim().min(1).optional(),
  shoppingItems: z.array(z.string()).optional(),
  expectedVersion: z.number().int().positive()
});

export const deleteMealEntryRequestSchema = z.object({

  confirmed: z.literal(true)
});

export const generateGroceryListResponseSchema = z.object({
  list: sharedListSchema,
  generatedListRef: generatedListRefSchema
});

// Unified Weekly View schemas
export const weeklyRoutineOccurrenceSchema = z.object({
  routineId: z.string().uuid(),
  routineTitle: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  recurrenceRule: routineRecurrenceRuleSchema,
  intervalDays: z.number().int().positive().nullable(),
  intervalWeeks: z.number().int().min(2).max(12).nullable().optional(),
  weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
  dueDate: z.string(), // ISO date string, date only (YYYY-MM-DD)
  dueState: routineDueStateSchema,
  completed: z.boolean()
});

export const weeklyReminderSchema = z.object({
  reminderId: z.string().uuid(),
  title: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  scheduledAt: z.string().datetime(),
  dueState: reminderStateSchema
});

export const weeklyMealEntrySchema = z.object({
  entryId: z.string().uuid(),
  planId: z.string().uuid(),
  planTitle: z.string(),
  name: z.string(),
  dayOfWeek: z.number().int().min(0).max(6), // 0=Mon, 6=Sun
  weekStartDate: z.string() // ISO date string, date only
});

export const weeklyInboxItemSchema = z.object({
  itemId: z.string().uuid(),
  title: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  dueAt: z.string().datetime(),
  status: itemStatusSchema
});

export const weeklyDaySchema = z.object({
  date: z.string(), // ISO date string, date only (YYYY-MM-DD)
  dayOfWeek: z.number().int().min(0).max(6), // 0=Mon, 6=Sun
  routines: z.array(weeklyRoutineOccurrenceSchema),
  reminders: z.array(weeklyReminderSchema),
  meals: z.array(weeklyMealEntrySchema),
  inboxItems: z.array(weeklyInboxItemSchema)
});

export const weeklyViewResponseSchema = z.object({
  weekStart: z.string(), // ISO date string, date only (YYYY-MM-DD)
  weekEnd: z.string(), // ISO date string, date only (YYYY-MM-DD)
  days: z.array(weeklyDaySchema) // always 7 entries, Mon–Sun
});

export const outboxCommandSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('create'),
    commandId: z.string().uuid(),
    finalItem: draftItemSchema,
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('update'),
    commandId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    proposedChange: updateChangeSchema
  }),
  z.object({
    kind: z.literal('reminder_create'),
    commandId: z.string().uuid(),
    approved: z.literal(true),
    finalReminder: draftReminderSchema
  }),
  z.object({
    kind: z.literal('reminder_update'),
    commandId: z.string().uuid(),
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    proposedChange: reminderUpdateChangeSchema
  }),
  z.object({
    kind: z.literal('reminder_complete'),
    commandId: z.string().uuid(),
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('reminder_snooze'),
    commandId: z.string().uuid(),
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    snoozedUntil: z.string().datetime()
  }),
  z.object({
    kind: z.literal('reminder_cancel'),
    commandId: z.string().uuid(),
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('list_create'),
    commandId: z.string().uuid(),
    title: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('list_title_update'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('list_archive'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('list_restore'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('list_delete'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('item_add'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    body: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('item_body_update'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    body: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('item_check'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('item_uncheck'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('item_remove'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('items_clear_completed'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('items_uncheck_all'),
    commandId: z.string().uuid(),
    listId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_create'),
    commandId: z.string().uuid(),
    title: z.string().trim().min(1),
    assigneeUserId: z.string().uuid().nullable(),
    recurrenceRule: routineRecurrenceRuleSchema,
    intervalDays: z.number().int().positive().nullable().optional(),
    intervalWeeks: z.number().int().min(2).max(12).nullable().optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional(),
    firstDueDate: z.string().datetime().nullable()
  }),
  z.object({
    kind: z.literal('routine_update'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1).optional(),
    assigneeUserId: z.string().uuid().nullable().optional(),
    recurrenceRule: routineRecurrenceRuleSchema.optional(),
    intervalDays: z.number().int().positive().nullable().optional(),
    intervalWeeks: z.number().int().min(2).max(12).nullable().optional(),
    weekdays: z.array(z.number().int().min(0).max(6)).nullable().optional()
  }),
  z.object({
    kind: z.literal('routine_complete'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_pause'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_resume'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_archive'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_restore'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_delete'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({ kind: z.literal('meal_plan_create'), commandId: z.string().uuid(), planId: z.string().uuid(), title: z.string().trim().min(1), weekStartDate: z.string() }),
  z.object({ kind: z.literal('meal_plan_title_update'), commandId: z.string().uuid(), planId: z.string().uuid(), expectedVersion: z.number().int().positive(), title: z.string().trim().min(1) }),
  z.object({ kind: z.literal('meal_plan_archive'), commandId: z.string().uuid(), planId: z.string().uuid(), expectedVersion: z.number().int().positive(), confirmed: z.literal(true) }),
  z.object({ kind: z.literal('meal_plan_restore'), commandId: z.string().uuid(), planId: z.string().uuid(), expectedVersion: z.number().int().positive() }),
  z.object({ kind: z.literal('meal_plan_delete'), commandId: z.string().uuid(), planId: z.string().uuid(), confirmed: z.literal(true) }),
  z.object({ kind: z.literal('meal_entry_add'), commandId: z.string().uuid(), planId: z.string().uuid(), entryId: z.string().uuid(), dayOfWeek: dayOfWeekSchema, name: z.string().trim().min(1) }),
  z.object({ kind: z.literal('meal_entry_name_update'), commandId: z.string().uuid(), planId: z.string().uuid(), entryId: z.string().uuid(), expectedVersion: z.number().int().positive(), name: z.string().trim().min(1) }),
  z.object({ kind: z.literal('meal_entry_items_update'), commandId: z.string().uuid(), planId: z.string().uuid(), entryId: z.string().uuid(), expectedVersion: z.number().int().positive(), shoppingItems: z.array(z.string()) }),
  z.object({ kind: z.literal('meal_entry_delete'), commandId: z.string().uuid(), planId: z.string().uuid(), entryId: z.string().uuid(), confirmed: z.literal(true) }),
  z.object({
    kind: z.literal('ritual_complete'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    occurrenceId: z.string().uuid(),
    provisionalReviewRecordId: z.string().uuid(),
    carryForwardNotes: z.string().max(2000).nullable(),
    recapNarrative: z.string().max(1000).nullable().optional(),
    overviewNarrative: z.string().max(1000).nullable().optional(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_skip'),
    commandId: z.string().uuid(),
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  })
]);

export type AssigneeUserId = z.infer<typeof assigneeUserIdSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type ParseConfidence = z.infer<typeof parseConfidenceSchema>;
export type ParserSource = z.infer<typeof parserSourceSchema>;
export type QuerySource = z.infer<typeof querySourceSchema>;
export type DraftItem = z.infer<typeof draftItemSchema>;
export type StructuredInput = z.infer<typeof structuredInputSchema>;
export type InboxItem = z.infer<typeof inboxItemSchema>;
export type HistoryEntry = z.infer<typeof historyEntrySchema>;
export type ItemFlags = z.infer<typeof itemFlagsSchema>;
export type Suggestion = z.infer<typeof suggestionSchema>;
export type ItemsByStatus = z.infer<typeof itemsByStatusSchema>;
export type InboxViewResponse = z.infer<typeof inboxViewResponseSchema>;
export type PreviewCreateRequest = z.infer<typeof previewCreateRequestSchema>;
export type PreviewCreateResponse = z.infer<typeof previewCreateResponseSchema>;
export type ConfirmCreateRequest = z.infer<typeof confirmCreateRequestSchema>;
export type ConfirmCreateResponse = z.infer<typeof confirmCreateResponseSchema>;
export type UpdateChange = z.infer<typeof updateChangeSchema>;
export type PreviewUpdateRequest = z.infer<typeof previewUpdateRequestSchema>;
export type PreviewUpdateResponse = z.infer<typeof previewUpdateResponseSchema>;
export type ConfirmUpdateRequest = z.infer<typeof confirmUpdateRequestSchema>;
export type ConfirmUpdateResponse = z.infer<typeof confirmUpdateResponseSchema>;
export type ItemDetailResponse = z.infer<typeof itemDetailResponseSchema>;
export type ReminderState = z.infer<typeof reminderStateSchema>;
export type RecurrenceCadence = z.infer<typeof recurrenceCadenceSchema>;
export type ReminderEventType = z.infer<typeof reminderEventTypeSchema>;
export type StructuredReminderInput = z.infer<typeof structuredReminderInputSchema>;
export type DraftReminder = z.infer<typeof draftReminderSchema>;
export type LinkedInboxSummary = z.infer<typeof linkedInboxSummarySchema>;
export type Reminder = z.infer<typeof reminderSchema>;
export type ReminderTimelineEntry = z.infer<typeof reminderTimelineEntrySchema>;
export type ReminderNotificationPreferencesInput = z.infer<typeof reminderNotificationPreferencesInputSchema>;
export type ReminderNotificationPreferences = z.infer<typeof reminderNotificationPreferencesSchema>;
export type RemindersByState = z.infer<typeof remindersByStateSchema>;
export type ReminderViewResponse = z.infer<typeof reminderViewResponseSchema>;
export type ReminderDetailResponse = z.infer<typeof reminderDetailResponseSchema>;
export type ReminderSettingsResponse = z.infer<typeof reminderSettingsResponseSchema>;
export type PreviewCreateReminderRequest = z.infer<typeof previewCreateReminderRequestSchema>;
export type PreviewCreateReminderResponse = z.infer<typeof previewCreateReminderResponseSchema>;
export type ConfirmCreateReminderRequest = z.infer<typeof confirmCreateReminderRequestSchema>;
export type ConfirmCreateReminderResponse = z.infer<typeof confirmCreateReminderResponseSchema>;
export type ReminderUpdateChange = z.infer<typeof reminderUpdateChangeSchema>;
export type PreviewUpdateReminderRequest = z.infer<typeof previewUpdateReminderRequestSchema>;
export type PreviewUpdateReminderResponse = z.infer<typeof previewUpdateReminderResponseSchema>;
export type ConfirmUpdateReminderRequest = z.infer<typeof confirmUpdateReminderRequestSchema>;
export type ConfirmUpdateReminderResponse = z.infer<typeof confirmUpdateReminderResponseSchema>;
export type ReminderMutationResponse = z.infer<typeof reminderMutationResponseSchema>;
export type CompleteReminderRequest = z.infer<typeof completeReminderRequestSchema>;
export type CompleteReminderResponse = z.infer<typeof completeReminderResponseSchema>;
export type SnoozeReminderRequest = z.infer<typeof snoozeReminderRequestSchema>;
export type SnoozeReminderResponse = z.infer<typeof snoozeReminderResponseSchema>;
export type CancelReminderRequest = z.infer<typeof cancelReminderRequestSchema>;
export type CancelReminderResponse = z.infer<typeof cancelReminderResponseSchema>;
export type SaveReminderNotificationPreferencesRequest = z.infer<typeof saveReminderNotificationPreferencesRequestSchema>;
export type SaveReminderNotificationPreferencesResponse = z.infer<typeof saveReminderNotificationPreferencesResponseSchema>;
export type NotificationSubscription = z.infer<typeof notificationSubscriptionSchema>;
export type SaveNotificationSubscriptionRequest = z.infer<typeof saveNotificationSubscriptionRequestSchema>;
export type SaveNotificationSubscriptionResponse = z.infer<typeof saveNotificationSubscriptionResponseSchema>;
export type OutboxCommand = z.infer<typeof outboxCommandSchema>;

// Shared Lists types
export type ListStatus = z.infer<typeof listStatusSchema>;
export type ListEventType = z.infer<typeof listEventTypeSchema>;
export type SharedList = z.infer<typeof sharedListSchema>;
export type ListItem = z.infer<typeof listItemSchema>;
export type ListItemHistoryEntry = z.infer<typeof listItemHistoryEntrySchema>;
export type ActiveListIndexResponse = z.infer<typeof activeListIndexResponseSchema>;
export type ArchivedListIndexResponse = z.infer<typeof archivedListIndexResponseSchema>;
export type ListDetailResponse = z.infer<typeof listDetailResponseSchema>;
export type CreateListRequest = z.infer<typeof createListRequestSchema>;
export type UpdateListTitleRequest = z.infer<typeof updateListTitleRequestSchema>;
export type ArchiveListRequest = z.infer<typeof archiveListRequestSchema>;
export type RestoreListRequest = z.infer<typeof restoreListRequestSchema>;
export type DeleteListRequest = z.infer<typeof deleteListRequestSchema>;
export type AddListItemRequest = z.infer<typeof addListItemRequestSchema>;
export type UpdateListItemBodyRequest = z.infer<typeof updateListItemBodyRequestSchema>;
export type CheckListItemRequest = z.infer<typeof checkListItemRequestSchema>;
export type UncheckListItemRequest = z.infer<typeof uncheckListItemRequestSchema>;
export type RemoveListItemRequest = z.infer<typeof removeListItemRequestSchema>;
export type ClearCompletedItemsRequest = z.infer<typeof clearCompletedItemsRequestSchema>;
export type UncheckAllItemsRequest = z.infer<typeof uncheckAllItemsRequestSchema>;
export type BulkListActionResponse = z.infer<typeof bulkListActionResponseSchema>;
export type ListMutationResponse = z.infer<typeof listMutationResponseSchema>;
export type ListItemMutationResponse = z.infer<typeof listItemMutationResponseSchema>;

// Recurring Routines types
export type RoutineStatus = z.infer<typeof routineStatusSchema>;
export type RoutineDueState = z.infer<typeof routineDueStateSchema>;
export type RoutineRecurrenceRule = z.infer<typeof routineRecurrenceRuleSchema>;
export type RoutineEventType = z.infer<typeof routineEventTypeSchema>;
export type Routine = z.infer<typeof routineSchema>;
export type RoutineOccurrence = z.infer<typeof routineOccurrenceSchema>;
export type ActiveRoutineIndexResponse = z.infer<typeof activeRoutineIndexResponseSchema>;
export type ArchivedRoutineIndexResponse = z.infer<typeof archivedRoutineIndexResponseSchema>;
export type RoutineDetailResponse = z.infer<typeof routineDetailResponseSchema>;
export type CreateRoutineRequest = z.infer<typeof createRoutineRequestSchema>;
export type UpdateRoutineRequest = z.infer<typeof updateRoutineRequestSchema>;
export type CompleteRoutineOccurrenceRequest = z.infer<typeof completeRoutineOccurrenceRequestSchema>;
export type PauseRoutineRequest = z.infer<typeof pauseRoutineRequestSchema>;
export type ResumeRoutineRequest = z.infer<typeof resumeRoutineRequestSchema>;
export type ArchiveRoutineRequest = z.infer<typeof archiveRoutineRequestSchema>;
export type RestoreRoutineRequest = z.infer<typeof restoreRoutineRequestSchema>;
export type DeleteRoutineRequest = z.infer<typeof deleteRoutineRequestSchema>;
export type RoutineMutationResponse = z.infer<typeof routineMutationResponseSchema>;
export type CompleteRoutineOccurrenceResponse = z.infer<typeof completeRoutineOccurrenceResponseSchema>;
export type DeleteRoutineResponse = z.infer<typeof deleteRoutineResponseSchema>;

// Meal Planning types
export type MealPlanStatus = z.infer<typeof mealPlanStatusSchema>;
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;
export type MealPlanEventType = z.infer<typeof mealPlanEventTypeSchema>;
export type GeneratedListRef = z.infer<typeof generatedListRefSchema>;
export type MealPlan = z.infer<typeof mealPlanSchema>;
export type MealEntry = z.infer<typeof mealEntrySchema>;
export type MealPlanIndexResponse = z.infer<typeof mealPlanIndexResponseSchema>;
export type MealPlanDetailResponse = z.infer<typeof mealPlanDetailResponseSchema>;
export type CreateMealPlanRequest = z.infer<typeof createMealPlanRequestSchema>;
export type UpdateMealPlanTitleRequest = z.infer<typeof updateMealPlanTitleRequestSchema>;
export type ArchiveMealPlanRequest = z.infer<typeof archiveMealPlanRequestSchema>;
export type RestoreMealPlanRequest = z.infer<typeof restoreMealPlanRequestSchema>;
export type DeleteMealPlanRequest = z.infer<typeof deleteMealPlanRequestSchema>;
export type AddMealEntryRequest = z.infer<typeof addMealEntryRequestSchema>;
export type UpdateMealEntryRequest = z.infer<typeof updateMealEntryRequestSchema>;
export type DeleteMealEntryRequest = z.infer<typeof deleteMealEntryRequestSchema>;
export type GenerateGroceryListResponse = z.infer<typeof generateGroceryListResponseSchema>;

// Unified Weekly View types
export type WeeklyRoutineOccurrence = z.infer<typeof weeklyRoutineOccurrenceSchema>;
export type WeeklyReminder = z.infer<typeof weeklyReminderSchema>;
export type WeeklyMealEntry = z.infer<typeof weeklyMealEntrySchema>;
export type WeeklyInboxItem = z.infer<typeof weeklyInboxItemSchema>;
export type WeeklyDayView = z.infer<typeof weeklyDaySchema>;
export type WeeklyViewResponse = z.infer<typeof weeklyViewResponseSchema>;

// ─── Activity History ─────────────────────────────────────────────────────────

export const activityHistoryRoutineItemSchema = z.object({
  type: z.literal('routine'),
  routineId: z.string().uuid(),
  routineTitle: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  dueDate: z.string(),        // ISO date, YYYY-MM-DD
  completedAt: z.string().datetime(),
  reviewRecordId: z.string().uuid().nullable().optional()  // populated for planning ritual completions
});

export const activityHistoryReminderItemSchema = z.object({
  type: z.literal('reminder'),
  reminderId: z.string().uuid(),
  title: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  resolvedAt: z.string().datetime(),
  resolution: z.enum(['completed', 'dismissed'])
});

export const activityHistoryMealItemSchema = z.object({
  type: z.literal('meal'),
  entryId: z.string().uuid(),
  planId: z.string().uuid(),
  planTitle: z.string(),
  name: z.string(),
  dayOfWeek: dayOfWeekSchema,
  date: z.string()            // ISO date, YYYY-MM-DD (weekStartDate + dayOfWeek)
});

export const activityHistoryInboxItemSchema = z.object({
  type: z.literal('inbox'),
  itemId: z.string().uuid(),
  title: z.string(),
  assigneeUserId: z.string().uuid().nullable(),
  completedAt: z.string().datetime()
});

export const activityHistoryListItemSchema = z.object({
  type: z.literal('listItem'),
  itemId: z.string().uuid(),
  body: z.string(),
  listId: z.string().uuid(),
  listName: z.string(),
  checkedAt: z.string().datetime()
});

export const activityHistoryItemSchema = z.discriminatedUnion('type', [
  activityHistoryRoutineItemSchema,
  activityHistoryReminderItemSchema,
  activityHistoryMealItemSchema,
  activityHistoryInboxItemSchema,
  activityHistoryListItemSchema
]);

export const activityHistoryDaySchema = z.object({
  date: z.string(),           // ISO date YYYY-MM-DD (most recent first)
  items: z.array(activityHistoryItemSchema)
});

export const activityHistoryResponseSchema = z.object({
  windowStart: z.string(),    // ISO date YYYY-MM-DD
  windowEnd: z.string(),      // ISO date YYYY-MM-DD
  days: z.array(activityHistoryDaySchema)
});

// Activity History types
export type ActivityHistoryRoutineItem = z.infer<typeof activityHistoryRoutineItemSchema>;
export type ActivityHistoryReminderItem = z.infer<typeof activityHistoryReminderItemSchema>;
export type ActivityHistoryMealItem = z.infer<typeof activityHistoryMealItemSchema>;
export type ActivityHistoryInboxItem = z.infer<typeof activityHistoryInboxItemSchema>;
export type ActivityHistoryListItem = z.infer<typeof activityHistoryListItemSchema>;
export type ActivityHistoryItem = z.infer<typeof activityHistoryItemSchema>;
export type ActivityHistoryDay = z.infer<typeof activityHistoryDaySchema>;
export type ActivityHistoryResponse = z.infer<typeof activityHistoryResponseSchema>;

// ─── Planning Ritual Support ───────────────────────────────────────────────────

export const ritualSummaryResponseSchema = z.object({
  recapDraft: z.string().nullable(),      // null if AI failed for this section
  overviewDraft: z.string().nullable()    // null if AI failed for this section
});

export type RitualSummaryResponse = z.infer<typeof ritualSummaryResponseSchema>;

export const reviewRecordSchema = z.object({
  id: z.string().uuid(),
  ritualOccurrenceId: z.string().uuid(),
  reviewDate: z.string(),                    // ISO date YYYY-MM-DD
  lastWeekWindowStart: z.string(),           // ISO date YYYY-MM-DD
  lastWeekWindowEnd: z.string(),             // ISO date YYYY-MM-DD
  currentWeekWindowStart: z.string(),        // ISO date YYYY-MM-DD
  currentWeekWindowEnd: z.string(),          // ISO date YYYY-MM-DD
  carryForwardNotes: z.string().nullable(),
  completedAt: z.string().datetime(),
  completedByUserId: optionalUserId,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  pendingSync: z.boolean().optional(),
  recapNarrative: z.string().nullable().optional(),        // null = dismissed or not yet featured
  overviewNarrative: z.string().nullable().optional(),     // null = dismissed or not yet featured
  aiGenerationUsed: z.boolean().optional()                 // true = generation endpoint was called
});

export const completeRitualRequestSchema = z.object({

  occurrenceId: z.string().uuid(),
  carryForwardNotes: z.string().max(2000).nullable(),
  recapNarrative: z.string().max(1000).nullable().optional(),
  overviewNarrative: z.string().max(1000).nullable().optional()
});

export const completeRitualResponseSchema = z.object({
  reviewRecordId: z.string().uuid(),
  reviewDate: z.string(),              // ISO date YYYY-MM-DD
  nextOccurrenceDueDate: z.string()    // ISO datetime
});

// Planning Ritual types
export type RitualType = z.infer<typeof ritualTypeSchema>;
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;
export type CompleteRitualRequest = z.infer<typeof completeRitualRequestSchema>;
export type CompleteRitualResponse = z.infer<typeof completeRitualResponseSchema>;

// ─── Proactive Household Nudges ───────────────────────────────────────────────

export const NUDGE_APPROACHING_THRESHOLD_HOURS = 24;
export const NUDGE_SNOOZE_INTERVAL_HOURS = 1;
export const NUDGE_MAX_DISPLAY_COUNT = 5;

export const nudgeEntityTypeSchema = z.enum(['routine', 'reminder', 'planningRitual', 'freshness']);
export type NudgeEntityType = z.infer<typeof nudgeEntityTypeSchema>;

export const freshnessEntitySubTypeSchema = z.enum(['inbox', 'routine', 'reminder', 'list']);
export type FreshnessEntitySubType = z.infer<typeof freshnessEntitySubTypeSchema>;

export const FRESHNESS_NUDGE_MAX_PER_DAY = 2;

export const nudgeSchema = z.object({
  entityType: nudgeEntityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string(),
  triggerReason: z.string(),
  overdueSince: z.string().nullable(),    // YYYY-MM-DD, for overdue items; null for approaching-only
  dueAt: z.string().datetime().nullable(), // ISO datetime for approaching reminders; null otherwise
  entitySubType: freshnessEntitySubTypeSchema.optional() // workflow type for freshness nudges
});

export const nudgesResponseSchema = z.object({
  nudges: z.array(nudgeSchema)
});

export type Nudge = z.infer<typeof nudgeSchema>;
export type NudgesResponse = z.infer<typeof nudgesResponseSchema>;

export const skipRoutineOccurrenceRequestSchema = z.object({

  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const skipRoutineOccurrenceResponseSchema = z.object({
  savedRoutine: routineSchema,
  occurrence: routineOccurrenceSchema,
  newVersion: z.number().int().positive()
});

export type SkipRoutineOccurrenceRequest = z.infer<typeof skipRoutineOccurrenceRequestSchema>;
export type SkipRoutineOccurrenceResponse = z.infer<typeof skipRoutineOccurrenceResponseSchema>;

// ─── Completion Window Constants (H5 Phase 2 Layer 1) ────────────────────────
export const COMPLETION_WINDOW_MIN_OCCURRENCES = 4;
export const COMPLETION_WINDOW_SAMPLE_SIZE = 8;
export const COMPLETION_WINDOW_LEAD_BUFFER_HOURS = 1;
export const COMPLETION_WINDOW_VARIANCE_THRESHOLD_HOURS = 6;
export const COMPLETION_WINDOW_MAX_HOLD_DAYS = 2;

export const completionWindowResultSchema = z.discriminatedUnion('decision', [
  z.object({ decision: z.literal('hold'), windowStartHour: z.number(), windowEndHour: z.number() }),
  z.object({ decision: z.literal('deliver'), windowStartHour: z.number(), windowEndHour: z.number() }),
  z.object({ decision: z.literal('no_window'), reason: z.enum(['insufficient_data', 'high_variance']) }),
]);
export type CompletionWindowResult = z.infer<typeof completionWindowResultSchema>;

// ─── Chat Contracts (OLI-100) ─────────────────────────────────────────────────

export const chatMessageRoleSchema = z.enum(['user', 'assistant']);

export const chatToolCallStatusSchema = z.enum(['pending', 'confirmed', 'dismissed']);

export const chatToolCallTypeSchema = z.enum([
  'create_inbox_item',
  'create_reminder',
  'add_list_item',
  'create_meal_entry',
  'complete_routine',
  'skip_routine',
  'create_routine',
  'create_shared_list'
]);

export const conversationTypeSchema = z.enum(['general', 'onboarding']);

export const chatToolCallSchema = z.object({
  id: z.string().uuid(),
  type: chatToolCallTypeSchema,
  data: z.record(z.string(), z.unknown()),
  status: chatToolCallStatusSchema
});

export const chatMessageSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  role: chatMessageRoleSchema,
  content: z.string(),
  toolCalls: z.array(chatToolCallSchema).nullable(),
  createdAt: z.string().datetime()
});

export const conversationSchema = z.object({
  id: z.string().uuid(),
  type: conversationTypeSchema,
  userId: optionalUserId,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const sendChatMessageRequestSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});

export const chatConversationResponseSchema = z.object({
  conversationId: z.string().uuid(),
  messages: z.array(chatMessageSchema),
  hasMore: z.boolean()
});

export const chatConversationQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).default(50),
  before: z.string().uuid().optional()
});

export const chatClearResponseSchema = z.object({
  cleared: z.literal(true)
});

export const chatActionConfirmResponseSchema = z.object({
  result: z.record(z.string(), z.unknown())
});

export const chatActionDismissResponseSchema = z.object({
  dismissed: z.literal(true)
});

export type ChatMessageRole = z.infer<typeof chatMessageRoleSchema>;
export type ChatToolCallStatus = z.infer<typeof chatToolCallStatusSchema>;
export type ChatToolCallType = z.infer<typeof chatToolCallTypeSchema>;
export type ChatToolCall = z.infer<typeof chatToolCallSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type SendChatMessageRequest = z.infer<typeof sendChatMessageRequestSchema>;
export type ChatConversationResponse = z.infer<typeof chatConversationResponseSchema>;
export type ChatConversationQuery = z.infer<typeof chatConversationQuerySchema>;
export type ChatClearResponse = z.infer<typeof chatClearResponseSchema>;
export type ChatActionConfirmResponse = z.infer<typeof chatActionConfirmResponseSchema>;
export type ChatActionDismissResponse = z.infer<typeof chatActionDismissResponseSchema>;

// ─── Onboarding Contracts (OLI-119) ──────────────────────────────────────────

export const onboardingTopicSchema = z.enum([
  'tasks',
  'routines',
  'reminders',
  'lists',
  'meals'
]);

export const onboardingSessionStatusSchema = z.enum([
  'started',
  'finished'
]);

export const onboardingSessionSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  status: onboardingSessionStatusSchema,
  topicsCompleted: z.array(onboardingTopicSchema),
  currentTopic: onboardingTopicSchema.nullable(),
  entitiesCreated: z.number().int().min(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const onboardingStateResponseSchema = z.object({
  needsOnboarding: z.boolean(),
  session: onboardingSessionSchema.nullable(),
  entityCount: z.number().int().min(0)
});

export const ONBOARDING_ENTITY_THRESHOLD = 2;

export const ONBOARDING_TOPICS: readonly OnboardingTopic[] = [
  'tasks',
  'routines',
  'reminders',
  'lists',
  'meals'
] as const;

export type ConversationType = z.infer<typeof conversationTypeSchema>;
export type OnboardingTopic = z.infer<typeof onboardingTopicSchema>;
export type OnboardingSessionStatus = z.infer<typeof onboardingSessionStatusSchema>;
export type OnboardingSession = z.infer<typeof onboardingSessionSchema>;
export type OnboardingStateResponse = z.infer<typeof onboardingStateResponseSchema>;

// ─── Data Freshness (Phase 2) ─────────────────────────────────────────────────

export const staleItemEntityTypeSchema = z.enum(['inbox', 'routine', 'reminder', 'list', 'mealPlan']);
export type StaleItemEntityType = z.infer<typeof staleItemEntityTypeSchema>;

export const archivableEntityTypeSchema = z.enum(['inbox', 'routine', 'reminder', 'list']);
export type ArchivableEntityType = z.infer<typeof archivableEntityTypeSchema>;

export const staleItemSchema = z.object({
  entityType: staleItemEntityTypeSchema,
  entityId: z.string().uuid(),
  entityName: z.string(),
  lastActivityAt: z.string().datetime(),
  lastActivityDescription: z.string()
});

export const staleItemsResponseSchema = z.object({
  items: z.array(staleItemSchema),
  totalStaleCount: z.number().int().nonnegative()
});

export const freshnessConfirmRequestSchema = z.object({
  entityType: staleItemEntityTypeSchema,
  entityId: z.string().uuid(),

  expectedVersion: z.number().int().positive()
});

export const freshnessArchiveRequestSchema = z.object({
  entityType: archivableEntityTypeSchema,
  entityId: z.string().uuid(),

  expectedVersion: z.number().int().positive()
});

export const freshnessConfirmResponseSchema = z.object({
  newVersion: z.number().int().positive()
});

export const freshnessArchiveResponseSchema = z.object({
  newVersion: z.number().int().positive()
});

export const healthCheckStateSchema = z.object({
  lastCompletedAt: z.string().datetime().nullable(),
  lastDismissedAt: z.string().datetime().nullable(),
  shouldShow: z.boolean()
});

export type StaleItem = z.infer<typeof staleItemSchema>;
export type StaleItemsResponse = z.infer<typeof staleItemsResponseSchema>;
export type FreshnessConfirmRequest = z.infer<typeof freshnessConfirmRequestSchema>;
export type FreshnessArchiveRequest = z.infer<typeof freshnessArchiveRequestSchema>;
export type HealthCheckState = z.infer<typeof healthCheckStateSchema>;

// ─── Auth & Identity (M32) ───────────────────────────────────────────

export const userRoleSchema = z.enum(['admin', 'member']);

export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1),
  email: z.string().email(),
  householdId: z.string(),
  role: userRoleSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const authUserSchema = z.object({
  userId: z.string().uuid(),
  householdId: z.string(),
  role: userRoleSchema,
  name: z.string(),
  email: z.string().email()
});

export const requestMagicLinkRequestSchema = z.object({
  email: z.string().email()
});

export const requestMagicLinkResponseSchema = z.object({
  sent: z.boolean(),
  message: z.string()
});

export const verifyMagicLinkRequestSchema = z.object({
  token: z.string().min(1)
});

export const verifyMagicLinkResponseSchema = z.object({
  user: userSchema,
  sessionToken: z.string()
});

export const setupAccountRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254)
});

export const setupAccountResponseSchema = z.object({
  user: userSchema,
  sessionToken: z.string(),
  magicLinkSent: z.boolean(),
  message: z.string()
});

export const setPinRequestSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits')
});

export const setPinResponseSchema = z.object({
  ok: z.boolean()
});

export const verifyPinRequestSchema = z.object({
  userId: z.string().uuid(),
  pin: z.string().regex(/^\d{4,6}$/)
});

export const verifyPinResponseSchema = z.object({
  user: userSchema,
  sessionToken: z.string()
});

export const authMeResponseSchema = z.object({
  user: userSchema
});

export const generateInviteRequestSchema = z.object({
  email: z.string().email().optional()
});

export const generateInviteResponseSchema = z.object({
  code: z.string(),
  expiresAt: z.string().datetime()
});

export const claimInviteRequestSchema = z.object({
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  email: z.string().email().max(254)
});

export const claimInviteResponseSchema = z.object({
  user: userSchema,
  sessionToken: z.string(),
  magicLinkSent: z.boolean(),
  message: z.string()
});

export const householdMembersResponseSchema = z.object({
  members: z.array(userSchema),
  pendingInvitations: z.array(z.object({
    id: z.string().uuid(),
    code: z.string(),
    email: z.string().email().nullable(),
    status: z.enum(['pending', 'claimed', 'expired']),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime()
  }))
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type User = z.infer<typeof userSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type RequestMagicLinkRequest = z.infer<typeof requestMagicLinkRequestSchema>;
export type RequestMagicLinkResponse = z.infer<typeof requestMagicLinkResponseSchema>;
export type VerifyMagicLinkRequest = z.infer<typeof verifyMagicLinkRequestSchema>;
export type VerifyMagicLinkResponse = z.infer<typeof verifyMagicLinkResponseSchema>;
export type SetupAccountRequest = z.infer<typeof setupAccountRequestSchema>;
export type SetupAccountResponse = z.infer<typeof setupAccountResponseSchema>;
export type SetPinRequest = z.infer<typeof setPinRequestSchema>;
export type VerifyPinRequest = z.infer<typeof verifyPinRequestSchema>;
export type AuthMeResponse = z.infer<typeof authMeResponseSchema>;
export type GenerateInviteRequest = z.infer<typeof generateInviteRequestSchema>;
export type GenerateInviteResponse = z.infer<typeof generateInviteResponseSchema>;
export type ClaimInviteRequest = z.infer<typeof claimInviteRequestSchema>;
export type ClaimInviteResponse = z.infer<typeof claimInviteResponseSchema>;
export type HouseholdMembersResponse = z.infer<typeof householdMembersResponseSchema>;

// ── Feedback ──────────────────────────────────────────────────────────

export const feedbackCategorySchema = z.enum(['bug', 'feature_request', 'general']);
export const feedbackStatusSchema = z.enum(['new', 'acknowledged', 'resolved']);

export const feedbackContextSchema = z.object({
  route: z.string(),
  appVersion: z.string(),
  deviceInfo: z.string(),
  recentErrors: z.array(z.string()).max(3).default([])
});

export const feedbackItemSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  userId: z.string(),
  category: feedbackCategorySchema,
  description: z.string().min(10),
  contextJson: feedbackContextSchema,
  screenshotBase64: z.string().nullable(),
  status: feedbackStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const submitFeedbackRequestSchema = z.object({
  category: feedbackCategorySchema.default('bug'),
  description: z.string().trim().min(10),
  context: feedbackContextSchema,
  screenshotBase64: z.string().nullable().optional()
});

export const submitFeedbackResponseSchema = z.object({
  feedback: feedbackItemSchema
});

export const listFeedbackResponseSchema = z.object({
  items: z.array(feedbackItemSchema)
});

export const updateFeedbackRequestSchema = z.object({
  status: feedbackStatusSchema
});

export const updateFeedbackResponseSchema = z.object({
  feedback: feedbackItemSchema
});

export type FeedbackCategory = z.infer<typeof feedbackCategorySchema>;
export type FeedbackStatus = z.infer<typeof feedbackStatusSchema>;
export type FeedbackContext = z.infer<typeof feedbackContextSchema>;
export type FeedbackItem = z.infer<typeof feedbackItemSchema>;
export type SubmitFeedbackRequest = z.infer<typeof submitFeedbackRequestSchema>;
export type SubmitFeedbackResponse = z.infer<typeof submitFeedbackResponseSchema>;
export type ListFeedbackResponse = z.infer<typeof listFeedbackResponseSchema>;
export type UpdateFeedbackRequest = z.infer<typeof updateFeedbackRequestSchema>;
export type UpdateFeedbackResponse = z.infer<typeof updateFeedbackResponseSchema>;

// ── Automation Rules ──────────────────────────────────────────────────

export const automationTriggerTypeSchema = z.enum([
  'routine_overdue_days',
  'reminder_snooze_count',
  'reminder_overdue_days'
]);

export const automationActionTypeSchema = z.enum([
  'skip_routine_occurrence',
  'resolve_reminder',
  'snooze_reminder'
]);

export const automationScopeTypeSchema = z.enum(['all', 'specific']);

export const automationRuleSchema = z.object({
  id: z.string(),
  householdId: z.string(),
  userId: z.string(),
  triggerType: automationTriggerTypeSchema,
  triggerThreshold: z.number().int().min(1),
  actionType: automationActionTypeSchema,
  scopeType: automationScopeTypeSchema,
  scopeEntityId: z.string().nullable(),
  enabled: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const automationLogEntrySchema = z.object({
  id: z.string(),
  ruleId: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  actionType: automationActionTypeSchema,
  executedAt: z.string().datetime(),
  userId: z.string()
});

export const createAutomationRuleRequestSchema = z.object({
  triggerType: automationTriggerTypeSchema,
  triggerThreshold: z.number().int().min(1),
  actionType: automationActionTypeSchema,
  scopeType: automationScopeTypeSchema.default('all'),
  scopeEntityId: z.string().nullable().optional()
});

export const createAutomationRuleResponseSchema = z.object({
  rule: automationRuleSchema
});

export const listAutomationRulesResponseSchema = z.object({
  rules: z.array(automationRuleSchema)
});

export const updateAutomationRuleRequestSchema = z.object({
  enabled: z.boolean().optional(),
  triggerThreshold: z.number().int().min(1).optional(),
  scopeType: automationScopeTypeSchema.optional(),
  scopeEntityId: z.string().nullable().optional()
});

export const updateAutomationRuleResponseSchema = z.object({
  rule: automationRuleSchema
});

export const listAutomationLogResponseSchema = z.object({
  entries: z.array(automationLogEntrySchema)
});

export const AUTOMATION_RULES_MAX_PER_HOUSEHOLD = 20;
export const AUTOMATION_LOG_RETENTION_DAYS = 30;

export type AutomationTriggerType = z.infer<typeof automationTriggerTypeSchema>;
export type AutomationActionType = z.infer<typeof automationActionTypeSchema>;
export type AutomationScopeType = z.infer<typeof automationScopeTypeSchema>;
export type AutomationRule = z.infer<typeof automationRuleSchema>;
export type AutomationLogEntry = z.infer<typeof automationLogEntrySchema>;
export type CreateAutomationRuleRequest = z.infer<typeof createAutomationRuleRequestSchema>;
export type CreateAutomationRuleResponse = z.infer<typeof createAutomationRuleResponseSchema>;
export type ListAutomationRulesResponse = z.infer<typeof listAutomationRulesResponseSchema>;
export type UpdateAutomationRuleRequest = z.infer<typeof updateAutomationRuleRequestSchema>;
export type UpdateAutomationRuleResponse = z.infer<typeof updateAutomationRuleResponseSchema>;
export type ListAutomationLogResponse = z.infer<typeof listAutomationLogResponseSchema>;
