"use client";

import { useState } from "react";
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
  const { user } = useAuth();

  const guardarEdicion = async () => {
    if (onEditar && tituloEditado.trim() !== "") {
      console.log("Guardando edición:", { id: tarea.id, tituloEditado, fechaEditada, carpetaEditada });
      
      // Si se seleccionó una nueva carpeta, guardarla primero
      if (carpetaEditada && !carpetas.includes(carpetaEditada)) {
        try {
          const { addDoc, collection } = await import("firebase/firestore");
          const { db } = await import("../lib/firebase");
          await addDoc(collection(db, "carpetas"), {
            nombre: carpetaEditada,
            userId: user?.uid,
          });
        } catch (error) {
          console.error("Error al guardar carpeta en Firestore:", error);
        }
      }

      // Guardar la edición de la tarea
      await onEditar(tarea.id, tituloEditado, fechaEditada, carpetaEditada);
      
      // Actualizar la lista de carpetas
      await onActualizarCarpetas();
      
      setModoEdicion(false);
    }
  };

  return (
    <li className="flex justify-between items-center bg-white shadow p-3 rounded">
      <div className="flex-1 pr-2">
        {modoEdicion ? (
          <div className="flex flex-col gap-2">
            <input
              className="w-full border px-2 py-1 text-sm"
              value={tituloEditado}
              onChange={(e) => setTituloEditado(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") guardarEdicion();
              }}
            />
            <input
              type="date"
              className="w-full border px-2 py-1 text-sm"
              value={fechaEditada || ""}
              onChange={(e) => setFechaEditada(e.target.value)}
            />
            <select
              className="w-full border px-2 py-1 text-sm"
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
              {carpetas.map((nombre) => (
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
                  className="w-full border px-2 py-1 text-sm"
                  value={nuevaCarpeta}
                  onChange={(e) => setNuevaCarpeta(e.target.value)}
                />
                <button
                  onClick={async () => {
                    const nombre = nuevaCarpeta.trim();
                    if (nombre !== "") {
                      setNuevaCarpeta("");
                      setMostrarInputNuevaCarpeta(false);
                      try {
                        const existe = carpetas.includes(nombre);
                        if (!existe) {
                          const { addDoc, collection } = await import("firebase/firestore");
                          const { db } = await import("../lib/firebase");
                          await addDoc(collection(db, "carpetas"), {
                            nombre,
                            userId: user?.uid,
                          });
                          await onActualizarCarpetas();
                        }
                        setCarpetaEditada(nombre);
                      } catch (error) {
                        console.error("Error al guardar carpeta en Firestore:", error);
                      }
                    }
                  }}
                  className="bg-blue-500 text-white px-2 py-1 text-sm rounded hover:bg-blue-600"
                >
                  Añadir
                </button>
              </div>
            )}
          </div>
        ) : (
          <span>
            {index + 1}. {tarea.titulo}
            {tarea.fechaLimite && (
              <div className="text-xs text-gray-500">
                Fecha límite: {tarea.fechaLimite}
              </div>
            )}
            {tarea.carpeta && (
              <div className="text-xs text-blue-500">
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
              className="bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600 text-sm"
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
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setModoEdicion(true)}
              className="text-sm text-gray-500 hover:text-gray-800"
              title="Editar"
            >
              ✏️
            </button>
            <button
              onClick={onCompletar}
              className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
            >
              Hecho
            </button>
            <button
              onClick={onBorrar}
              className="text-gray-500 hover:text-red-600 text-sm"
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