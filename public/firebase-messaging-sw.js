importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyC4ntyxT8hglnD_EO1wUN2-Irz36LBcVrU",
  authDomain: "guardian-angel-20c2b.firebaseapp.com",
  projectId: "guardian-angel-20c2b",
  storageBucket: "guardian-angel-20c2b.appspot.com",
  messagingSenderId: "802763272390",
  appId: "1:802763272390:web:a3d5a24d9acee1a4b167c7"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: payload.data || {}
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
}); 