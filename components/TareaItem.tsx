"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../components/AuthProvider";

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

export default function TareaItem({ tarea, index, onCompletar, onEditar, onBorrar, carpetas, onActualizarCarpetas }: Props) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [tituloEditado, setTituloEditado] = useState(tarea.titulo);
  const [fechaEditada, setFechaEditada] = useState<string | null>(tarea.fechaLimite || null);
  const [carpetaEditada, setCarpetaEditada] = useState<string>(tarea.carpeta || "");
  const [mostrarInputNuevaCarpeta, setMostrarInputNuevaCarpeta] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");
  const [carpetasDisponibles, setCarpetasDisponibles] = useState<string[]>(carpetas || []);
  const { user } = useAuth();

  // Asegurar que las carpetas se actualicen cuando cambian en las props
  useEffect(() => {
    if (carpetas && carpetas.length > 0) {
      setCarpetasDisponibles(carpetas);
    }
  }, [carpetas]);

  const agregarNuevaCarpeta = async (nombre: string) => {
    if (nombre.trim() === "") return;
    
    try {
      const { addDoc, collection } = await import("firebase/firestore");
      const { db } = await import("../lib/firebase");
      await addDoc(collection(db, "carpetas"), {
        nombre,
        userId: user?.uid,
      });
      
      // Actualizar la carpeta seleccionada
      setCarpetaEditada(nombre);
      setNuevaCarpeta("");
      setMostrarInputNuevaCarpeta(false);
      
      // Actualizar las carpetas localmente también
      const nuevasCarpetas = [...carpetasDisponibles];
      if (!nuevasCarpetas.includes(nombre)) {
        nuevasCarpetas.push(nombre);
        setCarpetasDisponibles(nuevasCarpetas);
      }
      
      // Notificar al componente padre para actualizar la lista de carpetas
      await onActualizarCarpetas();
    } catch (error) {
      console.error("Error al guardar carpeta en Firestore:", error);
    }
  };

  const guardarEdicion = async () => {
    if (onEditar && tituloEditado.trim() !== "") {
      console.log("Guardando edición:", { id: tarea.id, tituloEditado, fechaEditada, carpetaEditada });
      await onEditar(tarea.id, tituloEditado, fechaEditada, carpetaEditada);
      await onActualizarCarpetas();
      setModoEdicion(false);
    }
  };

  return (
    <li className="flex justify-between items-center bg-white dark:bg-gray-800 shadow dark:shadow-gray-700 p-3 rounded">
      <div className="flex-1 pr-2">
        {modoEdicion ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full border dark:border-gray-600 px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
              value={tituloEditado}
              onChange={(e) => setTituloEditado(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardarEdicion();
              }}
            />
            <input
              type="date"
              className="w-full border dark:border-gray-600 px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
              value={fechaEditada || ""}
              onChange={(e) => setFechaEditada(e.target.value)}
            />
            <select
              className="w-full border dark:border-gray-600 px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
              value={carpetaEditada}
              onChange={(e) => {
                if (e.target.value === "__nueva__") {
                  setMostrarInputNuevaCarpeta(true);
                  setCarpetaEditada("");
                } else {
                  setCarpetaEditada(e.target.value);
                  setMostrarInputNuevaCarpeta(false);
                }
              }}
            >
              <option value="">Sin carpeta</option>
              {carpetasDisponibles.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
              <option value="__nueva__">+ Crear nueva carpeta...</option>
            </select>
            {mostrarInputNuevaCarpeta && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text"
                  placeholder="Nombre de la nueva carpeta"
                  className="w-full border dark:border-gray-600 px-2 py-1 text-sm dark:bg-gray-700 dark:text-white"
                  value={nuevaCarpeta}
                  onChange={(e) => setNuevaCarpeta(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      agregarNuevaCarpeta(nuevaCarpeta);
                    }
                  }}
                />
                <button
                  onClick={() => agregarNuevaCarpeta(nuevaCarpeta)}
                  className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-2 py-1 text-sm rounded"
                >
                  Añadir
                </button>
              </div>
            )}
          </div>
        ) : (
          <span className="text-gray-900 dark:text-white">
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
        )}
      </div>
      <div className="flex items-center gap-2">
        {modoEdicion ? (
          <>
            <button
              onClick={guardarEdicion}
              className="bg-yellow-500 hover:bg-yellow-600 dark:bg-yellow-600 dark:hover:bg-yellow-500 text-white px-2 py-1 rounded text-sm"
              disabled={tituloEditado.trim() === ""}
            >
              Guardar
            </button>
            <button
              onClick={() => {
                setModoEdicion(false);
                setTituloEditado(tarea.titulo);
                setFechaEditada(tarea.fechaLimite || null);
                setCarpetaEditada(tarea.carpeta || "");
                setMostrarInputNuevaCarpeta(false);
                setNuevaCarpeta("");
              }}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setModoEdicion(true)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={onCompletar}
              className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white px-3 py-1 rounded"
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
          </>
        )}
      </div>
    </li>
  );
}