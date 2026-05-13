"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  comprarPaquete,
  esPlataformaNativa,
  obtenerPaquetes,
  restaurarCompras,
} from "../lib/revenuecat";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  motivo?: string;
};

type Paquete = {
  identificador: string;
  precio: string;
  periodo: "mensual" | "anual" | "otro";
};

const BENEFICIOS_PREMIUM = [
  "Transcripciones de voz ilimitadas con Whisper",
  "Parseo y categorización con IA sin cuota",
  "Sugerencias inteligentes avanzadas",
  "Exportación ampliada y copias de seguridad",
  "Temas y personalización de interfaz",
  "Soporte prioritario",
];

export default function Paywall({ abierto, onCerrar, motivo }: Props) {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [cargando, setCargando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!abierto) return;
    if (!esPlataformaNativa()) return;

    let activo = true;
    setCargando(true);
    obtenerPaquetes()
      .then(p => {
        if (activo) setPaquetes(p);
      })
      .catch(err => {
        if (activo) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [abierto]);

  if (!abierto) return null;

  async function onComprar(identificador: string) {
    setError(null);
    setMensaje(null);
    setProcesando(true);
    const res = await comprarPaquete(identificador);
    setProcesando(false);
    if (res.ok) {
      setMensaje("¡Gracias! Tu suscripción se ha activado.");
      setTimeout(onCerrar, 1500);
    } else if (!res.cancelado && res.error) {
      setError(res.error);
    }
  }

  async function onRestaurar() {
    setError(null);
    setMensaje(null);
    setProcesando(true);
    const res = await restaurarCompras();
    setProcesando(false);
    if (res.ok) {
      setMensaje("Compras restauradas correctamente.");
    } else if (res.error) {
      setError(res.error);
    }
  }

  const nativo = esPlataformaNativa();
  const paqueteMensual =
    paquetes.find(p => p.periodo === "mensual") || {
      identificador: "premium_monthly",
      precio: "2,99€/mes",
      periodo: "mensual" as const,
    };
  const paqueteAnual =
    paquetes.find(p => p.periodo === "anual") || {
      identificador: "premium_yearly",
      precio: "24,99€/año",
      periodo: "anual" as const,
    };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6 my-4 text-gray-800 dark:text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Mejora a Premium</h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {motivo && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{motivo}</p>
        )}

        <ul className="mb-5 space-y-1 text-sm">
          {BENEFICIOS_PREMIUM.map(b => (
            <li key={b} className="flex gap-2">
              <span className="text-green-600 dark:text-green-400">✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>

        {!nativo && (
          <div className="mb-4 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm rounded">
            La suscripción se gestiona desde la app móvil. Descárgala en App
            Store o Google Play para activar premium.
          </div>
        )}

        {cargando && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Cargando planes…
          </p>
        )}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm rounded">
            {error}
          </div>
        )}
        {mensaje && (
          <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm rounded">
            {mensaje}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            disabled={!nativo || procesando}
            onClick={() => onComprar(paqueteMensual.identificador)}
            className="border-2 border-blue-500 dark:border-blue-400 rounded-lg p-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/30 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Mensual
            </div>
            <div className="text-lg font-semibold">{paqueteMensual.precio}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Cancela cuando quieras
            </div>
          </button>

          <button
            disabled={!nativo || procesando}
            onClick={() => onComprar(paqueteAnual.identificador)}
            className="border-2 border-yellow-500 dark:border-yellow-400 rounded-lg p-3 text-left hover:bg-yellow-50 dark:hover:bg-yellow-900/30 transition relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="absolute -top-2 right-2 px-2 py-0.5 bg-yellow-400 text-xs font-semibold text-yellow-900 rounded">
              Ahorra 30%
            </span>
            <div className="text-xs uppercase text-gray-500 dark:text-gray-400">
              Anual
            </div>
            <div className="text-lg font-semibold">{paqueteAnual.precio}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              7 días gratis
            </div>
          </button>
        </div>

        <button
          onClick={onRestaurar}
          disabled={!nativo || procesando}
          className="w-full text-sm text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          Restaurar compras
        </button>

        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3">
          La suscripción se renueva automáticamente. Puedes cancelarla en
          cualquier momento desde los ajustes de tu cuenta de App Store o
          Google Play al menos 24h antes del final del periodo.
        </p>

        <div className="flex justify-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/privacidad" target="_blank" className="hover:underline">
            Privacidad
          </Link>
          <Link href="/terminos" target="_blank" className="hover:underline">
            Términos
          </Link>
        </div>
      </div>
    </div>
  );
}
