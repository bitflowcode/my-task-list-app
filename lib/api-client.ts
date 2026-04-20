"use client";

import { auth } from "./firebase";

async function getIdTokenObligatorio(): Promise<string> {
  const usuario = auth.currentUser;
  if (!usuario) {
    throw new Error("Debes iniciar sesión para usar esta funcionalidad.");
  }
  return usuario.getIdToken();
}

/**
 * Realiza un fetch adjuntando el Firebase ID token del usuario actual en
 * `Authorization: Bearer <token>`. Úsalo para todos los endpoints /api/* de IA.
 */
export async function authedFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getIdTokenObligatorio();
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${token}`);
  return fetch(input, { ...init, headers });
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
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<TRespuesta>;
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
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}));
    throw new Error(data?.error || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<TRespuesta>;
}
