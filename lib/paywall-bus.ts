"use client";

const EVENTO = "app:paywall-open";

/**
 * Dispara la apertura del paywall desde cualquier parte de la app.
 * Útil al recibir un 402 de un endpoint IA: el handler del fetch puede
 * invocar esto sin necesidad de pasar props por media app.
 */
export function abrirPaywall(motivo?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { motivo } }));
}

export function suscribirsePaywall(callback: (motivo?: string) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ motivo?: string }>;
    callback(custom.detail?.motivo);
  };
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}

/**
 * Inspecciona una Response de fetch. Si el estado es 402 (cuota agotada),
 * abre el paywall y lanza un Error con el mensaje devuelto por el servidor.
 * Si es otro error, lanza igualmente con el mensaje correspondiente. Si la
 * respuesta es ok, no hace nada.
 */
export async function manejarErroresApi(resp: Response): Promise<void> {
  if (resp.ok) return;
  let data: Record<string, unknown> = {};
  try {
    data = await resp.json();
  } catch {
    // ignoramos si no es JSON
  }
  const error = typeof data.error === "string" ? data.error : `HTTP ${resp.status}`;

  if (resp.status === 402) {
    abrirPaywall(error);
  }
  throw new Error(error);
}
