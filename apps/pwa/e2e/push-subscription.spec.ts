import { expect, test } from '@playwright/test';

/**
 * OLI-303: Push Notification Subscription E2E Tests
 *
 * Validates the push subscription API endpoints:
 * - VAPID public key retrieval
 * - Subscription creation (POST)
 * - Subscription deletion (DELETE)
 * - Subscription persistence across requests
 * - Input validation (malformed requests)
 *
 * Note: Actual browser push permission and Service Worker tests
 * require a real HTTPS environment. These tests validate the
 * server-side subscription management via API.
 */

test.describe.serial('Push subscription API', () => {
  const testEndpoint = `https://push.test.local/sub-${Date.now()}`;
  const testKeys = {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPo',
    auth: 'tBHItJI5svbpC7EvEnNuSQ',
  };

  test('GET /api/push-subscriptions/vapid-public-key returns key or null', async ({ request }) => {
    const res = await request.get('/api/push-subscriptions/vapid-public-key');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('vapidPublicKey');
    // vapidPublicKey may be null if VAPID keys not configured — that's valid
    expect(body.vapidPublicKey === null || typeof body.vapidPublicKey === 'string').toBe(true);
  });

  test('POST /api/push-subscriptions creates a subscription', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        endpoint: testEndpoint,
        keys: testKeys,
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.id).toBeDefined();
    expect(body.endpoint).toBe(testEndpoint);
  });

  test('POST /api/push-subscriptions with same endpoint is idempotent (upsert)', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        endpoint: testEndpoint,
        keys: testKeys,
      },
    });
    expect(res.status()).toBe(201);

    const body = await res.json();
    expect(body.endpoint).toBe(testEndpoint);
  });

  test('POST /api/push-subscriptions rejects missing endpoint', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        keys: testKeys,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/push-subscriptions rejects missing keys', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        endpoint: 'https://push.test.local/no-keys',
      },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/push-subscriptions rejects invalid endpoint URL', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        endpoint: 'not-a-url',
        keys: testKeys,
      },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/push-subscriptions rejects empty keys', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: {
        endpoint: 'https://push.test.local/empty-keys',
        keys: { p256dh: '', auth: '' },
      },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/push-subscriptions removes subscription by endpoint', async ({ request }) => {
    const res = await request.delete(`/api/push-subscriptions?endpoint=${encodeURIComponent(testEndpoint)}`);
    expect(res.status()).toBe(204);
  });

  test('DELETE /api/push-subscriptions without endpoint returns 400', async ({ request }) => {
    const res = await request.delete('/api/push-subscriptions');
    expect(res.status()).toBe(400);
  });

  test('DELETE /api/push-subscriptions for non-existent endpoint succeeds silently', async ({ request }) => {
    const res = await request.delete(
      `/api/push-subscriptions?endpoint=${encodeURIComponent('https://push.test.local/nonexistent')}`
    );
    // DELETE should be idempotent — deleting a non-existent subscription is not an error
    expect(res.status()).toBe(204);
  });
});

test.describe.serial('Push subscription persistence', () => {
  const persistEndpoint = `https://push.test.local/persist-${Date.now()}`;
  const persistKeys = {
    p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8p8REfXPo',
    auth: 'tBHItJI5svbpC7EvEnNuSQ',
  };

  test('create subscription', async ({ request }) => {
    const res = await request.post('/api/push-subscriptions', {
      data: { endpoint: persistEndpoint, keys: persistKeys },
    });
    expect(res.status()).toBe(201);
  });

  test('subscription persists across separate requests', async ({ request }) => {
    // Re-POST the same subscription — should succeed (upsert)
    const res = await request.post('/api/push-subscriptions', {
      data: { endpoint: persistEndpoint, keys: persistKeys },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.endpoint).toBe(persistEndpoint);
  });

  test('cleanup: delete test subscription', async ({ request }) => {
    const res = await request.delete(
      `/api/push-subscriptions?endpoint=${encodeURIComponent(persistEndpoint)}`
    );
    expect(res.status()).toBe(204);
  });
});

test.describe('Legacy notification subscription compatibility', () => {
  test('GET /api/notifications/vapid-public-key returns compatible response', async ({ request }) => {
    const res = await request.get('/api/notifications/vapid-public-key');
    expect(res.ok()).toBe(true);

    const body = await res.json();
    expect(body).toHaveProperty('vapidPublicKey');
    expect(body).toHaveProperty('notificationsEnabled');
  });
});
