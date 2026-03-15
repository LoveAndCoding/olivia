import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  activeListIndexResponseSchema,
  activeRoutineIndexResponseSchema,
  addListItemRequestSchema,
  archiveListRequestSchema,
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
  createRoutineRequestSchema,
  deleteListRequestSchema,
  deleteRoutineRequestSchema,
  deleteRoutineResponseSchema,
  inboxViewResponseSchema,
  itemDetailResponseSchema,
  listDetailResponseSchema,
  listItemMutationResponseSchema,
  listMutationResponseSchema,
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
  updateRoutineRequestSchema,
  type ActorRole,
  type DraftItem,
  type DraftReminder,
  type ReminderUpdateChange,
  type UpdateChange
} from '@olivia/contracts';
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_STALE_THRESHOLD_DAYS,
  addListItem,
  applyUpdate,
  archiveList,
  archiveRoutine,
  assertStakeholderWrite,
  buildSuggestions,
  cancelReminder,
  checkItem,
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
  createReminder,
  createReminderDraft,
  createRoutine,
  createSharedList,
  deriveListSummary,
  groupItems,
  groupReminders,
  pauseRoutine,
  restoreList,
  restoreRoutine,
  resumeRoutine,
  snoozeReminder,
  uncheckItem,
  updateItemBody,
  updateListTitle,
  updateReminder,
  updateRoutine
} from '@olivia/domain';
import { DisabledAiProvider } from './ai';
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
  const aiProvider = new DisabledAiProvider();
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

  app.get('/api/admin/export', async () => repository.exportSnapshot());

  app.get('/api/notifications/vapid-public-key', async () => ({
    vapidPublicKey: config.vapidPublicKey ?? null,
    notificationsEnabled: config.notificationsEnabled
  }));

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
    const code = (error as Error & { code?: string }).code ?? 'BAD_REQUEST';
    const message = error instanceof Error ? error.message : 'Request failed.';
    reply.status(statusCode).send({ code, message });
  });

  return app;
}
