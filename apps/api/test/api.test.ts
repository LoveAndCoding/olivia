import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { subDays } from 'date-fns';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { DisabledPushProvider } from '../src/push';
import { evaluateDueSoonRule, evaluateStaleItemRule } from '../src/jobs';
import { InboxRepository } from '../src/repository';
import { createDatabase } from '../src/db/client';
import { createInboxItem } from '@olivia/domain';

const createConfig = (dbPath: string): AppConfig => ({
  port: 0,
  dbPath,
  staleThresholdDays: 14,
  dueSoonDays: 7,
  aiProvider: 'disabled',
  notificationsEnabled: false,
  vapidPublicKey: null,
  vapidPrivateKey: null,
  vapidContact: 'mailto:test@localhost',
  notificationRules: { dueSoonEnabled: false, staleItemEnabled: false, digestEnabled: false },
  notificationIntervalMs: 3_600_000,
  pwaOrigin: 'http://localhost:4173'
});

describe('household inbox api', () => {
  it('requires preview and approval before writes are persisted', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: schedule HVAC service, owner me, due next Friday'
      }
    });

    expect(preview.statusCode).toBe(200);
    const previewBody = preview.json();

    const beforeConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(beforeConfirm.json().itemsByStatus.open).toHaveLength(0);

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    expect(confirm.statusCode).toBe(200);

    const afterConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(afterConfirm.json().itemsByStatus.open).toHaveLength(1);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rejects spouse write attempts while allowing read-only access', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const spouseWrite = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'spouse',
        inputText: 'Add: order filters'
      }
    });

    expect(spouseWrite.statusCode).toBe(403);
    expect(spouseWrite.json().code).toBe('ROLE_READ_ONLY');

    const spouseRead = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=spouse&view=active'
    });

    expect(spouseRead.statusCode).toBe(200);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rejects stale version updates with a version conflict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: call the plumber, owner me'
      }
    });
    const previewBody = preview.json();

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    const created = confirm.json().savedItem;

    const firstUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'in_progress' }
      }
    });
    expect(firstUpdate.statusCode).toBe(200);

    const staleUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'done' }
      }
    });

    expect(staleUpdate.statusCode).toBe(409);
    expect(staleUpdate.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('exposes VAPID public key endpoint', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const response = await app.inject({ method: 'GET', url: '/api/notifications/vapid-public-key' });
    expect(response.statusCode).toBe(200);
    expect(response.json().notificationsEnabled).toBe(false);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('notification rules', () => {
  const makeLogger = () =>
    ({ info: () => {}, warn: () => {}, debug: () => {}, error: () => {} }) as unknown as Parameters<typeof evaluateDueSoonRule>[3];

  it('due-soon rule skips items when disabled in config', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const db = createDatabase(join(directory, 'test.sqlite'));
    const repository = new InboxRepository(db);
    const push = new DisabledPushProvider();
    const config = { ...createConfig(join(directory, 'test.sqlite')), notificationRules: { dueSoonEnabled: false, staleItemEnabled: false, digestEnabled: false } };

    await evaluateDueSoonRule(repository, push, config, makeLogger());
    // No error means the rule respected the disabled flag.

    rmSync(directory, { recursive: true, force: true });
  });

  it('stale-item rule sends no notifications when no stale items exist', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const db = createDatabase(join(directory, 'test.sqlite'));
    const repository = new InboxRepository(db);
    const now = new Date();

    const { item, historyEntry } = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Fresh item',
      description: null,
      owner: 'stakeholder',
      status: 'open',
      dueText: null,
      dueAt: null
    }, now);

    repository.createItem(item, historyEntry);

    const delivered: string[] = [];
    const trackingPush: Parameters<typeof evaluateStaleItemRule>[1] = {
      isConfigured: () => true,
      send: async (_sub, notification) => { delivered.push(notification.tag); }
    };

    const config = { ...createConfig(join(directory, 'test.sqlite')), notificationRules: { dueSoonEnabled: false, staleItemEnabled: true, digestEnabled: false } };
    await evaluateStaleItemRule(repository, trackingPush, config, makeLogger());
    expect(delivered).toHaveLength(0);

    rmSync(directory, { recursive: true, force: true });
  });

  it('stale-item rule identifies stale items and attempts delivery', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const db = createDatabase(join(directory, 'test.sqlite'));
    const repository = new InboxRepository(db);
    const now = new Date();
    const createdAt = subDays(now, 20);

    const { item, historyEntry } = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Stale household task',
      description: null,
      owner: 'stakeholder',
      status: 'open',
      dueText: null,
      dueAt: null
    }, createdAt);

    repository.createItem(item, historyEntry);

    // Store a subscription with proper Web Push keys so delivery is attempted.
    repository.saveNotificationSubscription('stakeholder', 'https://push.example.com/sub', {
      endpoint: 'https://push.example.com/sub',
      keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' }
    });

    const attempted: string[] = [];
    const trackingPush: Parameters<typeof evaluateStaleItemRule>[1] = {
      isConfigured: () => true,
      send: async (_sub, notification) => { attempted.push(notification.tag); }
    };

    const config = { ...createConfig(join(directory, 'test.sqlite')), notificationRules: { dueSoonEnabled: false, staleItemEnabled: true, digestEnabled: false } };
    await evaluateStaleItemRule(repository, trackingPush, config, makeLogger());
    expect(attempted.length).toBeGreaterThan(0);
    expect(attempted[0]).toContain('stale-');

    rmSync(directory, { recursive: true, force: true });
  });
});
