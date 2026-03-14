import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addHours, addMinutes, addDays, subDays } from 'date-fns';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/client';
import { evaluateDailySummaryRule, evaluateDueReminderRule } from '../src/jobs';
import { InboxRepository } from '../src/repository';
import { createReminder } from '@olivia/domain';

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

const validPushPayload = {
  endpoint: 'https://push.example.com/subscription',
  keys: {
    p256dh: 'fake-p256dh',
    auth: 'fake-auth'
  }
};

const makeLogger = () =>
  ({ info: () => {}, warn: () => {}, debug: () => {}, error: () => {} }) as unknown as Parameters<typeof evaluateDueReminderRule>[3];

async function createInboxItemViaApi(app: Awaited<ReturnType<typeof buildApp>>, title: string) {
  const preview = await app.inject({
    method: 'POST',
    url: '/api/inbox/items/preview-create',
    payload: {
      actorRole: 'stakeholder',
      structuredInput: {
        title,
        owner: 'stakeholder'
      }
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

  expect(confirm.statusCode).toBe(200);
  return confirm.json().savedItem;
}

async function createReminderViaApi(
  app: Awaited<ReturnType<typeof buildApp>>,
  overrides: Record<string, unknown> = {}
) {
  const preview = await app.inject({
    method: 'POST',
    url: '/api/reminders/preview-create',
    payload: {
      actorRole: 'stakeholder',
      structuredInput: {
        title: 'Bring the vet records',
        owner: 'stakeholder',
        scheduledAt: addHours(new Date(), 2).toISOString(),
        recurrenceCadence: 'none',
        note: null,
        linkedInboxItemId: null,
        ...overrides
      }
    }
  });
  expect(preview.statusCode).toBe(200);
  const previewBody = preview.json();

  const confirm = await app.inject({
    method: 'POST',
    url: '/api/reminders/confirm-create',
    payload: {
      actorRole: 'stakeholder',
      draftId: previewBody.draftId,
      approved: true,
      finalReminder: previewBody.parsedReminder
    }
  });
  expect(confirm.statusCode).toBe(200);
  return confirm.json();
}

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

describe('reminder migrations and api', () => {
  it('upgrades an inbox-only database to the reminder-capable schema without data loss', () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-migrate-'));
    const dbPath = join(directory, 'legacy.sqlite');
    const legacyDb = new Database(dbPath);
    const legacySqlPath = fileURLToPath(new URL('../drizzle/0000_initial.sql', import.meta.url));
    legacyDb.exec(readFileSync(legacySqlPath, 'utf8'));
    legacyDb
      .prepare(`
        INSERT INTO inbox_items (
          id, title, description, owner, status, due_at, due_text, created_at, updated_at, version,
          last_status_changed_at, last_note_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        crypto.randomUUID(),
        'Legacy inbox item',
        null,
        'stakeholder',
        'open',
        null,
        null,
        '2026-03-01T09:00:00.000Z',
        '2026-03-01T09:00:00.000Z',
        1,
        '2026-03-01T09:00:00.000Z',
        null,
        null
      );
    legacyDb.close();

    const upgradedDb = createDatabase(dbPath);
    const repository = new InboxRepository(upgradedDb);
    const migrationFiles = upgradedDb
      .prepare('SELECT filename FROM schema_migrations ORDER BY filename ASC')
      .all() as Array<{ filename: string }>;
    const reminderTables = upgradedDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('reminders', 'reminder_timeline', 'reminder_notification_preferences', 'notification_delivery_log')")
      .all() as Array<{ name: string }>;

    expect(repository.listItems()).toHaveLength(1);
    expect(migrationFiles.map((row) => row.filename)).toEqual(['0000_initial.sql', '0001_first_class_reminders.sql']);
    expect(reminderTables.map((row) => row.name).sort()).toEqual([
      'notification_delivery_log',
      'reminder_notification_preferences',
      'reminder_timeline',
      'reminders'
    ]);

    upgradedDb.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports stakeholder reminder create, edit, snooze, complete, and cancel flows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const inboxItem = await createInboxItemViaApi(app, 'Prep for the vet visit');
    const created = await createReminderViaApi(app, {
      title: 'Bring the vet records',
      linkedInboxItemId: inboxItem.id,
      recurrenceCadence: 'daily',
      scheduledAt: addMinutes(new Date(), 30).toISOString()
    });

    expect(created.savedReminder.linkedInboxItemId).toBe(inboxItem.id);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/reminders?actorRole=stakeholder'
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().remindersByState.upcoming).toHaveLength(1);

    const updated = await app.inject({
      method: 'POST',
      url: '/api/reminders/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        proposedChange: {
          title: 'Bring the vet records folder',
          note: 'Check the booster paperwork too.'
        }
      }
    });
    expect(updated.statusCode).toBe(200);

    const snoozedUntil = addHours(new Date(), 6).toISOString();
    const snoozed = await app.inject({
      method: 'POST',
      url: '/api/reminders/snooze',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: updated.json().savedReminder.version,
        approved: true,
        snoozedUntil
      }
    });
    expect(snoozed.statusCode).toBe(200);
    expect(snoozed.json().savedReminder.snoozedUntil).toBe(snoozedUntil);

    const completed = await app.inject({
      method: 'POST',
      url: '/api/reminders/complete',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: snoozed.json().savedReminder.version,
        approved: true
      }
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().savedReminder.recurrenceCadence).toBe('daily');
    expect(new Date(completed.json().savedReminder.scheduledAt).getTime()).toBeGreaterThan(new Date(snoozedUntil).getTime());

    const detail = await app.inject({
      method: 'GET',
      url: `/api/reminders/${created.savedReminder.id}?actorRole=stakeholder`
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().reminder.linkedInboxItem.title).toBe('Prep for the vet visit');
    expect(detail.json().timeline.map((entry: { eventType: string }) => entry.eventType)).toEqual(
      expect.arrayContaining(['created', 'rescheduled', 'snoozed', 'completed', 'recurrence_advanced'])
    );

    const itemDetail = await app.inject({
      method: 'GET',
      url: `/api/inbox/items/${inboxItem.id}?actorRole=stakeholder`
    });
    expect(itemDetail.statusCode).toBe(200);
    expect(itemDetail.json().item.status).toBe('open');

    const oneTimeReminder = await createReminderViaApi(app, {
      title: 'Pick up the package',
      recurrenceCadence: 'none'
    });
    const cancelled = await app.inject({
      method: 'POST',
      url: '/api/reminders/cancel',
      payload: {
        actorRole: 'stakeholder',
        reminderId: oneTimeReminder.savedReminder.id,
        expectedVersion: oneTimeReminder.savedReminder.version,
        approved: true
      }
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().savedReminder.state).toBe('cancelled');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('keeps spouse reminder access read-only and rejects stale reminder writes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const created = await createReminderViaApi(app, {
      title: 'Swap the air filter',
      scheduledAt: addHours(new Date(), 1).toISOString()
    });

    const spouseList = await app.inject({
      method: 'GET',
      url: '/api/reminders?actorRole=spouse'
    });
    expect(spouseList.statusCode).toBe(200);

    const spouseWrite = await app.inject({
      method: 'POST',
      url: '/api/reminders/preview-create',
      payload: {
        actorRole: 'spouse',
        structuredInput: {
          title: 'Order detergent',
          owner: 'stakeholder',
          scheduledAt: addDays(new Date(), 1).toISOString()
        }
      }
    });
    expect(spouseWrite.statusCode).toBe(403);
    expect(spouseWrite.json().code).toBe('ROLE_READ_ONLY');

    const firstUpdate = await app.inject({
      method: 'POST',
      url: '/api/reminders/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        proposedChange: { note: 'Buy the 16x25 size.' }
      }
    });
    expect(firstUpdate.statusCode).toBe(200);

    const staleUpdate = await app.inject({
      method: 'POST',
      url: '/api/reminders/snooze',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        snoozedUntil: addHours(new Date(), 8).toISOString()
      }
    });
    expect(staleUpdate.statusCode).toBe(409);
    expect(staleUpdate.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports AI-disabled structured reminder creation, settings persistence, and real push-subscription validation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/reminders/preview-create',
      payload: {
        actorRole: 'stakeholder',
        structuredInput: {
          title: 'Review camp forms',
          owner: 'stakeholder',
          scheduledAt: addDays(new Date(), 2).toISOString(),
          recurrenceCadence: 'monthly',
          note: 'Check the signature line.'
        }
      }
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().parserSource).toBe('rules');
    expect(preview.json().parsedReminder.title).toBe('Review camp forms');

    const settingsBefore = await app.inject({
      method: 'GET',
      url: '/api/reminders/settings?actorRole=stakeholder'
    });
    expect(settingsBefore.statusCode).toBe(200);
    expect(settingsBefore.json().preferences.enabled).toBe(false);

    const settingsSaved = await app.inject({
      method: 'POST',
      url: '/api/reminders/settings',
      payload: {
        actorRole: 'stakeholder',
        preferences: {
          enabled: true,
          dueRemindersEnabled: true,
          dailySummaryEnabled: false
        }
      }
    });
    expect(settingsSaved.statusCode).toBe(200);

    const settingsAfter = await app.inject({
      method: 'GET',
      url: '/api/reminders/settings?actorRole=stakeholder'
    });
    expect(settingsAfter.json().preferences).toMatchObject({
      actorRole: 'stakeholder',
      enabled: true,
      dueRemindersEnabled: true,
      dailySummaryEnabled: false
    });

    const invalidSubscription = await app.inject({
      method: 'POST',
      url: '/api/notifications/subscriptions',
      payload: {
        actorRole: 'stakeholder',
        endpoint: 'https://push.example.com/demo',
        payload: { endpoint: 'https://push.example.com/demo' }
      }
    });
    expect(invalidSubscription.statusCode).toBe(400);
    expect(invalidSubscription.json().code).toBe('INVALID_PUSH_SUBSCRIPTION');

    const validSubscription = await app.inject({
      method: 'POST',
      url: '/api/notifications/subscriptions',
      payload: {
        actorRole: 'stakeholder',
        endpoint: validPushPayload.endpoint,
        payload: validPushPayload
      }
    });
    expect(validSubscription.statusCode).toBe(200);
    expect(validSubscription.json().subscription.endpoint).toBe(validPushPayload.endpoint);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('reminder notification jobs', () => {
  it('respects reminder notification preferences, valid push readiness, and due-reminder dedupe', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const dbPath = join(directory, 'test.sqlite');
    const db = createDatabase(dbPath);
    const repository = new InboxRepository(db);
    const now = new Date('2026-03-14T08:15:00.000Z');
    const dueReminder = createReminder({
      id: crypto.randomUUID(),
      title: 'Call the pediatrician',
      note: null,
      owner: 'stakeholder',
      scheduledAt: subDays(now, 1).toISOString(),
      recurrenceCadence: 'none',
      linkedInboxItemId: null
    }, subDays(now, 2));

    repository.createReminder(dueReminder.reminder, dueReminder.timelineEntries);
    repository.saveNotificationSubscription('stakeholder', 'https://push.example.com/demo-invalid', {
      endpoint: 'https://push.example.com/demo-invalid'
    });

    const attempted: string[] = [];
    const trackingPush: Parameters<typeof evaluateDueReminderRule>[1] = {
      isConfigured: () => true,
      send: async (_subscription, notification) => {
        attempted.push(notification.tag);
      }
    };

    const config = { ...createConfig(dbPath), notificationsEnabled: true };
    await evaluateDueReminderRule(repository, trackingPush, config, makeLogger(), now);
    expect(attempted).toHaveLength(0);
    expect(repository.listNotificationDeliveries('stakeholder', 'due_reminder')).toHaveLength(0);

    repository.saveReminderNotificationPreferences('stakeholder', {
      enabled: true,
      dueRemindersEnabled: true,
      dailySummaryEnabled: false
    });
    repository.saveNotificationSubscription('stakeholder', validPushPayload.endpoint, validPushPayload);

    await evaluateDueReminderRule(repository, trackingPush, config, makeLogger(), now);
    await evaluateDueReminderRule(repository, trackingPush, config, makeLogger(), now);

    expect(attempted).toHaveLength(1);
    expect(attempted[0]).toContain('due-reminder-');
    expect(repository.listNotificationDeliveries('stakeholder', 'due_reminder')).toHaveLength(1);

    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('sends a daily summary only inside the configured window and at most once per day', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const dbPath = join(directory, 'test.sqlite');
    const db = createDatabase(dbPath);
    const repository = new InboxRepository(db);
    const summaryWindowNow = new Date('2026-03-14T08:05:00.000Z');
    const outsideWindow = new Date('2026-03-14T07:05:00.000Z');

    const activeReminder = createReminder({
      id: crypto.randomUUID(),
      title: 'Water the herbs',
      note: null,
      owner: 'stakeholder',
      scheduledAt: addMinutes(summaryWindowNow, 45).toISOString(),
      recurrenceCadence: 'none',
      linkedInboxItemId: null
    }, summaryWindowNow);
    repository.createReminder(activeReminder.reminder, activeReminder.timelineEntries);
    repository.saveReminderNotificationPreferences('stakeholder', {
      enabled: true,
      dueRemindersEnabled: false,
      dailySummaryEnabled: true
    });
    repository.saveNotificationSubscription('stakeholder', validPushPayload.endpoint, validPushPayload);

    const attempted: string[] = [];
    const trackingPush: Parameters<typeof evaluateDailySummaryRule>[1] = {
      isConfigured: () => true,
      send: async (_subscription, notification) => {
        attempted.push(notification.tag);
      }
    };

    const config = { ...createConfig(dbPath), notificationsEnabled: true };
    await evaluateDailySummaryRule(repository, trackingPush, config, makeLogger(), outsideWindow);
    await evaluateDailySummaryRule(repository, trackingPush, config, makeLogger(), summaryWindowNow);
    await evaluateDailySummaryRule(repository, trackingPush, config, makeLogger(), summaryWindowNow);

    expect(attempted).toEqual(['daily-summary-2026-03-14']);
    expect(repository.listNotificationDeliveries('stakeholder', 'daily_summary')).toHaveLength(1);

    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
