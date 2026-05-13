"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";
import PerfilUsuario from "./PerfilUsuario";

type Props = {
  mostrarCalendario: boolean;
  onToggleCalendario: () => void;
  carpetas: string[];
  carpetaSeleccionada: string;
  onSeleccionarCarpeta: (nombre: string) => void;
};

export default function Navigation({
  mostrarCalendario,
  onToggleCalendario,
  carpetas,
  carpetaSeleccionada,
  onSeleccionarCarpeta,
}: Props) {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [mostrarPerfil, setMostrarPerfil] = useState(false);
  const { user, loginWithGoogle } = useAuth();

  useEffect(() => {
    setMostrarDropdown(false);
  }, [carpetas]);

  return (
    <nav className="w-full flex justify-center p-4 border-b border-gray-200 dark:border-gray-700 mb-4">
      <div className="relative flex gap-6">
        <button
          onClick={onToggleCalendario}
          className="text-xl hover:text-blue-600 dark:hover:text-blue-400 transition"
          title={mostrarCalendario ? "Ver tareas" : "Ver calendario"}
        >
          {mostrarCalendario ? "✅" : "📅"}
        </button>
        <div className="relative">
          <button
            onClick={() => setMostrarDropdown(!mostrarDropdown)}
            className="text-xl hover:text-blue-600 dark:hover:text-blue-400 transition"
            title="Filtrar por carpeta"
          >
            📂
          </button>
          {mostrarDropdown && (
            <div
              ref={(el) => {
                if (el) {
                  const handleClickOutside = (event: MouseEvent) => {
                    if (!el.contains(event.target as Node)) {
                      setMostrarDropdown(false);
                      document.removeEventListener("mousedown", handleClickOutside);
                    }
                  };
                  document.addEventListener("mousedown", handleClickOutside);
                }
              }}
              key={carpetas.join(",")}
              className="absolute left-1/2 -translate-x-1/2 mt-2 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-md dark:shadow-gray-900 text-sm z-50 w-[clamp(200px,50vw,360px)]"
            >
              <div
                onClick={() => {
                  onSeleccionarCarpeta("");
                  setMostrarDropdown(false);
                }}
                className={`px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer ${
                  carpetaSeleccionada === "" ? "bg-blue-50 dark:bg-blue-900 font-semibold" : ""
                }`}
              >
                Todas
              </div>
              {carpetas.map((nombre) => (
                <div
                  key={nombre}
                  onClick={() => {
                    onSeleccionarCarpeta(nombre);
                    setMostrarDropdown(false);
                  }}
                  className={`px-4 py-2 hover:bg-blue-100 dark:hover:bg-blue-800 cursor-pointer ${
                    carpetaSeleccionada === nombre ? "bg-blue-50 dark:bg-blue-900 font-semibold" : ""
                  }`}
                >
                  {nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="ml-6 flex items-center">
        {user ? (
          <button
            onClick={() => setMostrarPerfil(true)}
            className="text-xl hover:text-blue-600 dark:hover:text-blue-400 transition"
            title={`Mi perfil (${user.displayName || user.email})`}
            aria-label="Abrir mi perfil"
          >
            👤
          </button>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="text-sm text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400"
            title="Iniciar sesión con Google"
          >
            Iniciar sesión
          </button>
        )}
      </div>
      <PerfilUsuario abierto={mostrarPerfil} onCerrar={() => setMostrarPerfil(false)} />
    </nav>
  );
}