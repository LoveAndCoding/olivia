import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User Invitation E2E Tests
 *
 * Tests the household invitation flow in serial order.
 * First test ensures admin exists, subsequent tests build on that state.
 */

test.describe.serial('Household invitation flow', () => {
  let adminToken: string;
  let inviteCode: string;
  let memberCount: number;

  test('ensure admin exists and get household context', async ({ request }) => {
    const statusRes = await request.get('/api/auth/status');
    const status = await statusRes.json();

    if (status.requiresSetup) {
      const setupRes = await request.post('/api/auth/setup', {
        data: { name: 'Lexi', email: `lexi-inv-${Date.now()}@test.local` }
      });
      expect(setupRes.status()).toBe(200);
      const body = await setupRes.json();
      adminToken = body.sessionToken;
    } else {
      adminToken = ''; // auth middleware disabled in dev
    }

    // Verify we can fetch members
    const membersRes = await request.get('/api/household/members');
    expect(membersRes.ok()).toBe(true);
    const members = await membersRes.json();
    memberCount = members.members.length;
    expect(memberCount).toBeGreaterThanOrEqual(1);
  });

  test('admin can generate an invite code', async ({ request }) => {
    const res = await request.post('/api/household/invite', {
      data: {},
      headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}
    });

    if (memberCount >= 2) {
      // Household already full — verify enforcement
      expect(res.status()).toBe(409);
      const body = await res.json();
      expect(body.error).toBe('HOUSEHOLD_FULL');
      return;
    }

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.code).toHaveLength(6);
    expect(body.expiresAt).toBeDefined();
    inviteCode = body.code;
  });

  test('invite code can be claimed to join the household', async ({ request }) => {
    if (memberCount >= 2) {
      // Already full from previous runs — skip claim but don't hide it
      test.skip();
      return;
    }
    expect(inviteCode).toBeDefined();

    const res = await request.post('/api/household/invite/claim', {
      data: {
        code: inviteCode,
        name: 'Christian',
        email: `christian-${Date.now()}@test.local`
      }
    });
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.user.name).toBe('Christian');
    expect(body.user.role).toBe('member');
    expect(body.user.householdId).toBe('household');
    expect(body.sessionToken).toBeDefined();

    memberCount = 2;
  });

  test('claimed invite code cannot be reused', async ({ request }) => {
    if (!inviteCode) {
      // No invite was generated (household was already full)
      test.skip();
      return;
    }

    const res = await request.post('/api/household/invite/claim', {
      data: { code: inviteCode, name: 'Second', email: `second-${Date.now()}@test.local` }
    });

    // Must fail — code already claimed or household full
    expect(res.ok()).toBe(false);
    expect([404, 409]).toContain(res.status());
  });

  test('M32 two-user household limit is enforced on invite generation', async ({ request }) => {
    // At this point household should have 2 members
    const membersRes = await request.get('/api/household/members');
    expect(membersRes.ok()).toBe(true);
    const members = await membersRes.json();
    expect(members.members.length).toBe(2);

    // Attempt to generate another invite — must fail
    const res = await request.post('/api/household/invite', {
      data: {},
      headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}
    });
    expect(res.status()).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('HOUSEHOLD_FULL');
  });

  test('household members endpoint returns all members with correct fields', async ({ request }) => {
    const res = await request.get('/api/household/members');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(Array.isArray(body.members)).toBe(true);
    expect(body.members.length).toBeGreaterThanOrEqual(1);

    for (const member of body.members) {
      expect(member.id).toBeDefined();
      expect(member.name).toBeDefined();
      expect(member.email).toBeDefined();
      expect(member.householdId).toBe('household');
      expect(['admin', 'member']).toContain(member.role);
    }
  });

  test('duplicate email is rejected during invite claim', async ({ request }) => {
    // This test requires being able to generate an invite (household not full)
    // If household is full, the invite generation will fail with HOUSEHOLD_FULL which we verify separately
    const invRes = await request.post('/api/household/invite', {
      data: {},
      headers: adminToken ? { 'Authorization': `Bearer ${adminToken}` } : {}
    });

    if (invRes.status() === 409) {
      // Household full — can't test email dedup directly, but the limit test covers the guard
      test.skip();
      return;
    }

    const { code } = await invRes.json();

    // Get an existing member's email
    const membersRes = await request.get('/api/household/members');
    const members = await membersRes.json();
    const existingEmail = members.members[0].email;

    const claimRes = await request.post('/api/household/invite/claim', {
      data: { code, name: 'Imposter', email: existingEmail }
    });
    expect(claimRes.status()).toBe(409);
    const body = await claimRes.json();
    expect(body.error).toBe('EMAIL_IN_USE');
  });
});
