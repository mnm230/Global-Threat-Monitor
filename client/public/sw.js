self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
  const data = event.data;
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, icon, url } = data;
    event.waitUntil(
      self.registration.showNotification(title, {
        body: body || '',
        tag: tag || 'warroom-alert',
        icon: icon || '/favicon.png',
        badge: '/favicon.png',
        vibrate: [200, 100, 200],
        requireInteraction: data.critical || false,
        data: { url: url || '/' },
      })
    );
  }
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })
  );
});
