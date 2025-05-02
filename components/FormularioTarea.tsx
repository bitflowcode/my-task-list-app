"use client";

import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, addDoc, query, where } from "firebase/firestore";
import { useAuth } from "./AuthProvider";

type Props = {
  onAgregar: (titulo: string, fechaLimite: string | null, carpeta?: string) => void;
};

export default function FormularioTarea({ onAgregar }: Props) {
  const { user } = useAuth();
  const [nuevaTarea, setNuevaTarea] = useState("");
  const [fechaLimite, setFechaLimite] = useState<string | null>(null);
  const [carpeta, setCarpeta] = useState("");
  const [carpetas, setCarpetas] = useState<string[]>([]);
  const [mostrarInputNuevaCarpeta, setMostrarInputNuevaCarpeta] = useState(false);
  const [nuevaCarpeta, setNuevaCarpeta] = useState("");

  useEffect(() => {
    const obtenerCarpetas = async () => {
      const carpetasPredeterminadas = ["Trabajo", "Personal", "Otros"];
      const q = query(collection(db, "carpetas"), where("userId", "==", user?.uid));
      const querySnapshot = await getDocs(q);
      const nombres = querySnapshot.docs.map((doc) => doc.data().nombre as string);
      const combinadas = Array.from(new Set([...carpetasPredeterminadas, ...nombres]));
      setCarpetas(combinadas);
    };
    obtenerCarpetas();
  }, []);

  const agregar = () => {
    if (nuevaTarea.trim() === "") return;
    onAgregar(nuevaTarea, fechaLimite, carpeta);
    setNuevaTarea("");
    setFechaLimite(null);
    setCarpeta("");
    setMostrarInputNuevaCarpeta(false);
    setNuevaCarpeta("");
  };

  const manejarSeleccionCarpeta = (valor: string) => {
    if (valor === "__nueva__") {
      setMostrarInputNuevaCarpeta(true);
      setCarpeta("");
    } else {
      setMostrarInputNuevaCarpeta(false);
      setCarpeta(valor);
    }
  };

  const confirmarNuevaCarpeta = async () => {
    if (nuevaCarpeta.trim() === "") return;
    const nombre = nuevaCarpeta.trim();

    if (!carpetas.includes(nombre)) {
      await addDoc(collection(db, "carpetas"), { nombre, userId: user?.uid || null });
      setCarpetas([...carpetas, nombre]);
    }

    setCarpeta(nombre);
    setNuevaCarpeta("");
    setMostrarInputNuevaCarpeta(false);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 mb-1">Nueva tarea</label>
        <input
          type="text"
          placeholder="Escribe aquí tu nueva tarea"
          className="w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={nuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") agregar();
          }}
        />
      </div>
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 mb-1">Fecha límite</label>
        <input
          type="date"
          className="w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={fechaLimite || ""}
          onChange={(e) => setFechaLimite(e.target.value)}
        />
      </div>
      <div className="flex flex-col w-full">
        <label className="text-sm text-gray-700 mb-1">Carpeta</label>
        <select
          value={carpeta}
          onChange={(e) => manejarSeleccionCarpeta(e.target.value)}
          className="w-full border rounded px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
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
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              placeholder="Nombre de la nueva carpeta"
              value={nuevaCarpeta}
              onChange={(e) => setNuevaCarpeta(e.target.value)}
              className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={confirmarNuevaCarpeta}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            >
              Añadir
            </button>
          </div>
        )}
      </div>
      <button
        onClick={agregar}
        className="bg-blue-500 text-white w-full py-3 rounded-md text-sm font-semibold hover:bg-blue-600 transition"
      >
        Agregar
      </button>
    </div>
  );
}