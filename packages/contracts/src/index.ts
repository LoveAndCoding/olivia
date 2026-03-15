import { z } from 'zod';

export const actorRoleSchema = z.enum(['stakeholder', 'spouse']);
export const ownerSchema = z.enum(['stakeholder', 'spouse', 'unassigned']);
export const itemStatusSchema = z.enum(['open', 'in_progress', 'done', 'deferred']);
export const parseConfidenceSchema = z.enum(['high', 'medium', 'low']);
export const parserSourceSchema = z.enum(['ai', 'rules']);
export const querySourceSchema = z.enum(['server', 'cache']);
export const suggestionTypeSchema = z.enum(['overdue', 'stale', 'unassigned', 'due_soon']);
export const eventTypeSchema = z.enum([
  'created',
  'status_changed',
  'owner_changed',
  'due_changed',
  'description_changed',
  'note_added'
]);

export const structuredInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable().optional(),
  owner: ownerSchema.default('unassigned'),
  status: itemStatusSchema.default('open'),
  dueText: z.string().trim().min(1).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional()
});

export const draftItemSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1).nullable(),
  owner: ownerSchema,
  status: itemStatusSchema,
  dueText: z.string().trim().min(1).nullable(),
  dueAt: z.string().datetime().nullable()
});

export const inboxItemSchema = draftItemSchema.extend({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  version: z.number().int().positive(),
  lastStatusChangedAt: z.string().datetime(),
  lastNoteAt: z.string().datetime().nullable(),
  archivedAt: z.string().datetime().nullable(),
  pendingSync: z.boolean().optional()
});

export const historyEntrySchema = z.object({
  id: z.string().uuid(),
  itemId: z.string().uuid(),
  actorRole: z.enum(['stakeholder', 'system_rule']),
  eventType: eventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
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
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
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
  owner: ownerSchema.optional(),
  dueText: z.string().trim().min(1).nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  description: z.string().trim().min(1).nullable().optional(),
  note: z.string().trim().min(1).optional()
});

export const previewUpdateRequestSchema = z.object({
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
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
  owner: ownerSchema.default('unassigned'),
  scheduledAt: z.string().datetime(),
  recurrenceCadence: recurrenceCadenceSchema.default('none'),
  linkedInboxItemId: z.string().uuid().nullable().optional()
});

export const draftReminderSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  note: z.string().trim().min(1).nullable(),
  owner: ownerSchema,
  scheduledAt: z.string().datetime(),
  recurrenceCadence: recurrenceCadenceSchema,
  linkedInboxItemId: z.string().uuid().nullable()
});

export const linkedInboxSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  status: itemStatusSchema,
  owner: ownerSchema,
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
  pendingSync: z.boolean().optional()
});

export const reminderTimelineEntrySchema = z.object({
  id: z.string().uuid(),
  reminderId: z.string().uuid(),
  actorRole: z.enum(['stakeholder', 'system_rule']),
  eventType: reminderEventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  createdAt: z.string().datetime()
});

export const reminderNotificationPreferencesInputSchema = z.object({
  enabled: z.boolean(),
  dueRemindersEnabled: z.boolean(),
  dailySummaryEnabled: z.boolean()
});

export const reminderNotificationPreferencesSchema = reminderNotificationPreferencesInputSchema.extend({
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
  draftId: z.string().uuid().optional(),
  approved: z.literal(true),
  finalReminder: draftReminderSchema
});

export const reminderUpdateChangeSchema = z.object({
  title: z.string().trim().min(1).optional(),
  note: z.string().trim().min(1).nullable().optional(),
  owner: ownerSchema.optional(),
  scheduledAt: z.string().datetime().optional(),
  recurrenceCadence: recurrenceCadenceSchema.optional()
});

export const previewUpdateReminderRequestSchema = z.object({
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
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
  actorRole: actorRoleSchema,
  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true)
});

export const snoozeReminderRequestSchema = z.object({
  actorRole: actorRoleSchema,
  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true),
  snoozedUntil: z.string().datetime()
});

export const cancelReminderRequestSchema = z.object({
  actorRole: actorRoleSchema,
  reminderId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  approved: z.literal(true)
});

export const saveReminderNotificationPreferencesRequestSchema = z.object({
  actorRole: actorRoleSchema,
  preferences: reminderNotificationPreferencesInputSchema
});

export const saveReminderNotificationPreferencesResponseSchema = reminderSettingsResponseSchema;

export const notificationSubscriptionSchema = z.object({
  id: z.string().uuid(),
  actorRole: actorRoleSchema,
  endpoint: z.string().url(),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().datetime()
});

export const saveNotificationSubscriptionRequestSchema = z.object({
  actorRole: actorRoleSchema,
  endpoint: z.string().url(),
  payload: z.record(z.string(), z.unknown())
});

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
  'item_removed'
]);

export const sharedListSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  owner: actorRoleSchema,
  status: listStatusSchema,
  activeItemCount: z.number().int().nonnegative(),
  checkedItemCount: z.number().int().nonnegative(),
  allChecked: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
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
  actorRole: actorRoleSchema,
  eventType: listEventTypeSchema,
  fromValue: z.unknown().nullable(),
  toValue: z.unknown().nullable(),
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
  actorRole: actorRoleSchema,
  title: z.string().trim().min(1)
});

export const updateListTitleRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1)
});

export const archiveListRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const restoreListRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const deleteListRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  confirmed: z.literal(true)
});

export const addListItemRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  body: z.string().trim().min(1)
});

export const updateListItemBodyRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  body: z.string().trim().min(1)
});

export const checkListItemRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const uncheckListItemRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const removeListItemRequestSchema = z.object({
  actorRole: actorRoleSchema,
  listId: z.string().uuid(),
  itemId: z.string().uuid(),
  confirmed: z.literal(true)
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
export const routineRecurrenceRuleSchema = z.enum(['daily', 'weekly', 'monthly', 'every_n_days']);

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

export const routineSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1),
  owner: ownerSchema,
  recurrenceRule: routineRecurrenceRuleSchema,
  intervalDays: z.number().int().positive().nullable(),
  status: routineStatusSchema,
  currentDueDate: z.string().datetime(),
  dueState: routineDueStateSchema.optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable(),
  version: z.number().int().positive(),
  pendingSync: z.boolean().optional()
}).refine(
  (r) => r.recurrenceRule !== 'every_n_days' || (r.intervalDays !== null && r.intervalDays > 0),
  { message: 'intervalDays must be a positive integer when recurrenceRule is every_n_days' }
);

export const routineOccurrenceSchema = z.object({
  id: z.string().uuid(),
  routineId: z.string().uuid(),
  dueDate: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  completedBy: ownerSchema.nullable(),
  skipped: z.boolean(),
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
  actorRole: actorRoleSchema,
  title: z.string().trim().min(1),
  owner: ownerSchema,
  recurrenceRule: routineRecurrenceRuleSchema,
  intervalDays: z.number().int().positive().nullable().optional(),
  firstDueDate: z.string().datetime()
}).refine(
  (r) => r.recurrenceRule !== 'every_n_days' || (r.intervalDays !== null && r.intervalDays !== undefined && r.intervalDays > 0),
  { message: 'intervalDays must be a positive integer when recurrenceRule is every_n_days' }
);

export const updateRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  title: z.string().trim().min(1).optional(),
  owner: ownerSchema.optional(),
  recurrenceRule: routineRecurrenceRuleSchema.optional(),
  intervalDays: z.number().int().positive().nullable().optional()
});

export const completeRoutineOccurrenceRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const pauseRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const resumeRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const archiveRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive(),
  confirmed: z.literal(true)
});

export const restoreRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
  routineId: z.string().uuid(),
  expectedVersion: z.number().int().positive()
});

export const deleteRoutineRequestSchema = z.object({
  actorRole: actorRoleSchema,
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

export const outboxCommandSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('create'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    finalItem: draftItemSchema,
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('update'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    proposedChange: updateChangeSchema
  }),
  z.object({
    kind: z.literal('reminder_create'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    approved: z.literal(true),
    finalReminder: draftReminderSchema
  }),
  z.object({
    kind: z.literal('reminder_update'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    proposedChange: reminderUpdateChangeSchema
  }),
  z.object({
    kind: z.literal('reminder_complete'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('reminder_snooze'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true),
    snoozedUntil: z.string().datetime()
  }),
  z.object({
    kind: z.literal('reminder_cancel'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    reminderId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    approved: z.literal(true)
  }),
  z.object({
    kind: z.literal('list_create'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    title: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('list_title_update'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('list_archive'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('list_restore'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('list_delete'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('item_add'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    body: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('item_body_update'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    body: z.string().trim().min(1)
  }),
  z.object({
    kind: z.literal('item_check'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('item_uncheck'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('item_remove'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    listId: z.string().uuid(),
    itemId: z.string().uuid(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_create'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    title: z.string().trim().min(1),
    owner: ownerSchema,
    recurrenceRule: routineRecurrenceRuleSchema,
    intervalDays: z.number().int().positive().nullable().optional(),
    firstDueDate: z.string().datetime()
  }),
  z.object({
    kind: z.literal('routine_update'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    title: z.string().trim().min(1).optional(),
    owner: ownerSchema.optional(),
    recurrenceRule: routineRecurrenceRuleSchema.optional(),
    intervalDays: z.number().int().positive().nullable().optional()
  }),
  z.object({
    kind: z.literal('routine_complete'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_pause'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_resume'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_archive'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive(),
    confirmed: z.literal(true)
  }),
  z.object({
    kind: z.literal('routine_restore'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    expectedVersion: z.number().int().positive()
  }),
  z.object({
    kind: z.literal('routine_delete'),
    commandId: z.string().uuid(),
    actorRole: actorRoleSchema,
    routineId: z.string().uuid(),
    confirmed: z.literal(true)
  })
]);

export type ActorRole = z.infer<typeof actorRoleSchema>;
export type Owner = z.infer<typeof ownerSchema>;
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
