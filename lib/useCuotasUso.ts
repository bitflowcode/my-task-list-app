"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { useAuth } from "../components/AuthProvider";
import { Tier } from "./useSuscripcion";

export type ConsumoMensual = {
  whisper: number;
  parseo: number;
  categorizacion: number;
};

export type LimitesMensuales = ConsumoMensual;

// Mantenlo sincronizado con lib/cuotas.ts (LIMITES_TIER)
export const LIMITES_CLIENTE: Record<Tier, LimitesMensuales> = {
  free: { whisper: 10, parseo: 30, categorizacion: 100 },
  premium: { whisper: 300, parseo: 1500, categorizacion: 1500 },
};

function mesActualId(fecha: Date = new Date()): string {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
  });
  const partes = fmt.formatToParts(fecha);
  const y = partes.find(p => p.type === "year")?.value || "";
  const m = partes.find(p => p.type === "month")?.value || "";
  return `${y}${m}`;
}

export type EstadoCuotasUso = {
  consumo: ConsumoMensual;
  cargando: boolean;
};

export function useCuotasUso(): EstadoCuotasUso {
  const { user } = useAuth();
  const [estado, setEstado] = useState<EstadoCuotasUso>({
    consumo: { whisper: 0, parseo: 0, categorizacion: 0 },
    cargando: true,
  });

  useEffect(() => {
    if (!user) {
      setEstado({
        consumo: { whisper: 0, parseo: 0, categorizacion: 0 },
        cargando: false,
      });
      return;
    }

    const ref = doc(db, "cuotas_uso", `${user.uid}_${mesActualId()}`);
    const unsub = onSnapshot(
      ref,
      snap => {
        const data = snap.exists() ? (snap.data() as Record<string, unknown>) : {};
        setEstado({
          consumo: {
            whisper: Number(data.whisper) || 0,
            parseo: Number(data.parseo) || 0,
            categorizacion: Number(data.categorizacion) || 0,
          },
          cargando: false,
        });
      },
      err => {
        console.warn("No se pudo leer cuotas_uso:", err);
        setEstado({
          consumo: { whisper: 0, parseo: 0, categorizacion: 0 },
          cargando: false,
        });
      }
    );

    return () => unsub();
  }, [user]);

  return estado;
}
