"use client";

import { useState } from "react";
import ModalEditarTarea from "./ModalEditarTarea";

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
  carpeta?: string;
};

type Props = {
  tarea: Tarea;
  index: number;
  onCompletar: () => void;
  onEditar?: (id: string, nuevoTitulo: string, nuevaFecha?: string | null, nuevaCarpeta?: string) => void;
  onBorrar: () => void;
  carpetas: string[];
  onActualizarCarpetas: () => void;
};

export default function TareaItem({ tarea, index, onCompletar, onEditar, onBorrar, onActualizarCarpetas }: Props) {
  const [mostrarModalEdicion, setMostrarModalEdicion] = useState(false);

  const manejarEdicion = async (id: string, nuevoTitulo: string, nuevaFecha?: string | null, nuevaCarpeta?: string) => {
    if (onEditar) {
      await onEditar(id, nuevoTitulo, nuevaFecha, nuevaCarpeta);
      await onActualizarCarpetas();
    }
  };

  return (
    <>
      <li className="flex justify-between items-center bg-card-light dark:bg-card-dark text-text-light dark:text-text-dark shadow-md border dark:border-gray-700 p-4 rounded-lg transition-colors duration-200">
        <div className="flex-1 pr-2">
          <span className="text-text-light dark:text-text-dark">
            {index + 1}. {tarea.titulo}
            {tarea.fechaLimite && (
              <div className="text-xs text-gray-500 dark:text-gray-300">
                Fecha límite: {new Date(tarea.fechaLimite).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric'
                })}
              </div>
            )}
            {tarea.carpeta && (
              <div className="text-xs text-blue-500 dark:text-blue-300">
                Carpeta: {tarea.carpeta}
              </div>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarModalEdicion(true)}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
            title="Editar"
          >
            ✏️
          </button>
          <button
            onClick={onCompletar}
            className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-3 py-1 rounded shadow ring-1 ring-gray-700"
          >
            Hecho
          </button>
          <button
            onClick={onBorrar}
            className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 text-sm"
            title="Borrar tarea"
          >
            🗑️
          </button>
        </div>
      </li>

      <ModalEditarTarea
        isOpen={mostrarModalEdicion}
        onClose={() => setMostrarModalEdicion(false)}
        tarea={tarea}
        onEditar={manejarEdicion}
      />
    </>
  );
}