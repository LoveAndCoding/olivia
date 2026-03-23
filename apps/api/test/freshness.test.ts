import { randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { subDays } from 'date-fns';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/client';

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
  nudgePushIntervalMs: 1_800_000,
  pwaOrigin: 'http://localhost:4173',
  householdTimezone: 'UTC',
  apns: { keyId: null, teamId: null, privateKey: null, bundleId: 'com.loveandcoding.olivia', useSandbox: true },
  paperclip: { apiUrl: null, apiKey: null, companyId: null, sreAgentId: null },
  auth: { enabled: false, resendApiKey: null },
});

function makeDir() {
  const dir = mkdtempSync(join(tmpdir(), 'olivia-freshness-'));
  return { dir, dbPath: join(dir, 'test.sqlite') };
}

describe('freshness API', () => {
  let dir: string;
  let dbPath: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    ({ dir, dbPath } = makeDir());
    app = await buildApp({ config: createConfig(dbPath) });
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function insertStaleInboxItem(db: ReturnType<typeof createDatabase>, id: string, title: string, daysAgo: number) {
    const date = subDays(new Date(), daysAgo).toISOString();
    db.prepare(`
      INSERT INTO inbox_items (id, title, owner, status, created_at, updated_at, version, last_status_changed_at)
      VALUES (?, ?, 'stakeholder', 'open', ?, ?, 1, ?)
    `).run(id, title, date, date, date);
  }

  function insertStaleReminder(db: ReturnType<typeof createDatabase>, id: string, title: string, daysAgoPastDue: number) {
    const date = subDays(new Date(), daysAgoPastDue).toISOString();
    db.prepare(`
      INSERT INTO reminders (id, title, owner, recurrence_cadence, scheduled_at, created_at, updated_at, version)
      VALUES (?, ?, 'stakeholder', 'none', ?, ?, ?, 1)
    `).run(id, title, date, date, date);
  }

  function insertStaleRoutine(db: ReturnType<typeof createDatabase>, id: string, title: string, daysAgoCreated: number) {
    const date = subDays(new Date(), daysAgoCreated).toISOString();
    db.prepare(`
      INSERT INTO routines (id, title, owner, recurrence_rule, interval_days, status, current_due_date, created_at, updated_at, version)
      VALUES (?, ?, 'stakeholder', 'every_n_days', 7, 'active', ?, ?, ?, 1)
    `).run(id, title, date, date, date);
  }

  // ─── GET /api/freshness/stale-items ──────────────────────────────────────

  it('returns empty when no stale items', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toEqual([]);
    expect(body.totalStaleCount).toBe(0);
  });

  it('returns stale inbox items', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Old task', 20);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].entityType).toBe('inbox');
    expect(body.items[0].entityId).toBe(id);
    expect(body.items[0].entityName).toBe('Old task');
    expect(body.totalStaleCount).toBe(1);
  });

  it('returns stale reminders past 7 days', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleReminder(db, id, 'Old reminder', 10);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(1);
    expect(body.items[0].entityType).toBe('reminder');
  });

  it('caps at 10 items and reports total count', async () => {
    const db = createDatabase(dbPath);
    for (let i = 0; i < 12; i++) {
      insertStaleInboxItem(db, randomUUID(), `Old task ${i}`, 20 + i);
    }
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.items).toHaveLength(10);
    expect(body.totalStaleCount).toBe(12);
  });

  // ─── POST /api/freshness/confirm ─────────────────────────────────────────

  it('resets freshnessCheckedAt on an entity', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Confirm test', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/confirm',
      payload: { entityType: 'inbox', entityId: id, actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().newVersion).toBe(2);

    // Item should no longer be stale
    const staleRes = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(staleRes.json().items).toHaveLength(0);
  });

  it('returns 409 on version conflict', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Conflict test', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/confirm',
      payload: { entityType: 'inbox', entityId: id, actorRole: 'stakeholder', expectedVersion: 999 }
    });
    expect(res.statusCode).toBe(409);
  });

  it('allows spouse to confirm freshness (full write access)', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Spouse test', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/confirm',
      payload: { entityType: 'inbox', entityId: id, actorRole: 'spouse', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);
  });

  // ─── POST /api/freshness/archive ─────────────────────────────────────────

  it('archives an inbox item (status → done)', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Archive test', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/archive',
      payload: { entityType: 'inbox', entityId: id, actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().newVersion).toBe(2);

    // Item should no longer be stale (archived)
    const staleRes = await app.inject({ method: 'GET', url: '/api/freshness/stale-items' });
    expect(staleRes.json().items).toHaveLength(0);
  });

  it('pauses a routine via archive', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleRoutine(db, id, 'Routine to pause', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/archive',
      payload: { entityType: 'routine', entityId: id, actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);
  });

  it('allows spouse to archive (full write access)', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Spouse archive', 20);
    db.close();

    const res = await app.inject({
      method: 'POST',
      url: '/api/freshness/archive',
      payload: { entityType: 'inbox', entityId: id, actorRole: 'spouse', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);
  });

  // ─── Health Check State ──────────────────────────────────────────────────

  it('health check state shows by default (never completed)', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/freshness/health-check-state' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.shouldShow).toBe(true);
    expect(body.lastCompletedAt).toBeNull();
  });

  it('completing health check hides it', async () => {
    await app.inject({ method: 'POST', url: '/api/freshness/health-check-complete' });

    const res = await app.inject({ method: 'GET', url: '/api/freshness/health-check-state' });
    const body = res.json();
    expect(body.shouldShow).toBe(false);
    expect(body.lastCompletedAt).not.toBeNull();
  });

  it('dismissing health check hides it for today', async () => {
    await app.inject({ method: 'POST', url: '/api/freshness/health-check-dismiss' });

    const res = await app.inject({ method: 'GET', url: '/api/freshness/health-check-state' });
    const body = res.json();
    expect(body.shouldShow).toBe(false);
    expect(body.lastDismissedAt).not.toBeNull();
  });

  // ─── GET /api/nudges includes freshness ──────────────────────────────────

  it('GET /api/nudges includes freshness nudges for stale items', async () => {
    const db = createDatabase(dbPath);
    const id = randomUUID();
    insertStaleInboxItem(db, id, 'Stale for nudge', 20);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/nudges' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const freshnessNudges = body.nudges.filter((n: any) => n.entityType === 'freshness');
    expect(freshnessNudges).toHaveLength(1);
    expect(freshnessNudges[0].entitySubType).toBe('inbox');
    expect(freshnessNudges[0].entityId).toBe(id);
  });

  it('freshness nudges exclude meal plans', async () => {
    const db = createDatabase(dbPath);
    // Create a meal plan in the past (prior usage exists) but no current week plan
    const pastDate = subDays(new Date(), 14).toISOString();
    const pastWeekStart = subDays(new Date(), 14).toISOString().slice(0, 10);
    db.prepare(`
      INSERT INTO meal_plans (id, title, week_start_date, status, generated_list_refs, created_at, updated_at, version)
      VALUES (?, 'Past week plan', ?, 'active', '[]', ?, ?, 1)
    `).run(randomUUID(), pastWeekStart, pastDate, pastDate);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/nudges' });
    const body = res.json();
    const freshnessNudges = body.nudges.filter((n: any) => n.entityType === 'freshness');
    // Meal plan should NOT appear as a freshness nudge
    const mealPlanNudges = freshnessNudges.filter((n: any) => n.entitySubType === 'mealPlan');
    expect(mealPlanNudges).toHaveLength(0);
  });

  it('freshness nudges sort after routine/reminder nudges', async () => {
    const db = createDatabase(dbPath);
    // Insert stale inbox item (will generate freshness nudge)
    insertStaleInboxItem(db, randomUUID(), 'Stale item', 20);
    // Insert overdue routine (will generate routine nudge)
    const routineId = randomUUID();
    const pastDate = subDays(new Date(), 3).toISOString();
    db.prepare(`
      INSERT INTO routines (id, title, owner, recurrence_rule, interval_days, status, current_due_date, created_at, updated_at, version)
      VALUES (?, 'Overdue routine', 'stakeholder', 'weekly', NULL, 'active', ?, ?, ?, 1)
    `).run(routineId, pastDate, pastDate, pastDate);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/nudges' });
    const body = res.json();
    const types = body.nudges.map((n: any) => n.entityType);
    const routineIdx = types.indexOf('routine');
    const freshnessIdx = types.indexOf('freshness');
    expect(routineIdx).toBeLessThan(freshnessIdx);
  });
});
