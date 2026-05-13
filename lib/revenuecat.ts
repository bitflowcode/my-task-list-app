"use client";

/**
 * Wrapper cliente para RevenueCat. En plataformas nativas (iOS/Android vía
 * Capacitor) carga `@revenuecat/purchases-capacitor` dinámicamente. En web
 * devuelve stubs que informan "no disponible" sin romper la build.
 *
 * El SDK se inicializa con la `app_user_id` igual al Firebase UID del usuario,
 * de forma que el webhook puede mapear 1:1 el evento al doc `suscripciones/{uid}`.
 */

import { auth } from "./firebase";

// Import indirecto para evitar que Next/TS intente resolver el módulo de
// Capacitor en entornos que aún no lo tengan instalado (p. ej. antes de
// correr la fase 3 del plan que añade Capacitor). El string literal evita
// que el bundler de webpack intente resolverlo estáticamente.
async function cargarSDK(): Promise<Record<string, unknown>> {
  const nombreModulo = "@revenuecat/purchases-capacitor";
  return (await import(/* webpackIgnore: true */ nombreModulo)) as Record<string, unknown>;
}

let inicializado = false;

type PaqueteCompra = {
  identificador: string;
  precio: string;
  periodo: "mensual" | "anual" | "otro";
};

type ResultadoCompra = { ok: true } | { ok: false; cancelado: boolean; error?: string };

export function esPlataformaNativa(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Inicializa el SDK. Debe llamarse lo antes posible tras login, con el UID
 * de Firebase como `appUserID`. Ignora silenciosamente en web.
 */
export async function inicializarRevenueCat(): Promise<void> {
  if (inicializado) return;
  if (!esPlataformaNativa()) return;

  const apiKey =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof navigator !== "undefined" && /android/i.test((navigator as any).userAgent)
      ? process.env.NEXT_PUBLIC_REVENUECAT_ANDROID_KEY
      : process.env.NEXT_PUBLIC_REVENUECAT_IOS_KEY;

  if (!apiKey) {
    console.warn("Sin API key de RevenueCat para la plataforma actual");
    return;
  }

  try {
    const mod = await cargarSDK();
    const { Purchases } = mod as unknown as {
      Purchases: {
        configure: (opts: { apiKey: string; appUserID?: string | null }) => Promise<unknown>;
        logIn: (opts: { appUserID: string }) => Promise<unknown>;
      };
    };
    const uid = auth.currentUser?.uid ?? null;
    await Purchases.configure({ apiKey, appUserID: uid });
    inicializado = true;
  } catch (err) {
    console.error("No se pudo inicializar RevenueCat:", err);
  }
}

export async function identificarUsuarioRevenueCat(uid: string): Promise<void> {
  if (!esPlataformaNativa()) return;
  try {
    const mod = await cargarSDK();
    const { Purchases } = mod as unknown as {
      Purchases: { logIn: (opts: { appUserID: string }) => Promise<unknown> };
    };
    await Purchases.logIn({ appUserID: uid });
  } catch (err) {
    console.error("Error en logIn RevenueCat:", err);
  }
}

export async function obtenerPaquetes(): Promise<PaqueteCompra[]> {
  if (!esPlataformaNativa()) return [];
  try {
    const mod = await cargarSDK();
    const { Purchases } = mod as unknown as {
      Purchases: {
        getOfferings: () => Promise<{
          current?: { availablePackages?: Array<Record<string, unknown>> } | null;
        }>;
      };
    };
    const offerings = await Purchases.getOfferings();
    const paquetes = offerings.current?.availablePackages || [];
    return paquetes.map(p => {
      const idNorm = String(
        (p.identifier as string) || (p.packageType as string) || ""
      ).toLowerCase();
      const periodo: PaqueteCompra["periodo"] = idNorm.includes("annual") || idNorm.includes("yearly")
        ? "anual"
        : idNorm.includes("monthly") || idNorm.includes("month")
        ? "mensual"
        : "otro";
      const product = p.product as Record<string, unknown> | undefined;
      return {
        identificador: String(p.identifier),
        precio:
          (product?.priceString as string) ||
          (product?.price_string as string) ||
          String(product?.price ?? ""),
        periodo,
      };
    });
  } catch (err) {
    console.error("Error leyendo offerings:", err);
    return [];
  }
}

export async function comprarPaquete(identificador: string): Promise<ResultadoCompra> {
  if (!esPlataformaNativa()) {
    return {
      ok: false,
      cancelado: false,
      error: "Las compras solo están disponibles en la app móvil.",
    };
  }
  try {
    const mod = await cargarSDK();
    const { Purchases } = mod as unknown as {
      Purchases: {
        getOfferings: () => Promise<{
          current?: { availablePackages?: Array<Record<string, unknown>> } | null;
        }>;
        purchasePackage: (opts: {
          aPackage: Record<string, unknown>;
        }) => Promise<Record<string, unknown>>;
      };
    };
    const offerings = await Purchases.getOfferings();
    const paquete = offerings.current?.availablePackages?.find(
      p => String(p.identifier) === identificador
    );
    if (!paquete) {
      return { ok: false, cancelado: false, error: "Paquete no disponible" };
    }
    await Purchases.purchasePackage({ aPackage: paquete });
    return { ok: true };
  } catch (err: unknown) {
    const mensaje = err instanceof Error ? err.message : String(err);
    const cancelado = /cancel/i.test(mensaje);
    return { ok: false, cancelado, error: cancelado ? undefined : mensaje };
  }
}

export async function restaurarCompras(): Promise<ResultadoCompra> {
  if (!esPlataformaNativa()) {
    return { ok: false, cancelado: false, error: "Disponible solo en la app móvil" };
  }
  try {
    const mod = await cargarSDK();
    const { Purchases } = mod as unknown as {
      Purchases: { restorePurchases: () => Promise<unknown> };
    };
    await Purchases.restorePurchases();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      cancelado: false,
      error: err instanceof Error ? err.message : "Error restaurando compras",
    };
  }
}
