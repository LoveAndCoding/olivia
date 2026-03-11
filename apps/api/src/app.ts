import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import {
  confirmCreateRequestSchema,
  confirmUpdateRequestSchema,
  inboxViewResponseSchema,
  itemDetailResponseSchema,
  previewCreateRequestSchema,
  previewCreateResponseSchema,
  previewUpdateRequestSchema,
  previewUpdateResponseSchema,
  saveNotificationSubscriptionRequestSchema,
  type ActorRole,
  type DraftItem,
  type UpdateChange
} from '@olivia/contracts';
import {
  DEFAULT_DUE_SOON_DAYS,
  DEFAULT_STALE_THRESHOLD_DAYS,
  applyUpdate,
  buildSuggestions,
  computeFlags,
  createDraft,
  createInboxItem,
  groupItems
} from '@olivia/domain';
import { DisabledAiProvider } from './ai';
import type { AppConfig } from './config';
import { createDatabase } from './db/client';
import { DraftStore } from './drafts';
import { InboxRepository } from './repository';

type BuildAppOptions = {
  config: AppConfig;
};

const VIEW_VALUES = new Set(['active', 'all']);

function ensureStakeholder(role: ActorRole): void {
  if (role !== 'stakeholder') {
    const error = new Error('spouse may view inbox items but may not create, update, or remove them in this phase');
    (error as Error & { statusCode?: number; code?: string }).statusCode = 403;
    (error as Error & { statusCode?: number; code?: string }).code = 'ROLE_READ_ONLY';
    throw error;
  }
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

export async function buildApp({ config }: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });
  await app.register(cors, { origin: true });

  const db = createDatabase(config.dbPath);
  const repository = new InboxRepository(db);
  const drafts = new DraftStore();
  const aiProvider = new DisabledAiProvider();

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

  app.get('/api/inbox/items', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole; view?: string };
    const actorRole = query.actorRole;
    if (!actorRole || (actorRole !== 'stakeholder' && actorRole !== 'spouse')) {
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
    if (!query.actorRole || (query.actorRole !== 'stakeholder' && query.actorRole !== 'spouse')) {
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

  app.post('/api/notifications/subscriptions', async (request, reply) => {
    const body = saveNotificationSubscriptionRequestSchema.parse(request.body);
    const subscription = repository.saveNotificationSubscription(body.actorRole, body.endpoint, body.payload);
    request.log.info({ actorRole: body.actorRole }, 'saved notification subscription');
    return reply.send({ subscription });
  });

  app.get('/api/notifications/subscriptions', async (request, reply) => {
    const query = request.query as { actorRole?: ActorRole };
    if (!query.actorRole || (query.actorRole !== 'stakeholder' && query.actorRole !== 'spouse')) {
      return reply.status(400).send({ code: 'BAD_ROLE', message: 'actorRole query parameter is required.' });
    }

    return reply.send({ subscriptions: repository.listNotificationSubscriptions(query.actorRole) });
  });

  app.get('/api/admin/export', async () => repository.exportSnapshot());

  app.setErrorHandler((error, _request, reply) => {
    const statusCode = (error as Error & { statusCode?: number }).statusCode ?? 400;
    const code = (error as Error & { code?: string }).code ?? 'BAD_REQUEST';
    const message = error instanceof Error ? error.message : 'Request failed.';
    reply.status(statusCode).send({ code, message });
  });

  return app;
}
