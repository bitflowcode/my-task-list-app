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
import SugerenciasTareas from "../components/SugerenciasTareas";
const AnimacionBienvenida = dynamic(() => import("../components/AnimacionBienvenida"), { ssr: false });

export default function PaginaPrincipal() {
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [carpetaSeleccionada, setCarpetaSeleccionada] = useState("");
  const [carpetasConTareas, setCarpetasConTareas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [nuevaTareaSugerida, setNuevaTareaSugerida] = useState("");
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

  // Manejar la selección de una sugerencia
  const manejarSeleccionSugerencia = (sugerencia: string) => {
    setNuevaTareaSugerida(sugerencia);
    
    // Mostrar notificación o feedback
    const notificacion = document.getElementById('notificacion-sugerencia');
    if (notificacion) {
      notificacion.classList.remove('hidden');
      setTimeout(() => {
        notificacion.classList.add('hidden');
      }, 3000);
    }
  };

  if (!user) {
    return (
      <>
        <div className="max-w-md mx-auto mt-10 text-center">
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">Bienvenido a Mi Lista de Tareas</h1>
          <AnimacionBienvenida />
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
            Organiza tus tareas por carpetas y fechas límite. Accede a tus pendientes desde cualquier dispositivo de forma segura.
          </p>
        </div>
        <LoginForm />
      </>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4">
      <h1 className="text-3xl font-bold mb-2 mt-6 text-gray-900 dark:text-gray-100">Lista de Tareas</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
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
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400 dark:text-gray-500"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Buscar tareas..."
            className="w-full border dark:border-gray-700 rounded-lg pl-10 pr-10 py-2 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-dark"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button
              onClick={() => setBusqueda("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              <svg
                className="h-5 w-5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Notificación de sugerencia añadida */}
      <div 
        id="notificacion-sugerencia" 
        className="hidden mb-4 p-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded-md"
      >
        ¡Sugerencia añadida a tu formulario de tareas!
      </div>

      {/* Mostrar sugerencias de tareas solo cuando no está en modo calendario */}
      {!mostrarCalendario && (
        <SugerenciasTareas onSeleccionarSugerencia={manejarSeleccionSugerencia} />
      )}

      {mostrarCalendario ? (
        <CalendarioTareas />
      ) : (
        <ListaDeTareas 
          carpetaFiltrada={carpetaSeleccionada} 
          busqueda={busqueda}
          sugerenciaTarea={nuevaTareaSugerida}
          onSugerenciaUsada={() => setNuevaTareaSugerida("")}
        />
      )}
    </div>
  );
}