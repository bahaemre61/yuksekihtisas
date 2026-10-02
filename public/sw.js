self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: '/icons/notification-icon.svg',
      badge: '/icons/file.svg',
      vibrate: [300, 100, 300],
      data: {
        url: data.url
      },
      actions: [
        { action: 'open', title: 'GÖREVİ GÖR ↗️' }
      ]
    };

    // Açık sekmelere haber ver: sayfa kendini anında yenileyebilsin (örn. değerlendirme popup'ı)
    const notifyClients = self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        windowClients.forEach(function (client) {
          client.postMessage({ type: 'push-received', url: data.url });
        });
      });

    event.waitUntil(
      Promise.all([
        self.registration.showNotification(data.title, options),
        notifyClients
      ])
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = event.notification.data.url || '/dashboard/gorevlerim';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(function (windowClients) {
        // Açık bir sekme varsa onu hedef sayfaya götür, yoksa yeni pencere aç
        for (const client of windowClients) {
          if ('focus' in client && 'navigate' in client) {
            return client.navigate(target).then(function (c) {
              return (c || client).focus();
            });
          }
        }
        return self.clients.openWindow(target);
      })
  );
});
