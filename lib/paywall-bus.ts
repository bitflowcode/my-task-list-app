"use client";

const EVENTO = "app:paywall-open";

/**
 * Datos que viajan en el evento del paywall. El servidor (402)
 * los rellena todos; cuando se abre manualmente (ej. al pulsar
 * "Mejora a Premium") basta con `motivo`.
 */
export type PayloadPaywall = {
  motivo?: string;
  recurso?: "whisper" | "parseo" | "categorizacion";
  tier?: "free" | "premium";
  limite?: number;
  mensaje?: string;
};

/**
 * Dispara la apertura del paywall. Acepta string (legacy) o
 * un PayloadPaywall completo.
 */
export function abrirPaywall(arg?: string | PayloadPaywall): void {
  if (typeof window === "undefined") return;
  const detail: PayloadPaywall =
    typeof arg === "string" ? { motivo: arg } : arg ?? {};
  window.dispatchEvent(new CustomEvent(EVENTO, { detail }));
}

export function suscribirsePaywall(
  callback: (payload: PayloadPaywall) => void
): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<PayloadPaywall>;
    callback(custom.detail ?? {});
  };
  window.addEventListener(EVENTO, handler);
  return () => window.removeEventListener(EVENTO, handler);
}

/**
 * Inspecciona una Response de fetch. Si es 402, abre el paywall
 * con el payload completo del servidor. Si es otro error, lanza
 * con el mensaje correspondiente. Si la respuesta es ok, no
 * hace nada.
 */
export async function manejarErroresApi(resp: Response): Promise<void> {
  if (resp.ok) return;
  let data: Record<string, unknown> = {};
  try {
    data = await resp.json();
  } catch {
    // body no JSON: ignoramos
  }
  const mensaje =
    typeof data.error === "string" ? data.error : `HTTP ${resp.status}`;

  if (resp.status === 402) {
    abrirPaywall({
      motivo: typeof data.motivo === "string" ? data.motivo : undefined,
      recurso:
        data.recurso === "whisper" ||
        data.recurso === "parseo" ||
        data.recurso === "categorizacion"
          ? data.recurso
          : undefined,
      tier: data.tier === "premium" ? "premium" : "free",
      limite: typeof data.limite === "number" ? data.limite : undefined,
      mensaje,
    });
  }
  throw new Error(mensaje);
}
