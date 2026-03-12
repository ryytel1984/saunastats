importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBLDW1zvw-31GJTIbh4mBXtXwpNpDJK1uI",
  authDomain: "saunastats-f3807.firebaseapp.com",
  projectId: "saunastats-f3807",
  storageBucket: "saunastats-f3807.firebasestorage.app",
  messagingSenderId: "396824416968",
  appId: "1:396824416968:web:1236de8cc9d1e824e1cbfd",
});

firebase.messaging();

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://saunastats.eu/friends')
  );
});
