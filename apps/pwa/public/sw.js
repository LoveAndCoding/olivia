// Olivia service worker — handles push notifications, action buttons, and offline queue.

// ─── IndexedDB helpers (no Dexie in SW context) ─────────────────────────────

const SW_DB_NAME = 'olivia-sw';
const SW_DB_VERSION = 1;
const AUTH_STORE = 'authToken';
const OUTBOX_STORE = 'actionOutbox';

function openSwDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(SW_DB_NAME, SW_DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUTH_STORE)) {
        db.createObjectStore(AUTH_STORE);
      }
      if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
        db.createObjectStore(OUTBOX_STORE, { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAuthToken() {
  try {
    const db = await openSwDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(AUTH_STORE, 'readonly');
      const store = tx.objectStore(AUTH_STORE);
      const req = store.get('token');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function queueAction(entry) {
  try {
    const db = await openSwDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.add({ ...entry, createdAt: new Date().toISOString() });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Best effort — if IndexedDB fails, the action is lost
  }
}

async function getAllQueuedActions() {
  try {
    const db = await openSwDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, 'readonly');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function removeQueuedAction(id) {
  try {
    const db = await openSwDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(OUTBOX_STORE, 'readwrite');
      const store = tx.objectStore(OUTBOX_STORE);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Best effort
  }
}

// ─── Action → API endpoint mapping ──────────────────────────────────────────

function getActionEndpoint(action, entityType, entityId) {
  switch (action) {
    case 'mark_done':
      return { url: `/api/push-actions/routine-complete`, body: { routineId: entityId } };
    case 'skip':
      return { url: `/api/push-actions/routine-skip`, body: { routineId: entityId } };
    case 'done':
      return { url: `/api/push-actions/reminder-done`, body: { reminderId: entityId } };
    case 'snooze':
      return { url: `/api/push-actions/reminder-snooze`, body: { reminderId: entityId } };
    default:
      return null;
  }
}

async function executeAction(action, entityType, entityId) {
  const endpoint = getActionEndpoint(action, entityType, entityId);
  if (!endpoint) return { ok: false, reason: 'unknown_action' };

  const token = await getAuthToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(endpoint.url, {
    method: 'POST',
    headers,
    body: JSON.stringify(endpoint.body),
  });

  if (response.ok) return { ok: true };
  if (response.status === 409) return { ok: true, noop: true }; // Already acted on — silent success
  if (response.status === 401) return { ok: false, reason: 'auth_expired' };
  return { ok: false, reason: `http_${response.status}` };
}

// ─── Outbox retry ────────────────────────────────────────────────────────────

async function retryQueuedActions() {
  const queued = await getAllQueuedActions();
  for (const entry of queued) {
    try {
      const result = await executeAction(entry.action, entry.entityType, entry.entityId);
      if (result.ok) {
        await removeQueuedAction(entry.id);
      }
      // If still failing, leave in queue for next retry
    } catch {
      // Network still down — leave in queue
    }
  }
}

// ─── Push event ──────────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Olivia', body: event.data.text() };
  }

  const { title = 'Olivia', body = '', url, tag, actions, entityId, entityType } = payload;

  const notificationOptions = {
    body,
    tag: tag || undefined,
    data: { url: url || '/', entityId, entityType },
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  };

  // Add action buttons if the platform supports them (graceful degradation)
  if (actions && actions.length > 0) {
    notificationOptions.actions = actions;
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions),
  );
});

// ─── Notification click ──────────────────────────────────────────────────────

self.addEventListener('notificationclick', (event) => {
  const { entityId, entityType, url } = event.notification.data || {};
  const action = event.action; // Empty string if notification body was clicked (no action button)

  event.notification.close();

  // If no action button was tapped, open the app normally
  if (!action) {
    const targetUrl = url || '/';
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(targetUrl) && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(targetUrl);
      }),
    );
    return;
  }

  // Action button was tapped — execute the API call
  if (!entityId || !entityType) return;

  event.waitUntil(
    (async () => {
      try {
        const result = await executeAction(action, entityType, entityId);
        if (result.ok) {
          // Retry any previously queued actions while we have connectivity
          await retryQueuedActions();
          return;
        }
        if (result.reason === 'auth_expired') {
          // Queue for retry when the app refreshes the token
          await queueAction({ action, entityType, entityId });
          await self.registration.showNotification('Olivia', {
            body: 'Queued — will sync when you open the app.',
            tag: 'push-action-queued',
            icon: '/icon-192.png',
          });
          return;
        }
      } catch {
        // Network failure — queue for retry
        await queueAction({ action, entityType, entityId });
        await self.registration.showNotification('Olivia', {
          body: 'Queued — will sync when online.',
          tag: 'push-action-queued',
          icon: '/icon-192.png',
        });
      }
    })(),
  );
});
