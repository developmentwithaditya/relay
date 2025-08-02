self.addEventListener('push', event => {
  const data = event.data.json();
  console.log('New notification', data);

  const options = {
    body: data.body,
    icon: data.icon, // e.g. '/icon-192x192.png'
    badge: '/badge-72x72.png', // Optional: for Android
    data: {
      url: self.location.origin, // URL to open on click
    },
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // If a window for the app is already open, focus it.
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
          }
        }
        return client.focus();
      }
      // Otherwise, open a new window.
      return clients.openWindow(urlToOpen);
    })
  );
});
