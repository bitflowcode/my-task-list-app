"use client";

import { auth, db } from "./firebase";
import { doc, setDoc, deleteField, Timestamp } from "firebase/firestore";

/**
 * Pipeline de notificaciones:
 *
 *   Cliente (web/Capacitor)
 *     1. Pide permiso de notificaciones.
 *     2. Registra el token FCM y lo guarda en usuarios/{uid}.fcmToken.
 *
 *   Servidor (a ejecutar cada hora vía cron de Vercel)
 *     3. Lee tareas con fechaLimite <= hoy + 1h para cada usuario.
 *     4. Envía push con Admin SDK (messaging.send) al token correspondiente.
 *
 *   Archivos implicados:
 *     - lib/notificaciones.ts           (este fichero, cliente)
 *     - public/firebase-messaging-sw.js (service worker FCM en web)
 *     - app/api/cron/recordatorios/route.ts (cron, ver abajo)
 *
 * Para activar el envío desde el cron hay que configurar en Vercel:
 *   - vercel.json con crons → /api/cron/recordatorios cada hora
 *   - CRON_SECRET como variable de entorno
 */

/** Pide permiso y registra el token FCM del usuario actual. Devuelve true si todo OK. */
export async function solicitarPermisoYRegistrar(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const usuario = auth.currentUser;
  if (!usuario) return false;

  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } })
    .Capacitor;

  if (cap?.isNativePlatform?.()) {
    return registrarEnCapacitor(usuario.uid);
  }
  return registrarEnWeb(usuario.uid);
}

async function registrarEnWeb(uid: string): Promise<boolean> {
  try {
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) {
      console.warn("Falta NEXT_PUBLIC_FCM_VAPID_KEY");
      return false;
    }

    if (!("serviceWorker" in navigator) || !("Notification" in window)) return false;

    const permiso = await Notification.requestPermission();
    if (permiso !== "granted") return false;

    const mod = await import("firebase/messaging");
    if (!(await mod.isSupported())) return false;

    const messaging = mod.getMessaging();
    const registro = await navigator.serviceWorker.register("/firebase-messaging-sw.js");

    const token = await mod.getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registro,
    });
    if (!token) return false;

    await guardarToken(uid, token, "web");

    mod.onMessage(messaging, payload => {
      // Mensaje en foreground: mostramos una notificación ligera
      if (!payload.notification) return;
      new Notification(payload.notification.title || "Recordatorio", {
        body: payload.notification.body,
        icon: "/icon-192.png",
      });
    });

    return true;
  } catch (err) {
    console.warn("Error registrando FCM web:", err);
    return false;
  }
}

async function registrarEnCapacitor(uid: string): Promise<boolean> {
  try {
    const modFn = new Function("m", "return import(m)") as (
      m: string
    ) => Promise<Record<string, unknown>>;
    const mod = await modFn("@capacitor-firebase/messaging");
    const FirebaseMessaging = (mod as { FirebaseMessaging: Record<string, unknown> })
      .FirebaseMessaging as {
      requestPermissions: () => Promise<{ receive: string }>;
      getToken: () => Promise<{ token: string }>;
      addListener: (evt: string, cb: (p: unknown) => void) => Promise<unknown>;
    };
    const permiso = await FirebaseMessaging.requestPermissions();
    if (permiso.receive !== "granted") return false;
    const { token } = await FirebaseMessaging.getToken();
    if (!token) return false;
    const plataforma = /android/i.test(navigator.userAgent) ? "android" : "ios";
    await guardarToken(uid, token, plataforma);
    return true;
  } catch (err) {
    console.warn("Error registrando FCM nativo:", err);
    return false;
  }
}

async function guardarToken(
  uid: string,
  token: string,
  plataforma: "web" | "ios" | "android"
): Promise<void> {
  await setDoc(
    doc(db, "usuarios", uid),
    {
      fcm: {
        token,
        plataforma,
        actualizadoEn: Timestamp.now(),
      },
    },
    { merge: true }
  );
}

/** Llamar al cerrar sesión o al dejar de querer recibir push. */
export async function eliminarTokenFCM(uid: string): Promise<void> {
  await setDoc(doc(db, "usuarios", uid), { fcm: deleteField() }, { merge: true });
}
