"use client";

type Props = {
  mostrarCalendario: boolean;
  onToggleCalendario: () => void;
  carpetas: string[];
  carpetaSeleccionada: string;
  onSeleccionarCarpeta: (nombre: string) => void;
};

import { useState } from "react";

export default function Navigation({
  mostrarCalendario,
  onToggleCalendario,
  carpetas,
  carpetaSeleccionada,
  onSeleccionarCarpeta,
}: Props) {
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  return (
    <nav className="w-full flex justify-center p-4 border-b border-gray-200 mb-4">
      <div className="relative flex gap-6">
        <button
          onClick={onToggleCalendario}
          className="text-xl hover:text-blue-600 transition"
          title={mostrarCalendario ? "Ver tareas" : "Ver calendario"}
        >
          {mostrarCalendario ? "✅" : "📅"}
        </button>
        <div className="relative">
          <button
            onClick={() => setMostrarDropdown(!mostrarDropdown)}
            className="text-xl hover:text-blue-600 transition"
            title="Filtrar por carpeta"
          >
            📂
          </button>
          {mostrarDropdown && (
            <div
              key={carpetas.join(",")}
              className="absolute right-0 mt-2 bg-white border rounded shadow-md text-sm z-50 w-[clamp(200px,50vw,360px)]"
            >
              <div
                onClick={() => {
                  onSeleccionarCarpeta("");
                  setMostrarDropdown(false);
                }}
                className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${
                  carpetaSeleccionada === "" ? "bg-blue-50 font-semibold" : ""
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
                  className={`px-4 py-2 hover:bg-blue-100 cursor-pointer ${
                    carpetaSeleccionada === nombre ? "bg-blue-50 font-semibold" : ""
                  }`}
                >
                  {nombre}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}