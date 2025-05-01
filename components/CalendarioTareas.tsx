"use client";

import { useEffect, useState } from "react";
import Calendar from "react-calendar";
import 'react-calendar/dist/Calendar.css';
import { db } from "../lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";

type Tarea = {
  id: string;
  titulo: string;
  fechaLimite?: string | null;
};

export default function CalendarioTareas() {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState<Date | null>(null);

  useEffect(() => {
    const q = query(collection(db, "tareas"), orderBy("fechaLimite"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const datos = snapshot.docs.map((doc) => ({
        id: doc.id,
        titulo: doc.data().titulo,
        fechaLimite: doc.data().fechaLimite,
      }));
      setTareas(datos);
    });

    return () => unsubscribe();
  }, []);

  const fechasConTareas = tareas
    .filter(t => t.fechaLimite)
    .map(t => new Date(t.fechaLimite!));

  const tareasDelDia = tareas.filter(t => {
    if (!t.fechaLimite || !fechaSeleccionada) return false;
    const fechaTarea = new Date(t.fechaLimite);
    return fechaTarea.toDateString() === fechaSeleccionada.toDateString();
  });

  return (
    <div className="p-4 max-w-md mx-auto">
      <h2 className="text-xl font-bold mb-4">Calendario de tareas</h2>
      <Calendar
        onChange={(value) => setFechaSeleccionada(value as Date)}
        value={fechaSeleccionada}
        tileClassName={({ date, view }) => {
          if (
            view === "month" &&
            fechasConTareas.some(
              (d) => d.toDateString() === date.toDateString()
            )
          ) {
            return "react-calendar__tile--hasTasks !bg-blue-100 !rounded-full";
          }
          return null;
        }}
      />
      {fechaSeleccionada && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">
            Tareas para el {fechaSeleccionada.toLocaleDateString()}
          </h3>
          {tareasDelDia.length > 0 ? (
            <ul className="space-y-2 text-sm text-gray-700">
              {tareasDelDia.map((tarea) => (
                <li key={tarea.id}>• {tarea.titulo}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">No hay tareas asignadas para esta fecha.</p>
          )}
        </div>
      )}
    </div>
  );
}