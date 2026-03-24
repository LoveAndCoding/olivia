// Olivia service worker — handles push notifications and notification clicks.

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Olivia', body: event.data.text() };
  }

  const { title = 'Olivia', body = '', url, tag } = payload;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || undefined,
      data: { url: url || '/' },
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    }),
  );
});
