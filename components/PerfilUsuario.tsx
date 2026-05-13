"use client";

import { useState } from "react";
import Link from "next/link";
import {
  EmailAuthProvider,
  GoogleAuthProvider,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { useAuth } from "./AuthProvider";
import { useSuscripcion } from "../lib/useSuscripcion";
import { useCuotasUso, LIMITES_CLIENTE } from "../lib/useCuotasUso";
import { authedFetchRaw, refrescarIdToken } from "../lib/api-client";

type Props = {
  abierto: boolean;
  onCerrar: () => void;
};

export default function PerfilUsuario({ abierto, onCerrar }: Props) {
  const { user, userProfile, updateUserProfile, logout } = useAuth();
  const suscripcion = useSuscripcion();
  const { consumo } = useCuotasUso();

  const [nombreEditado, setNombreEditado] = useState<string>(userProfile?.nombre || "");
  const [editandoNombre, setEditandoNombre] = useState(false);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [confirmEliminarVisible, setConfirmEliminarVisible] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [eliminando, setEliminando] = useState(false);

  if (!abierto || !user) return null;

  const limites = LIMITES_CLIENTE[suscripcion.tier];
  const miembroDesde = userProfile?.fechaCreacion
    ? new Date(userProfile.fechaCreacion).toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const proveedorLogin = user.providerData[0]?.providerId || "password";
  const esGoogle = proveedorLogin === "google.com";

  async function guardarNombre() {
    if (!nombreEditado.trim() || nombreEditado.trim() === userProfile?.nombre) {
      setEditandoNombre(false);
      return;
    }
    setGuardandoNombre(true);
    setError(null);
    try {
      await updateUserProfile(nombreEditado.trim());
      setMensaje("Nombre actualizado");
      setEditandoNombre(false);
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el nombre");
    } finally {
      setGuardandoNombre(false);
    }
  }

  async function exportarDatos() {
    setExportando(true);
    setError(null);
    try {
      const resp = await authedFetchRaw("/api/cuenta/exportar");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mi-lista-tareas-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMensaje("Datos exportados correctamente");
      setTimeout(() => setMensaje(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al exportar los datos");
    } finally {
      setExportando(false);
    }
  }

  async function confirmarEliminarCuenta() {
    if (!user) return;
    setEliminando(true);
    setError(null);

    try {
      if (esGoogle) {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      } else {
        if (!confirmPassword) {
          throw new Error("Introduce tu contraseña para confirmar.");
        }
        if (!user.email) {
          throw new Error("Tu cuenta no tiene email asociado.");
        }
        const cred = EmailAuthProvider.credential(user.email, confirmPassword);
        await reauthenticateWithCredential(user, cred);
      }

      await refrescarIdToken();

      const resp = await fetch("/api/cuenta/eliminar", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${await auth.currentUser!.getIdToken()}`,
        },
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }

      await logout();
      onCerrar();
      alert("Tu cuenta y todos tus datos se han eliminado. Gracias por haber usado la app.");
      window.location.href = "/";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al eliminar la cuenta";
      setError(msg);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-start sm:items-center justify-center overflow-y-auto p-4"
      onClick={onCerrar}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 my-4 text-gray-800 dark:text-gray-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Mi perfil</h2>
          <button
            onClick={onCerrar}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        {mensaje && (
          <div className="mb-3 px-3 py-2 bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-sm rounded">
            {mensaje}
          </div>
        )}
        {error && (
          <div className="mb-3 px-3 py-2 bg-red-50 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-sm rounded">
            {error}
          </div>
        )}

        <section className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Nombre
          </label>
          {editandoNombre ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={nombreEditado}
                onChange={e => setNombreEditado(e.target.value)}
                maxLength={80}
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
              />
              <button
                onClick={guardarNombre}
                disabled={guardandoNombre}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {guardandoNombre ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setEditandoNombre(false);
                  setNombreEditado(userProfile?.nombre || "");
                }}
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className="font-medium">{userProfile?.nombre || "Sin nombre"}</span>
              <button
                onClick={() => {
                  setNombreEditado(userProfile?.nombre || "");
                  setEditandoNombre(true);
                }}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Editar
              </button>
            </div>
          )}
        </section>

        <section className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Email
          </label>
          <div className="text-sm">{user.email || "—"}</div>
        </section>

        <section className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Miembro desde
          </label>
          <div className="text-sm">{miembroDesde}</div>
        </section>

        <section className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">
            Plan
          </label>
          {suscripcion.tier === "premium" ? (
            <div className="text-sm">
              <span className="inline-block px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded text-xs font-semibold mr-2">
                Premium
              </span>
              {suscripcion.expiraEn && (
                <span className="text-gray-600 dark:text-gray-400">
                  Renovación: {suscripcion.expiraEn.toLocaleDateString("es-ES")}
                </span>
              )}
            </div>
          ) : (
            <div className="text-sm flex items-center gap-2 flex-wrap">
              <span className="inline-block px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs font-semibold">
                Gratuito
              </span>
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                (Pronto: actualiza a premium desde tu móvil)
              </span>
            </div>
          )}
        </section>

        <section className="mb-5">
          <label className="block text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
            Uso de IA este mes
          </label>
          <div className="space-y-2 text-sm">
            <BarraUso etiqueta="Transcripciones de voz" usado={consumo.whisper} limite={limites.whisper} />
            <BarraUso etiqueta="Parseo inteligente" usado={consumo.parseo} limite={limites.parseo} />
            <BarraUso
              etiqueta="Categorización automática"
              usado={consumo.categorizacion}
              limite={limites.categorizacion}
            />
          </div>
        </section>

        <section className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            onClick={exportarDatos}
            disabled={exportando}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm disabled:opacity-50"
          >
            {exportando ? "Exportando..." : "Exportar mis datos"}
          </button>
          <button
            onClick={async () => {
              await logout();
              onCerrar();
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-sm"
          >
            Cerrar sesión
          </button>
        </section>

        <section className="mb-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          {!confirmEliminarVisible ? (
            <button
              onClick={() => setConfirmEliminarVisible(true)}
              className="text-sm text-red-600 dark:text-red-400 hover:underline"
            >
              Eliminar mi cuenta
            </button>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-red-700 dark:text-red-400 font-semibold">
                ¿Seguro que quieres eliminar tu cuenta?
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Se borrarán de forma permanente todas tus tareas, carpetas y
                datos de cuenta. Esta acción no se puede deshacer.
              </p>
              {!esGoogle && (
                <input
                  type="password"
                  placeholder="Confirma tu contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700"
                  autoComplete="current-password"
                />
              )}
              <div className="flex gap-2">
                <button
                  onClick={confirmarEliminarCuenta}
                  disabled={eliminando}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                >
                  {eliminando ? "Eliminando..." : "Sí, eliminar cuenta"}
                </button>
                <button
                  onClick={() => {
                    setConfirmEliminarVisible(false);
                    setConfirmPassword("");
                    setError(null);
                  }}
                  disabled={eliminando}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </section>

        <footer className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
          <Link href="/privacidad" className="hover:underline" target="_blank">
            Política de Privacidad
          </Link>
          <Link href="/terminos" className="hover:underline" target="_blank">
            Términos y Condiciones
          </Link>
        </footer>
      </div>
    </div>
  );
}

function BarraUso({ etiqueta, usado, limite }: { etiqueta: string; usado: number; limite: number }) {
  const porcentaje = Math.min(100, Math.round((usado / Math.max(1, limite)) * 100));
  const color =
    porcentaje >= 100
      ? "bg-red-500"
      : porcentaje >= 80
      ? "bg-orange-500"
      : "bg-blue-500";
  return (
    <div>
      <div className="flex justify-between text-xs mb-0.5">
        <span>{etiqueta}</span>
        <span className="text-gray-500 dark:text-gray-400">
          {usado} / {limite}
        </span>
      </div>
      <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
        <div
          className={`h-full ${color} transition-all`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
    </div>
  );
}
