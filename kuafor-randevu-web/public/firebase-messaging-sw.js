importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Firebase config
firebase.initializeApp({
  apiKey: "AIzaSyCxn28upfPJbYRljb1k8d1AvJe_FmcyGVU",
  authDomain: "kufaor-randevu.firebaseapp.com",
  projectId: "kufaor-randevu",
  storageBucket: "kufaor-randevu.firebasestorage.app",
  messagingSenderId: "458781052508",
  appId: "1:458781052508:web:6f63c8dc3373aa15d2a099"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('/')
  );
});
