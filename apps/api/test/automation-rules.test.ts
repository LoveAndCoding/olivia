import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';

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
  const dir = mkdtempSync(join(tmpdir(), 'olivia-automation-'));
  return { dir, dbPath: join(dir, 'test.sqlite') };
}

async function setupAdmin(app: FastifyInstance) {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/setup',
    payload: { name: 'Alex', email: 'alex@example.com' }
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  return { user: body.user, sessionToken: body.sessionToken };
}

describe('automation rules API', () => {
  let dir: string;
  let dbPath: string;
  let app: FastifyInstance;
  let sessionToken: string;

  beforeEach(async () => {
    ({ dir, dbPath } = makeDir());
    app = await buildApp({ config: createConfig(dbPath) });
    ({ sessionToken } = await setupAdmin(app));
  });

  afterEach(async () => {
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  describe('POST /api/automation-rules', () => {
    it('creates a rule with valid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence',
          scopeType: 'all'
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.rule.id).toBeDefined();
      expect(body.rule.triggerType).toBe('routine_overdue_days');
      expect(body.rule.triggerThreshold).toBe(3);
      expect(body.rule.actionType).toBe('skip_routine_occurrence');
      expect(body.rule.scopeType).toBe('all');
      expect(body.rule.enabled).toBe(true);
    });

    it('creates a rule scoped to specific entity', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'reminder_snooze_count',
          triggerThreshold: 5,
          actionType: 'resolve_reminder',
          scopeType: 'specific',
          scopeEntityId: '00000000-0000-0000-0000-000000000001'
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.rule.scopeType).toBe('specific');
      expect(body.rule.scopeEntityId).toBe('00000000-0000-0000-0000-000000000001');
    });

    it('rejects invalid trigger type', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'invalid_trigger',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence'
        }
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects threshold less than 1', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 0,
          actionType: 'skip_routine_occurrence'
        }
      });

      expect(res.statusCode).toBe(400);
    });

    it('enforces 20-rule limit per household', async () => {
      // Create 20 rules
      for (let i = 0; i < 20; i++) {
        const res = await app.inject({
          method: 'POST',
          url: '/api/automation-rules',
          headers: { authorization: `Bearer ${sessionToken}` },
          payload: {
            triggerType: 'routine_overdue_days',
            triggerThreshold: i + 1,
            actionType: 'skip_routine_occurrence'
          }
        });
        expect(res.statusCode).toBe(201);
      }

      // 21st should fail
      const res = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 99,
          actionType: 'skip_routine_occurrence'
        }
      });

      expect(res.statusCode).toBe(422);
      const body = JSON.parse(res.body);
      expect(body.code).toBe('RULE_LIMIT_REACHED');
    });
  });

  describe('GET /api/automation-rules', () => {
    it('returns empty list when no rules exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).rules).toEqual([]);
    });

    it('returns all rules', async () => {
      await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence'
        }
      });
      await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'reminder_overdue_days',
          triggerThreshold: 7,
          actionType: 'resolve_reminder'
        }
      });

      const res = await app.inject({
        method: 'GET',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).rules).toHaveLength(2);
    });
  });

  describe('PATCH /api/automation-rules/:id', () => {
    it('toggles rule enabled state', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence'
        }
      });
      const ruleId = JSON.parse(createRes.body).rule.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/automation-rules/${ruleId}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { enabled: false }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).rule.enabled).toBe(false);
    });

    it('updates trigger threshold', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence'
        }
      });
      const ruleId = JSON.parse(createRes.body).rule.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/automation-rules/${ruleId}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { triggerThreshold: 5 }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).rule.triggerThreshold).toBe(5);
    });

    it('returns 404 for non-existent rule', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/automation-rules/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { enabled: false }
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('DELETE /api/automation-rules/:id', () => {
    it('deletes an existing rule', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          triggerType: 'routine_overdue_days',
          triggerThreshold: 3,
          actionType: 'skip_routine_occurrence'
        }
      });
      const ruleId = JSON.parse(createRes.body).rule.id;

      const res = await app.inject({
        method: 'DELETE',
        url: `/api/automation-rules/${ruleId}`,
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(204);

      // Verify it's gone
      const listRes = await app.inject({
        method: 'GET',
        url: '/api/automation-rules',
        headers: { authorization: `Bearer ${sessionToken}` }
      });
      expect(JSON.parse(listRes.body).rules).toHaveLength(0);
    });

    it('returns 404 for non-existent rule', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: '/api/automation-rules/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/automation-log', () => {
    it('returns empty list when no log entries exist', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/automation-log',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).entries).toEqual([]);
    });
  });
});
