"use client";

import { useState, useEffect } from "react";
import Modal from "./Modal";

type TareaCompletada = {
  id: string;
  titulo: string;
  fechaCompletada: Date | string | { seconds: number; nanoseconds: number }; // Firestore timestamp
  carpeta?: string;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  tarea: TareaCompletada | null;
  onEditar: (id: string, nuevoTitulo: string) => void;
};

export default function ModalEditarTareaCompletada({ isOpen, onClose, tarea, onEditar }: Props) {
  const [titulo, setTitulo] = useState("");

  // Actualizar el título cuando cambie la tarea
  useEffect(() => {
    if (tarea) {
      setTitulo(tarea.titulo);
    }
  }, [tarea]);

  const manejarSubmit = () => {
    if (tarea && titulo.trim() !== "") {
      onEditar(tarea.id, titulo.trim());
      onClose();
    }
  };

  const manejarKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      manejarSubmit();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar Tarea Completada"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-700 dark:text-gray-300">
            Título de la tarea
          </label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            onKeyDown={manejarKeyDown}
            placeholder="Título de la tarea"
            className="w-full border dark:border-gray-600 rounded px-4 py-3 text-base dark:bg-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
            autoFocus
          />
        </div>
        
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={manejarSubmit}
            disabled={titulo.trim() === ""}
            className="bg-blue-500 dark:bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Guardar
          </button>
        </div>
      </div>
    </Modal>
  );
} 