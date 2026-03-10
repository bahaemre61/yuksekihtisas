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

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url || '/dashboard/gorevlerim')
  );
});