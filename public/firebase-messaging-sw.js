/* Service worker de Firebase Cloud Messaging para notificaciones en background en web.
 *
 * NOTA: este fichero debe estar en /public y servirse en la raíz para que
 * FCM pueda registrarlo. Los valores de firebaseConfig deben ser públicos
 * (los mismos que usa la app cliente).
 *
 * Las variables se inyectan en build-time por Vercel (busca placeholders).
 */

importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.1/firebase-messaging-compat.js');

// Los valores de firebaseConfig son públicos; duplicados aquí porque el
// service worker no puede acceder a variables de entorno de Node.
// Edítalos si cambias de proyecto Firebase.
firebase.initializeApp({
  apiKey: 'AIzaSyBjA_2WTR1V7GryR7qjOvWQZ0-LN4Zyisk',
  authDomain: 'app-mis-tareas.firebaseapp.com',
  projectId: 'app-mis-tareas',
  storageBucket: 'app-mis-tareas.firebasestorage.app',
  messagingSenderId: '1056408590214',
  appId: '1:1056408590214:web:0c7905c1650b3f08137e07',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
  const titulo = (payload.notification && payload.notification.title) || 'Recordatorio';
  const opciones = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(titulo, opciones);
});
