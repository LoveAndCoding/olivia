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
    expect(migrationFiles.map((row) => row.filename)).toEqual(['0000_initial.sql', '0001_first_class_reminders.sql', '0002_shared_lists.sql', '0003_recurring_routines.sql', '0004_meal_planning.sql']);
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

describe('shared list api', () => {
  it('stakeholder can create a list, add items, check and uncheck items', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Create list
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Grocery Run' }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedList } = createRes.json();
    expect(savedList.title).toBe('Grocery Run');
    expect(savedList.status).toBe('active');
    expect(savedList.version).toBe(1);

    // Add item
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Oat milk' }
    });
    expect(addRes.statusCode).toBe(201);
    const { savedItem } = addRes.json();
    expect(savedItem.body).toBe('Oat milk');
    expect(savedItem.checked).toBe(false);

    // Check item
    const checkRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedItem.version }
    });
    expect(checkRes.statusCode).toBe(200);
    const checkedItem = checkRes.json().savedItem;
    expect(checkedItem.checked).toBe(true);
    expect(checkedItem.checkedAt).not.toBeNull();

    // Uncheck item
    const uncheckRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/uncheck`,
      payload: { actorRole: 'stakeholder', expectedVersion: checkedItem.version }
    });
    expect(uncheckRes.statusCode).toBe(200);
    const uncheckedItem = uncheckRes.json().savedItem;
    expect(uncheckedItem.checked).toBe(false);
    expect(uncheckedItem.checkedAt).toBeNull();

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('stakeholder can archive and restore a list', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Packing List' }
    });
    const { savedList } = createRes.json();

    // Archive — requires confirmed: true
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedList.version, confirmed: true }
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json().savedList.status).toBe('archived');

    // Active index should not include the archived list
    const activeRes = await app.inject({
      method: 'GET',
      url: '/api/lists?actorRole=stakeholder'
    });
    expect(activeRes.json().lists.find((l: { id: string }) => l.id === savedList.id)).toBeUndefined();

    // Archived index should include it
    const archivedRes = await app.inject({
      method: 'GET',
      url: '/api/lists/archived?actorRole=stakeholder'
    });
    expect(archivedRes.json().lists.find((l: { id: string }) => l.id === savedList.id)).toBeDefined();

    // Restore
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/restore`,
      payload: { actorRole: 'stakeholder', expectedVersion: archiveRes.json().savedList.version }
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().savedList.status).toBe('active');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('stakeholder can permanently delete a list — requires confirmed: true', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'To Delete' }
    });
    const { savedList } = createRes.json();

    // Delete without confirmed should fail
    const badDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/lists/${savedList.id}`,
      payload: { actorRole: 'stakeholder' }
    });
    expect(badDeleteRes.statusCode).toBe(400);

    // Delete with confirmed: true
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/lists/${savedList.id}`,
      payload: { actorRole: 'stakeholder', confirmed: true }
    });
    expect(deleteRes.statusCode).toBe(204);

    // List should be gone
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${savedList.id}?actorRole=stakeholder`
    });
    expect(getRes.statusCode).toBe(404);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('spouse can read lists and items but cannot write', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Stakeholder creates a list with an item
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Shared List' }
    });
    const { savedList } = createRes.json();
    await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Buy milk' }
    });

    // Spouse can read list index
    const indexRes = await app.inject({ method: 'GET', url: '/api/lists?actorRole=spouse' });
    expect(indexRes.statusCode).toBe(200);
    expect(indexRes.json().lists).toHaveLength(1);

    // Spouse can read list detail
    const detailRes = await app.inject({ method: 'GET', url: `/api/lists/${savedList.id}?actorRole=spouse` });
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.json().items).toHaveLength(1);

    // Spouse cannot create a list
    const spouseCreateRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'spouse', title: 'Spouse List' }
    });
    expect(spouseCreateRes.statusCode).toBe(403);

    // Spouse cannot add an item
    const spouseAddItemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'spouse', body: 'Eggs' }
    });
    expect(spouseAddItemRes.statusCode).toBe(403);

    // Spouse cannot check an item
    const items = detailRes.json().items;
    const spouseCheckRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${items[0].id}/check`,
      payload: { actorRole: 'spouse', expectedVersion: items[0].version }
    });
    expect(spouseCheckRes.statusCode).toBe(403);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('detects version conflicts on list and item updates', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Conflict Test' }
    });
    const { savedList } = createRes.json();

    // Stale version on title update
    const conflictRes = await app.inject({
      method: 'PATCH',
      url: `/api/lists/${savedList.id}/title`,
      payload: { actorRole: 'stakeholder', expectedVersion: 99, title: 'New Title' }
    });
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json().code).toBe('VERSION_CONFLICT');

    // Add an item then use stale version
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Test Item' }
    });
    const { savedItem } = addRes.json();

    const itemConflictRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: 99 }
    });
    expect(itemConflictRes.statusCode).toBe(409);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('archive and restore routes reject requests without confirmation signal', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Confirm Test' }
    });
    const { savedList } = createRes.json();

    // Archive without confirmed
    const badArchive = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedList.version }
    });
    expect(badArchive.statusCode).toBe(400);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('list detail returns item count summary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Summary Test' }
    });
    const { savedList } = createRes.json();

    const item1Res = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Item A' }
    });
    const item2Res = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Item B' }
    });
    const item1 = item1Res.json().savedItem;

    // Check one item
    await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${item1.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: item1.version }
    });

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${savedList.id}?actorRole=stakeholder`
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.list.activeItemCount).toBe(2);
    expect(detail.list.checkedItemCount).toBe(1);
    expect(detail.list.allChecked).toBe(false);
    expect(detail.items).toHaveLength(2);
    void item2Res; // used for side effect

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('recurring routines api', () => {
  it('supports routine create, complete, pause, resume, archive, restore, and delete flows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-routines-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Create a routine
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Take out trash',
        owner: 'stakeholder',
        recurrenceRule: 'weekly',
        firstDueDate: subDays(new Date(), 1).toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();
    expect(savedRoutine.title).toBe('Take out trash');
    expect(savedRoutine.dueState).toBe('overdue');

    // List routines
    const listRes = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().routines).toHaveLength(1);

    // Spouse can read
    const spouseListRes = await app.inject({ method: 'GET', url: '/api/routines?actorRole=spouse' });
    expect(spouseListRes.statusCode).toBe(200);

    // Spouse cannot create
    const spouseCreateRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'spouse',
        title: 'Unauthorized',
        owner: 'spouse',
        recurrenceRule: 'daily',
        firstDueDate: new Date().toISOString()
      }
    });
    expect(spouseCreateRes.statusCode).toBe(403);

    // Complete routine — should advance due date by 1 week from original (schedule-anchored)
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    expect(completeRes.statusCode).toBe(200);
    const { savedRoutine: completedRoutine, occurrence } = completeRes.json();
    expect(occurrence.completedAt).toBeTruthy();
    expect(occurrence.dueDate).toBe(savedRoutine.currentDueDate);
    // After completion the routine should be upcoming (due date advanced by 1 week)
    expect(completedRoutine.dueState).toBe('upcoming');
    expect(completedRoutine.version).toBe(savedRoutine.version + 1);

    // Get routine detail including occurrence history
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/routines/${savedRoutine.id}?actorRole=stakeholder`
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.occurrences).toHaveLength(1);

    // Pause routine (requires confirmed: true)
    const pauseWithoutConfirm = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: completedRoutine.version }
    });
    expect(pauseWithoutConfirm.statusCode).toBe(400); // missing confirmed: true

    const pauseRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: completedRoutine.version, confirmed: true }
    });
    expect(pauseRes.statusCode).toBe(200);
    expect(pauseRes.json().savedRoutine.status).toBe('paused');
    expect(pauseRes.json().savedRoutine.dueState).toBe('paused');

    const pausedVersion = pauseRes.json().savedRoutine.version;

    // Resume routine
    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/resume`,
      payload: { actorRole: 'stakeholder', expectedVersion: pausedVersion }
    });
    expect(resumeRes.statusCode).toBe(200);
    expect(resumeRes.json().savedRoutine.status).toBe('active');

    const resumedVersion = resumeRes.json().savedRoutine.version;

    // Archive routine (requires confirmed: true)
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: resumedVersion, confirmed: true }
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json().savedRoutine.status).toBe('archived');

    const archivedVersion = archiveRes.json().savedRoutine.version;

    // Should appear in archived index, not active index
    const activeAfterArchive = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(activeAfterArchive.json().routines).toHaveLength(0);

    const archivedIndex = await app.inject({ method: 'GET', url: '/api/routines/archived?actorRole=stakeholder' });
    expect(archivedIndex.json().routines).toHaveLength(1);

    // Restore routine
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/restore`,
      payload: { actorRole: 'stakeholder', expectedVersion: archivedVersion }
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().savedRoutine.status).toBe('active');
    expect(restoreRes.json().savedRoutine.archivedAt).toBeNull();

    const restoredVersion = restoreRes.json().savedRoutine.version;

    // Delete routine (requires confirmed: true)
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/routines/${savedRoutine.id}`,
      payload: { actorRole: 'stakeholder', confirmed: true }
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().deleted).toBe(true);
    void restoredVersion;

    // Should be gone
    const afterDelete = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(afterDelete.json().routines).toHaveLength(0);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports every_n_days routine and version conflict detection', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-routines2-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Deep clean',
        owner: 'stakeholder',
        recurrenceRule: 'every_n_days',
        intervalDays: 14,
        firstDueDate: subDays(new Date(), 1).toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();
    expect(savedRoutine.recurrenceRule).toBe('every_n_days');
    expect(savedRoutine.intervalDays).toBe(14);

    // Complete it
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    expect(completeRes.statusCode).toBe(200);

    // Stale version conflict
    const stalePauseRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version, confirmed: true }
    });
    expect(stalePauseRes.statusCode).toBe(409);
    expect(stalePauseRes.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});
