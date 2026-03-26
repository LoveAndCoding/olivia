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
  const dir = mkdtempSync(join(tmpdir(), 'olivia-feedback-'));
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

const validContext = {
  route: '/settings',
  appVersion: '0.7.2',
  deviceInfo: 'iOS 18.0, Capacitor 6.0',
  recentErrors: ['TypeError: Cannot read property x']
};

describe('feedback API', () => {
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

  describe('POST /api/feedback', () => {
    it('creates feedback with valid payload', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'The list screen flickers when scrolling quickly',
          context: validContext
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.feedback.id).toBeDefined();
      expect(body.feedback.category).toBe('bug');
      expect(body.feedback.description).toBe('The list screen flickers when scrolling quickly');
      expect(body.feedback.status).toBe('new');
      expect(body.feedback.contextJson.route).toBe('/settings');
      expect(body.feedback.contextJson.appVersion).toBe('0.7.2');
      expect(body.feedback.screenshotBase64).toBeNull();
    });

    it('defaults category to bug when not provided', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          description: 'Something feels off about the navigation',
          context: validContext
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.feedback.category).toBe('bug');
    });

    it('accepts feature_request category', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'feature_request',
          description: 'Would love a dark mode option for the app',
          context: validContext
        }
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).feedback.category).toBe('feature_request');
    });

    it('accepts optional screenshotBase64', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'Visual glitch on the home screen right here',
          context: validContext,
          screenshotBase64: 'iVBORw0KGgoAAAANSUhEUg=='
        }
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.feedback.screenshotBase64).toBe('iVBORw0KGgoAAAANSUhEUg==');
    });

    it('rejects description shorter than 10 characters', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'short',
          context: validContext
        }
      });

      expect(res.statusCode).toBe(400);
    });

    it('rejects invalid category', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'complaint',
          description: 'This should fail validation',
          context: validContext
        }
      });

      expect(res.statusCode).toBe(400);
    });

    it('accepts context with empty recentErrors', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'general',
          description: 'Just wanted to say the app is working great',
          context: { ...validContext, recentErrors: [] }
        }
      });

      expect(res.statusCode).toBe(201);
      expect(JSON.parse(res.body).feedback.contextJson.recentErrors).toEqual([]);
    });
  });

  describe('GET /api/feedback', () => {
    async function submitFeedback(category: string, description: string) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { category, description, context: validContext }
      });
      return JSON.parse(res.body).feedback;
    }

    it('returns empty list when no feedback exists', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toEqual([]);
    });

    it('returns all feedback items', async () => {
      await submitFeedback('bug', 'First bug report with enough characters');
      await submitFeedback('feature_request', 'Would love a calendar integration feature');

      const res = await app.inject({
        method: 'GET',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toHaveLength(2);
    });

    it('filters by status', async () => {
      const fb = await submitFeedback('bug', 'A bug that will be acknowledged soon');

      // Acknowledge the first one
      await app.inject({
        method: 'PATCH',
        url: `/api/feedback/${fb.id}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { status: 'acknowledged' }
      });

      await submitFeedback('bug', 'Another bug report that stays new');

      const res = await app.inject({
        method: 'GET',
        url: '/api/feedback?status=new',
        headers: { authorization: `Bearer ${sessionToken}` }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.items).toHaveLength(1);
      expect(body.items[0].status).toBe('new');
    });
  });

  describe('PATCH /api/feedback/:id', () => {
    it('updates feedback status to acknowledged', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'Navigation breaks when tapping back quickly',
          context: validContext
        }
      });
      const feedbackId = JSON.parse(createRes.body).feedback.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/feedback/${feedbackId}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { status: 'acknowledged' }
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.feedback.status).toBe('acknowledged');
      expect(body.feedback.id).toBe(feedbackId);
    });

    it('updates feedback status to resolved', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'Items disappear from list after editing them',
          context: validContext
        }
      });
      const feedbackId = JSON.parse(createRes.body).feedback.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/feedback/${feedbackId}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { status: 'resolved' }
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).feedback.status).toBe('resolved');
    });

    it('returns 404 for non-existent feedback', async () => {
      const res = await app.inject({
        method: 'PATCH',
        url: '/api/feedback/00000000-0000-0000-0000-000000000000',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { status: 'acknowledged' }
      });

      expect(res.statusCode).toBe(404);
    });

    it('rejects invalid status value', async () => {
      const createRes = await app.inject({
        method: 'POST',
        url: '/api/feedback',
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: {
          category: 'bug',
          description: 'This feedback will have an invalid status update',
          context: validContext
        }
      });
      const feedbackId = JSON.parse(createRes.body).feedback.id;

      const res = await app.inject({
        method: 'PATCH',
        url: `/api/feedback/${feedbackId}`,
        headers: { authorization: `Bearer ${sessionToken}` },
        payload: { status: 'invalid_status' }
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
