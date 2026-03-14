import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  cancelReminderRequestSchema,
  cancelReminderResponseSchema,
  completeReminderRequestSchema,
  completeReminderResponseSchema,
  confirmCreateReminderRequestSchema,
  confirmCreateReminderResponseSchema,
  confirmCreateRequestSchema,
  confirmUpdateReminderRequestSchema,
  confirmUpdateReminderResponseSchema,
  confirmUpdateRequestSchema,
  inboxViewResponseSchema,
  itemDetailResponseSchema,
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
  saveNotificationSubscriptionRequestSchema,
  saveNotificationSubscriptionResponseSchema,
  saveReminderNotificationPreferencesRequestSchema,
  saveReminderNotificationPreferencesResponseSchema,
  snoozeReminderRequestSchema,
  snoozeReminderResponseSchema,
  type ActorRole,
  type DraftItem,
  type DraftReminder,
  type ReminderUpdateChange,
  type UpdateChange
} from '@olivia/contracts';
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_STALE_THRESHOLD_DAYS,
  applyUpdate,
  buildSuggestions,
  cancelReminder,
  completeReminderOccurrence,
  computeFlags,
  createDraft,
  createInboxItem,
  createReminder,
  createReminderDraft,
  groupItems,
  groupReminders,
  snoozeReminder,
  updateReminder
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
