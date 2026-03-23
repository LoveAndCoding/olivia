import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User Auth E2E Tests
 *
 * Uses Playwright's `request` fixture to test auth API flows directly.
 * Tests run in serial order — setup creates state that subsequent tests depend on.
 *
 * Note: Auth-dependent tests (PIN, logout) require a fresh session token
 * from account setup. When the DB is already initialized (from prior runs
 * or other test files), these tests skip gracefully.
 */

test.describe.serial('Multi-user auth flows', () => {
  let adminToken: string;
  let adminUserId: string;

  test('GET /api/auth/status returns initialization state', async ({ request }) => {
    const res = await request.get('/api/auth/status');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(typeof body.initialized).toBe('boolean');
    expect(typeof body.requiresSetup).toBe('boolean');
    expect(body.initialized).toBe(!body.requiresSetup);
  });

  test('account setup creates admin user with session token', async ({ request }) => {
    const statusRes = await request.get('/api/auth/status');
    const status = await statusRes.json();

    if (!status.requiresSetup) {
      // Already initialized from a prior test run — no way to get a fresh
      // token without auth enabled. Mark as empty so dependent tests skip.
      adminToken = '';
      adminUserId = '';
      return;
    }

    const res = await request.post('/api/auth/setup', {
      data: { name: 'Lexi', email: `lexi-${Date.now()}@test.local` }
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.user.role).toBe('admin');
    expect(body.user.householdId).toBe('household');
    expect(body.sessionToken).toBeDefined();

    adminToken = body.sessionToken;
    adminUserId = body.user.id;
  });

  test('duplicate setup returns 409 ALREADY_INITIALIZED', async ({ request }) => {
    const res = await request.post('/api/auth/setup', {
      data: { name: 'Duplicate', email: 'dup@test.local' }
    });

    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('ALREADY_INITIALIZED');
  });

  test('magic link request always returns success (prevents email enumeration)', async ({ request }) => {
    const res = await request.post('/api/auth/magic-link', {
      data: { email: 'nonexistent@nowhere.test' }
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(true);
    expect(body.message).toContain('If that email');
  });

  test('magic link verify rejects invalid tokens', async ({ request }) => {
    const res = await request.post('/api/auth/verify', {
      data: { token: 'bogus-token-12345' }
    });

    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('INVALID_TOKEN');
  });

  test('PIN set and verify flow for shared-device user switching', async ({ request }) => {
    if (!adminToken || !adminUserId) {
      // No fresh session — can't test PIN flow without auth
      test.skip();
      return;
    }

    // Set PIN
    const setPinRes = await request.post('/api/auth/pin/set', {
      data: { pin: '4321' },
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    expect(setPinRes.status()).toBe(200);

    // Verify correct PIN — should return a new session
    const verifyRes = await request.post('/api/auth/pin/verify', {
      data: { userId: adminUserId, pin: '4321' }
    });
    expect(verifyRes.status()).toBe(200);
    const verifyBody = await verifyRes.json();
    expect(verifyBody.sessionToken).toBeDefined();
    expect(verifyBody.user.id).toBe(adminUserId);

    // Wrong PIN must be rejected
    const badPinRes = await request.post('/api/auth/pin/verify', {
      data: { userId: adminUserId, pin: '0000' }
    });
    expect(badPinRes.status()).toBe(401);
    const badBody = await badPinRes.json();
    expect(badBody.error).toBe('INVALID_PIN');
  });

  test('logout invalidates session token', async ({ request }) => {
    if (!adminToken || !adminUserId) {
      test.skip();
      return;
    }

    // Create a fresh session via PIN verify (we set PIN in previous test)
    const verifyRes = await request.post('/api/auth/pin/verify', {
      data: { userId: adminUserId, pin: '4321' }
    });
    expect(verifyRes.status()).toBe(200);
    const { sessionToken } = await verifyRes.json();
    expect(sessionToken).toBeDefined();

    // Session should be valid
    const meRes = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    expect(meRes.status()).toBe(200);

    // Logout
    const logoutRes = await request.post('/api/auth/logout', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    expect(logoutRes.ok()).toBe(true);

    // Session should be invalid now
    const meRes2 = await request.get('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    expect(meRes2.status()).toBe(401);
  });
});
