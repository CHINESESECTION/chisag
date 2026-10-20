// firebase-messaging-sw.js  —  CHISAG background push handler
// Servbed from the SAME folder as the dashboard HTML so FCM auto-registers it.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyALYwNkZEmqnRUg6nhk9fs3jkI1HuW0Arc",
  databaseURL: "https://chisag-database-default-rtdb.firebaseio.com",
  projectId: "chisag-database",
  messagingSenderId: "PASTE_YOUR_FCM_SENDER_ID",   // replace with your Sender ID
  appId: "PASTE_YOUR_APP_ID"                        // replace with your App ID
});

const messaging = firebase.messaging();

// Shown when the dashboard tab is in the BACKGROUND or the site is CLOSED.
messaging.setBackgroundMessageHandler(function (payload) {
  const n = (payload && payload.notification) || {};
  const title = n.title || 'New CHISAG submission';
  const body = n.body || 'A new membership form was submitted.';
  const link = (payload && payload.webpush && payload.webpush.fcmOptions && payload.webpush.fcmOptions.link) || '/';
  return self.registration.showNotification(title, {
    body: body,
    icon: 'favicon.svg',
    badge: 'favicon.svg',
    data: { url: link }
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cl) {
      for (let i = 0; i < cl.length; i++) {
        const c = cl[i];
        if ('focus' in c) {
          if ('navigate' in c) c.navigate(target);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});
