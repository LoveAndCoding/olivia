import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { format, isSameDay, parseISO, startOfDay } from 'date-fns';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  activeListIndexResponseSchema,
  activeRoutineIndexResponseSchema,
  addListItemRequestSchema,
  addMealEntryRequestSchema,
  archiveListRequestSchema,
  archiveMealPlanRequestSchema,
  archiveRoutineRequestSchema,
  archivedListIndexResponseSchema,
  archivedRoutineIndexResponseSchema,
  cancelReminderRequestSchema,
  cancelReminderResponseSchema,
  checkListItemRequestSchema,
  completeReminderRequestSchema,
  completeReminderResponseSchema,
  completeRoutineOccurrenceRequestSchema,
  completeRoutineOccurrenceResponseSchema,
  confirmCreateReminderRequestSchema,
  confirmCreateReminderResponseSchema,
  confirmCreateRequestSchema,
  confirmUpdateReminderRequestSchema,
  confirmUpdateReminderResponseSchema,
  confirmUpdateRequestSchema,
  createListRequestSchema,
  createMealPlanRequestSchema,
  createRoutineRequestSchema,
  deleteMealEntryRequestSchema,
  deleteMealPlanRequestSchema,
  deleteListRequestSchema,
  deleteRoutineRequestSchema,
  deleteRoutineResponseSchema,
  generateGroceryListResponseSchema,
  inboxViewResponseSchema,
  itemDetailResponseSchema,
  listDetailResponseSchema,
  listItemMutationResponseSchema,
  listMutationResponseSchema,
  mealPlanDetailResponseSchema,
  mealPlanIndexResponseSchema,
  pauseRoutineRequestSchema,
  previewCreateReminderRequestSchema,
  previewCreateReminderResponseSchema,
  previewCreateRequestSchema,
  previewCreateResponseSchema,
  previewUpdateReminderRequestSchema,
  previewUpdateReminderResponseSchema,
  previewUpdateRequestSchema,
  previewUpdateResponseSchema,
  reminderDetailResponseSchema,
  reminderSettingsResponseSchema,
  reminderViewResponseSchema,
  removeListItemRequestSchema,
  restoreListRequestSchema,
  restoreMealPlanRequestSchema,
  restoreRoutineRequestSchema,
  resumeRoutineRequestSchema,
  routineDetailResponseSchema,
  routineMutationResponseSchema,
  saveNotificationSubscriptionRequestSchema,
  saveNotificationSubscriptionResponseSchema,
  saveReminderNotificationPreferencesRequestSchema,
  saveReminderNotificationPreferencesResponseSchema,
  snoozeReminderRequestSchema,
  snoozeReminderResponseSchema,
  uncheckListItemRequestSchema,
  updateListItemBodyRequestSchema,
  updateListTitleRequestSchema,
  updateMealEntryRequestSchema,
  updateMealPlanTitleRequestSchema,
  updateRoutineRequestSchema,
  weeklyViewResponseSchema,
  activityHistoryResponseSchema,
  completeRitualRequestSchema,
  completeRitualResponseSchema,
  reviewRecordSchema,
  ritualSummaryResponseSchema,
  nudgesResponseSchema,
  staleItemsResponseSchema,
  freshnessConfirmRequestSchema,
  freshnessConfirmResponseSchema,
  freshnessArchiveRequestSchema,
  freshnessArchiveResponseSchema,
  healthCheckStateSchema,
  sendChatMessageRequestSchema,
  chatConversationQuerySchema,
  skipRoutineOccurrenceRequestSchema,
  skipRoutineOccurrenceResponseSchema,
  ONBOARDING_ENTITY_THRESHOLD,
  type ActorRole,
  type DraftItem,
  type DraftReminder,
  type ReminderUpdateChange,
  type UpdateChange,
  type WeeklyDayView,
  type WeeklyInboxItem,
  type WeeklyMealEntry,
  type WeeklyReminder,
  type WeeklyRoutineOccurrence
} from '@olivia/contracts';
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_STALE_THRESHOLD_DAYS,
  addListItem,
  addMealEntry,
  applyUpdate,
  archiveList,
  archiveMealPlan,
  archiveRoutine,
  assertStakeholderWrite,
  buildSuggestions,
  cancelReminder,
  checkItem,
  collectGroceryItems,
  completeReminderOccurrence,
  completeRoutineOccurrence,
  computeFlags,
  computeRoutineDueState,
  createDraft,
  createInboxItem,
  createItemAddedHistoryEntry,
  createItemBodyUpdatedHistoryEntry,
  createItemCheckedHistoryEntry,
  createItemRemovedHistoryEntry,
  createItemUncheckedHistoryEntry,
  createListArchivedHistoryEntry,
  createListCreatedHistoryEntry,
  createListRestoredHistoryEntry,
  createListTitleUpdatedHistoryEntry,
  createMealPlan,
  createReminder,
  createReminderDraft,
  createRoutine,
  createSharedList,
  deriveMealPlanSummary,
  deriveListSummary,
  groupItems,
  groupReminders,
  pauseRoutine,
  restoreList,
  restoreMealPlan,
  restoreRoutine,
  resumeRoutine,
  snoozeReminder,
  uncheckItem,
  updateItemBody,
  updateListTitle,
  updateMealEntryItems,
  updateMealEntryName,
  updateMealPlanTitle,
  updateReminder,
  updateRoutine,
  getWeekBounds,
  getRoutineOccurrenceDatesForWeek,
  getRoutineOccurrenceStatusForDate,
  getActivityHistoryWindow,
  groupActivityHistoryByDay,
  getReviewWindowsForOccurrence,
  formatReviewWindowAsDateStrings,
  skipRoutineOccurrence,
  sortNudgesByPriority,
  localDateToUtcNoon
} from '@olivia/domain';
import Anthropic from '@anthropic-ai/sdk';
import { createAiProvider, type RitualSummaryInput } from './ai';
import { streamChat, streamOnboardingChat, getTopicPrompt, getNextOnboardingTopic } from './chat';
import type { AppConfig } from './config';
import { createDatabase } from './db/client';
import { DraftStore } from './drafts';
import { startBackgroundJobs } from './jobs';
import { createPushProvider, type PushSubscriptionPayload } from './push';
import { InboxRepository } from './repository';

type BuildAppOptions = {
  config: AppConfig;
};

const VIEW_VALUES = new Set(['active', 'all']);

function ensureStakeholder(role: ActorRole): void {
  if (role !== 'stakeholder') {
    const error = new Error('spouse may view inbox items and reminders but may not create, update, or remove them in this phase');
    (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
    (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
    throw error;
  }
}

function isReadableActorRole(role: unknown): role is ActorRole {
  return role === 'stakeholder' || role === 'spouse';
}

function isPushSubscriptionPayload(payload: Record<string, unknown>): payload is PushSubscriptionPayload {
  return (
    typeof payload.endpoint === 'string' &&
    payload.keys !== null &&
    typeof payload.keys === 'object' &&
    typeof (payload.keys as Record<string, unknown>).p256dh === 'string' &&
    typeof (payload.keys as Record<string, unknown>).auth === 'string'
  );
}

function resolveCreateDraft(finalItem: DraftItem, draftRecord: ReturnType<DraftStore['take']>): DraftItem {
  if (draftRecord?.kind === 'create') {
    return draftRecord.finalItem;
  }
  return finalItem;
}

function resolveUpdateChange(change: UpdateChange | undefined, draftRecord: ReturnType<DraftStore['take']>): UpdateChange {
  if (draftRecord?.kind === 'update') {
    return draftRecord.proposedChange;
  }
  if (!change) {
    throw new Error('A proposed change is required.');
  }
  return change;
}

function resolveReminderCreateDraft(
  finalReminder: DraftReminder,
  draftRecord: ReturnType<DraftStore['take']>
): DraftReminder {
  if (draftRecord?.kind === 'reminder_create') {
    return draftRecord.finalReminder;
  }
  return finalReminder;
}

function resolveReminderUpdateChange(
  change: ReminderUpdateChange | undefined,
  draftRecord: ReturnType<DraftStore['take']>
): ReminderUpdateChange {
  if (draftRecord?.kind === 'reminder_update') {
    return draftRecord.proposedChange;
  }
  if (!change) {
    throw new Error('A proposed reminder change is required.');
  }
  return change;
}


export async function buildApp({ config }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const db = createDatabase(config.dbPath);
  const repository = new InboxRepository(db);
  const drafts = new DraftStore();
  const aiProvider = createAiProvider(config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY, app.log);
  const push = createPushProvider(config);
  const stopJobs = startBackgroundJobs(repository, push, config, app.log);
  app.addHook('onClose', async () => stopJobs());

  app.get('/api/health', async () => ({ ok: true }));

  app.post('/api/inbox/items/preview-create', async (request, reply) => {
    const body = previewCreateRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const parsed = body.inputText
      ? await aiProvider.parseDraft(body.inputText)
      : createDraft({ structuredInput: body.structuredInput });

    const draftId = randomUUID();
    drafts.save(draftId, { kind: 'create', finalItem: parsed.draft });

    const response = previewCreateResponseSchema.parse({
      draftId,
      parsedItem: parsed.draft,
      parseConfidence: parsed.parseConfidence,
      ambiguities: parsed.ambiguities,
      parserSource: parsed.parserSource,
      requiresConfirmation: true
    });

    return reply.send(response);
  });

  app.post('/api/inbox/items/confirm-create', async (request, reply) => {
    const body = confirmCreateRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const finalDraft = resolveCreateDraft(body.finalItem, drafts.take(body.draftId));
    const { item, historyEntry } = createInboxItem(finalDraft);
    repository.createItem(item, historyEntry);
    request.log.info({ itemId: item.id }, 'accepted create command');
    return reply.send({ savedItem: item, historyEntry, newVersion: item.version });
  });

  app.post('/api/inbox/items/preview-update', async (request, reply) => {
    const body = previewUpdateRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentItem = repository.getItem(body.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    if (currentItem.version !== body.expectedVersion) {
      request.log.info({ itemId: body.itemId }, 'rejected update preview due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentItem,
        currentVersion: currentItem.version,
        retryGuidance: 'Refresh the item and try the update again.'
      });
    }

    const { updatedItem } = applyUpdate(currentItem, body.proposedChange);
    const draftId = randomUUID();
    drafts.save(draftId, {
      kind: 'update',
      itemId: body.itemId,
      expectedVersion: body.expectedVersion,
      proposedChange: body.proposedChange,
      proposedItem: updatedItem
    });

    const response = previewUpdateResponseSchema.parse({
      draftId,
      currentItem,
      proposedItem: updatedItem,
      requiresConfirmation: true
    });

    return reply.send(response);
  });

  app.post('/api/inbox/items/confirm-update', async (request, reply) => {
    const body = confirmUpdateRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentItem = repository.getItem(body.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    if (currentItem.version !== body.expectedVersion) {
      request.log.info({ itemId: body.itemId }, 'rejected update due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentItem,
        currentVersion: currentItem.version,
        retryGuidance: 'Refresh the item and re-apply your change.'
      });
    }

    const proposedChange = resolveUpdateChange(body.proposedChange, drafts.take(body.draftId));
    const { updatedItem, historyEntry } = applyUpdate(currentItem, proposedChange);
    const saved = repository.updateItem(updatedItem, historyEntry, body.expectedVersion);
    if (!saved) {
      request.log.info({ itemId: body.itemId }, 'rejected update due to stale version during save');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentItem: repository.getItem(body.itemId),
        currentVersion: repository.getItem(body.itemId)?.version,
        retryGuidance: 'Refresh the item and re-apply your change.'
      });
    }
    request.log.info({ itemId: body.itemId }, 'accepted update command');
    return reply.send({ savedItem: updatedItem, historyEntry, newVersion: updatedItem.version });
  });

  app.post('/api/reminders/preview-create', async (request, reply) => {
    const body = previewCreateReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const parsed = body.inputText
      ? await aiProvider.parseReminderDraft(body.inputText)
      : createReminderDraft({ structuredInput: body.structuredInput });

    const draftId = randomUUID();
    drafts.save(draftId, { kind: 'reminder_create', finalReminder: parsed.draft });

    const response = previewCreateReminderResponseSchema.parse({
      draftId,
      parsedReminder: parsed.draft,
      parseConfidence: parsed.parseConfidence,
      ambiguities: parsed.ambiguities,
      parserSource: parsed.parserSource,
      requiresConfirmation: true
    });

    return reply.send(response);
  });

  app.post('/api/reminders/confirm-create', async (request, reply) => {
    const body = confirmCreateReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const finalDraft = resolveReminderCreateDraft(body.finalReminder, drafts.take(body.draftId));
    const { reminder, timelineEntries } = createReminder(finalDraft);
    repository.createReminder(reminder, timelineEntries);
    request.log.info({ reminderId: reminder.id }, 'accepted reminder create command');

    const response = confirmCreateReminderResponseSchema.parse({
      savedReminder: reminder,
      timelineEntry: timelineEntries[timelineEntries.length - 1]!,
      newVersion: reminder.version
    });

    return reply.send(response);
  });

  app.post('/api/reminders/preview-update', async (request, reply) => {
    const body = previewUpdateReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentReminder = repository.getReminder(body.reminderId);
    if (!currentReminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }
    if (currentReminder.version !== body.expectedVersion) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder update preview due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder,
        currentVersion: currentReminder.version,
        retryGuidance: 'Refresh the reminder and try the update again.'
      });
    }

    const { reminder: proposedReminder } = updateReminder(
      currentReminder,
      body.proposedChange,
      new Date(),
      repository.listReminderTimeline(body.reminderId)
    );
    const draftId = randomUUID();
    drafts.save(draftId, {
      kind: 'reminder_update',
      reminderId: body.reminderId,
      expectedVersion: body.expectedVersion,
      proposedChange: body.proposedChange,
      proposedReminder
    });

    const response = previewUpdateReminderResponseSchema.parse({
      draftId,
      currentReminder,
      proposedReminder,
      requiresConfirmation: true
    });

    return reply.send(response);
  });

  app.post('/api/reminders/confirm-update', async (request, reply) => {
    const body = confirmUpdateReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentReminder = repository.getReminder(body.reminderId);
    if (!currentReminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }
    if (currentReminder.version !== body.expectedVersion) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder update due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder,
        currentVersion: currentReminder.version,
        retryGuidance: 'Refresh the reminder and re-apply your change.'
      });
    }

    const proposedChange = resolveReminderUpdateChange(body.proposedChange, drafts.take(body.draftId));
    const mutation = updateReminder(
      currentReminder,
      proposedChange,
      new Date(),
      repository.listReminderTimeline(body.reminderId)
    );
    const saved = repository.updateReminder(mutation.reminder, mutation.timelineEntries, body.expectedVersion);
    if (!saved) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder update due to stale version during save');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder: repository.getReminder(body.reminderId),
        currentVersion: repository.getReminder(body.reminderId)?.version,
        retryGuidance: 'Refresh the reminder and re-apply your change.'
      });
    }

    request.log.info({ reminderId: body.reminderId }, 'accepted reminder update command');
    const response = confirmUpdateReminderResponseSchema.parse({
      savedReminder: mutation.reminder,
      timelineEntry: mutation.timelineEntries[mutation.timelineEntries.length - 1]!,
      newVersion: mutation.reminder.version
    });
    return reply.send(response);
  });

  app.post('/api/reminders/complete', async (request, reply) => {
    const body = completeReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentReminder = repository.getReminder(body.reminderId);
    if (!currentReminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }
    if (currentReminder.version !== body.expectedVersion) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder completion due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder,
        currentVersion: currentReminder.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const mutation = completeReminderOccurrence(
      currentReminder,
      new Date(),
      repository.listReminderTimeline(body.reminderId)
    );
    const saved = repository.updateReminder(mutation.reminder, mutation.timelineEntries, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder: repository.getReminder(body.reminderId),
        currentVersion: repository.getReminder(body.reminderId)?.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const response = completeReminderResponseSchema.parse({
      savedReminder: mutation.reminder,
      timelineEntry: mutation.timelineEntries[mutation.timelineEntries.length - 1]!,
      newVersion: mutation.reminder.version
    });
    return reply.send(response);
  });

  app.post('/api/reminders/snooze', async (request, reply) => {
    const body = snoozeReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentReminder = repository.getReminder(body.reminderId);
    if (!currentReminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }
    if (currentReminder.version !== body.expectedVersion) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder snooze due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder,
        currentVersion: currentReminder.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const mutation = snoozeReminder(
      currentReminder,
      body.snoozedUntil,
      new Date(),
      repository.listReminderTimeline(body.reminderId)
    );
    const saved = repository.updateReminder(mutation.reminder, mutation.timelineEntries, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder: repository.getReminder(body.reminderId),
        currentVersion: repository.getReminder(body.reminderId)?.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const response = snoozeReminderResponseSchema.parse({
      savedReminder: mutation.reminder,
      timelineEntry: mutation.timelineEntries[mutation.timelineEntries.length - 1]!,
      newVersion: mutation.reminder.version
    });
    return reply.send(response);
  });

  app.post('/api/reminders/cancel', async (request, reply) => {
    const body = cancelReminderRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const currentReminder = repository.getReminder(body.reminderId);
    if (!currentReminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }
    if (currentReminder.version !== body.expectedVersion) {
      request.log.info({ reminderId: body.reminderId }, 'rejected reminder cancel due to version conflict');
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder,
        currentVersion: currentReminder.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const mutation = cancelReminder(
      currentReminder,
      new Date(),
      repository.listReminderTimeline(body.reminderId)
    );
    const saved = repository.updateReminder(mutation.reminder, mutation.timelineEntries, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({
        code: 'VERSION_CONFLICT',
        currentReminder: repository.getReminder(body.reminderId),
        currentVersion: repository.getReminder(body.reminderId)?.version,
        retryGuidance: 'Refresh the reminder and try again.'
      });
    }

    const response = cancelReminderResponseSchema.parse({
      savedReminder: mutation.reminder,
      timelineEntry: mutation.timelineEntries[mutation.timelineEntries.length - 1]!,
      newVersion: mutation.reminder.version
    });
    return reply.send(response);
  });

  app.get('/api/inbox/items', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole; view?: string };
    const actorRole = query.actorRole;
    if (!isReadableActorRole(actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const view = query.view && VIEW_VALUES.has(query.view) ? query.view : 'active';

    const items = repository.listItems();
    const itemsByStatus = groupItems(items);
    const response = inboxViewResponseSchema.parse({
      itemsByStatus: {
        open: itemsByStatus.open,
        in_progress: itemsByStatus.in_progress,
        deferred: view === 'all' ? itemsByStatus.deferred : [],
        done: view === 'all' ? itemsByStatus.done : []
      },
      suggestions: buildSuggestions(items, new Date(), {
        staleThresholdDays: config.staleThresholdDays ?? DEFAULT_STALE_THRESHOLD_DAYS,
        dueSoonDays: config.dueSoonDays ?? DEFAULT_DUE_SOON_DAYS
      }),
      generatedAt: new Date().toISOString(),
      staleThresholdDays: config.staleThresholdDays,
      dueSoonDays: config.dueSoonDays,
      source: 'server'
    });

    return reply.send(response);
  });

  app.get('/api/inbox/items/:itemId', async (request, reply) => {
    const params = request.params as { itemId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    const item = repository.getItem(params.itemId);
    if (!item) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }

    const response = itemDetailResponseSchema.parse({
      item,
      history: repository.listHistory(item.id),
      flags: computeFlags(item, new Date(), {
        staleThresholdDays: config.staleThresholdDays,
        dueSoonDays: config.dueSoonDays
      })
    });

    return reply.send(response);
  });

  app.get('/api/reminders', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    const now = new Date();
    const response = reminderViewResponseSchema.parse({
      remindersByState: groupReminders(repository.listReminders(now), now),
      generatedAt: now.toISOString(),
      source: 'server'
    });

    return reply.send(response);
  });

  app.get('/api/reminders/:reminderId', async (request, reply) => {
    const params = request.params as { reminderId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    const reminder = repository.getReminder(params.reminderId);
    if (!reminder) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Reminder not found.' });
    }

    const response = reminderDetailResponseSchema.parse({
      reminder,
      timeline: repository.listReminderTimeline(reminder.id)
    });

    return reply.send(response);
  });

  app.get('/api/reminders/settings', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    const response = reminderSettingsResponseSchema.parse({
      preferences: repository.getReminderNotificationPreferences(query.actorRole)
    });

    return reply.send(response);
  });

  app.post('/api/reminders/settings', async (request, reply) => {
    const body = saveReminderNotificationPreferencesRequestSchema.parse(request.body);
    ensureStakeholder(body.actorRole);

    const response = saveReminderNotificationPreferencesResponseSchema.parse({
      preferences: repository.saveReminderNotificationPreferences(body.actorRole, body.preferences)
    });

    return reply.send(response);
  });

  app.post('/api/notifications/subscriptions', async (request, reply) => {
    const body = saveNotificationSubscriptionRequestSchema.parse(request.body);
    if (!isPushSubscriptionPayload(body.payload) || body.payload.endpoint !== body.endpoint) {
      return reply.status(400).send({
        code: 'INVALID_PUSH_SUBSCRIPTION',
        message: 'A real Web Push subscription payload with matching endpoint and keys is required.'
      });
    }
    const subscription = repository.saveNotificationSubscription(body.actorRole, body.endpoint, body.payload);
    request.log.info({ actorRole: body.actorRole }, 'saved notification subscription');
    return reply.send(saveNotificationSubscriptionResponseSchema.parse({ subscription }));
  });

  app.get('/api/notifications/subscriptions', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    return reply.send({ subscriptions: repository.listNotificationSubscriptions(query.actorRole) });
  });

  // ─── Shared Lists routes ────────────────────────────────────────────────────

  app.get('/api/lists', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const lists = repository.listSharedLists('active');
    const listsWithSummary = lists.map((list) => {
      const items = repository.getListItems(list.id);
      const summary = deriveListSummary(items);
      return { ...list, ...summary };
    });
    return reply.send(activeListIndexResponseSchema.parse({ lists: listsWithSummary, source: 'server' }));
  });

  app.get('/api/lists/archived', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const lists = repository.listSharedLists('archived');
    const listsWithSummary = lists.map((list) => {
      const items = repository.getListItems(list.id);
      const summary = deriveListSummary(items);
      return { ...list, ...summary };
    });
    return reply.send(archivedListIndexResponseSchema.parse({ lists: listsWithSummary, source: 'server' }));
  });

  app.get('/api/lists/:listId', async (request, reply) => {
    const params = request.params as { listId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const list = repository.getSharedList(params.listId);
    if (!list) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    const items = repository.getListItems(list.id);
    const summary = deriveListSummary(items);
    return reply.send(listDetailResponseSchema.parse({
      list: { ...list, ...summary },
      items,
      source: 'server'
    }));
  });

  app.get('/api/lists/:listId/history', async (request, reply) => {
    const params = request.params as { listId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const list = repository.getSharedList(params.listId);
    if (!list) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    return reply.send({ history: repository.getListItemHistory(list.id), source: 'server' });
  });

  app.post('/api/lists', async (request, reply) => {
    const body = createListRequestSchema.parse(request.body);
    assertStakeholderWrite(body.actorRole);
    const list = createSharedList(body.title, body.actorRole);
    const historyEntry = createListCreatedHistoryEntry(list, body.actorRole);
    repository.createSharedList(list, historyEntry);
    request.log.info({ listId: list.id }, 'accepted list create command');
    return reply.status(201).send(listMutationResponseSchema.parse({ savedList: list, historyEntry, newVersion: list.version }));
  });

  app.patch('/api/lists/:listId/title', async (request, reply) => {
    const params = request.params as { listId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = updateListTitleRequestSchema.parse({ ...rawBody, listId: params.listId });
    assertStakeholderWrite(body.actorRole);
    const currentList = repository.getSharedList(params.listId);
    if (!currentList) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    if (currentList.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentList.version, retryGuidance: 'Refresh and retry.' });
    }
    const oldTitle = currentList.title;
    const updatedList = updateListTitle(currentList, body.title);
    const historyEntry = createListTitleUpdatedHistoryEntry(updatedList, oldTitle, body.actorRole);
    const saved = repository.updateSharedList(updatedList, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const items = repository.getListItems(updatedList.id);
    const summary = deriveListSummary(items);
    return reply.send(listMutationResponseSchema.parse({ savedList: { ...updatedList, ...summary }, historyEntry, newVersion: updatedList.version }));
  });

  app.post('/api/lists/:listId/archive', async (request, reply) => {
    const params = request.params as { listId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = archiveListRequestSchema.parse({ ...rawBody, listId: params.listId });
    assertStakeholderWrite(body.actorRole);
    const currentList = repository.getSharedList(params.listId);
    if (!currentList) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    if (currentList.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentList.version, retryGuidance: 'Refresh and retry.' });
    }
    const archivedList = archiveList(currentList);
    const historyEntry = createListArchivedHistoryEntry(archivedList, body.actorRole);
    const saved = repository.updateSharedList(archivedList, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const items = repository.getListItems(archivedList.id);
    const summary = deriveListSummary(items);
    return reply.send(listMutationResponseSchema.parse({ savedList: { ...archivedList, ...summary }, historyEntry, newVersion: archivedList.version }));
  });

  app.post('/api/lists/:listId/restore', async (request, reply) => {
    const params = request.params as { listId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = restoreListRequestSchema.parse({ ...rawBody, listId: params.listId });
    assertStakeholderWrite(body.actorRole);
    const currentList = repository.getSharedList(params.listId);
    if (!currentList) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    if (currentList.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentList.version, retryGuidance: 'Refresh and retry.' });
    }
    const restoredList = restoreList(currentList);
    const historyEntry = createListRestoredHistoryEntry(restoredList, body.actorRole);
    const saved = repository.updateSharedList(restoredList, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const items = repository.getListItems(restoredList.id);
    const summary = deriveListSummary(items);
    return reply.send(listMutationResponseSchema.parse({ savedList: { ...restoredList, ...summary }, historyEntry, newVersion: restoredList.version }));
  });

  app.delete('/api/lists/:listId', async (request, reply) => {
    const params = request.params as { listId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = deleteListRequestSchema.parse({ ...rawBody, listId: params.listId });
    assertStakeholderWrite(body.actorRole);
    const currentList = repository.getSharedList(params.listId);
    if (!currentList) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    repository.deleteSharedList(params.listId);
    request.log.info({ listId: params.listId }, 'accepted list delete command');
    return reply.status(204).send();
  });

  app.post('/api/lists/:listId/items', async (request, reply) => {
    const params = request.params as { listId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = addListItemRequestSchema.parse({ ...rawBody, listId: params.listId });
    assertStakeholderWrite(body.actorRole);
    const currentList = repository.getSharedList(params.listId);
    if (!currentList) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'List not found.' });
    }
    const nextPosition = repository.getNextListItemPosition(params.listId);
    const item = addListItem(params.listId, body.body, nextPosition);
    const historyEntry = createItemAddedHistoryEntry(item, body.actorRole);
    repository.addListItem(item, historyEntry);
    request.log.info({ listId: params.listId, itemId: item.id }, 'accepted item add command');
    return reply.status(201).send(listItemMutationResponseSchema.parse({ savedItem: item, historyEntry, newVersion: item.version }));
  });

  app.patch('/api/lists/:listId/items/:itemId', async (request, reply) => {
    const params = request.params as { listId: string; itemId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = updateListItemBodyRequestSchema.parse({ ...rawBody, listId: params.listId, itemId: params.itemId });
    assertStakeholderWrite(body.actorRole);
    const items = repository.getListItems(params.listId);
    const currentItem = items.find((i) => i.id === params.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    if (currentItem.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentItem.version, retryGuidance: 'Refresh and retry.' });
    }
    const oldBody = currentItem.body;
    const updatedItem = updateItemBody(currentItem, body.body);
    const historyEntry = createItemBodyUpdatedHistoryEntry(updatedItem, oldBody, body.actorRole);
    const saved = repository.updateListItem(updatedItem, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    return reply.send(listItemMutationResponseSchema.parse({ savedItem: updatedItem, historyEntry, newVersion: updatedItem.version }));
  });

  app.post('/api/lists/:listId/items/:itemId/check', async (request, reply) => {
    const params = request.params as { listId: string; itemId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = checkListItemRequestSchema.parse({ ...rawBody, listId: params.listId, itemId: params.itemId });
    assertStakeholderWrite(body.actorRole);
    const items = repository.getListItems(params.listId);
    const currentItem = items.find((i) => i.id === params.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    if (currentItem.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentItem.version, retryGuidance: 'Refresh and retry.' });
    }
    const checkedItem = checkItem(currentItem);
    const historyEntry = createItemCheckedHistoryEntry(checkedItem, body.actorRole);
    const saved = repository.updateListItem(checkedItem, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    return reply.send(listItemMutationResponseSchema.parse({ savedItem: checkedItem, historyEntry, newVersion: checkedItem.version }));
  });

  app.post('/api/lists/:listId/items/:itemId/uncheck', async (request, reply) => {
    const params = request.params as { listId: string; itemId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = uncheckListItemRequestSchema.parse({ ...rawBody, listId: params.listId, itemId: params.itemId });
    assertStakeholderWrite(body.actorRole);
    const items = repository.getListItems(params.listId);
    const currentItem = items.find((i) => i.id === params.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    if (currentItem.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentItem.version, retryGuidance: 'Refresh and retry.' });
    }
    const uncheckedItem = uncheckItem(currentItem);
    const historyEntry = createItemUncheckedHistoryEntry(uncheckedItem, body.actorRole);
    const saved = repository.updateListItem(uncheckedItem, historyEntry, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    return reply.send(listItemMutationResponseSchema.parse({ savedItem: uncheckedItem, historyEntry, newVersion: uncheckedItem.version }));
  });

  app.delete('/api/lists/:listId/items/:itemId', async (request, reply) => {
    const params = request.params as { listId: string; itemId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = removeListItemRequestSchema.parse({ ...rawBody, listId: params.listId, itemId: params.itemId });
    assertStakeholderWrite(body.actorRole);
    const items = repository.getListItems(params.listId);
    const currentItem = items.find((i) => i.id === params.itemId);
    if (!currentItem) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Item not found.' });
    }
    const historyEntry = createItemRemovedHistoryEntry(params.listId, currentItem, body.actorRole);
    repository.removeListItem(params.itemId, params.listId, historyEntry);
    request.log.info({ listId: params.listId, itemId: params.itemId }, 'accepted item remove command');
    return reply.status(204).send();
  });

  // ─── Routine routes ─────────────────────────────────────────────────────────

  app.get('/api/routines', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const now = new Date();
    const routines = repository.listActiveAndPausedRoutines();
    const routinesWithState = routines.map((routine) => {
      const currentOccurrence = repository.getRoutineOccurrenceForDueDate(routine.id, routine.currentDueDate);
      return { ...routine, dueState: computeRoutineDueState(routine, currentOccurrence, now) };
    });
    return reply.send(activeRoutineIndexResponseSchema.parse({ routines: routinesWithState, source: 'server' }));
  });

  app.get('/api/routines/archived', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const now = new Date();
    const routines = repository.listRoutines('archived');
    const routinesWithState = routines.map((routine) => {
      const currentOccurrence = repository.getRoutineOccurrenceForDueDate(routine.id, routine.currentDueDate);
      return { ...routine, dueState: computeRoutineDueState(routine, currentOccurrence, now) };
    });
    return reply.send(archivedRoutineIndexResponseSchema.parse({ routines: routinesWithState, source: 'server' }));
  });

  app.get('/api/routines/:routineId', async (request, reply) => {
    const params = request.params as { routineId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const now = new Date();
    const routine = repository.getRoutine(params.routineId);
    if (!routine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    const occurrences = repository.getRoutineOccurrences(routine.id);
    const currentOccurrence = occurrences.find((o) => o.dueDate === routine.currentDueDate) ?? null;
    const routineWithState = { ...routine, dueState: computeRoutineDueState(routine, currentOccurrence, now) };
    return reply.send(routineDetailResponseSchema.parse({ routine: routineWithState, occurrences, source: 'server' }));
  });

  app.post('/api/routines', async (request, reply) => {
    const body = createRoutineRequestSchema.parse(request.body);
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const routine = createRoutine(body.title, body.owner, body.recurrenceRule, body.firstDueDate, body.intervalDays, now);
    repository.createRoutine(routine);
    request.log.info({ routineId: routine.id }, 'accepted routine create command');
    const routineWithState = { ...routine, dueState: computeRoutineDueState(routine, null, now) };
    return reply.status(201).send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: routine.version }));
  });

  app.patch('/api/routines/:routineId', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = updateRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const updatedRoutine = updateRoutine(currentRoutine, {
      title: body.title,
      owner: body.owner,
      recurrenceRule: body.recurrenceRule,
      intervalDays: body.intervalDays
    }, now);
    const saved = repository.updateRoutine(updatedRoutine, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const currentOccurrence = repository.getRoutineOccurrenceForDueDate(updatedRoutine.id, updatedRoutine.currentDueDate);
    const routineWithState = { ...updatedRoutine, dueState: computeRoutineDueState(updatedRoutine, currentOccurrence, now) };
    return reply.send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: updatedRoutine.version }));
  });

  app.post('/api/routines/:routineId/complete', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = completeRoutineOccurrenceRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const { updatedRoutine, occurrence } = completeRoutineOccurrence(currentRoutine, body.actorRole, now);
    const saved = repository.completeRoutineOccurrence(updatedRoutine, occurrence, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    request.log.info({ routineId: params.routineId }, 'accepted routine complete command');
    const routineWithState = { ...updatedRoutine, dueState: computeRoutineDueState(updatedRoutine, null, now) };
    return reply.send(completeRoutineOccurrenceResponseSchema.parse({ savedRoutine: routineWithState, occurrence, newVersion: updatedRoutine.version }));
  });

  app.post('/api/routines/:routineId/pause', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = pauseRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const pausedRoutine = pauseRoutine(currentRoutine, now);
    const saved = repository.updateRoutine(pausedRoutine, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    request.log.info({ routineId: params.routineId }, 'accepted routine pause command');
    const routineWithState = { ...pausedRoutine, dueState: computeRoutineDueState(pausedRoutine, null, now) };
    return reply.send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: pausedRoutine.version }));
  });

  app.post('/api/routines/:routineId/resume', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = resumeRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const resumedRoutine = resumeRoutine(currentRoutine, now);
    const saved = repository.updateRoutine(resumedRoutine, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const currentOccurrence = repository.getRoutineOccurrenceForDueDate(resumedRoutine.id, resumedRoutine.currentDueDate);
    const routineWithState = { ...resumedRoutine, dueState: computeRoutineDueState(resumedRoutine, currentOccurrence, now) };
    return reply.send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: resumedRoutine.version }));
  });

  app.post('/api/routines/:routineId/archive', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = archiveRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const archivedRtn = archiveRoutine(currentRoutine, now);
    const saved = repository.updateRoutine(archivedRtn, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    request.log.info({ routineId: params.routineId }, 'accepted routine archive command');
    const routineWithState = { ...archivedRtn, dueState: computeRoutineDueState(archivedRtn, null, now) };
    return reply.send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: archivedRtn.version }));
  });

  app.post('/api/routines/:routineId/restore', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = restoreRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const restoredRoutine = restoreRoutine(currentRoutine, now);
    const saved = repository.updateRoutine(restoredRoutine, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const currentOccurrence = repository.getRoutineOccurrenceForDueDate(restoredRoutine.id, restoredRoutine.currentDueDate);
    const routineWithState = { ...restoredRoutine, dueState: computeRoutineDueState(restoredRoutine, currentOccurrence, now) };
    return reply.send(routineMutationResponseSchema.parse({ savedRoutine: routineWithState, newVersion: restoredRoutine.version }));
  });

  app.delete('/api/routines/:routineId', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = deleteRoutineRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    repository.deleteRoutine(params.routineId);
    request.log.info({ routineId: params.routineId }, 'accepted routine delete command');
    return reply.send(deleteRoutineResponseSchema.parse({ deleted: true }));
  });

  // ─── Meal Planning routes ──────────────────────────────────────────────────

  app.get('/api/meal-plans', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const plans = repository.listMealPlans('active');
    return reply.send(mealPlanIndexResponseSchema.parse({ plans, totalCount: plans.length }));
  });

  app.get('/api/meal-plans/archived', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const plans = repository.listMealPlans('archived');
    return reply.send(mealPlanIndexResponseSchema.parse({ plans, totalCount: plans.length }));
  });

  app.get('/api/meal-plans/:planId', async (request, reply) => {
    const params = request.params as { planId: string };
    const query = request.query as { actorRole?: ActorRole };
    if (!isReadableActorRole(query.actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }
    const plan = repository.getMealPlan(params.planId);
    if (!plan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const entries = repository.getMealEntries(params.planId);
    return reply.send(mealPlanDetailResponseSchema.parse({ plan, entries }));
  });

  app.post('/api/meal-plans', async (request, reply) => {
    const body = createMealPlanRequestSchema.parse(request.body);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const plan = createMealPlan(body.title, body.weekStartDate);
    repository.createMealPlan(plan);
    request.log.info({ planId: plan.id }, 'accepted meal plan create command');
    return reply.status(201).send(mealPlanDetailResponseSchema.parse({ plan, entries: [] }));
  });

  app.patch('/api/meal-plans/:planId', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = updateMealPlanTitleRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const updatedPlan = updateMealPlanTitle(currentPlan, body.title);
    const saved = repository.updateMealPlan(params.planId, { title: updatedPlan.title, updatedAt: updatedPlan.updatedAt, version: updatedPlan.version }, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const entries = repository.getMealEntries(params.planId);
    return reply.send(mealPlanDetailResponseSchema.parse({ plan: updatedPlan, entries }));
  });

  app.post('/api/meal-plans/:planId/archive', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = archiveMealPlanRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const archivedPlan = archiveMealPlan(currentPlan);
    const saved = repository.updateMealPlan(params.planId, { status: archivedPlan.status, archivedAt: archivedPlan.archivedAt, updatedAt: archivedPlan.updatedAt, version: archivedPlan.version }, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const entries = repository.getMealEntries(params.planId);
    return reply.send(mealPlanDetailResponseSchema.parse({ plan: archivedPlan, entries }));
  });

  app.post('/api/meal-plans/:planId/restore', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = restoreMealPlanRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const restoredPlan = restoreMealPlan(currentPlan);
    const saved = repository.updateMealPlan(params.planId, { status: restoredPlan.status, archivedAt: restoredPlan.archivedAt, updatedAt: restoredPlan.updatedAt, version: restoredPlan.version }, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const entries = repository.getMealEntries(params.planId);
    return reply.send(mealPlanDetailResponseSchema.parse({ plan: restoredPlan, entries }));
  });

  app.delete('/api/meal-plans/:planId', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = deleteMealPlanRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    repository.deleteMealPlan(params.planId);
    request.log.info({ planId: params.planId }, 'accepted meal plan delete command');
    return reply.status(204).send();
  });

  app.post('/api/meal-plans/:planId/entries', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = addMealEntryRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const position = repository.getNextMealEntryPosition(params.planId, body.dayOfWeek);
    const entry = addMealEntry(params.planId, body.dayOfWeek, body.name, position);
    repository.addMealEntry(entry);
    const entries = repository.getMealEntries(params.planId);
    const summary = deriveMealPlanSummary(entries);
    const updatedPlan = { ...currentPlan, ...summary };
    request.log.info({ planId: params.planId, entryId: entry.id }, 'accepted meal entry add command');
    return reply.status(201).send(mealPlanDetailResponseSchema.parse({ plan: updatedPlan, entries }));
  });

  app.patch('/api/meal-plans/:planId/entries/:entryId', async (request, reply) => {
    const params = request.params as { planId: string; entryId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = updateMealEntryRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const entries = repository.getMealEntries(params.planId);
    const currentEntry = entries.find((e) => e.id === params.entryId);
    if (!currentEntry) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal entry not found.' });
    }
    let updatedEntry = currentEntry;
    if (body.name !== undefined) {
      updatedEntry = updateMealEntryName(updatedEntry, body.name);
    }
    if (body.shoppingItems !== undefined) {
      updatedEntry = updateMealEntryItems(updatedEntry, body.shoppingItems);
    }
    const saved = repository.updateMealEntry(params.entryId, { name: updatedEntry.name, shoppingItems: updatedEntry.shoppingItems, updatedAt: updatedEntry.updatedAt, version: updatedEntry.version }, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    const freshEntries = repository.getMealEntries(params.planId);
    const summary = deriveMealPlanSummary(freshEntries);
    const updatedPlan = { ...currentPlan, ...summary };
    return reply.send(mealPlanDetailResponseSchema.parse({ plan: updatedPlan, entries: freshEntries }));
  });

  app.delete('/api/meal-plans/:planId/entries/:entryId', async (request, reply) => {
    const params = request.params as { planId: string; entryId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = deleteMealEntryRequestSchema.parse(rawBody);
    if (body.actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    repository.deleteMealEntry(params.entryId);
    request.log.info({ planId: params.planId, entryId: params.entryId }, 'accepted meal entry delete command');
    return reply.status(204).send();
  });

  app.post('/api/meal-plans/:planId/generate-grocery-list', async (request, reply) => {
    const params = request.params as { planId: string };
    const rawBody = request.body as Record<string, unknown>;
    const actorRole = rawBody.actorRole as ActorRole;
    if (!isReadableActorRole(actorRole)) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole is required.' });
    }
    if (actorRole !== 'stakeholder') {
      const error = new Error('Spouse may view meal plans but may not create, edit, or remove them in this phase');
      (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
      (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
      throw error;
    }
    const currentPlan = repository.getMealPlan(params.planId);
    if (!currentPlan) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Meal plan not found.' });
    }
    const entries = repository.getMealEntries(params.planId);
    const groceryItems = collectGroceryItems(entries);
    if (groceryItems.length === 0) {
      return reply.status(400).send({ code: 'NO_ITEMS', message: 'No shopping items found in this plan.' });
    }
    const listTitle = `Grocery \u2014 ${currentPlan.title}`;
    const list = createSharedList(listTitle, actorRole);
    const listHistoryEntry = createListCreatedHistoryEntry(list, actorRole);
    repository.createSharedList(list, listHistoryEntry);
    for (let i = 0; i < groceryItems.length; i++) {
      const item = addListItem(list.id, groceryItems[i], i);
      const itemHistoryEntry = createItemAddedHistoryEntry(item, actorRole);
      repository.addListItem(item, itemHistoryEntry);
    }
    const ref = { listId: list.id, generatedAt: new Date().toISOString() };
    repository.addGeneratedListRef(params.planId, ref, currentPlan.version);
    const items = repository.getListItems(list.id);
    const summary = deriveListSummary(items);
    const savedList = { ...list, ...summary };
    request.log.info({ planId: params.planId, listId: list.id }, 'grocery list generated');
    return reply.status(201).send(generateGroceryListResponseSchema.parse({ list: savedList, generatedListRef: ref }));
  });

  // ─── Unified Weekly View ────────────────────────────────────────────────────
  app.get('/api/weekly-view', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const now = new Date();

    let weekStart: Date;
    let weekEnd: Date;

    if (query.weekStart) {
      const weekStartStr = String(query.weekStart);
      // Validate YYYY-MM-DD format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(weekStartStr)) {
        return reply.status(400).send({ code: 'INVALID_WEEK_START', message: 'weekStart must be in YYYY-MM-DD format.' });
      }
      const parsed = parseISO(weekStartStr);
      if (isNaN(parsed.getTime())) {
        return reply.status(400).send({ code: 'INVALID_WEEK_START', message: 'weekStart is not a valid date.' });
      }
      // Validate that it's a Monday (day 1)
      if (parsed.getDay() !== 1) {
        return reply.status(400).send({ code: 'INVALID_WEEK_START', message: 'weekStart must be a Monday.' });
      }
      weekStart = startOfDay(parsed);
      const bounds = getWeekBounds(weekStart);
      weekEnd = bounds.weekEnd;
    } else {
      const bounds = getWeekBounds(now);
      weekStart = bounds.weekStart;
      weekEnd = bounds.weekEnd;
    }

    const weekStartDateStr = format(weekStart, 'yyyy-MM-dd');
    const weekEndDateStr = format(weekEnd, 'yyyy-MM-dd');

    const data = repository.getWeeklyViewData(weekStart, weekEnd);

    // Build 7 day entries (Mon=0 through Sun=6 relative to weekStart)
    const days: WeeklyDayView[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(weekStart.getDate() + dayIndex);
      const dayMidnight = startOfDay(dayDate);
      const dayDateStr = format(dayMidnight, 'yyyy-MM-dd');

      // Reminders for this day (date-only comparison)
      const dayReminders: WeeklyReminder[] = data.reminders
        .filter((r) => isSameDay(parseISO(r.scheduledAt.split('T')[0] + 'T00:00:00'), dayMidnight))
        .map((r) => ({
          reminderId: r.id,
          title: r.title,
          owner: r.owner,
          scheduledAt: r.scheduledAt,
          dueState: r.state
        }));

      // Routine occurrences for this day
      const dayRoutines: WeeklyRoutineOccurrence[] = [];
      for (const routine of data.routines) {
        const occurrenceDates = getRoutineOccurrenceDatesForWeek(routine, weekStart, weekEnd);
        const matchesThisDay = occurrenceDates.some((d) => isSameDay(d, dayMidnight));
        if (matchesThisDay) {
          const routineOccs = data.routineOccurrences.get(routine.id) ?? [];
          const dueState = getRoutineOccurrenceStatusForDate(routine, routineOccs, dayMidnight, now);
          dayRoutines.push({
            routineId: routine.id,
            routineTitle: routine.title,
            owner: routine.owner,
            recurrenceRule: routine.recurrenceRule,
            intervalDays: routine.intervalDays ?? null,
            dueDate: dayDateStr,
            dueState,
            completed: dueState === 'completed'
          });
        }
      }

      // Meal entries for this day (dayOfWeek: 0=Mon, 6=Sun matches our dayIndex)
      const dayMeals: WeeklyMealEntry[] = data.activeMealPlan
        ? data.mealEntries
            .filter((e) => e.dayOfWeek === dayIndex)
            .map((e) => ({
              entryId: e.id,
              planId: e.planId,
              planTitle: data.activeMealPlan!.title,
              name: e.name,
              dayOfWeek: e.dayOfWeek,
              weekStartDate: weekStartDateStr
            }))
        : [];

      // Inbox items for this day (date-only comparison using dueAt)
      const dayInboxItems: WeeklyInboxItem[] = data.inboxItems
        .filter((item) => item.dueAt && isSameDay(parseISO(item.dueAt.split('T')[0] + 'T00:00:00'), dayMidnight))
        .map((item) => ({
          itemId: item.id,
          title: item.title,
          owner: item.owner,
          dueAt: item.dueAt!,
          status: item.status
        }));

      days.push({
        date: dayDateStr,
        dayOfWeek: dayIndex,
        routines: dayRoutines,
        reminders: dayReminders,
        meals: dayMeals,
        inboxItems: dayInboxItems
      });
    }

    return reply.send(weeklyViewResponseSchema.parse({
      weekStart: weekStartDateStr,
      weekEnd: weekEndDateStr,
      days
    }));
  });

  // ─── Activity History ────────────────────────────────────────────────────────
  app.get('/api/activity-history', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const role = query.role;
    if (role !== undefined && !isReadableActorRole(role)) {
      return reply.status(403).send({ code: 'ROLE_INVALID', message: 'Invalid role.' });
    }

    const now = new Date();
    const { windowStart, windowEnd } = getActivityHistoryWindow(now);
    const windowStartDate = windowStart.toISOString().split('T')[0];
    const windowEndDate = windowEnd.toISOString().split('T')[0];

    const data = repository.getActivityHistoryData(windowStart, windowEnd);

    // Map each source to ActivityHistoryItem union members
    const items = [
      // Routine occurrences (planning rituals include reviewRecordId)
      ...data.completedRoutineOccurrences.map(({ routineOccurrence, routine }) => ({
        type: 'routine' as const,
        routineId: routine.id,
        routineTitle: routine.title,
        owner: routine.owner,
        dueDate: routineOccurrence.dueDate.split('T')[0],
        completedAt: routineOccurrence.completedAt!,
        reviewRecordId: routineOccurrence.reviewRecordId ?? null
      })),

      // Resolved reminders
      ...data.resolvedReminders.map((r) => ({
        type: 'reminder' as const,
        reminderId: r.id,
        title: r.title,
        owner: r.owner,
        resolvedAt: r.state === 'completed' ? r.completedAt! : r.cancelledAt!,
        resolution: (r.state === 'completed' ? 'completed' : 'dismissed') as 'completed' | 'dismissed'
      })),

      // Meal entries
      ...data.pastMealEntries.map(({ entry, plan }) => {
        const entryDate = new Date(plan.weekStartDate + 'T00:00:00');
        entryDate.setDate(entryDate.getDate() + entry.dayOfWeek);
        return {
          type: 'meal' as const,
          entryId: entry.id,
          planId: plan.id,
          planTitle: plan.title,
          name: entry.name,
          dayOfWeek: entry.dayOfWeek,
          date: entryDate.toISOString().split('T')[0]
        };
      }),

      // Done inbox items
      ...data.doneInboxItems.map((item) => ({
        type: 'inbox' as const,
        itemId: item.id,
        title: item.title,
        owner: item.owner,
        completedAt: item.lastStatusChangedAt
      })),

      // Checked list items
      ...data.checkedListItems.map(({ item, listName }) => ({
        type: 'listItem' as const,
        itemId: item.id,
        body: item.body,
        listId: item.listId,
        listName,
        checkedAt: item.checkedAt!
      }))
    ];

    const days = groupActivityHistoryByDay(items);

    return reply.send(activityHistoryResponseSchema.parse({
      windowStart: windowStartDate,
      windowEnd: windowEndDate,
      days
    }));
  });

  // ─── Planning Ritual Support ──────────────────────────────────────────────────

  app.post('/api/routines/:routineId/generate-ritual-summary', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const actorRole = rawBody.actorRole as string;
    if (actorRole === 'spouse') {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'Spouse cannot initiate AI generation.' });
    }

    const routine = repository.getRoutine(params.routineId);
    if (!routine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (routine.ritualType !== 'weekly_review') {
      return reply.status(400).send({ code: 'NOT_A_RITUAL', message: 'Not a planning ritual.' });
    }

    const occurrenceId = rawBody.occurrenceId as string | undefined;
    if (!occurrenceId) {
      return reply.status(400).send({ code: 'MISSING_OCCURRENCE', message: 'occurrenceId is required.' });
    }

    const existingOccurrence = repository.getRoutineOccurrenceForDueDate(routine.id, routine.currentDueDate);
    if (existingOccurrence && existingOccurrence.completedAt !== null) {
      return reply.status(409).send({ code: 'ALREADY_COMPLETED', message: 'Occurrence already completed.' });
    }

    // Compute review windows anchored to the occurrence's due date
    const anchorDate = new Date(routine.currentDueDate);
    const windows = getReviewWindowsForOccurrence(anchorDate);
    const lastWeek = formatReviewWindowAsDateStrings({ start: windows.lastWeekStart, end: windows.lastWeekEnd });
    const currentWeek = formatReviewWindowAsDateStrings({ start: windows.currentWeekStart, end: windows.currentWeekEnd });

    // Assemble recap items from activity history for the last-week window
    const lastWeekStart = new Date(lastWeek.start + 'T00:00:00');
    const lastWeekEnd = new Date(lastWeek.end + 'T23:59:59');
    const histData = repository.getActivityHistoryData(lastWeekStart, lastWeekEnd);
    const recapItems = [
      ...histData.completedRoutineOccurrences.map(({ routineOccurrence, routine: r }) => ({
        type: 'routine' as const,
        routineId: r.id,
        routineTitle: r.title,
        owner: r.owner,
        dueDate: routineOccurrence.dueDate.split('T')[0],
        completedAt: routineOccurrence.completedAt!,
        reviewRecordId: routineOccurrence.reviewRecordId ?? null
      })),
      ...histData.resolvedReminders.map((r) => ({
        type: 'reminder' as const,
        reminderId: r.id,
        title: r.title,
        owner: r.owner,
        resolvedAt: r.state === 'completed' ? r.completedAt! : r.cancelledAt!,
        resolution: (r.state === 'completed' ? 'completed' : 'dismissed') as 'completed' | 'dismissed'
      })),
      ...histData.pastMealEntries.map(({ entry, plan }) => {
        const entryDate = new Date(plan.weekStartDate + 'T00:00:00');
        entryDate.setDate(entryDate.getDate() + entry.dayOfWeek);
        return {
          type: 'meal' as const,
          entryId: entry.id,
          planId: plan.id,
          planTitle: plan.title,
          name: entry.name,
          dayOfWeek: entry.dayOfWeek,
          date: entryDate.toISOString().split('T')[0]
        };
      }),
      ...histData.doneInboxItems.map((item) => ({
        type: 'inbox' as const,
        itemId: item.id,
        title: item.title,
        owner: item.owner,
        completedAt: item.lastStatusChangedAt
      })),
      ...histData.checkedListItems.map(({ item, listName }) => ({
        type: 'listItem' as const,
        itemId: item.id,
        body: item.body,
        listId: item.listId,
        listName,
        checkedAt: item.checkedAt!
      }))
    ];

    // Assemble weekly view data for the current-week window
    const currentWeekStart = new Date(currentWeek.start + 'T00:00:00');
    const currentWeekEnd = new Date(currentWeek.end + 'T23:59:59');
    const weekData = repository.getWeeklyViewData(currentWeekStart, currentWeekEnd);
    const now = new Date();
    const overviewDays: WeeklyDayView[] = [];
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const dayDate = new Date(currentWeekStart);
      dayDate.setDate(currentWeekStart.getDate() + dayIndex);
      const dayMidnight = startOfDay(dayDate);
      const dayDateStr = format(dayMidnight, 'yyyy-MM-dd');

      const dayReminders: WeeklyReminder[] = weekData.reminders
        .filter((r) => isSameDay(parseISO(r.scheduledAt.split('T')[0] + 'T00:00:00'), dayMidnight))
        .map((r) => ({
          reminderId: r.id,
          title: r.title,
          owner: r.owner,
          scheduledAt: r.scheduledAt,
          dueState: r.state
        }));

      const dayRoutines: WeeklyRoutineOccurrence[] = [];
      for (const r of weekData.routines) {
        const occurrenceDates = getRoutineOccurrenceDatesForWeek(r, currentWeekStart, currentWeekEnd);
        const matchesThisDay = occurrenceDates.some((d) => isSameDay(d, dayMidnight));
        if (matchesThisDay) {
          const routineOccs = weekData.routineOccurrences.get(r.id) ?? [];
          const dueState = getRoutineOccurrenceStatusForDate(r, routineOccs, dayMidnight, now);
          dayRoutines.push({
            routineId: r.id,
            routineTitle: r.title,
            owner: r.owner,
            recurrenceRule: r.recurrenceRule,
            intervalDays: r.intervalDays ?? null,
            dueDate: dayDateStr,
            dueState,
            completed: dueState === 'completed'
          });
        }
      }

      const weekStartDateStr = format(currentWeekStart, 'yyyy-MM-dd');
      const dayMeals: WeeklyMealEntry[] = weekData.activeMealPlan
        ? weekData.mealEntries
            .filter((e) => e.dayOfWeek === dayIndex)
            .map((e) => ({
              entryId: e.id,
              planId: e.planId,
              planTitle: weekData.activeMealPlan!.title,
              name: e.name,
              dayOfWeek: e.dayOfWeek,
              weekStartDate: weekStartDateStr
            }))
        : [];

      const dayInboxItems: WeeklyInboxItem[] = weekData.inboxItems
        .filter((item) => item.dueAt && isSameDay(parseISO(item.dueAt.split('T')[0] + 'T00:00:00'), dayMidnight))
        .map((item) => ({
          itemId: item.id,
          title: item.title,
          owner: item.owner,
          dueAt: item.dueAt!,
          status: item.status
        }));

      overviewDays.push({
        date: dayDateStr,
        dayOfWeek: dayIndex,
        routines: dayRoutines,
        reminders: dayReminders,
        meals: dayMeals,
        inboxItems: dayInboxItems
      });
    }

    const summaryInput: RitualSummaryInput = {
      recapItems,
      lastWeekWindowStart: lastWeek.start,
      lastWeekWindowEnd: lastWeek.end,
      overviewDays,
      currentWeekWindowStart: currentWeek.start,
      currentWeekWindowEnd: currentWeek.end
    };

    try {
      const output = await aiProvider.generateRitualSummaries(summaryInput);
      return reply.send(ritualSummaryResponseSchema.parse({
        recapDraft: output.recapDraft,
        overviewDraft: output.overviewDraft
      }));
    } catch {
      // AI provider error: return null drafts, do not propagate error
      return reply.send(ritualSummaryResponseSchema.parse({ recapDraft: null, overviewDraft: null }));
    }
  });

  app.post('/api/routines/:routineId/complete-ritual', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = completeRitualRequestSchema.parse({ ...rawBody });
    assertStakeholderWrite(body.actorRole);

    const now = new Date();
    const routine = repository.getRoutine(params.routineId);
    if (!routine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (routine.ritualType !== 'weekly_review') {
      return reply.status(400).send({ code: 'NOT_A_RITUAL', message: 'Not a planning ritual.' });
    }

    // Check if currentDueDate occurrence is already completed (ritual already done for this cycle)
    const existingOccurrence = repository.getRoutineOccurrenceForDueDate(routine.id, routine.currentDueDate);
    if (existingOccurrence && existingOccurrence.completedAt !== null) {
      return reply.status(409).send({ code: 'ALREADY_COMPLETED', message: 'Occurrence already completed.' });
    }

    // Anchor windows to occurrence due date, not completion date (handles late completions)
    const anchorDate = new Date(routine.currentDueDate);
    const windows = getReviewWindowsForOccurrence(anchorDate);
    const lastWeek = formatReviewWindowAsDateStrings({ start: windows.lastWeekStart, end: windows.lastWeekEnd });
    const currentWeek = formatReviewWindowAsDateStrings({ start: windows.currentWeekStart, end: windows.currentWeekEnd });
    const reviewDate = format(now, 'yyyy-MM-dd');
    const completedAt = now.toISOString();
    const occurrenceId = body.occurrenceId; // client-generated UUID; used as idempotency key

    const nowIso = now.toISOString();
    const recapNarrative = body.recapNarrative ?? null;
    const overviewNarrative = body.overviewNarrative ?? null;
    const aiGenerationUsed = !!(recapNarrative || overviewNarrative);
    const fullReviewRecord = {
      id: randomUUID(),
      ritualOccurrenceId: occurrenceId,
      reviewDate,
      lastWeekWindowStart: lastWeek.start,
      lastWeekWindowEnd: lastWeek.end,
      currentWeekWindowStart: currentWeek.start,
      currentWeekWindowEnd: currentWeek.end,
      carryForwardNotes: body.carryForwardNotes,
      recapNarrative,
      overviewNarrative,
      aiGenerationUsed,
      completedAt,
      completedBy: body.actorRole as 'stakeholder',
      createdAt: nowIso,
      updatedAt: nowIso,
      version: 1
    };

    // Use domain function to advance currentDueDate; we override the occurrence ID and add reviewRecordId
    const { updatedRoutine, occurrence: domainOccurrence } = completeRoutineOccurrence(routine, body.actorRole, now);
    const occurrenceWithReview = {
      ...domainOccurrence,
      id: occurrenceId,
      reviewRecordId: fullReviewRecord.id
    };

    const savedOk = repository.completeRitualOccurrence(updatedRoutine, occurrenceWithReview, fullReviewRecord, routine.version);
    if (!savedOk) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }

    request.log.info({ routineId: routine.id, reviewRecordId: fullReviewRecord.id }, 'accepted ritual complete command');
    return reply.send(completeRitualResponseSchema.parse({
      reviewRecordId: fullReviewRecord.id,
      reviewDate,
      nextOccurrenceDueDate: updatedRoutine.currentDueDate
    }));
  });

  app.get('/api/review-records/:reviewRecordId', async (request, reply) => {
    const params = request.params as { reviewRecordId: string };
    const query = request.query as Record<string, unknown>;
    const role = query.role;
    if (role !== undefined && !isReadableActorRole(role)) {
      return reply.status(403).send({ code: 'ROLE_INVALID', message: 'Invalid role.' });
    }
    const record = repository.getReviewRecord(params.reviewRecordId);
    if (!record) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Review record not found.' });
    }
    return reply.send(reviewRecordSchema.parse(record));
  });

  // ─── Proactive Household Nudges ─────────────────────────────────────────────

  app.get('/api/nudges', async (request, reply) => {
    const query = request.query as Record<string, unknown>;
    const role = query.actorRole;
    if (role !== undefined && !isReadableActorRole(role)) {
      return reply.status(403).send({ code: 'ROLE_INVALID', message: 'Invalid role.' });
    }

    const now = new Date();
    const nudges = repository.getNudgePayloads(now);
    const sorted = sortNudgesByPriority(nudges);
    return reply.send(nudgesResponseSchema.parse({ nudges: sorted }));
  });

  app.post('/api/routines/:routineId/skip', async (request, reply) => {
    const params = request.params as { routineId: string };
    const rawBody = request.body as Record<string, unknown>;
    const body = skipRoutineOccurrenceRequestSchema.parse({ ...rawBody, routineId: params.routineId });
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const currentRoutine = repository.getRoutine(params.routineId);
    if (!currentRoutine) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Routine not found.' });
    }
    if (currentRoutine.version !== body.expectedVersion) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', currentVersion: currentRoutine.version, retryGuidance: 'Refresh and retry.' });
    }
    const { updatedRoutine, occurrence } = skipRoutineOccurrence(currentRoutine, body.actorRole, now);
    const saved = repository.completeRoutineOccurrence(updatedRoutine, occurrence, body.expectedVersion);
    if (!saved) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', retryGuidance: 'Refresh and retry.' });
    }
    request.log.info({ routineId: params.routineId }, 'accepted routine skip command');
    const routineWithState = { ...updatedRoutine, dueState: computeRoutineDueState(updatedRoutine, null, now) };
    return reply.send(skipRoutineOccurrenceResponseSchema.parse({ savedRoutine: routineWithState, occurrence, newVersion: updatedRoutine.version }));
  });

  app.get('/api/admin/export', async () => repository.exportSnapshot());

  app.get('/api/notifications/vapid-public-key', async () => ({
    vapidPublicKey: config.vapidPublicKey ?? null,
    notificationsEnabled: config.notificationsEnabled
  }));

  // ─── Push Subscriptions (H5 nudge push) ─────────────────────────────────────

  app.get('/api/push-subscriptions/vapid-public-key', async () => ({
    vapidPublicKey: config.vapidPublicKey ?? null,
  }));

  const postPushSubscriptionBodySchema = z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  });

  app.post('/api/push-subscriptions', async (request, reply) => {
    const parsed = postPushSubscriptionBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }
    const { endpoint, keys } = parsed.data;
    const record = repository.savePushSubscription(endpoint, keys.p256dh, keys.auth);
    return reply.status(201).send({ id: record.id, endpoint: record.endpoint });
  });

  app.delete('/api/push-subscriptions', async (request, reply) => {
    const { endpoint } = request.query as { endpoint?: string };
    if (!endpoint) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: 'endpoint query param required' });
    }
    repository.deletePushSubscription(endpoint);
    return reply.status(204).send();
  });

  // ─── Chat Routes (OLI-100) ──────────────────────────────────────────────────

  const anthropicApiKey = config.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY;
  const chatClient = anthropicApiKey ? new Anthropic({ apiKey: anthropicApiKey }) : null;

  app.post('/api/chat/messages', async (request, reply) => {
    if (!chatClient) {
      return reply.status(503).send({ code: 'AI_UNAVAILABLE', message: 'Olivia is unavailable right now. You can still use the app to manage your household.' });
    }
    const parsed = sendChatMessageRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }

    const now = new Date();
    const conversation = repository.getOrCreateConversation(now);

    // Save user message
    const userMsgId = randomUUID();
    repository.addChatMessage({
      id: userMsgId,
      conversationId: conversation.id,
      role: 'user',
      content: parsed.data.content,
      toolCalls: null,
      createdAt: now.toISOString()
    });

    // Stream response via SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const generator = streamChat(chatClient, repository, config, conversation.id, parsed.data.content, now);
    for await (const evt of generator) {
      reply.raw.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
    }
    reply.raw.end();
  });

  app.get('/api/chat/conversation', async (request, reply) => {
    const now = new Date();
    const conversation = repository.getOrCreateConversation(now);
    const query = chatConversationQuerySchema.parse(request.query);
    const { messages, hasMore } = repository.listChatMessages(conversation.id, query.limit, query.before);
    return reply.send({
      conversationId: conversation.id,
      messages,
      hasMore
    });
  });

  app.post('/api/chat/conversation/clear', async (_request, reply) => {
    const now = new Date();
    const conversation = repository.getOrCreateConversation(now);
    repository.clearConversation(conversation.id);
    return reply.send({ cleared: true });
  });

  app.post<{ Params: { toolCallId: string } }>('/api/chat/actions/:toolCallId/confirm', async (request, reply) => {
    const { toolCallId } = request.params;

    // Find the message containing this tool call
    const msg = repository.findMessageByToolCallId(toolCallId);
    if (!msg || !msg.toolCalls) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tool call not found.' });
    }

    const toolCall = msg.toolCalls.find(tc => tc.id === toolCallId);
    if (!toolCall) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tool call not found.' });
    }

    if (toolCall.status !== 'pending') {
      return reply.status(400).send({ code: 'ALREADY_RESOLVED', message: `This action has already been ${toolCall.status}.` });
    }

    const now = new Date();
    const actorRole = 'stakeholder' as const;
    let result: Record<string, unknown> = {};

    try {
      switch (toolCall.type) {
        case 'create_inbox_item': {
          const dueText = toolCall.data.dueText ? String(toolCall.data.dueText) : undefined;
          const parsed = createDraft({
            structuredInput: {
              title: String(toolCall.data.title ?? ''),
              owner: (toolCall.data.owner as 'stakeholder' | 'spouse' | 'unassigned') ?? 'unassigned',
              dueText: dueText ?? null
            },
            now
          });
          const { item, historyEntry } = createInboxItem(parsed.draft, now);
          repository.createItem(item, historyEntry);
          result = { item };
          break;
        }
        case 'create_reminder': {
          const parsed = createReminderDraft({
            structuredInput: {
              title: String(toolCall.data.title ?? ''),
              scheduledAt: toolCall.data.scheduledAt ? String(toolCall.data.scheduledAt) : now.toISOString(),
              owner: (toolCall.data.owner as 'stakeholder' | 'spouse' | 'unassigned') ?? 'unassigned'
            },
            now
          });
          const { reminder, timelineEntries } = createReminder(parsed.draft, now);
          repository.createReminder(reminder, timelineEntries);
          result = { reminder };
          break;
        }
        case 'add_list_item': {
          const listTitle = String(toolCall.data.listTitle ?? '');
          const lists = repository.listSharedLists('active');
          const targetList = lists.find(l => l.title.toLowerCase() === listTitle.toLowerCase());
          if (!targetList) {
            return reply.status(400).send({ code: 'LIST_NOT_FOUND', message: `No active list named "${listTitle}" found.` });
          }
          const nextPos = repository.getNextListItemPosition(targetList.id);
          const newItem = addListItem(targetList.id, String(toolCall.data.body ?? ''), nextPos, now);
          const itemHistoryEntry = createItemAddedHistoryEntry(newItem, actorRole);
          repository.addListItem(newItem, itemHistoryEntry);
          result = { item: newItem, listTitle: targetList.title };
          break;
        }
        case 'create_meal_entry': {
          const plans = repository.listMealPlans('active');
          if (plans.length === 0) {
            return reply.status(400).send({ code: 'NO_MEAL_PLAN', message: 'No active meal plan found.' });
          }
          const plan = plans[0];
          const dayOfWeek = Number(toolCall.data.dayOfWeek ?? 0);
          const entryPosition = repository.getNextMealEntryPosition(plan.id, dayOfWeek);
          const entry = addMealEntry(plan.id, dayOfWeek, String(toolCall.data.name ?? ''), entryPosition, now);
          repository.addMealEntry(entry);
          result = { entry, planTitle: plan.title };
          break;
        }
        case 'create_routine': {
          const recurrenceRule = String(toolCall.data.recurrenceRule ?? 'weekly');
          const intervalDays = recurrenceRule === 'every_n_days' ? Number(toolCall.data.intervalDays ?? 7) : undefined;
          const rawFirstDueDate = toolCall.data.firstDueDate ? String(toolCall.data.firstDueDate) : format(now, 'yyyy-MM-dd');
          // Normalize date-only strings (yyyy-MM-dd) to UTC noon in the household timezone.
          // Using noon avoids DST day-shift issues (L-025); using the household timezone
          // ensures "next Wednesday" stays on Wednesday regardless of UTC offset (OLI-134).
          const firstDueDate = /^\d{4}-\d{2}-\d{2}$/.test(rawFirstDueDate)
            ? localDateToUtcNoon(rawFirstDueDate, config.householdTimezone)
            : rawFirstDueDate;
          const owner = (toolCall.data.owner as 'stakeholder' | 'spouse' | 'unassigned') ?? 'stakeholder';
          const routine = createRoutine(
            String(toolCall.data.title ?? ''),
            owner,
            recurrenceRule as 'daily' | 'weekly' | 'monthly' | 'every_n_days',
            firstDueDate,
            intervalDays,
            now
          );
          repository.createRoutine(routine);
          result = { routine };

          // Track in onboarding session if active
          const onboardingSession = repository.getOnboardingSession();
          if (onboardingSession && onboardingSession.status === 'started') {
            repository.incrementOnboardingEntitiesCreated(onboardingSession.id, 1, now);
          }
          break;
        }
        case 'create_shared_list': {
          const rawListOwner = String(toolCall.data.owner ?? 'stakeholder');
          const listOwner: 'stakeholder' | 'spouse' = rawListOwner === 'spouse' ? 'spouse' : 'stakeholder';
          const list = createSharedList(String(toolCall.data.title ?? ''), listOwner, now);
          const historyEntry = createListCreatedHistoryEntry(list, actorRole);
          repository.createSharedList(list, historyEntry);
          result = { list };

          // Track in onboarding session if active
          const onboardingSession2 = repository.getOnboardingSession();
          if (onboardingSession2 && onboardingSession2.status === 'started') {
            repository.incrementOnboardingEntitiesCreated(onboardingSession2.id, 1, now);
          }
          break;
        }
        default:
          return reply.status(400).send({ code: 'UNSUPPORTED_ACTION', message: `Action type "${toolCall.type}" is not yet supported for confirmation.` });
      }

      // Track entity creation in active onboarding session for standard types
      if (['create_inbox_item', 'create_reminder', 'add_list_item', 'create_meal_entry'].includes(toolCall.type)) {
        const onboardingSession = repository.getOnboardingSession();
        if (onboardingSession && onboardingSession.status === 'started') {
          repository.incrementOnboardingEntitiesCreated(onboardingSession.id, 1, now);
        }
      }
    } catch (err) {
      return reply.status(400).send({ code: 'ACTION_FAILED', message: err instanceof Error ? err.message : 'Action failed.' });
    }

    repository.updateToolCallStatus(msg.id, toolCallId, 'confirmed');
    return reply.send({ result });
  });

  app.post<{ Params: { toolCallId: string } }>('/api/chat/actions/:toolCallId/dismiss', async (request, reply) => {
    const { toolCallId } = request.params;
    const msg = repository.findMessageByToolCallId(toolCallId);
    if (!msg || !msg.toolCalls) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tool call not found.' });
    }

    const toolCall = msg.toolCalls.find(tc => tc.id === toolCallId);
    if (!toolCall) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Tool call not found.' });
    }

    if (toolCall.status !== 'pending') {
      return reply.status(400).send({ code: 'ALREADY_RESOLVED', message: `This action has already been ${toolCall.status}.` });
    }

    repository.updateToolCallStatus(msg.id, toolCallId, 'dismissed');
    return reply.send({ dismissed: true });
  });

  // ─── Onboarding API (OLI-119) ─────────────────────────────────────────────

  // Get onboarding state — tells the client whether to show the welcome card
  app.get('/api/onboarding/state', async (_request, reply) => {
    const entityCount = repository.countTotalEntities();
    const session = repository.getOnboardingSession();
    const needsOnboarding = entityCount <= ONBOARDING_ENTITY_THRESHOLD && (!session || session.status !== 'finished');
    return reply.send({
      needsOnboarding,
      session,
      entityCount
    });
  });

  // Start or resume onboarding — creates session + conversation if needed
  app.post('/api/onboarding/start', async (_request, reply) => {
    if (!chatClient) {
      return reply.status(503).send({ code: 'AI_UNAVAILABLE', message: 'Olivia is unavailable right now.' });
    }

    const now = new Date();
    let session = repository.getOnboardingSession();

    if (session && session.status === 'finished') {
      return reply.status(400).send({ code: 'ALREADY_COMPLETED', message: 'Onboarding has already been completed.' });
    }

    if (!session) {
      const conversation = repository.getOrCreateOnboardingConversation(now);
      const sessionId = randomUUID();
      const firstTopic = 'tasks';
      session = {
        id: sessionId,
        conversationId: conversation.id,
        status: 'started',
        topicsCompleted: [],
        currentTopic: firstTopic,
        entitiesCreated: 0,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      };
      repository.createOnboardingSession(session);

      // Seed the conversation with Olivia's opening message
      const openingMessage = `Welcome! I'm Olivia, and I'm here to help you get your household set up. This usually takes about 10 minutes, and you can stop anytime.\n\n${getTopicPrompt('tasks')}`;
      repository.addChatMessage({
        id: randomUUID(),
        conversationId: conversation.id,
        role: 'assistant',
        content: openingMessage,
        toolCalls: null,
        createdAt: now.toISOString()
      });
    }

    return reply.send({ session });
  });

  // Send message in onboarding chat
  app.post('/api/onboarding/messages', async (request, reply) => {
    if (!chatClient) {
      return reply.status(503).send({ code: 'AI_UNAVAILABLE', message: 'Olivia is unavailable right now.' });
    }

    const parsed = sendChatMessageRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ code: 'BAD_REQUEST', message: parsed.error.message });
    }

    const session = repository.getOnboardingSession();
    if (!session || session.status === 'finished') {
      return reply.status(400).send({ code: 'NO_ACTIVE_SESSION', message: 'No active onboarding session.' });
    }

    const now = new Date();
    const conversationId = session.conversationId;

    // Save user message
    const userMsgId = randomUUID();
    repository.addChatMessage({
      id: userMsgId,
      conversationId,
      role: 'user',
      content: parsed.data.content,
      toolCalls: null,
      createdAt: now.toISOString()
    });

    // Stream response via SSE
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    const generator = streamOnboardingChat(chatClient, repository, config, conversationId, session, now);
    for await (const evt of generator) {
      reply.raw.write(`event: ${evt.event}\ndata: ${JSON.stringify(evt.data)}\n\n`);
    }
    reply.raw.end();
  });

  // Get onboarding conversation history
  app.get('/api/onboarding/conversation', async (request, reply) => {
    const session = repository.getOnboardingSession();
    if (!session) {
      return reply.send({ conversationId: null, messages: [], hasMore: false });
    }

    const query = chatConversationQuerySchema.parse(request.query);
    const { messages, hasMore } = repository.listChatMessages(session.conversationId, query.limit, query.before);
    return reply.send({
      conversationId: session.conversationId,
      messages,
      hasMore
    });
  });

  // Advance to next topic
  app.post('/api/onboarding/next-topic', async (_request, reply) => {
    const session = repository.getOnboardingSession();
    if (!session || session.status === 'finished') {
      return reply.status(400).send({ code: 'NO_ACTIVE_SESSION', message: 'No active onboarding session.' });
    }

    const now = new Date();
    const updatedTopics = session.currentTopic && !session.topicsCompleted.includes(session.currentTopic)
      ? [...session.topicsCompleted, session.currentTopic]
      : session.topicsCompleted;

    const nextTopic = getNextOnboardingTopic(updatedTopics);

    if (!nextTopic) {
      // All topics done
      repository.updateOnboardingSession(session.id, {
        status: 'finished',
        topicsCompleted: updatedTopics,
        currentTopic: null,
        updatedAt: now.toISOString()
      });
      return reply.send({ done: true, topicsCompleted: updatedTopics });
    }

    repository.updateOnboardingSession(session.id, {
      topicsCompleted: updatedTopics,
      currentTopic: nextTopic,
      updatedAt: now.toISOString()
    });

    return reply.send({
      done: false,
      currentTopic: nextTopic,
      topicPrompt: getTopicPrompt(nextTopic),
      topicsCompleted: updatedTopics
    });
  });

  // Finish onboarding early (user wants to stop)
  app.post('/api/onboarding/finish', async (_request, reply) => {
    const session = repository.getOnboardingSession();
    if (!session) {
      return reply.status(400).send({ code: 'NO_ACTIVE_SESSION', message: 'No active onboarding session.' });
    }

    const now = new Date();
    const updatedTopics = session.currentTopic && !session.topicsCompleted.includes(session.currentTopic)
      ? [...session.topicsCompleted, session.currentTopic]
      : session.topicsCompleted;

    repository.updateOnboardingSession(session.id, {
      status: 'finished',
      topicsCompleted: updatedTopics,
      currentTopic: null,
      updatedAt: now.toISOString()
    });

    return reply.send({
      session: {
        ...session,
        status: 'finished',
        topicsCompleted: updatedTopics,
        currentTopic: null,
        updatedAt: now.toISOString()
      }
    });
  });

  // ─── Data Freshness Routes ────────────────────────────────────────────────

  app.get('/api/freshness/stale-items', async (_request, reply) => {
    const now = new Date();
    const result = repository.getStaleItems(now, 10);
    return reply.send(staleItemsResponseSchema.parse(result));
  });

  app.post('/api/freshness/confirm', async (request, reply) => {
    const body = freshnessConfirmRequestSchema.parse(request.body);
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const result = repository.confirmFreshness(body.entityType, body.entityId, now, body.expectedVersion);
    if (!result) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', message: 'Version conflict — entity was modified.' });
    }
    return reply.send(freshnessConfirmResponseSchema.parse(result));
  });

  app.post('/api/freshness/archive', async (request, reply) => {
    const body = freshnessArchiveRequestSchema.parse(request.body);
    assertStakeholderWrite(body.actorRole);
    const now = new Date();
    const result = repository.archiveEntity(body.entityType, body.entityId, now, body.expectedVersion);
    if (!result) {
      return reply.status(409).send({ code: 'VERSION_CONFLICT', message: 'Version conflict — entity was modified.' });
    }
    return reply.send(freshnessArchiveResponseSchema.parse(result));
  });

  app.get('/api/freshness/health-check-state', async (_request, reply) => {
    const now = new Date();
    const state = repository.getHealthCheckState(now);
    return reply.send(healthCheckStateSchema.parse(state));
  });

  app.post('/api/freshness/health-check-complete', async (_request, reply) => {
    const now = new Date();
    repository.completeHealthCheck(now);
    return reply.send({ success: true });
  });

  app.post('/api/freshness/health-check-dismiss', async (_request, reply) => {
    const now = new Date();
    repository.dismissHealthCheck(now);
    return reply.send({ success: true });
  });

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
    const code = (error as Error & { code?: string }).code ?? 'BAD_REQUEST';
    const message = error instanceof Error ? error.message : 'Request failed.';
    reply.status(statusCode).send({ code, message });
  });

  return app;
}
