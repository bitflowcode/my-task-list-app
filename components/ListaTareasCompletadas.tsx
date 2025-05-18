"use client";

import { useState } from "react";

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
  fechaCompletada: string;
};

type Props = {
  tareas: Tarea[];
  onEditar?: (id: string, nuevoTitulo: string) => void;
  onReactivar?: (id: string) => void;
  onBorrar?: (id: string) => void;
};

export default function ListaTareasCompletadas({ tareas, onEditar, onReactivar, onBorrar }: Props) {
  const [modoEdicionId, setModoEdicionId] = useState<string | null>(null);
  const [tituloEditado, setTituloEditado] = useState("");

  if (tareas.length === 0) return null;

  const activarEdicion = (tarea: Tarea) => {
    setModoEdicionId(tarea.id);
    setTituloEditado(tarea.titulo);
  };

  const guardarEdicion = () => {
    if (modoEdicionId && onEditar && tituloEditado.trim() !== "") {
      onEditar(modoEdicionId, tituloEditado);
      setModoEdicionId(null);
    }
  };

  return (
    <div className="mt-6 mb-8">
      <h2 className="text-lg font-semibold text-gray-600">
        Completadas ({tareas.length})
      </h2>
      <ul className="text-sm text-gray-700 mt-2 space-y-2">
        {tareas.map((tarea) => (
          <li
            key={tarea.id}
            className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded shadow-sm"
          >
            {modoEdicionId === tarea.id ? (
              <input
                className="flex-1 border px-2 py-1 text-sm mr-2"
                value={tituloEditado}
                onChange={(e) => setTituloEditado(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") guardarEdicion();
                }}
                autoFocus
              />
            ) : (
              <div className="flex-1">
                <span>✔️ {tarea.titulo}</span>
                {tarea.carpeta && (
                  <div className="text-xs text-blue-500 mt-1">
                    Carpeta: {tarea.carpeta}
                  </div>
                )}
                {tarea.fechaCompletada && (
                  <div className="text-xs text-gray-500 mt-1">
                    Completada: {new Date(tarea.fechaCompletada).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center gap-2 ml-4">
              {modoEdicionId === tarea.id ? (
                <button
                  onClick={guardarEdicion}
                  className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-xs"
                >
                  Guardar
                </button>
              ) : (
                <button
                  onClick={() => activarEdicion(tarea)}
                  className="text-sm text-gray-500 hover:text-gray-800"
                  title="Editar"
                >
                  ✏️
                </button>
              )}
              <button
                onClick={() => onReactivar?.(tarea.id)}
                className="bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 text-xs"
                title="Volver a tareas pendientes"
              >
                ↩️
              </button>
              <button
                onClick={() => onBorrar?.(tarea.id)}
                className="text-gray-500 hover:text-red-600 text-sm"
                title="Borrar tarea"
              >
                🗑️
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}