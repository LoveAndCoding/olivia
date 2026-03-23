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
  const dir = mkdtempSync(join(tmpdir(), 'olivia-auth-'));
  return { dir, dbPath: join(dir, 'test.sqlite') };
}

/** Setup admin account and return user + session token */
async function setupAdmin(app: FastifyInstance, name = 'Alex', email = 'alex@example.com') {
  const res = await app.inject({
    method: 'POST',
    url: '/api/auth/setup',
    payload: { name, email }
  });
  expect(res.statusCode).toBe(200);
  const body = JSON.parse(res.body);
  return { user: body.user, sessionToken: body.sessionToken };
}

describe('auth & identity', () => {
  let dir: string;
  let dbPath: string;

  beforeEach(() => {
    ({ dir, dbPath } = makeDir());
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('GET /api/auth/status returns requiresSetup=true on fresh database', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const res = await app.inject({ method: 'GET', url: '/api/auth/status' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.initialized).toBe(false);
    expect(body.requiresSetup).toBe(true);
    await app.close();
  });

  it('POST /api/auth/setup creates admin user and returns session token', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { user, sessionToken } = await setupAdmin(app);

    expect(user.name).toBe('Alex');
    expect(user.email).toBe('alex@example.com');
    expect(user.role).toBe('admin');
    expect(user.householdId).toBe('household');
    expect(sessionToken).toBeDefined();

    // Status should now show initialized
    const statusRes = await app.inject({ method: 'GET', url: '/api/auth/status' });
    const statusBody = JSON.parse(statusRes.body);
    expect(statusBody.initialized).toBe(true);
    expect(statusBody.requiresSetup).toBe(false);

    await app.close();
  });

  it('POST /api/auth/setup rejects second setup attempt', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    await setupAdmin(app);

    const secondRes = await app.inject({
      method: 'POST',
      url: '/api/auth/setup',
      payload: { name: 'Jordan', email: 'jordan@example.com' }
    });
    expect(secondRes.statusCode).toBe(409);

    await app.close();
  });

  it('POST /api/auth/magic-link always returns success (prevents email enumeration)', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/magic-link',
      payload: { email: 'nobody@example.com' }
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.sent).toBe(true);

    await app.close();
  });

  it('setup session token works for authenticated endpoints', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { sessionToken } = await setupAdmin(app);

    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body);
    expect(meBody.user.name).toBe('Alex');
    expect(meBody.user.role).toBe('admin');

    await app.close();
  });

  it('POST /api/auth/verify rejects expired/used tokens', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/verify',
      payload: { token: 'totally-invalid-token' }
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.error).toBe('INVALID_TOKEN');

    await app.close();
  });

  it('PIN set and verify flow works for shared-device switching', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { user, sessionToken } = await setupAdmin(app);

    // Set PIN
    const setPinRes = await app.inject({
      method: 'POST',
      url: '/api/auth/pin/set',
      headers: { authorization: `Bearer ${sessionToken}` },
      payload: { pin: '1234' }
    });
    expect(setPinRes.statusCode).toBe(200);

    // Verify PIN — creates new session
    const pinVerifyRes = await app.inject({
      method: 'POST',
      url: '/api/auth/pin/verify',
      payload: { userId: user.id, pin: '1234' }
    });
    expect(pinVerifyRes.statusCode).toBe(200);
    const pinBody = JSON.parse(pinVerifyRes.body);
    expect(pinBody.user.name).toBe('Alex');
    expect(pinBody.sessionToken).toBeDefined();

    // Wrong PIN rejected
    const badPinRes = await app.inject({
      method: 'POST',
      url: '/api/auth/pin/verify',
      payload: { userId: user.id, pin: '9999' }
    });
    expect(badPinRes.statusCode).toBe(401);

    await app.close();
  });

  it('invitation flow: admin generates code, invited user claims and joins', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { sessionToken: adminSession } = await setupAdmin(app);

    // Generate invite
    const inviteRes = await app.inject({
      method: 'POST',
      url: '/api/household/invite',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {}
    });
    expect(inviteRes.statusCode).toBe(200);
    const { code, expiresAt } = JSON.parse(inviteRes.body);
    expect(code).toHaveLength(6);
    expect(expiresAt).toBeDefined();

    // Claim invite — returns session directly
    const claimRes = await app.inject({
      method: 'POST',
      url: '/api/household/invite/claim',
      payload: { code, name: 'Jordan', email: 'jordan@example.com' }
    });
    expect(claimRes.statusCode).toBe(200);
    const claimBody = JSON.parse(claimRes.body);
    expect(claimBody.user.name).toBe('Jordan');
    expect(claimBody.user.role).toBe('member');
    expect(claimBody.user.householdId).toBe('household');
    expect(claimBody.sessionToken).toBeDefined();

    // Jordan can access authenticated endpoints
    const jordanMeRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${claimBody.sessionToken}` }
    });
    expect(jordanMeRes.statusCode).toBe(200);
    expect(JSON.parse(jordanMeRes.body).user.name).toBe('Jordan');

    // Check household members
    const membersRes = await app.inject({
      method: 'GET',
      url: '/api/household/members',
      headers: { authorization: `Bearer ${adminSession}` }
    });
    expect(membersRes.statusCode).toBe(200);
    const membersBody = JSON.parse(membersRes.body);
    expect(membersBody.members).toHaveLength(2);

    await app.close();
  });

  it('rejects duplicate invite claim with same code', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { sessionToken: adminSession } = await setupAdmin(app);

    const inviteRes = await app.inject({
      method: 'POST',
      url: '/api/household/invite',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {}
    });
    const { code } = JSON.parse(inviteRes.body);

    // First claim succeeds
    await app.inject({
      method: 'POST',
      url: '/api/household/invite/claim',
      payload: { code, name: 'Jordan', email: 'jordan@example.com' }
    });

    // Second claim fails — code already used
    const secondRes = await app.inject({
      method: 'POST',
      url: '/api/household/invite/claim',
      payload: { code, name: 'Sam', email: 'sam@example.com' }
    });
    expect(secondRes.statusCode).toBe(404);

    await app.close();
  });

  it('POST /api/auth/logout invalidates session', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { sessionToken } = await setupAdmin(app);

    // Session is valid before logout
    const meRes = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    expect(meRes.statusCode).toBe(200);

    // Logout
    await app.inject({
      method: 'POST',
      url: '/api/auth/logout',
      headers: { authorization: `Bearer ${sessionToken}` }
    });

    // Session is invalid after logout
    const meRes2 = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${sessionToken}` }
    });
    expect(meRes2.statusCode).toBe(401);

    await app.close();
  });

  it('M32 two-user limit enforced on invite generation', async () => {
    const app = await buildApp({ config: createConfig(dbPath) });
    const { sessionToken: adminSession } = await setupAdmin(app);

    // Generate and claim first invite
    const invite1Res = await app.inject({
      method: 'POST',
      url: '/api/household/invite',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {}
    });
    const { code } = JSON.parse(invite1Res.body);
    await app.inject({
      method: 'POST',
      url: '/api/household/invite/claim',
      payload: { code, name: 'Jordan', email: 'jordan@example.com' }
    });

    // Second invite should fail — household full
    const invite2Res = await app.inject({
      method: 'POST',
      url: '/api/household/invite',
      headers: { authorization: `Bearer ${adminSession}` },
      payload: {}
    });
    expect(invite2Res.statusCode).toBe(409);
    const body = JSON.parse(invite2Res.body);
    expect(body.error).toBe('HOUSEHOLD_FULL');

    await app.close();
  });
});
