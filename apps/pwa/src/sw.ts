/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Workbox injects precache manifest here at build time
precacheAndRoute(self.__WB_MANIFEST);

// ─── Prompt-based update: activate waiting SW on message from client ─────────

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    void self.skipWaiting();
  }
});

// ─── Push event handler ──────────────────────────────────────────────────────

self.addEventListener('push', (event: PushEvent) => {
  if (!event.data) return;

  let payload: { title?: string; body?: string; tag?: string; url?: string };
  try {
    payload = event.data.json() as typeof payload;
  } catch {
    payload = { title: 'Olivia', body: event.data.text() };
  }

  const title = payload.title ?? 'Olivia';
  const options: NotificationOptions = {
    body: payload.body ?? '',
    tag: payload.tag ?? 'olivia-nudge',
    icon: '/favicon.svg',
    data: { url: payload.url ?? '/' },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// ─── Notification click handler ──────────────────────────────────────────────

self.addEventListener('notificationclick', (event: NotificationEvent) => {
  event.notification.close();

  const url: string = (event.notification.data as { url?: string } | null)?.url ?? '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url.startsWith(self.location.origin) && 'focus' in client) {
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      })
  );
});
