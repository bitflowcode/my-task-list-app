"use client";

import { auth, appCheck } from "./firebase";
import { abrirPaywall } from "./paywall-bus";

async function getIdTokenObligatorio(forceRefresh = false): Promise<string> {
  const usuario = auth.currentUser;
  if (!usuario) {
    throw new Error("Debes iniciar sesión para usar esta funcionalidad.");
  }
  return usuario.getIdToken(forceRefresh);
}

/**
 * Refresca el ID token. Útil tras una reautenticación reciente para que el
 * servidor reciba un token con `auth_time` actual al borrar la cuenta.
 */
export async function refrescarIdToken(): Promise<string> {
  return getIdTokenObligatorio(true);
}

/** GET autenticado que devuelve la respuesta cruda (útil para descargas). */
export async function authedFetchRaw(url: string): Promise<Response> {
  const resp = await authedFetch(url, { method: 'GET' });
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `HTTP ${resp.status}`);
  }
  return resp;
}

async function obtenerAppCheckToken(): Promise<string | null> {
  if (!appCheck) return null;
  try {
    const mod = await import("firebase/app-check");
    const result = await mod.getToken(appCheck, false);
    return result.token || null;
  } catch (err) {
    console.warn("No se pudo obtener App Check token:", err);
    return null;
  }
}

/**
 * Realiza un fetch adjuntando el Firebase ID token del usuario actual en
 * `Authorization: Bearer <token>`. Úsalo para todos los endpoints /api/* de IA.
 * Si App Check está configurado, también incluye la cabecera
 * `X-Firebase-AppCheck` que el servidor verifica para rechazar clientes
 * que no sean la app/web legítimos.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const [token, appCheckToken] = await Promise.all([
    getIdTokenObligatorio(),
    obtenerAppCheckToken(),
  ]);
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  if (appCheckToken) headers.set("X-Firebase-AppCheck", appCheckToken);
  return fetch(input, { ...init, headers });
}

async function manejarRespuesta<T>(resp: Response): Promise<T> {
  if (resp.ok) {
    return resp.json() as Promise<T>;
  }
  const data = await resp.json().catch(() => ({}));
  const mensaje = data?.error || `HTTP ${resp.status}`;

  if (resp.status === 402) {
    abrirPaywall(typeof mensaje === "string" ? mensaje : undefined);
  }

  throw new Error(mensaje);
}

/** POST JSON con autenticación. */
export async function authedPostJson<TRespuesta = unknown>(
  url: string,
  body: unknown
): Promise<TRespuesta> {
  const resp = await authedFetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return manejarRespuesta<TRespuesta>(resp);
}

/** POST de FormData (p. ej. audio) con autenticación. */
export async function authedPostFormData<TRespuesta = unknown>(
  url: string,
  formData: FormData
): Promise<TRespuesta> {
  const resp = await authedFetch(url, {
    method: "POST",
    body: formData,
  });
  return manejarRespuesta<TRespuesta>(resp);
}
