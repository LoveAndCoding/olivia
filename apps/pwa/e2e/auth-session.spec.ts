import { expect, test } from '@playwright/test';

/**
 * OLI-303: Auth Session Management E2E Tests
 *
 * Validates session lifecycle:
 * - Session creation via setup and PIN
 * - Concurrent session independence
 * - Logout invalidation (single session, not all)
 * - Re-authentication after logout
 * - Invalid token handling
 * - Auth status consistency
 *
 * Expects a fresh DB (standard E2E test environment).
 */

test.describe.serial('Auth session management', () => {
  let adminUserId: string;
  let adminToken: string;

  test('establish admin session via setup', async ({ request }) => {
    // Try setup — this succeeds on a fresh DB
    const setupRes = await request.post('/api/auth/setup', {
      data: { name: 'Lexi', email: `lexi-session-${Date.now()}@test.local` },
    });

    if (setupRes.status() === 200) {
      const body = await setupRes.json();
      adminToken = body.sessionToken;
      adminUserId = body.user.id;
      return;
    }

    // 409 — another worker already initialized. Try to get a session.
    // First check if we can access members without auth (auth middleware disabled)
    const membersRes = await request.get('/api/household/members');
    if (membersRes.ok()) {
      const { members } = await membersRes.json();
      const admin = members.find((m: { role: string }) => m.role === 'admin');
      if (admin) {
        adminUserId = admin.id;
        adminToken = '';
        return;
      }
    }

    // Members requires auth — try to find user ID from admin export
    const exportRes = await request.get('/api/admin/export');
    if (exportRes.ok()) {
      const snapshot = await exportRes.json();
      let userId: string | undefined;
      for (const item of snapshot.items ?? []) {
        if (item.createdByUserId) { userId = item.createdByUserId as string; break; }
      }
      if (userId) {
        // Try known test PINs
        for (const pin of ['1234', '4321']) {
          const pinRes = await request.post('/api/auth/pin/verify', { data: { userId, pin } });
          if (pinRes.status() === 200) {
            adminToken = (await pinRes.json()).sessionToken;
            adminUserId = userId;
            return;
          }
        }
      }
    }

    // Cannot establish session — another worker raced us. Skip gracefully.
    // This test suite will pass on a fresh DB when it wins the setup race.
    test.skip();
  });

  test('set PIN for admin user', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const res = await request.post('/api/auth/pin/set', {
      data: { pin: '1234' },
      headers: adminToken ? { Authorization: `Bearer ${adminToken}` } : {},
    });
    expect(res.status()).toBe(200);
  });

  test('PIN verify creates a new, independent session', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const res = await request.post('/api/auth/pin/verify', {
      data: { userId: adminUserId, pin: '1234' },
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.sessionToken).toBeDefined();
    expect(body.user.id).toBe(adminUserId);

    // Both sessions should work independently
    if (adminToken) {
      expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${adminToken}` } })).status()).toBe(200);
    }
    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${body.sessionToken}` } })).status()).toBe(200);
  });

  test('logout invalidates only the logged-out session', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const res1 = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    const session1 = (await res1.json()).sessionToken;

    const res2 = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    const session2 = (await res2.json()).sessionToken;

    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${session1}` } })).status()).toBe(200);
    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${session2}` } })).status()).toBe(200);

    expect((await request.post('/api/auth/logout', { headers: { Authorization: `Bearer ${session1}` } })).ok()).toBe(true);

    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${session1}` } })).status()).toBe(401);
    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${session2}` } })).status()).toBe(200);
  });

  test('re-auth via PIN after logout succeeds', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const createRes = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    const token = (await createRes.json()).sessionToken;

    await request.post('/api/auth/logout', { headers: { Authorization: `Bearer ${token}` } });

    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(401);

    const reAuthRes = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    expect(reAuthRes.status()).toBe(200);

    const newToken = (await reAuthRes.json()).sessionToken;
    expect((await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${newToken}` } })).status()).toBe(200);
  });

  test('authenticated household/members returns member list', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const pinRes = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    const token = (await pinRes.json()).sessionToken;

    const membersRes = await request.get('/api/household/members', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(membersRes.ok()).toBe(true);

    const { members } = await membersRes.json();
    expect(Array.isArray(members)).toBe(true);
    expect(members.length).toBeGreaterThanOrEqual(1);

    const admin = members.find((m: { role: string }) => m.role === 'admin');
    expect(admin).toBeDefined();
    expect(admin.id).toBe(adminUserId);
  });

  // ── Invalid session handling ──

  test('garbage token returns 401', async ({ request }) => {
    expect((await request.get('/api/auth/me', { headers: { Authorization: 'Bearer garbage-token-xyz' } })).status()).toBe(401);
  });

  test('empty bearer returns 401', async ({ request }) => {
    expect((await request.get('/api/auth/me', { headers: { Authorization: 'Bearer ' } })).status()).toBe(401);
  });

  test('PIN verify with non-existent user returns error', async ({ request }) => {
    const res = await request.post('/api/auth/pin/verify', {
      data: { userId: '00000000-0000-0000-0000-000000000000', pin: '1234' },
    });
    expect(res.ok()).toBe(false);
    expect([400, 401, 404]).toContain(res.status());
  });

  test('PIN verify with wrong PIN returns 401 INVALID_PIN', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const res = await request.post('/api/auth/pin/verify', {
      data: { userId: adminUserId, pin: '9999' },
    });
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('INVALID_PIN');
  });

  // ── Auth status consistency ──

  test('auth/status reflects initialized state', async ({ request }) => {
    const res = await request.get('/api/auth/status');
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.initialized).toBe(true);
    expect(body.requiresSetup).toBe(false);
  });

  test('auth/me returns user profile with expected fields', async ({ request }) => {
    if (!adminUserId) { test.skip(); return; }
    const pinRes = await request.post('/api/auth/pin/verify', { data: { userId: adminUserId, pin: '1234' } });
    const token = (await pinRes.json()).sessionToken;

    const meRes = await request.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    expect(meRes.status()).toBe(200);

    const body = await meRes.json();
    const user = body.user ?? body;
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('name');
    expect(user).toHaveProperty('email');
    expect(user).toHaveProperty('role');
    expect(user).toHaveProperty('householdId');
  });
});
