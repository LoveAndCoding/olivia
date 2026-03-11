import { z } from 'zod';

export const actorRoleSchema = z.enum(['stakeholder', 'spouse']);
export const ownerSchema = z.enum(['stakeholder', 'spouse', 'unassigned']);
export const itemStatusSchema = z.enum(['open', 'in_progress', 'done', 'deferred']);
export const parseConfidenceSchema = z.enum(['high', 'medium', 'low']);
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
  source: z.enum(['server', 'cache'])
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
  parserSource: z.enum(['ai', 'rules']),
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
  })
]);

export type ActorRole = z.infer<typeof actorRoleSchema>;
export type Owner = z.infer<typeof ownerSchema>;
export type ItemStatus = z.infer<typeof itemStatusSchema>;
export type ParseConfidence = z.infer<typeof parseConfidenceSchema>;
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
export type NotificationSubscription = z.infer<typeof notificationSubscriptionSchema>;
export type SaveNotificationSubscriptionRequest = z.infer<typeof saveNotificationSubscriptionRequestSchema>;
export type SaveNotificationSubscriptionResponse = z.infer<typeof saveNotificationSubscriptionResponseSchema>;
export type OutboxCommand = z.infer<typeof outboxCommandSchema>;
