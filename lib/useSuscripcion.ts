"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "../components/AuthProvider";

export type Tier = "free" | "premium";

export type EstadoSuscripcion = {
  tier: Tier;
  productId: string | null;
  expiraEn: Date | null;
  renovacionAutomatica: boolean;
  plataforma: "ios" | "android" | "web" | null;
  cargando: boolean;
};

const ESTADO_INICIAL: EstadoSuscripcion = {
  tier: "free",
  productId: null,
  expiraEn: null,
  renovacionAutomatica: false,
  plataforma: null,
  cargando: true,
};

/**
 * Lee en tiempo real el documento `suscripciones/{uid}`. El webhook de
 * RevenueCat lo actualiza, así que al activar premium el hook propaga el
 * cambio automáticamente sin necesidad de recargar.
 */
export function useSuscripcion(): EstadoSuscripcion {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoSuscripcion>(ESTADO_INICIAL);

  useEffect(() => {
    if (!user) {
      setEstado({ ...ESTADO_INICIAL, cargando: false });
      return;
    }

    const ref = doc(db, "suscripciones", user.uid);
    const unsub = onSnapshot(
      ref,
      snap => {
        if (!snap.exists()) {
          setEstado({
            tier: "free",
            productId: null,
            expiraEn: null,
            renovacionAutomatica: false,
            plataforma: null,
            cargando: false,
          });
          return;
        }
        const data = snap.data() as Record<string, unknown>;
        const rawExpira = data.expiraEn as { toDate?: () => Date } | null | undefined;
        const expiraEn =
          rawExpira && typeof rawExpira.toDate === "function" ? rawExpira.toDate() : null;
        const tierRaw = data.tier === "premium" ? "premium" : "free";
        const tier: Tier =
          tierRaw === "premium" && expiraEn && expiraEn.getTime() < Date.now() ? "free" : tierRaw;

        setEstado({
          tier,
          productId: (data.productId as string) || null,
          expiraEn,
          renovacionAutomatica: Boolean(data.renovacionAutomatica),
          plataforma: (data.plataforma as EstadoSuscripcion["plataforma"]) || null,
          cargando: false,
        });
      },
      err => {
        console.warn("No se pudo leer la suscripción:", err);
        setEstado({ ...ESTADO_INICIAL, cargando: false });
      }
    );

    return () => unsub();
  }, [user]);

  return estado;
}
