"use client";

import { useState } from "react";
import ModalEditarTareaCompletada from "./ModalEditarTareaCompletada";

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
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);
  const [tareaParaEditar, setTareaParaEditar] = useState<Tarea | null>(null);

  if (tareas.length === 0) return null;

  const activarEdicion = (tarea: Tarea) => {
    setTareaParaEditar(tarea);
    setMostrarModalEdicion(true);
  };

  const manejarEdicion = (id: string, nuevoTitulo: string) => {
    if (onEditar) {
      onEditar(id, nuevoTitulo);
    }
  };

  return (
    <>
      <div className="mt-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-600 dark:text-gray-400">
          Completadas ({tareas.length})
        </h2>
        <ul className="text-sm text-gray-700 dark:text-gray-300 mt-2 space-y-2">
          {tareas.map((tarea) => (
            <li
              key={tarea.id}
              className="flex justify-between items-center bg-gray-50 dark:bg-card-dark px-3 py-2 rounded shadow-sm dark:shadow-black/20"
            >
              <div className="flex-1">
                <span>✔️ {tarea.titulo}</span>
                {tarea.carpeta && (
                  <div className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                    Carpeta: {tarea.carpeta}
                  </div>
                )}
                {tarea.fechaCompletada && (
                  <div className="text-xs text-gray-500 dark:text-gray-300 mt-1">
                    Completada: {new Date(tarea.fechaCompletada).toLocaleDateString('es-ES', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric'
                    })}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => activarEdicion(tarea)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => onReactivar?.(tarea.id)}
                  className="hover:bg-blue-600 dark:hover:bg-blue-700 text-white px-2 py-1 rounded text-base"
                  title="Volver a tareas pendientes"
                >
                  🔄
                </button>
                <button
                  onClick={() => onBorrar?.(tarea.id)}
                  className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 text-sm"
                  title="Borrar tarea"
                >
                  🗑️
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <ModalEditarTareaCompletada
        isOpen={mostrarModalEdicion}
        onClose={() => {
          setMostrarModalEdicion(false);
          setTareaParaEditar(null);
        }}
        tarea={tareaParaEditar}
        onEditar={manejarEdicion}
      />
    </>
  );
}