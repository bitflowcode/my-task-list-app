"use client";

import { useEffect, useState } from "react";
import { db } from "../lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import ListaDeTareas from "../components/TaskList";
import CalendarioTareas from "../components/CalendarioTareas";
import Navigation from "../components/Navigation";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../components/AuthProvider";
import dynamic from "next/dynamic";
const AnimacionBienvenida = dynamic(() => import("../components/AnimacionBienvenida"), { ssr: false });

export default function PaginaPrincipal() {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("");
  const [carpetasConTareas, setCarpetasConTareas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const { user } = useAuth();

  useEffect(() => {
    const cargarCarpetasDesdeFirestore = async () => {
      if (!user) {
        setCarpetasConTareas([]);
        return;
      }

      try {
        // Obtener carpetas de tareas pendientes
        const qTareas = query(collection(db, "tareas"), where("userId", "==", user.uid));
        const snapshotTareas = await getDocs(qTareas);
        const carpetasDeTareas = snapshotTareas.docs
          .map((doc) => doc.data().carpeta)
          .filter((carpeta): carpeta is string => carpeta !== null && carpeta !== undefined);

        // Obtener carpetas de tareas completadas
        const qCompletadas = query(collection(db, "completadas"), where("userId", "==", user.uid));
        const snapshotCompletadas = await getDocs(qCompletadas);
        const carpetasDeCompletadas = snapshotCompletadas.docs
          .map((doc) => doc.data().carpeta)
          .filter((carpeta): carpeta is string => carpeta !== null && carpeta !== undefined);

        // Combinar y obtener carpetas únicas
        const todasLasCarpetas = Array.from(new Set([
          ...carpetasDeTareas,
          ...carpetasDeCompletadas
        ]));

        setCarpetasConTareas(todasLasCarpetas);
      } catch (error) {
        console.error("Error al cargar carpetas:", error);
        setCarpetasConTareas([]);
      }
    };

    cargarCarpetasDesdeFirestore();
  }, [user]);

  if (!user) {
    return (
      <>
        <div className="max-w-md mx-auto mt-10 text-center">
          <h1 className="text-2xl font-bold mb-2">Bienvenido a Mi Lista de Tareas</h1>
          <AnimacionBienvenida />
          <p className="text-gray-600 text-sm mb-4">
            Organiza tus tareas por carpetas y fechas límite. Accede a tus pendientes desde cualquier dispositivo de forma segura.
          </p>
        </div>
        <LoginForm />
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2 mt-6">Lista de Tareas</h1>
      <p className="text-gray-600 mb-4">
        Bienvenido, {user.displayName || user.email}
      </p>

      <Navigation
        mostrarCalendario={mostrarCalendario}
        onToggleCalendario={() => setMostrarCalendario(!mostrarCalendario)}
        carpetas={carpetasConTareas}
        carpetaSeleccionada={carpetaSeleccionada}
        onSeleccionarCarpeta={setCarpetaSeleccionada}
      />

      <div className="mb-6">
        <input
          type="text"
          placeholder="Buscar tareas..."
          className="w-full border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {mostrarCalendario ? (
        <CalendarioTareas />
      ) : (
        <ListaDeTareas 
          carpetaFiltrada={carpetaSeleccionada} 
          busqueda={busqueda}
        />
      )}
    </div>
  );
}