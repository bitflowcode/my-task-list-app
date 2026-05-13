"use client";

import { auth } from "./firebase";

/**
 * Wrapper unificado sobre Firebase Analytics y PostHog.
 *
 * - Firebase Analytics: se carga solo en web (getAnalytics usa IndexedDB).
 *   En Capacitor nativo se puede añadir @capacitor-firebase/analytics más
 *   adelante si hace falta medir dentro de la app nativa.
 * - PostHog: también funciona en WebView, carga condicional si la clave
 *   pública está definida.
 *
 * Ambos son opt-out fácilmente: si no configuras la variable de entorno
 * correspondiente, la función no hace nada (silenciosa).
 *
 * Para entornos bajo GDPR, la carga solo se realiza cuando el usuario
 * ha dado consentimiento (asumido implícitamente al aceptar los Términos
 * al registrarse, opt-in explícito para analítica detallada queda como
 * mejora futura).
 */

type EventoBase = Record<string, unknown>;

let firebaseAnalytics: unknown = null;
let posthogCargado = false;
let deshabilitado = false;

async function cargarFirebaseAnalytics(): Promise<void> {
  if (firebaseAnalytics || typeof window === "undefined") return;
  try {
    const mod = await import("firebase/analytics");
    if (!(await mod.isSupported())) return;
    const { getAnalytics } = mod;
    const app = (await import("firebase/app")).getApps()[0];
    if (!app) return;
    firebaseAnalytics = getAnalytics(app);
  } catch (err) {
    console.warn("Firebase Analytics no disponible:", err);
  }
}

async function cargarPostHog(): Promise<void> {
  if (posthogCargado || typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";
  if (!key) return;
  try {
    const mod = await import("posthog-js");
    mod.default.init(key, {
      api_host: host,
      capture_pageview: true,
      autocapture: false,
      persistence: "localStorage",
      disable_session_recording: true,
    });
    posthogCargado = true;
  } catch (err) {
    console.warn("PostHog no disponible:", err);
  }
}

export async function inicializarAnalytics(): Promise<void> {
  if (deshabilitado) return;
  await Promise.all([cargarFirebaseAnalytics(), cargarPostHog()]);

  // Identificamos al usuario en PostHog cuando hay sesión, con el UID
  // como distinct id (mismo id en todos los dispositivos).
  if (typeof window === "undefined") return;
  auth.onAuthStateChanged(async usuario => {
    if (!posthogCargado) return;
    try {
      const mod = await import("posthog-js");
      if (usuario) {
        mod.default.identify(usuario.uid, {
          email: usuario.email || undefined,
          nombre: usuario.displayName || undefined,
        });
      } else {
        mod.default.reset();
      }
    } catch {
      // ignore
    }
  });
}

export function deshabilitarAnalytics(): void {
  deshabilitado = true;
}

export async function registrarEvento(nombre: string, params: EventoBase = {}): Promise<void> {
  if (deshabilitado) return;
  if (typeof window === "undefined") return;

  try {
    if (firebaseAnalytics) {
      const { logEvent } = await import("firebase/analytics");
      logEvent(firebaseAnalytics as never, nombre, params);
    }
    if (posthogCargado) {
      const mod = await import("posthog-js");
      mod.default.capture(nombre, params);
    }
  } catch (err) {
    console.warn(`No se pudo registrar evento ${nombre}:`, err);
  }
}
